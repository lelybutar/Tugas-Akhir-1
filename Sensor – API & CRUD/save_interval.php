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
    echo json_encode(['success' => false, 'message' => 'Database connection failed']);
    exit;
}

// Ambil parameter
$id_device = $_GET['id_device'] ?? null;
$interval = $_GET['interval'] ?? null;

// Validasi
if (!$id_device || !$interval) {
    echo json_encode(['success' => false, 'message' => 'Parameter tidak lengkap']);
    exit;
}

// Update interval di tabel device
$sql = "UPDATE device SET interval_data = ? WHERE id_device = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("ii", $interval, $id_device);

if ($stmt->execute()) {
    if ($stmt->affected_rows > 0) {
        echo json_encode(['success' => true, 'message' => "Interval berhasil diubah ke {$interval} detik"]);
    } else {
        echo json_encode(['success' => false, 'message' => 'Device tidak ditemukan atau tidak ada perubahan']);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Gagal update interval: ' . $conn->error]);
}

$stmt->close();
$conn->close();
?>