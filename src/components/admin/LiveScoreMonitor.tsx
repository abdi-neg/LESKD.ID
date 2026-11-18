import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, CheckCircle, Clock, Trophy, RefreshCw, BarChart3, Award, TrendingUp, Filter, Trash2, ChevronDown, Calendar, Search, Target } from 'lucide-react';
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

type ResultWithName = ExamResult & { participant_name: string };

function formatDuration(seconds: number) {
  if (seconds < 0) return '0m 0s';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function isCompletedStatus(status: unknown): boolean {
  const normalized = String(status ?? '').toLowerCase().trim();
  return normalized === 'completed' ? true : normalized === 'selesai';
}

export default function LiveScoreMonitor() {
  const [results, setResults] = useState<ResultWithName[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRealtime, setIsRealtime] = useState(true);
  const [countdown, setCountdown] = useState<number>(5);
  const [searchQuery, setSearchQuery] = useState('');

  const [selectedDate, setSelectedDate] = useState<string>(new Date().toLocaleDateString('en-CA'));
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [filter, setFilter] = useState<string>('ALL');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const [nowTick, setNowTick] = useState<number>(Date.now());

  const syncRef = useRef<() => Promise<void>>(async () => {});

  const syncLiveMonitorData = useCallback(async () => {
    const { data: examData, error: examError } = await supabase
      .from('exam_results')
      .select('id, participant_id, user_name, package_type, package_name, score_tiu, score_twk, score_tkp, total_score, passed, status, started_at, completed_at, duration_seconds')
      .order('started_at', { ascending: false })
      .limit(200);

    const hasFetchError = Boolean(examError);
    if (hasFetchError ? true : !examData) {
      console.error('Supabase Fetch Error:', examError);
      setLoading(false);
      return;
    }

    const participantIds = Array.from(new Set(examData.map((r) => r.participant_id).filter(Boolean)));

    const nameMap: Record<string, string> = {};
    if (participantIds.length > 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', participantIds);

      if (profileData) {
        profileData.forEach((p) => {
          nameMap[p.id] = p.full_name;
        });
      }
    }

    const mapped = examData.map((r) => ({
      ...r,
      participant_name: r.user_name ? r.user_name : (nameMap[r.participant_id] ?? 'Peserta SKD'),
    }));

    setResults(mapped as any);
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

  useEffect(() => {
    if (!isRealtime) return;

    const pollingTimer = setInterval(() => {
      syncRef.current();
      setCountdown(5);
    }, 5000);

    const visualTimer = setInterval(() => {
      setCountdown((prev) => (prev > 1 ? prev - 1 : 5));
    }, 1000);

    const tickTimer = setInterval(() => {
      setNowTick(Date.now());
    }, 1000);

    return () => {
      clearInterval(pollingTimer);
      clearInterval(visualTimer);
      clearInterval(tickTimer);
    };
  }, [isRealtime]);

  const filteredResults = results.filter((r) => {
    const normPkgType = String(r.package_type ?? '').toUpperCase().trim();
    const matchesPackage = filter === 'ALL' ? true : normPkgType === filter;

    const currentStatus = String(r.status ?? '').toLowerCase().trim();
    const isOngoingSession = currentStatus === 'in_progress';
    const isSubmittedSession = isCompletedStatus(r.status);

    const matchesStatus =
      statusFilter === 'ALL'
        ? true
        : statusFilter === 'ONGOING'
          ? isOngoingSession
          : isSubmittedSession;

    const todayStr = new Date().toLocaleDateString('en-CA');
    const rawDate = r.started_at ? r.started_at : (r as any).created_at;
    let examDate = '';

    if (rawDate) {
      const parsedDate = new Date(rawDate);
      if (!isNaN(parsedDate.getTime())) {
        examDate = parsedDate.toLocaleDateString('en-CA');
      }
    }

    const matchesDate = selectedDate
      ? (examDate === selectedDate ? true : (isOngoingSession && selectedDate === todayStr))
      : true;

    const matchesSearch = searchQuery
      ? Boolean(r.participant_name?.toLowerCase().includes(searchQuery.toLowerCase()))
      : true;

    return matchesPackage && matchesDate && matchesStatus && matchesSearch;
  });

  const handleClearData = async () => {
    const idsToDelete = filteredResults.map((r) => r.id);

    if (idsToDelete.length === 0) {
      alert('Tabel sudah kosong, tidak ada data yang bisa dihapus pada filter aktif saat ini.');
      return;
    }

    const activeLabel = PKG_LABELS[filter] ?? filter;
    const confirmMsg =
      filter === 'ALL'
        ? `PERINGATAN BAHAYA: Anda akan menghapus ${idsToDelete.length} data riwayat yang tampil di layar sesuai filter aktif saat ini! Lanjutkan?`
        : `Anda akan menghapus ${idsToDelete.length} data riwayat khusus untuk paket ${activeLabel} pada filter aktif. Lanjutkan?`;

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

  const sortedResults = [...filteredResults].sort((a, b) => {
    if (b.total_score !== a.total_score) {
      return b.total_score - a.total_score;
    }
    if (b.score_tkp !== a.score_tkp) {
      return b.score_tkp - a.score_tkp;
    }
    if (b.score_tiu !== a.score_tiu) {
      return b.score_tiu - a.score_tiu;
    }
    return b.score_twk - a.score_twk;
  });

  const totalCount = filteredResults.length;
  const submittedRecords = filteredResults.filter((r) => isCompletedStatus(r.status));
  const submittedCount = submittedRecords.length;
  const ongoingCount = filteredResults.filter((r) => String(r.status ?? '').toLowerCase().trim() === 'in_progress').length;

  const avgScore =
    submittedCount > 0
      ? Math.round(submittedRecords.reduce((s, r) => s + r.total_score, 0) / submittedCount)
      : 0;

  const baseListForCounters = results.filter((r) => {
    const normPkgType = String(r.package_type ?? '').toUpperCase().trim();
    return filter === 'ALL' ? true : normPkgType === filter;
  });
  const todayStr = new Date().toLocaleDateString('en-CA');

  const totalSesiHariIni = baseListForCounters.filter((r) => {
    const rawDate = r.started_at ? r.started_at : (r as any).created_at;
    const examDate = rawDate ? new Date(rawDate).toLocaleDateString('en-CA') : '';
    const isOngoing = String(r.status ?? '').toLowerCase().trim() === 'in_progress';
    return selectedDate ? (examDate === selectedDate ? true : (isOngoing && selectedDate === todayStr)) : true;
  });

  const ongoingHariIniCount = totalSesiHariIni.filter((r) => String(r.status ?? '').toLowerCase().trim() === 'in_progress').length;
  const submittedHariIniCount = totalSesiHariIni.filter((r) => isCompletedStatus(r.status)).length;

  return (
    <div className="space-y-6 p-6 bg-slate-950 text-slate-100 rounded-3xl border border-slate-900 shadow-2xl font-sans">

      {/* HEADER MONITOR */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between border-b border-slate-900 pb-5 gap-4">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <Trophy className="w-7 h-7 text-amber-500" /> LIVE MONITORING SKD
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Aturan Perangkingan: Total Skor &rarr; TKP &rarr; TIU &rarr; TWK &bull; Sinkronisasi: {lastUpdated.toLocaleTimeString('id-ID')}
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
            title="Bersihkan Data Tabel Sesuai Filter"
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
          { icon: Clock, label: 'Belum Submit', value: ongoingCount, color: 'text-amber-400', bg: 'bg-amber-500/5 border border-amber-500/10' },
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
                <th className="px-5 py-3.5 text-right">Status Submisi &amp; Hasil</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-900/60 font-medium text-sm">
              <AnimatePresence initial={false}>
                {sortedResults.map((r, index) => {
                  const isTopThree = index < 3;
                  const rankBadges = [
                    'bg-amber-400 text-slate-950 ring-4 ring-amber-500/20',
                    'bg-slate-300 text-slate-950 ring-4 ring-slate-400/20',
                    'bg-amber-700 text-white ring-4 ring-amber-800/20'
                  ];

                  const isCompleted = isCompletedStatus(r.status);
                  const normPkgType = String(r.package_type ?? 'FULL').toUpperCase().trim();
                  const isDrillingPkg = normPkgType === 'TO_SUBKATEGORI';

                  const displaySeconds = isCompleted
                    ? (r.duration_seconds ?? 0)
                    : (r.started_at ? Math.floor((nowTick - new Date(r.started_at).getTime()) / 1000) : 0);

                  return (
                    <motion.tr
                      key={r.id}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ type: 'spring', stiffness: 350, damping: 35 }}
                      className="hover:bg-slate-900/30 transition-colors duration-150"
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
                        <span className="inline-flex items-center gap-1 text-xs text-slate-400 bg-slate-900 px-2 py-1 rounded-md font-mono">
                          <Clock className="w-3 h-3 text-slate-500" />
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
                        ) : (
                          <div className="flex flex-col items-end gap-1">
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md border bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                              BELUM SUBMIT
                            </span>
                            <span className="text-[9px] font-bold tracking-wider text-slate-500 uppercase">
                              Pengerjaan Aktif
                            </span>
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
