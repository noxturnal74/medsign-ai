import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { MessageSquare, Send, Zap } from 'lucide-react';

const DOCTOR_QUICKPHRASES = [
  "Tolong duduk dengan tenang.",
  "Buka mulut Anda, katakan 'aah'.",
  "Tarik napas dalam-dalam.",
  "Tahan napas Anda sebentar.",
  "Di mana tepatnya bagian yang sakit?",
  "Sudah berapa hari gejala ini dirasakan?",
  "Apakah Anda memiliki alergi obat?",
  "Saya akan memeriksa tekanan darah Anda.",
  "Hasil pemeriksaan laboratorium sudah siap.",
  "Anda harus beristirahat dan minum obat teratur."
];

export const DoctorPanel = () => {
  const { addLogEntry } = useContext(AppContext);
  const [doctorText, setDoctorText] = useState('');

  const handleSend = () => {
    if (!doctorText.trim()) return;
    addLogEntry({
      role: 'doctor',
      text: doctorText.trim(),
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
      text: phrase,
    });
  };

  return (
    <div className="w-full flex flex-col gap-5 glass-panel p-6 rounded-2xl border border-slate-800">
      
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
        <MessageSquare className="text-emerald-400" size={18} />
        <span className="font-bold text-sm tracking-wide text-slate-200">Kirim Respon Medis Ke Pasien</span>
      </div>

      {/* Textarea Input */}
      <div className="flex flex-col gap-2">
        <div className="relative">
          <textarea
            maxLength={200}
            rows={3}
            value={doctorText}
            onChange={(e) => setDoctorText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ketik penjelasan, instruksi, atau obat di sini..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-sky-500/50 resize-none font-sans"
          />
          <div className="absolute bottom-3 right-3 text-[10px] text-slate-600 font-mono tracking-wider">
            {doctorText.length}/200
          </div>
        </div>

        <button
          onClick={handleSend}
          disabled={!doctorText.trim()}
          className={`w-full py-3 rounded-xl font-semibold text-sm transition-all cursor-pointer flex items-center justify-center gap-2 ${
            doctorText.trim()
              ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-950/20 hover:scale-[1.01]'
              : 'bg-slate-900 text-slate-500 border border-slate-800/80 cursor-not-allowed'
          }`}
        >
          <Send size={15} />
          Kirim & Ucapkan Tanggapan
        </button>
      </div>

      {/* Quick Phrases */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 text-slate-400 text-xs font-bold uppercase tracking-wider">
          <Zap size={14} className="text-amber-400 animate-pulse" />
          Frasa Cepat Medis (Instruksi)
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {DOCTOR_QUICKPHRASES.map((phrase, idx) => (
            <button
              key={idx}
              onClick={() => handleQuickPhrase(phrase)}
              className="bg-slate-950/40 hover:bg-slate-900 border border-slate-800/60 px-4 py-2.5 rounded-xl text-left text-xs font-semibold text-slate-300 transition-all hover:border-slate-700 cursor-pointer overflow-hidden text-ellipsis whitespace-nowrap active:scale-[0.98]"
            >
              {phrase}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
