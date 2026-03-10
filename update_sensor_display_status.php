<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once 'db_connection.php';

$input = json_decode(file_get_contents('php://input'), true);

$id_device = isset($input['id_device']) ? intval($input['id_device']) : 0;
$sensor = isset($input['sensor']) ? $input['sensor'] : '';
$status = isset($input['status']) ? intval($input['status']) : 1;

if ($id_device <= 0 || empty($sensor)) {
    echo json_encode(['success' => false, 'message' => 'Invalid input']);
    exit;
}

// Map sensor ke column name
$sensorMap = [
    'temperature' => 'is_temperature_active',
    'humidity' => 'is_humidity_active',
    'wind' => 'is_wind_active',
    'rain' => 'is_rain_active',
    'light_intensity' => 'is_light_active'
];

if (!isset($sensorMap[$sensor])) {
    echo json_encode(['success' => false, 'message' => 'Invalid sensor']);
    exit;
}

try {
    $column = $sensorMap[$sensor];
    
    // Gunakan backtick untuk column name yang punya underscore
    $query = "UPDATE device_config 
              SET `$column` = ? 
              WHERE id_device = ?";
    
    $stmt = $conn->prepare($query);
    $stmt->bind_param("ii", $status, $id_device);
    $stmt->execute();
    
    if ($stmt->affected_rows > 0) {
        echo json_encode([
            'success' => true,
            'message' => "Sensor $sensor updated to " . ($status ? 'ON' : 'OFF'),
            'data' => [
                'sensor' => $sensor,
                'status' => $status ? 'ON' : 'OFF'
            ]
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => 'Update failed or no changes'
        ]);
    }
    
    $stmt->close();
    $conn->close();
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>