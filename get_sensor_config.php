<?php
// =====================================================================
// get_sensor_config.php - UPDATED VERSION
// Ambil konfigurasi sensor dari device_config table
// =====================================================================
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once 'db_connection.php';

$id_device = isset($_GET['id_device']) ? intval($_GET['id_device']) : 0;

if ($id_device <= 0) {
    echo json_encode([
        'success' => false,
        'message' => 'Invalid device ID'
    ]);
    exit;
}

try {
    // ✅ Query column yang sudah ada di device_config
    $query = "SELECT 
                sensor_temperature,
                sensor_humidity,
                sensor_wind,
                sensor_rain,
                sensor_light,
                updated_at
              FROM device_config 
              WHERE id_device = ?";
    
    $stmt = $conn->prepare($query);
    
    if (!$stmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }
    
    $stmt->bind_param("i", $id_device);
    
    if (!$stmt->execute()) {
        throw new Exception("Execute failed: " . $stmt->error);
    }
    
    $result = $stmt->get_result();
    
    if ($row = $result->fetch_assoc()) {
        // Data ditemukan
        echo json_encode([
            'success' => true,
            'data' => [
                'id_device' => $id_device,
                'sensor_temperature' => $row['sensor_temperature'] ?? 'on',
                'sensor_humidity' => $row['sensor_humidity'] ?? 'on',
                'sensor_wind' => $row['sensor_wind'] ?? 'on',
                'sensor_rain' => $row['sensor_rain'] ?? 'on',
                'sensor_light' => $row['sensor_light'] ?? 'on',
                'updated_at' => $row['updated_at']
            ]
        ]);
    } else {
        // Data tidak ditemukan, return default (semua ON)
        echo json_encode([
            'success' => true,
            'data' => [
                'id_device' => $id_device,
                'sensor_temperature' => 'on',
                'sensor_humidity' => 'on',
                'sensor_wind' => 'on',
                'sensor_rain' => 'on',
                'sensor_light' => 'on',
                'updated_at' => date('Y-m-d H:i:s')
            ],
            'message' => 'Using default configuration (all sensors ON)'
        ]);
    }
    
    $stmt->close();
    $conn->close();
    
} catch (Exception $e) {
    error_log("Error in get_sensor_config: " . $e->getMessage());
    
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>