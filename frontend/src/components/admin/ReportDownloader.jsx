import React, { useState } from 'react';
import { FileText, FileSpreadsheet, FileType2, Braces, Loader2, Download } from 'lucide-react';

/* Tombol unduh laporan PDF / Excel / Word / CSV.
   Props: roleScoped ('admin' | 'super_admin'), token, showToast */
export const ReportDownloader = ({ token, showToast, compact = false }) => {
  const [busy, setBusy] = useState(null);

  const API = (localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');

  const formats = [
    { key: 'pdf',  label: 'PDF',   icon: FileText,       cls: 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' },
    { key: 'xls',  label: 'Excel', icon: FileSpreadsheet, cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' },
    { key: 'doc',  label: 'Word',  icon: FileType2,       cls: 'bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100' },
    { key: 'csv',  label: 'CSV',   icon: Braces,          cls: 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100' },
  ];

  const download = async (fmt) => {
    setBusy(fmt);
    try {
      const res = await fetch(`${API}/api/v1/admin/report?format=${fmt}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        showToast?.(err.detail || 'Gagal mengunduh laporan', 'error');
        return;
      }
      const blob = await res.blob();
      const cd = res.headers.get('Content-Disposition') || '';
      const match = cd.match(/filename="?([^";]+)"?/);
      const filename = match ? match[1] : `laporan_medsign.${fmt}`;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast?.(`Laporan ${fmt.toUpperCase()} berhasil diunduh`, 'success');
    } catch (e) {
      showToast?.('Gagal terhubung ke server', 'error');
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? '' : 'w-full'}`}>
      {!compact && (
        <span className="inline-flex items-center gap-1.5 text-[9px] font-black uppercase text-slate-400 tracking-wider mr-1">
          <Download size={12} /> Unduh Laporan
        </span>
      )}
      {formats.map(f => {
        const Icon = f.icon;
        return (
          <button
            key={f.key}
            onClick={() => download(f.key)}
            disabled={busy !== null}
            title={`Unduh laporan ${f.label}`}
            className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all active:scale-95 disabled:opacity-50 ${f.cls}`}
          >
            {busy === f.key ? <Loader2 size={12} className="animate-spin" /> : <Icon size={12} />}
            {f.label}
          </button>
        );
      })}
    </div>
  );
};
