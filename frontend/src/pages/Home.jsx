import React, { useEffect, useRef, useContext } from 'react';

import { AppContext } from '../context/AppContextObject';

import {

  Activity,

  Sliders,

  Video,

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

  'https://medsign-ai.vercel.app/';







const dashboardItems = [
  { id: 'motion', title: 'Motion Visualizer', desc: 'Visualisasi 3D neon trajektori isyarat BISINDO secara real-time.', icon: Video },
  { id: 'patient', title: 'Translate BISINDO', desc: 'Penerjemahan isyarat BISINDO pasien ke teks verbal medis.', icon: ScanLine },
  { id: 'doctor', title: 'Consultation', desc: 'Sistem komunikasi dua arah dokter-pasien dengan preset respon.', icon: HeartPulse },
  { id: 'patient', title: 'Patient Mode', desc: 'Layar khusus pasien tunarungu dengan input kamera terintegrasi.', icon: User },
  { id: 'doctor', title: 'Doctor Mode', desc: 'Layar khusus dokter untuk input teks, voice record, dan preset.', icon: Stethoscope },
  { id: 'data-collection', title: 'History & Dataset', desc: 'Histori perekaman sampel dan manajemen antrean sesi.', icon: Database }
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



const MascotAnimator = () => {
  const [frame, setFrame] = React.useState(1);

  React.useEffect(() => {
    const interval = setInterval(() => {
      setFrame((prev) => (prev % 4) + 1);
    }, 450); // Smooth cycle: 450ms per frame
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-3.5 bg-slate-900/60 border border-white/10 rounded-2xl px-4 py-2.5 shadow-lg select-none backdrop-blur-xl max-w-xs animate-slide-up">
      <img
        src={`/assets/mascot_frame${frame}.png`}
        alt="MedSign Active Mascot"
        className="h-16 w-auto object-contain transition-all duration-200"
      />
      <div className="text-left">
        <span className="text-[8px] font-black text-sky-400 uppercase tracking-widest block animate-pulse">MedSign AI</span>
        <span className="text-xs font-black text-slate-100 uppercase tracking-wide block mt-0.5">Asisten Pintar</span>
        <span className="text-[9px] font-semibold text-slate-400 block mt-0.5 leading-normal">Menganalisis gerakan...</span>
      </div>
    </div>
  );
};

export const Home = ({ setView }) => {

  const { t, language } = useContext(AppContext);

  const scopeRef = useRef(null);

  const [activeStage, setActiveStage] = React.useState(0);



  React.useEffect(() => {

    const interval = setInterval(() => {

      setActiveStage((prev) => (prev + 1) % 4);

    }, 1800);

    return () => clearInterval(interval);

  }, []);



  const [stats, setStats] = React.useState({

    alphabetAccuracy: '89.42%',

    clinicalClasses: '47 kata',

    runtime: 'TFLite',

    datasetSamples: '1.938'

  });



  React.useEffect(() => {

    const fetchRealStats = async () => {

      try {

        const apiBaseUrl = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

        const cleanUrl = apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl;

        

        // 1. Fetch health status

        const healthRes = await fetch(`${cleanUrl}/health`);

        let outputClasses = 47;

        let loaded = true;

        if (healthRes.ok) {

          const healthData = await healthRes.json();

          outputClasses = healthData.output_class || 47;

          loaded = healthData.model_loaded;

        }



        // 2. Fetch dataset balance

        const balanceRes = await fetch(`${cleanUrl}/api/v1/dataset/balance`);

        let totalSamples = 1938;

        if (balanceRes.ok) {

          const balanceData = await balanceRes.json();

          if (balanceData && balanceData.balance) {

            totalSamples = balanceData.balance.reduce((sum, item) => sum + (item.total || 0), 0);

          }

        }



        setStats({

          alphabetAccuracy: '89.42%',

          clinicalClasses: `${outputClasses} kata`,

          runtime: loaded ? 'TFLite' : 'Demo',

          datasetSamples: totalSamples.toLocaleString('id-ID')

        });

      } catch (err) {

        console.error("Gagal memuat statistik live:", err);

      }

    };

    fetchRealStats();

  }, []);



  const metricTiles = [

    { label: 'Abjad A-Z & Angka 1-9', value: stats.alphabetAccuracy, note: 'uji lokal alphabet', tone: 'from-sky-300/80 to-cyan-200/70' },

    { label: 'Model klinis', value: stats.clinicalClasses, note: 'kosakata BISINDO medis', tone: 'from-emerald-300/80 to-teal-200/70' },

    { label: 'Runtime', value: stats.runtime, note: 'siap CPU inference', tone: 'from-violet-300/75 to-sky-200/70' },

    { label: 'Dataset', value: stats.datasetSamples, note: 'sample lokal proyek', tone: 'from-rose-300/75 to-orange-200/70' }

  ];



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

        <div className="mx-auto grid max-w-7xl items-start gap-7 lg:grid-cols-[1.02fr_0.98fr]">

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



            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="max-w-xl">
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
              <div className="shrink-0 flex items-center justify-center p-2.5 bg-white/40 rounded-3xl border border-white/60 shadow-sm backdrop-blur-md">
                <img
                  src="/assets/mascot2.png"
                  alt="MedSign Mascot"
                  className="h-32 md:h-44 w-auto object-contain animate-bounce"
                  style={{ animationDuration: '3s' }}
                />
              </div>
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
              
              {/* Mascot Animator */}
              <div className="mt-4 flex justify-end pr-1 border-t border-white/10 pt-4">
                <MascotAnimator />
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

      {/* Dashboard Section */}
      <section className="px-4 py-8 md:px-8 lg:px-12" data-reveal>
        <div className="glass-panel mx-auto max-w-7xl rounded-[32px] p-6 md:p-8 flex flex-col gap-4 border border-white/60">
          <span className="text-[10px] font-black uppercase text-sky-700 tracking-wider">Dashboard Layanan</span>
          <h2 className="text-lg font-black text-slate-950">Pilih Modul MedSign AI</h2>
          <div className="flex flex-wrap gap-4 justify-center mt-4 w-full">
            {dashboardItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  onClick={() => setView(item.id)}
                  className="glass-panel hover:-translate-y-1 hover:bg-white/60 hover:shadow-lg hover:shadow-sky-500/10 active:scale-[0.98] transition-all duration-355 ease-out cursor-pointer rounded-3xl p-5 border border-white/60 flex flex-col justify-between h-[155px] w-full sm:w-[260px] shrink-0"
                  data-reveal
                  style={{ transitionDelay: `${index * 60}ms` }}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-800">{item.title}</span>
                      <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600">
                        <Icon size={16} />
                      </div>
                    </div>
                    <p className="mt-3 text-[11px] font-semibold leading-relaxed text-slate-500">
                      {item.desc}
                    </p>
                  </div>
                  <div className="text-[10px] font-black text-sky-600 uppercase flex items-center gap-1 mt-2">
                    Buka Modul <ArrowRight size={10} />
                  </div>
                </div>
              );
            })}
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

        <div className="mx-auto grid max-w-7xl gap-4 grid-cols-2 md:grid-cols-4">

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

        <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[1fr_1fr]">

          {/* Teknologi Section */}

          <div className="glass-panel rounded-[32px] p-6 flex flex-col gap-4 border border-white/60" data-reveal>

            <div className="flex items-center gap-2 border-b border-slate-200/50 pb-2">

              <BrainCircuit size={18} className="text-violet-600" />

              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">

                Teknologi Sistem MedSign AI

              </h3>

            </div>

            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 text-xs">

              <div className="surface-panel rounded-2xl p-3 flex flex-col gap-2">

                <span className="font-black text-violet-850 uppercase tracking-wider">Frontend Stack</span>

                <ul className="list-disc list-inside space-y-1.5 text-slate-500 font-semibold">

                  <li>React 18</li>

                  <li>Vite 5</li>

                  <li>TailwindCSS 3</li>

                  <li>MediaPipe Hands</li>

                  <li>Web Speech API</li>

                </ul>

              </div>

              <div className="surface-panel rounded-2xl p-3 flex flex-col gap-2">

                <span className="font-black text-sky-850 uppercase tracking-wider">Backend Stack</span>

                <ul className="list-disc list-inside space-y-1.5 text-slate-500 font-semibold">

                  <li>FastAPI Python 3.11</li>

                  <li>WebSocket Streaming</li>

                  <li>TensorFlow Lite</li>

                  <li>LSTM Sequence Model</li>

                  <li>Session Logging</li>

                </ul>

              </div>

            </div>

          </div>



          {/* Dokumentasi Section */}

          <div className="glass-panel rounded-[32px] p-6 flex flex-col gap-4 border border-white/60" data-reveal>

            <div className="flex items-center gap-2 border-b border-slate-200/50 pb-2">

              <FileText size={18} className="text-sky-600" />

              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">

                Dokumentasi Proyek (docs/)

              </h3>

            </div>

            <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">

              {[

                { name: "PRD.md.pdf", label: "Product Requirement Document" },

                { name: "SRS.md.pdf", label: "Software Requirement Specification" },

                { name: "SDD.md.pdf", label: "Software Design Document" },

                { name: "UI_UX_FLOW.md.pdf", label: "UI & UX Flow Document" },

                { name: "TASK_BREAKDOWN.md.pdf", label: "Task Breakdown Document" },

                { name: "PROJECT_CONTEXT_PROMPT.md.pdf", label: "Project Context Prompt" }

              ].map((doc) => (

                <a

                  key={doc.name}

                  href={`/docs/${doc.name}`}

                  target="_blank"

                  rel="noopener noreferrer"

                  className="flex items-center justify-between p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all text-xs font-bold text-slate-700 hover:text-sky-700 active:scale-[0.98]"

                >

                  <span className="truncate">{doc.label}</span>

                  <span className="text-[10px] font-mono text-slate-400 uppercase shrink-0">.pdf</span>

                </a>

              ))}

            </div>

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

          <div className="glass-panel glass-dark rounded-[32px] p-6 md:p-8 flex flex-col gap-6" data-reveal>

            <style>{`

              @keyframes flowDash {

                0% {

                  stroke-dashoffset: 500;

                }

                100% {

                  stroke-dashoffset: 0;

                }

              }

              .animate-flow-dash {

                animation: flowDash 6s linear infinite;

              }

              .glow-active-card {

                box-shadow: 0 0 25px rgba(56, 189, 248, 0.12);

              }

            `}</style>



            <div className="flex items-center justify-between gap-4">

              <div>

                <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">Communication loop</p>

                <h2 className="text-2xl font-black text-white leading-tight mt-1">Pasien ke dokter dalam satu layar</h2>

              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-400">

                <Activity size={20} className="animate-pulse" />

              </div>

            </div>



            {/* Glowing Interactive SVG Path */}

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



                {/* Base connection path */}

                <path

                  d="M66 86 C 148 20, 206 152, 288 84 S 416 34, 456 92"

                  fill="none"

                  stroke="url(#flowGradient)"

                  strokeWidth="6"

                  strokeLinecap="round"

                  className="opacity-20"

                />



                {/* Animated glow trail */}

                <path

                  d="M66 86 C 148 20, 206 152, 288 84 S 416 34, 456 92"

                  fill="none"

                  stroke="url(#activeGradient)"

                  strokeWidth="6"

                  strokeLinecap="round"

                  strokeDasharray="80 320"

                  className="animate-flow-dash"

                />



                {/* Interactive Node Coordinates Map */}

                {[

                  { label: 'Kamera', x: 66, y: 86, index: 0, glow: 'rgba(56, 189, 248, 0.4)' },

                  { label: 'Model', x: 194, y: 92, index: 1, glow: 'rgba(45, 212, 191, 0.4)' },

                  { label: 'Teks', x: 320, y: 82, index: 2, glow: 'rgba(251, 191, 36, 0.4)' },

                  { label: 'Suara', x: 456, y: 92, index: 3, glow: 'rgba(244, 114, 182, 0.4)' }

                ].map((node) => {

                  const isActive = activeStage === node.index;

                  return (

                    <g key={node.label} className="cursor-pointer" onClick={() => setActiveStage(node.index)}>

                      {/* Outer Ring Glow */}

                      <circle

                        cx={node.x}

                        cy={node.y}

                        r={isActive ? 32 : 26}

                        fill="transparent"

                        stroke={isActive ? node.glow : 'rgba(255,255,255,0.06)'}

                        strokeWidth={isActive ? 4 : 1}

                        className="transition-all duration-300"

                      />

                      {/* Node Circle */}

                      <circle

                        cx={node.x}

                        cy={node.y}

                        r="22"

                        fill={isActive ? 'rgba(15, 23, 42, 0.95)' : 'rgba(255,255,255,0.08)'}

                        stroke="rgba(255,255,255,0.2)"

                        strokeWidth="1.5"

                        className="transition-all duration-300"

                      />

                      {/* Label Text */}

                      <text

                        x={node.x}

                        y={node.y + 4}

                        textAnchor="middle"

                        fill={isActive ? '#f8fafc' : '#94a3b8'}

                        fontSize="10"

                        fontWeight="900"

                        className="uppercase tracking-widest select-none transition-all duration-300"

                      >

                        {node.label}

                      </text>

                    </g>

                  );

                })}

              </svg>

            </div>



            {/* Stage Description Cards Grid (Liquid Glass Approximation style) */}

            <div className="grid grid-cols-2 gap-3 mt-2">

              {[

                { title: "Kamera", desc: "Membaca 21 koordinat landmark jari tangan secara real-time.", tag: "MediaPipe Input", border: "border-sky-500/30", activeBg: "bg-sky-950/30 border-sky-400 text-sky-200" },

                { title: "Model", desc: "Model AI GRU/LSTM menerjemahkan koordinat menjadi kata BISINDO.", tag: "Neural Net Inference", border: "border-teal-500/30", activeBg: "bg-teal-950/30 border-teal-400 text-teal-200" },

                { title: "Teks", desc: "Hasil terjemahan terkonfirmasi tampil otomatis di layar medis.", tag: "Live Transcription", border: "border-amber-500/30", activeBg: "bg-amber-950/30 border-amber-400 text-amber-200" },

                { title: "Suara", desc: "Asisten melafalkan suara verbal untuk didengar dokter.", tag: "Speech Synthesis", border: "border-pink-500/30", activeBg: "bg-pink-950/30 border-pink-400 text-pink-200" }

              ].map((stage, idx) => {

                const isActive = activeStage === idx;

                return (

                  <div

                    key={stage.title}

                    onClick={() => setActiveStage(idx)}

                    className={`cursor-pointer rounded-2xl p-4 border transition-all duration-500 flex flex-col justify-between h-[120px] select-none ${

                      isActive 

                        ? `${stage.activeBg} glow-active-card scale-[1.01] shadow-inner`

                        : `border-white/10 bg-slate-950/35 text-slate-400 hover:bg-slate-900/40 hover:border-white/20`

                    }`}

                  >

                    <div>

                      <div className="flex items-center justify-between">

                        <span className="text-xs font-black uppercase tracking-wider">{stage.title}</span>

                        <span className="text-[8px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-400">

                          {stage.tag}

                        </span>

                      </div>

                      <p className="text-[10px] font-semibold leading-relaxed mt-2.5">

                        {stage.desc}

                      </p>

                    </div>

                  </div>

                );

              })}

            </div>

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

