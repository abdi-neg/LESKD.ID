import { motion, AnimatePresence } from 'framer-motion';
import { LogOut, User, Trophy, Target, TrendingUp, History, ChevronDown, ChevronUp, Loader2, Brain, Activity, PieChart, Award } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; 
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import ExamCards from './ExamCards';
import Leaderboard from './Leaderboard';
import ExamHistory from './ExamHistory';
import DiagnosticReport from '../exam/DiagnosticReport';

// 🧠 FUNGSI NORMALISASI SUPER STERIL
const normalizeQuestionData = (q: any) => {
  const rawSub = q.sub_category || q.sub_kategori || q.subCategory || q.subKategori || q.SUB_KATEGORI || q.SUB_CATEGORY || 'Umum';
  return {
    ...q,
    sub_category: rawSub,
    sub_kategori: rawSub
  };
};

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
          const normalizedQ = normalizeQuestionData(q);

          globalQuestions.push({ 
            ...normalizedQ, 
            id: uniqueInstanceId 
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
  const { state, signOut, examHistory, fetchUserExamHistory, dispatch, fetchExamSnapshot } = useApp();
  const profile = state.profile;
  const navigate = useNavigate(); 
  
  const [showHistory, setShowHistory] = useState(false);
  const [resultsLoading, setResultsLoading] = useState(true);
  
  const [selectedExam, setSelectedExam] = useState<any | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<any | null>(null);
  const [modalLoading, setModalLoading] = useState(false);

  const [globalSnapshot, setGlobalSnapshot] = useState<{questions: any[], answers: any} | null>(null);
  const [loadingGlobal, setLoadingGlobal] = useState(false);

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

  const handleLoadGlobalDiagnostic = async () => {
    if (!profile?.id) return;
    setLoadingGlobal(true);
    try {
      const { data, error } = await supabase
        .from('exam_results')
        .select('id, review_snapshot')
        .eq('participant_id', profile.id)
        .not('review_snapshot', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(10); 

      if (error) throw error;
      
      if (data) {
        const snap = generateGlobalSnapshot(data);
        setGlobalSnapshot(snap);
      }
    } catch (err) {
      console.error("Gagal memuat data diagnostik global", err);
    } finally {
      setLoadingGlobal(false);
    }
  };

  const handleViewDetails = async (rec: any) => {
    setSelectedExam(rec);
    setModalLoading(true);
    setSelectedSnapshot(null); 

    const data = await fetchExamSnapshot(rec.id);
    
    if (data && data.review_snapshot) {
      try {
        const snapshot = typeof data.review_snapshot === 'string'
          ? JSON.parse(data.review_snapshot)
          : data.review_snapshot;
          
        const questionsArray = Array.isArray(snapshot) 
          ? snapshot 
          : (snapshot?.questions || snapshot?.activeQuestions || []);

        if (Array.isArray(questionsArray)) {
          const safeQuestions = questionsArray.map((q: any) => normalizeQuestionData(q));
          setSelectedSnapshot({
            questions: safeQuestions,
            answers: Array.isArray(snapshot) ? {} : (snapshot?.answers || {})
          });
        }
      } catch (e) { console.error("Gagal mem-parsing snapshot:", e); }
    }
    setModalLoading(false);
  };

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
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 antialiased">
      {/* ─── HEADER BARU (Lebih Slim & Proporsional) ─── */}
      <nav className="bg-slate-900 border-b border-slate-800 py-3.5 px-6 md:px-10 flex items-center justify-between sticky top-0 z-50 shadow-xl shadow-slate-900/20">
         <div className="text-xl sm:text-2xl font-black text-white tracking-tight cursor-pointer hover:text-blue-100 transition-colors" onClick={() => navigate('/')}>
            LESKD.ID
         </div>
         
         <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 bg-slate-800/50 hover:bg-slate-800 text-slate-200 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-colors border border-slate-700/50">
               <User className="w-4 h-4 text-blue-400" />
               <span className="hidden sm:inline uppercase tracking-wide">{profile?.full_name || 'PESERTA'}</span>
            </button>
            <button onClick={signOut} className="p-2 bg-slate-800/50 hover:bg-rose-500/20 hover:text-rose-400 text-slate-400 rounded-xl transition-colors border border-slate-700/50">
               <LogOut className="w-4 h-4" />
            </button>
         </div>
      </nav>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 pb-16">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
          
          {/* ─── HERO & STATS SECTION (Layout Terintegrasi) ─── */}
          <section className="bg-gradient-to-br from-blue-700 via-blue-800 to-[#1e3a8a] rounded-3xl p-8 md:p-10 text-white shadow-2xl shadow-blue-900/30 relative overflow-hidden border border-blue-600/30">
            {/* Aksen visual background */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none"></div>
            
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-10 relative z-10">
              
              {/* Teks Sapaan */}
              <div className="max-w-xl">
                 <span className="inline-block bg-white/10 px-3 py-1.5 rounded-lg text-[10px] font-black tracking-widest uppercase mb-4 border border-white/10 backdrop-blur-sm text-blue-100">
                   DASHBOARD PESERTA
                 </span>
                 <h1 className="text-3xl md:text-5xl font-black mb-4 leading-tight tracking-tight">
                   Selamat Datang,<br className="hidden sm:block"/> <span className="text-blue-300">{profile?.full_name}</span>
                 </h1>
                 <p className="text-blue-100/90 text-sm md:text-base leading-relaxed max-w-lg">
                   Pantau progres belajar Anda secara real-time. Pilih paket simulasi di bawah untuk mulai mengasah kemampuan menghadapi seleksi ASN.
                 </p>
              </div>

              {/* Kartu Statistik Melayang (Glassmorphism) */}
              <div className="flex gap-4 w-full lg:w-auto overflow-x-auto pb-4 lg:pb-0 scrollbar-hide pt-2">
                 <div className="bg-white/10 border border-white/20 backdrop-blur-md p-5 rounded-2xl min-w-[120px] flex-shrink-0 flex flex-col items-center justify-center hover:bg-white/15 transition-colors">
                    <Target className="w-6 h-6 text-blue-300 mb-3 opacity-90" />
                    <span className="text-3xl font-black mb-1">{resultsLoading ? '..' : totalExams}</span>
                    <span className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">SELESAI</span>
                 </div>
                 
                 <div className="bg-white/10 border border-white/20 backdrop-blur-md p-5 rounded-2xl min-w-[120px] flex-shrink-0 flex flex-col items-center justify-center hover:bg-white/15 transition-colors">
                    <TrendingUp className="w-6 h-6 text-blue-300 mb-3 opacity-90" />
                    <span className="text-3xl font-black mb-1">{resultsLoading ? '..' : avgScore}</span>
                    <span className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">RERATA</span>
                 </div>
                 
                 <div className="bg-gradient-to-b from-emerald-500/20 to-emerald-600/10 border border-emerald-400/30 backdrop-blur-md p-5 rounded-2xl min-w-[120px] flex-shrink-0 flex flex-col items-center justify-center shadow-inner shadow-emerald-500/10 hover:from-emerald-500/30 transition-colors">
                    <Award className="w-6 h-6 text-emerald-300 mb-3 opacity-90" />
                    <span className="text-3xl font-black text-emerald-50 mb-1">{resultsLoading ? '..' : passedCount}</span>
                    <span className="text-[10px] font-bold text-emerald-200 uppercase tracking-widest">LULUS PG</span>
                 </div>
              </div>
              
            </div>
          </section>

          {/* ─── DIAGNOSTIC REPORT (ON-DEMAND) ─── */}
          {!resultsLoading && totalExams > 0 && (
            <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="mb-6 px-2">
                <span className="text-[10px] font-black text-[#1e3a8a] uppercase tracking-widest block mb-1.5 opacity-80">Smart Diagnostic</span>
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">Peta Kekuatan Akumulatif</h2>
              </div>
              
              <div className="bg-white border border-slate-200/60 rounded-3xl p-8 md:p-12 shadow-sm relative overflow-hidden">
                {!globalSnapshot ? (
                  <div className="text-center relative z-10 max-w-lg mx-auto">
                    <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-blue-100">
                       <PieChart className="w-8 h-8 text-blue-600 opacity-90" />
                    </div>
                    
                    <h3 className="text-xl font-bold text-slate-800 mb-3">Analisis Progres Tryout</h3>
                    <p className="text-sm text-slate-500 mb-8 leading-relaxed">
                      Klik tombol di bawah untuk menganalisis dan memuat grafik diagram kompetensi gabungan dari riwayat ujian terakhir Anda.
                    </p>
                    
                    <button
                      onClick={handleLoadGlobalDiagnostic}
                      disabled={loadingGlobal}
                      className="w-full sm:w-auto bg-[#1e3a8a] hover:bg-[#152961] text-white px-10 py-3.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 mx-auto transition-all disabled:opacity-70 shadow-xl shadow-blue-900/20 active:scale-95"
                    >
                      {loadingGlobal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
                      {loadingGlobal ? 'Menganalisis Data...' : 'Muat Peta Kekuatan'}
                    </button>
                  </div>
                ) : (
                  <div className="animate-in fade-in zoom-in-95 duration-500 relative z-10">
                    <DiagnosticReport questions={globalSnapshot.questions} answers={globalSnapshot.answers} />
                  </div>
                )}
                {/* Ornamen latar kartu diagnostik */}
                {!globalSnapshot && (
                  <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                     <Brain className="w-64 h-64 text-blue-900" />
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ─── EXAM CARDS ─── */}
          <section className="space-y-6 pt-4">
            <div className="px-2">
               <h2 className="text-2xl font-black text-slate-900 tracking-tight">Paket Simulasi Tersedia</h2>
            </div>
            <ExamCards />
          </section>

          {/* ─── HISTORY SECTION ─── */}
          <section className="space-y-4 pt-4">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="w-full bg-white hover:bg-blue-50/50 border border-slate-200 rounded-2xl p-5 flex items-center justify-between transition-all shadow-sm group"
            >
              <div className="flex items-center gap-4">
                <div className="bg-blue-100 p-2.5 rounded-xl group-hover:bg-blue-200 transition-colors">
                   <History className="w-5 h-5 text-[#1e3a8a]" />
                </div>
                <span className="font-bold text-sm text-slate-800 uppercase tracking-widest">Riwayat Pengerjaan</span>
              </div>
              {showHistory ? <ChevronUp className="w-5 h-5 text-slate-400 group-hover:text-blue-500" /> : <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-blue-500" />}
            </button>

            <AnimatePresence>
              {showHistory && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <div className="pt-2 pb-6">
                     <ExamHistory
                       records={historyRecords}
                       onViewReview={(id) => { dispatch({ type: 'OPEN_REVIEW', payload: id }); navigate('/exam/review'); }}
                       onViewDetails={handleViewDetails}
                     />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* ─── LEADERBOARD ─── */}
          <section className="border-t border-slate-200 pt-12 pb-6">
            <Leaderboard />
          </section>

        </motion.div>
      </main>

      {/* ─── MODAL DETAIL ─── */}
      <AnimatePresence>
        {selectedExam && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedExam(null)} className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="bg-white rounded-3xl p-8 w-full max-w-xl shadow-2xl relative z-10 border border-slate-100 max-h-[85vh] overflow-y-auto">
              <div className="mb-8 flex justify-between items-start">
                <div>
                  <h3 className="text-xl font-black text-slate-900 leading-tight mb-2">{selectedExam.package_name}</h3>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Calendar className="w-3 h-3" />
                    Selesai: {new Date(selectedExam.completed_at).toLocaleDateString('id-ID')}
                  </p>
                </div>
                <span className={`text-[10px] font-black px-3 py-1.5 rounded-lg uppercase tracking-widest ${selectedExam.passed ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' : 'bg-rose-100 text-rose-700 border border-rose-200'}`}>
                  {selectedExam.passed ? 'Lulus' : 'Gagal'}
                </span>
              </div>

              <div className="bg-slate-50 rounded-2xl p-6 text-center mb-8 border border-slate-100 shadow-inner">
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-2">Skor Akhir</p>
                <p className="text-5xl font-black text-[#1e3a8a] tracking-tighter">{selectedExam.total_score}</p>
              </div>

              {modalLoading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-4 border-t border-slate-100 pt-10">
                  <Loader2 className="w-10 h-10 text-[#1e3a8a] animate-spin" />
                  <p className="text-sm font-semibold text-slate-500">Menganalisis hasil tryout...</p>
                </div>
              ) : selectedSnapshot ? (
                <div className="mb-8 border-t border-slate-100 pt-8">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 text-center">Diagnosis Sesi Ini</p>
                  <DiagnosticReport questions={selectedSnapshot.questions} answers={selectedSnapshot.answers} />
                </div>
              ) : (
                <div className="mb-8 py-10 text-center text-slate-400 border-t border-slate-100 bg-slate-50 rounded-2xl">
                  <AlertCircle className="w-8 h-8 mx-auto mb-3 opacity-50" />
                  <p className="text-sm font-medium">Detail analisis tidak tersedia untuk sesi ini.</p>
                </div>
              )}

              <button
                onClick={() => setSelectedExam(null)}
                className="w-full bg-slate-900 hover:bg-black text-white font-black py-4 rounded-xl transition-all text-xs uppercase tracking-widest shadow-lg shadow-slate-900/20 active:scale-[0.98]"
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
