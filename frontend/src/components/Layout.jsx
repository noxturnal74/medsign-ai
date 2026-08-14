import React, { useState, useEffect, useRef } from 'react';
import { Instagram, CheckCircle2, AlertTriangle, Volume2, Mail, Send, MapPin } from 'lucide-react';
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
  const [position, setPosition] = useState({ x: null, y: null });
  const dragRef = useRef({ isDragging: false, startX: 0, startY: 0, initialX: 0, initialY: 0, moved: false });

  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    const widget = e.currentTarget.getBoundingClientRect();
    dragRef.current = {
      isDragging: true,
      startX: e.clientX,
      startY: e.clientY,
      initialX: position.x !== null ? position.x : widget.left,
      initialY: position.y !== null ? position.y : widget.top,
      moved: false
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e) => {
    const drag = dragRef.current;
    if (!drag.isDragging) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    if (drag.moved || Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      drag.moved = true;
      let newX = drag.initialX + dx;
      let newY = drag.initialY + dy;
      const btnSize = 80;
      newX = Math.max(16, Math.min(window.innerWidth - btnSize - 16, newX));
      newY = Math.max(16, Math.min(window.innerHeight - btnSize - 16, newY));
      setPosition({ x: newX, y: newY });
    }
  };

  const handleMouseUp = () => {
    const drag = dragRef.current;
    drag.isDragging = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    if (!drag.moved) {
      setIsOpen(prev => !prev);
    }
  };

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    const widget = e.currentTarget.getBoundingClientRect();
    dragRef.current = {
      isDragging: true,
      startX: touch.clientX,
      startY: touch.clientY,
      initialX: position.x !== null ? position.x : widget.left,
      initialY: position.y !== null ? position.y : widget.top,
      moved: false
    };
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleTouchEnd);
  };

  const handleTouchMove = (e) => {
    const drag = dragRef.current;
    if (!drag.isDragging) return;
    const touch = e.touches[0];
    const dx = touch.clientX - drag.startX;
    const dy = touch.clientY - drag.startY;
    if (drag.moved || Math.abs(dx) > 5 || Math.abs(dy) > 5) {
      e.preventDefault();
      drag.moved = true;
      let newX = drag.initialX + dx;
      let newY = drag.initialY + dy;
      const btnSize = 80;
      newX = Math.max(16, Math.min(window.innerWidth - btnSize - 16, newX));
      newY = Math.max(16, Math.min(window.innerHeight - btnSize - 16, newY));
      setPosition({ x: newX, y: newY });
    }
  };

  const handleTouchEnd = () => {
    const drag = dragRef.current;
    drag.isDragging = false;
    document.removeEventListener('touchmove', handleTouchMove);
    document.removeEventListener('touchend', handleTouchEnd);
    if (!drag.moved) {
      setIsOpen(prev => !prev);
    }
  };
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
      <main className='w-full max-w-none flex-grow flex flex-col' style={{ paddingTop: 57 }}>
        {children}
      </main>
      
      <footer className="mx-auto mb-6 mt-8 w-full max-w-7xl rounded-[32px] border border-slate-200/50 bg-white/50 p-6 md:p-10 backdrop-blur-xl text-slate-800">
        <div className="grid gap-8 grid-cols-1 md:grid-cols-2 lg:grid-cols-4 text-xs font-semibold leading-relaxed">

          {/* Column 1: Brand / Institusi */}
          <div className="flex flex-col gap-3.5 max-w-xs">
            <img
              src="/assets/medsign-logo.png"
              alt="Logo MedSign AI"
              className="h-10 w-auto object-contain object-left self-start"
              onError={e => { e.currentTarget.style.display = 'none'; }}
            />
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Universitas Ma Chung</h4>
            <a
              href="https://www.google.com/maps?gs_lcrp=EgZjaHJvbWUyBggAEEUYOTIHCAEQIRigAdIBCDI4MjNqMGo3qAIAsAIA&um=1&ie=UTF-8&fb=1&gl=id&sa=X&geocode=KWsXXsZbgnguMeI7KIPuM0uV&daddr=Villa+Puncak+Tidar+Blok+N+no.+1,+Doro,+Karangwidoro,+Kec.+Dau,+Kabupaten+Malang,+Jawa+Timur+65151"
              target="_blank"
              rel="noopener noreferrer"
              className="text-slate-500 leading-normal hover:text-sky-600 transition-colors flex items-start gap-1.5"
            >
              <MapPin size={12} className="mt-0.5 shrink-0 text-sky-400" />
              Villa Puncak Tidar Blok N no. 1, Doro, Karangwidoro, Kec. Dau, Kabupaten Malang, Jawa Timur 65151
            </a>
          </div>

          {/* Column 2: Kontak */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Informasi Kontak</h4>
            <div className="flex flex-col gap-2.5 text-slate-500">
              <a
                href="mailto:aimedsign@gmail.com"
                className="flex items-center gap-2 hover:text-sky-600 transition-colors"
              >
                <Mail size={12} className="shrink-0 text-sky-400" />
                aimedsign@gmail.com
              </a>
              <a
                href="https://medsign-ai.vercel.app/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-sky-600 transition-colors"
              >
                <Send size={12} className="shrink-0 text-sky-400" />
                medsign-ai.vercel.app
              </a>
              <a
                href="https://wa.me/6289506753131"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-emerald-600 transition-colors"
              >
                {/* WhatsApp icon inline SVG — no extra dep */}
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="shrink-0 text-emerald-500">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                089506753131
              </a>
            </div>
          </div>

          {/* Column 3: Navigasi */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">MedSign AI</h4>
            <div className="grid grid-cols-2 gap-2 text-slate-500">
              <button onClick={() => setView('home')} className="text-left hover:text-sky-600 transition-colors">Beranda</button>
              <button onClick={() => setView('about')} className="text-left hover:text-sky-600 transition-colors">Tentang Kami</button>
              <button onClick={() => setView('manual')} className="text-left hover:text-sky-600 transition-colors">Aplikasi</button>
              <button onClick={() => setView('articles_page')} className="text-left hover:text-sky-600 transition-colors">Artikel</button>
              <button onClick={() => setView('patient')} className="text-left hover:text-sky-600 transition-colors">Pendeteksi Isyarat</button>
              <button onClick={() => setView('contact')} className="text-left hover:text-sky-600 transition-colors">Kontak</button>
            </div>
          </div>

          {/* Column 4: Social Media (Instagram only) */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">Social Media</h4>
            <a
              href="https://www.instagram.com/medsign.pkmkc/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 w-fit px-4 py-2.5 rounded-2xl border border-pink-200 bg-gradient-to-br from-pink-50 to-purple-50 text-pink-700 hover:border-pink-300 hover:shadow-sm transition-all group"
            >
              <Instagram size={16} className="group-hover:scale-110 transition-transform" />
              <div>
                <span className="block text-[10px] font-black uppercase tracking-wider">Instagram</span>
                <span className="block text-[10px] font-semibold text-pink-500">@medsign.pkmkc</span>
              </div>
            </a>
            <p className="text-[10px] text-slate-400 leading-relaxed mt-1">
              Ikuti kami untuk update terbaru seputar teknologi BISINDO medis dan PKM-KC 2026.
            </p>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="border-t border-slate-200/60 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[10px] font-bold text-slate-400">
          <span>© 2026 MedSign AI. Hak cipta dilindungi undang-undang.</span>
          <span className="uppercase tracking-widest">PKM-KC 2026 · Universitas Ma Chung</span>
        </div>
      </footer>

      {/* Floating Customer Service Widget */}
      {(() => {
        const isUpperHalf = position.y !== null && position.y < window.innerHeight / 2;
        const isLeftHalf = position.x !== null && position.x < window.innerWidth / 2;
        return (
          <div 
            className={`floating-cs-widget z-50 flex gap-3 select-none ${
              position.x !== null ? 'fixed' : 'fixed bottom-6 right-6'
            } ${
              isUpperHalf ? 'flex-col-reverse' : 'flex-col'
            } ${
              isLeftHalf ? 'items-start' : 'items-end'
            }`}
            style={position.x !== null ? {
              left: position.x,
              top: position.y,
              bottom: 'auto',
              right: 'auto',
              position: 'fixed'
            } : {}}
          >
            {isOpen && (
              <div id="collapse-floating-button" className="bg-white rounded-[28px] shadow-2xl border border-slate-100/80 overflow-hidden flex flex-col gap-4 p-4 animate-slide-up w-80 md:w-96">
                {/* Header */}
                <div className="bg-emerald-500/10 text-emerald-950 flex items-center gap-3 p-4 -mx-4 -mt-4 border-b border-emerald-500/20">
                  <img 
                    src="/assets/mascot_contact.png" 
                    alt="Mascot" 
                    className="w-12 h-12 rounded-full bg-white object-cover border-2 border-emerald-400/40 shadow-md"
                  />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[11px] font-black uppercase tracking-wider">Butuh Bantuan?</span>
                    <span className="text-[9px] font-semibold text-emerald-700">Tim MedSign siap membantu Anda</span>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex flex-col gap-2.5">
                  {[
                    { label: "Hubungi via Instagram", href: "https://www.instagram.com/medsign.pkmkc/" },
                    { label: "Pemesanan Juru Bahasa Isyarat", href: "https://www.instagram.com/medsign.pkmkc/" },
                    { label: "Pemesanan Layanan", href: "https://www.instagram.com/medsign.pkmkc/" },
                  ].map((item) => (
                    <a
                      key={item.label}
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="border border-pink-400/40 text-pink-700 hover:bg-pink-500/8 hover:border-pink-400/70 font-black px-4 py-3 rounded-2xl text-[10px] uppercase flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                      <Instagram size={13} />
                      {item.label}
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className={`relative flex items-center gap-3 ${isLeftHalf ? 'flex-row-reverse' : ''}`}>
              {/* Tooltip "Hubungi Kami" — visible only when closed */}
              {!isOpen && (
                <div className="bg-white text-slate-800 text-[10px] font-black uppercase tracking-wide rounded-full px-3 py-1.5 shadow-lg border border-slate-200/80 whitespace-nowrap animate-pulse pointer-events-none">
                  💬 Hubungi Kami
                </div>
              )}

              {/* Custom CSS for wiggle */}
              <style>{`
                @keyframes wiggle {
                  0%, 70%, 100% { transform: scale(1) rotate(0deg); }
                  72%, 76%, 80% { transform: scale(1.12) rotate(-8deg); }
                  74%, 78%      { transform: scale(1.12) rotate(8deg); }
                  82%           { transform: scale(1) rotate(0deg); }
                }
                .animate-wiggle {
                  animation: wiggle 3.5s ease-in-out infinite;
                }
              `}</style>

              {/* Pulsing Outer Ring */}
              {!isOpen && (
                <div 
                  className="absolute right-0 inset-y-0 w-[88px] h-[88px] -m-1 rounded-full bg-emerald-400/20 border border-emerald-400/40 animate-ping pointer-events-none" 
                  style={{ animationDuration: '2s' }} 
                />
              )}
              
              <button
                type="button"
                aria-controls="collapse-floating-button"
                aria-expanded={isOpen}
                onMouseDown={handleMouseDown}
                onTouchStart={handleTouchStart}
                className={`w-[80px] h-[80px] rounded-full border-4 border-white shadow-2xl flex justify-center items-center active:scale-90 transition-all duration-200 p-0 cursor-grab active:cursor-grabbing overflow-hidden relative z-10 ${
                  isOpen ? "bg-emerald-100" : "bg-white hover:scale-110"
                } ${!isOpen ? "animate-wiggle" : ""}`}
              >
                {isOpen ? (
                  <svg aria-hidden="true" focusable="false" className="w-7 h-7 fill-slate-600" viewBox="0 0 352 512">
                    <path d="M242.72 256l100.07-100.07c12.28-12.28 12.28-32.19 0-44.48l-22.24-22.24c-12.28-12.28-32.19-12.28-44.48 0L176 189.28 75.93 89.21c-12.28-12.28-32.19-12.28-44.48 0L9.21 111.45c-12.28 12.28-12.28 32.19 0 44.48L109.28 256 9.21 356.07c-12.28 12.28-12.28 32.19 0 44.48l22.24 22.24c12.28 12.28 32.2 12.28 44.48 0L176 322.72l100.07 100.07c12.28 12.28 32.2 12.28 44.48 0l22.24-22.24c12.28-12.28-32.19-12.28-44.48-0L242.72 256z"/>
                  </svg>
                ) : (
                  <img 
                    src="/assets/mascot_contact.png" 
                    alt="CS Chat" 
                    className="w-full h-full object-cover transform scale-110"
                  />
                )}
              </button>
            </div>
          </div>
        );
      })()}

      {toast && (
        <div 
          onClick={() => setToast(null)}
          className="custom-toast fixed top-6 left-1/2 -translate-x-1/2 z-[999999] flex items-center gap-3 bg-white border border-slate-200/80 shadow-2xl rounded-2xl px-5 py-3.5 animate-slide-down cursor-pointer select-none max-w-[calc(100vw-2rem)] w-max md:w-auto text-slate-800"
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
            className="relative bg-white rounded-[32px] p-5 md:p-6 max-w-2xl w-[92vw] max-h-[88vh] flex flex-col gap-4 md:gap-5 shadow-2xl border border-white/20 animate-scale-up text-slate-800 overflow-y-auto"
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
                  }}
                  className={`w-full py-2.5 px-4 rounded-xl text-[10px] font-black uppercase transition-all active:scale-95 mt-2 flex items-center justify-center gap-2 ${
                    layoutMode === "phone"
                      ? "bg-emerald-600 text-white ring-2 ring-emerald-400 ring-offset-2 shadow-lg shadow-emerald-500/30"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-emerald-300"
                  }`}
                >
                  {layoutMode === "phone" && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse shrink-0" />}
                  {layoutMode === "phone" ? "📱 Mode Phone — Aktif" : "Aktifkan Mode Phone"}
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
