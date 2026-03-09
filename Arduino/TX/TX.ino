#include <SPI.h>
#include <LoRa.h>

// ------------ PIN LORA RECEIVER ----------
#define LORA_SCK   18
#define LORA_MISO  19
#define LORA_MOSI  23
#define LORA_CS     5
#define LORA_RST   17
#define LORA_DIO0   2

void setup() {
  Serial.begin(9600);

  // Mulai SPI & LoRa
  SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_CS);
  LoRa.setPins(LORA_CS, LORA_RST, LORA_DIO0);

  if (!LoRa.begin(433E6)) {
    Serial.println("Receiver: LoRa gagal dimulai!");
    while (1);
  }

  Serial.println("Receiver Siap! Menunggu data...");
}

void loop() {

  int packetSize = LoRa.parsePacket();
  if (packetSize) {

    // ===================== Baca Paket =====================
    String data = "";

    while (LoRa.available()) {
      data += (char)LoRa.read();
    }

    Serial.print("\nPaket diterima: ");
    Serial.println(data);

    // ===================== Parsing Data =====================
    float suhu = 0, kelembapan = 0, curah_hujan = 0, kecepatan_angin = 0;

    int p1 = data.indexOf(',');
    int p2 = data.indexOf(',', p1 + 1);
    int p3 = data.indexOf(',', p2 + 1);

    if (p1 > 0 && p2 > 0 && p3 > 0) {
      suhu            = data.substring(0, p1).toFloat();
      kelembapan      = data.substring(p1 + 1, p2).toFloat();
      curah_hujan     = data.substring(p2 + 1, p3).toFloat();
      kecepatan_angin = data.substring(p3 + 1).toFloat();
    }

    // ===================== Tampilkan ke Serial =====================
    Serial.println("===== DATA SENSOR =====");
    Serial.print("Suhu (°C): ");
    Serial.println(suhu);

    Serial.print("Kelembapan (%): ");
    Serial.println(kelembapan);

    Serial.print("Curah Hujan (mm): ");
    Serial.println(curah_hujan);

    Serial.print("Kecepatan Angin (km/h): ");
    Serial.println(kecepatan_angin);

    // RSSI (kekuatan sinyal)
    Serial.print("RSSI: ");
    Serial.println(LoRa.packetRssi());

    Serial.println("=========================");
  }
}