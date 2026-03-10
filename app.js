/* app.js – Realtime Monitoring dengan Daily Average & Sensor Status dari DB
   ✅ FINAL FIX - Correct Data Processing & Average Calculation
*/

(() => {
  // CONFIG
  const MQTT_URL = 'wss://broker.emqx.io:8084/mqtt';
  const DEFAULT_DEVICE_ID = 1;
  const DEFAULT_LAT = 2.42283;
  const DEFAULT_LON = 99.0946;

  // Ambil device ID dari URL parameter
  const urlParams = new URLSearchParams(window.location.search);
  const urlDeviceId = urlParams.get('device');
  
  console.log('🔍 URL Parameter "device":', urlDeviceId);

  // STATE
  let devices = [];
  let activeDeviceId = urlDeviceId ? parseInt(urlDeviceId) : DEFAULT_DEVICE_ID;
  let activeDevice = null;
  let activeDeviceIsLive = false;
  let sensorDataGrouped = {};
  let sensorDataList = [];
  
  // ⭐ NEW: Store RAW data (tidak di-group)
  let rawSensorData = [];
  
  // ⭐ SENSOR DISPLAY STATE (dari database)
  let sensorDisplayState = {
    temperature: true,
    humidity: true,
    wind: true,
    rain: true,
    light_intensity: true
  };

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
  const todayAvgContent = document.getElementById('todayAvgContent');

  // MAP INIT
  let map = L.map('map').setView([DEFAULT_LAT, DEFAULT_LON], 12);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);
  let markers = {};
  let activeMarker = null;
  
  // Mobile Map Optimization
  if (window.innerWidth <= 768) {
    map.scrollWheelZoom.disable();
    map.tap.enable();
    
    // Enable zoom on click
    map.on('click', function() {
      setTimeout(() => {
        map.scrollWheelZoom.enable();
      }, 300);
    });
    
    // Disable on map out
    map.on('dragstart', function() {
      map.scrollWheelZoom.disable();
    });
  }

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
    console.log('✅ MQTT connected');
    client.subscribe('iot/weather');
    client.subscribe('device/+/data');
  });
  client.on('error', err => console.error('❌ MQTT error:', err));
  client.on('message', (topic, message) => {
    try {
      const payload = JSON.parse(message.toString());
      handleMQTTMessage(topic, payload);
    } catch(e) {
      console.warn('⚠️ MQTT parse error:', e);
    }
  });

  // CHART INIT
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
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: { 
        legend: { 
          display: window.innerWidth > 768,
          position: 'top',
          labels: {
            boxWidth: 12,
            font: {
              size: window.innerWidth <= 768 ? 10 : 12
            }
          }
        },
        tooltip: {
          enabled: true,
          mode: 'index',
          intersect: false,
        }
      },
      scales: {
        x: { display: true },
        y: { beginAtZero: true }
      }
    }
  };
  const sensorChart = new Chart(ctx, chartConfig);

  // INIT
  function init() {
    currentDay.innerText = new Date().toLocaleDateString('id-ID', {
      weekday:'long', day:'numeric', month:'long', year:'numeric'
    });
    loadDevices();
    setInterval(renderAverageDisplay, 60000);
  }

  // LOAD DEVICES
  async function loadDevices(){
    try {
      const res = await fetch('get_devices.php');
      if (!res.ok) throw new Error('Server error: ' + res.status);
      
      const data = await res.json();
      if (!data || data.length === 0) throw new Error('Tidak ada data perangkat');
      
      devices = data;
      console.log('✅ Devices loaded:', devices);
      
      Object.values(markers).forEach(m => map.removeLayer(m));
      markers = {};
      
      devices.forEach(dev => {
        const lat = parseFloat(dev.latitude);
        const lon = parseFloat(dev.longitude);
        
        if (isNaN(lat) || isNaN(lon)) return;
        
        const m = L.marker([lat, lon]).addTo(map);
        m.bindPopup(`<b>${dev.nama_device}</b><br>Lat: ${lat}<br>Lng: ${lon}`);
        m.on('click', () => selectDevice(dev));
        markers[dev.id_device] = m;
      });

      if (activeDeviceId && devices.find(d => d.id_device == activeDeviceId)) {
        const targetDevice = devices.find(d => d.id_device == activeDeviceId);
        selectDevice(targetDevice);
      } else if (devices.length > 0) {
        selectDevice(devices[0]);
      }
      
    } catch(e) {
      console.error('❌ Gagal load devices:', e);
      devices = [{ id_device: DEFAULT_DEVICE_ID, nama_device: 'Marom', latitude: DEFAULT_LAT, longitude: DEFAULT_LON, interval_data: 60 }];
      const m = L.marker([DEFAULT_LAT, DEFAULT_LON]).addTo(map);
      m.on('click', () => selectDevice(devices[0]));
      markers[DEFAULT_DEVICE_ID] = m;
      selectDevice(devices[0]);
    }
  }

  // SELECT DEVICE
  async function selectDevice(dev) {
    console.log('🔌 Selecting device:', dev.id_device);
    activeDeviceId = dev.id_device;
    activeDevice = dev;
    
    if (activeMarker) activeMarker.setIcon(new L.Icon.Default());
    
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
    await loadSensorStatusFromDB(dev.id_device);
    await loadLastDataForDevice(dev.id_device, true);
    map.setView([parseFloat(dev.latitude), parseFloat(dev.longitude)], 13);
  }

  // ⭐ LOAD SENSOR STATUS FROM DATABASE
  async function loadSensorStatusFromDB(id_device) {
    try {
      console.log(`📥 Loading sensor status for device ${id_device}...`);
      const res = await fetch(`get_sensor_display_status.php?id_device=${id_device}`);
      const data = await res.json();
      
      if (data.success) {
        sensorDisplayState = {
          temperature: data.data.is_temperature_active === 1,
          humidity: data.data.is_humidity_active === 1,
          wind: data.data.is_wind_active === 1,
          rain: data.data.is_rain_active === 1,
          light_intensity: data.data.is_light_active === 1
        };
        
        console.log('✅ Sensor status loaded:', sensorDisplayState);
        updateCardVisibility();
        updateChartVisibility();
      }
    } catch (e) {
      console.error('❌ Error loading sensor status:', e);
      sensorDisplayState = { temperature: true, humidity: true, wind: true, rain: true, light_intensity: true };
    }
  }

  // UPDATE LOCATION INFO
  function updateLocationInfo(dev) {
    const lat = parseFloat(dev.latitude).toFixed(5);
    const lon = parseFloat(dev.longitude).toFixed(5);
    locationInfo.innerHTML = `<strong>${dev.nama_device}</strong><br><small>Lat: ${lat}, Lng: ${lon}</small>`;
  }

  // ✅ FIXED: LOAD LAST DATA - Store RAW data untuk average calculation
  async function loadLastDataForDevice(id_device, enableMonitoringIfLive){
    try {
      console.log(`📊 Loading data for device ${id_device}...`);
      
      // ✅ Ambil semua data (no limit)
      const res = await fetch(`get_sensor_data.php?id_device=${id_device}`);
      if (!res.ok) throw new Error('Fetch failed');
      
      const rows = await res.json();
      
      console.log('📥 Raw data received:', rows.length, 'rows');
      console.log('📥 First 5 rows:', rows.slice(0, 5));
      
      if (!rows || rows.length === 0) {
        showLatestOnCards(null);
        sensorChart.data.labels = [];
        sensorChart.data.datasets.forEach(ds => ds.data = []);
        sensorChart.update();
        deviceStatusText.innerHTML = '<span style="color:#FF9800;">● OFFLINE</span>';
        intervalInfo.innerText = `Interval: ${activeDevice?.interval_data ?? '-'} detik`;
        renderAverageDisplay();
        return;
      }
      
      // ✅ Store RAW data (for average calculation)
      rawSensorData = rows;
      
      // ✅ Group data (for chart)
      groupRowsIntoSensorObjects(rows);
      
      console.log('📊 Grouped data:', sensorDataList.length, 'timestamps');
      
      if (sensorDataList.length > 0) {
        const latest = sensorDataList[sensorDataList.length - 1];
        showLatestOnCards(latest);
        
        // ✅ Untuk chart, ambil 50 data terakhir saja (untuk performa)
        const chartData = sensorDataList.slice(-50);
        updateChartWith(chartData);
      }

      const dev = devices.find(d => d.id_device == id_device);
      if (dev) intervalInfo.innerText = `Interval: ${dev.interval_data ?? '-'} detik`;

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
      
      // ✅ Render rata-rata LANGSUNG
      renderAverageDisplay();
      
    } catch(e) {
      console.error('❌ Error:', e);
      deviceStatusText.innerHTML = `<span style="color:#F44336;">● ERROR</span>`;
    }
  }

  // GROUP DATA
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

  // SHOW LATEST ON CARDS
  function showLatestOnCards(obj){
    tempEl.innerText = (obj?.temperature !== undefined && obj?.temperature !== null ? obj.temperature.toFixed(2) : '-') + ' °C';
    humidityEl.innerText = (obj?.humidity !== undefined && obj?.humidity !== null ? obj.humidity.toFixed(2) : '-') + ' %';
    windEl.innerText = (obj?.wind !== undefined && obj?.wind !== null ? obj.wind.toFixed(2) : '-') + ' m/s';
    rainEl.innerText = (obj?.rain !== undefined && obj?.rain !== null ? obj.rain.toFixed(2) : '-') + ' mm';
    lightEl.innerText = (obj?.light_intensity !== undefined && obj?.light_intensity !== null ? obj.light_intensity.toFixed(2) : '-') + ' lux';
  }

  // UPDATE CHART
  function updateChartWith(list){
    list.sort((a,b) => new Date(a.timestamp) - new Date(b.timestamp));
    const labels = list.map(x => {
      const d = new Date(x.timestamp);
      return d.toLocaleTimeString('id-ID', {hour:'2-digit', minute:'2-digit'});
    });
    sensorChart.data.labels = labels;
    
    sensorChart.data.datasets.forEach(ds => {
      const key = ds.sensor;
      ds.data = list.map(it => (it[key] === undefined ? null : it[key]));
    });
    
    updateChartVisibility();
    sensorChart.update();
  }

  // ⭐ UPDATE CARD VISIBILITY
  function updateCardVisibility() {
    const cardMap = {
      temperature: document.getElementById('temp')?.closest('.card'),
      humidity: document.getElementById('humidity')?.closest('.card'),
      wind: document.getElementById('wind')?.closest('.card'),
      rain: document.getElementById('rain')?.closest('.card'),
      light_intensity: document.getElementById('light')?.closest('.card')
    };
    
    for (const [sensor, card] of Object.entries(cardMap)) {
      if (card) {
        card.style.display = sensorDisplayState[sensor] ? 'flex' : 'none';
      }
    }
  }

  // ⭐ UPDATE CHART VISIBILITY
  function updateChartVisibility() {
    sensorChart.data.datasets.forEach(dataset => {
      const sensorName = dataset.sensor;
      dataset.hidden = !sensorDisplayState[sensorName];
    });
    sensorChart.update();
  }

  // ✅ FIXED: RENDER AVERAGE DISPLAY - Menggunakan RAW data
  function renderAverageDisplay() {
    if (!todayAvgContent) return;
    
    console.log('📊 === RENDER AVERAGE (RAW DATA) ===');
    console.log('📊 Total RAW data:', rawSensorData.length);
    
    if (rawSensorData.length === 0) {
      todayAvgContent.innerHTML = '<div style="text-align: center; color: #999; padding: 20px;"><p>⏳ Tidak ada data</p></div>';
      return;
    }
    
    const layout = determinateAverageLayout();
    console.log('📊 Layout selected:', layout);
    
    let avgData = null;
    let layoutTitle = '';
    
    if (layout === 'LAYOUT_2') {
      avgData = calculateTodayAverage();
      layoutTitle = '📊 Rata-rata Data Hari Ini';
    } else {
      avgData = calculateLastDataAverage();
      layoutTitle = '📊 Rata-rata Data Terakhir';
    }
    
    console.log('📊 Average data calculated:', avgData);
    
    if (!avgData) {
      todayAvgContent.innerHTML = '<div style="text-align: center; color: #999; padding: 20px;"><p>⏳ Tidak ada data untuk perhitungan rata-rata</p></div>';
      return;
    }
    
    const statsHTML = `
      <div style="margin-bottom: 15px;">
        <h4 style="color: #2a5298; margin: 0 0 10px 0;">${layoutTitle}</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 15px; font-size: 0.9em;">
          <div><span style="color: #666;">📅 Tanggal:</span> <strong>${avgData.dateFormatted}</strong></div>
          <div><span style="color: #666;">📊 Data Points:</span> <strong>${avgData.dataPoints}</strong></div>
          <div><span style="color: #666;">🕐 Waktu:</span> <strong>${avgData.timeRange}</strong></div>
        </div>
      </div>
      
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;">
        ${Object.keys(avgData.stats).map(sensor => {
          // ⭐ SKIP sensor yang tidak aktif
          if (!sensorDisplayState[sensor]) return '';
          
          const icons = { temperature: '🌡️', humidity: '💧', wind: '💨', rain: '🌧️', light_intensity: '☀️' };
          const colors = { temperature: '#ff6b6b', humidity: '#4facfe', wind: '#26c281', rain: '#667eea', light_intensity: '#fdcb6e' };
          const units = { temperature: '°C', humidity: '%', wind: ' m/s', rain: ' mm', light_intensity: ' lux' };
          const labels = { temperature: 'Suhu', humidity: 'Kelembapan', wind: 'Angin', rain: 'Hujan', light_intensity: 'Cahaya' };
          
          const stat = avgData.stats[sensor];
          
          return `
            <div style="background: ${colors[sensor]}20; padding: 12px; border-radius: 8px; border-left: 4px solid ${colors[sensor]};">
              <div style="font-weight: 600; color: #333; font-size: 0.85em; margin-bottom: 8px;">${icons[sensor]} ${labels[sensor]}</div>
              <div style="font-size: 1.3em; color: ${colors[sensor]}; font-weight: bold; margin-bottom: 5px;">
                ${stat.avg}${units[sensor]}
              </div>
              <div style="font-size: 0.75em; color: #666;">
                Min: ${stat.min}${units[sensor]}<br>
                Max: ${stat.max}${units[sensor]}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    
    todayAvgContent.innerHTML = statsHTML;
  }

  // ✅ DETERMINE LAYOUT - Cek tanggal data terakhir
  function determinateAverageLayout() {
    if (rawSensorData.length === 0) return 'empty';
    
    const today = new Date().toISOString().split('T')[0];
    
    // ✅ Ambil tanggal dari data terakhir (yang paling baru)
    const sortedByDate = [...rawSensorData].sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    const lastDataTimestamp = sortedByDate[0].timestamp;
    const lastDataDate = lastDataTimestamp.split(' ')[0];
    
    console.log('📅 Today:', today);
    console.log('📅 Last Data Timestamp:', lastDataTimestamp);
    console.log('📅 Last Data Date:', lastDataDate);
    console.log('📅 Match:', lastDataDate === today ? 'YES (LAYOUT_2)' : 'NO (LAYOUT_1)');
    
    return (lastDataDate === today) ? 'LAYOUT_2' : 'LAYOUT_1';
  }

  // ✅ CALCULATE TODAY AVERAGE - Dari RAW data
  function calculateTodayAverage() {
    const today = new Date().toISOString().split('T')[0];
    
    // Filter data hari ini
    const todayData = rawSensorData.filter(row => {
      const rowDate = row.timestamp.split(' ')[0];
      return rowDate === today;
    });
    
    console.log('📊 Today average - date:', today);
    console.log('📊 Today data count:', todayData.length);
    
    if (todayData.length === 0) return null;
    
    return calculateStatsFromRawData(todayData, today);
  }

  // ✅ CALCULATE LAST DATA AVERAGE - Dari RAW data
  function calculateLastDataAverage() {
    if (rawSensorData.length === 0) return null;
    
    // Sort by timestamp DESC
    const sortedByDate = [...rawSensorData].sort((a, b) => 
      new Date(b.timestamp) - new Date(a.timestamp)
    );
    
    // Ambil tanggal terakhir
    const lastDataDate = sortedByDate[0].timestamp.split(' ')[0];
    
    // Filter semua data di tanggal tersebut
    const lastDateData = rawSensorData.filter(row => {
      const rowDate = row.timestamp.split(' ')[0];
      return rowDate === lastDataDate;
    });
    
    console.log('📊 Last data average - date:', lastDataDate);
    console.log('📊 Last data count:', lastDateData.length);
    
    return calculateStatsFromRawData(lastDateData, lastDataDate);
  }

  // ✅ NEW: CALCULATE STATS FROM RAW DATA (tidak grouped)
  function calculateStatsFromRawData(dataRows, dateStr) {
    console.log('📊 === CALCULATE STATS FROM RAW ===');
    console.log('📊 Date:', dateStr);
    console.log('📊 Total rows:', dataRows.length);
    
    // Group by sensor
    const sensorValues = {
      temperature: [],
      humidity: [],
      wind: [],
      rain: [],
      light_intensity: []
    };
    
    dataRows.forEach(row => {
      const sensorName = SENSOR_ID_TO_NAME[row.id_sensor];
      if (sensorName && sensorValues[sensorName]) {
        sensorValues[sensorName].push(parseFloat(row.value));
      }
    });
    
    // Calculate stats
    const stats = {};
    for (const sensor in sensorValues) {
      const values = sensorValues[sensor];
      
      console.log(`📊 ${sensor}:`, values.length, 'values');
      
      if (values.length > 0) {
        const sum = values.reduce((a, b) => a + b, 0);
        const avg = sum / values.length;
        
        stats[sensor] = {
          avg: avg.toFixed(2),
          min: Math.min(...values).toFixed(2),
          max: Math.max(...values).toFixed(2),
          count: values.length
        };
        
        console.log(`   → Avg: ${stats[sensor].avg}, Min: ${stats[sensor].min}, Max: ${stats[sensor].max}`);
      } else {
        stats[sensor] = {
          avg: '0.00',
          min: '0.00',
          max: '0.00',
          count: 0
        };
      }
    }
    
    // Get time range
    const sortedByTime = [...dataRows].sort((a, b) => 
      new Date(a.timestamp) - new Date(b.timestamp)
    );
    
    const firstTime = sortedByTime[0].timestamp.split(' ')[1].substring(0, 5);
    const lastTime = sortedByTime[sortedByTime.length - 1].timestamp.split(' ')[1].substring(0, 5);
    
    // Format tanggal
    const dateObj = new Date(dateStr + 'T00:00:00');
    const dateFormatted = dateObj.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
    
    const result = {
      date: dateStr,
      dateFormatted: dateFormatted,
      dataPoints: dataRows.length,
      timeRange: `${firstTime} - ${lastTime}`,
      stats: stats
    };
    
    console.log('📊 Result:', result);
    
    return result;
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
      
      const chartData = sensorDataList.slice(-50);
      updateChartWith(chartData);
      
      // ✅ Reload data untuk update average
      loadLastDataForDevice(activeDeviceId, false);
      
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

  // EXPOSE FUNCTIONS
  window.loadDeviceData = function(deviceId) {
    const dev = devices.find(d => d.id_device == deviceId);
    if (dev) selectDevice(dev);
  };

// Window Resize Handler
  let resizeTimer;
  window.addEventListener('resize', function() {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function() {
      // Update chart legend based on screen size
      sensorChart.options.plugins.legend.display = window.innerWidth > 768;
      sensorChart.options.plugins.legend.labels.font.size = window.innerWidth <= 768 ? 10 : 12;
      sensorChart.update();
      
      // Invalidate map size
      if (map) {
        map.invalidateSize();
      }
    }, 250);
  });

  // START
  document.addEventListener('DOMContentLoaded', init);
})();