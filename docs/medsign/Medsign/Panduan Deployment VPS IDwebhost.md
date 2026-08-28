# Panduan Deployment MedSign ke VPS IDwebhost

## Tentang Dokumen Ini

Dokumen ini berisi langkah detail publish tiga komponen MedSign — **Frontend (React)**, **Backend (FastAPI + WebSocket)**, dan **Database (PostgreSQL)** — ke satu VPS IDwebhost. Ditulis berurutan dari VPS kosong sampai aplikasi live dengan HTTPS.

**Asumsi:**
- VPS IDwebhost sudah dibeli, sistem operasi **Ubuntu 22.04 LTS** (paling umum tersedia di IDwebhost).
- Kalian punya akses root/sudo via SSH.
- Domain sudah dibeli (bisa dari IDwebhost atau provider lain), belum diarahkan ke VPS.
- Kode FE & BE sudah ada di repository Git (GitHub/GitLab).

**Kalau Database tetap pakai Supabase** (bukan self-hosted), lewati Bagian 4 dan langsung ke Bagian 5 — cukup pastikan environment variable koneksi Supabase benar di Backend.

---

## Bagian 0 — Prompt untuk AI Coding Assistant (Opsional, Percepat Proses)

Kalau ingin AI coding assistant (Claude Code, dll) yang bantu jalankan sebagian besar konfigurasi ini secara otomatis via SSH, gunakan prompt berikut sebagai titik awal:

```yaml
Kamu membantu deploy aplikasi MedSign ke VPS Ubuntu 22.04 di IDwebhost.
Stack: Frontend React (build static), Backend FastAPI dengan WebSocket, Database PostgreSQL.

Tugas yang perlu dikerjakan berurutan:
1. Update sistem, buat user non-root untuk deployment, setup firewall (ufw) dasar.
2. Install Nginx, Python 3.11+, Node.js LTS, PostgreSQL, Certbot.
3. Setup PostgreSQL: buat database dan user khusus untuk aplikasi (jangan pakai user postgres default untuk aplikasi).
4. Clone repository backend, buat virtual environment, install dependencies, setup file .env dari .env.example.
5. Konfigurasi backend berjalan sebagai systemd service (bukan proses manual di terminal) memakai Gunicorn + Uvicorn worker, agar otomatis restart kalau crash atau VPS reboot.
6. Build frontend React (npm run build), letakkan hasil build di direktori yang bisa diserve Nginx langsung sebagai static file.
7. Konfigurasi Nginx sebagai reverse proxy: root domain mengarah ke static build frontend, path /api mengarah ke backend FastAPI, DAN pastikan konfigurasi WebSocket (path /ws atau sesuai kode) menyertakan header Upgrade & Connection yang benar — WebSocket akan gagal connect kalau ini terlewat.
8. Setup SSL dengan Certbot (Let's Encrypt) untuk domain, pastikan auto-renewal aktif.
9. Setup backup otomatis harian untuk database (pg_dump terjadwal via cron, disimpan minimal 7 hari terakhir).
10. Verifikasi akhir: cek semua service jalan (systemctl status), cek Nginx tidak ada error config (nginx -t), cek WebSocket bisa connect dari browser, cek SSL valid.

Tanyakan detail environment variable dan struktur repository sebelum mulai, jangan asumsikan path/nama file.
```

---

## Bagian 1 — Persiapan Awal VPS

### 1.1 Login Pertama Kali via SSH

```bash
ssh root@ALAMAT_IP_VPS
```
*(Alamat IP didapat dari dashboard IDwebhost setelah VPS aktif)*

### 1.2 Update Sistem

```bash
apt update && apt upgrade -y
```

### 1.3 Buat User Non-Root untuk Deployment

Jangan jalankan aplikasi sebagai root — risiko keamanan kalau ada celah di aplikasi.

```bash
adduser medsign
usermod -aG sudo medsign
su - medsign
```

### 1.4 Setup Firewall Dasar (UFW)

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

---

## Bagian 2 — Install Software Dasar

### 2.1 Nginx (Web Server & Reverse Proxy)

```bash
sudo apt install nginx -y
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 2.2 Python 3.11+ dan Tools Terkait

```bash
sudo apt install python3 python3-pip python3-venv -y
python3 --version
```

### 2.3 Node.js (untuk Build Frontend)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install nodejs -y
node --version
npm --version
```

### 2.4 Certbot (untuk SSL Gratis)

```bash
sudo apt install certbot python3-certbot-nginx -y
```

---

## Bagian 3 — Arahkan Domain ke VPS

Sebelum lanjut, arahkan domain ke IP VPS supaya SSL bisa diverifikasi nanti.

1. Login ke panel domain (IDwebhost atau provider domain kalian).
2. Buka pengaturan DNS domain.
3. Tambahkan **A Record**:
   - Host: `@` → Value: IP VPS kalian
   - Host: `www` → Value: IP VPS kalian (opsional, kalau mau `www.domain.com` juga aktif)
4. Tunggu propagasi DNS (bisa 5 menit sampai beberapa jam). Cek dengan:
```bash
ping domainkalian.com
```

Kalau sudah muncul IP VPS-nya, DNS sudah aktif.

---

## Bagian 4 — Setup Database PostgreSQL (Skip Kalau Tetap Pakai Supabase)

### 4.1 Install PostgreSQL

```bash
sudo apt install postgresql postgresql-contrib -y
sudo systemctl enable postgresql
sudo systemctl start postgresql
```

### 4.2 Buat Database dan User Khusus Aplikasi

```bash
sudo -u postgres psql
```

Di dalam prompt psql:
```sql
CREATE DATABASE medsign_db;
CREATE USER medsign_user WITH ENCRYPTED PASSWORD 'GANTI_DENGAN_PASSWORD_KUAT';
GRANT ALL PRIVILEGES ON DATABASE medsign_db TO medsign_user;
\q
```

**Penting:** jangan pakai password sederhana. Generate password kuat, simpan di password manager, JANGAN commit ke Git.

### 4.3 (Opsional) Izinkan Koneksi dari Luar VPS

Kalau backend dan database ada di server yang sama (paling umum & paling aman), **lewati langkah ini** — biarkan PostgreSQL hanya bisa diakses dari `localhost`, jangan buka ke publik.

### 4.4 Setup Backup Otomatis Harian

```bash
sudo mkdir -p /var/backups/medsign_db
```

Buat script backup:
```bash
sudo nano /usr/local/bin/backup_medsign_db.sh
```

Isi:
```bash
#!/bin/bash
TIMESTAMP=$(date +%F)
pg_dump -U medsign_user medsign_db > /var/backups/medsign_db/backup_$TIMESTAMP.sql
find /var/backups/medsign_db -type f -mtime +7 -delete
```

```bash
sudo chmod +x /usr/local/bin/backup_medsign_db.sh
```

Jadwalkan tiap hari jam 2 pagi via cron:
```bash
sudo crontab -e
```

Tambahkan baris:
```ruby
0 2 * * * /usr/local/bin/backup_medsign_db.sh
```

---

## Bagian 5 — Deploy Backend (FastAPI)

### 5.1 Clone Repository

```bash
cd ~
git clone URL_REPOSITORY_BACKEND medsign-backend
cd medsign-backend
```

### 5.2 Buat Virtual Environment & Install Dependencies

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
pip install gunicorn uvicorn
```

### 5.3 Setup Environment Variables

```bash
cp .env.example .env
nano .env
```

Isi sesuai konfigurasi production kalian (koneksi database, secret key JWT, dsb). **Jangan pernah commit file `.env` ke Git.**

### 5.4 Test Jalankan Manual Dulu (Sebelum Jadi Service)

```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

Cek dari browser: `http://IP_VPS:8000` — kalau backend merespons, lanjut ke langkah berikutnya. Matikan dulu dengan Ctrl+C.

### 5.5 Buat Systemd Service (Supaya Auto-Restart)

```bash
sudo nano /etc/systemd/system/medsign-backend.service
```

Isi:
```ini
[Unit]
Description=MedSign Backend (FastAPI)
After=network.target

[Service]
User=medsign
WorkingDirectory=/home/medsign/medsign-backend
Environment="PATH=/home/medsign/medsign-backend/venv/bin"
ExecStart=/home/medsign/medsign-backend/venv/bin/gunicorn main:app     --workers 3     --worker-class uvicorn.workers.UvicornWorker     --bind 127.0.0.1:8000
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

**Catatan soal WebSocket:** `UvicornWorker` di atas sudah mendukung WebSocket secara default — pastikan tidak diganti ke worker class lain yang tidak support WebSocket (misal `sync` worker biasa Gunicorn tanpa Uvicorn).

Aktifkan service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable medsign-backend
sudo systemctl start medsign-backend
sudo systemctl status medsign-backend
```

---

## Bagian 6 — Build & Deploy Frontend (React)

### 6.1 Clone Repository Frontend

```bash
cd ~
git clone URL_REPOSITORY_FRONTEND medsign-frontend
cd medsign-frontend
```

### 6.2 Setup Environment Variable Frontend

```bash
nano .env.production
```

Isi URL backend production, misal:
```ini
VITE_API_URL=https://domainkalian.com/api
VITE_WS_URL=wss://domainkalian.com/ws
```

*(sesuaikan nama variable dengan yang dipakai di kode kalian — Vite pakai prefix `VITE_`, Create React App pakai prefix `REACT_APP_`)*

### 6.3 Build

```bash
npm install
npm run build
```

Hasil build ada di folder `dist/` (Vite) atau `build/` (Create React App).

### 6.4 Pindahkan Hasil Build ke Direktori Nginx

```bash
sudo mkdir -p /var/www/medsign-frontend
sudo cp -r dist/* /var/www/medsign-frontend/
sudo chown -R www-data:www-data /var/www/medsign-frontend
```

---

## Bagian 7 — Konfigurasi Nginx (Reverse Proxy + WebSocket)

### 7.1 Buat File Konfigurasi

```bash
sudo nano /etc/nginx/sites-available/medsign
```

Isi:
```nginx
server {
    listen 80;
    server_name domainkalian.com www.domainkalian.com;

    # Frontend (static files)
    root /var/www/medsign-frontend;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API biasa (REST)
    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend WebSocket — bagian PALING SERING TERLEWAT saat deploy
    location /ws/ {
        proxy_pass http://127.0.0.1:8000/ws/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;
    }
}
```

**Penting soal WebSocket:** tiga baris `proxy_http_version`, `Upgrade`, dan `Connection "upgrade"` itu WAJIB ada di block `/ws/`. Tanpa ini, koneksi WebSocket akan gagal connect meskipun REST API biasa jalan normal — ini penyebab paling umum "kenapa fitur real-time saya nggak jalan padahal backend sudah nyala" setelah deploy.

### 7.2 Aktifkan Konfigurasi

```bash
sudo ln -s /etc/nginx/sites-available/medsign /etc/nginx/sites-enabled/
sudo nginx -t
```

Kalau muncul `syntax is ok` dan `test is successful`, lanjut:
```bash
sudo systemctl restart nginx
```

---

## Bagian 8 — Aktifkan SSL (HTTPS) dengan Certbot

```bash
sudo certbot --nginx -d domainkalian.com -d www.domainkalian.com
```

Ikuti instruksi interaktif (isi email, setuju ToS). Certbot otomatis akan:
- Generate sertifikat SSL gratis.
- Update konfigurasi Nginx untuk redirect HTTP → HTTPS otomatis.

### 8.1 Pastikan Auto-Renewal Aktif

```bash
sudo systemctl status certbot.timer
sudo certbot renew --dry-run
```

Kalau `dry-run` sukses tanpa error, sertifikat akan otomatis diperpanjang sebelum expired (biasanya certbot renew tiap 60-90 hari sebelum masa berlaku habis).

---

## Bagian 9 — Verifikasi Akhir

Cek satu-satu sebelum dianggap selesai:

```bash
# 1. Backend service jalan?
sudo systemctl status medsign-backend

# 2. Nginx tidak ada error?
sudo nginx -t

# 3. Database jalan? (kalau self-hosted)
sudo systemctl status postgresql

# 4. Cek log kalau ada yang aneh
sudo journalctl -u medsign-backend -f
sudo tail -f /var/log/nginx/error.log
```

Lalu cek dari browser:
- `https://domainkalian.com` → frontend muncul, ada gembok SSL hijau.
- Coba fitur yang manggil REST API → pastikan data masuk/keluar normal.
- Coba fitur yang pakai WebSocket (misal sesi konsultasi real-time) → buka Developer Tools browser → tab Network → filter "WS" → pastikan status koneksi "101 Switching Protocols", bukan error merah.

---

## Bagian 10 — Troubleshooting Umum

| Gejala | Kemungkinan Penyebab | Solusi |
|---|---|---|
| Frontend muncul tapi API call gagal (CORS error) | Backend belum mengizinkan origin domain production | Tambahkan domain ke `CORS_ORIGINS` di konfigurasi FastAPI |
| WebSocket gagal connect (error di console browser) | Konfigurasi Nginx `/ws/` belum ada header Upgrade | Cek ulang Bagian 7.1, pastikan tiga baris header WebSocket ada |
| `502 Bad Gateway` | Backend service mati/crash | `sudo systemctl status medsign-backend` lalu cek log dengan `journalctl` |
| SSL tidak aktif / masih "Not Secure" | DNS belum propagasi saat certbot dijalankan | Tunggu DNS aktif dulu (cek dengan `ping domainkalian.com`), baru jalankan ulang certbot |
| Database connection refused | Environment variable `.env` backend salah, atau PostgreSQL belum jalan | Cek `sudo systemctl status postgresql` dan isi `.env` |
| Perubahan kode tidak muncul setelah `git pull` | Lupa restart service / rebuild frontend | Backend: `sudo systemctl restart medsign-backend`. Frontend: ulangi `npm run build` + copy ke `/var/www/` |

---

## Bagian 11 — Checklist Ringkas Sebelum Go-Live

- [ ] Firewall (ufw) aktif, hanya port yang perlu terbuka
- [ ] Password database kuat, tidak ada di Git
- [ ] File `.env` tidak ter-commit ke repository
- [ ] Backend berjalan sebagai systemd service (bukan proses manual)
- [ ] Backup database terjadwal otomatis
- [ ] SSL aktif dan auto-renewal terverifikasi
- [ ] WebSocket sudah dites langsung dari browser, bukan cuma asumsi "harusnya jalan"
- [ ] Log backend & Nginx dicek tidak ada error mencurigakan setelah live beberapa jam pertama
