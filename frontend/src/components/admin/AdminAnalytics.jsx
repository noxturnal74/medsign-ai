import React, { useState, useMemo } from 'react';
import {
  Activity, BarChart3, LineChart as LineIcon, Users,
  Sparkles, Clock, Gauge
} from 'lucide-react';

/* ── Timeframe definitions ───────────────────────────────────────── */
const TIMEFRAMES = {
  '1h':  { label: '1 Jam',  count: 12, type: 'minutes', labels: Array.from({ length: 12 }, (_, i) => `${i * 5}m`) },
  '24h': { label: '24 Jam', count: 24, type: 'hours',   labels: Array.from({ length: 24 }, (_, i) => `${String(i).padStart(2, '0')}:00`) },
  '7d':  { label: '7 Hari', count: 7,  type: 'days',    labels: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'] },
  '30d': { label: '30 Hari',count: 30, type: 'days',    labels: Array.from({ length: 30 }, (_, i) => `${i + 1}`) },
};

// Deterministic pseudo-random so the chart is stable per timeframe + seed
const seeded = (seed) => {
  const x = Math.sin(seed * 999) * 10000;
  return x - Math.floor(x);
};

const generateSeries = (tf, seedBase) => {
  const cfg = TIMEFRAMES[tf];
  const arr = [];
  let trend = 0.5 + seeded(seedBase) * 0.3;
  for (let i = 0; i < cfg.count; i++) {
    trend += (seeded(seedBase + i) - 0.45) * 0.25;
    trend = Math.max(0.08, Math.min(1, trend));
    const noise = 0.7 + seeded(seedBase * 3 + i * 7) * 0.6;
    arr.push(Math.max(1, Math.round(trend * 16 * noise)));
  }
  return arr;
};

export const AdminAnalytics = ({ overview }) => {
  const [tf, setTf] = useState('24h');
  const [mode, setMode] = useState('line'); // 'line' | 'bar'
  const [hovered, setHovered] = useState(null);

  const cfg = TIMEFRAMES[tf];
  const seedBase = { '1h': 11, '24h': 23, '7d': 37, '30d': 53 }[tf];
  const series = useMemo(() => generateSeries(tf, seedBase), [tf]);

  const total = series.reduce((a, b) => a + b, 0);
  const avg = Math.round(total / series.length);
  const peak = Math.max(...series);
  const peakIdx = series.indexOf(peak);

  // Chart geometry
  const W = 820, H = 320, PAD_L = 44, PAD_R = 16, PAD_T = 18, PAD_B = 38;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const maxVal = Math.max(...series, 10);
  const niceMax = Math.ceil(maxVal / 5) * 5;

  const xAt = (i) => PAD_L + (series.length === 1 ? innerW / 2 : (i * innerW) / (series.length - 1));
  const yAt = (v) => PAD_T + innerH - (v / niceMax) * innerH;

  const linePts = series.map((v, i) => `${xAt(i)},${yAt(v)}`).join(' ');
  const areaPath = `M ${xAt(0)},${PAD_T + innerH} L ${series.map((v, i) => `${xAt(i)},${yAt(v)}`).join(' L ')} L ${xAt(series.length - 1)},${PAD_T + innerH} Z`;

  const barW = (innerW / series.length) * 0.62;

  const gridY = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    y: PAD_T + innerH - f * innerH, val: Math.round(f * niceMax)
  }));

  // Visible x labels (avoid crowding)
  const labelStep = Math.ceil(series.length / 8);
  const visibleLabels = cfg.labels.map((l, i) => (i % labelStep === 0 ? l : ''));

  /* ── User distribution donut ──────────────────────────────────── */
  const totalUsers = overview
    ? ((overview.total_admins || 0) + (overview.active_doctors || 0) + (overview.total_patients || 0))
    : 1;
  const adminPct = overview ? Math.round(((overview.total_admins || 0) / (totalUsers || 1)) * 100) : 0;
  const doctorPct = overview ? Math.round(((overview.active_doctors || 0) / (totalUsers || 1)) * 100) : 0;
  const patientPct = Math.max(0, 100 - adminPct - doctorPct);
  const R = 58, C = 2 * Math.PI * R;
  const seg = [
    { pct: adminPct, color: '#6366f1', label: 'Admin' },
    { pct: doctorPct, color: '#10b981', label: 'Dokter' },
    { pct: patientPct, color: '#f43f5e', label: 'Pasien' },
  ];
  let acc = 0;
  const donut = seg.map(s => {
    const len = (s.pct / 100) * C;
    const segObj = { ...s, offset: -acc, len };
    acc += len;
    return segObj;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Control bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-black text-slate-950 uppercase tracking-wide flex items-center gap-2">
            <Gauge size={16} className="text-sky-600" /> Analitik Sesi Medis
          </h3>
          <p className="text-[11px] font-semibold text-slate-400 mt-1">
            Pantau volume konsultasi dokter-pasien dan distribusi pengguna secara real-time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Timeframe filter */}
          <div className="flex items-center gap-1 rounded-2xl bg-slate-100 p-1 border border-slate-200">
            {Object.keys(TIMEFRAMES).map(k => (
              <button
                key={k}
                onClick={() => setTf(k)}
                className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all ${
                  tf === k ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {TIMEFRAMES[k].label}
              </button>
            ))}
          </div>
          {/* Chart type toggle */}
          <div className="flex items-center gap-1 rounded-2xl bg-slate-100 p-1 border border-slate-200">
            <button
              onClick={() => setMode('line')}
              className={`p-1.5 rounded-xl transition-all ${mode === 'line' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500'}`}
              title="Grafik Garis"
            ><LineIcon size={15} /></button>
            <button
              onClick={() => setMode('bar')}
              className={`p-1.5 rounded-xl transition-all ${mode === 'bar' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500'}`}
              title="Grafik Batang"
            ><BarChart3 size={15} /></button>
          </div>
        </div>
      </div>

      {/* Period summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: `Total Sesi (${cfg.label})`, desc: 'Seluruh sesi konsultasi aktif', value: total, icon: Activity, color: 'text-sky-600 bg-sky-50' },
          { label: 'Rata-rata / Titik', desc: 'Jumlah sesi per titik data', value: avg, icon: Gauge, color: 'text-violet-600 bg-violet-50' },
          { label: 'Puncak Sesi', desc: 'Volume sesi tertinggi', value: peak, icon: Sparkles, color: 'text-amber-600 bg-amber-50' },
          { label: 'Waktu Puncak', desc: 'Jam dengan sesi terbanyak', value: cfg.labels[peakIdx] || '-', icon: Clock, color: 'text-emerald-600 bg-emerald-50' },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <div key={i} className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-center gap-3">
              <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${s.color}`}><Icon size={18} /></div>
              <div className="min-w-0">
                <p className="text-[9px] font-bold uppercase text-slate-400 truncate">{s.label}</p>
                <p className="text-lg font-black text-slate-900 leading-tight">{s.value}</p>
                <p className="text-[8px] font-semibold text-slate-400 truncate">{s.desc}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Main interactive chart */}
      <div className="bg-white rounded-[28px] p-5 md:p-6 border border-slate-200 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-xs font-black text-slate-900 uppercase tracking-wide">Grafik Sesi Konsultasi</h4>
            <p className="text-[10px] font-semibold text-slate-400 mt-0.5">Jumlah sesi dokter-pasien per periode waktu</p>
          </div>
          <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400">
            <span className="w-2 h-2 rounded-full bg-sky-500" /> Sesi aktif
          </div>
        </div>

        <div className="relative w-full" onMouseLeave={() => setHovered(null)}>
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto overflow-visible">
            <defs>
              <linearGradient id="adminArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.28" />
                <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
              </linearGradient>
            </defs>

            {/* Y-axis label */}
            <text x={12} y={PAD_T + innerH / 2} textAnchor="middle" transform={`rotate(-90, 12, ${PAD_T + innerH / 2})`} className="fill-slate-400 text-[9px] font-bold">Jumlah Sesi</text>

            {/* Grid */}
            {gridY.map((g, i) => (
              <g key={i}>
                <line x1={PAD_L} y1={g.y} x2={W - PAD_R} y2={g.y} stroke="#f1f5f9" strokeWidth="1" />
                <text x={PAD_L - 8} y={g.y + 3} textAnchor="end" className="fill-slate-400 text-[9px] font-bold">{g.val}</text>
              </g>
            ))}

            {/* Bars */}
            {mode === 'bar' && series.map((v, i) => {
              const bx = xAt(i) - barW / 2;
              const by = yAt(v);
              const bh = (PAD_T + innerH) - by;
              const active = hovered?.i === i;
              return (
                <rect
                  key={i}
                  x={bx} y={by} width={barW} height={Math.max(0, bh)} rx={4}
                  fill={active ? '#0369a1' : '#0ea5e9'}
                  opacity={hovered && !active ? 0.5 : 0.92}
                  onMouseEnter={() => setHovered({ i, v, xPct: (xAt(i) / W) * 100, yPct: (yAt(v) / H) * 100 })}
                  className="cursor-pointer transition-all"
                />
              );
            })}

            {/* Area + Line */}
            {mode === 'line' && (
              <>
                <path d={areaPath} fill="url(#adminArea)" />
                <polyline
                  points={linePts} fill="none" stroke="#0ea5e9" strokeWidth="3"
                  strokeLinecap="round" strokeLinejoin="round"
                />
                {series.map((v, i) => (
                  <circle
                    key={i} cx={xAt(i)} cy={yAt(v)} r={hovered?.i === i ? 6 : 3.5}
                    fill="#fff" stroke="#0ea5e9" strokeWidth="3"
                    onMouseEnter={() => setHovered({ i, v, xPct: (xAt(i) / W) * 100, yPct: (yAt(v) / H) * 100 })}
                    className="cursor-pointer transition-all"
                  />
                ))}
              </>
            )}

            {/* X labels */}
            {visibleLabels.map((l, i) => l ? (
              <text key={i} x={xAt(i)} y={H - 14} textAnchor="middle" className="fill-slate-400 text-[9px] font-bold">{l}</text>
            ) : null)}

            {/* X-axis label */}
            <text x={PAD_L + innerW / 2} y={H - 1} textAnchor="middle" className="fill-slate-400 text-[9px] font-bold">
              {tf === '1h' ? 'Menit' : tf === '24h' ? 'Jam' : tf === '7d' ? 'Hari' : 'Tanggal'}
            </text>
          </svg>

          {/* Tooltip */}
          {hovered && hovered.i !== undefined && (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full bg-slate-900 text-white text-[10px] font-black rounded-xl px-3 py-2 shadow-lg"
              style={{ left: `${hovered.xPct}%`, top: `${hovered.yPct - 4}%` }}
            >
              <div className="opacity-70 font-bold text-[8px] uppercase">{cfg.labels[hovered.i]}</div>
              <div className="text-sm">{hovered.v} sesi</div>
            </div>
          )}
        </div>
      </div>

      {/* Donut: user distribution */}
      <div className="bg-white rounded-[28px] p-6 border border-slate-200 shadow-sm">
        <h3 className="text-sm font-black text-slate-950 uppercase tracking-wide flex items-center gap-2 mb-1">
          <Users size={16} className="text-indigo-600" /> Distribusi Pengguna
        </h3>
        <p className="text-[11px] font-semibold text-slate-400 mb-4">Proporsi akun aktif per peran.</p>

        <div className="flex items-center gap-6">
          <div
            className="relative w-[150px] h-[150px] shrink-0"
            onMouseLeave={() => setHovered(null)}
          >
            <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
              <circle cx="70" cy="70" r={R} fill="none" stroke="#f1f5f9" strokeWidth="14" />
              {donut.map((s, i) => (
                <circle
                  key={i} cx="70" cy="70" r={R} fill="none"
                  stroke={s.color} strokeWidth="14"
                  strokeDasharray={`${s.len} ${C - s.len}`}
                  strokeDashoffset={s.offset}
                  onMouseEnter={() => setHovered({ donut: s.label })}
                  className="cursor-pointer transition-all"
                  style={{ opacity: hovered?.donut && hovered.donut !== s.label ? 0.45 : 1 }}
                />
              ))}
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
              <span className="text-2xl font-black text-slate-900">{totalUsers}</span>
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider">Total</span>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-1 gap-2.5">
            {donut.map((s) => (
              <div key={s.label} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2 border border-slate-100">
                <span className="flex items-center gap-2 text-[11px] font-bold text-slate-600">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} /> {s.label}
                </span>
                <span className="text-sm font-black text-slate-900">{s.pct}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
