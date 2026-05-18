import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Activity, Users, CheckCircle, Clock, TrendingUp, RefreshCw, Wifi, BarChart3 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ExamResult, PackageType } from '../../types';

const PKG_COLORS: Record<PackageType, string> = {
  MINI_TIU: 'bg-blue-100 text-blue-700',
  MINI_TWK: 'bg-emerald-100 text-emerald-700',
  MINI_TKP: 'bg-rose-100 text-rose-700',
  FULL: 'bg-[#1e3a8a]/10 text-[#1e3a8a]',
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
  const [autoRefresh, setAutoRefresh] = useState(true);

  const load = useCallback(async () => {
    const since = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data } = await supabase
      .from('exam_results')
      .select(`*, profiles:participant_id (full_name)`)
      .gte('completed_at', since)
      .order('completed_at', { ascending: false })
      .limit(50);

    if (data) {
      const mapped = (data as (ExamResult & { profiles: { full_name: string } | null })[]).map((r) => ({
        ...r,
        participant_name: r.profiles?.full_name ?? 'Unknown',
      }));
      setResults(mapped);
    }
    setLastUpdated(new Date());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [autoRefresh, load]);

  const totalCount = results.length;
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  const avgScore = totalCount > 0
    ? Math.round(results.reduce((s, r) => s + r.total_score, 0) / totalCount)
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Monitor Live</h2>
          <p className="text-gray-500 text-sm mt-0.5">
            Hasil ujian 2 jam terakhir &mdash; diperbarui {lastUpdated.toLocaleTimeString('id-ID')}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors
              ${autoRefresh ? 'bg-[#10b981] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            <Wifi className="w-4 h-4" />
            {autoRefresh ? 'Live' : 'Paused'}
          </button>
          <button
            onClick={load}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: Users, label: 'Total Ujian', value: totalCount, color: 'text-[#1e3a8a]', bg: 'bg-blue-50' },
          { icon: Activity, label: 'Lulus', value: passedCount, color: 'text-[#10b981]', bg: 'bg-emerald-50' },
          { icon: CheckCircle, label: 'Belum Lulus', value: failedCount, color: 'text-red-500', bg: 'bg-red-50' },
          { icon: TrendingUp, label: 'Rata-rata Skor', value: avgScore, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4"
          >
            <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center mb-3`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
            <p className="text-gray-500 text-xs mt-0.5">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Results Table */}
      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-50 flex items-center justify-between">
          <h3 className="font-bold text-gray-800">Hasil Ujian Terkini</h3>
          <div className="flex items-center gap-2">
            <motion.div
              animate={{ opacity: autoRefresh ? [1, 0.3, 1] : 1 }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className={`w-2.5 h-2.5 rounded-full ${autoRefresh ? 'bg-[#10b981]' : 'bg-gray-300'}`}
            />
            <span className="text-xs text-gray-500 font-medium">{autoRefresh ? 'Auto-refresh 15s' : 'Paused'}</span>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3 p-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-100 rounded-xl h-12 animate-pulse" />
            ))}
          </div>
        ) : results.length === 0 ? (
          <div className="text-center py-16">
            <BarChart3 className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Belum ada ujian dalam 2 jam terakhir</p>
            <p className="text-gray-400 text-sm mt-1">Data akan muncul secara otomatis saat peserta menyelesaikan ujian</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Peserta</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Paket</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase text-center">TIU</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase text-center">TWK</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase text-center">TKP</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Total</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase text-center">Durasi</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Waktu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {results.map((r, i) => (
                  <motion.tr
                    key={r.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-[#1e3a8a] to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {r.participant_name.charAt(0).toUpperCase()}
                        </div>
                        <p className="text-sm font-medium text-gray-800 whitespace-nowrap">{r.participant_name}</p>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${PKG_COLORS[r.package_type] ?? 'bg-gray-100 text-gray-700'}`}>
                        {PKG_LABELS[r.package_type] ?? r.package_name}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center font-mono font-semibold text-sm text-gray-700">{r.score_tiu}</td>
                    <td className="px-5 py-4 text-center font-mono font-semibold text-sm text-gray-700">{r.score_twk}</td>
                    <td className="px-5 py-4 text-center font-mono font-semibold text-sm text-gray-700">{r.score_tkp}</td>
                    <td className="px-5 py-4 text-center font-mono font-bold text-sm text-[#1e3a8a]">{r.total_score}</td>
                    <td className="px-5 py-4 text-center">
                      <span className="flex items-center justify-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        {formatDuration(r.duration_seconds)}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full
                        ${r.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                        {r.passed ? <CheckCircle className="w-3 h-3" /> : <Activity className="w-3 h-3" />}
                        {r.passed ? 'Lulus' : 'Belum'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right text-xs text-gray-400 whitespace-nowrap">
                      {new Date(r.completed_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
