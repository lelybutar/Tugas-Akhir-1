<?php
date_default_timezone_set('Asia/Jakarta');

$servername = "localhost";
$username   = "root";
$password   = "";
$dbname     = "weather_db";

$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) die("Connection failed: " . $conn->connect_error);

$date = $_GET['date'] ?? '';
$id_device = $_GET['id_device'] ?? '';
if (!$date || !$id_device) die('Tanggal dan device harus diisi.');

// Rentang waktu
$start_datetime = date('Y-m-d 00:00:00', strtotime($date));
$end_datetime   = date('Y-m-d 23:59:59', strtotime($date));

// Ambil daftar sensor
$sensor_map = [];
$sensor_sql = "SELECT id, nama_sensor FROM sensor";
$sensor_result = $conn->query($sensor_sql);
while ($row = $sensor_result->fetch_assoc()) {
    $sensor_map[$row['id']] = $row['nama_sensor'];
}

// Ambil data utama (gunakan id_device, bukan nama_device)
$data_sql = "
    SELECT d.timestamp, d.id_sensor, d.value, d.latitude, d.longitude, dv.nama_device AS location
    FROM data_sensor d
    JOIN device dv ON d.id_device = dv.id_device
    WHERE d.id_device = '$id_device'
      AND d.timestamp BETWEEN '$start_datetime' AND '$end_datetime'
    ORDER BY d.timestamp ASC
";
$data_result = $conn->query($data_sql);

$rows = [];
while ($row = $data_result->fetch_assoc()) {
    $ts = $row['timestamp'];
    if (!isset($rows[$ts])) {
        $rows[$ts] = [
            'timestamp' => $ts,
            'location' => $row['location'],
            'latitude' => $row['latitude'],
            'longitude' => $row['longitude'],
        ];
        foreach ($sensor_map as $sname) $rows[$ts][$sname] = '';
    }
    $sensor_name = $sensor_map[$row['id_sensor']] ?? null;
    if ($sensor_name) $rows[$ts][$sensor_name] = $row['value'];
}

// Ambil rata-rata per jam
$avg_sql = "
    SELECT 
        DATE_FORMAT(d.timestamp, '%H:00') AS jam,
        s.nama_sensor,
        AVG(d.value) AS rata_rata
    FROM data_sensor d
    JOIN device dv ON d.id_device = dv.id_device
    JOIN sensor s ON d.id_sensor = s.id
    WHERE d.id_device = '$id_device'
      AND d.timestamp BETWEEN '$start_datetime' AND '$end_datetime'
    GROUP BY jam, s.nama_sensor
    ORDER BY jam ASC, s.nama_sensor ASC
";
$avg_result = $conn->query($avg_sql);

$avg_data = [];
while ($row = $avg_result->fetch_assoc()) {
    $jam_label = $row['jam'] . "–" . date('H:i', strtotime($row['jam']) + 59 * 60);
    if (!isset($avg_data[$jam_label])) {
        $avg_data[$jam_label] = ['Jam' => $jam_label];
        foreach ($sensor_map as $sname) $avg_data[$jam_label][$sname] = '';
    }
    $avg_data[$jam_label][$row['nama_sensor']] = round($row['rata_rata'], 2);
}

// Output CSV
header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="sensor_data_' . $id_device . '_' . $date . '.csv"');

$output = fopen('php://output', 'w');

// Header utama
$header = array_merge(['timestamp', 'location', 'latitude', 'longitude'], array_values($sensor_map));
fputcsv($output, $header);

// Data utama
foreach ($rows as $r) {
    fputcsv($output, $r);
}

// Pisah dengan rata-rata
fputcsv($output, []);
fputcsv($output, ['=== RATA-RATA PER JAM ===']);
$avg_header = array_merge(['Jam'], array_values($sensor_map));
fputcsv($output, $avg_header);

foreach ($avg_data as $r) {
    fputcsv($output, $r);
}

fclose($output);
$conn->close();
exit;
?>
