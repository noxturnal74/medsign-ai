import React, { useState, useEffect } from 'react';
import { Camera, Plus, Pencil, Trash2, Save, Loader2, X, Check, RotateCcw } from 'lucide-react';

const API = (localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

const inputCls = 'w-full rounded-xl border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-800 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400 transition-all placeholder:text-slate-300';

const emptyItem = () => ({ id: crypto.randomUUID(), title: '', caption: '', image_url: '', display_order: 0 });

export const TeamGalleryManager = ({ token, showToast }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(null); // item being edited in modal

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
        showToast('Dokumentasi tim berhasil disimpan', 'success');
        setItems(list.slice().sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
      } else {
        showToast('Gagal menyimpan galeri', 'error');
      }
    } catch (e) {
      showToast('Gagal terhubung ke server', 'error');
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
    <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-5 flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-sky-600 flex items-center justify-center text-white"><Camera size={16} /></div>
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase">Dokumentasi Tim</h3>
            <p className="text-[10px] font-semibold text-slate-400">Galeri kegiatan tim di halaman Tentang — masonry + hover zoom + lightbox.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchGallery} className="px-3.5 py-2 rounded-xl bg-white border border-slate-300 text-slate-700 text-[10px] font-black uppercase hover:bg-slate-100 transition-all flex items-center gap-1.5">
            <RotateCcw size={12} /> Set ke Tersimpan
          </button>
          <button onClick={() => setEditing(emptyItem())} className="px-4 py-2 rounded-xl bg-[#053D67] text-white text-[10px] font-black uppercase hover:opacity-90 transition-all flex items-center gap-1.5">
            <Plus size={13} /> Tambah Foto
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-10 text-center text-xs text-slate-400"><Loader2 size={18} className="animate-spin mx-auto mb-1" />Memuat…</div>
      ) : items.length === 0 ? (
        <div className="py-10 text-center text-xs font-semibold text-slate-400">Belum ada foto dokumentasi. Klik "Tambah Foto" untuk memulai.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {items.map((g, idx) => (
            <div key={g.id} className="rounded-2xl overflow-hidden border border-slate-100 bg-slate-50 group">
              <div className="relative aspect-video bg-slate-100">
                <img src={g.image_url} alt={g.title} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.opacity = 0.2; }} />
                <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => move(idx, -1)} className="p-1 rounded-lg bg-white/90 text-slate-600 hover:text-sky-700 text-[10px] font-black">↑</button>
                  <button onClick={() => move(idx, 1)} className="p-1 rounded-lg bg-white/90 text-slate-600 hover:text-sky-700 text-[10px] font-black">↓</button>
                </div>
              </div>
              <div className="p-2.5 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-[11px] font-black text-slate-900 truncate">{g.title}</p>
                  <p className="text-[9px] font-semibold text-slate-400 truncate">{g.caption || '—'}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => setEditing(g)} className="p-1.5 rounded-lg hover:bg-sky-50 text-slate-400 hover:text-sky-600"><Pencil size={12} /></button>
                  <button onClick={() => remove(g.id)} className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-400 hover:text-rose-600"><Trash2 size={12} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal edit/tambah */}
      {editing && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
          <div className="relative bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 flex flex-col gap-3 animate-slide-up" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900 uppercase">{items.some(i => i.id === editing.id) ? 'Edit Foto' : 'Tambah Foto'}</h3>
              <button onClick={() => setEditing(null)} className="p-1.5 rounded-xl hover:bg-slate-100 text-slate-400"><X size={15} /></button>
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold uppercase text-slate-400">Judul *</label>
              <input className={inputCls} value={editing.title} onChange={e => setEditing({ ...editing, title: e.target.value })} placeholder="Contoh: Pengambilan Dataset di RSI" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold uppercase text-slate-400">Keterangan</label>
              <input className={inputCls} value={editing.caption || ''} onChange={e => setEditing({ ...editing, caption: e.target.value })} placeholder="Caption singkat (opsional)" />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[9px] font-bold uppercase text-slate-400">URL Gambar *</label>
              <input className={inputCls} value={editing.image_url} onChange={e => setEditing({ ...editing, image_url: e.target.value })} placeholder="https://... atau /assets/foto.jpg" />
            </div>
            {editing.image_url && (
              <img src={editing.image_url} alt="preview" className="rounded-xl aspect-video object-cover border border-slate-100" onError={(e) => { e.currentTarget.style.opacity = 0.2; }} />
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setEditing(null)} className="px-4 py-2 rounded-xl text-[10px] font-bold uppercase text-slate-500 hover:bg-slate-100">Batal</button>
              <button
                onClick={() => upsert({ ...editing, display_order: editing.display_order || items.length + 1 })}
                disabled={!editing.title || !editing.image_url || saving}
                className="px-5 py-2 rounded-xl bg-[#053D67] text-white text-[10px] font-black uppercase hover:opacity-90 disabled:opacity-30 flex items-center gap-1.5"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Simpan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
