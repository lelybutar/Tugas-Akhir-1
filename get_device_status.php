<?php
// =====================================================================
// FILE 1: get_device_status.php
// Menggunakan tabel device_config (BUKAN devices)
// Letakkan di: D:\xampp\htdocs\iot_weather\get_device_status.php
// =====================================================================
header('Content-Type: application/json');
require_once 'db_connection.php';

$id_device = isset($_GET['id_device']) ? intval($_GET['id_device']) : 0;

if ($id_device <= 0) {
    echo json_encode([
        'wifi' => 'unknown',
        'mqtt' => 'unknown',
        'database' => 'unknown',
        'device_power' => 'unknown',
        'sensors' => []
    ]);
    exit;
}

try {
    // Check database connection
    $db_status = 'active';
    
    // Check last data received (within last 5 minutes = device is active)
    $query = "SELECT MAX(timestamp) as last_seen, 
              id_sensor, value 
              FROM data_sensor 
              WHERE id_device = ? 
              AND timestamp >= DATE_SUB(NOW(), INTERVAL 5 MINUTE)
              GROUP BY id_sensor";
    
    $stmt = $conn->prepare($query);
    $stmt->bind_param("i", $id_device);
    $stmt->execute();
    $result = $stmt->get_result();
    
    $last_seen = null;
    $sensor_status = [];
    $sensor_map = [
        1 => 'temperature',
        2 => 'humidity',
        3 => 'wind',
        4 => 'rain',
        5 => 'light_intensity'
    ];
    
    while ($row = $result->fetch_assoc()) {
        $sensor_name = $sensor_map[$row['id_sensor']] ?? 'unknown';
        $sensor_status[$sensor_name] = 'normal';
        if (!$last_seen) {
            $last_seen = $row['last_seen'];
        }
    }
    
    // Check device power status dari tabel device_config
    $config_query = "SELECT device_status FROM device_config WHERE id_device = ?";
    $config_stmt = $conn->prepare($config_query);
    $config_stmt->bind_param("i", $id_device);
    $config_stmt->execute();
    $config_result = $config_stmt->get_result();
    
    $device_power = 'unknown';
    if ($config_row = $config_result->fetch_assoc()) {
        $device_power = $config_row['device_status'] ?? 'on'; // default on
    } else {
        // If no config, assume ON if receiving data
        $device_power = $last_seen ? 'on' : 'off';
    }
    
    // Determine WiFi and MQTT status based on recent data
    $time_diff = $last_seen ? (time() - strtotime($last_seen)) : 9999;
    
    $wifi_status = ($time_diff < 300) ? 'connected' : 'disconnected';
    $mqtt_status = ($time_diff < 300) ? 'connected' : 'error';
    
    // If no sensors detected, mark as error
    if (empty($sensor_status)) {
        $sensor_status = [
            'temperature' => 'error',
            'humidity' => 'error',
            'wind' => 'error',
            'rain' => 'error',
            'light_intensity' => 'error'
        ];
    }
    
    echo json_encode([
        'wifi' => $wifi_status,
        'mqtt' => $mqtt_status,
        'database' => $db_status,
        'device_power' => $device_power,
        'sensors' => $sensor_status,
        'last_seen' => $last_seen
    ]);
    
    $stmt->close();
    $config_stmt->close();
    $conn->close();
    
} catch (Exception $e) {
    echo json_encode([
        'wifi' => 'error',
        'mqtt' => 'error',
        'database' => 'failed',
        'device_power' => 'unknown',
        'sensors' => [],
        'error' => $e->getMessage()
    ]);
}
?>

