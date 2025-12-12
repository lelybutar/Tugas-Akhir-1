<?php
// =====================================================================
// mqtt_send_config.php - IMPROVED VERSION
// Kirim konfigurasi periode & frequency ke ESP32 via MQTT
// WITH ERROR HANDLING & LOGGING
// =====================================================================
header('Content-Type: application/json');
require_once 'db_connection.php';

// ✅ Check if MQTT library exists
if (!file_exists(__DIR__ . '/vendor/autoload.php')) {
    echo json_encode([
        'success' => false,
        'message' => '❌ MQTT library belum terinstall!',
        'solution' => 'Jalankan command: composer require php-mqtt/client'
    ]);
    exit;
}

require_once 'vendor/autoload.php';

use PhpMqtt\Client\MqttClient;
use PhpMqtt\Client\ConnectionSettings;

$input = json_decode(file_get_contents('php://input'), true);

$id_device = isset($input['id_device']) ? intval($input['id_device']) : 0;
$time_start = isset($input['time_start']) ? $input['time_start'] : '';
$time_end = isset($input['time_end']) ? $input['time_end'] : '';
$frequency = isset($input['frequency']) ? intval($input['frequency']) : 60;

if ($id_device <= 0 || empty($time_start) || empty($time_end)) {
    echo json_encode([
        'success' => false,
        'message' => 'Parameter tidak lengkap'
    ]);
    exit;
}

try {
    // ✅ 1. UPDATE DATABASE
    $query = "INSERT INTO device_config (id_device, time_start, time_end, frequency, updated_at) 
              VALUES (?, ?, ?, ?, NOW())
              ON DUPLICATE KEY UPDATE 
              time_start = VALUES(time_start),
              time_end = VALUES(time_end),
              frequency = VALUES(frequency),
              updated_at = NOW()";
    
    $stmt = $conn->prepare($query);
    $stmt->bind_param("issi", $id_device, $time_start, $time_end, $frequency);
    $stmt->execute();
    $stmt->close();
    
    // ✅ 2. SEND VIA MQTT
    $mqtt_server = 'broker.emqx.io';
    $mqtt_port = 1883;
    $client_id = 'web_config_' . uniqid();
    
    error_log("MQTT: Connecting to $mqtt_server:$mqtt_port...");
    
    $mqtt = new MqttClient($mqtt_server, $mqtt_port, $client_id);
    
    $connectionSettings = (new ConnectionSettings())
        ->setKeepAliveInterval(60)
        ->setConnectTimeout(10)
        ->setSocketTimeout(10);
    
    $mqtt->connect($connectionSettings, true);
    
    if (!$mqtt->isConnected()) {
        throw new Exception("Tidak bisa connect ke MQTT broker");
    }
    
    error_log("MQTT: Connected successfully!");
    
    // Publish
    $topic = "device/{$id_device}/config";
    $payload = json_encode([
        'time_start' => $time_start,
        'time_end' => $time_end,
        'frequency' => $frequency,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    
    $mqtt->publish($topic, $payload, 1); // QoS 1
    error_log("MQTT: Published to topic: $topic");
    
    $mqtt->disconnect();
    error_log("MQTT: Disconnected");
    
    $conn->close();
    
    echo json_encode([
        'success' => true,
        'message' => 'Konfigurasi berhasil dikirim ke device',
        'data' => [
            'id_device' => $id_device,
            'time_start' => $time_start,
            'time_end' => $time_end,
            'frequency' => $frequency,
            'topic' => $topic
        ]
    ]);
    
} catch (Exception $e) {
    error_log("MQTT Error: " . $e->getMessage());
    
    echo json_encode([
        'success' => false,
        'message' => 'Gagal mengirim konfigurasi: ' . $e->getMessage()
    ]);
}
?>