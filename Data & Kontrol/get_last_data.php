<?php
header('Content-Type: application/json');
include 'koneksi.php';

$id_device = isset($_GET['id_device']) ? intval($_GET['id_device']) : 0;

$sql = "
SELECT 
    d.nama_device,
    ds.*
FROM device d
JOIN data_sensor ds ON d.id_device = ds.id_device
WHERE d.id_device = $id_device
ORDER BY ds.timestamp DESC
LIMIT 1
";

$result = $conn->query($sql);

if ($result && $result->num_rows > 0) {
    $data = $result->fetch_assoc();
    echo json_encode($data);
} else {
    echo json_encode(["error" => "No data found"]);
}

$conn->close();
?>
