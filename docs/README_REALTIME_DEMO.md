# README Realtime Demo MedSign

## Demo Webcam Lokal

Pastikan model sudah ada:

```text
backend/models/medsign_mvp_v1.tflite
```

Jalankan:

```powershell
cd D:\PKM\medsign-ai\backend
.\venv\Scripts\activate
python training/realtime_inference.py
```

Threshold default dibaca dari `backend/data/metadata/labels.json`, yaitu `0.50`.

Ubah threshold sementara:

```powershell
python training/realtime_inference.py --threshold 0.60
```

## Backend FastAPI

Jalankan backend:

```powershell
cd D:\PKM\medsign-ai\backend
.\venv\Scripts\activate
python app/main.py
```

Cek health:

```text
http://localhost:8000/health
```

Jika model belum dilatih, backend tetap hidup tetapi `mode` menjadi `model_unavailable`.

## HTTP Prediction

Endpoint:

```text
POST /api/v1/predict
```

Payload:

```json
{
  "frames": [
    {"values": [0.0, 0.1, 0.0]}
  ]
}
```

Kirim tepat 30 frame, setiap frame berisi 63 nilai.

Response:

```json
{
  "prediction": "sakit",
  "label": "sakit",
  "raw_prediction": "sakit",
  "confidence": 0.82,
  "status": "detected",
  "detected": true,
  "mode": "production"
}
```

Jika confidence di bawah threshold:

```json
{
  "prediction": null,
  "label": null,
  "raw_prediction": "sakit",
  "confidence": 0.42,
  "status": "not_detected",
  "detected": false
}
```

## WebSocket Stream

Endpoint:

```text
ws://localhost:8000/api/v1/stream
```

Backend menerima dua bentuk:

1. Batch 30 frame:

```json
{
  "mode": "clinical",
  "frames": [[0.0, 0.1, 0.0]]
}
```

2. Stream satu frame per message:

```json
{
  "mode": "clinical",
  "landmarks": [0.0, 0.1, 0.0]
}
```

Untuk mode stream, backend menyimpan buffer 30 frame per koneksi dan mengirim `buffering` sampai sequence lengkap.

