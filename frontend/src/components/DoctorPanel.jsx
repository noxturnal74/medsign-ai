import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { MessageSquare, Zap } from 'lucide-react';

const DOCTOR_QUICKPHRASES = [
  'Tolong duduk dengan tenang.',
  "Buka mulut Anda, katakan 'aah'.",
  'Tarik napas dalam-dalam.',
  'Tahan napas Anda sebentar.',
  'Di mana tepatnya bagian yang sakit?',
  'Sudah berapa hari gejala ini dirasakan?',
  'Apakah Anda memiliki alergi obat?',
  'Saya akan memeriksa tekanan darah Anda.',
  'Hasil pemeriksaan laboratorium sudah siap.',
  'Anda harus beristirahat dan minum obat teratur.'
];

export const DoctorPanel = () => {
  const { addLogEntry } = useContext(AppContext);

  const handleQuickPhrase = (phrase) => {
    addLogEntry({
      role: 'doctor',
      text: phrase
    });
  };

  return (
    <div className="glass-panel flex w-full flex-col gap-5 rounded-3xl p-6">
      <div className="flex items-center gap-2 border-b border-white/60 pb-3">
        <MessageSquare className="text-emerald-600" size={18} />
        <span className="text-sm font-black text-slate-950">Respon Cepat ke Pasien</span>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-600">
          <Zap size={14} className="text-amber-500" />
          Frasa Cepat Medis
        </div>
        <p className="text-[10px] font-semibold text-slate-500">
          Klik salah satu frasa di bawah untuk mengirim dan membunyikan respon ke pasien.
        </p>
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {DOCTOR_QUICKPHRASES.map((phrase, idx) => (
            <button
              key={idx}
              onClick={() => handleQuickPhrase(phrase)}
              className="overflow-hidden text-ellipsis whitespace-nowrap rounded-2xl border border-white/60 bg-white/40 px-4 py-2.5 text-left text-xs font-bold text-slate-700 transition-all hover:bg-white/75 active:scale-[0.98]"
            >
              {phrase}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
