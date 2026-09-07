import React, { useContext } from 'react';
import { AppContext } from '../context/AppContextObject';
import { ArrowLeft, BookOpen, Camera, CheckCircle, HeartPulse, ShieldCheck, UserCheck, Users } from 'lucide-react';

const teamMembers = [
  { name: "Albert William Saputra", role: "Fullstack Developer & Integration", img: "/assets/albert_2.jpg" },
  { name: "Albert Cheng", role: "Integration & Dataset Collector", img: "/assets/albert_cheng_3.jpg" },
  { name: "Glenn Emmanuel Abraham", role: "UI/UX & Dataset Collector", img: "/assets/glenn_2.jpg" },
  { name: "Lorensa Amelia", role: "Marketing & Dataset Collector", img: "/assets/loren_2.jpg" }
];

export const About = ({ setView }) => {
  const { t } = useContext(AppContext);
  const [zoomedImg, setZoomedImg] = React.useState(null);
  const [teamGallery, setTeamGallery] = React.useState([]);

  React.useEffect(() => {
    const fetchGallery = async () => {
      try {
        const apiBase = (localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
        const res = await fetch(`${apiBase}/api/v1/about/team-gallery`);
        if (res.ok) {
          const data = await res.json();
          setTeamGallery((data.items || []).sort((a, b) => (a.display_order || 0) - (b.display_order || 0)));
        }
      } catch (e) {}
    };
    fetchGallery();
  }, []);

  return (
    <>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-2 animate-slide-up">

        <div className="glass-panel flex items-center justify-between rounded-3xl p-4">
          <button
            onClick={() => setView('home')}
            className="glass-button rounded-2xl px-4 py-2 text-xs font-bold"
          >
            <ArrowLeft size={14} />
            Kembali
          </button>
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase text-sky-700">{t('about')}</span>
            <h2 className="text-lg font-black text-slate-950">{t('aboutProject')}</h2>
          </div>
        </div>

        <div className="glass-panel rounded-[32px] p-6 md:p-8 flex flex-col gap-8">

          {/* ── HERO: split seimbang — panel brand (kiri) + pesan (kanan) ── */}
          <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr] items-stretch">
            {/* Panel brand: gradient tint, bukan kotak putih kosong */}
            <div className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-sky-50 via-white to-emerald-50/60 border border-sky-100 shadow-sm p-7 flex flex-col justify-between gap-6 min-h-[280px]">
              <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-sky-400/10 blur-2xl pointer-events-none" />
              <div className="absolute -left-8 -bottom-8 h-32 w-32 rounded-full bg-emerald-400/10 blur-2xl pointer-events-none" />
              <div className="relative rounded-3xl bg-white border border-slate-100 shadow-sm p-5 inline-flex items-center justify-center self-start">
                <img
                  src="/assets/medsign-logo.png"
                  alt="Logo MedSign AI"
                  className="h-16 w-auto object-contain"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
              </div>
              <div className="relative">
                <h3 className="text-2xl font-black tracking-tight text-slate-950 leading-tight">MedSign AI</h3>
                <p className="text-xs font-semibold text-slate-500 mt-1 leading-relaxed max-w-[34ch]">
                  Asisten komunikasi medis pasien tunarungu — isyarat BISINDO diterjemahkan menjadi teks dan suara bagi tenaga medis.
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                  {['BISINDO Klinis', 'Terjemahan Real-time', 'Text-to-Speech'].map(chip => (
                    <span key={chip} className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-white/80 border border-slate-200 text-slate-600">
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Pesan utama */}
            <div className="flex flex-col justify-center gap-5">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600">
                <ShieldCheck size={24} />
              </div>
              <h3 className="text-3xl font-black leading-tight text-slate-950 md:text-4xl tracking-tight">
                {t('aboutDesc')}
              </h3>
              <p className="text-sm font-semibold leading-7 text-slate-600 max-w-[60ch]">
                {t('aboutShort')}
              </p>
            </div>
          </div>

          {/* ── ANGKA KUNCI (data riil pipeline) ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { val: '12', label: 'Kosakata klinis MVP' },
              { val: '21', label: 'Titik landmark per tangan' },
              { val: '30', label: 'Frame per satu isyarat' },
              { val: '63', label: 'Fitur numerik per frame' },
            ].map(s => (
              <div key={s.label} className="rounded-3xl border border-slate-100 bg-white/70 px-5 py-4">
                <span className="block text-2xl font-black tracking-tight text-slate-950">{s.val}</span>
                <span className="block text-[10px] font-bold text-slate-500 mt-0.5 leading-snug">{s.label}</span>
              </div>
            ))}
          </div>

          {/* ── LATAR BELAKANG + PROFIL PROGRAM: 2 kolom sejajar ── */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-slate-100 bg-white/70 p-5">
              <h4 className="flex items-center gap-2 text-sm font-black text-slate-900 mb-2">
                <BookOpen size={16} className="text-sky-600" /> Latar Belakang
              </h4>
              <p className="text-xs font-semibold leading-6 text-slate-600">
                Komunikasi antara pasien tunarungu dan tenaga medis masih sangat bergantung pada penerjemah
                atau tulisan manual, yang sering memperlambat pelayanan dan berisiko menimbulkan salah
                paham diagnosis. MedSign AI hadir untuk menjembatani kesenjangan tersebut: kamera menerjemahkan
                isyarat BISINDO menjadi teks dan suara verbal secara real-time, sehingga konsultasi medis
                berlangsung lebih cepat, akurat, dan bermartabat bagi komunitas Tuli.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-100 bg-white/70 p-5">
              <h4 className="flex items-center gap-2 text-sm font-black text-slate-900 mb-3">
                <HeartPulse size={16} className="text-emerald-600" /> Profil Program
              </h4>
              <ul className="flex flex-col gap-2">
                {[
                  'Program PKM-KC (Karsa Cipta) — Universitas Ma Chung',
                  'Fokus: teknologi aksesibel untuk layanan kesehatan inklusif',
                  'Model AI sequence (GRU/LSTM) dengan dataset BISINDO klinis asli',
                  'Dibangun bersama komunitas Teman Tuli sebagai responden utama'
                ].map(item => (
                  <li key={item} className="flex gap-2 text-xs font-semibold leading-5 text-slate-600">
                    <CheckCircle size={14} className="mt-0.5 shrink-0 text-emerald-500" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* ── FOTO BARENG TIM ── */}
          <div className="border-t border-white/60 pt-7">
            <div className="mb-4 flex items-center gap-2">
              <Users size={18} className="text-sky-600" />
              <h4 className="text-sm font-black text-slate-950">Foto Bersama Tim</h4>
            </div>
            <div
              className="group relative rounded-[28px] overflow-hidden bg-white border border-slate-100 shadow-sm cursor-pointer max-w-2xl mx-auto"
              onClick={() => setZoomedImg({ name: "Tim MedSign AI", role: "Tim Pengembang PKM-KC", img: "/assets/tim_bareng.jpg" })}
              title="Klik untuk memperbesar foto"
            >
              <img
                src="/assets/tim_bareng.jpg"
                alt="Foto bersama tim pengembang MedSign AI"
                className="w-full aspect-video object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  const parent = e.currentTarget.parentElement;
                  if (parent && !parent.querySelector('.fallback-tim')) {
                    const fb = document.createElement('div');
                    fb.className = 'fallback-tim aspect-video flex flex-col items-center justify-center gap-2 text-slate-300';
                    fb.innerHTML = '<svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg><span class="text-[10px] font-black uppercase tracking-wider">Foto tim akan segera ditambahkan</span>';
                    parent.appendChild(fb);
                  }
                }}
              />
            </div>
          </div>

          {/* ── DOKUMENTASI KEGIATAN TIM ── */}
          <div className="border-t border-white/60 pt-7">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Camera size={18} className="text-sky-600" />
                <h4 className="text-sm font-black text-slate-950">Dokumentasi Kegiatan Tim</h4>
              </div>
              <span className="text-[10px] font-bold text-slate-400">{teamGallery.length} momen terdokumentasi</span>
            </div>

            {teamGallery.length === 0 ? (
              <div className="rounded-[28px] border border-dashed border-slate-200 bg-white/50 p-10 text-center">
                <Camera size={28} className="mx-auto text-slate-300 mb-3" />
                <p className="text-xs font-black text-slate-500 uppercase tracking-wider">Belum ada dokumentasi</p>
                <p className="text-[11px] font-semibold text-slate-400 mt-1 max-w-sm mx-auto leading-relaxed">
                  Galeri ini bisa diisi dari Super Admin → Kelola Konten → Dokumentasi Tim. Tambahkan foto kegiatan, pengambilan data, atau presentasi tim.
                </p>
              </div>
            ) : (
              <div className="columns-2 md:columns-3 gap-3 [column-fill:_balance]">
                {teamGallery.map((g, i) => (
                  <div
                    key={g.id || i}
                    className="group relative mb-3 break-inside-avoid rounded-2xl overflow-hidden bg-white border border-slate-100 shadow-sm cursor-pointer hover:shadow-lg transition-all duration-300 animate-slide-up"
                    style={{ animationDelay: `${i * 70}ms` }}
                    onClick={() => setZoomedImg({ name: g.title, role: g.caption || 'Dokumentasi Tim MedSign AI', img: g.image_url })}
                    title="Klik untuk memperbesar"
                  >
                    <img
                      src={g.image_url}
                      alt={g.title}
                      className="w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]"
                      loading="lazy"
                      onError={(e) => { e.currentTarget.style.opacity = '0.25'; }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3.5">
                      <span className="text-xs font-black text-white leading-snug">{g.title}</span>
                      {g.caption && <span className="text-[10px] font-semibold text-slate-200 leading-relaxed mt-0.5">{g.caption}</span>}
                    </div>
                    <div className="p-3 group-hover:hidden">
                      <span className="text-[11px] font-black text-slate-800 leading-snug line-clamp-1">{g.title}</span>
                      {g.caption && <span className="text-[9px] font-semibold text-slate-400 line-clamp-1">{g.caption}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── TIM PENGEMBANG ── */}
          <div className="border-t border-white/60 pt-7">
            <div className="mb-4 flex items-center gap-2">
              <BookOpen size={18} className="text-amber-600" />
              <h4 className="text-sm font-black text-slate-950">Tim Pengembang MedSign AI</h4>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {teamMembers.map((member) => (
                <div key={member.name} className="surface-panel rounded-3xl p-4 flex flex-col items-center text-center gap-3 border border-white/40 shadow-sm hover:scale-[1.02] transition-all">
                  <div className="w-full rounded-2xl bg-white border border-slate-100 p-2 flex items-center justify-center">
                    <img
                      src={member.img}
                      alt={member.name}
                      onClick={() => setZoomedImg(member)}
                      className="w-28 h-28 rounded-2xl object-cover shadow-inner cursor-pointer hover:scale-105 transition-all duration-300"
                      style={{ backgroundColor: '#ffffff' }}
                      title="Klik untuk memperbesar foto"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="112" height="112"><rect width="112" height="112" fill="%23e2e8f0"/><text x="56" y="60" font-size="40" text-anchor="middle" fill="%2394a3b8" font-family="sans-serif">' + member.name[0] + '</text></svg>';
                      }}
                    />
                  </div>
                  <div>
                    <span className="block text-xs font-black text-slate-900">{member.name}</span>
                    <span className="text-[10px] font-semibold text-slate-500">{member.role}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── DOSPEM ── */}
          <div className="border-t border-white/60 pt-7 animate-slide-up">
            <div className="mb-4 flex items-center gap-2">
              <UserCheck size={18} className="text-emerald-600" />
              <h4 className="text-sm font-black text-slate-950">Dosen Pembimbing</h4>
            </div>

            <div className="grid gap-4 sm:grid-cols-1 max-w-xs">
              <div className="surface-panel rounded-3xl p-5 flex flex-col items-center text-center gap-3 border border-white/40 shadow-sm hover:scale-[1.02] transition-all bg-white/50">
                <div className="w-full h-44 rounded-2xl bg-white border border-slate-100 p-2 flex items-center justify-center overflow-hidden shadow-inner">
                  <img
                    src="/assets/kestrilia.png"
                    alt="Dr. Kestrilia Rega Prillianti., S.Si., M.Si"
                    onClick={() => setZoomedImg({ name: "Dr. Kestrilia Rega Prillianti., S.Si., M.Si", role: "Dosen Pembimbing", img: "/assets/kestrilia.png" })}
                    className="h-full w-auto max-w-full object-contain cursor-pointer hover:scale-105 transition-all duration-300 drop-shadow-sm"
                    style={{ backgroundColor: '#ffffff' }}
                    title="Klik untuk memperbesar foto"
                  />
                </div>
                <div>
                  <span className="block text-xs font-black text-slate-900 leading-snug">Dr. Kestrilia Rega Prillianti., S.Si., M.Si</span>
                  <span className="text-[10px] font-semibold text-slate-500 mt-0.5 block">Dosen Pembimbing</span>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-3xl border border-amber-200/70 bg-amber-100/40 p-4 text-sm font-semibold leading-6 text-amber-950">
            <span className="mb-1 block font-black uppercase text-amber-700">{t('limitStatement')}</span>
            {t('limitStatementDesc')}
          </div>
        </div>
      </div>

      {zoomedImg && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-fade-in"
          onClick={() => setZoomedImg(null)}
        >
          <div
            className="relative bg-white rounded-3xl p-6 max-w-md w-full flex flex-col items-center gap-4 shadow-2xl border border-white/20 animate-scale-up text-slate-800"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setZoomedImg(null)}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-900 transition-all font-black text-lg p-1.5"
            >
              ✕
            </button>
            <div className="rounded-2xl bg-white border border-slate-100 p-3 flex items-center justify-center">
              <img
                src={zoomedImg.img}
                alt={zoomedImg.name}
                className="max-h-[70vh] w-auto max-w-full rounded-xl object-contain shadow-lg"
                style={{ backgroundColor: '#ffffff' }}
              />
            </div>
            <div className="text-center">
              <h4 className="text-sm font-black text-slate-950">{zoomedImg.name}</h4>
              <p className="text-[10px] font-semibold text-slate-500 mt-1">{zoomedImg.role}</p>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
