const getYouTubeEmbedUrl = (url) => {
  if (!url) return '';
  if (url.includes('youtube.com/embed/')) return url;
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=|shorts\/|live\/)([^#&?]*).*/;
  const match = url.match(regExp);
  if (match && match[2].length === 11) {
    return `https://www.youtube.com/embed/${match[2]}`;
  }
  return url;
};

import React, { useEffect, useRef, useContext } from 'react';
import { ScrollyHero } from '../components/ScrollyHero';
import { AppContext } from '../context/AppContextObject';
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  Camera,
  CheckCircle2,
  ExternalLink,
  FileText,
  Star,
} from 'lucide-react';

const MARKETING_SITE_URL =
  import.meta.env.VITE_MARKETING_SITE_URL || 'https://medsign-ai.vercel.app/';

const YOUTUBE_TUTORIAL_URL =
  import.meta.env.VITE_YOUTUBE_TUTORIAL_URL || 'https://www.youtube.com/@medsignai';

const DEFAULT_SECTION_ORDER = ['mitra', 'reviews', 'instagram', 'articles', 'brand_pkm', 'video_tutorial'];

const institutionLogos = [
  { name: 'Kemdikbudristek',        src: '/assets/logo-kemdikbudristek.png' },
  { name: 'Diktisaintek Berdampak', src: '/assets/logo-diktisaintek.png' },
  { name: 'PKM',                    src: '/assets/logo-pkm-full.png' },
  { name: 'Simbelmawa',             src: '/assets/logo-simbelmawa.png' },
  { name: 'Universitas Ma Chung',   src: '/assets/logo-umc.png' },
];

// Generic grey placeholder — SVG so zero network requests
const ImgPlaceholder = ({ className = '', aspectClass = 'aspect-video' }) => (
  <div className={`${aspectClass} ${className} w-full bg-slate-200 flex items-center justify-center overflow-hidden`}>
    <svg viewBox="0 0 24 24" className="w-10 h-10 text-slate-400" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  </div>
);

// Logo cell: hover → nama institusi muncul sebagai overlay bawah
const LogoCell = ({ src, name }) => {
  const [err, setErr] = React.useState(false);
  return (
    <div className="group relative flex h-24 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm overflow-hidden cursor-pointer hover:border-sky-200 hover:shadow-md transition-all duration-200">
      {!err ? (
        <img
          src={src}
          alt={`Logo ${name}`}
          className="max-h-14 w-auto max-w-full object-contain opacity-80 group-hover:opacity-100 transition-opacity duration-200"
          onError={() => setErr(true)}
        />
      ) : (
        <div className="w-full h-full bg-slate-100 flex items-center justify-center text-center p-2 rounded-2xl">
          <span className="text-[10px] font-black uppercase text-slate-400 leading-tight">{name}</span>
        </div>
      )}
      {/* Hover overlay — nama institusi */}
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-center py-1.5 bg-slate-900/85 backdrop-blur-sm translate-y-full group-hover:translate-y-0 transition-transform duration-200 ease-out">
        <span className="text-[9px] font-black text-white uppercase tracking-wider text-center leading-tight px-2">
          {name}
        </span>
      </div>
    </div>
  );
};

// Instagram post card with local error handling
const resolveIgMedia = (url) => {
  if (!url) return '';
  const clean = url.split('?')[0].replace(/\/$/, '');
  const match = clean.match(/instagram\.com\/(?:p|reel|tv)\/([A-Za-z0-9_-]+)/);
  if (match) {
    return `https://www.instagram.com/p/${match[1]}/media/?size=l`;
  }
  return url;
};

const InstagramPostCard = ({ post }) => {
  const [imgErr, setImgErr] = React.useState(false);
  const imgSrc = post.thumbnail_image || resolveIgMedia(post.post_url);

  return (
    <a
      href={post.post_url}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-[24px] overflow-hidden border border-slate-200/80 bg-white shadow-sm hover:shadow-xl hover:-translate-y-1 active:scale-[0.98] transition-all duration-300 flex flex-col group"
    >
      <div className="relative aspect-square w-full bg-slate-900 overflow-hidden">
        {imgSrc && !imgErr ? (
          <img
            src={imgSrc}
            alt={post.caption_short || 'Instagram post'}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            onError={() => setImgErr(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 p-4 text-center">
            <span className="text-white text-xs font-black uppercase tracking-wider line-clamp-3 leading-snug">
              {post.caption_short || 'MedSign AI Feed'}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
          <span className="text-[9px] font-black text-white uppercase tracking-wider bg-black/40 px-2 py-0.5 rounded-lg backdrop-blur-sm">
            Buka di Instagram ↗
          </span>
        </div>
      </div>
      <div className="p-3.5 flex-1 flex flex-col justify-between gap-2">
        <p className="text-[11px] font-semibold leading-relaxed text-slate-700 line-clamp-2">
          {post.caption_short}
        </p>
        <span className="text-[9.5px] font-black text-sky-600 group-hover:text-sky-700 uppercase tracking-wider flex items-center gap-1">
          Lihat Postingan <ArrowRight size={10} />
        </span>
      </div>
    </a>
  );
};

// Article card: show cover image or placeholder
const ArticleCard = ({ art }) => {
  const [imgErr, setImgErr] = React.useState(false);
  const hasCover = art.cover_image || art.image || art.thumbnail;
  const coverSrc = art.cover_image || art.image || art.thumbnail;

  return (
    <div className="rounded-[24px] overflow-hidden bg-white border border-slate-200 flex flex-col shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
      {hasCover && !imgErr ? (
        <img
          src={coverSrc}
          alt={art.title}
          className="aspect-video w-full object-cover"
          onError={() => setImgErr(true)}
        />
      ) : (
        <ImgPlaceholder aspectClass="aspect-video" className="rounded-t-[24px]" />
      )}
      <div className="p-5 flex flex-col gap-3 flex-1 justify-between">
        <div className="flex flex-col gap-2">
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
            {art.created_at
              ? new Date(art.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
              : '2026'}
          </span>
          <h3 className="text-sm font-black text-slate-900 leading-snug line-clamp-2">{art.title}</h3>
          <p className="text-[11px] font-medium leading-relaxed text-slate-500 line-clamp-3">{art.content}</p>
        </div>
        <div className="flex items-center justify-between border-t border-slate-100 pt-3 mt-1">
          <span className="text-[10px] font-bold text-slate-400">Oleh {art.author || 'Admin'}</span>
          <a
            href={MARKETING_SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-black text-sky-600 hover:text-sky-700 uppercase flex items-center gap-1"
          >
            Selengkapnya <ArrowRight size={10} />
          </a>
        </div>
      </div>
    </div>
  );
};

export const Home = ({ setView }) => {
  const { t, currentUser } = useContext(AppContext);

  const scopeRef = useRef(null);
  const [activeStage, setActiveStage] = React.useState(0);
  const [reviews, setReviews]               = React.useState([]);
  const [sectionOrder, setSectionOrder] = React.useState(DEFAULT_SECTION_ORDER);
  const [articles, setArticles]             = React.useState([]);
  const [instagramPosts, setInstagramPosts] = React.useState([]);
  const [dynamicMitra, setDynamicMitra]     = React.useState([]);
  const [videoTutorials, setVideoTutorials] = React.useState([]);

  React.useEffect(() => {
    const interval = setInterval(() => setActiveStage(p => (p + 1) % 4), 1800);
    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const base = (localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
        const safe = (p) => fetch(`${base}${p}`).then(r => r.ok ? r.json() : []).catch(() => []);
        const [rev, art, ig, mit, lay, vids] = await Promise.all([
          safe('/api/v1/reviews'),
          safe('/api/v1/articles'),
          safe('/api/v1/instagram-posts'),
          safe('/api/v1/mitra'),
          safe('/api/v1/homepage/layout'),
          safe('/api/v1/video-tutorials'),
        ]);
        setReviews(rev);
        setArticles(art);
        setInstagramPosts(ig);
        setDynamicMitra(mit);
        setVideoTutorials(Array.isArray(vids) ? vids.filter(v => v.is_active) : []);
        if (lay && lay.homepage_section_order) {
          const parsed = lay.homepage_section_order.split(",").map(s => s.trim()).filter(Boolean);
          const cleaned = parsed.filter(k => k !== 'dashboard_modul');
          setSectionOrder(cleaned.length > 0 ? cleaned : DEFAULT_SECTION_ORDER);
        }
      } catch (err) {
        console.error('Gagal memuat data live:', err);
      }
    };
    fetchData();
  }, []);

  // Reveal animation observer
  useEffect(() => {
    document.title = 'MedSign AI';
    const nodes = scopeRef.current?.querySelectorAll('[data-reveal]');
    if (!nodes?.length) return;
    const obs = new IntersectionObserver(
      entries => entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('is-visible'); }),
      { threshold: 0.05 }
    );
    nodes.forEach(n => obs.observe(n));
    return () => obs.disconnect();
  }, [articles, instagramPosts, reviews, dynamicMitra]);

  const mitraList = dynamicMitra.length > 0
    ? dynamicMitra.map(m => ({ name: m.name, src: m.logo }))
    : institutionLogos;

  return (
    <div ref={scopeRef} className="w-full text-slate-900">

      {/* ── SCROLLYTELLING HERO ──────────────────────────── */}
      <ScrollyHero setView={setView} />


      {/* ════════════════════════════════════════════════════
          KONTEN UTAMA — background putih full halaman
      ════════════════════════════════════════════════════ */}
      <div className="relative z-30 w-full bg-white -mt-[100vh]">
        {sectionOrder.map((sectionKey) => {
          switch (sectionKey.trim()) {
            case "mitra":
              return (
                <section key="mitra" className="px-4 py-12 md:px-10 lg:px-16" data-reveal>
                  <div className="mx-auto max-w-7xl">
                    <div className="flex flex-col gap-2 mb-8">
                      <span className="text-[10px] font-black uppercase text-sky-600 tracking-wider">Mitra MedSign</span>
                      <h2 className="text-2xl font-black text-slate-900">Ekosistem & Mitra</h2>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                      {mitraList.map((m, i) => (
                        <div key={i} data-reveal style={{ transitionDelay: `${i * 50}ms` }}>
                          <LogoCell src={m.src} name={m.name} />
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              );
            case "reviews":
              return reviews.length > 0 && (
                <section key="reviews" className="px-4 py-12 md:px-10 lg:px-16" data-reveal>
                  <div className="mx-auto max-w-7xl">
                    <div className="flex items-center justify-between mb-8">
                      <h2 className="text-2xl font-black text-slate-900">Ulasan Pengguna & Teman Tuli</h2>
                      {reviews.length > 4 && (
                        <button
                          onClick={() => setView('reviews_page')}
                          className="text-[11px] font-black text-sky-600 uppercase tracking-wider flex items-center gap-1.5 px-4 py-2 rounded-full border border-sky-200 bg-sky-50 hover:bg-sky-100 transition-colors"
                        >
                          Lihat Semua <ArrowRight size={11} />
                        </button>
                      )}
                    </div>
                    <div className="grid gap-5 md:grid-cols-2">
                      {reviews.slice(0, 4).map((rev, idx) => (
                        <div
                          key={rev.id || idx}
                          data-reveal
                          style={{ transitionDelay: `${idx * 60}ms` }}
                          className="p-6 rounded-[24px] bg-white border border-slate-200 flex flex-col justify-between gap-4"
                        >
                          <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-1 text-amber-400">
                              {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                                <Star key={i} size={13} fill="currentColor" />
                              ))}
                            </div>
                            <p className="text-sm font-medium leading-relaxed text-slate-700 italic">
                              "{rev.content}"
                            </p>
                          </div>
                          <div className="flex items-center gap-3 border-t border-slate-100 pt-3">
                            {rev.avatar ? (
                              <img 
                                src={rev.avatar} 
                                alt={rev.name} 
                                className="h-9 w-9 rounded-full object-cover shrink-0 border border-slate-200"
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.style.display = 'none';
                                  const fallback = e.currentTarget.nextSibling;
                                  if (fallback) fallback.style.display = 'flex';
                                }}
                              />
                            ) : null}
                            <div 
                              style={{ display: rev.avatar ? 'none' : 'flex' }}
                              className="h-9 w-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-black text-xs shrink-0"
                            >
                              {rev.name[0]}
                            </div>
                            <div>
                              <span className="block text-xs font-black text-slate-900">{rev.name}</span>
                              <span className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider">{rev.role}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              );
            case "instagram":
              return instagramPosts.length > 0 && (
                <section key="instagram" className="px-4 py-12 md:px-10 lg:px-16" data-reveal>
                  <div className="mx-auto max-w-7xl">
                    <div className="flex items-center justify-between mb-8">
                      <h2 className="text-2xl font-black text-slate-900">Konten Terbaru Instagram</h2>
                      <a
                        href="https://www.instagram.com/medsign.pkmkc/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-black text-pink-600 uppercase tracking-wider flex items-center gap-1.5 px-4 py-2 rounded-full border border-pink-200 bg-pink-50 hover:bg-pink-100 transition-colors"
                      >
                        More <ExternalLink size={11} />
                      </a>
                    </div>
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                      {instagramPosts.slice(0, 3).map((post) => (
                        <InstagramPostCard key={post.id} post={post} />
                      ))}
                    </div>
                  </div>
                </section>
              );
            case "articles":
              return (
                <section key="articles" className="px-4 py-12 md:px-10 lg:px-16" data-reveal>
                  <div className="mx-auto max-w-7xl">
                    <div className="flex items-center justify-between mb-8">
                      <h2 className="text-2xl font-black text-slate-900">Artikel Terkini</h2>
                      {articles.length > 5 && (
                        <button
                          onClick={() => setView('articles_page')}
                          className="text-[11px] font-black text-sky-600 uppercase tracking-wider flex items-center gap-1.5 px-4 py-2 rounded-full border border-sky-200 bg-sky-50 hover:bg-sky-100 transition-colors"
                        >
                          Lihat Semua <ArrowRight size={11} />
                        </button>
                      )}
                    </div>
                    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
                      {articles.length > 0 ? (
                        articles.slice(0, 5).map((art, idx) => (
                          <div key={art.id || idx} data-reveal style={{ transitionDelay: `${idx * 60}ms` }}>
                            <ArticleCard art={art} />
                          </div>
                        ))
                      ) : (
                        [0, 1, 2, 3, 4].map(i => (
                          <div key={i} className="rounded-[24px] overflow-hidden bg-white border border-slate-200">
                            <ImgPlaceholder aspectClass="aspect-video" />
                            <div className="p-5 flex flex-col gap-3">
                              <div className="h-2 bg-slate-200 rounded-full w-1/3" />
                              <div className="h-4 bg-slate-200 rounded-full w-4/5" />
                              <div className="h-3 bg-slate-100 rounded-full w-full" />
                              <div className="h-3 bg-slate-100 rounded-full w-3/4" />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </section>
              );
            case "brand_pkm":
              return (
                <section key="brand_pkm" className="px-4 py-12 md:px-10 lg:px-16" data-reveal>
                  <div className="mx-auto max-w-7xl rounded-[28px] border border-slate-200 bg-slate-50 p-8 md:p-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
                    <div>
                      <p className="text-[10px] font-black uppercase text-sky-600 tracking-wider mb-2">Brand & Program</p>
                      <h2 className="text-2xl font-black text-slate-900 mb-2">MedSign AI dalam program PKM-KC</h2>
                      <p className="text-sm font-medium leading-relaxed text-slate-600 max-w-xl">
                        Logo MedSign dipakai sebagai identitas produk, sementara logo PKM diposisikan sebagai identitas program akademik pendukung.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 shrink-0">
                      <div className="rounded-2xl border border-white bg-white p-4 shadow-sm">
                        <img src="/assets/medsign-logo.png" alt="Logo MedSign" className="h-12 w-auto object-contain object-left" />
                      </div>
                      <div className="rounded-2xl border border-white bg-white p-4 shadow-sm">
                        <img src="/assets/pkm-logo.png" alt="Logo PKM" className="h-12 w-auto object-contain" />
                      </div>
                    </div>
                  </div>
                </section>
              );
            case "video_tutorial":
              const activeVid = videoTutorials.length > 0 ? videoTutorials[0] : null;
              const embedSrc = activeVid ? getYouTubeEmbedUrl(activeVid.video_url) : getYouTubeEmbedUrl(YOUTUBE_TUTORIAL_URL);
              const vidTitle = activeVid ? activeVid.title : "Video Tutorial MedSign AI";
              const vidDesc = activeVid?.description || "Simak bagaimana asisten komunikasi medis tunarungu bekerja dalam menjembatani pemeriksaan medis sehari-hari. Mulai dari pengambilan kamera input, pemrosesan model BISINDO, keluaran teks verbal, hingga pelafalan suara verbal dokter.";

              return (
                <section key="video_tutorial" className="px-4 pb-16 pt-4 md:px-10 lg:px-16">
                  <div className="mx-auto max-w-7xl grid gap-5 lg:grid-cols-2">
                    {/* Video Tutorial Panel (Langsung Play via Embed) */}
                    <div className="rounded-[28px] p-6 flex flex-col gap-4 bg-white border border-slate-200 shadow-sm">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-[10px] font-bold text-sky-700 uppercase tracking-widest">Panduan Penggunaan</p>
                          <h2 className="text-xl font-black text-slate-900 leading-tight mt-1">{vidTitle}</h2>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 border border-sky-100 shrink-0">
                          <Activity size={20} className="animate-pulse" />
                        </div>
                      </div>

                      <div className="relative rounded-2xl overflow-hidden bg-slate-950 aspect-video shadow-inner border border-slate-200">
                        <iframe
                          src={`${embedSrc}${embedSrc.includes('?') ? '&' : '?'}rel=0&modestbranding=1`}
                          title={vidTitle}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="absolute inset-0 w-full h-full rounded-2xl border-0"
                        />
                      </div>

                      <div className="flex flex-col gap-1 text-[10px] font-semibold text-slate-500 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                        <span className="text-[9px] font-black uppercase text-slate-400">Deskripsi Panduan</span>
                        <span>{vidDesc}</span>
                      </div>
                    </div>

                    {/* Status panel */}
                    <div className="rounded-[28px] bg-white border border-slate-200 p-8 flex flex-col justify-between">
                      <div>
                        <div className="mb-5 flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600">
                            <BadgeCheck size={24} />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-emerald-700">Status implementasi</p>
                            <h2 className="text-2xl font-black text-slate-900">UI siap dipakai untuk demo</h2>
                          </div>
                        </div>

                        <div className="grid gap-3 mb-6">
                          {[
                            'Mode pasien menampilkan kamera, hasil translasi, spelling abjad A-Z & angka 1-9, kosakata, dan log.',
                            'Mode dokter menyediakan panel respon cepat, TTS, dan timeline konsultasi.',
                            'Alert darurat tetap aktif untuk sinyal seperti nyeri dada atau bantuan segera.',
                          ].map(item => (
                            <div key={item} className="flex gap-3 rounded-2xl bg-slate-50 border border-slate-100 p-3">
                              <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-500" />
                              <p className="text-sm font-medium leading-6 text-slate-600">{item}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex flex-col gap-3 sm:flex-row pt-2">
                        <button
                          onClick={() => setView('patient')}
                          className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white transition-all active:scale-95"
                          style={{ background: 'linear-gradient(135deg,#0ea5e9,#0d9488)', boxShadow: '0 6px 20px rgba(14,165,233,0.3)' }}
                        >
                          <Camera size={16} /> Coba Konsultasi
                        </button>
                        <button
                          onClick={() => setView('about')}
                          className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100 transition-all active:scale-95"
                        >
                          <FileText size={16} /> Detail Proyek
                        </button>
                      </div>
                    </div>
                  </div>
                </section>
              );
            default:
              return null;
          }
        })}
      </div>
    </div>
  );
};
