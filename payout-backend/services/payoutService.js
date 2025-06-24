const xlsx = require("xlsx");
const path = require("path");
const fs = require("fs");
const { Mistral } = require("@mistralai/mistralai");

const mistral = new Mistral({
  apiKey: process.env.MISTRAL_API_KEY,
});

exports.createPayout = async (body) => {
  const { startTrackingNumber, endTrackingNumber } = body;

  const excelFilePath = path.join(
    __dirname,
    "../db",
    "SecurityDepositClaims.xlsx"
  );

  const workbook = xlsx.readFile(excelFilePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const data = xlsx.utils.sheet_to_json(worksheet);

  const results = [];

  const start = Number(startTrackingNumber);
  const end = Number(endTrackingNumber);

  for (let trackingNumber = start; trackingNumber <= end; trackingNumber++) {
    const foundRow = data.find(
      (row) => row["Tracking Number"] == trackingNumber
    );

    if (!foundRow) {
      results.push({
        trackingNumber,
        status: 404,
        message: "Tracking number not found.",
      });
      continue;
    }

    const allPdfTexts = await getPDFs(foundRow);
    const completion = await processDataFromPDFs(allPdfTexts, foundRow);

    modifyDBExcel(completion, excelFilePath, trackingNumber, data);

    results.push({
      trackingNumber,
      status: 200,
      message: "PDF processed successfully, check excel file for payout amount",
    });
  }

  return results;
};

const modifyDBExcel = (aiResponse, excelFilePath, trackingNumber, data) => {
  const workbook = xlsx.readFile(excelFilePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  let aiResult;
  try {
    aiResult = JSON.parse(aiResponse);
  } catch (err) {
    return {
      status: 500,
      message: "AI response is not valid JSON",
      error: err.message,
    };
  }

  const rowIndex = data.findIndex(
    (row) => row["Tracking Number"] == trackingNumber
  );
  if (rowIndex === -1) {
    return {
      status: 404,
      message: "Tracking number not found in Excel data.",
    };
  }

  const excelRowNumber = rowIndex + 2;

  const amountCell = `AE${excelRowNumber}`;
  const reasonCell = `AF${excelRowNumber}`;
  worksheet[amountCell] = { t: "n", v: aiResult.amount };
  worksheet[reasonCell] = { t: "s", v: aiResult.reason };

  xlsx.writeFile(workbook, excelFilePath);
};

const processDataFromPDFs = async (allPdfTexts, foundRow) => {
  const pdfContents = allPdfTexts
    .map(({ file, text }) => `File: ${file}\n${text}`)
    .join("\n\n");
  const excelColumns = Object.entries(foundRow)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
  const prompt = `
   You are an expert payout processor. Given the following Excel row and PDF contents, determine the amount to payout.
   Respond ONLY with a object like this: '{"amount": <number>, "reason": "<short explanation>"}'
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

  return completion.choices[0].message.content;
};

const getPDFs = async (foundRow) => {
  const pdfFolderPath = path.join(
    __dirname,
    "../pdfs",
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
    return allPdfTexts;
  } catch (error) {
    return {
      status: 500,
      message: "Error processing AI response",
      error: error.message,
    };
  }
};
