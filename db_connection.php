<?php
// =====================================================================
// db_connection.php
// Koneksi database untuk semua file PHP
// Letakkan di: D:\xampp\htdocs\iot_weather\db_connection.php
// =====================================================================

// Database configuration
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "weather_db";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname, 3307);

// Check connection
if ($conn->connect_error) {
    // Log error untuk debugging
    error_log("Database connection failed: " . $conn->connect_error);
    
    // Return JSON error untuk AJAX requests
    if (isset($_SERVER['HTTP_X_REQUESTED_WITH']) && 
        strtolower($_SERVER['HTTP_X_REQUESTED_WITH']) === 'xmlhttprequest') {
        header('Content-Type: application/json');
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Database connection failed',
            'message' => 'Cannot connect to database server'
        ]);
        exit;
    }
    
    // Die dengan pesan error untuk non-AJAX
    die("Connection failed: " . $conn->connect_error);
}

// Set charset to UTF-8 untuk support karakter Indonesia
$conn->set_charset("utf8mb4");

// Optional: Set timezone (sesuaikan dengan timezone Anda)
$conn->query("SET time_zone = '+07:00'"); // WIB (Medan)

// Connection berhasil - tidak perlu echo apa-apa
// File ini hanya di-include, tidak dijalankan langsung
?>