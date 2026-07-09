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
import { useNavigate } from 'react-router-dom'; 
import { useApp } from '../../context/AppContext';
import { supabase } from '../../lib/supabase';
import DiagnosticReport from './DiagnosticReport';

type AnswerOption = 'A' | 'B' | 'C' | 'D' | 'E';
const OPTIONS: AnswerOption[] = ['A', 'B', 'C', 'D', 'E'];

// ─── 🌟 RADAR PENDETEKSI GAMBAR (VERSI BRUTAL & ANTI-GAGAL) ───
function renderTextWithImages(text: string | any, customImageClass: string = "max-h-64 object-contain my-3 rounded-xl border border-gray-200 p-1 bg-white block") {
  if (!text) return null;
  if (typeof text !== 'string') return text;
  
  // Memecah teks secara agresif berdasarkan awalan http/https
  const urlRegex = /(https?:\/\/[^\s<]+)/g;
  const parts = text.split(urlRegex);

  if (parts.length === 1) return <span className="whitespace-pre-wrap leading-relaxed">{text}</span>;

  return (
    <span className="whitespace-pre-wrap leading-relaxed flex flex-col gap-2 mt-1">
      {parts.map((part, i) => {
        if (part.startsWith('http')) {
          return (
            <img 
              key={i} 
              src={part} 
              alt="Ilustrasi Pembahasan" 
              className={customImageClass}
              onError={(e) => {
                // JURUS RAHASIA: Jika gagal diload (bukan gambar), ubah jadi link biru yang bisa diklik!
                e.currentTarget.style.display = 'none';
                e.currentTarget.insertAdjacentHTML('afterend', `<a href="${part}" target="_blank" class="text-blue-500 underline text-xs break-all bg-blue-50 p-1.5 rounded-lg border border-blue-100">${part}</a>`);
              }}
            />
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}

function QuestionCard({ question, answer, index, forceExpand }: any) {
  const [localExpanded, setLocalExpanded] = useState(false);
  const expanded = forceExpand || localExpanded;

  const qText = question?.question_text || question?.soal || question?.text || `Soal Nomor ${index + 1}`;
  const category = question?.category || question?.kategori || 'TIU';
  const correctAns = question?.correct_answer || question?.kunci_jawaban || question?.kunci || '';
  
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
  
  // Mengamankan data kolom pembahasan
  const explanationText = question?.explanation || question?.pembahasan || question?.Pembahasan || '';
  const explanationImage = question?.explanation_image || question?.explanation_image_url || question?.pembahasan_gambar || '';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <button onClick={() => setLocalExpanded((v) => !v)} className="w-full p-4 flex items-start gap-3 text-left hover:bg-gray-50/50 transition-colors">
        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5
          ${isUnanswered ? 'bg-gray-100' : isTKP ? (userGainedPoints === 5 ? 'bg-emerald-500' : 'bg-amber-500') : isCorrect ? 'bg-emerald-500' : 'bg-red-500'}`}
        >
          {isUnanswered ? <Target className="w-3.5 h-3.5 text-gray-400" /> : isTKP ? <span className="text-[10px] font-extrabold text-white">+{userGainedPoints}</span> : isCorrect ? <CheckCircle className="w-3.5 h-3.5 text-white" /> : <XCircle className="w-3.5 h-3.5 text-white" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-gray-800">
            <span className="text-gray-400 mr-1 font-bold">#{index + 1}</span>
            <div className={`inline ${expanded ? '' : 'line-clamp-2'}`}>
              {renderTextWithImages(qText, "max-h-64 object-contain mt-2 mb-2 rounded-xl border border-gray-200 p-1 bg-white block")}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-[#1e3a8a]/10 text-[#1e3a8a] uppercase tracking-widest border border-[#1e3a8a]/20">
              {category}
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-gray-100 text-gray-700 border border-gray-200 shadow-sm flex items-center gap-1">
              {question?.sub_category || question?.sub_kategori || question?.SUB_CATEGORY || 'Umum'}
            </span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-gray-50 text-gray-600 ml-1">Jawaban: {selected || 'Kosong'}</span>
            {!isTKP && correctAns && <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700">Kunci: {correctAns}</span>}
          </div>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
            <div className="px-4 pb-4 border-t border-gray-50 bg-white">
              
              {/* Gambar Utama Soal */}
              {mainImage && (
                <div className="rounded-xl overflow-hidden bg-gray-50 border p-4 mt-3 flex justify-center">
                  <img src={mainImage} alt="soal utama" className="max-h-64 object-contain" />
                </div>
              )}
              
              {/* Opsi Jawaban A-E */}
              <div className="mt-3 space-y-2">
                {OPTIONS.map((opt) => {
                  const text = optionTexts[opt];
                  const content = text || optionImages[opt] || '';
                  const isKey = !isTKP && String(opt).toUpperCase() === String(correctAns).toUpperCase();
                  const isChosen = String(selected).toUpperCase() === String(opt).toUpperCase();
                  
                  return (
                    <div key={opt} className={`p-3 flex items-start gap-3 rounded-xl text-sm border ${isKey ? 'bg-emerald-50 border-emerald-200' : isChosen ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-transparent'}`}>
                      <span className="font-bold mt-0.5">{opt}.</span>
                      <div className="flex-1 min-w-0">
                        {renderTextWithImages(content, "max-h-32 object-contain rounded-xl border border-gray-200 p-1 bg-white block mt-1")}
                        
                        {isTKP && getOptionPoints(opt) > 0 && (
                          <div className="mt-2">
                            <span className="text-xs text-amber-700 font-bold bg-amber-100/50 px-2 py-0.5 rounded border border-amber-200/50">
                              {getOptionPoints(opt)} Poin
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ─── 🌟 BLOK PEMBAHASAN YANG DIJAMIN MUNCUL ─── */}
              {(explanationText || explanationImage) ? (
                <div className="mt-4 bg-blue-50/70 border border-blue-100 rounded-xl p-4">
                  <p className="text-xs font-bold text-blue-700 mb-3 flex items-center gap-1.5">
                    <BookOpen className="w-4 h-4" /> PEMBAHASAN RESMI:
                  </p>
                  
                  {/* Jika di-upload dari kolom khusus gambar pembahasan */}
                  {explanationImage && (
                    <img 
                      src={explanationImage} 
                      alt="Gambar Penjelasan" 
                      className="max-h-64 object-contain mb-3 rounded-xl border border-blue-100 p-1.5 bg-white block w-full sm:w-auto" 
                    />
                  )}
                  
                  {/* Jika di-upload dari Word atau mengetik link URL di dalam kotak teks pembahasan */}
                  {explanationText && (
                    <div className="text-sm text-gray-700 w-full">
                      {renderTextWithImages(explanationText, "max-h-64 object-contain my-3 rounded-xl border border-blue-200 p-1.5 bg-white block w-full sm:w-auto")}
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
  const contextData = useApp();
  const state = contextData?.state || {};
  const dispatch = contextData?.dispatch;
  const navigate = useNavigate(); 

  const userRole = state?.profile?.role?.toLowerCase() || 'participant';
  const isAdmin = userRole !== 'participant'; 

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
        const resultId = state?.reviewResultId || state?.activeReviewId || state?.activeResultId || state?.selectedResultId || state?.reviewId;
        
        let query = supabase.from('exam_results').select('review_snapshot, id');
        
        if (resultId) {
          query = query.eq('id', resultId);
        } else if (state?.profile?.id && !isAdmin) {
          query = query.eq('participant_id', state.profile.id).order('completed_at', { ascending: false }).limit(1);
        } else {
          setIsFetchingDb(false);
          return;
        }

        const { data, error } = await query.maybeSingle();
        
        if (error) {
          console.error("Gagal menarik snapshot:", error);
          return;
        }

        if (data && data.review_snapshot) {
          let snapshot = data.review_snapshot;
          
          if (typeof snapshot === 'string') {
            try {
              snapshot = JSON.parse(snapshot);
              if (typeof snapshot === 'string') {
                snapshot = JSON.parse(snapshot);
              }
            } catch (e) {
              console.error("Gagal parse snapshot di ExamReview:", e);
            }
          }
            
          if (snapshot && Array.isArray(snapshot.questions)) {
            const safeQuestions = snapshot.questions.map((q: any) => {
              const verifiedSub = q.sub_category || q.sub_kategori || q.SUB_KATEGORI || (q as any).SUB_CATEGORY || 'Umum';
              return {
                ...q,
                sub_category: verifiedSub,
                sub_kategori: verifiedSub
              };
            });
            setSupabaseQuestions(safeQuestions);
            setSupabaseAnswers(snapshot.answers || {});
          }
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsFetchingDb(false);
      }
    }

    loadSnapshotFromSupabase();
  }, [state, propQuestions, stateQuestions.length, isAdmin]);

  const rawQuestions = (propQuestions && propQuestions.length > 0) ? propQuestions :
                         (stateQuestions.length > 0) ? stateQuestions : supabaseQuestions;

  const finalAnswers = (propQuestions && propQuestions.length > 0) ? propAnswers :
                       (stateQuestions.length > 0) ? stateAnswers : supabaseAnswers;

  // ─── GEMBOK PENGURUTAN SOAL KONSISTEN (ANTI-ACAK SAAT REFRESH) ───
  const finalQuestions = [...rawQuestions].sort((a: any, b: any) => {
    const catOrder: Record<string, number> = { TWK: 1, TIU: 2, TKP: 3 };
    const catA = a.category || a.kategori || 'TIU';
    const catB = b.category || b.kategori || 'TIU';
    
    if (catOrder[catA] !== catOrder[catB]) {
      return (catOrder[catA] || 99) - (catOrder[catB] || 99);
    }
    
    if (a.created_at && b.created_at) {
      const timeA = new Date(a.created_at).getTime();
      const timeB = new Date(b.created_at).getTime();
      if (timeA !== timeB) return timeA - timeB;
    }

    const textA = a.question_text || a.soal || a.text || '';
    const textB = b.question_text || b.soal || b.text || '';
    return String(textA).localeCompare(String(textB));
  });

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

  const handleGoBack = () => {
    if (state?.reviewResultId) {
      dispatch({ type: 'DELETE_EXAM_RESULT', payload: state.reviewResultId });
    }
    
    if (isAdmin) {
      dispatch({ type: 'SET_VIEW', payload: 'admin-dashboard' });
      navigate('/admin/results', { replace: true });
    } else {
      dispatch({ type: 'SET_VIEW', payload: state?.examSession ? 'exam-results' : 'participant-dashboard' });
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
              {isAdmin ? 'Mode Tinjauan Admin' : 'Lembar Evaluasi Pribadi'} &bull; Ditemukan {finalQuestions.length} soal
            </p>
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

      {/* Bar Pencarian */}
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

      {/* Peta Kekuatan & Kelemahan */}
      {!isFetchingDb && finalQuestions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="clear-both"
        >
          <DiagnosticReport questions={finalQuestions} answers={finalAnswers} />
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
            <h3 className="text-sm font-bold text-gray-700">Data Pembahasan Kosong</h3>
            <p className="text-xs text-gray-400 max-w-sm leading-relaxed">
              Sistem tidak dapat menampilkan detail. Pastikan Anda telah membuat kolom "review_snapshot" di tabel Supabase dan merekam sesi ujian baru.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default ExamReview;
