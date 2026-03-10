<?php
header('Content-Type: application/json');
include 'koneksi.php';

// Query gabungan: ambil data terakhir per device
$sql = "
SELECT 
    d.id_device, 
    d.nama_device, 
    d.latitude, 
    d.longitude,
    ds.timestamp,
    ds.temperature,
    ds.humidity,
    ds.wind,
    ds.rain,
    ds.light_intensity
FROM device d
LEFT JOIN (
    SELECT 
        id_device, 
        MAX(timestamp) AS last_time
    FROM data_sensor
    GROUP BY id_device
) latest ON d.id_device = latest.id_device
LEFT JOIN data_sensor ds 
    ON ds.id_device = latest.id_device 
    AND ds.timestamp = latest.last_time
ORDER BY d.id_device ASC
";

$result = $conn->query($sql);
$devices = [];

if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        $devices[] = $row;
    }
}

echo json_encode($devices);
$conn->close();
?>
