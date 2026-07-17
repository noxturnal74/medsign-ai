// generate_pdf.js — Render MedSign AI Dataset Guide to PDF via Playwright
// Run: node generate_pdf.js
"use strict";

const { chromium } = require("playwright");
const path  = require("path");
const fs    = require("fs");

const HTML_PATH = path.join(__dirname, "medsign_guide.html");
const PDF_PATH  = path.join(__dirname, "MedSign_AI_Dataset_Guide.pdf");

// ── Encode images to base64 for embedding ────────────────────────────────────
function imgBase64(filename) {
  const p = path.join(__dirname, filename);
  if (!fs.existsSync(p)) return "";
  return "data:image/png;base64," + fs.readFileSync(p).toString("base64");
}

const IMG = {
  collection:   imgBase64("mockup_data_collection.png"),
  recordSession:imgBase64("mockup_record_session.png"),
  balance:      imgBase64("mockup_balance.png"),
  training:     imgBase64("mockup_training.png"),
};

// ── HTML source ───────────────────────────────────────────────────────────────
const HTML = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>MedSign AI - Dataset Collection Guide</title>
<style>
/* ── Reset & Page ─────────────────────────────────────────────────────────── */
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

@page {
  size: A4;
  margin: 0;
}
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html, body {
  margin: 0; padding: 0;
  background: #0f172a;
  font-family: 'Inter', system-ui, sans-serif;
}

/* ── Cover Page ───────────────────────────────────────────────────────────── */
.cover {
  width: 210mm;
  height: 297mm;
  background: linear-gradient(135deg, #0f172a 0%, #1e3a5f 50%, #0f172a 100%);
  position: relative;
  overflow: hidden;
  page-break-after: always;
  display: flex;
  flex-direction: column;
}
.cover-accent-bar {
  width: 100%;
  height: 6px;
  background: linear-gradient(90deg, #22c55e, #3b82f6, #22c55e);
}
.cover-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(34,197,94,0.04) 1px, transparent 1px),
    linear-gradient(90deg, rgba(34,197,94,0.04) 1px, transparent 1px);
  background-size: 32px 32px;
}
.cover-glow {
  position: absolute;
  width: 500px; height: 500px;
  background: radial-gradient(circle, rgba(34,197,94,0.12) 0%, transparent 70%);
  top: -100px; right: -100px;
  border-radius: 50%;
}
.cover-glow-2 {
  position: absolute;
  width: 400px; height: 400px;
  background: radial-gradient(circle, rgba(59,130,246,0.10) 0%, transparent 70%);
  bottom: 80px; left: -80px;
  border-radius: 50%;
}
.cover-content {
  position: relative;
  z-index: 2;
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 0 18mm;
  justify-content: center;
}
.cover-label {
  font-size: 10pt;
  font-weight: 500;
  color: #22c55e;
  letter-spacing: 3px;
  text-transform: uppercase;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.cover-label::before {
  content: '';
  display: inline-block;
  width: 24px; height: 2px;
  background: #22c55e;
}
.cover-title {
  font-size: 46pt;
  font-weight: 700;
  color: #ffffff;
  line-height: 1.05;
  letter-spacing: -1px;
  margin-bottom: 8px;
}
.cover-title span {
  color: #22c55e;
}
.cover-subtitle {
  font-size: 18pt;
  font-weight: 300;
  color: #94a3b8;
  line-height: 1.4;
  margin-bottom: 32px;
}
.cover-divider {
  width: 64px;
  height: 3px;
  background: linear-gradient(90deg, #22c55e, transparent);
  margin-bottom: 28px;
}
.cover-desc {
  font-size: 11pt;
  color: #64748b;
  line-height: 1.7;
  max-width: 120mm;
  margin-bottom: 48px;
}
.cover-tags {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 56px;
}
.cover-tag {
  background: rgba(34,197,94,0.10);
  border: 1px solid rgba(34,197,94,0.25);
  color: #22c55e;
  font-size: 8.5pt;
  font-weight: 500;
  padding: 5px 12px;
  border-radius: 20px;
  letter-spacing: 0.5px;
}
.cover-meta {
  border-top: 1px solid rgba(255,255,255,0.08);
  padding-top: 20px;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
}
.cover-team {
  font-size: 9pt;
  color: #475569;
  line-height: 1.8;
}
.cover-team strong {
  color: #64748b;
  font-weight: 500;
  display: block;
  margin-bottom: 4px;
}
.cover-year {
  font-family: 'JetBrains Mono', monospace;
  font-size: 9pt;
  color: #334155;
}
.cover-footer {
  position: relative;
  z-index: 2;
  padding: 0 18mm 14mm;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.cover-dot-row {
  display: flex;
  gap: 6px;
}
.cover-dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: #1e3a5f;
}
.cover-dot.active { background: #22c55e; }

/* ── Body Pages ──────────────────────────────────────────────────────────── */
.page {
  width: 210mm;
  min-height: 297mm;
  background: #ffffff;
  page-break-before: always;
  position: relative;
}
.page-inner {
  padding: 16mm 18mm 20mm;
}

/* Running header */
.running-header {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 10mm;
  background: #0f172a;
  display: flex;
  align-items: center;
  padding: 0 18mm;
  justify-content: space-between;
}
.running-header-logo {
  font-size: 7.5pt;
  font-weight: 600;
  color: #22c55e;
  letter-spacing: 1px;
}
.running-header-title {
  font-size: 7pt;
  color: #475569;
  font-weight: 400;
}

/* Running footer */
.running-footer {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 9mm;
  border-top: 1px solid #f1f5f9;
  display: flex;
  align-items: center;
  padding: 0 18mm;
  justify-content: space-between;
}
.footer-text {
  font-size: 7pt;
  color: #cbd5e1;
  font-weight: 400;
}

/* Content area offset */
.page-inner {
  padding: 14mm 18mm 14mm;
  margin-top: 10mm;
  margin-bottom: 9mm;
}

/* ── Typography ──────────────────────────────────────────────────────────── */
h1 {
  font-size: 22pt;
  font-weight: 700;
  color: #0f172a;
  line-height: 1.2;
  margin-bottom: 8px;
  margin-top: 24px;
  padding-bottom: 10px;
  border-bottom: 2px solid #f1f5f9;
  display: flex;
  align-items: center;
  gap: 10px;
}
h1 .num {
  font-size: 10pt;
  font-weight: 600;
  color: #22c55e;
  background: rgba(34,197,94,0.08);
  border: 1px solid rgba(34,197,94,0.2);
  width: 26px; height: 26px;
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
h2 {
  font-size: 14pt;
  font-weight: 600;
  color: #1e3a5f;
  margin-top: 20px;
  margin-bottom: 6px;
  display: flex;
  align-items: center;
  gap: 8px;
}
h2::before {
  content: '';
  display: inline-block;
  width: 3px; height: 14px;
  background: #22c55e;
  border-radius: 2px;
  flex-shrink: 0;
}
h3 {
  font-size: 11pt;
  font-weight: 600;
  color: #334155;
  margin-top: 14px;
  margin-bottom: 5px;
}
p {
  font-size: 10pt;
  color: #334155;
  line-height: 1.75;
  margin-bottom: 8px;
}
.first-h1 { margin-top: 0; }

/* ── Code blocks ─────────────────────────────────────────────────────────── */
.code-block {
  background: #0f172a;
  border-radius: 8px;
  padding: 14px 16px;
  margin: 10px 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 8.5pt;
  color: #94a3b8;
  line-height: 1.7;
  border-left: 3px solid #22c55e;
  white-space: pre;
  overflow: hidden;
}
.code-block .cmd { color: #e2e8f0; }
.code-block .comment { color: #475569; }
.code-block .green { color: #22c55e; }

/* ── Note/Alert boxes ─────────────────────────────────────────────────────── */
.note {
  background: #fffbeb;
  border-left: 3px solid #f59e0b;
  border-radius: 0 6px 6px 0;
  padding: 10px 14px;
  margin: 10px 0;
  font-size: 9.5pt;
  color: #78350f;
  line-height: 1.65;
}
.note-info {
  background: #eff6ff;
  border-left: 3px solid #3b82f6;
  color: #1e3a5f;
}
.note-success {
  background: #f0fdf4;
  border-left: 3px solid #22c55e;
  color: #14532d;
}

/* ── Tables ───────────────────────────────────────────────────────────────── */
.tbl-wrap {
  margin: 12px 0;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
}
table {
  width: 100%;
  border-collapse: collapse;
  font-size: 9.5pt;
}
thead tr {
  background: #1e3a5f;
}
thead th {
  color: #ffffff;
  font-weight: 600;
  padding: 9px 12px;
  text-align: left;
  font-size: 9pt;
  letter-spacing: 0.3px;
}
tbody tr:nth-child(even) {
  background: #f8fafc;
}
tbody tr:nth-child(odd) {
  background: #ffffff;
}
tbody td {
  color: #334155;
  padding: 8px 12px;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: top;
  line-height: 1.55;
}
tbody tr:last-child td { border-bottom: none; }

/* ── Mockup images ─────────────────────────────────────────────────────────── */
.mockup-wrap {
  margin: 14px 0;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 16px rgba(0,0,0,0.08);
}
.mockup-wrap img {
  width: 100%;
  display: block;
}
.mockup-caption {
  text-align: center;
  font-size: 8.5pt;
  color: #94a3b8;
  font-style: italic;
  margin-top: 6px;
  margin-bottom: 12px;
}

/* ── Bullet steps ─────────────────────────────────────────────────────────── */
.step-list {
  list-style: none;
  margin: 8px 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.step-list li {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  font-size: 10pt;
  color: #334155;
  line-height: 1.65;
}
.step-num {
  width: 20px; height: 20px;
  background: #22c55e;
  color: #0f172a;
  border-radius: 50%;
  font-size: 8pt;
  font-weight: 700;
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;
}
.bullet-list {
  list-style: none;
  margin: 6px 0;
}
.bullet-list li {
  padding: 3px 0 3px 18px;
  position: relative;
  font-size: 10pt;
  color: #334155;
  line-height: 1.65;
}
.bullet-list li::before {
  content: '';
  position: absolute;
  left: 4px; top: 11px;
  width: 5px; height: 5px;
  border-radius: 50%;
  background: #22c55e;
}

/* ── Control table (buttons) ──────────────────────────────────────────────── */
.btn-tag {
  font-family: 'JetBrains Mono', monospace;
  font-size: 8.5pt;
  background: #1e3a5f;
  color: #e2e8f0;
  padding: 2px 8px;
  border-radius: 4px;
  white-space: nowrap;
}

/* ── Section spacer ──────────────────────────────────────────────────────── */
.spacer { height: 16px; }
.spacer-sm { height: 8px; }

/* ── Folder tree ─────────────────────────────────────────────────────────── */
.folder-tree {
  background: #0f172a;
  border-radius: 8px;
  padding: 14px 18px;
  margin: 10px 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 8.5pt;
  color: #64748b;
  line-height: 2;
  border-left: 3px solid #1e3a5f;
}
.folder-tree .folder { color: #3b82f6; }
.folder-tree .file   { color: #94a3b8; }
.folder-tree .green  { color: #22c55e; }

/* ── Contract table highlight ────────────────────────────────────────────── */
.contract-table thead tr { background: #0f172a; }

/* ── Print ───────────────────────────────────────────────────────────────── */
@media print {
  .page { page-break-inside: avoid; }
}
</style>
</head>
<body>

<!-- ═══════════════════════════════════════════════════════ COVER ═══════ -->
<div class="cover">
  <div class="cover-accent-bar"></div>
  <div class="cover-grid"></div>
  <div class="cover-glow"></div>
  <div class="cover-glow-2"></div>

  <div class="cover-content">
    <div class="cover-label">PKM - Program Kreativitas Mahasiswa</div>
    <div class="cover-title">MedSign <span>AI</span></div>
    <div class="cover-subtitle">Dataset Collection &amp; Training Guide</div>
    <div class="cover-divider"></div>
    <div class="cover-desc">
      Panduan lengkap skema pengambilan dataset bahasa isyarat Indonesia (BISINDO) dan pelatihan model GRU untuk sistem pendeteksi isyarat medis inklusif.
    </div>
    <div class="cover-tags">
      <span class="cover-tag">MediaPipe Landmarks</span>
      <span class="cover-tag">GRU Model</span>
      <span class="cover-tag">Web UI Collection</span>
      <span class="cover-tag">192 Kata Medis</span>
      <span class="cover-tag">FastAPI + React</span>
    </div>
    <div class="cover-meta">
      <div class="cover-team">
        <strong>Tim PKM MedSign AI</strong>
        albert_william &nbsp;·&nbsp; albert_cheng &nbsp;·&nbsp; glenn &nbsp;·&nbsp; loren
      </div>
      <div class="cover-year">2026</div>
    </div>
  </div>

  <div class="cover-footer">
    <div class="cover-dot-row">
      <div class="cover-dot active"></div>
      <div class="cover-dot active"></div>
      <div class="cover-dot"></div>
      <div class="cover-dot"></div>
      <div class="cover-dot"></div>
    </div>
    <div style="font-size:8pt;color:#1e3a5f;font-family:'JetBrains Mono',monospace;">medsign-clinical-full-v1</div>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════ PAGE 1 ════════ -->
<div class="page">
  <div class="running-header">
    <span class="running-header-logo">MEDSIGN AI</span>
    <span class="running-header-title">Dataset Collection &amp; Training Guide</span>
  </div>
  <div class="page-inner">

    <h1 class="first-h1"><span class="num">1</span>Ringkasan Sistem</h1>
    <p>MedSign AI adalah sistem pendeteksi bahasa isyarat Indonesia (BISINDO) berbasis machine learning yang dirancang untuk memfasilitasi komunikasi antara tenaga medis dan pasien tunarungu. Dokumen ini menjelaskan skema operasional pengambilan dataset dan pelatihan model secara lengkap, dari cara membuka aplikasi hingga menghasilkan file model TFLite yang siap digunakan.</p>
    <p>Setiap anggota PKM dapat merekam dataset secara mandiri melalui browser tanpa perlu mendampingi satu sama lain atau menjalankan perintah teknis. Sistem Web UI memungkinkan proses perekaman, monitoring keseimbangan data, dan pelatihan model dari satu antarmuka terintegrasi.</p>
    <div class="spacer-sm"></div>

    <h3>Kontrak Data (Tidak Boleh Diubah Setelah Model Dilatih)</h3>
    <div class="tbl-wrap">
      <table class="contract-table">
        <thead><tr><th>Parameter</th><th>Nilai</th><th>Keterangan</th></tr></thead>
        <tbody>
          <tr><td>Frame per sequence</td><td>30</td><td>Jumlah frame yang direkam per isyarat</td></tr>
          <tr><td>Fitur per frame</td><td>63</td><td>21 titik landmark tangan x/y/z</td></tr>
          <tr><td>Format file</td><td>.npy shape (30, 63)</td><td>NumPy array float32</td></tr>
          <tr><td>Minimum iterasi per kata</td><td>5</td><td>Per orang per kata</td></tr>
          <tr><td>Minimum total per kata</td><td>20</td><td>5 iterasi x 4 signer</td></tr>
          <tr><td>Penamaan signer</td><td>nama asli lowercase</td><td>Contoh: albert_william</td></tr>
        </tbody>
      </table>
    </div>

    <div class="spacer"></div>
    <h1><span class="num">2</span>Cara Menjalankan Sistem</h1>
    <p>Sistem terdiri dari dua komponen yang harus berjalan bersamaan: backend FastAPI (Python) dan frontend React. Keduanya dijalankan dari laptop yang sama. Cukup buka dua jendela terminal.</p>

    <h2>2.1 Jalankan Backend (Terminal 1)</h2>
    <div class="code-block"><span class="comment"># Masuk ke folder backend dan aktifkan virtual environment</span>
<span class="cmd">cd D:\PKM\medsign-ai\backend</span>
<span class="cmd">.\venv\Scripts\activate</span>
<span class="cmd">uvicorn app.main:app --reload --port 8000</span></div>
    <div class="note">Backend harus berjalan terlebih dahulu sebelum membuka browser. Pastikan tidak ada error merah di terminal ini sebelum lanjut ke langkah berikutnya.</div>

    <h2>2.2 Jalankan Frontend (Terminal 2)</h2>
    <div class="code-block"><span class="comment"># Buka terminal baru, masuk ke folder frontend</span>
<span class="cmd">cd D:\PKM\medsign-ai\frontend</span>
<span class="cmd">npm run dev</span></div>

    <h2>2.3 Buka di Browser</h2>
    <div class="code-block"><span class="green">http://localhost:5173/data-collection</span></div>
    <div class="note note-info">Anggota PKM lain cukup membuka URL ini dari laptop yang sama. Tidak perlu install apapun atau paham coding. Semua proses dilakukan dari browser.</div>

  </div>
  <div class="running-footer">
    <span class="footer-text">MedSign AI - Dataset &amp; Training Guide</span>
    <span class="footer-text">Halaman 1</span>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════ PAGE 2 ════════ -->
<div class="page">
  <div class="running-header">
    <span class="running-header-logo">MEDSIGN AI</span>
    <span class="running-header-title">Dataset Collection &amp; Training Guide</span>
  </div>
  <div class="page-inner">

    <h1 class="first-h1"><span class="num">3</span>Alur Rekam Dataset</h1>

    <h2>3.1 Halaman Rekam Dataset</h2>
    <div class="mockup-wrap">
      <img src="${IMG.collection}" alt="Mockup halaman Rekam Dataset"/>
    </div>
    <div class="mockup-caption">Gambar 1. Tampilan halaman Rekam Dataset - pilih signer, kata, dan iterasi</div>

    <p>Halaman ini memiliki tiga langkah yang harus diselesaikan secara berurutan sebelum sesi rekam dimulai:</p>
    <ul class="step-list">
      <li><span class="step-num">1</span>Pilih Signer - pilih nama kamu dari dropdown, atau ketik nama baru jika belum ada.</li>
      <li><span class="step-num">2</span>Pilih Kata - centang kata-kata yang ingin direkam sesi ini. Kata dapat disaring per kategori medis.</li>
      <li><span class="step-num">3</span>Set Iterasi - masukkan jumlah pengulangan per kata (minimum 5). Estimasi waktu otomatis muncul.</li>
      <li><span class="step-num">4</span>Klik tombol "Mulai Rekam" untuk memulai sesi perekaman otomatis.</li>
    </ul>

    <h2>3.2 Sesi Rekam Live</h2>
    <div class="mockup-wrap">
      <img src="${IMG.recordSession}" alt="Mockup sesi rekam live"/>
    </div>
    <div class="mockup-caption">Gambar 2. Tampilan sesi rekam live dengan webcam aktif dan antrian kata</div>

    <p>Setelah klik Mulai Rekam, sistem memandu proses perekaman secara otomatis:</p>
    <ul class="bullet-list">
      <li>Nama kata yang akan direkam muncul besar di tengah layar.</li>
      <li>Countdown 3... 2... 1... ditampilkan, posisikan tangan sebelum hitungan habis.</li>
      <li>Webcam aktif dan MediaPipe mengekstrak 30 frame landmark tangan otomatis.</li>
      <li>Progress bar frame (0 sampai 30) menampilkan progres perekaman satu take.</li>
      <li>Setelah 30 frame terkumpul, data dikirim ke server dan take berikutnya dimulai.</li>
    </ul>

  </div>
  <div class="running-footer">
    <span class="footer-text">MedSign AI - Dataset &amp; Training Guide</span>
    <span class="footer-text">Halaman 2</span>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════ PAGE 3 ════════ -->
<div class="page">
  <div class="running-header">
    <span class="running-header-logo">MEDSIGN AI</span>
    <span class="running-header-title">Dataset Collection &amp; Training Guide</span>
  </div>
  <div class="page-inner">

    <h3>Tombol Kontrol Selama Sesi</h3>
    <div class="tbl-wrap">
      <table>
        <thead><tr><th>Tombol</th><th>Fungsi</th></tr></thead>
        <tbody>
          <tr><td><span class="btn-tag">Batal</span></td><td>Hentikan sesi. Data yang sudah tersimpan tetap ada dan tidak hilang.</td></tr>
          <tr><td><span class="btn-tag">Skip Kata Ini</span></td><td>Lewati kata ini, lanjut ke kata berikutnya dalam antrian.</td></tr>
          <tr><td><span class="btn-tag">Ulang Take</span></td><td>Hapus take terakhir dan rekam ulang dari awal.</td></tr>
        </tbody>
      </table>
    </div>

    <div class="spacer"></div>
    <h1><span class="num">4</span>Balance Checker</h1>
    <div class="mockup-wrap">
      <img src="${IMG.balance}" alt="Mockup Balance Checker"/>
    </div>
    <div class="mockup-caption">Gambar 3. Balance Checker - tabel jumlah sampel per kata per signer dengan alert otomatis</div>

    <p>Balance Checker menampilkan tabel jumlah sampel per kata per signer secara real-time. Diakses di:</p>
    <div class="code-block"><span class="green">http://localhost:5173/data-collection/balance</span></div>

    <h3>Status Alert Otomatis</h3>
    <div class="tbl-wrap">
      <table>
        <thead><tr><th>Status</th><th>Kondisi</th><th>Aksi yang Disarankan</th></tr></thead>
        <tbody>
          <tr><td>Cukup</td><td>Total lebih dari atau sama dengan 5 dikali jumlah signer aktif</td><td>Kata ini siap untuk training.</td></tr>
          <tr><td>Kurang</td><td>Total lebih dari 0 tapi di bawah minimum</td><td>Minta signer yang belum rekam untuk menambah iterasi.</td></tr>
          <tr><td>Selesai</td><td>Total = 0, tidak ada satu pun data</td><td>Harus direkam sebelum bisa dilatih.</td></tr>
        </tbody>
      </table>
    </div>

    <div class="spacer"></div>
    <h1><span class="num">5</span>Cara Membuat Model</h1>
    <div class="mockup-wrap">
      <img src="${IMG.training}" alt="Mockup Training Panel"/>
    </div>
    <div class="mockup-caption">Gambar 4. Panel Training - konfigurasi kata, epoch, dan arsitektur model</div>

    <p>Pelatihan model hanya bisa dilakukan setelah semua kata yang dipilih memiliki cukup data. Training dijalankan oleh Albert dari panel Training di browser atau langsung via terminal.</p>

  </div>
  <div class="running-footer">
    <span class="footer-text">MedSign AI - Dataset &amp; Training Guide</span>
    <span class="footer-text">Halaman 3</span>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════ PAGE 4 ════════ -->
<div class="page">
  <div class="running-header">
    <span class="running-header-logo">MEDSIGN AI</span>
    <span class="running-header-title">Dataset Collection &amp; Training Guide</span>
  </div>
  <div class="page-inner">

    <h2 class="first-h1" style="margin-top:0">5.1 Konfigurasi Training</h2>
    <div class="tbl-wrap">
      <table>
        <thead><tr><th>Parameter</th><th>Pilihan</th><th>Rekomendasi PKM</th></tr></thead>
        <tbody>
          <tr><td>Kata yang dilatih</td><td>Subset dari kata yang sudah punya data</td><td>Semua kata yang sudah mencapai 20 sampel total</td></tr>
          <tr><td>Jumlah Epoch</td><td>10 / 30 / 50 / 100 atau custom</td><td>50 epoch untuk akurasi awal yang baik</td></tr>
          <tr><td>Arsitektur</td><td>GRU / LSTM / Transformer</td><td>GRU - cepat dan terbukti di sistem ini</td></tr>
        </tbody>
      </table>
    </div>

    <h2>5.2 Via Terminal (Cara Langsung)</h2>
    <div class="code-block"><span class="comment"># Step 1: Validasi dataset dulu sebelum training</span>
<span class="cmd">.\backend\venv\Scripts\python.exe .\backend\training\validate_dataset.py --quarantine-invalid</span>

<span class="comment"># Step 2: Jalankan training dengan konfigurasi pilihan</span>
<span class="cmd">.\backend\venv\Scripts\python.exe .\backend\training\train_clinical_model.py ^</span>
<span class="cmd">    --architecture gru ^</span>
<span class="cmd">    --labels sakit,nyeri,batuk,demam,ya,tidak,tolong ^</span>
<span class="cmd">    --epochs 50</span></div>
    <div class="note">Jalankan validate_dataset.py terlebih dahulu untuk memindahkan sampel tidak valid ke folder karantina sebelum training dimulai.</div>

    <h2>5.3 Output Model</h2>
    <div class="tbl-wrap">
      <table>
        <thead><tr><th>File</th><th>Lokasi</th><th>Fungsi</th></tr></thead>
        <tbody>
          <tr><td>medsign_mvp_v1.tflite</td><td>backend/models/</td><td>Model produksi - langsung dipakai API prediksi</td></tr>
          <tr><td>medsign_mvp_v1.h5</td><td>backend/models/</td><td>Model Keras (backup untuk fine-tuning)</td></tr>
          <tr><td>classification_report_*.json</td><td>backend/reports/</td><td>Laporan akurasi per kata isyarat</td></tr>
          <tr><td>confusion_matrix_*.csv</td><td>backend/reports/</td><td>Matriks konfusi untuk analisis error</td></tr>
          <tr><td>DATASET_HEALTH_REPORT.md</td><td>backend/reports/</td><td>Laporan kesehatan dataset keseluruhan</td></tr>
        </tbody>
      </table>
    </div>
    <div class="note note-success">File .tflite langsung aktif di endpoint prediksi (/api/v1/stream) setelah backend di-restart. Tidak perlu konfigurasi tambahan.</div>

    <div class="spacer"></div>
    <h1><span class="num">6</span>Struktur Folder Dataset</h1>
    <p>Dataset disimpan per signer berdasarkan nama asli di dalam folder per kata. Signer baru otomatis muncul saat pertama kali rekam, tidak perlu didaftarkan manual.</p>
    <div class="folder-tree"><span class="folder">backend/data/landmarks/</span>
  <span class="folder">sakit/</span>
    <span class="folder">albert_william/</span>
      <span class="file">sakit_albert_william_20260708_001.npy</span>
      <span class="file">sakit_albert_william_20260708_002.npy</span>
      <span class="file">...</span>
    <span class="folder">albert_cheng/</span>
    <span class="folder">glenn/</span>
    <span class="folder">loren/</span>
  <span class="folder">nyeri/</span>
    <span class="folder">albert_william/</span>
    <span class="file">...</span></div>
    <div class="note">Jangan ubah nama folder signer setelah mulai merekam. Nama folder adalah nama signer yang digunakan di semua laporan dan proses training.</div>

  </div>
  <div class="running-footer">
    <span class="footer-text">MedSign AI - Dataset &amp; Training Guide</span>
    <span class="footer-text">Halaman 4</span>
  </div>
</div>

<!-- ═══════════════════════════════════════════════════════ PAGE 5 ════════ -->
<div class="page">
  <div class="running-header">
    <span class="running-header-logo">MEDSIGN AI</span>
    <span class="running-header-title">Dataset Collection &amp; Training Guide</span>
  </div>
  <div class="page-inner">

    <h1 class="first-h1"><span class="num">7</span>To Do List Implementasi</h1>

    <h2>7.1 Backend - API Baru</h2>
    <div class="tbl-wrap">
      <table>
        <thead><tr><th>#</th><th>Item</th><th>Detail</th><th>Status</th></tr></thead>
        <tbody>
          <tr><td>1</td><td>GET /api/v1/dataset/signers</td><td>Scan folder landmarks/*/  dan return list nama signer unik yang sudah ada</td><td>Selesai</td></tr>
          <tr><td>2</td><td>GET /api/v1/dataset/balance</td><td>Hitung .npy per kata per signer, tambahkan status alert Cukup/Kurang/Belum</td><td>Selesai</td></tr>
          <tr><td>3</td><td>POST /api/v1/dataset/train</td><td>Terima labels, epochs, architecture, jalankan training, streaming log via SSE</td><td>Selesai</td></tr>
          <tr><td>4</td><td>Update train_clinical_model.py</td><td>Tambah argumen --labels (subset kata) dan --epochs (jumlah iterasi)</td><td>Selesai</td></tr>
          <tr><td>5</td><td>Validasi nama signer</td><td>Pastikan input nama signer menggunakan format lowercase underscore</td><td>Selesai</td></tr>
        </tbody>
      </table>
    </div>

    <h2>7.2 Frontend - Halaman Baru</h2>
    <div class="tbl-wrap">
      <table>
        <thead><tr><th>#</th><th>Komponen / Halaman</th><th>Detail</th><th>Status</th></tr></thead>
        <tbody>
          <tr><td>1</td><td>Halaman /data-collection</td><td>Layout 3 langkah: pilih signer, pilih kata, set iterasi</td><td>Selesai</td></tr>
          <tr><td>2</td><td>Dropdown Signer</td><td>Load dari API, ada opsi tambah signer baru secara inline</td><td>Selesai</td></tr>
          <tr><td>3</td><td>Checklist Kata per Kategori</td><td>192 kata dari labels.json, bisa filter per kategori, ada tombol select all dan none</td><td>Selesai</td></tr>
          <tr><td>4</td><td>Input Iterasi + Estimasi Waktu</td><td>Validasi minimum 5, estimasi otomatis: iterasi dikali kata dikali 4 detik</td><td>Selesai</td></tr>
          <tr><td>5</td><td>Komponen RecordSession</td><td>Webcam + countdown + progress bar frame 0-30 + antrian kata di kanan</td><td>Selesai</td></tr>
          <tr><td>6</td><td>Alert Tangan Tidak Terdeteksi</td><td>Warning jika tangan hilang lebih dari 5 frame berturut-turut</td><td>Selesai</td></tr>
          <tr><td>7</td><td>Halaman /balance</td><td>Tabel balance + summary cards + tombol refresh dan export CSV</td><td>Selesai</td></tr>
          <tr><td>8</td><td>Halaman /training</td><td>Konfigurasi training + log streaming SSE + progress bar per label</td><td>Selesai</td></tr>
          <tr><td>9</td><td>Tambah navigasi sidebar</td><td>Tambah link ke halaman-halaman baru di sidebar yang sudah ada</td><td>Selesai</td></tr>
        </tbody>
      </table>
    </div>

    <div class="spacer"></div>
    <h1><span class="num">8</span>Catatan Penting</h1>
    <div class="tbl-wrap">
      <table>
        <thead><tr><th>Aturan</th><th>Penjelasan</th></tr></thead>
        <tbody>
          <tr><td>Jangan ubah labels.json setelah model dilatih</td><td>Kontrak data beku setelah training. Menambah kata berarti melatih ulang dari awal.</td></tr>
          <tr><td>Signer ID menggunakan nama asli lowercase underscore</td><td>Konsisten di semua sesi. Contoh: albert_william, bukan Albert William atau albert-william.</td></tr>
          <tr><td>MediaPipe jalan di browser</td><td>Anggota tidak perlu install Python atau paket apapun di laptop mereka sendiri.</td></tr>
          <tr><td>Training hanya dari laptop Albert</td><td>Membutuhkan backend Python dan TensorFlow yang hanya ada di laptop utama pengembang.</td></tr>
          <tr><td>Dataset Fathur disimpan terpisah</td><td>200 kata, 2 take per kata dari Mas Fathur tidak dimasukkan ke data/landmarks training.</td></tr>
          <tr><td>Minimal 5 iterasi per kata per signer</td><td>Di bawah angka ini model tidak cukup bervariasi dan berpotensi overfit pada satu gaya tangan.</td></tr>
        </tbody>
      </table>
    </div>

    <div class="spacer"></div>
    <h1><span class="num">9</span>Referensi File Teknis</h1>
    <div class="tbl-wrap">
      <table>
        <thead><tr><th>File</th><th>Lokasi</th><th>Fungsi</th></tr></thead>
        <tbody>
          <tr><td>capture_landmarks.py</td><td>backend/training/</td><td>Rekam satu label dari webcam ke file .npy (CLI mode)</td></tr>
          <tr><td>collect_signer_dataset.py</td><td>backend/training/</td><td>Workflow rekam semua label untuk satu signer (CLI mode)</td></tr>
          <tr><td>validate_dataset.py</td><td>backend/training/</td><td>Validasi semua sampel, karantina yang tidak valid</td></tr>
          <tr><td>train_clinical_model.py</td><td>backend/training/</td><td>Latih model GRU dan ekspor ke format .tflite</td></tr>
          <tr><td>data_collection.py</td><td>backend/app/routes/</td><td>Endpoint POST /save-sample (sudah ada, siap dipakai)</td></tr>
          <tr><td>labels.json</td><td>backend/data/metadata/</td><td>Sumber kebenaran tunggal untuk semua 192 label kata isyarat</td></tr>
          <tr><td>recordings.csv</td><td>backend/data/metadata/</td><td>Log metadata setiap rekaman yang berhasil disimpan</td></tr>
          <tr><td>DataCollection.jsx</td><td>frontend/src/pages/</td><td>Halaman /data-collection yang perlu dibuat baru</td></tr>
        </tbody>
      </table>
    </div>

  </div>
  <div class="running-footer">
    <span class="footer-text">MedSign AI - Dataset &amp; Training Guide</span>
    <span class="footer-text">Halaman 5</span>
  </div>
</div>

</body>
</html>`;

// ── Write HTML then render ────────────────────────────────────────────────────
async function main() {
  fs.writeFileSync(HTML_PATH, HTML, "utf8");
  console.log("HTML ditulis ke:", HTML_PATH);

  const browser = await chromium.launch();
  const page    = await browser.newPage();

  await page.goto("file://" + HTML_PATH, { waitUntil: "networkidle" });

  // Wait for Google Fonts to load (or timeout gracefully)
  await page.waitForTimeout(2000);

  await page.pdf({
    path:            PDF_PATH,
    format:          "A4",
    printBackground: true,
    margin:          { top: "0", right: "0", bottom: "0", left: "0" },
  });

  await browser.close();
  console.log("\u2714 PDF berhasil dibuat:", PDF_PATH);
  console.log("Ukuran:", (fs.statSync(PDF_PATH).size / 1024).toFixed(1), "KB");
}

main().catch(err => { console.error(err); process.exit(1); });
