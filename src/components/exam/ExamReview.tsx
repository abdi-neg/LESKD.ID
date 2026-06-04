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
  EyeOff,
  AlertTriangle
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
// COMPONENT: QuestionCard
// ==========================================
function QuestionCard({ question, answer, index, forceExpand }: any) {
  const [localExpanded, setLocalExpanded] = useState(false);
  const expanded = forceExpand || localExpanded;

  const qText = question?.question_text || question?.soal || question?.text || `Soal Nomor ${index + 1}`;
  const category = question?.category || question?.kategori || 'TIU';
  const correctAns = question?.correct_answer || question?.kunci_jawaban || question?.kunci || '';
  const explanation = question?.explanation || question?.pembahasan || '';
  const isTKP = category === 'TKP';

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
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <button onClick={() => setLocalExpanded((v) => !v)} className="w-full p-4 flex items-start gap-3 text-left hover:bg-gray-50/50 transition-colors">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5
          ${isUnanswered ? 'bg-gray-100' : isTKP ? (userGainedPoints === 5 ? 'bg-emerald-500' : 'bg-amber-500') : isCorrect ? 'bg-emerald-500' : 'bg-red-500'}`}
        >
          {isUnanswered ? <Target className="w-3.5 h-3.5 text-gray-400" /> : isTKP ? <span className="text-[10px] font-extrabold text-white">+{userGainedPoints}</span> : isCorrect ? <CheckCircle className="w-3.5 h-3.5 text-white" /> : <XCircle className="w-3.5 h-3.5 text-white" />}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-medium text-gray-800 whitespace-pre-wrap ${expanded ? '' : 'line-clamp-2'}`}><span className="text-gray-400 mr-1">#{index + 1}</span>{qText}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-gray-100 text-gray-700">{category}</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-gray-50 text-gray-600">Jawaban: {selected || 'Kosong'}</span>
            {!isTKP && correctAns && <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">Kunci: {correctAns}</span>}
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <div className="px-4 pb-4 border-t border-gray-50 bg-white">
            {mainImage && <div className="rounded-xl overflow-hidden bg-gray-50 border p-4 mt-3 flex justify-center"><img src={mainImage} alt="soal" className="max-h-64 object-contain" /></div>}
            <div className="mt-3 space-y-2">
              {OPTIONS.map((opt) => {
                const text = optionTexts[opt];
                const isKey = !isTKP && String(opt).toUpperCase() === String(correctAns).toUpperCase();
                const isChosen = String(selected).toUpperCase() === String(opt).toUpperCase();
                return (
                  <div key={opt} className={`p-2.5 rounded-xl text-sm border ${isKey ? 'bg-emerald-50 border-emerald-200' : isChosen ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-transparent'}`}>
                    <span className="font-bold mr-2">{opt}.</span> {text || optionImages[opt] || '(Kosong)'}
                  </div>
                );
              })}
            </div>
            {(explanation || explanationImage) ? (
              <div className="mt-4 bg-blue-50/70 border border-blue-100 rounded-xl p-3.5">
                <p className="text-xs font-bold text-blue-700 mb-1">Pembahasan Resmi:</p>
                {explanationImage && <img src={explanationImage} alt="pembahasan" className="max-h-48 object-contain mb-2" />}
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{explanation}</p>
              </div>
            ) : <div className="mt-4 text-xs text-gray-400 italic text-center">Belum ada pembahasan teks.</div>}
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ==========================================
// MAIN COMPONENT
// ==========================================
export default function ExamReview({ questions: propQuestions, answers: propAnswers, isLoading = false, onBack }: any) {
  const contextData = useApp();
  const state = contextData?.state || {};
  const dispatch = contextData?.dispatch;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'TIU' | 'TWK' | 'TKP'>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<'ALL' | 'CORRECT' | 'WRONG' | 'UNANSWERED'>('ALL');
  const [globalExpand, setGlobalExpand] = useState(false);

  // Cari data soal di berbagai macam kemungkinan tempat penulisan
  const questions = (propQuestions && propQuestions.length > 0) 
    ? propQuestions 
    : (state?.activeQuestions || state?.currentQuestions || state?.questions || state?.examQuestions || state?.historyQuestions || []);

  const answers = (propAnswers && (Array.isArray(propAnswers) ? propAnswers.length > 0 : Object.keys(propAnswers).length > 0))
    ? propAnswers
    : (state?.activeAnswers || state?.currentAnswers || state?.answers || state?.userAnswers || {});

  const getAnswerForQuestion = (qId: string | number) => {
    if (!answers) return undefined;
    if (Array.isArray(answers)) return answers.find((ans) => ans?.question_id == qId || ans?.questionId == qId || ans?.soal_id == qId);
    if (typeof answers === 'object') return answers[qId] !== undefined ? answers[qId] : Object.values(answers).find((ans: any) => ans?.questionId == qId || ans?.question_id == qId);
    return undefined;
  };

  const filteredQuestions = questions.filter((q: any) => {
    const qText = q.question_text || q.soal || q.text || '';
    const category = q.category || q.kategori || 'TIU';
    if (!qText.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (selectedCategory !== 'ALL' && category !== selectedCategory) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => dispatch({ type: 'SET_VIEW', payload: state?.examSession ? 'exam-results' : 'participant-dashboard' })} className="p-2 hover:bg-gray-100 rounded-xl border">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-bold text-gray-800">Pembahasan & Review</h1>
            <p className="text-xs text-gray-500">Jumlah data: {questions.length} soal ditemukan</p>
          </div>
        </div>
        {questions.length > 0 && (
          <button onClick={() => setGlobalExpand(!globalExpand)} className="text-xs font-semibold bg-gray-100 px-3 py-1.5 rounded-xl text-gray-700">
            {globalExpand ? 'Tutup Semua' : 'Buka Semua'}
          </button>
        )}
      </div>

      {/* Jika Data Masih Kosong, Munculkan Panel Detektif Data */}
      {questions.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-bold text-amber-900">🕵️‍♂️ Mode Analisis Sistem: Data Tidak Terkirim</h3>
              <p className="text-xs text-amber-700 mt-1">
                Komponen <code className="bg-amber-100 px-1 py-0.5 rounded text-amber-900">ExamReview</code> berhasil dimuat, tetapi ia menerima array kosong. Di bawah ini adalah isi struktur kunci (*state keys*) global yang terdeteksi di aplikasi Anda saat ini:
              </p>
            </div>
          </div>

          <div className="bg-gray-900 text-emerald-400 p-4 rounded-xl text-[11px] font-mono overflow-x-auto space-y-2">
            <div>// PROPS YANG DITERIMA:</div>
            <div>propQuestions: {propQuestions ? `Ada (${propQuestions.length} item)` : 'undefined / Kosong'}</div>
            <div>propAnswers: {propAnswers ? 'Ada data' : 'undefined / Kosong'}</div>
            
            <div className="mt-3 border-t border-gray-700 pt-2">// ISI GLOBAL STATE SEKARANG (Object Keys):</div>
            <div className="text-white whitespace-pre-wrap">
              {JSON.stringify(Object.keys(state), null, 2)}
            </div>

            <div className="mt-3 border-t border-gray-700 pt-2">// CHECK DATA TRYOUT AKTIF:</div>
            <div>state.examSession: {state?.examSession ? 'Tersedia ✅' : 'Kosong ❌'}</div>
            <div>state.currentExam: {state?.currentExam ? 'Tersedia ✅' : 'Kosong ❌'}</div>
          </div>
          
          <p className="text-xs text-amber-800 italic">
            👉 **Tolong salin atau beri tahu saya teks berwarna hijau/putih di dalam kotak hitam di atas**, agar saya bisa tahu persis nama variabel penampung data soal di aplikasi Anda!
          </p>
        </div>
      )}

      {/* Daftar Soal */}
      {questions.length > 0 && (
        <div className="space-y-4">
          {filteredQuestions.map((q: any, idx: number) => (
            <QuestionCard key={q.id || idx} question={q} answer={getAnswerForQuestion(q.id)} index={idx} forceExpand={globalExpand} />
          ))}
        </div>
      )}
    </div>
  );
}
