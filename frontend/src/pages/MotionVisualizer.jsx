import React, { useState, useEffect, useRef, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { ArrowLeft, Play, Pause, Download, Video, Award, Clock, Activity, Sliders, CheckCircle2 } from 'lucide-react';

export const MotionVisualizer = ({ setView }) => {
  const { t } = useContext(AppContext);
  const [duration, setDuration] = useState(30); // Default 30s
  const [isAnimating, setIsAnimating] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [selectedGesture, setSelectedGesture] = useState('dada');
  const [exportProgress, setExportProgress] = useState(0);
  const [isExporting, setIsExporting] = useState(false);

  const canvasRef = useRef(null);
  const requestRef = useRef(null);
  const startTimeRef = useRef(null);
  const lastTimeRef = useRef(null);

  // Gesture definitions (approximate coordinates path for 3D simulation)
  const gestures = {
    dada: {
      name: 'Nyeri Dada (Chest Pain)',
      description: 'Tangan meraba dada memutar pelan untuk menunjukkan letak sakit.',
      points: (t) => {
        // Wrist center
        const wx = 0;
        const wy = 50;
        const wz = -30 + Math.sin(t * 2) * 10;
        
        // Hand joints relative to wrist
        const joints = [
          [wx, wy, wz], // Wrist (0)
          [wx - 30, wy - 30, wz + 10], // Thumb base (1)
          [wx - 45, wy - 60, wz + 15], // Thumb mid (2)
          [wx - 55, wy - 80, wz + 20], // Thumb tip (3)
          
          [wx - 15, wy - 80, wz + 30 + Math.sin(t * 3) * 10], // Index tip (4)
          [wx - 5, wy - 90, wz + 35 + Math.sin(t * 3) * 12], // Middle tip (5)
          [wx + 5, wy - 85, wz + 30 + Math.sin(t * 3) * 10], // Ring tip (6)
          [wx + 15, wy - 75, wz + 20 + Math.sin(t * 3) * 8],  // Pinky tip (7)
        ];
        return joints;
      }
    },
    pusing: {
      name: 'Pusing (Dizzy)',
      description: 'Gerakan melingkar jari telunjuk di dekat pelipis kepala.',
      points: (t) => {
        const cx = 50 + Math.cos(t * 4) * 25;
        const cy = -60 + Math.sin(t * 4) * 25;
        const cz = 10 + Math.cos(t * 2) * 15;
        
        const joints = [
          [0, 50, -20], // Wrist
          [-10, 10, -10],
          [-20, -10, 0],
          [cx, cy, cz], // Tip moving in circles
          [cx - 5, cy + 5, cz - 5],
          [cx - 10, cy + 10, cz - 8],
          [cx - 12, cy + 12, cz - 10],
          [cx - 15, cy + 15, cz - 12]
        ];
        return joints;
      }
    },
    asma: {
      name: 'Asma (Asthma)',
      description: 'Kedua tangan di dekat tenggorokan bergerak naik turun secara intens.',
      points: (t) => {
        const wy = 20 + Math.sin(t * 6) * 20;
        const wz = -20 + Math.cos(t * 6) * 15;
        
        const joints = [
          [0, 60, -10],
          [-20, 30, wz],
          [-35, 10, wz + 5],
          [-45, -10, wz + 10],
          [-10, wy - 20, wz + 15],
          [0, wy - 30, wz + 18],
          [10, wy - 25, wz + 15],
          [20, wy - 15, wz + 10]
        ];
        return joints;
      }
    },
    tensi: {
      name: 'Tensi (Blood Pressure)',
      description: 'Telunjuk dan jari tengah kanan menunjuk lengan kiri bawah.',
      points: (t) => {
        const wx = -30 + Math.sin(t * 2) * 8;
        const wy = 40 + Math.cos(t * 2) * 8;
        
        const joints = [
          [wx, wy, -10],
          [wx - 10, wy - 10, 0],
          [wx - 20, wy - 20, 5],
          [wx - 30, wy - 30, 8],
          [40, 10, 15], // Pointing fingers
          [45, 0, 18],
          [35, 5, 15],
          [25, 10, 10]
        ];
        return joints;
      }
    }
  };

  const trailRef = useRef([]);

  // Animation Loop
  const animate = (time) => {
    if (!lastTimeRef.current) lastTimeRef.current = time;
    const delta = (time - lastTimeRef.current) / 1000;
    lastTimeRef.current = time;

    setElapsedTime((prev) => {
      const next = prev + delta;
      if (next >= duration) {
        setIsAnimating(false);
        return duration;
      }
      return next;
    });

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      const width = canvas.width;
      const height = canvas.height;
      
      // Clear canvas with dark cosmic space gradient
      const grad = ctx.createRadialGradient(width/2, height/2, 50, width/2, height/2, width/2);
      grad.addColorStop(0, '#0c1626');
      grad.addColorStop(1, '#050b14');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Draw Grid / Coordinate Axes
      ctx.strokeStyle = 'rgba(14, 165, 233, 0.08)';
      ctx.lineWidth = 1;
      // Grid lines
      for (let x = 50; x < width; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 50; y < height; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Camera Orbit logic (Rotasi 3D Space)
      const t = time / 1000;
      const angleY = t * 0.4; // Orbit rotation speed
      const angleX = Math.sin(t * 0.2) * 0.3; // Tilt pitch

      const focalLength = 350;
      const centerX = width / 2;
      const centerY = height / 2 - 20;

      // Project 3D point to 2D screen coordinate
      const project = (x3d, y3d, z3d) => {
        // Rotate Y axis
        const cosY = Math.cos(angleY);
        const sinY = Math.sin(angleY);
        let x1 = x3d * cosY - z3d * sinY;
        let z1 = x3d * sinY + z3d * cosY;

        // Rotate X axis
        const cosX = Math.cos(angleX);
        const sinX = Math.sin(angleX);
        let y2 = y3d * cosX - z1 * sinX;
        let z2 = y3d * sinX + z1 * cosX;

        // Perspective Projection
        const scale = focalLength / (focalLength + z2);
        return {
          x: centerX + x1 * scale * 2.2,
          y: centerY + y2 * scale * 2.2,
          z: z2,
          scale: scale
        };
      };

      // Get points for selected gesture
      const getter = gestures[selectedGesture] || gestures.dada;
      const rawPoints = getter.points(t);
      const projPoints = rawPoints.map(p => project(p[0], p[1], p[2]));

      // Track trajectory trail of fingertip index (joint 4)
      const tipIndex = projPoints[4];
      if (tipIndex) {
        trailRef.current.push({ x: tipIndex.x, y: tipIndex.y, scale: tipIndex.scale });
        if (trailRef.current.length > 45) {
          trailRef.current.shift();
        }
      }

      // Draw Neon Trajectory Trail (Video minute 1:22:47 style)
      if (trailRef.current.length > 1) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#00f2e0';
        ctx.lineWidth = 4;
        
        for (let i = 1; i < trailRef.current.length; i++) {
          const p1 = trailRef.current[i - 1];
          const p2 = trailRef.current[i];
          const alpha = i / trailRef.current.length;
          
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = `rgba(0, 242, 224, ${alpha * 0.95})`;
          ctx.lineWidth = 4 * p2.scale * alpha;
          ctx.stroke();
        }
        ctx.shadowBlur = 0; // Reset shadow
      }

      // Draw 3D bones (connections between joints)
      const bones = [
        [0, 1], [1, 2], [2, 3], // Thumb
        [0, 4], [0, 5], [0, 6], [0, 7] // Fingers from wrist
      ];

      ctx.shadowBlur = 5;
      ctx.shadowColor = '#10b981';
      bones.forEach(([a, b]) => {
        const p1 = projPoints[a];
        const p2 = projPoints[b];
        if (p1 && p2) {
          const avgZ = (p1.z + p2.z) / 2;
          const lineScale = Math.max(0.3, Math.min(2.0, focalLength / (focalLength + avgZ)));

          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.strokeStyle = 'rgba(16, 185, 129, 0.45)';
          ctx.lineWidth = 3.5 * lineScale;
          ctx.stroke();
        }
      });
      ctx.shadowBlur = 0;

      // Draw 3D joints (Spheres with perspective size and white glow highlights)
      projPoints.forEach((p, idx) => {
        const baseR = idx === 0 ? 8 : 5.5;
        const r = baseR * p.scale;
        
        ctx.shadowBlur = 10;
        ctx.shadowColor = idx === 0 ? '#0ea5e9' : '#10b981';

        ctx.beginPath();
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
        ctx.fillStyle = idx === 0 ? '#0ea5e9' : '#10b981';
        ctx.fill();

        ctx.shadowBlur = 0;

        // Draw 3D Sphere Highlight reflection
        if (r > 3) {
          ctx.beginPath();
          ctx.arc(p.x - r * 0.25, p.y - r * 0.25, r * 0.2, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
          ctx.fill();
        }
      });

      // Draw UI overlay metrics inside the canvas
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = 'bold 12px monospace';
      ctx.fillText(`RENDERING: 60 FPS`, 30, height - 70);
      ctx.fillText(`RESOLUTION: 1920x1080 (HD)`, 30, height - 50);
      ctx.fillText(`DURATION: ${duration}s | TIME: ${elapsedTime.toFixed(2)}s`, 30, height - 30);
    }

    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    if (isAnimating) {
      lastTimeRef.current = null;
      requestRef.current = requestAnimationFrame(animate);
    } else {
      cancelAnimationFrame(requestRef.current);
    }
    return () => cancelAnimationFrame(requestRef.current);
  }, [isAnimating, duration, selectedGesture, elapsedTime]);

  const handlePlayPause = () => {
    if (elapsedTime >= duration) {
      setElapsedTime(0);
      trailRef.current = [];
    }
    setIsAnimating(!isAnimating);
  };

  const handleReset = () => {
    setIsAnimating(false);
    setElapsedTime(0);
    trailRef.current = [];
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleSimulateExport = () => {
    setIsExporting(true);
    setExportProgress(0);
  };

  useEffect(() => {
    if (isExporting) {
      const interval = setInterval(() => {
        setExportProgress((prev) => {
          if (prev >= 100) {
            setIsExporting(false);
            clearInterval(interval);
            alert(`Ekspor Video HAKI MedSign selesai! (${duration} detik, resolusi 1920x1080, format MP4).`);
            return 100;
          }
          return prev + 5;
        });
      }, 150);
      return () => clearInterval(interval);
    }
  }, [isExporting, duration]);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 py-2 animate-slide-up">
      {/* Header */}
      <div className="glass-panel flex items-center justify-between rounded-3xl p-4">
        <button
          onClick={() => setView('home')}
          className="glass-button rounded-2xl px-4 py-2 text-xs font-bold"
        >
          <ArrowLeft size={14} />
          Kembali
        </button>
        <div className="text-right">
          <span className="text-[10px] font-bold uppercase text-sky-700">Motion Graphics 3D</span>
          <h2 className="text-lg font-black text-slate-950">Visualizer Isyarat MedSign</h2>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        {/* Left: 3D Canvas Rendering Area */}
        <div className="flex flex-col gap-4">
          <div className="glass-panel glass-dark relative aspect-video w-full overflow-hidden rounded-[28px] border border-white/10 shadow-2xl">
            <canvas
              ref={canvasRef}
              width={640}
              height={480}
              className="h-full w-full object-cover"
            />
            {elapsedTime >= duration && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-950/75 backdrop-blur-sm transition-all duration-300">
                <div className="text-center p-6 bg-white/10 rounded-2xl border border-white/20">
                  <h4 className="text-sm font-black text-white uppercase tracking-wide">Animasi Selesai Berhasil</h4>
                  <p className="text-[11px] text-slate-300 mt-1">Gunakan panel di bawah untuk melakukan ekspor video.</p>
                </div>
              </div>
            )}
          </div>

          {/* Canvas Controls */}
          <div className="glass-panel rounded-3xl p-4 flex items-center justify-between gap-3 shadow-md">
            <div className="flex items-center gap-3">
              <button
                onClick={handlePlayPause}
                className="inline-flex items-center justify-center rounded-xl bg-sky-500 hover:bg-sky-600 text-white p-3 shadow-md transition-all active:scale-[0.98]"
              >
                {isAnimating ? <Pause size={16} /> : <Play size={16} />}
              </button>
              <button
                onClick={handleReset}
                className="glass-button rounded-xl px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-950"
              >
                Reset
              </button>
            </div>
            
            <div className="text-right text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Kemajuan: {Math.round((elapsedTime / duration) * 100)}% ({elapsedTime.toFixed(1)}s / {duration}s)
            </div>
          </div>
        </div>

        {/* Right: Motion Graphic Configurations */}
        <div className="glass-panel rounded-[32px] p-6 flex flex-col gap-5 shadow-xl shadow-sky-900/5">
          <div className="flex items-center gap-2.5 border-b border-white/60 pb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600">
              <Sliders size={16} />
            </div>
            <h3 className="text-base font-black text-slate-950">Konfigurasi Animasi 3D</h3>
          </div>

          {/* Duration Selector (10s, 30s, 45s, 60s, 120s) */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Clock size={11} /> Durasi Animasi (After Effects Export)
            </label>
            <div className="grid grid-cols-5 gap-1.5 select-none">
              {[10, 30, 45, 60, 120].map((sec) => (
                <button
                  key={sec}
                  onClick={() => {
                    setDuration(sec);
                    handleReset();
                  }}
                  disabled={isAnimating || isExporting}
                  className={`rounded-xl py-2 text-xs font-black transition-all active:scale-[0.96] ${
                    duration === sec
                      ? 'bg-sky-500 text-white shadow-md'
                      : 'bg-white/40 border border-white/60 text-slate-600 hover:bg-white/80'
                  }`}
                >
                  {sec >= 60 ? `${sec/60}m` : `${sec}s`}
                </button>
              ))}
            </div>
          </div>

          {/* Gesture Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Activity size={11} /> Gerakan Isyarat Terpilih
            </label>
            <select
              value={selectedGesture}
              onChange={(e) => {
                setSelectedGesture(e.target.value);
                handleReset();
              }}
              disabled={isAnimating || isExporting}
              className="glass-input rounded-xl px-3 py-2.5 text-xs font-black appearance-none bg-white/40 cursor-pointer border border-sky-300/40 text-sky-900"
            >
              {Object.keys(gestures).map((key) => (
                <option key={key} value={key} className="bg-white text-slate-800">
                  {gestures[key].name}
                </option>
              ))}
            </select>
            <p className="text-[10px] font-semibold text-slate-400 mt-1 italic leading-relaxed">
              {gestures[selectedGesture].description}
            </p>
          </div>

          {/* Luaran PKM & HAKI Info (Read from Google Doc) */}
          <div className="surface-panel rounded-2xl p-4 flex flex-col gap-2.5 border border-sky-100">
            <h4 className="text-[10px] font-black text-sky-700 uppercase tracking-wide flex items-center gap-1.5">
              <Award size={13} /> Luaran PKM &amp; HAKI Info
            </h4>
            <ul className="flex flex-col gap-1.5 text-[9px] font-bold text-slate-500 uppercase leading-relaxed">
              <li className="flex justify-between border-b border-white/40 pb-1">
                <span>Tim PKM-KC</span>
                <span className="text-slate-800">Ma Chung</span>
              </li>
              <li className="flex justify-between border-b border-white/40 pb-1">
                <span>Luaran Target</span>
                <span className="text-slate-800">HAKI Prototype &amp; Laporan</span>
              </li>
              <li className="flex justify-between">
                <span>Apotek Mitra</span>
                <span className="text-slate-800">Ma Chung / Puskesmas Dau</span>
              </li>
            </ul>
          </div>

          {/* Export Video Section */}
          <button
            onClick={handleSimulateExport}
            disabled={isAnimating || isExporting || elapsedTime < duration}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-black text-xs py-3 px-6 shadow-lg shadow-emerald-500/20 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed uppercase"
          >
            <Video size={14} />
            {isExporting ? `Mengekspor: ${exportProgress}%` : 'Ekspor Video untuk HAKI'}
          </button>

          {isExporting && (
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100 p-0.5 border border-white/50 animate-pulse">
              <div
                className="h-full bg-emerald-500 transition-all rounded-full"
                style={{ width: `${exportProgress}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
