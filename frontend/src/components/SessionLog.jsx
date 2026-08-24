import React, { useContext, useRef, useEffect } from 'react';
import { AppContext } from '../context/AppContextObject';
import { Clipboard, Download, FileText, Stethoscope, Trash2, UserRound } from 'lucide-react';

export const SessionLog = () => {
  const { sessionLog, clearLog, showToast } = useContext(AppContext);
  const scrollRef = useRef(null);

  // Chronological order: oldest messages at the top, newest at the bottom
  const orderedLogs = [...sessionLog].reverse();

  // Scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [sessionLog]);

  const handleCopy = () => {
    if (sessionLog.length === 0) return;
    const text = orderedLogs
      .map((entry) => `[${entry.timestamp}] ${entry.role === 'doctor' ? 'DOKTER' : 'PASIEN'}: ${entry.text}`)
      .join('\n');

    navigator.clipboard.writeText(text);
    showToast('Log percakapan disalin ke papan klip.', 'success');
  };

  const handleExport = () => {
    if (sessionLog.length === 0) return;
    const text = orderedLogs
      .map((entry) => `[${entry.timestamp}] ${entry.role === 'doctor' ? 'DOKTER' : 'PASIEN'}: ${entry.text}`)
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
    <div className="glass-panel flex w-full flex-col gap-4 rounded-3xl p-5 border border-white/60 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
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

      <div 
        ref={scrollRef}
        className="flex max-h-[300px] flex-col gap-3 overflow-y-auto pr-1 scroll-smooth w-full"
      >
        {orderedLogs.length === 0 ? (
          <div className="py-12 text-center text-xs font-semibold text-slate-500">
            Belum ada riwayat percakapan sesi ini.
          </div>
        ) : (
          orderedLogs.map((entry) => {
            const isDoctor = entry.role === 'doctor';
            const RoleIcon = isDoctor ? Stethoscope : UserRound;

            return (
              <div
                key={entry.id}
                className={`flex flex-col gap-1.5 rounded-2xl border p-3.5 transition-all animate-slide-up max-w-[85%] ${
                  isDoctor
                    ? 'border-emerald-200 bg-emerald-50/90 text-slate-800 self-end ml-12 rounded-tr-none shadow-sm'
                    : 'border-sky-200 bg-sky-50/90 text-slate-800 self-start mr-12 rounded-tl-none shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between gap-4 text-[9px] font-bold">
                  <span className={`inline-flex items-center gap-1 uppercase ${isDoctor ? 'text-emerald-700' : 'text-sky-700'}`}>
                    <RoleIcon size={11} />
                    {isDoctor ? 'Dokter' : 'Pasien'}
                  </span>
                  <div className="flex items-center gap-1 text-slate-400">
                    {entry.confidence && entry.confidence < 1.0 && (
                      <span className="rounded-full bg-white/70 px-1.5 py-0.5 text-[8px] text-slate-500">
                        {Math.round(entry.confidence * 100)}% conf
                      </span>
                    )}
                    <span>{entry.timestamp}</span>
                  </div>
                </div>

                <p className="text-xs font-semibold leading-relaxed text-slate-700 m-0 break-words">{entry.text}</p>
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
    className="rounded-xl border border-slate-200 bg-white hover:bg-slate-50 p-2 text-slate-600 transition-all hover:text-sky-700"
    title={title}
  >
    <Icon size={14} />
  </button>
);
