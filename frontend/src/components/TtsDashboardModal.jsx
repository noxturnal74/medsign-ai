import React, { useState, useEffect, useRef, useContext } from 'react';
import { AppContext } from '../context/AppContextObject';
import { 
  Volume2, VolumeX, Play, Pause, Square, RotateCcw, 
  Download, Sliders, Activity, Search, AlertTriangle, 
  Terminal, ShieldCheck, Cpu, SlidersHorizontal, RefreshCw
} from 'lucide-react';

export const TtsDashboardModal = ({ isOpen, onClose }) => {
  const { 
    ttsEnabled, setTtsEnabled, speak, availableVoices, 
    selectedVoiceName, setSelectedVoiceName, getVoiceLabel 
  } = useContext(AppContext);

  // States
  const [providers, setProviders] = useState([]);
  const [activeProvider, setActiveProvider] = useState('sapi');
  const [voices, setVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [genderFilter, setGenderFilter] = useState('Semua');
  const [langFilter, setLangFilter] = useState('Semua');
  
  // Audio Parameters
  const [testText, setTestText] = useState('Halo, ini adalah uji coba suara asisten MedSign AI.');
  const [rate, setRate] = useState(1.0);
  const [pitch, setPitch] = useState(1.0);
  const [volume, setVolume] = useState(1.0);

  // Status & Player
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [logs, setLogs] = useState([]);

  const audioRef = useRef(null);
  const logsEndRef = useRef(null);

  // Fetch providers and voices from backend API
  const fetchProviders = async () => {
    try {
      const apiBaseUrl = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl}/api/v1/tts/providers`);
      if (response.ok) {
        const data = await response.json();
        // Add browser local provider to the dashboard
        const browserProvider = {
          name: "browser",
          display_name: "Browser Web Speech API (Client)",
          status: window.speechSynthesis ? "Connected" : "Unsupported",
          voice_count: availableVoices.length,
          supported_languages: Array.from(new Set(availableVoices.map(v => v.lang))),
          avg_latency_ms: 10
        };
        setProviders([browserProvider, ...data]);
      }
    } catch (err) {
      console.error("Gagal memuat status provider TTS:", err);
      // Fallback local display
      setProviders([{
        name: "browser",
        display_name: "Browser Web Speech API (Client)",
        status: window.speechSynthesis ? "Connected" : "Unsupported",
        voice_count: availableVoices.length,
        supported_languages: Array.from(new Set(availableVoices.map(v => v.lang))),
        avg_latency_ms: 10
      }]);
    }
  };

  const fetchVoices = async () => {
    if (activeProvider === 'browser') {
      const formatted = availableVoices.map(v => {
        const nameLower = v.name.toLowerCase();
        let gender = "Umum";
        if (nameLower.includes('gadis') || nameLower.includes('gisella') || nameLower.includes('damayanti') || nameLower.includes('female') || nameLower.includes('perempuan') || nameLower.includes('google')) {
          gender = "Perempuan";
        } else if (nameLower.includes('ardi') || nameLower.includes('andika') || nameLower.includes('male') || nameLower.includes('laki')) {
          gender = "Laki-laki";
        }
        return {
          name: v.name,
          lang: v.lang,
          gender: gender,
          style: "Standard",
          region: v.lang === "id-ID" ? "Indonesia" : "Luar Negeri",
          type: "Browser"
        };
      });
      setVoices(formatted);
      if (formatted.length > 0) {
        setSelectedVoice(formatted[0].name);
      }
      return;
    }

    try {
      const apiBaseUrl = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl}/api/v1/tts/voices?provider=${activeProvider}`);
      if (response.ok) {
        const data = await response.json();
        setVoices(data);
        if (data.length > 0) {
          setSelectedVoice(data[0].name);
        }
      }
    } catch (err) {
      console.error("Gagal memuat suara:", err);
      setVoices([]);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchProviders();
    }
  }, [isOpen, availableVoices]);

  useEffect(() => {
    if (isOpen) {
      fetchVoices();
    }
  }, [isOpen, activeProvider]);

  // Log updater helper
  const addLog = (msg) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, `[${timestamp}] ${msg}`]);
  };

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  // Generate / Speak
  const handleTestVoice = async () => {
    if (!testText.trim()) return;
    
    // Stop any current playing audio
    handleStop();
    setGenError(null);
    setIsGenerating(true);
    addLog(`[TTS INITIATED] Menggunakan provider: ${activeProvider.toUpperCase()} | Suara: ${selectedVoice}`);

    if (activeProvider === 'browser') {
      try {
        // Client-side simulation
        const start = Date.now();
        speak(testText);
        // Sync browser voice setting
        setSelectedVoiceName(selectedVoice);
        
        setTimeout(() => {
          const latency = Date.now() - start;
          addLog(`[BROWSER SYNTHESIS] Sukses. Latensi: ${latency}ms | Cache: N/A`);
          setIsGenerating(false);
          // Set simulated duration based on text length
          setDuration(Math.max(2, testText.length * 0.08));
          setCurrentTime(0);
          setIsPlaying(true);
        }, 300);
      } catch (err) {
        addLog(`[BROWSER ERROR] Gagal melafalkan: ${err.message}`);
        setGenError(err.message);
        setIsGenerating(false);
      }
      return;
    }

    try {
      const apiBaseUrl = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl}/api/v1/tts/synthesize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: testText,
          provider: activeProvider,
          voice: selectedVoice,
          rate: rate,
          pitch: pitch
        })
      });

      if (response.ok) {
        // Retrieve headers
        const cacheHit = response.headers.get("X-TTS-Cache-Hit") === "True";
        const latencyMs = response.headers.get("X-TTS-Gen-Time-Ms") || "0";
        const sizeBytes = response.headers.get("X-TTS-Audio-Size") || "0";

        addLog(`[SYNTHESIS SUCCESS] Latensi: ${latencyMs}ms | Ukuran: ${sizeBytes} bytes | Cache Hit: ${cacheHit}`);
        
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);

        // Load into audio tag
        if (audioRef.current) {
          audioRef.current.src = url;
          audioRef.current.volume = volume;
          audioRef.current.playbackRate = rate;
          audioRef.current.load();
        }
      } else {
        const errorData = await response.json();
        const msg = errorData.detail || "Gagal melakukan generasi suara.";
        addLog(`[SYNTHESIS ERROR] ${msg}`);
        setGenError(msg);
      }
    } catch (err) {
      addLog(`[NETWORK ERROR] Gagal menghubungi backend: ${err.message}`);
      setGenError("Gagal menghubungi server backend. Pastikan server aktif.");
    } finally {
      setIsGenerating(false);
    }
  };

  // Audio Playback Controls
  const handlePlayPause = () => {
    if (activeProvider === 'browser') {
      if (isPlaying) {
        window.speechSynthesis.pause();
        setIsPlaying(false);
        addLog(`[BROWSER PLAYBACK] Paused`);
      } else {
        window.speechSynthesis.resume();
        setIsPlaying(true);
        addLog(`[BROWSER PLAYBACK] Resumed`);
      }
      return;
    }

    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      addLog(`[PLAYER] Paused`);
    } else {
      audioRef.current.play().catch(e => {
        addLog(`[PLAYER ERROR] Gagal memutar audio: ${e.message}`);
      });
      setIsPlaying(true);
      addLog(`[PLAYER] Playing`);
    }
  };

  const handleStop = () => {
    if (activeProvider === 'browser') {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
      setCurrentTime(0);
      addLog(`[BROWSER PLAYBACK] Stopped`);
      return;
    }

    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
    addLog(`[PLAYER] Stopped`);
  };

  const handleReplay = () => {
    handleStop();
    setTimeout(() => {
      handlePlayPause();
    }, 150);
  };

  const handleDownload = () => {
    if (!audioUrl) return;
    const a = document.createElement('a');
    a.href = audioUrl;
    a.download = `medsign_tts_${activeProvider}_${selectedVoice.replace(/\s+/g, '_')}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    addLog(`[DOWNLOAD] Mengunduh file audio...`);
  };

  const handleSeek = (e) => {
    const val = parseFloat(e.target.value);
    setCurrentTime(val);
    if (activeProvider !== 'browser' && audioRef.current) {
      audioRef.current.currentTime = val;
    }
  };

  // Handle HTML5 Audio events
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };
    const onLoadedMetadata = () => {
      setDuration(audio.duration || 0);
      addLog(`[AUDIO LOADED] Durasi: ${audio.duration.toFixed(2)}s`);
    };
    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      addLog(`[PLAYER] Selesai memutar audio.`);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('ended', onEnded);
    };
  }, [audioUrl]);

  // Adjust volume / speed rates dynamically
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
      audioRef.current.playbackRate = rate;
    }
  }, [volume, rate]);

  // Simulate progress bar in browser synthesis mode
  useEffect(() => {
    if (activeProvider !== 'browser' || !isPlaying) return;
    const interval = setInterval(() => {
      setCurrentTime(prev => {
        if (prev >= duration) {
          clearInterval(interval);
          setIsPlaying(false);
          return 0;
        }
        return prev + 0.1;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [isPlaying, activeProvider, duration]);

  // Filters & Search
  const filteredVoices = voices.filter(v => {
    const matchSearch = v.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        v.lang.toLowerCase().includes(searchQuery.toLowerCase());
    const matchGender = genderFilter === 'Semua' || v.gender === genderFilter;
    const matchLang = langFilter === 'Semua' || v.lang === langFilter;
    return matchSearch && matchGender && matchLang;
  });

  const uniqueLanguages = Array.from(new Set(voices.map(v => v.lang)));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/85 backdrop-blur-sm p-4 animate-fade-in text-slate-800 select-none">
      <audio ref={audioRef} className="hidden" />
      
      <div className="relative bg-white rounded-[32px] p-6 max-w-4xl w-full max-h-[92vh] overflow-y-auto flex flex-col gap-6 shadow-2xl border border-white/20 animate-scale-up">
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-950 transition-all font-black text-lg p-1.5"
        >
          ✕
        </button>

        {/* Modal Header */}
        <div className="border-b border-slate-100 pb-3 flex items-center gap-3">
          <Volume2 className="text-violet-600 w-5 h-5 animate-pulse" />
          <div>
            <h3 className="text-base font-black text-slate-950">TTS Dashboard &amp; Voice Library</h3>
            <p className="text-[10px] font-semibold text-slate-500 mt-0.5">Kelola penyedia suara, pencarian kosakata, uji coba suara medis real-time</p>
          </div>
        </div>

        {/* 1. Provider Cards Dashboard */}
        <div className="flex flex-col gap-2.5">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">1. Pilih Provider TTS</span>
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            {providers.map((p) => {
              const active = activeProvider === p.name;
              return (
                <button
                  key={p.name}
                  onClick={() => {
                    setActiveProvider(p.name);
                    setAudioUrl(null);
                    handleStop();
                  }}
                  className={`rounded-2xl p-3 text-left border flex flex-col justify-between h-24 hover:scale-[1.02] transition-all active:scale-[0.98] ${
                    active 
                      ? "bg-violet-500/10 border-violet-400 text-violet-950 shadow-sm" 
                      : "bg-slate-50/50 border-slate-200 text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <div>
                    <span className="block text-[11px] font-black uppercase tracking-wide truncate">{p.display_name}</span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{p.name}</span>
                  </div>
                  <div className="flex justify-between items-center w-full mt-2 border-t border-slate-100/50 pt-1.5 text-[9px] font-semibold">
                    <span className={`px-2 py-0.5 rounded-full ${
                      p.status === "Connected" ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/20" : 
                      p.status === "Offline" ? "bg-amber-500/10 text-amber-700 border border-amber-500/20" : 
                      "bg-rose-500/10 text-rose-700 border border-rose-500/20"
                    }`}>
                      {p.status}
                    </span>
                    <span className="text-slate-500">{p.voice_count} Voices</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-[1.2fr_0.8fr] min-h-0">
          {/* Left Column: Voice Library, Filters & Parameters */}
          <div className="flex flex-col gap-4">
            {/* 2. Voice Selector, Filters, and Search */}
            <div className="surface-panel rounded-2xl p-4 border border-slate-150 flex flex-col gap-3">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block border-b border-slate-100 pb-1">
                2. Pencarian &amp; Pilih Suara
              </span>
              
              {/* Search and Filters Grid */}
              <div className="grid gap-2 sm:grid-cols-3">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Cari suara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="glass-input rounded-xl pl-8 pr-3 py-1.5 text-xs font-semibold w-full border border-slate-200"
                  />
                  <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
                </div>

                <select
                  value={genderFilter}
                  onChange={(e) => setGenderFilter(e.target.value)}
                  className="glass-input rounded-xl px-2 py-1.5 text-xs font-bold cursor-pointer border border-slate-200"
                >
                  <option value="Semua">Semua Gender</option>
                  <option value="Laki-laki">Laki-laki</option>
                  <option value="Perempuan">Perempuan</option>
                  <option value="Umum">Umum</option>
                </select>

                <select
                  value={langFilter}
                  onChange={(e) => setLangFilter(e.target.value)}
                  className="glass-input rounded-xl px-2 py-1.5 text-xs font-bold cursor-pointer border border-slate-200"
                >
                  <option value="Semua">Semua Bahasa</option>
                  {uniqueLanguages.map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                </select>
              </div>

              {/* Voices List Box */}
              <div className="border border-slate-150 rounded-xl p-2 bg-slate-50/50 max-h-[160px] overflow-y-auto flex flex-col gap-1.5">
                {filteredVoices.length === 0 ? (
                  <span className="text-[10px] text-slate-400 italic py-2 text-center">Tidak ada suara yang cocok</span>
                ) : (
                  filteredVoices.map((v) => {
                    const active = selectedVoice === v.name;
                    return (
                      <button
                        key={v.name}
                        onClick={() => {
                          setSelectedVoice(v.name);
                          setAudioUrl(null);
                          handleStop();
                          addLog(`[VOICE SELECTED] Beralih ke suara: ${v.name}`);
                        }}
                        className={`flex justify-between items-center px-3 py-2 rounded-xl text-left border transition-all ${
                          active
                            ? "bg-violet-600 border-violet-500 text-white font-black shadow-sm"
                            : "bg-white border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold"
                        }`}
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs truncate">{v.name}</span>
                          <span className={`text-[9px] uppercase tracking-widest ${active ? "text-violet-200" : "text-slate-400"}`}>
                            {v.style} &bull; {v.region}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                            active ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                          }`}>
                            {v.gender}
                          </span>
                          <span className={`text-[8.5px] font-bold ${active ? "text-violet-200" : "text-slate-500"}`}>
                            [{v.lang}]
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* 3. Audio Parameters Config */}
            <div className="surface-panel rounded-2xl p-4 border border-slate-150 flex flex-col gap-3">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block border-b border-slate-100 pb-1">
                3. Parameter Suara (Tuning)
              </span>
              <div className="grid gap-4 sm:grid-cols-3 text-[10px] font-bold text-slate-500">
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span>Speed / Speech Rate</span>
                    <span className="text-slate-900 font-black">{rate.toFixed(2)}x</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="2.0"
                    step="0.1"
                    value={rate}
                    onChange={(e) => setRate(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span>Pitch</span>
                    <span className="text-slate-900 font-black">{pitch.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.5"
                    max="1.5"
                    step="0.1"
                    value={pitch}
                    onChange={(e) => setPitch(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <div className="flex justify-between">
                    <span>Volume</span>
                    <span className="text-slate-900 font-black">{Math.round(volume * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.05"
                    value={volume}
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Audio Test & Modern Audio Player & Logs */}
          <div className="flex flex-col gap-4">
            {/* 4. Audio Generator & Modern Built-in Audio Player */}
            <div className="surface-panel rounded-2xl p-4 border border-slate-200 flex flex-col gap-3">
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block border-b border-slate-100 pb-1">
                4. Uji Suara &amp; Audio Player
              </span>
              
              <div className="flex flex-col gap-2">
                <textarea
                  placeholder="Ketik kalimat uji coba suara disini..."
                  value={testText}
                  onChange={(e) => setTestText(e.target.value)}
                  className="glass-input w-full rounded-xl p-2.5 text-xs font-semibold border border-slate-200 min-h-[50px] resize-none"
                />
                
                <button
                  type="button"
                  disabled={isGenerating || !selectedVoice}
                  onClick={handleTestVoice}
                  className={`w-full rounded-xl py-2.5 text-xs font-black uppercase flex items-center justify-center gap-1.5 shadow active:scale-[0.98] transition-all ${
                    isGenerating 
                      ? "bg-emerald-600 text-white animate-pulse" 
                      : "bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white"
                  }`}
                >
                  <RefreshCw size={13} className={isGenerating ? "animate-spin" : ""} />
                  {isGenerating ? "Membangun Suara..." : "Uji Suara"}
                </button>
              </div>

              {/* Errors container */}
              {genError && (
                <div className="bg-rose-50 border border-rose-200/50 p-2.5 rounded-xl flex items-start gap-2 text-rose-700 select-text">
                  <AlertTriangle size={15} className="mt-0.5 shrink-0" />
                  <div className="text-[9.5px] font-bold leading-normal">
                    <span className="block font-black uppercase tracking-wider text-[8px] text-rose-800">Generasi Gagal</span>
                    {genError}
                  </div>
                </div>
              )}

              {/* Modern Audio Player */}
              <div className="bg-slate-50 border border-slate-200/60 p-3 rounded-2xl flex flex-col gap-2">
                <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Built-in Player</span>
                  <span className={isPlaying ? "text-violet-600 animate-pulse font-black" : ""}>
                    {isPlaying ? "PLAYING" : "PAUSED"}
                  </span>
                </div>

                {/* Progress bar / Seek bar */}
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[9.5px] font-black text-slate-500 w-8">{currentTime.toFixed(1)}s</span>
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    step="0.05"
                    value={currentTime}
                    onChange={handleSeek}
                    disabled={!audioUrl && activeProvider !== 'browser'}
                    className="flex-grow h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-violet-600"
                  />
                  <span className="text-[9.5px] font-black text-slate-500 w-8 text-right">
                    {duration ? `${duration.toFixed(1)}s` : "-"}
                  </span>
                </div>

                {/* Player Controls buttons bar */}
                <div className="flex justify-center items-center gap-2.5 mt-2">
                  <button
                    type="button"
                    disabled={!audioUrl && activeProvider !== 'browser'}
                    onClick={handleReplay}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-650 hover:bg-slate-50 hover:text-slate-900 active:scale-95 transition-all disabled:opacity-40 shrink-0 shadow-sm"
                    title="Ulangi"
                  >
                    <RotateCcw size={13} />
                  </button>
                  <button
                    type="button"
                    disabled={!audioUrl && activeProvider !== 'browser'}
                    onClick={handlePlayPause}
                    className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-600 text-white hover:bg-violet-700 active:scale-95 transition-all disabled:opacity-40 shrink-0 shadow-md"
                    title={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
                  </button>
                  <button
                    type="button"
                    disabled={!audioUrl && activeProvider !== 'browser'}
                    onClick={handleStop}
                    className="flex h-8 w-8 items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-650 hover:bg-slate-50 hover:text-slate-900 active:scale-95 transition-all disabled:opacity-40 shrink-0 shadow-sm"
                    title="Stop"
                  >
                    <Square size={11} fill="currentColor" />
                  </button>
                  {audioUrl && (
                    <button
                      type="button"
                      onClick={handleDownload}
                      className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-950 active:scale-95 transition-all shrink-0 shadow-sm ml-4"
                      title="Unduh File Audio"
                    >
                      <Download size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* 5. Retro/Neon Terminal Log Output */}
            <div className="surface-panel rounded-2xl p-4 border border-slate-200 flex flex-col gap-2">
              <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1 text-slate-500">
                <Terminal size={12} />
                <span className="text-[10px] font-black uppercase tracking-wider">5. Pipeline Log Output</span>
              </div>
              <div className="bg-slate-950 text-sky-400 font-mono text-[9px] rounded-xl p-3 leading-relaxed max-h-[110px] overflow-y-auto select-text shadow-inner">
                {logs.length === 0 ? (
                  <span className="text-slate-500 italic">Belum ada aktivitas. Silakan mulai uji suara.</span>
                ) : (
                  logs.map((log, idx) => (
                    <div key={idx} className="border-b border-slate-900/40 pb-0.5 last:border-0 last:pb-0">
                      {log}
                    </div>
                  ))
                )}
                <div ref={logsEndRef} />
              </div>
            </div>
          </div>
        </div>

        {/* Closing Buttons */}
        <div className="flex justify-end border-t border-slate-100 pt-3">
          <button
            onClick={onClose}
            className="glass-button rounded-xl px-5 py-2 text-xs font-black uppercase shadow-sm"
          >
            Tutup Dashboard
          </button>
        </div>
      </div>
    </div>
  );
};
