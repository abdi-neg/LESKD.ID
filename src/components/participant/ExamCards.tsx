import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Globe,
  Heart,
  Zap,
  Target,
  Clock,
  BookOpen,
  ChevronRight,
  Key,
  RefreshCw,
  Lock,
  Sparkles,
  CheckCircle2,
  MessageCircle,
  X
} from 'lucide-react';
import { useApp, packageTypeToExamType } from '../../context/AppContext';
import { ExamPackage, PackageType, USER_GROUP_OPTIONS } from '../../types';
import { supabase } from '../../lib/supabase';
import TokenGate from '../exam/TokenGate';
import { EXAM_CONFIGS } from '../../data/mockData';

const ADMIN_WHATSAPP = '628175201122';

interface TeaserPackage {
  id: string;
  name: string;
  description: string;
  package_type: PackageType;
  duration_minutes?: number;
  question_count?: number;
  target_groups?: string[];
  is_teaser?: boolean;
  is_active: boolean;
}

const PKG_META: Record<string, {
  icon: React.ElementType;
  gradient: string;
  tagColor: string;
}> = {
  MINI_TIU: { icon: Brain, gradient: 'from-blue-500 to-blue-700', tagColor: 'bg-blue-100 text-blue-700' },
  MINI_TWK: { icon: Globe, gradient: 'from-emerald-500 to-emerald-700', tagColor: 'bg-emerald-100 text-emerald-700' },
  MINI_TKP: { icon: Heart, gradient: 'from-amber-500 to-amber-600', tagColor: 'bg-amber-100 text-amber-700' },
  TO_SUBKATEGORI: { icon: Target, gradient: 'from-purple-600 to-indigo-700', tagColor: 'bg-purple-100 text-purple-700' },
  FULL: { icon: Zap, gradient: 'from-[#1e3a8a] to-[#1e40af]', tagColor: 'bg-slate-100 text-slate-700' },
};

const TYPE_LABELS: Record<string, string> = {
  MINI_TIU: 'Mini Tryout TIU',
  MINI_TWK: 'Mini Tryout TWK',
  MINI_TKP: 'Mini Tryout TKP',
  TO_SUBKATEGORI: 'Drilling Sub-Kategori',
  FULL: 'Full CAT Simulation',
};

export default function ExamCards() {
  const { state, startExam } = useApp();
  const [packages, setPackages] = useState<ExamPackage[]>([]);
  const [teaserPackages, setTeaserPackages] = useState<TeaserPackage[]>([]);
  const [userGroups, setUserGroups] = useState<string[]>(['UMUM']);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<ExamPackage | null>(null);
  const [lockedTeaser, setLockedTeaser] = useState<TeaserPackage | null>(null);

  async function loadPackages() {
    setLoading(true);
    try {
      // 1. Ambil access_groups terbaru langsung dari tabel profiles (hanya ~40 Byte)
      // agar perubahan grup oleh Admin langsung aktif saat peserta refresh tanpa perlu logout
      let resolvedGroups: string[] =
        Array.isArray(state.profile?.access_groups) && state.profile.access_groups.length > 0
          ? state.profile.access_groups
          : ['UMUM'];

      if (state.profile?.id) {
        const { data: profData } = await supabase
          .from('profiles')
          .select('access_groups')
          .eq('id', state.profile.id)
          .maybeSingle();

        if (Array.isArray(profData?.access_groups) && profData.access_groups.length > 0) {
          resolvedGroups = profData.access_groups;
        }
      }

      setUserGroups(resolvedGroups);

      // 2. Tarik paket aktif yang sesuai grup peserta atau bertarget 'SEMUA'
      const allowedTargets = Array.from(new Set([...resolvedGroups, 'SEMUA']));
      const { data: openData } = await supabase
        .from('exam_packages')
        .select('*')
        .eq('is_active', true)
        .overlaps('target_groups', allowedTargets)
        .order('created_at');

      const openList = (openData ?? []) as ExamPackage[];
      setPackages(openList);

      // 3. Khusus peserta yang murni 'UMUM', tarik maksimal 2 paket teaser terkunci TANPA kolom token
      const isUmumOnly = resolvedGroups.every((g) => g === 'UMUM');
      if (isUmumOnly) {
        const { data: teaserData } = await supabase
          .from('exam_packages')
          .select('id, name, description, package_type, duration_minutes, question_count, target_groups, is_teaser, is_active')
          .eq('is_active', true)
          .eq('is_teaser', true)
          .order('created_at');

        const openIds = new Set(openList.map((p) => p.id));
        const filteredTeasers = ((teaserData ?? []) as TeaserPackage[])
          .filter((t) => !openIds.has(t.id))
          .slice(0, 2);

        setTeaserPackages(filteredTeasers);
      } else {
        setTeaserPackages([]);
      }
    } catch (err) {
      console.error('Gagal memuat paket ujian:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPackages();
  }, [state.profile?.id]);

  async function handleTokenSuccess() {
    if (!selectedPkg) return;
    setStarting(true);
    const examType = packageTypeToExamType(selectedPkg.package_type as PackageType);
    await startExam(examType, selectedPkg);
    setStarting(false);
    setSelectedPkg(null);
  }

  function openWhatsAppPromo(pkg: TeaserPackage) {
    const message = `Halo Admin LESKD.ID, saya ${state.profile?.full_name || 'peserta'} tertarik membuka akses paket "${pkg.name}" dan ingin info pendaftaran Kelas Intensif SKD.`;
    const url = `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-gray-100 rounded-2xl h-48 animate-pulse" />
        ))}
      </div>
    );
  }

  if (packages.length === 0 && teaserPackages.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
        <BookOpen className="w-10 h-10 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500 font-medium">Belum ada paket ujian tersedia untuk kelas Anda</p>
        <p className="text-gray-400 text-sm mt-1">Hubungi Admin jika sesi kelas sudah dimulai</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          {userGroups.map((g) => {
            const opt = USER_GROUP_OPTIONS.find((o) => o.id === g);
            return (
              <span
                key={g}
                className={`text-xs font-bold px-3 py-1 rounded-full border ${opt?.badgeClass ?? 'bg-slate-100 text-slate-600 border-slate-200'}`}
              >
                Akses: {opt?.label ?? g}
              </span>
            );
          })}
        </div>
        <button
          onClick={loadPackages}
          className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-[#1e3a8a] bg-white border border-gray-200 px-3 py-1.5 rounded-xl transition-colors"
          title="Muat Ulang Daftar Paket"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Segarkan</span>
        </button>
      </div>

      {/* Daftar Paket Terbuka */}
      {packages.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {packages.map((pkg, i) => {
            const normalizedType = (pkg.package_type || 'FULL').toUpperCase();
            const meta = PKG_META[normalizedType] ?? PKG_META.FULL;
            const examType = packageTypeToExamType(pkg.package_type as PackageType);

            const config = EXAM_CONFIGS[examType] || { questionCount: 20, timeMinutes: 20 };
            const displayQuestions =
              (pkg as any).question_count ||
              (pkg as any).total_questions ||
              (normalizedType === 'TO_SUBKATEGORI' ? 'Drilling' : config.questionCount);
            const displayMinutes =
              pkg.duration_minutes ||
              (pkg as any).time_minutes ||
              (normalizedType === 'TO_SUBKATEGORI' ? 25 : config.timeMinutes);

            return (
              <motion.div
                key={pkg.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.06 }}
                whileHover={{ y: -6 }}
                className="group bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer flex flex-col justify-between"
                onClick={() => setSelectedPkg(pkg)}
              >
                <div className={`bg-gradient-to-br ${meta.gradient} p-5`}>
                  <div className="flex items-start justify-between">
                    <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center">
                      <meta.icon className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/20 text-white flex items-center gap-1">
                      <Key className="w-3 h-3" /> Token
                    </span>
                  </div>
                  <h3 className="text-white font-bold text-sm mt-4 leading-tight">{pkg.name}</h3>
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between">
                  <div>
                    <p className="text-gray-500 text-xs leading-relaxed mb-3 line-clamp-2">
                      {pkg.description || TYPE_LABELS[normalizedType] || 'Simulasi CAT Terintegrasi'}
                    </p>
                    <div className="flex items-center gap-3 mb-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5" />
                        <span>{typeof displayQuestions === 'number' ? `${displayQuestions} Soal` : displayQuestions}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{displayMinutes} Menit</span>
                      </div>
                    </div>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    className="w-full py-2.5 rounded-xl text-sm font-semibold bg-gray-50 text-gray-700 group-hover:bg-gray-100 border border-gray-200 flex items-center justify-center gap-1.5 transition-all"
                  >
                    Masukkan Token
                    <ChevronRight className="w-4 h-4" />
                  </motion.button>
                </div>
              </motion.div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-gray-200 mb-6">
          <p className="text-gray-500 text-sm font-medium">Belum ada paket terbuka untuk akun Anda saat ini.</p>
        </div>
      )}

      {/* Bagian Teaser Terkunci (Hanya Tampil bagi Akun Umum, Maksimal 2 Paket) */}
      {teaserPackages.length > 0 && (
        <div className="mt-8 pt-6 border-t border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-100 px-2.5 py-1 rounded-md mb-1">
                <Sparkles className="w-3 h-3" /> Program Eksklusif
              </span>
              <h3 className="text-base font-bold text-slate-800">Paket Khusus Kelas Intensif LESKD.ID</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {teaserPackages.map((pkg) => {
              const normalizedType = (pkg.package_type || 'FULL').toUpperCase();
              const displayMinutes = pkg.duration_minutes || (normalizedType === 'TO_SUBKATEGORI' ? 25 : 100);

              return (
                <motion.div
                  key={pkg.id}
                  whileHover={{ y: -3 }}
                  onClick={() => setLockedTeaser(pkg)}
                  className="group bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden cursor-pointer flex flex-col justify-between relative"
                >
                  <div className="bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 p-5 relative">
                    <div className="flex items-start justify-between">
                      <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/15">
                        <Lock className="w-5 h-5 text-amber-300" />
                      </div>
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-400/20 text-amber-200 border border-amber-400/30">
                        Terkunci • Kelas Intensif
                      </span>
                    </div>
                    <h4 className="text-white font-bold text-sm mt-4 leading-tight">{pkg.name}</h4>
                  </div>

                  <div className="p-4 flex-1 flex flex-col justify-between bg-slate-50/40">
                    <div>
                      <p className="text-slate-500 text-xs leading-relaxed mb-3 line-clamp-2">
                        {pkg.description || TYPE_LABELS[normalizedType] || 'Paket latihan terstruktur khusus peserta Kelas Intensif LESKD.ID.'}
                      </p>
                      <div className="flex items-center gap-3 mb-4 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3.5 h-3.5" />
                          {TYPE_LABELS[normalizedType] ?? 'HOTS SKD'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          {displayMinutes} Menit
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="w-full py-2.5 rounded-xl text-xs font-bold bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Buka Akses Kelas Intensif
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal Token untuk Paket Terbuka */}
      <AnimatePresence>
        {selectedPkg && (
          <TokenGate
            pkg={selectedPkg}
            onSuccess={handleTokenSuccess}
            onClose={() => setSelectedPkg(null)}
          />
        )}
      </AnimatePresence>

      {/* Modal Promo untuk Paket Teaser Terkunci */}
      <AnimatePresence>
        {lockedTeaser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setLockedTeaser(null)}
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 16 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 16 }}
              className="bg-white rounded-3xl p-6 max-w-md w-full relative z-10 shadow-2xl border border-slate-100 space-y-5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <Lock className="w-5 h-5 text-amber-700" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-700">
                      Akses Khusus Peserta Kelas
                    </span>
                    <h3 className="font-bold text-slate-800 text-base leading-snug">{lockedTeaser.name}</h3>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setLockedTeaser(null)}
                  className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-slate-600 leading-relaxed">
                Paket ini merupakan fasilitas eksklusif bagi peserta <strong>Kelas Intensif SKD LESKD.ID</strong>. Bergabung di kelas untuk membuka seluruh paket drilling HOTS dan bimbingan langsung bersama tentor:
              </p>

              <div className="bg-slate-50 rounded-2xl p-4 space-y-2.5 border border-slate-100 text-xs text-slate-700">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span><strong>12 Pertemuan Live Intensif + Rekaman</strong> bedah tuntas TWK, TIU, & TKP.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Drilling HOTS per Sub-Materi</strong> lengkap dengan pembahasan resmi standar CAT BKN.</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                  <span><strong>Peta Diagnostik Kompetensi</strong> untuk memantau kelemahan bab secara akurat.</span>
                </div>
              </div>

              <div className="flex gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => setLockedTeaser(null)}
                  className="px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-semibold text-xs hover:bg-slate-50"
                >
                  Nanti Saja
                </button>
                <button
                  type="button"
                  onClick={() => openWhatsAppPromo(lockedTeaser)}
                  className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
                >
                  <MessageCircle className="w-4 h-4" />
                  Tanya & Daftar via WhatsApp
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Loading Overlay */}
      <AnimatePresence>
        {starting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-white/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-4"
          >
            <div className="w-12 h-12 border-4 border-[#1e3a8a] border-t-transparent rounded-full animate-spin" />
            <p className="text-[#1e3a8a] font-semibold text-sm">Memuat soal ujian...</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
