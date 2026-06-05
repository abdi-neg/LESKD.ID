import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, User, Trophy, Target, TrendingUp, History, ChevronDown, ChevronUp } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { ExamResult } from '../../types';
import ExamCards from './ExamCards';
import Leaderboard from './Leaderboard';
import ExamHistory from './ExamHistory';

export default function ParticipantDashboard() {
  // 🌟 PERBAIKAN 1: Ambil examHistory dan fungsi fetch-nya dari AppContext global
  const { state, dispatch, signOut, examHistory, fetchUserExamHistory } = useApp();
  const profile = state.profile;
  
  // State manajemen UI
  const [showHistory, setShowHistory] = useState(false);
  const [resultsLoading, setResultsLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState<any | null>(null);

  // 🌟 PERBAIKAN 2: Trigger fetch global saat profile siap, mengandalkan query terpusat yang aman dari typo
  useEffect(() => {
    if (!profile) return;
    setResultsLoading(true);
    fetchUserExamHistory().finally(() => {
      setResultsLoading(false);
    });
  }, [profile]);

  // 🌟 PERBAIKAN 3: Kalkulasi Statistik Ringkas langsung menggunakan data 'examHistory' global
  const totalExams = examHistory.length;
  const avgScore = totalExams > 0
    ? Math.round(examHistory.reduce((s, r) => s + (r.total_score || 0), 0) / totalExams)
    : 0;
  const passedCount = examHistory.filter((r) => r.passed).length;

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

  // 🌟 PERBAIKAN 4: Mapping records bersumber dari 'examHistory'
  const historyRecords: HistoryRecord[] = examHistory.map((r) => ({
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
      {/* Header / Navbar */}
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

      {/* Konten Utama */}
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

          {/* History Toggle Button */}
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

          {/* History List */}
          <AnimatePresence>
            {showHistory && (
              <motion.div
                variants={itemVariants}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                {resultsLoading ? (
                  <div className="text-center py-8 text-sm text-gray-400 bg-white rounded-2xl border border-gray-100">
                    Memuat riwayat pengerjaan...
                  </div>
                ) : historyRecords.length === 0 ? (
                  <div className="text-center py-8 text-sm text-gray-400 bg-white rounded-2xl border border-gray-100">
                    Belum ada ujian yang diselesaikan.
                  </div>
                ) : (
                  <ExamHistory
                    records={historyRecords}
                    onViewReview={(resultId) => dispatch({ type: 'OPEN_REVIEW', payload: resultId })}
                    onViewDetails={(record) => setSelectedExam(record)}
                  />
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Leaderboard */}
          <motion.div variants={itemVariants}>
            <Leaderboard />
          </motion.div>
        </motion.div>
      </main>

      {/* MODAL POPUP DETAIL SKOR */}
      <AnimatePresence>
        {selectedExam && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedExam(null)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl p-6 w-full max-w-md shadow-xl relative z-10 border border-gray-100"
            >
              <div className="mb-4">
                <span className="text-xs font-bold px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full">
                  Detail Hasil Ujian
                </span>
                <h3 className="text-lg font-bold text-gray-800 mt-2 truncate">
                  {selectedExam.package_name}
                </h3>
                <p className="text-xs text-gray-400">
                  Dikerjakan pada: {new Date(selectedExam.completed_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>

              <div className="bg-gray-50 rounded-2xl p-4 text-center mb-4 border border-gray-100">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wider">Skor Total SKD</p>
                <p className="text-4xl font-black text-gray-800 my-1">{selectedExam.total_score}</p>
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                  selectedExam.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                }`}>
                  {selectedExam.passed ? 'Lulus Passing Grade' : 'Belum Lulus Passing Grade'}
                </span>
              </div>

              {selectedExam.package_type === 'FULL' ? (
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between items-center p-2.5 bg-blue-50/50 rounded-xl">
                    <span className="text-sm font-medium text-gray-700">Tes Inteligensia Umum (TIU)</span>
                    <span className="font-bold text-blue-700 text-sm">{selectedExam.score_tiu ?? 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 bg-emerald-50/50 rounded-xl">
                    <span className="text-sm font-medium text-gray-700">Tes Wawasan Kebangsaan (TWK)</span>
                    <span className="font-bold text-emerald-700 text-sm">{selectedExam.score_twk ?? 0}</span>
                  </div>
                  <div className="flex justify-between items-center p-2.5 bg-rose-50/50 rounded-xl">
                    <span className="text-sm font-medium text-gray-700">Tes Karakteristik Pribadi (TKP)</span>
                    <span className="font-bold text-rose-700 text-sm">{selectedExam.score_tkp ?? 0}</span>
                  </div>
                </div>
              ) : (
                <div className="mb-6 p-3 bg-gray-50 rounded-xl text-center text-sm text-gray-600">
                  Jenis Paket Mini: <span className="font-bold text-gray-800">{selectedExam.package_type}</span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 mb-6 text-center">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-[10px] text-gray-400 font-medium uppercase">Akurasi Jawaban</p>
                  <p className="text-sm font-bold text-gray-700 mt-0.5">
                    {selectedExam.questions_correct} / {selectedExam.questions_total} Soal
                  </p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-[10px] text-gray-400 font-medium uppercase">Durasi Pengerjaan</p>
                  <p className="text-sm font-bold text-gray-700 mt-0.5">
                    {Math.floor(selectedExam.duration_seconds / 60)} Menit
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedExam(null)}
                className="w-full bg-gray-800 hover:bg-gray-900 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
              >
                Tutup Detail
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
