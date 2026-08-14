import React, { useEffect, useState } from 'react';
import { FileText, ArrowRight, ExternalLink } from 'lucide-react';

export const ArticlesPage = ({ setView }) => {
  const [articles, setArticles] = useState([]);

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

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-2 animate-slide-up text-slate-800">
      <div className="glass-panel rounded-[32px] p-6 md:p-8 flex flex-col gap-6">
        <div>
          <span className="text-[10px] font-black uppercase text-sky-700 tracking-wider">Artikel Edukasi</span>
          <h2 className="text-3xl font-black text-slate-950 mt-1">Edukasi BISINDO & Kesehatan</h2>
          <p className="mt-4 text-sm font-semibold leading-7 text-slate-655">
            Temukan wawasan terbaru, informasi BISINDO medis, dan cerita seputar komunitas teman Tuli.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-4">
          {articles.map((art) => (
            <div key={art.id} className="glass-panel rounded-[28px] border border-white/60 shadow-lg flex flex-col justify-between overflow-hidden">
              <div className="p-5 flex flex-col gap-3">
                <span className="text-[9px] font-bold text-slate-400 uppercase">
                  {new Date(art.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
                <h3 className="text-sm font-black text-slate-950 leading-snug">{art.title}</h3>
                <p className="text-[11px] font-medium leading-relaxed text-slate-500 line-clamp-3">{art.content}</p>
              </div>
              <div className="p-5 border-t border-slate-100/50 flex items-center justify-between mt-auto">
                <span className="text-[10px] font-bold text-slate-400">Oleh {art.author}</span>
                <a href={art.cover_image || "#"} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black text-sky-600 hover:text-sky-700 uppercase flex items-center gap-1">
                  Selengkapnya <ArrowRight size={10} />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
