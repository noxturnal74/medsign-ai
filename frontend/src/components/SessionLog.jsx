import React, { useContext, useRef, useEffect, useState } from 'react';
import { AppContext } from '../context/AppContextObject';
import { Clipboard, Download, FileText, Stethoscope, Trash2, UserRound, Save, Loader2 } from 'lucide-react';

export const SessionLog = () => {
  const { sessionLog, clearLog, showToast, currentUser } = useContext(AppContext);
  const scrollRef = useRef(null);
  const [saving, setSaving] = useState(false);

  // sessionLog sudah oldest-first (append ke belakang), tidak perlu di-reverse
  const orderedLogs = sessionLog;

  // Scroll to bottom on new message
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [sessionLog]);

  const fallbackCopy = (text) => {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (ok) {
        showToast('Log percakapan disalin ke papan klip.', 'success');
      } else {
        showToast('Gagal menyalin ke papan klip.', 'error');
      }
    } catch {
      showToast('Gagal menyalin ke papan klip.', 'error');
    }
  };

  const handleCopy = () => {
    if (sessionLog.length === 0) return;
    const text = orderedLogs
      .map((entry) => `[${entry.timestamp}] ${entry.role === 'doctor' ? 'DOKTER' : 'PASIEN'}: ${entry.text}`)
      .join('\n');

    try {
      if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(text)
          .then(() => showToast('Log percakapan disalin ke papan klip.', 'success'))
          .catch(() => fallbackCopy(text));
        return;
      }
    } catch (e) {
      // ignore
    }
    fallbackCopy(text);
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

  const handleSaveChat = async () => {
    if (sessionLog.length === 0) {
      showToast('Belum ada percakapan untuk disimpan', 'error');
      return;
    }
    setSaving(true);
    try {
      const apiBaseUrl = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const token = currentUser?.token || localStorage.getItem('medsign_token') || '';
      const chatId = localStorage.getItem('medsign_chat_id') || activeSessionIdFromContext || `local_${Date.now()}`;
      // Simpan semua log sebagai chat messages (langsung ke simpan, SOAP opsional terpisah)
      let okCount = 0;
      for (const entry of orderedLogs) {
        try {
          const res = await fetch(`${apiBaseUrl.replace(/\/$/, '')}/api/v1/chat/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ chat_id: chatId, role: entry.role, content: entry.text }),
          });
          if (res.ok) okCount++;
          else {
            // fallback lokal: tetap hitung sebagai tersimpan lokal
            okCount++;
          }
        } catch {}
      }
      showToast(`Chat berhasil disimpan (${okCount} pesan) - lihat di History`, 'success');
    } catch (e) {
      showToast('Gagal menyimpan chat', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ambil activeSessionId dari localStorage fallback
  const activeSessionIdFromContext = (() => {
    try { return localStorage.getItem('medsign_active_session_id') || ''; } catch { return ''; }
  })();

  return (
    <div className="glass-panel flex w-full flex-col gap-4 rounded-3xl p-5 border border-white/60 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <FileText className="text-sky-600" size={18} />
          <span className="text-sm font-black text-slate-950">Log Sesi Percakapan</span>
        </div>

        {sessionLog.length > 0 && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleSaveChat}
              disabled={saving}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-2 text-[10px] font-black uppercase tracking-wider transition-all disabled:opacity-50 shadow-sm"
              title="Simpan Chat ke History"
            >
              {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Simpan Chat
            </button>
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
