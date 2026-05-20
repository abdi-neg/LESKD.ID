import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, CheckCircle, XCircle, ArrowLeft, RotateCcw, TrendingUp, Target, BookOpen, ChevronDown, ChevronUp, Eye } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AnswerOption } from '../../types';
import { EXAM_CONFIGS } from '../../data/mockData';
import { supabase } from '../../lib/supabase';
import { buildReviewSnapshot, saveReviewSnapshot } from '../../lib/examPersistence';

const OPTIONS: AnswerOption[] = ['A', 'B', 'C', 'D', 'E'];

export default function ExamResults() {
  const { state, dispatch, startExam } = useApp();
  const [showReview, setShowReview] = useState(false);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
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

  const questionsByCategory = questions.reduce<Record<string, typeof questions>>((acc, q) => {
    if (!acc[q.category]) acc[q.category] = [];
    acc[q.category].push(q);
    return acc;
  }, {});

  const catColors: Record<string, string> = {
    TIU: 'bg-blue-100 text-blue-700',
    TWK: 'bg-emerald-100 text-emerald-700',
    TKP: 'bg-rose-100 text-rose-700',
  };

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

        {/* Review Pembahasan Toggle (inline, quick glance) */}
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          onClick={() => setShowReview(!showReview)}
          className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1e3a8a]/10 rounded-xl flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-[#1e3a8a]" />
            </div>
            <div className="text-left">
              <p className="font-semibold text-gray-800">Review Cepat</p>
              <p className="text-gray-500 text-xs">Lihat kunci jawaban dan penjelasan tiap soal</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-[#1e3a8a]" />
            {showReview ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
          </div>
        </motion.button>

        {/* Inline Review Content */}
        <AnimatePresence>
          {showReview && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden space-y-6"
            >
              {Object.entries(questionsByCategory).map(([category, catQuestions]) => (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className={`text-xs font-bold px-3 py-1.5 rounded-full ${catColors[category] || 'bg-gray-100 text-gray-700'}`}>
                      {category}
                    </span>
                    <span className="text-gray-400 text-xs">{catQuestions.length} soal</span>
                  </div>
                  <div className="space-y-3">
                    {catQuestions.map((q, idx) => {
                      const ans = answers[q.id];
                      const isCorrect = ans?.selectedAnswer === q.correct_answer;
                      const isUnanswered = !ans?.selectedAnswer;
                      const isExpanded = expandedQuestion === q.id;

                      // 🚀 Mengunci nomor urut asli berdasarkan array 'questions' global
                      const originalIndex = questions.findIndex(item => item.id === q.id);

                      return (
                        <motion.div
                          key={q.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.03 }}
                          className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
                        >
                          <button
                            onClick={() => setExpandedQuestion(isExpanded ? null : q.id)}
                            className="w-full p-4 flex items-start gap-3 text-left hover:bg-gray-50/50 transition-colors"
                          >
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5
                              ${isUnanswered ? 'bg-gray-100' : isCorrect ? 'bg-[#10b981]' : 'bg-red-500'}`}
                            >
                              {isUnanswered ? (
                                <Target className="w-3.5 h-3.5 text-gray-400" />
                              ) : isCorrect ? (
                                <CheckCircle className="w-3.5 h-3.5 text-white" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5 text-white" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 line-clamp-2">
                                Soal {originalIndex !== -1 ? originalIndex + 1 : idx + 1}: {q.question_text}
                              </p>
                              {q.image_url && (
                                <img
                                  src={q.image_url}
                                  alt="Gambar soal"
                                  className="mt-1.5 max-h-20 rounded-lg border border-gray-100 object-contain"
                                />
                              )}
                              <div className="flex items-center gap-2 mt-1.5">
                                {ans?.selectedAnswer && (
                                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-md
                                    ${isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                                    Jawaban Anda: {ans.selectedAnswer}
                                  </span>
                                )}
                                {isUnanswered && (
                                  <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-gray-500">
                                    Tidak dijawab
                                  </span>
                                )}
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[#1e3a8a]/10 text-[#1e3a8a]">
                                  Kunci: {q.correct_answer}
                                </span>
                              </div>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
                            )}
                          </button>

                          <AnimatePresence>
                            {isExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                              >
                                <div className="px-4 pb-4 border-t border-gray-50">
                                  {q.option_type === 'image' ? (
                                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                                      {OPTIONS.map((opt) => {
                                        const imgUrl = q[`option_${opt.toLowerCase()}` as keyof typeof q] as string;
                                        const isKey = opt === q.correct_answer;
                                        const isSelected = ans?.selectedAnswer === opt;
                                        const isWrong = isSelected && !isKey;
                                        return (
                                          <div key={opt} className={`relative rounded-xl border-2 overflow-hidden
                                            ${isKey ? 'border-emerald-400' : isWrong ? 'border-red-400' : 'border-gray-200'}`}>
                                            <div className={`absolute top-1 left-1 z-10 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold
                                              ${isKey ? 'bg-[#10b981] text-white' : isWrong ? 'bg-red-500 text-white' : 'bg-white/90 text-gray-500 border border-gray-200'}`}>
                                              {opt}
                                            </div>
                                            <img src={imgUrl} alt={`Opsi ${opt}`} className="w-full aspect-square object-contain bg-white p-1.5" />
                                          </div>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className="mt-3 space-y-2">
                                      {OPTIONS.map((opt) => {
                                        const optText = q[`option_${opt.toLowerCase()}` as keyof typeof q] as string;
                                        const isKey = opt === q.correct_answer;
                                        const isSelected = ans?.selectedAnswer === opt;
                                        return (
                                          <div
                                            key={opt}
                                            className={`flex items-start gap-2 p-2.5 rounded-xl text-sm
                                              ${isKey ? 'bg-emerald-50 border border-emerald-200' : isSelected && !isKey ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}
                                          >
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                                              ${isKey ? 'bg-[#10b981] text-white' : isSelected && !isKey ? 'bg-red-500 text-white' : 'bg-white border border-gray-200 text-gray-500'}`}>
                                              {opt}
                                            </div>
                                            <span className={`leading-relaxed ${isKey ? 'text-emerald-800 font-medium' : isSelected && !isKey ? 'text-red-700' : 'text-gray-600'}`}>
                                              {optText}
                                            </span>
                                            {isKey && <CheckCircle className="w-4 h-4 text-[#10b981] flex-shrink-0 ml-auto" />}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                  {q.explanation && (
                                    <div className="mt-3 bg-[#1e3a8a]/5 border border-[#1e3a8a]/10 rounded-xl p-3">
                                      <p className="text-xs font-semibold text-[#1e3a8a] mb-1">Pembahasan:</p>
                                      <p className="text-sm text-gray-700 leading-relaxed">{q.explanation}</p>
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-3"
        >
          {savedResultId && (
            <button
              onClick={() => dispatch({ type: 'OPEN_REVIEW', payload: savedResultId })}
              className="w-full py-3.5 rounded-2xl bg-[#10b981] hover:bg-emerald-600 text-white font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <BookOpen className="w-4 h-4" />
              Lihat Pembahasan Lengkap
            </button>
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
