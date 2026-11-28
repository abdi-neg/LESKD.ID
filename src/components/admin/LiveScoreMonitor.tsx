import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  CheckCircle,
  Clock,
  Trophy,
  RefreshCw,
  BarChart3,
  Award,
  TrendingUp,
  Filter,
  Trash2,
  ChevronDown,
  Calendar,
  Search,
  Target,
  AlertTriangle,
  Eye,
  EyeOff,
  XCircle,
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ExamResult } from '../../types';

const PKG_COLORS: Record<string, string> = {
  MINI_TIU: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  TIU: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  MINI_TWK: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  TWK: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  MINI_TKP: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  TKP: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
  TO_SUBKATEGORI: 'bg-purple-500/10 text-purple-400 border border-purple-500/20',
  FULL: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20',
};

const PKG_LABELS: Record<string, string> = {
  MINI_TIU: 'Mini TIU',
  TIU: 'Mini TIU',
  MINI_TWK: 'Mini TWK',
  TWK: 'Mini TWK',
  MINI_TKP: 'Mini TKP',
  TKP: 'Mini TKP',
  TO_SUBKATEGORI: 'Drilling Sub-Kategori',
  FULL: 'Full CAT',
};

const FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: 'ALL', label: 'Semua Paket Ujian' },
  { value: 'FULL', label: 'Full CAT (110 Soal)' },
  { value: 'MINI_TWK', label: 'Mini TWK' },
  { value: 'MINI_TIU', label: 'Mini TIU' },
  { value: 'MINI_TKP', label: 'Mini TKP' },
  { value: 'TO_SUBKATEGORI', label: 'Drilling Sub-Kategori' },
];

// Batas toleransi sesi menggantung (zombie session) sebelum dianggap terputus
const FULL_EXPIRE_SECONDS = 180 * 60;    // 3 jam untuk Full CAT (durasi 100m + margin aman)
const DEFAULT_EXPIRE_SECONDS = 120 * 60; // 2 jam untuk Mini TO & Drilling Sub-Kategori

type ResultWithName = ExamResult & { participant_name: string };

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0m 0s';
  const totalSec = Math.floor(seconds);
  if (totalSec >= 7200) {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    return `${h}j ${m}m`;
  }
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}m ${s}s`;
}

function isCompletedStatus(status: unknown): boolean {
  const normalized = String(status ?? '').toLowerCase().trim();
  return normalized === 'completed' || normalized === 'selesai';
}

function isOngoingStatus(status: unknown): boolean {
  return String(status ?? '').toLowerCase().trim() === 'in_progress';
}

function getElapsedSeconds(r: ResultWithName, nowMs: number): number {
  if (isCompletedStatus(r.status)) {
    return r.duration_seconds ?? 0;
  }
  const rawStart = r.started_at || (r as any).created_at;
  if (!rawStart) return 0;
  const startMs = new Date(rawStart).getTime();
  if (Number.isNaN(startMs)) return 0;
  return Math.max(0, Math.floor((nowMs - startMs) / 1000));
}

function isExpiredSession(r: ResultWithName, nowMs: number): boolean {
  if (!isOngoingStatus(r.status)) return false;
  const normType = String(r.package_type ?? 'FULL').toUpperCase().trim();
  const limitSec = normType === 'FULL' ? FULL_EXPIRE_SECONDS : DEFAULT_EXPIRE_SECONDS;
  return getElapsedSeconds(r, nowMs) > limitSec;
}

export default function LiveScoreMonitor() {
  const [results, setResults] = useState<ResultWithName[]>([]);
  const [loading, setLoading] = useState(true);
  const [cleaningId, setCleaningId] = useState<string | null>(null);
  const [cleaningExpired, setCleaningExpired] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRealtime, setIsRealtime] = useState(true);
  const [countdown, setCountdown] = useState<number>(5);
  const [searchQuery, setSearchQuery] = useState('');
  const [showExpired, setShowExpired] = useState(false);

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toLocaleDateString('en-CA'));
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [filter, setFilter] = useState<string>('ALL');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [nowTick, setNowTick] = useState<number>(Date.now());

  const syncRef = useRef<() => Promise<void>>(async () => {});
  const profileCacheRef = useRef<Record<string, string>>({});

  const syncLiveMonitorData = useCallback(async () => {
    const { data: examData, error: examError } = await supabase
      .from('exam_results')
      .select(
        'id, participant_id, user_name, package_type, package_name, score_tiu, score_twk, score_tkp, total_score, passed, status, started_at, completed_at, duration_seconds'
      )
      .order('started_at', { ascending: false })
      .limit(200);

    if (examError || !examData) {
      console.error('Supabase Fetch Error:', examError);
      setLoading(false);
      return;
    }

    // Hanya ambil profil untuk participant_id yang belum punya user_name & belum tersimpan di cache
    const missingIds = Array.from(
      new Set(
        examData
          .filter((r) => !r.user_name && r.participant_id && !profileCacheRef.current[r.participant_id])
          .map((r) => r.participant_id)
      )
    );

    if (missingIds.length > 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', missingIds);

      if (profileData) {
        profileData.forEach((p) => {
          profileCacheRef.current[p.id] = p.full_name;
        });
      }
    }

    const mapped = examData.map((r) => ({
      ...r,
      participant_name: r.user_name || profileCacheRef.current[r.participant_id] || 'Peserta SKD',
    }));

    setResults(mapped as ResultWithName[]);
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    syncRef.current = syncLiveMonitorData;
  }, [syncLiveMonitorData]);

  useEffect(() => {
    setLoading(true);
    syncLiveMonitorData();
  }, [syncLiveMonitorData]);

  // Polling otomatis jeda saat tab browser tidak aktif (menghemat kuota egress Supabase)
  useEffect(() => {
    if (!isRealtime) return;

    const pollingTimer = setInterval(() => {
      if (document.hidden) return;
      syncRef.current();
      setCountdown(5);
    }, 5000);

    const visualTimer = setInterval(() => {
      if (document.hidden) return;
      setCountdown((prev) => (prev > 1 ? prev - 1 : 5));
    }, 1000);

    const tickTimer = setInterval(() => {
      if (!document.hidden) {
        setNowTick(Date.now());
      }
    }, 1000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        setNowTick(Date.now());
        syncRef.current();
        setCountdown(5);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(pollingTimer);
      clearInterval(visualTimer);
      clearInterval(tickTimer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isRealtime]);

  const todayStr = new Date().toLocaleDateString('en-CA');

  // Daftar sesi kedaluwarsa sesuai filter jenis paket (agar Admin bisa lihat & bersihkan 1 klik)
  const expiredSessions = useMemo(() => {
    return results.filter((r) => {
      const normPkgType = String(r.package_type ?? '').toUpperCase().trim();
      const matchesPackage = filter === 'ALL' ? true : normPkgType === filter;
      return matchesPackage && isExpiredSession(r, nowTick);
    });
  }, [results, filter, nowTick]);

  const filteredResults = useMemo(() => {
    return results.filter((r) => {
      const normPkgType = String(r.package_type ?? '').toUpperCase().trim();
      const matchesPackage = filter === 'ALL' ? true : normPkgType === filter;

      const isOngoing = isOngoingStatus(r.status);
      const isSubmitted = isCompletedStatus(r.status);
      const expired = isExpiredSession(r, nowTick);
      const isActiveOngoing = isOngoing && !expired;

      // Sembunyikan sesi kedaluwarsa kecuali Admin mengaktifkan tombol "Tampilkan"
      if (expired && !showExpired) {
        return false;
      }

      const matchesStatus =
        statusFilter === 'ALL'
          ? true
          : statusFilter === 'ONGOING'
            ? (showExpired ? isOngoing : isActiveOngoing)
            : isSubmitted;

      const rawDate = r.started_at ? r.started_at : (r as any).created_at;
      let examDate = '';
      if (rawDate) {
        const parsedDate = new Date(rawDate);
        if (!isNaN(parsedDate.getTime())) {
          examDate = parsedDate.toLocaleDateString('en-CA');
        }
      }

      // Hanya sesi aktif yang benar-benar berlangsung (belum expired) yang ikut terbawa ke tampilan hari ini
      const matchesDate = selectedDate
        ? examDate === selectedDate ||
          (isActiveOngoing && selectedDate === todayStr) ||
          (expired && showExpired && selectedDate === todayStr)
        : true;

      const matchesSearch = searchQuery
        ? Boolean(r.participant_name?.toLowerCase().includes(searchQuery.toLowerCase()))
        : true;

      return matchesPackage && matchesDate && matchesStatus && matchesSearch;
    });
  }, [results, filter, nowTick, showExpired, statusFilter, selectedDate, todayStr, searchQuery]);

  // Bersihkan 1 sesi in_progress (pengaman ganda: hanya boleh hapus status 'in_progress')
  const handleCloseSingleSession = async (row: ResultWithName) => {
    const expired = isExpiredSession(row, nowTick);
    const confirmMsg = expired
      ? `Hapus sesi terputus milik "${row.participant_name}" (${formatDuration(getElapsedSeconds(row, nowTick))})? Data hasil ujian lain yang sudah selesai tidak akan terpengaruh.`
      : `PERHATIAN: Sesi milik "${row.participant_name}" terlihat masih aktif. Yakin ingin menghentikan dan menghapus sesi ini dari Monitor Live?`;

    if (!window.confirm(confirmMsg)) return;

    setCleaningId(row.id);
    try {
      const { error } = await supabase
        .from('exam_results')
        .delete()
        .eq('id', row.id)
        .eq('status', 'in_progress');

      if (error) throw error;

      setResults((prev) => prev.filter((item) => item.id !== row.id));
    } catch (err) {
      console.error('Gagal membersihkan sesi:', err);
      alert('Gagal membersihkan sesi. Pastikan koneksi stabil dan hak akses Admin aktif.');
    } finally {
      setCleaningId(null);
    }
  };

  // Bersihkan massal KHUSUS sesi kedaluwarsa (aman, mustahil menghapus hasil yang sudah Submit)
  const handleCleanExpiredSessions = async () => {
    const expiredIds = expiredSessions.map((r) => r.id);
    if (expiredIds.length === 0) return;

    const confirmMsg = `Bersihkan ${expiredIds.length} sesi terputus/kedaluwarsa (lebih dari 2–3 jam tanpa submit)?\n\nAman: Seluruh data peserta yang sudah Submit atau masih aktif mengerjakan TIDAK akan disentuh.`;
    if (!window.confirm(confirmMsg)) return;

    setCleaningExpired(true);
    try {
      const { error } = await supabase
        .from('exam_results')
        .delete()
        .in('id', expiredIds)
        .eq('status', 'in_progress');

      if (error) throw error;

      setResults((prev) => prev.filter((r) => !expiredIds.includes(r.id)));
      setShowExpired(false);
    } catch (err) {
      console.error('Gagal membersihkan sesi kedaluwarsa:', err);
      alert('Terjadi kesalahan saat membersihkan sesi kedaluwarsa.');
    } finally {
      setCleaningExpired(false);
    }
  };

  const handleClearData = async () => {
    const idsToDelete = filteredResults.map((r) => r.id);

    if (idsToDelete.length === 0) {
      alert('Tabel sudah kosong, tidak ada data yang bisa dihapus pada filter aktif saat ini.');
      return;
    }

    const activeLabel = PKG_LABELS[filter] ?? filter;
    const confirmMsg =
      filter === 'ALL'
        ? `PERINGATAN BAHAYA: Anda akan menghapus PERMANEN ${idsToDelete.length} data yang tampil di layar (termasuk yang sudah Submit)! Jika hanya ingin membuang sesi menggantung, gunakan tombol "Bersihkan Sesi Terputus". Tetap lanjutkan?`
        : `PERINGATAN: Anda akan menghapus PERMANEN ${idsToDelete.length} data paket ${activeLabel} yang tampil di layar. Lanjutkan?`;

    if (!window.confirm(confirmMsg)) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('exam_results')
        .delete()
        .in('id', idsToDelete);

      if (error) throw error;

      setResults((prev) => prev.filter((r) => !idsToDelete.includes(r.id)));
      alert('Berhasil! Data sesi pilihan telah dibersihkan.');
    } catch (err) {
      console.error('Gagal menghapus data:', err);
      alert('Terjadi kesalahan saat menghapus data. Pastikan jaringan stabil.');
    } finally {
      setLoading(false);
    }
  };

  const sortedResults = useMemo(() => {
    return [...filteredResults].sort((a, b) => {
      if (b.total_score !== a.total_score) return b.total_score - a.total_score;
      if (b.score_tkp !== a.score_tkp) return b.score_tkp - a.score_tkp;
      if (b.score_tiu !== a.score_tiu) return b.score_tiu - a.score_tiu;
      return b.score_twk - a.score_twk;
    });
  }, [filteredResults]);

  const totalCount = filteredResults.length;
  const submittedRecords = filteredResults.filter((r) => isCompletedStatus(r.status));
  const submittedCount = submittedRecords.length;
  const ongoingCount = filteredResults.filter(
    (r) => isOngoingStatus(r.status) && !isExpiredSession(r, nowTick)
  ).length;

  const avgScore =
    submittedCount > 0
      ? Math.round(submittedRecords.reduce((s, r) => s + r.total_score, 0) / submittedCount)
      : 0;

  const baseListForCounters = results.filter((r) => {
    const normPkgType = String(r.package_type ?? '').toUpperCase().trim();
    return filter === 'ALL' ? true : normPkgType === filter;
  });

  const totalSesiHariIni = baseListForCounters.filter((r) => {
    const rawDate = r.started_at ? r.started_at : (r as any).created_at;
    const examDate = rawDate ? new Date(rawDate).toLocaleDateString('en-CA') : '';
    const isOngoing = isOngoingStatus(r.status);
    const expired = isExpiredSession(r, nowTick);
    if (expired && !showExpired) return false;
    const isActiveOngoing = isOngoing && !expired;
    return selectedDate
      ? examDate === selectedDate ||
        (isActiveOngoing && selectedDate === todayStr) ||
        (expired && showExpired && selectedDate === todayStr)
      : true;
  });

  const ongoingHariIniCount = totalSesiHariIni.filter(
    (r) => isOngoingStatus(r.status) && !isExpiredSession(r, nowTick)
  ).length;
  const submittedHariIniCount = totalSesiHariIni.filter((r) => isCompletedStatus(r.status)).length;

  return (
    <div className="space-y-6 p-4 sm:p-6 bg-slate-950 text-slate-100 rounded-3xl border border-slate-900 shadow-2xl font-sans">

      {/* HEADER MONITOR */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between border-b border-slate-900 pb-5 gap-4">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <Trophy className="w-7 h-7 text-amber-500" /> LIVE MONITORING SKD
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Aturan Perangkingan: Total Skor → TKP → TIU → TWK • Sinkronisasi: {lastUpdated.toLocaleTimeString('id-ID')}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Dropdown Filter Paket */}
          <div className="relative flex-grow lg:flex-grow-0 z-20">
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className="flex items-center justify-between w-full lg:w-56 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl px-4 py-2 transition-all shadow-sm"
            >
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-300">
                <Filter className="w-4 h-4 text-slate-400" />
                <span className="truncate">{FILTER_OPTIONS.find((opt) => opt.value === filter)?.label}</span>
              </div>
              <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform duration-300 ${isFilterOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isFilterOpen && (
                <>
                  <div className="fixed inset-0 z-10 cursor-default" onClick={() => setIsFilterOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.95 }}
                    transition={{ duration: 0.15, ease: 'easeOut' }}
                    className="absolute left-0 right-0 lg:right-auto top-full mt-2 w-full lg:w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-20"
                  >
                    <div className="py-1 flex flex-col">
                      {FILTER_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => {
                            setFilter(opt.value);
                            setIsFilterOpen(false);
                          }}
                          className={`text-left px-4 py-3 text-sm font-semibold transition-colors flex items-center justify-between ${
                            filter === opt.value ? 'bg-indigo-500/10 text-indigo-400' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          {opt.label}
                          {filter === opt.value && <CheckCircle className="w-4 h-4 text-indigo-400" />}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={handleClearData}
            title="Hapus Data Tabel Sesuai Filter Aktif"
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            <span className="hidden sm:inline">Bersihkan Data</span>
          </button>

          <button
            onClick={() => setIsRealtime(!isRealtime)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold tracking-wide uppercase transition-colors flex-grow lg:flex-grow-0 justify-center
              ${isRealtime ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}
          >
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${isRealtime ? 'bg-slate-950 animate-pulse' : 'bg-slate-500'}`} />
            <span className="whitespace-nowrap">{isRealtime ? `AUTO (${countdown}s)` : 'PAUSED'}</span>
          </button>

          <button
            onClick={() => { setLoading(true); syncLiveMonitorData(); }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* BANNER DETEKSI SESI TERPUTUS / KEDALUWARSA */}
      <AnimatePresence>
        {expiredSessions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-amber-500/10 border border-amber-500/25 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 flex-shrink-0 mt-0.5">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-amber-300">
                  Terdeteksi {expiredSessions.length} sesi terputus / kedaluwarsa (lebih dari 2–3 jam tanpa submit)
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Otomatis disembunyikan agar tidak mengganggu pantauan hari ini dan tidak merusak statistik aktif.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => setShowExpired((prev) => !prev)}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-slate-900 border border-slate-700 text-slate-200 hover:bg-slate-800 transition-colors"
              >
                {showExpired ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showExpired ? 'Sembunyikan' : 'Lihat Sesi'}</span>
              </button>
              <button
                type="button"
                disabled={cleaningExpired}
                onClick={handleCleanExpiredSessions}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 transition-colors disabled:opacity-60"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{cleaningExpired ? 'Membersihkan...' : `Bersihkan (${expiredSessions.length})`}</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* CONTROL BOARD FILTER ADVANCED */}
      <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-900/80 space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">

          {/* Kalender Pemilih Tanggal */}
          <div className="flex items-center gap-2 border border-slate-800 rounded-xl px-3 py-2 bg-slate-950 text-xs font-bold">
            <Calendar className="w-4 h-4 text-slate-400 flex-shrink-0" />
            <span className="text-slate-400">Tanggal:</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-slate-200 outline-none cursor-pointer focus:text-indigo-400 font-mono"
            />
            {selectedDate && (
              <button
                onClick={() => setSelectedDate('')}
                className="text-[10px] text-rose-400 font-black tracking-wider uppercase bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/10 hover:bg-rose-500 hover:text-white ml-2"
              >
                Semua Hari
              </button>
            )}
          </div>

          {/* Kotak Pencarian Nama */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <input
              type="text"
              placeholder="Cari nama kontestan di layar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 pl-9 pr-4 py-2 border border-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/30 text-slate-200"
            />
          </div>
        </div>

        {/* Tab Switcher Filter Status Sesi */}
        <div className="flex flex-wrap gap-2 text-xs font-bold border-t border-slate-900 pt-3">
          {[
            { id: 'ALL', label: 'Semua Kontestan', count: totalSesiHariIni.length },
            { id: 'ONGOING', label: 'Sedang Berjuang', count: ongoingHariIniCount },
            { id: 'SUBMITTED', label: 'Selesai Sesi', count: submittedHariIniCount }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-2 rounded-xl transition-all border flex items-center gap-2 ${
                statusFilter === tab.id
                  ? 'bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/10'
                  : 'bg-slate-950 border-slate-900 text-slate-400 hover:bg-slate-900'
              }`}
            >
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-black ${statusFilter === tab.id ? 'bg-white/20 text-white' : 'bg-slate-900 text-slate-500'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* STATS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users, label: 'Total Sesi Filtered', value: totalCount, color: 'text-blue-400', bg: 'bg-blue-500/5 border border-blue-500/10' },
          { icon: CheckCircle, label: 'Sudah Submit', value: submittedCount, color: 'text-emerald-400', bg: 'bg-emerald-500/5 border border-emerald-500/10' },
          { icon: Clock, label: 'Aktif Mengerjakan', value: ongoingCount, color: 'text-amber-400', bg: 'bg-amber-500/5 border border-amber-500/10' },
          { icon: TrendingUp, label: 'Rerata Skor (Submit)', value: avgScore, color: 'text-indigo-400', bg: 'bg-indigo-500/5 border border-indigo-500/10' },
        ].map((stat, i) => (
          <div key={i} className={`rounded-2xl p-4 ${stat.bg}`}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-2 bg-slate-900">
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className="text-2xl font-black font-mono text-slate-100">{stat.value}</p>
            <p className="text-slate-400 text-xs mt-0.5 font-medium">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* TABEL MONITORING UTAMA */}
      <div className="bg-slate-900/40 rounded-2xl border border-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[850px]">
            <thead>
              <tr className="bg-slate-900/90 text-slate-400 text-xs uppercase tracking-wider font-bold border-b border-slate-800">
                <th className="px-5 py-3.5 text-center w-20">Rank</th>
                <th className="px-5 py-3.5">Nama Kontestan</th>
                <th className="px-5 py-3.5">Jenis Paket</th>
                <th className="px-5 py-3.5 text-center bg-rose-950/20 text-rose-400 w-20">TKP</th>
                <th className="px-5 py-3.5 text-center bg-blue-950/20 text-blue-400 w-20">TIU</th>
                <th className="px-5 py-3.5 text-center bg-emerald-950/20 text-emerald-400 w-20">TWK</th>
                <th className="px-5 py-3.5 text-center text-amber-400 font-black w-28">TOTAL</th>
                <th className="px-5 py-3.5 text-center">Durasi</th>
                <th className="px-5 py-3.5 text-right">Status Submisi & Hasil</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-900/60 font-medium text-sm">
              <AnimatePresence initial={false}>
                {sortedResults.map((r, index) => {
                  const isTopThree = index < 3;
                  const rankBadges = [
                    'bg-amber-400 text-slate-950 ring-4 ring-amber-500/20',
                    'bg-slate-300 text-slate-950 ring-4 ring-slate-400/20',
                    'bg-amber-700 text-white ring-4 ring-amber-800/20',
                  ];

                  const isCompleted = isCompletedStatus(r.status);
                  const expired = isExpiredSession(r, nowTick);
                  const normPkgType = String(r.package_type ?? 'FULL').toUpperCase().trim();
                  const isDrillingPkg = normPkgType === 'TO_SUBKATEGORI';
                  const displaySeconds = getElapsedSeconds(r, nowTick);

                  return (
                    <motion.tr
                      key={r.id}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 350, damping: 35 }}
                      className={`transition-colors duration-150 ${
                        expired ? 'bg-rose-950/15 hover:bg-rose-950/25' : 'hover:bg-slate-900/30'
                      }`}
                    >
                      <td className="px-5 py-3.5 text-center">
                        <span className={`w-6 h-6 rounded-md font-black font-mono text-xs inline-flex items-center justify-center ${
                          isTopThree ? rankBadges[index] : 'bg-slate-800 text-slate-400'
                        }`}>
                          {index + 1}
                        </span>
                      </td>

                      <td className="px-5 py-3.5">
                        <p className="font-bold text-slate-200 uppercase tracking-wide truncate max-w-[180px]">
                          {r.participant_name}
                        </p>
                      </td>

                      <td className="px-5 py-3.5">
                        <div className="flex flex-col items-start gap-1">
                          <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md whitespace-nowrap ${PKG_COLORS[normPkgType] ?? 'bg-slate-800 text-slate-400'}`}>
                            {PKG_LABELS[normPkgType] ?? r.package_name}
                          </span>
                          {isDrillingPkg && r.package_name && (
                            <span className="text-[10px] text-slate-400 truncate max-w-[170px]">
                              {r.package_name}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-5 py-3.5 text-center font-mono font-bold text-slate-300 bg-rose-950/5">{r.score_tkp}</td>
                      <td className="px-5 py-3.5 text-center font-mono font-bold text-slate-300 bg-blue-950/5">{r.score_tiu}</td>
                      <td className="px-5 py-3.5 text-center font-mono font-bold text-slate-300 bg-emerald-950/5">{r.score_twk}</td>

                      <td className="px-5 py-3.5 text-center">
                        <span className="inline-flex items-center justify-center px-3 py-1 bg-amber-500/10 border border-amber-500/20 rounded-xl font-mono font-black text-amber-400 text-sm shadow-inner w-20">
                          {r.total_score}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-md font-mono ${
                            expired
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                              : 'text-slate-400 bg-slate-900'
                          }`}
                        >
                          <Clock className={`w-3 h-3 ${expired ? 'text-rose-400' : 'text-slate-500'}`} />
                          {formatDuration(displaySeconds)}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        {isCompleted ? (
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[9px] font-black tracking-widest text-emerald-400 uppercase bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10">
                              ✓ Sudah Submit
                            </span>
                            {isDrillingPkg ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md border bg-purple-500/10 text-purple-400 border-purple-500/20">
                                <Target className="w-3.5 h-3.5" />
                                SELESAI DRILLING
                              </span>
                            ) : (
                              <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md border
                                ${r.passed
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                                <Award className="w-3.5 h-3.5" />
                                {r.passed ? 'MEMENUHI SYARAT' : 'TIDAK LULUS PG'}
                              </span>
                            )}
                          </div>
                        ) : expired ? (
                          <div className="flex flex-col items-end gap-1.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md border bg-rose-500/10 text-rose-400 border-rose-500/25">
                              <AlertTriangle className="w-3 h-3" />
                              TERPUTUS / KEDALUWARSA
                            </span>
                            <button
                              type="button"
                              disabled={cleaningId === r.id}
                              onClick={() => handleCloseSingleSession(r)}
                              className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-300 hover:text-white bg-rose-500/15 hover:bg-rose-600 px-2 py-0.5 rounded border border-rose-500/25 transition-colors disabled:opacity-50"
                            >
                              <XCircle className="w-3 h-3" />
                              {cleaningId === r.id ? 'Menghapus...' : 'Hapus Sesi'}
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-end gap-1.5">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md border bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                              BELUM SUBMIT
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-bold tracking-wider text-slate-500 uppercase">
                                Pengerjaan Aktif
                              </span>
                              <button
                                type="button"
                                disabled={cleaningId === r.id}
                                onClick={() => handleCloseSingleSession(r)}
                                title="Hentikan & hapus sesi menggantung ini"
                                className="text-[10px] font-bold text-slate-500 hover:text-rose-400 transition-colors disabled:opacity-50"
                              >
                                {cleaningId === r.id ? '...' : '× Tutup'}
                              </button>
                            </div>
                          </div>
                        )}
                      </td>
                    </motion.tr>
                  );
                })}
              </AnimatePresence>
            </tbody>
          </table>

          {sortedResults.length === 0 && (
            <div className="text-center py-20 bg-slate-950/40">
              <BarChart3 className="w-12 h-12 text-slate-800 mx-auto mb-3 animate-pulse" />
              <p className="text-slate-400 font-bold uppercase tracking-wider text-sm">
                Tidak ada aktivitas pengerjaan ujian cocok
              </p>
              <p className="text-slate-500 text-xs mt-1">
                Silakan ubah filter tanggal atau status untuk meninjau rekaman kompetensi lainnya
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
