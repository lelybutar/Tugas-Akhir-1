<?php
/*
 * save_sensor_data.php
 * Endpoint untuk menerima data dari ESP32 RX Gateway
 * Menyimpan data dari semua sensor ke database
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Include database connection
require_once 'db_connection.php';

// Read JSON input
$json = file_get_contents('php://input');
$data = json_decode($json, true);

// Log for debugging
error_log("Received data: " . $json);

// Validate input
if (!$data) {
    echo json_encode([
        'success' => false,
        'message' => 'Invalid JSON data'
    ]);
    exit;
}

// Extract data
$id_device = isset($data['id_device']) ? intval($data['id_device']) : 0;
$timestamp = isset($data['timestamp']) ? $data['timestamp'] : date('Y-m-d H:i:s');
$temperature = isset($data['temperature']) ? floatval($data['temperature']) : null;
$humidity = isset($data['humidity']) ? floatval($data['humidity']) : null;
$wind = isset($data['wind']) ? floatval($data['wind']) : null;
$rain = isset($data['rain']) ? floatval($data['rain']) : null;
$light_intensity = isset($data['light_intensity']) ? floatval($data['light_intensity']) : null;
$latitude = isset($data['latitude']) ? floatval($data['latitude']) : null;
$longitude = isset($data['longitude']) ? floatval($data['longitude']) : null;

// Validate device ID
if ($id_device <= 0) {
    echo json_encode([
        'success' => false,
        'message' => 'Invalid device ID'
    ]);
    exit;
}

// Mapping sensor ID
$sensors = [
    1 => $temperature,  // Temperature
    2 => $humidity,     // Humidity
    3 => $wind,         // Wind Speed
    4 => $rain,         // Rainfall
    5 => $light_intensity // Light Intensity
];

try {
    // Begin transaction
    $conn->begin_transaction();
    
    $success_count = 0;
    $error_count = 0;
    
    // Insert each sensor data
    foreach ($sensors as $sensor_id => $value) {
        if ($value !== null) {
            $sql = "INSERT INTO data_sensor (id_device, id_sensor, value, timestamp, latitude, longitude) 
                    VALUES (?, ?, ?, ?, ?, ?)";
            
            $stmt = $conn->prepare($sql);
            
            if ($stmt) {
                $stmt->bind_param("iidsdd", 
                    $id_device, 
                    $sensor_id, 
                    $value, 
                    $timestamp, 
                    $latitude, 
                    $longitude
                );
                
                if ($stmt->execute()) {
                    $success_count++;
                } else {
                    $error_count++;
                    error_log("Error inserting sensor " . $sensor_id . ": " . $stmt->error);
                }
                
                $stmt->close();
            } else {
                $error_count++;
                error_log("Error preparing statement: " . $conn->error);
            }
        }
    }
    
    // Commit transaction
    $conn->commit();
    
    // Response
    echo json_encode([
        'success' => true,
        'message' => 'Data saved successfully',
        'details' => [
            'device_id' => $id_device,
            'timestamp' => $timestamp,
            'sensors_saved' => $success_count,
            'sensors_failed' => $error_count,
            'data' => [
                'temperature' => $temperature,
                'humidity' => $humidity,
                'wind' => $wind,
                'rain' => $rain,
                'light_intensity' => $light_intensity
            ]
        ]
    ]);
    
} catch (Exception $e) {
    // Rollback on error.
    $conn->rollback();
    
    error_log("Database error: " . $e->getMessage());
    
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}

$conn->close();
?>