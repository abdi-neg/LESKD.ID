import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Users, CheckCircle, Clock, Trophy, RefreshCw, BarChart3, Award, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ExamResult, PackageType } from '../../types';

const PKG_COLORS: Record<PackageType, string> = {
  MINI_TIU: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
  MINI_TWK: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
  MINI_TKP: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
  FULL: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
};

const PKG_LABELS: Record<PackageType, string> = {
  MINI_TIU: 'Mini TIU',
  MINI_TWK: 'Mini TWK',
  MINI_TKP: 'Mini TKP',
  FULL: 'Full CAT',
};

type ResultWithName = ExamResult & { participant_name: string };

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export default function LiveScoreMonitor() {
  const [results, setResults] = useState<ResultWithName[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [isRealtime, setIsRealtime] = useState(true);
  
  const syncRef = useRef<() => Promise<void>>(async () => {});

  // 1. Fungsi Utama Sinkronisasi Data (Sudah Diperbaiki: Menggunakan kolom 'id' yang valid)
  const syncLiveMonitorData = useCallback(async () => {
    const { data: examData, error: examError } = await supabase
      .from('exam_results')
      .select('*') 
      .order('id', { ascending: false }) // ✅ FIX: Menggunakan 'id' sebagai pengganti 'updated_at' yang tidak eksis
      .limit(150);

    if (examError || !examData) {
      console.error("Supabase Fetch Error:", examError);
      setLoading(false);
      return;
    }

    // Ambil daftar ID peserta yang unik
    const participantIds = Array.from(new Set(examData.map(r => r.participant_id).filter(Boolean)));
    
    let nameMap: Record<string, string> = {};
    if (participantIds.length > 0) {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', participantIds);
      
      if (profileData) {
        profileData.forEach(p => {
          nameMap[p.id] = p.full_name;
        });
      }
    }

    // Gabungkan data ujian dengan nama (memprioritaskan cache user_name dari tabel exam_results)
    const mapped = examData.map((r) => ({
      ...r,
      participant_name: r.user_name || nameMap[r.participant_id] || 'Peserta SKD',
    }));

    setResults(mapped);
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    syncRef.current = syncLiveMonitorData;
  }, [syncLiveMonitorData]);

  // Jalankan sync saat pertama kali komponen dimuat
  useEffect(() => {
    setLoading(true);
    syncLiveMonitorData();
  }, [syncLiveMonitorData]);

  // 2. Berlangganan Stream Realtime (Menangkap INSERT & UPDATE saat peserta menjawab)
  useEffect(() => {
    if (!isRealtime) return;

    const channel = supabase
      .channel('bkn-broadcast-channel')
      .on(
        'postgres_changes',
        {
          event: '*', 
          schema: 'public',
          table: 'exam_results',
        },
        () => {
          syncRef.current();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isRealtime]);

  // 3. ALGORITMA RANKING + BREAK-THE-TIE BKN
  const sortedResults = [...results].sort((a, b) => {
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

  // 4. KALKULASI STATISTIK SECARA DINAMIS
  const totalCount = results.length;
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  
  const avgScore = totalCount > 0
    ? Math.round(results.reduce((s, r) => s + r.total_score, 0) / totalCount)
    : 0;

  return (
    <div className="space-y-6 p-6 bg-slate-950 text-slate-100 rounded-3xl border border-slate-900 shadow-2xl font-sans">
      {/* Header Ala Monitor Broadcast BKN */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-900 pb-5 gap-4">
        <div>
          <h2 className="text-2xl font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
            <Trophy className="w-7 h-7 text-amber-500" /> LIVE MONITOR MONITORING SKD
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Aturan Perangkingan: Total Skor &rarr; TKP &rarr; TIU &rarr; TWK &bull; Sinkronisasi: {lastUpdated.toLocaleTimeString('id-ID')}
          </p>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-center">
          <button
            onClick={() => setIsRealtime(!isRealtime)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold tracking-wide uppercase transition-colors
              ${isRealtime ? 'bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20' : 'bg-slate-900 text-slate-400 border border-slate-800'}`}
          >
            <span className={`w-2 h-2 rounded-full ${isRealtime ? 'bg-slate-950 animate-pulse' : 'bg-slate-500'}`} />
            {isRealtime ? 'STREAM LIVE' : 'PAUSED'}
          </button>
          <button
            onClick={() => { setLoading(true); syncLiveMonitorData(); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Re-Sync
          </button>
        </div>
      </div>

      {/* Summary Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { icon: Users, label: 'Total Sesi', value: totalCount, color: 'text-blue-400', bg: 'bg-blue-500/5 border border-blue-500/10' },
          { icon: CheckCircle, label: 'Lulus Batas PG', value: passedCount, color: 'text-emerald-400', bg: 'bg-emerald-500/5 border border-emerald-500/10' },
          { icon: Activity, label: 'Tidak Lulus PG', value: failedCount, color: 'text-rose-400', bg: 'bg-rose-500/5 border border-rose-500/10' },
          { icon: TrendingUp, label: 'Rata-rata Nilai', value: avgScore, color: 'text-amber-400', bg: 'bg-amber-500/5 border border-amber-500/10' },
        ].map((stat, i) => (
          <div key={i} className={`rounded-2xl p-4 ${stat.bg}`}>
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center mb-2 bg-slate-900`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className="text-2xl font-black font-mono text-slate-100">{stat.value}</p>
            <p className="text-slate-400 text-xs mt-0.5 font-medium">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Papan Peringkat Utama */}
      <div className="bg-slate-900/40 rounded-2xl border border-slate-900 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
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
                <th className="px-5 py-3.5 text-right">Status Kelulusan</th>
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
                        <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-md whitespace-nowrap ${PKG_COLORS[r.package_type] ?? 'bg-slate-800 text-slate-400'}`}>
                          {PKG_LABELS[r.package_type] ?? r.package_name}
                        </span>
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
                          {formatDuration(r.duration_seconds || 0)}
                        </span>
                      </td>

                      <td className="px-5 py-3.5 text-right">
                        {r.completed_at ? (
                          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-md border
                            ${r.passed 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'}`}>
                            <Award className="w-3.5 h-3.5" />
                            {r.passed ? 'MEMENUHI SYARAT' : 'TIDAK LULUS PG'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-md border bg-amber-500/10 text-amber-400 border-amber-500/20 animate-pulse">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                            ON PROGRESS
                          </span>
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
              <p className="text-slate-400 font-bold uppercase tracking-wider text-sm">Belum Ada Sesi Ujian Berakhir</p>
              <p className="text-slate-500 text-xs mt-1">Papan skor akan otomatis bergeser begitu peserta mengirimkan jawaban mereka</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
