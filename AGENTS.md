# MedSign AI — Workspace Instructions

## Tujuan
Sistem translasi bahasa isyarat BISINDO berbasis AI untuk konteks medis.
Stack: FastAPI (backend) + React/Vite (frontend) + MediaPipe + TFLite.

---

## Struktur Direktori
```
backend/
  app/
    main.py              # Entry point FastAPI, port 8000
    ml/
      labels.py          # Label loader
      preprocess.py      # Normalisasi & preprocessing (satu-satunya, jangan duplikat)
      model.py           # TFLite inference
    routes/              # predict, vocabulary, session, data_collection, nlg, tts
    services/
      slt_adapter.py     # Adapter antara MediaPipe → model
  data/
    landmarks/           # Dataset .npy per label/signer
    metadata/
      labels.json        # SINGLE SOURCE OF TRUTH: 12 label MVP, frame_count=30, feature_count=63
  models/                # medsign_mvp_v1.tflite (dibuat setelah training)
  reports/               # DATASET_HEALTH_REPORT.md, confusion matrix
  training/
    capture_landmarks.py
    validate_dataset.py
    train_clinical_model.py
    realtime_inference.py
  venv/                  # Python venv Windows, aktivasi: venv\Scripts\activate

frontend/
  src/
    App.jsx              # State-based routing via view state
    context/AppContext.jsx  # Global state, vocabulary fetch, view management
    pages/               # Home, PatientView, DoctorView, DataCollection, MotionVisualizer, About, UserManual
    components/          # Layout, Navbar, CameraFeed, dll
  vite.config.js         # port: 3001

docs/                    # Dokumentasi Obsidian: REVISI_HARI_INI.md, IMPLEMENTATION_VERIFICATION.md, dll
```

---

## Perintah Penting

### Jalankan (dari root)
```bash
npm run dev              # Frontend + Backend sekaligus via dev.js (concurrently)
npm run dev:backend      # FastAPI saja
npm run dev:frontend     # Vite saja (http://localhost:3001)
```

### Dataset & Training (dari root medsign-ai)
```bash
backend\venv\Scripts\python.exe backend\training\capture_landmarks.py --label sakit --signer-id signer_001 --take-id take_001
backend\venv\Scripts\python.exe backend\training\validate_dataset.py
backend\venv\Scripts\python.exe backend\training\train_clinical_model.py --architecture gru --epochs 120
```

### Frontend
```bash
cd frontend && npm run build   # Production build
cd frontend && npm run lint
```

---

## Arsitektur & Konvensi

### Routing Frontend
- **State-based**, BUKAN URL-based. Tidak ada React Router.
- View dikendalikan oleh `view` state di `App.jsx`.
- Pindah view: panggil `setView('patient')` / `setView('doctor')` / dll.
- URL langsung seperti `/patient` **tidak akan bekerja** — selalu akses lewat `http://localhost:3001/` lalu navigasi via navbar.
- View yang tersedia: `home`, `patient`, `doctor`, `data-collection`, `manual`, `motion`, `about`.

### API Calls
- Base URL diambil dari `localStorage.getItem('medsign_api_url')` → `VITE_API_BASE_URL` → fallback `http://localhost:8000`.
- WebSocket endpoint: `/api/v1/stream`.

### ML Pipeline
- `labels.json` adalah satu-satunya sumber label — jangan hardcode label di kode lain.
- Preprocessing **hanya** di `backend/app/ml/preprocess.py`. Jangan duplikat normalisasi di script lain.
- Training guard: minimal **30 sample valid per label** × 12 label sebelum training bisa jalan.
- Model output: `backend/models/medsign_mvp_v1.tflite`.

### Backend
- Semua route dimount di `app/main.py`.
- Auto-reload model TFLite setelah training selesai (tanpa restart server).
- `/health` → cek `model_loaded` dan `mode` (`production` vs `model_unavailable`).

---

## Gotcha & Hal yang Mudah Terlewat

1. **Vite port 3001**, bukan 5173 (dikonfigurasi eksplisit di `vite.config.js`).
2. **Navigasi langsung via URL tidak bekerja** — state-based routing.
3. **`/api/v1/vocabulary` dipanggil berulang** saat HMR — ini normal, bukan bug loop; semua `useEffect` sudah punya `[]` dependency.
4. **Windows venv path**: gunakan `venv\Scripts\python.exe`, bukan `python` atau `python3`.
5. Training akan ditolak otomatis jika dataset belum memenuhi threshold — cek `DATASET_HEALTH_REPORT.md` dulu.
6. Model TFLite belum ada sampai dataset 12 label terpenuhi dan training dijalankan.

---

## Dokumentasi Penting (Baca Sebelum Mengubah Area Sensitif)

| File | Konten |
|---|---|
| `docs/IMPLEMENTATION_VERIFICATION.md` | Status MVP, pipeline ML, cara run semua komponen |
| `docs/REVISI_HARI_INI.md` | Changelog terbaru (19 Juli 2026) |
| `docs/REVISI_AKHIR_PENGEMBANGAN.md` | Revisi arsitektur besar |
| `backend/data/metadata/README_DATASET.md` | Kontrak dataset & label |
| `backend/reports/DATASET_HEALTH_REPORT.md` | Status dataset saat ini |
| `PROJECT_OVERVIEW.md` | Overview proyek level tinggi |
