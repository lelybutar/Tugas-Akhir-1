/*
 * ESP32 RX - LoRa Gateway Final Version
 * 100% SESUAI dengan Node-RED + Dashboard
 * 
 * PUBLISH KE 2 TOPIC:
 * 1. iot/weather        → Untuk app.js (Dashboard Realtime)
 * 2. device/{id}/data   → Untuk Node-RED Flow 1 (Database)
 * 
 * TIDAK KIRIM KE PHP! Node-RED yang handle database!
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <SPI.h>
#include <LoRa.h>
#include <ArduinoJson.h>

// ====== LoRa Config ======
#define LORA_SS 5
#define LORA_RST 17
#define LORA_DIO0 2
#define LORA_BAND 433E6

// ====== WiFi Config ======
const char* ssid = "candy";        
const char* password = "candylyv";

// ====== MQTT Config ======
const char* mqtt_server = "broker.emqx.io";
const int mqtt_port = 1883;
const char* mqtt_topic_web = "iot/weather";               // Topic untuk Dashboard
const char* mqtt_topic_nodered_prefix = "device";         // device/{id}/data untuk Node-RED
const char* mqtt_topic_gateway_status = "iot/gateway/status";

WiFiClient espClient;
PubSubClient client(espClient);

// ====== STATUS FLAGS ======
bool wifiConnected = false;
bool mqttConnected = false;
bool loraConnected = false;

// ====== TIMING ======
unsigned long lastDataReceived = 0;
unsigned long lastStatusReport = 0;
const unsigned long DATA_TIMEOUT = 300000;      // 5 menit
const unsigned long STATUS_REPORT_INTERVAL = 60000;  // 1 menit

// ====== STATISTICS ======
unsigned long totalPacketsReceived = 0;
unsigned long totalPacketsFailed = 0;
unsigned long totalMQTTSuccess = 0;
unsigned long totalMQTTFailed = 0;

// =====================================================================
// WiFi Setup
// =====================================================================
void setup_wifi() {
  Serial.println("\n🔄 WiFi: " + String(ssid));
  WiFi.begin(ssid, password);
  
  int retry = 0;
  while (WiFi.status() != WL_CONNECTED && retry < 40) {
    delay(500);
    Serial.print(".");
    retry++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    wifiConnected = true;
    Serial.println("\n✅ WiFi Connected!");
    Serial.println("   IP: " + WiFi.localIP().toString());
  } else {
    wifiConnected = false;
    Serial.println("\n❌ WiFi Failed!");
  }
}

// =====================================================================
// MQTT Reconnect
// =====================================================================
void reconnect_mqtt() {
  int retry = 0;
  while (!client.connected() && retry < 3) {
    Serial.print("🔄 MQTT...");
    String clientId = "ESP32_RX_Gateway_" + String(random(0xffff), HEX);
    
    if (client.connect(clientId.c_str())) {
      mqttConnected = true;
      Serial.println(" ✅ Connected!");
      sendGatewayStatus();
    } else {
      mqttConnected = false;
      Serial.print(" ❌ rc=");
      Serial.println(client.state());
      delay(2000);
    }
    retry++;
  }
}

// =====================================================================
// PUBLISH TO MQTT (DUAL TOPIC)
// =====================================================================
bool publishToMQTT(String jsonData, int deviceId) {
  if (!client.connected()) {
    Serial.println("⚠ MQTT not connected");
    return false;
  }
  
  bool success = true;
  
  // 1. Publish ke iot/weather (untuk Dashboard app.js)
  if (client.publish(mqtt_topic_web, jsonData.c_str(), false)) {
    Serial.println("✅ Published to: " + String(mqtt_topic_web));
  } else {
    Serial.println("❌ Failed to: " + String(mqtt_topic_web));
    success = false;
  }
  
  // 2. Publish ke device/{id}/data (untuk Node-RED Flow 1)
  String topicNodeRED = String(mqtt_topic_nodered_prefix) + "/" + String(deviceId) + "/data";
  if (client.publish(topicNodeRED.c_str(), jsonData.c_str(), false)) {
    Serial.println("✅ Published to: " + topicNodeRED);
  } else {
    Serial.println("❌ Failed to: " + topicNodeRED);
    success = false;
  }
  
  if (success) {
    totalMQTTSuccess++;
  } else {
    totalMQTTFailed++;
  }
  
  return success;
}

// =====================================================================
// SEND GATEWAY STATUS
// =====================================================================
void sendGatewayStatus() {
  StaticJsonDocument<512> doc;
  
  doc["gateway_id"] = "RX_Gateway_Main";
  doc["timestamp"] = millis() / 1000;
  
  JsonObject status = doc.createNestedObject("status");
  status["wifi"] = wifiConnected ? "connected" : "disconnected";
  status["mqtt"] = mqttConnected ? "connected" : "error";
  status["lora"] = loraConnected ? "connected" : "error";
  
  JsonObject stats = doc.createNestedObject("statistics");
  stats["packets_received"] = totalPacketsReceived;
  stats["packets_failed"] = totalPacketsFailed;
  stats["mqtt_success"] = totalMQTTSuccess;
  stats["mqtt_failed"] = totalMQTTFailed;
  stats["last_data_age"] = lastDataReceived > 0 ? (millis() - lastDataReceived) / 1000 : 0;
  
  String statusJson;
  serializeJson(doc, statusJson);
  
  if (client.connected()) {
    client.publish(mqtt_topic_gateway_status, statusJson.c_str());
    Serial.println("📤 Gateway Status Sent");
  }
  
  Serial.println("\n📊 Gateway Status:");
  Serial.println("   WiFi: " + String(wifiConnected ? "✅" : "❌"));
  Serial.println("   MQTT: " + String(mqttConnected ? "✅" : "❌"));
  Serial.println("   LoRa: " + String(loraConnected ? "✅" : "❌"));
  Serial.println("   Packets RX: " + String(totalPacketsReceived));
  Serial.println("   MQTT OK: " + String(totalMQTTSuccess));
  Serial.println("   MQTT Fail: " + String(totalMQTTFailed) + "\n");
}

// =====================================================================
// PROCESS RECEIVED DATA
// =====================================================================
void processReceivedData(String receivedData, int rssi, float snr) {
  Serial.println("\n" + String('=', 60));
  Serial.println("📥 LoRa Packet Received");
  Serial.println(String('=', 60));
  Serial.println("📡 RSSI: " + String(rssi) + " dBm | SNR: " + String(snr) + " dB");
  Serial.println("📦 Raw: " + receivedData);
  Serial.println(String('-', 60));
  
  lastDataReceived = millis();
  totalPacketsReceived++;
  
  // Validate JSON
  if (!receivedData.startsWith("{") || !receivedData.endsWith("}")) {
    Serial.println("❌ Invalid JSON format");
    totalPacketsFailed++;
    return;
  }
  
  // Parse JSON
  StaticJsonDocument<1024> doc;
  DeserializationError error = deserializeJson(doc, receivedData);
  
  if (error) {
    Serial.println("❌ JSON Parse Error: " + String(error.c_str()));
    totalPacketsFailed++;
    return;
  }
  
  // Extract device ID
  int deviceId = doc["id_device"] | 0;
  if (deviceId == 0) {
    Serial.println("❌ Missing id_device");
    totalPacketsFailed++;
    return;
  }
  
  // Add LoRa metadata
  doc["rssi"] = rssi;
  doc["snr"] = snr;
  doc["gateway"] = "RX_Gateway_Main";
  doc["received_at"] = millis() / 1000;
  
  String enhancedJson;
  serializeJson(doc, enhancedJson);
  
  Serial.println("📊 Parsed Data:");
  Serial.println("   Device ID: " + String(deviceId));
  Serial.println("   Timestamp: " + String(doc["timestamp"].as<String>()));
  Serial.println("   Temperature: " + String(doc["temperature"].as<float>()) + "°C");
  Serial.println("   Humidity: " + String(doc["humidity"].as<float>()) + "%");
  Serial.println("   Wind: " + String(doc["wind"].as<float>()) + " m/s");
  Serial.println("   Rain: " + String(doc["rain"].as<float>()) + " mm");
  Serial.println("   Light: " + String(doc["light_intensity"].as<float>()) + " lux");
  
  // Publish to MQTT (dual topic)
  bool mqttSuccess = publishToMQTT(enhancedJson, deviceId);
  
  Serial.println(String('=', 60));
  Serial.println("📋 Summary:");
  Serial.println("   MQTT: " + String(mqttSuccess ? "✅ Published to 2 topics" : "❌ Failed"));
  Serial.println("   → " + String(mqtt_topic_web));
  Serial.println("   → device/" + String(deviceId) + "/data");
  Serial.println(String('=', 60) + "\n");
}

// =====================================================================
// SETUP
// =====================================================================
void setup() {
  Serial.begin(115200);
  delay(1000);
  
  Serial.println("\n╔════════════════════════════════════════════════╗");
  Serial.println("║  ESP32 RX - LoRa Gateway (Final Version)      ║");
  Serial.println("║  Publish to: iot/weather + device/{id}/data   ║");
  Serial.println("╚════════════════════════════════════════════════╝\n");
  
  // WiFi
  setup_wifi();
  
  // MQTT
  if (wifiConnected) {
    client.setServer(mqtt_server, mqtt_port);
    client.setBufferSize(2048);  // Increase buffer untuk JSON besar
    reconnect_mqtt();
  }
  
  // LoRa
  Serial.print("🔧 Initializing LoRa... ");
  SPI.begin(18, 19, 23, LORA_SS);
  LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);
  
  if (LoRa.begin(LORA_BAND)) {
    loraConnected = true;
    Serial.println("✅ Success!");
    Serial.println("   Frequency: " + String(LORA_BAND / 1E6) + " MHz");
  } else {
    loraConnected = false;
    Serial.println("❌ Failed!");
    Serial.println("⚠ System will continue but LoRa unavailable!");
  }
  
  Serial.println("\n✅ Gateway Ready!");
  Serial.println("📡 Listening for LoRa packets...");
  Serial.println("\n🌐 MQTT Topics:");
  Serial.println("   [OUT] " + String(mqtt_topic_web) + " → Dashboard");
  Serial.println("   [OUT] device/{id}/data → Node-RED");
  Serial.println("   [OUT] " + String(mqtt_topic_gateway_status) + " → Status\n");
  
  lastStatusReport = millis();
}

// =====================================================================
// MAIN LOOP
// =====================================================================
void loop() {
  unsigned long currentMillis = millis();
  
  // Maintain MQTT connection
  if (wifiConnected && !client.connected()) {
    reconnect_mqtt();
  }
  if (client.connected()) {
    client.loop();
  }
  
  // Check WiFi
  if (WiFi.status() != WL_CONNECTED) {
    if (wifiConnected) {
      Serial.println("⚠ WiFi disconnected! Reconnecting...");
      wifiConnected = false;
    }
    setup_wifi();
  } else {
    wifiConnected = true;
  }
  
  // Check for LoRa packets
  int packetSize = LoRa.parsePacket();
  
  if (packetSize) {
    String receivedData = "";
    while (LoRa.available()) {
      receivedData += (char)LoRa.read();
    }
    
    int rssi = LoRa.packetRssi();
    float snr = LoRa.packetSnr();
    
    processReceivedData(receivedData, rssi, snr);
  }
  
  // Send gateway status report
  if (currentMillis - lastStatusReport >= STATUS_REPORT_INTERVAL) {
    sendGatewayStatus();
    lastStatusReport = currentMillis;
  }
  
  // Check data timeout
  if (lastDataReceived > 0 && (currentMillis - lastDataReceived > DATA_TIMEOUT)) {
    if (loraConnected) {
      unsigned long minutesSinceLastData = (currentMillis - lastDataReceived) / 60000;
      Serial.println("⚠ WARNING: No data for " + String(minutesSinceLastData) + " minutes!");
      loraConnected = false;
    }
  } else if (lastDataReceived > 0) {
    loraConnected = true;
  }
  
  delay(100);
}