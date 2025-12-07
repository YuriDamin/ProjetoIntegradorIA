const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

const app = require("./app");
const http = require("http");
const { Server } = require("socket.io");

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

app.set("io", io);

io.on("connection", (socket) => {
  console.log("Cliente conectado via WebSocket:", socket.id);

  socket.on("disconnect", () => {
    console.log("Cliente desconectado:", socket.id);
  });
});

const sequelize = require("./config/database");
const { Column } = require("./models");

async function startServer() {
  try {
    await sequelize.sync();
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

    server.listen(3001, async () => {
      console.log("Backend rodando na porta 3001 (HTTP + WebSocket)");

      // --- Startup Checks ---
      console.log("\n🔍 Verificando integridade do sistema...");

      // 1. JWT SECRET
      if (process.env.JWT_SECRET) {
        console.log("✅ JWT_SECRET configurado com sucesso.");
      } else {
        console.error("❌ ERRO: JWT_SECRET não encontrado no .env!");
      }

      // 2. GEMINI API
      if (!process.env.GEMINI_API_KEY) {
        console.error("❌ ERRO: GEMINI_API_KEY não encontrada no .env!");
      } else {
        try {
          const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
          const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
          const start = Date.now();
          await model.generateContent("Test connection");
          const duration = Date.now() - start;
          console.log(`✅ Gemini API conectada e respondendo (${duration}ms).`);
        } catch (error) {
          console.error("❌ ERRO: Falha ao conectar com Gemini API:", error.message);
        }
      }
      console.log("--------------------------------------------------\n");
    });
  } catch (err) {
    console.error("❌ Erro fatal ao iniciar servidor:", err);
  }
}

startServer();
