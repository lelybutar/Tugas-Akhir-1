<?php
/*
 * control_device.php - IMPROVED VERSION
 * Control Device ON/OFF via MQTT
 * WITH ERROR HANDLING & LOGGING
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// Handle preflight
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

// Get input
$input = json_decode(file_get_contents('php://input'), true);

$id_device = isset($input['id_device']) ? intval($input['id_device']) : 0;
$action = isset($input['action']) ? strtolower(trim($input['action'])) : '';

// Validate input
if ($id_device <= 0) {
    echo json_encode([
        'success' => false,
        'message' => 'Invalid device ID'
    ]);
    exit;
}

if (!in_array($action, ['on', 'off'])) {
    echo json_encode([
        'success' => false,
        'message' => 'Invalid action. Use "on" or "off"'
    ]);
    exit;
}

try {
    // ✅ 1. CHECK IF DEVICE EXISTS
    $checkQuery = "SELECT id_device, nama_device FROM device WHERE id_device = ?";
    $stmt = $conn->prepare($checkQuery);
    $stmt->bind_param("i", $id_device);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        echo json_encode([
            'success' => false,
            'message' => 'Device not found'
        ]);
        exit;
    }
    
    $device = $result->fetch_assoc();
    $stmt->close();
    
    // ✅ 2. UPDATE device_config TABLE
    $updateQuery = "INSERT INTO device_config (id_device, device_status, updated_at) 
                    VALUES (?, ?, NOW())
                    ON DUPLICATE KEY UPDATE 
                    device_status = VALUES(device_status),
                    updated_at = NOW()";
    
    $stmt = $conn->prepare($updateQuery);
    $stmt->bind_param("is", $id_device, $action);
    $stmt->execute();
    $stmt->close();
    
    // ✅ 3. SEND VIA MQTT
    $mqtt_server = 'broker.emqx.io';
    $mqtt_port = 1883;
    $client_id = 'web_control_' . uniqid();
    
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
    
    // Publish control command
    $topic = "device/{$id_device}/control";
    $payload = json_encode([
        'command' => $action,
        'timestamp' => date('Y-m-d H:i:s'),
        'source' => 'web_dashboard'
    ]);
    
    $mqtt->publish($topic, $payload, 1); // QoS 1
    error_log("MQTT: Published to topic: $topic");
    
    $mqtt->disconnect();
    error_log("MQTT: Disconnected");
    
    $conn->close();
    
    // Success response
    echo json_encode([
        'success' => true,
        'message' => "Device '{$device['nama_device']}' turned {$action}",
        'data' => [
            'id_device' => $id_device,
            'device_name' => $device['nama_device'],
            'action' => $action,
            'topic' => $topic,
            'timestamp' => date('Y-m-d H:i:s')
        ]
    ]);
    
} catch (Exception $e) {
    error_log("MQTT Error: " . $e->getMessage());
    
    echo json_encode([
        'success' => false,
        'message' => 'Failed to control device: ' . $e->getMessage()
    ]);
}
?>