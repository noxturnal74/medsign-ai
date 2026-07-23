import React, { useCallback, useContext, useEffect } from 'react';

import { AppContext } from '../context/AppContextObject';

import { useWebcam } from '../hooks/useWebcam';

import { useMediaPipe } from '../hooks/useMediaPipe';

import { useWebSocket } from '../hooks/useWebSocket';

import { AlertTriangle, Camera, CameraOff, RefreshCw, Sparkles, Stethoscope, Maximize2 } from 'lucide-react';



const getStreamingUrl = () => {

  const apiBaseUrl = localStorage.getItem('medsign_api_url')?.trim() || import.meta.env.VITE_API_BASE_URL?.trim();



  if (!apiBaseUrl) {

    return null;

  }



  if (apiBaseUrl.startsWith('ws://') || apiBaseUrl.startsWith('wss://')) {

    return `${(apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl)}/api/v1/stream`;

  }



  try {

    const url = new URL(apiBaseUrl);

    url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';

    url.pathname = '/api/v1/stream';

    url.search = '';

    url.hash = '';

    return url.toString();

  } catch {

    return null;

  }

};



export const CameraFeed = () => {

  const {

    cameraActive,

    setCameraActive,

    setLastDetected,

    appendWord,

    addLogEntry,

    serverState,

    setServerState,

    spellingMode,

    setSpellingMode

  } = useContext(AppContext);



  const lastAppendedWordRef = React.useRef(null);
  const [isFullScreenCam, setIsFullScreenCam] = React.useState(false);



  const {

    videoRef,

    videoElement,

    isActive,

    startCamera,

    stopCamera,

    error: webcamError,

    devices,

    selectedDeviceId,
    setSelectedDeviceId,
    facingMode,
    toggleFacingMode
  } = useWebcam();



  const { canvasRef, isHandDetected, landmarks, fps } = useMediaPipe(isActive, videoElement);



  const handlePrediction = useCallback((result) => {

    if (result) {

      // Selalu perbarui real-time preview (bisa pakai raw_prediction jika prediction null)

      setLastDetected(result);



      // Hanya masukkan ke kalimat terjemahan jika melewati threshold (confirmed) dan bukan spelling mode

      if (result.prediction && result.mode !== "spelling" && result.mode !== "demo_spelling" && result.mode !== "model_unavailable" && result.mode !== "spelling_unavailable") {

        const word = result.prediction;

        if (word !== lastAppendedWordRef.current) {

          appendWord(word);

          lastAppendedWordRef.current = word;





        }

      }

    }

  }, [setLastDetected, appendWord, addLogEntry]);



  const wsUrl = getStreamingUrl();

  const { connectionState } = useWebSocket(wsUrl, handlePrediction, isHandDetected, landmarks);



  useEffect(() => {

    setServerState(connectionState);

  }, [connectionState, setServerState]);



  // Reset last detected state (clear preview) if hand is not detected for more than 1.5 seconds

  useEffect(() => {

    if (!isHandDetected) {

      const timeout = setTimeout(() => {

        lastAppendedWordRef.current = null; // Clear duplicate guard after 1.5 seconds

        setLastDetected(null);

      }, 1500);

      return () => clearTimeout(timeout);

    }

  }, [isHandDetected, setLastDetected]);



  useEffect(() => {

    if (cameraActive) {

      startCamera(selectedDeviceId);

    } else if (isActive) {

      stopCamera();

    }

  }, [cameraActive, selectedDeviceId, startCamera, stopCamera, isActive]);



  const toggleCamera = () => {

    setCameraActive(prev => !prev);

  };



  // Reset cameraActive to false when component unmounts to prevent stale state on navigation

  useEffect(() => {

    return () => {

      setCameraActive(false);

    };

  }, [setCameraActive]);



  return (

    <div className="flex w-full flex-col gap-3">

      <div className="flex flex-col justify-between gap-3 px-1 sm:flex-row sm:items-center">

        <div className="flex flex-wrap items-center gap-2">

          <span className="soft-chip rounded-full px-3 py-1.5 text-[10px] font-bold uppercase">

            <Camera size={12} className="text-sky-600" />

            Kamera Input Pasien

          </span>

          {isActive && (
            <button
              type="button"
              onClick={toggleFacingMode}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/50 text-slate-650 hover:bg-white/75 px-3 py-1.5 text-[10px] font-extrabold transition-all mr-1.5 active:scale-[0.97]"
            >
              <RefreshCw size={11} className="text-sky-600" />
              Kamera: {facingMode === 'user' ? 'Depan' : 'Belakang'}
            </button>
          )}
          {isActive && (
            <button
              onClick={() => setSpellingMode(prev => !prev)}

              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10px] font-extrabold transition-all ${

                spellingMode

                  ? 'border-violet-300/70 bg-violet-500/10 text-violet-700 shadow-sm shadow-violet-500/10'

                  : 'border-white/70 bg-white/50 text-slate-600 hover:bg-white/75'

              }`}

            >

              <Sparkles size={11} />

              Mode Eja: {spellingMode ? 'Aktif A-Z' : 'Nonaktif'}

            </button>

          )}

        </div>



        {devices.length > 0 && (

          <div className="flex items-center gap-1.5 self-end sm:self-auto">

            <span className="text-[10px] font-bold text-slate-500">Sumber</span>

            <div className="relative">

              <select

                value={selectedDeviceId}

                onChange={(e) => setSelectedDeviceId(e.target.value)}

                className="glass-input max-w-[190px] appearance-none truncate rounded-xl py-1.5 pl-3 pr-8 text-[11px] font-semibold"

              >

                {devices.map((device, idx) => (

                  <option key={device.deviceId} value={device.deviceId} className="bg-white text-slate-900">

                    {device.label || `Kamera ${idx + 1}`}

                  </option>

                ))}

              </select>

              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-sky-600">

                <RefreshCw size={10} />

              </div>

            </div>

          </div>

        )}

      </div>



      <div className={`glass-panel glass-dark relative aspect-video w-full overflow-hidden rounded-[28px] border transition-all duration-300 select-none ${

        spellingMode ? 'border-violet-300/40 shadow-violet-500/10' : 'border-white/10'

      }`}>

        <video

          ref={videoRef}

          playsInline

          muted

          className="pointer-events-none absolute h-0 w-0 opacity-0"

        />



        <canvas

          ref={canvasRef}

          width={640}

          height={480}

          className="h-full w-full scale-x-[-1] object-cover"

        />



        {isActive && isHandDetected && (

          <div className={`scanline pointer-events-none absolute inset-0 ${

            spellingMode ? 'opacity-50' : 'opacity-35'

          }`} />

        )}



        <div className="absolute right-4 top-4 z-10 flex flex-col gap-2">

          <div className={`flex items-center gap-1.5 rounded-xl border px-3 py-1 text-[10px] font-bold ${

            serverState === 'connected'

              ? 'border-emerald-300/30 bg-emerald-950/70 text-emerald-200'

              : 'border-amber-300/30 bg-amber-950/70 text-amber-200'

          }`}>

            <span className={`h-1.5 w-1.5 rounded-full ${serverState === 'connected' ? 'bg-emerald-300' : 'bg-amber-300'} animate-pulse`} />

            {serverState === 'connected' ? 'Online ML Backend' : 'Local Demo'}

          </div>



          {isActive && (

            <div className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-1 text-right text-[10px] font-bold text-sky-200 backdrop-blur-xl">

              {fps} FPS - MediaPipe

            </div>

          )}

        </div>



        {!isActive && (

          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950/90 px-8 text-center">

            <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-white/10 bg-white/10 text-slate-400 shadow-xl">

              <CameraOff size={28} />

            </div>

            <div>

              <h3 className="text-lg font-black text-white">Kamera Dinonaktifkan</h3>

              <p className="mt-1 max-w-sm text-sm font-semibold leading-6 text-slate-400">

                Aktifkan kamera untuk memulai deteksi otomatis isyarat BISINDO secara real-time.

              </p>

            </div>

            <button

              onClick={toggleCamera}

              className="glass-button glass-button-primary rounded-2xl px-6 py-2.5 text-sm font-bold"

            >

              <Camera size={16} />

              Mulai Kamera

            </button>

          </div>

        )}



        {webcamError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-slate-950/95 px-8 text-center z-20">
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl border border-red-300/30 bg-red-500/10 text-red-300 shadow-xl">
              <AlertTriangle size={28} />
            </div>
            <div>
              <h3 className="text-lg font-black text-red-300">Akses Kamera Ditolak</h3>
              <p className="mt-2 max-w-md text-xs font-semibold leading-5 text-slate-400">{webcamError}</p>
              <p className="mt-1.5 text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-xl">
                Catatan: Kamera pada peramban mobile memerlukan koneksi aman (HTTPS) atau localhost.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              <button
                type="button"
                onClick={toggleFacingMode}
                className="glass-button glass-button-primary rounded-xl px-5 py-2 text-xs font-bold text-white flex items-center gap-1.5"
              >
                Ganti Kamera ({facingMode === 'user' ? 'Belakang' : 'Depan'})
              </button>
              <button
                type="button"
                onClick={() => startCamera()}
                className="glass-button rounded-xl px-5 py-2 text-xs font-bold text-slate-300 hover:text-white border border-white/20"
              >
                Coba Lagi
              </button>
              <button
                type="button"
                onClick={toggleCamera}
                className="glass-button rounded-xl px-5 py-2 text-xs font-bold text-slate-400 hover:text-slate-350"
              >
                Tutup
              </button>
            </div>
          </div>
        )}

        {isFullScreenCam && (
          <>
            {/* Tutup Full Screen Button */}
            <button
              onClick={() => setIsFullScreenCam(false)}
              className="absolute right-4 top-20 z-50 rounded-xl bg-rose-600 px-4 py-2 text-xs font-black text-white hover:bg-rose-700 active:scale-[0.98] transition-all shadow-lg uppercase"
            >
              Kecilkan
            </button>

            {/* Doctor latest message overlay (Top floating card) */}
            {(() => {
              const lastDoctorMessage = sessionLog.find(entry => entry.role === 'doctor');
              if (!lastDoctorMessage) return null;
              return (
                <div className="absolute top-24 left-4 right-4 z-50 glass-panel border-emerald-400/50 bg-emerald-950/85 p-3.5 rounded-2xl flex items-start gap-3 shadow-xl backdrop-blur-md animate-slide-up text-white max-w-lg mx-auto">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300">
                    <Stethoscope size={18} className="animate-pulse" />
                  </div>
                  <div className="min-w-0 flex-grow">
                    <span className="text-[8px] font-black text-emerald-300 uppercase tracking-wider block">Dokter (Instruksi):</span>
                    <p className="text-xs font-black text-white leading-normal mt-0.5 break-words">{lastDoctorMessage.text}</p>
                  </div>
                </div>
              );
            })()}

            {/* Real-time translation overlay (Bottom floating card) */}
            {lastDetected && (
              <div className="absolute bottom-20 left-4 right-4 z-50 glass-panel border-white/20 bg-slate-950/85 p-4 rounded-3xl flex flex-col gap-2.5 max-w-lg mx-auto shadow-xl backdrop-blur-md">
                <div className="flex items-center justify-between text-[9px] font-black text-slate-400 uppercase">
                  <span>Hasil Terjemahan BISINDO</span>
                  <span className="text-sky-400">{Math.round((lastDetected.confidence || 0) * 100)}% - Confidence</span>
                </div>
                <div className="text-center py-1">
                  <span className="text-2xl font-black uppercase text-sky-300">
                    {lastDetected.prediction || lastDetected.raw_prediction || "Menunggu isyarat..."}
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>



      {isActive && (

        <div className="glass-panel flex items-center justify-between gap-4 rounded-3xl p-4">

          <div className="flex items-center gap-2.5">

            <div className="relative flex h-3 w-3">

              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70" />

              <span className="relative inline-flex h-3 w-3 rounded-full bg-emerald-500" />

            </div>

            <div>

              <span className="block text-xs font-bold uppercase text-slate-500">Status Kamera</span>

              <span className="flex items-center gap-1.5 text-sm font-black text-slate-950">

                {isHandDetected ? 'Menganalisis gerakan...' : 'Posisikan tangan di layar'}

              </span>

            </div>

          </div>



          <button

            onClick={toggleCamera}

            className="inline-flex items-center gap-2 rounded-2xl border border-red-300/50 bg-red-500/10 px-5 py-2 text-xs font-bold text-red-600 transition-all hover:bg-red-500/20"

          >

            <CameraOff size={14} />

            Hentikan

          </button>

        </div>

      )}

    </div>

  );

};

