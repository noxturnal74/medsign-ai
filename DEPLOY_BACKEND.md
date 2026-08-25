# Panduan Deploy Backend (agar frontend Vercel bisa konek)

Frontend (React/Vite) sudah live di Vercel. Backend **FastAPI + SQLite + TFLite + WebSocket**
**tidak bisa** di-host di Vercel (serverless = tanpa file persisten, WebSocket mati, tidak bisa
subprocess training). Gunakan salah satu opsi di bawah, lalu sambungkan ke Vercel lewat env.

---

## Opsi A — Railway (paling gampang, disarankan) 💡

1. Buka [railway.com](https://railway.com) → login dengan GitHub → **New Project** → **Deploy from GitHub repo** → pilih `noxturnal74/medsign-ai`.
2. Railway akan mendeteksi `backend/Dockerfile`? Belum — set **Root Directory = `backend`** di Service → Settings, maka Dockerfile dipakai otomatis.
3. Tunggu build (~5-10 menit pertama, image TensorFlow besar).
4. Buat **public domain**: Service → Settings → Networking → **Generate Domain** → catat URL, mis. `https://medsign-api-production.up.railway.app`.
5. Tambahkan **Variables** (Service → Variables):
   ```
   MEDSIGN_JWT_SECRET=<string-acak-panjang>
   MEDSIGN_ENCRYPTION_KEY=<string-acak-panjang-lain>
   MEDSIGN_CORS_ORIGINS=https://medsign-ai.vercel.app,http://localhost:3001
   ```
6. Test: buka `https://<domain-railway>/health` → harus `{"status":"ok","model_loaded":true,...}`.

> Catatan: SQLite di Railway akan di-reset tiap redeploy kecuali kamu pasang **Volume**
> (Service → Volumes → mount ke `/app/data`). Untuk demo tanpa volume cukup — data seed
> dibuat ulang otomatis oleh `init_db()`.

## Opsi B — Render (ada free tier, tapi sleep 15 menit)

Sama seperti Railway: **New → Web Service** → repo → Root Directory `backend` → Environment
**Docker** → tambah env vars yang sama → Create.
⚠️ Free tier: 512 MB RAM (TensorFlow kadang OOM) & instance tidur → WebSocket/training
tidak reliable. Untuk demo sesekali boleh, untuk demo utama pakai Railway/Oracle.

## Opsi C — Oracle Cloud Always Free VPS (gratis, paling kuat)

Kamu punya akses Oracle (lihat bookmark). Ambil VM Standard-A1 (ARM, 4 core / 24 GB — gratis):
```bash
sudo apt update && sudo apt install -y docker.io
git clone https://github.com/noxturnal74/medsign-ai && cd medsign-ai/backend
sudo docker build -t medsign-api .
sudo docker run -d --name medsign-api --restart always \
  -p 80:8000 \
  -e MEDSIGN_JWT_SECRET="..." \
  -e MEDSIGN_ENCRYPTION_KEY="..." \
  -e MEDSIGN_CORS_ORIGINS="https://medsign-ai.vercel.app,http://localhost:3001" \
  medsign-api
```
Buka port 80 di Security List VCN, lalu pakai `http://<public-ip>` (atau pasang Caddy/Certbot
untuk HTTPS — **wajib HTTPS** kalau frontend Vercel memakai kamera/WebSocket).

---

## Sambungkan ke Vercel (frontend)

Vercel → Project `medsign-ai` → **Settings → Environment Variables** → tambah:

| Name | Value |
|---|---|
| `VITE_API_BASE_URL` | `https://<domain-backend>` (tanpa `/` di akhir) |
| `VITE_MARKETING_SITE_URL` | `https://medsign-ai.vercel.app/` |
| `VITE_YOUTUBE_TUTORIAL_URL` | `https://www.youtube.com/@medsignai` |

Lalu **Deployments → Redeploy** (env VITE hanya ter-bake saat build).

## Checklist akhir

- [ ] `https://<backend>/health` → `"model_loaded": true`
- [ ] `MEDSIGN_CORS_ORIGINS` memuat domain Vercel persis (https, tanpa trailing slash)
- [ ] `VITE_API_BASE_URL` diset di Vercel → Redeploy
- [ ] Login dari `https://medsign-ai.vercel.app` sukses (cek tab Network: request ke domain backend)
- [ ] Kamera butuh **HTTPS** di kedua sisi — Vercel sudah otomatis; backend Railway/Render juga otomatis
