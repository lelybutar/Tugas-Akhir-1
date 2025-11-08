<?php
require("phpMQTT.php"); // include library phpMQTT

// ====== MQTT Config ======
$server = "broker.hivemq.com";  // ganti sesuai broker
$port = 1883;
$client_id = "PHP_MQTT_Subscriber_" . rand();
$topic = "weather_station/data";

// ====== MySQL Config ======
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "weather_db";

$conn = new mysqli($servername, $username, $password, $dbname);
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// ====== MQTT Connection ======
$mqtt = new phpMQTT($server, $port, $client_id);

if (!$mqtt->connect(true, NULL, NULL, NULL)) {
    exit(1);
}

echo "MQTT connected, subscribing to topic: $topic...\n";

// Callback untuk setiap message
$callback = function($topic, $msg){
    global $conn;
    echo "Message received on topic $topic: $msg\n";

    $data = json_decode($msg, true);
    if($data){
        $temperature = $data['temperature'];
        $humidity    = $data['humidity'];
        $wind_speed  = $data['wind_speed'];
        $rain        = $data['rain'];

        $stmt = $conn->prepare("INSERT INTO weather_data (temperature, humidity, wind_speed, rain) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("dddd", $temperature, $humidity, $wind_speed, $rain);
        $stmt->execute();
        $stmt->close();

        echo "Data saved to MySQL.\n";
    } else {
        echo "Invalid JSON.\n";
    }
};

// Subscribe
$mqtt->subscribe([$topic => ["qos"=>0, "function"=>$callback]]);

while($mqtt->proc()) {
    // loop untuk menunggu message
}

$conn->close();
$mqtt->close();
?>
