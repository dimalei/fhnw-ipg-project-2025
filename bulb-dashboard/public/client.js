const toggleAll = document.getElementById("toggleAll");
const onAll = document.getElementById("onAll");
const offAll = document.getElementById("offAll");
const tableBody = document.getElementById("table-body");
const indicator = document.getElementById("connectionIndicator");
const addBulb = document.getElementById("newBulb");

const superSectretAuthToken = "1234";
const ip = "86.119.47.104";
const port = "80"

// initiatie socket
const socket = io("ws://" + ip + ":" + port + "/ui", {
  query: {
    type: "ui",
    token: superSectretAuthToken,
  },
});

socket.on("connect", () => {
  refreshUI();
  indicator.classList.replace("text-bg-warning","text-bg-info") = [];
  indicator.innerText = "online";
});

socket.on("disconnect", () => {
  indicator.classList.replace("text-bg-info","text-bg-warning") = [];
  indicator.innerText = "offline";
});

socket.on("refresh-ui", () => {
  refreshUI();
});

// Button Actions
toggleAll.onclick = () => {
  fetch("/api/toggle-all", { method: "POST" });
  console.log("toggling all");
};

onAll.onclick = () => {
  fetch("/api/on-all", { method: "POST" });
  console.log("turning all on");
};

offAll.onclick = () => {
  fetch("/api/off-all", { method: "POST" });
  console.log("turning all off");
};

addBulb.onclick = () =>{
  window.open("http://"+ip +"/web-bulb", "_blank");
}

const refreshUI = () => {
  let lights = [];
  fetch("/api/lights", { method: "GET" })
    .then((response) => response.json())
    .then((data) => {
      lights = data.lights;
      console.log("Fetched lights: ", lights);
      createTable(lights);
    });
};

const createTable = (lights) => {
  tableBody.innerHTML = "";
  lights.forEach((element) => {
    tableBody.appendChild(
      tableEntry(element.lightID, element.type, element.isOn)
    );
  });
};

const tableEntry = (lightID, type, isOn) => {
  const tableRow = elementFromHtml(`<tr>
              <td>${lightID}</td>
              <td>${type}</td>
              <td>
                <button class="btn py-0" style="width: 80px;"></button>
              </td>
            </tr>`);

  const button = tableRow.querySelector("button");
  button.classList.add(isOn ? "btn-light" : "btn-outline-secondary");
  button.innerHTML = isOn ? "ON" : "OFF";
  button.onclick = () => {
    fetch("/api/toggle?lightID=" + encodeURIComponent(lightID), {
      method: "POST",
    }).then((response) => {
      if (!response.ok) {
        console.error("Failed to toggle light", lightID);
      }
    });
  };

  return tableRow;
};

const elementFromHtml = (html) => {
  const temlate = document.createElement("template");
  temlate.innerHTML = html.trim();
  return temlate.content.firstElementChild;
};
