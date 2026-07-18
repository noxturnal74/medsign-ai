import React, { useState } from 'react';
import { 
  ArrowLeft, BookOpen, User, Stethoscope, Database, 
  HelpCircle, ChevronRight, Video, CheckCircle2, ShieldAlert,
  Play, RefreshCw, Trash2
} from 'lucide-react';

export const UserManual = ({ setView }) => {
  const [activeTab, setActiveTab] = useState('overview');

  const tabs = [
    { id: 'overview', label: 'Alur Sistem', icon: BookOpen },
    { id: 'users', label: 'Pasien & Dokter', icon: User },
    { id: 'collection', label: 'Perekaman & Training', icon: Database },
    { id: 'faq', label: 'FAQ & ML', icon: HelpCircle }
  ];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-2 animate-slide-up">
      {/* Page Header */}
      <div className="glass-panel flex items-center justify-between rounded-3xl p-4">
        <button
          onClick={() => setView('home')}
          className="glass-button rounded-2xl px-4 py-2 text-xs font-bold"
        >
          <ArrowLeft size={14} />
          Kembali
        </button>
        <div className="text-right">
          <span className="text-[10px] font-bold uppercase text-sky-700">Panduan Operasional</span>
          <h2 className="text-lg font-black text-slate-950">Manual Pengguna MedSign AI</h2>
        </div>
      </div>

      {/* Tabs Layout */}
      <div className="grid gap-6 md:grid-cols-[200px_1fr]">
        {/* Sidebar Navigation */}
        <div className="flex flex-col gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2.5 rounded-2xl border px-4 py-3 text-left text-xs font-bold transition-all ${
                  active
                    ? 'border-sky-300/60 bg-white text-sky-700 shadow-sm shadow-sky-900/5'
                    : 'border-transparent bg-white/20 text-slate-600 hover:bg-white/40 hover:text-slate-950'
                }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content Pane */}
        <div className="glass-panel rounded-[32px] p-6 md:p-8 flex flex-col gap-6 shadow-xl shadow-sky-900/5 min-h-[400px]">
          {activeTab === 'overview' && (
            <div className="flex flex-col gap-5 animate-slide-up">
              <div className="flex items-center gap-2">
                <BookOpen size={20} className="text-sky-600" />
                <h3 className="text-lg font-black text-slate-950">Alur Kerja Sistem MedSign AI</h3>
              </div>
              <p className="text-xs font-semibold leading-relaxed text-slate-600">
                MedSign AI dirancang untuk memecahkan hambatan komunikasi klinis antara pasien tunarungu dan tenaga medis. 
                Sistem menggunakan MediaPipe Hands di sisi klien untuk mendeteksi sendi jari dan memprediksi isyarat BISINDO secara real-time di backend.
              </p>

              <div className="relative border-l border-sky-200 pl-6 ml-3 flex flex-col gap-6 mt-2">
                {/* Step 1 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 text-[9px] font-bold text-white ring-4 ring-sky-50">1</div>
                  <h4 className="text-xs font-black text-slate-800 uppercase">Deteksi Koordinat Tangan</h4>
                  <p className="text-[11px] font-semibold leading-relaxed text-slate-500 mt-1">
                    Kamera menangkap frame video, lalu MediaPipe mengekstrak 21 titik sendi tangan (total 63 koordinat float) langsung di browser Anda.
                  </p>
                </div>
                {/* Step 2 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 text-[9px] font-bold text-white ring-4 ring-sky-50">2</div>
                  <h4 className="text-xs font-black text-slate-800 uppercase">WebSocket Streaming</h4>
                  <p className="text-[11px] font-semibold leading-relaxed text-slate-500 mt-1">
                    Koordinat yang dideteksi dikirim secara terus-menerus ke server backend FastAPI menggunakan WebSocket berkecepatan tinggi.
                  </p>
                </div>
                {/* Step 3 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 text-[9px] font-bold text-white ring-4 ring-sky-50">3</div>
                  <h4 className="text-xs font-black text-slate-800 uppercase">Deep Learning Inference</h4>
                  <p className="text-[11px] font-semibold leading-relaxed text-slate-500 mt-1">
                    Model TFLite (LSTM/GRU untuk kata dinamis, MLP untuk abjad) memproses koordinat di backend dan mengembalikan label prediksi beserta confidence score.
                  </p>
                </div>
                {/* Step 4 */}
                <div className="relative">
                  <div className="absolute -left-[31px] top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-sky-500 text-[9px] font-bold text-white ring-4 ring-sky-50">4</div>
                  <h4 className="text-xs font-black text-slate-800 uppercase">Umpan Balik Instan & TTS</h4>
                  <p className="text-[11px] font-semibold leading-relaxed text-slate-500 mt-1">
                    Frontend menampilkan kata, merangkai kalimat, dan membacakannya keras-keras via Text-to-Speech (TTS) Bahasa Indonesia.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="flex flex-col gap-5 animate-slide-up">
              <div className="flex items-center gap-2">
                <User size={20} className="text-sky-600" />
                <h3 className="text-lg font-black text-slate-950">Panduan Fitur Pasien & Dokter</h3>
              </div>

              {/* Patient Section */}
              <div className="surface-panel rounded-3xl p-5 flex flex-col gap-3">
                <h4 className="text-xs font-black text-sky-700 uppercase tracking-wide flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-sky-500" />
                  Menu Layar Pasien
                </h4>
                <ul className="flex flex-col gap-2.5 text-[11px] font-semibold text-slate-600">
                  <li className="flex gap-2">
                    <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>Mulai Kamera</strong>: Klik tombol biru untuk menyalakan kamera. MediaPipe akan menggambar kerangka sendi tangan Anda di atas feed video.</span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>Mode Eja (A-Z)</strong>: Aktifkan mode ini jika ingin mengeja kata demi huruf secara statis. Matikan untuk mendeteksi kata klinis medis secara dinamis (LSTM).</span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>Real-time Preview</strong>: Box hasil terjemahan di bawah kamera akan otomatis menampilkan kata dengan confidence terbesar dan menyertakan label konfirmasi.</span>
                  </li>
                </ul>
              </div>

              {/* Doctor Section */}
              <div className="surface-panel rounded-3xl p-5 flex flex-col gap-3">
                <h4 className="text-xs font-black text-emerald-700 uppercase tracking-wide flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Menu Layar Dokter
                </h4>
                <ul className="flex flex-col gap-2.5 text-[11px] font-semibold text-slate-600">
                  <li className="flex gap-2">
                    <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>Log Konsultasi Medis</strong>: Semua kata dari pasien atau respons ketikan dokter akan tersimpan dalam daftar riwayat percakapan secara teratur.</span>
                  </li>
                  <li className="flex gap-2">
                    <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                    <span><strong>Text-to-Speech (TTS)</strong>: Aplikasi otomatis mengucapkan teks Bahasa Indonesia yang terdeteksi untuk memudahkan komunikasi verbal.</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'collection' && (
            <div className="flex flex-col gap-5 animate-slide-up">
              <div className="flex items-center gap-2">
                <Database size={20} className="text-sky-600" />
                <h3 className="text-lg font-black text-slate-950">Perekaman Dataset & Pelatihan Model</h3>
              </div>

              {/* Recording Guide */}
              <div className="flex flex-col gap-1.5">
                <h4 className="text-xs font-black text-slate-800 uppercase">1. Tata Cara Merekam Sampel</h4>
                <p className="text-[11px] font-semibold leading-relaxed text-slate-500">
                  Pergilah ke tab <strong>Rekam Dataset</strong>. Pilih <strong>Signer ID</strong>, pilih kata target, posisikan tangan Anda, lalu klik <strong>Mulai Perekaman Sesi</strong>. 
                  Lakukan gerakan isyarat tepat di depan kamera. Setiap rekaman membutuhkan 30 frame data landmark. Rekam minimal 30 sampel per kata untuk kualitas terbaik.
                </p>
              </div>

              {/* Check Dataset */}
              <div className="flex flex-col gap-1.5">
                <h4 className="text-xs font-black text-slate-800 uppercase flex items-center gap-1">
                  2. Mengelola File Sampel & Penghapusan Masal
                </h4>
                <p className="text-[11px] font-semibold leading-relaxed text-slate-500">
                  Di tab <strong>Balance Checker</strong>, Anda dapat melihat peta sebaran jumlah sampel untuk tiap kata. Klik tombol <strong>Check Dataset</strong> pada suatu kata untuk membuka modal pengelola sampel. 
                  Anda dapat mencentang checkbox untuk memilih satu atau beberapa file sampel bermasalah, lalu menghapusnya secara masal dengan mengklik tombol <strong>Hapus Terpilih</strong>.
                </p>
              </div>

              {/* Training */}
              <div className="flex flex-col gap-1.5">
                <h4 className="text-xs font-black text-slate-800 uppercase">3. Melatih Model Mandiri</h4>
                <p className="text-[11px] font-semibold leading-relaxed text-slate-500">
                  Buka tab <strong>Training Model</strong>. Anda dapat memilih tipe arsitektur (LSTM/GRU), mengatur jumlah epoch, memilih kata target yang ingin dilatih, dan klik <strong>Mulai Training Model</strong>. 
                  Proses training berjalan secara asinkron dan melacak progressnya secara real-time. Setelah selesai, Anda dapat memilih untuk langsung menimpa model lama atau menyimpan baru dengan timestamp.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'faq' && (
            <div className="flex flex-col gap-5 animate-slide-up">
              <div className="flex items-center gap-2">
                <HelpCircle size={20} className="text-sky-600" />
                <h3 className="text-lg font-black text-slate-950">Pertanyaan Umum (FAQ) & ML Stabilitas</h3>
              </div>

              <div className="flex flex-col gap-4">
                <div className="border-b border-slate-100 pb-3">
                  <h4 className="text-xs font-black text-slate-800">Q: Kenapa status di bawah kamera "Posisikan tangan di layar" padahal tangan sudah diletakkan?</h4>
                  <p className="text-[11px] font-semibold leading-relaxed text-slate-500 mt-1">
                    A: Pastikan pencahayaan cukup terang, jarak tangan sekitar 70 cm dari kamera, dan telapak tangan menghadap penuh ke arah kamera sehingga MediaPipe dapat melacak sendi pergelangan (*wrist*) dengan stabil.
                  </p>
                </div>

                <div className="border-b border-slate-100 pb-3">
                  <h4 className="text-xs font-black text-slate-800">Q: Apakah saya harus me-restart backend setelah selesai melatih model baru?</h4>
                  <p className="text-[11px] font-semibold leading-relaxed text-slate-500 mt-1">
                    A: <strong>Tidak perlu!</strong> Aplikasi MedSign dilengkapi dengan fitur *auto-reload*. Setiap kali inferensi baru dipanggil, adapter backend akan mendeteksi perubahan tanggal file di disk dan langsung memuat model serta labels sidecar baru ke memori secara dinamis.
                  </p>
                </div>

                <div className="border-b border-slate-100 pb-3">
                  <h4 className="text-xs font-black text-slate-800">Q: Bagaimana cara melatih model Abjad (A-Z) jika dataset telah diupdate?</h4>
                  <p className="text-[11px] font-semibold leading-relaxed text-slate-500 mt-1">
                    A: Di tab **Training Model**, pilih **Tipe Model: Model Ejaan Abjad (MLP Statis)**, lalu klik mulai training. Backend akan otomatis memproses data gambar dari `backend/data/bisindo_alphabet` dan mengonversi model TFLite baru.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
