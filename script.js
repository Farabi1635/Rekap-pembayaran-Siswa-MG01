let dataPembayaran = JSON.parse(localStorage.getItem("pembayaran")) || [];
let chartKelas = null;
let chartJenis = null;
let currentCalendarDate = new Date();

// Fungsi untuk menampilkan notifikasi
function showNotification(message, type = 'success') {
  const notification = document.getElementById('notification');
  notification.textContent = message;
  notification.className = `notification show ${type}`;
  
  setTimeout(() => {
    notification.classList.remove('show');
  }, 3000);
}

// Fungsi untuk menyimpan data ke localStorage
function simpanKeLocal() {
  localStorage.setItem("pembayaran", JSON.stringify(dataPembayaran));
}

// Fungsi untuk menambahkan pembayaran baru
function tambahPembayaran(event) {
  event.preventDefault();
  
  const btnSubmit = event.target.querySelector('button[type="submit"]');
  btnSubmit.disabled = true;
  btnSubmit.innerHTML = '<i class="fas fa-spinner loading"></i> Menyimpan...';
  
  try {
    const nama = document.getElementById("nama").value.trim();
    const kelas = document.getElementById("kelas").value.trim();
    const triwulan = document.getElementById("triwulan").value;
    const jenis = document.getElementById("jenis").value;
    const jumlah = parseInt(document.getElementById("jumlah").value.trim());

    if (!nama || !kelas || !triwulan || !jenis || isNaN(jumlah)) {
      showNotification('Semua field harus diisi dengan benar!', 'danger');
      return;
    }

    if (jumlah < 1000) {
      showNotification('Jumlah pembayaran minimal Rp1.000', 'danger');
      return;
    }

    const sudahAda = dataPembayaran.some(
      (item) => item.nama.toLowerCase() === nama.toLowerCase() && 
                item.kelas.toLowerCase() === kelas.toLowerCase() && 
                item.triwulan === triwulan &&
                item.jenis === jenis
    );

    if (sudahAda) {
      showNotification('Siswa sudah membayar untuk jenis ini di triwulan ini!', 'danger');
      return;
    }

    const pembayaran = { 
      nama, 
      kelas, 
      triwulan, 
      jenis,
      jumlah,
      tanggal: new Date().toISOString()
    };

    dataPembayaran.push(pembayaran);
    simpanKeLocal();
    tampilkanData();
    document.getElementById("formPembayaran").reset();
    
    showNotification('Pembayaran berhasil disimpan!');
    renderCalendar(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth());
  } catch (error) {
    showNotification('Terjadi kesalahan saat menyimpan data', 'danger');
    console.error(error);
  } finally {
    btnSubmit.disabled = false;
    btnSubmit.innerHTML = '<i class="fas fa-save"></i> Simpan Pembayaran';
  }
}

// Fungsi untuk menampilkan semua data dengan filter
function tampilkanData() {
  const tbody = document.querySelector("#tabelData tbody");
  tbody.innerHTML = "";
  
  const filterKelas = document.getElementById("filterKelas").value;
  const filterJenis = document.getElementById("filterJenis").value;
  const searchTerm = document.getElementById("searchNama").value.toLowerCase();
  
  let total = 0;
  let filteredData = dataPembayaran;

  // Apply filters
  if (filterKelas) {
    filteredData = filteredData.filter(item => item.kelas === filterKelas);
  }
  
  if (filterJenis) {
    filteredData = filteredData.filter(item => item.jenis === filterJenis);
  }
  
  if (searchTerm) {
    filteredData = filteredData.filter(item => 
      item.nama.toLowerCase().includes(searchTerm) ||
      new Date(item.tanggal).toLocaleDateString('id-ID').includes(searchTerm)
    );
  }

  if (filteredData.length === 0) {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td colspan="8" style="text-align: center; padding: 20px;">
        <i class="fas fa-info-circle" style="color: #666; margin-right: 5px;"></i>
        Tidak ada data pembayaran yang sesuai dengan filter
      </td>
    `;
    tbody.appendChild(row);
  } else {
    filteredData.forEach((item, index) => {
      total += item.jumlah;
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${index + 1}</td>
        <td>${item.nama}</td>
        <td>${item.kelas}</td>
        <td>Triwulan ${item.triwulan}</td>
        <td>${item.jenis}</td>
        <td>Rp${item.jumlah.toLocaleString('id-ID')}</td>
        <td>${new Date(item.tanggal).toLocaleDateString('id-ID')}</td>
        <td>
          <button class="btn btn-sm btn-success" onclick="cetakBukti('${item.tanggal}')">
            <i class="fas fa-print"></i> Cetak
          </button>
          <button class="btn btn-sm btn-danger" onclick="hapusData('${item.tanggal}')">
            <i class="fas fa-trash-alt"></i> Hapus
          </button>
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  document.getElementById("totalPembayaran").innerText = `Rp${total.toLocaleString('id-ID')}`;
  updateFilterOptions();
  tampilkanRekapKelas();
  tampilkanChartJenis();
}

// Update opsi filter kelas
function updateFilterOptions() {
  const filterKelas = document.getElementById("filterKelas");
  const currentValue = filterKelas.value;
  
  // Dapatkan semua kelas unik
  const kelasList = [...new Set(dataPembayaran.map(item => item.kelas))];
  
  filterKelas.innerHTML = '<option value="">Semua Kelas</option>';
  kelasList.forEach(kelas => {
    const option = document.createElement("option");
    option.value = kelas;
    option.textContent = kelas;
    filterKelas.appendChild(option);
  });
  
  // Pertahankan nilai filter yang dipilih
  if (currentValue && kelasList.includes(currentValue)) {
    filterKelas.value = currentValue;
  }
}

// Fungsi untuk menampilkan rekap per kelas
function tampilkanRekapKelas() {
  const rekap = {};
  
  // Hitung total per kelas
  dataPembayaran.forEach(item => {
    if (!rekap[item.kelas]) {
      rekap[item.kelas] = {
        total: 0,
        siswa: new Set()
      };
    }
    rekap[item.kelas].total += item.jumlah;
    rekap[item.kelas].siswa.add(item.nama);
  });

  // Buat array dari rekap untuk diurutkan
  const rekapArray = Object.entries(rekap).map(([kelas, data]) => ({
    kelas,
    total: data.total,
    jumlahSiswa: data.siswa.size
  }));

  // Urutkan berdasarkan nama kelas
  rekapArray.sort((a, b) => a.kelas.localeCompare(b.kelas));

  // Tampilkan di tabel
  const tbody = document.querySelector("#rekapKelas tbody");
  tbody.innerHTML = rekapArray.map(item => {
    const rataRata = item.jumlahSiswa > 0 ? Math.round(item.total / item.jumlahSiswa) : 0;
    return `
      <tr>
        <td>${item.kelas}</td>
        <td>Rp${item.total.toLocaleString('id-ID')}</td>
        <td>${item.jumlahSiswa} siswa</td>
        <td>Rp${rataRata.toLocaleString('id-ID')}</td>
      </tr>
    `;
  }).join("");

  // Update chart
  tampilkanChartKelas(rekap);
}

// Fungsi untuk menampilkan chart per kelas
function tampilkanChartKelas(dataRekap) {
  const ctx = document.getElementById("chartKelas").getContext("2d");
  
  // Hapus chart lama jika ada
  if (chartKelas) {
    chartKelas.destroy();
  }

  // Sort data by kelas name
  const sortedEntries = Object.entries(dataRekap).sort((a, b) => a[0].localeCompare(b[0]));
  
  const labels = sortedEntries.map(([kelas]) => kelas);
  const data = sortedEntries.map(([, data]) => data.total);
  
  // Buat chart baru
  chartKelas = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Total Pembayaran per Kelas',
        data: data,
        backgroundColor: '#4361ee',
        borderColor: '#3a0ca3',
        borderWidth: 1,
        borderRadius: 4,
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'top',
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              return `Rp${context.raw.toLocaleString('id-ID')}`;
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return 'Rp' + value.toLocaleString('id-ID');
            }
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      }
    }
  });
}

// Fungsi untuk menampilkan chart jenis pembayaran
function tampilkanChartJenis() {
  const ctx = document.getElementById("chartJenis").getContext("2d");
  const jenisData = {};
  
  // Hapus chart lama jika ada
  if (chartJenis) {
    chartJenis.destroy();
  }

  // Hitung total per jenis pembayaran
  dataPembayaran.forEach(item => {
    jenisData[item.jenis] = (jenisData[item.jenis] || 0) + item.jumlah;
  });

  const labels = Object.keys(jenisData);
  const data = Object.values(jenisData);
  const backgroundColors = [
    '#4361ee', '#3a0ca3', '#4895ef', '#4cc9f0', 
    '#f72585', '#b5179e', '#7209b7', '#560bad'
  ];
  
  // Buat chart baru
  chartJenis = new Chart(ctx, {
    type: 'pie',
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: backgroundColors,
        borderWidth: 1
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: 'right',
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              const value = context.raw;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = Math.round((value / total) * 100);
              return `${context.label}: Rp${value.toLocaleString('id-ID')} (${percentage}%)`;
            }
          }
        }
      }
    }
  });
}

// Fungsi untuk mencetak bukti pembayaran
function cetakBukti(tanggal) {
  const index = dataPembayaran.findIndex(item => item.tanggal === tanggal);
  if (index === -1) {
    showNotification('Data tidak ditemukan!', 'danger');
    return;
  }
  
  const data = dataPembayaran[index];
  const printArea = document.getElementById("printArea");
  
  const formattedDate = new Date(data.tanggal).toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  printArea.innerHTML = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #4361ee;">BUKTI PEMBAYARAN SPP</h2>
        <p style="color: #666;">SMP MANGUN JAYA 01</p>
      </div>
      
      <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <table style="width: 100%;">
          <tr>
            <td style="width: 40%; padding: 5px 0;">Nama Siswa</td>
            <td style="width: 60%; padding: 5px 0;"><strong>${data.nama}</strong></td>
          </tr>
          <tr>
            <td style="padding: 5px 0;">Kelas</td>
            <td style="padding: 5px 0;"><strong>${data.kelas}</strong></td>
          </tr>
          <tr>
            <td style="padding: 5px 0;">Triwulan</td>
            <td style="padding: 5px 0;"><strong>Triwulan ${data.triwulan}</strong></td>
          </tr>
          <tr>
            <td style="padding: 5px 0;">Jenis Pembayaran</td>
            <td style="padding: 5px 0;"><strong>${data.jenis}</strong></td>
          </tr>
          <tr>
            <td style="padding: 5px 0;">Jumlah Bayar</td>
            <td style="padding: 5px 0;"><strong>Rp${data.jumlah.toLocaleString('id-ID')}</strong></td>
          </tr>
          <tr>
            <td style="padding: 5px 0;">Tanggal Pembayaran</td>
            <td style="padding: 5px 0;"><strong>${formattedDate}</strong></td>
          </tr>
        </table>
      </div>
      
      <div style="display: flex; justify-content: space-between; margin-top: 50px;">
        <div style="text-align: center;">
          <p style="border-top: 1px solid #333; width: 200px; padding-top: 5px;">
            Orang Tua/Wali
          </p>
        </div>
        <div style="text-align: center;">
          <p style="border-top: 1px solid #333; width: 200px; padding-top: 5px;">
            Petugas
          </p>
        </div>
      </div>
    </div>
  `;
  
  const win = window.open('', '_blank');
  win.document.write(`
    <html>
      <head>
        <title>Bukti Pembayaran - ${data.nama}</title>
        <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 20px; }
          @media print {
            @page { size: auto; margin: 0mm; }
          }
        </style>
      </head>
      <body onload="window.print();">
        ${printArea.innerHTML}
      </body>
    </html>
  `);
  win.document.close();
}

// Fungsi untuk menghapus data
function hapusData(tanggal) {
  const index = dataPembayaran.findIndex(item => item.tanggal === tanggal);
  if (index === -1) {
    showNotification('Data tidak ditemukan!', 'danger');
    return;
  }
  
  if (confirm("Apakah Anda yakin ingin menghapus data ini?")) {
    dataPembayaran.splice(index, 1);
    simpanKeLocal();
    tampilkanData();
    renderCalendar(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth());
    showNotification('Data berhasil dihapus!');
  }
}

// Fungsi untuk export ke Excel
function exportExcel() {
  if (dataPembayaran.length === 0) {
    showNotification('Tidak ada data untuk diexport!', 'danger');
    return;
  }
  
  const data = dataPembayaran.map((item, index) => ({
    No: index + 1,
    Nama: item.nama,
    Kelas: item.kelas,
    Triwulan: `Triwulan ${item.triwulan}`,
    "Jenis Pembayaran": item.jenis,
    "Jumlah Bayar": item.jumlah,
    "Tanggal Pembayaran": new Date(item.tanggal).toLocaleDateString('id-ID')
  }));
  
  // Tambahkan total
  const total = dataPembayaran.reduce((sum, item) => sum + item.jumlah, 0);
  data.push({
    No: '',
    Nama: '',
    Kelas: '',
    Triwulan: 'TOTAL',
    "Jenis Pembayaran": '',
    "Jumlah Bayar": total
  });
  
  // Buat worksheet
  const worksheet = XLSX.utils.json_to_sheet(data);
  
  // Buat workbook
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Pembayaran");
  
  // Export ke Excel
  XLSX.writeFile(workbook, `Rekap_Pembayaran_${new Date().toISOString().slice(0,10)}.xlsx`);
  showNotification('Data berhasil diexport ke Excel!');
}

// Fungsi untuk backup data
function backupData() {
  if (dataPembayaran.length === 0) {
    showNotification('Tidak ada data untuk dibackup!', 'danger');
    return;
  }
  
  const dataStr = JSON.stringify(dataPembayaran, null, 2);
  const blob = new Blob([dataStr], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement("a");
  a.href = url;
  a.download = `backup_pembayaran_${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
  showNotification('Backup data berhasil dibuat!');
}

// Fungsi untuk restore data
function restoreData() {
  const fileInput = document.getElementById("fileRestore");
  const file = fileInput.files[0];
  
  if (!file) {
    showNotification('Pilih file backup terlebih dahulu!', 'danger');
    return;
  }
  
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const json = JSON.parse(e.target.result);
      
      if (!Array.isArray(json)) {
        throw new Error("Format data tidak valid");
      }
      
      if (confirm(`Anda akan mengimpor ${json.length} data pembayaran. Lanjutkan?`)) {
        dataPembayaran = json;
        simpanKeLocal();
        tampilkanData();
        renderCalendar(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth());
        showNotification(`Berhasil mengimpor ${json.length} data pembayaran!`);
      }
    } catch (err) {
      showNotification('Gagal membaca file. Pastikan file backup valid.', 'danger');
      console.error(err);
    }
  };
  
  reader.onerror = function() {
    showNotification('Gagal membaca file.', 'danger');
  };
  
  reader.readAsText(file);
  fileInput.value = ''; // Reset input file
}

// Fungsi untuk menghapus semua data
function clearAllData() {
  if (dataPembayaran.length === 0) {
    showNotification('Tidak ada data untuk dihapus!', 'danger');
    return;
  }
  
  if (confirm('Apakah Anda yakin ingin menghapus SEMUA data pembayaran? Aksi ini tidak dapat dibatalkan!')) {
    dataPembayaran = [];
    simpanKeLocal();
    tampilkanData();
    renderCalendar(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth());
    showNotification('Semua data berhasil dihapus!', 'warning');
  }
}

// ==================== CALENDAR FUNCTIONS ====================
function initCalendar() {
  renderCalendar(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth());
}

function renderCalendar(year, month) {
  const calendarContainer = document.getElementById('calendar');
  if (!calendarContainer) return;
  
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDay = firstDay.getDay();
  
  // Get payments for this month
  const monthPayments = dataPembayaran.filter(payment => {
    const paymentDate = new Date(payment.tanggal);
    return paymentDate.getFullYear() === year && paymentDate.getMonth() === month;
  });
  
  // Group payments by day
  const paymentsByDay = {};
  monthPayments.forEach(payment => {
    const paymentDate = new Date(payment.tanggal);
    const day = paymentDate.getDate();
    if (!paymentsByDay[day]) {
      paymentsByDay[day] = [];
    }
    paymentsByDay[day].push(payment);
  });
  
  // Calculate total per day
  const totalsByDay = {};
  Object.keys(paymentsByDay).forEach(day => {
    totalsByDay[day] = paymentsByDay[day].reduce((sum, payment) => sum + payment.jumlah, 0);
  });
  
  // Get current date
  const currentDate = new Date();
  const isCurrentMonth = currentDate.getFullYear() === year && currentDate.getMonth() === month;
  
  // Render calendar header
  const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
  calendarContainer.innerHTML = `
    <div class="calendar-header">
      <div class="calendar-title">${monthNames[month]} ${year}</div>
      <div class="calendar-nav">
        <button onclick="changeMonth(-1)"><i class="fas fa-chevron-left"></i></button>
        <button onclick="changeMonth(1)"><i class="fas fa-chevron-right"></i></button>
      </div>
    </div>
    <div class="calendar-grid">
      <div class="calendar-day-header">Ming</div>
      <div class="calendar-day-header">Sen</div>
      <div class="calendar-day-header">Sel</div>
      <div class="calendar-day-header">Rab</div>
      <div class="calendar-day-header">Kam</div>
      <div class="calendar-day-header">Jum</div>
      <div class="calendar-day-header">Sab</div>
    </div>
    <div class="calendar-grid" id="calendar-days"></div>
  `;
  
  // Render calendar days
  const calendarDays = document.getElementById('calendar-days');
  let dayCount = 1;
  
  // Empty cells for days before the first day of month
  for (let i = 0; i < startingDay; i++) {
    calendarDays.innerHTML += `<div class="calendar-day empty"></div>`;
  }
  
  // Days of month
  for (let day = 1; day <= daysInMonth; day++) {
    const hasPayment = paymentsByDay[day];
    const isCurrentDay = isCurrentMonth && day === currentDate.getDate();
    const dayOfWeek = new Date(year, month, day).getDay();
    
    // Determine if this is a triwulan start day
    const triwulan = getTriwulanFromDate(new Date(year, month, day));
    const isTriwulanStart = isTriwulanStartDay(day, month, triwulan);
    
    let dayClasses = ['calendar-day'];
    if (isCurrentDay) dayClasses.push('current');
    if (hasPayment) dayClasses.push('has-payment');
    if (isTriwulanStart) dayClasses.push('triwulan-start');
    
    // Tooltip content
    let tooltipContent = '';
    if (hasPayment) {
      tooltipContent = `
        <div class="calendar-tooltip">
          <div class="calendar-tooltip-header">${day} ${monthNames[month]} ${year}</div>
          ${paymentsByDay[day].map(payment => `
            <div class="calendar-tooltip-item">
              <span>${payment.nama} (${payment.jenis})</span>
              <span>Rp${payment.jumlah.toLocaleString('id-ID')}</span>
            </div>
          `).join('')}
          <div class="calendar-tooltip-item calendar-tooltip-total">
            <span>Total:</span>
            <span>Rp${totalsByDay[day].toLocaleString('id-ID')}</span>
          </div>
        </div>
      `;
    }
    
    calendarDays.innerHTML += `
      <div class="${dayClasses.join(' ')}" onclick="showDayPayments(${day}, ${month}, ${year})">
        <div class="calendar-day-number">${day}</div>
        ${hasPayment ? `<div class="calendar-day-payment">Rp${totalsByDay[day].toLocaleString('id-ID')}</div>` : ''}
        ${tooltipContent}
      </div>
    `;
  }
}

function changeMonth(offset) {
  currentCalendarDate = new Date(
    currentCalendarDate.getFullYear(),
    currentCalendarDate.getMonth() + offset,
    1
  );
  renderCalendar(currentCalendarDate.getFullYear(), currentCalendarDate.getMonth());
}

function getTriwulanFromDate(date) {
  const month = date.getMonth() + 1;
  if (month >= 1 && month <= 3) return 1;
  if (month >= 4 && month <= 6) return 2;
  if (month >= 7 && month <= 9) return 3;
  return 4;
}

function isTriwulanStartDay(day, month, triwulan) {
  // Simple implementation - first day of each triwulan month
  if (triwulan === 1 && month === 0 && day === 1) return true; // Jan 1
  if (triwulan === 2 && month === 3 && day === 1) return true; // Apr 1
  if (triwulan === 3 && month === 6 && day === 1) return true; // Jul 1
  if (triwulan === 4 && month === 9 && day === 1) return true; // Oct 1
  return false;
}

function showDayPayments(day, month, year) {
  const date = new Date(year, month, day);
  const dateStr = date.toISOString().split('T')[0];
  const payments = dataPembayaran.filter(p => p.tanggal.includes(dateStr));
  
  if (payments.length > 0) {
    // Filter table to show only this day's payments
    const searchInput = document.getElementById('searchNama');
    searchInput.value = date.toLocaleDateString('id-ID');
    searchInput.dispatchEvent(new Event('input'));
    
    showNotification(`Menampilkan ${payments.length} pembayaran pada ${day}/${month + 1}/${year}`);
  } else {
    showNotification(`Tidak ada pembayaran pada tanggal ini`, 'info');
  }
}

// Inisialisasi aplikasi
document.getElementById("formPembayaran").addEventListener("submit", tambahPembayaran);
document.getElementById("filterKelas").addEventListener("change", tampilkanData);
document.getElementById("filterJenis").addEventListener("change", tampilkanData);
document.getElementById("searchNama").addEventListener("input", tampilkanData);
document.addEventListener("DOMContentLoaded", function() {
  tampilkanData();
  initCalendar();
});