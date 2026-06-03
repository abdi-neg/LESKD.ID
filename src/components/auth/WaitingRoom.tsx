import { motion } from 'framer-motion';
import { Clock, LogOut, MessageCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

const WA_NUMBER = '628124483868'; // Nomor Admin LESKD.ID Berhasil Diperbarui

export default function WaitingRoom() {
  const { state, signOut } = useApp();
  const profile = state.profile;

  const isAdmin = profile?.role === 'admin';
  const waMessage = encodeURIComponent(
    isAdmin
      ? `Halo, saya ${profile?.full_name} (${profile?.email}) ingin meminta persetujuan akun Admin di LESKD.ID`
      : `Halo, saya ${profile?.full_name} (${profile?.email}) ingin meminta persetujuan akun Peserta di LESKD.ID`
  );

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="flex items-center justify-between px-6 py-5 max-w-7xl mx-auto w-full border-b border-gray-100">
        <span className="text-[#1e3a8a] font-extrabold text-2xl tracking-tight">LESKD.ID</span>
        <button
          onClick={signOut}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 text-sm font-medium"
        >
          <LogOut className="w-4 h-4" />
          Keluar
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center px-4">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-gray-200 rounded-3xl shadow-lg p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <Clock className="w-8 h-8 text-amber-600" />
          </div>

          <h1 className="text-2xl font-bold text-gray-800 mb-2">Menunggu Persetujuan</h1>
          <p className="text-gray-600 text-sm leading-relaxed mb-6">
            Halo, <span className="font-semibold">{profile?.full_name}</span>!<br />
            Akun {isAdmin ? 'Admin' : 'Peserta'} Anda sedang menunggu persetujuan dari{' '}
            {isAdmin ? 'Super Admin' : 'Admin'}.
            Anda akan mendapat notifikasi setelah akun diaktifkan.
          </p>

          <div className="bg-gray-50 rounded-2xl p-4 mb-6 text-left space-y-1">
            <p className="text-xs text-gray-500 font-medium">Detail Akun:</p>
            <p className="text-sm text-gray-800">{profile?.full_name}</p>
            <p className="text-sm text-gray-500">{profile?.email}</p>
            <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mt-1 ${isAdmin ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
              {isAdmin ? 'Admin' : 'Peserta'}
            </span>
          </div>

          <a
            href={`https://wa.me/${WA_NUMBER}?text=${waMessage}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-[#25D366] hover:bg-[#20BA5C] text-white font-semibold rounded-2xl transition-colors mb-3"
          >
            <MessageCircle className="w-5 h-5" />
            Hubungi Admin Via Whatsapp
          </a>

          <button
            onClick={signOut}
            className="w-full py-3 text-gray-500 hover:text-gray-700 text-sm font-medium border border-gray-200 rounded-2xl hover:bg-gray-50 transition-colors"
          >
            <button />
            Keluar dari Akun
          </button>
        </motion.div>
      </main>
    </div>
  );
}
