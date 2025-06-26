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

    const { approvedBenefit } = modifyDBExcel(
      completion,
      excelFilePath,
      trackingNumber,
      data
    );

    const { originalApprovedBenefit, performance } = performancePayout(
      approvedBenefit,
      trackingNumber
    );

    results.push({
      trackingNumber,
      status: 200,
      message: {
        approvedBenefit,
        originalApprovedBenefit,
        performance,
      },
    });
  }

  return results;
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

const processDataFromPDFs = async (allPdfTexts, foundRow) => {
  const pdfContents = allPdfTexts
    .map(({ file, text }) => `File: ${file}\n${text}`)
    .join("\n\n");
  const excelColumns = Object.entries(foundRow)
    .map(([key, value]) => `${key}: ${value}`)
    .join("\n");
  const prompt = `
   You are an expert payout processor and you ONLY and ALWAYS respond in JSON format like this: {"amount": <number>, "reason": "<short explanation>"}.
   Given the following Excel row and PDF contents, determine the amount to payout.

  Instructions to follow for the payout calculation:
  1. The Final Payout Based on Coverage should not exceed the Maximum Benefit specified in the excel data.
  2. If an item or group of items is classified as Beyond normal wear and tear, no further individual analysis is needed for those items.
  3. The only charges/transactions taken into account are those that have not been paid or are overdue.
  4. Only use the charges/transactions that are explicitly stated in the documents, if it is not specified, don't make it up.
  5. If there are bundled charges/transactions, take it as a whole if the amounts of each are not found.
  6. Do not retrieve any negative values for the amount.

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

const modifyDBExcel = (aiResponse, excelFilePath, trackingNumber, data) => {
  const workbook = xlsx.readFile(excelFilePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  let aiResult;
  try {
    aiResult = JSON.parse(aiResponse.match(/{[\s\S]*}/)[0]);
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
  worksheet[amountCell] = { t: "n", v: Math.abs(aiResult.amount ?? "0") };
  worksheet[reasonCell] = { t: "s", v: Math.abs(aiResult.reason ?? "0") };

  xlsx.writeFile(workbook, excelFilePath);

  return {
    approvedBenefit: Math.abs(aiResult.amount ?? "0"),
    reason: Math.abs(aiResult.reason ?? "0"),
  };
};

const performancePayout = (approvedBenefit, trackingNumber) => {
  const excelOriginFilePath = path.join(
    __dirname,
    "../db",
    "OriginalSecurityDepositClaims.xlsx"
  );
  const workbook = xlsx.readFile(excelOriginFilePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = xlsx.utils.sheet_to_json(worksheet);

  const foundRow = data.find((row) => row["Tracking Number"] == trackingNumber);
  const originalApprovedBenefit = foundRow["Approved Benefit Amount"];

  // Error relative calculation
  performance = (
    (Math.abs(originalApprovedBenefit - approvedBenefit) /
      originalApprovedBenefit) *
    100
  ).toFixed(2);

  return {
    originalApprovedBenefit,
    performance,
  };
};
