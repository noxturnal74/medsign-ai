import React, { useState, useEffect } from 'react';
import { Instagram, Facebook, Linkedin, CheckCircle2, AlertTriangle, Volume2 } from 'lucide-react';
import { Navbar } from './Navbar';
import { useContext } from 'react';
import { AppContext } from '../context/AppContextObject';

const footerLogos = [
  { name: 'Kemdikbudristek', src: '/assets/logo-kemdikbudristek.png', className: 'h-7' },
  { name: 'Diktisaintek Berdampak', src: '/assets/logo-diktisaintek.png', className: 'h-6' },
  { name: 'Simbelmawa', src: '/assets/logo-simbelmawa.png', className: 'h-6' },
  { name: 'PKM', src: '/assets/logo-pkm-full.png', className: 'h-7' },
  { name: 'Universitas Ma Chung', src: '/assets/logo-umc.png', className: 'h-7' },
  { name: 'MedSign', src: '/assets/medsign-logo.png', className: 'h-6' }
];

export const Layout = ({ children, currentView, setView }) => {
  const isHome = currentView === 'home';
  const [isOpen, setIsOpen] = useState(false);
  const { showFeatureModal, setShowFeatureModal, layoutMode, setLayoutMode, toast, setToast } = useContext(AppContext);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      { threshold: 0.05 }
    );

    const elements = document.querySelectorAll('[data-reveal]');
    elements.forEach((el) => observer.observe(el));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, [currentView]);

  return (
    <div className="app-shell flex min-h-screen flex-col text-slate-900">
      <Navbar currentView={currentView} setView={setView} />
      <main className={isHome ? 'w-full max-w-none px-4 py-5 md:px-6' : 'mx-auto flex w-full max-w-7xl flex-grow flex-col px-4 py-6 md:px-6'}>
        {children}
      </main>
      <footer className="mx-auto mb-6 mt-8 flex w-[min(92rem,calc(100%-2rem))] flex-col items-center gap-5 rounded-2xl border border-slate-200/50 bg-white/50 px-6 py-6 text-center backdrop-blur-xl">
        {/* Logo strip — grayscale by default, color on hover */}
        <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-4 opacity-80 transition-all duration-300 hover:opacity-100">
          {footerLogos.map(logo => (
            <img
              key={logo.name}
              src={logo.src}
              alt={`Logo ${logo.name}`}
              className="h-7 w-auto max-w-[100px] object-contain"
            />
          ))}
        </div>

        {/* Divider */}
        <div className="w-full border-t border-slate-200/60" />

        {/* Copyright + social */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            MedSign AI &middot; PKM-KC 2026 &middot; BISINDO Clinical Assistant
          </span>
          <a
            href="https://www.instagram.com/medsign.pkmkc/"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-1.5 text-[11px] font-bold text-slate-500 transition-colors hover:text-pink-600"
          >
            <Instagram size={12} className="transition-transform group-hover:scale-110" />
            @medsign.pkmkc
          </a>
        </div>
      </footer>
      {/* Floating Customer Service Widget */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3 select-none">
        {isOpen && (
          <div id="collapse-floating-button" className="bg-white rounded-[28px] shadow-2xl border border-slate-100/80 overflow-hidden flex flex-col gap-4 p-4 animate-slide-up w-72 md:w-80">
            {/* Header */}
            <div className="bg-emerald-500/10 text-emerald-950 flex items-center gap-3 p-3 -mx-4 -mt-4 border-b border-emerald-500/20">
              <img 
                src="/assets/mascot_contact.png" 
                alt="Mascot" 
                className="w-8 h-8 rounded-full bg-white object-cover border border-emerald-500/20"
              />
              <span className="text-[10px] font-black uppercase tracking-wider">Hubungi Customer Service Kami</span>
            </div>
            
            {/* Action Buttons */}
            <div className="flex flex-col gap-2">
              <a
                href="https://www.instagram.com/medsign.pkmkc/"
                target="_blank"
                rel="noopener noreferrer"
                className="border border-pink-400/40 text-pink-700 hover:bg-pink-500/5 font-black px-4 py-2.5 rounded-full text-[10px] uppercase flex items-center justify-center gap-2 transition-all"
              >
                <Instagram size={13} />
                Hubungi via Instagram
              </a>
              <a
                href="https://www.instagram.com/medsign.pkmkc/"
                target="_blank"
                rel="noopener noreferrer"
                className="border border-pink-400/40 text-pink-700 hover:bg-pink-500/5 font-black px-4 py-2.5 rounded-full text-[10px] uppercase flex items-center justify-center gap-2 transition-all"
              >
                <Instagram size={13} />
                Pemesanan Juru Bahasa Isyarat
              </a>
              <a
                href="https://www.instagram.com/medsign.pkmkc/"
                target="_blank"
                rel="noopener noreferrer"
                className="border border-pink-400/40 text-pink-700 hover:bg-pink-500/5 font-black px-4 py-2.5 rounded-full text-[10px] uppercase flex items-center justify-center gap-2 transition-all"
              >
                <Instagram size={13} />
                Pemesanan Layanan
              </a>
            </div>
          </div>
        )}

        <button
          type="button"
          aria-controls="collapse-floating-button"
          aria-expanded={isOpen}
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-full border border-white/60 shadow-xl flex justify-center items-center active:scale-95 transition-all p-0 cursor-pointer overflow-hidden ${
            isOpen ? "bg-emerald-100 text-slate-800" : "bg-white hover:bg-slate-50"
          }`}
        >
          {isOpen ? (
            <svg aria-hidden="true" focusable="false" className="w-5 h-5 fill-current" viewBox="0 0 352 512">
              <path d="M242.72 256l100.07-100.07c12.28-12.28 12.28-32.19 0-44.48l-22.24-22.24c-12.28-12.28-32.19-12.28-44.48 0L176 189.28 75.93 89.21c-12.28-12.28-32.19-12.28-44.48 0L9.21 111.45c-12.28 12.28-12.28 32.19 0 44.48L109.28 256 9.21 356.07c-12.28 12.28-12.28 32.19 0 44.48l22.24 22.24c12.28 12.28 32.2 12.28 44.48 0L176 322.72l100.07 100.07c12.28 12.28 32.2 12.28 44.48 0l22.24-22.24c12.28-12.28 12.28-32.19 0-44.48L242.72 256z"/>
            </svg>
          ) : (
            <img 
              src="/assets/mascot_contact.png" 
              alt="CS Chat" 
              className="w-full h-full object-cover"
            />
          )}
        </button>
      </div>

      {/* Custom Toast Notification */}
      {toast && (
        <div 
          onClick={() => setToast(null)}
          className="fixed top-6 left-1/2 -translate-y-1/2 z-[999999] flex items-center gap-3 bg-white border border-slate-200/80 shadow-2xl rounded-2xl px-5 py-3.5 animate-slide-down cursor-pointer select-none max-w-sm w-full md:w-auto text-slate-800"
        >
          <style>{`
            @keyframes slideDown {
              from {
                opacity: 0;
                transform: translate(-50%, -24px) scale(0.95);
              }
              to {
                opacity: 1;
                transform: translate(-50%, 0) scale(1);
              }
            }
            .animate-slide-down {
              animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
            }
          `}</style>
          {toast.type === "success" && <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />}
          {toast.type === "error" && <AlertTriangle size={16} className="text-rose-500 shrink-0" />}
          {toast.type === "info" && <Volume2 size={16} className="text-sky-500 shrink-0" />}
          
          <div className="flex flex-col min-w-0">
            <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-wider">Notifikasi MedSign</span>
            <span className="text-[11px] font-black leading-relaxed mt-0.5">{toast.message}</span>
          </div>
        </div>
      )}

      {/* Feature Desktop vs Phone Modal */}
      {showFeatureModal && (
        <div 
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setShowFeatureModal(false)}
        >
          <div 
            className="relative bg-white rounded-[32px] p-6 max-w-2xl w-full flex flex-col gap-5 shadow-2xl border border-white/20 animate-scale-up text-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowFeatureModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-900 transition-all font-black text-lg p-1.5"
            >
              ✕
            </button>
            
            <div className="border-b border-slate-100 pb-3">
              <span className="text-[9px] font-black text-sky-700 uppercase tracking-widest block mb-0.5">Perbandingan Fitur</span>
              <h3 className="text-lg font-black text-slate-950">MedSign AI: Desktop vs Phone</h3>
            </div>

            <div className="grid gap-6 md:grid-cols-2 text-xs">
              {/* Desktop Column */}
              <div className="surface-panel rounded-2xl p-4 border border-slate-150 flex flex-col justify-between gap-3">
                <div className="flex flex-col gap-3">
                  <span className="text-[10px] font-black text-sky-700 uppercase tracking-wider block border-b border-slate-100 pb-1.5">
                    🖥️ Fitur Desktop (Lengkap)
                  </span>
                  <ul className="flex flex-col gap-2.5 font-semibold text-slate-700 leading-relaxed list-disc list-inside">
                    <li><strong className="text-slate-950">Deteksi Real-Time:</strong> Ekstraksi landmark 21 titik tangan secara instan via MediaPipe &amp; WebGL.</li>
                    <li><strong className="text-slate-950">Neural Network Training:</strong> Latih model klinis LSTM, GRU, atau CNN1D di server backend melalui antarmuka browser.</li>
                    <li><strong className="text-slate-950">Dataset Balance Checker:</strong> Dashboard komprehensif sebaran sampel, audit responden, dan difficulty index.</li>
                    <li><strong className="text-slate-950">Advanced TTS Settings:</strong> Akses penuh ke seluruh suara sistem peramban dengan opsi uji coba suara terintegrasi.</li>
                    <li><strong className="text-slate-950">Motion Visualizer:</strong> Grafik trajektori 3D neon interaktif untuk mengukur presisi spasial dan temporal gerakan.</li>
                  </ul>
                </div>
                <button
                  onClick={() => {
                    setLayoutMode("desktop");
                    setShowFeatureModal(false);
                  }}
                  className={`w-full py-2.5 px-4 rounded-xl text-[10px] font-black uppercase transition-all active:scale-95 mt-2 flex items-center justify-center gap-2 ${
                    layoutMode === "desktop"
                      ? "bg-sky-600 text-white ring-2 ring-sky-400 ring-offset-2 shadow-lg shadow-sky-500/30"
                      : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-sky-300"
                  }`}
                >
                  {layoutMode === "desktop" && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />}
                  {layoutMode === "desktop" ? "🖥️ Mode Desktop — Aktif" : "Aktifkan Mode Desktop"}
                </button>
              </div>

              {/* Phone Column */}
              <div className="surface-panel rounded-2xl p-4 border border-slate-150 flex flex-col justify-between gap-3">
                <div className="flex flex-col gap-3">
                  <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider block border-b border-slate-100 pb-1.5">
                    📱 Fitur Phone (Sederhana)
                  </span>
                  <ul className="flex flex-col gap-2.5 font-semibold text-slate-700 leading-relaxed list-disc list-inside">
                    <li><strong className="text-slate-950">Mobile UI:</strong> Antarmuka web responsif yang disederhanakan agar pas di layar ponsel pintar.</li>
                    <li><strong className="text-slate-950">Penerjemahan Cepat:</strong> Tampilan input isyarat cepat dan pembacaan teks verbal berlatensi rendah.</li>
                    <li><strong className="text-slate-950">Auto-Speech:</strong> Konversi teks terjemahan ke suara secara otomatis menggunakan Web Speech API bawaan browser.</li>
                    <li><strong className="text-slate-950">Mobile-First UI:</strong> Antarmuka responsif yang dioptimalkan untuk layar sentuh dan akses cepat di lapangan klinis.</li>
                  </ul>
                </div>
                <button
                  onClick={() => {
                    setLayoutMode("phone");
                    setShowFeatureModal(false);
                    alert("Mode Phone Aktif!");
                  }}
                  className={`w-full py-2.5 px-4 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm active:scale-95 mt-2 ${
                    layoutMode === "phone"
                      ? "bg-emerald-600 text-white"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {layoutMode === "phone" ? "📱 Mode Phone (Aktif)" : "Aktifkan Mode Phone"}
                </button>
              </div>
            </div>

            <div className="flex justify-end mt-2">
              <button
                onClick={() => setShowFeatureModal(false)}
                className="glass-button glass-button-primary rounded-xl px-5 py-2 text-xs font-black uppercase shadow-sm"
              >
                Tutup Panduan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
