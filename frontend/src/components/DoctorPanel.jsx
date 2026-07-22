import React, { useContext, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { MessageSquare, Zap, Send } from 'lucide-react';

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
  const [customMsg, setCustomMsg] = useState("");

  const handleQuickPhrase = (phrase) => {
    addLogEntry({
      role: 'doctor',
      text: phrase
    });
  };

  const handleSendCustom = (e) => {
    e.preventDefault();
    const cleanMsg = customMsg.trim();
    if (!cleanMsg) return;
    addLogEntry({
      role: 'doctor',
      text: cleanMsg
    });
    setCustomMsg("");
  };

  return (
    <div className="glass-panel flex w-full flex-col gap-5 rounded-3xl p-6">
      <div className="flex items-center gap-2 border-b border-white/60 pb-3">
        <MessageSquare className="text-emerald-600" size={18} />
        <span className="text-sm font-black text-slate-950">Respon & Chat Dokter</span>
      </div>

      {/* Custom Chat & TTS Input */}
      <form onSubmit={handleSendCustom} className="flex flex-col gap-2 border-b border-slate-100 pb-4">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
          Kirim Pesan / Diagnosis Kustom (Menghasilkan Suara TTS)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={customMsg}
            onChange={(e) => setCustomMsg(e.target.value)}
            placeholder="Ketik pesan konsultasi dokter disini..."
            className="glass-input flex-1 rounded-xl px-3 py-2 text-xs font-semibold border border-slate-200 bg-white"
          />
          <button
            type="submit"
            className="glass-button glass-button-primary rounded-xl px-4 py-2 text-xs font-bold flex items-center gap-1.5"
          >
            <Send size={12} />
            Kirim
          </button>
        </div>
      </form>

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
