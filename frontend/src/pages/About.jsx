import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { ArrowLeft, BookOpen, CheckCircle, Code, FileText, ShieldCheck, Terminal } from 'lucide-react';

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

const docs = [
  ['PRD.md.pdf', 'Product Requirements'],
  ['SRS.md.pdf', 'Software Requirements'],
  ['SDD.md.pdf', 'Software Design'],
  ['UI_UX_FLOW.md.pdf', 'Wireframes & Flow'],
  ['TASK_BREAKDOWN.md.pdf', 'Sprint Roadmap'],
  ['PROJECT_CONTEXT_PROMPT.md.pdf', 'LLM Context']
];

export const About = ({ setView }) => {
  const { t } = useContext(AppContext);
  return (
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
            <h4 className="text-sm font-black text-slate-950">{t('projectDocs')}</h4>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {docs.map(([name, description]) => (
              <div key={name} className="surface-panel rounded-2xl p-3">
                <div className="flex items-start gap-2.5">
                  <FileText size={16} className="mt-0.5 shrink-0 text-sky-600" />
                  <div className="min-w-0">
                    <span className="block truncate text-[11px] font-black uppercase text-slate-800">{name}</span>
                    <span className="text-[10px] font-semibold text-slate-500">{description}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-amber-200/70 bg-amber-100/40 p-4 text-sm font-semibold leading-6 text-amber-950">
          <span className="mb-1 block font-black uppercase text-amber-700">{t('limitStatement')}</span>
          {t('limitStatementDesc')}
        </div>
      </div>
    </div>
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
