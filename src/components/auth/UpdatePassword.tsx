import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase'; // 🎯 SESUAIKAN JALUR IMPOR SUPABASE ANDA
import { KeyRound, ArrowRight, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

export default function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  // Proteksi Keamanan: Memastikan user datang membawa sesi pemulihan yang valid dari email
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      // Jika tidak ada sesi aktif (token salah/kedaluwarsa), kunci form dengan pesan error
      if (!data.session) {
        setErrorMsg('Tautan pemulihan tidak valid atau telah kedaluwarsa. Silakan ajukan reset password ulang halaman login.');
      }
    };
    checkSession();
  }, []);

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (password.length < 6) {
      setErrorMsg('Kata sandi baru minimal harus terdiri dari 6 karakter.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Konfirmasi kata sandi tidak cocok. Silakan periksa kembali.');
      return;
    }

    setLoading(true);

    // 🎯 EKSEKUSI UPDATE KATA SANDI BARU KE DATABASE SUPABASE
    const { error } = await supabase.auth.updateUser({ password: password });

    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    } else {
      setSuccess(true);
      setLoading(false);
      
      // Keluar otomatis agar sesi token lama bersih, lalu tendang ke halaman utama setelah 3 detik
      await supabase.auth.signOut(); 
      setTimeout(() => {
        navigate('/'); 
      }, 3000);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex items-center justify-center p-6 antialiased">
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 w-full max-w-md shadow-xl text-center"
      >
        {/* LOGO BRAND */}
        <div className="text-[#1e3a8a] font-black text-xl tracking-tight mb-6">
          LESKD<span className="text-slate-400">.</span>ID
        </div>

        {success ? (
          /* ─── TAMPILAN JIKA BERHASIL MENGUBAH PASSWORD ─── */
          <div className="space-y-4 py-4">
            <div className="w-14 h-14 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-100">
              <ShieldCheck className="w-7 h-7 text-emerald-600" />
            </div>
            <h2 className="text-lg font-black text-slate-900 tracking-tight">Kata Sandi Diperbarui!</h2>
            <p className="text-slate-500 text-xs leading-relaxed max-w-xs mx-auto font-medium">
              Kata sandi akun Anda telah berhasil diubah di server aman. Mengalihkan Anda kembali ke halaman utama dalam 3 detik...
            </p>
          </div>
        ) : (
          /* ─── TAMPILAN FORM UTAMA ─── */
          <>
            <div className="text-left mb-6">
              <h2 className="text-lg font-black text-slate-900 tracking-tight">Buat Kata Sandi Baru</h2>
              <p className="text-slate-500 text-xs mt-0.5 leading-relaxed font-medium">
                Silakan ketikkan kata sandi baru Anda yang aman dan ulangi sekali lagi untuk konfirmasi.
              </p>
            </div>

            {errorMsg && (
              <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-left flex items-start gap-2 text-rose-700 text-xs font-semibold mb-4">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-4 text-left">
              {/* Input Kata Sandi Baru */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Kata Sandi Baru
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    disabled={loading || !!errorMsg.includes('kedaluwarsa')}
                    placeholder="Minimal 6 karakter"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] transition-all placeholder:text-gray-400 disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>
              </div>

              {/* Input Konfirmasi Kata Sandi */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Konfirmasi Kata Sandi Baru
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    disabled={loading || !!errorMsg.includes('kedaluwarsa')}
                    placeholder="Ulangi kata sandi baru Anda"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] transition-all placeholder:text-gray-400 disabled:bg-slate-50 disabled:text-slate-400"
                  />
                </div>
              </div>

              {/* Tombol Simpan */}
              <button
                type="submit"
                disabled={loading || !!errorMsg.includes('kedaluwarsa')}
                className="w-full bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-bold py-3.5 px-4 rounded-xl transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2 mt-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-900/10"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    Simpan Kata Sandi
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          </>
        )}
      </motion.div>
    </div>
  );
}
