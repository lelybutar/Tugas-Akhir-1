<?php
// =====================================================================
// FILE 4: get_device_config.php (BONUS)
// Untuk mendapatkan konfigurasi device tertentu
// Letakkan di: D:\xampp\htdocs\iot_weather\get_device_config.php
// =====================================================================
header('Content-Type: application/json');
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
    $query = "SELECT 
                dc.device_status,
                dc.time_start,
                dc.time_end,
                dc.frequency,
                dc.updated_at,
                d.nama_device
              FROM device_config dc
              JOIN devices d ON dc.id_device = d.id_device
              WHERE dc.id_device = ?";
    
    $stmt = $conn->prepare($query);
    $stmt->bind_param("i", $id_device);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($row = $result->fetch_assoc()) {
        echo json_encode([
            'success' => true,
            'data' => [
                'id_device' => $id_device,
                'nama_device' => $row['nama_device'],
                'device_status' => $row['device_status'],
                'time_start' => $row['time_start'],
                'time_end' => $row['time_end'],
                'frequency' => $row['frequency'],
                'updated_at' => $row['updated_at']
            ]
        ]);
    } else {
        // No config found, return defaults
        echo json_encode([
            'success' => true,
            'data' => [
                'id_device' => $id_device,
                'device_status' => 'on',
                'time_start' => '08:00:00',
                'time_end' => '17:00:00',
                'frequency' => 60,
                'updated_at' => null
            ],
            'message' => 'Using default configuration'
        ]);
    }
    
    $stmt->close();
    $conn->close();
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>