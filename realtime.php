<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=yes" />
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
    /* ========================================
       NAVIGATION WITH HAMBURGER MENU
       ======================================== */
    
    .navbar {
      background: rgba(255, 255, 255, 0.95);
      border-radius: 15px;
      padding: 15px 25px;
      margin-bottom: 25px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: relative;
    }

    .nav-brand {
      font-size: 1.2em;
      font-weight: bold;
      color: #2a5298;
      z-index: 1001;
    }

    /* Hamburger Button - Hidden on Desktop */
    .hamburger {
      display: none;
      flex-direction: column;
      gap: 5px;
      background: none;
      border: none;
      cursor: pointer;
      padding: 8px;
      z-index: 1001;
    }

    .hamburger span {
      width: 25px;
      height: 3px;
      background: #2a5298;
      border-radius: 3px;
      transition: all 0.3s ease;
    }

    .hamburger.active span:nth-child(1) {
      transform: rotate(45deg) translate(7px, 7px);
    }

    .hamburger.active span:nth-child(2) {
      opacity: 0;
    }

    .hamburger.active span:nth-child(3) {
      transform: rotate(-45deg) translate(7px, -7px);
    }

    /* Navigation Links */
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
      white-space: nowrap;
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

    /* ========================================
       MOBILE RESPONSIVE - HAMBURGER MENU
       ======================================== */
    
    @media (max-width: 768px) {
      .navbar {
        padding: 15px 20px;
      }

      .nav-brand {
        font-size: 1em;
      }

      /* Show Hamburger Button */
      .hamburger {
        display: flex;
      }

      /* Mobile Menu - Hidden by default */
      .nav-links {
        position: fixed;
        top: 0;
        right: -100%;
        height: 100vh;
        width: 250px;
        background: rgba(255, 255, 255, 0.98);
        flex-direction: column;
        padding: 80px 20px 20px;
        gap: 10px;
        box-shadow: -5px 0 20px rgba(0,0,0,0.1);
        transition: right 0.3s ease;
        z-index: 1000;
      }

      /* Mobile Menu - Active State */
      .nav-links.active {
        right: 0;
      }

      .nav-links a {
        width: 100%;
        padding: 15px 20px;
        border-radius: 8px;
        font-size: 1em;
        text-align: left;
      }
    }

    @media (max-width: 480px) {
      .nav-brand {
        font-size: 0.9em;
      }

      .nav-links {
        width: 70%;
      }
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

<!-- Navigation -->
<nav class="navbar">
  <div class="nav-brand">📡 IOT WEATHER MONITORING</div>
  
  <!-- Hamburger Button (hanya muncul di mobile) -->
  <button class="hamburger" id="hamburgerBtn" aria-label="Toggle menu">
    <span></span>
    <span></span>
    <span></span>
  </button>
  
  <!-- Navigation Links -->
  <div class="nav-links" id="navLinks">
    <a href="realtime.php" class="active">📡 Realtime</a>
    <a href="history.php">📊 History</a>
    <a href="management.php">⚙️ Management</a>
  </div>
</nav>

<!-- Header -->
<header>
  <h1>📡 REALTIME MONITORING</h1>
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

<!-- ⭐ CRITICAL FIX: Auto-Select Device dari URL Parameter -->
<script>
  <!-- Hamburger Menu Script -->
  
document.addEventListener('DOMContentLoaded', function() {
  const hamburger = document.getElementById('hamburgerBtn');
  const navLinks = document.getElementById('navLinks');
  
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', function() {
      hamburger.classList.toggle('active');
      navLinks.classList.toggle('active');
    });

    // Close menu when clicking a link
    const links = navLinks.querySelectorAll('a');
    links.forEach(link => {
      link.addEventListener('click', function() {
        hamburger.classList.remove('active');
        navLinks.classList.remove('active');
      });
    });

    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
      if (!hamburger.contains(e.target) && !navLinks.contains(e.target)) {
        hamburger.classList.remove('active');
        navLinks.classList.remove('active');
      }
    });
  }
});
(function() {
  console.log('🚀 Realtime.php loaded');
  
  // Ambil parameter device dari URL
  const urlParams = new URLSearchParams(window.location.search);
  const selectedDeviceId = urlParams.get('device');
  
  console.log('🔍 URL Parameter "device":', selectedDeviceId);
  console.log('🔍 Full URL:', window.location.href);
  
  if (selectedDeviceId) {
    console.log('✅ Device ID found in URL:', selectedDeviceId);
    
    // Wait for app.js to load and DOM to be ready
    window.addEventListener('load', function() {
      console.log('📄 Page fully loaded, attempting auto-select...');
      
      // Retry mechanism untuk memastikan deviceSelect sudah ada
      let retryCount = 0;
      const maxRetries = 10;
      
      const tryAutoSelect = setInterval(function() {
        retryCount++;
        console.log(`🔄 Attempt ${retryCount}/${maxRetries} to find deviceSelect...`);
        
        // Cari dropdown device (bisa di app.js atau di HTML)
        const deviceSelect = document.getElementById('deviceSelect') || 
                            document.querySelector('select[name="device"]') ||
                            document.querySelector('.device-selector');
        
        if (deviceSelect) {
          clearInterval(tryAutoSelect);
          console.log('✅ Device selector found:', deviceSelect);
          
          // Set value
          deviceSelect.value = selectedDeviceId;
          console.log('✅ Device selector value set to:', selectedDeviceId);
          
          // Trigger change event
          const event = new Event('change', { bubbles: true });
          deviceSelect.dispatchEvent(event);
          console.log('✅ Change event dispatched');
          
          // Trigger custom load function jika ada
          if (typeof window.loadDeviceData === 'function') {
            console.log('✅ Calling loadDeviceData()...');
            window.loadDeviceData(selectedDeviceId);
          }
          
          if (typeof window.updateDeviceInfo === 'function') {
            console.log('✅ Calling updateDeviceInfo()...');
            window.updateDeviceInfo(selectedDeviceId);
          }
          
        } else if (retryCount >= maxRetries) {
          clearInterval(tryAutoSelect);
          console.error('❌ Device selector not found after', maxRetries, 'attempts');
          console.error('❌ Please check if app.js creates a device selector');
        }
      }, 200); // Check setiap 200ms
    });
  } else {
    console.log('ℹ️ No device parameter in URL');
  }
})();
</script>

<script src="app.js"></script>
</body>
</html>