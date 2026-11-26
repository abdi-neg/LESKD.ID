import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy,
  Medal,
  Award,
  TrendingUp,
  RefreshCw,
  Target,
  GraduationCap,
  ShieldCheck
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useApp } from '../../context/AppContext';

interface RpcLeaderboardRow {
  rank: number;
  participant_id: string;
  participant_name: string;
  score_tiu: number;
  score_twk: number;
  score_tkp: number;
  total_score: number;
  passed: boolean;
  duration_seconds: number;
  completed_at: string;
}

interface PackageOption {
  id: string;
  name: string;
  package_type: string;
}

const SAFE_LEADERBOARD_PKG_COLUMNS = 'id, name, package_type, created_at';

export default function Leaderboard() {
  const { state } = useApp();
  const [mode, setMode] = useState<'FULL' | 'TO_SUBKATEGORI'>('FULL');
  const [packageOptions, setPackageOptions] = useState<PackageOption[]>([]);
  const [selectedPkgId, setSelectedPkgId] = useState<string>('');
  const [rows, setRows] = useState<RpcLeaderboardRow[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const currentUserId = state.profile?.id ?? '';
  const userRole = String(state.profile?.role ?? 'participant').toLowerCase();
  const isAdmin = userRole === 'admin' || userRole === 'super_admin';

  async function loadLeaderboard(activeMode = mode, preferredPkgId = selectedPkgId) {
    setLoading(true);
    try {
      // 1. Saring daftar paket sesuai access_groups peserta (tanpa mengambil kolom token)
      const pkgTypes =
        activeMode === 'FULL'
          ? ['FULL', 'Full', 'full']
          : ['TO_SUBKATEGORI', 'to_subkategori'];

      let pkgQuery = supabase
        .from('exam_packages')
        .select(SAFE_LEADERBOARD_PKG_COLUMNS)
        .in('package_type', pkgTypes)
        .order('created_at', { ascending: false });

      if (!isAdmin) {
        let resolvedGroups: string[] =
          Array.isArray(state.profile?.access_groups) && state.profile.access_groups.length > 0
            ? state.profile.access_groups
            : ['UMUM'];

        if (currentUserId && (!state.profile?.access_groups || state.profile.access_groups.length === 0)) {
          const { data: profData } = await supabase
            .from('profiles')
            .select('access_groups')
            .eq('id', currentUserId)
            .maybeSingle();

          if (Array.isArray(profData?.access_groups) && profData.access_groups.length > 0) {
            resolvedGroups = profData.access_groups;
          }
        }

        const allowedTargets = Array.from(new Set([...resolvedGroups, 'SEMUA']));
        pkgQuery = pkgQuery.overlaps('target_groups', allowedTargets);
      }

      const { data: pkgData, error: pkgError } = await pkgQuery;
      if (pkgError) {
        console.error('Gagal memuat daftar paket leaderboard:', pkgError);
        setPackageOptions([]);
        setRows([]);
        setLoading(false);
        return;
      }

      const availablePkgs = (pkgData ?? []) as PackageOption[];
      setPackageOptions(availablePkgs);

      if (availablePkgs.length === 0) {
        setSelectedPkgId('');
        setRows([]);
        setLoading(false);
        return;
      }

      const stillValid = availablePkgs.some((p) => p.id === preferredPkgId);
      const targetPkgId = stillValid ? preferredPkgId : availablePkgs[0].id;
      if (targetPkgId !== preferredPkgId) {
        setSelectedPkgId(targetPkgId);
      }

      // 2. Tarik peringkat resmi percobaan pertama dari server Supabase via RPC
      const { data: lbData, error: lbError } = await supabase.rpc('get_package_leaderboard', {
        p_package_id: targetPkgId,
        p_limit: 50,
      });

      if (lbError) {
        console.error('Gagal memuat peringkat RPC:', lbError);
        setRows([]);
      } else {
        const normalizedRows = ((lbData ?? []) as any[]).map((item, idx) => ({
          rank: Number(item.rank ?? idx + 1),
          participant_id: String(item.participant_id),
          participant_name: String(item.participant_name ?? 'Peserta'),
          score_tiu: Number(item.score_tiu ?? 0),
          score_twk: Number(item.score_twk ?? 0),
          score_tkp: Number(item.score_tkp ?? 0),
          total_score: Number(item.total_score ?? 0),
          passed: Boolean(item.passed),
          duration_seconds: Number(item.duration_seconds ?? 0),
          completed_at: String(item.completed_at ?? ''),
        }));
        setRows(normalizedRows);
      }
    } catch (err) {
      console.error('Error tak terduga saat memuat leaderboard:', err);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadLeaderboard(mode, selectedPkgId);
  }, [mode, selectedPkgId, currentUserId]);

  const isDrilling = mode === 'TO_SUBKATEGORI';
  const topTwenty = rows.slice(0, 20);
  const myEntry = currentUserId ? rows.find((r) => r.participant_id === currentUserId) : undefined;
  const isMyEntryOutsideTopTwenty = Boolean(myEntry && myEntry.rank > 20);

  const podiumOrder = topTwenty.length >= 3 ? [topTwenty[1], topTwenty[0], topTwenty[2]] : [];
  const podiumRanks = [2, 1, 3];
  const podiumHeights = ['h-20', 'h-28', 'h-16'];
  const rankIcons = [
    { icon: Trophy, barColor: 'bg-yellow-400', iconColor: 'text-yellow-800' },
    { icon: Medal, barColor: 'bg-gray-300', iconColor: 'text-gray-600' },
    { icon: Award, barColor: 'bg-amber-500', iconColor: 'text-white' },
  ];

  const handleModeSwitch = (nextMode: 'FULL' | 'TO_SUBKATEGORI') => {
    if (nextMode === mode) return;
    setSelectedPkgId('');
    setMode(nextMode);
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header & Mode Switcher */}
      <div className="p-6 border-b border-gray-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isDrilling ? 'bg-purple-50' : 'bg-amber-50'}`}>
            {isDrilling ? (
              <Target className="w-5 h-5 text-purple-600" />
            ) : (
              <Trophy className="w-5 h-5 text-amber-500" />
            )}
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">Papan Peringkat</h2>
            <p className="text-gray-400 text-xs flex items-center gap-1 mt-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
              <span>
                {isDrilling
                  ? 'Berdasarkan skor percobaan pertama per paket drilling'
                  : 'Berdasarkan skor percobaan pertama • Urutan seri standar BKN'}
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between sm:justify-end gap-3">
          {/* Toggle Tab: Full SKD vs Drilling Sub-Kategori */}
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/60">
            <button
              type="button"
              onClick={() => handleModeSwitch('FULL')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                !isDrilling ? 'bg-white text-[#1e3a8a] shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>Full SKD</span>
            </button>
            <button
              type="button"
              onClick={() => handleModeSwitch('TO_SUBKATEGORI')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                isDrilling ? 'bg-white text-purple-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Sub-Kategori</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => loadLeaderboard(mode, selectedPkgId)}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            title="Muat Ulang Peringkat"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <div className="hidden md:flex items-center gap-1.5 text-[#10b981] text-sm font-medium">
            <TrendingUp className="w-4 h-4" />
            <span>Live</span>
          </div>
        </div>
      </div>

      {/* Pemilih Paket (Muncul untuk Full SKD maupun Sub-Kategori sesuai grup kelas) */}
      {packageOptions.length > 0 && (
        <div
          className={`px-6 py-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
            isDrilling ? 'bg-purple-50/70 border-purple-100' : 'bg-blue-50/60 border-blue-100'
          }`}
        >
          <span
            className={`text-xs font-bold uppercase tracking-wider ${
              isDrilling ? 'text-purple-800' : 'text-[#1e3a8a]'
            }`}
          >
            {isDrilling ? 'Paket Drilling:' : 'Paket Simulasi:'}
          </span>
          <select
            value={selectedPkgId}
            onChange={(e) => setSelectedPkgId(e.target.value)}
            className={`bg-white border text-xs font-semibold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 sm:max-w-sm w-full ${
              isDrilling
                ? 'border-purple-200 text-purple-900 focus:ring-purple-500/30'
                : 'border-blue-200 text-slate-800 focus:ring-[#1e3a8a]/25'
            }`}
          >
            {packageOptions.map((pkg) => (
              <option key={pkg.id} value={pkg.id}>
                {pkg.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {loading ? (
        <div className="p-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-100 rounded-xl h-12 animate-pulse" />
          ))}
        </div>
      ) : topTwenty.length === 0 ? (
        <div className="text-center py-14 px-4">
          <Trophy className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Belum ada data peringkat untuk paket ini</p>
          <p className="text-gray-400 text-sm mt-1">
            {isDrilling
              ? 'Selesaikan paket Drilling Sub-Kategori untuk menjadi yang pertama di papan peringkat'
              : 'Selesaikan Tryout Full SKD untuk masuk papan peringkat resmi'}
          </p>
        </div>
      ) : (
        <>
          {/* Top 3 Podium */}
          {podiumOrder.length === 3 && (
            <div className="px-6 pt-6 pb-4 grid grid-cols-3 gap-3">
              {podiumOrder.map((entry, podiumIdx) => {
                const rank = podiumRanks[podiumIdx];
                const ri = rankIcons[rank - 1];
                const IconComp = ri.icon;
                const isMe = entry.participant_id === currentUserId;
                return (
                  <motion.div
                    key={entry.participant_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: podiumIdx * 0.1 }}
                    className="flex flex-col items-center"
                  >
                    <div
                      className={`w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg mb-2 bg-gradient-to-br ${
                        isDrilling ? 'from-purple-600 to-indigo-700' : 'from-[#1e3a8a] to-[#1e40af]'
                      }`}
                    >
                      {entry.participant_name.charAt(0).toUpperCase()}
                    </div>
                    <p className="text-xs font-semibold text-gray-700 text-center leading-tight mb-1">
                      {entry.participant_name.split(' ')[0]}
                      {isMe && <span className="text-[10px] text-emerald-600 font-bold ml-1">(Anda)</span>}
                    </p>
                    <p className={`text-sm font-bold ${isDrilling ? 'text-purple-700' : 'text-[#1e3a8a]'}`}>
                      {entry.total_score}
                    </p>
                    <div className={`mt-2 w-full ${podiumHeights[podiumIdx]} rounded-t-xl flex items-center justify-center ${ri.barColor}`}>
                      <IconComp className={`w-5 h-5 ${ri.iconColor}`} />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Full Table (Top 20) */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rank</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nama</th>
                  {!isDrilling && (
                    <>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">TIU</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">TWK</th>
                      <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">TKP</th>
                    </>
                  )}
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">
                    {isDrilling ? 'Skor' : 'Total'}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {topTwenty.map((entry, i) => {
                  const isMe = entry.participant_id === currentUserId;
                  return (
                    <motion.tr
                      key={entry.participant_id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: Math.min(i * 0.03, 0.3) }}
                      className={`transition-colors ${
                        isMe ? 'bg-blue-50/60 hover:bg-blue-50' : 'hover:bg-gray-50/50'
                      }`}
                    >
                      <td className="px-6 py-4">
                        {entry.rank <= 3 ? (
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                              entry.rank === 1
                                ? 'bg-yellow-100 text-yellow-700'
                                : entry.rank === 2
                                  ? 'bg-gray-100 text-gray-700'
                                  : 'bg-amber-100 text-amber-700'
                            }`}
                          >
                            {entry.rank}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500 font-medium pl-2">{entry.rank}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 bg-gradient-to-br ${
                              isDrilling ? 'from-purple-600 to-indigo-600' : 'from-[#1e3a8a] to-blue-600'
                            }`}
                          >
                            {entry.participant_name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-gray-800">{entry.participant_name}</span>
                            {isMe && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-[#1e3a8a]">
                                Anda
                              </span>
                            )}
                            {!isDrilling && entry.passed && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                                Lulus PG
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      {!isDrilling && (
                        <>
                          <td className="px-6 py-4 text-center text-sm text-gray-600">{entry.score_tiu}</td>
                          <td className="px-6 py-4 text-center text-sm text-gray-600">{entry.score_twk}</td>
                          <td className="px-6 py-4 text-center text-sm text-gray-600">{entry.score_tkp}</td>
                        </>
                      )}
                      <td className="px-6 py-4 text-right">
                        <span className={`text-sm font-bold ${isDrilling ? 'text-purple-700' : 'text-[#1e3a8a]'}`}>
                          {entry.total_score}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Kartu Peringkat Pribadi jika berada di urutan #21 - #50 */}
          {isMyEntryOutsideTopTwenty && myEntry && (
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-200/80 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="px-2.5 py-1 rounded-lg bg-[#1e3a8a] text-white text-xs font-extrabold">
                  #{myEntry.rank}
                </span>
                <div>
                  <p className="text-xs font-bold text-slate-800">Posisi Peringkat Anda Saat Ini</p>
                  <p className="text-[11px] text-slate-500">
                    {!isDrilling
                      ? `TIU ${myEntry.score_tiu} • TWK ${myEntry.score_twk} • TKP ${myEntry.score_tkp}`
                      : 'Berdasarkan percobaan pertama pada paket ini'}
                  </p>
                </div>
              </div>
              <span className={`text-base font-black ${isDrilling ? 'text-purple-700' : 'text-[#1e3a8a]'}`}>
                {myEntry.total_score}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
