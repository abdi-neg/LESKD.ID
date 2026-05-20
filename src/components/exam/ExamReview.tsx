import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, CheckCircle, XCircle, Target, BookOpen,
  ChevronDown, ChevronUp, Search, Filter,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { loadReviewSnapshot, ReviewSnapshot } from '../../lib/examPersistence';
import { AnswerOption } from '../../types';

const OPTIONS: AnswerOption[] = ['A', 'B', 'C', 'D', 'E'];

type FilterType = 'all' | 'correct' | 'wrong' | 'unanswered';

function QuestionCard({
  question,
  answer,
  index,
}: {
  question: ReviewSnapshot['questions'][number];
  answer: ReviewSnapshot['answers'][string] | undefined;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const selected = answer?.selectedAnswer ?? null;
  const isTKP = question.category === 'TKP';
  
  // Logika status untuk TIU/TWK
  const isCorrect = !isTKP && selected !== null && selected === question.correct_answer;
  const isUnanswered = selected === null;

  // Fungsi helper untuk mengambil poin dari snapshot soal
  const getOptionPoints = (opt: AnswerOption) => {
    const key = `points_${opt.toLowerCase()}` as keyof typeof question;
    return (question[key] as number) ?? 0;
  };

  // Mendapatkan skor yang diperoleh user di soal ini
  const userGainedPoints = selected ? getOptionPoints(selected as AnswerOption) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.02, 0.3) }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full p-4 flex items-start gap-3 text-left hover:bg-gray-50/50 transition-colors"
      >
        {/* Status badge */}
        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5
          ${isUnanswered 
            ? 'bg-gray-100' 
            : isTKP 
              ? userGainedPoints === 5 
                ? 'bg-emerald-500' 
                : 'bg-amber-500' // TKP jika tidak poin maksimal diberi warna amber/orange hangat
              : isCorrect 
                ? 'bg-emerald-500' 
                : 'bg-red-500'
          }`}
        >
          {isUnanswered ? (
            <Target className="w-3.5 h-3.5 text-gray-400" />
          ) : isTKP ? (
            <span className="text-[10px] font-extrabold text-white">+{userGainedPoints}</span>
          ) : isCorrect ? (
            <CheckCircle className="w-3.5 h-3.5 text-white" />
          ) : (
            <XCircle className="w-3.5 h-3.5 text-white" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 line-clamp-2">
            <span className="text-gray-400 mr-1">#{index + 1}</span>
            {question.question_text}
          </p>
          {question.image_url && !expanded && (
            <img
              src={question.image_url}
              alt="soal"
              className="mt-1.5 max-h-16 rounded-lg border border-gray-100 object-contain"
            />
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold
              ${question.category === 'TIU' ? 'bg-blue-100 text-blue-700'
                : question.category === 'TWK' ? 'bg-emerald-100 text-emerald-700'
                : 'bg-rose-100 text-rose-700'}`}>
              {question.category}
            </span>
            
            {selected ? (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-md
                ${isTKP 
                  ? 'bg-amber-100 text-amber-800' 
                  : isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                Jawaban Anda: {selected} {isTKP && `(${userGainedPoints} Poin)`}
              </span>
            ) : (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-gray-500">
                Tidak dijawab
              </span>
            )}

            {!isTKP && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-[#1e3a8a]/10 text-[#1e3a8a]">
                Kunci: {question.correct_answer}
              </span>
            )}
          </div>
        </div>

        {expanded
          ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
          : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />
        }
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 border-t border-gray-50">
              {question.image_url && (
                <img
                  src={question.image_url}
                  alt="soal"
                  className="mt-3 max-h-48 rounded-xl border border-gray-100 object-contain w-full"
                />
              )}
              
              {question.option_type === 'image' ? (
                /* ==================== 1. OPSI TIPE GAMBAR ==================== */
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {OPTIONS.map((opt) => {
                    const imgUrl = question[`option_${opt.toLowerCase()}` as keyof typeof question] as string;
                    const pts = getOptionPoints(opt);
                    
                    const isKey = !isTKP && opt === question.correct_answer;
                    const isChosen = selected === opt;
                    const isWrongChoice = !isTKP && isChosen && !isKey;

                    // Style border box untuk TKP vs Non-TKP
                    let borderClass = 'border-gray-200';
                    if (isTKP) {
                      if (isChosen) borderClass = 'border-amber-500 ring-2 ring-amber-200';
                      else if (pts === 5) borderClass = 'border-emerald-300 border-dashed';
                    } else {
                      if (isKey) borderClass = 'border-emerald-400 ring-2 ring-emerald-200';
                      if (isWrongChoice) borderClass = 'border-red-400 ring-2 ring-red-200';
                    }

                    return (
                      <div key={opt} className={`relative rounded-2xl border-2 overflow-hidden ${borderClass}`}>
                        {/* Badge Huruf Opsi */}
                        <div className={`absolute top-1.5 left-1.5 z-10 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow
                          ${isTKP
                            ? isChosen ? 'bg-amber-500 text-white' : 'bg-white/90 text-gray-500 border border-gray-200'
                            : isKey ? 'bg-emerald-500 text-white'
                            : isWrongChoice ? 'bg-red-500 text-white'
                            : 'bg-white/90 text-gray-500 border border-gray-200'}`}>
                          {opt}
                        </div>

                        {/* Badge Poin TKP (Kanan Atas) */}
                        {isTKP && (
                          <div className={`absolute top-1.5 right-1.5 z-10 px-1.5 py-0.5 rounded-md text-[10px] font-bold shadow-sm
                            ${pts === 5 ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                            {pts} Pts
                          </div>
                        )}

                        {!isTKP && isKey && <CheckCircle className="absolute top-1.5 right-1.5 z-10 w-4 h-4 text-emerald-500 drop-shadow" />}
                        {!isTKP && isWrongChoice && <XCircle className="absolute top-1.5 right-1.5 z-10 w-4 h-4 text-red-400 drop-shadow" />}
                        
                        <img
                          src={imgUrl}
                          alt={`Opsi ${opt}`}
                          className="w-full aspect-square object-contain bg-white p-2"
                        />
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* ==================== 2. OPSI TIPE TEKS ==================== */
                <div className="mt-3 space-y-2">
                  {OPTIONS.map((opt) => {
                    const text = question[`option_${opt.toLowerCase()}` as keyof typeof question] as string;
                    const pts = getOptionPoints(opt);
                    
                    const isKey = !isTKP && opt === question.correct_answer;
                    const isChosen = selected === opt;
                    const isWrongChoice = !isTKP && isChosen && !isKey;

                    // Tentukan warna background list item opsi
                    let bgClass = 'bg-gray-50 border border-transparent';
                    if (isTKP) {
                      if (isChosen) bgClass = 'bg-amber-50/70 border border-amber-300';
                      else if (pts === 5) bgClass = 'bg-emerald-50/30 border border-dashed border-emerald-200';
                    } else {
                      if (isKey) bgClass = 'bg-emerald-50 border border-emerald-200';
                      if (isWrongChoice) bgClass = 'bg-red-50 border border-red-200';
                    }

                    return (
                      <div key={opt} className={`flex items-start gap-2.5 p-2.5 rounded-xl text-sm transition-colors ${bgClass}`}>
                        {/* Lingkaran Huruf A-E */}
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                          ${isTKP
                            ? isChosen ? 'bg-amber-500 text-white' : 'bg-white border border-gray-200 text-gray-500'
                            : isKey ? 'bg-emerald-500 text-white'
                            : isWrongChoice ? 'bg-red-500 text-white'
                            : 'bg-white border border-gray-200 text-gray-500'}`}>
                          {opt}
                        </div>

                        {/* Isi Teks Jawaban */}
                        <span className={`leading-relaxed flex-1
                          ${isTKP
                            ? isChosen ? 'text-amber-900 font-medium' : 'text-gray-600'
                            : isKey ? 'text-emerald-800 font-medium'
                            : isWrongChoice ? 'text-red-700'
                            : 'text-gray-600'}`}>
                          {text}
                        </span>

                        {/* Indikator Poin / Status Icon di Ujung Kanan */}
                        {isTKP ? (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-lg flex-shrink-0 ml-auto self-center
                            ${pts === 5 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : isChosen 
                                ? 'bg-amber-100 text-amber-700' 
                                : 'bg-gray-100 text-gray-500'}`}>
                            {pts} Poin
                          </span>
                        ) : (
                          <>
                            {isKey && <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 ml-auto mt-0.5" />}
                            {isWrongChoice && <XCircle className="w-4 h-4 text-red-400 flex-shrink-0 ml-auto mt-0.5" />}
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Box Pembahasan */}
              {question.explanation ? (
                <div className="mt-4 bg-[#1e3a8a]/5 border border-[#1e3a8a]/10 rounded-xl p-3.5">
                  <div className="flex items-center gap-1.5 mb-1.5">
                    <BookOpen className="w-4 h-4 text-[#1e3a8a]" />
                    <p className="text-xs font-bold text-[#1e3a8a]">Pembahasan</p>
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed">{question.explanation}</p>
                </div>
              ) : (
                <div className="mt-4 bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs text-gray-400 text-center">
                  Belum ada pembahasan untuk soal ini
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function ExamReview() {
  const { state, dispatch } = useApp();
  const [filter, setFilter] = useState<FilterType>('all');
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const snapshot = state.reviewResultId
    ? loadReviewSnapshot(state.reviewResultId)
    : null;

  if (!snapshot) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">Data pembahasan tidak ditemukan</p>
          <button
            onClick={() => dispatch({ type: 'SET_VIEW', payload: 'participant-dashboard' })}
            className="mt-4 px-4 py-2 rounded-xl bg-[#1e3a8a] text-white text-sm font-semibold"
          >
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    );
  }

  const { questions, answers, scores, examType, packageName, completedAt } = snapshot;

  const categories = examType === 'FULL'
    ? ['all', 'TIU', 'TWK', 'TKP']
    : ['all', examType];

  const filtered = useMemo(() => {
    return questions.filter((q) => {
      const ans = answers[q.id];
      const selected = ans?.selectedAnswer ?? null;
      const isCorrect = selected !== null && selected === q.correct_answer;

      if (activeCategory !== 'all' && q.category !== activeCategory) return false;
      if (filter === 'correct' && !isCorrect) return false;
      if (filter === 'wrong' && (selected === null || isCorrect)) return false;
      if (filter === 'unanswered' && selected !== null) return false;
      if (search.trim()) {
        const q_lower = q.question_text.toLowerCase();
        if (!q_lower.includes(search.toLowerCase())) return false;
      }
      return true;
    });
  }, [questions, answers, filter, search, activeCategory]);

  const stats = useMemo(() => {
    let correct = 0, wrong = 0, unanswered = 0;
    questions.forEach((q) => {
      const ans = answers[q.id];
      if (!ans?.selectedAnswer) { unanswered++; return; }
      if (ans.selectedAnswer === q.correct_answer) correct++;
      else wrong++;
    });
    return { correct, wrong, unanswered };
  }, [questions, answers]);

  const filterOptions: { key: FilterType; label: string; count: number; color: string }[] = [
    { key: 'all', label: 'Semua', count: questions.length, color: 'bg-gray-100 text-gray-700' },
    { key: 'correct', label: 'Benar', count: stats.correct, color: 'bg-emerald-100 text-emerald-700' },
    { key: 'wrong', label: 'Salah', count: stats.wrong, color: 'bg-red-100 text-red-600' },
    { key: 'unanswered', label: 'Kosong', count: stats.unanswered, color: 'bg-gray-100 text-gray-500' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#1e3a8a] sticky top-0 z-40 shadow-lg">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => dispatch({ type: 'SET_VIEW', payload: 'participant-dashboard' })}
            className="w-9 h-9 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-white" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-white font-bold text-sm leading-tight truncate">
              Pembahasan — {packageName ?? examType}
            </p>
            <p className="text-blue-200 text-xs">
              {new Date(completedAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}
              {' · '}Skor: <span className="font-bold text-white">{scores.total}</span>
            </p>
          </div>
          <div className="flex-shrink-0 text-right">
            <p className="text-xs text-blue-200">{filtered.length} soal</p>
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">
        {/* Score Summary */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Benar', value: stats.correct, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Salah', value: stats.wrong, color: 'text-red-500', bg: 'bg-red-50' },
            { label: 'Kosong', value: stats.unanswered, color: 'text-gray-500', bg: 'bg-gray-50' },
          ].map((s) => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-3 text-center border border-white`}>
              <p className={`text-2xl font-extrabold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="space-y-2">
          {/* Category tabs */}
          {categories.length > 2 && (
            <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex-shrink-0 transition-colors
                    ${activeCategory === cat
                      ? 'bg-[#1e3a8a] text-white'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                >
                  {cat === 'all' ? 'Semua Kategori' : cat}
                </button>
              ))}
            </div>
          )}

          {/* Status filter chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
            <Filter className="w-4 h-4 text-gray-400 flex-shrink-0 self-center" />
            {filterOptions.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex-shrink-0 transition-colors flex items-center gap-1
                  ${filter === f.key ? `${f.color} ring-2 ring-offset-1 ring-current` : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
              >
                {f.label}
                <span className={`px-1.5 py-0.5 rounded-full text-xs font-bold
                  ${filter === f.key ? 'bg-white/60' : 'bg-gray-100'}`}>
                  {f.count}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari teks soal..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]/30 text-gray-800 placeholder-gray-400"
            />
          </div>
        </div>

        {/* Question List */}
        {filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <Target className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p className="font-medium">Tidak ada soal yang cocok</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((q, i) => (
              <QuestionCard
                key={q.id}
                question={q}
                answer={answers[q.id]}
                index={questions.indexOf(q)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
