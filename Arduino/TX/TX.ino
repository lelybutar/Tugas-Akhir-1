/*
 * ESP32 TX - Weather Station Transmitter
 * VERSION 2.0 - DENGAN KONTROL SENSOR INDIVIDUAL
 * PIN CONFIGURATION UPDATED - SESUAI HARDWARE FINAL
 * 
 * FITUR:
 * - Kontrol ON/OFF per sensor via MQTT
 * - Hanya baca sensor yang enabled
 * - Device power control (ON/OFF semua sensor)
 * - Subscribe ke topic control dan config
 * 
 * MQTT Topics:
 * - device/{ID}/control → Device ON/OFF & Sensor Control
 * - device/{ID}/config  → Periode & Frequency
 * - device/{ID}/data    → Publish sensor data
 * - device/{ID}/status  → Status report
 * 
 */

#include <Wire.h>
#include <DHT.h>
#include <SPI.h>
#include <LoRa.h>
#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <BH1750.h>
#include "time.h"

// ====== DEVICE CONFIG ======
// ⚠️ PENTING: GANTI INI SESUAI DEVICE DI DATABASE!
const int DEVICE_ID = 3; // ID device di database (1=Marom, 3=Laguboti, dst)
String DEVICE_NAME = "Weather_Station_TX";

// ====== MQTT Config ======
const char* mqtt_server = "broker.emqx.io";
const int mqtt_port = 1883;

WiFiClient espClient;
PubSubClient client(espClient);

// ====== SENSOR PINS & CONFIG ======
// DHT22 - Temperature & Humidity
#define DHT_PIN 4                    // GPIO4
#define DHT_TYPE DHT22
DHT dht(DHT_PIN, DHT_TYPE);

// BH1750 - Light Sensor (I2C: SDA=21, SCL=22)
BH1750 lightMeter;

// Anemometer - Wind Speed
#define ANEMOMETER_PIN 14            
volatile unsigned int anemometerPulseCount = 0;
unsigned long anemometerLastTime = 0;
const float ANEMOMETER_FACTOR = 2.4;

// Tipping Bucket - Rainfall
#define RAIN_SENSOR_PIN 27           // ✅ GPIO27 (UPDATED - PERUBAHAN DARI 26!)
volatile unsigned long rainTipCount = 0;
const float MM_PER_TIP = 0.2794;
float totalRainfall = 0.0;

// ====== LoRa Config ======
#define LORA_SS 5                    // GPIO5
#define LORA_RST 17                  // GPIO17
#define LORA_DIO0 2                  // GPIO2
#define LORA_BAND 433E6
// SPI: SCK=18, MOSI=23, MISO=19

// ====== NTP Time Config ======
const char* ntpServer = "pool.ntp.org";
const long gmtOffset_sec = 7 * 3600; // WIB (UTC+7)
const int daylightOffset_sec = 0;

// ====== PERIODE & FREQUENCY CONFIG (default) ======
String timeStart = "00:00";  
String timeEnd = "23:59";
int dataFrequency = 60; // seconds

// ====== DEVICE CONTROL ======
bool devicePowerOn = true; // Master control

// ====== SENSOR INDIVIDUAL CONTROL ======
bool tempEnabled = true;
bool humidEnabled = true;
bool windEnabled = true;
bool rainEnabled = true;
bool lightEnabled = true;

// ====== STATUS FLAGS ======
bool wifiConnected = false;
bool mqttConnected = false;
bool loraConnected = false;
bool sensorDHTOk = false;
bool sensorBH1750Ok = false;
bool sensorAnemometerOk = false;
bool sensorRainOk = false;

// ====== MQTT TOPICS ======
char topicControl[50];
char topicConfig[50];
char topicData[50];
char topicStatus[50];

// ====== SENSOR DATA VARIABLES ======
float temperature = 0.0;
float humidity = 0.0;
float windSpeed = 0.0;
float rainfall = 0.0;
float lightIntensity = 0.0;

// ====== TIMING VARIABLES ======
unsigned long lastSensorRead = 0;
unsigned long lastStatusReport = 0;
const unsigned long STATUS_REPORT_INTERVAL = 60000; // 1 minute

// =====================================================================
// INTERRUPT HANDLERS
// =====================================================================
void IRAM_ATTR onAnemometerPulse() {
  anemometerPulseCount++;
}

void IRAM_ATTR onRainTip() {
  rainTipCount++;
  totalRainfall += MM_PER_TIP;
}

// =====================================================================
// TIME FUNCTIONS
// =====================================================================
String getFormattedTime() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    return "1970-01-01 00:00:00";
  }
  char buffer[25];
  strftime(buffer, sizeof(buffer), "%Y-%m-%d %H:%M:%S", &timeinfo);
  return String(buffer);
}

String getCurrentTime() {
  struct tm timeinfo;
  if (!getLocalTime(&timeinfo)) {
    return "00:00";
  }
  char buffer[6];
  strftime(buffer, sizeof(buffer), "%H:%M", &timeinfo);
  return String(buffer);
}

bool isWithinPeriode() {
  String currentTime = getCurrentTime();
  
  int currentMinutes = currentTime.substring(0, 2).toInt() * 60 + currentTime.substring(3, 5).toInt();
  int startMinutes = timeStart.substring(0, 2).toInt() * 60 + timeStart.substring(3, 5).toInt();
  int endMinutes = timeEnd.substring(0, 2).toInt() * 60 + timeEnd.substring(3, 5).toInt();
  
  return (currentMinutes >= startMinutes && currentMinutes <= endMinutes);
}

// =====================================================================
// SENSOR READING FUNCTIONS
// =====================================================================

void readDHT22() {
  if (!tempEnabled && !humidEnabled) {
    return;
  }
  
  float h = dht.readHumidity();
  float t = dht.readTemperature();
  
  if (isnan(t) || isnan(h)) {
    sensorDHTOk = false;
    Serial.println("❌ DHT22 Error!");
    temperature = 0.0;
    humidity = 0.0;
  } else {
    sensorDHTOk = true;
    
    if (tempEnabled) {
      temperature = t;
      Serial.printf("✅ Temperature: %.2f°C\n", temperature);
    } else {
      temperature = 0.0;
      Serial.println("⏸️ Temperature disabled");
    }
    
    if (humidEnabled) {
      humidity = h;
      Serial.printf("✅ Humidity: %.2f%%\n", humidity);
    } else {
      humidity = 0.0;
      Serial.println("⏸️ Humidity disabled");
    }
  }
}

void readBH1750() {
  if (!lightEnabled) {
    Serial.println("⏸️ Light sensor disabled");
    lightIntensity = 0.0;
    return;
  }
  
  float lux = lightMeter.readLightLevel();
  
  if (lux < 0 || lux > 65535) {
    sensorBH1750Ok = false;
    Serial.println("❌ BH1750 Error!");
    lightIntensity = 0.0;
  } else {
    sensorBH1750Ok = true;
    lightIntensity = lux;
    Serial.printf("✅ BH1750: Light=%.2f lux\n", lightIntensity);
  }
}

void readAnemometer() {
  if (!windEnabled) {
    Serial.println("⏸️ Wind sensor disabled");
    windSpeed = 0.0;
    return;
  }
  
  detachInterrupt(digitalPinToInterrupt(ANEMOMETER_PIN));
  
  unsigned long currentTime = millis();
  unsigned long timeDiff = currentTime - anemometerLastTime;
  
  if (timeDiff >= 3000) {
    float rpm = (anemometerPulseCount / 2.0) * (60000.0 / timeDiff);
    windSpeed = (rpm * ANEMOMETER_FACTOR) / 60.0;
    
    if (windSpeed < 0 || windSpeed > 50) {
      windSpeed = 0.0;
      sensorAnemometerOk = false;
    } else {
      sensorAnemometerOk = true;
    }
    
    Serial.printf("✅ Anemometer: Wind=%.2f m/s (Pulses=%d)\n", windSpeed, anemometerPulseCount);
    
    anemometerPulseCount = 0;
    anemometerLastTime = currentTime;
  }
  
  attachInterrupt(digitalPinToInterrupt(ANEMOMETER_PIN), onAnemometerPulse, FALLING);
}

void readRainfall() {
  if (!rainEnabled) {
    Serial.println("⏸️ Rain sensor disabled");
    rainfall = 0.0;
    return;
  }
  
  rainfall = totalRainfall;
  sensorRainOk = true;
  
  Serial.printf("✅ Rain Sensor: Rainfall=%.2f mm (Tips=%lu)\n", rainfall, rainTipCount);
}

// =====================================================================
// WIFI SETUP
// =====================================================================
void setup_wifi() {
  Serial.println("\n🔄 Connecting to WiFi: " + String(ssid));
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
    Serial.print("   IP Address: ");
    Serial.println(WiFi.localIP());
  } else {
    wifiConnected = false;
    Serial.println("\n❌ WiFi Connection Failed!");
  }
}

// =====================================================================
// MQTT CALLBACK - TERIMA CONTROL & CONFIG
// =====================================================================
void mqtt_callback(char* topic, byte* payload, unsigned int length) {
  String message = "";
  for (unsigned int i = 0; i < length; i++) {
    message += (char)payload[i];
  }
  
  Serial.println("\n📥 MQTT Message Received:");
  Serial.println("   Topic: " + String(topic));
  Serial.println("   Payload: " + message);
  
  StaticJsonDocument<512> doc;
  DeserializationError error = deserializeJson(doc, message);
  
  if (error) {
    Serial.println("❌ JSON Parse Error: " + String(error.c_str()));
    return;
  }
  
  // Handle CONFIG topic
  if (String(topic) == topicConfig) {
    bool configChanged = false;
    
    if (doc.containsKey("time_start")) {
      timeStart = doc["time_start"].as<String>();
      Serial.println("✅ Time Start updated: " + timeStart);
      configChanged = true;
    }
    
    if (doc.containsKey("time_end")) {
      timeEnd = doc["time_end"].as<String>();
      Serial.println("✅ Time End updated: " + timeEnd);
      configChanged = true;
    }
    
    if (doc.containsKey("frequency")) {
      dataFrequency = doc["frequency"].as<int>();
      Serial.println("✅ Frequency updated: " + String(dataFrequency) + " seconds");
      configChanged = true;
    }
    
    if (doc.containsKey("sensor_temperature")) {
      tempEnabled = (doc["sensor_temperature"] == "on");
      Serial.println("✅ Temperature sensor: " + String(tempEnabled ? "ON" : "OFF"));
      configChanged = true;
    }
    
    if (doc.containsKey("sensor_humidity")) {
      humidEnabled = (doc["sensor_humidity"] == "on");
      Serial.println("✅ Humidity sensor: " + String(humidEnabled ? "ON" : "OFF"));
      configChanged = true;
    }
    
    if (doc.containsKey("sensor_wind")) {
      windEnabled = (doc["sensor_wind"] == "on");
      Serial.println("✅ Wind sensor: " + String(windEnabled ? "ON" : "OFF"));
      configChanged = true;
    }
    
    if (doc.containsKey("sensor_rain")) {
      rainEnabled = (doc["sensor_rain"] == "on");
      Serial.println("✅ Rain sensor: " + String(rainEnabled ? "ON" : "OFF"));
      configChanged = true;
    }
    
    if (doc.containsKey("sensor_light")) {
      lightEnabled = (doc["sensor_light"] == "on");
      Serial.println("✅ Light sensor: " + String(lightEnabled ? "ON" : "OFF"));
      configChanged = true;
    }
    
    if (configChanged) {
      sendStatusReport();
      Serial.println("📋 New Config Applied!");
    }
  }
  
  // Handle CONTROL topic
  if (String(topic) == topicControl) {
    if (doc.containsKey("command")) {
      String command = doc["command"].as<String>();
      
      if (command == "on") {
        devicePowerOn = true;
        Serial.println("✅ Device turned ON");
      } else if (command == "off") {
        devicePowerOn = false;
        Serial.println("⚠️ Device turned OFF - All sensors disabled");
        
        temperature = 0.0;
        humidity = 0.0;
        windSpeed = 0.0;
        lightIntensity = 0.0;
      }
      
      sendStatusReport();
    }
  }
}

// =====================================================================
// MQTT RECONNECT
// =====================================================================
void reconnect_mqtt() {
  int retry = 0;
  while (!client.connected() && retry < 3) {
    Serial.print("🔄 Connecting to MQTT...");
    
    String clientId = "ESP32_TX_" + String(DEVICE_ID);
    
    if (client.connect(clientId.c_str())) {
      mqttConnected = true;
      Serial.println(" ✅ Connected!");
      
      client.subscribe(topicConfig);
      client.subscribe(topicControl);
      
      Serial.println("✅ Subscribed to:");
      Serial.println("   - " + String(topicConfig));
      Serial.println("   - " + String(topicControl));
      
      sendStatusReport();
      
    } else {
      mqttConnected = false;
      Serial.print(" ❌ Failed, rc=");
      Serial.println(client.state());
      delay(2000);
    }
    retry++;
  }
}

// =====================================================================
// SEND STATUS REPORT
// =====================================================================
void sendStatusReport() {
  StaticJsonDocument<1024> doc;
  
  doc["id_device"] = DEVICE_ID;
  doc["device_name"] = DEVICE_NAME;
  doc["timestamp"] = getFormattedTime();
  
  JsonObject status = doc.createNestedObject("status");
  status["device_power"] = devicePowerOn ? "on" : "off";
  status["wifi"] = wifiConnected ? "connected" : "disconnected";
  status["mqtt"] = mqttConnected ? "connected" : "error";
  status["lora"] = loraConnected ? "connected" : "error";
  
  JsonObject sensors = doc.createNestedObject("sensors");
  sensors["dht22"] = sensorDHTOk ? "normal" : "error";
  sensors["bh1750"] = sensorBH1750Ok ? "normal" : "error";
  sensors["anemometer"] = sensorAnemometerOk ? "normal" : "error";
  sensors["rain_sensor"] = sensorRainOk ? "normal" : "error";
  
  JsonObject sensorConfig = doc.createNestedObject("sensor_config");
  sensorConfig["temperature"] = tempEnabled ? "on" : "off";
  sensorConfig["humidity"] = humidEnabled ? "on" : "off";
  sensorConfig["wind"] = windEnabled ? "on" : "off";
  sensorConfig["rain"] = rainEnabled ? "on" : "off";
  sensorConfig["light"] = lightEnabled ? "on" : "off";
  
  JsonObject config = doc.createNestedObject("config");
  config["time_start"] = timeStart;
  config["time_end"] = timeEnd;
  config["frequency"] = dataFrequency;
  
  String statusJson;
  serializeJson(doc, statusJson);
  
  if (client.connected()) {
    client.publish(topicStatus, statusJson.c_str());
    Serial.println("📤 Status Report Sent!");
  }
}

// =====================================================================
// SEND SENSOR DATA
// =====================================================================
void sendSensorData() {
  StaticJsonDocument<768> doc;
  
  doc["id_device"] = DEVICE_ID;
  doc["timestamp"] = getFormattedTime();
  
  if (tempEnabled && temperature != 0.0) {
    doc["temperature"] = round(temperature * 100) / 100.0;
  }
  
  if (humidEnabled && humidity != 0.0) {
    doc["humidity"] = round(humidity * 100) / 100.0;
  }
  
  if (windEnabled) {
    doc["wind"] = round(windSpeed * 100) / 100.0;
  }
  
  if (rainEnabled) {
    doc["rain"] = round(rainfall * 100) / 100.0;
  }
  
  if (lightEnabled) {
    doc["light_intensity"] = round(lightIntensity * 100) / 100.0;
  }
  
  doc["latitude"] = 2.38348;
  doc["longitude"] = 99.14918;
  
  String dataJson;
  serializeJson(doc, dataJson);
  
  if (loraConnected) {
    LoRa.beginPacket();
    LoRa.print(dataJson);
    LoRa.endPacket();
    Serial.println("📡 Data sent via LoRa");
  }
  
  if (client.connected()) {
    client.publish(topicData, dataJson.c_str());
    Serial.println("📡 Data published to MQTT");
  }
  
  Serial.println("📊 Sensor Data:");
  Serial.println("   " + dataJson);
}

// =====================================================================
// SETUP
// =====================================================================
void setup() {
  Serial.begin(115200);
  delay(1000);
  Serial.println("\n\n");
  Serial.println("╔════════════════════════════════════════════════╗");
  Serial.println("║   ESP32 TX - Weather Station V2.0             ║");
  Serial.println("║   PIN Configuration: FINAL HARDWARE            ║");
  Serial.println("╚════════════════════════════════════════════════╝");
  Serial.println();
  Serial.println("⚙️ Device ID: " + String(DEVICE_ID));
  Serial.println("📡 Device Name: " + DEVICE_NAME);
  Serial.println();
  Serial.println("📍 PIN CONFIGURATION:");
  Serial.println("   Anemometer: GPIO14");
  Serial.println("   Rain Gauge: GPIO27 ⚠️ UPDATED!");
  Serial.println("   DHT22: GPIO4");
  Serial.println("   BH1750: SDA=GPIO21, SCL=GPIO22");
  Serial.println("   LoRa: CS=GPIO5, RST=GPIO17, DIO0=GPIO2");
  Serial.println("   SPI: SCK=GPIO18, MOSI=GPIO23, MISO=GPIO19");
  Serial.println();
  
  sprintf(topicControl, "device/%d/control", DEVICE_ID);
  sprintf(topicConfig, "device/%d/config", DEVICE_ID);
  sprintf(topicData, "device/%d/data", DEVICE_ID);
  sprintf(topicStatus, "device/%d/status", DEVICE_ID);
  
  Wire.begin();
  
  Serial.print("🔧 Initializing DHT22 (GPIO4)... ");
  dht.begin();
  delay(2000);
  Serial.println("Done!");
  
  Serial.print("🔧 Initializing BH1750 (I2C)... ");
  if (lightMeter.begin(BH1750::CONTINUOUS_HIGH_RES_MODE)) {
    sensorBH1750Ok = true;
    Serial.println("✅ Success!");
  } else {
    sensorBH1750Ok = false;
    Serial.println("❌ Failed!");
  }
  
  Serial.print("🔧 Initializing Anemometer (GPIO14)... ");
  pinMode(ANEMOMETER_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(ANEMOMETER_PIN), onAnemometerPulse, FALLING);
  anemometerLastTime = millis();
  Serial.println("Done!");
  
  Serial.print("🔧 Initializing Rain Sensor (GPIO27)... ");
  pinMode(RAIN_SENSOR_PIN, INPUT_PULLUP);
  attachInterrupt(digitalPinToInterrupt(RAIN_SENSOR_PIN), onRainTip, FALLING);
  Serial.println("Done!");
  
  setup_wifi();
  
  if (wifiConnected) {
    client.setServer(mqtt_server, mqtt_port);
    client.setCallback(mqtt_callback);
    reconnect_mqtt();
  }
  
  if (wifiConnected) {
    Serial.print("🔧 Syncing time with NTP... ");
    configTime(gmtOffset_sec, daylightOffset_sec, ntpServer);
    delay(2000);
    Serial.println("Done!");
  }
  
  Serial.print("🔧 Initializing LoRa (433 MHz)... ");
  SPI.begin(18, 19, 23, LORA_SS);
  LoRa.setPins(LORA_SS, LORA_RST, LORA_DIO0);
  
  if (LoRa.begin(LORA_BAND)) {
    loraConnected = true;
    Serial.println("✅ Success!");
  } else {
    loraConnected = false;
    Serial.println("❌ Failed!");
  }
  
  Serial.println("\n✅ System Ready!");
  Serial.println("📋 Default Configuration:");
  Serial.println("   Periode: " + timeStart + " - " + timeEnd);
  Serial.println("   Frequency: " + String(dataFrequency) + " seconds");
  Serial.println("\n📊 Sensor Status:");
  Serial.println("   Temperature: " + String(tempEnabled ? "ENABLED" : "DISABLED"));
  Serial.println("   Humidity: " + String(humidEnabled ? "ENABLED" : "DISABLED"));
  Serial.println("   Wind: " + String(windEnabled ? "ENABLED" : "DISABLED"));
  Serial.println("   Rain: " + String(rainEnabled ? "ENABLED" : "DISABLED"));
  Serial.println("   Light: " + String(lightEnabled ? "ENABLED" : "DISABLED"));
  Serial.println();
  
  lastSensorRead = millis();
  lastStatusReport = millis();
}

// =====================================================================
// MAIN LOOP
// =====================================================================
void loop() {
  unsigned long currentMillis = millis();
  
  if (wifiConnected && !client.connected()) {
    reconnect_mqtt();
  }
  if (client.connected()) {
    client.loop();
  }
  
  if (WiFi.status() != WL_CONNECTED) {
    wifiConnected = false;
    Serial.println("⚠️ WiFi disconnected! Reconnecting...");
    setup_wifi();
  } else {
    wifiConnected = true;
  }
  
  if (!devicePowerOn) {
    Serial.println("💤 Device is OFF. Waiting...");
    delay(5000);
    return;
  }
  
  if (!isWithinPeriode()) {
    Serial.println("⏰ Outside periode. Current: " + getCurrentTime() + 
                   " | Range: " + timeStart + " - " + timeEnd);
    delay(60000);
    return;
  }
  
  if (currentMillis - lastSensorRead >= (dataFrequency * 1000)) {
    Serial.println("\n" + String('=', 50));
    Serial.println("📊 Reading Enabled Sensors...");
    Serial.println(String('=', 50));
    
    readDHT22();
    readBH1750();
    readAnemometer();
    readRainfall();
    
    sendSensorData();
    
    lastSensorRead = currentMillis;
    
    Serial.println(String('=', 50));
    Serial.println("⏳ Next reading in " + String(dataFrequency) + " seconds");
    Serial.println(String('=', 50) + "\n");
  }
  
  if (currentMillis - lastStatusReport >= STATUS_REPORT_INTERVAL) {
    sendStatusReport();
    lastStatusReport = currentMillis;
  }
  
  delay(100);
}