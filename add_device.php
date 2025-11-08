<?php
header('Content-Type: application/json');

// Koneksi database
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "weather_db";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    die(json_encode(['success' => false, 'message' => 'Database connection failed']));
}

// Ambil data dari POST
$nama_device = $_POST['nama_device'] ?? '';
$latitude = $_POST['latitude'] ?? '';
$longitude = $_POST['longitude'] ?? '';
$interval_data = $_POST['interval_data'] ?? 60;

// Validasi
if (empty($nama_device) || empty($latitude) || empty($longitude)) {
    echo json_encode(['success' => false, 'message' => 'Data tidak lengkap']);
    exit;
}

// Insert ke tabel device
$sql = "INSERT INTO device (nama_device, latitude, longitude, interval_data) VALUES (?, ?, ?, ?)";
$stmt = $conn->prepare($sql);
$stmt->bind_param("sddi", $nama_device, $latitude, $longitude, $interval_data);

if ($stmt->execute()) {
    echo json_encode(['success' => true, 'message' => 'Device berhasil ditambahkan', 'id' => $conn->insert_id]);
} else {
    echo json_encode(['success' => false, 'message' => 'Gagal menambahkan device: ' . $conn->error]);
}

$stmt->close();
$conn->close();
?>