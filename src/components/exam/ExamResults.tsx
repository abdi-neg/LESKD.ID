import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  CheckCircle,
  XCircle,
  ArrowLeft,
  RotateCcw,
  TrendingUp,
  Target,
  BookOpen,
  KeyRound,
  X,
  Percent,
  Clock,
  Zap,
  AlertTriangle,
  Award
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { EXAM_CONFIGS } from '../../data/mockData';
import { supabase } from '../../lib/supabase';
import { buildReviewSnapshot, saveReviewSnapshot } from '../../lib/examPersistence';
import DiagnosticReport from './DiagnosticReport';

interface MistakeBadge {
  num: number;
  detail: string;
}

export function ExamResults() {
  const { state, dispatch, startExam } = useApp();
  const [savedResultId, setSavedResultId] = useState<any>(null);
  const savedRef = useRef(false);

  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [inputToken, setInputToken] = useState('');
  const [tokenError, setTokenError] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const session = state.examSession;
  const profile = state.profile;

  useEffect(() => {
    if (!session?.scores) return;
    if (!profile) return;
    if (savedRef.current) return;
    savedRef.current = true;

    const { scores, examType, questions, answers, startedAt, completedAt, packageId, packageName } = session;
    const dbResultId = (session as any).resultId;
    const rawPkgType = ((session as any).packageType ?? '').toUpperCase();
    const isSubKategori = rawPkgType === 'TO_SUBKATEGORI';

    (async () => {
      const snapshot = buildReviewSnapshot(session);

      if (dbResultId) {
        const { error } = await supabase
          .from('exam_results')
          .update({
            review_snapshot: snapshot
          })
          .eq('id', dbResultId);

        if (error) {
          console.error('Failed to update review snapshot:', error);
          return;
        }

        saveReviewSnapshot(dbResultId, snapshot);
        setSavedResultId(dbResultId);
      } else {
        const config = EXAM_CONFIGS[examType] ?? EXAM_CONFIGS.FULL;
        const twkCount = questions.filter((q) => q.category === 'TWK').length;
        const tiuCount = questions.filter((q) => q.category === 'TIU').length;
        const tkpCount = questions.filter((q) => q.category === 'TKP').length;

        let passed = scores.total >= config.passingScore;
        if (isSubKategori) {
          const minTwk = twkCount >= 20 ? 65 : Math.ceil(twkCount * 5 * 0.65);
          const minTiu = tiuCount >= 25 ? 80 : Math.ceil(tiuCount * 5 * 0.65);
          const minTkp = tkpCount >= 45 ? 166 : Math.ceil(tkpCount * 5 * (166 / 225));
          const passTwk = twkCount === 0 ? true : scores.twk >= minTwk;
          const passTiu = tiuCount === 0 ? true : scores.tiu >= minTiu;
          const passTkp = tkpCount === 0 ? true : scores.tkp >= minTkp;
          passed = passTwk && passTiu && passTkp;
        } else if (examType === 'FULL') {
          passed = scores.twk >= 65 && scores.tiu >= 80 && scores.tkp >= 166;
        }

        const durationSeconds = completedAt
          ? Math.floor((new Date(completedAt).getTime() - new Date(startedAt).getTime()) / 1000)
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

        const resolvedPackageType = rawPkgType ? rawPkgType : (pkgTypeMap[examType] ?? 'FULL');

        const { data } = await supabase.from('exam_results').insert({
          participant_id: profile.id,
          package_id: packageId ?? null,
          package_name: packageName ?? examType,
          package_type: resolvedPackageType,
          score_tiu: scores.tiu,
          score_twk: scores.twk,
          score_tkp: scores.tkp,
          total_score: scores.total,
          questions_correct: correctCount,
          questions_total: questions.length,
          passed,
          duration_seconds: durationSeconds,
          completed_at: (completedAt ?? new Date()).toISOString(),
          review_snapshot: snapshot,
          status: 'completed'
        }).select('id').maybeSingle();

        if (data?.id) {
          saveReviewSnapshot(data.id, snapshot);
          setSavedResultId(data.id);
        }
      }
    })();
  }, [session, profile]);

  if (!session?.scores) return null;

  const { scores, examType, questions, answers, startedAt, completedAt } = session;
  const config = EXAM_CONFIGS[examType] ?? EXAM_CONFIGS.FULL;
  const rawPkgType = ((session as any).packageType ?? '').toUpperCase();
  const isSubKategori = rawPkgType === 'TO_SUBKATEGORI';

  const twkCount = questions.filter((q) => q.category === 'TWK').length;
  const tiuCount = questions.filter((q) => q.category === 'TIU').length;
  const tkpCount = questions.filter((q) => q.category === 'TKP').length;

  const maxTotalScore = questions.length * 5;
  const accuracyPercentage = maxTotalScore > 0
    ? Math.min(100, Math.round((scores.total / maxTotalScore) * 100))
    : 0;

  // Kalkulasi kecepatan pengerjaan (detik per soal)
  const endTimestamp = completedAt ? new Date(completedAt).getTime() : Date.now();
  const startTimestamp = startedAt ? new Date(startedAt).getTime() : endTimestamp;
  const totalDurationSeconds = Math.max(1, Math.floor((endTimestamp - startTimestamp) / 1000));
  const avgSecondsPerQuestion = questions.length > 0
    ? Math.round(totalDurationSeconds / questions.length)
    : 0;

  const paceEvaluation = avgSecondsPerQuestion <= 54
    ? {
        label: 'Ideal (Standar CAT BKN)',
        badgeClass: 'bg-emerald-100 text-emerald-800',
        textClass: 'text-emerald-700',
        note: 'Ritme pengerjaan sudah memenuhi batas aman 54 detik/soal.'
      }
    : avgSecondsPerQuestion <= 70
      ? {
          label: 'Cukup (Perlu Akselerasi)',
          badgeClass: 'bg-amber-100 text-amber-800',
          textClass: 'text-amber-700',
          note: 'Sedikit di atas rata-rata CAT BKN (54 detik/soal). Latih pemindaian kata kunci.'
        }
      : {
          label: 'Terlalu Lama',
          badgeClass: 'bg-rose-100 text-rose-800',
          textClass: 'text-rose-700',
          note: 'Berisiko kehabisan waktu pada simulasi 110 soal. Biasakan lewati soal buntu.'
        };

  // Status penguasaan bab berdasarkan akurasi
  const masteryEvaluation = accuracyPercentage >= 80
    ? {
        title: 'Menguasai Materi',
        badgeClass: 'bg-emerald-100 text-emerald-800',
        borderClass: 'border-emerald-200 bg-emerald-50/60',
        advice: 'Pemahaman konsep sudah solid. Anda siap lanjut ke sub-materi berikutnya.'
      }
    : accuracyPercentage >= 60
      ? {
          title: 'Cukup Baik',
          badgeClass: 'bg-amber-100 text-amber-800',
          borderClass: 'border-amber-200 bg-amber-50/60',
          advice: 'Bedah nomor yang meleset di bawah ini untuk menutup celah ketelitian.'
        }
      : {
          title: 'Perlu Penguatan Konsep',
          badgeClass: 'bg-rose-100 text-rose-800',
          borderClass: 'border-rose-200 bg-rose-50/60',
          advice: 'Tinjau kembali konsep dasar bab ini melalui pembahasan lalu ulangi sesi drilling.'
        };

  const tiuMax = isSubKategori ? tiuCount * 5 : EXAM_CONFIGS.TIU.questionCount * 5;
  const twkMax = isSubKategori ? twkCount * 5 : EXAM_CONFIGS.TWK.questionCount * 5;
  const tkpMax = isSubKategori ? tkpCount * 5 : EXAM_CONFIGS.TKP.questionCount * 5;

  const tiuThreshold = EXAM_CONFIGS.TIU.passingScore;
  const twkThreshold = EXAM_CONFIGS.TWK.passingScore;
  const tkpThreshold = EXAM_CONFIGS.TKP.passingScore;

  let passed = scores.total >= config.passingScore;
  if (examType === 'FULL' && !isSubKategori) {
    passed = scores.twk >= 65 && scores.tiu >= 80 && scores.tkp >= 166;
  }

  const totalAnswered = Object.values(answers).filter((a) => a.selectedAnswer).length;
  const totalUnanswered = questions.length - totalAnswered;

  let correctCount = 0;
  let wrongCount = 0;
  const mistakeBadges: MistakeBadge[] = [];
  const unansweredNumbers: number[] = [];

  questions.forEach((q, idx) => {
    const qNumber = idx + 1;
    const ans = answers[q.id];
    const selected = ans?.selectedAnswer;

    if (!selected) {
      unansweredNumbers.push(qNumber);
      return;
    }

    if (q.category === 'TKP') {
      const pts = (q as any)[`points_${selected.toLowerCase()}`] ?? 0;
      if (pts <= 3) {
        mistakeBadges.push({ num: qNumber, detail: `${pts}p` });
      }
    } else {
      if (selected === q.correct_answer) {
        correctCount++;
      } else {
        wrongCount++;
        mistakeBadges.push({ num: qNumber, detail: selected });
      }
    }
  });

  const isPureTkpDrilling = isSubKategori && tkpCount > 0 && twkCount === 0 && tiuCount === 0;

  const currentDiagnostic = (() => {
    const breakdown: Record<string, { correct: number; total: number; percentage: number }> = {};

    questions.forEach((q) => {
      const subCat = q.sub_category ? q.sub_category : 'Umum';
      const ans = answers[q.id];
      const selected = ans?.selectedAnswer;

      if (!breakdown[subCat]) {
        breakdown[subCat] = { correct: 0, total: 0, percentage: 0 };
      }

      if (q.category === 'TKP') {
        const points = selected ? ((q as any)[`points_${selected.toLowerCase()}`] ?? 0) : 0;
        breakdown[subCat].correct += points;
        breakdown[subCat].total += 5;
      } else {
        const isCorrect = selected === q.correct_answer;
        breakdown[subCat].correct += isCorrect ? 1 : 0;
        breakdown[subCat].total += 1;
      }
    });

    Object.keys(breakdown).forEach((key) => {
      const item = breakdown[key];
      item.percentage = item.total > 0 ? Math.round((item.correct / item.total) * 100) : 0;
    });

    return breakdown;
  })();

  const subTopicCount = Object.keys(currentDiagnostic).length;
  const showDiagnosticChart = isSubKategori ? subTopicCount > 1 : true;

  const allCategoryStats = [
    { key: 'TIU', count: tiuCount, score: scores.tiu, max: tiuMax, threshold: tiuThreshold, color: 'bg-blue-500', lightColor: 'bg-blue-100', textColor: 'text-blue-700' },
    { key: 'TWK', count: twkCount, score: scores.twk, max: twkMax, threshold: twkThreshold, color: 'bg-emerald-500', lightColor: 'bg-emerald-100', textColor: 'text-emerald-700' },
    { key: 'TKP', count: tkpCount, score: scores.tkp, max: tkpMax, threshold: tkpThreshold, color: 'bg-amber-500', lightColor: 'bg-amber-100', textColor: 'text-amber-700' },
  ];

  const categoryStats = isSubKategori
    ? allCategoryStats.filter((c) => c.count > 0)
    : examType === 'FULL'
      ? allCategoryStats
      : allCategoryStats.filter((c) => c.key === examType);

  const showCategorySummaryCard = isSubKategori ? categoryStats.length > 1 : true;

  const statGridClass =
    categoryStats.length === 1
      ? 'grid-cols-1'
      : categoryStats.length === 2
        ? 'grid-cols-1 sm:grid-cols-2'
        : 'grid-cols-1 sm:grid-cols-3';

  const heroGradient = isSubKategori
    ? 'bg-gradient-to-br from-purple-600 via-indigo-600 to-[#1e3a8a]'
    : passed
      ? 'bg-gradient-to-br from-[#10b981] to-emerald-600'
      : 'bg-gradient-to-br from-[#1e3a8a] to-blue-700';

  // Validasi Token Ulangi Ujian — Terhubung langsung ke exam_packages (sinkron dengan TokenGate.tsx)
  const handleVerifyTokenAndRepeat = async (e: React.FormEvent) => {
    e.preventDefault();
    const inputTokenClean = inputToken.trim();

    if (inputTokenClean.length !== 6) {
      setTokenError('Masukkan 6 digit angka token dengan benar.');
      return;
    }

    if (!session.packageId) {
      setTokenError('Data paket tidak ditemukan. Silakan kembali ke Dashboard.');
      return;
    }

    setTokenError('');
    setIsValidating(true);

    try {
      const { data, error } = await supabase
        .from('exam_packages')
        .select('*')
        .eq('id', session.packageId)
        .single();

      const hasDbError = Boolean(error);
      if (hasDbError ? true : !data) {
        setTokenError('Gagal terhubung ke server untuk verifikasi token.');
        setIsValidating(false);
        return;
      }

      if (!data.is_active) {
        setTokenError('Paket ujian ini sedang dinonaktifkan oleh Admin.');
        setIsValidating(false);
        return;
      }

      let dbTokenClean = String(data.token ?? '').trim();
      if (dbTokenClean.length < 6 && /^\d+$/.test(dbTokenClean)) {
        dbTokenClean = dbTokenClean.padStart(6, '0');
      }

      if (inputTokenClean !== dbTokenClean) {
        setTokenError('Token tidak valid. Pastikan token 6-digit sesuai dengan yang dibagikan Admin.');
        setIsValidating(false);
        return;
      }

      setIsTokenModalOpen(false);
      setInputToken('');
      await startExam(examType, data as any);
    } catch (err) {
      console.error(err);
      setTokenError('Terjadi kendala sistem saat memproses token.');
    } finally {
      setIsValidating(false);
    }
  };

  const miniStatsCards = isSubKategori
    ? [
        { icon: Percent, label: 'Tingkat Akurasi', value: `${accuracyPercentage}%`, color: 'text-purple-600', bg: 'bg-purple-50' },
        {
          icon: CheckCircle,
          label: isPureTkpDrilling ? 'Terjawab' : 'Benar',
          value: isPureTkpDrilling ? `${totalAnswered}/${questions.length}` : `${correctCount}/${questions.length}`,
          color: 'text-[#10b981]',
          bg: 'bg-emerald-50'
        },
        { icon: Clock, label: 'Kecepatan', value: `${avgSecondsPerQuestion}d/soal`, color: 'text-[#1e3a8a]', bg: 'bg-blue-50' },
      ]
    : [
        { icon: CheckCircle, label: 'Benar', value: correctCount, color: 'text-[#10b981]', bg: 'bg-emerald-50' },
        { icon: XCircle, label: 'Salah', value: wrongCount, color: 'text-red-500', bg: 'bg-red-50' },
        { icon: Target, label: 'Kosong', value: totalUnanswered, color: 'text-gray-500', bg: 'bg-gray-50' },
      ];

  const formattedTotalTime = totalDurationSeconds >= 60
    ? `${Math.floor(totalDurationSeconds / 60)}m ${totalDurationSeconds % 60}d`
    : `${totalDurationSeconds}d`;

  const isSubmitDisabled = isValidating ? true : inputToken.length !== 6;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 relative">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Result Hero Card */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`rounded-3xl p-8 text-white text-center relative overflow-hidden ${heroGradient}`}
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
            {isSubKategori && (
              <span className="inline-block bg-white/20 text-white text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-2">
                Drilling Sub-Kategori
              </span>
            )}
            <h1 className="text-3xl font-bold mb-1">{scores.total}</h1>
            <p className="text-white/80 text-sm mb-3">Total Skor</p>

            {isSubKategori ? (
              <>
                <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold bg-white text-purple-700 shadow-sm">
                  <CheckCircle className="w-4 h-4" /> SELESAI DRILLING
                </span>
                <p className="text-white/85 text-xs mt-2.5 font-medium">
                  Tingkat Akurasi: <span className="font-bold text-white">{accuracyPercentage}%</span> (dari {maxTotalScore} poin maksimal)
                </p>
              </>
            ) : (
              <>
                <span
                  className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-semibold ${
                    passed ? 'bg-white text-emerald-700' : 'bg-white/20 text-white border border-white/30'
                  }`}
                >
                  {passed ? (
                    <><CheckCircle className="w-4 h-4" /> LULUS</>
                  ) : (
                    <><XCircle className="w-4 h-4" /> BELUM LULUS</>
                  )}
                </span>
                <p className="text-white/70 text-xs mt-2">Nilai ambang batas: {config.passingScore}</p>
              </>
            )}
          </motion.div>
        </motion.div>

        {/* Stats Mini Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-3 sm:gap-4"
        >
          {miniStatsCards.map((s, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-center">
              <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mx-auto mb-2`}>
                <s.icon className={`w-5 h-5 ${s.color}`} />
              </div>
              <p className="text-xl sm:text-2xl font-bold text-gray-800">{s.value}</p>
              <p className="text-gray-500 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </motion.div>

        {/* Evaluasi Taktis Khusus Drilling Sub-Kategori */}
        {isSubKategori && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-5"
          >
            <div className="flex items-center justify-between flex-wrap gap-2">
              <h2 className="font-bold text-gray-800 flex items-center gap-2">
                <Zap className="w-5 h-5 text-purple-600" />
                Evaluasi Taktis Drilling
              </h2>
              <span className="text-xs text-gray-400 font-medium">
                Durasi total: {formattedTotalTime}
              </span>
            </div>

            {/* Kartu Penguasaan Bab & Ritme Kecepatan */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className={`rounded-2xl border p-4 ${masteryEvaluation.borderClass}`}>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                    <Award className="w-4 h-4 text-purple-600" /> Penguasaan Bab
                  </span>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${masteryEvaluation.badgeClass}`}>
                    {masteryEvaluation.title}
                  </span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  {masteryEvaluation.advice}
                </p>
              </div>

              <div className="rounded-2xl border border-gray-200 bg-gray-50/70 p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-[#1e3a8a]" /> Ritme CAT BKN
                  </span>
                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${paceEvaluation.badgeClass}`}>
                    {paceEvaluation.label}
                  </span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Rata-rata <span className={`font-bold ${paceEvaluation.textClass}`}>{avgSecondsPerQuestion} detik/soal</span>. {paceEvaluation.note}
                </p>
              </div>
            </div>

            {/* Peta Nomor Meleset & Kosong */}
            <div className="pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-500 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  {isPureTkpDrilling ? 'Nomor Belum Optimal (Poin <= 3)' : 'Prioritas Nomor Perlu Dibahas'}
                </span>
                <span className="text-xs font-semibold text-gray-400">
                  {mistakeBadges.length + unansweredNumbers.length} butir
                </span>
              </div>

              {mistakeBadges.length === 0 && unansweredNumbers.length === 0 ? (
                <div className="rounded-2xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs font-semibold text-emerald-700 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 flex-shrink-0" />
                  Sempurna! Seluruh butir soal terjawab dengan hasil optimal.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {mistakeBadges.map((item) => (
                    <span
                      key={`m-${item.num}`}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-50 text-rose-700 border border-rose-200"
                    >
                      <span>No. {item.num}</span>
                      <span className="text-[10px] font-semibold bg-rose-100 px-1.5 py-0.2 rounded">
                        {isPureTkpDrilling ? item.detail : `Jawab ${item.detail}`}
                      </span>
                    </span>
                  ))}
                  {unansweredNumbers.map((num) => (
                    <span
                      key={`u-${num}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200"
                    >
                      <span>No. {num}</span>
                      <span className="text-[10px] font-medium text-gray-400">(Kosong)</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {/* Per-Category Score Summary (Untuk Full SKD, Mini TO, atau Drilling Lintas Kategori) */}
        {showCategorySummaryCard && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6"
          >
            <h2 className="font-bold text-gray-800 mb-5 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#1e3a8a]" />
              Ringkasan Nilai Per Kategori
            </h2>
            <div className={`grid ${statGridClass} gap-4`}>
              {categoryStats.map((cat) => {
                const pct = cat.max > 0 ? Math.min((cat.score / cat.max) * 100, 100) : 0;
                const roundedPct = Math.round(pct);
                const catPassed = cat.score >= cat.threshold;
                return (
                  <div key={cat.key} className={`${cat.lightColor} rounded-2xl p-4`}>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`text-sm font-bold ${cat.textColor}`}>{cat.key}</span>
                      {isSubKategori ? (
                        <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold bg-purple-200/80 text-purple-800">
                          Akurasi {roundedPct}%
                        </span>
                      ) : (
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                            catPassed ? 'bg-emerald-200 text-emerald-800' : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {catPassed ? 'Lulus' : 'Belum'}
                        </span>
                      )}
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
                    {isSubKategori ? (
                      <p className="text-xs text-gray-500 mt-1.5">Ketepatan skor: {roundedPct}%</p>
                    ) : (
                      <p className="text-xs text-gray-500 mt-1.5">Ambang batas: {cat.threshold}</p>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Grafik Diagnosis Evaluasi Materi */}
        {showDiagnosticChart && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <DiagnosticReport answers="{answers}" questions="{questions}"/>
          </motion.div>
        )}

        {/* Actions Menu */}
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
              <div className="text-sm">Menyiapkan Pembahasan...</div>
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
              onClick={() => {
                setTokenError('');
                setInputToken('');
                setIsTokenModalOpen(true);
              }}
              className="flex-1 py-3.5 rounded-2xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-semibold transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              Ulangi
            </button>
          </div>
        </motion.div>
      </div>

      {/* MODAL POP-UP TOKEN (SINKRON DENGAN EXAM_PACKAGES) */}
      <AnimatePresence>
        {isTokenModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsTokenModalOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full relative z-10 shadow-xl border border-gray-100 space-y-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#1e3a8a]">
                  <KeyRound className="w-5 h-5" />
                  <h3 className="font-bold text-gray-800 text-lg">Verifikasi Token Ulang</h3>
                </div>
                <button
                  onClick={() => setIsTokenModalOpen(false)}
                  className="p-1.5 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-gray-500 text-sm leading-relaxed">
                Masukkan token 6-digit aktif dari Admin untuk memulai ulang paket <span className="font-semibold text-gray-700">{session.packageName ?? examType}</span>.
              </p>

              <form onSubmit={handleVerifyTokenAndRepeat} className="space-y-3">
                <div>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={6}
                    autoFocus
                    value={inputToken}
                    onChange={(e) => setInputToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    disabled={isValidating}
                    className={`w-full px-4 py-3 rounded-xl border font-mono font-bold text-center tracking-[0.45em] text-2xl focus:outline-none focus:ring-2 transition-all
                      ${tokenError ? 'border-red-300 focus:ring-red-200' : 'border-gray-200 focus:ring-blue-100 focus:border-[#1e3a8a]'}`}
                  />
                  {tokenError && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-500 text-xs mt-1.5 font-medium flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5 flex-shrink-0" /> {tokenError}
                    </motion.p>
                  )}
                </div>

                <div className="flex gap-2.5 pt-2">
                  <button
                    type="button"
                    disabled={isValidating}
                    onClick={() => setIsTokenModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl border border-gray-200 font-semibold text-gray-600 hover:bg-gray-50 text-sm transition-colors"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitDisabled}
                    className="flex-1 py-2.5 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] text-white font-bold text-sm transition-colors flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50"
                  >
                    {isValidating ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Validasi...</span>
                      </>
                    ) : (
                      'Mulai Ulang'
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
