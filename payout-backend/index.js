const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");

dotenv.config();
const app = express();
const payoutRoutes = require("./routes/payoutRoutes");
const PORT = process.env.PORT;

app.use(express.json());
app.use(cors());
app.use("/payouts", payoutRoutes);

app
  .listen(PORT, () => {
    console.log("Server running at PORT: ", PORT);
  })
  .on("error", (error) => {
    throw new Error(error.message);
  });
