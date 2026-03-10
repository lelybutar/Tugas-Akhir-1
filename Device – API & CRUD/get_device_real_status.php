<?php
// =====================================================================
// get_device_real_status.php - FIXED VERSION
// Cek status device REAL berdasarkan last data received
// Letakkan di: D:\xampp\htdocs\iot_weather\get_device_real_status.php
// =====================================================================
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Database configuration
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "weather_db";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Database connection failed: ' . $conn->connect_error
    ]);
    exit;
}

$id_device = isset($_GET['id_device']) ? intval($_GET['id_device']) : 0;

if ($id_device <= 0) {
    echo json_encode([
        'status' => 'unknown',
        'message' => 'Invalid device ID'
    ]);
    exit;
}

try {
    // ⭐ FIX: Cek last data dalam 5 menit terakhir
    // Gunakan NOW() untuk real-time check
    $query = "SELECT 
                MAX(timestamp) as last_seen,
                COUNT(*) as data_count,
                TIMESTAMPDIFF(SECOND, MAX(timestamp), NOW()) as seconds_ago
              FROM data_sensor 
              WHERE id_device = ?
              GROUP BY id_device";
    
    $stmt = $conn->prepare($query);
    $stmt->bind_param("i", $id_device);
    $stmt->execute();
    $result = $stmt->get_result();
    
    if ($result->num_rows === 0) {
        // Device belum pernah kirim data → OFFLINE (bukan ERROR)
        echo json_encode([
            'status' => 'offline',
            'last_seen' => null,
            'seconds_ago' => null,
            'data_count' => 0,
            'message' => 'No data received from device (never connected)'
        ]);
    } else {
        $row = $result->fetch_assoc();
        
        // Jika last_seen NULL (tidak ada timestamp) → OFFLINE
        if ($row['last_seen'] === null) {
            echo json_encode([
                'status' => 'offline',
                'last_seen' => null,
                'seconds_ago' => null,
                'data_count' => 0,
                'message' => 'Device has no valid data'
            ]);
        } else {
            // Device ONLINE jika data terakhir kurang dari 5 menit (300 detik)
            $seconds_ago = intval($row['seconds_ago']);
            $status = ($seconds_ago <= 300) ? 'online' : 'offline';
            
            echo json_encode([
                'status' => $status,
                'last_seen' => $row['last_seen'],
                'seconds_ago' => $seconds_ago,
                'data_count' => intval($row['data_count']),
                'message' => $status === 'online' 
                    ? "Last data received $seconds_ago seconds ago" 
                    : "Last data received $seconds_ago seconds ago (offline)"
            ]);
        }
    }
    
    $stmt->close();
    $conn->close();
    
} catch (Exception $e) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Database error: ' . $e->getMessage()
    ]);
}
?>