import { useEffect, useRef, useState } from 'react';

export const useMediaPipe = (isActive, videoRef) => {
  const canvasRef = useRef(null);
  const [isHandDetected, setIsHandDetected] = useState(false);
  const [landmarks, setLandmarks] = useState(null);
  const [fps, setFps] = useState(0);
  const animationFrameId = useRef(null);
  const lastTimeRef = useRef(0);
  
  const handDataRef = useRef(null);
  const lastHandTimeRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas when inactive
    if (!isActive) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setIsHandDetected(false);
      setLandmarks(null);
      setFps(0);
      return;
    }

    // 1. Initialize MediaPipe Hands dynamically with polling to handle loading race conditions
    let hands = null;
    let isCleanedUp = false;

    const initializeMediaPipe = () => {
      if (isCleanedUp) return;

      if (!window.Hands) {
        // Retry in 150ms if scripts are still loading
        setTimeout(initializeMediaPipe, 150);
        return;
      }

      try {
        hands = new window.Hands({
          locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
        });

        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        hands.onResults((results) => {
          if (isCleanedUp) return;
          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            handDataRef.current = results.multiHandLandmarks;
            lastHandTimeRef.current = Date.now();
            
            // Pass normalized landmarks to parent for predictions (take first hand as primary)
            setLandmarks(results.multiHandLandmarks[0]);
            setIsHandDetected(true);
          } else {
            // If no hand is returned
            handDataRef.current = null;
            setIsHandDetected(false);
            setLandmarks(null);
          }
        });
      } catch (err) {
        console.error('Error initializing MediaPipe Hands:', err);
      }
    };

    initializeMediaPipe();

    // 2. High-speed drawing loop (60 FPS)
    const drawLoop = async (timestamp) => {
      // Calculate FPS
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp;
      }
      const delta = timestamp - lastTimeRef.current;
      if (delta > 0) {
        const currentFps = Math.round(1000 / delta);
        setFps(currentFps);
      }
      lastTimeRef.current = timestamp;

      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        // A. Draw video frame
        ctx.save();
        ctx.globalAlpha = 0.95;
        ctx.drawImage(videoRef.current, 0, 0, width, height);
        ctx.restore();

        // Scanline overlay
        ctx.fillStyle = 'rgba(14, 165, 233, 0.02)';
        for (let y = 0; y < height; y += 4) {
          ctx.fillRect(0, y, width, 1);
        }

        // B. Send frame to MediaPipe Hands if it is not busy
        // To avoid overloading, we can send frames sequentially
        if (hands && !hands.busy) {
          hands.busy = true;
          hands.send({ image: videoRef.current }).finally(() => {
            hands.busy = false;
          });
        }

        // C. Check if we have hand data and it is fresh (within 300ms)
        const isFresh = Date.now() - lastHandTimeRef.current < 300;
        if (handDataRef.current && handDataRef.current.length > 0 && isFresh) {
          const allHands = handDataRef.current;

          allHands.forEach((lms, handIdx) => {
            // Draw connections for each hand
            // First hand is emerald green (#10b981), second hand is vibrant purple (#a855f7)
            ctx.strokeStyle = handIdx === 0 ? '#10b981' : '#a855f7';
            ctx.lineWidth = 3;
            const connections = [
              [0,1],[1,2],[2,3],[3,4],
              [0,5],[5,6],[6,7],[7,8],
              [0,9],[9,10],[10,11],[11,12],
              [0,13],[13,14],[14,15],[15,16],
              [0,17],[17,18],[18,19],[19,20],
              [5,9],[9,13],[13,17]
            ];
            
            connections.forEach(([a, b]) => {
              if (lms[a] && lms[b]) {
                ctx.beginPath();
                ctx.moveTo(lms[a].x * width, lms[a].y * height);
                ctx.lineTo(lms[b].x * width, lms[b].y * height);
                ctx.stroke();
              }
            });

            // Draw joint points
            lms.forEach((p, idx) => {
              const r = idx === 0 ? 6 : 4.5;
              ctx.beginPath();
              ctx.arc(p.x * width, p.y * height, r, 0, Math.PI * 2);
              ctx.fillStyle = idx === 0 
                ? (handIdx === 0 ? '#0ea5e9' : '#c084fc')
                : (handIdx === 0 ? '#38bdf8' : '#e9d5ff'); // Blue-cyan for hand 1, light purple for hand 2
              ctx.fill();
            });
          });

          // Draw scanning target rectangle
          ctx.strokeStyle = 'rgba(14, 165, 233, 0.4)';
          ctx.lineWidth = 1;
          ctx.setLineDash([5, 5]);
          ctx.strokeRect(width * 0.15, height * 0.1, width * 0.7, height * 0.8);
          ctx.setLineDash([]);

          // Draw 'TANGAN TERDETEKSI' Badge with hand count
          ctx.fillStyle = 'rgba(16, 185, 129, 0.2)';
          ctx.strokeStyle = '#10b981';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(16, 16, 150, 26, 6);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#34d399';
          ctx.font = 'bold 9px sans-serif';
          ctx.fillText(`● ${allHands.length} TANGAN TERDETEKSI ✓`, 26, 32);
        } else {
          // If no hand detected
          // Draw 'MENUNGGU TANGAN...' Badge
          ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
          ctx.strokeStyle = '#f59e0b';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(16, 16, 140, 26, 6);
          ctx.fill();
          ctx.stroke();

          ctx.fillStyle = '#fbbf24';
          ctx.font = 'bold 9px sans-serif';
          ctx.fillText('○ MENUNGGU TANGAN...', 26, 32);
        }
      } else {
        // Loading state
        ctx.fillStyle = '#020b14';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '13px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Memulai kamera, silakan tunggu...', width / 2, height / 2);
      }

      animationFrameId.current = requestAnimationFrame(drawLoop);
    };

    animationFrameId.current = requestAnimationFrame(drawLoop);
    
    return () => {
      cancelAnimationFrame(animationFrameId.current);
      isCleanedUp = true;
      try {
        if (hands) {
          hands.close();
        }
      } catch (e) {
        console.warn('Error closing hands instance:', e);
      }
    };
  }, [isActive, videoRef]);

  return {
    canvasRef,
    isHandDetected,
    landmarks,
    fps
  };
};
