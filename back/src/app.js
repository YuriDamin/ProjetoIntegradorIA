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

sequelize
  .sync()
  .then(async () => {
    console.log("📦 Banco sincronizado com sucesso");

    // Seed columns if empty
    const count = await Column.count();
    if (count === 0) {
      console.log("🌱 Semeando colunas padrão...");
      await Column.bulkCreate([
        { id: "backlog", title: "Backlog", order: 1 },
        { id: "doing", title: "Em Andamento", order: 2 },
        { id: "done", title: "Concluído", order: 3 },
      ]);
      console.log("✅ Colunas padrões criadas!");
    }
  })
  .catch((err) => console.error("❌ Erro ao sincronizar banco:", err));

module.exports = app;