const bulbID = Math.random().toString(36).slice(2, 9).toUpperCase();
const bulbIDString = document.getElementById("id");
const statusString = document.getElementById("status");
const bulb = document.getElementById("bulb");
const button = document.getElementById("toggle");
const connection = document.getElementById("connection");

let isOn = false;
const domain = "bulb-dashboard.dimalei-fhnw-project.xyz";

const socket = io("ws://" + domain + "/bulbs", {
  query: { type: "WebBulb", bulbID: bulbID, isOn: isOn },
});

console.log("This light ID is: " + bulbID); // example output: "k8l3jf9xq"

bulbIDString.innerHTML = "Light ID: #" + bulbID;

socket.on("connect", () => {
  console.log(`Connected to server as socket ${socket.id}`);
  connection.innerText = "connected";
});

socket.on("toggle-all", () => {
  console.log("received toggle-all event.");
  toggleBulb();
});

socket.on("on-all", () => {
  console.log("received on-all event.");
  turnOnBulb();
});

socket.on("off-all", () => {
  console.log("received off-all event.");
  turnOffBulb();
});

socket.on("disconnect", () => {
  console.log(`socket disconnected`);
  connection.innerText = "disconnected";
});

function toggleBulb() {
  if (isOn) {
    turnOffBulb();
  } else {
    turnOnBulb();
  }
}

function turnOnBulb() {
  isOn = true;
  bulb.classList.add("bulb-on");
  statusString.innerHTML = "Light is ON";
  forceReloadFavicon("favicon.png");
  socket.emit("turn-on");
}

function turnOffBulb() {
  isOn = false;
  bulb.classList.remove("bulb-on");
  statusString.innerHTML = "Light is OFF";
  forceReloadFavicon("favicoff.png");
  socket.emit("turn-off");
}

button.onclick = () => {
  toggleBulb();
};

function forceReloadFavicon(newFaviconUrl) {
  const head = document.querySelector("head");
  let link = document.querySelector("link[rel*='icon']");

  if (link) {
    head.removeChild(link);
  }

  link = document.createElement("link");
  link.rel = "icon";
  link.type = "image/x-icon";
  // Add cache-busting query string
  link.href = `${newFaviconUrl}?v=${new Date().getTime()}`;
  head.appendChild(link);
}
