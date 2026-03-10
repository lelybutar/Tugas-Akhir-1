<?php
header('Content-Type: application/json');

$servername = "localhost";
$username = "root";
$password = "";
$dbname = "weather_db";

$conn = new mysqli($servername, $username, $password, $dbname);

if ($conn->connect_error) {
    die(json_encode(['success' => false, 'message' => 'Database connection failed']));
}

// Ambil data dari POST
$id_device = $_POST['id_device'] ?? '';

// Validasi
if (empty($id_device)) {
    echo json_encode(['success' => false, 'message' => 'ID device tidak valid']);
    exit;
}

// Hapus dari database
$sql = "DELETE FROM device WHERE id_device = ?";
$stmt = $conn->prepare($sql);
$stmt->bind_param("i", $id_device);

if ($stmt->execute()) {
    if ($stmt->affected_rows > 0) {
        echo json_encode(['success' => true, 'message' => 'Device berhasil dihapus']);
    } else {
        echo json_encode(['success' => false, 'message' => 'Device tidak ditemukan']);
    }
} else {
    echo json_encode(['success' => false, 'message' => 'Gagal menghapus device: ' . $conn->error]);
}

$stmt->close();
$conn->close();
?>