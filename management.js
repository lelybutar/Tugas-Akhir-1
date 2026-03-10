/* management.js - Device Management - FULLY FIXED VERSION */

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
    console.log('🚀 Management.js initialized');
    loadDevices();
    
    // Event listeners
    addDeviceBtn.addEventListener('click', openAddModal);
    refreshBtn.addEventListener('click', () => {
      console.log('🔄 Manual refresh triggered');
      loadDevices();
    });
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
  // LOAD DEVICES WITH REAL STATUS
  // =====================================================================
  async function loadDevices() {
    showLoading(true);
    console.log('📡 Loading devices...');
    
    try {
      // 1. Load devices list
      const res = await fetch('get_devices.php');
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      
      devices = await res.json();
      console.log('✅ Devices loaded:', devices);
      
      if (!devices || devices.length === 0) {
        devicesGrid.innerHTML = `
          <div class="empty-state">
            <h3>🔭 Belum ada device</h3>
            <p>Klik "Tambah Device Baru" untuk menambahkan device pertama Anda</p>
          </div>
        `;
        showLoading(false);
        return;
      }
      
      // 2. ⭐ FIX: Fetch REAL status untuk SETIAP device
      console.log('🔍 Checking status for each device...');
      
      for (let i = 0; i < devices.length; i++) {
        const dev = devices[i];
        console.log(`🔍 Checking device ${dev.id_device}: ${dev.nama_device}`);
        
        try {
          const statusRes = await fetch(`get_device_real_status.php?id_device=${dev.id_device}`);
          const statusData = await statusRes.json();
          
          console.log(`  → Status: ${statusData.status}, Last seen: ${statusData.last_seen}, Seconds ago: ${statusData.seconds_ago}`);
          
          devices[i].status = statusData.status;
          devices[i].last_seen = statusData.last_seen;
          devices[i].seconds_ago = statusData.seconds_ago;
          
        } catch (statusError) {
          console.error(`  ❌ Error checking status for device ${dev.id_device}:`, statusError);
          devices[i].status = 'error';
          devices[i].last_seen = null;
          devices[i].seconds_ago = null;
        }
      }
      
      console.log('✅ All device statuses checked:', devices);
      renderDevices();
      showLoading(false);
      
    } catch (e) {
      console.error('❌ Error loading devices:', e);
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
  // RENDER DEVICES (dengan status REAL dari database)
  // =====================================================================
  function renderDevices() {
    console.log('🎨 Rendering devices:', devices);
    
    if (devices.length === 0) {
      devicesGrid.innerHTML = `
        <div class="empty-state">
          <h3>🔭 Belum ada device</h3>
          <p>Klik "Tambah Device Baru" untuk menambahkan device pertama Anda</p>
        </div>
      `;
      return;
    }
    
    devicesGrid.innerHTML = '';
    
    devices.forEach(dev => {
      const card = document.createElement('div');
      card.className = 'device-card';
      
      // ⭐ FIX: Gunakan status REAL dari database
      const status = dev.status || 'offline'; // Default offline
      const statusColor = status === 'online' ? '#4CAF50' : '#FF9800'; // Orange untuk offline
      
      // Format last seen
      let lastSeenText = 'Never';
      if (dev.last_seen && dev.seconds_ago !== null) {
        const seconds = dev.seconds_ago;
        
        if (seconds < 60) {
          lastSeenText = `${seconds}s ago`;
        } else if (seconds < 3600) {
          const mins = Math.floor(seconds / 60);
          lastSeenText = `${mins} min${mins > 1 ? 's' : ''} ago`;
        } else if (seconds < 86400) {
          const hours = Math.floor(seconds / 3600);
          lastSeenText = `${hours} hour${hours > 1 ? 's' : ''} ago`;
        } else {
          const days = Math.floor(seconds / 86400);
          lastSeenText = `${days} day${days > 1 ? 's' : ''} ago`;
        }
      }
      
      // Status text (HAPUS kondisi 'error')
      const statusText = status.toUpperCase();
      
      card.innerHTML = `
        <div class="device-header">
          <div class="device-title">
            <h3>${dev.nama_device}</h3>
            <span class="device-id">ID: ${dev.id_device}</span>
          </div>
          <div class="device-status" style="background: ${statusColor}20; color: ${statusColor};">
            <span class="status-dot" style="background: ${statusColor};"></span>
            ${statusText}
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
          
          <div class="info-row">
            <span class="info-label">🕒 Last Seen:</span>
            <span class="info-value" style="color: ${status === 'online' ? '#28a745' : '#dc3545'};">${lastSeenText}</span>
          </div>
        </div>
        
        <div class="device-actions">
          <button class="btn btn-sm btn-edit" data-device-id="${dev.id_device}">✏️ Edit</button>
          <button class="btn btn-sm btn-view" data-device-id="${dev.id_device}">👁️ Lihat</button>
          <button class="btn btn-sm btn-danger" data-device-id="${dev.id_device}" data-device-name="${dev.nama_device}">🗑️ Hapus</button>
        </div>
      `;
      
      devicesGrid.appendChild(card);
    });
    
    // ⭐ FIX: Attach event listeners SETELAH render
    attachCardEventListeners();
  }
  
  // =====================================================================
  // ⭐ FIX: ATTACH EVENT LISTENERS TO BUTTONS
  // =====================================================================
  function attachCardEventListeners() {
    // Edit buttons
    document.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const deviceId = parseInt(e.currentTarget.getAttribute('data-device-id'));
        console.log('✏️ Edit clicked for device:', deviceId);
        editDevice(deviceId);
      });
    });
    
    // View buttons
    document.querySelectorAll('.btn-view').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const deviceId = parseInt(e.currentTarget.getAttribute('data-device-id'));
        console.log('👁️ View clicked for device:', deviceId);
        viewDevice(deviceId);
      });
    });
    
    // Delete buttons
    document.querySelectorAll('.btn-danger').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const deviceId = parseInt(e.currentTarget.getAttribute('data-device-id'));
        const deviceName = e.currentTarget.getAttribute('data-device-name');
        console.log('🗑️ Delete clicked for device:', deviceId, deviceName);
        deleteDevice(deviceId, deviceName);
      });
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
    deviceLat.value = '3.595196';
    deviceLon.value = '98.672226';
    
    deviceModal.style.display = 'flex';
    
    // Initialize map
    setTimeout(() => {
      if (!modalMap) {
        modalMap = L.map('modalMap').setView([3.595196, 98.672226], 12);
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
      
      updateMapMarker(3.595196, 98.672226);
    }, 100);
  }
  
  // =====================================================================
  // EDIT DEVICE
  // =====================================================================
  function editDevice(id) {
    console.log('📝 Editing device ID:', id);
    const dev = devices.find(d => d.id_device == id);
    
    if (!dev) {
      console.error('❌ Device not found:', id);
      alert('❌ Device tidak ditemukan!');
      return;
    }
    
    console.log('✅ Device found:', dev);
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
  }
  
  // =====================================================================
  // ⭐ FIX: VIEW DEVICE - REDIRECT DENGAN DEVICE ID YANG BENAR
  // =====================================================================
  function viewDevice(id) {
    console.log('👁️ Viewing device ID:', id);
    
    // Validate device exists
    const dev = devices.find(d => d.id_device == id);
    if (!dev) {
      console.error('❌ Device not found:', id);
      alert('❌ Device tidak ditemukan!');
      return;
    }
    
    console.log('✅ Redirecting to realtime.php?device=' + id);
    
    // ⭐ FIX: Pastikan redirect dengan ID yang benar
    window.location.href = `realtime.php?device=${id}`;
  }
  
  // =====================================================================
  // DELETE DEVICE
  // =====================================================================
  function deleteDevice(id, name) {
    console.log('🗑️ Delete request for device:', id, name);
    deleteDeviceId = id;
    document.getElementById('deleteDeviceName').textContent = name;
    deleteModal.style.display = 'flex';
  }
  
  async function confirmDelete() {
    if (!deleteDeviceId) return;
    
    console.log('🗑️ Confirming delete for device:', deleteDeviceId);
    showLoading(true);
    closeDeleteModal();
    
    try {
      const res = await fetch('delete_device.php', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `id_device=${deleteDeviceId}`
      });
      
      const result = await res.json();
      console.log('Delete result:', result);
      
      if (result.success) {
        alert('✅ Device berhasil dihapus!');
        loadDevices();
      } else {
        throw new Error(result.message || 'Gagal menghapus device');
      }
      
      showLoading(false);
      
    } catch (e) {
      console.error('❌ Error deleting device:', e);
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
    
    console.log('💾 Submitting form:', data);
    
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
      
      console.log(`📤 Sending to ${endpoint}:`, data);
      
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams(data).toString()
      });
      
      const result = await res.json();
      console.log('📥 Server response:', result);
      
      if (result.success) {
        alert(isEdit ? '✅ Device berhasil diupdate!' : '✅ Device berhasil ditambahkan!');
        loadDevices();
      } else {
        throw new Error(result.message || 'Gagal menyimpan device');
      }
      
      showLoading(false);
      
    } catch (e) {
      console.error('❌ Error saving device:', e);
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