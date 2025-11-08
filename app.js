/* app.js – Simplified Realtime Monitoring Only
   Endpoint yang dibutuhkan:
   - get_devices.php
   - get_sensor_data.php?id_device=X&limit=N
*/

(() => {
  // CONFIG
  const MQTT_URL = 'wss://broker.emqx.io:8084/mqtt';
  const MQTT_TOPIC_PREFIX = 'device';
  const DEFAULT_DEVICE_ID = 1;
  const DEFAULT_LAT = 2.42283;
  const DEFAULT_LON = 99.0946;

  // STATE
  let devices = [];
  let activeDeviceId = DEFAULT_DEVICE_ID;
  let activeDevice = null;
  let activeDeviceIsLive = false;
  let sensorDataGrouped = {};
  let sensorDataList = [];

  // DOM
  const deviceStatusText = document.getElementById('statusText');
  const locationInfo = document.getElementById('locationInfo');
  const intervalInfo = document.getElementById('intervalInfo');
  const tempEl = document.getElementById('temp');
  const humidityEl = document.getElementById('humidity');
  const windEl = document.getElementById('wind');
  const rainEl = document.getElementById('rain');
  const lightEl = document.getElementById('light');
  const currentDay = document.getElementById('currentDay');

  // MAP INIT
  let map = L.map('map').setView([DEFAULT_LAT, DEFAULT_LON], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
  let markers = {};
  let activeMarker = null;

  // SENSOR ID MAP
  const SENSOR_ID_TO_NAME = {
    1: 'temperature',
    2: 'humidity',
    3: 'wind',
    4: 'rain',
    5: 'light_intensity'
  };

  // MQTT CLIENT
  const client = mqtt.connect(MQTT_URL);
  client.on('connect', () => {
    console.log('MQTT connected');
    client.subscribe('iot/weather');
    client.subscribe('device/+/data');
  });
  client.on('error', err => {
    console.error('MQTT error', err);
  });
  client.on('message', (topic, message) => {
    try {
      const payload = JSON.parse(message.toString());
      handleMQTTMessage(topic, payload);
    } catch(e) {
      console.warn('MQTT parse error', e);
    }
  });

  // CHART INIT - All sensors visible by default
  const ctx = document.getElementById('sensorChart').getContext('2d');
  const chartConfig = {
    type: 'line',
    data: {
      labels: [],
      datasets: [
        { label: 'Temperature (°C)', data: [], borderColor: '#ff6b6b', backgroundColor: 'rgba(255,107,107,0.1)', tension:0.3, sensor:'temperature', hidden: false },
        { label: 'Humidity (%)', data: [], borderColor: '#4facfe', backgroundColor: 'rgba(79,172,254,0.1)', tension:0.3, sensor:'humidity', hidden: false },
        { label: 'Wind (m/s)', data: [], borderColor: '#a8edea', backgroundColor: 'rgba(168,237,234,0.1)', tension:0.3, sensor:'wind', hidden: false },
        { label: 'Rain (mm)', data: [], borderColor: '#667eea', backgroundColor: 'rgba(102,126,234,0.1)', tension:0.3, sensor:'rain', hidden: false },
        { label: 'Light (lux)', data: [], borderColor: '#ffeaa7', backgroundColor: 'rgba(255,234,167,0.1)', tension:0.3, sensor:'light_intensity', hidden: false }
      ]
    },
    options: { 
      responsive: true, 
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'top' }
      }, 
      scales: {
        x: { display: true },
        y: { beginAtZero: true }
      }
    }
  };
  const sensorChart = new Chart(ctx, chartConfig);

  // =====================================================================
  // INIT
  // =====================================================================
  function init() {
    currentDay.innerText = new Date().toLocaleDateString('id-ID', {
      weekday:'long', day:'numeric', month:'long', year:'numeric'
    });

    loadDevices();
  }

  // =====================================================================
  // LOAD DEVICES & MARKERS
  // =====================================================================
  async function loadDevices(){
    try {
      const res = await fetch('get_devices.php');
      if (!res.ok) throw new Error('Server error: ' + res.status);
      
      const data = await res.json();
      
      if (!data || data.length === 0) {
        throw new Error('Tidak ada data perangkat');
      }
      
      devices = data;
      console.log('✅ Devices loaded:', devices);
      
      Object.values(markers).forEach(m => map.removeLayer(m));
      markers = {};
      
      devices.forEach(dev => {
        const lat = parseFloat(dev.latitude);
        const lon = parseFloat(dev.longitude);
        
        if (isNaN(lat) || isNaN(lon)) {
          console.warn(`⚠️ Invalid coordinates for device ${dev.id_device}`);
          return;
        }
        
        const m = L.marker([lat, lon]).addTo(map);
        m.bindPopup(`<b>${dev.nama_device}</b><br>Lat: ${lat}<br>Lng: ${lon}<br>Interval: ${dev.interval_data ?? '-'} detik`);
        
        m.on('click', async () => {
          selectDevice(dev);
        });
        
        markers[dev.id_device] = m;
      });

      if (devices.length > 0) {
        const firstDevice = devices[0];
        map.setView([parseFloat(firstDevice.latitude), parseFloat(firstDevice.longitude)], 13);
        selectDevice(firstDevice);
      }
      
    } catch(e) {
      console.error('❌ Gagal load devices:', e);
      
      console.log('⚠️ Menggunakan device default...');
      devices = [{
        id_device: DEFAULT_DEVICE_ID, 
        nama_device: 'Marom', 
        latitude: DEFAULT_LAT, 
        longitude: DEFAULT_LON, 
        interval_data: 60
      }];
      
      const m = L.marker([DEFAULT_LAT, DEFAULT_LON]).addTo(map);
      m.bindPopup(`<b>Marom (Default)</b><br>Lat: ${DEFAULT_LAT}<br>Lng: ${DEFAULT_LON}`);
      m.on('click', () => selectDevice(devices[0]));
      markers[DEFAULT_DEVICE_ID] = m;
      
      map.setView([DEFAULT_LAT, DEFAULT_LON], 13);
      selectDevice(devices[0]);
    }
  }

  // =====================================================================
  // SELECT DEVICE
  // =====================================================================
  async function selectDevice(dev) {
    activeDeviceId = dev.id_device;
    activeDevice = dev;
    
    if (activeMarker) {
      activeMarker.setIcon(new L.Icon.Default());
    }
    
    const marker = markers[dev.id_device];
    if (marker) {
      activeMarker = marker;
      const activeIcon = L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      });
      marker.setIcon(activeIcon);
      marker.openPopup();
    }
    
    updateLocationInfo(dev);
    await loadLastDataForDevice(dev.id_device, true);
    map.setView([parseFloat(dev.latitude), parseFloat(dev.longitude)], 13);
  }

  // =====================================================================
  // UPDATE LOCATION INFO
  // =====================================================================
  function updateLocationInfo(dev) {
    const lat = parseFloat(dev.latitude).toFixed(5);
    const lon = parseFloat(dev.longitude).toFixed(5);
    locationInfo.innerHTML = `<strong>${dev.nama_device}</strong><br><small>Lat: ${lat}, Lng: ${lon}</small>`;
  }

  // =====================================================================
  // LOAD LAST DATA
  // =====================================================================
  async function loadLastDataForDevice(id_device, enableMonitoringIfLive){
    try {
      const res = await fetch(`get_sensor_data.php?id_device=${id_device}&limit=50`);
      if (!res.ok) throw new Error('Fetch failed: ' + res.status);
      
      const rows = await res.json();
      
      if (!rows || rows.length === 0) {
        console.log('⚠️ Tidak ada data sensor untuk device', id_device);
        showLatestOnCards(null);
        sensorChart.data.labels = [];
        sensorChart.data.datasets.forEach(ds => ds.data = []);
        sensorChart.update();
        
        deviceStatusText.innerText = 'Menunggu Data...';
        intervalInfo.innerText = `Interval: ${activeDevice?.interval_data ?? '-'} detik`;
        return;
      }
      
      groupRowsIntoSensorObjects(rows);

      if (sensorDataList.length > 0) {
        const latest = sensorDataList[sensorDataList.length - 1];
        showLatestOnCards(latest);
        updateChartWith(sensorDataList);
      }

      const dev = devices.find(d => d.id_device == id_device);
      if (dev) {
        intervalInfo.innerText = `Interval: ${dev.interval_data ?? '-'} detik`;
      }

      if (enableMonitoringIfLive) {
        const recentTs = sensorDataList.length ? sensorDataList[sensorDataList.length-1].timestamp : null;
        const intervalSec = dev?.interval_data ? parseInt(dev.interval_data) : 60;
        if (recentTs) {
          const ageSec = (Date.now() - new Date(recentTs).getTime()) / 1000;
          if (ageSec < intervalSec * 2) {
            activeDeviceIsLive = true;
            deviceStatusText.innerHTML = `<span style="color:#4CAF50;">● ACTIVE</span>`;
          } else {
            activeDeviceIsLive = false;
            deviceStatusText.innerHTML = `<span style="color:#FF9800;">● OFFLINE</span>`;
          }
        }
      }
    } catch(e) {
      console.error('❌ Gagal memuat data device:', e);
      deviceStatusText.innerHTML = `<span style="color:#F44336;">● ERROR</span>`;
    }
  }

  // =====================================================================
  // GROUP DATA
  // =====================================================================
  function groupRowsIntoSensorObjects(rows){
    sensorDataGrouped = {};
    rows.sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
    rows.forEach(r => {
      const ts = r.timestamp;
      if (!sensorDataGrouped[ts]) sensorDataGrouped[ts] = { timestamp: ts };
      const name = SENSOR_ID_TO_NAME[r.id_sensor] ?? (`s${r.id_sensor}`);
      sensorDataGrouped[ts][name] = parseFloat(r.value);
      if (r.latitude) sensorDataGrouped[ts].latitude = parseFloat(r.latitude);
      if (r.longitude) sensorDataGrouped[ts].longitude = parseFloat(r.longitude);
    });
    sensorDataList = Object.values(sensorDataGrouped).sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  // =====================================================================
  // UI UPDATE HELPERS
  // =====================================================================
  function showLatestOnCards(obj){
    tempEl.innerText = (obj?.temperature ?? '-') + ' °C';
    humidityEl.innerText = (obj?.humidity ?? '-') + ' %';
    windEl.innerText = (obj?.wind ?? '-') + ' m/s';
    rainEl.innerText = (obj?.rain ?? '-') + ' mm';
    lightEl.innerText = (obj?.light_intensity ?? '-') + ' lux';
  }

  function updateChartWith(list){
    list.sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
    const labels = list.map(x => {
      const d = new Date(x.timestamp);
      return d.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'});
    });
    sensorChart.data.labels = labels;
    
    // Show all sensors in realtime
    sensorChart.data.datasets.forEach(ds => {
      const key = ds.sensor;
      ds.data = list.map(it => (it[key] === undefined ? null : it[key]));
      ds.hidden = false; // Always show all sensors
    });
    sensorChart.update();
  }

  // MQTT HANDLER
  function handleMQTTMessage(topic, payload){
    if (!payload || !payload.id_device) return;
    if (payload.id_device == activeDeviceId) {
      const ts = payload.timestamp ?? new Date().toISOString().slice(0,19).replace('T',' ');
      if (!sensorDataGrouped[ts]) sensorDataGrouped[ts] = { timestamp: ts };
      ['temperature','humidity','wind','rain','light_intensity'].forEach(k => {
        if (payload[k] !== undefined) sensorDataGrouped[ts][k] = Number(payload[k]);
      });
      if (payload.latitude) sensorDataGrouped[ts].latitude = Number(payload.latitude);
      if (payload.longitude) sensorDataGrouped[ts].longitude = Number(payload.longitude);
      sensorDataList = Object.values(sensorDataGrouped).sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
      const latest = sensorDataList[sensorDataList.length-1];
      showLatestOnCards(latest);
      updateChartWith(sensorDataList);
      activeDeviceIsLive = true;
      deviceStatusText.innerHTML = `<span style="color:#4CAF50;">● LIVE</span>`;
    }
    if (payload.latitude && payload.longitude && payload.id_device) {
      const m = markers[payload.id_device];
      if (m) {
        m.setLatLng([payload.latitude, payload.longitude]);
        m.bindPopup(`<b>Device ${payload.id_device}</b><br>${payload.timestamp}`);
      }
    }
  }

  // =====================================
  // START SCRIPT
  // =====================================
  document.addEventListener('DOMContentLoaded', init);
})();