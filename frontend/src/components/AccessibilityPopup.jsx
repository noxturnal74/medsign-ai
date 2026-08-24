import React, { useState, useRef } from 'react';
import { Shield, Play, Pause, VolumeX, Volume2, X, AlertTriangle, Info, Camera } from 'lucide-react';

export const AccessibilityPopup = ({ isOpen, onClose, onLearnMore }) => {
  const [consented, setConsented] = useState(false);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMuted, setIsMuted] = useState(true);
  const videoRef = useRef(null);

  if (!isOpen) return null;

  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play().catch(() => {});
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleMuteToggle = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/85 backdrop-blur-md z-[99999] flex items-center justify-center p-4 md:p-6 text-slate-800 animate-fade-in select-none">
      <div className="bg-white rounded-[32px] max-w-5xl w-full md:h-[80vh] max-h-[95vh] p-6 md:p-8 border border-slate-200 shadow-2xl flex flex-col gap-5 animate-scale-up relative overflow-hidden">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors z-50"
          aria-label="Tutup popup"
        >
          <X size={18} />
        </button>

        {/* Title */}
        <div className="border-b border-slate-100 pb-3 flex items-center gap-3 shrink-0">
          <div className="w-10 h-10 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center border border-sky-100 shadow-inner">
            <Shield size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-sm md:text-base font-black text-slate-950 uppercase tracking-wide">Persetujuan & Aksesibilitas Kamera Pasien</h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Pelindungan Data Pribadi, Kerahasiaan Medis & Regulasi UU PDP</p>
          </div>
        </div>

        {/* 2-Column Responsive Layout */}
        <div className="flex-1 overflow-y-auto md:overflow-hidden grid grid-cols-1 md:grid-cols-2 gap-6 min-h-0 pr-1">
          {/* Left Column: Video Player */}
          <div className="flex flex-col gap-3">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">🎥 Video Pengenalan & Panduan</span>
            <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video shadow-inner border border-slate-800 flex-1 md:max-h-[300px]">
              <video
                ref={videoRef}
                src="/videos/medsign-accessibility-intro.mp4"
                autoPlay
                muted={isMuted}
                loop
                playsInline
                aria-label="Video pengenalan aksesibilitas MedSign"
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent) {
                    const placeholder = document.createElement('div');
                    placeholder.className = 'w-full h-full flex flex-col items-center justify-center p-6 text-center text-slate-350 gap-2 bg-slate-900';
                    placeholder.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="animate-pulse text-sky-400"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="M12 6v6l4 2"/></svg><span class="text-xs font-black uppercase text-slate-200 tracking-wider">Video Aksesibilitas</span><span class="text-[10px] text-slate-400 max-w-xs font-semibold leading-relaxed">Video penjelasan privasi sedang dimuat...</span>`;
                    parent.appendChild(placeholder);
                  }
                }}
              />
              <div className="absolute bottom-3 right-3 flex items-center gap-2 z-10">
                <button
                  type="button"
                  onClick={handlePlayPause}
                  className="p-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-900 text-white transition-all shadow"
                >
                  {isPlaying ? <Pause size={12} /> : <Play size={12} />}
                </button>
                <button
                  type="button"
                  onClick={handleMuteToggle}
                  className="p-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-900 text-white transition-all shadow"
                >
                  {isMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                </button>
              </div>
            </div>
            
            <div className="p-3.5 bg-sky-50 rounded-2xl border border-sky-100 flex flex-col gap-1.5 text-[10px] font-semibold text-sky-850">
              <span className="font-black text-sky-900 uppercase tracking-wide flex items-center gap-1.5">
                <Camera size={13} className="text-sky-700" /> Jaminan Kerahasiaan Video
              </span>
              <p className="leading-relaxed">
                Video kamera pasien <strong>tidak akan pernah disimpan di server mana pun</strong>. Seluruh proses pembacaan landmark sendi tangan dilakukan secara lokal di sisi client dan langsung hilang/dihapus secara permanen dari memory ketika sesi konsultasi berakhir.
              </p>
            </div>
          </div>

          {/* Right Column: Terms, Legal Regulations & Consent */}
          <div className="flex flex-col gap-4 overflow-y-auto pr-1">
            {/* Legal citations block (Indonesia UU PDP & Permenkes RME) */}
            <div className="flex flex-col gap-2.5">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col gap-2">
                <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                  <AlertTriangle size={12} className="text-amber-600" /> Regulasi Pelindungan Data Pribadi & Kesehatan
                </span>
                <p className="text-[10px] font-semibold text-slate-600 leading-relaxed">
                  Berdasarkan <strong>UU No. 27 Tahun 2022 tentang Pelindungan Data Pribadi (UU PDP)</strong>, data kesehatan dan biometrik termasuk dalam kategori <strong>Data Pribadi Spesifik</strong> yang wajib memperoleh persetujuan eksplisit Anda sebelum diproses.
                </p>
                <div className="grid gap-1 text-[9px] font-bold text-slate-500 leading-normal border-t border-slate-200 pt-2">
                  <span>• <strong>UU PDP No. 27/2022 (Pasal 22 & 25):</strong> Persetujuan tertulis/eksplisit wajib diperoleh untuk pemrosesan data biometrik/kesehatan.</span>
                  <span>• <strong>Permenkes No. 24/2022 tentang Rekam Medis:</strong> Menjamin kerahasiaan & keamanan Rekam Medis Elektronik (RME) pasien.</span>
                  <span>• <strong>UU No. 17/2023 tentang Kesehatan:</strong> Melindungi hak privasi medis pasien atas kerahasiaan informasi pribadi.</span>
                </div>
              </div>
            </div>

            {/* Consent Checkbox */}
            <div className="bg-sky-500/5 border border-sky-200/50 rounded-2xl p-4 flex items-start gap-3 mt-auto">
              <input 
                type="checkbox"
                id="accessibility-consent-check"
                checked={consented}
                onChange={(e) => setConsented(e.target.checked)}
                className="mt-0.5 h-4.5 w-4.5 rounded border-slate-350 text-sky-600 focus:ring-sky-500 cursor-pointer shrink-0"
              />
              <label htmlFor="accessibility-consent-check" className="text-[11px] font-bold text-slate-700 leading-relaxed cursor-pointer select-none">
                Saya telah membaca dan memberikan persetujuan eksplisit kepada MedSign AI untuk menggunakan kamera dalam mendeteksi landmark tangan real-time demi kelancaran translasi BISINDO medis. Saya paham video ini tidak disimpan dan langsung terhapus saat sesi berakhir.
              </label>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-100 pt-4 flex items-center gap-3 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-slate-200 text-slate-500 font-black text-[11px] uppercase tracking-wide hover:bg-slate-50 hover:text-slate-800 active:scale-95 transition-all text-center"
          >
            Kembali
          </button>
          <button
            onClick={() => {
              if (consented) {
                onLearnMore();
                onClose();
              }
            }}
            disabled={!consented}
            className={`flex-1 py-3 rounded-2xl font-black text-[11px] uppercase tracking-wider active:scale-95 transition-all shadow text-center text-white transition-all duration-200 ${
              consented 
                ? 'bg-[#053D67] hover:bg-[#2e5799] cursor-pointer' 
                : 'bg-slate-300 border border-slate-200 cursor-not-allowed opacity-60'
            }`}
          >
            Saya Setuju & Mulai Kamera
          </button>
        </div>
      </div>
    </div>
  );
};