# Laporan Akhir Pembaruan & Fitur Baru MedSign AI (19 Juli 2026)

Laporan ini merangkum seluruh pembaruan, perbaikan bug (*bug fixes*), optimalisasi performa (*performance optimization*), responsivitas desain, integrasi multi-bahasa ASEAN, dan implementasi visual 3D Motion Graphics pada proyek **MedSign AI** (FastAPI + React) dan **MedSign Web** (Next.js).

---

## 1. Optimalisasi Performa & Stabilitas Real-Time
*   **Perbaikan FPS (FPS Boost)**: 
    *   *Masalah*: Frame rate MediaPipe di frontend lambat (4-9 FPS) karena pemrosesan `offscreenCanvas` memicu texture readback yang membebani CPU.
    *   *Solusi*: Mengubah parameter pengiriman ke MediaPipe menggunakan objek video asli (`image: videoElement`) secara langsung di `useMediaPipe.js`. Ini mengaktifkan akselerasi WebGL GPU bawaan browser secara penuh, meningkatkan kecepatan deteksi hingga mencapai batas hardware kamera (**30+ FPS**).
*   **Penyelesaian Reset Timer (Websocket Stabilitas)**:
    *   *Masalah*: Interval pengiriman koordinat 1000ms terus-menerus ter-reset dan tidak pernah terkirim karena state `landmarks` terdaftar di dependency array `useEffect` (state tersebut berubah setiap frame kamera).
    *   *Solusi*: Mengisolasi variabel `isHandDetected` dan `landmarks` ke dalam React **Refs (`useRef`)** di `useWebSocket.js`. Timer interval kini berjalan konstan tanpa interupsi frame.
*   **Konektivitas WebSocket**: Menginstal pustaka `websockets` di venv backend dan mendokumentasikannya di `requirements.txt` untuk mencegah status `404 Not Found` pada rute `/api/v1/stream`.

---

## 2. Pencegahan Spam & Optimalisasi Siklus Deteksi
*   **Duplicate Guard (Pencegah Kata Berulang)**:
    *   *Masalah*: Mempertahankan gerakan tangan (*hold gesture*) memicu prediksi kata yang sama berkali-kali setiap detik (misal: "PUSING PUSING PUSING"), menyepam kotak kalimat dan audio TTS.
    *   *Solusi*: Memasang pengaman `lastAppendedWordRef` di `CameraFeed.jsx`. Kata berurutan yang sama diabaikan dari penumpukan kalimat dan TTS. Sistem guard langsung di-reset begitu tangan diturunkan.
*   **Auto-Clear Preview**:
    *   *Solusi*: Preview hasil terjemahan real-time otomatis dibersihkan kembali ke status awal **`MENUNGGU ISYARAT`** jika tangan diturunkan atau tidak terdeteksi oleh kamera selama lebih dari 1,5 detik.

---

## 3. Integrasi Lokalisasi Multi-Bahasa ASEAN (6 Bahasa)
Dukungan bahasa regional ASEAN telah diintegrasikan penuh ke kedua proyek:
*   **Bahasa yang Didukung**: 
    1.  🇮🇩 **ID** (Bahasa Indonesia - Default)
    2.  🇬🇧 **EN** (English - Global/ASEAN Common)
    3.  🇲🇾 **MS** (Bahasa Melayu - Malaysia/Brunei/Singapura)
    4.  🇹🇭 **TH** (ไทย - Thailand)
    5.  🇻🇳 **VI** (Tiếng Việt - Vietnam)
    6.  🇵🇭 **TL** (Tagalog/Filipino - Filipina)
*   **Alur Kerja**:
    *   **Aplikasi Utama (`medsign-ai`)**: Menambahkan dropdown bahasa di Navbar. Teks UI, tombol ejaan, suara TTS, dan **kata hasil prediksi isyarat klinis secara real-time** otomatis diterjemahkan ke bahasa target yang dipilih.
    *   **Landing Page (`medsign-web`)**: Membuat `LanguageProvider` Context di `lib/LanguageContext.tsx` untuk menerjemahkan navigasi navbar dan teks Hero secara dinamis.

---

## 4. Perancangan UI Responsif & Layout Fleksibel
*   **Navbar Mobile responsif**: 
    *   Mengganti daftar navigasi horizontal yang menumpuk (slide navbar) dengan tombol **Hamburger Menu** (`Menu` / `X` icon) pada layar berukuran seluler.
    *   Menampilkan menu drawer vertikal melayang berisi navigasi lengkap, tombol suara (TTS), dan pemilih bahasa.
*   **Perbaikan Layout Stretched**: Menambahkan class utility `content-start` pada grid pencarian kata target untuk merapatkan tombol-tombol ke atas, menghilangkan sisa ruang vertikal kosong yang melar.
*   **Perbaikan UI Nabrak**: Mengatur tinggi tombol panduan kosakata secara konsisten (`h-[52px]`), menyelaraskan secara vertikal (`justify-center`), dan memperkecil tinggi baris (`leading-tight`).

---

## 5. Visualisasi 3D & Gerakan Kreatif (Motion Graphics)
*   **Skeleton Sendi 3D (MediaPipe)**: Menggunakan nilai koordinat kedalaman `z` untuk menskalakan diameter lingkaran sendi dan ketebalan garis perantara (*bones*) secara dinamis. Menambahkan efek pantulan cahaya (*sphere highlight*) pada sendi tangan.
*   **Efek Hover 3D (perspective-card)**: Menambahkan kelas CSS `.perspective-card` di `index.css`. Kartu metrik landing page dan kartu dataset balance akan condong/miring secara 3D mengikuti kursor mouse saat di-hover.
*   **3D Motion Graphics Visualizer**:
    *   Membuat modul visualisasi baru di navbar (`MotionVisualizer.jsx`).
    *   **Neon Trajectory Trails**: Menggambar lintasan neon menyala pada ujung jari ( After Effects vibe menit 1:22:47 pada YouTube referensi).
    *   **5 Durasi Ekspor**: Pilihan durasi video HAKI: **10 detik, 30 detik, 45 detik, 1 menit, dan 2 menit** dengan simulasi progress bar ekspor MP4 HD (1920x1080).

---

## 6. Pengelolaan Dataset & Training Mandiri
*   **Hapus Masal (Bulk Delete)**:
    *   Menambahkan endpoint `/api/v1/dataset/samples/delete-bulk` di backend.
    *   Menyediakan checkbox di modal **Check Dataset** dan tombol **Hapus Terpilih** untuk menghapus banyak file `.npy` sekaligus.
*   **Pilihan Tipe Model & Auto-Reload**:
    *   Tab **Training Model** kini mendukung pemilihan training *Model Kosakata Klinis (LSTM/GRU)* maupun *Model Ejaan Abjad A-Z & Angka 1-9 (MLP Statis)*.
    *   Model TFLite yang baru dilatih otomatis dimuat oleh backend tanpa harus merestart server.

---
*Laporan akhir revisi dan pengembangan selesai disusun.*
