require("dotenv").config();

const express = require("express");
const cors = require("cors");
const sequelize = require("./config/database");

const app = express();
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());

const { Column } = require("./models");

app.use("/auth", require("./routes/authRoutes"));
app.use("/columns", require("./routes/columnRoutes"));
app.use("/cards", require("./routes/cardRoutes"));
app.use("/ai", require("./routes/aiRoutes"));

// Database sync moved to server.js to prevent race condition

module.exports = app;