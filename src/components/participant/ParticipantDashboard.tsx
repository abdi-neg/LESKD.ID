import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, User, Trophy, Target, TrendingUp, History, ChevronDown, ChevronUp, ArrowRight, Award, Clock } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { useApp } from '../../context/AppContext';
import ExamCards from './ExamCards';
import Leaderboard from './Leaderboard';
import ExamHistory from './ExamHistory';
import DiagnosticReport from '../exam/DiagnosticReport';

// 🧠 AKUMULATOR DATA GLOBAL: Kebal dari data kosong & wajib melacak variasi huruf kapital Word
function generateGlobalSnapshot(examHistory: any[]) {
  const globalQuestions: any[] = [];
  const globalAnswers: Record<string, any> = {};

  examHistory.forEach((result) => {
    if (!result.review_snapshot) return;
    try {
      const snapshot = typeof result.review_snapshot === 'string'
        ? JSON.parse(result.review_snapshot)
        : result.review_snapshot;

      const questionsArray = Array.isArray(snapshot) 
        ? snapshot 
        : (snapshot?.questions || snapshot?.activeQuestions || []);

      const originalAnswers = Array.isArray(snapshot) ? {} : (snapshot?.answers || {});

      if (Array.isArray(questionsArray)) {
        questionsArray.forEach((q: any) => {
          const uniqueInstanceId = `${result.id}_${q.id}`;
          
          // ─── 🌟 TARGET FIX: Melacak segala bentuk penulisan subkategori termasuk kapital ───
          const normalizedSubCategory = q.sub_category || q.sub_kategori || q.SUB_KATEGORI || (q as any).SUB_CATEGORY || 'Umum';

          globalQuestions.push({ 
            ...q, 
            id: uniqueInstanceId,
            sub_category: normalizedSubCategory,
            sub_kategori: normalizedSubCategory
          });
          
          const ans = originalAnswers[q.id] || Object.values(originalAnswers).find((a: any) => a?.questionId === q.id || a?.question_id === q.id);
          if (ans) globalAnswers[uniqueInstanceId] = ans;
        });
      }
    } catch (err) {
      console.error("Gagal merakit akumulasi snapshot global:", err);
    }
  });
  return { questions: globalQuestions, answers: globalAnswers };
}

export default function ParticipantDashboard() {
  const { state, signOut, examHistory, fetchUserExamHistory, dispatch } = useApp();
  const profile = state.profile;
  const navigate = useNavigate(); 
  
  const [showHistory, setShowHistory] = useState(false);
  const [resultsLoading, setResultsLoading] = useState(true);
  const [selectedExam, setSelectedExam] = useState<any | null>(null);

  // 🌟 KUNCI EMAS ANTI-LOOP: Mengunci trigger kueri Supabase hanya berdasarkan ID user saja.
  useEffect(() => {
    if (!profile?.id) return;
    setResultsLoading(true);
    fetchUserExamHistory().finally(() => setResultsLoading(false));
  }, [profile?.id]); 

  const totalExams = examHistory.length;
  const avgScore = totalExams > 0
    ? Math.round(examHistory.reduce((s, r) => s + (r.total_score || 0), 0) / totalExams)
    : 0;
  const passedCount = examHistory.filter((r) => r.passed).length;

  const globalSnapshotData = generateGlobalSnapshot(examHistory);

  const selectedExamSnapshot = (() => {
    if (!selectedExam || !selectedExam.review_snapshot) return null;
    try {
      const snapshot = typeof selectedExam.review_snapshot === 'string'
        ? JSON.parse(selectedExam.review_snapshot)
        : selectedExam.review_snapshot;
        
      const questionsArray = Array.isArray(snapshot) 
        ? snapshot 
        : (snapshot?.questions || snapshot?.activeQuestions || []);

      if (Array.isArray(questionsArray)) {
        const safeQuestions = questionsArray.map((q: any) => {
          // ─── 🌟 TARGET FIX LAYAR MODAL DETAIL: Normalisasi variasi nama kolom ───
          const safeSubCategory = q.sub_category || q.sub_kategori || q.SUB_KATEGORI || (q as any).SUB_CATEGORY || 'Umum';
          return {
            ...q,
            sub_category: safeSubCategory,
            sub_kategori: safeSubCategory
          };
        });
        return {
          questions: safeQuestions,
          answers: Array.isArray(snapshot) ? {} : (snapshot?.answers || {})
        };
      }
    } catch (e) { console.error(e); }
    return null;
  })();

  const historyRecords = examHistory.map((r) => ({
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

  return (
    <div className="min-h-screen bg-white font-sans text-slate-800 antialiased">
      {/* ─── HEADER ─── */}
      <header className="bg-[#1e3a8a] sticky top-0 z-40 px-6 py-3.5 shadow-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-white font-black text-xl tracking-tight">LESKD.ID</span>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-white/10 rounded-lg px-3 py-1.5">
              <User className="w-4 h-4 text-white/70" />
              <span className="text-white text-xs font-bold uppercase tracking-wider">{profile?.full_name}</span>
            </div>
            <button onClick={signOut} className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg transition-colors">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 pt-10 pb-16">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
          
          {/* ─── HERO SPLIT LAYOUT ─── */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-7">
              <span className="inline-block rounded bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold text-[#1e3a8a] uppercase tracking-widest mb-3">
                Dashboard Peserta
              </span>
              <h1 className="text-3xl lg:text-4xl font-black text-slate-900 leading-tight mb-3 tracking-tight">
                Selamat Datang, <span className="text-[#1e3a8a]">{profile?.full_name}</span>
              </h1>
              <p className="text-slate-500 text-sm sm:text-base max-w-xl leading-relaxed font-medium">
                Pantau progres belajar Anda secara real-time. Pilih paket simulasi di bawah untuk mulai mengasah kemampuan menghadapi seleksi ASN.
              </p>
            </div>

            {/* Quick Stats Grid */}
            <div className="lg:col-span-5 grid grid-cols-3 gap-3">
              {[
                { icon: Target, label: 'Selesai', value: resultsLoading ? '..' : totalExams, color: 'text-blue-600', bg: 'bg-blue-50' },
                { icon: TrendingUp, label: 'Rerata', value: resultsLoading ? '..' : avgScore, color: 'text-[#1e3a8a]', bg: 'bg-slate-100' },
                { icon: Trophy, label: 'Lulus', value: resultsLoading ? '..' : passedCount, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              ].map((stat, i) => (
                <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
                  <stat.icon className={`w-4 h-4 ${stat.color} mx-auto mb-2`} />
                  <p className="text-xl font-black text-slate-900">{stat.value}</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{stat.label}</p>
                </div>
              ))}
            </div>
          </section>

          {/* ─── DIAGNOSTIC REPORT (SMART ANALYTICS) ─── */}
          {!resultsLoading && totalExams > 0 && (
            <section className="border-t border-slate-100 pt-10">
              <div className="mb-6">
                <span className="text-[10px] font-bold text-[#1e3a8a] uppercase tracking-widest block mb-1">Smart Diagnostic</span>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Peta Kekuatan Akumulatif</h2>
              </div>
              <div className="bg-white border border-slate-200 rounded-2xl p-2 shadow-sm">
                <DiagnosticReport questions={globalSnapshotData.questions} answers={globalSnapshotData.answers} />
              </div>
            </section>
          )}

          {/* ─── EXAM CARDS ─── */}
          <section className="space-y-4">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Paket Simulasi Tersedia</h2>
            <ExamCards />
          </section>

          {/* ─── HISTORY SECTION ─── */}
          <section className="space-y-4">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl p-4 flex items-center justify-between transition-all"
            >
              <div className="flex items-center gap-3">
                <History className="w-5 h-5 text-[#1e3a8a]" />
                <span className="font-bold text-sm text-slate-700 uppercase tracking-wide">Riwayat Pengerjaan</span>
              </div>
              {showHistory ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>

            <AnimatePresence>
              {showHistory && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <ExamHistory
                    records={historyRecords}
                    onViewReview={(id) => { dispatch({ type: 'OPEN_REVIEW', payload: id }); navigate('/exam/review'); }}
                    onViewDetails={(rec) => setSelectedExam(examHistory.find((h) => h.id === rec.id) || rec)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* ─── LEADERBOARD ─── */}
          <section className="border-t border-slate-100 pt-10">
            <Leaderboard />
          </section>

        </motion.div>
      </main>

      {/* ─── MODAL DETAIL ─── */}
      <AnimatePresence>
        {selectedExam && selectedExamSnapshot && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedExam(null)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="bg-white rounded-2xl p-6 w-full max-w-xl shadow-2xl relative z-10 border border-slate-100 max-h-[85vh] overflow-y-auto">
              <div className="mb-6 flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-black text-slate-900 leading-tight">{selectedExam.package_name}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase mt-1 tracking-wider">
                    Selesai pada: {new Date(selectedExam.completed_at).toLocaleDateString('id-ID')}
                  </p>
                </div>
                <span className={`text-[10px] font-black px-2 py-1 rounded uppercase tracking-widest ${selectedExam.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                  {selectedExam.passed ? 'Lulus' : 'Gagal'}
                </span>
              </div>

              <div className="bg-slate-50 rounded-xl p-5 text-center mb-6 border border-slate-100">
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Skor Akhir</p>
                <p className="text-4xl font-black text-[#1e3a8a]">{selectedExam.total_score}</p>
              </div>

              <div className="mb-6 border-t border-slate-100 pt-4">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Diagnosis Sesi Ini</p>
                <DiagnosticReport questions={selectedExamSnapshot.questions} answers={selectedExamSnapshot.answers} />
              </div>

              <button
                onClick={() => setSelectedExam(null)}
                className="w-full bg-[#1e3a8a] hover:bg-[#152961] text-white font-black py-3 rounded-lg transition-all text-[10px] uppercase tracking-[0.2em] shadow-lg shadow-blue-900/10"
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
