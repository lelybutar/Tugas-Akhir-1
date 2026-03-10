<?php
// =====================================================================
// update_device.php - WITH MQTT SUPPORT (FIXED)
// =====================================================================
header('Content-Type: application/json');
require_once 'db_connection.php';

$id_device = $_POST['id_device'] ?? 0;
$nama_device = $_POST['nama_device'] ?? '';
$latitude = $_POST['latitude'] ?? '';
$longitude = $_POST['longitude'] ?? '';
$interval_data = $_POST['interval_data'] ?? 60;

if ($id_device <= 0 || empty($nama_device) || empty($latitude) || empty($longitude)) {
    echo json_encode([
        'success' => false,
        'message' => 'Semua field harus diisi'
    ]);
    exit;
}

try {
    // 1. UPDATE DEVICE TABLE
    $query = "UPDATE device 
              SET nama_device = ?, 
                  latitude = ?, 
                  longitude = ?, 
                  interval_data = ? 
              WHERE id_device = ?";
    
    $stmt = $conn->prepare($query);
    $stmt->bind_param("ssdii", $nama_device, $latitude, $longitude, $interval_data, $id_device);
    
    if ($stmt->execute()) {
        if ($stmt->affected_rows > 0 || $stmt->affected_rows == 0) {
            // 2. UPDATE DEVICE_CONFIG (FREQUENCY)
            $configQuery = "UPDATE device_config SET frequency = ? WHERE id_device = ?";
            $stmt2 = $conn->prepare($configQuery);
            $stmt2->bind_param("ii", $interval_data, $id_device);
            $stmt2->execute();
            $stmt2->close();
            
            // 3. SEND VIA MQTT (if library available)
            if (file_exists(__DIR__ . '/vendor/autoload.php')) {
                require_once 'vendor/autoload.php';
                
                try {
                    // ✅ Pakai FULL namespace (tanpa use)
                    $mqtt = new \PhpMqtt\Client\MqttClient('broker.emqx.io', 1883, 'web_update_' . uniqid());
                    
                    $connectionSettings = (new \PhpMqtt\Client\ConnectionSettings())
                        ->setConnectTimeout(5)
                        ->setSocketTimeout(5);
                    
                    $mqtt->connect($connectionSettings, true);
                    
                    if ($mqtt->isConnected()) {
                        $topic = "device/{$id_device}/config";
                        $payload = json_encode([
                            'frequency' => $interval_data,
                            'timestamp' => date('Y-m-d H:i:s')
                        ]);
                        
                        $mqtt->publish($topic, $payload, 1);
                        $mqtt->disconnect();
                        
                        error_log("MQTT: Interval config sent to device $id_device");
                    }
                } catch (Exception $e) {
                    error_log("MQTT Error: " . $e->getMessage());
                }
            }
            
            echo json_encode([
                'success' => true,
                'message' => 'Device berhasil diupdate'
            ]);
        } else {
            echo json_encode([
                'success' => false,
                'message' => 'Tidak ada perubahan atau device tidak ditemukan'
            ]);
        }
    } else {
        throw new Exception($conn->error);
    }
    
    $stmt->close();
    $conn->close();
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => 'Gagal update device: ' . $e->getMessage()
    ]);
}
?>