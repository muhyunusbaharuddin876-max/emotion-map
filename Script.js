document.addEventListener("DOMContentLoaded", function () {
    // 0. KONFIGURASI FIREBASE
    const firebaseConfig = {
        apiKey: "AIzaSyCgJUfDUlqhmRCrvIdZOx0ZELzPqLxE5So",
        authDomain: "emotionmap1172300.firebaseapp.com",
        databaseURL: "https://emotionmap1172300-default-rtdb.asia-southeast1.firebasedatabase.app",
        projectId: "emotionmap1172300",
        storageBucket: "emotionmap1172300.firebasestorage.app",
        messagingSenderId: "844653226562",
        appId: "1:844653226562:web:77a1c46600d8e1e3929bdb"
    };

    // Inisialisasi Firebase
    firebase.initializeApp(firebaseConfig);
    const database = firebase.database();
    const emotionsRef = database.ref('emotions');

    // 1. INISIALISASI ENGINE SPASIAL PETA
    const map = L.map('map', {
        zoomControl: true 
    }).setView([-7.7956, 110.3695], 13); // Fokus default di Yogyakarta

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    }).addTo(map);

    const markerLayerGroup = L.layerGroup().addTo(map);

    // 2. BASIS DATA AWAL
    let allDataFromFirebase = []; 
    let initialData = [];        

    const DURASI_MASA_AKTIF = 10 * 60 * 1000; 

    // 3. FUNGSI UNTUK MERENDER MARKER EMOJI
    function renderMarkers(dataArray) {
        markerLayerGroup.clearLayers(); 

        dataArray.forEach(item => {
            let color = "#f59e0b"; 
            let emoji = "😐";
            let className = "marker-neutral";

            if (item.emosi === "Positif") {
                color = "#10b981"; 
                emoji = "😊";
                className = "marker-positive";
            } else if (item.emosi === "Negatif") {
                color = "#ef4444"; 
                emoji = "😢";
                className = "marker-negative";
            }

            const customIcon = L.divIcon({
                html: `<div class="custom-emoji-marker ${className}">${emoji}</div>`,
                className: '', 
                iconSize: [32, 32],
                iconAnchor: [16, 16]
            });

            const marker = L.marker([item.lat, item.lng], { icon: customIcon });
            const sisaWaktuMenit = Math.ceil((DURASI_MASA_AKTIF - (Date.now() - item.waktuDibuat)) / 60000);

            marker.bindPopup(`
                <div style="color: #fff; background: #0e1026; font-family: 'Inter', sans-serif; font-size:12px;">
                    <b style="font-size:14px;">${item.nama} ${emoji}</b><br>
                    <span style="color: ${color}; font-weight:bold;">Status: ${item.emosi}</span><br>
                    <p style="margin-top:5px; color:#94a3b8;">${item.desc}</p>
                    <hr style="border-color: #1e2246; margin: 8px 0;">
                    <span style="color: #f59e0b; font-size: 10px;"><i class="fa-solid fa-clock"></i> Aktif ±${sisaWaktuMenit > 0 ? sisaWaktuMenit : 1} mnt lagi</span>
                </div>
            `);

            markerLayerGroup.addLayer(marker);
        });
    }

    // 4. FUNGSI UPDATE STATISTIK DASHBOARD
    function updateDashboardStats(dataArray) {
        const total = dataArray.length;
        
        if (total === 0) {
            document.querySelectorAll('.card-value, .sentiment-labels span:last-child').forEach(el => el.innerText = "0%");
            document.getElementById('idx-total').innerText = "0";
            document.querySelectorAll('.progress').forEach(bar => bar.style.width = "0%");
            return;
        }

        const positifCount = dataArray.filter(d => d.emosi === "Positif").length;
        const negatifCount = dataArray.filter(d => d.emosi === "Negatif").length;
        const netralCount = dataArray.filter(d => d.emosi === "Netral").length;

        const pctPositif = Math.round((positifCount / total) * 100) || 0;
        const pctNegatif = Math.round((negatifCount / total) * 100) || 0;
        const pctNetral = Math.round((netralCount / total) * 100) || 0;

        // Proteksi elemen agar tidak error di halaman yang tidak memiliki widget ini
        const elPctPositif = document.getElementById('pct-positif');
        if(elPctPositif) elPctPositif.innerText = `${pctPositif}%`;
        
        const elPctNegatif = document.getElementById('pct-negatif');
        if(elPctNegatif) elPctNegatif.innerText = `${pctNegatif}%`;
        
        const elPctNeutral = document.getElementById('pct-neutral');
        if(elPctNeutral) elPctNeutral.innerText = `${pctNetral}%`;

        const elBarPositif = document.getElementById('bar-positif');
        if(elBarPositif) elBarPositif.style.width = `${pctPositif}%`;
        
        const elBarNegatif = document.getElementById('bar-negatif');
        if(elBarNegatif) elBarNegatif.style.width = `${pctNegatif}%`;
        
        const elBarNetral = document.getElementById('bar-netral');
        if(elBarNetral) elBarNetral.style.width = `${pctNetral}%`;

        const elIdxEmotional = document.getElementById('idx-emotional');
        if(elIdxEmotional) elIdxEmotional.innerText = `${pctPositif}%`;
        
        const elIdxTotal = document.getElementById('idx-total');
        if(elIdxTotal) elIdxTotal.innerText = total;
        
        const elIdxStress = document.getElementById('idx-stress');
        if(elIdxStress) elIdxStress.innerText = `${pctNegatif}%`;
        
        const elIdxNeutral = document.getElementById('idx-neutral');
        if(elIdxNeutral) elIdxNeutral.innerText = `${pctNetral}%`;
    }

    // 4.5. FUNGSI FILTER & REFRESH TAMPILAN
    function refreshDisplay() {
        const waktuSekarang = Date.now();
        initialData = allDataFromFirebase.filter(item => {
            return (waktuSekarang - item.waktuDibuat) < DURASI_MASA_AKTIF;
        });

        renderMarkers(initialData);
        updateDashboardStats(initialData);
    }

    // 4.6. LISTENER REAL-TIME FIREBASE
    emotionsRef.on('value', (snapshot) => {
        const data = snapshot.val();
        allDataFromFirebase = [];
        if (data) {
            Object.keys(data).forEach(key => {
                allDataFromFirebase.push(data[key]);
            });
        }
        refreshDisplay();
    }, (error) => {
        console.error("Firebase Error:", error);
    });

    // ⏳ BACKGROUND JOB PEMBERSIH
    setInterval(function() {
        refreshDisplay();
    }, 5000);

    // 5. GEOLOCATION GPS SENSOR
    const btnGps = document.getElementById('btn-gps');
    const gpsStatus = document.getElementById('gps-status');
    const inputLat = document.getElementById('input-lat');
    const inputLng = document.getElementById('input-lng');

    if (btnGps) {
        btnGps.addEventListener('click', function() {
            if (!navigator.geolocation) {
                gpsStatus.innerText = "❌ Browser tidak mendukung sensor GPS.";
                gpsStatus.style.color = "#ef4444";
                return;
            }

            gpsStatus.innerText = "⏳ Menghubungkan ke GPS...";
            gpsStatus.style.color = "#f59e0b";

            navigator.geolocation.getCurrentPosition(
                function(position) {
                    const currentLat = position.coords.latitude;
                    const currentLng = position.coords.longitude;
                    inputLat.value = currentLat.toFixed(6);
                    inputLng.value = currentLng.toFixed(6);
                    gpsStatus.innerText = "🔒 GPS Berhasil Terkunci! ✔";
                    gpsStatus.style.color = "#10b981";
                    map.setView([currentLat, currentLng], 15);
                },
                function(error) {
                    gpsStatus.style.color = "#ef4444";
                    gpsStatus.innerText = "❌ Gagal mengunci koordinat GPS.";
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        });
    }

    // 6. EVENT LISTENER FORM SUBMIT
    const form = document.getElementById('emotion-form');
    if (form) {
        form.addEventListener('submit', function (e) {
            e.preventDefault(); 

            const nama = document.getElementById('input-nama').value;
            const emosi = document.getElementById('input-emosi').value;
            const lat = parseFloat(inputLat.value);
            const lng = parseFloat(inputLng.value);
            const desc = document.getElementById('input-desc').value;

            if (isNaN(lat) || isNaN(lng)) {
                alert("Harap kunci lokasi Anda terlebih dahulu menggunakan GPS!");
                return;
            }

            const newDataItem = { 
                nama, 
                emosi, 
                lat, 
                lng, 
                desc, 
                waktuDibuat: Date.now()
            };
            
            emotionsRef.push(newDataItem)
                .then(() => console.log("Data berhasil terkirim"))
                .catch((err) => {
                    alert("Gagal mengirim data: " + err.message);
                });

            map.setView([lat, lng], 14);

            form.reset();
            gpsStatus.innerText = "Lokasi belum terdeteksi";
            gpsStatus.style.color = "#64748b";
        });
    }

    // 7. LOGIKA FITUR SEARCH LOCATION (YOGYAKARTA & SLEMAN)
    const searchInput = document.querySelector('.search-box input');
    
    const locationDatabase = {
        "malioboro": { lat: -7.7926, lng: 110.3658, zoom: 16, name: "Kawasan Malioboro" },
        "tugu": { lat: -7.7829, lng: 110.3671, zoom: 16, name: "Tugu Yogyakarta" },
        "kaliurang": { lat: -7.5962, lng: 110.4246, zoom: 14, name: "Kaliurang, Sleman" },
        "alkid": { lat: -7.8119, lng: 110.3632, zoom: 16, name: "Alun-Alun Kidul" },
        "kraton": { lat: -7.8053, lng: 110.3642, zoom: 16, name: "Keraton Yogyakarta" },
        "ugm": { lat: -7.7714, lng: 110.3775, zoom: 15, name: "Universitas Gadjah Mada" },
        "stasiun tugu": { lat: -7.7892, lng: 110.3631, zoom: 16, name: "Stasiun Yogyakarta (Tugu)" },
        "sleman": { lat: -7.7163, lng: 110.3556, zoom: 13, name: "Pusat Kabupaten Sleman" },
        "jogja": { lat: -7.7956, lng: 110.3695, zoom: 13, name: "Kota Yogyakarta" }
    };

    if (searchInput) {
        searchInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault(); // Mencegah reload halaman tidak sengaja
                const query = this.value.toLowerCase().trim();
                if (query === "") return;

                let found = false;

                for (let key in locationDatabase) {
                    if (query.includes(key) || key.includes(query)) {
                        const loc = locationDatabase[key];
                        
                        map.flyTo([loc.lat, loc.lng], loc.zoom, {
                            animate: true,
                            duration: 1.5
                        });

                        L.popup()
                            .setLatLng([loc.lat, loc.lng])
                            .setContent(`<b>${loc.name}</b><br>Menampilkan visualisasi emosi wilayah.`)
                            .openOn(map);

                        found = true;
                        break;
                    }
                }

                if (!found) {
                    alert("Lokasi tidak ditemukan! Coba kata kunci lain seperti: Malioboro, Tugu, Kaliurang, Alkid, UGM, atau Sleman.");
                }
            }
        });
    }

    // ==========================================
    // LOGIKA INTERAKSI TOMBOL HEADER
    // ==========================================

    // 1. Tombol Export Report
    const btnExport = document.querySelector('.btn-primary, [style*="purple"]'); 
    // Catatan: jika tombol export punya id tersendiri (misal id="btn-export"), ganti dengan document.getElementById('btn-export')
    if (btnExport && btnExport.innerText.includes("Export")) {
        btnExport.addEventListener('click', () => {
            alert("🔒 Fitur Premium: Mengunduh laporan emosional kota dalam format PDF/XLSX...");
        });
    }

    // 2. Tombol Notifikasi (Ikon Lonceng)
    const btnNotif = document.querySelector('.fa-bell')?.parentElement || document.querySelector('[style*="bell"]');
    if (btnNotif) {
        btnNotif.addEventListener('click', () => {
            alert("🔔 Notifikasi Terbaru:\n- Wilayah Sleman mengalami penurunan indeks emosi emosional (10 menit lalu).\n- Sistem pembersihan otomatis berjalan normal.");
        });
    }

    // 3. Tombol Mode Gelap / Terang (Ikon Bulan)
    const btnTheme = document.querySelector('.fa-moon')?.parentElement;
    if (btnTheme) {
        btnTheme.addEventListener('click', () => {
            alert("🌓 Fitur tema adaptif mendeteksi setelan default sistem Anda adalah mode Gelap (Dark Mode).");
        });
    }

    // 4. Tombol Profile (Admin / User di pojok kanan)
    const btnProfile = document.querySelector('.admin-profile, [style*="Admin"]');
    if (btnProfile) {
        btnProfile.style.cursor = "pointer";
        btnProfile.addEventListener('click', () => {
            // Mengarahkan user langsung ke halaman pengaturan profil jika diklik
            window.location.href = "settings.html";
        });
    }
    
});