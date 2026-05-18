import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Key, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { ExamPackage } from '../../types';

interface Props {
  pkg: ExamPackage;
  onSuccess: () => void;
  onClose: () => void;
}

const PKG_COLORS: Record<string, { bg: string; text: string; light: string }> = {
  MINI_TIU: { bg: 'bg-blue-600', text: 'text-blue-700', light: 'bg-blue-50' },
  MINI_TWK: { bg: 'bg-emerald-600', text: 'text-emerald-700', light: 'bg-emerald-50' },
  MINI_TKP: { bg: 'bg-rose-600', text: 'text-rose-700', light: 'bg-rose-50' },
  FULL: { bg: 'bg-[#1e3a8a]', text: 'text-[#1e3a8a]', light: 'bg-blue-50' },
};

export default function TokenGate({ pkg, onSuccess, onClose }: Props) {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verified, setVerified] = useState(false);

  const colors = PKG_COLORS[pkg.package_type] ?? PKG_COLORS.FULL;

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    await new Promise((r) => setTimeout(r, 600));

    if (token.trim() === pkg.token) {
      setVerified(true);
      setTimeout(onSuccess, 900);
    } else {
      setError('Token tidak valid. Pastikan token yang Anda masukkan benar.');
    }
    setLoading(false);
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
        >
          <div className={`p-5 ${colors.bg}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center">
                  <Key className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-white/70 text-xs">Verifikasi Token</p>
                  <p className="text-white font-bold text-sm">{pkg.name}</p>
                </div>
              </div>
              <button onClick={onClose} className="w-7 h-7 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center">
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          <div className="p-6">
            {verified ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-4"
              >
                <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle className="w-7 h-7 text-[#10b981]" />
                </div>
                <p className="font-semibold text-gray-800">Token Valid!</p>
                <p className="text-sm text-gray-500 mt-1">Menyiapkan ujian...</p>
              </motion.div>
            ) : (
              <form onSubmit={handleVerify} className="space-y-4">
                <div className={`${colors.light} rounded-2xl p-3 text-sm text-gray-700`}>
                  Masukkan token 6-digit yang diberikan oleh Admin untuk membuka paket ujian ini.
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Token Akses</label>
                  <input
                    type="text"
                    value={token}
                    onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    className={`w-full border border-gray-200 rounded-xl px-4 py-3 text-2xl font-mono font-bold text-center tracking-[0.5em] focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30 focus:border-[#1e3a8a] transition-all`}
                    maxLength={6}
                    required
                    autoFocus
                  />
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-center gap-2 text-red-500 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-3"
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    {error}
                  </motion.div>
                )}

                <button
                  type="submit"
                  disabled={loading || token.length !== 6}
                  className="w-full py-3.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-semibold flex items-center justify-center gap-2 transition-all disabled:opacity-60"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Verifikasi & Mulai Ujian'}
                </button>
              </form>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
