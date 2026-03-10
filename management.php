<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>IoT Weather - Device Management</title>
  
  <!-- Leaflet untuk preview map -->
  <link rel="stylesheet" href="https://unpkg.com/leaflet/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet/dist/leaflet.js"></script>
  
  <link rel="stylesheet" href="management.css">
</head>
<body>

<!-- Navigation -->
<nav class="navbar">
  <div class="nav-brand">IOT WEATHER MONITORING</div>
  <div class="nav-links">
    <a href="realtime.php">📡 Realtime</a>
    <a href="history.php">📊 History</a>
    <a href="management.php" class="active">⚙️ Management</a>
  </div>
</nav>

<!-- Header -->
<header>
  <h1>⚙️ DEVICE MANAGEMENT</h1>
  <p>Kelola device IoT, lokasi, dan interval data</p>
</header>

<!-- Action Bar -->
<div class="action-bar">
  <button id="addDeviceBtn" class="btn btn-primary">➕ Tambah Device Baru</button>
  <button id="refreshBtn" class="btn btn-secondary">🔄 Refresh</button>
</div>

<!-- Device Cards Grid -->
<div class="devices-grid" id="devicesGrid">
  <div class="loading-placeholder">
    <div class="spinner"></div>
    <p>Memuat devices...</p>
  </div>
</div>

<!-- Modal: Add/Edit Device -->
<div id="deviceModal" class="modal">
  <div class="modal-content">
    <div class="modal-header">
      <h2 id="modalTitle">➕ Tambah Device Baru</h2>
      <button class="modal-close" id="modalClose">&times;</button>
    </div>
    
    <div class="modal-body">
      <form id="deviceForm">
        <input type="hidden" id="deviceId" name="id_device">
        
        <div class="form-group">
          <label for="deviceName">Nama Device *</label>
          <input type="text" id="deviceName" name="nama_device" required placeholder="Contoh: Weather Station A">
        </div>
        
        <div class="form-row">
          <div class="form-group">
            <label for="deviceLat">Latitude *</label>
            <input type="number" id="deviceLat" name="latitude" step="0.000001" required placeholder="2.42283">
          </div>
          
          <div class="form-group">
            <label for="deviceLon">Longitude *</label>
            <input type="number" id="deviceLon" name="longitude" step="0.000001" required placeholder="99.0946">
          </div>
        </div>
        
        <div class="form-group">
          <label for="deviceInterval">Interval Data (detik) *</label>
          <select id="deviceInterval" name="interval_data" required>
            <option value="30">30 detik</option>
            <option value="60" selected>60 detik (1 menit)</option>
            <option value="300">300 detik (5 menit)</option>
            <option value="600">600 detik (10 menit)</option>
            <option value="1800">1800 detik (30 menit)</option>
            <option value="3600">3600 detik (1 jam)</option>
          </select>
        </div>
        
        <!-- Map Preview -->
        <div class="form-group">
          <label>Preview Lokasi</label>
          <div id="modalMap" style="height: 250px; border-radius: 8px; border: 2px solid #ddd;"></div>
          <small style="color: #666;">Klik pada map untuk set koordinat, atau isi manual di field Latitude/Longitude</small>
        </div>
        
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" id="cancelBtn">Batal</button>
          <button type="submit" class="btn btn-primary" id="saveBtn">💾 Simpan</button>
        </div>
      </form>
    </div>
  </div>
</div>

<!-- Modal: Confirm Delete -->
<div id="deleteModal" class="modal">
  <div class="modal-content modal-sm">
    <div class="modal-header">
      <h2>🗑️ Konfirmasi Hapus</h2>
      <button class="modal-close" id="deleteModalClose">&times;</button>
    </div>
    
    <div class="modal-body">
      <p>Apakah Anda yakin ingin menghapus device <strong id="deleteDeviceName"></strong>?</p>
      <p style="color: #d32f2f; margin-top: 10px;">⚠️ Semua data sensor dari device ini akan tetap ada di database.</p>
      
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" id="deleteCancelBtn">Batal</button>
        <button type="button" class="btn btn-danger" id="deleteConfirmBtn">🗑️ Hapus</button>
      </div>
    </div>
  </div>
</div>

<!-- Loading Overlay -->
<div id="loadingOverlay" class="loading-overlay" style="display: none;">
  <div class="loading-spinner">
    <div class="spinner"></div>
    <p>Processing...</p>
  </div>
</div>

<script src="management.js"></script>
</body>
</html>