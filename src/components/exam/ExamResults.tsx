import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Trophy, CheckCircle, XCircle, ArrowLeft, RotateCcw, TrendingUp, Target, BookOpen } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { EXAM_CONFIGS } from '../../data/mockData';
import { supabase } from '../../lib/supabase';
import { buildReviewSnapshot, saveReviewSnapshot } from '../../lib/examPersistence';

export default function ExamResults() {
  const { state, dispatch, startExam } = useApp();
  const [savedResultId, setSavedResultId] = useState<string | null>(null);
  const savedRef = useRef(false);

  const session = state.examSession;
  const profile = state.profile;

  useEffect(() => {
    if (!session?.scores || !profile || savedRef.current) return;
    savedRef.current = true;

    const { scores, examType, questions, answers, startedAt, completedAt, packageId, packageName } = session;
    const config = EXAM_CONFIGS[examType];
    const passed = scores.total >= config.passingScore;
    const durationSeconds = completedAt
      ? Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000)
      : 0;

    let correctCount = 0;
    questions.forEach((q) => {
      const ans = answers[q.id];
      if (ans?.selectedAnswer && q.category !== 'TKP' && ans.selectedAnswer === q.correct_answer) {
        correctCount++;
      }
    });

    const pkgTypeMap: Record<string, string> = {
      TIU: 'MINI_TIU',
      TWK: 'MINI_TWK',
      TKP: 'MINI_TKP',
      FULL: 'FULL',
    };

    (async () => {
      const { data, error } = await supabase.from('exam_results').insert({
        participant_id: profile.id,
        package_id: packageId ?? null,
        package_name: packageName ?? examType,
        package_type: pkgTypeMap[examType] ?? 'FULL',
        score_tiu: scores.tiu,
        score_twk: scores.twk,
        score_tkp: scores.tkp,
        total_score: scores.total,
        questions_correct: correctCount,
        questions_total: questions.length,
        passed,
        duration_seconds: durationSeconds,
        completed_at: (completedAt ?? new Date()).toISOString(),
      }).select('id').maybeSingle();

      if (error) {
        console.error('Failed to save exam result:', error);
        return;
      }

      if (data?.id) {
        const snapshot = buildReviewSnapshot(session);
        saveReviewSnapshot(data.id, snapshot);
        setSavedResultId(data.id);
      }
    })();
  }, [session, profile]);

  if (!session?.scores) return null;

  const { scores, examType, questions, answers } = session;
  const config = EXAM_CONFIGS[examType];
  const passed = scores.total >= config.passingScore;

  const totalAnswered = Object.values(answers).filter((a) => a.selectedAnswer).length;
  const totalUnanswered = questions.length - totalAnswered;

  let correctCount = 0;
  let wrongCount = 0;
  questions.forEach((q) => {
    const ans = answers[q.id];
    if (!ans?.selectedAnswer) return;
    if (q.category !== 'TKP') {
      if (ans.selectedAnswer === q.correct_answer) correctCount++;
      else wrongCount++;
    }
  });

  const allCategoryStats = [
    { key: 'TIU', score: scores.tiu, max: EXAM_CONFIGS.TIU.questionCount * 5, threshold: EXAM_CONFIGS.TIU.passingScore, color: 'bg-blue-500', lightColor: 'bg-blue-100', textColor: 'text-blue-700' },
    { key: 'TWK', score: scores.twk, max: EXAM_CONFIGS.TWK.questionCount * 5, threshold: EXAM_CONFIGS.TWK.passingScore, color: 'bg-emerald-500', lightColor: 'bg-emerald-100', textColor: 'text-emerald-700' },
    { key: 'TKP', score: scores.tkp, max: EXAM_CONFIGS.TKP.questionCount * 5, threshold: EXAM_CONFIGS.TKP.passingScore, color: 'bg-rose-500', lightColor: 'bg-rose-100', textColor: 'text-rose-700' },
  ];

  const categoryStats = examType === 'FULL'
    ? allCategoryStats
    : allCategoryStats.filter((c) => c.key === examType);

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Result Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-3xl p-8 text-white text-center relative overflow-hidden
            ${passed ? 'bg-gradient-to-br from-[#10b981] to-emerald-600' : 'bg-gradient-to-br from-[#1e3a8a] to-blue-700'}`}
        >
          <div className="absolute inset-0 bg-white/5 rounded-full scale-150" />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
            className="relative z-10"
          >
            <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trophy className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold mb-1">{scores.total}</h1>
            <p className="text-white/80 text-sm mb-3">Total Skor</p>
            <span className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold
              ${passed ? 'bg-white text-emerald-700' : 'bg-white/20 text-white border border-white/30'}`}>
              {passed ? (
                <><CheckCircle className="w-4 h-4" /> LULUS</>
              ) : (
                <><XCircle className="w-4 h-4" /> BELUM LULUS</>
              )}
            </span>
            <p className="text-white/70 text-xs mt-2">Nilai ambang batas: {config.passingScore}</p>
          </motion.div>
        </motion.div>

        {/* Per-Category Score Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6"
        >
          <h2 className="font-bold text-gray-800 mb-5 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#1e3a8a]" />
            Ringkasan Nilai Per Kategori
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {categoryStats.map((cat) => {
              const pct = Math.min((cat.score / cat.max) * 100, 100);
              const catPassed = cat.score >= cat.threshold;
              return (
                <div key={cat.key} className={`${cat.lightColor} rounded-2xl p-4`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-sm font-bold ${cat.textColor}`}>{cat.key}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold
                      ${catPassed ? 'bg-emerald-200 text-emerald-800' : 'bg-red-100 text-red-700'}`}>
                      {catPassed ? 'Lulus' : 'Belum'}
                    </span>
                  </div>
                  <p className={`text-3xl font-extrabold ${cat.textColor}`}>{cat.score}</p>
                  <p className="text-xs text-gray-500 mt-0.5">dari {cat.max} poin</p>
                  <div className="mt-3 w-full h-2 bg-white/60 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.4, duration: 0.6 }}
                      className={`h-full rounded-full ${cat.color}`}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1.5">Ambang batas: {cat.threshold}</p>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="grid grid-cols-3 gap-4"
        >
          {[
            { icon: CheckCircle, label: 'Benar', value: correctCount, color: 'text-[#10b981]', bg: 'bg-emerald-50' },
            { icon: XCircle, label: 'Salah', value: wrongCount, color: 'text-red-500', bg: 'bg-red-50' },
            { icon: Target, label: 'Kosong', value: totalUnanswered, color: 'text-gray-500', bg: 'bg-gray-50' },
          ].map((s, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
              <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mx-auto mb-2`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <p className="text-2xl font-bold text-gray-800">{s.value}</p>
              <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Actions (Sekarang Tombol "Pembahasan Lengkap" Menjadi Menu Utama Di Sini) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3 pt-2"
        >
          {savedResultId ? (
            <button
              onClick={() => dispatch({ type: 'OPEN_REVIEW', payload: savedResultId })}
              className="w-full py-4 rounded-2xl bg-[#10b981] hover:bg-emerald-600 text-white font-bold transition-colors flex items-center justify-center gap-2 text-base shadow-sm"
            >
              <BookOpen className="w-5 h-5" />
              Lihat Pembahasan Lengkap
            </button>
          ) : (
            <div className="w-full py-4 rounded-2xl bg-gray-100 text-gray-400 font-semibold text-center flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              Menyiapkan Pembahasan...
            </div>
          )}
          
          <div className="flex gap-3">
            <button
              onClick={() => dispatch({ type: 'CLEAR_EXAM' })}
              className="flex-1 py-3.5 rounded-2xl border border-gray-200 text-gray-600 font-semibold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Dashboard
            </button>
            <button
              onClick={() => startExam(examType, session.packageId ? { id: session.packageId, name: session.packageName ?? examType } as import('../../types').ExamPackage : undefined)}
              className="flex-1 py-3.5 rounded-2xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Ulangi
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
