<?php
// config.php - TIMEZONE & DATABASE CONFIG
date_default_timezone_set('Asia/Jakarta'); // GMT+7 Indonesia

// Database Configuration
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', '');
define('DB_NAME', 'weather_db');

// Function: Get Database Connection
function getDBConnection() {
    $conn = new mysqli(DB_HOST, DB_USER, DB_PASS, DB_NAME);
    
    if ($conn->connect_error) {
        die(json_encode([
            'error' => true,
            'message' => 'Database connection failed: ' . $conn->connect_error
        ]));
    }
    
    // ⭐ SET TIMEZONE DI MySQL JUGA
    $conn->query("SET time_zone = '+07:00'");
    
    return $conn;
}
?>