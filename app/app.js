const socket = io("ws://localhost:8080");
const input = document.querySelector("input");
const button = document.querySelector("button");

window.onload = function () {
  input.focus();
};

socket.on("message", (text) => {
  const element = document.createElement("li");
  element.innerHTML = text;
  document.querySelector("ul").appendChild(element);
});

input.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    event.preventDefault();
    button.click();
  }
});

button.onclick = () => {
  const text = document.querySelector("input").value;
  socket.emit("message", text);
  input.value = "";
};
