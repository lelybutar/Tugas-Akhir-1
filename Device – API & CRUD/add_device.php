<?php
// =====================================================================
// FILE 4: add_device.php (FIX - SESUAI TABEL device BUKAN devices)
// Tambah device baru
// Letakkan di: D:\xampp\htdocs\iot_weather\add_device.php
// =====================================================================
header('Content-Type: application/json');
require_once 'db_connection.php';

$nama_device = $_POST['nama_device'] ?? '';
$latitude = $_POST['latitude'] ?? '';
$longitude = $_POST['longitude'] ?? '';
$interval_data = $_POST['interval_data'] ?? 60;

if (empty($nama_device) || empty($latitude) || empty($longitude)) {
    echo json_encode([
        'success' => false,
        'message' => 'Semua field harus diisi'
    ]);
    exit;
}

try {
    // Insert ke tabel device (BUKAN devices)
    $query = "INSERT INTO device (nama_device, latitude, longitude, interval_data) 
              VALUES (?, ?, ?, ?)";
    
    $stmt = $conn->prepare($query);
    $stmt->bind_param("ssdi", $nama_device, $latitude, $longitude, $interval_data);
    
    if ($stmt->execute()) {
        $new_id = $conn->insert_id;
        
        echo json_encode([
            'success' => true,
            'message' => 'Device berhasil ditambahkan',
            'id_device' => $new_id
        ]);
    } else {
        throw new Exception($conn->error);
    }
    
    $stmt->close();
    $conn->close();
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Gagal menambah device: ' . $e->getMessage()
    ]);
}
?>