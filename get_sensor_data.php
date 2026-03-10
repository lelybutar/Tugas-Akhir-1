<?php
header('Content-Type: application/json');

// Koneksi database
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "weather_db";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

// Ambil parameter
$id_device = $_GET['id_device'] ?? null;
$date = $_GET['date'] ?? null;
$date_from = $_GET['date_from'] ?? null;
$date_to = $_GET['date_to'] ?? null;

// Build query - JOIN dengan tabel device dan sensor
$sql = "SELECT 
            ds.id,
            ds.id_device,
            ds.id_sensor,
            ds.value,
            ds.timestamp,
            ds.latitude,
            ds.longitude,
            d.nama_device,
            s.nama_sensor,
            s.unit
        FROM data_sensor ds
        LEFT JOIN device d ON ds.id_device = d.id_device
        LEFT JOIN sensor s ON ds.id_sensor = s.id
        WHERE 1=1";

$params = [];
$types = "";

// Filter by device
if ($id_device) {
    $sql .= " AND ds.id_device = ?";
    $params[] = $id_device;
    $types .= "i";
}

// Filter by single date
if ($date) {
    $sql .= " AND DATE(ds.timestamp) = ?";
    $params[] = $date;
    $types .= "s";
}

// Filter by date range
if ($date_from && $date_to) {
    $sql .= " AND DATE(ds.timestamp) BETWEEN ? AND ?";
    $params[] = $date_from;
    $params[] = $date_to;
    $types .= "ss";
} elseif ($date_from) {
    $sql .= " AND DATE(ds.timestamp) >= ?";
    $params[] = $date_from;
    $types .= "s";
} elseif ($date_to) {
    $sql .= " AND DATE(ds.timestamp) <= ?";
    $params[] = $date_to;
    $types .= "s";
}

// ✅ TIDAK ADA LIMIT - Ambil semua data
$sql .= " ORDER BY ds.timestamp DESC";

// Prepare and execute
$stmt = $conn->prepare($sql);

if (!empty($params)) {
    $stmt->bind_param($types, ...$params);
}

$stmt->execute();
$result = $stmt->get_result();

$data = [];
while ($row = $result->fetch_assoc()) {
    $data[] = $row;
}

echo json_encode($data);

$stmt->close();
$conn->close();
?>