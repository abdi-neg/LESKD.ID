import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target,
  CheckCircle,
  XCircle,
  ChevronUp,
  ChevronDown,
  BookOpen,
  Search,
  ArrowLeft,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import DiagnosticReport from './DiagnosticReport';

type AnswerOption = 'A' | 'B' | 'C' | 'D' | 'E';
const OPTIONS: AnswerOption[] = ['A', 'B', 'C', 'D', 'E'];

// ─── RADAR PENDETEKSI GAMBAR ───
function renderTextWithImages(text: any, isOption = false) {
  if (!text) return null;
  if (typeof text !== 'string') return text;

  const cleanText = text.replace(/<[^>]*>?/gm, '').trim();
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = cleanText.split(urlRegex);

  if (parts.length === 1) {
    return <span className="whitespace-pre-wrap leading-relaxed">{cleanText}</span>;
  }

  const imageClass = isOption
    ? 'max-h-24 w-auto object-contain rounded-lg border border-gray-200 p-1 bg-white inline-block mt-1.5'
    : 'max-h-64 max-w-full object-contain rounded-xl border border-blue-200 p-1.5 bg-white block my-2';

  return (
    <span className="whitespace-pre-wrap leading-relaxed inline-block w-full">
      {parts.map((part, i) => {
        if (part.match(urlRegex)) {
          const isSupabaseStorage = part.includes('supabase.co/storage');
          const isImageExt = Boolean(part.match(/\.(jpeg|jpg|gif|png|webp)(\?.*)?$/i));
          if (isSupabaseStorage ? true : isImageExt) {
            return (
              <img
                key={i}
                src={part}
                alt="ilustrasi gambar"
                className={imageClass}
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.insertAdjacentHTML(
                    'afterend',
                    `<a href="${part}" target="_blank" class="text-blue-500 underline text-xs break-all">${part}</a>`
                  );
                }}
              />
            );
          }
          return (
            <a key={i} href={part} target="_blank" rel="noreferrer" className="text-blue-500 underline break-all">
              {part}
            </a>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

function resolveSelectedAnswer(answer: any): any {
  if (!answer) return null;
  if (typeof answer === 'string') return answer;
  return answer.selectedAnswer ?? answer.answer ?? answer.user_answer ?? answer.selected_answer ?? null;
}

function QuestionCard({ question, answer, displayNumber, forceExpand }: any) {
  const [localExpanded, setLocalExpanded] = useState(false);
  const expanded = forceExpand ? true : localExpanded;

  const qText = question?.question_text ?? question?.soal ?? question?.text ?? `Soal Nomor ${displayNumber}`;
  const rawCategory = question?.category ?? question?.kategori ?? 'TIU';
  const category = String(rawCategory).toUpperCase();
  const correctAns = question?.correct_answer ?? question?.kunci_jawaban ?? question?.kunci ?? '';

  const isTKP = category === 'TKP';
  const selected = resolveSelectedAnswer(answer);

  const isCorrect = !isTKP && selected !== null && String(selected).toUpperCase() === String(correctAns).toUpperCase();
  const isUnanswered = selected === null ? true : selected === undefined;

  const getOptionPoints = (opt: AnswerOption) => {
    const key = `points_${opt.toLowerCase()}`;
    const keyIndo = `poin_${opt.toLowerCase()}`;
    return Number(question?.[key] ?? question?.[keyIndo] ?? 0);
  };

  const userGainedPoints = selected ? getOptionPoints(selected as AnswerOption) : 0;

  const optionTexts: Record<AnswerOption, string> = {
    A: question?.option_a ?? question?.opsi_a ?? question?.option_a_text ?? '',
    B: question?.option_b ?? question?.opsi_b ?? question?.option_b_text ?? '',
    C: question?.option_c ?? question?.opsi_c ?? question?.option_c_text ?? '',
    D: question?.option_d ?? question?.opsi_d ?? question?.option_d_text ?? '',
    E: question?.option_e ?? question?.opsi_e ?? question?.option_e_text ?? '',
  };

  const optionImages: Record<AnswerOption, any> = {
    A: question?.option_a_image ?? question?.option_a_image_url ?? question?.opsi_a_gambar,
    B: question?.option_b_image ?? question?.option_b_image_url ?? question?.opsi_b_gambar,
    C: question?.option_c_image ?? question?.option_c_image_url ?? question?.opsi_c_gambar,
    D: question?.option_d_image ?? question?.option_d_image_url ?? question?.opsi_d_gambar,
    E: question?.option_e_image ?? question?.option_e_image_url ?? question?.opsi_e_gambar,
  };

  const mainImage = question?.image_url ?? question?.gambar ?? question?.gambar_soal;
  const explanationText = question?.explanation ?? question?.pembahasan ?? question?.Pembahasan ?? '';
  const explanationImage = question?.explanation_image ?? question?.explanation_image_url ?? question?.pembahasan_gambar ?? '';
  const subTopicLabel = question?.sub_category ?? question?.sub_kategori ?? question?.SUB_CATEGORY ?? 'Umum';
  const hasExplanation = Boolean(explanationText ? true : explanationImage);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <button
        onClick={() => setLocalExpanded((v) => !v)}
        className="w-full p-4 flex items-start gap-3 text-left hover:bg-gray-50/50 transition-colors"
      >
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
            isUnanswered
              ? 'bg-gray-100'
              : isTKP
                ? userGainedPoints === 5
                  ? 'bg-emerald-500'
                  : 'bg-amber-500'
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
          <div className="text-sm font-medium text-gray-800">
            <span className="text-gray-400 mr-1.5 font-bold">#{displayNumber}</span>
            <div className={`inline ${expanded ? '' : 'line-clamp-2'}`}>
              {renderTextWithImages(qText, false)}
            </div>
          </div>

          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span
              className={`text-xs font-bold px-2.5 py-1 rounded-md uppercase tracking-widest border ${
                category === 'TKP'
                  ? 'bg-amber-100/50 text-amber-700 border-amber-200'
                  : category === 'TWK'
                    ? 'bg-emerald-100/50 text-emerald-700 border-emerald-200'
                    : 'bg-[#1e3a8a]/10 text-[#1e3a8a] border-[#1e3a8a]/20'
              }`}
            >
              {category}
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 border border-gray-200 shadow-sm flex items-center gap-1">
              {subTopicLabel}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-gray-50 text-gray-600 ml-1">
              Jawaban: {selected ? selected : 'Kosong'}
            </span>
            {!isTKP && correctAns && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">
                Kunci: {correctAns}
              </span>
            )}
          </div>
        </div>

        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 border-t border-gray-50 bg-white">
              {mainImage && (
                <div className="rounded-xl overflow-hidden bg-gray-50 border p-4 mt-3 flex justify-center">
                  <img src={mainImage} alt="soal utama" className="max-h-64 object-contain" />
                </div>
              )}

              <div className="mt-3 space-y-2">
                {OPTIONS.map((opt) => {
                  const text = optionTexts[opt];
                  const content = text ? text : (optionImages[opt] ?? '');
                  const isKey = !isTKP && String(opt).toUpperCase() === String(correctAns).toUpperCase();
                  const isChosen = selected !== null && String(selected).toUpperCase() === String(opt).toUpperCase();
                  const optPts = getOptionPoints(opt);

                  return (
                    <div
                      key={opt}
                      className={`p-3 flex items-start gap-3 rounded-xl text-sm border ${
                        isKey
                          ? 'bg-emerald-50 border-emerald-200'
                          : isChosen
                            ? isTKP && optPts >= 4
                              ? 'bg-amber-50 border-amber-200'
                              : 'bg-red-50 border-red-200'
                            : 'bg-gray-50 border-transparent'
                      }`}
                    >
                      <span className="font-bold mt-0.5">{opt}.</span>
                      <div className="flex-1 min-w-0">
                        {renderTextWithImages(content, true)}

                        {isTKP && optPts > 0 && (
                          <div className="mt-2">
                            <span className="text-xs text-amber-700 font-bold bg-amber-100/50 px-2 py-0.5 rounded border border-amber-200/50">
                              {optPts} Poin
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {hasExplanation ? (
                <div className="mt-4 bg-blue-50/70 border border-blue-100 rounded-xl p-4">
                  <p className="text-xs font-bold text-blue-700 mb-3 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4" /> PEMBAHASAN RESMI:
                  </p>

                  {explanationImage && (
                    <img
                      src={explanationImage}
                      alt="Gambar Penjelasan"
                      className="max-h-64 max-w-full object-contain mb-3 rounded-xl border border-blue-100 p-1.5 bg-white block"
                    />
                  )}

                  {explanationText && (
                    <div className="text-sm text-gray-700 w-full">
                      {renderTextWithImages(explanationText, false)}
                    </div>
                  )}
                </div>
              ) : (
                <div className="mt-5 py-4 border border-dashed border-gray-200 rounded-xl bg-gray-50 flex items-center justify-center">
                  <p className="text-xs text-gray-400 font-medium italic flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Belum ada pembahasan untuk soal ini.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function ExamReview({ questions: propQuestions, answers: propAnswers }: any) {
  const { state, dispatch, fetchExamSnapshot } = useApp();
  const navigate = useNavigate();

  const userRole = (state as any)?.profile?.role?.toLowerCase() ?? 'participant';
  const isAdmin = userRole !== 'participant';

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [globalExpand, setGlobalExpand] = useState(false);

  const [fetchedQuestions, setFetchedQuestions] = useState<any[]>([]);
  const [fetchedAnswers, setFetchedAnswers] = useState<any>({});
  const [isFetchingDb, setIsFetchingDb] = useState(false);

  const memoryQuestions = (state as any)?.examSession?.questions ?? (state as any)?.activeQuestions ?? (state as any)?.questions ?? [];
  const memoryAnswers = (state as any)?.examSession?.answers ?? (state as any)?.activeAnswers ?? (state as any)?.answers ?? {};

  useEffect(() => {
    const hasPropQuestions = Boolean(propQuestions && propQuestions.length > 0);
    if (hasPropQuestions ? true : memoryQuestions.length > 0) {
      return;
    }

    async function loadLazySnapshot() {
      setIsFetchingDb(true);
      try {
        const resultId =
          (state as any)?.reviewResultId ??
          (state as any)?.activeReviewId ??
          (state as any)?.activeResultId ??
          (state as any)?.selectedResultId ??
          (state as any)?.reviewId;

        if (!resultId) {
          console.warn('ExamReview: Tidak ada result ID yang ditemukan di state.');
          return;
        }

        const data = await fetchExamSnapshot(resultId);

        if (data && data.review_snapshot) {
          let snapshot = data.review_snapshot;

          if (typeof snapshot === 'string') {
            try {
              snapshot = JSON.parse(snapshot);
              if (typeof snapshot === 'string') {
                snapshot = JSON.parse(snapshot);
              }
            } catch (e) {
              console.error('Gagal parse snapshot JSON di ExamReview:', e);
            }
          }

          if (snapshot && Array.isArray(snapshot.questions)) {
            const safeQuestions = snapshot.questions.map((q: any) => {
              const verifiedSub = q.sub_category ?? q.sub_kategori ?? q.SUB_KATEGORI ?? q.SUB_CATEGORY ?? 'Umum';
              return {
                ...q,
                sub_category: verifiedSub,
                sub_kategori: verifiedSub
              };
            });
            setFetchedQuestions(safeQuestions);
            setFetchedAnswers(snapshot.answers ?? {});
          }
        }
      } catch (err) {
        console.error('ExamReview: Gagal memuat snapshot secara Lazy Load', err);
      } finally {
        setIsFetchingDb(false);
      }
    }

    loadLazySnapshot();
  }, [(state as any)?.reviewResultId, propQuestions?.length, memoryQuestions.length]);

  const rawQuestions = propQuestions && propQuestions.length > 0
    ? propQuestions
    : memoryQuestions.length > 0
      ? memoryQuestions
      : fetchedQuestions;

  const finalAnswers = propQuestions && propQuestions.length > 0
    ? propAnswers
    : memoryQuestions.length > 0
      ? memoryAnswers
      : fetchedAnswers;

  // Simpan nomor asli soal (originalNumber) sebelum difilter agar tidak bergeser
  const numberedQuestions = [...rawQuestions].map((q: any, idx: number) => ({
    ...q,
    originalNumber: idx + 1,
  }));

  const getAnswerForQuestion = (qId: any) => {
    if (!finalAnswers) return undefined;
    if (Array.isArray(finalAnswers)) {
      return finalAnswers.find((ans) => ans?.question_id == qId ? true : ans?.questionId == qId);
    }
    if (typeof finalAnswers === 'object') {
      return finalAnswers[qId] !== undefined
        ? finalAnswers[qId]
        : Object.values(finalAnswers).find((ans: any) => ans?.questionId == qId ? true : ans?.question_id == qId);
    }
    return undefined;
  };

  // Cek apakah soal perlu direview (salah pada TWK/TIU, atau poin <= 3 pada TKP)
  const isQuestionNeedsReview = (q: any, ansObj: any) => {
    const selected = resolveSelectedAnswer(ansObj);
    if (!selected) return false;
    const cat = String(q?.category ?? q?.kategori ?? 'TIU').toUpperCase();
    if (cat === 'TKP') {
      const pts = Number(q?.[`points_${String(selected).toLowerCase()}`] ?? q?.[`poin_${String(selected).toLowerCase()}`] ?? 0);
      return pts <= 3;
    }
    const correctAns = q?.correct_answer ?? q?.kunci_jawaban ?? q?.kunci ?? '';
    return String(selected).toUpperCase() !== String(correctAns).toUpperCase();
  };

  const uniqueSubTopics = new Set(
    numberedQuestions.map((q: any) => String(q?.sub_category ?? q?.sub_kategori ?? 'Umum').trim())
  );
  const showDiagnosticChart = uniqueSubTopics.size > 1;

  const wrongOnlyCount = numberedQuestions.filter((q: any) => isQuestionNeedsReview(q, getAnswerForQuestion(q.id))).length;
  const blankOnlyCount = numberedQuestions.filter((q: any) => !resolveSelectedAnswer(getAnswerForQuestion(q.id))).length;

  const filteredQuestions = numberedQuestions.filter((q: any) => {
    if (!q) return false;
    const qText = String(q.question_text ?? q.soal ?? q.text ?? '');
    const subText = String(q.sub_category ?? q.sub_kategori ?? '');
    const category = String(q.category ?? q.kategori ?? 'TIU').toUpperCase();

    const matchesQuery =
      qText.toLowerCase().includes(searchQuery.toLowerCase())
        ? true
        : subText.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchesQuery) return false;

    if (selectedCategory !== 'ALL' && category !== selectedCategory) return false;

    const ansObj = getAnswerForQuestion(q.id);
    const selected = resolveSelectedAnswer(ansObj);
    if (statusFilter === 'WRONG') return isQuestionNeedsReview(q, ansObj);
    if (statusFilter === 'BLANK') return !selected;
    if (statusFilter === 'CORRECT') return Boolean(selected) && !isQuestionNeedsReview(q, ansObj);

    return true;
  });

  const handleGoBack = () => {
    if ((state as any)?.reviewResultId) {
      dispatch({ type: 'DELETE_EXAM_RESULT', payload: (state as any).reviewResultId });
    }

    if (isAdmin) {
      dispatch({ type: 'SET_VIEW', payload: 'admin-dashboard' });
      navigate('/admin/results', { replace: true });
    } else {
      dispatch({ type: 'SET_VIEW', payload: (state as any)?.examSession ? 'exam-results' : 'participant-dashboard' });
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-2 py-4">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={handleGoBack}
            className="p-2 hover:bg-gray-100 rounded-xl border transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-bold text-gray-800">Pembahasan & Review Ujian</h1>
            <p className="text-xs text-gray-500">
              {isAdmin ? 'Mode Tinjauan Admin' : 'Lembar Evaluasi Pribadi'} • Menampilkan {filteredQuestions.length} dari {numberedQuestions.length} soal
            </p>
          </div>
        </div>
        {numberedQuestions.length > 0 && (
          <button
            onClick={() => setGlobalExpand(!globalExpand)}
            className="text-xs font-semibold bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-xl text-gray-700 transition-colors"
          >
            {globalExpand ? 'Tutup Semua' : 'Buka Semua'}
          </button>
        )}
      </div>

      {/* Bar Pencarian & Filter */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari kata kunci soal atau sub-materi..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center text-xs">
          {['ALL', 'TWK', 'TIU', 'TKP'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 rounded-full font-semibold transition-colors ${
                selectedCategory === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat === 'ALL' ? 'Semua Bidang' : cat}
            </button>
          ))}
        </div>

        {/* Filter Status Jawaban (Memudahkan Peserta Bedah Nomor Salah) */}
        <div className="flex flex-wrap gap-2 items-center text-xs pt-2 border-t border-gray-100">
          {[
            { key: 'ALL', label: 'Semua Status' },
            { key: 'WRONG', label: `Perlu Dibahas (${wrongOnlyCount})` },
            { key: 'BLANK', label: `Kosong (${blankOnlyCount})` },
            { key: 'CORRECT', label: 'Sudah Tepat' },
          ].map((st) => (
            <button
              key={st.key}
              onClick={() => setStatusFilter(st.key)}
              className={`px-3 py-1 rounded-full font-semibold transition-colors ${
                statusFilter === st.key
                  ? st.key === 'WRONG'
                    ? 'bg-rose-600 text-white'
                    : 'bg-purple-600 text-white'
                  : 'bg-gray-50 text-gray-600 border border-gray-200 hover:bg-gray-100'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Peta Kekuatan & Kelemahan (Tampil jika multi sub-materi) */}
      {!isFetchingDb && numberedQuestions.length > 0 && showDiagnosticChart && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="clear-both"
        >
          <DiagnosticReport questions={numberedQuestions} answers={finalAnswers} />
        </motion.div>
      )}

      {/* Daftar Soal */}
      <div className="space-y-4">
        {isFetchingDb ? (
          <div className="text-center py-12 bg-white rounded-2xl border flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-xs text-gray-500 font-medium animate-pulse">Menarik lembar jawaban peserta dari database...</p>
          </div>
        ) : filteredQuestions.length > 0 ? (
          filteredQuestions.map((q: any, idx: number) => (
            <QuestionCard
              key={q.id ?? idx}
              question={q}
              answer={getAnswerForQuestion(q.id)}
              displayNumber={q.originalNumber}
              forceExpand={globalExpand}
            />
          ))
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200 p-6 flex flex-col items-center justify-center gap-2">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
            <h3 className="text-sm font-bold text-gray-700">Tidak Ada Soal yang Cocok</h3>
            <p className="text-xs text-gray-400 max-w-sm leading-relaxed">
              {numberedQuestions.length === 0
                ? 'Sistem tidak dapat menampilkan detail. Pastikan kolom "review_snapshot" tersedia di Supabase.'
                : 'Tidak ada butir soal yang sesuai dengan filter status atau kata kunci pencarian saat ini.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ExamReview;
