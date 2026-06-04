import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Target, 
  CheckCircle, 
  XCircle, 
  ChevronUp, 
  ChevronDown, 
  BookOpen,
  Search,
  Filter,
  RefreshCw,
  ArrowLeft,
  Eye,
  EyeOff
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

type AnswerOption = 'A' | 'B' | 'C' | 'D' | 'E';
const OPTIONS: AnswerOption[] = ['A', 'B', 'C', 'D', 'E'];

const checkIsImageUrl = (text: any) => {
  if (!text || typeof text !== 'string') return false;
  const str = text.trim().toLowerCase();
  return (
    str.includes('http://') || 
    str.includes('https://') || 
    str.includes('supabase.co/storage') ||
    str.includes('/storage/') ||
    /\.(jpeg|jpg|gif|png|webp|svg|avif)/i.test(str)
  );
};

// ==========================================
// COMPONENT: QuestionCard (Item Kartu Soal)
// ==========================================
function QuestionCard({
  question,
  answer,
  index,
  forceExpand
}: {
  question: any;
  answer: any | undefined;
  index: number;
  forceExpand: boolean;
}) {
  const [localExpanded, setLocalExpanded] = useState(false);
  const expanded = forceExpand || localExpanded;

  // 🛡️ NORMALISASI DATA SOAL (Mengatasi perbedaan kolom Inggris / Indonesia)
  const qText = question?.question_text || question?.soal || question?.text || `Soal Nomor ${index + 1}`;
  const category = question?.category || question?.kategori || 'TIU';
  const correctAns = question?.correct_answer || question?.kunci_jawaban || question?.kunci || '';
  const explanation = question?.explanation || question?.pembahasan || '';
  const isTKP = category === 'TKP';

  // 🛡️ NORMALISASI DATA JAWABAN USER (Mengatasi format String vs Object)
  const selected = typeof answer === 'string' 
    ? answer 
    : (answer?.selectedAnswer || answer?.answer || answer?.user_answer || answer?.selected_answer || null);

  const isCorrect = !isTKP && selected !== null && String(selected).toUpperCase() === String(correctAns).toUpperCase();
  const isUnanswered = selected === null || selected === undefined;

  const getOptionPoints = (opt: AnswerOption) => {
    const key = `points_${opt.toLowerCase()}` as keyof typeof question;
    const keyIndo = `poin_${opt.toLowerCase()}` as keyof typeof question;
    return (question[key] as number) ?? (question[keyIndo] as number) ?? 0;
  };

  const userGainedPoints = selected ? getOptionPoints(selected as AnswerOption) : 0;

  // Normalisasi Opsi Teks/Gambar
  const optA = question?.option_a || question?.opsi_a || question?.option_a_text || '';
  const optB = question?.option_b || question?.opsi_b || question?.option_b_text || '';
  const optC = question?.option_c || question?.opsi_c || question?.option_c_text || '';
  const optD = question?.option_d || question?.opsi_d || question?.option_d_text || '';
  const optE = question?.option_e || question?.opsi_e || question?.option_e_text || '';

  const optionTexts: Record<AnswerOption, string> = { A: optA, B: optB, C: optC, D: optD, E: optE };

  const optionImages: Record<AnswerOption, string | undefined> = {
    A: question?.option_a_image || question?.option_a_image_url || question?.opsi_a_gambar,
    B: question?.option_b_image || question?.option_b_image_url || question?.opsi_b_gambar,
    C: question?.option_c_image || question?.option_c_image_url || question?.opsi_c_gambar,
    D: question?.option_d_image || question?.option_d_image_url || question?.opsi_d_gambar,
    E: question?.option_e_image || question?.option_e_image_url || question?.opsi_e_gambar,
  };

  const mainImage = question?.image_url || question?.gambar || question?.gambar_soal;
  const explanationImage = question?.explanation_image || question?.explanation_image_url || question?.pembahasan_gambar;
  const optionType = (question?.option_type || question?.tipe_opsi || 'text').toLowerCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
    >
      <button
        onClick={() => setLocalExpanded((v) => !v)}
        className="w-full p-4 flex items-start gap-3 text-left hover:bg-gray-50/50 transition-colors"
      >
        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5
          ${isUnanswered 
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
          <p className={`text-sm font-medium text-gray-800 whitespace-pre-wrap ${expanded ? '' : 'line-clamp-2'}`}>
            <span className="text-gray-400 mr-1">#{index + 1}</span>
            {qText}
          </p>
          {mainImage && !expanded && (
            <img src={mainImage} alt="soal" className="mt-1.5 max-h-16 rounded-lg border border-gray-100 object-contain" />
          )}
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold
              ${category === 'TIU' ? 'bg-blue-100 text-blue-700'
                : category === 'TWK' ? 'bg-emerald-100 text-emerald-700'
                : 'bg-rose-100 text-rose-700'}`}>
              {category}
            </span>
            
            {!isUnanswered ? (
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-md
                ${isTKP ? 'bg-amber-100 text-amber-800' : isCorrect ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'}`}>
                Jawaban Anda: {selected} {isTKP && `(${userGainedPoints} Poin)`}
              </span>
            ) : (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-gray-500">
                Tidak dijawab
              </span>
            )}

            {!isTKP && correctAns && (
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100">
                Kunci: {correctAns}
              </span>
            )}
          </div>
        </div>

        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 mt-1" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 border-t border-gray-50">
              {mainImage && (
                <div className="rounded-xl overflow-hidden bg-gray-50 border max-w-full flex justify-center p-4 mt-3">
                  <img src={mainImage} alt="soal" className="max-h-64 object-contain" />
                </div>
              )}
              
              {optionType === 'image' ? (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {OPTIONS.map((opt) => {
                    const imgUrl = optionTexts[opt] || optionImages[opt];
                    const pts = getOptionPoints(opt);
                    const isKey = !isTKP && String(opt).toUpperCase() === String(correctAns).toUpperCase();
                    const isChosen = String(selected).toUpperCase() === String(opt).toUpperCase();
                    const isWrongChoice = !isTKP && isChosen && !isKey;

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
                        <div className={`absolute top-1.5 left-1.5 z-10 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow
                          ${isTKP ? (isChosen ? 'bg-amber-500 text-white' : 'bg-white/90 text-gray-500') : isKey ? 'bg-emerald-500 text-white' : isWrongChoice ? 'bg-red-500 text-white' : 'bg-white/90 text-gray-500'}`}>
                          {opt}
                        </div>
                        {isTKP && <div className={`absolute top-1.5 right-1.5 z-10 px-1.5 py-0.5 rounded-md text-[10px] font-bold shadow-sm ${pts === 5 ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'}`}>{pts} Pts</div>}
                        {imgUrl && <img src={imgUrl} alt={`Opsi ${opt}`} className="w-full aspect-square object-contain bg-white p-2" />}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {OPTIONS.map((opt) => {
                    const text = optionTexts[opt];
                    const pts = getOptionPoints(opt);
                    const isKey = !isTKP && String(opt).toUpperCase() === String(correctAns).toUpperCase();
                    const isChosen = String(selected).toUpperCase() === String(opt).toUpperCase();
                    const isWrongChoice = !isTKP && isChosen && !isKey;
                    const isTextAnImage = checkIsImageUrl(text);

                    let bgClass = 'bg-gray-50 border border-transparent';
                    if (isTKP) {
                      if (isChosen) bgClass = 'bg-amber-50/70 border border-amber-300';
                      else if (pts === 5) bgClass = 'bg-emerald-50/30 border border-dashed border-emerald-200';
                    } else {
                      if (isKey) bgClass = 'bg-emerald-50 border border-emerald-200';
                      if (isWrongChoice) bgClass = 'bg-red-50 border border-red-200';
                    }

                    return (
                      <div key={opt} className={`flex items-start gap-2.5 p-2.5 rounded-xl text-sm ${bgClass}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                          ${isTKP ? (isChosen ? 'bg-amber-500 text-white' : 'bg-white border text-gray-500') : isKey ? 'bg-emerald-500 text-white' : isWrongChoice ? 'bg-red-500 text-white' : 'bg-white border text-gray-500'}`}>
                          {opt}
                        </div>
                        <div className="flex-1 flex flex-col gap-1.5">
                          {isTextAnImage ? (
                            <div className="rounded-xl overflow-hidden bg-white border p-2 shadow-sm max-w-full sm:max-w-md">
                              <img src={text} alt={`Opsi ${opt}`} className="max-h-36 object-contain" />
                            </div>
                          ) : (
                            <span className={isKey ? 'text-emerald-800 font-medium' : isWrongChoice ? 'text-red-700' : 'text-gray-600'}>{text || <span className="text-gray-400 italic">(Kosong)</span>}</span>
                          )}
                        </div>
                        {isTKP && <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${pts === 5 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{pts} Poin</span>}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* BLOK PEMBAHASAN UTAMA */}
              {(explanation || explanationImage) ? (
                <div className="mt-4 bg-blue-50/50 border border-blue-100 rounded-xl p-3.5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <BookOpen className="w-4 h-4 text-blue-700" />
                    <p className="text-xs font-bold text-blue-700">Pembahasan Resmi</p>
                  </div>
                  {explanationImage && (
                    <div className="mb-3 rounded-xl overflow-hidden bg-white border p-3 flex justify-center shadow-sm">
                      <img src={explanationImage} alt="Ilustrasi Pembahasan" className="max-h-64 object-contain" />
                    </div>
                  )}
                  {explanation && <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{explanation}</p>}
                </div>
              ) : (
                <div className="mt-4 bg-gray-50 border border-gray-100 rounded-xl p-3 text-xs text-gray-400 text-center italic">
                  Belum ada berkas deskripsi pembahasan untuk soal ini.
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ==========================================
// MAIN COMPONENT
// ==========================================
interface ExamReviewProps {
  questions?: any[];
  answers?: any | any[];
  isLoading?: boolean;
  onBack?: () => void;
}

export default function ExamReview({ questions: propQuestions, answers: propAnswers, isLoading = false, onBack }: ExamReviewProps) {
  const { state, dispatch } = useApp();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'TIU' | 'TWK' | 'TKP'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'CORRECT' | 'WRONG' | 'UNANSWERED'>('ALL');
  const [globalExpand, setGlobalExpand] = useState(false);

  // 🛡️ AUTO-FALLBACK: Ambil data cadangan dari global state jika prop dikirim kosong oleh parent
  const questions = (propQuestions && propQuestions.length > 0) 
    ? propQuestions 
    : (state?.activeQuestions || state?.currentQuestions || state?.questions || []);

  const answers = (propAnswers && (Array.isArray(propAnswers) ? propAnswers.length > 0 : Object.keys(propAnswers).length > 0))
    ? propAnswers
    : (state?.activeAnswers || state?.currentAnswers || state?.answers || {});

  const getAnswerForQuestion = (qId: string | number) => {
    if (!answers) return undefined;
    if (Array.isArray(answers)) {
      return answers.find((ans) => ans?.question_id == qId || ans?.questionId == qId || ans?.id == qId || ans?.soal_id == qId);
    }
    if (typeof answers === 'object') {
      if (answers[qId] !== undefined) return answers[qId];
      return Object.values(answers).find((ans: any) => ans?.questionId == qId || ans?.question_id == qId || ans?.soal_id == qId);
    }
    return undefined;
  };

  const handleBack = () => {
    if (onBack) return onBack();
    const targetView = state?.examSession ? 'exam-results' : (state?.profile?.role === 'admin' || state?.profile?.role === 'super_admin' ? 'admin-dashboard' : 'participant-dashboard');
    dispatch({ type: 'SET_VIEW', payload: targetView });
  };

  const filteredQuestions = questions.filter((q) => {
    const qText = q.question_text || q.soal || q.text || '';
    const category = q.category || q.kategori || 'TIU';
    const correctAns = q.correct_answer || q.kunci_jawaban || q.kunci || '';

    const matchesSearch = qText.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || category === selectedCategory;

    const ans = getAnswerForQuestion(q.id);
    const selected = typeof ans === 'string' ? ans : (ans?.selectedAnswer || ans?.answer || ans?.user_answer || null);
    const isTKP = category === 'TKP';
    
    const isCorrect = !isTKP && selected !== null && String(selected).toUpperCase() === String(correctAns).toUpperCase();
    const isUnanswered = selected === null;
    const isWrong = !isTKP && selected !== null && String(selected).toUpperCase() !== String(correctAns).toUpperCase();

    if (selectedStatus === 'CORRECT') return matchesSearch && matchesCategory && (isCorrect || (isTKP && selected !== null));
    if (selectedStatus === 'WRONG') return matchesSearch && matchesCategory && isWrong;
    if (selectedStatus === 'UNANSWERED') return matchesSearch && matchesCategory && isUnanswered;
    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-gray-500">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-2" />
        <p className="text-sm font-medium">Sinkronisasi data review...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <button onClick={handleBack} className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-600 border border-gray-100">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-bold text-gray-800">Pembahasan & Review</h1>
            <p className="text-xs text-gray-500">Jumlah Soal: {questions.length} terdeteksi</p>
          </div>
        </div>
        
        {/* Tombol Expand All */}
        <button 
          onClick={() => setGlobalExpand(!globalExpand)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors ml-auto"
        >
          {globalExpand ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {globalExpand ? 'Tutup Semua' : 'Buka Semua Pembahasan'}
        </button>
      </div>

      {/* Filter Panel */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari kata kunci dalam soal..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center text-xs">
          {['ALL', 'TWK', 'TIU', 'TKP'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat as any)}
              className={`px-3 py-1 rounded-full font-semibold ${selectedCategory === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}
            >
              {cat === 'ALL' ? 'Semua Bidang' : cat}
            </button>
          ))}
          <div className="h-4 w-[1px] bg-gray-200 mx-1" />
          {[
            { id: 'ALL', label: 'Semua Hasil' },
            { id: 'CORRECT', label: 'Benar / Terisi' },
            { id: 'WRONG', label: 'Salah' },
            { id: 'UNANSWERED', label: 'Kosong' },
          ].map((stat) => (
            <button
              key={stat.id}
              onClick={() => setSelectedStatus(stat.id as any)}
              className={`px-3 py-1 rounded-md font-medium ${selectedStatus === stat.id ? 'bg-gray-800 text-white' : 'bg-gray-50 text-gray-400 border'}`}
            >
              {stat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Daftar Soal */}
      <div className="space-y-4">
        {filteredQuestions.length > 0 ? (
          filteredQuestions.map((q, idx) => (
            <QuestionCard
              key={q.id || idx}
              question={q}
              answer={getAnswerForQuestion(q.id)}
              index={idx}
              forceExpand={globalExpand}
            />
          ))
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 p-6 text-gray-400 italic text-sm">
            Tidak ada lembar pembahasan yang cocok dengan filter atau data Anda masih kosong.
          </div>
        )}
      </div>
    </div>
  );
}
