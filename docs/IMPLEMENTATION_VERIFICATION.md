# IMPLEMENTATION_VERIFICATION

Tanggal verifikasi: 2026-06-11

## Ringkasan Status

Implementasi MedSign MVP sudah dipindahkan ke pipeline 12 label berbasis `labels.json`.

Status saat ini:

| Area | Status |
|---|---|
| Single source label | OK |
| Preprocessing satu pintu | OK |
| Training hanya baca `backend/data/landmarks` | OK |
| Dataset legacy TA Migos/MedSign lama diabaikan untuk MVP | OK |
| Dataset audit | OK, semua label masih missing karena data MVP belum direkam |
| Training model final | Belum bisa dijalankan sampai minimal 30 sample valid per label tersedia |
| Backend import | OK |
| `/health` | OK, jelas melaporkan model belum tersedia |
| `/api/v1/predict` | OK menerima 30 frame x 63 fitur |
| WebSocket buffering | OK, buffering sampai 30 frame |
| Camera check realtime | OK, kamera index 0 terbaca |

## Yang Sudah Dibuat

### Dataset dan Metadata

- `backend/data/raw_videos`
- `backend/data/landmarks`
- `backend/data/metadata`
- `backend/data/metadata/labels.json`
- `backend/data/metadata/README_DATASET.md`
- `backend/models`
- `backend/reports`

`backend/data/metadata/labels.json` berisi kontrak:

```text
frame_count = 30
feature_count = 63
input_shape = (30, 63)
output_class = 12
threshold = 0.50
```

Label MVP:

```text
sakit, nyeri, sesak, batuk, demam, pusing, mual, muntah, ya, tidak, tolong, selesai
```

### Script Pipeline

- `backend/training/capture_landmarks.py`
- `backend/training/validate_dataset.py`
- `backend/training/train_clinical_model.py`
- `backend/training/realtime_inference.py`

Wrapper lama tetap ada:

- `backend/training/collect_data.py`
- `backend/training/train_lstm.py`

Wrapper ini diarahkan ke script MVP baru agar perintah lama tidak putus.

### Backend

- `backend/app/ml/labels.py`
- `backend/app/ml/preprocess.py`
- `backend/app/ml/model.py`
- `backend/app/services/slt_adapter.py`
- `backend/app/routes/predict.py`
- `backend/app/routes/vocabulary.py`
- `backend/app/main.py`

## File yang Berubah

File utama yang dimodifikasi:

- `.gitignore`
- `backend/requirements.txt`
- `backend/app/main.py`
- `backend/app/ml/model.py`
- `backend/app/ml/preprocess.py`
- `backend/app/routes/predict.py`
- `backend/app/routes/vocabulary.py`
- `backend/app/services/slt_adapter.py`
- `backend/training/collect_data.py`
- `backend/training/train_lstm.py`

File baru:

- `backend/app/ml/labels.py`
- `backend/data/metadata/labels.json`
- `backend/data/metadata/README_DATASET.md`
- `backend/training/capture_landmarks.py`
- `backend/training/validate_dataset.py`
- `backend/training/train_clinical_model.py`
- `backend/training/realtime_inference.py`
- `docs/MODEL_DECISION.md`
- `docs/README_REKAM_DATASET.md`
- `docs/README_TRAINING_MODEL.md`
- `docs/README_REALTIME_DEMO.md`
- `docs/IMPLEMENTATION_VERIFICATION.md`

## Single Source Label

`labels.json` dipakai oleh:

| Pipeline | File |
|---|---|
| Capture | `backend/training/capture_landmarks.py` |
| Training | `backend/training/train_clinical_model.py` |
| Realtime inference | `backend/training/realtime_inference.py` |
| Backend prediction | `backend/app/ml/model.py`, `backend/app/services/slt_adapter.py` |
| Vocabulary API | `backend/app/routes/vocabulary.py` |

## Preprocessing Satu Pintu

Preprocessing landmark berada di:

```text
backend/app/ml/preprocess.py
```

Fungsi utama:

- `normalize_landmarks`
- `normalize_sequence`
- `pad_sequence`
- `empty_frame_ratio`

Pipeline capture, training, realtime inference, dan backend prediction memanggil fungsi dari file ini. Tidak ada normalisasi wrist/scale duplikat di script MVP.

## Dataset MVP

Dataset training MVP hanya dibaca dari:

```text
backend/data/landmarks
```

Hasil verifikasi:

```text
backend/data/landmarks berisi 0 file dataset selain .gitkeep
```

Artinya dataset lama tidak ikut training MVP.

## Dataset Audit

Perintah:

```powershell
cd D:\PKM\medsign-ai
backend\venv\Scripts\python.exe backend\training\validate_dataset.py
```

Output:

- `backend/reports/DATASET_HEALTH_REPORT.md`
- `backend/reports/dataset_health_report.json`

Hasil saat ini:

```text
Valid samples: 0
Invalid samples: 0
Semua 12 label: missing
```

Ini benar untuk kondisi sekarang karena dataset MVP belum direkam.

## Training Guard

Perintah uji:

```powershell
backend\venv\Scripts\python.exe backend\training\train_clinical_model.py --epochs 1
```

Hasil:

```text
Training dihentikan. Minimal 30 sample valid per label belum terpenuhi:
sakit, nyeri, sesak, batuk, demam, pusing, mual, muntah, ya, tidak, tolong, selesai
```

Ini sesuai desain. Training final baru akan menghasilkan:

- `backend/models/medsign_mvp_v1.h5`
- `backend/models/medsign_mvp_v1.tflite`
- `backend/reports/classification_report.txt`
- `backend/reports/confusion_matrix.csv`
- `backend/reports/confusion_matrix.png`

setelah dataset 12 label minimal terpenuhi.

## Backend Verification

Perintah test menggunakan FastAPI TestClient berhasil.

### `/health`

Status: OK.

Response saat ini:

```json
{
  "status": "healthy",
  "api_version": "1.0.0",
  "mode": "model_unavailable",
  "model_loaded": false,
  "labels_version": "medsign-clinical-mvp-v1",
  "label_count": 12,
  "threshold": 0.5,
  "frame_count": 30,
  "feature_count": 63,
  "input_shape": [30, 63],
  "output_class": 12,
  "model_path": "D:\\PKM\\medsign-ai\\backend\\models\\medsign_mvp_v1.tflite"
}
```

Setelah `medsign_mvp_v1.tflite` ada dan berhasil dimuat, field akan menjadi:

```text
mode = production
model_loaded = true
```

### `/api/v1/predict`

Payload 30 frame x 63 fitur diterima.

Karena model MVP belum ada, response saat ini:

```json
{
  "prediction": null,
  "label": null,
  "raw_prediction": null,
  "confidence": 0.0,
  "top3": [],
  "status": "not_detected",
  "detected": false,
  "mode": "model_unavailable"
}
```

### WebSocket

Endpoint:

```text
/api/v1/stream
```

Hasil test:

- frame ke-1: `mode = buffering`, `buffered_frames = 1`
- frame ke-29: `mode = buffering`, `buffered_frames = 29`
- frame ke-30: masuk inferensi, response `mode = model_unavailable` karena model MVP belum ada

## Realtime Demo Verification

Perintah camera check:

```powershell
backend\venv\Scripts\python.exe backend\training\realtime_inference.py --camera-check
```

Hasil:

```text
Kamera OK: index=0, frame_shape=(480, 640, 3)
```

Perintah full realtime:

```powershell
backend\venv\Scripts\python.exe backend\training\realtime_inference.py
```

Hasil saat ini:

```text
Model TFLite belum ditemukan: D:\PKM\medsign-ai\backend\models\medsign_mvp_v1.tflite
Latih model dulu dengan: python training/train_clinical_model.py
```

Ini benar karena model final tidak boleh dibuat sebelum dataset MVP valid tersedia.

## Cara Capture Dataset

Contoh satu take:

```powershell
cd D:\PKM\medsign-ai\backend
.\venv\Scripts\activate
python training/capture_landmarks.py --label sakit --signer-id signer_001 --take-id take_001
```

Contoh 10 take:

```powershell
python training/capture_landmarks.py --label sakit --signer-id signer_001 --take-id sesi_001 --num-takes 10
```

Data tersimpan ke:

```text
backend/data/landmarks/<label>/<signer_id>/*.npy
```

## Cara Training

Validasi dataset:

```powershell
python training/validate_dataset.py
```

Training:

```powershell
python training/train_clinical_model.py --architecture gru --epochs 120 --batch-size 16
```

## Cara Run Backend

```powershell
cd D:\PKM\medsign-ai\backend
.\venv\Scripts\activate
python app/main.py
```

Health:

```text
http://localhost:8000/health
```

## Cara Run Realtime Demo

Camera check:

```powershell
python training/realtime_inference.py --camera-check
```

Full demo setelah model ada:

```powershell
python training/realtime_inference.py
```

## Masalah yang Masih Tersisa

1. Dataset MVP belum direkam di `backend/data/landmarks`.
2. Semua 12 label masih `missing` di dataset health report.
3. Model final `medsign_mvp_v1.h5` dan `medsign_mvp_v1.tflite` belum dibuat karena training guard menolak dataset kosong.
4. `/health` belum bisa `production` sampai model TFLite final tersedia.

## Rekomendasi Next Step Sebelum Demo PKM

1. Rekam minimal 30 sample valid per label untuk 12 label MVP.
2. Gunakan minimal 3 signer, lebih baik 5 signer, supaya split berbasis signer bisa aktif.
3. Jalankan `python training/validate_dataset.py`.
4. Pastikan `DATASET_HEALTH_REPORT.md` menunjukkan semua label minimal 30 sample dan empty frame ratio rendah.
5. Jalankan training GRU.
6. Cek classification report dan confusion matrix.
7. Jalankan `/health`; pastikan:

```text
mode = production
model_loaded = true
label_count = 12
input_shape = [30, 63]
```

8. Jalankan realtime demo dan uji 3-5 take live per label.

