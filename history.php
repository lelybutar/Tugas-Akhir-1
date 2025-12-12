<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>IoT Weather - Data History</title>
  
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <script src="https://cdn.sheetjs.com/xlsx-0.20.0/package/dist/xlsx.full.min.js"></script>
  
  <link rel="stylesheet" href="history.css">
</head>
<body>

<!-- Navigation -->
<nav class="navbar">
  <div class="nav-brand">IOT WEATHER MONITORING</div>
  <div class="nav-links">
    <a href="realtime.php">📡 Realtime</a>
    <a href="history.php" class="active">📊 History</a>
    <a href="management.php">⚙️ Management</a>
  </div>
</nav>

<!-- Header -->
<header>
  <h1>📊 DATA HISTORY & ANALYSIS</h1>
  <p>Kontrol device, sensor individual, filter data, analisis statistik, dan download laporan</p>
</header>

<!-- Device Control Section -->
<div class="device-control-section">
  <div class="control-card">
    <div class="control-header">
      <h3>🎛️ Device Control & Status</h3>
      <div id="deviceStatusIndicator">● Pilih Device</div>
    </div>
    
    <div class="control-actions">
      <button id="deviceControlBtn" class="btn btn-success" disabled>
        🟢 Turn ON Device
      </button>
    </div>
    
    <div id="detailedStatusContainer">
      <div style="text-align: center; padding: 40px; color: #999;">
        <p>Pilih device untuk melihat status detail</p>
      </div>
    </div>
    
    <!-- ⭐ FITUR BARU: Sensor Individual Control -->
    <div class="sensor-control-grid">
      <h4>🎚️ Sensor Individual Control</h4>
      <div class="sensor-toggles">
        <label class="toggle-switch">
          <input type="checkbox" id="toggleTemp" checked>
          <span class="label">🌡️ Temperature</span>
        </label>
        
        <label class="toggle-switch">
          <input type="checkbox" id="toggleHumid" checked>
          <span class="label">💧 Humidity</span>
        </label>
        
        <label class="toggle-switch">
          <input type="checkbox" id="toggleWind" checked>
          <span class="label">💨 Wind</span>
        </label>
        
        <label class="toggle-switch">
          <input type="checkbox" id="toggleRain" checked>
          <span class="label">🌧️ Rain</span>
        </label>
        
        <label class="toggle-switch">
          <input type="checkbox" id="toggleLight" checked>
          <span class="label">☀️ Light</span>
        </label>
      </div>
      
      <button id="applySensorConfig" class="btn-apply" disabled>
        ✅ Apply Sensor Configuration
      </button>
    </div>
  </div>
</div>

<!-- Filter Section - LAYOUT 2 KOLOM -->
<div class="filter-section">
  <div class="filter-card">
    <h3>🔍 Filter & Periode Pengambilan Data</h3>
    
    <div class="filter-layout">
      
      <!-- KOLOM KIRI - Filter & Periode Pengambilan Data -->
      <div class="filter-left">
        <div class="filter-section-title">Filter & Periode Pengambilan Data</div>
        
        <div class="filter-group">
          <div class="filter-item">
            <label>Device :</label>
            <select id="deviceSelect">
              <option value="">Loading devices...</option>
            </select>
          </div>
          
          <div class="filter-item">
            <label>Dari Tanggal :</label>
            <input type="date" id="dateFrom">
          </div>
          
          <div class="filter-item">
            <label>Sampai Tanggal :</label>
            <input type="date" id="dateTo">
          </div>
        </div>
        
        <div class="button-row">
          <button id="filterBtn" class="btn btn-primary">Tampilkan Data</button>
          <button id="resetBtn" class="btn btn-secondary">Reset Filter</button>
        </div>
      </div>
      
      <!-- KOLOM KANAN - Rentang Pengambilan data -->
      <div class="filter-right">
        <div class="filter-section-title">Rentang Pengambilan data</div>
        
        <div class="filter-group">
          <div class="filter-item">
            <label>Waktu Pengambilan Data:</label>
            <div class="time-range-input">
              <input type="time" id="timeStart" value="08:00">
              <span>s/d</span>
              <input type="time" id="timeEnd" value="17:00">
            </div>
          </div>
          
          <div class="filter-item">
            <label>Frekuensi Pengambilan data:</label>
            <select id="frequencySelect">
              <option value="10">Setiap 10 detik</option>
              <option value="30">Setiap 30 detik</option>
              <option value="60" selected>Setiap 1 menit</option>
              <option value="300">Setiap 5 menit</option>
              <option value="600">Setiap 10 menit</option>
              <option value="1800">Setiap 30 menit</option>
              <option value="3600">Setiap 1 jam</option>
            </select>
          </div>
        </div>
        
        <button id="setPeriodeBtn" class="btn btn-warning full-width-button">
          terapkan periode ke device
        </button>
      </div>
      
    </div>
  </div>
</div>

<!-- Stats Cards with DECISION LAYER -->
<div id="statsContainer" style="display: none;">
  <div class="stats-compact-section">
    
    <div class="stat-compact-card">
      <h4>🌡️ Suhu</h4>
      <div class="stat-row">
        <div class="stat-item">
          <span class="stat-label">Tertinggi:</span>
          <span class="stat-value" id="statTempMax">-</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Terendah:</span>
          <span class="stat-value" id="statTempMin">-</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Rata-rata:</span>
          <span class="stat-value" id="statTempAvg">-</span>
        </div>
        <div class="stat-item" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e0e0e0;">
          <span class="stat-label">Kondisi:</span>
          <span class="stat-value" id="statTempCondition" style="font-size: 0.9em;">-</span>
        </div>
      </div>
    </div>

    <div class="stat-compact-card">
      <h4>💧 Kelembapan</h4>
      <div class="stat-row">
        <div class="stat-item">
          <span class="stat-label">Tertinggi:</span>
          <span class="stat-value" id="statHumidMax">-</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Terendah:</span>
          <span class="stat-value" id="statHumidMin">-</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Rata-rata:</span>
          <span class="stat-value" id="statHumidAvg">-</span>
        </div>
        <div class="stat-item" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e0e0e0;">
          <span class="stat-label">Kondisi:</span>
          <span class="stat-value" id="statHumidCondition" style="font-size: 0.9em;">-</span>
        </div>
      </div>
    </div>

    <div class="stat-compact-card">
      <h4>💨 Angin</h4>
      <div class="stat-row">
        <div class="stat-item">
          <span class="stat-label">Tertinggi:</span>
          <span class="stat-value" id="statWindMax">-</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Terendah:</span>
          <span class="stat-value" id="statWindMin">-</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Rata-rata:</span>
          <span class="stat-value" id="statWindAvg">-</span>
        </div>
        <div class="stat-item" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e0e0e0;">
          <span class="stat-label">Kondisi:</span>
          <span class="stat-value" id="statWindCondition" style="font-size: 0.9em;">-</span>
        </div>
      </div>
    </div>

    <div class="stat-compact-card">
      <h4>🌧️ Hujan</h4>
      <div class="stat-row">
        <div class="stat-item">
          <span class="stat-label">Tertinggi:</span>
          <span class="stat-value" id="statRainMax">-</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Terendah:</span>
          <span class="stat-value" id="statRainMin">-</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Rata-rata:</span>
          <span class="stat-value" id="statRainAvg">-</span>
        </div>
        <div class="stat-item" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e0e0e0;">
          <span class="stat-label">Kondisi:</span>
          <span class="stat-value" id="statRainCondition" style="font-size: 0.9em;">-</span>
        </div>
      </div>
    </div>

    <div class="stat-compact-card">
      <h4>☀️ Cahaya</h4>
      <div class="stat-row">
        <div class="stat-item">
          <span class="stat-label">Tertinggi:</span>
          <span class="stat-value" id="statLightMax">-</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Terendah:</span>
          <span class="stat-value" id="statLightMin">-</span>
        </div>
        <div class="stat-item">
          <span class="stat-label">Rata-rata:</span>
          <span class="stat-value" id="statLightAvg">-</span>
        </div>
        <div class="stat-item" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e0e0e0;">
          <span class="stat-label">Kondisi:</span>
          <span class="stat-value" id="statLightCondition" style="font-size: 0.9em;">-</span>
        </div>
      </div>
    </div>
    
  </div>
</div>

<!-- Charts Section -->
<div class="charts-grid" id="chartsSection" style="display: none;">
  <div class="chart-card">
    <h4>🌡️ Suhu (°C)</h4>
    <div class="chart-container">
      <canvas id="chartTemp"></canvas>
    </div>
  </div>
  <div class="chart-card">
    <h4>💧 Kelembapan (%)</h4>
    <div class="chart-container">
      <canvas id="chartHumid"></canvas>
    </div>
  </div>
  <div class="chart-card">
    <h4>💨 Angin (m/s)</h4>
    <div class="chart-container">
      <canvas id="chartWind"></canvas>
    </div>
  </div>
  <div class="chart-card">
    <h4>🌧️ Hujan (mm)</h4>
    <div class="chart-container">
      <canvas id="chartRain"></canvas>
    </div>
  </div>
  <div class="chart-card">
    <h4>☀️ Cahaya (lux)</h4>
    <div class="chart-container">
      <canvas id="chartLight"></canvas>
    </div>
  </div>
</div>

<!-- Data Table -->
<div class="table-section">
  <div class="table-card">
    <div class="table-header">
      <h3>📋 Tabel Data History</h3>
      <div class="table-actions">
        <button id="exportCSV" class="btn btn-success">📥 Export CSV</button>
        <button id="exportExcel" class="btn btn-success">📥 Export Excel</button>
      </div>
    </div>
    
    <div class="table-info">
      <span id="tableInfo">Belum ada data. Gunakan filter untuk menampilkan data.</span>
    </div>
    
    <div class="table-wrapper">
      <table id="dataTable">
        <thead>
          <tr>
            <th>No</th>
            <th>Timestamp</th>
            <th>Device</th>
            <th>Temperature (°C)</th>
            <th>Humidity (%)</th>
            <th>Wind (m/s)</th>
            <th>Rain (mm)</th>
            <th>Light (lux)</th>
            <th>Latitude</th>
            <th>Longitude</th>
          </tr>
        </thead>
        <tbody id="tableBody">
          <tr>
            <td colspan="10" style="text-align: center; padding: 40px; color: #999;">
              Tidak ada data untuk ditampilkan
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    
    <div class="pagination" id="pagination" style="display: none;">
      <button id="prevPage" class="btn btn-sm">« Prev</button>
      <span id="pageInfo">Page 1 of 1</span>
      <button id="nextPage" class="btn btn-sm">Next »</button>
    </div>
  </div>
</div>

<!-- Loading Overlay -->
<div id="loadingOverlay" class="loading-overlay" style="display: none;">
  <div class="loading-spinner">
    <div class="spinner"></div>
    <p>Memuat data...</p>
  </div>
</div>

<script src="history.js"></script>
</body>
</html>