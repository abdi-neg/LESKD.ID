import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, EyeOff, Shield, Users, Loader2, Mail, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase, upsertProfile } from '../../lib/supabase';
import { SUPER_ADMIN_EMAIL } from '../../types';

type ModalMode = 'admin-login' | 'admin-register' | 'participant-login' | 'participant-register';

interface Props {
  mode: ModalMode;
  onClose: () => void;
  onSwitchMode: (mode: ModalMode) => void;
}

export default function LoginModal({ mode, onClose, onSwitchMode }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const isAdmin = mode.startsWith('admin');
  const isRegister = mode.endsWith('register');

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError(authError.message === 'Invalid login credentials'
        ? 'Email atau kata sandi salah.'
        : authError.message);
    }
    // AppContext onAuthStateChange will handle the rest
    setLoading(false);
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!fullName.trim()) { setError('Nama lengkap tidak boleh kosong.'); return; }
    setLoading(true);

    const isSuperAdmin = email.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
    const role = isSuperAdmin ? 'super_admin' : isAdmin ? 'admin' : 'participant';
    const isApproved = isSuperAdmin;

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: fullName, role },
      },
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      try {
        await upsertProfile({
          id: data.user.id,
          full_name: fullName,
          email,
          role,
          is_approved: isApproved,
        });
      } catch {
        // profile upsert may fail before confirmation — non-fatal
      }
    }

    setSuccessMsg(
      isSuperAdmin
        ? 'Akun Super Admin dibuat. Silakan cek email untuk verifikasi.'
        : isAdmin
        ? 'Pendaftaran berhasil! Cek email untuk verifikasi, lalu tunggu persetujuan Super Admin.'
        : 'Pendaftaran berhasil! Cek email untuk verifikasi, lalu tunggu persetujuan Admin.'
    );
    setLoading(false);
  }

  function reset() {
    setEmail('');
    setPassword('');
    setFullName('');
    setError('');
    setSuccessMsg('');
    setShowPass(false);
  }

  const headerBg = isAdmin ? 'bg-[#1e3a8a]' : 'bg-[#10b981]';
  const focusRing = isAdmin ? 'focus:ring-[#1e3a8a]/30 focus:border-[#1e3a8a]' : 'focus:ring-[#10b981]/30 focus:border-[#10b981]';
  const btnBg = isAdmin ? 'bg-[#1e3a8a] hover:bg-[#1e40af]' : 'bg-[#10b981] hover:bg-[#059669]';

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
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
        >
          {/* Header */}
          <div className={`p-6 ${headerBg}`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  {isAdmin ? <Shield className="w-5 h-5 text-white" /> : <Users className="w-5 h-5 text-white" />}
                </div>
                <div>
                  <h2 className="text-white font-bold text-lg">
                    {isRegister
                      ? isAdmin ? 'Daftar Admin' : 'Daftar Peserta'
                      : isAdmin ? 'Login Admin' : 'Login Peserta'}
                  </h2>
                  <p className="text-white/70 text-sm">LESKD.ID — Simulasi CAT CPNS</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>

          <div className="p-6">
            {successMsg ? (
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                  <CheckCircle className="w-7 h-7 text-[#10b981]" />
                </div>
                <div>
                  <p className="font-semibold text-gray-800 mb-2">Pendaftaran Berhasil!</p>
                  <p className="text-sm text-gray-600 leading-relaxed">{successMsg}</p>
                </div>
                <button
                  onClick={() => { reset(); onSwitchMode(isAdmin ? 'admin-login' : 'participant-login'); }}
                  className={`w-full py-3 rounded-xl text-white font-semibold ${btnBg} transition-colors`}
                >
                  Ke Halaman Login
                </button>
              </div>
            ) : (
              <form onSubmit={isRegister ? handleRegister : handleLogin} className="space-y-4">
                {isRegister && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Nama Lengkap</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Masukkan nama lengkap"
                      className={`w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ${focusRing} transition-all placeholder:text-gray-400`}
                      required
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="nama@email.com"
                    className={`w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ${focusRing} transition-all placeholder:text-gray-400`}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Kata Sandi</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={isRegister ? 'Minimal 6 karakter' : '••••••••'}
                      className={`w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ${focusRing} transition-all placeholder:text-gray-400 pr-11`}
                      required
                      minLength={isRegister ? 6 : undefined}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isRegister && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 flex gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>
                      {isAdmin
                        ? 'Akun Admin baru perlu disetujui oleh Super Admin sebelum dapat digunakan.'
                        : 'Akun peserta baru perlu disetujui oleh Admin sebelum dapat mengikuti tryout.'}
                    </span>
                  </div>
                )}

                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-red-500 text-sm bg-red-50 border border-red-100 rounded-xl px-4 py-3"
                  >
                    {error}
                  </motion.p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className={`w-full py-3.5 rounded-xl font-semibold text-white flex items-center justify-center gap-2 transition-all ${btnBg} disabled:opacity-60`}
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isRegister ? (
                    <><Mail className="w-4 h-4" /> Daftar & Verifikasi Email</>
                  ) : (
                    'Masuk'
                  )}
                </button>

                {/* Switch mode links */}
                <div className="text-center text-sm text-gray-500">
                  {isRegister ? (
                    <>
                      Sudah punya akun?{' '}
                      <button
                        type="button"
                        onClick={() => { reset(); onSwitchMode(isAdmin ? 'admin-login' : 'participant-login'); }}
                        className="text-[#1e3a8a] font-medium hover:underline"
                      >
                        Masuk di sini
                      </button>
                    </>
                  ) : (
                    <>
                      Belum punya akun?{' '}
                      <button
                        type="button"
                        onClick={() => { reset(); onSwitchMode(isAdmin ? 'admin-register' : 'participant-register'); }}
                        className="text-[#1e3a8a] font-medium hover:underline"
                      >
                        Daftar di sini
                      </button>
                    </>
                  )}
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
