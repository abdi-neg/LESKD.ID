import { useState } from 'react';
import { motion } from 'framer-motion';
import { Shield, Users, ChevronRight } from 'lucide-react';
import LoginModal from './LoginModal';

type ModalType = 'admin-login' | 'admin-register' | 'participant-login' | 'participant-register' | null;

export default function LandingPage() {
  const [modal, setModal] = useState<ModalType>(null);

  return (
    <div className="min-h-screen bg-white">
      <header className="flex items-center justify-between px-6 py-5 max-w-7xl mx-auto border-b border-gray-100">
        <span className="text-[#1e3a8a] font-extrabold text-2xl tracking-tight">LESKD.ID</span>
        <span className="text-gray-400 text-sm font-medium hidden sm:block">Simulasi CAT CPNS</span>
      </header>

      <main className="max-w-7xl mx-auto px-6 pt-16 pb-24">
        <div className="text-center mb-16">
          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6"
          >
            Raih Impian ASN
            <span className="block text-[#1e3a8a]">Dengan Persiapan Terbaik</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-gray-600 text-lg sm:text-xl max-w-2xl mx-auto mb-12 leading-relaxed"
          >
            Simulasi ujian CAT CPNS yang akurat dengan sistem penilaian otomatis dan analisis mendalam.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4 justify-center max-w-lg mx-auto"
          >
            <div className="flex-1 flex flex-col gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setModal('participant-login')}
                className="bg-[#10b981] hover:bg-[#059669] text-white font-semibold py-4 px-8 rounded-2xl shadow-lg transition-colors flex items-center justify-center gap-2 text-base"
              >
                <Users className="w-5 h-5" />
                Login Peserta
                <ChevronRight className="w-4 h-4" />
              </motion.button>
              <button
                onClick={() => setModal('participant-register')}
                className="text-sm text-[#10b981] font-medium hover:underline"
              >
                Belum punya akun? Daftar di sini
              </button>
            </div>

            <div className="flex-1 flex flex-col gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setModal('admin-login')}
                className="bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-semibold py-4 px-8 rounded-2xl transition-colors flex items-center justify-center gap-2 text-base"
              >
                <Shield className="w-5 h-5" />
                Login Admin
                <ChevronRight className="w-4 h-4" />
              </motion.button>
              <button
                onClick={() => setModal('admin-register')}
                className="text-sm text-[#1e3a8a] font-medium hover:underline"
              >
                Daftar sebagai Admin
              </button>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {[
            { title: 'Tryout Mini Per Kategori', desc: 'Latihan fokus per kategori: TIU, TWK, dan TKP dengan waktu terukur.' },
            { title: 'Simulasi CAT Penuh', desc: '110 soal dalam 110 menit, persis seperti ujian CPNS sesungguhnya.' },
            { title: 'Analisis & Peringkat', desc: 'Lihat posisi Anda di leaderboard dan analisis kelemahan secara detail.' },
          ].map((f, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -4 }}
              className="bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-6"
            >
              <h3 className="text-[#1e3a8a] font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>
      </main>

      {modal && (
        <LoginModal
          mode={modal}
          onClose={() => setModal(null)}
          onSwitchMode={setModal}
        />
      )}
    </div>
  );
}
