import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import {
  LayoutGrid, Save, ArrowUp, ArrowDown, Power, EyeOff,
  Plus, Pencil, Trash2, X, Check, Loader2, GripVertical, RotateCcw,
  Newspaper, Star, Instagram, Building2, Video, Globe, Upload, Search, Users
} from 'lucide-react';
import { AppContext } from '../../context/AppContextObject';

const API = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

const DEFAULT_ORDER = ['mitra', 'reviews', 'instagram', 'articles', 'brand_pkm', 'video_tutorial'];

const ALL_MODULES = [
  { id: 'mitra',          label: 'Mitra & Ekosistem',      icon: <Building2 size={14} />, color: 'indigo', hint: 'Logo mitra & ekosistem' },
  { id: 'reviews',        label: 'Ulasan Pengguna',        icon: <Star size={14} />,      color: 'amber',  hint: 'Testimoni pengguna' },
  { id: 'instagram',      label: 'Instagram Feed',         icon: <Instagram size={14} />, color: 'pink',   hint: 'Feed Instagram terbaru' },
  { id: 'articles',       label: 'Artikel',                icon: <Newspaper size={14} />, color: 'emerald', hint: 'Daftar artikel blog' },
  { id: 'brand_pkm',      label: 'Brand & Program PKM',    icon: <Globe size={14} />,     color: 'violet', hint: 'Brand & program akademik' },
  { id: 'video_tutorial', label: 'Video Tutorial',         icon: <Video size={14} />,     color: 'rose',   hint: 'Video panduan & status demo' },
  { id: 'team_gallery',   label: 'Tentang Kami',           icon: <Users size={14} />,     color: 'sky',    hint: 'Galeri dokumentasi tim' },
];

const tabColor = (c) => ({
  sky: 'bg-sky-50 text-sky-700 border-sky-200',
  indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  pink: 'bg-pink-50 text-pink-700 border-pink-200',
  emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  violet: 'bg-violet-50 text-violet-700 border-violet-200',
  rose: 'bg-rose-50 text-rose-700 border-rose-200',
}[c] || 'bg-slate-50 text-slate-700 border-slate-200');

const activeColor = (c) => ({
  sky: 'bg-sky-600',
  indigo: 'bg-indigo-600',
  amber: 'bg-amber-600',
  pink: 'bg-pink-600',
  emerald: 'bg-emerald-600',
  violet: 'bg-violet-600',
  rose: 'bg-rose-600',
}[c] || 'bg-slate-600');

/* ═══ Small reusable modal - bottom sheet style ═══ */
const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[95vh] animate-slide-up-from-bottom"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4 flex-shrink-0 sticky top-0 bg-white/95 backdrop-blur-sm z-10 py-2 rounded-t-3xl">
          <h3 className="text-sm font-black text-slate-900 uppercase">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"><X size={16} /></button>
        </div>
        <div className="overflow-y-auto max-h-[calc(95vh-80px)] p-6 pb-8 pr-2">
          {children}
        </div>
      </div>
    </div>
  );
};

/* ═══ Field Input ═══ */
const Field = ({ label, required, children }) => (
  <div className="flex flex-col gap-1">
    <label className="text-[9px] font-bold uppercase text-slate-400 tracking-wide">
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
    {children}
  </div>
);
const inputCls = 'w-full rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400 transition-all placeholder:text-slate-300';
const selectCls = inputCls + ' appearance-none';

/* ═══ Image Upload & Interactive Resizer / Compressor ═══ */
const ImageUpload = ({ value, onChange, accept = "image/*", label = "Upload Gambar" }) => {
  const fileRef = useRef(null);
  const canvasRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(value || '');
  
  // Resizer modal state
  const [showResizer, setShowResizer] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState(null);
  const [origDimensions, setOrigDimensions] = useState({ width: 0, height: 0, sizeKb: 0 });
  const [targetWidth, setTargetWidth] = useState(800);
  const [targetHeight, setTargetHeight] = useState(600);
  const [maintainAspect, setMaintainAspect] = useState(true);
  const [quality, setQuality] = useState(85); // 1 - 100%
  const [fitMode, setFitMode] = useState('contain'); // 'contain' | 'cover' | 'stretch'
  const [estimatedSizeKb, setEstimatedSizeKb] = useState(0);
  const [processing, setProcessing] = useState(false);

  useEffect(() => { setPreview(value || ''); }, [value]);

  // Live Canvas Renderer whenever targetWidth, targetHeight, quality, or fitMode changes
  useEffect(() => {
    if (!showResizer || !rawImageSrc || !canvasRef.current) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, targetWidth, targetHeight);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      if (fitMode === 'stretch') {
        ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
      } else if (fitMode === 'contain') {
        // Fit within with transparent background
        const hRatio = targetWidth / img.width;
        const vRatio = targetHeight / img.height;
        const ratio = Math.min(hRatio, vRatio);
        const centerShiftX = (targetWidth - img.width * ratio) / 2;
        const centerShiftY = (targetHeight - img.height * ratio) / 2;
        ctx.drawImage(img, 0, 0, img.width, img.height, centerShiftX, centerShiftY, img.width * ratio, img.height * ratio);
      } else if (fitMode === 'cover') {
        // Crop center
        const hRatio = targetWidth / img.width;
        const vRatio = targetHeight / img.height;
        const ratio = Math.max(hRatio, vRatio);
        const centerShiftX = (targetWidth - img.width * ratio) / 2;
        const centerShiftY = (targetHeight - img.height * ratio) / 2;
        ctx.drawImage(img, 0, 0, img.width, img.height, centerShiftX, centerShiftY, img.width * ratio, img.height * ratio);
      }

      // Calculate real output size
      canvas.toBlob((blob) => {
        if (blob) {
          setEstimatedSizeKb(Math.round(blob.size / 1024));
        }
      }, 'image/jpeg', quality / 100);
    };
    img.src = rawImageSrc;
  }, [showResizer, rawImageSrc, targetWidth, targetHeight, quality, fitMode]);

  const onFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const sizeKb = Math.round(file.size / 1024);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setOrigDimensions({ width: img.width, height: img.height, sizeKb });
        // Set initial smart defaults
        const maxInit = 1200;
        let w = img.width;
        let h = img.height;
        if (w > maxInit) {
          h = Math.round((h * maxInit) / w);
          w = maxInit;
        }
        setTargetWidth(w);
        setTargetHeight(h);
        setRawImageSrc(event.target.result);
        setShowResizer(true);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleWidthChange = (val) => {
    const w = Math.max(10, parseInt(val) || 10);
    setTargetWidth(w);
    if (maintainAspect && origDimensions.width > 0) {
      const h = Math.round((w * origDimensions.height) / origDimensions.width);
      setTargetHeight(Math.max(10, h));
    }
  };

  const handleHeightChange = (val) => {
    const h = Math.max(10, parseInt(val) || 10);
    setTargetHeight(h);
    if (maintainAspect && origDimensions.height > 0) {
      const w = Math.round((h * origDimensions.width) / origDimensions.height);
      setTargetWidth(Math.max(10, w));
    }
  };

  const applyPreset = (w, h, fit = 'contain') => {
    setMaintainAspect(false);
    setTargetWidth(w);
    setTargetHeight(h);
    setFitMode(fit);
  };

  const processAndUpload = async () => {
    if (!canvasRef.current) return;
    setProcessing(true);
    try {
      const canvas = canvasRef.current;
      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', quality / 100);
      });

      if (!blob) throw new Error("Gagal mengompresi kanvas gambar");

      const file = new File([blob], `resized_${Date.now()}.jpg`, { type: 'image/jpeg' });
      setShowResizer(false);
      setUploading(true);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'uploads');
      const apiBase = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const savedUser = localStorage.getItem('medsign_user');
      const token = savedUser ? JSON.parse(savedUser).token : null;
      const res = await fetch(`${apiBase}/api/v1/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.status === 'success') {
        const fullUrl = `${apiBase}/${data.path}`;
        onChange(fullUrl);
        setPreview(fullUrl);
      } else {
        showToast?.(data.detail || 'Gagal upload gambar', 'error');
      }
    } catch (err) {
      console.error('Resize/upload error:', err);
      showToast?.('Gagal memproses dan mengunggah gambar', 'error');
    } finally {
      setProcessing(false);
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1.5">
      {preview && (
        <div className="relative w-full h-24 rounded-xl overflow-hidden border border-slate-200 bg-slate-50 group">
          <img src={preview} alt="" className="w-full h-full object-contain" />
          <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                const img = new Image();
                img.onload = () => {
                  setOrigDimensions({ width: img.width, height: img.height, sizeKb: 0 });
                  setTargetWidth(img.width);
                  setTargetHeight(img.height);
                  setRawImageSrc(preview);
                  setShowResizer(true);
                };
                img.crossOrigin = "anonymous";
                img.src = preview;
              }}
              className="px-2.5 py-1.5 rounded-lg bg-white text-indigo-700 hover:bg-slate-50 text-[9.5px] font-black uppercase shadow-xs transition-all flex items-center gap-1.5 active:scale-95"
            >
              <Pencil size={11} /> Resize Gambar
            </button>
            <button
              type="button"
              onClick={() => { onChange(''); setPreview(''); }}
              className="p-1.5 rounded-lg bg-white text-rose-500 hover:bg-rose-50 transition-all shadow-xs active:scale-95"
              title="Hapus Gambar"
            >
              <Trash2 size={12} />
            </button>
          </div>
        </div>
      )}

      <input ref={fileRef} type="file" accept={accept} onChange={onFileSelect} className="hidden" />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-dashed border-slate-300 text-slate-600 hover:border-indigo-400 hover:text-indigo-600 hover:bg-indigo-50/40 transition-all text-[10.5px] font-bold uppercase tracking-wider disabled:opacity-50"
      >
        {uploading ? <><Loader2 size={14} className="animate-spin text-indigo-600" /> Mengunggah...</> : <><Upload size={14} /> {label} & Resize</>}
      </button>

      {/* Interactive Resizer & Live Canvas Preview Modal */}
      {showResizer && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in" onClick={() => setShowResizer(false)}>
          <div
            className="relative bg-white rounded-[28px] shadow-2xl max-w-lg w-full max-h-[92vh] overflow-y-auto p-5 sm:p-6 border border-slate-100 flex flex-col gap-4 animate-scale-up text-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-150 pb-3">
              <div>
                <h4 className="text-xs sm:text-sm font-black uppercase text-slate-900 tracking-wide flex items-center gap-2">
                  <Pencil size={14} className="text-indigo-600" /> Live Image Resizer & Compressor
                </h4>
                <span className="text-[10px] font-bold text-slate-400">
                  Dimensi Asli: {origDimensions.width} × {origDimensions.height} px {origDimensions.sizeKb > 0 ? `(~${origDimensions.sizeKb} KB)` : ''}
                </span>
              </div>
              <button onClick={() => setShowResizer(false)} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400 transition-colors">
                <X size={16} />
              </button>
            </div>

            {/* Live Interactive Canvas Preview Container */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase text-slate-500 tracking-wider">Live Preview Render:</span>
                <span className="text-[9.5px] font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200/50">
                  {targetWidth} × {targetHeight} px · Est: ~{estimatedSizeKb} KB ({quality}%)
                </span>
              </div>

              <div className="relative w-full h-48 sm:h-56 rounded-2xl bg-slate-900/5 border border-slate-200 overflow-hidden flex items-center justify-center p-2 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:12px_12px]">
                <canvas
                  ref={canvasRef}
                  className="max-w-full max-h-full object-contain rounded-lg shadow-sm border border-slate-200 bg-white"
                />
              </div>
            </div>

            {/* Fit / Scale Mode */}
            <div className="flex items-center justify-between gap-2 bg-slate-50 p-2 rounded-2xl border border-slate-150">
              <span className="text-[9.5px] font-black uppercase text-slate-500 pl-1">Mode Skala:</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setFitMode('contain')}
                  className={`px-2.5 py-1 rounded-xl text-[9.5px] font-bold transition-all ${
                    fitMode === 'contain' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Proporsional
                </button>
                <button
                  type="button"
                  onClick={() => setFitMode('cover')}
                  className={`px-2.5 py-1 rounded-xl text-[9.5px] font-bold transition-all ${
                    fitMode === 'cover' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Crop Tengah
                </button>
                <button
                  type="button"
                  onClick={() => setFitMode('stretch')}
                  className={`px-2.5 py-1 rounded-xl text-[9.5px] font-bold transition-all ${
                    fitMode === 'stretch' ? 'bg-indigo-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  Stretch
                </button>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Preset Cepat:</span>
              <div className="grid grid-cols-4 gap-1.5">
                <button
                  type="button"
                  onClick={() => applyPreset(1200, 675, 'cover')}
                  className="py-1.5 px-2 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 text-slate-700 hover:text-indigo-600 text-[9.5px] font-bold transition-all text-center"
                >
                  Banner (16:9)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(800, 800, 'contain')}
                  className="py-1.5 px-2 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 text-slate-700 hover:text-indigo-600 text-[9.5px] font-bold transition-all text-center"
                >
                  Kotak (1:1)
                </button>
                <button
                  type="button"
                  onClick={() => applyPreset(400, 400, 'contain')}
                  className="py-1.5 px-2 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 text-slate-700 hover:text-indigo-600 text-[9.5px] font-bold transition-all text-center"
                >
                  Logo Mitra
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMaintainAspect(true);
                    setTargetWidth(origDimensions.width);
                    setTargetHeight(origDimensions.height);
                    setFitMode('contain');
                  }}
                  className="py-1.5 px-2 rounded-xl bg-slate-50 hover:bg-indigo-50 border border-slate-200 text-slate-700 hover:text-indigo-600 text-[9.5px] font-bold transition-all text-center"
                >
                  Asli
                </button>
              </div>
            </div>

            {/* Custom Pixel Dimensions Input */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[9.5px] font-bold uppercase text-slate-500">Lebar Pixel (Width)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="20"
                    max="4000"
                    value={targetWidth}
                    onChange={(e) => handleWidthChange(e.target.value)}
                    className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">px</span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[9.5px] font-bold uppercase text-slate-500">Tinggi Pixel (Height)</label>
                <div className="relative">
                  <input
                    type="number"
                    min="20"
                    max="4000"
                    value={targetHeight}
                    onChange={(e) => handleHeightChange(e.target.value)}
                    className="w-full text-xs font-bold text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">px</span>
                </div>
              </div>
            </div>

            {/* Aspect Ratio Lock & Quality Compression Slider */}
            <div className="flex flex-col gap-2.5 bg-slate-50/90 p-3.5 rounded-2xl border border-slate-200/80">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={maintainAspect}
                  onChange={(e) => setMaintainAspect(e.target.checked)}
                  className="w-4 h-4 text-indigo-600 rounded cursor-pointer accent-indigo-600"
                />
                <span className="text-[10.5px] font-bold text-slate-700">Kunci Rasio Gambar (Lock Aspect Ratio)</span>
              </label>

              <div className="flex flex-col gap-1 pt-1 border-t border-slate-200/60">
                <div className="flex items-center justify-between text-[9.5px] font-bold text-slate-600 uppercase">
                  <span>Kualitas Kompresi JPEG</span>
                  <span className="text-indigo-700 font-black">{quality}%</span>
                </div>
                <input
                  type="range"
                  min="20"
                  max="100"
                  value={quality}
                  onChange={(e) => setQuality(parseInt(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-150">
              <button
                type="button"
                onClick={() => setShowResizer(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs transition-all active:scale-95"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={processAndUpload}
                disabled={processing}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider transition-all disabled:opacity-50 shadow-md flex items-center justify-center gap-2 active:scale-95"
              >
                {processing ? <><Loader2 size={14} className="animate-spin" /> Memproses...</> : <><Check size={14} /> Terapkan & Simpan</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


/* ═══ Search Input ═══ */
const SearchInput = ({ value, onChange, placeholder = "Cari..." }) => (
  <div className="relative">
    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
    <input
      type="text"
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400 transition-all placeholder:text-slate-300"
    />
  </div>
);

/* ═══ Dashboard Modul Form — DIHAPUS (modul dihilangkan dari homepage) ═══ */

/* ═══ Generic CRUD Table for mitra/video_tutorial/brand_pkm ═══ */
const GenericCrudTable = ({ data, columns, onEdit, onDelete, loading }) => (
  <div className="overflow-x-auto">
    <table className="w-full text-left">
      <thead>
        <tr className="border-b border-slate-100">
          {columns.map(c => <th key={c.key} className="py-2 px-3 text-[9px] font-black uppercase text-slate-400 tracking-wide">{c.label}</th>)}
          <th className="py-2 px-3 text-[9px] font-black uppercase text-slate-400 tracking-wide text-right">Aksi</th>
        </tr>
      </thead>
      <tbody>
        {loading && <tr><td colSpan={columns.length + 1} className="py-8 text-center text-xs text-slate-400"><Loader2 size={18} className="animate-spin mx-auto mb-1" />Memuat...</td></tr>}
        {!loading && data.length === 0 && <tr><td colSpan={columns.length + 1} className="py-8 text-center text-xs text-slate-400">Belum ada data</td></tr>}
        {data.map((row, i) => (
          <tr key={row.id || i} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
            {columns.map(c => (
              <td key={c.key} className="py-2.5 px-3 text-xs font-semibold text-slate-700 max-w-[180px] truncate">
                {c.render ? c.render(row[c.key], row) : row[c.key] ?? '-'}
              </td>
            ))}
            <td className="py-2.5 px-3 text-right">
              <div className="flex items-center justify-end gap-1.5">
                <button onClick={() => onEdit(row)} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-sky-50 hover:text-sky-700 hover:border-sky-200 transition-all" title="Edit"><Pencil size={13} /></button>
                <button onClick={() => onDelete(row.id, row)} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-all" title="Hapus"><Trash2 size={13} /></button>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

/* ═══ Main Component ═══ */
export const HomepageManager = ({ order, setOrder, onSave }) => {
  const { currentUser, showToast } = useContext(AppContext);
  const token = currentUser?.token;
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const activeModules = order
    ? order.split(',').map(s => s.trim()).filter(Boolean).filter(id => id !== 'dashboard_modul')
    : [];
  const inactiveModules = ALL_MODULES.filter(m => !activeModules.includes(m.id)).map(m => m.id);
  const displayModules = [
    ...activeModules.map(id => ({ ...ALL_MODULES.find(m => m.id === id), active: true })),
    ...inactiveModules.map(id => ({ ...ALL_MODULES.find(m => m.id === id), active: false })),
  ].filter(m => m.id);

  /* ── Tab state ── */
  const [subTab, setSubTab] = useState('layout'); // 'layout' | module id

  /* ── Data per module ── */
  const [data, setData] = useState({ mitra: [], reviews: [], instagram: [], articles: [], brand_pkm: [], video_tutorial: [], team_gallery: [] });
  const [loading, setLoading] = useState({});
  const [modal, setModal] = useState({ open: false, module: null, item: null });
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmDelete, setConfirmDelete] = useState({ open: false, module: null, id: null, title: '' });

  const fetchData = useCallback(async (module) => {
    if (!module || module === 'layout') return;
    setLoading(p => ({ ...p, [module]: true }));
    try {
      let url;
      if (module === 'mitra') url = `${API}/api/v1/mitra`;
      else if (module === 'reviews') url = `${API}/api/v1/reviews`;
      else if (module === 'instagram') url = `${API}/api/v1/instagram-posts`;
      else if (module === 'articles') url = `${API}/api/v1/articles`;
      else if (module === 'brand_pkm') url = `${API}/api/v1/admin/brand-pkm`;
      else if (module === 'video_tutorial') url = `${API}/api/v1/admin/video-tutorials`;
      else if (module === 'team_gallery') url = `${API}/api/v1/about/team-gallery`;
      else return;
      const r = await fetch(url, { headers });
      const json = await r.json();
      let list = [];
      if (module === 'team_gallery') {
        list = json.items || [];
      } else {
        list = Array.isArray(json) ? json : [];
      }
      setData(p => ({ ...p, [module]: list }));
    } catch (e) { console.error(`Fetch ${module} error:`, e); }
    setLoading(p => ({ ...p, [module]: false }));
  }, [token]);

  useEffect(() => { fetchData(subTab); setSearchQuery(''); }, [subTab, fetchData]);

  const requestDeleteItem = (module, id, title = '') => {
    setConfirmDelete({ open: true, module, id, title });
  };

  const executeDeleteItem = async () => {
    const { module, id } = confirmDelete;
    if (!module || !id) return;
    setConfirmDelete({ open: false, module: null, id: null, title: '' });

    try {
      if (module === 'team_gallery') {
        const currentList = data.team_gallery || [];
        const newList = currentList.filter(item => item.id !== id);
        const url = `${API}/api/v1/admin/team-gallery`;
        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({ items: newList })
        });
        if (res.ok) {
          showToast?.('Item berhasil dihapus', 'success');
          fetchData(module);
        } else {
          const err = await res.json().catch(() => ({}));
          showToast?.(err.detail || 'Gagal menghapus item', 'error');
        }
        return;
      }
      let url;
      if (module === 'mitra') url = `${API}/api/v1/admin/mitra/${id}`;
      else if (module === 'reviews') url = `${API}/api/v1/admin/reviews/${id}`;
      else if (module === 'instagram') url = `${API}/api/v1/admin/instagram-posts/${id}`;
      else if (module === 'articles') url = `${API}/api/v1/admin/articles/${id}`;
      else if (module === 'brand_pkm') url = `${API}/api/v1/admin/brand-pkm/${id}`;
      else if (module === 'video_tutorial') url = `${API}/api/v1/admin/video-tutorials/${id}`;
      else return;
      
      const res = await fetch(url, { method: 'DELETE', headers });
      if (res.ok) {
        showToast?.('Item berhasil dihapus', 'success');
        fetchData(module);
      } else {
        const err = await res.json().catch(() => ({}));
        showToast?.(err.detail || 'Gagal menghapus item', 'error');
      }
    } catch (e) {
      console.error(`Delete error:`, e);
      showToast?.('Terjadi kesalahan koneksi saat menghapus', 'error');
    }
  };

  const saveItem = async (module, item) => {
    try {
      if (module === 'team_gallery') {
        const currentList = data.team_gallery || [];
        let newList = [];
        const isEdit = !!item.id && currentList.some(r => r.id === item.id);
        if (isEdit) {
          newList = currentList.map(r => r.id === item.id ? item : r);
        } else {
          const newItem = {
            ...item,
            id: Math.random().toString(36).substring(2, 9)
          };
          newList = [...currentList, newItem];
        }
        
        const url = `${API}/api/v1/admin/team-gallery`;
        const res = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify({ items: newList })
        });
        if (res.ok) {
          setModal({ open: false, module: null, item: null });
          fetchData(module);
        } else {
          const err = await res.json();
          showToast?.(err.detail || 'Gagal menyimpan item', 'error');
        }
        return;
      }

      const isEdit = !!item.id && data[module].some(i => i.id === item.id);

      let url, method;
      if (module === 'mitra') { url = isEdit ? `${API}/api/v1/admin/mitra/${item.id}` : `${API}/api/v1/admin/mitra`; method = isEdit ? 'PUT' : 'POST'; }
      else if (module === 'reviews') { url = isEdit ? `${API}/api/v1/admin/reviews/${item.id}` : `${API}/api/v1/admin/reviews`; method = isEdit ? 'PUT' : 'POST'; }
      else if (module === 'instagram') { url = isEdit ? `${API}/api/v1/admin/instagram-posts/${item.id}` : `${API}/api/v1/admin/instagram-posts`; method = isEdit ? 'PUT' : 'POST'; }
      else if (module === 'articles') { url = isEdit ? `${API}/api/v1/admin/articles/${item.id}` : `${API}/api/v1/admin/articles`; method = isEdit ? 'PUT' : 'POST'; }
      else if (module === 'brand_pkm') { url = isEdit ? `${API}/api/v1/admin/brand-pkm/${item.id}` : `${API}/api/v1/admin/brand-pkm`; method = isEdit ? 'PUT' : 'POST'; }
      else if (module === 'video_tutorial') { url = isEdit ? `${API}/api/v1/admin/video-tutorials/${item.id}` : `${API}/api/v1/admin/video-tutorials`; method = isEdit ? 'PUT' : 'POST'; }
      else return;

      const res = await fetch(url, { method, headers, body: JSON.stringify(item) });
      if (res.ok) {
        showToast?.('Konten berhasil disimpan', 'success');
        fetchData(module);
        setModal({ open: false, module: null, item: null });
      } else {
        const err = await res.json().catch(() => ({}));
        showToast?.(err.detail || 'Gagal menyimpan konten', 'error');
      }
    } catch (e) { console.error(`Save error:`, e); }
  };

  /* ── Layout reorder ── */
  const move = (id, dir) => {
    const arr = [...activeModules];
    const i = arr.indexOf(id);
    if (i < 0) return;
    const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setOrder(arr.join(','));
  };
  const toggle = (id) => {
    let arr = [...activeModules];
    if (arr.includes(id)) arr = arr.filter(x => x !== id);
    else arr.push(id);
    setOrder(arr.join(','));
  };

  /* ═══ Column definitions per module ═══ */
  const columnsFor = (mod) => {
    if (mod === 'mitra') return [
      { key: 'name', label: 'Nama' },
      { key: 'logo', label: 'Logo', render: (v) => v ? <img src={v} alt="" className="h-6 rounded" /> : '-' },
      { key: 'category', label: 'Kategori' },
      { key: 'website_url', label: 'URL', render: (v) => v ? <span className="text-sky-600 truncate block max-w-[120px]">{v}</span> : '-' },
      { key: 'is_active', label: 'Status', render: (v) => <span className={`inline-block px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${v ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>{v ? 'Aktif' : 'Off'}</span> },
    ];
    if (mod === 'reviews') return [
      { key: 'name', label: 'Nama' },
      { key: 'role', label: 'Role' },
      { key: 'rating', label: 'Rating', render: (v) => <span className="text-amber-500">{'★'.repeat(Math.round(v || 0))} <span className="text-slate-300 font-black">{v}</span></span> },
      { key: 'content', label: 'Ulasan', render: (v) => <span className="line-clamp-1 italic text-slate-500">{v}</span> },
    ];
    if (mod === 'instagram') return [
      { key: 'thumbnail_image', label: 'Foto', render: (v) => v ? <img src={v} alt="" className="h-10 w-10 object-cover rounded-lg border border-slate-100 shadow-sm" /> : '-' },
      { key: 'caption_short', label: 'Caption' },
      { key: 'post_url', label: 'URL', render: (v) => <span className="text-pink-600 truncate block max-w-[140px]">{v}</span> },
      { key: 'is_active', label: 'Status', render: (v) => <span className={`inline-block px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${v ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>{v ? 'Aktif' : 'Off'}</span> },
    ];
    if (mod === 'articles') return [
      { key: 'title', label: 'Judul' },
      { key: 'category', label: 'Kategori' },
      { key: 'author', label: 'Penulis' },
      { key: 'status', label: 'Status', render: (v) => <span className={`inline-block px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${v === 'published' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>{v}</span> },
    ];
    if (mod === 'brand_pkm') return [
      { key: 'name', label: 'Nama' },
      { key: 'logo', label: 'Logo', render: (v) => v ? <img src={v} alt="" className="h-6 rounded" /> : '-' },
      { key: 'category', label: 'Kategori' },
      { key: 'website_url', label: 'URL', render: (v) => v ? <span className="text-violet-600 truncate block max-w-[120px]">{v}</span> : '-' },
      { key: 'is_active', label: 'Status', render: (v) => <span className={`inline-block px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${v ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>{v ? 'Aktif' : 'Off'}</span> },
    ];
    if (mod === 'video_tutorial') return [
      { key: 'title', label: 'Judul' },
      { key: 'duration', label: 'Durasi' },
      { key: 'video_url', label: 'URL Video', render: (v) => <span className="text-rose-600 truncate block max-w-[140px]">{v}</span> },
      { key: 'is_active', label: 'Status', render: (v) => <span className={`inline-block px-2 py-0.5 rounded-full text-[8px] font-black uppercase ${v ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>{v ? 'Aktif' : 'Off'}</span> },
    ];
    if (mod === 'team_gallery') return [
      { key: 'image_url', label: 'Foto', render: (v) => v ? <img src={v} alt="" className="h-10 w-10 object-cover rounded-lg border border-slate-100 shadow-sm" /> : '-' },
      { key: 'title', label: 'Nama/Judul' },
      { key: 'caption', label: 'Jabatan/Keterangan' },
      { key: 'display_order', label: 'Urutan' },
    ];
    return [];
  };

  const openCreateForm = (mod) => setModal({ open: true, module: mod, item: null });

  return (
    <div className="flex flex-col gap-5 animate-slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider flex items-center gap-2">
            <LayoutGrid size={14} className="text-sky-600" /> Kelola Konten Homepage
          </h2>
          <p className="text-[11px] font-semibold text-slate-400 mt-1">
            Atur urutan bagian, aktifkan/nonaktifkan modul, dan kelola konten di landing page.
          </p>
        </div>
      </div>

      {/* Top tabs: Layout + per-module */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
        <button
          onClick={() => setSubTab('layout')}
          className={`shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all border ${
            subTab === 'layout' ? 'bg-[#053D67] text-white border-[#053D67] shadow' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
          }`}
        >
          <LayoutGrid size={12} className="inline mr-1.5 -mt-0.5" /> Tata Letak
        </button>
        {ALL_MODULES.map(m => (
          <button
            key={m.id}
            onClick={() => setSubTab(m.id)}
            className={`shrink-0 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-wide transition-all border flex items-center gap-1.5 ${
              subTab === m.id ? `${tabColor(m.color)} border-current shadow-sm` : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {m.icon} {m.label}
            <span className="ml-1 inline-flex items-center justify-center w-5 h-5 rounded-full bg-black/5 text-[8px] font-black">
              {(data[m.id] || []).length}
            </span>
          </button>
        ))}
      </div>

      {/* ── Layout Tab ── */}
      {subTab === 'layout' && (
        <div className="flex flex-col gap-4">
          <div className="grid gap-2.5">
            {displayModules.map((mod) => {
              const activeIndex = activeModules.indexOf(mod.id);
              const isFirst = activeIndex === 0;
              const isLast = activeIndex === activeModules.length - 1;
              return (
                <div
                  key={mod.id}
                  className={`flex items-center justify-between p-3 px-4 rounded-2xl border transition-all duration-200 ${
                    mod.active
                      ? 'bg-sky-500/5 border-sky-500/20 shadow-sm'
                      : 'bg-slate-50/50 border-slate-200 opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <GripVertical size={14} className="text-slate-300 shrink-0" />
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0 ${activeColor(mod.color)}`}>
                      {mod.icon}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-black text-slate-900 truncate">{mod.label}</span>
                      <span className="text-[9px] font-semibold text-slate-400 truncate">{mod.hint}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {mod.active && (
                      <div className="flex items-center gap-1">
                        <button type="button" disabled={isFirst} onClick={() => move(mod.id, -1)}
                          className={`p-1.5 rounded-lg border transition-all ${isFirst ? 'text-slate-300 border-slate-100 cursor-not-allowed bg-slate-50' : 'text-slate-700 border-slate-200 hover:bg-slate-100 bg-white'}`}
                        ><ArrowUp size={13} /></button>
                        <button type="button" disabled={isLast} onClick={() => move(mod.id, 1)}
                          className={`p-1.5 rounded-lg border transition-all ${isLast ? 'text-slate-300 border-slate-100 cursor-not-allowed bg-slate-50' : 'text-slate-700 border-slate-200 hover:bg-slate-100 bg-white'}`}
                        ><ArrowDown size={13} /></button>
                      </div>
                    )}
                    <button type="button" onClick={() => toggle(mod.id)}
                      className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all active:scale-95 flex items-center gap-1 ${
                        mod.active ? 'bg-[#053D67] text-white shadow' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                      }`}
                    >
                      {mod.active ? <Power size={11} /> : <EyeOff size={11} />}
                      {mod.active ? 'Aktif' : 'Nonaktif'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[9px] font-bold text-slate-400 uppercase">Urutan Bagian</label>
            <input type="text" value={activeModules.join(',')} readOnly
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-xs text-slate-500 bg-slate-50 font-mono font-bold shadow-inner cursor-not-allowed"
            />
          </div>

          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-1">
            <button type="button"
              onClick={() => { setOrder(DEFAULT_ORDER.join(',')); onSave(); }}
              className="px-5 py-3 bg-white border border-slate-300 text-slate-700 font-black text-xs uppercase tracking-wider hover:bg-slate-100 rounded-2xl transition-all active:scale-95 flex items-center gap-2 justify-center"
            >
              <RotateCcw size={14} /> Set ke Default
            </button>
            <button type="button" onClick={onSave}
              className="px-6 py-3 bg-[#053D67] text-white font-black text-xs uppercase tracking-wider hover:opacity-90 rounded-2xl transition-all shadow-md active:scale-95 flex items-center gap-2 justify-center"
            ><Save size={14} /> Terapkan Tata Letak</button>
          </div>
        </div>
      )}

      {/* ── CRUD Tabs ── */}
      {subTab !== 'layout' && (() => {
        const mod = ALL_MODULES.find(m => m.id === subTab);
        if (!mod) return null;
        const items = data[subTab] || [];
        const isLoading = loading[subTab];

        return (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 p-5 pb-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-white ${activeColor(mod.color)}`}>{mod.icon}</div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase">{mod.label}</h3>
                  <p className="text-[10px] font-semibold text-slate-400">{mod.hint}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-48">
                  <SearchInput value={searchQuery} onChange={setSearchQuery} placeholder={`Cari ${mod.label}...`} />
                </div>
                <button onClick={() => { setSearchQuery(''); fetchData(subTab); }}
                  title="Muat ulang data dari server (set ke tersimpan)"
                  className="px-4 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-[10px] font-black uppercase tracking-wider hover:bg-slate-100 transition-all active:scale-95 flex items-center gap-1.5"
                ><RotateCcw size={12} /> Set ke Tersimpan</button>
                <button onClick={() => openCreateForm(subTab)}
                  className="px-4 py-2 rounded-xl bg-[#053D67] text-white text-[10px] font-black uppercase tracking-wider hover:opacity-90 transition-all active:scale-95 flex items-center gap-1.5"
                ><Plus size={13} /> Tambah Baru</button>
              </div>
            </div>

            <div className="px-5 pb-5 overflow-x-auto">
              <GenericCrudTable
                data={items.filter(row => {
                  if (!searchQuery.trim()) return true;
                  const q = searchQuery.toLowerCase();
                  return Object.values(row).some(v => String(v).toLowerCase().includes(q));
                })}
                columns={columnsFor(subTab)}
                loading={isLoading}
                onEdit={(row) => setModal({ open: true, module: subTab, item: row })}
                onDelete={(id, row) => requestDeleteItem(subTab, id, row?.title || row?.name || '')}
              />
            </div>
          </div>
        );
      })()}

      {/* ── CRUD Modal ── */}
      <Modal open={modal.open} onClose={() => setModal({ open: false, module: null, item: null })} title={modal.item ? `Edit ${ALL_MODULES.find(m => m.id === modal.module)?.label}` : `Tambah ${ALL_MODULES.find(m => m.id === modal.module)?.label}`}>
        {modal.module === 'mitra' && <MitraForm item={modal.item} onSave={(f) => saveItem('mitra', f)} onClose={() => setModal({ open: false })} />}
        {modal.module === 'reviews' && <ReviewForm item={modal.item} onSave={(f) => saveItem('reviews', f)} onClose={() => setModal({ open: false })} />}
        {modal.module === 'instagram' && <InstagramForm item={modal.item} onSave={(f) => saveItem('instagram', f)} onClose={() => setModal({ open: false })} />}
        {modal.module === 'articles' && <ArticleForm item={modal.item} onSave={(f) => saveItem('articles', f)} onClose={() => setModal({ open: false })} />}
        {modal.module === 'brand_pkm' && <BrandPkmForm item={modal.item} onSave={(f) => saveItem('brand_pkm', f)} onClose={() => setModal({ open: false })} />}
        {modal.module === 'video_tutorial' && <VideoTutorialForm item={modal.item} onSave={(f) => saveItem('video_tutorial', f)} onClose={() => setModal({ open: false })} />}
        {modal.module === 'team_gallery' && <TeamGalleryForm item={modal.item} onSave={(f) => saveItem('team_gallery', f)} onClose={() => setModal({ open: false, module: null, item: null })} />}
      </Modal>

      {/* ── Custom Styled Confirmation Modal (Anti-Slop / Taste-Skill) ── */}
      {confirmDelete.open && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in" onClick={() => setConfirmDelete({ open: false, module: null, id: null, title: '' })}>
          <div
            className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 border border-slate-100 flex flex-col gap-4 animate-scale-up text-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 flex items-center justify-center mx-auto border border-rose-200/50 shadow-inner">
              <Trash2 size={22} />
            </div>

            <div className="text-center">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                Hapus Item Ini?
              </h3>
              <p className="text-xs font-semibold text-slate-500 mt-1 leading-relaxed">
                {confirmDelete.title ? `"${confirmDelete.title}"` : 'Item terpilih'} akan dihapus secara permanen dari server. Tindakan ini tidak dapat dibatalkan.
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setConfirmDelete({ open: false, module: null, id: null, title: '' })}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs transition-all active:scale-95"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeDeleteItem}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs uppercase tracking-wider transition-all shadow-md active:scale-95"
              >
                Hapus Sekarang
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

/* ═══ FORMS PER MODULE ═══ */

const MitraForm = ({ item, onSave, onClose }) => {
  const [f, setF] = useState(item || { name: '', logo: '', website_url: '', category: 'Mitra', display_order: 0, is_active: 1 });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <div className="flex flex-col gap-3">
      <Field label="Nama Mitra" required><input className={inputCls} value={f.name} onChange={e => set('name', e.target.value)} /></Field>
      <Field label="Logo URL"><input className={inputCls} value={f.logo || ''} onChange={e => set('logo', e.target.value)} placeholder="https://..." /></Field>
      <ImageUpload value={f.logo || ''} onChange={(url) => set('logo', url)} label="Upload Logo Mitra" />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Website URL"><input className={inputCls} value={f.website_url || ''} onChange={e => set('website_url', e.target.value)} placeholder="https://..." /></Field>
        <Field label="Kategori"><input className={inputCls} value={f.category || ''} onChange={e => set('category', e.target.value)} placeholder="Mitra, Donatur, dll" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Urutan"><input type="number" className={inputCls} value={f.display_order || 0} onChange={e => set('display_order', parseInt(e.target.value) || 0)} /></Field>
        <Field label="Status"><select className={selectCls} value={f.is_active ?? 1} onChange={e => set('is_active', parseInt(e.target.value))}>
          <option value={1}>Aktif</option><option value={0}>Nonaktif</option>
        </select></Field>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onClose} className="px-4 py-2 rounded-xl text-[10px] font-bold uppercase text-slate-500 hover:bg-slate-100 transition-all">Batal</button>
        <button onClick={() => onSave(f)} disabled={!f.name} className="px-5 py-2 rounded-xl bg-[#053D67] text-white text-[10px] font-black uppercase hover:opacity-90 transition-all disabled:opacity-30 flex items-center gap-1.5"><Check size={13} /> Simpan</button>
      </div>
    </div>
  );
};

const ReviewForm = ({ item, onSave, onClose }) => {
  const [f, setF] = useState(item || { name: '', role: 'Pasien', rating: 5, content: '', avatar: '' });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <div className="flex flex-col gap-3">
      <Field label="Nama" required><input className={inputCls} value={f.name} onChange={e => set('name', e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Role" required><select className={selectCls} value={f.role} onChange={e => set('role', e.target.value)}>
          <option value="Pasien">Pasien</option><option value="Dokter">Dokter</option><option value="Teman Tuli">Teman Tuli</option><option value="Lainnya">Lainnya</option>
        </select></Field>
        <Field label="Rating (1-5)" required><input type="number" min={1} max={5} step={0.5} className={inputCls} value={f.rating} onChange={e => set('rating', parseFloat(e.target.value) || 5)} /></Field>
      </div>
      <Field label="Ulasan" required><textarea className={inputCls + ' min-h-[80px] resize-none'} value={f.content} onChange={e => set('content', e.target.value)} /></Field>
      <Field label="Avatar URL"><input className={inputCls} value={f.avatar || ''} onChange={e => set('avatar', e.target.value)} placeholder="https://... (opsional)" /></Field>
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onClose} className="px-4 py-2 rounded-xl text-[10px] font-bold uppercase text-slate-500 hover:bg-slate-100 transition-all">Batal</button>
        <button onClick={() => onSave(f)} disabled={!f.name || !f.content} className="px-5 py-2 rounded-xl bg-[#053D67] text-white text-[10px] font-black uppercase hover:opacity-90 transition-all disabled:opacity-30 flex items-center gap-1.5"><Check size={13} /> Simpan</button>
      </div>
    </div>
  );
};

const InstagramForm = ({ item, onSave, onClose }) => {
  const [f, setF] = useState(item || { post_url: '', thumbnail_image: '', caption_short: '', display_order: 0, is_active: 1 });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <div className="flex flex-col gap-3">
      <Field label="URL Post Instagram" required><input className={inputCls} value={f.post_url} onChange={e => set('post_url', e.target.value)} placeholder="https://www.instagram.com/p/..." /></Field>
      <Field label="Thumbnail URL" required><input className={inputCls} value={f.thumbnail_image} onChange={e => set('thumbnail_image', e.target.value)} placeholder="https://..." /></Field>
      <ImageUpload value={f.thumbnail_image || ''} onChange={(url) => set('thumbnail_image', url)} label="Upload Thumbnail" />
      <Field label="Caption Pendek"><input className={inputCls} value={f.caption_short || ''} onChange={e => set('caption_short', e.target.value)} placeholder="Ringkasan caption" /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Urutan"><input type="number" className={inputCls} value={f.display_order || 0} onChange={e => set('display_order', parseInt(e.target.value) || 0)} /></Field>
        <Field label="Status"><select className={selectCls} value={f.is_active ?? 1} onChange={e => set('is_active', parseInt(e.target.value))}>
          <option value={1}>Aktif</option><option value={0}>Nonaktif</option>
        </select></Field>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onClose} className="px-4 py-2 rounded-xl text-[10px] font-bold uppercase text-slate-500 hover:bg-slate-100 transition-all">Batal</button>
        <button onClick={() => onSave(f)} disabled={!f.post_url || !f.thumbnail_image} className="px-5 py-2 rounded-xl bg-[#053D67] text-white text-[10px] font-black uppercase hover:opacity-90 transition-all disabled:opacity-30 flex items-center gap-1.5"><Check size={13} /> Simpan</button>
      </div>
    </div>
  );
};

const ArticleForm = ({ item, onSave, onClose }) => {
  const [f, setF] = useState(item || { title: '', slug: '', cover_image: '', content: '', excerpt: '', category: 'Edukasi BISINDO', author: 'MedSign AI', status: 'published', ref_url: '' });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  
  // Auto slugify function: mengubah judul artikel menjadi URL path yang ramah SEO (contoh: "Halo Dunia" -> "halo-dunia")
  const autoSlug = (title) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  
  const wordCount = (f.content || '').trim() ? (f.content || '').trim().split(/\s+/).length : 0;
  const charCount = (f.content || '').length;

  return (
    <div className="flex flex-col gap-3.5">
      <Field label="Judul Artikel" required>
        <input
          className={inputCls}
          value={f.title}
          onChange={e => {
            set('title', e.target.value);
            if (!item) set('slug', autoSlug(e.target.value));
          }}
          placeholder="Contoh: Mengenal Bahasa Isyarat Medis BISINDO"
        />
      </Field>

      <Field label="Slug URL (Path URL artikel)" required>
        <div className="flex flex-col gap-1">
          <input
            className={inputCls + ' font-mono text-indigo-700 bg-indigo-50/30'}
            value={f.slug}
            onChange={e => set('slug', autoSlug(e.target.value))}
            placeholder="mengenal-bahasa-isyarat-medis"
          />
          <span className="text-[8.5px] text-slate-400 font-semibold leading-tight">
            ℹ️ Slug adalah teks unik pembentuk tautan URL artikel di browser (misal: /artikel/<b>{f.slug || 'judul-artikel'}</b>). Otomatis dibuat dari judul.
          </span>
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Kategori">
          <input className={inputCls} value={f.category || ''} onChange={e => set('category', e.target.value)} placeholder="Edukasi BISINDO" />
        </Field>
        <Field label="Penulis">
          <input className={inputCls} value={f.author || ''} onChange={e => set('author', e.target.value)} placeholder="MedSign AI" />
        </Field>
      </div>

      <div className="flex flex-col gap-1">
        <Field label="Cover Image (URL atau Upload & Resize)">
          <input className={inputCls} value={f.cover_image || ''} onChange={e => set('cover_image', e.target.value)} placeholder="https://..." />
        </Field>
        <ImageUpload value={f.cover_image || ''} onChange={(url) => set('cover_image', url)} label="Upload Cover Artikel" />
      </div>

      <Field label="Ringkasan (Excerpt)">
        <textarea
          className={inputCls + ' min-h-[50px] resize-none'}
          value={f.excerpt || ''}
          onChange={e => set('excerpt', e.target.value)}
          placeholder="Ringkasan singkat yang muncul di kartu pratinjau artikel (1-2 kalimat)..."
        />
      </Field>

      <Field label="Isi Konten Artikel" required>
        <div className="flex flex-col gap-1">
          <textarea
            className={inputCls + ' min-h-[140px] resize-y leading-relaxed'}
            value={f.content}
            onChange={e => set('content', e.target.value)}
            placeholder="Tuliskan isi artikel lengkap di sini (tanpa batas kata)..."
          />
          <div className="flex items-center justify-between text-[9px] font-bold text-slate-400 px-1">
            <span>Panjang konten: {wordCount} kata ({charCount} karakter)</span>
            <span className="text-emerald-600">Bebas panjang konten</span>
          </div>
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Tautan Referensi / Jurnal (Opsional)">
          <input className={inputCls} value={f.ref_url || ''} onChange={e => set('ref_url', e.target.value)} placeholder="https://..." />
        </Field>
        <Field label="Status Publikasi">
          <select className={selectCls} value={f.status} onChange={e => set('status', e.target.value)}>
            <option value="published">Published (Tayang)</option>
            <option value="draft">Draft (Disimpan)</option>
          </select>
        </Field>
      </div>

      <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
        <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-[10px] font-bold uppercase text-slate-500 hover:bg-slate-100 transition-all">
          Batal
        </button>
        <button
          type="button"
          onClick={() => onSave(f)}
          disabled={!f.title || !f.content}
          className="px-5 py-2 rounded-xl bg-[#053D67] text-white text-[10px] font-black uppercase hover:opacity-90 transition-all disabled:opacity-30 flex items-center gap-1.5 shadow-xs"
        >
          <Check size={13} /> Simpan Artikel
        </button>
      </div>
    </div>
  );
};

const BrandPkmForm = ({ item, onSave, onClose }) => {
  const [f, setF] = useState(item || { name: '', logo: '', description: '', website_url: '', category: 'program', display_order: 0, is_active: 1 });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <div className="flex flex-col gap-3">
      <Field label="Nama" required><input className={inputCls} value={f.name} onChange={e => set('name', e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <Field label="Logo URL"><input className={inputCls} value={f.logo || ''} onChange={e => set('logo', e.target.value)} placeholder="https://..." /></Field>
          <ImageUpload value={f.logo || ''} onChange={(url) => set('logo', url)} label="Upload Logo Brand" />
        </div>
        <Field label="Kategori"><select className={selectCls} value={f.category || 'program'} onChange={e => set('category', e.target.value)}>
          <option value="program">Program</option><option value="brand">Brand</option><option value="inisiatif">Inisiatif</option>
        </select></Field>
      </div>
      <Field label="Deskripsi"><textarea className={inputCls + ' min-h-[60px] resize-none'} value={f.description || ''} onChange={e => set('description', e.target.value)} /></Field>
      <Field label="Website URL"><input className={inputCls} value={f.website_url || ''} onChange={e => set('website_url', e.target.value)} placeholder="https://..." /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Urutan"><input type="number" className={inputCls} value={f.display_order || 0} onChange={e => set('display_order', parseInt(e.target.value) || 0)} /></Field>
        <Field label="Status"><select className={selectCls} value={f.is_active ?? 1} onChange={e => set('is_active', parseInt(e.target.value))}>
          <option value={1}>Aktif</option><option value={0}>Nonaktif</option>
        </select></Field>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onClose} className="px-4 py-2 rounded-xl text-[10px] font-bold uppercase text-slate-500 hover:bg-slate-100 transition-all">Batal</button>
        <button onClick={() => onSave(f)} disabled={!f.name} className="px-5 py-2 rounded-xl bg-[#053D67] text-white text-[10px] font-black uppercase hover:opacity-90 transition-all disabled:opacity-30 flex items-center gap-1.5"><Check size={13} /> Simpan</button>
      </div>
    </div>
  );
};

const TeamGalleryForm = ({ item, onSave, onClose }) => {
  const [f, setF] = useState(item || { title: '', caption: '', image_url: '', display_order: 0 });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <div className="flex flex-col gap-3">
      <Field label="Judul/Nama Anggota" required><input className={inputCls} value={f.title} onChange={e => set('title', e.target.value)} /></Field>
      <Field label="Keterangan/Jabatan"><input className={inputCls} value={f.caption || ''} onChange={e => set('caption', e.target.value)} placeholder="Contoh: Ketua Tim R&D" /></Field>
      <div className="flex flex-col gap-1">
        <Field label="URL Foto" required><input className={inputCls} value={f.image_url} onChange={e => set('image_url', e.target.value)} placeholder="https://..." /></Field>
        <ImageUpload value={f.image_url || ''} onChange={(url) => set('image_url', url)} label="Upload Foto Anggota" />
      </div>
      <Field label="Urutan Tampilan"><input type="number" className={inputCls} value={f.display_order || 0} onChange={e => set('display_order', parseInt(e.target.value) || 0)} /></Field>
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onClose} className="px-4 py-2 rounded-xl text-[10px] font-bold uppercase text-slate-500 hover:bg-slate-100 transition-all">Batal</button>
        <button onClick={() => onSave(f)} disabled={!f.title || !f.image_url} className="px-5 py-2 rounded-xl bg-[#053D67] text-white text-[10px] font-black uppercase hover:opacity-90 transition-all disabled:opacity-30 flex items-center gap-1.5"><Check size={13} /> Simpan</button>
      </div>
    </div>
  );
};

const VideoTutorialForm = ({ item, onSave, onClose }) => {
  const [f, setF] = useState(item || { title: '', description: '', video_url: '', thumbnail: '', duration: '', display_order: 0, is_active: 1 });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <div className="flex flex-col gap-3">
      <Field label="Judul" required><input className={inputCls} value={f.title} onChange={e => set('title', e.target.value)} /></Field>
      <Field label="Deskripsi"><textarea className={inputCls + ' min-h-[60px] resize-none'} value={f.description || ''} onChange={e => set('description', e.target.value)} /></Field>
      <Field label="URL Video" required><input className={inputCls} value={f.video_url} onChange={e => set('video_url', e.target.value)} placeholder="https://youtube.com/watch?v=..." /></Field>
      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-1">
          <Field label="Thumbnail URL"><input className={inputCls} value={f.thumbnail || ''} onChange={e => set('thumbnail', e.target.value)} placeholder="https://..." /></Field>
          <ImageUpload value={f.thumbnail || ''} onChange={(url) => set('thumbnail', url)} label="Upload Thumbnail" accept="image/*" />
        </div>
        <Field label="Durasi"><input className={inputCls} value={f.duration || ''} onChange={e => set('duration', e.target.value)} placeholder="5:30" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Urutan"><input type="number" className={inputCls} value={f.display_order || 0} onChange={e => set('display_order', parseInt(e.target.value) || 0)} /></Field>
        <Field label="Status"><select className={selectCls} value={f.is_active ?? 1} onChange={e => set('is_active', parseInt(e.target.value))}>
          <option value={1}>Aktif</option><option value={0}>Nonaktif</option>
        </select></Field>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onClose} className="px-4 py-2 rounded-xl text-[10px] font-bold uppercase text-slate-500 hover:bg-slate-100 transition-all">Batal</button>
        <button onClick={() => onSave(f)} disabled={!f.title || !f.video_url} className="px-5 py-2 rounded-xl bg-[#053D67] text-white text-[10px] font-black uppercase hover:opacity-90 transition-all disabled:opacity-30 flex items-center gap-1.5"><Check size={13} /> Simpan</button>
      </div>
    </div>
  );
};
