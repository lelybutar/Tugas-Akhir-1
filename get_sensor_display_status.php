<?php
// =====================================================================
// get_sensor_display_status.php - FIXED VERSION
// Ambil status DISPLAY sensor untuk realtime page
// ⭐ PENTING: Status ini HANYA mengontrol tampilan, BUKAN proses sensor!
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
    // ✅ Query sensor DISPLAY status dari device_config
    // Kolom ini mengontrol TAMPILAN, bukan proses sensor
    $query = "SELECT 
                sensor_temperature,
                sensor_humidity,
                sensor_wind,
                sensor_rain,
                sensor_light
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
        // ✅ Convert 'on'/'off' string to 1/0 integer untuk JavaScript
        // 1 = TAMPIL, 0 = TIDAK TAMPIL (tapi data tetap diambil!)
        $temp_display = ($row['sensor_temperature'] === 'on' || $row['sensor_temperature'] === 1) ? 1 : 0;
        $humid_display = ($row['sensor_humidity'] === 'on' || $row['sensor_humidity'] === 1) ? 1 : 0;
        $wind_display = ($row['sensor_wind'] === 'on' || $row['sensor_wind'] === 1) ? 1 : 0;
        $rain_display = ($row['sensor_rain'] === 'on' || $row['sensor_rain'] === 1) ? 1 : 0;
        $light_display = ($row['sensor_light'] === 'on' || $row['sensor_light'] === 1) ? 1 : 0;
        
        echo json_encode([
            'success' => true,
            'data' => [
                'id_device' => $id_device,
                'is_temperature_active' => $temp_display,
                'is_humidity_active' => $humid_display,
                'is_wind_active' => $wind_display,
                'is_rain_active' => $rain_display,
                'is_light_active' => $light_display
            ],
            'note' => 'Status ini hanya mengontrol DISPLAY sensor di halaman realtime. Data sensor tetap diambil dan disimpan ke database.'
        ]);
    } else {
        // Default: semua sensor TAMPIL
        echo json_encode([
            'success' => true,
            'data' => [
                'id_device' => $id_device,
                'is_temperature_active' => 1,
                'is_humidity_active' => 1,
                'is_wind_active' => 1,
                'is_rain_active' => 1,
                'is_light_active' => 1
            ],
            'message' => 'Using default status (all sensors displayed)',
            'note' => 'Status ini hanya mengontrol DISPLAY sensor. Data sensor tetap diproses oleh ESP32.'
        ]);
    }
    
    $stmt->close();
    $conn->close();
    
} catch (Exception $e) {
    error_log("Error in get_sensor_display_status: " . $e->getMessage());
    
    echo json_encode([
        'success' => false,
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>