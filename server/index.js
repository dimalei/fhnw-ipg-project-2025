const express = require("express");
const { Server } = require("socket.io");
const http = require("http");
const { join } = require("node:path");

const app = express();
const port = 8080;

const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  console.log(`a user connected ${socket.id}`);

  socket.on("message", (message) => {
    console.log(message);
    io.emit("message", `${socket.id} said ${message}`);
  });
});

app.get("/", (req, res) => {
  res.send("<h1>Hello World!</h1>");
});

server.listen(port, () => {
  console.log(`Server listening on port http://localhost:${port}`);
});
