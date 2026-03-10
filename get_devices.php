<?php
// get_devices.php - Get all devices from database
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Database configuration
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "weather_db";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname, 3307);

// Check connection
if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode([
        'error' => 'Database connection failed',
        'message' => $conn->connect_error
    ]);
    exit;
}

// Set charset to UTF-8
$conn->set_charset("utf8");

// Query to get all devices
$sql = "SELECT 
    id_device, 
    nama_device, 
    latitude, 
    longitude, 
    interval_data 
FROM device 
ORDER BY id_device ASC";

$result = $conn->query($sql);

$devices = [];

if ($result) {
    if ($result->num_rows > 0) {
        while($row = $result->fetch_assoc()) {
            $devices[] = [
                'id_device' => $row['id_device'],
                'nama_device' => $row['nama_device'],
                'latitude' => $row['latitude'],
                'longitude' => $row['longitude'],
                'interval_data' => $row['interval_data']
            ];
        }
    }
} else {
    http_response_code(500);
    echo json_encode([
        'error' => 'Query failed',
        'message' => $conn->error
    ]);
    $conn->close();
    exit;
}

// Return JSON
echo json_encode($devices);

$conn->close();
?>