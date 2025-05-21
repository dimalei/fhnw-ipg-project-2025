#include <Adafruit_NeoPixel.h>
#include <Arduino.h>
#include <ArduinoJson.h>
#include <HTTPClient.h>
#include <SocketIOclient.h>
#include <WiFiClientSecure.h>

#include "OneButton.h"
#include "secrets.h"

OneButton button;
#define BUTTON_PIN 6
// 4 external RGB LEDs on pin 1
// 1 internal RGB LED on pin 8
#define USE_SERIAL Serial
#define LED_PIN 1
#define LED_COUNT 4
Adafruit_NeoPixel pixel(LED_COUNT, LED_PIN, NEO_GRB + NEO_KHZ800);
bool bulbIsOn = false;

char bulbID[20] = "ESP32_";
uint8_t macAddress[6];

#define HOST "bulb-dashboard.dimalei-fhnw-project.xyz"
const uint16_t PORT = 80;
SocketIOclient socketIO;
unsigned long lastPoTMillis = 0;
const unsigned int blinkInterval = 500;
const unsigned long reconnectInterval = 5000;

// TODO: use correct colors
const uint32_t BLACK =
    pixel.Color(0, 0, 0);  // RGBA format (black with full alpha)
const uint32_t BLUE = pixel.Color(0, 0, 255);
const uint32_t GREEN = pixel.Color(0, 255, 0);
const uint32_t RED = pixel.Color(255, 0, 0);
const uint32_t WHITE = pixel.Color(255, 255, 255);

void turnOnBulb() {
  pixel.setPixelColor(0, WHITE);
  pixel.show();
  bulbIsOn = true;
  socketIO.sendEVENT("/bulbs, [\"turn-on\"]");
}

void turnOffBulb() {
  pixel.setPixelColor(0, BLACK);
  pixel.show();
  bulbIsOn = false;
  socketIO.sendEVENT("/bulbs, [\"turn-off\"]");
}

void toggleBulb() {
  if (bulbIsOn) {
    turnOffBulb();
  } else {
    turnOnBulb();
  }
}

void turnOnAll() {
  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  char url[100];
  snprintf(url, sizeof(url), "https://%s/api/on-all", HOST);
  http.begin(url);
  int responseCode = http.GET();  // fire and forget
  USE_SERIAL.print("Response: ");
  USE_SERIAL.println(responseCode);
  http.end();
}

void turnOffAll() {
  WiFiClientSecure client;
  client.setInsecure();

  HTTPClient http;
  char url[100];
  snprintf(url, sizeof(url), "https://%s/api/off-all", HOST);
  http.begin(url);
  int responseCode = http.GET();  // fire and forget
  USE_SERIAL.print("Response: ");
  USE_SERIAL.println(responseCode);
  http.end();
}

void toggleAll() {
  USE_SERIAL.println("Toggling All");
  if (bulbIsOn) {
    turnOffAll();
  } else {
    turnOnAll();
  }
}

void socketIOEvent(socketIOmessageType_t type, uint8_t *payload,
                   size_t length) {
  USE_SERIAL.println("event");
  switch (type) {
    case sIOtype_DISCONNECT:
      USE_SERIAL.printf("[IOc] Disconnected!\n");
      break;
    case sIOtype_CONNECT:
      USE_SERIAL.printf("[IOc] Connected to url: %s\n", payload);

      // join bulbs namespace
      socketIO.send(sIOtype_CONNECT, "/bulbs");
      break;
    case sIOtype_EVENT: {
      char *sptr = NULL;
      int id = strtol((char *)payload, &sptr, 10);
      USE_SERIAL.printf("[IOc] get event: %s id: %d\n", payload, id);
      if (id) {
        payload = (uint8_t *)sptr;
      }

      // remove namespace from payload
      char *jsonStart = strchr((char *)payload, ',');
      if (!jsonStart) {
        USE_SERIAL.println("Invalid payload: missing comma");
        return;
      }
      jsonStart++;  // move past the comma

      JsonDocument doc;
      DeserializationError error = deserializeJson(doc, jsonStart);
      if (error) {
        USE_SERIAL.print(F("deserializeJson() failed: "));
        USE_SERIAL.println(error.c_str());
        return;
      }

      String eventName = doc[0];
      USE_SERIAL.printf("[IOc] event name: %s\n", eventName.c_str());

      // Message Includes a ID for a ACK (callback)
      if (id) {
        JsonDocument docOut;
        JsonArray array = docOut.to<JsonArray>();
        JsonObject param1;
        array.add<JsonObject>(param1);
        param1["ack"] = true;
        param1["timestamp"] = millis();

        String output;
        output += id;
        serializeJson(docOut, output);
        socketIO.send(sIOtype_ACK, output);
      }

      if (eventName.equals("toggle-all")) {
        toggleBulb();
      } else if (eventName.equals("on-all")) {
        turnOnBulb();
      } else if (eventName.equals("off-all")) {
        turnOffBulb();
      }

    } break;
    case sIOtype_ACK:
      USE_SERIAL.printf("[IOc] get ack: %u\n", length);
      break;
    case sIOtype_ERROR:
      USE_SERIAL.printf("[IOc] get error: %u\n", length);
      break;
    case sIOtype_BINARY_EVENT:
      USE_SERIAL.printf("[IOc] get binary: %u\n", length);
      break;
    case sIOtype_BINARY_ACK:
      USE_SERIAL.printf("[IOc] get binary ack: %u\n", length);
      break;
  }
}

void connectSocket() {
  USE_SERIAL.println("Connecting to Socket ...");
  String url = "/socket.io/?EIO=4&type=IoTBulb&bulbID=";
  url += bulbID;
  url += "&isOn=";
  url += bulbIsOn ? "true" : "false";

  socketIO.beginSSL(HOST, 443, url);
  socketIO.onEvent(socketIOEvent);
}

void setup() {
  USE_SERIAL.begin(115200);
  USE_SERIAL.println("Hello, starting now...");

  button.setup(BUTTON_PIN, INPUT, false);
  button.attachClick(toggleBulb);
  USE_SERIAL.println("Attached click action.");

  pixel.begin();
  pixel.setBrightness(50);
  pixel.setPixelColor(1, pixel.Color(0, 0, 100));
  pixel.show();
  USE_SERIAL.println("Pixels initialised.");

  USE_SERIAL.println("Connecting WiFi ...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    button.tick();

    if (millis() - lastPoTMillis > blinkInterval) {
      Serial.print(".");
      // blink wifi led
      if (pixel.getPixelColor(1) == BLACK) {
        pixel.setPixelColor(1, BLUE);
      } else {
        pixel.setPixelColor(1, BLACK);
      }
      pixel.show();
      lastPoTMillis = millis();
    }
  }

  USE_SERIAL.println("WiFi Connected");
  USE_SERIAL.println(WiFi.localIP().toString());

  pixel.setPixelColor(1, BLACK);
  pixel.show();

  // attach toggle all functionality after wifi is connected.
  button.attachDoubleClick(toggleAll);

  esp_read_mac(macAddress, ESP_MAC_WIFI_STA);
  for (int i = 2; i < 6; i++) {  // Last 4 bytes
    char hexByte[3];             // 2 hex digits + null terminator
    sprintf(hexByte, "%02X", macAddress[i]);
    strncat(bulbID, hexByte, sizeof(bulbID) - strlen(bulbID) - 1);
  }

  USE_SERIAL.println(bulbID);

  connectSocket();
}

void loop() {
  socketIO.loop();
  button.tick();

  if (!socketIO.isConnected() && millis() - lastPoTMillis > reconnectInterval) {
    USE_SERIAL.println("Trying to reconnect to Socket.IO server...");
    connectSocket();
    lastPoTMillis = millis();
  }

  // indicate socket not beeing connected
  if (!socketIO.isConnected() &&
      pixel.getPixelColor(1) == pixel.Color(12, 12, 12)) {
    pixel.setPixelColor(1, RED);
    pixel.show();
  }
  if ((socketIO.isConnected() && pixel.getPixelColor(1) != BLACK)) {
    pixel.setPixelColor(1, BLACK);
    pixel.show();
  }
}