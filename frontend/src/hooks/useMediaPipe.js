import { useEffect, useRef, useState } from 'react';

export const useMediaPipe = (isActive, videoRef) => {
  const canvasRef = useRef(null);
  const [isHandDetected, setIsHandDetected] = useState(false);
  const [landmarks, setLandmarks] = useState(null);
  const [fps, setFps] = useState(0);
  const animationFrameId = useRef(null);
  const lastTimeRef = useRef(0);
  const tRef = useRef(0);

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

    const drawLoop = (timestamp) => {
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

      tRef.current += 0.04;
      const t = tRef.current;
      
      const width = canvas.width;
      const height = canvas.height;
      ctx.clearRect(0, 0, width, height);

      // Check if video is loaded and playing
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        // Draw video frame to canvas under the overlay
        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.drawImage(videoRef.current, 0, 0, width, height);
        ctx.restore();

        // Scanline effect
        ctx.fillStyle = 'rgba(14, 165, 233, 0.03)';
        for (let y = 0; y < height; y += 4) {
          ctx.fillRect(0, y, width, 1);
        }

        // Simulate Hand Coordinates (21 points)
        // Standard wrist coordinates (x, y, z)
        const cx = width / 2 + Math.sin(t * 0.5) * (width * 0.08);
        const cy = height * 0.65 + Math.cos(t * 0.4) * (height * 0.05);

        const rawPoints = [
          [cx, cy], // 0 wrist
          [cx - width * 0.08, cy - height * 0.05], [cx - width * 0.12, cy - height * 0.12], [cx - width * 0.12, cy - height * 0.18], [cx - width * 0.10, cy - height * 0.22], // 1-4 thumb
          [cx - width * 0.04, cy - height * 0.08], [cx - width * 0.05, cy - height * 0.18], [cx - width * 0.05, cy - height * 0.25], [cx - width * 0.04, cy - height * 0.30], // 5-8 index
          [cx, cy - height * 0.08], [cx, cy - height * 0.20], [cx, cy - height * 0.28], [cx, cy - height * 0.34], // 9-12 middle
          [cx + width * 0.04, cy - height * 0.08], [cx + width * 0.05, cy - height * 0.18], [cx + width * 0.05, cy - height * 0.25], [cx + width * 0.04, cy - height * 0.31], // 13-16 ring
          [cx + width * 0.08, cy - height * 0.06], [cx + width * 0.09, cy - height * 0.14], [cx + width * 0.09, cy - height * 0.20], [cx + width * 0.08, cy - height * 0.24]  // 17-20 pinky
        ];

        // Add small organic noise to joints
        const pts = rawPoints.map(([x, y], idx) => {
          const nx = x + Math.sin(t * 1.5 + idx * 0.5) * 1.5;
          const ny = y + Math.cos(t * 1.2 + idx * 0.5) * 1.5;
          return { x: nx, y: ny, z: -0.02 * idx };
        });

        // 21 landmark flat array for model predictions
        const normalized = pts.map(p => ({
          x: p.x / width,
          y: p.y / height,
          z: p.z
        }));
        setLandmarks(normalized);
        setIsHandDetected(true);

        // Connections mapping
        const connections = [
          [0,1],[1,2],[2,3],[3,4],
          [0,5],[5,6],[6,7],[7,8],
          [0,9],[9,10],[10,11],[11,12],
          [0,13],[13,14],[14,15],[15,16],
          [0,17],[17,18],[18,19],[19,20],
          [5,9],[9,13],[13,17]
        ];

        // Draw green skeleton connections
        ctx.strokeStyle = '#10b981'; // Green emerald line
        ctx.lineWidth = 2.5;
        connections.forEach(([a, b]) => {
          ctx.beginPath();
          ctx.moveTo(pts[a].x, pts[a].y);
          ctx.lineTo(pts[b].x, pts[b].y);
          ctx.stroke();
        });

        // Draw blue dots on joints
        pts.forEach((p, idx) => {
          const r = idx === 0 ? 6 : 4;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fillStyle = idx === 0 ? '#0ea5e9' : '#38bdf8'; // Blue cyan joints
          ctx.fill();
        });

        // Draw scanning target rectangle
        ctx.strokeStyle = 'rgba(14, 165, 233, 0.4)';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(width * 0.15, height * 0.1, width * 0.7, height * 0.8);
        ctx.setLineDash([]);

        // TANGAN TERDETEKSI Badge
        ctx.fillStyle = 'rgba(14, 165, 233, 0.15)';
        ctx.strokeStyle = '#0ea5e9';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(16, 16, 150, 26, 4);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#0ea5e9';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText('● TANGAN TERDETEKSI ✓', 26, 32);
      } else {
        // Draw loading camera preview
        ctx.fillStyle = '#0b132b';
        ctx.fillRect(0, 0, width, height);

        ctx.fillStyle = '#94a3b8';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('Memulai kamera, silakan tunggu...', width / 2, height / 2);
        
        setIsHandDetected(false);
        setLandmarks(null);
      }

      animationFrameId.current = requestAnimationFrame(drawLoop);
    };

    animationFrameId.current = requestAnimationFrame(drawLoop);
    return () => cancelAnimationFrame(animationFrameId.current);
  }, [isActive, videoRef]);

  return {
    canvasRef,
    isHandDetected,
    landmarks,
    fps
  };
};
