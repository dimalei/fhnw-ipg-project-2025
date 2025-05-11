const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

const port = 3000;

// frontent routes
app.use(express.static(path.join(__dirname, "../public")));
app.use("/web-bulb", express.static(path.join(__dirname, "../web-bulb")));
const authToken = "1234";

const bulbNamespace = io.of("/bulbs");
const uiNamespace = io.of("/ui");

bulbNamespace.on("connection", (socket) => {
  // save data
  const query = socket.handshake.query;
  socket.data.type = query.type;
  socket.data.lightID = query.bulbID;
  socket.data.isOn = query.isOn === "true"; // since query params are strings
  uiNamespace.emit("refresh-ui");

  socket.on("turn-on", () => {
    socket.data.isOn = true;
    console.log(`Bulb ${socket.data.lightID} just turned ON.`);
  });

  socket.on("turn-off", () => {
    socket.data.isOn = false;
    console.log(`Bulb ${socket.data.lightID} just turned OFF.`);
  });

  socket.on("disconnect", (reason) => {
    uiNamespace.emit("refresh-ui");
    console.log(`Socket ${socket.data.lightID} disconnected: ${reason}`);
  });

  socket.onAny((event, ...args) => {
    uiNamespace.emit("refresh-ui");
    console.log(`Received event '${event}' with args:`, args);
  });
});

uiNamespace.on("connection", (socket) => {
  // save ui data
  const query = socket.handshake.query;
  socket.data.type = "UI";
  console.log(`A UI just connected.`);
});

server.listen(port, () => {
  console.log(`Server listening on port http://localhost:${port}`);
});

app.post("/api/toggle-all", (req, res) => {
  console.log("All bulbs are toggled.");
  // send to all socket connections
  bulbNamespace.emit("toggle-all");
  res.sendStatus(200);
});

app.post("/api/toggle", (req, res) => {
  const toToggleID = req.query.lightID;
  console.log("toggling ", toToggleID);
  Array.from(bulbNamespace.sockets.values())
    .filter((socket) => socket.data.lightID === toToggleID)
    .forEach((socket) => {
      socket.emit("toggle-all");
    });
  res.sendStatus(200);
});

app.post("/api/on-all", (req, res) => {
  console.log("All bulbs are turned on.");
  // send to all socket connections
  bulbNamespace.emit("on-all");
  res.sendStatus(200);
});

app.post("/api/off-all", (req, res) => {
  console.log("All bulbs are turned off.");
  // send to all socket connections
  bulbNamespace.emit("off-all");
  res.sendStatus(200);
});

app.get("/api/lights", (req, res) => {
  let lights = [];
  bulbNamespace.sockets.forEach((socket) => {
    lights.push({
      lightID: socket.data.lightID,
      isOn: socket.data.isOn,
      type: socket.data.type,
    });
  });
  res.send({ lights: lights });
});

setInterval(() => {
  // print all connected sockets evers 5 seconds
  console.log("Currently connected sockets:");
  for (const [id, socket] of bulbNamespace.sockets) {
    console.log(
      `- Socket ID: ${id}, Light ID: ${socket.data.lightID}, type: ${socket.data.type} isOn: ${socket.data.isOn}`
    );
  }
  for (const [id, socket] of uiNamespace.sockets) {
    console.log(`- Socket ID: ${id}, User Interface`);
  }

  console.log("-----");
}, 5000);
