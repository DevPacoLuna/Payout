const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const xlsx = require("xlsx");
const path = require("path");
const fs = require("fs");
const { Mistral } = require("@mistralai/mistralai");

dotenv.config();
const app = express();

const PORT = process.env.PORT;

app.use(express.json());
app.use(cors());

const mistral = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY,
});

app.post("/payouts", async (request, response) => {
  const { startTrackingNumber } = request.body;

  const excelFilePath = path.join(
    __dirname,
    "db",
    "SecurityDepositClaims.xlsx"
  );

  const workbook = xlsx.readFile(excelFilePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const data = xlsx.utils.sheet_to_json(worksheet);

  const foundRow = data.find(
    (row) => row["Tracking Number"] == startTrackingNumber
  );

  if (!foundRow) {
    return response.status(404).json({ message: "Tracking number not found." });
  }

  const pdfFolderPath = path.join(
    __dirname,
    "pdfs",
    String(foundRow["Tracking Number"])
  );

  try {
    const files = fs
      .readdirSync(pdfFolderPath)
      .filter((f) => f.endsWith(".pdf"));

    if (files.length === 0) {
      return response
        .status(404)
        .json({ message: "No PDFs found for this tracking number." });
    }

    const pdfParse = require("pdf-parse");
    let allPdfTexts = [];

    for (const file of files) {
      const pdfPath = path.join(pdfFolderPath, file);
      const pdfBuffer = fs.readFileSync(pdfPath);

      try {
        const data = await pdfParse(pdfBuffer);
        allPdfTexts.push({ file, text: data.text });
      } catch (error) {
        console.error("Error parsing PDF:", error);
        return response
          .status(500)
          .json({ message: `Error parsing PDF ${file}`, error: error.message });
      }
    }

    const pdfContents = allPdfTexts
      .map(({ file, text }) => `File: ${file}\n${text}`)
      .join("\n\n");
    const excelColumns = Object.entries(foundRow)
      .map(([key, value]) => `${key}: ${value}`)
      .join("\n");

    const prompt = `
    You are an expert payout processor. Given the following Excel row and PDF contents, determine the amount to payout.
    Respond ONLY with a JSON object like: {"amount": <number>, "currency": "<currency>", "reason": "<short explanation>"}
    Do not include any explanations or extra text.

    Excel Row:
    ${excelColumns}

    PDF Contents:
    ${pdfContents}
    `;

    const completion = await mistral.chat.complete({
      model: "mistral-large-latest",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    console.log(completion.choices[0].message.content);

    response.status(200).json({
      message: "PDF processed successfully",
      mistralResponse: completion.choices[0].message.content,
    });
  } catch (error) {
    response
      .status(500)
      .json({ message: "Error processing AI response", error: error.message });
  }
});

app
  .listen(PORT, () => {
    console.log("Server running at PORT: ", PORT);
  })
  .on("error", (error) => {
    throw new Error(error.message);
  });
