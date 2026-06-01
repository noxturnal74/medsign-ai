import React, { useState, useContext, useMemo } from 'react';
import { AppContext } from '../context/AppContext';
import { Search, Info, HelpCircle } from 'lucide-react';

const CATEGORY_ICONS = {
  "Keluhan": "🤕",
  "Lokasi Tubuh": "🫁",
  "Respons": "✅",
  "Darurat": "🆘",
  "Instruksi Dokter": "🩺"
};

const WORD_EMOJIS = {
  "sakit": "🤕", "nyeri": "⚡", "sesak": "🫁", "batuk": "😷", "demam": "🌡️",
  "pusing": "🌀", "mual": "🤢", "muntah": "🤮", "diare": "🚽", "lemas": "😴",
  "kepala": "🧠", "dada": "👤", "perut": "🤰", "tenggorokan": "👄", "tangan": "✋",
  "kaki": "🦵", "punggung": "🔙", "mata": "👁️", "telinga": "👂", "leher": "🧣",
  "ya": "✅", "tidak": "❌", "sakit sekali": "🥵", "lebih baik": "📈", "lebih buruk": "📉",
  "tolong": "🆘", "tidak bisa bernapas": "😮‍💨", "nyeri dada": "💔", "pingsan": "😵", "bantuan segera": "🚨",
  "buka mulut": "😮", "tarik napas": "🌬️", "tahan napas": "⏱️", "duduk": "🪑", "berdiri": "🚶"
};

const WORD_DESCRIPTIONS = {
  "sakit": "Rasa nyeri/tidak nyaman",
  "nyeri": "Rasa perih/panas tajam",
  "sesak": "Napas terasa berat/pendek",
  "batuk": "Mengeluarkan lendir/dahak",
  "demam": "Suhu badan tinggi panas",
  "pusing": "Kepala berputar/kleyengan",
  "mual": "Perut kembung ingin muntah",
  "muntah": "Mengeluarkan makanan dari lambung",
  "diare": "BAB cair terus menerus",
  "lemas": "Tidak bertenaga/kelelahan",
  "kepala": "Bagian atas tubuh",
  "dada": "Bagian paru-paru/jantung",
  "perut": "Bagian organ pencernaan",
  "tenggorokan": "Saluran leher dalam",
  "tangan": "Bagian telapak/lengan",
  "kaki": "Bagian paha/telapak bawah",
  "punggung": "Bagian belakang tubuh",
  "mata": "Indra penglihatan",
  "telinga": "Indra pendengaran",
  "leher": "Bagian penyangga kepala",
  "ya": "Setuju/Konfirmasi",
  "tidak": "Menolak/Bantah",
  "sakit sekali": "Nyeri skala ekstrim",
  "lebih baik": "Kondisi tubuh membaik",
  "more buruk": "Kondisi memburuk",
  "tolong": "Meminta pertolongan segera",
  "tidak bisa bernapas": "Sesak napas darurat",
  "nyeri dada": "Nyeri bagian jantung mendesak",
  "pingsan": "Hampir/kehilangan kesadaran",
  "bantuan segera": "Kondisi UGD mendesak",
  "buka mulut": "Membuka rongga mulut",
  "tarik napas": "Menghirup udara dalam",
  "tahan napas": "Menahan aliran udara",
  "duduk": "Silakan duduk",
  "berdiri": "Silakan berdiri"
};

export const VocabularyGuide = () => {
  const { vocabulary, appendWord, addLogEntry } = useContext(AppContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Semua');

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = new Set(vocabulary.map((w) => w.category));
    return ['Semua', ...Array.from(cats)];
  }, [vocabulary]);

  // Filtered vocabulary list
  const filteredVocabulary = useMemo(() => {
    return vocabulary.filter((w) => {
      const matchesSearch = w.word.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'Semua' || w.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [vocabulary, searchQuery, activeCategory]);

  const handleWordClick = (item) => {
    appendWord(item.word);
    addLogEntry({
      role: 'patient',
      text: item.word.toUpperCase(),
      emoji: WORD_EMOJIS[item.word] || '🤟',
      confidence: 1.0 // Manual click has absolute confidence
    });
  };

  return (
    <div className="w-full flex flex-col gap-4 glass-panel p-5 rounded-2xl border border-slate-800">
      
      {/* Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
        <div>
          <span className="font-bold text-sm tracking-wide text-slate-200">Panduan & Jalan Pintas Kosakata Medis</span>
          <p className="text-[10px] text-slate-500 font-mono tracking-wide mt-0.5">
            Klik kosakata manual jika kamera terhalang atau gerakan tidak terdeteksi
          </p>
        </div>

        {/* Search Input */}
        <div className="relative max-w-md w-full">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kata (contoh: sakit, sesak)..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-sky-500/50"
          />
          <Search className="absolute left-3.5 top-2.5 text-slate-600" size={14} />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scroll-tabs">
        {categories.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
              activeCategory === cat
                ? 'bg-sky-500/10 text-sky-400 border-sky-500/30 font-bold shadow-md shadow-sky-950/10'
                : 'bg-slate-950/50 text-slate-400 border-slate-900 hover:text-slate-200'
            }`}
          >
            <span className="mr-1">{CATEGORY_ICONS[cat] || '📋'}</span>
            {cat}
          </button>
        ))}
      </div>

      {/* Word Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 max-h-[300px] overflow-y-auto pr-1">
        {filteredVocabulary.length === 0 ? (
          <div className="col-span-full py-8 text-center text-slate-600 text-xs font-mono">
            Kosakata tidak ditemukan.
          </div>
        ) : (
          filteredVocabulary.map((item) => (
            <button
              key={item.id}
              onClick={() => handleWordClick(item)}
              title={WORD_DESCRIPTIONS[item.word] || item.word}
              className={`group flex items-center gap-2 p-3 rounded-xl border bg-slate-950/40 hover:bg-slate-900 transition-all text-left overflow-hidden text-ellipsis whitespace-nowrap active:scale-[0.97] cursor-pointer hover:border-slate-700 ${
                item.emergency 
                  ? 'border-red-950 bg-red-950/5 hover:border-red-500/30' 
                  : 'border-slate-900'
              }`}
            >
              {/* Emoji */}
              <span className="text-lg bg-slate-900/60 w-8 h-8 rounded-lg flex items-center justify-center border border-slate-800 group-hover:scale-105 transition-all">
                {WORD_EMOJIS[item.word] || '🤟'}
              </span>

              {/* Text */}
              <div className="flex flex-col overflow-hidden">
                <span className={`text-[11px] font-bold uppercase tracking-wide truncate ${
                  item.emergency ? 'text-red-400 font-extrabold' : 'text-slate-200'
                }`}>
                  {item.word}
                </span>
                <span className="text-[8px] font-mono text-slate-500 tracking-wider uppercase mt-0.5 truncate">
                  {item.category}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};
