/* history.js - Data History & Download with Horizontal Format */

(() => {
  // STATE
  let devices = [];
  let allData = [];
  let groupedData = []; // Data yang sudah di-group per timestamp
  let currentPage = 1;
  let rowsPerPage = 50;
  
  // SENSOR MAP
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
  
  // DOM ELEMENTS
  const deviceSelect = document.getElementById('deviceSelect');
  const dateFrom = document.getElementById('dateFrom');
  const dateTo = document.getElementById('dateTo');
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
  const intervalSelect = document.getElementById('intervalSelect');
  const setIntervalBtn = document.getElementById('setIntervalBtn');
  
  // CHARTS - 5 SEPARATE CHARTS
  let charts = {};
  
  function initCharts() {
    const chartConfig = {
      type: 'line',
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { display: true },
          y: { beginAtZero: true }
        }
      }
    };
    
    charts.temp = new Chart(document.getElementById('chartTemp').getContext('2d'), {
      ...chartConfig,
      data: { labels: [], datasets: [{ data: [], borderColor: '#ff6b6b', backgroundColor: 'rgba(255,107,107,0.1)', tension: 0.3 }] }
    });
    
    charts.humid = new Chart(document.getElementById('chartHumid').getContext('2d'), {
      ...chartConfig,
      data: { labels: [], datasets: [{ data: [], borderColor: '#4facfe', backgroundColor: 'rgba(79,172,254,0.1)', tension: 0.3 }] }
    });
    
    charts.wind = new Chart(document.getElementById('chartWind').getContext('2d'), {
      ...chartConfig,
      data: { labels: [], datasets: [{ data: [], borderColor: '#a8edea', backgroundColor: 'rgba(168,237,234,0.1)', tension: 0.3 }] }
    });
    
    charts.rain = new Chart(document.getElementById('chartRain').getContext('2d'), {
      ...chartConfig,
      data: { labels: [], datasets: [{ data: [], borderColor: '#667eea', backgroundColor: 'rgba(102,126,234,0.1)', tension: 0.3 }] }
    });
    
    charts.light = new Chart(document.getElementById('chartLight').getContext('2d'), {
      ...chartConfig,
      data: { labels: [], datasets: [{ data: [], borderColor: '#ffeaa7', backgroundColor: 'rgba(255,234,167,0.1)', tension: 0.3 }] }
    });
  }
  
  // =====================================================================
  // INIT
  // =====================================================================
  function init() {
    // Set default dates (7 hari terakhir)
    const today = new Date();
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    dateTo.value = today.toISOString().split('T')[0];
    dateFrom.value = weekAgo.toISOString().split('T')[0];
    
    // Init charts
    initCharts();
    
    // Load devices
    loadDevices();
    // Di dalam function init(), tambahkan setelah loadDevices():
function init() {
  currentDay.innerText = new Date().toLocaleDateString('id-ID', {
    weekday:'long', day:'numeric', month:'long', year:'numeric'
  });

  loadDevices();
  
  // ✅ AUTO CALCULATE DAILY AVERAGE setelah device loaded
  setTimeout(() => {
    if (activeDeviceId) {
      calculateTodayAverage();
    }
  }, 2000);
  
  // Refresh button
  const refreshBtn = document.getElementById('refreshAvg');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', calculateTodayAverage);
  }
  
  // Auto refresh setiap 5 menit
  setInterval(() => {
    if (activeDeviceId) {
      calculateTodayAverage();
    }
  }, 300000); // 5 menit
}

// Fungsi calculate today average (sudah ada, pastikan ada)
async function calculateTodayAverage() {
  const today = new Date().toISOString().split('T')[0];
  const id_device = activeDeviceId;
  
  if (!id_device) {
    document.getElementById('todayAvgContent').innerHTML = `
      <p style="text-align: center; color: #666; padding: 20px;">
        Tidak ada device aktif
      </p>
    `;
    return;
  }
  
  try {
    const res = await fetch(`get_sensor_data.php?id_device=${id_device}&date=${today}`);
    if (!res.ok) throw new Error('Failed to fetch today data');
    
    const rows = await res.json();
    
    if (!rows || rows.length === 0) {
      document.getElementById('todayAvgContent').innerHTML = `
        <p style="text-align: center; color: #666; padding: 20px;">
          ❌ Belum ada data untuk hari ini
        </p>
      `;
      return;
    }
    
    // Group by sensor
    const grouped = {};
    rows.forEach(r => {
      const sensorName = SENSOR_ID_TO_NAME[r.id_sensor] || `sensor_${r.id_sensor}`;
      if (!grouped[sensorName]) {
        grouped[sensorName] = { values: [], sum: 0, count: 0 };
      }
      const val = parseFloat(r.value);
      grouped[sensorName].values.push(val);
      grouped[sensorName].sum += val;
      grouped[sensorName].count++;
    });
    
    // Build HTML
    let html = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px;">
    `;
    
    const labels = {
      temperature: { icon: '🌡️', label: 'Suhu', unit: '°C', color: '#ff6b6b' },
      humidity: { icon: '💧', label: 'Kelembapan', unit: '%', color: '#4facfe' },
      wind: { icon: '💨', label: 'Angin', unit: 'm/s', color: '#a8edea' },
      rain: { icon: '🌧️', label: 'Hujan', unit: 'mm', color: '#667eea' },
      light_intensity: { icon: '☀️', label: 'Cahaya', unit: 'lux', color: '#ffeaa7' }
    };
    
    for (const sensor in grouped) {
      const data = grouped[sensor];
      const avg = (data.sum / data.count).toFixed(2);
      const info = labels[sensor] || { icon: '📊', label: sensor, unit: '', color: '#999' };
      
      html += `
        <div style="background: linear-gradient(135deg, ${info.color}20 0%, ${info.color}40 100%); padding: 15px; border-radius: 10px; text-align: center; border-left: 4px solid ${info.color};">
          <div style="font-size: 2em; margin-bottom: 5px;">${info.icon}</div>
          <div style="color: #666; font-size: 0.9em; font-weight: 600;">${info.label}</div>
          <div style="color: #2a5298; font-size: 1.5em; font-weight: bold; margin: 5px 0;">${avg}</div>
          <div style="color: #999; font-size: 0.75em;">${info.unit}</div>
          <div style="color: #999; font-size: 0.75em; margin-top: 3px;">${data.count} data</div>
        </div>
      `;
    }
    
    html += `</div>`;
    html += `<div style="text-align: center; margin-top: 15px; color: #999; font-size: 0.85em;">Terakhir update: ${new Date().toLocaleTimeString('id-ID')}</div>`;
    
    document.getElementById('todayAvgContent').innerHTML = html;
    
  } catch (e) {
    console.error('Error calculating today average:', e);
    document.getElementById('todayAvgContent').innerHTML = `
      <p style="text-align: center; color: #f44336; padding: 20px;">
        ❌ Gagal menghitung rata-rata
      </p>
    `;
  }
}
    // Event listeners
    filterBtn.addEventListener('click', fetchData);
    resetBtn.addEventListener('click', resetFilters);
    exportCSV.addEventListener('click', downloadCSV);
    exportExcel.addEventListener('click', downloadExcel);
    prevPage.addEventListener('click', () => changePage(-1));
    nextPage.addEventListener('click', () => changePage(1));
    setIntervalBtn.addEventListener('click', setDeviceInterval);
  }
  
  // =====================================================================
  // LOAD DEVICES
  // =====================================================================
  async function loadDevices() {
    try {
      const res = await fetch('get_devices.php');
      
      if (!res.ok) {
        throw new Error(`HTTP Error: ${res.status}`);
      }
      
      const data = await res.json();
      
      console.log('✅ Devices loaded:', data);
      
      if (!data || data.length === 0) {
        deviceSelect.innerHTML = '<option value="">⚠️ Tidak ada device di database</option>';
        alert('⚠️ Tidak ada device di database!\n\nSilakan tambahkan device terlebih dahulu di menu Management.');
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
      
      // Auto select first device
      if (devices.length > 0) {
        deviceSelect.value = devices[0].id_device;
      }
    } catch (e) {
      console.error('❌ Error loading devices:', e);
      deviceSelect.innerHTML = `<option value="">❌ Error: ${e.message}</option>`;
      alert(`❌ Gagal memuat devices!\n\nDetail: ${e.message}`);
    }
  }
  
  // =====================================================================
  // FETCH DATA
  // =====================================================================
  async function fetchData() {
    const id_device = deviceSelect.value;
    const from = dateFrom.value;
    const to = dateTo.value;
    
    if (!id_device) {
      alert('Pilih device terlebih dahulu!');
      return;
    }
    
    if (!from || !to) {
      alert('Pilih tanggal dari dan sampai!');
      return;
    }
    
    showLoading(true);
    
    try {
      // Build URL - TANPA LIMIT, ambil semua data
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
      
      // Process data
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
      
      // Group data by timestamp (horizontal format)
      groupDataByTimestamp();
      
      // Update UI
      updateStats();
      updateCharts();
      updateTable();
      
      statsContainer.style.display = 'block';
      chartsSection.style.display = 'grid';
      
      showLoading(false);
      
    } catch (e) {
      console.error('Error fetching data:', e);
      alert('Gagal memuat data. Cek console untuk detail.');
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
  // UPDATE STATS - PER SENSOR
  // =====================================================================
  function updateStats() {
    const stats = {
      temperature: { values: [], sum: 0, count: 0 },
      humidity: { values: [], sum: 0, count: 0 },
      wind: { values: [], sum: 0, count: 0 },
      rain: { values: [], sum: 0, count: 0 },
      light_intensity: { values: [], sum: 0, count: 0 }
    };
    
    // Collect values per sensor
    allData.forEach(row => {
      const sensor = row.sensor_name;
      if (stats[sensor]) {
        stats[sensor].values.push(row.value);
        stats[sensor].sum += row.value;
        stats[sensor].count++;
      }
    });
    
    // Update UI for each sensor
    for (const sensor in stats) {
      const data = stats[sensor];
      if (data.count > 0) {
        const avg = (data.sum / data.count).toFixed(2);
        const max = Math.max(...data.values).toFixed(2);
        const min = Math.min(...data.values).toFixed(2);
        
        // Update based on sensor type
        if (sensor === 'temperature') {
          document.getElementById('statTempMax').textContent = max + ' °C';
          document.getElementById('statTempMin').textContent = min + ' °C';
          document.getElementById('statTempAvg').textContent = avg + ' °C';
        } else if (sensor === 'humidity') {
          document.getElementById('statHumidMax').textContent = max + ' %';
          document.getElementById('statHumidMin').textContent = min + ' %';
          document.getElementById('statHumidAvg').textContent = avg + ' %';
        } else if (sensor === 'wind') {
          document.getElementById('statWindMax').textContent = max + ' m/s';
          document.getElementById('statWindMin').textContent = min + ' m/s';
          document.getElementById('statWindAvg').textContent = avg + ' m/s';
        } else if (sensor === 'rain') {
          document.getElementById('statRainMax').textContent = max + ' mm';
          document.getElementById('statRainMin').textContent = min + ' mm';
          document.getElementById('statRainAvg').textContent = avg + ' mm';
        } else if (sensor === 'light_intensity') {
          document.getElementById('statLightMax').textContent = max + ' lux';
          document.getElementById('statLightMin').textContent = min + ' lux';
          document.getElementById('statLightAvg').textContent = avg + ' lux';
        }
      }
    }
  }
  
  // =====================================================================
  // UPDATE CHARTS - 5 SEPARATE CHARTS
  // =====================================================================
  function updateCharts() {
    // Prepare data per sensor
    const chartData = {
      temperature: { labels: [], values: [] },
      humidity: { labels: [], values: [] },
      wind: { labels: [], values: [] },
      rain: { labels: [], values: [] },
      light_intensity: { labels: [], values: [] }
    };
    
    // Sort by timestamp ascending for charts
    const sortedData = [...groupedData].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    
    sortedData.forEach(row => {
      const label = new Date(row.timestamp).toLocaleString('id-ID', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
      
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
    
    // Update each chart
    charts.temp.data.labels = chartData.temperature.labels;
    charts.temp.data.datasets[0].data = chartData.temperature.values;
    charts.temp.update();
    
    charts.humid.data.labels = chartData.humidity.labels;
    charts.humid.data.datasets[0].data = chartData.humidity.values;
    charts.humid.update();
    
    charts.wind.data.labels = chartData.wind.labels;
    charts.wind.data.datasets[0].data = chartData.wind.values;
    charts.wind.update();
    
    charts.rain.data.labels = chartData.rain.labels;
    charts.rain.data.datasets[0].data = chartData.rain.values;
    charts.rain.update();
    
    charts.light.data.labels = chartData.light_intensity.labels;
    charts.light.data.datasets[0].data = chartData.light_intensity.values;
    charts.light.update();
  }
  
  // =====================================================================
  // UPDATE TABLE - HORIZONTAL FORMAT
  // =====================================================================
  function updateTable() {
    if (groupedData.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 40px; color: #999;">Tidak ada data</td></tr>';
      tableInfo.textContent = 'Tidak ada data.';
      pagination.style.display = 'none';
      return;
    }
    
    // Pagination
    const totalPages = Math.ceil(groupedData.length / rowsPerPage);
    const startIdx = (currentPage - 1) * rowsPerPage;
    const endIdx = startIdx + rowsPerPage;
    const pageData = groupedData.slice(startIdx, endIdx);
    
    // Update table
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
    
    // Update info
    tableInfo.textContent = `Menampilkan ${startIdx + 1}-${Math.min(endIdx, groupedData.length)} dari ${groupedData.length} data`;
    
    // Update pagination
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
  // EXPORT CSV - HORIZONTAL FORMAT WITH AVERAGE
  // =====================================================================
  function downloadCSV() {
    if (groupedData.length === 0) {
      alert('Tidak ada data untuk di-export!');
      return;
    }
    
    // Header CSV
    let csv = 'No,Timestamp,Device,Temperature,Humidity,Wind,Rain,Light_Intensity,Latitude,Longitude\n';
    
    // Calculate statistics
    const stats = {
      temperature: { values: [], sum: 0, count: 0 },
      humidity: { values: [], sum: 0, count: 0 },
      wind: { values: [], sum: 0, count: 0 },
      rain: { values: [], sum: 0, count: 0 },
      light_intensity: { values: [], sum: 0, count: 0 }
    };
    
    // Data rows
    groupedData.forEach((row, idx) => {
      csv += `${idx + 1},"${row.timestamp}","${row.device}",${row.temperature || ''},${row.humidity || ''},${row.wind || ''},${row.rain || ''},${row.light_intensity || ''},${row.latitude || ''},${row.longitude || ''}\n`;
      
      // Collect for stats
      if (row.temperature !== null) {
        stats.temperature.values.push(row.temperature);
        stats.temperature.sum += row.temperature;
        stats.temperature.count++;
      }
      if (row.humidity !== null) {
        stats.humidity.values.push(row.humidity);
        stats.humidity.sum += row.humidity;
        stats.humidity.count++;
      }
      if (row.wind !== null) {
        stats.wind.values.push(row.wind);
        stats.wind.sum += row.wind;
        stats.wind.count++;
      }
      if (row.rain !== null) {
        stats.rain.values.push(row.rain);
        stats.rain.sum += row.rain;
        stats.rain.count++;
      }
      if (row.light_intensity !== null) {
        stats.light_intensity.values.push(row.light_intensity);
        stats.light_intensity.sum += row.light_intensity;
        stats.light_intensity.count++;
      }
    });
    
    // Add statistics summary
    csv += '\n';
    csv += 'RINGKASAN STATISTIK\n';
    csv += 'Sensor,Rata-rata,Min,Max,Total Data\n';
    
    for (const sensor in stats) {
      const data = stats[sensor];
      if (data.count > 0) {
        const avg = (data.sum / data.count).toFixed(2);
        const min = Math.min(...data.values).toFixed(2);
        const max = Math.max(...data.values).toFixed(2);
        
        const sensorLabel = sensor === 'temperature' ? 'Suhu (°C)' :
                           sensor === 'humidity' ? 'Kelembapan (%)' :
                           sensor === 'wind' ? 'Angin (m/s)' :
                           sensor === 'rain' ? 'Hujan (mm)' :
                           'Cahaya (lux)';
        
        csv += `"${sensorLabel}",${avg},${min},${max},${data.count}\n`;
      }
    }
    
    // Add metadata
    csv += '\n';
    csv += `Periode Data: ${dateFrom.value} s/d ${dateTo.value}\n`;
    csv += `Tanggal Export: ${new Date().toLocaleString('id-ID')}\n`;
    csv += `Total Rows: ${groupedData.length}\n`;
    
    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `sensor_data_${dateFrom.value}_${dateTo.value}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    // Show summary
    let summary = '✅ Data berhasil di-export!\n\n📊 Ringkasan:\n';
    summary += `Total Data: ${groupedData.length} rows\n\n`;
    for (const sensor in stats) {
      if (stats[sensor].count > 0) {
        const avg = (stats[sensor].sum / stats[sensor].count).toFixed(2);
        const sensorLabel = sensor === 'temperature' ? 'Suhu' :
                           sensor === 'humidity' ? 'Kelembapan' :
                           sensor === 'wind' ? 'Angin' :
                           sensor === 'rain' ? 'Hujan' : 'Cahaya';
        summary += `${sensorLabel}: ${avg}\n`;
      }
    }
    alert(summary);
  }
  
  // =====================================================================
  // EXPORT EXCEL - HORIZONTAL FORMAT WITH AVERAGE
  // =====================================================================
  function downloadExcel() {
    if (groupedData.length === 0) {
      alert('Tidak ada data untuk di-export!');
      return;
    }
    
    // Prepare main data
    const excelData = groupedData.map((row, idx) => ({
      'No': idx + 1,
      'Timestamp': row.timestamp,
      'Device': row.device,
      'Temperature': row.temperature !== null ? row.temperature : '',
      'Humidity': row.humidity !== null ? row.humidity : '',
      'Wind': row.wind !== null ? row.wind : '',
      'Rain': row.rain !== null ? row.rain : '',
      'Light_Intensity': row.light_intensity !== null ? row.light_intensity : '',
      'Latitude': row.latitude !== null ? row.latitude : '',
      'Longitude': row.longitude !== null ? row.longitude : ''
    }));
    
    // Calculate statistics
    const stats = {
      temperature: { values: [], sum: 0, count: 0 },
      humidity: { values: [], sum: 0, count: 0 },
      wind: { values: [], sum: 0, count: 0 },
      rain: { values: [], sum: 0, count: 0 },
      light_intensity: { values: [], sum: 0, count: 0 }
    };
    
    groupedData.forEach(row => {
      if (row.temperature !== null) {
        stats.temperature.values.push(row.temperature);
        stats.temperature.sum += row.temperature;
        stats.temperature.count++;
      }
      if (row.humidity !== null) {
        stats.humidity.values.push(row.humidity);
        stats.humidity.sum += row.humidity;
        stats.humidity.count++;
      }
      if (row.wind !== null) {
        stats.wind.values.push(row.wind);
        stats.wind.sum += row.wind;
        stats.wind.count++;
      }
      if (row.rain !== null) {
        stats.rain.values.push(row.rain);
        stats.rain.sum += row.rain;
        stats.rain.count++;
      }
      if (row.light_intensity !== null) {
        stats.light_intensity.values.push(row.light_intensity);
        stats.light_intensity.sum += row.light_intensity;
        stats.light_intensity.count++;
      }
    });
    
    // Prepare statistics data
    const statsData = [];
    for (const sensor in stats) {
      const data = stats[sensor];
      if (data.count > 0) {
        const avg = (data.sum / data.count).toFixed(2);
        const min = Math.min(...data.values).toFixed(2);
        const max = Math.max(...data.values).toFixed(2);
        
        const sensorLabel = sensor === 'temperature' ? 'Suhu (°C)' :
                           sensor === 'humidity' ? 'Kelembapan (%)' :
                           sensor === 'wind' ? 'Angin (m/s)' :
                           sensor === 'rain' ? 'Hujan (mm)' :
                           'Cahaya (lux)';
        
        statsData.push({
          'Sensor': sensorLabel,
          'Rata-rata': avg,
          'Min': min,
          'Max': max,
          'Total Data': data.count
        });
      }
    }
    
    // Create workbook with 2 sheets
    const wb = XLSX.utils.book_new();
    
    // Sheet 1: Data
    const ws1 = XLSX.utils.json_to_sheet(excelData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Data Sensor');
    
    // Sheet 2: Statistik
    const ws2 = XLSX.utils.json_to_sheet(statsData);
    
    // Add info rows
    XLSX.utils.sheet_add_aoa(ws2, [
      [],
      ['Periode Data:', `${dateFrom.value} s/d ${dateTo.value}`],
      ['Tanggal Export:', new Date().toLocaleString('id-ID')],
      ['Total Rows:', groupedData.length]
    ], { origin: -1 });
    
    XLSX.utils.book_append_sheet(wb, ws2, 'Statistik');
    
    // Download
    XLSX.writeFile(wb, `sensor_data_${dateFrom.value}_${dateTo.value}.xlsx`);
    
    alert(`✅ Data berhasil di-export!\n\n📊 File memiliki 2 sheet:\n- Sheet 1: Data Sensor (${excelData.length} rows)\n- Sheet 2: Statistik & Rata-rata`);
  }
  
  // =====================================================================
  // SET DEVICE INTERVAL
  // =====================================================================
  function setDeviceInterval() {
    const id_device = deviceSelect.value;
    const interval = parseInt(intervalSelect.value);
    
    if (!id_device) {
      alert('⚠️ Pilih device terlebih dahulu!');
      return;
    }
    
    if (!interval) {
      alert('⚠️ Pilih interval yang valid!');
      return;
    }
    
    showLoading(true);
    
    // Send to server
    fetch(`save_interval.php?id_device=${id_device}&interval=${interval}`)
      .then(r => r.json())
      .then(result => {
        console.log('✅ save_interval response', result);
        showLoading(false);
        
        if (result.success) {
          alert(`✅ ${result.message}`);
          
          // Update devices array
          const dev = devices.find(d => d.id_device == id_device);
          if (dev) {
            dev.interval_data = interval;
          }
        } else {
          alert(`❌ ${result.message}`);
        }
      })
      .catch(err => {
        console.error('❌ Error setting interval:', err);
        showLoading(false);
        alert('❌ Gagal mengatur interval. Cek koneksi atau server.');
      });
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
  // LOADING
  // =====================================================================
  function showLoading(show) {
    loadingOverlay.style.display = show ? 'flex' : 'none';
  }
  
  // =====================================================================
  // START
  // =====================================================================
  document.addEventListener('DOMContentLoaded', init);
})();