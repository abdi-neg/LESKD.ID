import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Award, TrendingUp, RefreshCw } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface LeaderboardRow {
  participant_id: string;
  participant_name: string;
  best_tiu: number;
  best_twk: number;
  best_tkp: number;
  best_total: number;
}

export default function Leaderboard() {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from('exam_results')
      .select('participant_id, score_tiu, score_twk, score_tkp, total_score, profiles:participant_id(full_name)')
      .order('total_score', { ascending: false });

    if (data) {
      // Aggregate best score per participant
      const map = new Map<string, LeaderboardRow>();
      for (const r of data as (typeof data[number] & { profiles: { full_name: string } | null })[]) {
        const name = r.profiles?.full_name ?? 'Unknown';
        const existing = map.get(r.participant_id);
        if (!existing || r.total_score > existing.best_total) {
          map.set(r.participant_id, {
            participant_id: r.participant_id,
            participant_name: name,
            best_tiu: r.score_tiu,
            best_twk: r.score_twk,
            best_tkp: r.score_tkp,
            best_total: r.total_score,
          });
        }
      }
      const sorted = Array.from(map.values()).sort((a, b) => b.best_total - a.best_total).slice(0, 20);
      setRows(sorted);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const podiumOrder = rows.length >= 3 ? [rows[1], rows[0], rows[2]] : [];
  const podiumRanks = [2, 1, 3];
  const podiumHeights = ['h-20', 'h-28', 'h-16'];
  const rankIcons = [
    { icon: Trophy, barColor: 'bg-yellow-400', iconColor: 'text-yellow-800' },
    { icon: Medal, barColor: 'bg-gray-300', iconColor: 'text-gray-600' },
    { icon: Award, barColor: 'bg-amber-500', iconColor: 'text-white' },
  ];

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
            <Trophy className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-800">Papan Peringkat</h2>
            <p className="text-gray-400 text-sm">Skor tertinggi per peserta</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={load} className="text-gray-400 hover:text-gray-600 transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <div className="flex items-center gap-1.5 text-[#10b981] text-sm font-medium">
            <TrendingUp className="w-4 h-4" />
            <span>Live</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="p-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-gray-100 rounded-xl h-12 animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-14">
          <Trophy className="w-12 h-12 text-gray-200 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Belum ada data peringkat</p>
          <p className="text-gray-400 text-sm mt-1">Selesaikan ujian untuk masuk papan peringkat</p>
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
                return (
                  <motion.div
                    key={entry.participant_id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: podiumIdx * 0.1 }}
                    className="flex flex-col items-center"
                  >
                    <div className="w-12 h-12 bg-gradient-to-br from-[#1e3a8a] to-[#1e40af] rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg mb-2">
                      {entry.participant_name.charAt(0).toUpperCase()}
                    </div>
                    <p className="text-xs font-semibold text-gray-700 text-center leading-tight mb-1">
                      {entry.participant_name.split(' ')[0]}
                    </p>
                    <p className="text-sm font-bold text-[#1e3a8a]">{entry.best_total}</p>
                    <div className={`mt-2 w-full ${podiumHeights[podiumIdx]} rounded-t-xl flex items-center justify-center ${ri.barColor}`}>
                      <IconComp className={`w-5 h-5 ${ri.iconColor}`} />
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Full Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 text-left">
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rank</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nama</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">TIU</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">TWK</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-center">TKP</th>
                  <th className="px-6 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rows.map((entry, i) => (
                  <motion.tr
                    key={entry.participant_id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      {i < 3 ? (
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                          ${i === 0 ? 'bg-yellow-100 text-yellow-700' : i === 1 ? 'bg-gray-100 text-gray-700' : 'bg-amber-100 text-amber-700'}`}>
                          {i + 1}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500 font-medium pl-2">{i + 1}</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-br from-[#1e3a8a] to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                          {entry.participant_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-gray-800">{entry.participant_name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-gray-600">{entry.best_tiu}</td>
                    <td className="px-6 py-4 text-center text-sm text-gray-600">{entry.best_twk}</td>
                    <td className="px-6 py-4 text-center text-sm text-gray-600">{entry.best_tkp}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="text-sm font-bold text-[#1e3a8a]">{entry.best_total}</span>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
