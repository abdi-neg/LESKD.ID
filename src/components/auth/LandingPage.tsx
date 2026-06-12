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
      
      {/* ─── 1. NAVBAR (COMPACT & SLEEK) ─── */}
      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-100 px-6 py-3.5">
        <div className="flex items-center justify-between max-w-6xl mx-auto">
          {/* Logo Brand */}
          <div className="flex items-center gap-2">
            <span className="text-[#1e3a8a] font-black text-xl tracking-tight">
              LESKD<span className="text-slate-400">.</span>ID
            </span>
          </div>
          
          {/* Portal Akses Masuk Siswa */}
          <div className="flex items-center gap-4">
            <span className="text-slate-400 text-[11px] font-bold uppercase tracking-widest hidden md:block">
              Simulasi CAT Terintegrasi
            </span>
            <button
              onClick={() => setModal('participant-login')}
              className="bg-white hover:bg-slate-50 text-[#1e3a8a] font-bold py-2 px-4 rounded-lg transition-all text-xs flex items-center gap-1.5 border border-slate-200"
            >
              <Users className="w-3.5 h-3.5" />
              Masuk Siswa
            </button>
          </div>
        </div>
      </header>

      {/* ─── MAIN WRAPPER ─── */}
      <main className="max-w-6xl mx-auto px-6 pt-12 pb-16">
        
        {/* ─── 2. HERO SECTION: SPLIT WIDESCREEN GRID (MANFAATKAN LEBAR LAYAR) ─── */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-16">
          
          {/* KOLOM KIRI: TEKS DESKRIPSI (7 PER 12 BAGIAN LAYAR) */}
          <div className="lg:col-span-7 text-left">
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-block rounded bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-[#1e3a8a] uppercase tracking-widest mb-4"
            >
              Aparatur Sipil Negara Preparation
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 leading-tight mb-4 tracking-tight"
            >
              Raih Impian ASN Bersama
              <span className="block text-[#1e3a8a] mt-1">Persiapan Terbaik di LESKD.ID</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-slate-500 text-sm sm:text-base leading-relaxed mb-0 font-medium"
            >
              Selamat datang di <b>LESKD.ID</b>, platform bimbingan belajar khusus seleksi aparatur negara. Kami menyediakan simulasi ujian CAT yang akurat, pembobotan nilai otomatis, serta ribuan latihan soal yang dirancang khusus berbasis kompetensi penalaran tinggi.
            </motion.p>
          </div>

          {/* KOLOM KANAN: KARTU AKSI PENDAFTARAN PREMIUM (5 PER 12 BAGIAN LAYAR) */}
          <div className="lg:col-span-5">
            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-left shadow-sm"
            >
              <h3 className="text-slate-900 font-bold text-base mb-1.5">Mulai Langkah Kelulusan</h3>
              <p className="text-slate-500 text-xs mb-5 leading-relaxed">
                Silakan isi formulir pendaftaran resmi di bawah ini untuk bergabung dengan kelas intensif bimbel kami.
              </p>
              
              {/* TOMBOL UTAMA DAFTAR SEKARANG */}
              <a
                href={LINKS.googleFormSignUp}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full bg-[#1e3a8a] hover:bg-[#152961] text-white font-bold py-3.5 px-6 rounded-lg transition-all duration-150 flex items-center justify-center gap-2 text-xs uppercase tracking-widest border border-[#1e3a8a]"
              >
                Daftar Sekarang
                <ArrowRight className="w-3.5 h-3.5" />
              </a>
              
              {/* INDIKATOR LAYANAN DI BAWAH TOMBOL */}
              <div className="mt-5 pt-4 border-t border-slate-200/60 grid grid-cols-2 gap-y-2 gap-x-4 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                <div className="flex items-center gap-1">✓ Bank Soal HOTS</div>
                <div className="flex items-center gap-1">✓ Real CAT Engine</div>
                <div className="flex items-center gap-1">✓ Smart Analytics</div>
                <div className="flex items-center gap-1">✓ Google Form Aman</div>
              </div>
            </motion.div>
          </div>

        </section>

        {/* ─── 3. SUB-JUDUL SEKTOR FITUR (SEIMBANG & MINIMALIS) ─── */}
        <section className="border-t border-slate-100 pt-12 mb-8">
          <div className="text-left max-w-xl">
            <span className="text-[10px] font-bold text-[#1e3a8a] uppercase tracking-widest block mb-1">
              Sistem Integrasi
            </span>
            <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
              Fitur Utama Platform
            </h2>
            <p className="text-slate-500 text-xs mt-1 leading-relaxed">
              Metode persiapan ujian modern yang dirancang secara sistematis untuk menghasilkan metrik belajar yang berbasis data, akurat, dan adaptif.
            </p>
          </div>
        </section>

        {/* ─── 4. FITUR GRID (COMPACT LAYOUT) ─── */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          {[
            { 
              title: 'Modul Latihan Spesifik & Adaptif', 
              desc: 'Akses instan paket latihan tersegmen berdasarkan kisi-kisi ter-update untuk efisiensi waktu belajar harian Anda.',
              icon: <BookOpen className="w-4 h-4 text-[#1e3a8a]" />
            },
            { 
              title: 'Real CAT Simulator Engine', 
              desc: 'Pengalaman ujian berbasis web dengan algoritma penghitungan mundur waktu dan kalkulasi skor otomatis yang presisi tanpa delay.',
              icon: <Award className="w-4 h-4 text-[#1e3a8a]" />
            },
            { 
              title: 'Smart Diagnostic Analytics', 
              desc: 'Analisis statistik mutakhir yang menyajikan grafik perkembangan performa, persentase akurasi jawaban, dan pemetaan kekuatan materi berbasis data.',
              icon: <BarChart3 className="w-4 h-4 text-[#1e3a8a]" />
            },
          ].map((f, i) => (
            <div
              key={i}
              className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col items-start transition-colors hover:border-slate-300"
            >
              <div className="p-2.5 bg-slate-50 rounded border border-slate-100 mb-3">{f.icon}</div>
              <h3 className="text-slate-900 font-bold text-sm mb-1.5">{f.title}</h3>
              <p className="text-slate-500 text-xs leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </section>

        {/* ─── 5. KANAL KONSULTASI / SOSMED (COMPACT ROW SPLIT) ─── */}
        <section className="bg-slate-50 rounded-xl border border-slate-200 p-6 md:p-8 max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          <div className="md:col-span-5 text-left">
            <h2 className="text-base md:text-lg font-bold text-slate-900 uppercase tracking-wide">Hubungi Layanan Informasi</h2>
            <p className="mt-1 text-slate-500 text-xs leading-relaxed">
              Jika Anda memiliki pertanyaan mengenai pendaftaran kelas intensif atau bimbingan teknis, silakan hubungi tim kami melalui kanal resmi berikut.
            </p>
          </div>

          <div className="md:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* WhatsApp */}
            <a 
              href={LINKS.whatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center py-3 px-2 rounded-lg bg-white border border-slate-200 hover:border-[#1e3a8a] transition-all group"
            >
              <MessageCircle className="w-4 h-4 text-[#1e3a8a]" />
              <span className="mt-1.5 text-[11px] font-semibold text-slate-600 group-hover:text-[#1e3a8a]">WhatsApp</span>
            </a>

            {/* Instagram */}
            <a 
              href={LINKS.instagram}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center py-3 px-2 rounded-lg bg-white border border-slate-200 hover:border-[#1e3a8a] transition-all group"
            >
              <Instagram className="w-4 h-4 text-[#1e3a8a]" />
              <span className="mt-1.5 text-[11px] font-semibold text-slate-600 group-hover:text-[#1e3a8a]">Instagram</span>
            </a>

            {/* Facebook */}
            <a 
              href={LINKS.facebook}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center justify-center py-3 px-2 rounded-lg bg-white border border-slate-200 hover:border-[#1e3a8a] transition-all group"
            >
              <Facebook className="w-4 h-4 text-[#1e3a8a]" />
              <span className="mt-1.5 text-[11px] font-semibold text-slate-600 group-hover:text-[#1e3a8a]">Facebook</span>
            </a>

            {/* Email */}
            <a 
              href={LINKS.email}
              className="flex flex-col items-center justify-center py-3 px-2 rounded-lg bg-white border border-slate-200 hover:border-[#1e3a8a] transition-all group"
            >
              <Mail className="w-4 h-4 text-[#1e3a8a]" />
              <span className="mt-1.5 text-[11px] font-semibold text-slate-600 group-hover:text-[#1e3a8a]">Email</span>
            </a>
          </div>
        </section>

      </main>

      {/* ─── 6. FOOTER ─── */}
      <footer className="bg-white border-t border-slate-100 text-slate-400 text-[11px] py-6 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
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
