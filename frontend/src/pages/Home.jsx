import React, { useEffect, useRef, useContext } from 'react';
import { ScrollyHero } from '../components/ScrollyHero';
import { AppContext } from '../context/AppContextObject';
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  BrainCircuit,
  Camera,
  CheckCircle2,
  Database,
  ExternalLink,
  FileText,
  Gauge,
  HeartPulse,
  ScanLine,
  Stethoscope,
  User,
  Video,
  Volume2,
  Star,
} from 'lucide-react';

const MARKETING_SITE_URL =
  import.meta.env.VITE_MARKETING_SITE_URL || 'https://medsign-ai.vercel.app/';

const dashboardItems = [
  { id: 'motion',          title: 'Motion Visualizer', desc: 'Visualisasi 3D neon trajektori isyarat BISINDO secara real-time.',        icon: Video },
  { id: 'patient',         title: 'Translate BISINDO', desc: 'Penerjemahan isyarat BISINDO pasien ke teks verbal medis.',               icon: ScanLine },
  { id: 'doctor',          title: 'Consultation',      desc: 'Sistem komunikasi dua arah dokter-pasien dengan preset respon.',         icon: HeartPulse },
  { id: 'patient',         title: 'Patient Mode',      desc: 'Layar khusus pasien tunarungu dengan input kamera terintegrasi.',        icon: User },
  { id: 'doctor',          title: 'Doctor Mode',       desc: 'Layar khusus dokter untuk input teks, voice record, dan preset.',       icon: Stethoscope },
  { id: 'data-collection', title: 'History & Dataset', desc: 'Histori perekaman sampel dan manajemen antrean sesi.',                   icon: Database },
];

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
const InstagramPostCard = ({ post }) => {
  const [imgErr, setImgErr] = React.useState(false);
  return (
    <a
      href={post.post_url}
      target="_blank"
      rel="noopener noreferrer"
      className="rounded-[20px] overflow-hidden border border-slate-200 bg-white shadow-sm hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all flex flex-col"
    >
      {post.thumbnail_image && !imgErr ? (
        <img
          src={post.thumbnail_image}
          alt={post.caption_short || 'Instagram post'}
          className="aspect-square w-full object-cover"
          onError={() => setImgErr(true)}
        />
      ) : (
        <ImgPlaceholder aspectClass="aspect-square" />
      )}
      <div className="p-3 flex-1 flex flex-col justify-between gap-2">
        <p className="text-[10px] font-medium leading-relaxed text-slate-600 line-clamp-2">
          {post.caption_short}
        </p>
        <span className="text-[9px] font-black text-sky-600 uppercase tracking-wider">Lihat Postingan</span>
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

  const filteredDashboardItems = dashboardItems.filter(item => {
    if (item.id === 'motion' || item.id === 'data-collection') {
      return currentUser && currentUser.role === 'admin';
    }
    return true;
  });

  const scopeRef = useRef(null);
  const [activeStage, setActiveStage] = React.useState(0);
  const [reviews, setReviews]               = React.useState([]);
  const [articles, setArticles]             = React.useState([]);
  const [instagramPosts, setInstagramPosts] = React.useState([]);
  const [dynamicMitra, setDynamicMitra]     = React.useState([]);

  React.useEffect(() => {
    const interval = setInterval(() => setActiveStage(p => (p + 1) % 4), 1800);
    return () => clearInterval(interval);
  }, []);

  React.useEffect(() => {
    const fetchData = async () => {
      try {
        const base = (localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
        const safe = (p) => fetch(`${base}${p}`).then(r => r.ok ? r.json() : []).catch(() => []);
        const [rev, art, ig, mit] = await Promise.all([
          safe('/api/v1/reviews'),
          safe('/api/v1/articles'),
          safe('/api/v1/instagram-posts'),
          safe('/api/v1/mitra'),
        ]);
        setReviews(rev);
        setArticles(art);
        setInstagramPosts(ig);
        setDynamicMitra(mit);
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
          KONTEN UTAMA — background putih/slate ringan
      ════════════════════════════════════════════════════ */}
      <div className="relative z-30 bg-slate-50 -mt-[100vh]">

        {/* ── DASHBOARD MODUL ─────────────────────────────── */}
        <section className="px-4 pt-4 pb-8 md:px-10 lg:px-16" data-reveal>
          <div className="mx-auto max-w-7xl">
            <h2 id="pilih-modul-heading" className="text-2xl font-black text-slate-900 mb-8">Pilih Modul MedSign AI</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredDashboardItems.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    onClick={() => setView(item.id)}
                    data-reveal
                    style={{ transitionDelay: `${index * 55}ms` }}
                    className="group p-7 rounded-[28px] bg-white border border-slate-200 hover:border-sky-300 hover:shadow-xl hover:shadow-sky-500/8 hover:-translate-y-1 active:scale-[0.98] transition-all cursor-pointer"
                  >
                    <div className="h-11 w-11 rounded-2xl bg-sky-50 border border-sky-100 text-sky-600 flex items-center justify-center mb-5">
                      <Icon size={20} />
                    </div>
                    <h3 className="text-base font-black text-slate-900 mb-2">{item.title}</h3>
                    <p className="text-[12px] font-medium text-slate-500 leading-relaxed mb-4">{item.desc}</p>
                    <span className="text-[11px] font-black text-sky-600 uppercase flex items-center gap-1.5 group-hover:gap-2.5 transition-all">
                      Buka Modul <ArrowRight size={12} />
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── EKOSISTEM & MITRA ───────────────────────────── */}
        <section className="px-4 py-12 md:px-10 lg:px-16 bg-white" data-reveal>
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

        {/* ── ULASAN PENGGUNA ─────────────────────────────── */}
        {reviews.length > 0 && (
          <section className="px-4 py-12 md:px-10 lg:px-16" data-reveal>
            <div className="mx-auto max-w-7xl">
              <h2 className="text-2xl font-black text-slate-900 mb-8">Ulasan Pengguna & Teman Tuli</h2>
              <div className="grid gap-5 md:grid-cols-2">
                {reviews.map((rev, idx) => (
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
        )}

        {/* ── INSTAGRAM FEED ──────────────────────────────── */}
        {instagramPosts.length > 0 && (
          <section className="px-4 py-12 bg-white md:px-10 lg:px-16" data-reveal>
            <div className="mx-auto max-w-7xl">
              <h2 className="text-2xl font-black text-slate-900 mb-8">Konten Terbaru Instagram</h2>
              <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {instagramPosts.map((post) => (
                  <InstagramPostCard key={post.id} post={post} />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ── ARTIKEL TERKINI ─────────────────────────────── */}
        <section className="px-4 py-12 md:px-10 lg:px-16" data-reveal>
          <div className="mx-auto max-w-7xl">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-black text-slate-900">Artikel Terkini</h2>
              <a
                href={MARKETING_SITE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[11px] font-black text-sky-600 uppercase tracking-wider flex items-center gap-1.5 px-4 py-2 rounded-full border border-sky-200 bg-sky-50 hover:bg-sky-100 transition-colors"
              >
                Lihat Semua <ExternalLink size={11} />
              </a>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              {articles.length > 0 ? (
                articles.map((art, idx) => (
                  <div key={art.id || idx} data-reveal style={{ transitionDelay: `${idx * 60}ms` }}>
                    <ArticleCard art={art} />
                  </div>
                ))
              ) : (
                // Skeleton placeholder: 3 abu-abu cards saat data belum ada
                [0, 1, 2].map(i => (
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

        {/* ── BRAND PKM-KC ────────────────────────────────── */}
        <section className="px-4 py-12 bg-white md:px-10 lg:px-16" data-reveal>
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

        {/* ── COMMUNICATION LOOP ──────────────────────────── */}
        <section className="px-4 pb-16 pt-4 md:px-10 lg:px-16">
          <div className="mx-auto max-w-7xl grid gap-5 lg:grid-cols-2">

            {/* Dark panel */}
            <div
              className="rounded-[28px] p-8 flex flex-col gap-6"
              style={{ background: 'linear-gradient(145deg,#0f172a,#0c1b2d)', border: '1px solid rgba(255,255,255,0.08)' }}
              data-reveal
            >
              <style>{`
                @keyframes flowDash { 0% { stroke-dashoffset:500; } 100% { stroke-dashoffset:0; } }
                .animate-flow-dash { animation: flowDash 6s linear infinite; }
                .glow-active-card { box-shadow: 0 0 25px rgba(56,189,248,0.14); }
              `}</style>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">Communication loop</p>
                  <h2 className="text-2xl font-black text-white leading-tight mt-1">Pasien ke dokter dalam satu layar</h2>
                </div>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-400">
                  <Activity size={20} className="animate-pulse" />
                </div>
              </div>

              <div className="relative py-2 select-none">
                <svg viewBox="0 0 520 170" className="h-auto w-full" role="img" aria-label="Alur kamera, model, teks, dan suara">
                  <defs>
                    <linearGradient id="flowGradient" x1="0" x2="1" y1="0" y2="0">
                      <stop offset="0" stopColor="#38bdf8" />
                      <stop offset="0.5" stopColor="#2dd4bf" />
                      <stop offset="1" stopColor="#f472b6" />
                    </linearGradient>
                    <linearGradient id="activeGradient" x1="0" x2="1" y1="0" y2="0">
                      <stop offset="0" stopColor="#e0f2fe" />
                      <stop offset="0.5" stopColor="#ccfbf1" />
                      <stop offset="1" stopColor="#fce7f3" />
                    </linearGradient>
                  </defs>
                  <path d="M66 86 C 148 20, 206 152, 288 84 S 416 34, 456 92" fill="none" stroke="url(#flowGradient)" strokeWidth="6" strokeLinecap="round" className="opacity-20" />
                  <path d="M66 86 C 148 20, 206 152, 288 84 S 416 34, 456 92" fill="none" stroke="url(#activeGradient)" strokeWidth="6" strokeLinecap="round" strokeDasharray="80 320" className="animate-flow-dash" />
                  {[
                    { label: 'Kamera', x: 66,  y: 86, index: 0, glow: 'rgba(56,189,248,0.4)' },
                    { label: 'Model',  x: 194, y: 92, index: 1, glow: 'rgba(45,212,191,0.4)' },
                    { label: 'Teks',   x: 320, y: 82, index: 2, glow: 'rgba(251,191,36,0.4)' },
                    { label: 'Suara',  x: 456, y: 92, index: 3, glow: 'rgba(244,114,182,0.4)' },
                  ].map(node => {
                    const isActive = activeStage === node.index;
                    return (
                      <g key={node.label} className="cursor-pointer" onClick={() => setActiveStage(node.index)}>
                        <circle cx={node.x} cy={node.y} r={isActive ? 32 : 26} fill="transparent" stroke={isActive ? node.glow : 'rgba(255,255,255,0.06)'} strokeWidth={isActive ? 4 : 1} className="transition-all duration-300" />
                        <circle cx={node.x} cy={node.y} r="22" fill={isActive ? 'rgba(15,23,42,0.95)' : 'rgba(255,255,255,0.08)'} stroke="rgba(255,255,255,0.2)" strokeWidth="1.5" className="transition-all duration-300" />
                        <text x={node.x} y={node.y + 4} textAnchor="middle" fill={isActive ? '#f8fafc' : '#94a3b8'} fontSize="10" fontWeight="900" className="uppercase tracking-widest select-none">{node.label}</text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { title: 'Kamera', desc: 'Membaca 21 koordinat landmark jari tangan secara real-time.',        tag: 'MediaPipe Input',      activeBg: 'bg-sky-950/30 border-sky-400 text-sky-200' },
                  { title: 'Model',  desc: 'Model AI GRU/LSTM menerjemahkan koordinat menjadi kata BISINDO.',   tag: 'Neural Net Inference', activeBg: 'bg-teal-950/30 border-teal-400 text-teal-200' },
                  { title: 'Teks',   desc: 'Hasil terjemahan terkonfirmasi tampil otomatis di layar medis.',    tag: 'Live Transcription',   activeBg: 'bg-amber-950/30 border-amber-400 text-amber-200' },
                  { title: 'Suara',  desc: 'Asisten melafalkan suara verbal untuk didengar dokter.',           tag: 'Speech Synthesis',     activeBg: 'bg-pink-950/30 border-pink-400 text-pink-200' },
                ].map((stage, idx) => {
                  const isActive = activeStage === idx;
                  return (
                    <div
                      key={stage.title}
                      onClick={() => setActiveStage(idx)}
                      className={`cursor-pointer rounded-2xl p-4 border transition-all duration-500 flex flex-col justify-between h-[112px] select-none ${
                        isActive
                          ? `${stage.activeBg} glow-active-card scale-[1.01] shadow-inner`
                          : 'border-white/10 bg-slate-950/35 text-slate-400 hover:bg-slate-900/40 hover:border-white/20'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black uppercase tracking-wider">{stage.title}</span>
                          <span className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-400">{stage.tag}</span>
                        </div>
                        <p className="text-[10px] font-semibold leading-relaxed mt-2.5">{stage.desc}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Status panel */}
            <div className="rounded-[28px] bg-white border border-slate-200 p-8" data-reveal>
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

              <div className="flex flex-col gap-3 sm:flex-row">
                <button
                  onClick={() => setView('patient')}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white transition-all active:scale-95"
                  style={{ background: 'linear-gradient(135deg,#0ea5e9,#0d9488)', boxShadow: '0 6px 20px rgba(14,165,233,0.3)' }}
                >
                  <Gauge size={16} /> {t('tryConsultation') || 'Coba Konsultasi'}
                </button>
                <button
                  onClick={() => setView('about')}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-3 text-sm font-bold text-slate-700 hover:bg-slate-100 transition-all active:scale-95"
                >
                  <FileText size={16} /> {t('viewProjectDetails') || 'Detail Proyek'}
                </button>
              </div>
            </div>
          </div>
        </section>

      </div>{/* end bg-slate-50 wrapper */}
    </div>
  );
};
