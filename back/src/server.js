// server.js
const app = require("./app");
const http = require("http");
const { Server } = require("socket.io");

// Cria servidor HTTP em cima do Express
const server = http.createServer(app);

// Instancia o Socket.IO
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000", // front do Next
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Deixa o io disponível em toda a app (req.app.get("io"))
app.set("io", io);

// (Opcional) logs básicos de conexão
io.on("connection", (socket) => {
  console.log("Cliente conectado via WebSocket:", socket.id);

  socket.on("disconnect", () => {
    console.log("Cliente desconectado:", socket.id);
  });
});

// Sobe o servidor HTTP (Express + Socket.IO)
server.listen(3001, () => {
  console.log("Backend rodando na porta 3001 (HTTP + WebSocket)");
});
