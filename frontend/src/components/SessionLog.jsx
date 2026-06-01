import React, { useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { FileText, Clipboard, Trash2, Download } from 'lucide-react';

export const SessionLog = () => {
  const { sessionLog, clearLog } = useContext(AppContext);

  // Copy session log to clipboard
  const handleCopy = () => {
    if (sessionLog.length === 0) return;
    const text = sessionLog
      .map((entry) => `[${entry.timestamp}] ${entry.role === 'doctor' ? 'DOKTER' : 'PASIEN'}: ${entry.text}`)
      .reverse()
      .join('\n');
      
    navigator.clipboard.writeText(text);
    alert('Log percakapan disalin ke papan klip!');
  };

  // Export to TXT file
  const handleExport = () => {
    if (sessionLog.length === 0) return;
    const text = sessionLog
      .map((entry) => `[${entry.timestamp}] ${entry.role === 'doctor' ? 'DOKTER' : 'PASIEN'}: ${entry.text}`)
      .reverse()
      .join('\n');

    const element = document.createElement("a");
    const file = new Blob([text], {type: 'text/plain;charset=utf-8'});
    element.href = URL.createObjectURL(file);
    element.download = `MedSign-Session-Log-${new Date().toISOString().slice(0,10)}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="w-full flex flex-col gap-4 glass-panel p-5 rounded-2xl border border-slate-800">
      
      {/* Header & Controls */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
        <div className="flex items-center gap-2">
          <FileText className="text-sky-400" size={18} />
          <span className="font-bold text-sm tracking-wide text-slate-200">Log Sesi Percakapan</span>
        </div>

        {sessionLog.length > 0 && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopy}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-sky-400 transition-all cursor-pointer"
              title="Salin Log"
            >
              <Clipboard size={14} />
            </button>
            <button
              onClick={handleExport}
              className="p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-sky-400 transition-all cursor-pointer"
              title="Ekspor ke TXT"
            >
              <Download size={14} />
            </button>
            <button
              onClick={clearLog}
              className="p-2 rounded-lg bg-red-950/20 border border-red-500/10 hover:bg-red-950/40 text-red-400 transition-all cursor-pointer"
              title="Bersihkan Log"
            >
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Log entries scroll list */}
      <div className="flex flex-col gap-2 max-h-[300px] overflow-y-auto pr-1">
        {sessionLog.length === 0 ? (
          <div className="py-12 text-center text-slate-600 text-xs font-mono">
            Belum ada riwayat percakapan sesi ini.
          </div>
        ) : (
          sessionLog.map((entry) => {
            const isDoctor = entry.role === 'doctor';
            return (
              <div
                key={entry.id}
                className={`flex flex-col gap-1 p-3 rounded-xl border transition-all animate-slide-up ${
                  isDoctor
                    ? 'bg-emerald-950/15 border-emerald-900/40 border-l-2 border-l-emerald-500'
                    : 'bg-sky-950/15 border-sky-900/40 border-l-2 border-l-sky-500'
                }`}
              >
                {/* Title line */}
                <div className="flex justify-between items-center text-[9px] font-bold font-mono tracking-wider">
                  <span className={isDoctor ? 'text-emerald-400' : 'text-sky-400'}>
                    {isDoctor ? '👨‍⚕️ DOKTER' : '🤟 PASIEN'}
                  </span>
                  <div className="flex items-center gap-1.5 text-slate-500">
                    {entry.confidence && entry.confidence < 1.0 && (
                      <span className="bg-slate-950 px-1.5 py-0.5 rounded border border-slate-900 text-[8px]">
                        {Math.round(entry.confidence * 100)}% Conf
                      </span>
                    )}
                    <span>{entry.timestamp}</span>
                  </div>
                </div>

                {/* Main Speech Content */}
                <p className="text-xs text-slate-200 leading-relaxed font-semibold">
                  {entry.emoji && <span className="mr-1">{entry.emoji}</span>}
                  {entry.text}
                </p>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
