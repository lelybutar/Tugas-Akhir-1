<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>IoT Weather - Data History</title>
  
  <!-- Chart.js -->
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  
  <!-- SheetJS untuk export Excel -->
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
  <p>Filter data, analisis statistik, atur interval, dan download laporan</p>
</header>

<!-- Filter Section -->
<div class="filter-section">
  <div class="filter-card">
    <h3>🔍 Filter & Controls</h3>
    
    <div class="filter-row">
      <div class="filter-item">
        <label>Device:</label>
        <select id="deviceSelect">
          <option value="">Loading devices...</option>
        </select>
      </div>
      
      <div class="filter-item">
        <label>Dari Tanggal:</label>
        <input type="date" id="dateFrom">
      </div>
      
      <div class="filter-item">
        <label>Sampai Tanggal:</label>
        <input type="date" id="dateTo">
      </div>
    </div>
    
    <div class="filter-row">
      <div class="filter-item">
        <label>Set Interval Pengambilan Data:</label>
        <div style="display: flex; gap: 10px; align-items: center;">
          <select id="intervalSelect" style="flex: 1;">
            <option value="30">30 detik</option>
            <option value="60" selected>60 detik (1 menit)</option>
            <option value="300">300 detik (5 menit)</option>
            <option value="600">600 detik (10 menit)</option>
            <option value="1800">1800 detik (30 menit)</option>
            <option value="3600">3600 detik (1 jam)</option>
          </select>
          <button id="setIntervalBtn" class="btn btn-warning">⚙️ Set Interval</button>
        </div>
      </div>
    </div>
    
    <div class="filter-actions">
      <button id="filterBtn" class="btn btn-primary">🔍 Tampilkan Data</button>
      <button id="resetBtn" class="btn btn-secondary">🔄 Reset Filter</button>
    </div>
  </div>
</div>

<!-- Stats Cards PER SENSOR -->
<div id="statsContainer" style="display: none;">
  <!-- Temperature Stats -->
  <div class="sensor-stats-section">
    <h3>🌡️ Statistik Suhu</h3>
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);">📈</div>
        <div class="stat-content">
          <h4>Tertinggi</h4>
          <p id="statTempMax">-</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">📉</div>
        <div class="stat-content">
          <h4>Terendah</h4>
          <p id="statTempMin">-</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);">📊</div>
        <div class="stat-content">
          <h4>Rata-rata</h4>
          <p id="statTempAvg">-</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Humidity Stats -->
  <div class="sensor-stats-section">
    <h3>💧 Statistik Kelembapan</h3>
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">📈</div>
        <div class="stat-content">
          <h4>Tertinggi</h4>
          <p id="statHumidMax">-</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">📉</div>
        <div class="stat-content">
          <h4>Terendah</h4>
          <p id="statHumidMin">-</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%);">📊</div>
        <div class="stat-content">
          <h4>Rata-rata</h4>
          <p id="statHumidAvg">-</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Wind Stats -->
  <div class="sensor-stats-section">
    <h3>💨 Statistik Angin</h3>
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);">📈</div>
        <div class="stat-content">
          <h4>Tertinggi</h4>
          <p id="statWindMax">-</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">📉</div>
        <div class="stat-content">
          <h4>Terendah</h4>
          <p id="statWindMin">-</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);">📊</div>
        <div class="stat-content">
          <h4>Rata-rata</h4>
          <p id="statWindAvg">-</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Rain Stats -->
  <div class="sensor-stats-section">
    <h3>🌧️ Statistik Hujan</h3>
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">📈</div>
        <div class="stat-content">
          <h4>Tertinggi</h4>
          <p id="statRainMax">-</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);">📉</div>
        <div class="stat-content">
          <h4>Terendah</h4>
          <p id="statRainMin">-</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%);">📊</div>
        <div class="stat-content">
          <h4>Rata-rata</h4>
          <p id="statRainAvg">-</p>
        </div>
      </div>
    </div>
  </div>

  <!-- Light Stats -->
  <div class="sensor-stats-section">
    <h3>☀️ Statistik Cahaya</h3>
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #ffeaa7 0%, #fdcb6e 100%);">📈</div>
        <div class="stat-content">
          <h4>Tertinggi</h4>
          <p id="statLightMax">-</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);">📉</div>
        <div class="stat-content">
          <h4>Terendah</h4>
          <p id="statLightMin">-</p>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon" style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);">📊</div>
        <div class="stat-content">
          <h4>Rata-rata</h4>
          <p id="statLightAvg">-</p>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Charts Section - 5 GRAFIK TERPISAH -->
<div class="charts-grid" id="chartsSection" style="display: none;">
  <div class="chart-card">
    <h4>🌡️ Suhu (°C)</h4>
    <canvas id="chartTemp"></canvas>
  </div>
  <div class="chart-card">
    <h4>💧 Kelembapan (%)</h4>
    <canvas id="chartHumid"></canvas>
  </div>
  <div class="chart-card">
    <h4>💨 Angin (m/s)</h4>
    <canvas id="chartWind"></canvas>
  </div>
  <div class="chart-card">
    <h4>🌧️ Hujan (mm)</h4>
    <canvas id="chartRain"></canvas>
  </div>
  <div class="chart-card">
    <h4>☀️ Cahaya (lux)</h4>
    <canvas id="chartLight"></canvas>
  </div>
</div>

<!-- Data Table Section - FORMAT HORIZONTAL -->
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
    
    <!-- Pagination -->
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