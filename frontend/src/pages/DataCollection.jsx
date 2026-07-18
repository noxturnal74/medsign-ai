import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useContext,
  useMemo,
} from "react";
import { AppContext } from "../context/AppContext";
import { useWebcam } from "../hooks/useWebcam";
import { useMediaPipe } from "../hooks/useMediaPipe";
import { CATEGORY_META } from "../components/VocabularyGuide";
import {
  ArrowLeft,
  Camera,
  CameraOff,
  AlertTriangle,
  Play,
  Download,
  Trash,
  RefreshCw,
  Database,
  Sparkles,
  Send,
  CheckCircle,
  Search,
  HelpCircle,
  Plus,
  X,
  ChevronRight,
  Check,
  Maximize2,
  Minimize2,
  History,
  Sliders,
  Clock,
  User,
} from "lucide-react";

export const DataCollection = ({ setView }) => {
  const { vocabulary, refreshVocabulary } = useContext(AppContext);
  const [activeTab, setActiveTab] = useState(() => {
    const path = window.location.pathname;
    if (path === "/data-collection/balance") return "balance";
    if (path === "/data-collection/training") return "training";
    return "record";
  });

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === "record") {
      window.history.pushState({}, "", "/data-collection");
    } else {
      window.history.pushState({}, "", `/data-collection/${tab}`);
    }
  };

  // Sync back button
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === "/data-collection/balance") setActiveTab("balance");
      else if (path === "/data-collection/training") setActiveTab("training");
      else setActiveTab("record");
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // --- RECORD STATE ---
  const [signerId, setSignerId] = useState("albert_william");
  const [isMirrored, setIsMirrored] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [testSize, setTestSize] = useState(20); // Rasio data uji (%)
  const [recordingHistory, setRecordingHistory] = useState(() =>
    JSON.parse(localStorage.getItem("medsign_recording_history") || "[]"),
  );
  const [offlineTakes, setOfflineTakes] = useState(() =>
    JSON.parse(localStorage.getItem("medsign_offline_takes") || "[]"),
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);
  const [apiUrl, setApiUrl] = useState(
    () =>
      localStorage.getItem("medsign_api_url") ||
      import.meta.env.VITE_API_BASE_URL ||
      "http://localhost:8000",
  );
  const [connectionTestResult, setConnectionTestResult] = useState(null);

  const testApiConnection = async () => {
    setConnectionTestResult({ type: "info", msg: "Menguji koneksi..." });
    try {
      const cleanUrl = apiUrl.trim();
      const response = await fetch(
        `${cleanUrl.endsWith("/") ? cleanUrl.slice(0, -1) : cleanUrl}/health`,
      );
      if (response.ok) {
        const data = await response.json();
        setConnectionTestResult({
          type: "success",
          msg: `Koneksi Berhasil! Backend aktif (Model: ${data.model_loaded ? "Loaded" : "Not Loaded"})`,
        });
      } else {
        setConnectionTestResult({
          type: "error",
          msg: `Koneksi Gagal: Status ${response.status}`,
        });
      }
    } catch (err) {
      setConnectionTestResult({
        type: "error",
        msg: `Koneksi Gagal: ${err.message}. Pastikan backend aktif.`,
      });
    }
    setTimeout(() => setConnectionTestResult(null), 4000);
  };
  const [signersList, setSignersList] = useState([
    "albert_william",
    "albert_cheng",
    "glenn",
    "loren",
  ]);
  const [showAddSigner, setShowAddSigner] = useState(false);
  const [newSignerName, setNewSignerName] = useState("");
  const [signerError, setSignerError] = useState("");

  const fetchSigners = useCallback(async () => {
    try {
      const apiBaseUrl = apiUrl;
      const response = await fetch(
        `${apiBaseUrl.endsWith("/") ? apiBaseUrl.slice(0, -1) : apiBaseUrl}/api/v1/dataset/signers`,
      );
      if (response.ok) {
        const data = await response.json();
        setSignersList(data);
        if (data.length > 0 && !data.includes(signerId)) {
          setSignerId(data[0]);
        }
      }
    } catch (err) {
      console.error("Gagal mengambil signer:", err);
    }
  }, [signerId, apiUrl]);

  useEffect(() => {
    fetchSigners();
  }, [fetchSigners]);

  const handleAddSigner = () => {
    const cleanName = newSignerName.trim().toLowerCase();
    if (!cleanName) {
      setSignerError("Nama tidak boleh kosong");
      return;
    }
    if (!/^[a-z0-9_]+$/.test(cleanName)) {
      setSignerError(
        "Gunakan huruf kecil, angka, dan underscore saja (contoh: albert_william)",
      );
      return;
    }
    if (signersList.includes(cleanName)) {
      setSignerError("Signer sudah terdaftar");
      return;
    }
    setSignersList([...signersList, cleanName]);
    setSignerId(cleanName);
    setNewSignerName("");
    setShowAddSigner(false);
    setSignerError("");
  };

  const [selectedWords, setSelectedWords] = useState([]);
  const [activeCategory, setActiveCategory] = useState("Semua");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddWord, setShowAddWord] = useState(false);
  const [newWordName, setNewWordName] = useState("");
  const [newWordCategory, setNewWordCategory] = useState(
    "Kategori Umum & Kata Interaksi",
  );
  const [wordError, setWordError] = useState("");

  const categories = useMemo(() => {
    const cats = new Set(vocabulary.map((v) => v.category));
    return ["Semua", ...Array.from(cats)];
  }, [vocabulary]);

  const filteredWords = useMemo(() => {
    let list = vocabulary;
    if (activeCategory !== "Semua") {
      list = list.filter((w) => w.category === activeCategory);
    }
    if (searchQuery) {
      list = list.filter((w) =>
        w.word.toLowerCase().includes(searchQuery.toLowerCase()),
      );
    }
    return list;
  }, [vocabulary, activeCategory, searchQuery]);

  const handleAddWord = async () => {
    const cleanWord = newWordName.trim().toLowerCase();
    if (!cleanWord) {
      setWordError("Kata tidak boleh kosong");
      return;
    }
    try {
      const apiBaseUrl = apiUrl;
      const response = await fetch(
        `${apiBaseUrl.endsWith("/") ? apiBaseUrl.slice(0, -1) : apiBaseUrl}/api/v1/vocabulary`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            word: cleanWord,
            category: newWordCategory,
            emergency: false,
          }),
        },
      );
      if (response.ok) {
        await refreshVocabulary();
        setNewWordName("");
        setShowAddWord(false);
        setWordError("");
      } else {
        const errData = await response.json();
        setWordError(errData.detail || "Gagal menambahkan kata");
      }
    } catch (err) {
      setWordError("Koneksi gagal");
    }
  };

  const [iterations, setIterations] = useState(5);
  const estimatedTime = useMemo(() => {
    const totalSeconds = iterations * selectedWords.length * 4;
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    if (mins > 0) return `~${mins} menit ${secs} detik`;
    return `~${secs} detik`;
  }, [iterations, selectedWords]);

  const [isSessionActive, setIsSessionActive] = useState(false);
  const [recordingQueue, setRecordingQueue] = useState([]);
  const [currentQueueIndex, setCurrentQueueIndex] = useState(0);
  const [sessionState, setSessionState] = useState("idle"); // 'idle' | 'countdown' | 'recording' | 'saving'
  const [countdownValue, setCountdownValue] = useState(3);
  const [recordedFrames, setRecordedFrames] = useState([]);
  const [saveStatus, setSaveStatus] = useState(null);

  // Webcam & MediaPipe
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
  } = useWebcam();

  const { canvasRef, isHandDetected, landmarks, fps, lux } = useMediaPipe(
    isActive,
    videoElement,
  );

  const [sessionId, setSessionId] = useState("");
  const [showHandWarning, setShowHandWarning] = useState(false);
  const consecutiveMissingHandFrames = useRef(0);
  const bufferRef = useRef([]);
  // Menghitung berapa take dalam SESI SAAT INI yang gagal tersimpan ke
  // backend dan jatuh ke fallback localStorage (offline). Dipakai supaya
  // histori perekaman menunjukkan status yang akurat, bukan cuma dari hasil
  // take terakhir saja.
  const offlineSaveCountRef = useRef(0);

  const startRecordingSession = () => {
    if (selectedWords.length === 0) {
      alert("Pilih minimal satu kata untuk direkam!");
      return;
    }
    if (iterations < 5) {
      alert("Minimal 5 iterasi per kata!");
      return;
    }
    if (!isActive) {
      alert("Harap aktifkan kamera terlebih dahulu!");
      return;
    }

    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const yyyymmdd =
      now.getFullYear() + pad(now.getMonth() + 1) + pad(now.getDate());
    const hhmmss =
      pad(now.getHours()) + pad(now.getMinutes()) + pad(now.getSeconds());
    setSessionId(`${yyyymmdd}_${hhmmss}`);
    offlineSaveCountRef.current = 0;

    // Build queue
    const queue = [];
    selectedWords.forEach((word) => {
      for (let i = 1; i <= iterations; i++) {
        queue.push({ word, takeIndex: i });
      }
    });

    setRecordingQueue(queue);
    setCurrentQueueIndex(0);
    setIsSessionActive(true);
    setSessionState("countdown");
    setCountdownValue(3);
  };

  // Countdown timer effect
  useEffect(() => {
    if (!isSessionActive || sessionState !== "countdown") return;

    const interval = setInterval(() => {
      setCountdownValue((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          bufferRef.current = [];
          setRecordedFrames([]);
          consecutiveMissingHandFrames.current = 0;
          setShowHandWarning(false);
          setSessionState("recording");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isSessionActive, sessionState]);
  // Restart camera when device changes
  useEffect(() => {
    if (isActive) {
      startCamera(selectedDeviceId);
    }
  }, [selectedDeviceId, isActive, startCamera]);

  // Frame Capture logic
  useEffect(() => {
    if (!isSessionActive || sessionState !== "recording") return;

    if (isHandDetected && landmarks) {
      consecutiveMissingHandFrames.current = 0;
      setShowHandWarning(false);

      const flatLandmarks = landmarks.flatMap((l) => [l.x, l.y, l.z]);
      bufferRef.current.push(flatLandmarks);
      setRecordedFrames([...bufferRef.current]);

      if (bufferRef.current.length >= 30) {
        setSessionState("saving");
        saveCurrentTake();
      }
    } else {
      consecutiveMissingHandFrames.current += 1;
      if (consecutiveMissingHandFrames.current >= 5) {
        setShowHandWarning(true);
      }
    }
  }, [isSessionActive, sessionState, isHandDetected, landmarks]);

  const saveCurrentTake = async () => {
    const currentTake = recordingQueue[currentQueueIndex];
    if (!currentTake) return;

    try {
      setSaveStatus({
        type: "info",
        msg: `Menyimpan ${currentTake.word} Take ${currentTake.takeIndex}...`,
      });
      const apiBaseUrl = apiUrl;
      const response = await fetch(
        `${apiBaseUrl.endsWith("/") ? apiBaseUrl.slice(0, -1) : apiBaseUrl}/api/v1/save-sample`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            label: currentTake.word,
            signer_id: signerId,
            session_id: sessionId,
            take_index: currentTake.takeIndex,
            frames: bufferRef.current,
          }),
        },
      );

      if (response.ok) {
        setSaveStatus({
          type: "success",
          msg: `Berhasil disimpan: ${currentTake.word} Take ${currentTake.takeIndex}`,
        });

        setTimeout(() => {
          setSaveStatus(null);
          if (currentQueueIndex + 1 < recordingQueue.length) {
            setCurrentQueueIndex((prev) => prev + 1);
            setSessionState("countdown");
            setCountdownValue(3);
          } else {
            setIsSessionActive(false);
            setSessionState("idle");
            alert("Perekaman semua kata selesai!");

            // Simpan ke histori perekaman
            const uniqueWords = Array.from(
              new Set(recordingQueue.map((q) => q.word)),
            );
            const latestHistory = JSON.parse(
              localStorage.getItem("medsign_recording_history") || "[]",
            );
            const historyEntry = {
              id: Math.random().toString(36).substr(2, 9),
              signer: signerId,
              timestamp: new Date().toLocaleString("id-ID"),
              iterations: iterations,
              totalTakes: recordingQueue.length,
              wordsList: uniqueWords,
              wordsCount: uniqueWords.length,
              offlineTakesInSession: offlineSaveCountRef.current,
              isOffline: offlineSaveCountRef.current > 0,
            };
            const updatedHistory = [historyEntry, ...latestHistory];
            setRecordingHistory(updatedHistory);
            localStorage.setItem(
              "medsign_recording_history",
              JSON.stringify(updatedHistory),
            );
          }
        }, 1000);
      } else {
        const result = await response.json();
        throw new Error(result.detail || "Gagal menyimpan ke backend.");
      }
    } catch (err) {
      console.warn("Backend save failed, saving locally:", err);
      offlineSaveCountRef.current += 1;
      // Save locally to localStorage with frames array copied
      const offlineTake = {
        id: Math.random().toString(36).substr(2, 9),
        label: currentTake.word,
        signer_id: signerId,
        session_id: sessionId,
        take_index: currentTake.takeIndex,
        frames: [...bufferRef.current],
        timestamp: new Date().toLocaleString("id-ID"),
      };

      try {
        const latestOffline = JSON.parse(
          localStorage.getItem("medsign_offline_takes") || "[]",
        );
        const updatedOffline = [...latestOffline, offlineTake];
        localStorage.setItem(
          "medsign_offline_takes",
          JSON.stringify(updatedOffline),
        );
        setOfflineTakes(updatedOffline);

        setSaveStatus({
          type: "warning",
          msg: `Koneksi backend gagal. Take ${currentTake.word} disimpan lokal di browser!`,
        });

        setTimeout(() => {
          setSaveStatus(null);
          if (currentQueueIndex + 1 < recordingQueue.length) {
            setCurrentQueueIndex((prev) => prev + 1);
            setSessionState("countdown");
            setCountdownValue(3);
          } else {
            setIsSessionActive(false);
            setSessionState("idle");
            alert(
              "Perekaman semua kata selesai! (Tersimpan lokal karena offline)",
            );

            // Simpan ke histori perekaman
            const uniqueWords = Array.from(
              new Set(recordingQueue.map((q) => q.word)),
            );
            const latestHistory = JSON.parse(
              localStorage.getItem("medsign_recording_history") || "[]",
            );
            const historyEntry = {
              id: Math.random().toString(36).substr(2, 9),
              signer: signerId,
              timestamp: new Date().toLocaleString("id-ID"),
              iterations: iterations,
              totalTakes: recordingQueue.length,
              wordsList: uniqueWords,
              wordsCount: uniqueWords.length,
              offlineTakesInSession: offlineSaveCountRef.current,
              isOffline: true,
            };
            const updatedHistory = [historyEntry, ...latestHistory];
            setRecordingHistory(updatedHistory);
            localStorage.setItem(
              "medsign_recording_history",
              JSON.stringify(updatedHistory),
            );
          }
        }, 1500);
      } catch (storageErr) {
        console.error("Browser storage is full:", storageErr);
        setSaveStatus({
          type: "error",
          msg: "Penyimpanan lokal browser penuh! Sesi dihentikan.",
        });
      }
    }
  };

  const syncOfflineTakes = async () => {
    const currentOffline = JSON.parse(
      localStorage.getItem("medsign_offline_takes") || "[]",
    );
    if (currentOffline.length === 0) return;
    setIsSyncing(true);
    setSyncStatus(null);
    let successCount = 0;
    const apiBaseUrl = apiUrl;
    const remainingTakes = [...currentOffline];

    try {
      while (remainingTakes.length > 0) {
        const take = remainingTakes[0];
        setSyncStatus({
          type: "info",
          msg: `Menyinkronkan ${take.label} Take ${take.take_index} (${successCount + 1}/${currentOffline.length})...`,
        });

        const response = await fetch(
          `${apiBaseUrl.endsWith("/") ? apiBaseUrl.slice(0, -1) : apiBaseUrl}/api/v1/save-sample`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              label: take.label,
              signer_id: take.signer_id,
              session_id: take.session_id,
              take_index: take.take_index,
              frames: take.frames,
            }),
          },
        );

        if (response.ok) {
          remainingTakes.shift(); // Remove the successfully uploaded take
          successCount++;
          // Update localStorage and state on each success
          localStorage.setItem(
            "medsign_offline_takes",
            JSON.stringify(remainingTakes),
          );
          setOfflineTakes(remainingTakes);
        } else {
          const result = await response.json();
          throw new Error(result.detail || "Gagal menyimpan ke backend.");
        }
      }
      setSyncStatus({
        type: "success",
        msg: `Berhasil menyinkronkan ${successCount} take ke backend!`,
      });
      setTimeout(() => setSyncStatus(null), 3000);
    } catch (err) {
      setSyncStatus({
        type: "error",
        msg: `Gagal sinkronisasi: ${err.message}`,
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const exportOfflineTakes = () => {
    const currentOffline = JSON.parse(
      localStorage.getItem("medsign_offline_takes") || "[]",
    );
    if (currentOffline.length === 0) return;
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify(currentOffline, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download",
      `medsign_offline_takes_${new Date().toISOString().slice(0, 10)}.json`,
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.removeChild(downloadAnchor);
  };

  const clearOfflineTakes = () => {
    if (
      window.confirm(
        "Apakah Anda yakin ingin menghapus semua take offline yang tersimpan di browser?",
      )
    ) {
      setOfflineTakes([]);
      localStorage.removeItem("medsign_offline_takes");
    }
  };

  const handleSkipWord = () => {
    const currentTake = recordingQueue[currentQueueIndex];
    if (!currentTake) return;
    const nextIdx = recordingQueue.findIndex(
      (t, idx) => idx > currentQueueIndex && t.word !== currentTake.word,
    );
    if (nextIdx !== -1) {
      setSaveStatus(null);
      setCurrentQueueIndex(nextIdx);
      setSessionState("countdown");
      setCountdownValue(3);
    } else {
      setIsSessionActive(false);
      setSessionState("idle");
      alert("Sesi rekam selesai!");
    }
  };

  const handleRedoTake = () => {
    setSaveStatus(null);
    setSessionState("countdown");
    setCountdownValue(3);
  };

  const handleCancelSession = () => {
    if (
      window.confirm(
        "Apakah Anda yakin ingin membatalkan sesi rekam? Data yang sudah tersimpan di backend tidak akan hilang.",
      )
    ) {
      setIsSessionActive(false);
      setSessionState("idle");
      setSaveStatus(null);
    }
  };

  // --- RENDER SUB-COMPONENTS ---

  const renderRecordConfigView = () => {
    return (
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] animate-slide-up">
        {/* Kolom Kiri: Kamera & Iterasi */}
        <div className="flex flex-col gap-6">
          {/* Panel Kamera */}
          <div className="glass-panel flex flex-col gap-4 rounded-[32px] p-6 shadow-xl shadow-sky-900/5 hover:shadow-sky-900/10 transition-all duration-300">
            <div className="flex flex-col gap-2 border-b border-white/60 pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600">
                    <Camera size={16} />
                  </div>
                  <div>
                    <span className="block text-xs font-black text-slate-950 uppercase tracking-wider">
                      Kamera MediaPipe Hands
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">
                      Ekstraksi landmark rangka tangan otomatis
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isActive && (
                    <>
                      <button
                        onClick={() => setIsMirrored(!isMirrored)}
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-black border transition-all ${
                          isMirrored
                            ? "bg-sky-500/10 text-sky-700 border-sky-300/30"
                            : "bg-white/40 text-slate-600 border-white/50"
                        }`}
                        title="Toggle Mirror Mode"
                      >
                        Mirror
                      </button>
                      <span className="inline-flex items-center gap-1 rounded-xl bg-emerald-500/10 px-2.5 py-1 text-[10px] font-extrabold text-emerald-700 border border-emerald-500/20">
                        {fps} FPS
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-xl px-2.5 py-1 text-[10px] font-extrabold border ${
                          lux < 50
                            ? "bg-rose-500/10 text-rose-700 border-rose-300/30 animate-pulse"
                            : "bg-sky-500/10 text-sky-700 border-sky-300/30"
                        }`}
                      >
                        {lux} Lux
                      </span>
                    </>
                  )}
                  <button
                    onClick={() => (isActive ? stopCamera() : startCamera())}
                    className={`inline-flex items-center gap-1.5 rounded-xl py-1.5 px-3 text-xs font-bold shadow-sm transition-all duration-200 active:scale-[0.98] ${
                      isActive
                        ? "bg-rose-500/10 border border-rose-300/30 text-rose-700 hover:bg-rose-500/20"
                        : "bg-gradient-to-r from-sky-500 to-sky-600 text-white shadow-lg shadow-sky-500/20 hover:scale-[1.01]"
                    }`}
                  >
                    {isActive ? <CameraOff size={13} /> : <Camera size={13} />}
                    {isActive ? "Nonaktifkan" : "Aktifkan Kamera"}
                  </button>
                </div>
              </div>

              {isActive && (
                <div className="flex flex-wrap items-center justify-between gap-2 mt-1 px-1 bg-slate-50/50 p-2 rounded-xl border border-white/60">
                  <span className="text-[9px] font-bold text-slate-500">
                    💡 Jarak Ideal:{" "}
                    <span className="text-slate-800 font-black">
                      30 - 50 cm
                    </span>{" "}
                    dari lensa kamera
                  </span>
                  {lux < 50 && (
                    <span className="text-[9px] font-black text-rose-600 animate-pulse">
                      ⚠️ Ruangan Redup! Mohon tambah cahaya.
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Video Canvas Container */}
            <div
              className={`glass-panel glass-dark relative overflow-hidden select-none transition-all duration-300 ${
                isFullscreen
                  ? "fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-6 border-0 rounded-none"
                  : "aspect-video w-full rounded-2xl border border-white/10"
              } ${
                isActive && isHandDetected
                  ? "border-emerald-300/40 shadow-lg shadow-emerald-500/5"
                  : "border-white/10 shadow-inner"
              }`}
            >
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
                className="h-full w-full object-cover"
                style={{ transform: isMirrored ? "scaleX(-1)" : "scaleX(1)" }}
              />

              {isActive && !isHandDetected && (
                <div className="absolute bottom-4 left-4 right-4 text-center rounded-xl bg-slate-900/80 p-2.5 text-[10px] font-bold text-slate-200 backdrop-blur-md border border-white/10 tracking-wide">
                  Posisikan tangan Anda di depan kamera untuk memulai deteksi.
                </div>
              )}

              {/* Floating controls inside config canvas */}
              {isActive && (
                <div className="absolute left-4 bottom-4 z-30 flex gap-2">
                  <button
                    onClick={() => setIsMirrored(!isMirrored)}
                    className="glass-button rounded-xl bg-slate-900/80 px-3 py-1.5 text-[10px] font-black text-white hover:bg-slate-800"
                  >
                    Mirror
                  </button>
                  <button
                    onClick={() => setIsFullscreen(!isFullscreen)}
                    className="glass-button rounded-xl bg-slate-900/80 px-3 py-1.5 text-[10px] font-black text-white hover:bg-slate-800"
                  >
                    {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                  </button>
                </div>
              )}
            </div>

            {/* Kamera Device Selector */}
            {isActive && devices.length > 0 && (
              <div className="flex items-center gap-2 text-xs bg-slate-50/50 p-2.5 rounded-xl border border-white/60">
                <span className="font-bold text-slate-500 shrink-0">
                  Pilih Input Kamera:
                </span>
                <select
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="glass-input flex-1 rounded-xl py-1 px-3 text-[11px] font-semibold appearance-none bg-white/40 cursor-pointer"
                >
                  {devices.map((device, idx) => (
                    <option
                      key={device.deviceId}
                      value={device.deviceId}
                      className="bg-white text-slate-900"
                    >
                      {device.label || `Kamera ${idx + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Langkah 3: Jumlah Iterasi */}
          <div className="glass-panel flex flex-col gap-4 rounded-[32px] p-6 shadow-xl shadow-sky-900/5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600">
                <Sliders size={16} />
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase text-sky-700 tracking-wider">
                  Langkah 3: Jumlah Iterasi
                </span>
                <h3 className="text-sm font-black text-slate-950">
                  Berapa banyak take per kata? (Min 5)
                </h3>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 bg-slate-50/50 p-3 rounded-2xl border border-white/60">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="5"
                  value={iterations}
                  onChange={(e) =>
                    setIterations(Math.max(5, parseInt(e.target.value) || 5))
                  }
                  className="glass-input w-24 rounded-xl px-3 py-2 text-center text-xs font-black shadow-inner"
                />
                <span className="text-xs font-bold text-slate-500">
                  Take per Kata
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 flex-1">
                <Clock size={13} className="text-sky-600" />
                <span>Estimasi Durasi:</span>
                <span className="font-extrabold text-slate-700 bg-sky-500/10 px-2 py-0.5 rounded-lg">
                  {estimatedTime}
                </span>
              </div>
              <button
                onClick={startRecordingSession}
                disabled={selectedWords.length === 0 || !isActive}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white font-black text-xs py-3 px-6 shadow-lg shadow-sky-500/20 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed w-full sm:w-auto"
              >
                <Play size={13} fill="white" />
                Mulai Rekam Sesi
              </button>
            </div>
          </div>

          {/* Offline Takes Panel */}
          {offlineTakes.length > 0 && (
            <div className="glass-panel flex flex-col gap-4 rounded-[32px] p-6 shadow-xl shadow-amber-900/5 border border-amber-300/30 bg-amber-500/5 animate-slide-up">
              <div className="flex items-center justify-between border-b border-amber-200/40 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600">
                    <Database size={16} />
                  </div>
                  <div>
                    <span className="block text-xs font-black text-amber-950 uppercase tracking-wider">
                      Take Tersimpan Lokal
                    </span>
                    <span className="text-[10px] font-semibold text-amber-600">
                      Terdeteksi {offlineTakes.length} data rekaman offline
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={clearOfflineTakes}
                    disabled={isSyncing}
                    className="glass-button rounded-xl py-1 px-2.5 text-[9px] font-bold text-rose-700 hover:bg-rose-50 disabled:opacity-40"
                  >
                    Hapus
                  </button>
                  <button
                    onClick={exportOfflineTakes}
                    disabled={isSyncing}
                    className="glass-button rounded-xl py-1 px-2.5 text-[9px] font-bold text-sky-700 hover:bg-sky-50 disabled:opacity-40"
                  >
                    Ekspor
                  </button>
                </div>
              </div>

              {/* URL API Backend Input */}
              <div className="flex flex-col gap-1.5 text-xs">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-wider">
                  URL API Backend
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={apiUrl}
                    onChange={(e) => {
                      const val = e.target.value;
                      setApiUrl(val);
                      localStorage.setItem("medsign_api_url", val);
                    }}
                    className="glass-input rounded-xl px-3 py-1.5 text-slate-800 text-[11px] font-semibold flex-1 border border-white/60 bg-white/40 focus:bg-white"
                    placeholder="Contoh: http://localhost:8000"
                  />
                  <button
                    onClick={testApiConnection}
                    className="glass-button rounded-xl px-3 text-[10px] font-bold text-slate-700 hover:bg-slate-50 border border-slate-200/50"
                  >
                    Tes Koneksi
                  </button>
                </div>
                {connectionTestResult && (
                  <div
                    className={`rounded-lg border p-2 text-[10px] font-semibold mt-1 animate-slide-up ${
                      connectionTestResult.type === "success"
                        ? "border-emerald-250 bg-emerald-50 text-emerald-900"
                        : connectionTestResult.type === "error"
                          ? "border-rose-250 bg-rose-50 text-rose-900"
                          : "border-amber-250 bg-amber-50 text-amber-900"
                    }`}
                  >
                    {connectionTestResult.msg}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-2 border-t border-amber-200/20 pt-3">
                <button
                  onClick={syncOfflineTakes}
                  disabled={isSyncing}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-black text-xs py-2.5 px-4 shadow-md shadow-amber-500/10 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw
                    size={12}
                    className={isSyncing ? "animate-spin" : ""}
                  />
                  {isSyncing
                    ? "Menyinkronkan..."
                    : "Sinkronisasikan ke Backend"}
                </button>

                {syncStatus && (
                  <div
                    className={`rounded-lg border p-2 text-[10px] font-semibold ${
                      syncStatus.type === "success"
                        ? "border-emerald-250 bg-emerald-50 text-emerald-900"
                        : syncStatus.type === "error"
                          ? "border-rose-250 bg-rose-50 text-rose-900"
                          : "border-amber-250 bg-amber-50 text-amber-900"
                    }`}
                  >
                    {syncStatus.msg}
                  </div>
                )}
              </div>

              <div className="flex flex-col gap-1.5 max-h-[150px] overflow-y-auto pr-1 border-t border-amber-200/20 pt-3">
                {offlineTakes.map((item) => (
                  <div
                    key={item.id}
                    className="surface-panel rounded-xl p-2 border border-amber-200/30 flex flex-col gap-1 text-[10px] bg-amber-50/20"
                  >
                    <div className="flex justify-between items-center font-bold text-slate-500">
                      <span className="capitalize text-slate-800 font-extrabold">
                        {item.label} (Take {item.take_index})
                      </span>
                      <span>
                        {item.timestamp.split(" ")[1] || item.timestamp}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-slate-650">
                      <span>
                        Signer:{" "}
                        <span className="font-semibold text-slate-900">
                          {item.signer_id}
                        </span>
                      </span>
                      <span>
                        Frames:{" "}
                        <span className="font-semibold text-slate-900">
                          {item.frames.length}
                        </span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Histori Perekaman Sesi */}
          {recordingHistory.length > 0 && (
            <div className="glass-panel flex flex-col gap-4 rounded-[32px] p-6 shadow-xl shadow-sky-900/5 animate-slide-up">
              <div className="flex items-center justify-between border-b border-white/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600">
                    <History size={16} />
                  </div>
                  <div>
                    <span className="block text-xs font-black text-slate-950 uppercase tracking-wider">
                      Histori Perekaman
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500">
                      Riwayat sesi perekaman terkontrol
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    if (
                      window.confirm(
                        "Apakah Anda yakin ingin menghapus semua histori perekaman lokal?",
                      )
                    ) {
                      setRecordingHistory([]);
                      localStorage.removeItem("medsign_recording_history");
                    }
                  }}
                  className="glass-button rounded-xl py-1.5 px-3 text-[10px] font-bold text-rose-700 hover:bg-rose-50"
                >
                  Hapus Semua
                </button>
              </div>

              <div className="flex flex-col gap-2.5 max-h-[220px] overflow-y-auto pr-1">
                {recordingHistory.map((item) => (
                  <div
                    key={item.id}
                    className="surface-panel rounded-2xl p-3.5 border border-white/50 flex flex-col gap-1.5 text-xs bg-white/20"
                  >
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-500">
                      <span className="capitalize text-slate-800 font-black">
                        Signer: {item.signer.replace("_", " ")}
                      </span>
                      <span>{item.timestamp}</span>
                    </div>
                    <div className="flex justify-between items-center font-semibold text-slate-650">
                      <span>
                        Iterasi:{" "}
                        <span className="font-extrabold text-slate-900">
                          {item.iterations}
                        </span>
                      </span>
                      <span>
                        Total:{" "}
                        <span className="font-extrabold text-slate-900">
                          {item.totalTakes} Take
                        </span>
                      </span>
                      <span>
                        Kata:{" "}
                        <span className="font-extrabold text-slate-900">
                          {item.wordsCount} Kata
                        </span>
                      </span>
                    </div>
                    <div className="text-[9px] font-bold text-sky-700 uppercase tracking-wider truncate">
                      Kata: {item.wordsList.join(", ")}
                    </div>
                    {item.isOffline && (
                      <div className="flex items-center gap-1 rounded-lg bg-amber-500/10 border border-amber-500/20 px-2 py-1 text-[9px] font-bold text-amber-700">
                        <AlertTriangle size={10} />
                        {item.offlineTakesInSession
                          ? `${item.offlineTakesInSession} take belum tersinkron ke backend (tersimpan lokal)`
                          : "Sebagian/semua take tersimpan lokal, belum tersinkron ke backend"}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Kolom Kanan: Signer & Kata */}
        <div className="flex flex-col gap-6">
          {/* Langkah 1: Pilih Signer */}
          <div className="glass-panel flex flex-col gap-4 rounded-[32px] p-6 shadow-xl shadow-sky-900/5">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600">
                <User size={16} />
              </div>
              <div>
                <span className="block text-[10px] font-bold uppercase text-sky-700 tracking-wider">
                  Langkah 1: Pilih Responden
                </span>
                <h3 className="text-sm font-black text-slate-950">
                  Nama responden/signer untuk data ini
                </h3>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              {signersList.map((s) => {
                const active = signerId === s;
                return (
                  <button
                    key={s}
                    onClick={() => setSignerId(s)}
                    className={`rounded-xl px-3.5 py-2 text-xs font-black transition-all capitalize border shadow-sm active:scale-[0.98] ${
                      active
                        ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white border-transparent shadow-lg shadow-emerald-500/20 hover:scale-[1.01]"
                        : "border-white/70 bg-white/40 text-slate-700 hover:bg-white/60 hover:text-slate-950"
                    }`}
                  >
                    {s.replace("_", " ")}
                  </button>
                );
              })}
              {!showAddSigner ? (
                <button
                  onClick={() => setShowAddSigner(true)}
                  className="inline-flex items-center gap-1 border border-dashed border-sky-400 bg-sky-50/40 text-sky-700 hover:bg-sky-50 rounded-xl py-2 px-3 text-xs font-black transition-all active:scale-[0.98]"
                >
                  <Plus size={13} />
                  Tambah Baru
                </button>
              ) : (
                <div className="flex flex-col gap-2 w-full mt-2 bg-slate-50/50 p-3 rounded-2xl border border-white/60 animate-slide-up">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Nama asli lowercase (contoh: albert_william)"
                      value={newSignerName}
                      onChange={(e) => {
                        setNewSignerName(e.target.value);
                        setSignerError("");
                      }}
                      className="glass-input rounded-xl px-3 py-1.5 text-xs font-semibold flex-1 shadow-inner"
                    />
                    <button
                      onClick={handleAddSigner}
                      className="glass-button rounded-xl px-3 text-xs font-bold text-emerald-700"
                    >
                      Simpan
                    </button>
                    <button
                      onClick={() => {
                        setShowAddSigner(false);
                        setNewSignerName("");
                        setSignerError("");
                      }}
                      className="glass-button rounded-xl px-3 text-xs font-bold text-rose-700"
                    >
                      Batal
                    </button>
                  </div>
                  {signerError && (
                    <span className="text-[10px] font-semibold text-rose-600 leading-normal">
                      {signerError}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Langkah 2: Pilih Kata */}
          <div className="glass-panel flex flex-1 flex-col gap-4 rounded-[32px] p-6 shadow-xl shadow-sky-900/5 max-h-[500px]">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-white/60 pb-3 gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600">
                  <Database size={16} />
                </div>
                <div>
                  <span className="block text-[10px] font-bold uppercase text-sky-700 tracking-wider">
                    Langkah 2: Pilih Kata
                  </span>
                  <h3 className="text-sm font-black text-slate-950">
                    Daftar Kata Target ({selectedWords.length} terpilih)
                  </h3>
                </div>
              </div>

              <div className="relative w-full sm:w-44">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari kata..."
                  className="glass-input w-full rounded-xl py-1.5 pl-7 pr-3 text-[10px] font-semibold shadow-inner"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck="false"
                />
                <Search
                  className="absolute left-2.5 top-2.5 text-slate-400"
                  size={11}
                />
              </div>
            </div>

            {/* Category selection */}
            <div className="flex flex-wrap gap-1.5 pb-1 max-w-full select-none">
              {categories.map((cat) => {
                const meta = CATEGORY_META[cat] || CATEGORY_META.Semua;
                const active = activeCategory === cat;
                const btnClasses = active
                  ? meta.active || "bg-slate-950 text-white"
                  : meta.bg ||
                    "bg-white/40 text-slate-600 hover:bg-white/60 hover:text-slate-900";

                return (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat)}
                    className={`rounded-lg px-2.5 py-1 text-[9px] font-black uppercase tracking-wider shrink-0 transition-all active:scale-[0.97] ${btnClasses}`}
                  >
                    {cat.split(" ")[0]}
                  </button>
                );
              })}
            </div>

            {/* Select options */}
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 shrink-0 border-b border-white/20 pb-2">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const allSlugs = filteredWords.map((w) => w.word);
                    setSelectedWords(
                      Array.from(new Set([...selectedWords, ...allSlugs])),
                    );
                  }}
                  className="hover:text-slate-800"
                >
                  Pilih Semua
                </button>
                <span>|</span>
                <button
                  onClick={() => {
                    const filteredSlugs = filteredWords.map((w) => w.word);
                    setSelectedWords(
                      selectedWords.filter((w) => !filteredSlugs.includes(w)),
                    );
                  }}
                  className="hover:text-slate-800"
                >
                  Batal Semua
                </button>
              </div>
              {!showAddWord ? (
                <button
                  onClick={() => setShowAddWord(true)}
                  className="text-sky-700 hover:text-sky-900 flex items-center gap-0.5"
                >
                  <Plus size={11} /> Tambah Kosakata
                </button>
              ) : (
                <div className="flex flex-col gap-2 w-full mt-1 bg-slate-50/50 p-2.5 rounded-xl border border-white/50 text-[10px] font-semibold text-slate-700 animate-slide-up">
                  <div className="flex flex-col gap-1.5">
                    <input
                      type="text"
                      placeholder="Kata baru (huruf kecil & tanpa spasi)"
                      value={newWordName}
                      onChange={(e) => {
                        setNewWordName(e.target.value);
                        setWordError("");
                      }}
                      className="glass-input rounded-lg px-2 py-1 text-[10px]"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="none"
                      spellCheck="false"
                    />
                    <select
                      value={newWordCategory}
                      onChange={(e) => setNewWordCategory(e.target.value)}
                      className="glass-input rounded-lg px-2 py-1 text-[10px]"
                    >
                      {categories
                        .filter((c) => c !== "Semua")
                        .map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                    </select>
                    <div className="flex gap-1.5 justify-end">
                      <button
                        onClick={handleAddWord}
                        className="glass-button rounded-lg px-2.5 py-1 text-[9px] font-bold text-emerald-700"
                      >
                        Simpan
                      </button>
                      <button
                        onClick={() => {
                          setShowAddWord(false);
                          setNewWordName("");
                          setWordError("");
                        }}
                        className="glass-button rounded-lg px-2.5 py-1 text-[9px] font-bold text-rose-700"
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                  {wordError && (
                    <span className="text-[9px] font-bold text-rose-600 mt-1 leading-none">
                      {wordError}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 overflow-y-auto pr-1 flex-1 content-start">
              {filteredWords.map((item) => {
                const active = selectedWords.includes(item.word);
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (active) {
                        setSelectedWords(
                          selectedWords.filter((w) => w !== item.word),
                        );
                      } else {
                        setSelectedWords([...selectedWords, item.word]);
                      }
                    }}
                    className={`flex items-center justify-between rounded-xl border p-2 text-left transition-all active:scale-[0.98] ${
                      active
                        ? "border-emerald-300 bg-emerald-500/5 text-emerald-950 font-black shadow-sm"
                        : "border-white/50 bg-white/20 text-slate-700 hover:bg-white/40"
                    }`}
                  >
                    <span className="truncate text-[10px] font-extrabold uppercase">
                      {item.word}
                    </span>
                    {active && (
                      <Check size={12} className="text-emerald-600 shrink-0" />
                    )}
                  </button>
                );
              })}
              {filteredWords.length === 0 && (
                <div className="col-span-full py-8 text-center text-xs font-semibold text-slate-400">
                  Kosakata tidak ditemukan.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };
  const renderLiveRecordView = () => {
    const currentTake = recordingQueue[currentQueueIndex];
    if (!currentTake) return null;

    const progressPercent = Math.round(
      (currentQueueIndex / recordingQueue.length) * 100,
    );

    return (
      <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] animate-slide-up">
        {/* Kolom Kiri: Kamera feed dan overlay countdown */}
        <div className="flex flex-col gap-4">
          <div className="glass-panel flex flex-col gap-4 rounded-[32px] p-6 shadow-xl shadow-sky-900/5">
            <div className="flex items-center justify-between border-b border-white/60 pb-3">
              <div>
                <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  Live Recording Sesi
                </span>
                <p className="text-[10px] font-semibold text-slate-500">
                  Mengekstrak landmark koordinat hands
                </p>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-extrabold text-emerald-700 border border-emerald-500/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                KAMERA AKTIF
              </div>
            </div>

            {devices.length > 0 && (
              <div className="flex items-center gap-2 text-xs bg-slate-50/50 p-2.5 rounded-xl border border-white/60">
                <span className="font-bold text-slate-500 shrink-0">
                  Input Kamera:
                </span>
                <select
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="glass-input flex-1 rounded-xl py-1 px-3 text-[10px] font-semibold select-none"
                >
                  {devices.map((device, idx) => (
                    <option
                      key={device.deviceId}
                      value={device.deviceId}
                      className="bg-white text-slate-900"
                    >
                      {device.label || `Kamera ${idx + 1}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div
              className={`glass-panel glass-dark relative overflow-hidden select-none transition-all duration-300 ${
                isFullscreen
                  ? "fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-6 border-0 rounded-none"
                  : "aspect-video w-full rounded-2xl border border-white/10"
              } ${
                sessionState === "recording"
                  ? "border-red-500/50 shadow-lg shadow-red-500/15"
                  : ""
              }`}
            >
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
                className="h-full w-full object-cover"
                style={{ transform: isMirrored ? "scaleX(-1)" : "scaleX(1)" }}
              />

              {/* Floating mirror/fullscreen toggles inside canvas */}
              <div className="absolute left-4 bottom-4 z-30 flex gap-2">
                <button
                  onClick={() => setIsMirrored(!isMirrored)}
                  className="glass-button rounded-xl bg-slate-900/80 px-3 py-1.5 text-[10px] font-black text-white hover:bg-slate-800"
                >
                  Mirror
                </button>
                <button
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="glass-button rounded-xl bg-slate-900/80 px-3 py-1.5 text-[10px] font-black text-white hover:bg-slate-800"
                >
                  {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                </button>
              </div>

              {/* Countdown Overlay */}
              {sessionState === "countdown" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/75 z-20 backdrop-blur-sm animate-fade-in">
                  <div className="text-9xl font-black text-white tracking-tighter scale-95 animate-bounce">
                    {countdownValue}
                  </div>
                  <div className="mt-4 rounded-xl bg-sky-500/10 border border-sky-300/30 px-4 py-2 text-xs font-black tracking-widest text-sky-200 uppercase">
                    Posisikan Tangan Anda:{" "}
                    <span className="text-white underline font-extrabold">
                      {currentTake.word.toUpperCase()}
                    </span>
                  </div>
                </div>
              )}

              {/* Recording Overlay banner */}
              {sessionState === "recording" && (
                <div className="absolute left-4 top-4 z-20 flex items-center gap-1.5 rounded-xl border border-red-500/30 bg-red-950/80 px-3 py-1.5 text-xs font-black text-red-200 animate-pulse">
                  <span className="h-2 w-2 rounded-full bg-red-500 animate-ping" />
                  MEREKAM: {recordedFrames.length} / 30 Frame
                </div>
              )}

              {/* Tangan Tidak Terdeteksi Warning */}
              {showHandWarning && sessionState === "recording" && (
                <div className="absolute inset-0 flex items-center justify-center bg-red-950/75 z-20 animate-fade-in border-4 border-red-500 rounded-2xl backdrop-blur-sm">
                  <div className="text-center p-6 flex flex-col items-center gap-2.5 max-w-sm bg-slate-900/90 rounded-3xl border border-red-500/30 shadow-2xl">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/15 text-red-500">
                      <AlertTriangle size={24} className="animate-bounce" />
                    </div>
                    <div className="text-sm font-black text-white uppercase tracking-wider">
                      Tangan Tidak Terdeteksi!
                    </div>
                    <div className="text-[10px] font-semibold text-red-200 leading-relaxed">
                      Kembalikan telapak tangan Mas Fathur ke dalam sorotan
                      kamera agar perekaman tidak dibatalkan.
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action console */}
            <div className="grid grid-cols-3 gap-3 border-t border-white/60 pt-4">
              <button
                onClick={handleCancelSession}
                className="glass-button rounded-xl py-2.5 px-3 text-xs font-black text-rose-700 hover:bg-rose-50 hover:text-rose-950 active:scale-[0.98] transition-all"
              >
                Batal Sesi
              </button>
              <button
                onClick={handleSkipWord}
                className="glass-button rounded-xl py-2.5 px-3 text-xs font-black text-amber-700 hover:bg-amber-50 hover:text-amber-950 active:scale-[0.98] transition-all"
              >
                Skip Kata Ini
              </button>
              <button
                onClick={handleRedoTake}
                className="glass-button rounded-xl py-2.5 px-3 text-xs font-black text-sky-700 hover:bg-sky-50 hover:text-sky-950 active:scale-[0.98] transition-all"
              >
                Ulang Take
              </button>
            </div>

            {saveStatus && (
              <div
                className={`rounded-xl border p-3.5 text-xs font-semibold leading-relaxed animate-slide-up ${
                  saveStatus.type === "success"
                    ? "border-emerald-200 bg-emerald-100/50 text-emerald-950"
                    : saveStatus.type === "error"
                      ? "border-rose-200 bg-rose-100/50 text-rose-950"
                      : saveStatus.type === "warning"
                        ? "border-amber-200 bg-amber-100/50 text-amber-950"
                        : "border-sky-200 bg-sky-100/50 text-sky-950"
                }`}
              >
                {saveStatus.msg}
              </div>
            )}
          </div>
        </div>

        {/* Kolom Kanan: Antrian kata */}
        <div className="flex flex-col gap-4">
          <div className="glass-panel flex flex-col gap-4 rounded-[32px] p-6 shadow-xl shadow-sky-900/5 max-h-[520px]">
            <div>
              <span className="text-[10px] font-bold uppercase text-sky-700 tracking-wider">
                Progres Antrian Sesi
              </span>
              <h3 className="text-base font-black text-slate-950">
                Kemajuan: {currentQueueIndex} / {recordingQueue.length} Take
              </h3>
            </div>

            {/* Progress Bar */}
            <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200/50 p-0.5 shrink-0 border border-white/60">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500 transition-all duration-300 shadow-sm"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* List queue scrollable */}
            <div className="flex flex-col gap-2 overflow-y-auto pr-1 flex-1">
              {recordingQueue.map((item, idx) => {
                const isCurrent = idx === currentQueueIndex;
                const isDone = idx < currentQueueIndex;
                return (
                  <div
                    key={idx}
                    className={`flex items-center justify-between rounded-xl border p-3 text-left transition-all duration-200 ${
                      isCurrent
                        ? "border-sky-400 bg-white text-sky-850 shadow-md border-l-4 border-l-sky-500 scale-[1.01]"
                        : isDone
                          ? "border-emerald-200 bg-emerald-50/20 text-emerald-800/60"
                          : "border-white/50 bg-white/10 text-slate-400"
                    }`}
                  >
                    <div className="flex flex-col">
                      <span
                        className={`text-xs font-black uppercase ${isDone ? "line-through" : ""}`}
                      >
                        {item.word}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400">
                        Take {item.takeIndex} dari {iterations}
                      </span>
                    </div>
                    {isDone ? (
                      <span className="inline-flex items-center gap-1 text-[9px] font-black text-emerald-600">
                        <Check size={11} /> Tersimpan
                      </span>
                    ) : isCurrent ? (
                      <span className="text-[9px] font-black text-sky-600 animate-pulse">
                        Merekam...
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold text-slate-400">
                        Antre
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };
  const renderBalanceChecker = () => {
    const [balanceData, setBalanceData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [fetchError, setFetchError] = useState(null);
    
    const [activeModalLabel, setActiveModalLabel] = useState(null);
    const [activeModalDisplay, setActiveModalDisplay] = useState("");
    const [samples, setSamples] = useState([]);
    const [loadingSamples, setLoadingSamples] = useState(false);
    const [modalError, setModalError] = useState(null);
    const [selectedSamples, setSelectedSamples] = useState([]);

    const fetchSamples = async (label) => {
      try {
        setLoadingSamples(true);
        setModalError(null);
        setSelectedSamples([]);
        const apiBaseUrl = apiUrl;
        const response = await fetch(
          `${apiBaseUrl.endsWith("/") ? apiBaseUrl.slice(0, -1) : apiBaseUrl}/api/v1/dataset/samples/${label}`
        );
        if (response.ok) {
          const data = await response.json();
          setSamples(data);
        } else {
          setModalError(`Gagal mengambil sampel (HTTP ${response.status})`);
        }
      } catch (err) {
        console.error(err);
        setModalError("Gagal menghubungi server backend.");
      } finally {
        setLoadingSamples(false);
      }
    };

    const handleDeleteSample = async (sample) => {
      if (!window.confirm(`Apakah Anda yakin ingin menghapus file ${sample.filename}?`)) {
        return;
      }
      try {
        const apiBaseUrl = apiUrl;
        const response = await fetch(
          `${apiBaseUrl.endsWith("/") ? apiBaseUrl.slice(0, -1) : apiBaseUrl}/api/v1/dataset/samples/delete`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              label: activeModalLabel,
              signer: sample.signer,
              filename: sample.filename
            })
          }
        );
        if (response.ok) {
          setSamples(prev => prev.filter(s => s.filename !== sample.filename));
          setSelectedSamples(prev => prev.filter(name => name !== sample.filename));
          fetchBalance();
        } else {
          alert("Gagal menghapus file.");
        }
      } catch (err) {
        console.error(err);
        alert("Terjadi kesalahan koneksi.");
      }
    };

    const handleBulkDelete = async () => {
      if (selectedSamples.length === 0) return;
      if (!window.confirm(`Apakah Anda yakin ingin menghapus ${selectedSamples.length} file terpilih?`)) {
        return;
      }
      try {
        const apiBaseUrl = apiUrl;
        const response = await fetch(
          `${apiBaseUrl.endsWith("/") ? apiBaseUrl.slice(0, -1) : apiBaseUrl}/api/v1/dataset/samples/delete-bulk`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              label: activeModalLabel,
              samples: selectedSamples.map(filename => {
                const sample = samples.find(s => s.filename === filename);
                return {
                  signer: sample ? sample.signer : "",
                  filename: filename
                };
              })
            })
          }
        );
        if (response.ok) {
          const resData = await response.json();
          setSamples(prev => prev.filter(s => !selectedSamples.includes(s.filename)));
          setSelectedSamples([]);
          fetchBalance();
          alert(resData.message || "File terpilih berhasil dihapus");
        } else {
          alert("Gagal menghapus beberapa file.");
        }
      } catch (err) {
        console.error(err);
        alert("Terjadi kesalahan koneksi.");
      }
    };

    const fetchBalance = async () => {
      try {
        setLoading(true);
        const apiBaseUrl = apiUrl;
        const response = await fetch(
          `${apiBaseUrl.endsWith("/") ? apiBaseUrl.slice(0, -1) : apiBaseUrl}/api/v1/dataset/balance`,
        );
        if (response.ok) {
          const data = await response.json();
          setBalanceData(data);
          setFetchError(null);
        } else {
          setFetchError(
            `Backend membalas error (HTTP ${response.status}). Angka di bawah BUKAN status data sebenarnya.`,
          );
        }
      } catch (err) {
        console.error(err);
        // Fetch gagal total (server tidak jalan, salah URL API, atau CORS).
        // Jangan biarkan ini tampil sebagai "0 Kata" seolah dataset kosong -
        // itu menyesatkan karena sampel bisa saja sudah ada di backend, hanya
        // saja kita gagal terhubung untuk membacanya.
        setFetchError(
          `Gagal terhubung ke backend di "${apiUrl}". Angka di bawah BUKAN status data sebenarnya - pastikan server backend aktif dan URL API benar.`,
        );
      } finally {
        setLoading(false);
      }
    };

    useEffect(() => {
      fetchBalance();
    }, [apiUrl]);

    const filtered = useMemo(() => {
      if (!balanceData) return [];
      return balanceData.balance.filter(
        (b) =>
          b.display.toLowerCase().includes(search.toLowerCase()) ||
          b.category.toLowerCase().includes(search.toLowerCase()),
      );
    }, [balanceData, search]);

    const handleExportCSV = () => {
      if (!balanceData) return;
      const signers = balanceData.signers;
      const headers = ["Kategori", "Kata", ...signers, "Total", "Status"];
      const rows = filtered.map((b) => [
        b.category,
        b.display,
        ...signers.map((s) => b.counts[s] || 0),
        b.total,
        b.status,
      ]);
      const csvContent = [headers, ...rows].map((e) => e.join(",")).join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute(
        "download",
        `dataset_balance_${new Date().toISOString().slice(0, 10)}.csv`,
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    if (loading) {
      return (
        <div className="flex justify-center items-center py-20">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw className="animate-spin text-sky-600" size={28} />
            <span className="text-xs font-semibold text-slate-500">
              Memuat status dataset...
            </span>
          </div>
        </div>
      );
    }

    const summary = { cukup: 0, kurang: 0, belum: 0 };
    balanceData?.balance.forEach((b) => {
      if (b.status === "Cukup") summary.cukup++;
      else if (b.status === "Kurang") summary.kurang++;
      else summary.belum++;
    });

    return (
      <div className="flex flex-col gap-6 animate-slide-up">
        {fetchError && (
          <div className="glass-panel rounded-3xl p-4 border border-rose-400/40 bg-rose-500/10 shadow-md flex items-start gap-2.5">
            <AlertTriangle size={18} className="text-rose-600 mt-0.5 shrink-0" />
            <div>
              <span className="block text-xs font-black text-rose-950">
                Tidak bisa memuat status dataset dari backend
              </span>
              <p className="text-[11px] font-semibold text-rose-700">
                {fetchError}
              </p>
            </div>
          </div>
        )}
        {offlineTakes.length > 0 && (
          <div className="glass-panel rounded-3xl p-4 border border-amber-400/40 bg-amber-500/10 shadow-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
              <div>
                <span className="block text-xs font-black text-amber-950">
                  Ada {offlineTakes.length} take tersimpan lokal, belum masuk laporan ini
                </span>
                <p className="text-[11px] font-semibold text-amber-700">
                  Take yang gagal terkirim ke backend disimpan sementara di
                  browser (localStorage) dan belum dihitung di sini. Itu
                  sebabnya histori perekaman bisa menunjukkan data, sementara
                  laporan keseimbangan di bawah masih 0. Sinkronkan dulu di
                  tab "Ambil Data".
                </p>
              </div>
            </div>
            <button
              onClick={() => handleTabChange("record")}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-[11px] py-2 px-3.5 shadow-sm active:scale-[0.98] transition-all"
            >
              Ke Halaman Sinkronisasi
            </button>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="glass-panel perspective-card rounded-3xl p-5 border-l-4 border-emerald-500 shadow-md">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Status Cukup (Siap)
            </span>
            <div className="text-3xl font-black text-emerald-950 mt-1">
              {summary.cukup} Kata
            </div>
            <span className="text-[9px] font-semibold text-slate-400 mt-0.5 block">
              Sampel memadai untuk training
            </span>
          </div>
          <div className="glass-panel perspective-card rounded-3xl p-5 border-l-4 border-amber-500 shadow-md">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Status Kurang
            </span>
            <div className="text-3xl font-black text-amber-950 mt-1">
              {summary.kurang} Kata
            </div>
            <span className="text-[9px] font-semibold text-slate-400 mt-0.5 block">
              Butuh tambahan take responden
            </span>
          </div>
          <div className="glass-panel perspective-card rounded-3xl p-5 border-l-4 border-rose-500 shadow-md">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Belum Ada Sampel
            </span>
            <div className="text-3xl font-black text-rose-950 mt-1">
              {summary.belum} Kata
            </div>
            <span className="text-[9px] font-semibold text-slate-400 mt-0.5 block">
              Kosong, wajib diisi
            </span>
          </div>
        </div>

        <div className="glass-panel rounded-[32px] p-6 shadow-xl shadow-sky-900/5">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-white/60 pb-4 mb-5">
            <div>
              <h3 className="text-base font-black text-slate-950">
                Laporan Keseimbangan Dataset
              </h3>
              <p className="text-xs font-semibold text-slate-500">
                Jumlah sampel per kata per responden secara real-time
              </p>
            </div>
            <div className="flex gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-48">
                <input
                  type="text"
                  placeholder="Cari kata..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="glass-input w-full rounded-xl px-3 py-2 pl-7 text-xs font-semibold shadow-inner"
                />
                <Search
                  className="absolute left-2.5 top-3 text-slate-400"
                  size={11}
                />
              </div>
              <button
                onClick={fetchBalance}
                className="inline-flex items-center justify-center rounded-xl bg-white border border-white/80 p-2.5 text-slate-600 hover:text-slate-950 transition-all shadow-sm"
                title="Refresh data"
              >
                <RefreshCw size={13} />
              </button>
              <button
                onClick={handleExportCSV}
                className="inline-flex items-center gap-1.5 rounded-xl bg-sky-500/10 border border-sky-300/30 px-4 py-2 text-xs font-bold text-sky-700 hover:bg-sky-500/25 active:scale-[0.98] transition-all shadow-sm"
              >
                Export CSV
              </button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[500px] border border-slate-200/40 rounded-2xl">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-500 font-bold uppercase tracking-wider text-[9px]">
                  <th className="py-3 px-4">Kategori</th>
                  <th className="py-3 px-4">Kata</th>
                  {balanceData?.signers.map((s) => (
                    <th key={s} className="py-3 px-4 capitalize">
                      {s.replace("_", " ")}
                    </th>
                  ))}
                  <th className="py-3 px-4">Total</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Dibuat/Diupdate</th>
                  <th className="py-3 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((b) => (
                  <tr
                    key={b.label}
                    className="border-b border-slate-100 hover:bg-white/50 transition-colors"
                  >
                    <td className="py-3 px-4 text-slate-400 font-semibold max-w-[150px] truncate">
                      {b.category}
                    </td>
                    <td className="py-3 px-4 font-black text-slate-800 uppercase tracking-wide">
                      {b.display}
                    </td>
                    {balanceData?.signers.map((s) => (
                      <td
                        key={s}
                        className="py-3 px-4 font-extrabold text-slate-600"
                      >
                        {b.counts[s] || 0}
                      </td>
                    ))}
                    <td className="py-3 px-4 font-black text-slate-950 text-sm">
                      {b.total}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block rounded-xl px-2.5 py-1 text-[9px] font-black uppercase border ${
                          b.status === "Cukup"
                            ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-700"
                            : b.status === "Kurang"
                              ? "bg-amber-500/10 border-amber-500/20 text-amber-700"
                              : "bg-rose-500/10 border-rose-500/20 text-rose-700"
                        }`}
                      >
                        {b.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-slate-500">
                      {b.last_updated || "-"}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => {
                          setSelectedWords([b.label]);
                          handleTabChange("record");
                        }}
                        className="inline-flex items-center gap-1 rounded-xl bg-sky-500/10 px-2.5 py-1.5 text-[9px] font-black text-sky-700 hover:bg-sky-500/20 active:scale-[0.98] transition-all mr-1.5 shadow-sm uppercase"
                      >
                        Retake
                      </button>
                      <button
                        onClick={() => {
                          setActiveModalLabel(b.label);
                          setActiveModalDisplay(b.display);
                          fetchSamples(b.label);
                        }}
                        className="inline-flex items-center gap-1 rounded-xl bg-slate-500/10 px-2.5 py-1.5 text-[9px] font-black text-slate-700 hover:bg-slate-500/20 active:scale-[0.98] transition-all shadow-sm uppercase"
                      >
                        Check Dataset
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        
        {/* MODAL CHECK DATASET */}
        {activeModalLabel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
            <div className="bg-white rounded-3xl shadow-xl w-full max-w-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[80vh] text-slate-800">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                    Daftar File Sampel: {activeModalDisplay}
                  </h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Slug: {activeModalLabel}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setActiveModalLabel(null);
                    setSamples([]);
                    setSelectedSamples([]);
                  }}
                  className="rounded-xl p-2 text-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-all"
                >
                  <X size={16} />
                </button>
              </div>
              
              <div className="p-5 overflow-y-auto flex-1">
                {loadingSamples ? (
                  <div className="flex justify-center items-center py-12">
                    <RefreshCw className="animate-spin text-sky-600 mr-2" size={18} />
                    <span className="text-xs font-semibold text-slate-500">Memuat sampel...</span>
                  </div>
                ) : modalError ? (
                  <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-2xl text-xs font-medium">
                    {modalError}
                  </div>
                ) : samples.length === 0 ? (
                  <div className="text-center py-12 text-xs font-semibold text-slate-400">
                    Belum ada data rekaman untuk kata ini.
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {selectedSamples.length > 0 && (
                      <div className="mb-3 p-3 bg-rose-50 border border-rose-200/50 rounded-2xl flex items-center justify-between animate-slide-up">
                        <span className="text-[11px] font-bold text-rose-800">
                          Terpilih: {selectedSamples.length} file sampel
                        </span>
                        <button
                          onClick={handleBulkDelete}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-1.5 text-[10px] font-black text-white hover:bg-red-700 active:scale-[0.98] transition-all shadow-sm uppercase"
                        >
                          <Trash size={12} />
                          Hapus Terpilih
                        </button>
                      </div>
                    )}
                    <div className="overflow-x-auto border border-slate-100 rounded-xl">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 bg-slate-50 text-slate-500 font-bold uppercase text-[9px]">
                            <th className="py-2.5 px-3 w-8">
                              <input
                                type="checkbox"
                                checked={samples.length > 0 && selectedSamples.length === samples.length}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedSamples(samples.map(s => s.filename));
                                  } else {
                                    setSelectedSamples([]);
                                  }
                                }}
                                className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 h-3.5 w-3.5 cursor-pointer"
                              />
                            </th>
                            <th className="py-2.5 px-3">Signer</th>
                            <th className="py-2.5 px-3">Nama File</th>
                            <th className="py-2.5 px-3">Ukuran</th>
                            <th className="py-2.5 px-3">Tanggal</th>
                            <th className="py-2.5 px-3 text-right">Aksi</th>
                          </tr>
                        </thead>
                        <tbody>
                          {samples.map((s) => (
                            <tr key={s.filename} className="border-b border-slate-50 hover:bg-slate-50/50">
                              <td className="py-2 px-3 w-8">
                                <input
                                  type="checkbox"
                                  checked={selectedSamples.includes(s.filename)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedSamples([...selectedSamples, s.filename]);
                                    } else {
                                      setSelectedSamples(selectedSamples.filter(name => name !== s.filename));
                                    }
                                  }}
                                  className="rounded border-slate-300 text-sky-600 focus:ring-sky-500 h-3.5 w-3.5 cursor-pointer"
                                />
                              </td>
                              <td className="py-2 px-3 font-extrabold capitalize">{s.signer.replace("_", " ")}</td>
                              <td className="py-2 px-3 font-mono text-[10px] text-slate-500 truncate max-w-[180px]">{s.filename}</td>
                              <td className="py-2 px-3 font-bold text-slate-400">{s.size_kb} KB</td>
                              <td className="py-2 px-3 text-slate-400">{s.created_at}</td>
                              <td className="py-2 px-3 text-right">
                                <button
                                  onClick={() => handleDeleteSample(s)}
                                  className="inline-flex items-center justify-center p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                  title="Hapus sampel"
                                >
                                  <Trash size={13} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-5 border-t border-slate-100 bg-slate-50/50 flex justify-end">
                <button
                  onClick={() => {
                    setActiveModalLabel(null);
                    setSamples([]);
                    setSelectedSamples([]);
                  }}
                  className="rounded-xl bg-white border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-all shadow-sm"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };
  const renderTrainingModel = () => {
    const { vocabulary } = useContext(AppContext);
    const [modelType, setModelType] = useState("clinical"); // 'clinical' | 'alphabet'
    const [architecture, setArchitecture] = useState("gru");
    const [epochs, setEpochs] = useState(120);
    const [selectedWords, setSelectedWords] = useState([]);
    const [isTraining, setIsTraining] = useState(false);
    const [logs, setLogs] = useState("");
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState(""); // 'idle' | 'running' | 'success' | 'failed'
    const [finalizeStatus, setFinalizeStatus] = useState(""); // 'idle' | 'success' | 'error'
    const [finalizeMsg, setFinalizeMsg] = useState("");
    const logContainerRef = useRef(null);

    const handleFinalize = async (action) => {
      try {
        const apiBaseUrl = apiUrl;
        const response = await fetch(
          `${apiBaseUrl.endsWith("/") ? apiBaseUrl.slice(0, -1) : apiBaseUrl}/api/v1/dataset/train/finalize`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model_type: modelType,
              action
            })
          }
        );
        const data = await response.json();
        if (response.ok) {
          setFinalizeStatus("success");
          setFinalizeMsg(data.message);
          alert(data.message);
        } else {
          setFinalizeStatus("error");
          setFinalizeMsg(data.detail || "Gagal memproses model.");
          alert(data.detail || "Gagal memproses model.");
        }
      } catch (err) {
        console.error(err);
        setFinalizeStatus("error");
        setFinalizeMsg("Terjadi kesalahan koneksi saat memproses model.");
        alert("Terjadi kesalahan koneksi.");
      }
    };

    // Search & filter kategori untuk daftar kata (agar tidak perlu pilih satu-satu)
    const [trainingSearch, setTrainingSearch] = useState("");
    const [trainingCategory, setTrainingCategory] = useState("Semua");

    const trainingCategories = useMemo(() => {
      const cats = new Set(vocabulary.map((v) => v.category));
      return ["Semua", ...Array.from(cats)];
    }, [vocabulary]);

    const trainingFilteredWords = useMemo(() => {
      let list = vocabulary;
      if (trainingCategory !== "Semua") {
        list = list.filter((v) => v.category === trainingCategory);
      }
      if (trainingSearch) {
        list = list.filter((v) =>
          v.word.toLowerCase().includes(trainingSearch.toLowerCase()),
        );
      }
      const seen = new Set();
      return list.filter((v) => {
        if (seen.has(v.word)) return false;
        seen.add(v.word);
        return true;
      });
    }, [vocabulary, trainingCategory, trainingSearch]);

    useEffect(() => {
      if (logContainerRef.current) {
        logContainerRef.current.scrollTop =
          logContainerRef.current.scrollHeight;
      }
    }, [logs]);

    const handleStartTraining = async () => {
      setIsTraining(true);
      setLogs("Mempersiapkan proses training model...\n");
      setProgress(0);
      setStatus("running");

      try {
        const apiBaseUrl = apiUrl;
        setFinalizeStatus("");
        setFinalizeMsg("");
        const response = await fetch(
          `${apiBaseUrl.endsWith("/") ? apiBaseUrl.slice(0, -1) : apiBaseUrl}/api/v1/dataset/train`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              model_type: modelType,
              labels: selectedWords,
              epochs,
              architecture,
              test_size: testSize / 100,
            }),
          },
        );

        if (!response.ok) {
          setLogs(
            (prev) =>
              prev + `Error starting training: ${response.statusText}\n`,
          );
          setStatus("failed");
          setIsTraining(false);
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop();

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.replace("data: ", "").trim();
              setLogs((prev) => prev + data + "\n");

              const epochMatch = data.match(/Epoch\s+(\d+)\/(\d+)/i);
              if (epochMatch) {
                const current = parseInt(epochMatch[1]);
                const total = parseInt(epochMatch[2]);
                setProgress(Math.round((current / total) * 100));
              }

              if (data.includes("[TRAINING_FINISHED]")) {
                const exitCodeMatch = data.match(/Exit code: (\d+)/);
                if (exitCodeMatch && exitCodeMatch[1] === "0") {
                  setStatus("success");
                  setProgress(100);
                } else {
                  setStatus("failed");
                }
              }
            }
          }
        }
      } catch (err) {
        setLogs((prev) => prev + `Koneksi terputus: ${err.message}\n`);
        setStatus("failed");
      } finally {
        setIsTraining(false);
      }
    };

    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_1.5fr] animate-slide-up">
        {/* Left pane: training configuration */}
        <div className="glass-panel rounded-[32px] p-6 flex flex-col gap-5 shadow-xl shadow-sky-900/5">
          <div className="flex items-center gap-2.5 border-b border-white/60 pb-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600">
              <Sliders size={16} />
            </div>
            <h3 className="text-base font-black text-slate-950">
              Konfigurasi Model Training
            </h3>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Tipe Model yang Dilatih
            </label>
            <select
              value={modelType}
              onChange={(e) => {
                setModelType(e.target.value);
                if (e.target.value === "alphabet") {
                  setEpochs(85);
                } else {
                  setEpochs(120);
                }
              }}
              disabled={isTraining}
              className="glass-input rounded-xl px-3 py-2 text-xs font-black appearance-none bg-white/40 cursor-pointer border border-sky-300/40 text-sky-900 shadow-sm"
            >
              <option value="clinical">Model Kosakata Klinis (LSTM/GRU Dinamis)</option>
              <option value="alphabet">Model Ejaan Abjad A-Z & Angka 1-9 (MLP Statis)</option>
            </select>
          </div>

          {modelType === "clinical" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Model Architecture
              </label>
              <select
                value={architecture}
                onChange={(e) => setArchitecture(e.target.value)}
                disabled={isTraining}
                className="glass-input rounded-xl px-3 py-2 text-xs font-semibold appearance-none bg-white/40 cursor-pointer"
              >
                <option value="gru">GRU (Recommended - Faster & Light)</option>
                <option value="lstm">LSTM (Standard Recurrent Model)</option>
              </select>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Jumlah Epochs
            </label>
            <input
              type="number"
              min="1"
              value={epochs}
              onChange={(e) => setEpochs(parseInt(e.target.value) || (modelType === "alphabet" ? 85 : 120))}
              disabled={isTraining}
              className="glass-input rounded-xl px-3 py-2 text-xs font-black shadow-inner"
            />
          </div>

          {modelType === "clinical" && (
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                <span>Split Rasio Data Uji (Test Size)</span>
                <span className="text-sky-700 font-black">{testSize}%</span>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="10"
                  max="50"
                  step="5"
                  value={testSize}
                  onChange={(e) => setTestSize(parseInt(e.target.value))}
                  disabled={isTraining}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
                />
                <span className="text-[10px] font-bold text-slate-500 w-16 text-right shrink-0">
                  {100 - testSize}% Train
                </span>
              </div>
            </div>
          )}

          {modelType === "clinical" && (
            <div className="flex flex-col gap-1.5 flex-1 min-h-0">
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                Kata yang Dilatih ({selectedWords.length} terpilih, Kosong =
                Semua)
              </label>
              <div className="relative w-32">
                <input
                  type="text"
                  value={trainingSearch}
                  onChange={(e) => setTrainingSearch(e.target.value)}
                  disabled={isTraining}
                  placeholder="Cari..."
                  className="glass-input w-full rounded-lg py-1 pl-6 pr-2 text-[10px] font-semibold shadow-inner"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck="false"
                />
                <Search
                  className="absolute left-1.5 top-1.5 text-slate-400"
                  size={10}
                />
              </div>
            </div>

            {/* Filter kategori */}
            <div className="flex flex-wrap gap-1.5 pb-1 max-w-full select-none">
              {trainingCategories.map((cat) => {
                const meta = CATEGORY_META[cat] || CATEGORY_META.Semua;
                const active = trainingCategory === cat;
                const btnClasses = active
                  ? meta.active || "bg-slate-950 text-white"
                  : meta.bg ||
                    "bg-white/40 text-slate-600 hover:bg-white/60 hover:text-slate-900";
                return (
                  <button
                    key={cat}
                    type="button"
                    disabled={isTraining}
                    onClick={() => setTrainingCategory(cat)}
                    className={`rounded-lg px-2.5 py-1 text-[9px] font-black uppercase tracking-wider shrink-0 transition-all active:scale-[0.97] disabled:opacity-40 ${btnClasses}`}
                  >
                    {cat.split(" ")[0]}
                  </button>
                );
              })}
            </div>

            {/* Bulk select actions */}
            <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 shrink-0 border-b border-white/20 pb-2">
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={isTraining}
                  onClick={() => {
                    const allSlugs = trainingFilteredWords.map((w) => w.word);
                    setSelectedWords(
                      Array.from(new Set([...selectedWords, ...allSlugs])),
                    );
                  }}
                  className="hover:text-slate-800 disabled:opacity-40"
                >
                  Pilih Semua
                </button>
                <span>|</span>
                <button
                  type="button"
                  disabled={isTraining}
                  onClick={() => {
                    const filteredSlugs = trainingFilteredWords.map(
                      (w) => w.word,
                    );
                    setSelectedWords(
                      selectedWords.filter((w) => !filteredSlugs.includes(w)),
                    );
                  }}
                  className="hover:text-slate-800 disabled:opacity-40"
                >
                  Kosongkan Semua
                </button>
              </div>
              <span className="text-slate-400">
                {trainingFilteredWords.length} kata ditampilkan
              </span>
            </div>

            <div className="border border-slate-200/50 bg-white/30 rounded-xl p-3 max-h-[180px] overflow-y-auto grid grid-cols-1 sm:grid-cols-2 gap-2 shadow-inner">
              {trainingFilteredWords.map((v) => {
                const active = selectedWords.includes(v.word);
                return (
                  <label
                    key={v.id}
                    className="flex items-center gap-2.5 text-[10px] font-extrabold text-slate-700 cursor-pointer select-none hover:text-slate-950 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      disabled={isTraining}
                      onChange={() => {
                        if (active) {
                          setSelectedWords(
                            selectedWords.filter((w) => w !== v.word),
                          );
                        } else {
                          setSelectedWords([...selectedWords, v.word]);
                        }
                      }}
                      className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                    />
                    <span className="uppercase truncate">{v.word}</span>
                  </label>
                );
              })}
              {trainingFilteredWords.length === 0 && (
                <div className="col-span-full py-4 text-center text-[10px] font-semibold text-slate-400">
                  Kosakata tidak ditemukan.
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleStartTraining}
            disabled={isTraining}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 text-white font-black text-xs py-3 px-6 shadow-lg shadow-sky-500/20 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RefreshCw size={13} className={isTraining ? "animate-spin" : ""} />
            {isTraining
              ? "Training Sedang Berjalan..."
              : "Mulai Training Model"}
          </button>
        </div>

        {/* Right pane: logs console */}
        <div className="glass-panel rounded-[32px] p-6 flex flex-col gap-4 shadow-xl shadow-sky-900/5">
          <div className="flex items-center justify-between border-b border-white/60 pb-3">
            <span className="text-sm font-black text-slate-950">
              Log Terminal Output
            </span>
            {status === "running" && (
              <span className="text-xs font-black text-sky-600 animate-pulse uppercase tracking-wider">
                Running...
              </span>
            )}
            {status === "success" && (
              <span className="text-xs font-black text-emerald-600 uppercase tracking-wider">
                ✅ Selesai Berhasil
              </span>
            )}
            {status === "failed" && (
              <span className="text-xs font-black text-rose-600 uppercase tracking-wider">
                ❌ Gagal
              </span>
            )}
          </div>

          {status === "success" && (
            <div className="p-4 bg-emerald-50 border border-emerald-200/50 rounded-2xl flex flex-col gap-3 animate-slide-up shadow-inner select-none">
              <div>
                <span className="block text-xs font-black text-emerald-950 uppercase tracking-wide">
                  Model Baru Berhasil Dilatih!
                </span>
                <p className="text-[10px] font-semibold text-emerald-700 leading-relaxed mt-0.5">
                  Model Anda saat ini disimpan sementara di server. Pilih aksi di bawah untuk memprosesnya:
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => handleFinalize("replace")}
                  className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2 text-[10px] font-black text-white hover:bg-emerald-700 active:scale-[0.98] transition-all shadow-sm uppercase"
                >
                  Aktifkan (Ganti Model Lama)
                </button>
                <button
                  onClick={() => handleFinalize("save_new")}
                  className="inline-flex items-center justify-center rounded-xl bg-white border border-slate-200 px-4 py-2 text-[10px] font-black text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all shadow-sm uppercase"
                >
                  Simpan Baru dengan Timestamp
                </button>
              </div>
              {finalizeMsg && (
                <div className={`text-[10px] font-bold mt-1 ${finalizeStatus === 'success' ? 'text-emerald-700' : 'text-rose-600'}`}>
                  {finalizeStatus === 'success' ? '✓ ' : '✗ '}{finalizeMsg}
                </div>
              )}
            </div>
          )}

          {progress > 0 && (
            <div className="flex flex-col gap-1">
              <div className="flex justify-between text-[10px] font-bold text-slate-500">
                <span>Kemajuan Epoch</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200/50 p-0.5 border border-white/60">
                <div
                  className="h-full bg-gradient-to-r from-sky-400 to-sky-500 transition-all rounded-full"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <div
            ref={logContainerRef}
            className="bg-slate-950 text-emerald-400 font-mono text-[10px] p-4 rounded-xl flex-1 max-h-[380px] overflow-y-auto whitespace-pre-wrap leading-relaxed select-all shadow-inner border border-slate-900/50"
          >
            {logs ||
              'Belum ada log output. Tekan "Mulai Training Model" untuk melatih model neural network Anda.'}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 py-2 animate-slide-up">
      {/* Header & Tabs */}
      <div className="glass-panel flex flex-col md:flex-row items-center justify-between rounded-3xl p-4 gap-4 shadow-md">
        <button
          onClick={() => setView("home")}
          className="glass-button rounded-2xl px-4 py-2 text-xs font-black transition-all hover:scale-[1.01]"
        >
          <ArrowLeft size={14} />
          Menu Utama
        </button>

        {/* Navigation Tabs */}
        {!isSessionActive && (
          <div className="flex items-center gap-1 rounded-2xl bg-slate-900/10 p-1.5 backdrop-blur-xl border border-white/50 shadow-sm shrink-0 select-none">
            <button
              onClick={() => handleTabChange("record")}
              className={`rounded-xl px-4 py-1.5 text-xs font-black transition-all ${
                activeTab === "record"
                  ? "bg-white text-sky-700 shadow-sm border border-slate-200/20"
                  : "text-slate-500 hover:text-slate-950"
              }`}
            >
              Rekam Dataset
            </button>
            <button
              onClick={() => handleTabChange("balance")}
              className={`rounded-xl px-4 py-1.5 text-xs font-black transition-all ${
                activeTab === "balance"
                  ? "bg-white text-sky-700 shadow-sm border border-slate-200/20"
                  : "text-slate-500 hover:text-slate-950"
              }`}
            >
              Balance Checker
            </button>
            <button
              onClick={() => handleTabChange("training")}
              className={`rounded-xl px-4 py-1.5 text-xs font-black transition-all ${
                activeTab === "training"
                  ? "bg-white text-sky-700 shadow-sm border border-slate-200/20"
                  : "text-slate-500 hover:text-slate-950"
              }`}
            >
              Training Model
            </button>
          </div>
        )}

        <div className="text-right">
          <span className="text-[10px] font-bold uppercase text-sky-700 tracking-wider">
            Modul ML & Dataset
          </span>
          <h2 className="text-lg font-black text-slate-950 tracking-tight">
            {activeTab === "record"
              ? "Ambil Data Dataset"
              : activeTab === "balance"
                ? "Balance Checker"
                : "Training Model"}
          </h2>
        </div>
      </div>

      {/*
        PENTING: Ke-4 panel di bawah ini SELALU dipanggil (tidak conditional),
        lalu visibilitasnya dikontrol lewat CSS `display`. Ini WAJIB dilakukan
        seperti ini (bukan render kondisional `{activeTab === 'x' && ...}`)
        karena setiap render-function (renderRecordConfigView, renderBalanceChecker,
        dkk) memanggil hook React (useState/useEffect/useContext) di dalamnya.
        Jika dipanggil secara kondisional, jumlah & urutan hook yang dieksekusi
        berubah setiap kali tab diganti -> melanggar Rules of Hooks React ->
        menyebabkan state ter-reset/korup (gejalanya: harus reload saat pindah tab).
        Dengan selalu memanggil semuanya di urutan yang sama, hook order stabil
        DAN state setiap tab (misal progress training, hasil balance checker)
        tetap tersimpan walau pindah-pindah tab.
      */}
      <div style={{ display: isSessionActive ? "block" : "none" }}>
        {renderLiveRecordView()}
      </div>
      <div
        style={{
          display:
            !isSessionActive && activeTab === "record" ? "block" : "none",
        }}
      >
        {renderRecordConfigView()}
      </div>
      <div
        style={{
          display:
            !isSessionActive && activeTab === "balance" ? "block" : "none",
        }}
      >
        {renderBalanceChecker()}
      </div>
      <div
        style={{
          display:
            !isSessionActive && activeTab === "training" ? "block" : "none",
        }}
      >
        {renderTrainingModel()}
      </div>
    </div>
  );
};
