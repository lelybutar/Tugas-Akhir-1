/* history.js - WITH SENSOR INDIVIDUAL CONTROL - FULL VERSION */

(() => {
  // =====================================================================
  // STATE MANAGEMENT
  // =====================================================================
  let devices = [];
  let allData = [];
  let groupedData = [];
  let currentPage = 1;
  let rowsPerPage = 50;
  let deviceStatus = {
    wifi: 'unknown',
    mqtt: 'unknown',
    database: 'unknown',
    device_power: 'unknown',
    sensors: {},
    sensor_config: {} // ⭐ Status sensor enabled/disabled
  };
  
  // =====================================================================
  // SENSOR MAPPING
  // =====================================================================
  const SENSOR_ID_TO_NAME = {
    1: 'temperature',
    2: 'humidity',
    3: 'wind',
    4: 'rain',
    5: 'light_intensity'
  };
  
  const SENSOR_LABELS = {
    temperature: 'Temperature',
    humidity: 'Humidity',
    wind: 'Wind',
    rain: 'Rain',
    light_intensity: 'Light'
  };
  
  // =====================================================================
  // DECISION LAYER
  // =====================================================================
  const DECISION_RULES = {
    temperature: (val) => {
      if (val < 20) return { text: 'Dingin', color: '#4facfe' };
      if (val <= 30) return { text: 'Normal', color: '#43e97b' };
      return { text: 'Panas', color: '#ff6b6b' };
    },
    humidity: (val) => {
      if (val < 40) return { text: 'Kering', color: '#ff6b6b' };
      if (val <= 70) return { text: 'Normal', color: '#43e97b' };
      if (val <= 85) return { text: 'Lembap', color: '#ffeaa7' };
      return { text: 'Sangat Lembap', color: '#667eea' };
    },
    wind: (val) => {
      if (val < 5) return { text: 'Tenang', color: '#43e97b' };
      if (val <= 10) return { text: 'Sedang', color: '#ffeaa7' };
      if (val <= 15) return { text: 'Kencang', color: '#ff9800' };
      return { text: 'Sangat Kencang', color: '#ff6b6b' };
    },
    rain: (val) => {
      if (val === 0) return { text: 'Tidak Hujan', color: '#43e97b' };
      if (val < 10) return { text: 'Hujan Ringan', color: '#4facfe' };
      if (val <= 30) return { text: 'Hujan Sedang', color: '#667eea' };
      if (val <= 50) return { text: 'Hujan Deras', color: '#ff9800' };
      return { text: 'Hujan Sangat Deras', color: '#ff6b6b' };
    },
    light_intensity: (val) => {
      if (val < 100) return { text: 'Gelap', color: '#667eea' };
      if (val <= 500) return { text: 'Redup', color: '#ffeaa7' };
      if (val <= 1000) return { text: 'Terang', color: '#43e97b' };
      return { text: 'Sangat Terang', color: '#ff9800' };
    }
  };
  
  // =====================================================================
  // DOM ELEMENTS
  // =====================================================================
  const deviceSelect = document.getElementById('deviceSelect');
  const dateFrom = document.getElementById('dateFrom');
  const dateTo = document.getElementById('dateTo');
  const timeStart = document.getElementById('timeStart');
  const timeEnd = document.getElementById('timeEnd');
  const frequencySelect = document.getElementById('frequencySelect');
  const setPeriodeBtn = document.getElementById('setPeriodeBtn');
  const filterBtn = document.getElementById('filterBtn');
  const resetBtn = document.getElementById('resetBtn');
  const exportCSV = document.getElementById('exportCSV');
  const exportExcel = document.getElementById('exportExcel');
  const tableBody = document.getElementById('tableBody');
  const tableInfo = document.getElementById('tableInfo');
  const loadingOverlay = document.getElementById('loadingOverlay');
  const statsContainer = document.getElementById('statsContainer');
  const chartsSection = document.getElementById('chartsSection');
  const pagination = document.getElementById('pagination');
  const prevPage = document.getElementById('prevPage');
  const nextPage = document.getElementById('nextPage');
  const pageInfo = document.getElementById('pageInfo');
  
  // Device Control Elements
  const deviceControlBtn = document.getElementById('deviceControlBtn');
  const deviceStatusIndicator = document.getElementById('deviceStatusIndicator');
  const detailedStatusContainer = document.getElementById('detailedStatusContainer');
  
  // ⭐ Sensor Control Elements (NEW)
  const toggleTemp = document.getElementById('toggleTemp');
  const toggleHumid = document.getElementById('toggleHumid');
  const toggleWind = document.getElementById('toggleWind');
  const toggleRain = document.getElementById('toggleRain');
  const toggleLight = document.getElementById('toggleLight');
  const applySensorConfig = document.getElementById('applySensorConfig');
  
  // =====================================================================
  // CHARTS INSTANCES
  // =====================================================================
  let charts = {};
  
  // =====================================================================
  // INIT CHARTS
  // =====================================================================
  function initCharts() {
    const chartConfig = {
      type: 'line',
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { 
          legend: { display: false },
          tooltip: {
            mode: 'index',
            intersect: false
          }
        },
        interaction: {
          mode: 'nearest',
          axis: 'x',
          intersect: false
        },
        scales: {
          x: { 
            display: true,
            grid: { display: false }
          },
          y: { 
            beginAtZero: true,
            grid: { color: 'rgba(0, 0, 0, 0.05)' }
          }
        },
        animation: { duration: 0 }
      }
    };
    
    const createDataset = (color) => ({
      data: [],
      borderColor: color,
      backgroundColor: color.replace('rgb', 'rgba').replace(')', ', 0.1)'),
      tension: 0.3,
      borderWidth: 2,
      pointRadius: 3,
      pointHoverRadius: 5,
      fill: true
    });
    
    charts.temp = new Chart(document.getElementById('chartTemp').getContext('2d'), {
      ...chartConfig,
      data: { labels: [], datasets: [createDataset('#ff6b6b')] }
    });
    
    charts.humid = new Chart(document.getElementById('chartHumid').getContext('2d'), {
      ...chartConfig,
      data: { labels: [], datasets: [createDataset('#4facfe')] }
    });
    
    charts.wind = new Chart(document.getElementById('chartWind').getContext('2d'), {
      ...chartConfig,
      data: { labels: [], datasets: [createDataset('#a8edea')] }
    });
    
    charts.rain = new Chart(document.getElementById('chartRain').getContext('2d'), {
      ...chartConfig,
      data: { labels: [], datasets: [createDataset('#667eea')] }
    });
    
    charts.light = new Chart(document.getElementById('chartLight').getContext('2d'), {
      ...chartConfig,
      data: { labels: [], datasets: [createDataset('#ffeaa7')] }
    });
  }
  
  // =====================================================================
  // INITIALIZATION
  // =====================================================================
  function init() {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    dateTo.value = today.toISOString().split('T')[0];
    dateFrom.value = weekAgo.toISOString().split('T')[0];
    
    initCharts();
    loadDevices();
    
    filterBtn.addEventListener('click', fetchData);
    resetBtn.addEventListener('click', resetFilters);
    exportCSV.addEventListener('click', downloadCSV);
    exportExcel.addEventListener('click', downloadExcel);
    prevPage.addEventListener('click', () => changePage(-1));
    nextPage.addEventListener('click', () => changePage(1));
    setPeriodeBtn.addEventListener('click', setPeriodeToDevice);
    deviceControlBtn.addEventListener('click', toggleDeviceControl);
    
    // ⭐ NEW: Sensor control event listeners
    applySensorConfig.addEventListener('click', applySensorConfiguration);
    
    // Enable/disable buttons based on device selection
    deviceSelect.addEventListener('change', function() {
      const hasDevice = !!this.value;
      deviceControlBtn.disabled = !hasDevice;
      applySensorConfig.disabled = !hasDevice;
      
      if (hasDevice) {
        checkDeviceStatus();
        loadSensorConfig();
      }
    });
    
    // Auto refresh status every 30 seconds
    setInterval(() => {
      if (deviceSelect.value) {
        checkDeviceStatus();
      }
    }, 30000);
  }
  
  // =====================================================================
  // LOAD DEVICES
  // =====================================================================
  async function loadDevices() {
    try {
      const res = await fetch('get_devices.php');
      if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
      
      const data = await res.json();
      console.log('✅ Devices loaded:', data);
      
      if (!data || data.length === 0) {
        deviceSelect.innerHTML = '<option value="">⚠️ Tidak ada device</option>';
        alert('⚠️ Tidak ada device di database!\n\nSilakan tambahkan device di menu Management.');
        return;
      }
      
      devices = data;
      deviceSelect.innerHTML = '<option value="">-- Pilih Device --</option>';
      devices.forEach(dev => {
        const opt = document.createElement('option');
        opt.value = dev.id_device;
        opt.textContent = `${dev.nama_device} (ID: ${dev.id_device})`;
        deviceSelect.appendChild(opt);
      });
      
      if (devices.length > 0) {
        deviceSelect.value = devices[0].id_device;
        checkDeviceStatus();
        loadSensorConfig();
      }
    } catch (e) {
      console.error('❌ Error loading devices:', e);
      deviceSelect.innerHTML = `<option value="">❌ Error: ${e.message}</option>`;
      alert(`❌ Gagal memuat devices: ${e.message}`);
    }
  }
  
  // =====================================================================
  // CHECK DEVICE STATUS (DETAILED)
  // =====================================================================
  async function checkDeviceStatus() {
    const id_device = deviceSelect.value;
    if (!id_device) return;
    
    try {
      const res = await fetch(`get_device_status.php?id_device=${id_device}`);
      const status = await res.json();
      
      deviceStatus = status;
      updateDetailedStatusUI(status);
      
    } catch (e) {
      console.error('Error checking device status:', e);
      deviceStatus = {
        wifi: 'error',
        mqtt: 'error',
        database: 'unknown',
        device_power: 'unknown',
        sensors: {},
        sensor_config: {}
      };
      updateDetailedStatusUI(deviceStatus);
    }
  }
  
  // =====================================================================
  // ⭐ LOAD SENSOR CONFIG FROM DATABASE
  // =====================================================================
  async function loadSensorConfig() {
    const id_device = deviceSelect.value;
    if (!id_device) return;
    
    try {
      const res = await fetch(`get_sensor_config.php?id_device=${id_device}`);
      const config = await res.json();
      
      if (config.success && config.data) {
        // Update toggle switches
        toggleTemp.checked = (config.data.sensor_temperature === 'on');
        toggleHumid.checked = (config.data.sensor_humidity === 'on');
        toggleWind.checked = (config.data.sensor_wind === 'on');
        toggleRain.checked = (config.data.sensor_rain === 'on');
        toggleLight.checked = (config.data.sensor_light === 'on');
        
        console.log('✅ Sensor config loaded:', config.data);
      }
    } catch (e) {
      console.error('Error loading sensor config:', e);
    }
  }
  
// =====================================================================
// UPDATE DETAILED STATUS UI - REVISED (Remove Device Power & Database)
// =====================================================================
function updateDetailedStatusUI(status) {
  const statusHTML = `
    <div class="status-grid">
      <div class="status-item ${status.wifi === 'connected' ? 'status-online' : 'status-offline'}">
        <span class="status-icon">${status.wifi === 'connected' ? '📶' : '📵'}</span>
        <div class="status-info">
          <strong>Wi-Fi</strong>
          <span>${status.wifi === 'connected' ? 'Connected' : 'Disconnected'}</span>
        </div>
      </div>
      
      <div class="status-item ${status.mqtt === 'connected' ? 'status-online' : 'status-offline'}">
        <span class="status-icon">${status.mqtt === 'connected' ? '🔗' : '⚠️'}</span>
        <div class="status-info">
          <strong>MQTT</strong>
          <span>${status.mqtt === 'connected' ? 'Connected' : 'Error'}</span>
        </div>
      </div>
    </div>
    
    <div class="sensors-status">
      <h4>📊 Status Sensor Hardware:</h4>
      <div class="sensor-status-grid">
        ${Object.entries(status.sensors || {}).map(([sensor, st]) => `
          <div class="sensor-status-item ${st === 'normal' ? 'sensor-normal' : 'sensor-error'}">
            <span>${SENSOR_LABELS[sensor] || sensor}</span>
            <span class="sensor-badge">${st === 'normal' ? '✓ Normal' : '✗ Error'}</span>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  
  detailedStatusContainer.innerHTML = statusHTML;
  
  // Update control button
  if (status.device_power === 'on') {
    deviceControlBtn.textContent = '🔴 Turn OFF Device';
    deviceControlBtn.className = 'btn btn-danger';
    deviceStatusIndicator.innerHTML = '<span style="color: #4CAF50;">● Device ON</span>';
  } else {
    deviceControlBtn.textContent = '🟢 Turn ON Device';
    deviceControlBtn.className = 'btn btn-success';
    deviceStatusIndicator.innerHTML = '<span style="color: #F44336;">● Device OFF</span>';
  }
  
  // Update sensor config status
  if (status.sensor_config) {
    deviceStatus.sensor_config = status.sensor_config;
  }
}
  // =====================================================================
  // ⭐ APPLY SENSOR CONFIGURATION
  // =====================================================================
  async function applySensorConfiguration() {
    const id_device = deviceSelect.value;
    if (!id_device) {
      alert('⚠️ Pilih device terlebih dahulu!');
      return;
    }
    
    const sensorConfig = {
      id_device: parseInt(id_device),
      sensor_temperature: toggleTemp.checked ? 'on' : 'off',
      sensor_humidity: toggleHumid.checked ? 'on' : 'off',
      sensor_wind: toggleWind.checked ? 'on' : 'off',
      sensor_rain: toggleRain.checked ? 'on' : 'off',
      sensor_light: toggleLight.checked ? 'on' : 'off'
    };
    
    // Check if at least one sensor is enabled
    const hasEnabled = Object.values(sensorConfig).some(v => v === 'on');
    if (!hasEnabled) {
      alert('⚠️ Minimal 1 sensor harus aktif!\n\nAnda harus mengaktifkan minimal satu sensor.');
      return;
    }
    
    const enabledSensors = [];
    if (sensorConfig.sensor_temperature === 'on') enabledSensors.push('Temperature');
    if (sensorConfig.sensor_humidity === 'on') enabledSensors.push('Humidity');
    if (sensorConfig.sensor_wind === 'on') enabledSensors.push('Wind');
    if (sensorConfig.sensor_rain === 'on') enabledSensors.push('Rain');
    if (sensorConfig.sensor_light === 'on') enabledSensors.push('Light');
    
    if (confirm(`🎚️ Terapkan konfigurasi sensor?\n\n✅ Sensor Aktif:\n${enabledSensors.join(', ')}\n\n⚠️ Sensor lain akan dinonaktifkan!`)) {
      showLoading(true);
      
      try {
        const res = await fetch('mqtt_send_sensor_config.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sensorConfig)
        });
        
        const result = await res.json();
        showLoading(false);
        
        if (result.success) {
          alert(`✅ ${result.message}\n\n📡 Konfigurasi telah dikirim ke ESP32 via MQTT.\nSensor akan update sesuai konfigurasi baru.`);
          checkDeviceStatus();
          loadSensorConfig();
        } else {
          alert(`❌ ${result.message || 'Gagal mengirim konfigurasi'}`);
        }
      } catch (e) {
        console.error('❌ Error:', e);
        showLoading(false);
        alert('❌ Gagal mengirim konfigurasi sensor.\n\nPastikan MQTT broker berjalan dan ESP32 terkoneksi.');
      }
    }
  }
  
  // =====================================================================
  // TOGGLE DEVICE CONTROL (ON/OFF)
  // =====================================================================
  async function toggleDeviceControl() {
    const id_device = deviceSelect.value;
    if (!id_device) {
      alert('⚠️ Pilih device terlebih dahulu!');
      return;
    }
    
    const currentStatus = deviceStatus.device_power === 'on';
    const action = currentStatus ? 'off' : 'on';
    
    if (confirm(`🔄 ${currentStatus ? 'Matikan' : 'Hidupkan'} device?\n\nDevice akan ${currentStatus ? 'berhenti' : 'mulai'} mengirim data.`)) {
      showLoading(true);
      
      try {
        const res = await fetch('control_device.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id_device: id_device,
            action: action
          })
        });
        
        const result = await res.json();
        showLoading(false);
        
        if (result.success) {
          alert(`✅ ${result.message}\n\n📡 Perintah telah dikirim ke device via MQTT.`);
          checkDeviceStatus();
        } else {
          alert(`❌ ${result.message || 'Gagal mengontrol device'}`);
        }
      } catch (e) {
        console.error('❌ Error:', e);
        showLoading(false);
        alert('❌ Gagal mengirim perintah ke device.\n\nPastikan MQTT broker berjalan dan ESP32 terkoneksi.');
      }
    }
  }
  
  // =====================================================================
  // SET PERIODE TO DEVICE VIA MQTT
  // =====================================================================
  async function setPeriodeToDevice() {
    const id_device = deviceSelect.value;
    const timeStartVal = timeStart.value;
    const timeEndVal = timeEnd.value;
    const frequency = parseInt(frequencySelect.value);
    
    if (!id_device) {
      alert('⚠️ Pilih device terlebih dahulu!');
      return;
    }
    
    if (!timeStartVal || !timeEndVal) {
      alert('⚠️ Tentukan rentang waktu pengambilan data!');
      return;
    }
    
    if (confirm(`🚀 Kirim konfigurasi ke device?\n\n📋 Device: ${id_device}\n⏰ Waktu: ${timeStartVal} - ${timeEndVal}\n🔄 Frekuensi: ${frequency} detik`)) {
      showLoading(true);
      
      const payload = {
        id_device: id_device,
        time_start: timeStartVal,
        time_end: timeEndVal,
        frequency: frequency
      };
      
      try {
        const res = await fetch('mqtt_send_config.php', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        
        const result = await res.json();
        showLoading(false);
        
        if (result.success) {
          alert(`✅ ${result.message}\n\n📡 Konfigurasi telah dikirim ke device via MQTT.\nDevice akan memperbarui periode pengambilan data.`);
        } else {
          alert(`❌ ${result.message || 'Gagal mengirim konfigurasi'}`);
        }
      } catch (e) {
        console.error('❌ Error:', e);
        showLoading(false);
        alert('❌ Gagal mengirim konfigurasi ke device.\n\nPastikan MQTT broker berjalan dan ESP32 terkoneksi.');
      }
    }
  }
  
  // =====================================================================
  // FETCH DATA FROM DATABASE
  // =====================================================================
  async function fetchData() {
    const id_device = deviceSelect.value;
    const from = dateFrom.value;
    const to = dateTo.value;
    
    if (!id_device) {
      alert('⚠️ Pilih device terlebih dahulu!');
      return;
    }
    
    if (!from || !to) {
      alert('⚠️ Pilih tanggal dari dan sampai!');
      return;
    }
    
    showLoading(true);
    
    try {
      let url = `get_sensor_data.php?id_device=${id_device}`;
      if (from) url += `&date_from=${from}`;
      if (to) url += `&date_to=${to}`;
      
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch data');
      
      const rows = await res.json();
      
      if (!rows || rows.length === 0) {
        allData = [];
        groupedData = [];
        tableInfo.textContent = 'Tidak ada data untuk filter yang dipilih.';
        tableBody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 40px; color: #999;">Tidak ada data</td></tr>';
        statsContainer.style.display = 'none';
        chartsSection.style.display = 'none';
        pagination.style.display = 'none';
        showLoading(false);
        return;
      }
      
      allData = rows.map(r => ({
        timestamp: r.timestamp,
        id_device: r.id_device,
        id_sensor: r.id_sensor,
        sensor_name: SENSOR_ID_TO_NAME[r.id_sensor] || r.nama_sensor || `sensor_${r.id_sensor}`,
        value: parseFloat(r.value),
        latitude: r.latitude ? parseFloat(r.latitude) : null,
        longitude: r.longitude ? parseFloat(r.longitude) : null,
        nama_device: r.nama_device
      }));
      
      groupDataByTimestamp();
      updateStats();
      updateCharts();
      updateTable();
      
      statsContainer.style.display = 'block';
      chartsSection.style.display = 'grid';
      
      showLoading(false);
      
    } catch (e) {
      console.error('❌ Error fetching data:', e);
      alert('❌ Gagal memuat data.\n\nPastikan database dan PHP backend berjalan dengan baik.');
      showLoading(false);
    }
  }
  
  // =====================================================================
  // GROUP DATA BY TIMESTAMP
  // =====================================================================
  function groupDataByTimestamp() {
    const grouped = {};
    
    allData.forEach(row => {
      const ts = row.timestamp;
      if (!grouped[ts]) {
        grouped[ts] = {
          timestamp: ts,
          device: row.nama_device,
          temperature: null,
          humidity: null,
          wind: null,
          rain: null,
          light_intensity: null,
          latitude: row.latitude,
          longitude: row.longitude
        };
      }
      
      grouped[ts][row.sensor_name] = row.value;
    });
    
    groupedData = Object.values(grouped).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    currentPage = 1;
  }
  
  // =====================================================================
  // UPDATE STATS WITH DECISION LAYER
  // =====================================================================
  function updateStats() {
    const stats = {
      temperature: { values: [], sum: 0, count: 0 },
      humidity: { values: [], sum: 0, count: 0 },
      wind: { values: [], sum: 0, count: 0 },
      rain: { values: [], sum: 0, count: 0 },
      light_intensity: { values: [], sum: 0, count: 0 }
    };
    
    allData.forEach(row => {
      const sensor = row.sensor_name;
      if (stats[sensor]) {
        stats[sensor].values.push(row.value);
        stats[sensor].sum += row.value;
        stats[sensor].count++;
      }
    });
    
    for (const sensor in stats) {
      const data = stats[sensor];
      if (data.count > 0) {
        const avg = (data.sum / data.count).toFixed(2);
        const max = Math.max(...data.values).toFixed(2);
        const min = Math.min(...data.values).toFixed(2);
        
        const condition = DECISION_RULES[sensor](parseFloat(avg));
        
        if (sensor === 'temperature') {
          document.getElementById('statTempMax').textContent = max + ' °C';
          document.getElementById('statTempMin').textContent = min + ' °C';
          document.getElementById('statTempAvg').textContent = avg + ' °C';
          document.getElementById('statTempCondition').innerHTML = `<span style="color: ${condition.color}; font-weight: bold;">${condition.text}</span>`;
        } else if (sensor === 'humidity') {
          document.getElementById('statHumidMax').textContent = max + ' %';
          document.getElementById('statHumidMin').textContent = min + ' %';
          document.getElementById('statHumidAvg').textContent = avg + ' %';
          document.getElementById('statHumidCondition').innerHTML = `<span style="color: ${condition.color}; font-weight: bold;">${condition.text}</span>`;
        } else if (sensor === 'wind') {
          document.getElementById('statWindMax').textContent = max + ' m/s';
          document.getElementById('statWindMin').textContent = min + ' m/s';
          document.getElementById('statWindAvg').textContent = avg + ' m/s';
          document.getElementById('statWindCondition').innerHTML = `<span style="color: ${condition.color}; font-weight: bold;">${condition.text}</span>`;
        } else if (sensor === 'rain') {
          document.getElementById('statRainMax').textContent = max + ' mm';
          document.getElementById('statRainMin').textContent = min + ' mm';
          document.getElementById('statRainAvg').textContent = avg + ' mm';
          document.getElementById('statRainCondition').innerHTML = `<span style="color: ${condition.color}; font-weight: bold;">${condition.text}</span>`;
        } else if (sensor === 'light_intensity') {
          document.getElementById('statLightMax').textContent = max + ' lux';
          document.getElementById('statLightMin').textContent = min + ' lux';
          document.getElementById('statLightAvg').textContent = avg + ' lux';
          document.getElementById('statLightCondition').innerHTML = `<span style="color: ${condition.color}; font-weight: bold;">${condition.text}</span>`;
        }
      }
    }
  }
  
  // =====================================================================
  // UPDATE CHARTS
  // =====================================================================
  function updateCharts() {
    const chartData = {
      temperature: { labels: [], values: [] },
      humidity: { labels: [], values: [] },
      wind: { labels: [], values: [] },
      rain: { labels: [], values: [] },
      light_intensity: { labels: [], values: [] }
    };
    
    const sortedData = [...groupedData].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    sortedData.forEach(row => {
      const label = new Date(row.timestamp).toLocaleString('id-ID', { 
        month: '2-digit', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      if (row.temperature !== null) {
        chartData.temperature.labels.push(label);
        chartData.temperature.values.push(row.temperature);
      }
      if (row.humidity !== null) {
        chartData.humidity.labels.push(label);
        chartData.humidity.values.push(row.humidity);
      }
      if (row.wind !== null) {
        chartData.wind.labels.push(label);
        chartData.wind.values.push(row.wind);
      }
      if (row.rain !== null) {
        chartData.rain.labels.push(label);
        chartData.rain.values.push(row.rain);
      }
      if (row.light_intensity !== null) {
        chartData.light_intensity.labels.push(label);
        chartData.light_intensity.values.push(row.light_intensity);
      }
    });
    
    charts.temp.data.labels = chartData.temperature.labels;
    charts.temp.data.datasets[0].data = chartData.temperature.values;
    charts.temp.update('none');
    
    charts.humid.data.labels = chartData.humidity.labels;
    charts.humid.data.datasets[0].data = chartData.humidity.values;
    charts.humid.update('none');
    
    charts.wind.data.labels = chartData.wind.labels;
    charts.wind.data.datasets[0].data = chartData.wind.values;
    charts.wind.update('none');
    
    charts.rain.data.labels = chartData.rain.labels;
    charts.rain.data.datasets[0].data = chartData.rain.values;
    charts.rain.update('none');
    
    charts.light.data.labels = chartData.light_intensity.labels;
    charts.light.data.datasets[0].data = chartData.light_intensity.values;
    charts.light.update('none');
  }
  
  // =====================================================================
  // UPDATE TABLE
  // =====================================================================
  function updateTable() {
    if (groupedData.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 40px; color: #999;">Tidak ada data</td></tr>';
      tableInfo.textContent = 'Tidak ada data.';
      pagination.style.display = 'none';
      return;
    }
    
    const totalPages = Math.ceil(groupedData.length / rowsPerPage);
    const startIdx = (currentPage - 1) * rowsPerPage;
    const endIdx = startIdx + rowsPerPage;
    const pageData = groupedData.slice(startIdx, endIdx);
    
    tableBody.innerHTML = '';
    pageData.forEach((row, idx) => {
      const tr = document.createElement('tr');
      
      tr.innerHTML = `
        <td>${startIdx + idx + 1}</td>
        <td>${row.timestamp}</td>
        <td>${row.device || '-'}</td>
        <td><strong>${row.temperature !== null ? row.temperature.toFixed(2) : '-'}</strong></td>
        <td><strong>${row.humidity !== null ? row.humidity.toFixed(2) : '-'}</strong></td>
        <td><strong>${row.wind !== null ? row.wind.toFixed(2) : '-'}</strong></td>
        <td><strong>${row.rain !== null ? row.rain.toFixed(2) : '-'}</strong></td>
        <td><strong>${row.light_intensity !== null ? row.light_intensity.toFixed(2) : '-'}</strong></td>
        <td>${row.latitude !== null ? row.latitude.toFixed(5) : '-'}</td>
        <td>${row.longitude !== null ? row.longitude.toFixed(5) : '-'}</td>
      `;
      tableBody.appendChild(tr);
    });
    
    tableInfo.textContent = `Menampilkan ${startIdx + 1}-${Math.min(endIdx, groupedData.length)} dari ${groupedData.length} data`;
    
    if (totalPages > 1) {
      pagination.style.display = 'flex';
      pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
      prevPage.disabled = currentPage === 1;
      nextPage.disabled = currentPage === totalPages;
    } else {
      pagination.style.display = 'none';
    }
  }
  
  // =====================================================================
  // PAGINATION
  // =====================================================================
  function changePage(delta) {
    currentPage += delta;
    updateTable();
  }
  
// =====================================================================
// EXPORT CSV WITH STATISTICS - FORMAT SEPERTI GAMBAR 2
// =====================================================================
function downloadCSV() {
  if (groupedData.length === 0) {
    alert('⚠️ Tidak ada data untuk di-export!');
    return;
  }
  
  // ========== BAGIAN 1: DATA SENSOR ==========
  let csv = 'No,Timestamp,Device,Temperature (°C),Humidity (%),Wind (m/s),Rain (mm),Light Intensity (lux),Latitude,Longitude\n';
  
  groupedData.forEach((row, idx) => {
    csv += `${idx + 1},"${row.timestamp}","${row.device}",${row.temperature || ''},${row.humidity || ''},${row.wind || ''},${row.rain || ''},${row.light_intensity || ''},${row.latitude || ''},${row.longitude || ''}\n`;
  });
  
  // ========== BAGIAN 2: STATISTIK ==========
  csv += '\n'; // Empty line separator
  csv += '===== STATISTIK DATA SENSOR =====\n';
  csv += 'Sensor,Rata-rata,Min,Max,Keterangan,Total Data\n';
  
  // Calculate statistics
  const stats = {
    temperature: { values: [], sum: 0, count: 0 },
    humidity: { values: [], sum: 0, count: 0 },
    wind: { values: [], sum: 0, count: 0 },
    rain: { values: [], sum: 0, count: 0 },
    light_intensity: { values: [], sum: 0, count: 0 }
  };
  
  allData.forEach(row => {
    const sensor = row.sensor_name;
    if (stats[sensor]) {
      stats[sensor].values.push(row.value);
      stats[sensor].sum += row.value;
      stats[sensor].count++;
    }
  });
  
  // Add statistics rows
  for (const sensor in stats) {
    const data = stats[sensor];
    
    if (data.count > 0) {
      const avg = (data.sum / data.count).toFixed(2);
      const max = Math.max(...data.values).toFixed(2);
      const min = Math.min(...data.values).toFixed(2);
      
      const condition = DECISION_RULES[sensor](parseFloat(avg));
      
      let sensorLabel = '';
      
      switch(sensor) {
        case 'temperature':
          sensorLabel = 'Suhu (°C)';
          break;
        case 'humidity':
          sensorLabel = 'Kelembapan (%)';
          break;
        case 'wind':
          sensorLabel = 'Angin (m/s)';
          break;
        case 'rain':
          sensorLabel = 'Hujan (mm)';
          break;
        case 'light_intensity':
          sensorLabel = 'Cahaya (lux)';
          break;
      }
      
      csv += `"${sensorLabel}",${avg},${min},${max},"${condition.text}",${data.count}\n`;
    }
  }
  
  // ========== BAGIAN 3: METADATA ==========
  csv += '\n';
  csv += `"Periode Data: ${dateFrom.value} s/d ${dateTo.value}"\n`;
  csv += `"Rentang Waktu: ${timeStart.value} - ${timeEnd.value}"\n`;
  csv += `"Frekuensi: Setiap ${frequencySelect.value} detik"\n`;
  
  const currentDate = new Date();
  csv += `"Tanggal Export: ${currentDate.toLocaleDateString('id-ID')} ${currentDate.toLocaleTimeString('id-ID')}"\n`;
  csv += `"Total Row: ${groupedData.length}"\n`;
  
  // Download CSV
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `sensor_data_${dateFrom.value}_${dateTo.value}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  alert('✅ Data berhasil di-export ke CSV!\n\n📊 Berisi:\n- Semua data sensor\n- Statistik ringkasan\n- Metadata periode');
}
// =====================================================================
// EXPORT EXCEL WITH 2 SHEETS: DATA + STATISTIK
// =====================================================================
function downloadExcel() {
  if (groupedData.length === 0) {
    alert('⚠️ Tidak ada data untuk di-export!');
    return;
  }
  
  // ========== SHEET 1: DATA SENSOR ==========
  const excelData = groupedData.map((row, idx) => ({
    'No': idx + 1,
    'Timestamp': row.timestamp,
    'Device': row.device,
    'Temperature (°C)': row.temperature !== null ? row.temperature : '',
    'Humidity (%)': row.humidity !== null ? row.humidity : '',
    'Wind (m/s)': row.wind !== null ? row.wind : '',
    'Rain (mm)': row.rain !== null ? row.rain : '',
    'Light Intensity (lux)': row.light_intensity !== null ? row.light_intensity : '',
    'Latitude': row.latitude !== null ? row.latitude : '',
    'Longitude': row.longitude !== null ? row.longitude : ''
  }));
  
  // ========== SHEET 2: STATISTIK & KETERANGAN ==========
  const stats = {
    temperature: { values: [], sum: 0, count: 0 },
    humidity: { values: [], sum: 0, count: 0 },
    wind: { values: [], sum: 0, count: 0 },
    rain: { values: [], sum: 0, count: 0 },
    light_intensity: { values: [], sum: 0, count: 0 }
  };
  
  // Calculate statistics
  allData.forEach(row => {
    const sensor = row.sensor_name;
    if (stats[sensor]) {
      stats[sensor].values.push(row.value);
      stats[sensor].sum += row.value;
      stats[sensor].count++;
    }
  });
  
  // Create statistics data (FORMAT SEPERTI GAMBAR 2)
  const statistikData = [];
  
  // Header row
  statistikData.push({
    'Sensor': 'Sensor',
    'Rata-rata': 'Rata-rata',
    'Min': 'Min',
    'Max': 'Max',
    'Keterangan': 'Keterangan',
    'Total Data': 'Total Data'
  });
  
  // Data for each sensor
  for (const sensor in stats) {
    const data = stats[sensor];
    
    if (data.count > 0) {
      const avg = (data.sum / data.count).toFixed(2);
      const max = Math.max(...data.values).toFixed(2);
      const min = Math.min(...data.values).toFixed(2);
      
      const condition = DECISION_RULES[sensor](parseFloat(avg));
      
      let sensorLabel = '';
      let unit = '';
      
      switch(sensor) {
        case 'temperature':
          sensorLabel = 'Suhu (°C)';
          unit = '';
          break;
        case 'humidity':
          sensorLabel = 'Kelembapan (%)';
          unit = '';
          break;
        case 'wind':
          sensorLabel = 'Angin (m/s)';
          unit = '';
          break;
        case 'rain':
          sensorLabel = 'Hujan (mm)';
          unit = '';
          break;
        case 'light_intensity':
          sensorLabel = 'Cahaya (lux)';
          unit = '';
          break;
      }
      
      statistikData.push({
        'Sensor': sensorLabel,
        'Rata-rata': avg,
        'Min': min,
        'Max': max,
        'Keterangan': condition.text,
        'Total Data': data.count
      });
    }
  }
  
  // Add legend
  statistikData.push({
    'Sensor': '',
    'Max': '',
    'Min': '',
    'Rata-rata': '',
    'Total Data': '',
    'Kondisi': ''
  });
  
  statistikData.push({
    'Sensor': '═══ KETERANGAN KONDISI ═══',
    'Max': '',
    'Min': '',
    'Rata-rata': '',
    'Total Data': '',
    'Kondisi': ''
  });
  
  // Temperature conditions
  statistikData.push({
    'Sensor': 'Temperature:',
    'Max': '',
    'Min': '',
    'Rata-rata': '',
    'Total Data': '',
    'Kondisi': ''
  });
  statistikData.push({
    'Sensor': '  < 20°C',
    'Max': '',
    'Min': '',
    'Rata-rata': '',
    'Total Data': '',
    'Kondisi': 'Dingin'
  });
  statistikData.push({
    'Sensor': '  20-30°C',
    'Max': '',
    'Min': '',
    'Rata-rata': '',
    'Total Data': '',
    'Kondisi': 'Normal'
  });
  statistikData.push({
    'Sensor': '  > 30°C',
    'Max': '',
    'Min': '',
    'Rata-rata': '',
    'Total Data': '',
    'Kondisi': 'Panas'
  });
  
  // Humidity conditions
  statistikData.push({
    'Sensor': 'Humidity:',
    'Max': '',
    'Min': '',
    'Rata-rata': '',
    'Total Data': '',
    'Kondisi': ''
  });
  statistikData.push({
    'Sensor': '  < 40%',
    'Max': '',
    'Min': '',
    'Rata-rata': '',
    'Total Data': '',
    'Kondisi': 'Kering'
  });
  statistikData.push({
    'Sensor': '  40-70%',
    'Max': '',
    'Min': '',
    'Rata-rata': '',
    'Total Data': '',
    'Kondisi': 'Normal'
  });
  statistikData.push({
    'Sensor': '  70-85%',
    'Max': '',
    'Min': '',
    'Rata-rata': '',
    'Total Data': '',
    'Kondisi': 'Lembap'
  });
  statistikData.push({
    'Sensor': '  > 85%',
    'Max': '',
    'Min': '',
    'Rata-rata': '',
    'Total Data': '',
    'Kondisi': 'Sangat Lembap'
  });
  
  // Wind conditions
  statistikData.push({
    'Sensor': 'Wind:',
    'Max': '',
    'Min': '',
    'Rata-rata': '',
    'Total Data': '',
    'Kondisi': ''
  });
  statistikData.push({
    'Sensor': '  < 5 m/s',
    'Max': '',
    'Min': '',
    'Rata-rata': '',
    'Total Data': '',
    'Kondisi': 'Tenang'
  });
  statistikData.push({
    'Sensor': '  5-10 m/s',
    'Max': '',
    'Min': '',
    'Rata-rata': '',
    'Total Data': '',
    'Kondisi': 'Sedang'
  });
  statistikData.push({
    'Sensor': '  10-15 m/s',
    'Max': '',
    'Min': '',
    'Rata-rata': '',
    'Total Data': '',
    'Kondisi': 'Kencang'
  });
  statistikData.push({
    'Sensor': '  > 15 m/s',
    'Max': '',
    'Min': '',
    'Rata-rata': '',
    'Total Data': '',
    'Kondisi': 'Sangat Kencang'
  });
  
  // Rain conditions
  statistikData.push({
    'Sensor': 'Rain:',
    'Max': '',
    'Min': '',
    'Rata-rata': '',
    'Total Data': '',
    'Kondisi': ''
  });
  statistikData.push({
    'Sensor': '  0 mm',
    'Max': '',
    'Min': '',
    'Rata-rata': '',
    'Total Data': '',
    'Kondisi': 'Tidak Hujan'
  });
  statistikData.push({
    'Sensor': '  < 10 mm',
    'Max': '',
    'Min': '',
    'Rata-rata': '',
    'Total Data': '',
    'Kondisi': 'Hujan Ringan'
  });
  statistikData.push({
    'Sensor': '  10-30 mm',
    'Max': '',
    'Min': '',
    'Rata-rata': '',
    'Total Data': '',
    'Kondisi': 'Hujan Sedang'
  });
  statistikData.push({
    'Sensor': '  30-50 mm',
    'Max': '',
    'Min': '',
    'Rata-rata': '',
    'Total Data': '',
    'Kondisi': 'Hujan Deras'
  });
  statistikData.push({
    'Sensor': '  > 50 mm',
    'Max': '',
    'Min': '',
    'Rata-rata': '',
    'Total Data': '',
    'Kondisi': 'Hujan Sangat Deras'
  });
  
  // Light conditions
  statistikData.push({
    'Sensor': 'Light Intensity:',
    'Max': '',
    'Min': '',
    'Rata-rata': '',
    'Total Data': '',
    'Kondisi': ''
  });
  statistikData.push({
    'Sensor': '  < 100 lux',
    'Max': '',
    'Min': '',
    'Rata-rata': '',
    'Total Data': '',
    'Kondisi': 'Gelap'
  });
  statistikData.push({
    'Sensor': '  100-500 lux',
    'Max': '',
    'Min': '',
    'Rata-rata': '',
    'Total Data': '',
    'Kondisi': 'Redup'
  });
  statistikData.push({
    'Sensor': '  500-1000 lux',
    'Max': '',
    'Min': '',
    'Rata-rata': '',
    'Total Data': '',
    'Kondisi': 'Terang'
  });
  statistikData.push({
    'Sensor': '  > 1000 lux',
    'Max': '',
    'Min': '',
    'Rata-rata': '',
    'Total Data': '',
    'Kondisi': 'Sangat Terang'
  });
  
  // Create workbook with 2 sheets
  const wb = XLSX.utils.book_new();
  
  // Sheet 1: Data Sensor
  const ws1 = XLSX.utils.json_to_sheet(excelData);
  XLSX.utils.book_append_sheet(wb, ws1, 'Data Sensor');
  
  // Sheet 2: Statistik
  const ws2 = XLSX.utils.json_to_sheet(statistikData);
  XLSX.utils.book_append_sheet(wb, ws2, 'Statistik & Keterangan');
  
  // Download
  const filename = `sensor_data_${dateFrom.value}_${dateTo.value}.xlsx`;
  XLSX.writeFile(wb, filename);
  
  alert('✅ Data berhasil di-export dengan 2 sheet:\n\n📊 Sheet 1: Data Sensor\n📈 Sheet 2: Statistik & Keterangan');
}

  // =====================================================================
  // RESET FILTERS
  // =====================================================================
  function resetFilters() {
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    dateTo.value = today.toISOString().split('T')[0];
    dateFrom.value = weekAgo.toISOString().split('T')[0];
    timeStart.value = '08:00';
    timeEnd.value = '17:00';
    frequencySelect.value = '60';
    
    if (devices.length > 0) {
      deviceSelect.value = devices[0].id_device;
    }
    
    allData = [];
    groupedData = [];
    tableBody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 40px; color: #999;">Tidak ada data</td></tr>';
    tableInfo.textContent = 'Gunakan filter untuk menampilkan data.';
    statsContainer.style.display = 'none';
    chartsSection.style.display = 'none';
    pagination.style.display = 'none';
  }
  
  // =====================================================================
  // LOADING OVERLAY
  // =====================================================================
  function showLoading(show) {
    loadingOverlay.style.display = show ? 'flex' : 'none';
  }
  
  // =====================================================================
  // START APPLICATION
  // =====================================================================
  document.addEventListener('DOMContentLoaded', init);
})();