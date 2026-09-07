import React, { useState, useEffect, useRef } from 'react';
import { Camera, Plus, Pencil, Trash2, Save, Loader2, X, Check, RotateCcw, Upload, Image as ImageIcon, Sparkles, ArrowUp, ArrowDown } from 'lucide-react';

const API = (localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

const inputCls = 'w-full rounded-2xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all placeholder:text-slate-300';

const emptyItem = () => ({ id: crypto.randomUUID(), title: '', caption: '', image_url: '', display_order: 0 });

/* ═══ Image Upload & Compression Component ═══ */
const ImageUpload = ({ value, onChange }) => {
  const fileRef = useRef(null);
  const canvasRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(value || '');
  const [showResizer, setShowResizer] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState(null);
  const [origDimensions, setOrigDimensions] = useState({ width: 0, height: 0, sizeKb: 0 });
  const [targetWidth, setTargetWidth] = useState(1200);
  const [targetHeight, setTargetHeight] = useState(800);
  const [maintainAspect, setMaintainAspect] = useState(true);
  const [quality, setQuality] = useState(85);
  const [processing, setProcessing] = useState(false);

  useEffect(() => { setPreview(value || ''); }, [value]);

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
      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
    };
    img.src = rawImageSrc;
  }, [showResizer, rawImageSrc, targetWidth, targetHeight]);

  const onFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const sizeKb = Math.round(file.size / 1024);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        setOrigDimensions({ width: img.width, height: img.height, sizeKb });
        const maxInit = 1400;
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

  const processAndUpload = async () => {
    if (!canvasRef.current) return;
    setProcessing(true);
    try {
      const canvas = canvasRef.current;
      const blob = await new Promise((resolve) => {
        canvas.toBlob(resolve, 'image/jpeg', quality / 100);
      });
      if (!blob) throw new Error("Gagal mengompresi gambar");

      const file = new File([blob], `team_gallery_${Date.now()}.jpg`, { type: 'image/jpeg' });
      setShowResizer(false);
      setUploading(true);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'uploads');
      const savedUser = localStorage.getItem('medsign_user');
      const token = savedUser ? JSON.parse(savedUser).token : null;
      const res = await fetch(`${API}/api/v1/upload`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.status === 'success') {
        const fullUrl = `${API}/${data.path}`;
        onChange(fullUrl);
        setPreview(fullUrl);
      }
    } catch (err) {
      console.error('Upload error:', err);
    } finally {
      setProcessing(false);
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={onFileSelect}
        className="hidden"
      />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="w-full py-3 px-4 rounded-2xl border-2 border-dashed border-sky-200 hover:border-sky-400 bg-sky-50/50 hover:bg-sky-50 text-sky-700 text-xs font-black uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
      >
        {uploading ? (
          <><Loader2 size={15} className="animate-spin" /> Mengunggah Gambar...</>
        ) : (
          <><Upload size={15} /> Unggah &amp; Resize Foto dari Komputer</>
        )}
      </button>

      {/* Interactive Resizer Modal */}
      {showResizer && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-fade-in" onClick={() => setShowResizer(false)}>
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-100 flex flex-col gap-4 animate-scale-up text-slate-800" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-sky-700">
                <Sparkles size={16} />
                <h3 className="text-sm font-black uppercase tracking-wide text-slate-900">Resize &amp; Kompresi Foto</h3>
              </div>
              <button type="button" onClick={() => setShowResizer(false)} className="p-1 rounded-xl hover:bg-slate-100 text-slate-400"><X size={16} /></button>
            </div>

            <div className="relative w-full h-52 bg-slate-900 rounded-2xl overflow-hidden flex items-center justify-center border border-slate-200">
              <canvas ref={canvasRef} className="max-w-full max-h-full object-contain" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Lebar (px)</label>
                <input
                  type="number"
                  value={targetWidth}
                  onChange={e => handleWidthChange(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] font-bold uppercase text-slate-400">Tinggi (px)</label>
                <input
                  type="number"
                  value={targetHeight}
                  onChange={e => handleHeightChange(e.target.value)}
                  className={inputCls}
                />
              </div>
            </div>

            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-2xl border border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer select-none text-[11px] font-bold text-slate-700">
                <input
                  type="checkbox"
                  checked={maintainAspect}
                  onChange={e => setMaintainAspect(e.target.checked)}
                  className="rounded text-sky-600 focus:ring-sky-500"
                />
                Kunci Rasio Gambar (Aspect Ratio)
              </label>
              <span className="text-[10px] font-black text-sky-700">{quality}% Kualitas</span>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowResizer(false)}
                className="px-4 py-2.5 rounded-2xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-all"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={processAndUpload}
                disabled={processing}
                className="px-5 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 flex items-center gap-2 shadow-md shadow-sky-900/10"
              >
                {processing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Terapkan &amp; Unggah
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export const TeamGalleryManager = ({ token, showToast }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null);

  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

  const fetchGallery = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/v1/about/team-gallery`);
      if (res.ok) {
        const data = await res.json();
        setItems((data.items || []).sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
      }
    } catch (e) {}
    setLoading(false);
  };

  useEffect(() => { fetchGallery(); }, []);

  const saveAll = async (list) => {
    setSaving(true);
    try {
      const res = await fetch(`${API}/api/v1/admin/team-gallery`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ items: list })
      });
      if (res.ok) {
        showToast?.('Dokumentasi tim berhasil disimpan', 'success');
        setItems(list.slice().sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
      } else {
        showToast?.('Gagal menyimpan galeri', 'error');
      }
    } catch (e) {
      showToast?.('Gagal terhubung ke server', 'error');
    } finally {
      setSaving(false);
    }
  };

  const upsert = (item) => {
    const exists = items.some(i => i.id === item.id);
    const next = exists ? items.map(i => (i.id === item.id ? item : i)) : [...items, item];
    setEditing(null);
    saveAll(next);
  };

  const remove = (id) => {
    if (!window.confirm('Hapus foto dokumentasi ini?')) return;
    saveAll(items.filter(i => i.id !== id));
  };

  const move = (idx, dir) => {
    const next = [...items];
    const j = idx + dir;
    if (j < 0 || j >= next.length) return;
    [next[idx], next[j]] = [next[j], next[idx]];
    saveAll(next.map((it, i) => ({ ...it, display_order: i + 1 })));
  };

  return (
    <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 sm:p-8 flex flex-col gap-6">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-sky-500/10 text-sky-600 border border-sky-500/20 flex items-center justify-center shadow-inner">
            <Camera size={20} strokeWidth={2.2} />
          </div>
          <div>
            <h3 className="text-base font-black text-slate-900 uppercase tracking-tight">Dokumentasi Tim &amp; Kegiatan</h3>
            <p className="text-xs font-semibold text-slate-400 mt-0.5">Kelola galeri kegiatan, riset lapangan, dan dokumentasi tim untuk halaman Tentang.</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchGallery}
            className="px-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-700 text-xs font-black uppercase hover:bg-slate-100 transition-all flex items-center gap-1.5 active:scale-95"
          >
            <RotateCcw size={13} /> Segarkan Data
          </button>
          <button
            onClick={() => setEditing(emptyItem())}
            className="px-5 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 shadow-md shadow-sky-900/10 active:scale-95"
          >
            <Plus size={15} strokeWidth={2.5} /> Tambah Foto
          </button>
        </div>
      </div>

      {/* Grid Photos */}
      {loading ? (
        <div className="py-20 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
          <Loader2 size={24} className="animate-spin text-sky-600" />
          <span>Memuat galeri dokumentasi...</span>
        </div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center rounded-3xl border border-dashed border-slate-200 bg-slate-50/50 flex flex-col items-center justify-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center">
            <ImageIcon size={24} />
          </div>
          <div className="max-w-xs">
            <h4 className="text-xs font-black uppercase text-slate-800">Belum Ada Foto Dokumentasi</h4>
            <p className="text-[11px] font-semibold text-slate-400 mt-1">Klik tombol &ldquo;Tambah Foto&rdquo; di atas untuk mengunggah foto tim atau kegiatan baru.</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {items.map((g, idx) => (
            <div key={g.id} className="rounded-3xl overflow-hidden border border-slate-200/80 bg-white hover:border-sky-300/80 hover:shadow-xl transition-all duration-300 flex flex-col justify-between group">
              <div className="relative aspect-[4/3] bg-slate-900 overflow-hidden">
                <img
                  src={g.image_url}
                  alt={g.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  onError={(e) => { e.currentTarget.style.opacity = 0.2; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider bg-black/40 px-2 py-0.5 rounded-lg backdrop-blur-sm">
                    Urutan #{idx + 1}
                  </span>
                </div>
                <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => move(idx, -1)}
                    disabled={idx === 0}
                    className="p-1.5 rounded-xl bg-white/90 text-slate-700 hover:text-sky-600 disabled:opacity-30 shadow-md backdrop-blur-sm transition-all active:scale-95"
                    title="Pindah ke atas"
                  >
                    <ArrowUp size={13} />
                  </button>
                  <button
                    onClick={() => move(idx, 1)}
                    disabled={idx === items.length - 1}
                    className="p-1.5 rounded-xl bg-white/90 text-slate-700 hover:text-sky-600 disabled:opacity-30 shadow-md backdrop-blur-sm transition-all active:scale-95"
                    title="Pindah ke bawah"
                  >
                    <ArrowDown size={13} />
                  </button>
                </div>
              </div>

              <div className="p-4 flex flex-col justify-between gap-3">
                <div>
                  <h4 className="text-xs font-black text-slate-900 leading-snug line-clamp-1 group-hover:text-sky-700 transition-colors">
                    {g.title}
                  </h4>
                  <p className="text-[11px] font-semibold text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                    {g.caption || '—'}
                  </p>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                  <button
                    onClick={() => setEditing(g)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-slate-50 hover:bg-sky-50 text-slate-600 hover:text-sky-700 text-[10px] font-black uppercase transition-all border border-slate-200/60 active:scale-95"
                  >
                    <Pencil size={11} /> Edit
                  </button>
                  <button
                    onClick={() => remove(g.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-rose-50/50 hover:bg-rose-50 text-rose-600 text-[10px] font-black uppercase transition-all border border-rose-200/40 active:scale-95"
                  >
                    <Trash2 size={11} /> Hapus
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Edit / Tambah Foto */}
      {editing && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in" onClick={() => setEditing(null)}>
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 sm:p-7 flex flex-col gap-4 animate-scale-up text-slate-800" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2 text-sky-700">
                <Camera size={18} />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                  {items.some(i => i.id === editing.id) ? 'Edit Foto Dokumentasi' : 'Tambah Foto Dokumentasi'}
                </h3>
              </div>
              <button onClick={() => setEditing(null)} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"><X size={16} /></button>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Judul Foto *</label>
              <input
                className={inputCls}
                value={editing.title}
                onChange={e => setEditing({ ...editing, title: e.target.value })}
                placeholder="Contoh: Pengambilan Data Isyarat di Rumah Sakit"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Keterangan / Caption</label>
              <textarea
                className={inputCls + ' min-h-[64px] resize-none'}
                value={editing.caption || ''}
                onChange={e => setEditing({ ...editing, caption: e.target.value })}
                placeholder="Deskripsi singkat kegiatan tim (opsional)"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Unggah Foto atau Masukkan URL *</label>
              <ImageUpload
                value={editing.image_url}
                onChange={(url) => setEditing({ ...editing, image_url: url })}
              />
              <div className="relative mt-1">
                <input
                  className={inputCls}
                  value={editing.image_url}
                  onChange={e => setEditing({ ...editing, image_url: e.target.value })}
                  placeholder="https://... atau /assets/foto.jpg"
                />
              </div>
            </div>

            {editing.image_url && (
              <div className="rounded-2xl overflow-hidden aspect-video bg-slate-900 border border-slate-200">
                <img src={editing.image_url} alt="Preview" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.opacity = 0.2; }} />
              </div>
            )}

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                onClick={() => setEditing(null)}
                className="px-5 py-2.5 rounded-2xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-all"
              >
                Batal
              </button>
              <button
                onClick={() => upsert({ ...editing, display_order: editing.display_order || items.length + 1 })}
                disabled={!editing.title || !editing.image_url || saving}
                className="px-6 py-2.5 rounded-2xl bg-sky-600 hover:bg-sky-700 text-white text-xs font-black uppercase tracking-wider transition-all disabled:opacity-30 flex items-center gap-2 shadow-md shadow-sky-900/10 active:scale-95"
              >
                {saving ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Simpan Perubahan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
