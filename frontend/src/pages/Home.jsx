import React, { useEffect, useRef, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  BrainCircuit,
  Camera,
  CheckCircle2,
  ClipboardList,
  Database,
  ExternalLink,
  FileText,
  Gauge,
  HeartPulse,
  Radio,
  ScanLine,
  ShieldCheck,
  Stethoscope,
  User,
  Volume2
} from 'lucide-react';

const MARKETING_SITE_URL =
  import.meta.env.VITE_MARKETING_SITE_URL ||
  'https://albert-william-saputra-portfolio.vercel.app/#projects';

const metricTiles = [
  { label: 'Abjad A-Z & Angka 1-9', value: '89.42%', note: 'uji lokal alphabet', tone: 'from-sky-300/80 to-cyan-200/70' },
  { label: 'Model klinis', value: '40 kata', note: 'kosakata BISINDO medis', tone: 'from-emerald-300/80 to-teal-200/70' },
  { label: 'Runtime', value: 'TFLite', note: 'siap CPU inference', tone: 'from-violet-300/75 to-sky-200/70' },
  { label: 'Dataset', value: '1,869', note: 'sample lokal proyek', tone: 'from-rose-300/75 to-orange-200/70' }
];

const workflowCards = [
  {
    icon: Camera,
    title: 'Kamera pasien',
    text: 'Aliran kamera browser membaca landmark tangan real-time untuk BISINDO klinis.'
  },
  {
    icon: BrainCircuit,
    title: 'Inferensi hibrida',
    text: 'Model kata medis dan spelling A-Z berjalan sebagai dukungan komunikasi cepat.'
  },
  {
    icon: Volume2,
    title: 'Teks ke suara',
    text: 'Hasil isyarat ditampilkan besar dan dapat dilafalkan dalam bahasa Indonesia.'
  }
];

const folderItems = [
  { icon: ClipboardList, label: 'frontend/src', note: 'UI pasien, dokter, kamera, dan log sesi' },
  { icon: Database, label: 'backend/app', note: 'FastAPI, WebSocket, route prediksi, dan service SLT' },
  { icon: FileText, label: 'docs', note: 'PRD, SRS, SDD, UI/UX flow, dan konteks proyek' }
];

const gestureFrames = [
  { src: '/assets/gesture-bantuan-segera.jpg', label: 'bantuan segera', status: 'darurat' },
  { src: '/assets/gesture-nyeri-dada.jpg', label: 'nyeri dada', status: 'prioritas' },
  { src: '/assets/gesture-ya.jpg', label: 'ya', status: 'respons' }
];

const institutionLogos = [
  { name: 'Kemdikbudristek', src: '/assets/logo-kemdikbudristek.png', className: 'h-14' },
  { name: 'Diktisaintek Berdampak', src: '/assets/logo-diktisaintek.png', className: 'h-11' },
  { name: 'Simbelmawa', src: '/assets/logo-simbelmawa.png', className: 'h-11' },
  { name: 'PKM', src: '/assets/logo-pkm-full.png', className: 'h-14' },
  { name: 'Universitas Ma Chung', src: '/assets/logo-umc.png', className: 'h-14' },
  { name: 'MedSign', src: '/assets/medsign-logo.png', className: 'h-11' }
];

export const Home = ({ setView }) => {
  const { t, language } = useContext(AppContext);
  const scopeRef = useRef(null);

  useEffect(() => {
    document.title = 'MedSign AI';

    const animatedNodes = scopeRef.current?.querySelectorAll('[data-reveal]');
    if (!animatedNodes?.length) return undefined;

    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
          }
        });
      },
      { threshold: 0.16 }
    );

    animatedNodes.forEach(node => observer.observe(node));
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={scopeRef} className="-mx-4 -my-5 overflow-hidden md:-mx-6">
      <section className="relative px-4 pb-10 pt-8 md:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl items-center gap-7 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="glass-panel rounded-[32px] p-5 md:p-8" data-reveal>
            <div className="mb-8 flex flex-wrap items-center gap-3">
              <span className="soft-chip rounded-full px-3 py-2 text-xs font-bold">
                <img
                  src="/assets/pkm-logo.png"
                  alt="Logo PKM Program Kreativitas Mahasiswa"
                  className="h-7 w-auto"
                />
                PKM-KC 2026
              </span>
              <span className="soft-chip rounded-full px-3 py-2 text-xs font-bold">
                <ShieldCheck size={14} className="text-emerald-500" />
                BISINDO clinical assistant
              </span>
            </div>

            <div className="max-w-3xl">
              <img
                src="/assets/medsign-logo.png"
                alt="Logo MedSign"
                className="mb-5 h-14 w-auto max-w-[250px] object-contain md:h-16 md:max-w-[320px]"
              />
              <h1 className="text-4xl font-black leading-tight text-slate-950 md:text-5xl xl:text-6xl">
                {t('heroTitle')}
              </h1>
              <p className="mt-4 max-w-2xl text-base font-semibold leading-7 text-slate-600">
                {t('heroDesc')}
              </p>
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => setView('patient')}
                className="glass-button glass-button-primary rounded-2xl px-5 py-3 text-sm font-bold"
              >
                <User size={18} />
                Mode Pasien
                <ArrowRight size={18} />
              </button>
              <button
                onClick={() => setView('doctor')}
                className="glass-button rounded-2xl px-5 py-3 text-sm font-bold"
              >
                <Stethoscope size={18} />
                Mode Dokter
              </button>
              <a
                href={MARKETING_SITE_URL}
                className="glass-button rounded-2xl px-5 py-3 text-sm font-bold text-sky-700"
              >
                <ExternalLink size={18} />
                Landing Page
              </a>
            </div>

            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {workflowCards.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.title}
                    className="surface-panel perspective-card rounded-2xl p-4"
                    data-reveal
                    style={{ transitionDelay: `${index * 80}ms` }}
                  >
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600">
                      <Icon size={20} />
                    </div>
                    <h2 className="text-sm font-extrabold text-slate-950">{item.title}</h2>
                    <p className="mt-2 text-xs font-semibold leading-5 text-slate-600">{item.text}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="relative" data-reveal>
            <div className="glass-panel glass-dark rounded-[36px] p-4 md:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-sky-200">Local gesture preview</p>
                  <h2 className="text-xl font-black text-white">Visualisasi dataset BISINDO</h2>
                </div>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 text-cyan-200">
                  <ScanLine size={20} />
                </span>
              </div>

              <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-slate-950">
                <img
                  src={gestureFrames[0].src}
                  alt="Visualisasi pose BISINDO bantuan segera"
                  className="aspect-[16/8] w-full object-cover opacity-95"
                />
                <div className="scanline absolute inset-0 opacity-50" aria-hidden="true" />
                <div className="absolute bottom-4 left-4 right-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/20 bg-slate-950/60 p-3 text-white backdrop-blur-2xl">
                  <div>
                    <p className="text-[11px] font-bold text-cyan-200">Prediksi terakhir</p>
                    <p className="text-lg font-black uppercase">Bantuan segera</p>
                  </div>
                  <div className="rounded-full bg-red-500/20 px-3 py-1 text-xs font-bold text-red-100">
                    Darurat
                  </div>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                {gestureFrames.map(frame => (
                  <div key={frame.label} className="overflow-hidden rounded-2xl border border-white/10 bg-white/10">
                    <img src={frame.src} alt={`Pose ${frame.label}`} className="h-20 w-full object-cover" />
                    <div className="p-2">
                      <p className="truncate text-[11px] font-bold uppercase text-white">{frame.label}</p>
                      <p className="text-[10px] font-semibold text-slate-400">{frame.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="float-panel absolute -right-2 -top-4 hidden rounded-3xl border border-white/70 bg-white/70 px-4 py-3 text-slate-900 shadow-xl shadow-sky-900/10 backdrop-blur-2xl md:block">
              <div className="flex items-center gap-2 text-sm font-extrabold">
                <Radio size={16} className="text-emerald-500" />
                WebSocket ready
              </div>
              <p className="mt-1 text-xs font-semibold text-slate-500">fallback demo aktif</p>
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-6 md:px-8 lg:px-12">
        <div className="glass-panel mx-auto max-w-7xl rounded-[32px] px-4 py-5 md:px-6" data-reveal>
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center">
            <div className="lg:w-64">
              <p className="text-[10px] font-black uppercase text-sky-700">Kolaborasi & dukungan</p>
              <h2 className="mt-1 text-xl font-black text-slate-950">Ekosistem MedSign</h2>
            </div>
            <div className="grid flex-1 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {institutionLogos.map((logo, index) => (
                <div
                  key={logo.name}
                  className="surface-panel flex h-24 items-center justify-center rounded-2xl px-3 py-3"
                  data-reveal
                  style={{ transitionDelay: `${index * 55}ms` }}
                >
                  <img
                    src={logo.src}
                    alt={`Logo ${logo.name}`}
                    className={`${logo.className} max-h-16 w-auto max-w-full object-contain`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 py-6 md:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-4 md:grid-cols-4">
          {metricTiles.map((tile, index) => (
            <div
              key={tile.label}
              className="glass-panel perspective-card rounded-3xl p-5"
              data-reveal
              style={{ transitionDelay: `${index * 70}ms` }}
            >
              <div className={`mb-5 h-2 rounded-full bg-gradient-to-r ${tile.tone}`} />
              <p className="text-xs font-bold text-slate-500">{tile.label}</p>
              <p className="mt-2 text-3xl font-black text-slate-950">{tile.value}</p>
              <p className="mt-1 text-xs font-semibold text-slate-500">{tile.note}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="px-4 py-10 md:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.82fr_1.18fr]">
          <div className="glass-panel rounded-[32px] p-6 md:p-8" data-reveal>
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-600">
              <HeartPulse size={24} />
            </div>
            <h2 className="text-3xl font-black leading-tight text-slate-950 md:text-5xl">
              Dibuat untuk alur klinis yang butuh cepat, jelas, dan privat.
            </h2>
            <p className="mt-4 text-sm font-semibold leading-6 text-slate-600">
              Pasien dapat memberi sinyal gejala, dokter dapat membalas dengan instruksi, dan log
              sesi tetap tersedia untuk dokumentasi konsultasi.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {folderItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <article
                  key={item.label}
                  className="glass-panel perspective-card rounded-3xl p-5"
                  data-reveal
                  style={{ transitionDelay: `${index * 80}ms` }}
                >
                  <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-2xl bg-white/70 text-sky-600 shadow-sm">
                    <Icon size={21} />
                  </div>
                  <h3 className="text-lg font-black text-slate-950">{item.label}</h3>
                  <p className="mt-3 text-sm font-semibold leading-6 text-slate-600">{item.note}</p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="px-4 pb-10 md:px-8 lg:px-12">
        <div className="glass-panel mx-auto flex max-w-7xl flex-col gap-5 rounded-[32px] p-6 md:flex-row md:items-center md:justify-between md:p-8" data-reveal>
          <div>
            <p className="text-xs font-bold uppercase text-sky-700">Brand & program</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">MedSign AI dalam program PKM-KC</h2>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-600">
              Logo MedSign dipakai sebagai identitas produk, sementara logo PKM diposisikan sebagai identitas program akademik pendukung.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="rounded-3xl border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur-xl">
              <img src="/assets/medsign-logo.png" alt="Logo MedSign" className="h-14 w-auto object-contain" />
            </div>
            <div className="rounded-3xl border border-white/70 bg-white/70 p-4 shadow-sm backdrop-blur-xl">
              <img src="/assets/pkm-logo.png" alt="Logo PKM" className="h-14 w-auto object-contain" />
            </div>
          </div>
        </div>
      </section>

      <section className="px-4 pb-12 pt-2 md:px-8 lg:px-12">
        <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[1fr_1fr]">
          <div className="glass-panel glass-dark rounded-[32px] p-6 md:p-8" data-reveal>
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-cyan-200">Communication loop</p>
                <h2 className="text-3xl font-black text-white">Pasien ke dokter dalam satu layar</h2>
              </div>
              <Activity size={28} className="text-emerald-300" />
            </div>

            <svg viewBox="0 0 520 170" className="h-auto w-full" role="img" aria-label="Alur kamera, model, teks, dan suara">
              <defs>
                <linearGradient id="flowGradient" x1="0" x2="1" y1="0" y2="0">
                  <stop offset="0" stopColor="#38bdf8" />
                  <stop offset="0.5" stopColor="#2dd4bf" />
                  <stop offset="1" stopColor="#f9a8d4" />
                </linearGradient>
              </defs>
              <path
                className="flow-line"
                d="M66 86 C148 20 206 152 288 84 S416 34 456 92"
                fill="none"
                stroke="url(#flowGradient)"
                strokeWidth="8"
                strokeLinecap="round"
              />
              {[
                ['Kamera', 66, 86],
                ['Model', 194, 92],
                ['Teks', 320, 82],
                ['Suara', 456, 92]
              ].map(([label, x, y]) => (
                <g key={label}>
                  <circle cx={x} cy={y} r="34" fill="rgba(255,255,255,0.12)" stroke="rgba(255,255,255,0.28)" />
                  <text x={x} y={y + 5} textAnchor="middle" fill="#f8fafc" fontSize="15" fontWeight="800">
                    {label}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          <div className="glass-panel rounded-[32px] p-6 md:p-8" data-reveal>
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-600">
                <BadgeCheck size={24} />
              </div>
              <div>
                <p className="text-xs font-bold text-emerald-700">Status implementasi</p>
                <h2 className="text-2xl font-black text-slate-950">UI siap dipakai untuk demo</h2>
              </div>
            </div>

            <div className="grid gap-3">
              {[
                'Mode pasien menampilkan kamera, hasil translasi, spelling abjad A-Z & angka 1-9, kosakata, dan log.',
                'Mode dokter menyediakan panel respon cepat, TTS, dan timeline konsultasi.',
                'Alert darurat tetap aktif untuk sinyal seperti nyeri dada atau bantuan segera.'
              ].map(item => (
                <div key={item} className="flex gap-3 rounded-2xl bg-white/40 p-3">
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0 text-emerald-500" />
                  <p className="text-sm font-semibold leading-6 text-slate-600">{item}</p>
                </div>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => setView('patient')}
                className="glass-button glass-button-primary rounded-2xl px-5 py-3 text-sm font-bold"
              >
                <Gauge size={18} />
                {t('tryConsultation')}
              </button>
              <button
                onClick={() => setView('about')}
                className="glass-button rounded-2xl px-5 py-3 text-sm font-bold"
              >
                <FileText size={18} />
                {t('viewProjectDetails')}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
