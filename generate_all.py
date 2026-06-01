# -*- coding: utf-8 -*-
import os
import markdown
from xhtml2pdf import pisa

# ─── 1. KONTEN DOKUMEN ────────────────────────────────────────────────────────

DOCUMENTS = {
    "1_PRD_Master.md": """# Product Requirements Document (PRD) Master - MedSign
## Sistem Pendukung Komunikasi Medis Tunarungu Berbasis Computer Vision

### 1. Deskripsi Umum
MedSign adalah platform terintegrasi yang berfungsi sebagai jembatan komunikasi dua arah antara pasien tunarungu (Teman Tuli) dan tenaga kesehatan di fasilitas medis seluruh Indonesia. Sistem menggunakan pemrosesan *Computer Vision* real-time dan model kecerdasan buatan (*Deep Learning*) untuk menerjemahkan Bahasa Isyarat Indonesia (BISINDO) klinis.

### 2. Tujuan Platform
Dokumen ini menetapkan persyaratan produk yang menyatukan tujuan bisnis, kebutuhan pasar, fungsi spesifik sistem, arsitektur teknis, dan strategi peluncuran produk MedSign.

### 3. Struktur Suite Dokumen MedSign
MedSign dikembangkan berdasarkan 5 dokumen persyaratan khusus berikut:
*   **Business Requirements Document (BRD):** Fokus pada nilai bisnis, kelayakan investasi (ROI), model komersial (SaaS), dan metrik kesuksesan organisasi.
*   **Market Requirements Document (MRD):** Analisis pasar disabilitas rungu Indonesia, segmentasi target (TAM/SAM/SOM), kompetisi, serta kepatuhan hukum medis (UU PDP, Permenkes RME).
*   **Functional Requirements Document (FRD):** Menjabarkan alur interaksi pengguna, skenario personas, dan spesifikasi 5 fitur utama (Kamera, Hybrid Translation, Panel Dokter TTS, Vocabulary Guide, dan Session Log).
*   **Technical Requirements Document (TRD):** Spesifikasi arsitektur backend FastAPI, visualisasi *pipeline* MediaPipe + LSTM/CNN, normalisasi data, skema database, dan standar WCAG.
*   **Product Strategy Document (Roadmap):** Panduan jangka panjang, prioritas fitur, dan tonggak pencapaian kuartalan perusahaan (Q1 - Q4).

### 4. Metrik Utama Kinerja (Core Performance KPIs)
1.  **Akurasi Deteksi:** Minimum $\\ge 90\\%$ pada pengujian model dengan 300 kosakata.
2.  **Inference Latency:** Waktu respons total sistem $\\le 200\\text{ ms}$.
3.  **Customer Satisfaction (CSAT):** Skor penerimaan Teman Tuli & Dokter $\\ge 92\\%$.
""",

    "2_BRD.md": """# Business Requirements Document (BRD) - MedSign
## Dokumen Kebutuhan Bisnis dan Kelayakan Investasi MedSign

### 1. Ringkasan Eksekutif
MedSign memecahkan masalah kesenjangan aksesibilitas kesehatan bagi penyandang tunarungu di Indonesia. Melalui sistem otomatisasi terjemahan isyarat BISINDO medis, MedSign menurunkan biaya operasional penerjemahan, meningkatkan keselamatan pasien, dan memenuhi kewajiban faskes terhadap regulasi disabilitas.

### 2. Masalah Utama
*   **Kendala Bahasa Medis:** Ketidakmampuan dokter memahami isyarat BISINDO memicu risiko misdiagnosis yang mengancam keselamatan jiwa.
*   **Mahalnya Juru Bahasa Isyarat (JBI):** Sewa JBI fisik berbiaya Rp500.000 - Rp1.500.000 per kunjungan dan tidak tersedia 24 jam.
*   **Kehilangan Privasi Medis:** Ketergantungan pasien tunarungu pada kerabat dekat melanggar hak privasi data kesehatan personal.

### 3. Model Bisnis & Laba Investasi (ROI)
MedSign dirancang menggunakan model monetisasi **B2B (Business-to-Business)** dan **B2G (Business-to-Government)**:
*   **Paket Puskesmas (B2G):** Model langganan tahunan terjangkau yang dibiayai oleh APBD/APBN Kementerian Kesehatan untuk mewujudkan faskes ramah disabilitas.
*   **SaaS Rumah Sakit Swasta (B2B):** Lisensi bulanan terintegrasi dengan Rekam Medis Elektronik (RME). Rumah Sakit mendapatkan ROI berupa peningkatan akreditasi, loyalitas pasien, dan pencegahan tuntutan hukum malpraktik.

### 4. Key Performance Indicators (KPI) Organisasi
*   **Waktu Anamnesis:** Menurunkan durasi rata-rata anamnesis pasien tunarungu dari 25 menit menjadi $\\le 10\\text{ menit}$.
*   **Cost Efficiency:** Mengurangi alokasi anggaran JBI eksternal hingga $85\\%$.
*   **Safety Rate:** Menurunkan *False Negative Rate* pada keluhan darurat medis hingga $\\le 5\\%$.
""",

    "3_MRD.md": """# Market Requirements Document (MRD) - MedSign
## Dokumen Analisis Pasar, Kompetisi, dan Regulasi MedSign

### 1. Analisis Pasar
Populasi tunarungu di Indonesia diperkirakan mencapai lebih dari 4 juta jiwa. Sebagian besar dari mereka tidak mendapatkan layanan kesehatan yang memadai akibat kendala komunikasi. MedSign menargetkan ekosistem layanan kesehatan yang mencakup 10.400+ Puskesmas dan 3.100+ Rumah Sakit di seluruh Indonesia.

### 2. Ukuran Pasar (TAM, SAM, SOM)
*   **Total Addressable Market (TAM):** Seluruh fasilitas kesehatan tingkat 1, 2, dan 3 di Indonesia (~15.000 faskes).
*   **Serviceable Addressable Market (SAM):** Rumah sakit tipe A, B, dan Puskesmas perkotaan (~3.500 faskes).
*   **Serviceable Obtainable Market (SOM):** Puskesmas dan faskes rujukan di wilayah Jabodetabek yang bermitra dalam program pilot project (~150 faskes).

### 3. Analisis Kompetisi
Kompetitor utama adalah penerjemah isyarat umum global (berbasis ASL) dan JBI fisik.
*   **Penerjemah Global:** Kelemahannya tidak mendukung BISINDO dan tidak memiliki terminologi medis spesifik.
*   **JBI Fisik:** Terkendala keterbatasan kuantitas JBI medis, biaya tinggi, dan privasi medis pasien terganggu.
*   **Keunggulan MedSign:** BISINDO-centric, kosakata 300+ istilah medis, enkripsi edge/lokal demi privasi, dan terintegrasi langsung dengan Rekam Medis Elektronik (RME).

### 4. Kepatuhan Regulasi (Compliance)
*   **UU No. 8 Tahun 2016 tentang Penyandang Disabilitas:** Mewajibkan faskes menyediakan layanan ramah disabilitas.
*   **Permenkes No. 24 Tahun 2022 tentang Rekam Medis Elektronik (RME):** Data transkrip MedSign dirancang kompatibel untuk diekspor ke RME.
*   **UU PDP No. 27 Tahun 2022 (Pelindungan Data Pribadi):** MedSign hanya mengambil koordinat landmark numerik dari video, menjaga privasi visual pasien secara mutlak.
""",

    "4_FRD.md": """# Functional Requirements Document (FRD) - MedSign
## Spesifikasi Fungsional dan Alur Sistem Dua Arah

### 1. Skenario Pengguna (User Personas)
*   **Pasien Tunarungu (Andi, 26 tahun):** Mengalami nyeri perut tajam. Ingin menerjemahkan gerakan isyarat BISINDO-nya ke dokter secara mandiri dan rahasia.
*   **Dokter (dr. Lestari, 34 tahun):** Membutuhkan terjemahan isyarat yang andal dalam bentuk teks dan suara audio (TTS) agar dapat tetap melakukan pemeriksaan fisik tanpa gangguan.

### 2. Spesifikasi Fitur Utama
1.  **F-01: Modul Kamera & Deteksi Landmark (Camera Feed)**
    *   Mengakses webcam secara aman (getUserMedia).
    *   Menggambar kanvas transparan koordinat landmark tangan dan ekspresi wajah.
    *   Menampilkan status deteksi "Tangan Terdeteksi ✓" / "Posisikan Tangan".
2.  **F-02: Mesin Terjemahan Hibrida (Hybrid Translation Engine)**
    *   Menerjemahkan isyarat dinamis (video 30 frame) via model LSTM.
    *   Menerjemahkan abjad statis A-Z via CNN untuk mengeja nama obat/singkatan klinis.
    *   Menampilkan bilah keyakinan (*confidence bar*) dengan klasifikasi warna (Hijau: >80%, Kuning: 60-80%, Merah: <60%).
3.  **F-03: Panel Komunikasi Dokter & Audio (Text-to-Speech)**
    *   Input teks respons dokter yang otomatis dilisankan dalam Bahasa Indonesia.
    *   Tombol pintas Frasa Cepat medis ("Tarik napas dalam", "Di mana bagian yang sakit?").
4.  **F-04: Panduan Kosakata Medis (Vocabulary Guide)**
    *   Grid 300 kosakata medis terbagi dalam 13 kategori klinis terstruktur (Salam, Nyeri, Lokasi, Cerna, Darurat, dll).
    *   Berfungsi sebagai jalan pintas (*shortcut*) manual apabila kamera/cahaya buruk.
5.  **F-05: Pencatatan Sesi & Ekspor Rekam Medis (Session Log & Export)**
    *   Menampilkan transkrip percakapan kronologis.
    *   Tombol ekspor ke PDF dan salin transkrip untuk Rekam Medis Elektronik (RME).
""",

    "5_TRD.md": """# Technical Requirements Document (TRD) - MedSign
## Arsitektur Sistem, Machine Learning Pipeline, dan Batasan Teknologi

### 1. Arsitektur Teknologi (Tech Stack)
*   **Frontend:** React (Single Page Application), HTML5 Canvas untuk rendering koordinat MediaPipe.
*   **Backend API:** FastAPI (Python 3.10) menggunakan koneksi WebSocket berlatensi rendah.
*   **ML Framework:** TensorFlow Lite / Keras (inferensi cepat pada CPU).
*   **Penyimpanan:** Supabase / PostgreSQL untuk log sesi terenkripsi.

### 2. Machine Learning & Data Pipeline
1.  **Spesifikasi Input:** Streaming kamera 720p 30fps.
2.  **Landmark Extraction:**
    *   MediaPipe Hands: 21 titik × 3 koordinat = 63 fitur numerik.
    *   MediaPipe Face Mesh (Mulut + Alis): 10 titik mulut + 10 titik alis × 3 koordinat = 60 fitur.
    *   Total Fitur: 123 koordinat numerik per frame.
3.  **Preprocessing & Normalisasi:**
    *   *Translasi Invarian:* Seluruh koordinat dikurangi terhadap koordinat pergelangan tangan (*wrist* / titik 0).
    *   *Skala Invarian:* Koordinat dinormalisasi menggunakan jarak euklidian pergelangan tangan ke pangkal jari tengah.
    *   *Temporal Alignment:* Sequence padding & sliding window dengan ukuran tetap **30 frame** (durasi 1 detik).

### 3. Struktur Model LSTM
```
Input (30, 93) -> LSTM(128, return_seq=True) -> Dropout(0.3) 
               -> LSTM(64) -> Dropout(0.3) -> Dense(128, relu) 
               -> Dense(300, softmax)
```

### 4. Kebutuhan Non-Fungsional & Keamanan
*   **Inference Latency:** Total waktu inferensi $\\le 200\\text{ ms}$.
*   **Ukuran Model:** Model LSTM $\\le 50\\text{ MB}$, model CNN $\\le 10\\text{ MB}$.
*   **Keamanan:** Transmisi video mentah dilarang (hanya koordinat numerik dikirim), enkripsi data log RME menggunakan AES-256.
*   **Aksesibilitas (WCAG 2.1 AA):** Rasio kontras teks minimum 4.5:1, target sentuh tombol $\\ge 48\\text{px}$.
""",

    "6_Roadmap.md": """# Product Strategy Document (Roadmap) - MedSign
## Rencana Strategis Jangka Panjang dan Milestone Rilis Fitur

### 1. Visi Jangka Panjang
Menjadikan MedSign sebagai standar infrastruktur kesehatan inklusif nasional di Indonesia, menjamin akses layanan klinis yang setara bagi seluruh Teman Tuli tanpa hambatan komunikasi.

### 2. Tahapan Milestone Rilis (Roadmap 4 Kuartal)

#### Q1: Fase 1 - Riset & MVP (Juni - Agustus 2026)
*   **Tujuan:** Memvalidasi teknologi dasar deteksi dan antarmuka inklusif.
*   **Output:** Prototipe aplikasi web React, visualisasi landmark MediaPipe di frontend, model awal CNN (abjad statis), dan pengenalan 40 kosakata prioritas awal.

#### Q2: Fase 2 - Kolaborasi & Perekaman Data (September - Desember 2026)
*   **Tujuan:** Mengumpulkan dataset berkualitas tinggi untuk kosakata medis BISINDO.
*   **Output:** Kemitraan dengan komunitas GERKATIN & SLB, pengumpulan 30.000 sequence video, penyiapan pipeline augmentasi data otomatis.

#### Q3: Fase 3 - Optimasi & Uji Klinis (Januari - April 2027)
*   **Tujuan:** Mengoptimasi performa backend dan menguji coba sistem di lapangan.
*   **Output:** API FastAPI WebSocket real-time, optimasi model LSTM ke format TFLite CPU, integrasi Text-to-Speech (TTS), uji coba Beta di 5 Puskesmas rujukan daerah Jabodetabek.

#### Q4: Fase 4 - Sertifikasi & Ekspansi Komersial (Mei - Agustus 2027)
*   **Tujuan:** Sertifikasi kesehatan dan peluncuran komersial skala luas.
*   **Output:** Sertifikasi fungsional dari Kemenkes, kepatuhan integrasi RME, modul analisis tren gejala faskes, serta perluasan implementasi SaaS ke faskes tingkat nasional.
"""
}

# ─── 2. FUNGSI PEMBUATAN PDF ──────────────────────────────────────────────────

def generate_pdf_from_md(md_content, output_pdf_path):
    print(f"Menyusun PDF: {output_pdf_path}...")
    
    # 1. Konversi Markdown ke HTML
    html_body = markdown.markdown(md_content, extensions=['extra', 'codehilite'])
    
    # 2. Definisikan CSS Gaya Eksklusif (Modern Slate/Teal A4 Styling)
    html_template = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            @page {{
                size: a4;
                margin: 2cm;
            }}
            body {{
                font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                color: #1e293b;
                line-height: 1.6;
                font-size: 10.5pt;
            }}
            h1 {{
                font-size: 20pt;
                color: #0284c7;
                border-bottom: 2px solid #0ea5e9;
                padding-bottom: 8px;
                margin-top: 0;
                margin-bottom: 25px;
                font-weight: bold;
            }}
            h2 {{
                font-size: 14pt;
                color: #0f172a;
                margin-top: 30px;
                margin-bottom: 12px;
                border-bottom: 1px solid #cbd5e1;
                padding-bottom: 4px;
                font-weight: bold;
            }}
            h3 {{
                font-size: 11.5pt;
                color: #1e3a8a;
                margin-top: 20px;
                margin-bottom: 8px;
                font-weight: bold;
            }}
            h4 {{
                font-size: 10.5pt;
                color: #0369a1;
                margin-top: 15px;
                margin-bottom: 6px;
                font-weight: bold;
            }}
            p {{
                margin-bottom: 12px;
                text-align: justify;
            }}
            ul, ol {{
                margin-top: 5px;
                margin-bottom: 15px;
                padding-left: 20px;
            }}
            li {{
                margin-bottom: 6px;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                margin-top: 18px;
                margin-bottom: 18px;
            }}
            th {{
                background-color: #f1f5f9;
                color: #0f172a;
                font-weight: bold;
                border: 1px solid #cbd5e1;
                padding: 10px;
                text-align: left;
                font-size: 9.5pt;
            }}
            td {{
                border: 1px solid #e2e8f0;
                padding: 10px;
                font-size: 9.5pt;
            }}
            tr:nth-child(even) {{
                background-color: #f8fafc;
            }}
            code {{
                font-family: 'Courier New', Courier, monospace;
                background-color: #f1f5f9;
                color: #b91c1c;
                padding: 2px 4px;
                font-size: 9pt;
                border-radius: 3px;
            }}
            pre {{
                background-color: #0f172a;
                color: #f8fafc;
                border: 1px solid #1e293b;
                padding: 12px;
                border-radius: 6px;
                font-size: 8.5pt;
                font-family: 'Courier New', Courier, monospace;
                margin-top: 15px;
                margin-bottom: 15px;
            }}
            pre code {{
                background-color: transparent;
                color: inherit;
                padding: 0;
                font-size: inherit;
            }}
            hr {{
                border: 0;
                border-top: 1px solid #e2e8f0;
                margin-top: 30px;
                margin-bottom: 30px;
            }}
        </style>
    </head>
    <body>
        {html_body}
    </body>
    </html>
    """
    
    with open(output_pdf_path, "wb") as pdf_file:
        pisa_status = pisa.CreatePDF(html_template, dest=pdf_file)
        
    if pisa_status.err:
        print(f"ERROR: Gagal menghasilkan PDF untuk {output_pdf_path}")
    else:
        print(f"SUKSES: PDF berhasil disimpan ke {output_pdf_path}")

# ─── 3. MAIN RUNNER ───────────────────────────────────────────────────────────

if __name__ == "__main__":
    target_dir = "d:/PKM/medsign-ai"
    if not os.path.exists(target_dir):
        os.makedirs(target_dir)
        
    print("Mulai pembuatan dokumen Markdown & PDF MedSign...")
    
    for filename, text in DOCUMENTS.items():
        # 1. Tulis file Markdown ke workspace
        md_path = os.path.join(target_dir, filename)
        with open(md_path, "w", encoding="utf-8") as f:
            f.write(text)
        print(f"Markdown ditulis: {md_path}")
        
        # 2. Tulis file PDF ke workspace
        pdf_filename = filename.replace(".md", ".pdf")
        pdf_path = os.path.join(target_dir, pdf_filename)
        generate_pdf_from_md(text, pdf_path)
        
    print("\nSELESAI: Semua 6 dokumen Markdown & PDF berhasil dihasilkan di d:/PKM/medsign-ai!")
