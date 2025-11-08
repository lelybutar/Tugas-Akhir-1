<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>IoT Weather Monitoring - Realtime</title>

  <!-- Leaflet -->
  <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>

  <!-- Chart.js -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>

  <!-- MQTT.js -->
  <script src="https://unpkg.com/mqtt/dist/mqtt.min.js"></script>

  <!-- Link ke file CSS -->
  <link rel="stylesheet" href="stylee.css">
  <style>
    /* Navigation */
    .navbar {
      background: rgba(255, 255, 255, 0.95);
      border-radius: 15px;
      padding: 15px 30px;
      margin-bottom: 25px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .nav-brand {
      font-size: 1.3em;
      font-weight: bold;
      color: #2a5298;
    }

    .nav-links {
      display: flex;
      gap: 15px;
    }

    .nav-links a {
      text-decoration: none;
      padding: 10px 20px;
      border-radius: 8px;
      color: #333;
      font-weight: 500;
      transition: all 0.3s ease;
    }

    .nav-links a:hover {
      background: #f0f0f0;
    }

    .nav-links a.active {
      background: #2a5298;
      color: white;
    }
    
    #currentDay {
      text-align: center;
      color: #666;
      font-size: 1em;
      margin-top: 5px;
    }
  </style>
</head>
<body>

<!-- Header -->
<header>
  <h1>📡 REALTIME MONITORING</h1>
  
<!-- Navigation -->
<nav class="navbar">
  <div class="nav-brand">📡 IOT WEATHER MONITORING</div>
  <div class="nav-links">
    <a href="realtime.php" class="active">📡 Realtime</a>
    <a href="history.php">📊 History</a>
    <a href="management.php">⚙️ Management</a>
  </div>
</nav>
  <div id="currentDay"></div>
</header>

<!-- Top Section: Map & Device Info -->
<div class="top-section">
  <!-- Map Container -->
  <div class="map-container">
    <div class="map-header">
      <h3>🗺️ MAP</h3>
    </div>
    <div id="map"></div>
  </div>

  <!-- Device Info Box -->
  <div class="device-info-box">
    <div class="info-item">
      <h4>Status Device</h4>
      <p><span id="statusText">--</span></p>
    </div>
    <div class="info-item">
      <h4>Lokasi</h4>
      <p id="locationInfo">--</p>
    </div>
    <div class="info-item">
      <h4>Interval</h4>
      <p id="intervalInfo">--</p>
    </div>
  </div>
</div>

<!-- Chart & Cards Section -->
<div class="chart-cards-section">
  <!-- Chart -->
  <div class="chart-wrapper">
    <h3>📈 Grafik Data Sensor (Realtime)</h3>
    <canvas id="sensorChart"></canvas>
  </div>

  <!-- Cards Column -->
  <div class="cards-column">
    <div class="card">
      <div class="card-icon icon-temp">🌡️</div>
      <div class="card-content">
        <h3>Suhu</h3>
        <p id="temp">- °C</p>
      </div>
    </div>

    <div class="card">
      <div class="card-icon icon-humidity">💧</div>
      <div class="card-content">
        <h3>Kelembapan</h3>
        <p id="humidity">- %</p>
      </div>
    </div>

    <div class="card">
      <div class="card-icon icon-wind">💨</div>
      <div class="card-content">
        <h3>Angin</h3>
        <p id="wind">- m/s</p>
      </div>
    </div>

    <div class="card">
      <div class="card-icon icon-rain">🌧️</div>
      <div class="card-content">
        <h3>Hujan</h3>
        <p id="rain">- mm</p>
      </div>
    </div>

    <div class="card">
      <div class="card-icon icon-light">☀️</div>
      <div class="card-content">
        <h3>Cahaya</h3>
        <p id="light">- lux</p>
      </div>
    </div>
  </div>
</div>

<!-- Daily Average Section - Auto Calculate -->
<div class="daily-average-section" style="margin-bottom: 25px;">
  <div class="daily-avg-card" style="background: rgba(255, 255, 255, 0.95); border-radius: 15px; padding: 25px; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
    <div class="daily-avg-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
      <h3 style="color: #2a5298; font-size: 1.2em; margin: 0;">📊 Rata-rata Hari Ini</h3>
      <button id="refreshAvg" class="btn btn-sm" style="padding: 8px 16px; background: #4CAF50; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85em;">🔄 Refresh</button>
    </div>
    <div id="todayAvgContent" style="min-height: 100px;">
      <p style="text-align: center; color: #666; padding: 20px;">
        Memuat rata-rata hari ini...
      </p>
    </div>
  </div>
</div>

<script src="app.js"></script>
</body>
</html>
</body>
</html>