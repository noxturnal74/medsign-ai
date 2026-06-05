import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { MessageSquare, Send, Zap } from 'lucide-react';

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
  const [doctorText, setDoctorText] = useState('');

  const handleSend = () => {
    if (!doctorText.trim()) return;
    addLogEntry({
      role: 'doctor',
      text: doctorText.trim()
    });
    setDoctorText('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

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
        <span className="text-sm font-black text-slate-950">Kirim Respon Medis Ke Pasien</span>
      </div>

      <div className="flex flex-col gap-2">
        <div className="relative">
          <textarea
            maxLength={200}
            rows={3}
            value={doctorText}
            onChange={(e) => setDoctorText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ketik penjelasan, instruksi, atau obat di sini..."
            className="glass-input w-full resize-none rounded-2xl px-4 py-3 pr-16 text-sm font-semibold"
          />
          <div className="absolute bottom-3 right-3 text-[10px] font-semibold text-slate-500">
            {doctorText.length}/200
          </div>
        </div>

        <button
          onClick={handleSend}
          disabled={!doctorText.trim()}
          className={`flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold transition-all ${
            doctorText.trim()
              ? 'glass-button glass-button-primary'
              : 'cursor-not-allowed border border-white/60 bg-white/40 text-slate-400'
          }`}
        >
          <Send size={15} />
          Kirim & Ucapkan Tanggapan
        </button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-600">
          <Zap size={14} className="text-amber-500" />
          Frasa Cepat Medis
        </div>
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
