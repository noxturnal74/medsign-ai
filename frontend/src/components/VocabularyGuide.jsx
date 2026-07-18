import React, { useContext, useMemo, useState } from 'react';
import { AppContext } from '../context/AppContext';
import { AlertTriangle, CheckCircle2, ClipboardList, HeartPulse, MapPin, Search, Stethoscope, MessageSquare, Wind, Heart, Droplet, Bone, AlertCircle, HelpCircle, Activity, FileText, Users } from 'lucide-react';

export const CATEGORY_META = {
  Semua: {
    icon: ClipboardList,
    tone: 'text-slate-600',
    bg: 'bg-slate-100/80 border-slate-200 text-slate-700 hover:bg-slate-200/80',
    active: 'bg-slate-700 border-slate-800 text-white shadow-inner'
  },
  'Kategori Umum & Kata Interaksi': {
    icon: MessageSquare,
    tone: 'text-sky-600',
    bg: 'bg-sky-50 border-sky-200 text-sky-700 hover:bg-sky-100',
    active: 'bg-sky-600 border-sky-700 text-white shadow-inner'
  },
  'Sistem Pernapasan': {
    icon: Wind,
    tone: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100',
    active: 'bg-blue-600 border-blue-700 text-white shadow-inner'
  },
  'Hipertensi / Kardiovaskular': {
    icon: Heart,
    tone: 'text-rose-600',
    bg: 'bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100',
    active: 'bg-rose-600 border-rose-700 text-white shadow-inner'
  },
  'Diabetes Mellitus Tipe 2': {
    icon: Droplet,
    tone: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200 text-amber-700 hover:bg-amber-100',
    active: 'bg-amber-600 border-amber-700 text-white shadow-inner'
  },
  'Gangguan Muskuloskeletal': {
    icon: Bone,
    tone: 'text-stone-600',
    bg: 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-stone-100',
    active: 'bg-stone-600 border-stone-700 text-white shadow-inner'
  },
  'Neoplasma / Tumor & Kanker': {
    icon: AlertCircle,
    tone: 'text-purple-600',
    bg: 'bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100',
    active: 'bg-purple-600 border-purple-700 text-white shadow-inner'
  },
  'Gejala Tambahan & Instruksi Medis': {
    icon: Stethoscope,
    tone: 'text-teal-600',
    bg: 'bg-teal-50 border-teal-200 text-teal-700 hover:bg-teal-100',
    active: 'bg-teal-600 border-teal-700 text-white shadow-inner'
  },
  'Kata Tanya': {
    icon: HelpCircle,
    tone: 'text-indigo-600',
    bg: 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100',
    active: 'bg-indigo-600 border-indigo-700 text-white shadow-inner'
  },
  'Komunikasi Dasar': {
    icon: MessageSquare,
    tone: 'text-emerald-600',
    bg: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100',
    active: 'bg-emerald-600 border-emerald-700 text-white shadow-inner'
  },
  'Fasilitas & Tindakan Medis': {
    icon: Activity,
    tone: 'text-indigo-600',
    bg: 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100',
    active: 'bg-indigo-600 border-indigo-700 text-white shadow-inner'
  },
  'Bagian Tubuh': {
    icon: MapPin,
    tone: 'text-violet-600',
    bg: 'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100',
    active: 'bg-violet-600 border-violet-700 text-white shadow-inner'
  },
  'Gejala Tambahan': {
    icon: HeartPulse,
    tone: 'text-red-600',
    bg: 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100',
    active: 'bg-red-600 border-red-700 text-white shadow-inner'
  },
  'Obat & Pengobatan': {
    icon: Droplet,
    tone: 'text-pink-600',
    bg: 'bg-pink-50 border-pink-200 text-pink-700 hover:bg-pink-100',
    active: 'bg-pink-600 border-pink-700 text-white shadow-inner'
  },
  'Pemeriksaan Medis': {
    icon: FileText,
    tone: 'text-cyan-600',
    bg: 'bg-cyan-50 border-cyan-200 text-cyan-700 hover:bg-cyan-100',
    active: 'bg-cyan-600 border-cyan-700 text-white shadow-inner'
  },
  'Kondisi Pasien': {
    icon: Users,
    tone: 'text-lime-600',
    bg: 'bg-lime-50 border-lime-200 text-lime-700 hover:bg-lime-100',
    active: 'bg-lime-600 border-lime-700 text-white shadow-inner'
  },
  'Komunikasi Rumah Sakit': {
    icon: Users,
    tone: 'text-slate-600',
    bg: 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100',
    active: 'bg-slate-600 border-slate-700 text-white shadow-inner'
  }
};

const WORD_DESCRIPTIONS = {
  sakit: 'Rasa nyeri atau tidak nyaman',
  nyeri: 'Rasa perih atau panas tajam',
  sesak: 'Napas terasa berat atau pendek',
  batuk: 'Mengeluarkan lendir atau dahak',
  demam: 'Suhu badan tinggi panas',
  pusing: 'Kepala berputar atau kleyengan',
  mual: 'Perut kembung ingin muntah',
  muntah: 'Mengeluarkan makanan dari lambung',
  diare: 'BAB cair terus menerus',
  lemas: 'Tidak bertenaga atau kelelahan',
  kepala: 'Bagian atas tubuh',
  dada: 'Bagian paru-paru atau jantung',
  perut: 'Bagian organ pencernaan',
  tenggorokan: 'Saluran leher dalam',
  tangan: 'Bagian telapak atau lengan',
  kaki: 'Bagian paha atau telapak bawah',
  punggung: 'Bagian belakang tubuh',
  mata: 'Indra penglihatan',
  telinga: 'Indra pendengaran',
  leher: 'Bagian penyangga kepala',
  ya: 'Setuju atau konfirmasi',
  tidak: 'Menolak atau bantah',
  'sakit sekali': 'Nyeri skala ekstrim',
  'lebih baik': 'Kondisi tubuh membaik',
  'lebih buruk': 'Kondisi memburuk',
  tolong: 'Meminta pertolongan segera',
  'tidak bisa bernapas': 'Sesak napas darurat',
  'nyeri dada': 'Nyeri bagian jantung mendesak',
  pingsan: 'Hampir atau kehilangan kesadaran',
  'bantuan segera': 'Kondisi UGD mendesak',
  'buka mulut': 'Membuka rongga mulut',
  'tarik napas': 'Menghirup udara dalam',
  'tahan napas': 'Menahan aliran udara',
  duduk: 'Silakan duduk',
  berdiri: 'Silakan berdiri'
};

export const VocabularyGuide = () => {
  const { vocabulary, appendWord, addLogEntry } = useContext(AppContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('Semua');

  const categories = useMemo(() => {
    const cats = new Set(vocabulary.map((w) => w.category));
    return ['Semua', ...Array.from(cats)];
  }, [vocabulary]);

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
      confidence: 1.0
    });
  };

  return (
    <div className="glass-panel flex w-full flex-col gap-4 rounded-3xl p-5">
      <div className="flex flex-col justify-between gap-4 border-b border-white/60 pb-4 md:flex-row md:items-center">
        <div>
          <span className="text-sm font-black text-slate-950">Panduan & Pintasan Kosakata Medis</span>
          <p className="mt-1 text-[11px] font-semibold text-slate-500">
            Klik kosakata manual jika kamera terhalang atau gerakan tidak terdeteksi.
          </p>
        </div>

        <div className="relative w-full max-w-md">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kata, misalnya sakit atau sesak"
            className="glass-input w-full rounded-2xl py-2 pl-10 pr-4 text-xs font-semibold"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck="false"
          />
          <Search className="absolute left-3.5 top-2.5 text-slate-500" size={14} />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 pb-2">
        {categories.map((cat) => {
          const meta = CATEGORY_META[cat] || CATEGORY_META.Semua;
          const Icon = meta.icon;
          const active = activeCategory === cat;

          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-all ${
                active
                  ? 'border-sky-300/60 bg-white text-sky-700 shadow-sm'
                  : 'border-white/60 bg-white/40 text-slate-600 hover:bg-white/70'
              }`}
            >
              <Icon size={13} className={active ? 'text-sky-600' : meta.tone} />
              {cat}
            </button>
          );
        })}
      </div>

      <div className="grid max-h-[300px] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3 xl:grid-cols-4">
        {filteredVocabulary.length === 0 ? (
          <div className="col-span-full py-8 text-center text-xs font-semibold text-slate-500">
            Kosakata tidak ditemukan.
          </div>
        ) : (
          filteredVocabulary.map((item) => {
            const meta = CATEGORY_META[item.category] || CATEGORY_META.Semua;
            const Icon = item.emergency ? AlertTriangle : meta.icon;

            return (
              <button
                key={item.id}
                onClick={() => handleWordClick(item)}
                title={WORD_DESCRIPTIONS[item.word] || item.word}
                className={`group flex items-center gap-2.5 overflow-hidden rounded-2xl border px-3 py-2 h-[52px] text-left transition-all active:scale-[0.98] ${
                  item.emergency
                    ? 'border-red-300/60 bg-red-500/10 hover:bg-red-500/20'
                    : 'border-white/60 bg-white/40 hover:bg-white/70'
                }`}
              >
                <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border bg-white/60 transition-transform group-hover:scale-105 ${
                  item.emergency ? 'border-red-300/50 text-red-600' : `border-white/70 ${meta.tone}`
                }`}>
                  <Icon size={16} />
                </span>

                <div className="flex min-w-0 flex-col justify-center">
                  <span className={`truncate text-[11px] font-black uppercase leading-tight ${
                    item.emergency ? 'text-red-700' : 'text-slate-800'
                  }`}>
                    {item.word}
                  </span>
                  <span className="mt-0.5 truncate text-[9px] font-semibold uppercase text-slate-500 leading-tight">
                    {item.category}
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
};
