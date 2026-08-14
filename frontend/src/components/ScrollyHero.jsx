import React, { useEffect, useRef, useState, useCallback } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion, AnimatePresence } from 'framer-motion';

gsap.registerPlugin(ScrollTrigger);

const TOTAL_FRAMES = 50;
const frameUrl = (i) =>
  `/Homepage/ezgif-frame-${String(i + 1).padStart(3, '0')}.png`;

const SECTIONS = [
  {
    id: 0,
    progressStart: 0.0,
    progressEnd: 0.20,
    align: 'center',
    chip: 'MedSign AI · BISINDO Healthcare',
    headline: 'Suara untuk\nMereka yang Diam',
    body: 'Sistem penerjemah bahasa isyarat BISINDO berbasis AI\nuntuk komunikasi medis yang inklusif dan nyata.',
    cta: false,
  },
  {
    id: 1,
    progressStart: 0.40,
    progressEnd: 0.55,
    align: 'left',
    chip: 'Teknologi Real-Time',
    headline: '21 Titik\nLandmark Tangan',
    body: 'MediaPipe membaca koordinat sendi jari secara real-time.\nTanpa lag. Tanpa kabel tambahan.',
    cta: false,
  },
  {
    id: 2,
    progressStart: 0.70,
    progressEnd: 0.85,
    align: 'right',
    chip: 'Inferensi AI',
    headline: 'Model Neural\nKhusus Klinis',
    body: 'GRU/LSTM dilatih pada kosakata medis BISINDO.\nDiagnosa, gejala, dan respons darurat.',
    cta: false,
  },
  {
    id: 3,
    progressStart: 0.95,
    progressEnd: 1.0,
    align: 'center',
    chip: 'Mulai Sekarang',
    headline: 'Komunikasi\nTanpa Batas',
    body: 'Isyarat diterjemahkan. Dokter memahami. Pasien didengar.',
    cta: true,
  },
];

export function ScrollyHero({ setView }) {
  const containerRef = useRef(null);
  const currentSectionRef = useRef(0);
  const isLockedRef = useRef(false);
  const canvasRef    = useRef(null);
  const imagesRef    = useRef([]);
  const frameProxy   = useRef({ value: 0 }); // GSAP animates this

  const [loaded, setLoaded]               = useState(false);
  const [loadProgress, setLoadProgress]   = useState(0);
  const [activeSectionIdx, setActiveSectionIdx] = useState(0);
  const [textVisible, setTextVisible]     = useState(true);
  const [scrollPct, setScrollPct]         = useState(0);

  // ── Draw frame ──────────────────────────────────────────────────
  const drawFrame = useCallback((idx) => {
    const canvas = canvasRef.current;
    const img    = imagesRef.current[Math.min(Math.max(Math.round(idx), 0), TOTAL_FRAMES - 1)];
    if (!canvas || !img?.complete || img.naturalWidth === 0) return;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    // cover: fill entire canvas, crop overflow (no bars)
    const scale = Math.max(width / img.naturalWidth, height / img.naturalHeight);
    const dw = img.naturalWidth  * scale;
    const dh = img.naturalHeight * scale;
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(img, (width - dw) / 2, (height - dh) / 2, dw, dh);
  }, []);

  // ── Preload frames ──────────────────────────────────────────────
  useEffect(() => {
    let mounted = true;
    let done = 0;
    const imgs = Array.from({ length: TOTAL_FRAMES }, (_, i) => {
      const img = new Image();
      img.src = frameUrl(i);
      img.onload = img.onerror = () => {
        done++;
        if (!mounted) return;
        setLoadProgress(Math.round((done / TOTAL_FRAMES) * 100));
        if (done === TOTAL_FRAMES) setLoaded(true);
      };
      return img;
    });
    imagesRef.current = imgs;
    return () => { mounted = false; };
  }, []);

  // ── Resize canvas — follow container, not window (phone-mode safe) ──
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const resize = () => {
      // Use container dimensions so phone-mode (430px) is respected
      canvas.width  = container.clientWidth;
      canvas.height = window.innerHeight;
      drawFrame(frameProxy.current.value);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);
    return () => ro.disconnect();
  }, [drawFrame]);

  // Draw frame 0 once loaded
  useEffect(() => {
    if (loaded) drawFrame(0);
  }, [loaded, drawFrame]);

  // ── GSAP ScrollTrigger: pin + scrub ────────────────────────────
  // Key: pin:true on the container → page stays pinned until all
  // frames are exhausted, THEN scroll continues to sections below.
  useEffect(() => {
    if (!loaded) return;

    const handleWheel = (e) => {
      if (isLockedRef.current) {
        e.preventDefault();
      }
    };
    const handleTouchMove = (e) => {
      if (isLockedRef.current) {
        e.preventDefault();
      }
    };
    const handleKeyDown = (e) => {
      if (isLockedRef.current) {
        const keys = ['ArrowUp', 'ArrowDown', 'Space', 'PageUp', 'PageDown', 'Home', 'End'];
        if (keys.includes(e.key)) {
          e.preventDefault();
        }
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('keydown', handleKeyDown, { passive: false });

    // Target progress for snapping centers
    const targetProgresses = [0.0, 0.475, 0.775, 0.975];

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger:  containerRef.current,
        start:    'top top',
        end:      '+=300%',
        onUpdate(self) {
          const p = self.progress;
          setScrollPct(p);

          // State-machine transition detection
          const currentIdx = currentSectionRef.current;
          let nextIdx = currentIdx;

          if (currentIdx === 0) {
            if (p > 0.25) nextIdx = 1;
          } else if (currentIdx === 1) {
            if (p < 0.22) nextIdx = 0;
            else if (p > 0.62) nextIdx = 2;
          } else if (currentIdx === 2) {
            if (p < 0.62) nextIdx = 1;
            else if (p > 0.90) nextIdx = 3;
          } else if (currentIdx === 3) {
            if (p < 0.90) nextIdx = 2;
          }

          if (nextIdx !== currentIdx && !isLockedRef.current) {
            isLockedRef.current = true;
            currentSectionRef.current = nextIdx;
            if (window.lenis) window.lenis.stop();

            const targetProgress = targetProgresses[nextIdx];
            const targetScroll = self.start + targetProgress * (self.end - self.start);

            // Animate scroll to target position
            const obj = { y: window.scrollY };
            gsap.to(obj, {
              y: targetScroll,
              duration: 0.7,
              ease: 'power2.out',
              overwrite: 'auto',
              onUpdate: () => {
                window.scrollTo(0, obj.y);
              },
              onComplete: () => {
                // Keep scroll locked for 800ms
                setTimeout(() => {
                  isLockedRef.current = false;
                  if (window.lenis) window.lenis.start();
                }, 800);
              }
            });
          }

          // Determine active section
          let found = -1;
          SECTIONS.forEach((s, i) => {
            if (p >= s.progressStart && p <= s.progressEnd) found = i;
          });

          if (found !== -1) {
            setActiveSectionIdx(prev => {
              if (found !== prev) {
                setTextVisible(false);
                setTimeout(() => {
                  setActiveSectionIdx(found);
                  setTextVisible(true);
                }, 220);
                return prev;
              }
              return prev;
            });
            setTextVisible(v => (!v ? true : v));
          } else {
            setTextVisible(false);
          }

          // Target frame based on progress
          let targetFrame = 0;
          if (p <= 0.20) {
            targetFrame = 0;
          } else if (p <= 0.40) {
            const t = (p - 0.20) / 0.20;
            targetFrame = t * 16;
          } else if (p <= 0.55) {
            targetFrame = 16;
          } else if (p <= 0.70) {
            const t = (p - 0.55) / 0.15;
            targetFrame = 16 + t * 16;
          } else if (p <= 0.85) {
            targetFrame = 32;
          } else if (p <= 0.95) {
            const t = (p - 0.85) / 0.10;
            targetFrame = 32 + t * 17;
          } else {
            targetFrame = 49;
          }

          // Smoothly animate frameProxy to targetFrame
          gsap.to(frameProxy.current, {
            value: targetFrame,
            duration: 0.5,
            overwrite: 'auto',
            ease: 'power1.out',
            onUpdate() {
              drawFrame(frameProxy.current.value);
            }
          });
        },
      });
    }, containerRef);

    return () => {
      ctx.revert();
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [loaded, drawFrame]);

  const section = SECTIONS[activeSectionIdx] ?? SECTIONS[0];

  const alignClass =
    section.align === 'left'
      ? 'items-start pl-8 md:pl-16 lg:pl-28 text-left'
      : section.align === 'right'
      ? 'items-end pr-8 md:pr-16 lg:pr-28 text-right'
      : 'items-center text-center';

  const slideVariants = {
    hidden: {
      opacity: 0,
      x: section.align === 'left' ? -36 : section.align === 'right' ? 36 : 0,
      y: section.align === 'center' ? 22 : 0,
    },
    visible: {
      opacity: 1, x: 0, y: 0,
      transition: { duration: 0.65, ease: [0.16, 1, 0.3, 1] },
    },
    exit: {
      opacity: 0,
      transition: { duration: 0.22, ease: 'easeIn' },
    },
  };

  return (
    // 400vh scroll runway — canvas sticks via CSS, no GSAP pin (avoids spacer gap)
    <div ref={containerRef} style={{ position: 'relative', height: '500vh' }}>

      {/* ── Canvas viewport: CSS sticky so it stays while parent scrolls ── */}
      <div style={{
        position: 'sticky',
        top: 0,
        height: '100vh',
        width: '100%',
        overflow: 'hidden',
        background: '#f8fafc',
        zIndex: 10,
      }}>
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', inset: 0, display: 'block' }}
        />

        {/* Subtle vignette — light mode: fades edges to page bg */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(248,250,252,0.55) 100%)',
        }} />

        {/* Bottom fade — blends into white sections below */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0,
          height: 160, pointerEvents: 'none',
          background: 'linear-gradient(to bottom, transparent, #f8fafc 100%)',
        }} />

        {/* ── Loading overlay ─────────────────────────── */}
        <AnimatePresence>
          {!loaded && (
            <motion.div
              key="loader"
              initial={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.7 } }}
              style={{
                position: 'absolute', inset: 0, zIndex: 60,
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                background: '#f8fafc', gap: 24,
              }}
            >
              <svg width="64" height="64" viewBox="0 0 64 64">
                <circle cx="32" cy="32" r="26" fill="none" stroke="rgba(15,23,42,0.08)" strokeWidth="4" />
                <circle
                  cx="32" cy="32" r="26" fill="none"
                  stroke="url(#lg)" strokeWidth="4" strokeLinecap="round"
                  strokeDasharray={`${loadProgress * 1.634} 163.4`}
                  transform="rotate(-90 32 32)"
                  style={{ transition: 'stroke-dasharray 0.12s ease' }}
                />
                <defs>
                  <linearGradient id="lg" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#0ea5e9" />
                    <stop offset="100%" stopColor="#0d9488" />
                  </linearGradient>
                </defs>
              </svg>
              <div style={{ textAlign: 'center' }}>
                <p style={{ color: 'rgba(15,23,42,0.4)', fontSize: 10, fontWeight: 900, letterSpacing: '0.24em', textTransform: 'uppercase', marginBottom: 10 }}>
                  Memuat {loadProgress}%
                </p>
                <div style={{ width: 180, height: 2, background: 'rgba(15,23,42,0.08)', borderRadius: 999, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${loadProgress}%`, background: 'linear-gradient(to right,#0ea5e9,#0d9488)', transition: 'width 0.12s ease' }} />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Cinematic text overlay (dark text on light bg) ── */}
        <AnimatePresence mode="wait">
          {loaded && textVisible && (
            <motion.div
              key={section.id}
              variants={slideVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              style={{
                position: 'absolute', inset: 0, zIndex: 20,
                display: 'flex', flexDirection: 'column', justifyContent: 'center',
                pointerEvents: 'none',
              }}
              className={`flex ${alignClass}`}
            >
              <div style={{ maxWidth: 540, pointerEvents: 'auto' }}>

                {/* Chip */}
                <motion.span
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: 0.08, duration: 0.45 } }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    marginBottom: 18, padding: '5px 14px', borderRadius: 999,
                    border: '1px solid rgba(14,165,233,0.3)',
                    background: 'rgba(14,165,233,0.08)',
                    color: '#0369a1', fontSize: 10, fontWeight: 900,
                    letterSpacing: '0.2em', textTransform: 'uppercase',
                    backdropFilter: 'blur(8px)',
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0ea5e9', animation: 'pulse 2s infinite' }} />
                  {section.chip}
                </motion.span>

                {/* Headline — dark on light */}
                <motion.h2
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: 0.14, duration: 0.6 } }}
                  style={{
                    fontSize: 'clamp(2.2rem, 5.5vw, 3.9rem)',
                    fontWeight: 900, color: '#0f172a',
                    lineHeight: 1.08, letterSpacing: '-0.025em',
                    marginBottom: 18, whiteSpace: 'pre-line',
                    textShadow: '0 1px 2px rgba(255,255,255,0.95), 0 2px 10px rgba(255,255,255,0.85), 0 0 20px rgba(255,255,255,0.5)',
                  }}
                >
                  {section.headline}
                </motion.h2>

                {/* Body */}
                <motion.p
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0, transition: { delay: 0.22, duration: 0.55 } }}
                  style={{
                    fontSize: 'clamp(0.88rem, 1.6vw, 1.05rem)',
                    fontWeight: 600, color: '#334155',
                    lineHeight: 1.65, whiteSpace: 'pre-line',
                    marginBottom: section.cta ? 28 : 0,
                    textShadow: '0 1px 2px rgba(255,255,255,0.95), 0 2px 8px rgba(255,255,255,0.8)',
                  }}
                >
                  {section.body}
                </motion.p>

                {/* CTA — last section only */}
                {section.cta && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: 0.32, duration: 0.5 } }}
                    style={{
                      display: 'flex', flexWrap: 'wrap', gap: 12,
                      justifyContent: section.align === 'center' ? 'center' : 'flex-start',
                    }}
                  >
                    <button
                      onClick={() => setView('patient')}
                      style={{
                        padding: '13px 30px', borderRadius: 14, border: 'none',
                        background: 'linear-gradient(135deg,#0ea5e9,#0d9488)',
                        color: '#fff', fontWeight: 900, fontSize: 11,
                        letterSpacing: '0.12em', textTransform: 'uppercase',
                        cursor: 'pointer', boxShadow: '0 8px 32px rgba(14,165,233,0.35)',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 14px 42px rgba(14,165,233,0.5)'; }}
                      onMouseLeave={e => { e.currentTarget.style.transform = ''; e.currentTarget.style.boxShadow = '0 8px 32px rgba(14,165,233,0.35)'; }}
                    >
                      Coba Sekarang
                    </button>
                    <button
                      onClick={() => setView('doctor')}
                      style={{
                        padding: '13px 30px', borderRadius: 14,
                        background: 'rgba(15,23,42,0.07)',
                        color: '#0f172a', fontWeight: 900, fontSize: 11,
                        letterSpacing: '0.12em', textTransform: 'uppercase',
                        border: '1px solid rgba(15,23,42,0.15)', cursor: 'pointer',
                        transition: 'background 0.2s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(15,23,42,0.12)'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'rgba(15,23,42,0.07)'; }}
                    >
                      Mode Dokter
                    </button>
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Scroll progress bar ───────────────────────── */}
        {loaded && (
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: 'rgba(15,23,42,0.06)', zIndex: 30 }}>
            <div style={{
              height: '100%',
              width: `${scrollPct * 100}%`,
              background: 'linear-gradient(to right,#0ea5e9,#0d9488)',
              transition: 'width 0.05s linear',
            }} />
          </div>
        )}
      </div>
    </div>
  );
}
