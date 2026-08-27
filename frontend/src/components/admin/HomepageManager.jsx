import React, { useState, useEffect, useCallback, useContext, useRef } from 'react';
import {
  LayoutGrid, Save, ArrowUp, ArrowDown, Power, EyeOff,
  Plus, Pencil, Trash2, X, Check, Loader2, GripVertical, RotateCcw,
  Newspaper, Star, Instagram, Building2, Video, Globe, Upload, Search
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

/* ═══ Small reusable modal ═══ */
const Modal = ({ open, onClose, title, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
      <div
        className="relative bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black text-slate-900 uppercase">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"><X size={16} /></button>
        </div>
        {children}
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

/* ═══ Image Upload Component ═══ */
const ImageUpload = ({ value, onChange, accept = "image/*", label = "Upload Gambar" }) => {
  const fileRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState(value || '');

  useEffect(() => { setPreview(value || ''); }, [value]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'data/uploads');
      const apiBase = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const token = localStorage.getItem('medsign_token');
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
        alert(data.detail || 'Gagal upload');
      }
    } catch (err) {
      console.error('Upload error:', err);
      alert('Gagal upload file');
    }
    setUploading(false);
  };

  return (
    <div className="flex flex-col gap-1.5">
      {preview && (
        <div className="relative w-full h-20 rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
          <img src={preview} alt="" className="w-full h-full object-contain" />
          <button
            type="button"
            onClick={() => { onChange(''); setPreview(''); }}
            className="absolute top-1 right-1 p-1 rounded-lg bg-white/90 text-rose-500 hover:bg-rose-50 transition-all shadow-sm"
          ><X size={12} /></button>
        </div>
      )}
      <input ref={fileRef} type="file" accept={accept} onChange={handleUpload} className="hidden" />
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl border border-dashed border-slate-300 text-slate-500 hover:border-sky-400 hover:text-sky-600 hover:bg-sky-50/50 transition-all text-[10px] font-bold uppercase disabled:opacity-50"
      >
        {uploading ? <><Loader2 size={13} className="animate-spin" /> Mengunggah...</> : <><Upload size={13} /> {label}</>}
      </button>
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
                <button onClick={() => onDelete(row.id)} className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 transition-all" title="Hapus"><Trash2 size={13} /></button>
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
  const { token } = useContext(AppContext);
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
  const [data, setData] = useState({ mitra: [], reviews: [], instagram: [], articles: [], brand_pkm: [], video_tutorial: [] });
  const [loading, setLoading] = useState({});
  const [modal, setModal] = useState({ open: false, module: null, item: null });
  const [searchQuery, setSearchQuery] = useState('');

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
      else return;
      const r = await fetch(url, { headers });
      const json = await r.json();
      setData(p => ({ ...p, [module]: Array.isArray(json) ? json : [] }));
    } catch (e) { console.error(`Fetch ${module} error:`, e); }
    setLoading(p => ({ ...p, [module]: false }));
  }, [token]);

  useEffect(() => { fetchData(subTab); setSearchQuery(''); }, [subTab, fetchData]);

  const deleteItem = async (module, id) => {
    if (!window.confirm('Yakin ingin menghapus item ini?')) return;
    try {
      let url;
      if (module === 'mitra') url = `${API}/api/v1/admin/mitra/${id}`;
      else if (module === 'reviews') url = `${API}/api/v1/admin/reviews/${id}`;
      else if (module === 'instagram') url = `${API}/api/v1/admin/instagram-posts/${id}`;
      else if (module === 'articles') url = `${API}/api/v1/admin/articles/${id}`;
      else if (module === 'brand_pkm') url = `${API}/api/v1/admin/brand-pkm/${id}`;
      else if (module === 'video_tutorial') url = `${API}/api/v1/admin/video-tutorials/${id}`;
      else return;
      await fetch(url, { method: 'DELETE', headers });
      fetchData(module);
    } catch (e) { console.error(`Delete error:`, e); }
  };

  const saveItem = async (module, item) => {
    try {
      const isEdit = !!item.id && data[module].some(i => i.id === item.id);

      let url, method;
      if (module === 'mitra') { url = isEdit ? `${API}/api/v1/admin/mitra/${item.id}` : `${API}/api/v1/admin/mitra`; method = isEdit ? 'PUT' : 'POST'; }
      else if (module === 'reviews') { url = isEdit ? `${API}/api/v1/admin/reviews/${item.id}` : `${API}/api/v1/admin/reviews`; method = isEdit ? 'PUT' : 'POST'; }
      else if (module === 'instagram') { url = isEdit ? `${API}/api/v1/admin/instagram-posts/${item.id}` : `${API}/api/v1/admin/instagram-posts`; method = isEdit ? 'PUT' : 'POST'; }
      else if (module === 'articles') { url = isEdit ? `${API}/api/v1/admin/articles/${item.id}` : `${API}/api/v1/admin/articles`; method = isEdit ? 'PUT' : 'POST'; }
      else if (module === 'brand_pkm') { url = isEdit ? `${API}/api/v1/admin/brand-pkm/${item.id}` : `${API}/api/v1/admin/brand-pkm`; method = isEdit ? 'PUT' : 'POST'; }
      else if (module === 'video_tutorial') { url = isEdit ? `${API}/api/v1/admin/video-tutorials/${item.id}` : `${API}/api/v1/admin/video-tutorials`; method = isEdit ? 'PUT' : 'POST'; }
      else return;

      await fetch(url, { method, headers, body: JSON.stringify(item) });
      fetchData(module);
      setModal({ open: false, module: null, item: null });
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
                onDelete={(id) => deleteItem(subTab, id)}
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
      </Modal>
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
  const [f, setF] = useState(item || { title: '', slug: '', cover_image: '', content: '', excerpt: '', category: 'Edukasi BISINDO', author: 'MedSign AI', status: 'published' });
  const set = (k, v) => setF(p => ({ ...p, [k]: v }));
  const autoSlug = (title) => title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  return (
    <div className="flex flex-col gap-3">
      <Field label="Judul" required><input className={inputCls} value={f.title} onChange={e => { set('title', e.target.value); if (!item) set('slug', autoSlug(e.target.value)); }} /></Field>
      <Field label="Slug" required><input className={inputCls + ' font-mono'} value={f.slug} onChange={e => set('slug', e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Kategori"><input className={inputCls} value={f.category || ''} onChange={e => set('category', e.target.value)} placeholder="Edukasi BISINDO" /></Field>
        <Field label="Penulis"><input className={inputCls} value={f.author || ''} onChange={e => set('author', e.target.value)} placeholder="MedSign AI" /></Field>
      </div>
      <Field label="Cover Image URL"><input className={inputCls} value={f.cover_image || ''} onChange={e => set('cover_image', e.target.value)} placeholder="https://..." /></Field>
      <ImageUpload value={f.cover_image || ''} onChange={(url) => set('cover_image', url)} label="Upload Cover Artikel" />
      <Field label="Excerpt"><textarea className={inputCls + ' min-h-[50px] resize-none'} value={f.excerpt || ''} onChange={e => set('excerpt', e.target.value)} placeholder="Ringkasan artikel" /></Field>
      <Field label="Konten" required><textarea className={inputCls + ' min-h-[120px] resize-y'} value={f.content} onChange={e => set('content', e.target.value)} /></Field>
      <Field label="Status"><select className={selectCls} value={f.status} onChange={e => set('status', e.target.value)}>
        <option value="published">Published</option><option value="draft">Draft</option>
      </select></Field>
      <div className="flex justify-end gap-2 pt-2">
        <button onClick={onClose} className="px-4 py-2 rounded-xl text-[10px] font-bold uppercase text-slate-500 hover:bg-slate-100 transition-all">Batal</button>
        <button onClick={() => onSave(f)} disabled={!f.title || !f.content} className="px-5 py-2 rounded-xl bg-[#053D67] text-white text-[10px] font-black uppercase hover:opacity-90 transition-all disabled:opacity-30 flex items-center gap-1.5"><Check size={13} /> Simpan</button>
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
