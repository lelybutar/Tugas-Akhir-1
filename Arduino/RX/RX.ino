/*
 * ESP32 RX - LoRa Gateway FINAL VERSION
 * Dengan NTP Time Synchronization
 * Fix timestamp dari TX dengan waktu real!
 */

#include <WiFi.h>
#include <PubSubClient.h>
#include <SPI.h>
#include <LoRa.h>
#include <ArduinoJson.h>
#include <time.h>

// ====== LoRa Config - MUST MATCH TX! ======
#define LORA_SS 5
#define LORA_RST 17
#define LORA_DIO0 2
#define LORA_BAND 433E6
#define LORA_SF 12
#define LORA_BW 125E3
#define LORA_CR 5
#define LORA_SYNC 0x12

// ====== WiFi ======
const char* ssid = "candy";
const char* password = "candylyv";

// ====== MQTT ======
const char* mqtt_server = "broker.emqx.io";
const int mqtt_port = 1883;
const char* mqtt_topic_web = "iot/weather";
const char* mqtt_topic_nodered = "device";

// ====== NTP Config ======
const char* ntpServer = "id.pool.ntp.org";       // Indonesia NTP
const char* ntpServer2 = "asia.pool.ntp.org";    // Backup
const char* ntpServer3 = "pool.ntp.org";         // Backup
const long gmtOffset_sec = 7 * 3600;             // WIB = GMT+7
const int daylightOffset_sec = 0;

WiFiClient espClient;
PubSubClient client(espClient);

// ====== STATUS ======
bool wifiOk = false;
bool mqttOk = false;
bool loraOk = false;
bool timeSync = false;

// ====== STATS ======
unsigned long rxCount = 0;
unsigned long rxFail = 0;
unsigned long mqttSuccess = 0;
unsigned long mqttFail = 0;

unsigned long lastRX = 0;
unsigned long lastStatus = 0;
unsigned long lastTimeSyncCheck = 0;

// =====================================================================
// GET REAL TIME (dari NTP)
// =====================================================================
String getRealTime() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    return "N/A";
  }
  
  char buf[30];
  strftime(buf, sizeof(buf), "%Y-%m-%d %H:%M:%S", &timeinfo);
  return String(buf);
}

// =====================================================================
// SYNC TIME dengan NTP
// =====================================================================
void syncTime() {
  Serial.print("🕐 Syncing time with NTP... ");
  configTime(gmtOffset_sec, daylightOffset_sec, ntpServer, ntpServer2, ntpServer3);
  
  delay(2000);
  
  struct tm timeinfo;
  int retries = 0;
  while (!getLocalTime(&timeinfo) && retries < 5) {
    delay(1000);
    retries++;
  }
  
  if (getLocalTime(&timeinfo)) {
    timeSync = true;
    Serial.println("✅");
    Serial.println("📅 Current Time: " + getRealTime());
  } else {
    timeSync = false;
    Serial.println("❌ Failed!");
  }
}

// =====================================================================
// WiFi
// =====================================================================
void setup_wifi() {
  Serial.print("\n🔄 WiFi: " + String(ssid) + " ");
  WiFi.begin(ssid, password);
  
  int i = 0;
  while (WiFi.status() != WL_CONNECTED && i < 40) {
    delay(500);
    Serial.print(".");
    i++;
  }
  
  if (WiFi.status() == WL_CONNECTED) {
    wifiOk = true;
    Serial.println("\n✅ WiFi OK: " + WiFi.localIP().toString());
    
    // Sync time
    syncTime();
  } else {
    wifiOk = false;
    timeSync = false;
    Serial.println("\n❌ WiFi Failed!");
  }
}

// =====================================================================
// MQTT
// =====================================================================
void reconnect_mqtt() {
  int retry = 0;
  while (!client.connected() && retry < 3) {
    Serial.print("🔄 MQTT... ");
    String cid = "ESP32_RX_" + String(random(0xffff), HEX);
    
    if (client.connect(cid.c_str())) {
      mqttOk = true;
      Serial.println("✅");
    } else {
      mqttOk = false;
      Serial.println("❌ (rc=" + String(client.state()) + ")");
      delay(2000);
    }
    retry++;
  }
}

// =====================================================================
// PUBLISH
// =====================================================================
bool publishMQTT(String json, int devId) {
  if (!client.connected()) {
    Serial.println("⚠️  MQTT offline");
    return false;
  }
  
  bool ok = true;
  
  // Topic 1: iot/weather
  if (client.publish(mqtt_topic_web, json.c_str(), false)) {
    Serial.println("✅ " + String(mqtt_topic_web));
  } else {
    Serial.println("❌ " + String(mqtt_topic_web));
    ok = false;
  }
  
  // Topic 2: device/{id}/data
  String topic2 = String(mqtt_topic_nodered) + "/" + String(devId) + "/data";
  if (client.publish(topic2.c_str(), json.c_str(), false)) {
    Serial.println("✅ " + topic2);
  } else {
    Serial.println("❌ " + topic2);
    ok = false;
  }
  
  if (ok) mqttSuccess++;
  else mqttFail++;
  
  return ok;
}

// =====================================================================
// PROCESS DATA
// =====================================================================
void processData(String data, int rssi, float snr) {
  Serial.println("\n" + String('═', 60));
  Serial.println("📥 LoRa PACKET RECEIVED!");
  Serial.println(String('═', 60));
  Serial.println("📡 RSSI: " + String(rssi) + " dBm | SNR: " + String(snr, 1) + " dB");
  Serial.println("📦 Size: " + String(data.length()) + " bytes");
  Serial.println("📄 JSON: " + data);
  Serial.println(String('-', 60));
  
  lastRX = millis();
  rxCount++;
  loraOk = true;
  
  // Validate
  data.trim();
  if (!data.startsWith("{") || !data.endsWith("}")) {
    Serial.println("❌ Invalid format");
    rxFail++;
    return;
  }
  
  // Parse
  StaticJsonDocument<1024> doc;
  DeserializationError err = deserializeJson(doc, data);
  
  if (err) {
    Serial.println("❌ Parse error: " + String(err.c_str()));
    rxFail++;
    return;
  }
  
  // Get device ID
  int devId = doc["id_device"] | 0;
  if (devId == 0) {
    Serial.println("❌ No device ID");
    rxFail++;
    return;
  }
  
  // ========================================
  // FIX TIMESTAMP - Pakai waktu REAL dari NTP!
  // ========================================
  String realTime = getRealTime();
  if (timeSync && realTime != "N/A") {
    doc["timestamp"] = realTime;
    Serial.println("🕐 Fixed Timestamp: " + realTime);
  } else {
    Serial.println("⚠️  Time not synced, using TX timestamp: " + String(doc["timestamp"].as<String>()));
  }
  
  // Add metadata
  doc["rssi"] = rssi;
  doc["snr"] = snr;
  doc["gateway"] = "RX_Main";
  doc["rx_time"] = millis() / 1000;
  
  String enhanced;
  serializeJson(doc, enhanced);
  
  // Display
  Serial.println("✅ Parsed:");
  Serial.println("   Device: #" + String(devId));
  Serial.println("   Packet: #" + String(doc["packet"].as<int>()));
  Serial.println("   Time: " + String(doc["timestamp"].as<String>()));
  Serial.println("   Temp: " + String(doc["temperature"].as<float>(), 1) + "°C");
  Serial.println("   Hum: " + String(doc["humidity"].as<float>(), 1) + "%");
  Serial.println("   Wind: " + String(doc["wind"].as<float>(), 2) + " m/s");
  Serial.println("   Rain: " + String(doc["rain"].as<float>(), 2) + " mm");
  Serial.println("   Light: " + String(doc["light_intensity"].as<float>(), 1) + " lux");
  
  Serial.println("\n📤 Publishing to MQTT:");
  bool ok = publishMQTT(enhanced, devId);
  
  Serial.println(String('═', 60));
  if (ok) {
    Serial.println("✅✅✅ SUCCESS - Data forwarded to 2 topics ✅✅✅");
  } else {
    Serial.println("❌❌❌ MQTT FAILED ❌❌❌");
  }
  Serial.println(String('═', 60) + "\n");
}

// =====================================================================
// SETUP
// =====================================================================
void setup() {
  Serial.begin(115200);
  delay(2000);
  
  Serial.println("\n╔════════════════════════════════════╗");
  Serial.println("║  ESP32 RX - LoRa Gateway          ║");
  Serial.println("║  WITH NTP TIME SYNC                ║");
  Serial.println("╚════════════════════════════════════╝\n");
  
  // WiFi + NTP
  setup_wifi();
  
  // MQTT
  if (wifiOk) {
    client.setServer(mqtt_server, mqtt_port);
    client.setBufferSize(2048);
    reconnect_mqtt();
  }
  
  // LoRa - CRITICAL SETUP!
  Serial.print("\nInitializing LoRa 433MHz... ");
  SPI.begin(18, 19, 23, LORA_SS);
  LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);
  
  if (LoRa.begin(LORA_BAND)) {
    LoRa.setSpreadingFactor(LORA_SF);
    LoRa.setSignalBandwidth(LORA_BW);
    LoRa.setCodingRate4(LORA_CR);
    LoRa.setSyncWord(LORA_SYNC);
    LoRa.enableCrc();
    
    loraOk = true;
    Serial.println("✅");
    Serial.println("SF=" + String(LORA_SF) + ", BW=" + String(LORA_BW/1000) + "kHz, CR=4/" + String(LORA_CR));
  } else {
    loraOk = false;
    Serial.println("❌ FAILED!");
    while(1) delay(1000);
  }
  
  Serial.println("\n✅ Gateway Ready!");
  Serial.println("📡 Listening on 433 MHz...");
  Serial.println("\n🌐 MQTT Topics:");
  Serial.println("   → " + String(mqtt_topic_web));
  Serial.println("   → device/{id}/data\n");
  
  lastStatus = millis();
  lastTimeSyncCheck = millis();
}

// =====================================================================
// LOOP
// =====================================================================
void loop() {
  unsigned long now = millis();
  
  // Maintain MQTT
  if (wifiOk && !client.connected()) {
    reconnect_mqtt();
  }
  if (client.connected()) {
    client.loop();
  }
  
  // Check WiFi
  if (WiFi.status() != WL_CONNECTED) {
    if (wifiOk) {
      Serial.println("⚠️  WiFi lost! Reconnecting...");
      wifiOk = false;
      timeSync = false;
    }
    setup_wifi();
  } else {
    wifiOk = true;
  }
  
  // Re-sync time setiap 1 jam (untuk akurasi)
  if (wifiOk && timeSync && (now - lastTimeSyncCheck >= 3600000)) {
    Serial.println("\n🔄 Re-syncing time (hourly check)...");
    syncTime();
    lastTimeSyncCheck = now;
  }
  
  // Check LoRa
  int pkt = LoRa.parsePacket();
  if (pkt) {
    String data = "";
    while (LoRa.available()) {
      data += (char)LoRa.read();
    }
    
    int rssi = LoRa.packetRssi();
    float snr = LoRa.packetSnr();
    
    processData(data, rssi, snr);
  }
  
  // Status report (every minute)
  if (now - lastStatus >= 60000) {
    Serial.println("\n📊 STATUS:");
    Serial.println("WiFi: " + String(wifiOk ? "✅" : "❌"));
    Serial.println("MQTT: " + String(mqttOk ? "✅" : "❌"));
    Serial.println("LoRa: " + String(loraOk ? "✅" : "❌"));
    Serial.println("Time Sync: " + String(timeSync ? "✅" : "❌"));
    if (timeSync) {
      Serial.println("Current Time: " + getRealTime());
    }
    Serial.println("RX: " + String(rxCount) + " | Fail: " + String(rxFail));
    Serial.println("MQTT OK: " + String(mqttSuccess) + " | Fail: " + String(mqttFail) + "\n");
    lastStatus = now;
  }
  
  delay(10);
}