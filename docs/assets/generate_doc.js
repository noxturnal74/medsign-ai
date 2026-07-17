// generate_doc.js — MedSign AI Dataset Collection Design Doc
// Run: node generate_doc.js
"use strict";

const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  HeadingLevel, AlignmentType, BorderStyle, WidthType, ShadingType,
  PageNumber, Header, Footer, ImageRun, PageBreak, TableOfContents,
  convertInchesToTwip, UnderlineType,
} = require("docx");
const fs   = require("fs");
const path = require("path");

// ── Palette: Medical Blue (MC-1) ────────────────────────────────────────────
const P = {
  bg:      "F5F8FC",
  primary: "1A5276",
  accent:  "2E86C1",
  body:    "1E2E40",
  secondary:"4A6580",
  surface: "EDF3F8",
  table: {
    headerBg:   "2E86C1",
    headerText: "FFFFFF",
    accentLine: "1A5276",
    innerLine:  "D0DDE8",
    surface:    "EDF3F8",
  },
};
const c = (hex) => hex.replace("#", "");

// ── Helpers ─────────────────────────────────────────────────────────────────
const NB = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" };
const allNoBorders = { top: NB, bottom: NB, left: NB, right: NB, insideHorizontal: NB, insideVertical: NB };

function sp(before = 0, after = 120, line = 312) {
  return { spacing: { before, after, line, lineRule: "auto" } };
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    ...sp(360, 120),
    children: [new TextRun({ text, bold: true, color: c(P.primary), font: { ascii: "Calibri", eastAsia: "SimHei" }, size: 32 })],
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    ...sp(240, 80),
    children: [new TextRun({ text, bold: true, color: c(P.accent), font: { ascii: "Calibri", eastAsia: "SimHei" }, size: 28 })],
  });
}

function h3(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_3,
    ...sp(160, 60),
    children: [new TextRun({ text, bold: true, color: c(P.primary), font: { ascii: "Calibri", eastAsia: "SimHei" }, size: 24 })],
  });
}

function body(text) {
  return new Paragraph({
    alignment: AlignmentType.JUSTIFIED,
    indent: { firstLine: 480 },
    ...sp(0, 80, 312),
    children: [new TextRun({ text, size: 24, color: c(P.body), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })],
  });
}

function bodyBold(text) {
  return new Paragraph({
    ...sp(0, 80, 312),
    children: [new TextRun({ text, size: 24, bold: true, color: c(P.primary), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })],
  });
}

function bullet(text, level = 0) {
  return new Paragraph({
    bullet: { level },
    ...sp(0, 60, 312),
    indent: { left: 360 + level * 360 },
    children: [new TextRun({ text, size: 24, color: c(P.body), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })],
  });
}

function code(text) {
  return new Paragraph({
    ...sp(0, 0, 280),
    shading: { type: ShadingType.CLEAR, fill: "F0F4F8" },
    border: { left: { style: BorderStyle.SINGLE, size: 12, color: c(P.accent), space: 6 } },
    indent: { left: 480 },
        children: [new TextRun({ text, size: 20, font: { ascii: "Courier New", eastAsia: "Courier New" }, color: "1A2E3A" })],
  });
}

function note(text, color = "E67E22") {
  return new Paragraph({
    ...sp(60, 60, 280),
    shading: { type: ShadingType.CLEAR, fill: "FEF9F0" },
    border: { left: { style: BorderStyle.SINGLE, size: 12, color, space: 6 } },
    indent: { left: 300 },
    children: [new TextRun({ text, size: 22, color, italic: true, font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })],
  });
}

function divider() {
  return new Paragraph({
    ...sp(120, 120),
    border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: c(P.surface), space: 0 } },
    children: [],
  });
}

function emptyLine(before = 0) {
  return new Paragraph({ ...sp(before, 0, 240), children: [] });
}

// ── Table builder ────────────────────────────────────────────────────────────
function buildTable(headers, rows, widths) {
  const totalW = widths.reduce((a, b) => a + b, 0);
  const headerRow = new TableRow({
    tableHeader: true,
    cantSplit: true,
    children: headers.map((h, i) =>
      new TableCell({
        width: { size: Math.round((widths[i] / totalW) * 100), type: WidthType.PERCENTAGE },
        shading: { type: ShadingType.CLEAR, fill: P.table.headerBg },
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: h, bold: true, color: P.table.headerText, size: 20, font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })],
        })],
      })
    ),
  });

  const dataRows = rows.map((row, ri) =>
    new TableRow({
      cantSplit: true,
      children: row.map((cell, ci) =>
        new TableCell({
          width: { size: Math.round((widths[ci] / totalW) * 100), type: WidthType.PERCENTAGE },
          shading: ri % 2 === 0
            ? { type: ShadingType.CLEAR, fill: P.table.surface }
            : { type: ShadingType.CLEAR, fill: "FFFFFF" },
          margins: { top: 60, bottom: 60, left: 120, right: 120 },
          children: [new Paragraph({
            children: [new TextRun({ text: cell, size: 20, color: c(P.body), font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" } })],
          })],
        })
      ),
    })
  );

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: P.table.accentLine },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: P.table.accentLine },
      left: NB, right: NB,
      insideHorizontal: { style: BorderStyle.SINGLE, size: 1, color: P.table.innerLine },
      insideVertical: NB,
    },
    rows: [headerRow, ...dataRows],
  });
}

// ── Cover (R1 Pure Paragraph Left) ──────────────────────────────────────────
function buildCover() {
  const wrapperTable = new Table({
    width: { size: 11906, type: WidthType.DXA },
    borders: allNoBorders,
    rows: [
      new TableRow({
        height: { value: 16838, rule: "exact" },
        children: [
          new TableCell({
            width: { size: 11906, type: WidthType.DXA },
            shading: { type: ShadingType.CLEAR, fill: "1A5276" },
            borders: allNoBorders,
            verticalAlign: "top",
            margins: { left: 0, right: 0, top: 0, bottom: 0 },
            children: [
              // Top accent bar (thin)
              new Table({
                width: { size: 11906, type: WidthType.DXA },
                borders: allNoBorders,
                rows: [
                  new TableRow({
                    height: { value: 280, rule: "exact" },
                    children: [new TableCell({
                      width: { size: 11906, type: WidthType.DXA },
                      shading: { type: ShadingType.CLEAR, fill: "2E86C1" },
                      borders: allNoBorders,
                      verticalAlign: "top",
                      children: [new Paragraph({ children: [] })],
                    })],
                  }),
                ],
              }),

              // Spacer
              new Paragraph({ spacing: { before: 3200 }, children: [] }),

              // Label kecil
              new Paragraph({
                indent: { left: 1200 },
                spacing: { before: 0, after: 160, line: 280 },
                children: [new TextRun({
                  text: "PKM — Program Kreativitas Mahasiswa",
                  size: 20, color: "A8C8E0", font: { ascii: "Calibri" }, characterSpacing: 40,
                })],
              }),

              // Judul utama
              new Paragraph({
                indent: { left: 1200 },
                spacing: { before: 0, after: 80, line: Math.ceil(40 * 23), lineRule: "atLeast" },
                children: [new TextRun({
                  text: "MedSign AI",
                  size: 80, bold: true, color: "FFFFFF",
                  font: { ascii: "Calibri", eastAsia: "SimHei" },
                })],
              }),
              new Paragraph({
                indent: { left: 1200 },
                spacing: { before: 0, after: 240, line: Math.ceil(36 * 23), lineRule: "atLeast" },
                children: [new TextRun({
                  text: "Dataset Collection & Training",
                  size: 56, bold: true, color: "A8C8E0",
                  font: { ascii: "Calibri" },
                })],
              }),

              // Garis aksen (paragraph border)
              new Paragraph({
                indent: { left: 1200, right: 1200 },
                spacing: { before: 0, after: 320 },
                border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: "2E86C1", space: 0 } },
                children: [],
              }),

              // Subtitle / deskripsi singkat
              new Paragraph({
                indent: { left: 1200 },
                spacing: { before: 0, after: 80, line: 300 },
                children: [new TextRun({
                  text: "Panduan Skema Pengambilan Dataset dan Training Model",
                  size: 28, color: "C8DDF0", font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" },
                })],
              }),
              new Paragraph({
                indent: { left: 1200 },
                spacing: { before: 0, after: 0, line: 300 },
                children: [new TextRun({
                  text: "Sistem Pendeteksi Bahasa Isyarat Indonesia untuk Komunikasi Inklusif Tenaga Medis dan Tunarungu",
                  size: 22, color: "8AAEC8", font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" },
                })],
              }),

              // Spacer bawah
              new Paragraph({ spacing: { before: 3800 }, children: [] }),

              // Meta info
              new Paragraph({
                indent: { left: 1200 },
                spacing: { before: 0, after: 60, line: 280 },
                border: { top: { style: BorderStyle.SINGLE, size: 2, color: "4A7A9B", space: 12 } },
                children: [new TextRun({ text: "Tim PKM MedSign AI  ·  2026", size: 20, color: "A8C8E0", font: { ascii: "Calibri" } })],
              }),
              new Paragraph({
                indent: { left: 1200 },
                spacing: { before: 0, after: 0, line: 280 },
                children: [new TextRun({ text: "albert_william  ·  albert_cheng  ·  glenn  ·  loren", size: 18, color: "7A9AB8", font: { ascii: "Calibri" } })],
              }),
            ],
          }),
        ],
      }),
    ],
  });
  return [wrapperTable];
}

// ── Image helper ─────────────────────────────────────────────────────────────
function embedImage(filename, widthPx, heightPx) {
  const imgPath = path.join(__dirname, filename);
  if (!fs.existsSync(imgPath)) {
    return new Paragraph({
      ...sp(80, 80),
      shading: { type: ShadingType.CLEAR, fill: "EDF3F8" },
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: `[Gambar: ${filename}]`, size: 20, color: "8899AA", italic: true })],
    });
  }
  const imgBuffer = fs.readFileSync(imgPath);
  // Scale to fit 14cm wide (≈ 530px at 96dpi)
  const targetW = 530;
  const scale   = targetW / widthPx;
  const targetH = Math.round(heightPx * scale);
  return new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 120 },
    children: [
      new ImageRun({
        data: imgBuffer,
        transformation: { width: targetW, height: targetH },
        type: "png",
      }),
    ],
  });
}

// ── Footer builder ────────────────────────────────────────────────────────────
function buildFooter() {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 60, after: 0, line: 240 },
        border: { top: { style: BorderStyle.SINGLE, size: 2, color: c(P.accent), space: 4 } },
        children: [
          new TextRun({ text: "MedSign AI \u2014 Dataset & Training Guide  \u00b7  Halaman ", size: 18, color: c(P.secondary) }),
          new TextRun({ children: [PageNumber.CURRENT], size: 18, color: c(P.secondary) }),
          new TextRun({ text: " dari ", size: 18, color: c(P.secondary) }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: c(P.secondary) }),
        ],
      }),
    ],
  });
}

// ════════════════════════════════════════════════════════════════════════════
//  CONTENT
// ════════════════════════════════════════════════════════════════════════════
function buildBody() {
  const els = [];

  // ── 1. Ringkasan ─────────────────────────────────────────────────────────
  els.push(h1("1. Ringkasan Sistem"));
  els.push(body("MedSign AI adalah sistem pendeteksi bahasa isyarat Indonesia (BISINDO) berbasis machine learning yang dirancang untuk memfasilitasi komunikasi antara tenaga medis dan pasien tunarungu. Dokumen ini menjelaskan skema operasional pengambilan dataset dan pelatihan model secara lengkap \u2014 dari cara membuka aplikasi hingga menghasilkan file model TFLite yang siap digunakan."));
  els.push(body("Setiap anggota PKM dapat merekam dataset secara mandiri melalui browser tanpa perlu mendampingi satu sama lain atau menjalankan perintah teknis. Sistem Web UI yang telah dirancang memungkinkan proses perekaman, monitoring keseimbangan data, dan pelatihan model dilakukan dari satu antarmuka yang terintegrasi."));
  els.push(emptyLine(80));

  // Tabel ringkasan kontrak data
  els.push(bodyBold("Kontrak Data (Tidak Boleh Diubah Setelah Model Dilatih)"));
  els.push(emptyLine(40));
  els.push(buildTable(
    ["Parameter", "Nilai", "Keterangan"],
    [
      ["Frame per sequence", "30", "Jumlah frame yang direkam per isyarat"],
      ["Fitur per frame", "63", "21 titik landmark tangan \u00d7 x/y/z"],
      ["Format file", ".npy shape (30, 63)", "NumPy array float32"],
      ["Minimum iterasi per kata", "5", "Per orang per kata"],
      ["Minimum total per kata", "20", "5 iterasi \u00d7 4 signer"],
      ["Penamaan signer", "nama asli lowercase", "Contoh: albert_william"],
    ],
    [3, 3, 4]
  ));
  els.push(emptyLine(80));

  // ── 2. Cara Run ───────────────────────────────────────────────────────────
  els.push(h1("2. Cara Menjalankan Sistem"));
  els.push(body("Sistem terdiri dari dua komponen yang harus berjalan bersamaan: backend FastAPI (Python) dan frontend React. Keduanya dijalankan dari laptop yang sama \u2014 cukup buka dua jendela terminal."));

  els.push(h2("2.1 Jalankan Backend (Terminal 1)"));
  els.push(code("cd D:\\PKM\\medsign-ai\\backend"));
  els.push(code(".\\venv\\Scripts\\activate"));
  els.push(code("uvicorn app.main:app --reload --port 8000"));
  els.push(note("\u26a0\ufe0f  Backend harus berjalan terlebih dahulu sebelum membuka browser. Pastikan tidak ada error merah di terminal ini."));
  els.push(emptyLine(60));

  els.push(h2("2.2 Jalankan Frontend (Terminal 2)"));
  els.push(code("cd D:\\PKM\\medsign-ai\\frontend"));
  els.push(code("npm run dev"));
  els.push(emptyLine(60));

  els.push(h2("2.3 Buka di Browser"));
  els.push(code("http://localhost:5173/data-collection"));
  els.push(note("\ud83d\udca1  Anggota PKM lain cukup membuka URL ini dari laptop yang sama. Tidak perlu install apapun, tidak perlu paham coding."));
  els.push(emptyLine(80));

  // ── 3. Alur Rekam Dataset ─────────────────────────────────────────────────
  els.push(h1("3. Alur Rekam Dataset"));
  els.push(body("Berikut adalah alur lengkap dari membuka browser hingga selesai merekam semua kata dalam satu sesi rekam."));

  els.push(h2("3.1 Halaman Rekam Dataset"));
  els.push(emptyLine(40));
  els.push(embedImage("mockup_data_collection.png", 1536, 1024));
  els.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 40, after: 120 },
    children: [new TextRun({ text: "Gambar 1. Tampilan halaman Rekam Dataset", size: 18, italic: true, color: c(P.secondary) })],
  }));
  els.push(emptyLine(40));

  els.push(body("Halaman ini memiliki tiga langkah yang harus diselesaikan secara berurutan sebelum sesi rekam dimulai:"));
  els.push(bullet("\u2460 Pilih Signer \u2014 pilih nama kamu dari dropdown, atau ketik nama baru jika belum ada."));
  els.push(bullet("\u2461 Pilih Kata \u2014 centang kata-kata yang ingin direkam sesi ini. Kata dapat disaring per kategori (Gejala Umum, Pernapasan, Komunikasi Dasar, dll.)."));
  els.push(bullet("\u2462 Set Iterasi \u2014 masukkan jumlah pengulangan per kata (minimum 5). Estimasi waktu otomatis muncul di bawah input."));
  els.push(bullet("Klik tombol \u25b6 Mulai Rekam untuk memulai sesi."));
  els.push(emptyLine(60));

  els.push(h2("3.2 Sesi Rekam Live"));
  els.push(emptyLine(40));
  els.push(embedImage("mockup_record_session.png", 1400, 760));
  els.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 40, after: 120 },
    children: [new TextRun({ text: "Gambar 2. Tampilan sesi rekam live dengan webcam aktif", size: 18, italic: true, color: c(P.secondary) })],
  }));
  els.push(emptyLine(40));

  els.push(body("Setelah klik Mulai Rekam, sistem akan memandu proses perekaman secara otomatis:"));
  els.push(bullet("Nama kata yang akan direkam muncul besar di tengah layar."));
  els.push(bullet("Countdown 3\u2026 2\u2026 1\u2026 ditampilkan \u2014 posisikan tangan sebelum hitungan habis."));
  els.push(bullet("Webcam aktif dan MediaPipe mengekstrak 30 frame landmark tangan secara otomatis."));
  els.push(bullet("Progress bar frame (0\u201330) menampilkan progres perekaman satu take."));
  els.push(bullet("Setelah 30 frame terkumpul, data otomatis dikirim ke server dan take berikutnya dimulai."));
  els.push(bullet("Panel antrian kata di kanan menampilkan status semua kata yang akan direkam sesi ini."));
  els.push(emptyLine(40));

  els.push(bodyBold("Tombol Kontrol Selama Sesi:"));
  els.push(buildTable(
    ["Tombol", "Fungsi"],
    [
      ["\u23f9 Batal", "Hentikan sesi. Data yang sudah tersimpan tetap ada."],
      ["\u23ed Skip Kata Ini", "Lewati kata ini, lanjut ke kata berikutnya."],
      ["\ud83d\udd01 Ulang Take", "Hapus take terakhir dan rekam ulang."],
    ],
    [2, 8]
  ));
  els.push(emptyLine(80));

  // ── 4. Balance Checker ────────────────────────────────────────────────────
  els.push(h1("4. Balance Checker"));
  els.push(emptyLine(40));
  els.push(embedImage("mockup_balance.png", 1400, 720));
  els.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 40, after: 120 },
    children: [new TextRun({ text: "Gambar 3. Tampilan Balance Checker \u2014 tabel jumlah sampel per kata per signer", size: 18, italic: true, color: c(P.secondary) })],
  }));
  els.push(emptyLine(40));

  els.push(body("Balance Checker menampilkan tabel jumlah sampel per kata per signer secara real-time. Halaman ini diakses di:"));
  els.push(code("http://localhost:5173/data-collection/balance"));
  els.push(emptyLine(40));

  els.push(bodyBold("Status Alert Otomatis:"));
  els.push(buildTable(
    ["Status", "Kondisi", "Aksi yang Disarankan"],
    [
      ["\u2705 Cukup", "Total \u2265 (5 \u00d7 jumlah signer aktif)", "Kata ini siap untuk training"],
      ["\u26a0\ufe0f Kurang", "Total > 0 tapi di bawah minimum", "Minta signer yang belum rekam untuk menambah iterasi"],
      ["\ud83d\udd34 Belum", "Total = 0, tidak ada satu pun data", "Harus direkam sebelum bisa dilatih"],
    ],
    [2, 4, 4]
  ));
  els.push(emptyLine(80));

  // ── 5. Training Model ─────────────────────────────────────────────────────
  els.push(h1("5. Cara Membuat Model"));
  els.push(emptyLine(40));
  els.push(embedImage("mockup_training.png", 1400, 720));
  els.push(new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 40, after: 120 },
    children: [new TextRun({ text: "Gambar 4. Tampilan panel Training \u2014 konfigurasi kata, epoch, dan arsitektur", size: 18, italic: true, color: c(P.secondary) })],
  }));
  els.push(emptyLine(40));

  els.push(body("Pelatihan model hanya bisa dilakukan setelah semua kata yang dipilih memiliki cukup data (minimal 5 sampel valid per signer per kata). Training dijalankan oleh Albert dari panel Training di browser atau langsung via terminal."));

  els.push(h2("5.1 Konfigurasi Training"));
  els.push(buildTable(
    ["Parameter", "Pilihan", "Rekomendasi PKM"],
    [
      ["Kata yang dilatih", "Subset dari kata yang sudah punya data", "Semua kata yang sudah \u2265 20 sampel total"],
      ["Jumlah Epoch", "10 / 30 / 50 / 100 atau custom", "50 epoch untuk akurasi awal yang baik"],
      ["Arsitektur", "GRU / LSTM / Transformer", "GRU \u2014 cepat dan terbukti di sistem ini"],
    ],
    [3, 4, 3]
  ));
  els.push(emptyLine(60));

  els.push(h2("5.2 Via Terminal (Cara Langsung)"));
  els.push(body("Jika ingin menjalankan training langsung dari terminal tanpa membuka browser:"));
  els.push(code("cd D:\\PKM\\medsign-ai"));
  els.push(code(".\\backend\\venv\\Scripts\\python.exe .\\backend\\training\\validate_dataset.py --quarantine-invalid"));
  els.push(code(".\\backend\\venv\\Scripts\\python.exe .\\backend\\training\\train_clinical_model.py ^"));
  els.push(code("    --architecture gru ^"));
  els.push(code("    --labels sakit,nyeri,batuk,demam,ya,tidak,tolong ^"));
  els.push(code("    --epochs 50"));
  els.push(note("\ud83d\udca1  Jalankan validate_dataset.py terlebih dahulu untuk memindahkan sampel invalid ke folder karantina sebelum training dimulai."));
  els.push(emptyLine(60));

  els.push(h2("5.3 Output Model"));
  els.push(body("Setelah training selesai, file berikut akan dihasilkan secara otomatis:"));
  els.push(buildTable(
    ["File", "Lokasi", "Fungsi"],
    [
      ["medsign_mvp_v1.tflite", "backend/models/", "Model produksi \u2014 langsung dipakai API"],
      ["medsign_mvp_v1.h5", "backend/models/", "Model Keras (backup)"],
      ["classification_report_*.json", "backend/reports/", "Laporan akurasi per kata"],
      ["confusion_matrix_*.csv", "backend/reports/", "Matriks konfusi \u2014 untuk analisis"],
      ["DATASET_HEALTH_REPORT.md", "backend/reports/", "Laporan kesehatan dataset"],
    ],
    [3, 3, 4]
  ));
  els.push(note("\u2714\ufe0f  File .tflite langsung aktif di endpoint prediksi (/api/v1/stream) setelah backend di-restart."));
  els.push(emptyLine(80));

  // ── 6. Struktur Folder Dataset ────────────────────────────────────────────
  els.push(h1("6. Struktur Folder Dataset"));
  els.push(body("Dataset disimpan per signer (berdasarkan nama asli) di dalam folder per kata. Struktur ini memudahkan validasi, monitoring, dan penambahan signer baru kapan saja."));
  els.push(emptyLine(40));
  els.push(code("backend/data/landmarks/"));
  els.push(code("  sakit/"));
  els.push(code("    albert_william/"));
  els.push(code("      sakit_albert_william_20260708_001.npy"));
  els.push(code("      sakit_albert_william_20260708_002.npy"));
  els.push(code("      ..."));
  els.push(code("    albert_cheng/"));
  els.push(code("    glenn/"));
  els.push(code("    loren/"));
  els.push(code("  nyeri/"));
  els.push(code("    albert_william/"));
  els.push(code("    ..."));
  els.push(emptyLine(40));
  els.push(note("\u26a0\ufe0f  Jangan ubah nama folder signer setelah mulai merekam. Nama folder = nama signer yang digunakan di semua laporan dan training."));
  els.push(emptyLine(80));

  // ── 7. To Do List Implementasi ────────────────────────────────────────────
  els.push(h1("7. To Do List Implementasi"));
  els.push(body("Berikut daftar pekerjaan yang perlu diselesaikan untuk membangun sistem Web UI Data Collection ini. Dikelompokkan berdasarkan area kerja."));

  els.push(h2("7.1 Backend \u2014 API Baru"));
  els.push(buildTable(
    ["#", "Item", "Detail", "Status"],
    [
      ["1", "GET /api/v1/dataset/signers", "Scan folder landmarks/*/  \u2192 return list nama signer unik", "\u23f3 Belum"],
      ["2", "GET /api/v1/dataset/balance", "Hitung .npy per kata per signer, tambah status alert (\u2705/\u26a0\ufe0f/\ud83d\udd34)", "\u23f3 Belum"],
      ["3", "POST /api/v1/dataset/train", "Terima {labels, epochs, architecture}, jalankan training, stream log via SSE", "\u23f3 Belum"],
      ["4", "Update train_clinical_model.py", "Tambah argumen --labels (subset kata) dan --epochs (jumlah iterasi)", "\u23f3 Belum"],
      ["5", "Validasi nama signer", "Pastikan input nama signer menggunakan format lowercase_underscore", "\u23f3 Belum"],
    ],
    [1, 3, 5, 2]
  ));
  els.push(emptyLine(60));

  els.push(h2("7.2 Frontend \u2014 Halaman Baru"));
  els.push(buildTable(
    ["#", "Komponen / Halaman", "Detail", "Status"],
    [
      ["1", "Halaman /data-collection", "Layout 3 langkah: pilih signer \u2192 pilih kata \u2192 set iterasi", "\u23f3 Belum"],
      ["2", "Dropdown Signer", "Load dari API, ada opsi tambah signer baru", "\u23f3 Belum"],
      ["3", "Checklist Kata per Kategori", "192 kata dari labels.json, bisa filter per kategori, select all/none", "\u23f3 Belum"],
      ["4", "Input Iterasi + Estimasi Waktu", "Validasi min 5, estimasi otomatis: iterasi \u00d7 kata \u00d7 4 detik", "\u23f3 Belum"],
      ["5", "Komponen RecordSession", "Webcam + countdown + progress bar frame 0\u201330 + antrian kata", "\u23f3 Belum"],
      ["6", "Alert Tangan Tidak Terdeteksi", "Warning jika tangan hilang > 5 frame berturut-turut", "\u23f3 Belum"],
      ["7", "Halaman /balance", "Tabel balance + summary cards + tombol refresh & export CSV", "\u23f3 Belum"],
      ["8", "Halaman /training", "Konfigurasi training + log streaming SSE + progress bar per label", "\u23f3 Belum"],
      ["9", "Tambah navigasi sidebar", "Tambah link ke halaman-halaman baru di sidebar yang sudah ada", "\u23f3 Belum"],
    ],
    [1, 3, 5, 2]
  ));
  els.push(emptyLine(80));

  // ── 8. Catatan Penting ────────────────────────────────────────────────────
  els.push(h1("8. Catatan Penting"));
  els.push(buildTable(
    ["Aturan", "Penjelasan"],
    [
      ["Jangan ubah labels.json setelah model dilatih", "Kontrak data beku setelah training. Menambah kata berarti melatih ulang model dari awal."],
      ["Signer ID = nama asli lowercase underscore", "Konsisten di semua sesi. Contoh: albert_william, bukan Albert_William atau albert william."],
      ["MediaPipe jalan di browser", "Anggota tidak perlu install Python atau paket apapun di laptop mereka."],
      ["Training hanya dari laptop Albert", "Membutuhkan backend Python + TensorFlow yang hanya ada di laptop utama."],
      ["Dataset Fathur disimpan terpisah", "200 kata, 2 take/kata dari Mas Fathur TIDAK dimasukkan ke data/landmarks. Simpan di folder tersendiri."],
      ["Minimal 5 iterasi per kata per signer", "Di bawah angka ini model tidak akan cukup bervariasi dan bisa overfit pada satu gaya tangan."],
    ],
    [4, 6]
  ));
  els.push(emptyLine(80));

  // ── 9. Referensi Teknis ───────────────────────────────────────────────────
  els.push(h1("9. Referensi File Teknis"));
  els.push(buildTable(
    ["File", "Lokasi", "Fungsi"],
    [
      ["capture_landmarks.py", "backend/training/", "Rekam satu label dari webcam ke file .npy (CLI)"],
      ["collect_signer_dataset.py", "backend/training/", "Workflow rekam semua label untuk satu signer (CLI)"],
      ["validate_dataset.py", "backend/training/", "Validasi semua sampel, karantina yang invalid"],
      ["train_clinical_model.py", "backend/training/", "Latih model GRU dan ekspor ke .tflite"],
      ["data_collection.py", "backend/app/routes/", "Endpoint POST /save-sample (sudah ada)"],
      ["labels.json", "backend/data/metadata/", "Sumber kebenaran tunggal untuk semua 192 label kata"],
      ["recordings.csv", "backend/data/metadata/", "Log metadata setiap rekaman yang berhasil disimpan"],
      ["DataCollection.jsx", "frontend/src/pages/", "Halaman /data-collection yang perlu dibuat baru"],
    ],
    [3, 3, 4]
  ));
  els.push(emptyLine(40));

  return els;
}

// ── Assemble & Write ─────────────────────────────────────────────────────────
async function main() {
  const doc = new Document({
    styles: {
      default: {
        document: {
          run: {
            font: { ascii: "Calibri", eastAsia: "Microsoft YaHei" },
            size: 24,
            color: c(P.body),
          },
          paragraph: { spacing: { line: 312 } },
        },
        heading1: { run: { font: { ascii: "Calibri", eastAsia: "SimHei" }, size: 32, bold: true, color: c(P.primary) } },
        heading2: { run: { font: { ascii: "Calibri", eastAsia: "SimHei" }, size: 28, bold: true, color: c(P.accent) } },
        heading3: { run: { font: { ascii: "Calibri", eastAsia: "SimHei" }, size: 24, bold: true, color: c(P.primary) } },
      },
    },
    sections: [
      // ── Cover section (no margins, no footer)
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 0, bottom: 0, left: 0, right: 0 },
          },
        },
        children: buildCover(),
      },
      // ── Body section
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 },
            margin: { top: 1440, bottom: 1440, left: 1701, right: 1417 },
            pageNumbers: { start: 1, formatType: "decimal" },
          },
        },
        footers: { default: buildFooter() },
        children: buildBody(),
      },
    ],
  });

  const outPath = path.join(__dirname, "MedSign_AI_Dataset_Guide.docx");
  const buf = await Packer.toBuffer(doc);
  fs.writeFileSync(outPath, buf);
  console.log("\u2714 Dokumen berhasil dibuat:", outPath);
}

main().catch(err => { console.error(err); process.exit(1); });
