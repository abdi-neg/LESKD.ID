import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, BarChart3, ShieldCheck, User, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-slate-50 font-sans antialiased selection:bg-blue-200">
      
      {/* ─── HEADER BARU (Clean & Premium dengan Logo Warna Biru Asli) ─── */}
      <nav className="bg-white/80 backdrop-blur-md border-b border-slate-200 py-4 px-6 md:px-12 flex items-center justify-between sticky top-0 z-50 shadow-sm">
         {/* Logo dengan warna biru asli LESKD */}
         <div className="text-2xl md:text-3xl font-black tracking-tight cursor-pointer">
            <span className="text-[#1e3a8a]">LESKD</span>
            <span className="text-[#1e3a8a]">.ID</span>
         </div>
         
         <div className="flex items-center gap-4 md:gap-6">
            <span className="hidden md:block text-xs font-bold text-slate-400 uppercase tracking-widest">
              Platform Tryout CAT ASN
            </span>
            {/* Tombol Masuk Diperjelas & Dibuat Elegan */}
            <button 
              onClick={() => navigate('/login')} 
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-[#1e3a8a] px-5 py-2.5 rounded-xl text-sm font-bold transition-all border border-slate-200"
            >
               <User className="w-4 h-4" />
               <span className="hidden sm:inline">Masuk Siswa</span>
            </button>
         </div>
      </nav>

      {/* ─── HERO SECTION ─── */}
      <main className="max-w-7xl mx-auto px-6 md:px-12 pt-12 md:pt-20 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* BAGIAN KIRI: Teks Utama */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            className="lg:col-span-7 space-y-6"
          >
            <span className="inline-block bg-blue-100 text-[#1e3a8a] px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-widest border border-blue-200/50">
              Aparatur Sipil Negara Preparation
            </span>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black text-slate-900 leading-[1.1] tracking-tight">
              Raih Impian ASN Bersama Persiapan Terbaik di <span className="text-[#1e3a8a]">LESKD.ID</span>
            </h1>
            
            <p className="text-slate-500 text-lg sm:text-xl leading-relaxed max-w-2xl font-medium">
              Selamat datang di <strong className="text-slate-700">LESKD.ID</strong>, platform bimbingan belajar khusus seleksi aparatur negara. Kami menyediakan simulasi ujian CAT yang akurat, pembobotan nilai otomatis, serta ribuan latihan soal yang dirancang khusus berbasis kompetensi penalaran tinggi.
            </p>
          </motion.div>

          {/* BAGIAN KANAN: Kotak Pendaftaran (Dirombak Menjadi Premium Card) */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }} 
            animate={{ opacity: 1, x: 0 }} 
            transition={{ delay: 0.1 }}
            className="lg:col-span-5"
          >
            <div className="bg-white rounded-3xl p-8 sm:p-10 shadow-2xl shadow-blue-900/5 border border-slate-100 relative overflow-hidden">
              {/* Aksen visual halus di sudut kartu */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>

              <div className="relative z-10">
                <h3 className="text-2xl font-black text-slate-900 mb-3">Mulai Langkah Kelulusan</h3>
                <p className="text-slate-500 text-sm leading-relaxed mb-8 font-medium">
                  Silakan isi formulir pendaftaran resmi di bawah ini untuk bergabung dengan kelas intensif bimbel kami.
                </p>

                {/* Tombol CTA dengan efek gradasi dan interaktif */}
                <button 
                  onClick={() => navigate('/register')} // Sesuaikan dengan rute pendaftaran Anda
                  className="w-full bg-gradient-to-r from-[#1e3a8a] to-blue-700 hover:from-[#152961] hover:to-blue-800 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-blue-900/20 active:scale-[0.98] group mb-8"
                >
                  DAFTAR SEKARANG
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>

                {/* Grid Fitur (Bullet points) yang lebih rapi */}
                <div className="grid grid-cols-2 gap-y-4 gap-x-2">
                  {[
                    'Bank Soal HOTS',
                    'Real CAT Engine',
                    'Smart Analytics',
                    'Google Form Aman'
                  ].map((feature, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="bg-emerald-100 rounded-full p-0.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      </div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </main>

      {/* ─── FITUR UTAMA PLATFORM (Sekilas perbaikan visual) ─── */}
      <section className="bg-white border-t border-slate-100 py-20">
        <div className="max-w-7xl mx-auto px-6 md:px-12">
          <div className="mb-12 max-w-2xl">
            <span className="text-[10px] font-black text-[#1e3a8a] uppercase tracking-widest block mb-2">Sistem Integrasi</span>
            <h2 className="text-3xl font-black text-slate-900 mb-4">Fitur Utama Platform</h2>
            <p className="text-slate-500 font-medium leading-relaxed">
              Metode persiapan ujian modern yang dirancang secara sistematis untuk menghasilkan metrik belajar yang berbasis data, akurat, dan adaptif.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {/* Kartu Fitur 1 */}
            <div className="p-6 rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-900/5 transition-all bg-slate-50 hover:bg-white group cursor-default">
               <div className="w-12 h-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center mb-5 group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors">
                 <BookOpen className="w-6 h-6 text-slate-400 group-hover:text-blue-600" />
               </div>
               <h4 className="font-bold text-slate-800 mb-2">Bank Soal Terstruktur</h4>
               <p className="text-sm text-slate-500 leading-relaxed">Ribuan soal latihan yang diupdate secara berkala menyesuaikan kisi-kisi terbaru.</p>
            </div>

            {/* Kartu Fitur 2 */}
            <div className="p-6 rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-900/5 transition-all bg-slate-50 hover:bg-white group cursor-default">
               <div className="w-12 h-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center mb-5 group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors">
                 <BarChart3 className="w-6 h-6 text-slate-400 group-hover:text-blue-600" />
               </div>
               <h4 className="font-bold text-slate-800 mb-2">Analisis Progres</h4>
               <p className="text-sm text-slate-500 leading-relaxed">Pantau perkembangan nilai dan temukan titik lemah Anda melalui peta kekuatan otomatis.</p>
            </div>

            {/* Kartu Fitur 3 */}
            <div className="p-6 rounded-2xl border border-slate-100 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-900/5 transition-all bg-slate-50 hover:bg-white group cursor-default">
               <div className="w-12 h-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center mb-5 group-hover:bg-blue-50 group-hover:border-blue-100 transition-colors">
                 <ShieldCheck className="w-6 h-6 text-slate-400 group-hover:text-blue-600" />
               </div>
               <h4 className="font-bold text-slate-800 mb-2">CAT Engine Realistis</h4>
               <p className="text-sm text-slate-500 leading-relaxed">Simulasi antarmuka ujian dan sistem penilaian (termasuk TKP 1-5) yang identik dengan aslinya.</p>
            </div>

            {/* ─── 5. KANAL KONSULTASI / SOSMED ─── */}
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

          </div>
        </div>
      </section>

    </div>
  );
}
