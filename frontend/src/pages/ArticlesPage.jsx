import React, { useEffect, useState } from 'react';
import { FileText, ArrowRight, Search, Image as ImageIcon } from 'lucide-react';

export const ArticlesPage = ({ setView }) => {
  const [articles, setArticles] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchArticles = async () => {
      try {
        const apiBaseUrl = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
        const cleanUrl = apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl;
        const res = await fetch(`${cleanUrl}/api/v1/articles`);
        if (res.ok) {
          setArticles(await res.json());
        }
      } catch(e){}
    };
    fetchArticles();
  }, []);

  const filteredArticles = articles.filter(art =>
    !searchQuery ||
    art.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (art.category && art.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
    art.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-2 animate-slide-up text-slate-800">
      <div className="glass-panel rounded-[32px] p-6 md:p-8 flex flex-col gap-6">
        <div>
          <span className="text-[10px] font-black uppercase text-sky-700 tracking-wider">Artikel Edukasi</span>
          <h2 className="text-3xl font-black text-slate-950 mt-1">Edukasi BISINDO & Kesehatan</h2>
          <p className="mt-2 text-sm font-semibold leading-relaxed text-slate-500">
            Temukan wawasan terbaru, informasi BISINDO medis, dan cerita seputar komunitas teman Tuli.
          </p>
        </div>

        {/* Search Bar Input */}
        <div className="relative max-w-md w-full">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari artikel berdasarkan judul, kategori, atau isi..."
            className="w-full rounded-2xl border border-slate-200 bg-white/60 pl-11 pr-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500 shadow-sm"
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-2">
          {filteredArticles.length === 0 ? (
            <div className="col-span-full py-12 text-center text-xs font-semibold text-slate-400">
              Tidak ada artikel yang cocok dengan pencarian Anda.
            </div>
          ) : (
            filteredArticles.map((art) => {
              const coverSrc = art.cover_image || art.image || art.thumbnail;
              return (
                <div key={art.id} className="glass-panel rounded-[28px] border border-white/60 shadow-lg flex flex-col justify-between overflow-hidden hover:-translate-y-0.5 transition-all">
                  
                  {/* Article Cover Image / Placeholder */}
                  <div className="aspect-video w-full bg-slate-100 flex items-center justify-center overflow-hidden border-b border-slate-100">
                    {coverSrc ? (
                      <img
                        src={coverSrc}
                        alt={art.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.onerror = null;
                          e.currentTarget.style.display = 'none';
                          const sibling = e.currentTarget.nextSibling;
                          if (sibling) sibling.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div 
                      style={{ display: coverSrc ? 'none' : 'flex' }} 
                      className="flex-col items-center justify-center text-slate-400"
                    >
                      <ImageIcon size={28} className="opacity-60" />
                    </div>
                  </div>

                  <div className="p-5 flex flex-col gap-3 flex-grow">
                    <span className="text-[9px] font-bold text-slate-400 uppercase">
                      {art.created_at
                        ? new Date(art.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
                        : '2026'}
                    </span>
                    <h3 className="text-sm font-black text-slate-950 leading-snug line-clamp-2">{art.title}</h3>
                    <p className="text-[11px] font-medium leading-relaxed text-slate-500 line-clamp-3">{art.content}</p>
                  </div>

                  <div className="p-5 border-t border-slate-100/50 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-400">Oleh {art.author || 'Admin'}</span>
                    <a 
                      href={(() => {
                        const content = art.content || "";
                        const mdMatch = content.match(/\[.*?\]\((https?:\/\/.*?)\)/);
                        if (mdMatch) return mdMatch[1];
                        const urlMatch = content.match(/(https?:\/\/[^\s\)]+)/);
                        if (urlMatch) return urlMatch[1];
                        return coverSrc || "#";
                      })()} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-[10px] font-black text-sky-600 hover:text-sky-700 uppercase flex items-center gap-1"
                    >
                      Selengkapnya <ArrowRight size={10} />
                    </a>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
