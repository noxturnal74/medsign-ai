import React, { useState, useEffect } from 'react';
import { KeyRound, ShieldCheck, Save, RefreshCw, Building2, Stethoscope, UserCog, Search } from 'lucide-react';

const GRANT_DEFS = [
  { key: 'record_dataset',   label: 'Rekam Dataset',    desc: 'Merekam & mengelola sampel landmark BISINDO.' },
  { key: 'balance_checker',  label: 'Balance Checker',  desc: 'Melihat peta keseimbangan dataset per kata.' },
  { key: 'ai_augmentation',  label: 'AI Augmentation',  desc: 'Men-generate augmentasi data spasial & AI.' },
  { key: 'train_model',      label: 'Training Model',   desc: 'Melatih ulang model neural default website.' },
];

const roleMeta = {
  super_admin: { label: 'Super Admin', icon: ShieldCheck, cls: 'bg-rose-100 text-rose-700 border-rose-200' },
  admin:       { label: 'Admin Faskes', icon: UserCog,    cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  doctor:      { label: 'Dokter',       icon: Stethoscope, cls: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
};

const Toggle = ({ on, onClick, disabled }) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all ${on ? 'bg-sky-600' : 'bg-slate-300'} ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
  >
    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-6' : 'translate-x-1'}`} />
  </button>
);

export const GrantsManager = ({ apiBaseUrl, token, showToast }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all'); // 'all' | 'admin' | 'doctor'
  const [grantFilter, setGrantFilter] = useState('all'); // 'all' | per grant key (hanya yang aktif)

  const fetchGrants = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/superadmin/grants`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (e) {
      showToast('Gagal memuat daftar grant', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGrants(); }, []);

  const toggleGrant = (userId, key) => {
    setUsers(prev => prev.map(u => u.user_id === userId
      ? { ...u, grants: { ...u.grants, [key]: !u.grants[key] } }
      : u
    ));
  };

  const saveUser = async (user) => {
    setSavingId(user.user_id);
    try {
      const res = await fetch(`${apiBaseUrl}/api/v1/superadmin/grants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ user_id: user.user_id, grants: user.grants })
      });
      if (res.ok) {
        showToast(`Grant ${user.name} berhasil disimpan`, 'success');
      } else {
        showToast('Gagal menyimpan grant', 'error');
      }
    } catch (e) {
      showToast('Gagal terhubung ke server', 'error');
    } finally {
      setSavingId(null);
    }
  };

  // Super admin is excluded (always has everything)
  const manageable = users.filter(u => {
    if (u.role === 'super_admin') return false;
    if (roleFilter !== 'all' && u.role !== roleFilter) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = (u.name || '').toLowerCase().includes(q)
        || (u.email || '').toLowerCase().includes(q)
        || (u.facility_name || '').toLowerCase().includes(q);
      if (!match) return false;
    }
    if (grantFilter !== 'all' && !u.grants[grantFilter]) return false;
    return true;
  });

  return (
    <div className="flex flex-col gap-5 animate-slide-up">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xs font-black uppercase text-slate-400 tracking-wider">Manajemen Grant Fitur</h2>
          <p className="text-[11px] font-semibold text-slate-400 mt-1">
            Berikan atau cabut akses fitur ML/Dataset ke Admin & Dokter. Super Admin selalu memiliki akses penuh.
          </p>
        </div>
        <button
          onClick={fetchGrants}
          className="flex items-center gap-1.5 px-4 py-2.5 text-xs font-black bg-white border border-slate-200 text-slate-700 rounded-2xl hover:bg-slate-50 transition-all shadow-sm active:scale-95"
        >
          <RefreshCw size={12} /> Segarkan
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama, email, atau faskes..."
            className="w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 py-2.5 text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/40 focus:border-sky-400 shadow-sm"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-400/40 shadow-sm"
        >
          <option value="all">Semua Peran</option>
          <option value="admin">Admin Faskes</option>
          <option value="doctor">Dokter</option>
        </select>
        <select
          value={grantFilter}
          onChange={(e) => setGrantFilter(e.target.value)}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-400/40 shadow-sm"
        >
          <option value="all">Semua Grant</option>
          {GRANT_DEFS.map(g => (
            <option key={g.key} value={g.key}>Punya: {g.label}</option>
          ))}
        </select>
      </div>

      {!loading && (
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          Menampilkan {manageable.length} dari {users.filter(u => u.role !== 'super_admin').length} pengguna
        </p>
      )}

      {loading ? (
        <div className="text-center py-10 text-slate-400 text-xs font-semibold">Memuat daftar pengguna…</div>
      ) : manageable.length === 0 ? (
        <div className="text-center py-10 text-slate-400 text-xs font-semibold">
          {users.filter(u => u.role !== 'super_admin').length === 0
            ? 'Tidak ada Admin/Dokter untuk dikelola.'
            : 'Tidak ada pengguna yang cocok dengan pencarian/filter.'}
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {manageable.map(u => {
            const meta = roleMeta[u.role] || roleMeta.admin;
            const Icon = meta.icon;
            const grantedCount = GRANT_DEFS.filter(g => u.grants[g.key]).length;
            return (
              <div key={u.user_id} className="bg-white rounded-[24px] border border-slate-200 shadow-sm p-5 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-600">
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-slate-900 leading-tight">{u.name}</p>
                      <p className="text-[10px] font-semibold text-slate-400">{u.email}</p>
                    </div>
                  </div>
                  <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full border ${meta.cls}`}>{meta.label}</span>
                </div>

                {u.facility_name && (
                  <p className="text-[10px] font-bold text-slate-500 flex items-center gap-1.5">
                    <Building2 size={12} /> {u.facility_name}
                  </p>
                )}

                <div className="flex flex-col gap-2.5">
                  {GRANT_DEFS.map(g => (
                    <div key={g.key} className="flex items-center justify-between gap-3 bg-slate-50 rounded-xl px-3 py-2.5 border border-slate-100">
                      <div className="min-w-0">
                        <p className="text-[11px] font-black text-slate-800">{g.label}</p>
                        <p className="text-[9px] font-semibold text-slate-400 truncate">{g.desc}</p>
                      </div>
                      <Toggle on={!!u.grants[g.key]} onClick={() => toggleGrant(u.user_id, g.key)} />
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-[10px] font-bold text-slate-400">
                    {grantedCount}/{GRANT_DEFS.length} fitur aktif
                  </span>
                  <button
                    onClick={() => saveUser(u)}
                    disabled={savingId === u.user_id}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#053D67] text-white text-[10px] font-black uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all disabled:opacity-50"
                  >
                    {savingId === u.user_id ? <RefreshCw size={12} className="animate-spin" /> : <Save size={12} />}
                    Simpan
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="p-4 bg-sky-50 rounded-2xl border border-sky-100 flex items-start gap-3 text-[11px] font-semibold text-slate-600 leading-relaxed">
        <KeyRound size={16} className="text-sky-600 mt-0.5 shrink-0" />
        <span>
          Fitur yang di-grant akan mengaktifkan menu <strong>Dashboard</strong> beserta tab <strong>Rekam Dataset</strong>,
          <strong> Balance Checker</strong>, <strong>AI Augmentation</strong>, dan <strong>Training Model</strong> pada akun Admin/Dokter tersebut.
          Default untuk Admin & Dokter adalah <strong>non-aktif</strong> (harus di-grant oleh Super Admin).
        </span>
      </div>
    </div>
  );
};
