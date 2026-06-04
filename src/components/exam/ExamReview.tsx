import React, { useState, useEffect } from 'react';
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
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';

type AnswerOption = 'A' | 'B' | 'C' | 'D' | 'E';
const OPTIONS: AnswerOption[] = ['A', 'B', 'C', 'D', 'E'];

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
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-gray-50 text-gray-600">Jawaban Anda: {selected || 'Kosong'}</span>
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
                    {isTKP && getOptionPoints(opt) > 0 && <span className="ml-2 text-xs text-amber-600 font-bold">({getOptionPoints(opt)} Poin)</span>}
                  </div>
                );
              })}
            </div>
            {(explanation || explanationImage) ? (
              <div className="mt-4 bg-blue-50/70 border border-blue-100 rounded-xl p-3.5">
                <p className="text-xs font-bold text-blue-700 mb-1 flex items-center gap-1">
                  <BookOpen className="w-3.5 h-3.5" /> Pembahasan Resmi:
                </p>
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
// MAIN COMPONENT (NAMED EXPORT)
// ==========================================
export function ExamReview({ questions: propQuestions, answers: propAnswers }: any) {
  const contextData = useApp();
  const state = contextData?.state || {};
  const dispatch = contextData?.dispatch;

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'ALL' | 'TIU' | 'TWK' | 'TKP'>('ALL');
  const [globalExpand, setGlobalExpand] = useState(false);

  const [supabaseQuestions, setSupabaseQuestions] = useState<any[]>([]);
  const [supabaseAnswers, setSupabaseAnswers] = useState<any>({});
  const [isFetchingDb, setIsFetchingDb] = useState(false);

  const stateQuestions = state?.examSession?.questions || state?.activeQuestions || state?.questions || [];
  const stateAnswers = state?.examSession?.answers || state?.activeAnswers || state?.answers || {};

  useEffect(() => {
    if ((propQuestions && propQuestions.length > 0) || stateQuestions.length > 0) {
      return;
    }

    async function loadSnapshotFromSupabase() {
      setIsFetchingDb(true);
      try {
        const resultId = state?.activeResultId || state?.selectedResultId || state?.reviewId || (state?.examSession as any)?.resultId;
        
        let query = supabase.from('exam_results').select('review_snapshot, id');
        
        if (resultId) {
          query = query.eq('id', resultId);
        } else if (state?.profile?.id) {
          query = query.eq('participant_id', state.profile.id).order('completed_at', { ascending: false }).limit(1);
        } else {
          query = query.order('completed_at', { ascending: false }).limit(1);
        }

        const { data, error } = await query.maybeSingle();
        
        if (error) return;

        if (data && data.review_snapshot) {
          const snapshot = typeof data.review_snapshot === 'string' 
            ? JSON.parse(data.review_snapshot) 
            : data.review_snapshot;
            
          if (snapshot && Array.isArray(snapshot.questions)) {
            setSupabaseQuestions(snapshot.questions);
            setSupabaseAnswers(snapshot.answers || {});
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsFetchingDb(false); // 🔑 PERBAIKAN: Sekarang ejaan "finally" sudah benar dan legal
      }
    }

    loadSnapshotFromSupabase();
  }, [state, propQuestions, stateQuestions.length]);

  const finalQuestions = (propQuestions && propQuestions.length > 0) ? propQuestions :
                         (stateQuestions.length > 0) ? stateQuestions : supabaseQuestions;

  const finalAnswers = (propQuestions && propQuestions.length > 0) ? propAnswers :
                       (stateQuestions.length > 0) ? stateAnswers : supabaseAnswers;

  const getAnswerForQuestion = (qId: string | number) => {
    if (!finalAnswers) return undefined;
    if (Array.isArray(finalAnswers)) return finalAnswers.find((ans) => ans?.question_id == qId || ans?.questionId == qId);
    if (typeof finalAnswers === 'object') return finalAnswers[qId] !== undefined ? finalAnswers[qId] : Object.values(finalAnswers).find((ans: any) => ans?.questionId == qId || ans?.question_id == qId);
    return undefined;
  };

  const filteredQuestions = finalQuestions.filter((q: any) => {
    if (!q) return false;
    const qText = q.question_text || q.soal || q.text || '';
    const category = q.category || q.kategori || 'TIU';
    if (!qText.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    if (selectedCategory !== 'ALL' && category !== selectedCategory) return false;
    return true;
  });

  return (
    <div className="space-y-6 max-w-4xl mx-auto px-2 py-4">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => dispatch({ type: 'SET_VIEW', payload: state?.examSession ? 'exam-results' : 'participant-dashboard' })} 
            className="p-2 hover:bg-gray-100 rounded-xl border transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-base font-bold text-gray-800">Pembahasan & Review Ujian</h1>
            <p className="text-xs text-gray-500">Ditemukan {finalQuestions.length} soal ujian</p>
          </div>
        </div>
        {finalQuestions.length > 0 && (
          <button 
            onClick={() => setGlobalExpand(!globalExpand)} 
            className="text-xs font-semibold bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-xl text-gray-700 transition-colors"
          >
            {globalExpand ? 'Tutup Semua' : 'Buka Semua'}
          </button>
        )}
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
              className={`px-3 py-1 rounded-full font-semibold transition-colors ${selectedCategory === cat ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {cat === 'ALL' ? 'Semua Bidang' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Area Daftar Soal */}
      <div className="space-y-4">
        {isFetchingDb ? (
          <div className="text-center py-12 bg-white rounded-2xl border flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
            <p className="text-xs text-gray-500 font-medium animate-pulse">Sedang menyinkronkan data pembahasan dari Supabase...</p>
          </div>
        ) : filteredQuestions.length > 0 ? (
          filteredQuestions.map((q: any, idx: number) => (
            <QuestionCard 
              key={q.id || idx} 
              question={q} 
              answer={getAnswerForQuestion(q.id)} 
              index={idx} 
              forceExpand={globalExpand} 
            />
          ))
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-gray-200 p-6 flex flex-col items-center justify-center gap-2">
            <AlertTriangle className="w-8 h-8 text-amber-500" />
            <h3 className="text-sm font-bold text-gray-700">Lembar Pembahasan Kosong</h3>
            <p className="text-xs text-gray-400 max-w-sm leading-relaxed">
              Sistem tidak menemukan ringkasan ulasan di memori maupun database. Pastikan ulasan tersimpan dengan benar saat klik selesaikan ujian.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// 🔑 DEFAULT EXPORT UNTUK SINKRONISASI ADMIN DASHBOARD
export default ExamReview;
