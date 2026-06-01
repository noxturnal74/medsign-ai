import React, { useContext, useEffect } from 'react';
import { AppContext } from '../context/AppContext';
import { useWebcam } from '../hooks/useWebcam';
import { useMediaPipe } from '../hooks/useMediaPipe';
import { useWebSocket } from '../hooks/useWebSocket';
import { Camera, CameraOff, Sparkles, RefreshCw, AlertTriangle } from 'lucide-react';

export const CameraFeed = () => {
  const { 
    cameraActive, 
    setCameraActive, 
    setLastDetected, 
    appendWord, 
    addLogEntry,
    serverState,
    setServerState
  } = useContext(AppContext);

  // Hook 1: Webcam
  const { videoRef, isActive, startCamera, stopCamera, error: webcamError } = useWebcam();

  // Hook 2: MediaPipe Hand landmarks simulation/overlay
  const { canvasRef, isHandDetected, landmarks, fps } = useMediaPipe(isActive, videoRef);

  // Hook 3: WebSocket connection
  const handlePrediction = (result) => {
    // When a valid gesture is translated
    if (result && result.prediction) {
      setLastDetected(result);
      appendWord(result.prediction);
      
      // Look up if emergency
      const isEmergency = result.prediction.toLowerCase() === 'tolong' || 
                          result.prediction.toLowerCase() === 'tidak bisa bernapas' ||
                          result.prediction.toLowerCase() === 'nyeri dada' ||
                          result.prediction.toLowerCase() === 'pingsan' ||
                          result.prediction.toLowerCase() === 'bantuan segera' ||
                          result.prediction.toLowerCase() === 'sakit sekali' ||
                          result.prediction.toLowerCase() === 'lebih buruk' ||
                          result.prediction.toLowerCase() === 'dada' ||
                          result.prediction.toLowerCase() === 'sesak';

      addLogEntry({
        role: 'patient',
        text: result.prediction.toUpperCase(),
        emoji: isEmergency ? '🆘' : '🤟',
        confidence: result.confidence
      });
    }
  };

  const wsUrl = 'ws://localhost:8000/api/v1/stream'; // FastAPI default
  const { connectionState } = useWebSocket(wsUrl, handlePrediction, isHandDetected, landmarks);

  // Update server state context
  useEffect(() => {
    setServerState(connectionState);
  }, [connectionState, setServerState]);

  // Sync state between context and hook
  useEffect(() => {
    if (cameraActive && !isActive) {
      startCamera();
    } else if (!cameraActive && isActive) {
      stopCamera();
    }
  }, [cameraActive, isActive, startCamera, stopCamera]);

  const toggleCamera = () => {
    setCameraActive(prev => !prev);
  };

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Video & Canvas Container */}
      <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 shadow-2xl select-none">
        
        {/* HTML5 Video element (hidden, processed in canvas) */}
        <video
          ref={videoRef}
          playsInline
          muted
          className="absolute pointer-events-none opacity-0 w-0 h-0"
        />

        {/* HTML5 Canvas overlay (handles overlay drawing and stream mirroring) */}
        <canvas
          ref={canvasRef}
          width={640}
          height={480}
          className="w-full h-full object-cover scale-x-[-1]" // Mirror display
        />

        {/* Scanning grid animation */}
        {isActive && isHandDetected && (
          <div className="absolute inset-0 pointer-events-none scanline opacity-30" />
        )}

        {/* Floating Badges */}
        <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
          {/* Connection status */}
          <div className={`px-3 py-1 rounded-lg text-[10px] font-bold font-mono tracking-wider flex items-center gap-1.5 border border-slate-700/80 shadow-md ${
            serverState === 'connected'
              ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/30'
              : 'bg-amber-950/80 text-amber-400 border-amber-500/30'
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${serverState === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400 animate-pulse'}`} />
            {serverState === 'connected' ? 'ONLINE (ML BACKEND)' : 'LOCAL DEMO (MOCK)'}
          </div>

          {/* FPS Counter */}
          {isActive && (
            <div className="bg-slate-900/80 text-sky-400 border border-slate-700/80 px-3 py-1 rounded-lg text-[10px] font-bold font-mono tracking-wider shadow-md text-right">
              {fps} FPS · MEDIAPIPE
            </div>
          )}
        </div>

        {/* Camera inactive overlay */}
        {!isActive && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950/90 px-8 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 shadow-xl">
              <CameraOff size={28} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-slate-200">Kamera Dinonaktifkan</h3>
              <p className="text-sm text-slate-500 max-w-sm mt-1">
                Aktifkan kamera Anda untuk memulai deteksi otomatis isyarat BISINDO secara real-time.
              </p>
            </div>
            <button
              onClick={toggleCamera}
              className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-semibold text-sm transition-all flex items-center gap-2 glow-cyan hover:scale-[1.02] cursor-pointer"
            >
              <Camera size={16} />
              Mulai Kamera
            </button>
          </div>
        )}

        {/* Webcam permission error overlay */}
        {webcamError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950/95 px-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-950/30 border border-red-500/30 flex items-center justify-center text-red-400 shadow-xl animate-bounce">
              <AlertTriangle size={28} />
            </div>
            <div>
              <h3 className="font-bold text-lg text-red-400">Akses Kamera Ditolak</h3>
              <p className="text-sm text-slate-400 max-w-md mt-2 leading-relaxed">
                {webcamError}
              </p>
            </div>
            <button
              onClick={toggleCamera}
              className="px-6 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-semibold text-sm hover:bg-slate-800 transition-all cursor-pointer"
            >
              Tutup
            </button>
          </div>
        )}
      </div>

      {/* Under-camera Controls */}
      {isActive && (
        <div className="flex items-center justify-between gap-4 p-4 glass-panel rounded-2xl border border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </div>
            <div>
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Status Kamera</span>
              <span className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                {isHandDetected ? 'Menganalisis Gerakan...' : 'Posisikan Tangan Anda Di Layar'}
              </span>
            </div>
          </div>

          <button
            onClick={toggleCamera}
            className="px-5 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 font-semibold text-xs transition-all cursor-pointer flex items-center gap-2"
          >
            <CameraOff size={14} />
            Hentikan Deteksi
          </button>
        </div>
      )}
    </div>
  );
};
