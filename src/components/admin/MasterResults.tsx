import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Search, BarChart3, CheckCircle, XCircle, Clock, Filter } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { ExamResult, PackageType } from '../../types';

const PKG_LABELS: Record<PackageType, string> = {
  MINI_TIU: 'Mini TIU',
  MINI_TWK: 'Mini TWK',
  MINI_TKP: 'Mini TKP',
  FULL: 'Full CAT',
};

const PKG_COLORS: Record<PackageType, string> = {
  MINI_TIU: 'bg-blue-100 text-blue-700',
  MINI_TWK: 'bg-emerald-100 text-emerald-700',
  MINI_TKP: 'bg-rose-100 text-rose-700',
  FULL: 'bg-slate-100 text-slate-700',
};

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

export default function MasterResults() {
  const [results, setResults] = useState<ExamResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [packageFilter, setPackageFilter] = useState<PackageType | 'ALL'>('ALL');

  async function loadResults() {
    setLoading(true);
    const { data } = await supabase
      .from('exam_results')
      .select(`
        *,
        profiles:participant_id (full_name)
      `)
      .order('completed_at', { ascending: false });

    if (data) {
      const mapped = data.map((r: ExamResult & { profiles: { full_name: string } | null }) => ({
        ...r,
        participant_name: r.profiles?.full_name ?? 'Unknown',
      }));
      setResults(mapped);
    }
    setLoading(false);
  }

  useEffect(() => { loadResults(); }, []);

  const filtered = results.filter((r) => {
    const name = r.participant_name?.toLowerCase() ?? '';
    const pkg = r.package_name?.toLowerCase() ?? '';
    const matchSearch = name.includes(search.toLowerCase()) || pkg.includes(search.toLowerCase());
    const matchPkg = packageFilter === 'ALL' || r.package_type === packageFilter;
    return matchSearch && matchPkg;
  });

  const totalPassed = filtered.filter((r) => r.passed).length;
  const totalFailed = filtered.filter((r) => !r.passed).length;
  const avgScore = filtered.length > 0
    ? Math.round(filtered.reduce((sum, r) => sum + r.total_score, 0) / filtered.length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Hasil Ujian Peserta</h1>
          <p className="text-gray-500 text-sm mt-0.5">Rekap seluruh hasil ujian dari semua peserta</p>
        </div>
        <button onClick={loadResults} className="text-gray-400 hover:text-gray-600 transition-colors">
          <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Ujian', value: filtered.length, color: 'text-[#1e3a8a]', bg: 'bg-blue-50' },
          { label: 'Lulus', value: totalPassed, color: 'text-[#10b981]', bg: 'bg-emerald-50' },
          { label: 'Belum Lulus', value: totalFailed, color: 'text-red-500', bg: 'bg-red-50' },
          { label: 'Rata-rata Skor', value: avgScore, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map((s, i) => (
          <div key={i} className={`${s.bg} rounded-2xl p-4`}>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-gray-600 text-xs mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nama peserta atau paket..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a]"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <select
            value={packageFilter}
            onChange={(e) => setPackageFilter(e.target.value as PackageType | 'ALL')}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/20 focus:border-[#1e3a8a] bg-white"
          >
            <option value="ALL">Semua Paket</option>
            <option value="MINI_TIU">Mini TIU</option>
            <option value="MINI_TWK">Mini TWK</option>
            <option value="MINI_TKP">Mini TKP</option>
            <option value="FULL">Full CAT</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-gray-100 rounded-2xl h-16 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-300">
          <BarChart3 className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Belum ada hasil ujian</p>
          <p className="text-gray-400 text-sm mt-1">Data akan muncul setelah peserta menyelesaikan ujian</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Peserta</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Paket</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">TIU</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">TWK</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">TKP</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Total</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Status</th>
                  <th className="text-center px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Durasi</th>
                  <th className="text-right px-4 py-3 font-semibold text-gray-600 whitespace-nowrap">Tanggal</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <motion.tr
                    key={r.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800 whitespace-nowrap">{r.participant_name}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${PKG_COLORS[r.package_type] ?? 'bg-gray-100 text-gray-700'}`}>
                        {PKG_LABELS[r.package_type] ?? r.package_name}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-semibold text-gray-700">{r.score_tiu}</td>
                    <td className="px-4 py-3 text-center font-mono font-semibold text-gray-700">{r.score_twk}</td>
                    <td className="px-4 py-3 text-center font-mono font-semibold text-gray-700">{r.score_tkp}</td>
                    <td className="px-4 py-3 text-center font-mono font-bold text-[#1e3a8a]">{r.total_score}</td>
                    <td className="px-4 py-3 text-center">
                      {r.passed ? (
                        <span className="flex items-center justify-center gap-1 text-xs font-semibold text-[#10b981]">
                          <CheckCircle className="w-3.5 h-3.5" /> Lulus
                        </span>
                      ) : (
                        <span className="flex items-center justify-center gap-1 text-xs font-semibold text-red-500">
                          <XCircle className="w-3.5 h-3.5" /> Belum
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="flex items-center justify-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        {formatDuration(r.duration_seconds)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-xs text-gray-500 whitespace-nowrap">
                      {new Date(r.completed_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
