# Design Spec: Web UI Data Collection & Training Dashboard
**Tanggal:** 2026-07-08  
**Proyek:** MedSign AI — PKM  
**Status:** Approved  

---

## Ringkasan

Membangun halaman web baru di `http://localhost:5173/data-collection` yang memungkinkan anggota PKM merekam dataset isyarat tangan secara mandiri dari browser, tanpa perlu menjalankan script Python atau didampingi operator teknis. Setiap anggota memiliki folder dataset sendiri berdasarkan nama asli. Data yang terkumpul digunakan untuk melatih model GRU via panel Training.

---

## Cara Run

```powershell
# Terminal 1 — Backend FastAPI
cd D:\PKM\medsign-ai\backend
.\venv\Scripts\activate
uvicorn app.main:app --reload --port 8000

# Terminal 2 — Frontend React
cd D:\PKM\medsign-ai\frontend
npm run dev
```

Setelah kedua terminal berjalan, buka browser:

```
http://localhost:5173/data-collection
```

Anggota PKM lain cukup buka URL tersebut dari laptop yang sama (atau via LAN jika dihosting).

---

## Alur Penggunaan (End-to-End)

```
Anggota buka /data-collection
        │
        ▼
① Pilih Nama Signer
   (albert_william / albert_cheng / glenn / loren / + Tambah baru)
        │
        ▼
② Centang Kata yang Mau Direkam
   (dari 192 kata di labels.json, difilter per kategori)
        │
        ▼
③ Set Jumlah Iterasi per Kata
   (minimum 5, default 5)
        │
        ▼
④ Klik "Mulai Rekam"
   → Webcam aktif via MediaPipe di browser
   → Per kata: countdown 3…2…1 → rekam 30 frame otomatis
   → Kirim landmark ke backend → simpan .npy
   → Lanjut kata berikutnya
        │
        ▼
⑤ Selesai → Ringkasan sesi ditampilkan
   (berapa kata berhasil, berapa iterasi, alert jika ada yang gagal)
```

---

## Struktur Folder Dataset

```
backend/data/landmarks/
  sakit/
    albert_william/
      sakit_albert_william_20260708_001.npy
      sakit_albert_william_20260708_002.npy
      ...
    albert_cheng/
    glenn/
    loren/
  nyeri/
    albert_william/
    ...
```

Nama folder = nama signer asli (lowercase, spasi → underscore).  
Signer baru otomatis muncul saat pertama kali rekam — tidak perlu daftarkan manual.

---

## Halaman 1 — Rekam Dataset (`/data-collection`)

![Mockup Data Collection](../assets/mockup_data_collection.png)

### Komponen

| Komponen | Fungsi |
|---|---|
| Dropdown Signer | Pilih nama dari daftar signer yang sudah ada, atau tambah baru |
| Checklist Kata | Semua 192 kata dari `labels.json`, dikelompokkan per kategori, bisa filter |
| Input Iterasi | Angka iterasi per kata, minimum 5, default 5 |
| Tombol Mulai Rekam | Trigger sesi rekam berurutan untuk semua kata yang dicentang |
| Estimasi Waktu | Hitung otomatis: iterasi × kata × ~4 detik per take |

### Validasi Sebelum Mulai

- Signer wajib dipilih
- Minimal 1 kata dicentang
- Iterasi ≥ 5 (alert merah jika di bawah minimum)

---

## Halaman 2 — Sesi Rekam Live

![Mockup Record Session](../assets/mockup_record_session.png)

### Alur Per Kata

```
Tampil nama kata yang akan direkam
        │
        ▼
Countdown 3… 2… 1… (anggota posisikan tangan)
        │
        ▼
Webcam aktif → MediaPipe ekstrak landmark 30 frame
        │
        ├── Tangan terdeteksi → simpan take
        │
        └── Tangan tidak terdeteksi → alert, ulangi take ini
        │
        ▼
Take selesai → tampil ✓, lanjut take berikutnya
        │
        ▼ (setelah semua iterasi selesai)
Lanjut kata berikutnya otomatis
```

### Panel Kanan: Antrian Kata

Menampilkan daftar semua kata yang akan direkam sesi ini:
- ✓ hijau = sudah selesai semua iterasi
- 🔵 aktif = sedang direkam sekarang
- ⚡ merah = kata emergency (perlu ekstra hati-hati)
- Abu-abu = belum direkam

### Tombol Kontrol

| Tombol | Fungsi |
|---|---|
| ⏹ Batal | Hentikan sesi, data yang sudah tersimpan tetap ada |
| ⏭ Skip Kata Ini | Lewati kata ini, lanjut ke berikutnya |
| 🔁 Ulang Take | Hapus take terakhir, rekam ulang |

---

## Halaman 3 — Balance Checker (`/data-collection/balance`)

![Mockup Balance Checker](../assets/mockup_balance.png)

### Tabel Balance

Menampilkan jumlah sample per kata per signer:

| Kata | albert_william | albert_cheng | glenn | loren | Total | Status |
|---|---|---|---|---|---|---|
| sakit | 5 | 5 | 5 | 5 | 20 | ✅ Cukup |
| nyeri | 5 | 5 | 5 | 0 | 15 | ⚠️ Kurang |
| pusing | 0 | 0 | 0 | 0 | 0 | 🔴 Belum |

### Status Alert

| Status | Kondisi | Warna |
|---|---|---|
| ✅ Cukup | Total ≥ (5 × jumlah signer aktif) | Hijau |
| ⚠️ Kurang | Total > 0 tapi di bawah minimum | Kuning |
| 🔴 Belum | Total = 0 | Merah |

### Summary Cards

- Total Signer aktif
- Total kata yang dilatih
- Sample valid keseluruhan
- Kata yang kurang sample
- Kata yang belum ada data sama sekali

---

## Halaman 4 — Training Model (`/data-collection/training`)

![Mockup Training](../assets/mockup_training.png)

### Konfigurasi Training

| Parameter | Keterangan | Default |
|---|---|---|
| Kata yang dilatih | Pilih subset dari kata yang sudah punya data | Semua yang ≥ 5 sample |
| Jumlah Epoch | Iterasi training (10 / 30 / 50 / 100 atau custom) | 50 |
| Arsitektur | GRU (recommended), LSTM, Transformer | GRU |

### Cara Buat Model

```powershell
# Step 1 — Validasi dataset dulu
cd D:\PKM\medsign-ai
.\backend\venv\Scripts\python.exe .\backend\training\validate_dataset.py --quarantine-invalid

# Step 2 — Training (via UI atau langsung CLI)
.\backend\venv\Scripts\python.exe .\backend\training\train_clinical_model.py `
    --architecture gru `
    --labels sakit nyeri batuk demam ya tidak tolong `
    --epochs 50
```

Via Web UI: klik tombol **🚀 Jalankan Training** — backend menjalankan script di atas dan streaming log ke browser.

### Output Model

```
backend/models/medsign_mvp_v1.h5
backend/models/medsign_mvp_v1.tflite   ← dipakai API produksi
backend/reports/classification_report_medsign_mvp_v1.json
backend/reports/confusion_matrix_medsign_mvp_v1.csv
```

Model `.tflite` langsung diload oleh `ModelLoader` dan aktif di endpoint `/api/v1/stream`.

---

## Arsitektur Teknis

```
Frontend React (/data-collection)
    │
    ├── MediaPipe Hands (browser) → ekstrak 21 landmark × xyz = 63 float
    │
    ├── POST /api/v1/save-sample  → simpan .npy ke backend
    │
    ├── GET  /api/v1/dataset/signers  → daftar signer
    ├── GET  /api/v1/dataset/balance  → tabel jumlah sample
    └── POST /api/v1/dataset/train    → trigger training + streaming log

Backend FastAPI
    ├── data/landmarks/<kata>/<nama_signer>/*.npy
    ├── training/validate_dataset.py
    └── training/train_clinical_model.py --architecture gru --labels ... --epochs ...
```

### API Baru yang Perlu Dibuat

| Method | Path | Fungsi |
|---|---|---|
| GET | `/api/v1/dataset/signers` | List nama signer dari folder yang ada |
| GET | `/api/v1/dataset/balance` | Tabel jumlah .npy per kata per signer |
| POST | `/api/v1/dataset/train` | Jalankan training, stream log via SSE |

API `/api/v1/save-sample` sudah ada dan langsung bisa dipakai.

---

## Kontrak Data (Tidak Boleh Berubah)

| Item | Nilai |
|---|---|
| Frame per sequence | 30 |
| Fitur per frame | 63 (21 landmark × x/y/z) |
| Format file | `.npy` shape `(30, 63)` |
| Naming signer | Nama asli lowercase underscore, contoh: `albert_william` |
| Minimum sample per kata per signer | 5 |
| Minimum total sample per kata (training) | Semua signer aktif × 5 |

---

## To Do List Implementasi

### 🔧 Backend

- [ ] **`GET /api/v1/dataset/signers`** — scan folder `data/landmarks/*/` → return list nama signer unik
- [ ] **`GET /api/v1/dataset/balance`** — hitung `.npy` per kata per signer, tambah status alert
- [ ] **`POST /api/v1/dataset/train`** — terima `{labels, epochs, architecture}`, jalankan `train_clinical_model.py`, stream log via SSE
- [ ] **Update `train_clinical_model.py`** — tambah argumen `--labels` (subset kata) dan `--epochs`
- [ ] **Update `save_sample`** — pastikan signer ID pakai nama asli (sudah bisa, tinggal validasi nama)

### 🎨 Frontend

- [ ] **Halaman `/data-collection`** — layout 3 langkah (pilih signer → pilih kata → set iterasi)
  - [ ] Dropdown signer dengan opsi tambah baru
  - [ ] Checklist kata per kategori dengan filter
  - [ ] Input iterasi dengan validasi min 5
  - [ ] Estimasi waktu otomatis
- [ ] **Komponen `RecordSession`** — sesi rekam live
  - [ ] Tampil webcam + MediaPipe overlay
  - [ ] Countdown 3…2…1 sebelum rekam
  - [ ] Progress bar frame (0–30)
  - [ ] Panel antrian kata (kanan)
  - [ ] Tombol Batal / Skip / Ulang
- [ ] **Halaman `/data-collection/balance`** — tabel balance + summary cards
- [ ] **Halaman `/data-collection/training`** — konfigurasi training + log streaming
- [ ] **Tambah route** di sidebar/navbar yang sudah ada

### 📋 Validasi & QC

- [ ] Alert kuning jika iterasi < 5 saat setup
- [ ] Alert merah di balance jika kata belum punya data
- [ ] Block tombol Training jika ada kata yang total = 0
- [ ] Tampil warning jika tangan tidak terdeteksi > 5 frame berturut-turut

---

## Catatan Penting

- **Jangan ubah `labels.json`** setelah model dilatih — kontrak data beku
- **Signer ID** = nama asli lowercase underscore — konsisten di semua sesi
- **MediaPipe** jalan di browser, tidak perlu install di laptop anggota
- **Training** hanya bisa dijalankan dari laptop kamu (yang ada backend Python + TensorFlow)
- **Dataset Fathur** (200 kata, 2 take/kata) disimpan terpisah — jangan campur ke `data/landmarks`
