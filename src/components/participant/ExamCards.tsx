import React, { useEffect, useMemo, useState } from 'react';
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
  X,
  GraduationCap
} from 'lucide-react';
import { useApp, packageTypeToExamType } from '../../context/AppContext';
import { ExamPackage, PackageType, USER_GROUP_OPTIONS } from '../../types';
import { supabase } from '../../lib/supabase';
import TokenGate from '../exam/TokenGate';
import { EXAM_CONFIGS } from '../../data/mockData';

const ADMIN_WHATSAPP = '628175201122';

// Hanya ambil kolom publik yang aman ke browser peserta (TANPA kolom token)
const SAFE_PACKAGE_COLUMNS =
  'id, name, description, package_type, duration_minutes, is_active, target_groups, is_teaser, created_at';

type FilterTab = 'ALL' | 'FULL' | 'MINI' | 'DRILLING';

interface TeaserPackage {
  id: string;
  name: string;
  description: string;
  package_type: PackageType;
  duration_minutes?: number;
  target_groups?: string[];
  is_teaser?: boolean;
  is_active: boolean;
  created_at?: string;
}

const PKG_META: Record<string, {
  icon: React.ElementType;
  label: string;
  topAccent: string;
  iconBox: string;
  badgeClass: string;
  isFlagship?: boolean;
}> = {
  FULL: {
    icon: Zap,
    label: 'Full CAT SKD',
    topAccent: 'bg-[#1e3a8a]',
    iconBox: 'bg-[#1e3a8a] text-white',
    badgeClass: 'bg-blue-50 text-[#1e3a8a] border-blue-200',
    isFlagship: true,
  },
  TO_SUBKATEGORI: {
    icon: Target,
    label: 'Drilling Materi',
    topAccent: 'bg-indigo-500',
    iconBox: 'bg-indigo-50 text-indigo-700 border border-indigo-100',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  MINI_TWK: {
    icon: Globe,
    label: 'Mini TO TWK',
    topAccent: 'bg-emerald-500',
    iconBox: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  MINI_TIU: {
    icon: Brain,
    label: 'Mini TO TIU',
    topAccent: 'bg-blue-500',
    iconBox: 'bg-blue-50 text-blue-700 border border-blue-100',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  MINI_TKP: {
    icon: Heart,
    label: 'Mini TO TKP',
    topAccent: 'bg-amber-500',
    iconBox: 'bg-amber-50 text-amber-700 border border-amber-100',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
};

const TYPE_DESCRIPTIONS: Record<string, string> = {
  MINI_TIU: 'Latihan terfokus kemampuan verbal, numerik, dan figural.',
  MINI_TWK: 'Latihan terfokus wawasan kebangsaan dan penalaran HOTS.',
  MINI_TKP: 'Latihan terfokus kompetensi ASN berbasis nilai BerAKHLAK.',
  TO_SUBKATEGORI: 'Drilling cepat per sub-materi untuk mempertajam akurasi dan ritme CAT.',
  FULL: 'Simulasi CAT SKD lengkap (TWK, TIU, TKP) sesuai standar ambang batas BKN.',
};

function getPackageBucket(rawType?: string): Exclude<FilterTab, 'ALL'> {
  const upper = String(rawType || 'FULL').toUpperCase();
  if (upper === 'FULL') return 'FULL';
  if (upper === 'TO_SUBKATEGORI') return 'DRILLING';
  return 'MINI';
}

function isNewPackage(createdAt?: string): boolean {
  if (!createdAt) return false;
  const parsed = Date.parse(createdAt);
  if (Number.isNaN(parsed)) return false;
  return Date.now() - parsed <= 5 * 24 * 60 * 60 * 1000;
}

export default function ExamCards() {
  const { state, startExam } = useApp();
  const [packages, setPackages] = useState<ExamPackage[]>([]);
  const [teaserPackages, setTeaserPackages] = useState<TeaserPackage[]>([]);
  const [userGroups, setUserGroups] = useState<string[]>(['UMUM']);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('ALL');
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [selectedPkg, setSelectedPkg] = useState<ExamPackage | null>(null);
  const [lockedTeaser, setLockedTeaser] = useState<TeaserPackage | null>(null);

  async function loadPackages() {
    setLoading(true);
    try {
      // 1. Ambil access_groups terbaru dari profiles (~40 Byte) agar perubahan grup aktif tanpa logout
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

      // 2. Tarik paket aktif sesuai grup peserta atau bertarget 'SEMUA' (diurutkan dari terbaru)
      const allowedTargets = Array.from(new Set([...resolvedGroups, 'SEMUA']));
      const { data: openData, error: openError } = await supabase
        .from('exam_packages')
        .select(SAFE_PACKAGE_COLUMNS)
        .eq('is_active', true)
        .overlaps('target_groups', allowedTargets)
        .order('created_at', { ascending: false });

      if (openError) {
        console.error('Gagal memuat daftar paket terbuka:', openError);
      }

      const openList = (openData ?? []) as unknown as ExamPackage[];
      setPackages(openList);

      // 3. Khusus peserta murni 'UMUM', tarik maksimal 2 paket teaser terkunci (tanpa kolom token)
      const isUmumOnly = resolvedGroups.every((g) => g === 'UMUM');
      if (isUmumOnly) {
        const { data: teaserData, error: teaserError } = await supabase
          .from('exam_packages')
          .select(SAFE_PACKAGE_COLUMNS)
          .eq('is_active', true)
          .eq('is_teaser', true)
          .order('created_at', { ascending: false });

        if (teaserError) {
          console.error('Gagal memuat daftar paket teaser:', teaserError);
        }

        const openIds = new Set(openList.map((p) => p.id));
        const filteredTeasers = ((teaserData ?? []) as unknown as TeaserPackage[])
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

  // Pengelompokan rak & tombol filter otomatis
  const grouped = useMemo(() => {
    const full = packages.filter((p) => getPackageBucket(p.package_type) === 'FULL');
    const mini = packages.filter((p) => getPackageBucket(p.package_type) === 'MINI');
    const drilling = packages.filter((p) => getPackageBucket(p.package_type) === 'DRILLING');
    const mainTryouts = [...full, ...mini];
    return { full, mini, drilling, mainTryouts };
  }, [packages]);

  const filterTabs = useMemo(() => {
    const tabs: { id: FilterTab; label: string; count: number }[] = [
      { id: 'ALL', label: 'Semua', count: packages.length },
    ];
    if (grouped.full.length > 0) {
      tabs.push({ id: 'FULL', label: 'Full SKD', count: grouped.full.length });
    }
    if (grouped.mini.length > 0) {
      tabs.push({ id: 'MINI', label: 'Mini Tryout', count: grouped.mini.length });
    }
    if (grouped.drilling.length > 0) {
      tabs.push({ id: 'DRILLING', label: 'Drilling Materi', count: grouped.drilling.length });
    }
    return tabs;
  }, [packages.length, grouped]);

  const effectiveFilter: FilterTab = filterTabs.some((t) => t.id === activeFilter)
    ? activeFilter
    : 'ALL';

  const filteredSingleList = useMemo(() => {
    if (effectiveFilter === 'FULL') return grouped.full;
    if (effectiveFilter === 'MINI') return grouped.mini;
    if (effectiveFilter === 'DRILLING') return grouped.drilling;
    return packages;
  }, [effectiveFilter, grouped, packages]);

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

  function renderPackageCard(pkg: ExamPackage, index: number) {
    const normalizedType = (pkg.package_type || 'FULL').toUpperCase();
    const meta = PKG_META[normalizedType] ?? PKG_META.FULL;
    const examType = packageTypeToExamType(pkg.package_type as PackageType);
    const config = EXAM_CONFIGS[examType] || { questionCount: 20, timeMinutes: 20 };

    const displayQuestions =
      normalizedType === 'TO_SUBKATEGORI' ? 'Drilling' : `${config.questionCount} Soal`;
    const displayMinutes =
      pkg.duration_minutes || (normalizedType === 'TO_SUBKATEGORI' ? 25 : config.timeMinutes);
    const showNewBadge = isNewPackage(pkg.created_at);

    return (
      <motion.div
        key={pkg.id}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(index * 0.04, 0.25) }}
        whileHover={{ y: -3 }}
        onClick={() => setSelectedPkg(pkg)}
        className={`group bg-white rounded-2xl border shadow-sm hover:shadow-md overflow-hidden cursor-pointer flex flex-col justify-between transition-all ${
          meta.isFlagship
            ? 'border-[#1e3a8a]/25 hover:border-[#1e3a8a]/50'
            : 'border-slate-200/80 hover:border-[#1e3a8a]/35'
        }`}
      >
        {/* Garis aksen tipis di atas kartu */}
        <div className={`h-1.5 w-full ${meta.topAccent}`} />

        <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
          <div className="space-y-3">
            {/* Baris Lencana Atas */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${meta.iconBox}`}>
                  <meta.icon className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${meta.badgeClass}`}>
                    {meta.label}
                  </span>
                  {showNewBadge && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Baru
                    </span>
                  )}
                </div>
              </div>

              <span className="text-[11px] font-semibold px-2 py-1 rounded-lg bg-slate-50 text-slate-500 border border-slate-200/80 flex items-center gap-1 flex-shrink-0">
                <Key className="w-3 h-3 text-slate-400" /> Token
              </span>
            </div>

            {/* Judul & Deskripsi */}
            <div>
              <h4 className="font-bold text-slate-900 text-base leading-snug group-hover:text-[#1e3a8a] transition-colors">
                {pkg.name}
              </h4>
              <p className="text-slate-500 text-xs leading-relaxed mt-1.5 line-clamp-2">
                {pkg.description || TYPE_DESCRIPTIONS[normalizedType] || 'Simulasi CAT Terintegrasi LESKD.ID'}
              </p>
            </div>
          </div>

          {/* Info Soal/Durasi & Tombol Aksi */}
          <div className="space-y-3.5 pt-2 border-t border-slate-100">
            <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                {displayQuestions}
              </span>
              <span className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {displayMinutes} Menit
              </span>
            </div>

            <motion.button
              type="button"
              whileTap={{ scale: 0.98 }}
              className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
                meta.isFlagship
                  ? 'bg-[#1e3a8a] text-white group-hover:bg-[#152961] shadow-sm'
                  : 'bg-blue-50/70 text-[#1e3a8a] border border-blue-200/80 group-hover:bg-[#1e3a8a] group-hover:text-white group-hover:border-[#1e3a8a]'
              }`}
            >
              <span>Mulai & Masukkan Token</span>
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-slate-200/60 rounded-2xl h-56 animate-pulse" />
        ))}
      </div>
    );
  }

  if (packages.length === 0 && teaserPackages.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-3xl border border-dashed border-slate-200">
        <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
        <p className="text-slate-600 font-semibold text-sm">Belum ada paket ujian tersedia untuk kelas Anda</p>
        <p className="text-slate-400 text-xs mt-1">Hubungi Admin jika sesi kelas sudah dimulai</p>
      </div>
    );
  }

  const hasBothShelves = grouped.mainTryouts.length > 0 && grouped.drilling.length > 0;

  return (
    <>
      {/* Baris Lencana Akses Grup, Filter Cepat, & Tombol Segarkan */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-6">
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

        <div className="flex items-center gap-2 flex-wrap">
          {/* Pil Filter hanya muncul otomatis bila ada > 1 kategori paket */}
          {filterTabs.length > 2 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              {filterTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveFilter(tab.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
                    effectiveFilter === tab.id
                      ? 'bg-[#1e3a8a] text-white border-[#1e3a8a] shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {tab.label} ({tab.count})
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            onClick={loadPackages}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#1e3a8a] bg-white border border-slate-200 px-3 py-1.5 rounded-xl transition-colors"
            title="Muat Ulang Daftar Paket"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Segarkan</span>
          </button>
        </div>
      </div>

      {/* Daftar Paket Terbuka */}
      {packages.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-2xl border border-dashed border-slate-200 mb-6">
          <p className="text-slate-500 text-sm font-medium">Belum ada paket terbuka untuk akun Anda saat ini.</p>
        </div>
      ) : effectiveFilter === 'ALL' && hasBothShelves ? (
        <div className="space-y-9">
          {/* Rak 1: Simulasi Tryout Utama (Full SKD & Mini Tryout) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-[#1e3a8a]">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 leading-tight">Simulasi Tryout Utama</h3>
                  <p className="text-xs text-slate-500">Ukur kesiapan kelulusan ambang batas (Passing Grade BKN)</p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                {grouped.mainTryouts.length} Paket
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {grouped.mainTryouts.map((pkg, i) => renderPackageCard(pkg, i))}
            </div>
          </div>

          {/* Rak 2: Drilling & Latihan Sub-Kategori */}
          <div className="space-y-4 pt-6 border-t border-slate-200/80">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 leading-tight">Drilling & Latihan Sub-Kategori</h3>
                  <p className="text-xs text-slate-500">Latihan cepat per bab materi • Diurutkan dari sesi terbaru</p>
                </div>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700">
                {grouped.drilling.length} Paket
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {grouped.drilling.map((pkg, i) => renderPackageCard(pkg, i))}
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSingleList.map((pkg, i) => renderPackageCard(pkg, i))}
        </div>
      )}

      {/* Bagian Teaser Terkunci (Hanya Tampil bagi Akun Umum, Maksimal 2 Paket) */}
      {teaserPackages.length > 0 && (
        <div className="mt-10 pt-8 border-t border-slate-200/80 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-100 px-2.5 py-1 rounded-md mb-1">
                <Sparkles className="w-3 h-3" /> Program Eksklusif
              </span>
              <h3 className="text-base font-extrabold text-slate-900">Paket Khusus Kelas Intensif LESKD.ID</h3>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {teaserPackages.map((pkg) => {
              const normalizedType = (pkg.package_type || 'FULL').toUpperCase();
              const meta = PKG_META[normalizedType] ?? PKG_META.FULL;
              const displayMinutes = pkg.duration_minutes || (normalizedType === 'TO_SUBKATEGORI' ? 25 : 100);

              return (
                <motion.div
                  key={pkg.id}
                  whileHover={{ y: -3 }}
                  onClick={() => setLockedTeaser(pkg)}
                  className="group bg-white rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-md overflow-hidden cursor-pointer flex flex-col justify-between transition-all"
                >
                  <div className="h-1.5 w-full bg-gradient-to-r from-slate-700 via-[#1e3a8a] to-amber-500" />
                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center flex-shrink-0">
                          <Lock className="w-4 h-4 text-amber-300" />
                        </div>
                        <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
                          Terkunci • Kelas Intensif
                        </span>
                      </div>

                      <div>
                        <h4 className="text-slate-900 font-bold text-base leading-snug">{pkg.name}</h4>
                        <p className="text-slate-500 text-xs leading-relaxed mt-1.5 line-clamp-2">
                          {pkg.description || TYPE_DESCRIPTIONS[normalizedType] || 'Paket latihan terstruktur khusus peserta Kelas Intensif LESKD.ID.'}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3.5 pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-4 text-xs text-slate-400 font-medium">
                        <span className="flex items-center gap-1.5">
                          <BookOpen className="w-3.5 h-3.5" />
                          {meta.label}
                        </span>
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5" />
                          {displayMinutes} Menit
                        </span>
                      </div>

                      <button
                        type="button"
                        className="w-full py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-[#1e3a8a] text-white flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Lock className="w-3.5 h-3.5 text-amber-300" />
                        Buka Akses Kelas Intensif
                      </button>
                    </div>
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
