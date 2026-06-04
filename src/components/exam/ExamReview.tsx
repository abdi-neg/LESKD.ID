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
  ArrowLeft // 🔑 KUNCI PERBAIKAN 1: Mengembalikan icon tombol kembali
} from 'lucide-react';
import { useApp } from '../context/AppContext'; // 🔑 KUNCI PERBAIKAN 2: Hubungkan ke state global untuk navigasi back

// Tipe data & konstanta pendukung opsi jawaban
type AnswerOption = 'A' | 'B' | 'C' | 'D' | 'E';
const OPTIONS: AnswerOption[] = ['A', 'B', 'C', 'D', 'E'];

// Detektor Gambar Otomatis
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
}: {
  question: any;
  answer: any | undefined;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const selected = answer?.selectedAnswer ?? null;
  const isTKP = question.category === 'TKP';
  
  const isCorrect = !isTKP && selected !== null && selected === question.correct_answer;
  const isUnanswered = selected === null;

  const getOptionPoints = (opt: AnswerOption) => {
    const key = `points_${opt.toLowerCase()}` as keyof typeof question;
    return (question[key] as number) ?? 0;
  };

  const userGainedPoints = selected ? getOptionPoints(selected as AnswerOption) : 0;

  const optionImages: Record<AnswerOption, string | undefined> = {
    A: question.option_a_image || question.option_a_image_url,
    B: question.option_b_image || question.option_b_image_url,
    C: question.option_c_image || question.option_c_image_url,
    D: question.option_d_image || question.option_d_image_url,
    E: question.option_e_image || question.option_e_image_url,
  };

  const explanationImage = question.explanation_image || question.explanation_image_url;
  const optionType = question.option_type?.toLowerCase();

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
              <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-gray-100 text-gray-500">
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
                <div className="rounded-xl overflow-hidden bg-gray-50 border max-w-full flex justify-center p-4 mt-3">
                  <img
                    src={question.image_url}
                    alt="soal"
                    className="max-h-64 object-contain"
                  />
                </div>
              )}
              
              {optionType === 'image' ? (
                <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {OPTIONS.map((opt) => {
                    const imgUrl = (question[`option_${opt.toLowerCase()}` as keyof typeof question] as string) || optionImages[opt];
                    const pts = getOptionPoints(opt);
                    
                    const isKey = !isTKP && opt === question.correct_answer;
                    const isChosen = selected === opt;
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
                          ${isTKP
                            ? isChosen ? 'bg-amber-500 text-white' : 'bg-white/90 text-gray-500 border border-gray-200'
                            : isKey ? 'bg-emerald-500 text-white'
                            : isWrongChoice ? 'bg-red-500 text-white'
                            : 'bg-white/90 text-gray-500 border border-gray-200'}`}>
                          {opt}
                        </div>

                        {isTKP && (
                          <div className={`absolute top-1.5 right-1.5 z-10 px-1.5 py-0.5 rounded-md text-[10px] font-bold shadow-sm
                            ${pts === 5 ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'}`}>
                            {pts} Pts
                          </div>
                        )}

                        {!isTKP && isKey && <CheckCircle className="absolute top-1.5 right-1.5 z-10 w-4 h-4 text-emerald-500 drop-shadow" />}
                        {!isTKP && isWrongChoice && <XCircle className="absolute top-1.5 right-1.5 z-10 w-4 h-4 text-red-400 drop-shadow" />}
                        
                        {imgUrl && (
                          <img
                            src={imgUrl}
                            alt={`Opsi ${opt}`}
                            className="w-full aspect-square object-contain bg-white p-2"
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="mt-3 space-y-2">
                  {OPTIONS.map((opt) => {
                    const text = question[`option_${opt.toLowerCase()}` as keyof typeof question] as string;
                    const pts = getOptionPoints(opt);
                    
                    const isKey = !isTKP && opt === question.correct_answer;
                    const isChosen = selected === opt;
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
                      <div key={opt} className={`flex items-start gap-2.5 p-2.5 rounded-xl text-sm transition-colors ${bgClass}`}>
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0
                          ${isTKP
                            ? isChosen ? 'bg-amber-500 text-white' : 'bg-white border border-gray-200 text-gray-500'
                            : isKey ? 'bg-emerald-500 text-white'
                            : isWrongChoice ? 'bg-red-500 text-white'
                            : 'bg-white border border-gray-200 text-gray-500'}`}>
                          {opt}
                        </div>

                        <div className="flex-1 flex flex-col gap-1.5">
                          {isTextAnImage ? (
                            <div className="rounded-xl overflow-hidden bg-white border border-gray-100 max-w-full sm:max-w-md flex justify-start p-2 shadow-sm">
                              <img 
                                src={text} 
                                alt={`Gambar Opsi ${opt}`} 
                                className="max-h-36 object-contain rounded-lg"
                              />
                            </div>
                          ) : (
                            <span className={`leading-relaxed
                              ${isTKP
                                ? isChosen ? 'text-amber-900 font-medium' : 'text-gray-600'
                                : isKey ? 'text-emerald-800 font-medium'
                                : isWrongChoice ? 'text-red-700'
                                : 'text-gray-600'}`}>
                              {text || <span className="text-gray-400 italic">(Opsi Kosong)</span>}
                            </span>
                          )}

                          {optionImages[opt] && !isTextAnImage && (
                            <div className="rounded-lg overflow-hidden bg-white border max-w-full sm:max-w-md flex justify-start p-1.5 mt-0.5">
                              <img 
                                src={optionImages[opt]} 
                                alt={`Gambar Opsi Pendukung ${opt}`} 
                                className="max-h-32 object-contain rounded"
                              />
                            </div>
                          )}
                        </div>

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
                          <div className="flex-shrink-0 ml-auto mt-0.5">
                            {isKey && <CheckCircle className="w-4 h-4 text-emerald-500" />}
                            {isWrongChoice && <XCircle className="w-4 h-4 text-red-400" />}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {(question.explanation || explanationImage) ? (
                <div className="mt-4 bg-[#1e3a8a]/5 border border-[#1e3a8a]/10 rounded-xl p-3.5">
                  <div className="flex items-center gap-1.5 mb-2">
                    <BookOpen className="w-4 h-4 text-[#1e3a8a]" />
                    <p className="text-xs font-bold text-[#1e3a8a]">Pembahasan</p>
                  </div>
                  
                  {explanationImage && (
                    <div className="mb-3 rounded-xl overflow-hidden bg-white border max-w-full flex justify-center p-3 shadow-sm">
                      <img 
                        src={explanationImage} 
                        alt="Ilustrasi Pembahasan" 
                        className="max-h-64 object-contain" 
                      />
                    </div>
                  )}

                  {question.explanation && (
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {question.explanation}
                    </p>
                  )}
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

// ==========================================
// MAIN COMPONENT: ExamReview (Default Export)
// ==========================================
interface ExamReviewProps {
  questions?: any[];
  answers?: any | any[];
  isLoading?: boolean;
  onBack?: () => void;
}

export default function ExamReview({ questions = [], answers = [], isLoading = false, onBack }: ExamReviewProps) {
  const { state, dispatch } = useApp(); // Integrasi hook global
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'TIU' | 'TWK' | 'TKP'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'CORRECT' | 'WRONG' | 'UNANSWERED'>('ALL');

  // 🔑 KUNCI PERBAIKAN 3: Handler Jawaban Multi-Format (Aman membaca Array maupun Object Record)
  const getAnswerForQuestion = (qId: string | number) => {
    if (!answers) return undefined;
    
    if (Array.isArray(answers)) {
      return answers.find((ans) => ans?.question_id === qId || ans?.questionId === qId || ans?.id === qId);
    }
    
    if (typeof answers === 'object') {
      if (answers[qId]) return answers[qId];
      const values = Object.values(answers);
      return values.find((ans: any) => ans?.questionId === qId || ans?.question_id === qId);
    }
    
    return undefined;
  };

  // 🔑 KUNCI PERBAIKAN 4: Logika Fungsi Navigasi Tombol Kembali Dinamis
  const handleBack = () => {
    if (onBack) {
      onBack();
      return;
    }
    try {
      if (state?.examSession) {
        dispatch({ type: 'SET_VIEW', payload: 'exam-results' });
      } else {
        const isAdmin = state?.profile?.role === 'admin' || state?.profile?.role === 'super_admin';
        dispatch({ type: 'SET_VIEW', payload: isAdmin ? 'admin-dashboard' : 'participant-dashboard' });
      }
    } catch (e) {
      console.error("Gagal menavigasi kembali:", e);
    }
  };

  // Logika Filter & Pencarian Soal
  const filteredQuestions = questions.filter((q) => {
    const matchesSearch = q.question_text?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'ALL' || q.category === selectedCategory;

    const ans = getAnswerForQuestion(q.id);
    const selected = ans?.selectedAnswer ?? null;
    const isTKP = q.category === 'TKP';
    
    const isCorrect = !isTKP && selected !== null && selected === q.correct_answer;
    const isUnanswered = selected === null;
    const isWrong = !isTKP && selected !== null && selected !== q.correct_answer;

    let matchesStatus = true;
    if (selectedStatus === 'CORRECT') {
      const tkpPoints = selected ? (Number(q[`points_${selected.toLowerCase()}` as keyof typeof q] ?? 0)) : 0;
      matchesStatus = isCorrect || (isTKP && ((ans?.points > 0) || (ans?.userGainedPoints > 0) || tkpPoints > 0)); 
    } else if (selectedStatus === 'WRONG') {
      matchesStatus = isWrong;
    } else if (selectedStatus === 'UNANSWERED') {
      matchesStatus = isUnanswered;
    }

    return matchesSearch && matchesCategory && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-gray-500">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mb-2" />
        <p className="text-sm font-medium">Memuat data review ujian...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 🔑 KUNCI PERBAIKAN 5: Render UI Blok Header & Tombol Back Baru */}
      <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <button
          onClick={handleBack}
          className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-600 flex items-center justify-center border border-gray-100"
          title="Kembali"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base font-bold text-gray-800">Pembahasan & Review Ujian</h1>
          <p className="text-xs text-gray-500">Evaluasi lembar kerja Anda dan pelajari solusi jawaban</p>
        </div>
      </div>

      {/* Search & Filter Panel */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Cari teks pertanyaan..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center text-xs">
          <div className="flex items-center gap-1 text-gray-500 font-medium mr-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Filter:</span>
          </div>
          
          {/* Tabs Materi */}
          {['ALL', 'TWK', 'TIU', 'TKP'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat as any)}
              className={`px-3 py-1 rounded-full font-semibold transition-colors ${
                selectedCategory === cat
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat === 'ALL' ? 'Semua Materi' : cat}
            </button>
          ))}

          <div className="h-4 w-[1px] bg-gray-200 mx-1 hidden sm:block" />

          {/* Tabs Status Jawaban */}
          {[
            { id: 'ALL', label: 'Semua Status' },
            { id: 'CORRECT', label: 'Benar' },
            { id: 'WRONG', label: 'Salah' },
            { id: 'UNANSWERED', label: 'Tidak Dijawab' },
          ].map((stat) => (
            <button
              key={stat.id}
              onClick={() => setSelectedStatus(stat.id as any)}
              className={`px-3 py-1 rounded-md font-medium transition-colors ${
                selectedStatus === stat.id
                  ? 'bg-gray-800 text-white'
                  : 'bg-gray-50 text-gray-500 border border-gray-200 hover:bg-gray-100'
              }`}
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
            />
          ))
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 p-6">
            <p className="text-sm text-gray-400 italic">Tidak ada soal yang cocok dengan kriteria pencarian.</p>
          </div>
        )}
      </div>
    </div>
  );
}
