import React, { useState, useContext, useEffect } from 'react';
import { AppContext } from '../context/AppContextObject';
import { User, Stethoscope, Shield, Eye, EyeOff } from 'lucide-react';
import { AccessibilityPopup } from '../components/AccessibilityPopup';

export const Login = ({ setView, onLoginSuccess }) => {
  const { login, currentUser, showToast, setCurrentUser } = useContext(AppContext);
  const [showAccessibilityPopup, setShowAccessibilityPopup] = useState(false);

  useEffect(() => {
    const hasSeen = localStorage.getItem("medsign_accessibility_intro_seen");
    if (!hasSeen && !currentUser) {
      const timer = setTimeout(() => {
        setShowAccessibilityPopup(true);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [currentUser]);

  const handleCloseAccessibility = () => {
    setShowAccessibilityPopup(false);
  };

  const handleLearnMoreAccessibility = () => {
    localStorage.setItem("medsign_accessibility_intro_seen", "SEEN");
    setShowAccessibilityPopup(false);
    setView("manual");
  };
  const [role, setRole] = useState('doctor'); // 'doctor' | 'patient' | 'admin'
  const [emailOrNik, setEmailOrNik] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Password change state for first-time patient login
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  useEffect(() => {
    // If already logged in, redirect based on role
    if (currentUser) {
      if (currentUser.must_change_password && currentUser.role === 'patient') {
        setMustChangePassword(true);
      } else {
        redirectAfterLogin(currentUser.role);
      }
    }
  }, [currentUser]);

  const redirectAfterLogin = (userRole) => {
    const savedRedirect = localStorage.getItem('medsign_redirect_view');
    if (savedRedirect) {
      setView(savedRedirect);
      localStorage.removeItem('medsign_redirect_view');
    } else if (userRole === 'super_admin') {
      setView('super_admin');
    } else if (userRole === 'admin' || userRole === 'doctor') {
      setView('data-collection');
    } else {
      setView('patient');
    }
  };

  const handleGuestAccess = () => {
    const guestUser = { user_id: 'guest', role: 'guest', token: null, emailOrNik: 'tamu' };
    setCurrentUser(guestUser);
    localStorage.setItem('medsign_user', JSON.stringify(guestUser));
    const savedRedirect = localStorage.getItem('medsign_redirect_view');
    if (savedRedirect) {
      localStorage.removeItem('medsign_redirect_view');
      setView(savedRedirect);
    } else {
      setView('patient');
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!emailOrNik.trim() || !password.trim()) {
      showToast("Semua kolom harus diisi", "error");
      return;
    }

    if (role === 'patient' && emailOrNik.length !== 16) {
      showToast("NIK harus tepat 16 digit", "error");
      return;
    }

    setLoading(true);
    const res = await login(emailOrNik.trim(), password, role);
    setLoading(false);

    if (res.success) {
      if (res.user.must_change_password && res.user.role === 'patient') {
        setMustChangePassword(true);
      } else {
        redirectAfterLogin(res.user.role);
      }
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!newPassword.trim() || !confirmNewPassword.trim()) {
      showToast("Semua kolom password baru harus diisi", "error");
      return;
    }

    if (newPassword !== confirmNewPassword) {
      showToast("Password baru dan konfirmasi tidak cocok", "error");
      return;
    }

    if (newPassword.length < 6) {
      showToast("Password baru minimal 6 karakter", "error");
      return;
    }

    setChangingPassword(true);
    try {
      const apiBaseUrl = localStorage.getItem('medsign_api_url') || import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';
      const response = await fetch(`${apiBaseUrl.endsWith('/') ? apiBaseUrl.slice(0, -1) : apiBaseUrl}/api/v1/auth/patient/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentUser.token}`
        },
        body: JSON.stringify({
          old_password: password,
          new_password: newPassword
        })
      });

      if (response.ok) {
        showToast("Password berhasil diganti!", "success");
        // Update user state locally
        const updatedUser = { ...currentUser, must_change_password: false };
        localStorage.setItem('medsign_user', JSON.stringify(updatedUser));
        setMustChangePassword(false);
        setView('patient');
      } else {
        const err = await response.json();
        showToast(err.detail || "Gagal mengganti password", "error");
      }
    } catch (err) {
      showToast("Koneksi gagal saat memperbarui password", "error");
    } finally {
      setChangingPassword(false);
    }
  };

  // If patient needs to change password on first login
  if (mustChangePassword) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
        <div className="glass-panel w-full max-w-md rounded-3xl p-6 md:p-8 border border-white/60 shadow-xl flex flex-col gap-5 animate-slide-up">
          <div className="text-center">
            <span className="text-[10px] font-black uppercase text-amber-700 tracking-wider">Keamanan Akun</span>
            <h2 className="text-xl font-black text-slate-950 mt-1">Ganti Password Pertama Kali</h2>
            <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-500">
              Demi keamanan data medis Anda, Anda diwajibkan mengganti password sementara yang digenerate oleh sistem sebelum dapat melihat histori.
            </p>
          </div>

          <form onSubmit={handleChangePassword} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Password Baru</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white/60 px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="Masukkan password baru"
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Konfirmasi Password Baru</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full rounded-2xl border border-slate-200 bg-white/60 px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                  placeholder="Ulangi password baru"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-[10px] font-black text-sky-600 uppercase flex items-center gap-1.5"
              >
                {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                {showPassword ? "Sembunyikan" : "Tampilkan Password"}
              </button>
            </div>

            <button
              type="submit"
              disabled={changingPassword}
              className="w-full py-2.5 rounded-2xl bg-sky-600 text-white font-black text-[11px] uppercase tracking-wider shadow-md hover:bg-sky-700 active:scale-95 transition-all mt-2 disabled:opacity-40"
            >
              {changingPassword ? "Menyimpan..." : "Perbarui Password & Masuk"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-12">
      <div className="glass-panel w-full max-w-md rounded-3xl p-6 md:p-8 border border-white/60 shadow-xl flex flex-col gap-6 animate-slide-up">
        
        {/* Header */}
        <div className="text-center">
          <span className="text-[10px] font-black uppercase text-sky-700 tracking-wider">Akses Portal MedSign</span>
          <h2 className="text-2xl font-black text-slate-950 mt-1">Masuk ke Akun Anda</h2>
          <p className="mt-2 text-xs font-semibold leading-relaxed text-slate-500">
            Pilih peran Anda dan masukkan kredensial untuk mengakses rekam medis atau dashboard klinis.
          </p>
        </div>

        {/* Role Tabs */}
        <div className="flex items-center gap-1 rounded-2xl bg-slate-900/10 p-1 backdrop-blur-xl border border-white/50 shadow-sm">
          <button
            type="button"
            onClick={() => { setRole('doctor'); setEmailOrNik(''); setPassword(''); }}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-black transition-all ${
              role === 'doctor' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500 hover:text-slate-950'
            }`}
          >
            <Stethoscope size={13} />
            Dokter
          </button>
          


          <button
            type="button"
            onClick={() => { setRole('admin'); setEmailOrNik(''); setPassword(''); }}
            className={`flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-black transition-all ${
              role === 'admin' ? 'bg-white text-sky-700 shadow-sm' : 'text-slate-500 hover:text-slate-950'
            }`}
          >
            <Shield size={13} />
            Admin
          </button>
        </div>

        {/* Input Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wide">
              {role === 'admin' ? "Username Admin" : "Email Dokter"}
            </label>
            <div className="relative">
              <input
                type="text"
                value={emailOrNik}
                onChange={(e) => {
                  const val = e.target.value;
                  if (role === 'patient') {
                    // Only allow digits up to 16 length
                    if (/^\d*$/.test(val) && val.length <= 16) {
                      setEmailOrNik(val);
                    }
                  } else {
                    setEmailOrNik(val);
                  }
                }}
                className="w-full rounded-2xl border border-slate-200 bg-white/60 px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder={role === 'admin' ? "Masukkan username admin" : "Masukkan email terdaftar"}
                required
              />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Kata Sandi</label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white/60 px-4 py-2.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
                placeholder="Masukkan kata sandi Anda"
                required
              />
            </div>
          </div>

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-[10px] font-black text-sky-600 uppercase flex items-center gap-1.5"
            >
              {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
              {showPassword ? "Sembunyikan" : "Tampilkan Sandi"}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-2xl bg-sky-600 text-white font-black text-[11px] uppercase tracking-wider shadow-md hover:bg-sky-700 active:scale-95 transition-all mt-2 disabled:opacity-40"
          >
            {loading ? "Menghubungkan..." : "Masuk ke Sistem"}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-px bg-slate-200" />
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">atau lanjut sebagai tamu</span>
          <div className="flex-1 h-px bg-slate-200" />
        </div>

        {/* Guest access button */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => handleGuestAccess()}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-2xl border border-sky-200 bg-sky-50 text-sky-700 font-black text-[11px] uppercase tracking-wide hover:bg-sky-100 hover:border-sky-300 active:scale-95 transition-all"
          >
            <User size={13} />
            Masuk Sebagai Tamu
          </button>
        </div>

        <p className="text-center text-[9.5px] font-semibold text-slate-400 leading-relaxed -mt-1">
          Mode tamu tidak menyimpan histori sesi. Login untuk akses penuh.
        </p>
      </div>
    </div>
  );
};
