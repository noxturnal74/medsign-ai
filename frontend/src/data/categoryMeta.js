import { 
  ClipboardList, MessageSquare, Wind, Heart, Droplet, Bone, 
  AlertCircle, HelpCircle, Activity, FileText, Users, MapPin, HeartPulse, Stethoscope 
} from 'lucide-react';

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
