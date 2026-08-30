import React, { useContext, useState, useRef } from 'react';
import { AppContext } from '../context/AppContextObject';
import { FileText, Loader2, RefreshCw, Copy, CheckCheck, ChevronDown, ChevronUp, Save } from 'lucide-react';

const SOAP_LABELS = {
  subjective: { label: 'S — Subjective', desc: 'Keluhan utama pasien', color: 'text-sky-700', bg: 'bg-sky-50 border-sky-200' },
  objective:  { label: 'O — Objective',  desc: 'Observasi & instruksi dokter', color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
  assessment: { label: 'A — Assessment', desc: 'Kesimpulan sementara', color: 'text-amber-700', bg: 'bg-amber-50 border-amber-200' },
  plan:       { label: 'P — Plan',       desc: 'Rencana tindak lanjut', color: 'text-violet-700', bg: 'bg-violet-50 border-violet-200' },
};

export const AiNotetaker = ({ onSaveSummary, savedSummary }) => {
  const { sessionLog, clearLog } = useContext(AppContext);

  const [soap, setSoap]           = useState(null);   // { subjective, objective, assessment, plan, full_text, llm_used }
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState(null);
  const [copied, setCopied]       = useState(false);
  const [expanded, setExpanded]   = useState(true);
  const [lastCount, setLastCount] = useState(0);

  const apiBase = () => {
    const raw = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
    return raw.endsWith('/') ? raw.slice(0, -1) : raw;
  };

  const generate = async () => {
    if (sessionLog.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const logs = sessionLog.map(e => ({ role: e.role, text: e.text, timestamp: e.timestamp ?? '' }));
      const res  = await fetch(`${apiBase()}/api/v1/nlg/summarize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ logs }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setSoap(data);
      setLastCount(sessionLog.length);
      setExpanded(true);
    } catch (e) {
      setError('Gagal menghasilkan ringkasan. Periksa koneksi dan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  const copyAll = () => {
    if (!soap) return;
    try {
      navigator.clipboard.writeText(soap.full_text)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(err => {
          console.error("Gagal menyalin teks:", err);
          alert("Gagal menyalin otomatis. Silakan seleksi teks secara manual.");
        });
    } catch (e) {
      console.error(e);
      alert("Gagal menyalin otomatis. Silakan seleksi teks secara manual.");
    }
  };

  const hasNewMessages = soap && sessionLog.length > lastCount;
  const canGenerate    = sessionLog.length > 0;

  return (
    <div className="glass-panel flex flex-col gap-4 rounded-3xl p-5 border border-slate-200/60">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600">
            <FileText size={15} />
          </div>
          <div>
            <span className="text-[10px] font-black uppercase text-violet-700 tracking-wider block leading-none">
              AI Notetaker
            </span>
            <span className="text-[9px] font-semibold text-slate-400 leading-none">
              SOAP Note otomatis dari percakapan
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Pesan baru badge */}
          {hasNewMessages && (
            <span className="text-[9px] font-black text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full animate-pulse">
              +{sessionLog.length - lastCount} pesan baru
            </span>
          )}

          {soap && (
            <button
              onClick={() => setExpanded(v => !v)}
              className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 p-1.5 text-slate-500 transition-all"
            >
              {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
          )}
        </div>
      </div>

      {/* Status bar: berapa pesan, siapa bicara */}
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-[9px] font-bold text-slate-500">
          {sessionLog.length} pesan dalam sesi —
          {' '}{sessionLog.filter(e => e.role === 'patient').length} pasien,
          {' '}{sessionLog.filter(e => e.role === 'doctor').length} dokter
        </span>
        {soap?.llm_used && (
          <span className="text-[9px] font-bold text-violet-500 border border-violet-200 px-1.5 py-0.5 rounded-full">
            GPT-4o-mini
          </span>
        )}
        {soap && !soap.llm_used && (
          <span className="text-[9px] font-bold text-slate-400 border border-slate-200 px-1.5 py-0.5 rounded-full">
            Fallback mode
          </span>
        )}
      </div>

      {/* SOAP Result */}
      {soap && expanded && (
        <div className="flex flex-col gap-2.5 animate-slide-up">
          {Object.entries(SOAP_LABELS).map(([key, meta]) => (
            <div key={key} className={`rounded-2xl border px-3.5 py-2.5 ${meta.bg}`}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`text-[9px] font-black uppercase tracking-wider ${meta.color}`}>
                  {meta.label}
                </span>
                <span className="text-[8px] text-slate-400 font-semibold">{meta.desc}</span>
              </div>
              <p className="text-xs font-semibold text-slate-800 leading-relaxed">
                {soap[key] || '-'}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-2xl bg-red-50 border border-red-200 px-3.5 py-2.5 text-xs font-semibold text-red-600">
          {error}
        </div>
      )}

      {/* Tidak ada pesan */}
      {!canGenerate && !loading && (
        <div className="rounded-2xl bg-slate-50 border border-slate-200 px-3.5 py-3 text-center">
          <p className="text-[10px] font-semibold text-slate-400">
            Belum ada percakapan. Mulai sesi konsultasi untuk mengaktifkan Notetaker.
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={generate}
          disabled={!canGenerate || loading}
          className={`flex flex-1 items-center justify-center gap-1.5 rounded-2xl py-2.5 text-xs font-black uppercase transition-all active:scale-[0.98] ${
            canGenerate && !loading
              ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-sm shadow-violet-400/30'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          {loading
            ? <><Loader2 size={13} className="animate-spin" /> Membuat Ringkasan...</>
            : soap
              ? <><RefreshCw size={13} /> Perbarui SOAP Note</>
              : <><FileText size={13} /> Buat SOAP Note</>
          }
        </button>

        {soap && (
          <button
            onClick={copyAll}
            title="Salin seluruh SOAP Note"
            className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2.5 text-xs font-black text-slate-600 transition-all active:scale-95"
          >
            {copied ? <CheckCheck size={13} className="text-emerald-600" /> : <Copy size={13} />}
            {copied ? 'Tersalin' : 'Salin'}
          </button>
        )}

        {soap && onSaveSummary && (
          <button
            onClick={() => onSaveSummary(soap.full_text)}
            className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white hover:bg-slate-50 px-3 py-2.5 text-xs font-black text-slate-600 transition-all active:scale-95"
            title="Simpan Ringkasan SOAP ke Sesi Pasien"
          >
            <Save size={13} className="text-sky-600" />
            Simpan
          </button>
        )}
      </div>

      {/* Disclaimer */}
      <p className="text-[8.5px] font-semibold text-slate-400 leading-relaxed -mt-1">
        🔒 AI Notetaker hanya merangkum percakapan aktual. Tidak menambah diagnosis, gejala, atau saran yang tidak disebutkan. Selalu verifikasi sebelum digunakan sebagai rekam medis resmi.
      </p>
    </div>
  );
};
