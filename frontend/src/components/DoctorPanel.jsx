import React, { useContext, useState, useRef } from 'react';

import { AppContext } from '../context/AppContextObject';

import { MessageSquare, Zap, Send, Mic, MicOff } from 'lucide-react';



const PRESET_CATEGORIES = {

  "Salam": [

    "Halo, selamat pagi/siang.",

    "Apa keluhan utama Anda?",

    "Ada yang bisa saya bantu?"

  ],

  "Pemeriksaan": [

    "Silakan duduk.",

    "Silakan buka mulut Anda.",

    "Saya akan memeriksa tensi darah Anda.",

    "Silakan tarik napas dalam-dalam."

  ],

  "Obat": [

    "Apakah memiliki alergi obat?",

    "Ini resep obat untuk Anda.",

    "Obat ini diminum tiga kali sehari."

  ],

  "Riwayat Penyakit": [

    "Sudah berapa hari gejala ini dirasakan?",

    "Apakah sebelumnya pernah sakit seperti ini?",

    "Apakah nyeri bertambah parah?"

  ],

  "Instruksi": [

    "Silakan angkat tangan kanan Anda.",

    "Silakan berbaring di tempat tidur periksa.",

    "Tolong tunjukkan bagian mana yang sakit."

  ],

  "Penutupan": [

    "Terima kasih.",

    "Semoga lekas sembuh.",

    "Jika keluhan berlanjut, silakan kembali lagi."

  ]

};



export const DoctorPanel = ({ activeSessionId }) => {

  const { addLogEntry, showToast } = useContext(AppContext);

  const [customMsg, setCustomMsg] = useState("");

  const [activeCategory, setActiveCategory] = useState("Salam");

  const [isRecording, setIsRecording] = useState(false);

  const recognitionRef = useRef(null);



  const handleQuickPhrase = (phrase) => {

    addLogEntry({

      role: 'doctor',

      text: phrase

    }, activeSessionId);

  };



  const handleSendCustom = (e) => {

    if (e) e.preventDefault();

    const cleanMsg = customMsg.trim();

    if (!cleanMsg) return;

    addLogEntry({

      role: 'doctor',

      text: cleanMsg

    }, activeSessionId);

    setCustomMsg("");

  };



  const toggleVoiceRecording = () => {

    if (isRecording) {

      if (recognitionRef.current) {

        recognitionRef.current.stop();

      }

      setIsRecording(false);

    } else {

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

      if (!SpeechRecognition) {

        showToast("Browser Anda tidak mendukung Web Speech API untuk Speech-to-Text.", "error");

        return;

      }

      

      const rec = new SpeechRecognition();

      rec.lang = 'id-ID';

      rec.continuous = false;

      rec.interimResults = false;

      

      rec.onstart = () => {

        setIsRecording(true);

      };

      

      rec.onresult = async (event) => {
        const text = event.results[0][0].transcript;
        try {
          const apiBaseUrl = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
          const response = await fetch(
            `${apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl}/api/v1/nlg/simplify-speech`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text })
            }
          );
          if (response.ok) {
            const data = await response.json();
            setCustomMsg(data.simplified);
          } else {
            setCustomMsg(text);
          }
        } catch (err) {
          console.error("Gagal menyederhanakan suara dokter:", err);
          setCustomMsg(text);
        }
      };

      

      rec.onerror = (err) => {

        console.error("Speech recognition error:", err);

        setIsRecording(false);

      };

      

      rec.onend = () => {

        setIsRecording(false);

      };

      

      recognitionRef.current = rec;

      rec.start();

    }

  };



  return (

    <div className="glass-panel flex w-full flex-col gap-5 rounded-3xl p-6">

      <div className="flex items-center gap-2 border-b border-white/60 pb-3">

        <MessageSquare className="text-emerald-600" size={18} />

        <span className="text-sm font-black text-slate-950">Respon & Chat Dokter</span>

      </div>



      <form onSubmit={handleSendCustom} className="flex flex-col gap-2.5 border-b border-slate-100 pb-5">
        <label className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
          Pesan Kustom Dokter (Ketik atau Bicara)
        </label>
        <div className="flex gap-2 items-center">
          <input
            type="text"
            value={customMsg}
            onChange={(e) => setCustomMsg(e.target.value)}
            placeholder={isRecording ? "Mendengarkan suara Anda..." : "Ketik pesan medis Anda di sini..."}
            className="flex-1 rounded-xl border border-slate-200 bg-white/60 px-4 py-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
            disabled={isRecording}
          />
          
          {/* Mic Button to Toggle Speech-to-Text */}
          <button
            type="button"
            onClick={toggleVoiceRecording}
            title={isRecording ? "Matikan Perekaman Suara" : "Aktifkan Perekaman Suara (Speech-to-Text)"}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all ${
              isRecording 
                ? 'bg-red-500 border-red-400 text-white animate-pulse' 
                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            {isRecording ? <MicOff size={16} /> : <Mic size={16} />}
          </button>

          <button
            type="submit"
            disabled={!customMsg.trim() && !isRecording}
            className={`py-2.5 px-5 rounded-xl text-white font-black text-[11px] uppercase tracking-wider shadow-sm transition-all flex items-center gap-1.5 ${
              customMsg.trim() 
                ? 'bg-[#053D67] hover:bg-[#2e5799] active:scale-95' 
                : 'bg-slate-350 cursor-not-allowed opacity-60'
            }`}
          >
            <Send size={12} />
            Kirim
          </button>
        </div>

        {isRecording && (
          <span className="text-[9px] font-black text-red-500 uppercase tracking-wider animate-pulse flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
            Sedang mendengarkan suara Anda (Speech-to-Text aktif)... 
          </span>
        )}
      </form>



      {/* Preset Categories selection */}

      <div className="flex flex-col gap-3">

        <div className="flex items-center gap-2 text-xs font-black uppercase text-slate-600">

          <Zap size={14} className="text-amber-500" />

          Kategori Respon Cepat Medis (Preset)

        </div>

        

        {/* Category Tabs */}

        <div className="flex flex-wrap gap-1.5 select-none border-b border-slate-100 pb-2.5">

          {Object.keys(PRESET_CATEGORIES).map((cat) => {

            const active = activeCategory === cat;

            return (

              <button

                key={cat}

                type="button"

                onClick={() => setActiveCategory(cat)}

                className={`rounded-lg px-2.5 py-1 text-[9px] font-black uppercase tracking-wider transition-all active:scale-[0.97] ${

                  active

                    ? "bg-emerald-600 text-white shadow-sm border border-emerald-500/20"

                    : "bg-white/50 border border-slate-200/50 text-slate-600 hover:bg-white hover:text-slate-900"

                }`}

              >

                {cat}

              </button>

            );

          })}

        </div>



        {/* Phrases List for the active category */}

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 max-h-[180px] overflow-y-auto pr-1">

          {PRESET_CATEGORIES[activeCategory].map((phrase, idx) => (

            <button

              key={idx}

              onClick={() => handleQuickPhrase(phrase)}

              className="rounded-2xl border border-white/60 bg-white/40 px-4 py-2.5 text-left text-xs font-bold text-slate-700 transition-all hover:bg-white/75 active:scale-[0.98] truncate"

              title={phrase}

            >

              {phrase}

            </button>

          ))}

        </div>

      </div>

    </div>

  );

};

