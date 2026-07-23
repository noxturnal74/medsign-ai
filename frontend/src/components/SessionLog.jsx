import React, { useContext } from 'react';
import { AppContext } from '../context/AppContextObject';
import { Clipboard, Download, FileText, Stethoscope, Trash2, UserRound } from 'lucide-react';

export const SessionLog = () => {
  const { sessionLog, clearLog } = useContext(AppContext);

  const handleCopy = () => {
    if (sessionLog.length === 0) return;
    const text = sessionLog
      .map((entry) => `[${entry.timestamp}] ${entry.role === 'doctor' ? 'DOKTER' : 'PASIEN'}: ${entry.text}`)
      .reverse()
      .join('\n');

    navigator.clipboard.writeText(text);
    alert('Log percakapan disalin ke papan klip.');
  };

  const handleExport = () => {
    if (sessionLog.length === 0) return;
    const text = sessionLog
      .map((entry) => `[${entry.timestamp}] ${entry.role === 'doctor' ? 'DOKTER' : 'PASIEN'}: ${entry.text}`)
      .reverse()
      .join('\n');

    const element = document.createElement('a');
    const file = new Blob([text], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `MedSign-Session-Log-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="glass-panel flex w-full flex-col gap-4 rounded-3xl p-5">
      <div className="flex items-center justify-between border-b border-white/60 pb-3">
        <div className="flex items-center gap-2">
          <FileText className="text-sky-600" size={18} />
          <span className="text-sm font-black text-slate-950">Log Sesi Percakapan</span>
        </div>

        {sessionLog.length > 0 && (
          <div className="flex items-center gap-1.5">
            <IconButton onClick={handleCopy} title="Salin Log" icon={Clipboard} />
            <IconButton onClick={handleExport} title="Ekspor ke TXT" icon={Download} />
            <button
              onClick={clearLog}
              className="rounded-xl border border-red-300/50 bg-red-500/10 p-2 text-red-600 transition-all hover:bg-red-500/20"
              title="Bersihkan Log"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      <div className="flex max-h-[300px] flex-col gap-2 overflow-y-auto pr-1">
        {sessionLog.length === 0 ? (
          <div className="py-12 text-center text-xs font-semibold text-slate-500">
            Belum ada riwayat percakapan sesi ini.
          </div>
        ) : (
          sessionLog.map((entry) => {
            const isDoctor = entry.role === 'doctor';
            const RoleIcon = isDoctor ? Stethoscope : UserRound;

            return (
              <div
                key={entry.id}
                className={`flex flex-col gap-2 rounded-2xl border p-3 transition-all animate-slide-up ${
                  isDoctor
                    ? 'border-emerald-300/50 bg-emerald-500/10'
                    : 'border-sky-300/50 bg-sky-500/10'
                }`}
              >
                <div className="flex items-center justify-between gap-3 text-[10px] font-bold">
                  <span className={`inline-flex items-center gap-1.5 uppercase ${isDoctor ? 'text-emerald-700' : 'text-sky-700'}`}>
                    <RoleIcon size={12} />
                    {isDoctor ? 'Dokter' : 'Pasien'}
                  </span>
                  <div className="flex items-center gap-1.5 text-slate-500">
                    {entry.confidence && entry.confidence < 1.0 && (
                      <span className="rounded-full bg-white/60 px-2 py-0.5 text-[9px]">
                        {Math.round(entry.confidence * 100)}% conf
                      </span>
                    )}
                    <span>{entry.timestamp}</span>
                  </div>
                </div>

                <p className="text-xs font-semibold leading-6 text-slate-700">{entry.text}</p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

const IconButton = ({ onClick, title, icon: Icon }) => (
  <button
    onClick={onClick}
    className="rounded-xl border border-white/60 bg-white/50 p-2 text-slate-600 transition-all hover:bg-white/80 hover:text-sky-700"
    title={title}
  >
    <Icon size={14} />
  </button>
);
