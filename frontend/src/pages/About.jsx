import React, { useContext } from 'react';

import { AppContext } from '../context/AppContextObject';

import { ArrowLeft, BookOpen, CheckCircle, Code, FileText, ShieldCheck, Terminal, UserCheck } from 'lucide-react';



const frontendItems = [

  'React 18 + Vite 5 untuk SPA berlatensi rendah',

  'TailwindCSS 3 dengan sistem visual glass',

  'MediaPipe Hands JS untuk ekstraksi 21 landmark',

  'Web Speech API native untuk text-to-speech id-ID'

];



const backendItems = [

  'FastAPI Python 3.11 dengan WebSocket streaming',

  'Model sequence LSTM untuk kosakata klinis',

  'TensorFlow Lite interpreter untuk CPU inference',

  'Struktur logging sesi dan audit konsultasi'

];







export const About = ({ setView }) => {

  const { t } = useContext(AppContext);

  const [zoomedImg, setZoomedImg] = React.useState(null);

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



      <div className="glass-panel rounded-[32px] p-6 md:p-8">

        <div className="grid gap-7 lg:grid-cols-[0.95fr_1.05fr]">

          <div>

            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-600">

              <ShieldCheck size={24} />

            </div>

            <h3 className="text-3xl font-black leading-tight text-slate-950 md:text-4xl">

              {t('aboutDesc')}

            </h3>

            <p className="mt-4 text-sm font-semibold leading-7 text-slate-600">

              {t('aboutShort')}

            </p>

          </div>



          <div className="grid gap-4 md:grid-cols-2">

            <TechList title="Frontend" icon={Code} tone="text-sky-600" items={frontendItems} />

            <TechList title="Backend & ML" icon={Terminal} tone="text-emerald-600" items={backendItems} />

          </div>

        </div>



        <div className="mt-8 border-t border-white/60 pt-7">

          <div className="mb-4 flex items-center gap-2">

            <BookOpen size={18} className="text-amber-600" />

            <h4 className="text-sm font-black text-slate-950">Tim Pengembang MedSign AI</h4>

          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

            {[

              { name: "Albert William Saputra", role: "Fullstack Developer & Integration", img: "/assets/albert_2.jpg" },

              { name: "Albert Cheng", role: "Integration & Dataset Collector", img: "/assets/albert_cheng_3.jpg" },

              { name: "Glenn Emmanuel Abraham", role: "UI/UX & Dataset Collector", img: "/assets/glenn_2.jpg" },

              { name: "Lorensa Amelia", role: "Marketing & Dataset Collector", img: "/assets/loren_2.jpg" }

            ].map((member) => (

              <div key={member.name} className="surface-panel rounded-3xl p-4 flex flex-col items-center text-center gap-3 border border-white/40 shadow-sm hover:scale-[1.02] transition-all">

                <img 

                  src={member.img} 

                  alt={member.name} 

                  onClick={() => setZoomedImg(member)}

                  className="w-20 h-20 rounded-full object-cover border-2 border-sky-500/30 shadow-inner cursor-pointer hover:scale-105 hover:border-sky-500 transition-all duration-300"

                  title="Klik untuk memperbesar foto"

                />

                <div>

                  <span className="block text-xs font-black text-slate-900">{member.name}</span>

                  <span className="text-[10px] font-semibold text-slate-500">{member.role}</span>

                </div>

              </div>

            ))}

          </div>

        </div>



        <div className="mt-8 border-t border-white/60 pt-7 animate-slide-up">

          <div className="mb-4 flex items-center gap-2">

            <UserCheck size={18} className="text-emerald-600" />

            <h4 className="text-sm font-black text-slate-950">Dosen Pembimbing</h4>

          </div>

          <div className="grid gap-4 sm:grid-cols-1 max-w-xs">

            <div className="surface-panel rounded-3xl p-4 flex flex-col items-center text-center gap-3 border border-white/40 shadow-sm hover:scale-[1.02] transition-all bg-white/50">

              <img

                src="/assets/kestrilia.png"

                alt="Dr. Kestrilia Rega Prillianti., S.Si., M.Si"

                onClick={() => setZoomedImg({ name: "Dr. Kestrilia Rega Prillianti., S.Si., M.Si", role: "Dosen Pembimbing", img: "/assets/kestrilia.png" })}

                className="w-20 h-20 rounded-full object-cover border-2 border-emerald-500/30 shadow-inner cursor-pointer hover:scale-105 hover:border-emerald-500 transition-all duration-300"

                title="Klik untuk memperbesar foto"

              />

              <div>

                <span className="block text-xs font-black text-slate-900">Dr. Kestrilia Rega Prillianti., S.Si., M.Si</span>

                <span className="text-[10px] font-semibold text-slate-500">Dosen Pembimbing</span>

              </div>

            </div>

          </div>

        </div>



        <div className="mt-8 rounded-3xl border border-amber-200/70 bg-amber-100/40 p-4 text-sm font-semibold leading-6 text-amber-950">

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

            className="relative bg-white rounded-3xl p-6 max-w-xs w-full flex flex-col items-center gap-4 shadow-2xl border border-white/20 animate-scale-up text-slate-800"

            onClick={(e) => e.stopPropagation()}

          >

            <button 

              onClick={() => setZoomedImg(null)}

              className="absolute top-3 right-3 text-slate-400 hover:text-slate-900 transition-all font-black text-lg p-1.5"

            >

              ✕

            </button>

            <img 

              src={zoomedImg.img} 

              alt={zoomedImg.name} 

              className="w-40 h-40 rounded-full object-cover border-4 border-sky-500/20 shadow-lg"

            />

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



const TechList = ({ title, icon: Icon, tone, items }) => (

  <div className="surface-panel rounded-3xl p-5">

    <h4 className={`mb-4 flex items-center gap-2 text-sm font-black ${tone}`}>

      <Icon size={17} />

      {title}

    </h4>

    <ul className="flex flex-col gap-3">

      {items.map(item => (

        <li key={item} className="flex gap-2 text-xs font-semibold leading-5 text-slate-600">

          <CheckCircle size={14} className="mt-0.5 shrink-0 text-emerald-500" />

          {item}

        </li>

      ))}

    </ul>

  </div>

);

