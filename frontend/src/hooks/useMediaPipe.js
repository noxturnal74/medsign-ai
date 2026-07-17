import { useEffect, useRef, useState, useCallback } from 'react';

export const useMediaPipe = (isActive, videoElement) => {
  const [canvasElement, setCanvasElement] = useState(null);
  const canvasRef = useCallback((node) => {
    setCanvasElement(node);
  }, []);
  const [isHandDetected, setIsHandDetected] = useState(false);
  const [landmarks, setLandmarks] = useState(null);
  const [fps, setFps] = useState(0);
  const [lux, setLux] = useState(0);
  
  const animationFrameId = useRef(null);
  const lastTimeRef = useRef(0);
  const handDataRef = useRef(null);
  const lastHandTimeRef = useRef(0);
  
  // Performance optimization refs
  const lastProcessedTimeRef = useRef(0);
  const fpsFrameCountRef = useRef(0);
  const lastFpsUpdateRef = useRef(0);
  const lastLuxUpdateRef = useRef(0);

  useEffect(() => {
    if (!canvasElement) return;
    const canvas = canvasElement;
    const ctx = canvas.getContext('2d');
    
    // Clear canvas when inactive
    if (!isActive) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setIsHandDetected(false);
      setLandmarks(null);
      setFps(0);
      return;
    }

    // Create an offscreen canvas for scaling down MediaPipe input & Lux calculation
    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = 320;
    offscreenCanvas.height = 240;
    const offscreenCtx = offscreenCanvas.getContext('2d');

    // 1. Initialize MediaPipe Hands dari file lokal di /mediapipe/ (public/)
    //    Package @mediapipe/hands adalah UMD/CommonJS, bukan ES module sejati,
    //    sehingga import { Hands } gagal dan crash seluruh React app.
    //    Solusi: load via <script> di index.html → window.Hands tersedia secara global.
    let hands = null;
    let isCleanedUp = false;

    const initializeMediaPipe = () => {
      if (isCleanedUp) return;

      if (!window.Hands) {
        // Retry setiap 150ms sampai script selesai dimuat
        setTimeout(initializeMediaPipe, 150);
        return;
      }

      try {
        hands = new window.Hands({
          // Arahkan ke file WASM/model lokal di public/mediapipe/
          locateFile: (file) => `/mediapipe/${file}`
        });

        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 0, // Lite model: much faster and less CPU/GPU intensive
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        hands.onResults((results) => {
          if (isCleanedUp) return;
          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            let filteredLandmarks = [...results.multiHandLandmarks];
            let filteredHandedness = results.multiHandedness ? [...results.multiHandedness] : [];

            // Filter out duplicate/overlapping hand detections (same physical hand detected twice)
            if (filteredLandmarks.length === 2) {
              const h1_wrist = filteredLandmarks[0][0];
              const h2_wrist = filteredLandmarks[1][0];
              const h1_mcp = filteredLandmarks[0][9];
              const h2_mcp = filteredLandmarks[1][9];
              
              if (h1_wrist && h2_wrist && h1_mcp && h2_mcp) {
                const distWrist = Math.sqrt(
                  Math.pow(h1_wrist.x - h2_wrist.x, 2) +
                  Math.pow(h1_wrist.y - h2_wrist.y, 2)
                );
                const distMcp = Math.sqrt(
                  Math.pow(h1_mcp.x - h2_mcp.x, 2) +
                  Math.pow(h1_mcp.y - h2_mcp.y, 2)
                );
                
                // If both wrists and middle finger MCPs are extremely close (less than 8% screen size),
                // it is highly likely a single hand detected twice.
                if (distWrist < 0.08 && distMcp < 0.08) {
                  const score1 = filteredHandedness[0]?.score || 0;
                  const score2 = filteredHandedness[1]?.score || 0;
                  
                  // Keep only the detection with the higher confidence score
                  if (score2 > score1) {
                    filteredLandmarks = [filteredLandmarks[1]];
                    filteredHandedness = [filteredHandedness[1]];
                  } else {
                    filteredLandmarks = [filteredLandmarks[0]];
                    filteredHandedness = [filteredHandedness[0]];
                  }
                }
              }
            }

            handDataRef.current = {
              landmarks: filteredLandmarks,
              handedness: filteredHandedness
            };
            lastHandTimeRef.current = Date.now();
            
            // Pass normalized landmarks to parent for predictions (take first hand as primary)
            setLandmarks(filteredLandmarks[0]);
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
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Render camera feed
      if (videoElement && videoElement.readyState === videoElement.HAVE_ENOUGH_DATA) {
        // A. Draw video frame
        ctx.save();
        ctx.globalAlpha = 0.95;
        ctx.drawImage(videoElement, 0, 0, width, height);
        ctx.restore();

        // Populate offscreen canvas for MediaPipe and Lux analysis
        offscreenCtx.drawImage(videoElement, 0, 0, offscreenCanvas.width, offscreenCanvas.height);

        const now = Date.now();

        // Calculate and throttle FPS state update to once every 1000ms
        fpsFrameCountRef.current++;
        if (now - lastFpsUpdateRef.current >= 1000) {
          const elapsed = now - lastFpsUpdateRef.current;
          const currentFps = Math.round((fpsFrameCountRef.current * 1000) / elapsed);
          setFps(currentFps);
          fpsFrameCountRef.current = 0;
          lastFpsUpdateRef.current = now;
        }

        // Calculate and throttle Lux state update to once every 1000ms
        // Read a tiny 20x20 pixel area from the center of offscreen canvas to prevent GPU pipeline stall
        if (now - lastLuxUpdateRef.current >= 1000) {
          lastLuxUpdateRef.current = now;
          try {
            const imgData = offscreenCtx.getImageData(150, 110, 20, 20);
            const data = imgData.data;
            let colorSum = 0;
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              colorSum += (r * 0.299 + g * 0.587 + b * 0.114);
            }
            const avgBrightness = Math.round(colorSum / (data.length / 4));
            setLux(Math.round(avgBrightness * 1.8)); // Map to realistic Lux values
          } catch (e) {
            // Ignored
          }
        }

        // Scanline overlay
        ctx.fillStyle = 'rgba(14, 165, 233, 0.02)';
        for (let y = 0; y < height; y += 4) {
          ctx.fillRect(0, y, width, 1);
        }

        // B. Send frame to MediaPipe Hands if it is not busy
        // To avoid overloading, we scale down the frame and throttle sending to max ~30 FPS (every 33ms)
        if (hands && !hands.busy && (now - lastProcessedTimeRef.current >= 33)) {
          hands.busy = true;
          lastProcessedTimeRef.current = now;
          hands.send({ image: offscreenCanvas }).finally(() => {
            hands.busy = false;
          });
        }

        // C. Check if we have hand data and it is fresh (within 300ms)
        const isFresh = now - lastHandTimeRef.current < 300;
        if (handDataRef.current && handDataRef.current.landmarks && isFresh) {
          const allHands = handDataRef.current.landmarks;
          const handedness = handDataRef.current.handedness;

          allHands.forEach((lms, handIdx) => {
            const handLabel = handedness && handedness[handIdx] ? handedness[handIdx].label : 'Unknown';
            const handText = handLabel === 'Left' ? 'Kanan' : (handLabel === 'Right' ? 'Kiri' : 'Kiri');

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

            // Draw left/right text tag
            if (lms[9]) {
              ctx.fillStyle = '#ffffff';
              ctx.font = 'bold 11px sans-serif';
              ctx.fillText(handText, lms[9].x * width - 15, lms[9].y * height - 12);
            }
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
          ctx.fillText('● ' + allHands.length + ' TANGAN TERDETEKSI ✓', 26, 32);
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
  }, [isActive, videoElement, canvasElement]);

  return {
    canvasRef,
    isHandDetected,
    landmarks,
    fps,
    lux
  };
};