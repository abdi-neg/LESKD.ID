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
    <div className="min-h-screen bg-white font-sans text-slate-800 antialiased">
      
      {/* ─── 1. NAVBAR (CLEAN & MINIMALIST) ─── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 px-6 py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* Logo Brand - Murni Deep Navy */}
          <div className="flex items-center gap-2">
            <span className="text-[#1e3a8a] font-black text-2xl tracking-tight">
              LESKD<span className="text-slate-400">.</span>ID
            </span>
          </div>
          
          {/* Portal Akses Masuk Siswa */}
          <div className="flex items-center gap-4">
            <span className="text-slate-400 text-xs font-medium uppercase tracking-wider hidden md:block">
              Simulasi CAT Terintegrasi
            </span>
            <button
              onClick={() => setModal('participant-login')}
              className="bg-white hover:bg-slate-50 text-[#1e3a8a] font-bold py-2.5 px-5 rounded-xl transition-all text-sm flex items-center gap-2 border border-slate-200"
            >
              <Users className="w-4 h-4" />
              Masuk Siswa
            </button>
          </div>
        </div>
      </header>

      {/* ─── 2. HERO SECTION (PROFESIONAL & HIGH-CONTRAST) ─── */}
      <main className="max-w-7xl mx-auto px-6 pt-24 pb-16">
        <div className="text-center mb-24">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-block rounded-md bg-slate-100 px-3 py-1 text-xs font-bold text-[#1e3a8a] uppercase tracking-widest mb-6"
          >
            Aparatur Sipil Negara Preparation
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 leading-tight mb-6 tracking-tight max-w-4xl mx-auto"
          >
            Raih Impian ASN Bersama
            <span className="block text-[#1e3a8a] mt-2">Persiapan Terbaik di LESKD.ID</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-slate-500 text-base sm:text-lg max-w-2xl mx-auto mb-12 leading-relaxed"
          >
            Selamat datang di <b>LESKD.ID</b>, platform bimbingan belajar khusus seleksi aparatur negara. Kami menyediakan simulasi ujian CAT yang akurat, pembobotan nilai otomatis, serta ribuan latihan soal yang dirancang khusus berbasis kompetensi penalaran tinggi.
          </motion.p>

          {/* 🎯 TOMBOL DAFTAR SEKARANG */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="flex flex-col items-center justify-center max-w-xs mx-auto"
          >
            <a
              href={LINKS.googleFormSignUp}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full bg-[#1e3a8a] hover:bg-[#152961] text-white font-bold py-4 px-8 rounded-xl transition-all duration-200 flex items-center justify-center gap-2 text-sm uppercase tracking-widest border border-[#1e3a8a]"
            >
              Daftar Sekarang
              <ArrowRight className="w-4 h-4" />
            </a>
            
            <p className="mt-3 text-[11px] text-slate-400 font-medium uppercase tracking-wider">
              Formulir Pendaftaran Resmi GForm
            </p>
          </motion.div>
        </div>

        {/* ─── 3. KETERANGAN JUDUL FITUR UNGGULAN (NEWLY ADDED) ─── */}
        <div className="text-center mb-12 max-w-3xl mx-auto border-t border-slate-100 pt-16">
          <span className="text-xs font-bold text-[#1e3a8a] uppercase tracking-widest block mb-2">
            Sistem Integrasi
          </span>
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">
            Fitur Unggulan Platform
          </h2>
          <p className="text-slate-500 text-sm mt-2 max-w-xl mx-auto">
            Metode persiapan ujian modern yang dirancang secara sistematis untuk menghasilkan metrik belajar yang berbasis data, akurat, dan adaptif.
          </p>
        </div>

        {/* ─── 4. FITUR GRID (SLEEK & EDU-TECH) ─── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-28"
        >
          {[
            { 
              title: 'Modul Latihan Spesifik & Adaptif', 
              desc: 'Akses instan paket latihan tersegmen berdasarkan kisi-kisi ter-update untuk efisiensi waktu belajar harian Anda.',
              icon: <BookOpen className="w-5 h-5 text-[#1e3a8a]" />
            },
            { 
              title: 'Real CAT Simulator Engine', 
              desc: 'Pengalaman ujian berbasis web dengan algoritma penghitungan mundur waktu dan kalkulasi skor otomatis yang presisi tanpa delay.',
              icon: <Award className="w-5 h-5 text-[#1e3a8a]" />
            },
            { 
              title: 'Smart Diagnostic Analytics', 
              desc: 'Analisis statistik mutakhir yang menyajikan grafik perkembangan performa, persentase akurasi jawaban, dan pemetaan kekuatan materi berbasis data.',
              icon: <BarChart3 className="w-5 h-5 text-[#1e3a8a]" />
            },
          ].map((f, i) => (
            <motion.div
              key={i}
              className="bg-white border border-slate-200 rounded-xl p-6 flex flex-col items-start transition-colors hover:border-slate-300"
            >
              <div className="p-3 bg-slate-50 rounded-lg mb-4 border border-slate-100">{f.icon}</div>
              <h3 className="text-slate-900 font-bold text-base mb-2">{f.title}</h3>
              <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* ─── 5. KANAL KONSULTASI / SOSMED ─── */}
        <section className="bg-slate-50 rounded-2xl border border-slate-200 p-8 md:p-12 text-center max-w-4xl mx-auto">
          <h2 className="text-xl md:text-2xl font-bold text-slate-900 uppercase tracking-wide">Hubungi Layanan Informasi</h2>
          <p className="mt-2 text-slate-500 text-sm max-w-xl mx-auto">
            Jika Anda memiliki pertanyaan mengenai pendaftaran kelas intensif atau bimbingan teknis, silakan hubungi tim kami:
          </p>

          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {/* WhatsApp */}
            <a 
              href={LINKS.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-4 rounded-xl bg-white border border-slate-200 hover:border-[#1e3a8a] transition-all group"
            >
              <MessageCircle className="w-5 h-5 text-[#1e3a8a]" />
              <span className="mt-2 text-xs font-semibold text-slate-600 group-hover:text-[#1e3a8a]">WhatsApp</span>
            </a>

            {/* Instagram */}
            <a 
              href={LINKS.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-4 rounded-xl bg-white border border-slate-200 hover:border-[#1e3a8a] transition-all group"
            >
              <Instagram className="w-5 h-5 text-[#1e3a8a]" />
              <span className="mt-2 text-xs font-semibold text-slate-600 group-hover:text-[#1e3a8a]">Instagram</span>
            </a>

            {/* Facebook */}
            <a 
              href={LINKS.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center p-4 rounded-xl bg-white border border-slate-200 hover:border-[#1e3a8a] transition-all group"
            >
              <Facebook className="w-5 h-5 text-[#1e3a8a]" />
              <span className="mt-2 text-xs font-semibold text-slate-600 group-hover:text-[#1e3a8a]">Facebook</span>
            </a>

            {/* Email */}
            <a 
              href={LINKS.email}
              className="flex flex-col items-center justify-center p-4 rounded-xl bg-white border border-slate-200 hover:border-[#1e3a8a] transition-all group"
            >
              <Mail className="w-5 h-5 text-[#1e3a8a]" />
              <span className="mt-2 text-xs font-semibold text-slate-600 group-hover:text-[#1e3a8a]">Email</span>
            </a>
          </div>
        </section>

      </main>

      {/* ─── 6. FOOTER & PORTAL STAF SAMAR ─── */}
      <footer className="bg-white border-t border-slate-100 text-slate-400 text-xs py-8 px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} LESKD.ID. Hak Cipta Dilindungi Undang-Undang.</p>
          
          <button
            onClick={() => setModal('admin-login')}
            className="text-slate-300 hover:text-slate-400 transition-colors flex items-center gap-1 select-none focus:outline-none font-medium"
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
