<?php
// =====================================================================
// mqtt_send_sensor_config.php - IMPROVED VERSION
// Kirim konfigurasi sensor individual ke ESP32 via MQTT
// WITH ERROR HANDLING & LOGGING
// =====================================================================
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

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
$sensor_temperature = isset($input['sensor_temperature']) ? $input['sensor_temperature'] : 'on';
$sensor_humidity = isset($input['sensor_humidity']) ? $input['sensor_humidity'] : 'on';
$sensor_wind = isset($input['sensor_wind']) ? $input['sensor_wind'] : 'on';
$sensor_rain = isset($input['sensor_rain']) ? $input['sensor_rain'] : 'on';
$sensor_light = isset($input['sensor_light']) ? $input['sensor_light'] : 'on';

if ($id_device <= 0) {
    echo json_encode([
        'success' => false,
        'message' => 'Invalid device ID'
    ]);
    exit;
}

// Validate values
$valid_values = ['on', 'off'];
if (!in_array($sensor_temperature, $valid_values) || 
    !in_array($sensor_humidity, $valid_values) ||
    !in_array($sensor_wind, $valid_values) ||
    !in_array($sensor_rain, $valid_values) ||
    !in_array($sensor_light, $valid_values)) {
    echo json_encode([
        'success' => false,
        'message' => 'Invalid sensor status. Use "on" or "off"'
    ]);
    exit;
}

try {
    // ✅ 1. UPDATE DATABASE
    $query = "UPDATE device_config 
              SET sensor_temperature = ?,
                  sensor_humidity = ?,
                  sensor_wind = ?,
                  sensor_rain = ?,
                  sensor_light = ?,
                  updated_at = NOW()
              WHERE id_device = ?";
    
    $stmt = $conn->prepare($query);
    if (!$stmt) {
        throw new Exception("Database error: " . $conn->error);
    }
    
    $stmt->bind_param("sssssi", 
        $sensor_temperature,
        $sensor_humidity,
        $sensor_wind,
        $sensor_rain,
        $sensor_light,
        $id_device
    );
    
    if (!$stmt->execute()) {
        throw new Exception("Execute failed: " . $stmt->error);
    }
    
    $stmt->close();
    
    // ✅ 2. SEND VIA MQTT
    $mqtt_server = 'broker.emqx.io';
    $mqtt_port = 1883;
    $client_id = 'web_sensor_config_' . uniqid();
    
    error_log("MQTT: Connecting to $mqtt_server:$mqtt_port...");
    
    $mqtt = new MqttClient($mqtt_server, $mqtt_port, $client_id);
    
    $connectionSettings = (new ConnectionSettings())
        ->setKeepAliveInterval(60)
        ->setConnectTimeout(10)  // 10 detik timeout
        ->setSocketTimeout(10);
    
    // Connect
    $mqtt->connect($connectionSettings, true);
    
    if (!$mqtt->isConnected()) {
        throw new Exception("Tidak bisa connect ke MQTT broker");
    }
    
    error_log("MQTT: Connected successfully!");
    
    // Publish
    $topic = "device/{$id_device}/config";
    $payload = json_encode([
        'sensor_temperature' => $sensor_temperature,
        'sensor_humidity' => $sensor_humidity,
        'sensor_wind' => $sensor_wind,
        'sensor_rain' => $sensor_rain,
        'sensor_light' => $sensor_light,
        'timestamp' => date('Y-m-d H:i:s')
    ]);
    
    $mqtt->publish($topic, $payload, 1); // QoS 1
    error_log("MQTT: Published to topic: $topic");
    
    $mqtt->disconnect();
    error_log("MQTT: Disconnected");
    
    $conn->close();
    
    echo json_encode([
        'success' => true,
        'message' => 'Konfigurasi sensor berhasil dikirim ke device',
        'data' => [
            'id_device' => $id_device,
            'topic' => $topic,
            'config' => [
                'sensor_temperature' => $sensor_temperature,
                'sensor_humidity' => $sensor_humidity,
                'sensor_wind' => $sensor_wind,
                'sensor_rain' => $sensor_rain,
                'sensor_light' => $sensor_light
            ],
            'timestamp' => date('Y-m-d H:i:s')
        ]
    ]);
    
} catch (Exception $e) {
    error_log("MQTT Error: " . $e->getMessage());
    
    echo json_encode([
        'success' => false,
        'message' => 'Gagal mengirim konfigurasi: ' . $e->getMessage(),
        'debug' => [
            'server' => $mqtt_server ?? 'unknown',
            'port' => $mqtt_port ?? 0,
            'error_type' => get_class($e)
        ]
    ]);
}
?>