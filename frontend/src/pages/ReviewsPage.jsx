import React, { useEffect, useState } from 'react';
import { Star, Search, Quote } from 'lucide-react';

export const ReviewsPage = ({ setView }) => {
  const [reviews, setReviews] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchReviews = async () => {
      try {
        const apiBaseUrl = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        const cleanUrl = apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
        const res = await fetch(`${cleanUrl}/api/v1/reviews`);
        if (res.ok) setReviews(await res.json());
      } catch (e) {}
    };
    fetchReviews();
  }, []);

  const filtered = reviews.filter(r =>
    !searchQuery ||
    (r.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.role || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (r.content || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-2 animate-slide-up text-slate-800">
      <div className="glass-panel rounded-[32px] p-6 md:p-8 flex flex-col gap-6">
        <div>
          <span className="text-[10px] font-black uppercase text-sky-700 tracking-wider">Testimoni</span>
          <h2 className="text-3xl font-black text-slate-950 mt-1">Semua Ulasan Pengguna & Teman Tuli</h2>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
            Cerita dan pengalaman nyata dari pengguna MedSign AI — pasien tunarungu, dokter, dan teman Tuli.
          </p>
        </div>

        <div className="relative max-w-md w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari ulasan berdasarkan nama, peran, atau isi..."
            className="w-full rounded-2xl border border-slate-200 bg-white/60 pl-11 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
          />
        </div>

        <div className="grid gap-5 md:grid-cols-2 mt-2">
          {filtered.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs font-semibold text-slate-400">
              Tidak ada ulasan yang cocok dengan pencarian Anda.
            </div>
          ) : (
            filtered.map((rev, idx) => (
              <div key={rev.id || idx} className="glass-panel rounded-[24px] p-6 border border-white/60 shadow-sm flex flex-col justify-between gap-4">
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-amber-400">
                      {Array.from({ length: Math.round(rev.rating || 5) }).map((_, i) => (
                        <Star key={i} size={13} fill="currentColor" />
                      ))}
                    </div>
                    <Quote size={16} className="text-sky-200" />
                  </div>
                  <p className="text-sm font-medium leading-relaxed text-slate-700 italic">"{rev.content}"</p>
                </div>
                <div className="flex items-center gap-3 border-t border-slate-100 pt-3">
                  {rev.avatar ? (
                    <img
                      src={rev.avatar}
                      alt={rev.name}
                      className="h-9 w-9 rounded-full object-cover shrink-0 border border-slate-200"
                      onError={(e) => { e.currentTarget.style.display = 'none'; if (e.currentTarget.nextSibling) e.currentTarget.nextSibling.style.display = 'flex'; }}
                    />
                  ) : null}
                  <div
                    style={{ display: rev.avatar ? 'none' : 'flex' }}
                    className="h-9 w-9 rounded-full bg-slate-100 items-center justify-center text-slate-400 font-black text-xs shrink-0"
                  >
                    {(rev.name || '?')[0]}
                  </div>
                  <div>
                    <span className="block text-xs font-black text-slate-900">{rev.name}</span>
                    <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">{rev.role}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <button
          onClick={() => setView('home')}
          className="w-fit mx-auto mt-2 px-6 py-2.5 rounded-2xl border border-slate-200 bg-white text-xs font-black uppercase tracking-wider text-slate-600 hover:bg-slate-50 transition-all active:scale-95 shadow-sm"
        >
          Kembali ke Beranda
        </button>
      </div>
    </div>
  );
};
