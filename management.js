/* management.js - Device Management */

(() => {
  // STATE
  let devices = [];
  let editingDevice = null;
  let modalMap = null;
  let modalMarker = null;
  let deleteDeviceId = null;
  
  // DOM
  const devicesGrid = document.getElementById('devicesGrid');
  const addDeviceBtn = document.getElementById('addDeviceBtn');
  const refreshBtn = document.getElementById('refreshBtn');
  const deviceModal = document.getElementById('deviceModal');
  const deleteModal = document.getElementById('deleteModal');
  const modalClose = document.getElementById('modalClose');
  const deleteModalClose = document.getElementById('deleteModalClose');
  const deviceForm = document.getElementById('deviceForm');
  const cancelBtn = document.getElementById('cancelBtn');
  const deleteCancelBtn = document.getElementById('deleteCancelBtn');
  const deleteConfirmBtn = document.getElementById('deleteConfirmBtn');
  const loadingOverlay = document.getElementById('loadingOverlay');
  const modalTitle = document.getElementById('modalTitle');
  const deviceId = document.getElementById('deviceId');
  const deviceName = document.getElementById('deviceName');
  const deviceLat = document.getElementById('deviceLat');
  const deviceLon = document.getElementById('deviceLon');
  const deviceInterval = document.getElementById('deviceInterval');
  
  // =====================================================================
  // INIT
  // =====================================================================
  function init() {
    loadDevices();
    
    // Event listeners
    addDeviceBtn.addEventListener('click', openAddModal);
    refreshBtn.addEventListener('click', loadDevices);
    modalClose.addEventListener('click', closeModal);
    deleteModalClose.addEventListener('click', closeDeleteModal);
    cancelBtn.addEventListener('click', closeModal);
    deleteCancelBtn.addEventListener('click', closeDeleteModal);
    deleteConfirmBtn.addEventListener('click', confirmDelete);
    deviceForm.addEventListener('submit', handleSubmit);
    
    // Close modal on outside click
    window.addEventListener('click', (e) => {
      if (e.target === deviceModal) closeModal();
      if (e.target === deleteModal) closeDeleteModal();
    });
    
    // Update map when lat/lon change
    deviceLat.addEventListener('input', updateMapFromInputs);
    deviceLon.addEventListener('input', updateMapFromInputs);
  }
  
  // =====================================================================
  // LOAD DEVICES
  // =====================================================================
  async function loadDevices() {
    showLoading(true);
    
    try {
      const res = await fetch('get_devices.php');
      if (!res.ok) throw new Error('Failed to load devices');
      
      devices = await res.json();
      renderDevices();
      showLoading(false);
      
    } catch (e) {
      console.error('Error loading devices:', e);
      devicesGrid.innerHTML = `
        <div class="error-message">
          <h3>❌ Gagal memuat devices</h3>
          <p>${e.message}</p>
          <button class="btn btn-primary" onclick="location.reload()">🔄 Coba Lagi</button>
        </div>
      `;
      showLoading(false);
    }
  }
  
  // =====================================================================
  // RENDER DEVICES
  // =====================================================================
  function renderDevices() {
    if (devices.length === 0) {
      devicesGrid.innerHTML = `
        <div class="empty-state">
          <h3>📭 Belum ada device</h3>
          <p>Klik "Tambah Device Baru" untuk menambahkan device pertama Anda</p>
        </div>
      `;
      return;
    }
    
    devicesGrid.innerHTML = '';
    
    devices.forEach(dev => {
      const card = document.createElement('div');
      card.className = 'device-card';
      
      // Check status (dummy - bisa diintegrasikan dengan MQTT nanti)
      const status = Math.random() > 0.3 ? 'online' : 'offline';
      const statusColor = status === 'online' ? '#4CAF50' : '#FF9800';
      
      card.innerHTML = `
        <div class="device-header">
          <div class="device-title">
            <h3>${dev.nama_device}</h3>
            <span class="device-id">ID: ${dev.id_device}</span>
          </div>
          <div class="device-status" style="background: ${statusColor}20; color: ${statusColor};">
            <span class="status-dot" style="background: ${statusColor};"></span>
            ${status.toUpperCase()}
          </div>
        </div>
        
        <div class="device-info">
          <div class="info-row">
            <span class="info-label">📍 Lokasi:</span>
            <span class="info-value">${parseFloat(dev.latitude).toFixed(5)}, ${parseFloat(dev.longitude).toFixed(5)}</span>
          </div>
          
          <div class="info-row">
            <span class="info-label">⏱️ Interval:</span>
            <span class="info-value">${dev.interval_data} detik</span>
          </div>
        </div>
        
        <div class="device-actions">
          <button class="btn btn-sm btn-edit" onclick="editDevice(${dev.id_device})">✏️ Edit</button>
          <button class="btn btn-sm btn-view" onclick="viewDevice(${dev.id_device})">👁️ Lihat</button>
          <button class="btn btn-sm btn-danger" onclick="deleteDevice(${dev.id_device}, '${dev.nama_device}')">🗑️ Hapus</button>
        </div>
      `;
      
      devicesGrid.appendChild(card);
    });
  }
  
  // =====================================================================
  // OPEN ADD MODAL
  // =====================================================================
  function openAddModal() {
    editingDevice = null;
    modalTitle.textContent = '➕ Tambah Device Baru';
    deviceForm.reset();
    deviceId.value = '';
    
    // Default location (Medan)
    deviceLat.value = '2.42283';
    deviceLon.value = '99.0946';
    
    deviceModal.style.display = 'flex';
    
    // Initialize map
    setTimeout(() => {
      if (!modalMap) {
        modalMap = L.map('modalMap').setView([2.42283, 99.0946], 12);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap'
        }).addTo(modalMap);
        
        // Click to set location
        modalMap.on('click', (e) => {
          const { lat, lng } = e.latlng;
          deviceLat.value = lat.toFixed(6);
          deviceLon.value = lng.toFixed(6);
          updateMapMarker(lat, lng);
        });
      } else {
        modalMap.invalidateSize();
      }
      
      updateMapMarker(2.42283, 99.0946);
    }, 100);
  }
  
  // =====================================================================
  // EDIT DEVICE
  // =====================================================================
  window.editDevice = function(id) {
    const dev = devices.find(d => d.id_device == id);
    if (!dev) return;
    
    editingDevice = dev;
    modalTitle.textContent = '✏️ Edit Device';
    
    deviceId.value = dev.id_device;
    deviceName.value = dev.nama_device;
    deviceLat.value = parseFloat(dev.latitude);
    deviceLon.value = parseFloat(dev.longitude);
    deviceInterval.value = dev.interval_data;
    
    deviceModal.style.display = 'flex';
    
    // Initialize map
    setTimeout(() => {
      if (!modalMap) {
        modalMap = L.map('modalMap').setView([parseFloat(dev.latitude), parseFloat(dev.longitude)], 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '© OpenStreetMap'
        }).addTo(modalMap);
        
        modalMap.on('click', (e) => {
          const { lat, lng } = e.latlng;
          deviceLat.value = lat.toFixed(6);
          deviceLon.value = lng.toFixed(6);
          updateMapMarker(lat, lng);
        });
      } else {
        modalMap.setView([parseFloat(dev.latitude), parseFloat(dev.longitude)], 13);
        modalMap.invalidateSize();
      }
      
      updateMapMarker(parseFloat(dev.latitude), parseFloat(dev.longitude));
    }, 100);
  };
  
  // =====================================================================
  // VIEW DEVICE (redirect to realtime)
  // =====================================================================
  window.viewDevice = function(id) {
    window.location.href = `realtime.php?device=${id}`;
  };
  
  // =====================================================================
  // DELETE DEVICE
  // =====================================================================
  window.deleteDevice = function(id, name) {
    deleteDeviceId = id;
    document.getElementById('deleteDeviceName').textContent = name;
    deleteModal.style.display = 'flex';
  };
  
  async function confirmDelete() {
    if (!deleteDeviceId) return;
    
    showLoading(true);
    closeDeleteModal();
    
    try {
      const res = await fetch('delete_device.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `id_device=${deleteDeviceId}`
      });
      
      const result = await res.json();
      
      if (result.success) {
        alert('✅ Device berhasil dihapus!');
        loadDevices();
      } else {
        throw new Error(result.message || 'Gagal menghapus device');
      }
      
      showLoading(false);
      
    } catch (e) {
      console.error('Error deleting device:', e);
      alert('❌ ' + e.message);
      showLoading(false);
    }
    
    deleteDeviceId = null;
  }
  
  // =====================================================================
  // HANDLE SUBMIT
  // =====================================================================
  async function handleSubmit(e) {
    e.preventDefault();
    
    const formData = new FormData(deviceForm);
    const data = Object.fromEntries(formData);
    
    // Validate
    if (!data.nama_device || !data.latitude || !data.longitude || !data.interval_data) {
      alert('⚠️ Semua field harus diisi!');
      return;
    }
    
    showLoading(true);
    closeModal();
    
    try {
      const isEdit = !!data.id_device;
      const endpoint = isEdit ? 'update_device.php' : 'add_device.php';
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(data).toString()
      });
      
      const result = await res.json();
      
      if (result.success) {
        alert(isEdit ? '✅ Device berhasil diupdate!' : '✅ Device berhasil ditambahkan!');
        loadDevices();
      } else {
        throw new Error(result.message || 'Gagal menyimpan device');
      }
      
      showLoading(false);
      
    } catch (e) {
      console.error('Error saving device:', e);
      alert('❌ ' + e.message);
      showLoading(false);
      deviceModal.style.display = 'flex';
    }
  }
  
  // =====================================================================
  // MAP HELPERS
  // =====================================================================
  function updateMapMarker(lat, lon) {
    if (!modalMap) return;
    
    if (modalMarker) {
      modalMap.removeLayer(modalMarker);
    }
    
    modalMarker = L.marker([lat, lon]).addTo(modalMap);
    modalMap.setView([lat, lon], 13);
  }
  
  function updateMapFromInputs() {
    const lat = parseFloat(deviceLat.value);
    const lon = parseFloat(deviceLon.value);
    
    if (!isNaN(lat) && !isNaN(lon)) {
      updateMapMarker(lat, lon);
    }
  }
  
  // =====================================================================
  // MODAL HELPERS
  // =====================================================================
  function closeModal() {
    deviceModal.style.display = 'none';
    deviceForm.reset();
    editingDevice = null;
  }
  
  function closeDeleteModal() {
    deleteModal.style.display = 'none';
    deleteDeviceId = null;
  }
  
  function showLoading(show) {
    loadingOverlay.style.display = show ? 'flex' : 'none';
  }
  
  // =====================================================================
  // START
  // =====================================================================
  document.addEventListener('DOMContentLoaded', init);
})();