import { motion } from 'framer-motion';
import { LogOut, User, Trophy, Target, TrendingUp, History, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import { ExamResult } from '../../types';
import ExamCards from './ExamCards';
import Leaderboard from './Leaderboard';
import ExamHistory from './ExamHistory';


export default function ParticipantDashboard() {
  const { state, dispatch, signOut } = useApp();
  const profile = state.profile;
  const [showHistory, setShowHistory] = useState(false);
  const [results, setResults] = useState<ExamResult[]>([]);
  const [resultsLoading, setResultsLoading] = useState(true);

 // Di dalam ParticipantDashboard.tsx
useEffect(() => {
  if (!profile) return;
  async function loadResults() {
    setResultsLoading(true);
    const { data } = await supabase
      .from('exam_results')
      .select('*')
      .eq('participant_id', profile!.id)
      .eq('status', 'COMPLETED') // 🔥 Cukup tambahkan baris ini saja!
      .order('completed_at', { ascending: false });
    if (data) setResults(data as ExamResult[]);
    setResultsLoading(false);
  }
  loadResults();
}, [profile]);

  const totalExams = results.length;
  const avgScore = totalExams > 0
    ? Math.round(results.reduce((s, r) => s + r.total_score, 0) / totalExams)
    : 0;
  const passedCount = results.filter((r) => r.passed).length;

  type HistoryRecord = {
    id: string;
    package_type: 'MINI_TIU' | 'MINI_TWK' | 'MINI_TKP' | 'FULL';
    package_name: string;
    total_score: number;
    score_tiu?: number;
    score_twk?: number;
    score_tkp?: number;
    questions_correct: number;
    questions_total: number;
    passed: boolean;
    duration_seconds: number;
    completed_at: string;
  };

  const historyRecords: HistoryRecord[] = results.map((r) => ({
    id: r.id,
    package_type: r.package_type,
    package_name: r.package_name,
    total_score: r.total_score,
    score_tiu: r.score_tiu,
    score_twk: r.score_twk,
    score_tkp: r.score_tkp,
    questions_correct: r.questions_correct,
    questions_total: r.questions_total,
    passed: r.passed,
    duration_seconds: r.duration_seconds,
    completed_at: r.completed_at,
  }));

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#1e3a8a] shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <span className="text-white font-extrabold text-lg">LESKD.ID</span>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
              <div className="w-7 h-7 bg-[#10b981] rounded-full flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="text-white text-sm font-medium">{profile?.full_name}</span>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={signOut}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-sm font-medium px-3 py-2 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Keluar</span>
            </motion.button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {/* Welcome Banner */}
          <motion.div
            variants={itemVariants}
            className="bg-gradient-to-r from-[#1e3a8a] to-[#1e40af] rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-1/3 w-48 h-48 bg-[#10b981]/10 rounded-full translate-y-1/2" />
            <div className="relative z-10">
              <p className="text-blue-200 text-sm font-medium mb-1">Selamat datang kembali,</p>
              <h1 className="text-2xl sm:text-3xl font-bold mb-2">{profile?.full_name}</h1>
              <p className="text-blue-100 text-sm sm:text-base max-w-lg">
                Tingkatkan persiapan Anda hari ini. Pilih paket tryout yang tersedia dan masukkan token untuk memulai.
              </p>
            </div>
          </motion.div>

          {/* Quick Stats */}
          <motion.div variants={itemVariants} className="grid grid-cols-3 gap-4">
            {[
              { icon: Target, label: 'Tryout Selesai', value: resultsLoading ? '...' : totalExams.toString(), color: 'text-blue-600', bg: 'bg-blue-50' },
              { icon: TrendingUp, label: 'Rata-rata Skor', value: resultsLoading ? '...' : avgScore.toString(), color: 'text-[#10b981]', bg: 'bg-emerald-50' },
              { icon: Trophy, label: 'Lulus', value: resultsLoading ? '...' : passedCount.toString(), color: 'text-amber-600', bg: 'bg-amber-50' },
            ].map((stat, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -3 }}
                className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100"
              >
                <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center mb-3`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
                <p className="text-gray-500 text-xs mt-0.5">{stat.label}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Exam Cards */}
          <motion.div variants={itemVariants}>
            <ExamCards />
          </motion.div>

          {/* History Toggle */}
          <motion.button
            variants={itemVariants}
            onClick={() => setShowHistory(!showHistory)}
            className="w-full bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#1e3a8a]/10 rounded-xl flex items-center justify-center">
                <History className="w-5 h-5 text-[#1e3a8a]" />
              </div>
              <div className="text-left">
                <p className="font-semibold text-gray-800">Riwayat Ujian</p>
                <p className="text-sm text-gray-500">
                  {resultsLoading ? 'Memuat...' : `${totalExams} ujian selesai`}
                </p>
              </div>
            </div>
            {showHistory ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </motion.button>

          {showHistory && (
            <motion.div
              variants={itemVariants}
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
            >
              <ExamHistory
                records={historyRecords}
                onViewReview={(resultId) => dispatch({ type: 'OPEN_REVIEW', payload: resultId })}
              />
            </motion.div>
          )}

          {/* Leaderboard */}
          <motion.div variants={itemVariants}>
            <Leaderboard />
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
