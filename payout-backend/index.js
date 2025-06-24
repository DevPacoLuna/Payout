const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const xlsx = require("xlsx");
const path = require("path");

dotenv.config();
const app = express();

const PORT = process.env.PORT;

app.use(express.json());
app.use(cors());

app.post("/payouts", (request, response) => {
  const { startTrackingNumber, endTrackingNumber } = request.body;

  const excelFilePath = path.join(__dirname, "SecurityDepositClaims.xlsx");

  const workbook = xlsx.readFile(excelFilePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const data = xlsx.utils.sheet_to_json(worksheet);

  const foundRow = data.find(
    (row) => row["Tracking Number"] == startTrackingNumber
  );

  if (foundRow) {
    response.status(200).json({
      message: "Tracking number found",
      row: foundRow,
    });
  } else {
    response.status(404).json({
      message: "Tracking number not found",
      startTrackingNumber,
    });
  }
});

app
  .listen(PORT, () => {
    console.log("Server running at PORT: ", PORT);
  })
  .on("error", (error) => {
    throw new Error(error.message);
  });
