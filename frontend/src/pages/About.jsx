import React from 'react';
import { ArrowLeft, BookOpen, Code, Terminal, FileText, CheckCircle } from 'lucide-react';

export const About = ({ setView }) => {
  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto animate-slide-up py-4">
      
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/60 pb-4">
        <button
          onClick={() => setView('home')}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 font-semibold text-xs transition-all cursor-pointer"
        >
          <ArrowLeft size={14} />
          Kembali
        </button>
        <div className="text-right">
          <span className="text-[10px] font-bold font-mono tracking-widest text-sky-400 uppercase">
            Informasi Proyek
          </span>
          <h2 className="text-lg font-bold text-slate-200">Tentang MedSign AI</h2>
        </div>
      </div>

      {/* Main Info Card */}
      <div className="glass-panel p-8 rounded-3xl border border-slate-800 flex flex-col gap-6">
        <div>
          <h3 className="font-display font-bold text-2xl text-slate-100">Menembus Batas Sunyi dalam Layanan Medis</h3>
          <p className="text-slate-400 text-sm leading-relaxed mt-3 font-semibold">
            MedSign AI dikembangkan sebagai bagian dari proposal PKM-KC (Program Kreativitas Mahasiswa - Karsa Cipta) 2026 dan Skripsi Informatika Universitas Ma Chung. Platform ini menargetkan pemecahan kendala komunikasi medis bagi pasien tunarungu melalui otomatisasi terjemahan isyarat Bahasa Isyarat Indonesia (BISINDO) klinis.
          </p>
        </div>

        {/* Tech Stack details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-slate-900 pt-6">
          <div className="flex flex-col gap-3">
            <h4 className="font-bold text-sm text-sky-400 flex items-center gap-2">
              <Code size={16} />
              Arsitektur Frontend
            </h4>
            <ul className="flex flex-col gap-2 text-xs text-slate-400 font-semibold">
              <li className="flex items-center gap-2">
                <CheckCircle size={12} className="text-sky-500" />
                React 18 + Vite 5 (SPA Berlatensi Rendah)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={12} className="text-sky-500" />
                TailwindCSS 3 (UI Kontras Tinggi & Inklusif)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={12} className="text-sky-500" />
                MediaPipe Hands JS (Ekstraksi 21 Landmark Tangan)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={12} className="text-sky-500" />
                Web Speech API Native (id-ID Text-to-Speech)
              </li>
            </ul>
          </div>

          <div className="flex flex-col gap-3">
            <h4 className="font-bold text-sm text-emerald-400 flex items-center gap-2">
              <Terminal size={16} />
              Arsitektur Backend & ML
            </h4>
            <ul className="flex flex-col gap-2 text-xs text-slate-400 font-semibold">
              <li className="flex items-center gap-2">
                <CheckCircle size={12} className="text-emerald-500" />
                FastAPI Python 3.11 (WebSocket Streaming Endpoint)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={12} className="text-emerald-500" />
                Model Sequence LSTM (Klasifikasi 40 Kosakata)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={12} className="text-emerald-500" />
                TensorFlow Lite Interpreter (CPU-only Inference)
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle size={12} className="text-emerald-500" />
                PostgreSQL/Supabase (Logging Sesi & Audit)
              </li>
            </ul>
          </div>
        </div>

        {/* Documentation PDF list */}
        <div className="border-t border-slate-900 pt-6 flex flex-col gap-3">
          <h4 className="font-bold text-sm text-slate-200 flex items-center gap-2">
            <BookOpen size={16} className="text-amber-400" />
            Dokumen Persyaratan Proyek (Tersimpan di `docs/`)
          </h4>
          <p className="text-xs text-slate-500 max-w-lg leading-relaxed">
            Semua dokumen persyaratan, arsitektur, rencana kerja, dan alur visual telah disusun secara sistematis dan dapat diakses langsung pada folder lokal project Anda:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 mt-2">
            <div className="bg-slate-950/65 border border-slate-900 p-3 rounded-xl flex items-start gap-2.5 shadow-sm">
              <FileText size={16} className="text-sky-400 mt-0.5" />
              <div>
                <span className="text-[10px] font-bold text-slate-200 uppercase tracking-wide block">PRD.md.pdf</span>
                <span className="text-[8px] font-mono text-slate-600">Product Requirements</span>
              </div>
            </div>
            <div className="bg-slate-950/65 border border-slate-900 p-3 rounded-xl flex items-start gap-2.5 shadow-sm">
              <FileText size={16} className="text-sky-400 mt-0.5" />
              <div>
                <span className="text-[10px] font-bold text-slate-200 uppercase tracking-wide block">SRS.md.pdf</span>
                <span className="text-[8px] font-mono text-slate-600">Software Requirements</span>
              </div>
            </div>
            <div className="bg-slate-950/65 border border-slate-900 p-3 rounded-xl flex items-start gap-2.5 shadow-sm">
              <FileText size={16} className="text-sky-400 mt-0.5" />
              <div>
                <span className="text-[10px] font-bold text-slate-200 uppercase tracking-wide block">SDD.md.pdf</span>
                <span className="text-[8px] font-mono text-slate-600">Software Design</span>
              </div>
            </div>
            <div className="bg-slate-950/65 border border-slate-900 p-3 rounded-xl flex items-start gap-2.5 shadow-sm">
              <FileText size={16} className="text-sky-400 mt-0.5" />
              <div>
                <span className="text-[10px] font-bold text-slate-200 uppercase tracking-wide block">UI_UX_FLOW.md.pdf</span>
                <span className="text-[8px] font-mono text-slate-600">Wireframes & Flow</span>
              </div>
            </div>
            <div className="bg-slate-950/65 border border-slate-900 p-3 rounded-xl flex items-start gap-2.5 shadow-sm">
              <FileText size={16} className="text-sky-400 mt-0.5" />
              <div>
                <span className="text-[10px] font-bold text-slate-200 uppercase tracking-wide block">TASK_BREAKDOWN.md</span>
                <span className="text-[8px] font-mono text-slate-600">Sprint Roadmap</span>
              </div>
            </div>
            <div className="bg-slate-950/65 border border-slate-900 p-3 rounded-xl flex items-start gap-2.5 shadow-sm">
              <FileText size={16} className="text-sky-400 mt-0.5" />
              <div>
                <span className="text-[10px] font-bold text-slate-200 uppercase tracking-wide block">CONTEXT_PROMPT.md</span>
                <span className="text-[8px] font-mono text-slate-600">LLM Context File</span>
              </div>
            </div>
          </div>
        </div>

        {/* Medical disclaimer */}
        <div className="bg-amber-950/15 border border-amber-500/20 p-4 rounded-2xl text-xs text-slate-400 mt-4 select-none">
          <span className="font-bold text-amber-500 uppercase tracking-wide block mb-1">Pernyataan Batasan (Disclaimer):</span>
          MedSign AI dirancang sebagai alat bantu komunikasi dan penerjemahan isyarat BISINDO klinis pendukung antara pasien tunarungu dan dokter. Sistem ini bukan merupakan alat diagnosis klinis otomatis, pengganti penegakan diagnosis dokter, maupun pengganti penilaian medis profesional.
        </div>
      </div>
    </div>
  );
};
