// KONFIGURASI URL GOOGLE APPS SCRIPT
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycby93YPFe_-tsvSiKJb9IAT5ICjrU4NMcXXjZMEuI5cZZrNYGfPBMQaoqRPgL6Z1vGz-/exec";

let latitude = null;
let longitude = null;
let accuracy = null;
let stream = null;
let isCameraActive = false;
let isLocationReady = false;

const video = document.getElementById('videoElement');
const canvas = document.getElementById('canvasElement');
const cameraPlaceholder = document.getElementById('cameraPlaceholder');
const btnSubmit = document.getElementById('btnSubmit');
const locationStatus = document.getElementById('locationStatus');
const cameraStatus = document.getElementById('cameraStatus');
const btnText = document.getElementById('btnText');
const loadingSpinner = document.getElementById('loadingSpinner');
const resultMessage = document.getElementById('resultMessage');

// Memeriksa status form
function checkFormStatus() {
    const nip = document.getElementById('nip').value.trim();
    const nama = document.getElementById('nama').value.trim();
    const kelompok = document.getElementById('kelompok').value.trim();
    const lokasi_pcm = document.getElementById('lokasi_pcm').value.trim();

    if (isCameraActive && isLocationReady && nama !== "" && nip !== "" && kelompok !== "" && lokasi_pcm !== "") {
        btnSubmit.disabled = false;
    } else {
        btnSubmit.disabled = true;
    }
}

// Event listener untuk input
document.getElementById('nama').addEventListener('input', checkFormStatus);
document.getElementById('nip').addEventListener('input', checkFormStatus);
document.getElementById('kelompok').addEventListener('input', checkFormStatus);
document.getElementById('lokasi_pcm').addEventListener('input', checkFormStatus);
document.getElementById('status').addEventListener('change', checkFormStatus);

// Menampilkan / Menyembunyikan isian Kelas berdasarkan Peran
document.getElementById('peran').addEventListener('change', function() {
    const kelasGroup = document.getElementById('kelasGroup');
    if (this.value === 'Mahasiswa') {
        kelasGroup.style.display = 'block';
    } else {
        kelasGroup.style.display = 'none';
    }
    checkFormStatus();
});

// Mengaktifkan Kamera
async function startCamera() {
    try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
        video.srcObject = stream;
        video.style.display = 'block';
        cameraPlaceholder.style.display = 'none';
        
        isCameraActive = true;
        cameraStatus.innerHTML = "📸 Kamera: Aktif";
        cameraStatus.className = "status-badge status-success";
        
        document.getElementById('btnStartCamera').style.display = 'none';
        checkFormStatus();
    } catch (err) {
        console.error("Error accessing camera: ", err);
        cameraStatus.innerHTML = "📸 Kamera: Akses ditolak atau tidak ditemukan!";
        cameraStatus.className = "status-badge status-error";
        alert("Gagal mengakses kamera. Pastikan Anda memberikan izin.");
    }
}

// Mendapatkan Lokasi
function getLocation() {
    locationStatus.innerHTML = "📍 Lokasi: Mencari lokasi...";
    
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                latitude = position.coords.latitude;
                longitude = position.coords.longitude;
                accuracy = position.coords.accuracy;
                
                isLocationReady = true;
                locationStatus.innerHTML = `📍 Lokasi: Akurasi ${Math.round(accuracy)}m`;
                locationStatus.className = "status-badge status-success";
                
                document.getElementById('btnGetLocation').style.display = 'none';
                checkFormStatus();
            },
            (error) => {
                console.error("Error getting location: ", error);
                locationStatus.innerHTML = "📍 Lokasi: Gagal mendapatkan lokasi!";
                alert("Gagal mendapatkan lokasi. Pastikan GPS aktif dan izin diberikan.");
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    } else {
        alert("Geolocation tidak didukung oleh browser Anda.");
    }
}

// Mengirim Data
async function submitAbsen() {
    btnSubmit.disabled = true;
    btnText.style.display = 'none';
    loadingSpinner.style.display = 'block';
    resultMessage.style.display = 'none';

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const base64Photo = canvas.toDataURL('image/jpeg', 0.7);
    
    const peran = document.getElementById('peran').value;
    // Jika peran Mahasiswa, ambil isi kelas. Jika Dosen, kirimkan teks strip "-"
    const kelas = (peran === 'Mahasiswa') ? document.getElementById('kelas').value : '-';
    
    const nip = document.getElementById('nip').value.trim();
    const nama = document.getElementById('nama').value.trim();
    const kelompok = document.getElementById('kelompok').value.trim();
    const lokasi_pcm = document.getElementById('lokasi_pcm').value.trim();
    const status = document.getElementById('status').value;

    const payload = {
        peran: peran,
        kelas: kelas,
        nip: nip,
        nama: nama,
        kelompok: kelompok,
        lokasi_pcm: lokasi_pcm,
        status: status,
        latitude: latitude,
        longitude: longitude,
        accuracy: accuracy,
        foto: base64Photo
    };

    try {
        const response = await fetch(GOOGLE_SCRIPT_URL, {
            method: 'POST',
            body: JSON.stringify(payload)
        });
        
        const result = await response.json();
        
        if (result.success) {
            showResult(result.message || "Absensi berhasil disimpan!", "success");
            // Reset form sebagian agar mudah jika hp dipakai bareng
            document.getElementById('nama').value = "";
            checkFormStatus();
        } else {
            showResult("Gagal: " + (result.message || "Unknown Error"), "error");
        }
    } catch (error) {
        console.error("Error submitting:", error);
        showResult("Terjadi kesalahan jaringan atau CORS.", "error");
    } finally {
        btnText.style.display = 'block';
        loadingSpinner.style.display = 'none';
        checkFormStatus();
    }
}

function showResult(message, type) {
    resultMessage.innerHTML = message;
    resultMessage.className = `result-message result-${type}`;
    resultMessage.style.display = 'block';
}
