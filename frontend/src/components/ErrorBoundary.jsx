import React from 'react';
import { AlertOctagon, RotateCcw, Home, Copy, Check, ShieldAlert, CloudOff, FileSearch } from 'lucide-react';

export class APIError extends Error {
  constructor(status, message) {
    super(message);
    this.name = 'APIError';
    this.status = status;
  }
}

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null, 
      errorInfo: null,
      copied: false 
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleGlobalError = (event) => {
    const msg = String(event?.message || event?.error?.message || '');
    if (msg.includes('Should have a queue') || msg.includes('ResizeObserver')) {
      console.warn('ErrorBoundary mengabaikan transient error:', msg);
      return;
    }
    if (event.error && !this.state.hasError) {
      console.error("ErrorBoundary caught global error:", event.error);
      this.setState({
        hasError: true,
        error: event.error,
        errorInfo: { componentStack: 'Async/Global Error: ' + event.message }
      });
    }
  };

  handlePromiseRejection = (event) => {
    const reason = event.reason;
    const msg = String(reason?.message || reason || '');
    const stack = String(reason?.stack || '');

    // Abaikan error non-fatal: permission clipboard, un-focused document, dan ekstensi browser
    if (
      msg.includes('writeText') ||
      msg.includes('Clipboard') ||
      msg.includes('NotAllowedError') ||
      stack.includes('chrome-extension://') ||
      stack.includes('copyTrackerBridge')
    ) {
      console.warn('ErrorBoundary mengabaikan error non-fatal clipboard/ekstensi browser:', reason);
      return;
    }

    if (!this.state.hasError) {
      console.error("ErrorBoundary caught unhandled rejection:", event.reason);
      const reason = event.reason;
      let errorInstance;
      if (reason instanceof Error) {
        errorInstance = reason;
      } else if (reason && typeof reason === 'object' && reason.status) {
        errorInstance = new APIError(reason.status, reason.message || 'Promise Rejection');
      } else {
        errorInstance = new Error(String(reason));
      }
      this.setState({
        hasError: true,
        error: errorInstance,
        errorInfo: { componentStack: 'Unhandled Promise Rejection: ' + (reason?.stack || String(reason)) }
      });
    }
  };

  componentDidMount() {
    window.addEventListener('error', this.handleGlobalError);
    window.addEventListener('unhandledrejection', this.handlePromiseRejection);
  }

  componentWillUnmount() {
    window.removeEventListener('error', this.handleGlobalError);
    window.removeEventListener('unhandledrejection', this.handlePromiseRejection);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null, copied: false });
    window.location.href = '/';
  };

  handleReload = () => {
    window.location.reload();
  };

  handleClearCache = () => {
    localStorage.clear();
    sessionStorage.clear();
    this.handleReload();
  };

  handleCopyError = () => {
    const errorText = `Error: ${this.state.error?.toString()}\nStatus Code: ${this.getErrorStatus()}\n\nStack Trace:\n${this.state.errorInfo?.componentStack || this.state.error?.stack || 'No stack trace available'}`;
    navigator.clipboard.writeText(errorText).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };

  getErrorStatus = () => {
    const { error } = this.state;
    if (!error) return null;
    if (error.status) return error.status;
    
    // Parse from error message if available
    const msg = error.message || '';
    if (msg.includes('404')) return 404;
    if (msg.includes('403')) return 403;
    if (msg.includes('401')) return 401;
    if (msg.includes('500')) return 500;
    if (msg.includes('503')) return 503;
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError') || msg.includes('Network Error')) return 'network';
    return null;
  };

  getErrorConfig = (status) => {
    switch (status) {
      case 404:
        return {
          title: '404 - Halaman / Data Tidak Ditemukan',
          desc: 'Resource yang Anda minta tidak tersedia di server.',
          icon: <FileSearch size={28} className="text-amber-500" />,
          bgColor: 'bg-amber-500/10 border-amber-500/30 text-amber-500'
        };
      case 401:
      case 403:
        return {
          title: '403 - Akses Ditolak',
          desc: 'Anda tidak memiliki izin/otorisasi untuk mengakses layanan ini.',
          icon: <ShieldAlert size={28} className="text-red-500" />,
          bgColor: 'bg-red-500/10 border-red-500/30 text-red-500'
        };
      case 500:
      case 502:
      case 503:
      case 504:
        return {
          title: `${status} - Gangguan Server`,
          desc: 'Backend FastAPI MedSign AI sedang mengalami kendala internal.',
          icon: <AlertOctagon size={28} className="text-rose-500" />,
          bgColor: 'bg-rose-500/10 border-rose-500/30 text-rose-500'
        };
      case 'network':
        return {
          title: 'Koneksi API Terputus',
          desc: 'Gagal terhubung ke API backend FastAPI (pastikan server FastAPI di port 8000 menyala).',
          icon: <CloudOff size={28} className="text-sky-500" />,
          bgColor: 'bg-sky-500/10 border-sky-500/30 text-sky-500'
        };
      default:
        return {
          title: 'Terjadi Kesalahan Sistem',
          desc: 'Aplikasi mengalami kesalahan runtime yang tidak terduga.',
          icon: <AlertOctagon size={28} className="text-rose-500" />,
          bgColor: 'bg-rose-500/10 border-rose-500/30 text-rose-500'
        };
    }
  };

  render() {
    if (this.state.hasError) {
      const status = this.getErrorStatus();
      const config = this.getErrorConfig(status);

      return (
        <div className="fixed inset-0 flex items-center justify-center p-4 select-none overflow-auto bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white z-[999999]">
          <div className="w-full max-w-2xl bg-white/5 border border-white/10 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-2xl flex flex-col gap-6 max-h-[90vh]">
            
            {/* Header / Icon based on Error Code */}
            <div className="flex items-center gap-4">
              <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border p-2.5 animate-pulse ${config.bgColor}`}>
                {config.icon}
              </span>
              <div>
                <h1 className="text-xl md:text-2xl font-black tracking-tight text-white">
                  {config.title}
                </h1>
                <p className="text-xs md:text-sm font-semibold text-slate-400">
                  {config.desc}
                </p>
              </div>
            </div>

            {/* Error Details */}
            <div className="flex flex-col gap-2 bg-slate-950/80 border border-white/5 rounded-2xl p-4 overflow-hidden">
              <div className="flex items-center justify-between gap-2 border-b border-white/5 pb-2">
                <span className="text-[10px] font-black text-rose-500 uppercase tracking-wider">
                  Detail Teknis (Code / Stack)
                </span>
                <button
                  onClick={this.handleCopyError}
                  className="flex items-center gap-1 text-[9px] font-black text-slate-400 hover:text-white uppercase transition-colors"
                >
                  {this.state.copied ? (
                    <>
                      <Check size={11} className="text-emerald-500" /> Disalin
                    </>
                  ) : (
                    <>
                      <Copy size={11} /> Salin Detail
                    </>
                  )}
                </button>
              </div>
              <div className="overflow-auto max-h-[150px] font-mono text-[10px] md:text-xs text-slate-300 whitespace-pre-wrap select-text leading-relaxed">
                {this.state.error && `${this.state.error.name}: ${this.state.error.message}\n`}
                {status && `Status Code: ${status}\n`}
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </div>
            </div>

            {/* Recommendations / Troubleshooting */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-2">
              <span className="text-[10px] font-black text-amber-500 uppercase tracking-wider">
                Langkah Troubleshooting
              </span>
              <ul className="text-xs font-semibold text-slate-300 list-disc list-inside space-y-1">
                {status === 'network' ? (
                  <>
                    <li>Periksa apakah backend FastAPI berjalan dengan perintah <code className="text-sky-300 font-mono">npm run dev:backend</code>.</li>
                    <li>Pastikan koneksi internet atau jaringan lokal Anda aktif.</li>
                  </>
                ) : status === 404 ? (
                  <>
                    <li>Gunakan menu navigasi untuk kembali ke halaman utama.</li>
                    <li>Periksa kembali alamat API pada konfigurasi jika Anda mengubahnya.</li>
                  </>
                ) : (
                  <>
                    <li>Muat ulang halaman browser Anda.</li>
                    <li>Jika terus berulang, bersihkan penyimpanan cache aplikasi lokal.</li>
                  </>
                )}
                <li>Laporkan detail teknis di atas ke tim developer jika perlu bantuan.</li>
              </ul>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-2">
              <button
                onClick={this.handleReload}
                className="flex items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/5 hover:bg-white/10 px-4 py-3 text-xs font-black uppercase text-white transition-all active:scale-[0.98]"
              >
                <RotateCcw size={14} /> Muat Ulang
              </button>
              
              <button
                onClick={this.handleClearCache}
                className="flex items-center justify-center gap-2 rounded-2xl border border-red-500/20 bg-red-500/5 hover:bg-red-500/10 px-4 py-3 text-xs font-black uppercase text-red-400 transition-all active:scale-[0.98]"
              >
                Hapus Cache
              </button>

              <button
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 rounded-2xl bg-sky-600 hover:bg-sky-700 px-4 py-3 text-xs font-black uppercase text-white transition-all active:scale-[0.98] shadow-lg shadow-sky-950/50"
              >
                <Home size={14} /> Ke Beranda
              </button>
            </div>

          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
