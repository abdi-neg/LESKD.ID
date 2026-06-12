import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  Users, 
  MessageCircle, 
  Instagram, 
  Facebook, 
  Mail, 
  ArrowRight,
  BookOpen,
  Award,
  BarChart3
} from 'lucide-react';
import LoginModal from './LoginModal';

type ModalType = 'admin-login' | 'admin-register' | 'participant-login' | 'participant-register' | null;

export default function LandingPage() {
  const [modal, setModal] = useState<ModalType>(null);

  // 🌟 KANAL KONEKSI DATA RESMI LESKD.ID (100% LIVE & AKTIF)
  const LINKS = {
    googleFormSignUp: "https://docs.google.com/forms/d/e/1FAIpQLSdhllShAMHi9sKDsLVkidWqVPVFfhbt9BxRmSyRfZjjv3t2Yw/viewform",
    whatsapp: "https://wa.me/628175201122",
    instagram: "https://www.instagram.com/leskd.id?igsh=Z2xlOWthMGkxcGNy&utm_source=qr",
    facebook: "https://www.facebook.com/share/1GgSM37wz4/?mibextid=wwXIfr",
    email: "mailto:dileskd.id@gmail.com"
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-gray-800 antialiased">
      
      {/* ─── 1. NAVBAR (PORTAL LOGIN HANYA DI SINI) ─── */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Logo Brand Minimalis - Konsisten Biru */}
          <div className="flex items-center gap-2">
            <span className="text-[#1e3a8a] font-black text-2xl tracking-tight">
              LESKD<span className="text-blue-600">.ID</span>
            </span>
          </div>
          
          {/* Menu Akses Masuk Siswa */}
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm font-medium hidden md:block">
              Platform Simulasi CAT Terintegrasi
            </span>
            <button
              onClick={() => setModal('participant-login')}
              className="bg-blue-50 hover:bg-blue-100/80 text-[#1e3a8a] font-bold py-2.5 px-5 rounded-xl transition-all text-sm flex items-center gap-2 border border-blue-100"
            >
              <Users className="w-4 h-4" />
              Masuk Siswa
            </button>
          </div>
        </div>
      </header>

      {/* ─── 2. HERO SECTION (TAMPILAN STRATEGIS DAN PROFESIONAL) ─── */}
      <main className="max-w-7xl mx-auto px-6 pt-20 pb-20">
        <div className="text-center mb-24">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block rounded-full bg-[#1e3a8a]/10 px-4 py-1.5 text-xs font-bold text-[#1e3a8a] uppercase tracking-wider mb-6"
          >
            🚀 Bimbingan Belajar CPNS & Kedinasan Modern
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-black text-gray-900 leading-tight mb-6 tracking-tight max-w-4xl mx-auto"
          >
            Raih Impian ASN Bersama
            <span className="block text-[#1e3a8a] mt-2">Persiapan Terbaik di LESKD.ID</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-gray-600 text-lg sm:text-xl max-w-3xl mx-auto mb-10 leading-relaxed"
          >
            Selamat datang di <b>LESKD.ID</b>, platform bimbingan belajar khusus seleksi aparatur negara. Kami menyediakan simulasi ujian CAT yang akurat, pembobotan nilai otomatis, serta ribuan latihan soal yang dirancang khusus berbasis kompetensi penalaran tinggi.
          </motion.p>

          {/* 🎯 TOMBOL UTAMA: POSISI TUNGGAL, PUSAT PERHATIAN & SANGAT STRATEGIS */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center justify-center max-w-md mx-auto"
          >
            <a
              href={LINKS.googleFormSignUp}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-4.5 px-10 rounded-2xl shadow-xl shadow-blue-600/20 transition-all transform hover:-translate-y-1 flex items-center justify-center gap-3 text-lg tracking-wide group"
            >
              Daftar Sekarang
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </a>
            
            {/* Sub-keterangan profesional di bawah tombol */}
            <p className="mt-3 text-xs text-gray-400 font-medium">
              * Pendaftaran resmi diproses aman melalui sistem Google Form LESKD.ID
            </p>
          </motion.div>
        </div>

        {/* ─── 3. FITUR UNGGULAN GRID (BIRU-PUTIH KONSISTEN) ─── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-24"
        >
          {[
            { 
              title: 'Tryout Mini Per Kategori', 
              desc: 'Latihan fokus mendalam pada sub-kategori materi utama: TIU, TWK, dan TKP secara mandiri.',
              icon: <BookOpen className="w-6 h-6 text-[#1e3a8a]" />
            },
            { 
              title: 'Simulasi CAT Real-Time', 
              desc: 'Ujian komparatif 110 soal dalam waktu 110 menit dengan standarisasi aturan ambang batas resmi BKN.',
              icon: <Award className="w-6 h-6 text-blue-600" />
            },
            { 
              title: 'Analisis Peta Kekuatan', 
              desc: 'Rapor evaluasi otomatis untuk mendeteksi kelemahan materi dan melacak peringkat Anda di leaderboard.',
              icon: <BarChart3 className="w-6 h-6 text-blue-500" />
            },
          ].map((f, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -4 }}
              className="bg-white border border-gray-100 shadow-sm rounded-2xl p-6 flex flex-col items-start"
            >
              <div className="p-3 bg-blue-50/50 rounded-xl mb-4">{f.icon}</div>
              <h3 className="text-gray-900 font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* ─── 4. KANAL KONSULTASI SOSMED ─── */}
        <section className="bg-white rounded-3xl border border-gray-100 p-8 md:p-12 text-center max-w-4xl mx-auto shadow-sm">
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900">Gabung Sekarang & Mulai Belajar</h2>
          <p className="mt-3 text-gray-500 text-sm md:text-base max-w-xl mx-auto">
            Jika Anda memiliki pertanyaan mengenai jadwal pendaftaran kelas intensif, fasilitas, atau bimbingan offline, hubungi kami melalui:
          </p>

          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* WhatsApp */}
            <a 
              href={LINKS.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-all group"
            >
              <MessageCircle className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform" />
              <span className="mt-2 text-xs font-bold text-gray-700">WhatsApp</span>
            </a>

            {/* Instagram */}
            <a 
              href={LINKS.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-all group"
            >
              <Instagram className="w-6 h-6 text-blue-600 group-hover:scale-110 transition-transform" />
              <span className="mt-2 text-xs font-bold text-gray-700">Instagram</span>
            </a>

            {/* Facebook */}
            <a 
              href={LINKS.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-all group"
            >
              <Facebook className="w-6 h-6 text-blue-700 group-hover:scale-110 transition-transform" />
              <span className="mt-2 text-xs font-bold text-gray-700">Facebook</span>
            </a>

            {/* Email */}
            <a 
              href={LINKS.email}
              className="flex flex-col items-center justify-center p-4 rounded-xl bg-slate-50 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-all group"
            >
              <Mail className="w-6 h-6 text-blue-800 group-hover:scale-110 transition-transform" />
              <span className="mt-2 text-xs font-bold text-gray-700">Email</span>
            </a>
          </div>
        </section>

      </main>

      {/* ─── 5. FOOTER & PORTAL ADMIN TERSEMBUNYI ─── */}
      <footer className="bg-slate-900 text-gray-500 text-xs py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} LESKD.ID. Hak Cipta Dilindungi Undang-Undang.</p>
          
          {/* PORTAL STAF INTERNAL SAMAR */}
          <button
            onClick={() => setModal('admin-login')}
            className="text-gray-800 hover:text-gray-600 transition-colors flex items-center gap-1 select-none focus:outline-none font-medium"
            title="Sistem Manajemen Internal"
          >
            <Shield className="w-3 h-3" />
            Portal Staf
          </button>
        </div>
      </footer>

      {/* MODAL TRIGGER */}
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
