import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowLeft, BookOpen, User, Stethoscope, Database, 
  HelpCircle, ChevronDown, Video, CheckCircle2, Sliders,
  Play, RefreshCw, FileText, BrainCircuit, Activity, Cloud, Cpu, Volume2
} from 'lucide-react';

export const UserManual = ({ setView }) => {
  const [activeFaq, setActiveFaq] = useState(null);

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const toggleFaq = (index) => {
    setActiveFaq(activeFaq === index ? null : index);
  };

  const faqData = [
    {
      q: "Apakah video saya disimpan?",
      a: "Tidak. Keamanan data pasien adalah prioritas kami. Sistem tidak menyimpan atau mentransfer video kamera Anda. MediaPipe memproses koordinat landmark secara lokal di browser, dan hanya mengirimkan 63 koordinat numerik float ke backend FastAPI."
    },
    {
      q: "Bagaimana jika gesture tidak dikenali?",
      a: "Jika gesture tidak mencapai ambang batas keyakinan (confidence threshold), sistem tidak akan melafalkan dugaan mentah. Pengguna akan melihat pesan untuk mengulangi gerakan isyarat atau memilih salah satu dari daftar rekomendasi kata medis di layar."
    },
    {
      q: "Apakah sistem membutuhkan koneksi internet?",
      a: "Ya. Model klasifikasi isyarat berbasis LSTM/GRU berjalan di server backend FastAPI. Koordinat jari dikirim menggunakan WebSocket berlatensi rendah, sehingga koneksi internet/jaringan yang stabil sangat dibutuhkan untuk sinkronisasi real-time."
    },
    {
      q: "Bisakah digunakan di rumah sakit?",
      a: "MedSign AI saat ini merupakan purwarupa PKM-KC yang diuji coba untuk lingkungan klinik. Dengan optimasi tambahan dan pengembangan kamus medis terstandarisasi, sistem ini sangat potensial untuk diimplementasikan di rumah sakit atau apotek umum."
    }
  ];

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 py-4 animate-slide-up text-slate-800">
      {/* Header */}
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
          <h2 className="text-lg font-black text-slate-950">MedSign AI Docs</h2>
        </div>
      </div>

      {/* Hero Section */}
      <section className="glass-panel rounded-[36px] p-6 md:p-10 bg-gradient-to-br from-white/80 via-white/40 to-violet-500/5 border border-white/60 shadow-xl grid gap-8 md:grid-cols-[1.2fr_0.8fr] items-center">
        <div className="flex flex-col gap-4">
          <span className="soft-chip self-start rounded-full px-3 py-1.5 text-[10px] font-black uppercase text-sky-700 border border-sky-300/30 bg-sky-500/10">
            📖 Manual Pengguna &amp; Dokumentasi
          </span>
          <h1 className="text-3xl md:text-5xl font-black text-slate-950 leading-tight tracking-tight">
            Panduan Operasional <span className="bg-gradient-to-r from-sky-600 to-violet-600 bg-clip-text text-transparent">MedSign AI</span>
          </h1>
          <p className="text-sm font-semibold leading-7 text-slate-655">
            Pelajari cara menggunakan MedSign AI untuk mendukung komunikasi antara pasien tunarungu dan tenaga medis melalui penerjemahan BISINDO berbasis Artificial Intelligence secara real-time.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 mt-2">
            <button
              onClick={() => scrollToSection('manual')}
              className="glass-button glass-button-primary rounded-2xl px-6 py-3 text-xs font-black uppercase shadow-lg shadow-sky-500/20 active:scale-[0.98] transition-all"
            >
              Mulai Panduan
            </button>
            <button
              onClick={() => setView('home')}
              className="glass-button rounded-2xl px-6 py-3 text-xs font-black uppercase border border-slate-200 hover:bg-slate-50 text-slate-700 active:scale-[0.98] transition-all"
            >
              Lihat Video Demo
            </button>
          </div>
        </div>
        
        {/* Isometric SVG Illustration */}
        <div className="flex items-center justify-center p-4">
          <svg viewBox="0 0 320 280" className="w-full max-w-[280px] h-auto drop-shadow-2xl">
            <defs>
              <linearGradient id="skyViolet" x1="0" x2="1" y1="0" y2="1">
                <stop offset="0%" stopColor="#0ea5e9" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
              <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Doctor Tablet (Isometric Plane) */}
            <polygon points="60,200 240,160 260,220 80,260" fill="url(#skyViolet)" opacity="0.15" />
            <polygon points="60,200 240,160 260,220 80,260" fill="none" stroke="url(#skyViolet)" strokeWidth="2.5" />
            
            {/* Screen Content Grid */}
            <line x1="105" y1="210" x2="235" y2="181" stroke="#8b5cf6" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />
            <line x1="115" y1="230" x2="245" y2="201" stroke="#0ea5e9" strokeWidth="1.5" strokeDasharray="3 3" opacity="0.6" />

            {/* Patient Hands detecting (Wireframe Hand Projection) */}
            <g transform="translate(40, -10)">
              {/* Palm joints */}
              <circle cx="160" cy="100" r="7" fill="#8b5cf6" filter="url(#glow)" className="animate-pulse" />
              <line x1="160" y1="100" x2="130" y2="70" stroke="#8b5cf6" strokeWidth="2" />
              <line x1="160" y1="100" x2="150" y2="60" stroke="#8b5cf6" strokeWidth="2" />
              <line x1="160" y1="100" x2="175" y2="60" stroke="#0ea5e9" strokeWidth="2" />
              <line x1="160" y1="100" x2="195" y2="75" stroke="#0ea5e9" strokeWidth="2" />
              
              <circle cx="130" cy="70" r="4.5" fill="#8b5cf6" />
              <circle cx="150" cy="60" r="4.5" fill="#8b5cf6" />
              <circle cx="175" cy="60" r="4.5" fill="#0ea5e9" />
              <circle cx="195" cy="75" r="4.5" fill="#0ea5e9" />
            </g>

            {/* Camera Eye & rays */}
            <circle cx="160" cy="25" r="10" fill="#0f172a" />
            <circle cx="160" cy="25" r="4" fill="#0ea5e9" />
            <polygon points="160,25 90,130 230,130" fill="url(#skyViolet)" opacity="0.08" />

            {/* Sound waves (TTS output) */}
            <path d="M 230 190 Q 250 180 270 200" fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" className="animate-pulse" />
            <path d="M 235 180 Q 260 170 280 195" fill="none" stroke="#0ea5e9" strokeWidth="2" strokeLinecap="round" className="animate-pulse" />
          </svg>
        </div>
      </section>

      {/* Mobile Navigation Dropdown */}
      <div className="block md:hidden shrink-0 px-1 mb-2">
        <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider block mb-1">
          Daftar Panduan
        </label>
        <select
          onChange={(e) => scrollToSection(e.target.value)}
          className="glass-input w-full rounded-2xl py-2 px-3 text-xs font-black bg-white/60 border border-slate-200/60 text-slate-800"
        >
          <option value="manual">1. Manual Pengguna</option>
          <option value="workflow">2. Alur Kerja Sistem</option>
          <option value="communication">3. Alur Komunikasi Dua Arah</option>
          <option value="training">4. Perekaman Dataset &amp; Training</option>
          <option value="faq">5. Pertanyaan Umum (FAQ)</option>
          <option value="technology">6. Teknologi Stack MedSign AI</option>
        </select>
      </div>

      {/* Main Grid Layout */}
      <div className="grid gap-8 md:grid-cols-[240px_1fr] min-w-0 w-full overflow-hidden">
        {/* Navigation Sidebar */}
        <aside className="hidden md:block">
          <div className="sticky top-20 flex flex-col gap-1.5 p-1 bg-white/20 rounded-3xl border border-white/40 backdrop-blur-xl">
            {[
              { id: 'manual', label: 'Manual Pengguna', icon: BookOpen },
              { id: 'workflow', label: 'Alur Sistem', icon: Activity },
              { id: 'communication', label: 'Pasien & Dokter', icon: User },
              { id: 'training', label: 'Perekaman & Training', icon: Database },
              { id: 'faq', label: 'FAQ & ML', icon: HelpCircle },
              { id: 'technology', label: 'Teknologi Stack', icon: Sliders }
            ].map((sec) => {
              const Icon = sec.icon;
              return (
                <button
                  key={sec.id}
                  onClick={() => scrollToSection(sec.id)}
                  className="flex items-center gap-2.5 rounded-2xl border border-transparent px-4 py-3 text-left text-xs font-black text-slate-600 hover:bg-white hover:text-sky-700 active:scale-[0.98] transition-all"
                >
                  <Icon size={15} />
                  {sec.label}
                </button>
              );
            })}
          </div>
        </aside>

        {/* Content sections */}
        <div className="flex flex-col gap-10">
          
          {/* Section 1: Manual Pengguna */}
          <section id="manual" className="glass-panel rounded-[32px] p-6 md:p-8 flex flex-col gap-6 shadow-xl border border-white/60">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <BookOpen size={20} className="text-sky-600" />
              <h3 className="text-lg font-black text-slate-950 uppercase tracking-wide">1. Manual Pengguna</h3>
            </div>
            
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Card Pasien */}
              <div className="surface-panel rounded-3xl p-5 border border-sky-100/50 flex flex-col gap-3.5 hover:scale-[1.01] transition-all">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600">
                  <User size={20} />
                </div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">Modul Pasien</h4>
                <ul className="text-xs text-slate-550 font-semibold flex flex-col gap-2 leading-normal list-decimal list-inside">
                  <li>Buka aplikasi MedSign AI.</li>
                  <li>Aktifkan kamera laptop/tablet Anda.</li>
                  <li>Posisikan tangan dan lakukan gerakan BISINDO.</li>
                  <li>Isyarat diterjemahkan menjadi kosakata teks.</li>
                  <li>AI Context Engine otomatis menyusun kalimat formal.</li>
                  <li>Text-to-Speech menyuarakan kalimat verbal ke dokter.</li>
                </ul>
              </div>

              {/* Card Dokter */}
              <div className="surface-panel rounded-3xl p-5 border border-violet-100/50 flex flex-col gap-3.5 hover:scale-[1.01] transition-all">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-600">
                  <Stethoscope size={20} />
                </div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">Modul Dokter</h4>
                <ul className="text-xs text-slate-550 font-semibold flex flex-col gap-2 leading-normal list-decimal list-inside">
                  <li>Membaca kalimat terjemahan pasien di layar.</li>
                  <li>Mengetik pesan kustom untuk dibacakan asisten.</li>
                  <li>Mengirim quick response medis (preset salam/obat).</li>
                  <li>Menggunakan Voice Record untuk Speech-to-Text.</li>
                  <li>Riwayat sesi konsultasi tersimpan otomatis di log.</li>
                </ul>
              </div>

              {/* Card Administrator */}
              <div className="surface-panel rounded-3xl p-5 border border-amber-100/50 flex flex-col gap-3.5 hover:scale-[1.01] transition-all">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600">
                  <Sliders size={20} />
                </div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">Modul Administrator</h4>
                <ul className="text-xs text-slate-550 font-semibold flex flex-col gap-2 leading-normal list-decimal list-inside">
                  <li>Mengelola vocabulary dasar medis di labels.json.</li>
                  <li>Melihat sebaran dataset real-time (Balance Checker).</li>
                  <li>Melakukan training model clinical / alphabet mandiri.</li>
                  <li>Mengunduh log percakapan sesi medis dalam teks.</li>
                </ul>
              </div>

              {/* Card AI Engine */}
              <div className="surface-panel rounded-3xl p-5 border border-emerald-100/50 flex flex-col gap-3.5 hover:scale-[1.01] transition-all">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                  <Cpu size={20} />
                </div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider">Mesin AI &amp; Inference</h4>
                <ul className="text-xs text-slate-550 font-semibold flex flex-col gap-2 leading-normal list-decimal list-inside">
                  <li>Inference model TFLite untuk deteksi gerakan isyarat.</li>
                  <li>NLP Context Engine menyaring makna yang diucapkan.</li>
                  <li>Sentence generator menghasilkan output kalimat formal.</li>
                  <li>Confidence score memvalidasi kepastian deteksi.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Section 2: Alur Kerja Sistem */}
          <section id="workflow" className="glass-panel rounded-[32px] p-6 md:p-8 flex flex-col gap-6 shadow-xl border border-white/60">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <Activity size={20} className="text-sky-600" />
              <h3 className="text-lg font-black text-slate-950 uppercase tracking-wide">2. Alur Kerja Sistem</h3>
            </div>

            {/* Horizontal Diagram Flow (Vercel Style) */}
            <div className="overflow-x-auto pb-4 w-full max-w-full">
              <div className="flex items-center gap-2.5 min-w-[650px] justify-between px-2">
                {[
                  { label: "Camera Input", icon: Video },
                  { label: "MediaPipe Hands", icon: Sliders },
                  { label: "FastAPI WebSocket", icon: Cloud },
                  { label: "TFLite Model", icon: Cpu },
                  { label: "Sentence Generator", icon: BrainCircuit },
                  { label: "Web Speech TTS", icon: Volume2 }
                ].map((item, idx) => (
                  <React.Fragment key={item.label}>
                    <div className="flex flex-col items-center gap-1.5 bg-white/40 p-2.5 rounded-xl border border-slate-200 w-28 text-center shrink-0">
                      <item.icon size={16} className="text-sky-600" />
                      <span className="text-[9px] font-black uppercase text-slate-800">{item.label}</span>
                    </div>
                    {idx < 5 && <span className="text-slate-400 font-bold shrink-0">➔</span>}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Detail Steps */}
            <div className="flex flex-col gap-6 mt-2">
              {/* Step 1 */}
              <div className="flex flex-col sm:flex-row gap-5 items-start bg-slate-50/40 p-5 rounded-2xl border border-white/60">
                <div className="w-16 h-16 shrink-0 flex items-center justify-center bg-white rounded-xl border border-slate-200">
                  <svg viewBox="0 0 100 100" className="w-12 h-12 stroke-sky-500 fill-none" strokeWidth="2">
                    <path d="M50,90 Q30,70 30,50 C30,35 40,25 50,30 C60,25 70,35 70,50 Q70,70 50,90" />
                    <circle cx="50" cy="90" r="3" fill="#8b5cf6" />
                    <circle cx="30" cy="50" r="3" fill="#0ea5e9" />
                    <circle cx="70" cy="50" r="3" fill="#0ea5e9" />
                    <circle cx="50" cy="30" r="3" fill="#8b5cf6" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase">Step 1: Deteksi Koordinat Tangan (MediaPipe)</h4>
                  <p className="text-[11px] font-semibold text-slate-500 mt-1 leading-relaxed">
                    Kamera menangkap frame video, kemudian pustaka <strong>MediaPipe Hands</strong> di browser mengekstrak 21 titik sendi tangan (total 63 koordinat float) secara lokal tanpa mengirimkan gambar video ke server demi menjaga privasi pasien.
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col sm:flex-row gap-5 items-start bg-slate-50/40 p-5 rounded-2xl border border-white/60">
                <div className="w-16 h-16 shrink-0 flex items-center justify-center bg-white rounded-xl border border-slate-200">
                  <Cloud className="text-sky-600" size={24} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase">Step 2: Streaming WebSocket Real-time</h4>
                  <p className="text-[11px] font-semibold text-slate-500 mt-1 leading-relaxed">
                    Koordinat yang dideteksi dikirim secara terus-menerus ke server backend FastAPI menggunakan protokol <strong>WebSocket</strong> berlatensi rendah untuk memastikan pemrosesan data terus-menerus tanpa jeda.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col sm:flex-row gap-5 items-start bg-slate-50/40 p-5 rounded-2xl border border-white/60">
                <div className="w-16 h-16 shrink-0 flex items-center justify-center bg-white rounded-xl border border-slate-200">
                  <Cpu className="text-violet-600" size={24} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase">Step 3: Deep Learning Inference (LSTM/GRU &amp; MLP)</h4>
                  <p className="text-[11px] font-semibold text-slate-500 mt-1 leading-relaxed">
                    Backend mengevaluasi data landmark menggunakan model <strong>TensorFlow Lite</strong>. Arsitektur LSTM / GRU digunakan untuk isyarat kata klinis dinamis, sedangkan model MLP digunakan untuk mengenali ejaan alfabet secara statis.
                  </p>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex flex-col sm:flex-row gap-5 items-start bg-slate-50/40 p-5 rounded-2xl border border-white/60">
                <div className="w-16 h-16 shrink-0 flex items-center justify-center bg-white rounded-xl border border-slate-200">
                  <BrainCircuit className="text-emerald-600" size={24} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase">Step 4: AI Context-aware Sentence Generator</h4>
                  <p className="text-[11px] font-semibold text-slate-500 mt-1 leading-relaxed">
                    AI Context Engine menyusun kosakata isyarat medis (misal: <em>berapa, obat, ini</em>) menjadi kalimat formal Bahasa Indonesia yang koheren (<em>"Berapa harga obat ini?"</em>) tanpa mengubah maksud awal pasien.
                  </p>
                </div>
              </div>

              {/* Step 5 */}
              <div className="flex flex-col sm:flex-row gap-5 items-start bg-slate-50/40 p-5 rounded-2xl border border-white/60">
                <div className="w-16 h-16 shrink-0 flex items-center justify-center bg-white rounded-xl border border-slate-200">
                  <Volume2 className="text-rose-600" size={24} />
                </div>
                <div>
                  <h4 className="text-xs font-black text-slate-900 uppercase">Step 5: Text-to-Speech (Web Speech API)</h4>
                  <p className="text-[11px] font-semibold text-slate-500 mt-1 leading-relaxed">
                    Kalimat hasil penyusunan AI langsung dilafalkan oleh asisten suara menggunakan <strong>Web Speech API</strong> Bahasa Indonesia, sehingga dokter dapat mendengar penjelasan verbal secara instan.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Section 3: Pasien & Dokter */}
          <section id="communication" className="glass-panel rounded-[32px] p-6 md:p-8 flex flex-col gap-6 shadow-xl border border-white/60">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <User size={20} className="text-sky-600" />
              <h3 className="text-lg font-black text-slate-950 uppercase tracking-wide">3. Alur Komunikasi Dua Arah</h3>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Panel Pasien */}
              <div className="surface-panel rounded-3xl p-5 border border-sky-100 flex flex-col gap-4">
                <div className="flex items-center gap-2 text-sky-700 font-black uppercase text-xs">
                  <User size={16} /> Layar Pasien (Tablet)
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Gesture Input</span>
                  <div className="bg-slate-950/90 text-white rounded-xl p-3 font-mono text-xs">
                    [kepala] ➔ [sakit]
                  </div>
                  <span className="text-slate-400 text-center text-xs">➔ Proses AI ➔</span>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Kalimat di TTS dokter</span>
                  <div className="bg-emerald-500/10 border border-emerald-300 text-slate-900 rounded-xl p-3 font-black text-xs leading-relaxed">
                    "Saya mengalami sakit kepala."
                  </div>
                </div>
              </div>

              {/* Panel Dokter */}
              <div className="surface-panel rounded-3xl p-5 border border-emerald-100 flex flex-col gap-4">
                <div className="flex items-center gap-2 text-emerald-700 font-black uppercase text-xs">
                  <Stethoscope size={16} /> Layar Dokter (PC/Tablet)
                </div>
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Pesan Balasan Dokter</span>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-700 font-semibold text-xs leading-relaxed">
                    "Apakah nyerinya terus-menerus atau hanya saat bergerak?"
                  </div>
                  <span className="text-slate-400 text-center text-xs">➔ Terkirim ➔</span>
                  <span className="text-[10px] font-bold uppercase text-slate-400">Tampilan Teks Besar di Pasien</span>
                  <div className="bg-sky-500/10 border border-sky-300 text-slate-950 rounded-xl p-3 font-black text-sm text-center">
                    "Apakah nyerinya terus-menerus atau hanya saat bergerak?"
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Section 4: Perekaman & Training */}
          <section id="training" className="glass-panel rounded-[32px] p-6 md:p-8 flex flex-col gap-6 shadow-xl border border-white/60">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <Database size={20} className="text-sky-600" />
              <h3 className="text-lg font-black text-slate-950 uppercase tracking-wide">4. Perekaman Dataset &amp; Training</h3>
            </div>

            {/* Training Flow Diagram */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-50/40 p-4 rounded-2xl border border-white/60 text-[10px] font-black uppercase tracking-wider text-center text-slate-700">
              <div className="bg-white px-3 py-1.5 rounded border border-slate-200">Gesture</div>
              <span>➔</span>
              <div className="bg-white px-3 py-1.5 rounded border border-slate-200">Recording</div>
              <span>➔</span>
              <div className="bg-white px-3 py-1.5 rounded border border-slate-200">Dataset</div>
              <span>➔</span>
              <div className="bg-white px-3 py-1.5 rounded border border-slate-200">Training</div>
              <span>➔</span>
              <div className="bg-white px-3 py-1.5 rounded border border-slate-200">Validation</div>
              <span>➔</span>
              <div className="bg-white px-3 py-1.5 rounded border border-slate-200">Deploy</div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 text-xs">
              <div className="flex flex-col gap-1 bg-slate-50/30 p-4 rounded-xl border border-white/40">
                <span className="font-black text-slate-900 uppercase">1. Perekaman Sampel</span>
                <p className="text-slate-500 font-semibold leading-relaxed">
                  Buka menu perekaman, posisikan tangan Anda, lakukan isyarat BISINDO di depan kamera. Setiap sampel disimpan dalam bentuk file NumPy (.npy) yang berisi deretan koordinat 30 frame.
                </p>
              </div>
              <div className="flex flex-col gap-1 bg-slate-50/30 p-4 rounded-xl border border-white/40">
                <span className="font-black text-slate-900 uppercase">2. Evaluasi Keseimbangan</span>
                <p className="text-slate-500 font-semibold leading-relaxed">
                  Pantau data sebaran isyarat di tab <strong>Balance Checker</strong>. Pastikan tidak ada ketimpangan jumlah sampel per kata antar peraga untuk meningkatkan akurasi latih model.
                </p>
              </div>
              <div className="flex flex-col gap-1 bg-slate-50/30 p-4 rounded-xl border border-white/40">
                <span className="font-black text-slate-900 uppercase">3. Proses Latih Model</span>
                <p className="text-slate-500 font-semibold leading-relaxed">
                  Pilih kata target dan jalankan training mandiri di server. Setelah proses selesai, konfigurasikan model baru secara dinamis menggunakan panel Manajemen Model.
                </p>
              </div>
              <div className="flex flex-col gap-1 bg-slate-50/30 p-4 rounded-xl border border-white/40">
                <span className="font-black text-slate-900 uppercase">4. Deployment Instan</span>
                <p className="text-slate-500 font-semibold leading-relaxed">
                  Melalui fitur auto-reload di backend, model TensorFlow Lite (.tflite) baru dan labels sidecar (.json) akan otomatis aktif saat dipanggil untuk inferensi berikutnya.
                </p>
              </div>
            </div>
          </section>

          {/* Section 5: FAQ */}
          <section id="faq" className="glass-panel rounded-[32px] p-6 md:p-8 flex flex-col gap-6 shadow-xl border border-white/60">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <HelpCircle size={20} className="text-sky-600" />
              <h3 className="text-lg font-black text-slate-950 uppercase tracking-wide">5. Pertanyaan Umum (FAQ)</h3>
            </div>

            <div className="flex flex-col gap-3.5 select-none">
              {faqData.map((item, idx) => {
                const isOpen = activeFaq === idx;
                return (
                  <div key={idx} className="border border-slate-200 rounded-2xl bg-white/40 overflow-hidden transition-all">
                    <button
                      onClick={() => toggleFaq(idx)}
                      className="w-full flex items-center justify-between p-4 text-xs font-black text-slate-900 uppercase tracking-wide text-left hover:bg-white/60 transition-all"
                    >
                      <span>{item.q}</span>
                      <ChevronDown size={14} className={`transform transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && (
                      <div className="p-4 border-t border-slate-100 bg-white/70 text-xs font-semibold leading-relaxed text-slate-500 animate-slide-up">
                        {item.a}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>

          {/* Section 6: Teknologi Stack */}
          <section id="technology" className="glass-panel rounded-[32px] p-6 md:p-8 flex flex-col gap-6 shadow-xl border border-white/60 mb-6">
            <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
              <Sliders size={20} className="text-sky-600" />
              <h3 className="text-lg font-black text-slate-950 uppercase tracking-wide">6. Teknologi Stack MedSign AI</h3>
            </div>

            <div className="grid gap-5 md:grid-cols-3 text-xs">
              {/* Frontend Card */}
              <div className="surface-panel rounded-3xl p-5 border border-sky-100/50 flex flex-col gap-3">
                <span className="font-black text-sky-850 uppercase tracking-wider">Frontend Stack</span>
                <ul className="flex flex-col gap-2 text-slate-550 font-semibold leading-relaxed">
                  <li className="flex justify-between border-b border-slate-100/50 pb-1">
                    <span>Framework</span>
                    <span className="text-slate-800">React 18</span>
                  </li>
                  <li className="flex justify-between border-b border-slate-100/50 pb-1">
                    <span>Bundler</span>
                    <span className="text-slate-800">Vite 5</span>
                  </li>
                  <li className="flex justify-between border-b border-slate-100/50 pb-1">
                    <span>Styling</span>
                    <span className="text-slate-800">TailwindCSS 3</span>
                  </li>
                  <li className="flex justify-between border-b border-slate-100/50 pb-1">
                    <span>Pose Tracking</span>
                    <span className="text-slate-800">MediaPipe Hands</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Voice Synth</span>
                    <span className="text-slate-800">Web Speech API</span>
                  </li>
                </ul>
              </div>

              {/* Backend Card */}
              <div className="surface-panel rounded-3xl p-5 border border-violet-100/50 flex flex-col gap-3">
                <span className="font-black text-violet-850 uppercase tracking-wider">Backend Stack</span>
                <ul className="flex flex-col gap-2 text-slate-550 font-semibold leading-relaxed">
                  <li className="flex justify-between border-b border-slate-100/50 pb-1">
                    <span>Framework</span>
                    <span className="text-slate-800">FastAPI</span>
                  </li>
                  <li className="flex justify-between border-b border-slate-100/50 pb-1">
                    <span>Runtime</span>
                    <span className="text-slate-800">Python 3.11</span>
                  </li>
                  <li className="flex justify-between border-b border-slate-100/50 pb-1">
                    <span>Streaming</span>
                    <span className="text-slate-800">WebSocket</span>
                  </li>
                  <li className="flex justify-between border-b border-slate-100/50 pb-1">
                    <span>DL Runtime</span>
                    <span className="text-slate-800">TensorFlow Lite</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Logging</span>
                    <span className="text-slate-800">Session Logger</span>
                  </li>
                </ul>
              </div>

              {/* AI Engine Card */}
              <div className="surface-panel rounded-3xl p-5 border border-emerald-100/50 flex flex-col gap-3">
                <span className="font-black text-emerald-850 uppercase tracking-wider">AI / ML Engine</span>
                <ul className="flex flex-col gap-2 text-slate-550 font-semibold leading-relaxed">
                  <li className="flex justify-between border-b border-slate-100/50 pb-1">
                    <span>Gesture Model</span>
                    <span className="text-slate-800">LSTM / GRU</span>
                  </li>
                  <li className="flex justify-between border-b border-slate-100/50 pb-1">
                    <span>Spelling Model</span>
                    <span className="text-slate-800">MLP Static</span>
                  </li>
                  <li className="flex justify-between">
                    <span>Sentence Completion</span>
                    <span className="text-slate-800">NLP Context Engine</span>
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

