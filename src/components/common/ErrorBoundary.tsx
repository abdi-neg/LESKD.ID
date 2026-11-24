import React from 'react';
import { RefreshCw, AlertTriangle, Home } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

function clearStaleAppCache() {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      // Pertahankan sesi login Supabase (sb-*) agar pengguna tidak perlu login ulang
      if (key.startsWith('sb-')) continue;
      if (
        key.startsWith('leskd_') ? true :
        key.startsWith('exam_') ? true :
        key.includes('snapshot') ? true :
        key.includes('review')
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
    sessionStorage.clear();
  } catch {
    // Abaikan jika browser membatasi akses storage
  }
}

export default class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      errorMessage: error?.message ? error.message : 'Terjadi kendala pembaruan tampilan.',
    };
  }

  componentDidCatch(error: Error) {
    console.error('LESKD ErrorBoundary menangkap error:', error);

    // Coba pemulihan otomatis maksimal 1 kali jika disebabkan update file/chunk Vercel
    const alreadyTried = sessionStorage.getItem('leskd_eb_auto_reloaded');
    if (!alreadyTried) {
      sessionStorage.setItem('leskd_eb_auto_reloaded', '1');
      clearStaleAppCache();
      window.location.reload();
    }
  }

  handleManualRecover = () => {
    clearStaleAppCache();
    window.location.href = '/dashboard';
  };

  handleHardRefresh = () => {
    clearStaleAppCache();
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
          <div className="bg-white rounded-3xl shadow-xl border border-slate-100 p-8 max-w-md w-full text-center space-y-5">
            <div className="w-16 h-16 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
            </div>

            <div>
              <h1 className="text-xl font-black text-slate-800 mb-2">
                Aplikasi Baru Diperbarui
              </h1>
              <p className="text-sm text-slate-500 leading-relaxed">
                Tampilan lama di browser Anda perlu disegarkan agar sesuai dengan pembaruan terbaru LESKD.ID. Data nilai dan akun Anda tetap aman.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleHardRefresh}
                className="w-full py-3.5 px-5 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors shadow-sm"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Perbaiki & Muat Ulang</span>
              </button>

              <button
                type="button"
                onClick={this.handleManualRecover}
                className="w-full py-3 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <Home className="w-4 h-4" />
                <span>Kembali ke Dashboard</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
