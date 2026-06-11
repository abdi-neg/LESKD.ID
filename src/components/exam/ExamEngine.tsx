import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion'; 
import { ChevronLeft, ChevronRight, Flag, Send, Menu, X, AlertCircle, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AnswerOption } from '../../types';
import ExamTimer from './ExamTimer';
import QuestionNavigator from './QuestionNavigator';

const OPTIONS: AnswerOption[] = ['A', 'B', 'C', 'D', 'E'];
const MAX_VIOLATIONS = 3;

export function ExamEngine() {
  const { state, dispatch, submitExamSession } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [showCheatModal, setShowCheatModal] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const violationsRef = useRef(0);

  const session = state.examSession;

  // ==================================================
  // 🧠 MESIN UTAMA: KALKULATOR DIAGNOSTIC ANALYTICS
  // ==================================================
  const handleSubmit = useCallback(() => {
    console.log("⚡ [RADAR ENGINE] Fungsi handleSubmit di ExamEngine RESMI DIEKSEKUSI!"); 
    
    // Proses kalkulasi kelemahan sub-materi secara mikro sebelum dikirim ke database
    const diagnosticBreakdown = (() => {
      if (!session) return {};
      
      const breakdown: Record<string, { correct: number; total: number; percentage: number }> = {};
      
      session.questions.forEach((q) => {
        // Gunakan nama sub_category dari database, jika kosong arahkan ke 'Umum'
        const subCat = q.sub_category || 'Umum';
        const userAnswer = session.answers[q.id];
        const selected = userAnswer?.selectedAnswer;
        
        // Inisialisasi cetakan objek jika sub-materi baru pertama kali terbaca
        if (!breakdown[subCat]) {
          breakdown[subCat] = { correct: 0, total: 0, percentage: 0 };
        }
        
        if (q.category === 'TKP') {
          // Khusus TKP: correct = jumlah poin didapat, total = jumlah poin maksimal (5 poin per soal)
          const points = selected ? (q as any)[`points_${selected.toLowerCase()}`] || 0 : 0;
          breakdown[subCat].correct += points;
          breakdown[subCat].total += 5;
        } else {
          // TIU & TWK: correct = 1 jika benar, total = 1 per soal
          const isCorrect = selected === q.correct_answer;
          breakdown[subCat].correct += isCorrect ? 1 : 0;
          breakdown[subCat].total += 1;
        }
      });
      
      // Hitung nilai akhir persentase penguasaan bab (Math.round untuk pembulatan angka)
      Object.keys(breakdown).forEach((key) => {
        const item = breakdown[key];
        item.percentage = item.total > 0 ? Math.round((item.correct / item.total) * 100) : 0;
      });
      
      return breakdown;
    })();

    // Kirimkan hasil analisis mikro ini ke dalam fungsi submit global AppContext
    submitExamSession(diagnosticBreakdown);
    setConfirmSubmit(false);
  }, [session, submitExamSession]); 

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        const nextViolations = violationsRef.current + 1;
        violationsRef.current = nextViolations;
        setViolationCount(nextViolations);
        if (nextViolations >= MAX_VIOLATIONS) {
          handleSubmit();
        } else {
          setShowCheatModal(true);
        }
      }
    };

    const blockEvent = (e: Event) => e.preventDefault();

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('contextmenu', blockEvent);
    document.addEventListener('copy', blockEvent);
    document.addEventListener('cut', blockEvent);
    document.addEventListener('selectstart', blockEvent);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('contextmenu', blockEvent);
      document.removeEventListener('copy', blockEvent);
      document.removeEventListener('cut', blockEvent);
      document.removeEventListener('selectstart', blockEvent);
    };
  }, [handleSubmit]);

  function dismissCheatModal() {
    setShowCheatModal(false);
  }

  if (!session) return null;

  const { questions, answers, currentQuestionIndex, examType } = session;
  const currentQuestion = questions[currentQuestionIndex];
  const currentAnswer = answers[currentQuestion.id];

  const totalQuestions = questions.length;
  const answeredCount = Object.values(answers).filter((a) => a.selectedAnswer).length;
  const unansweredCount = totalQuestions - answeredCount;

  function handleAnswer(option: AnswerOption) {
    dispatch({
      type: 'ANSWER_QUESTION',
      payload: { questionId: currentQuestion.id, answers: { ...answers, [currentQuestion.id]: { ...currentAnswer, selectedAnswer: option } } },
    });
  }

  function handleToggleMark() {
    dispatch({ type: 'TOGGLE_MARK', payload: currentQuestion.id });
  }

  function goNext() {
    if (currentQuestionIndex < totalQuestions - 1) {
      dispatch({ type: 'NAVIGATE_QUESTION', payload: currentQuestionIndex + 1 });
    }
  }

  // Tambahan pengaman auto-save manual saat berpindah soal via tombol prev/next
  function goPrev() {
    if (currentQuestionIndex > 0) {
      dispatch({ type: 'NAVIGATE_QUESTION', payload: currentQuestionIndex - 1 });
    }
  }

  const optionLabels: Record<AnswerOption, string> = {
    A: currentQuestion.option_a,
    B: currentQuestion.option_b,
    C: currentQuestion.option_c,
    D: currentQuestion.option_d,
    E: currentQuestion.option_e,
  };

  const categoryColors: Record<string, string> = {
    TIU: 'bg-blue-100 text-blue-700 font-semibold',
    TWK: 'bg-emerald-100 text-emerald-700 font-semibold',
    TKP: 'bg-rose-100 text-rose-700 font-semibold',
  };

  return (
    <div className="h-screen bg-gray-50 flex flex-col select-none antialiased text-gray-800 overflow-hidden">
      
      {/* HEADER NAVIGASI UJIAN */}
      <header className="bg-white border-b border-gray-200 shrink-0 px-4 h-16 flex items-center justify-between shadow-sm z-40">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-gray-100 rounded-lg lg:hidden transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-lg font-bold tracking-tight text-indigo-600">LESKD.ID</span>
          <div className="hidden sm:flex items-center gap-2 border-l pl-3 border-gray-200">
            <span className="text-sm font-medium text-gray-500">Sesi Tryout:</span>
            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded font-mono uppercase text-gray-700">{examType}</span>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <ExamTimer />
          <button
            onClick={() => setConfirmSubmit(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-sm transition-all"
          >
            <Send className="w-4 h-4" />
            <span>Selesai</span>
          </button>
        </div>
      </header>

      {/* AREA UTAMA */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* AREA UTAMA: SOAL & JAWABAN */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <div className="max-w-3xl mx-auto space-y-6">
            
            {/* ATRIBUT SOAL DAN KATEGORI */}
            <div className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex-wrap gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-2xl font-bold text-gray-900">Soal {currentQuestionIndex + 1}</span>
                <span className={`text-xs px-2.5 py-1 rounded-full uppercase tracking-wider ${categoryColors[currentQuestion.category] || 'bg-gray-100 text-gray-700'}`}>
                  {currentQuestion.category}
                </span>
                
                {/* 🌟 PENYEMPURNAAN VISUAL: Tampilkan Tag Sub-Materi agar layar ujian terasa sangat interaktif */}
                <span className="text-xs px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 font-bold uppercase tracking-wide border border-gray-200/60">
                  {currentQuestion.sub_category || 'Umum'}
                </span>
              </div>
              <button
                onClick={handleToggleMark}
                className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-lg border transition-all ${
                  currentAnswer?.isMarked
                    ? 'bg-amber-50 border-amber-300 text-amber-700 font-medium'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                <Flag className={`w-4 h-4 ${currentAnswer?.isMarked ? 'fill-amber-500 text-amber-500' : ''}`} />
                <span>Ragu-Ragu</span>
              </button>
            </div>

            {/* AREA UTAMA TEKS SOAL */}
            <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 space-y-6">
              {currentQuestion.image_url && (
                <div className="rounded-xl overflow-hidden bg-gray-50 border max-w-full flex justify-center p-4">
                  <img src={currentQuestion.image_url} alt="Ilustrasi Soal" className="max-h-64 object-contain" />
                </div>
              )}
              <p className="text-gray-800 text-[16px] leading-relaxed whitespace-pre-wrap font-medium">
                {currentQuestion.question_text}
              </p>
            </div>

            {/* DAFTAR PILIHAN JAWABAN */}
            <div className="space-y-3">
              {OPTIONS.map((option) => {
                const isSelected = currentAnswer?.selectedAnswer === option;
                const optionText = optionLabels[option] || '';
                const isImage = optionText.startsWith('http://') || optionText.startsWith('https://');

                return (
                  <button
                    key={option}
                    onClick={() => handleAnswer(option)}
                    className={`w-full text-left p-4 rounded-xl border flex items-start gap-4 transition-all shadow-none group ${
                      isSelected
                        ? 'border-indigo-600 bg-indigo-50/60 ring-1 ring-indigo-600'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center border font-bold text-sm transition-colors ${
                      isSelected
                        ? 'bg-indigo-600 border-indigo-600 text-white'
                        : 'bg-gray-50 border-gray-200 text-gray-600 group-hover:bg-gray-100'
                    }`}>
                      {option}
                    </span>
                    
                    <div className="flex-1 flex flex-col gap-2">
                      {!isImage ? (
                        <span className={`text-[15px] leading-relaxed pt-0.5 ${isSelected ? 'text-indigo-900 font-medium' : 'text-gray-700'}`}>
                          {optionText}
                        </span>
                      ) : (
                        <div className="rounded-lg overflow-hidden bg-gray-50 border max-w-full sm:max-w-md flex justify-start p-2 mt-1">
                          <img 
                            src={optionText} 
                            alt={`Gambar Opsi ${option}`} 
                            className="max-h-40 object-contain rounded"
                            onError={(e) => {
                              console.error(`Gagal memuat gambar opsi ${option}`, optionText);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* BOTTOM NAVIGASI */}
            <div className="flex items-center justify-between pt-4">
              <button
                onClick={goPrev}
                disabled={currentQuestionIndex === 0}
                className="flex items-center gap-1 text-sm font-semibold px-4 py-2.5 rounded-xl border border-gray-200 bg-white shadow-sm disabled:opacity-40 disabled:hover:bg-white text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Sebelumnya</span>
              </button>
              <span className="text-xs font-mono text-gray-400">LESKD Engine v1.1</span>
              <button
                onClick={goNext}
                disabled={currentQuestionIndex === totalQuestions - 1}
                className="flex items-center gap-1 text-sm font-semibold px-4 py-2.5 rounded-xl border border-gray-200 bg-white shadow-sm disabled:opacity-40 disabled:hover:bg-white text-gray-700 hover:bg-gray-50 transition-colors"
              >
                <span>Selanjutnya</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        </main>

        {/* SIDEBAR NOMOR SOAL */}
        <aside className={`fixed top-16 bottom-0 right-0 w-80 bg-white border-l border-gray-200 p-4 transform transition-transform duration-300 lg:static lg:h-full lg:translate-x-0 z-30 flex flex-col justify-between ${
          sidebarOpen ? 'translate-x-0' : 'translate-x-full'
        }`}>
          <div className="space-y-4 overflow-y-auto flex-1 pr-1">
            <div className="flex items-center justify-between lg:hidden">
              <span className="font-bold text-gray-700">Daftar Soal</span>
              <button onClick={() => setSidebarOpen(false)} className="p-1 rounded-md hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-center text-xs border-b pb-4 border-gray-100">
              <div className="bg-indigo-50 text-indigo-700 p-2 rounded-lg font-medium">
                <div className="text-lg font-bold">{answeredCount}</div> Soal Terjawab
              </div>
              <div className="bg-amber-50 text-amber-700 p-2 rounded-lg font-medium">
                <div className="text-lg font-bold">{unansweredCount}</div> Belum Diisi
              </div>
            </div>

            <QuestionNavigator closeSidebar={() => setSidebarOpen(false)} />
          </div>
        </aside>
      </div>

      {/* MODAL GLOBAL */}
      <AnimatePresence>
        {confirmSubmit && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-gray-100 space-y-5">
              <div className="flex items-center gap-3 text-indigo-600">
                <CheckCircle2 className="w-6 h-6 flex-shrink-0" />
                <h3 className="text-lg font-bold text-gray-900">Konfirmasi Selesai Ujian</h3>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                Apakah Anda yakin ingin mengakhiri sesi tryout ini? Pastikan seluruh butir pertanyaan telah Anda teliti dengan baik. Sesi yang telah ditutup tidak dapat dibuka kembali.
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button onClick={() => setConfirmSubmit(false)} className="px-4 py-2 rounded-xl text-sm font-semibold border text-gray-600 hover:bg-gray-50 transition-colors">Batal</button>
                <button onClick={handleSubmit} className="px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-colors">Ya, Kumpulkan</button>
              </div>
            </motion.div>
          </div>
        )}

        {showCheatModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border-t-4 border-rose-500 space-y-4">
              <div className="flex items-center gap-3 text-rose-600">
                <ShieldAlert className="w-7 h-7 flex-shrink-0" />
                <h3 className="text-lg font-bold text-gray-900">Peringatan Keamanan!</h3>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                Sistem mendeteksi bahwa Anda mencoba meninggalkan area ujian (berpindah tab atau membuka aplikasi lain). Aktivitas ini dicatat sebagai pelanggaran prosedur ujian.
              </p>
              <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-xl flex items-center gap-3 text-sm font-medium">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <span>Pelanggaran saat ini: <strong className="text-lg">{violationCount}</strong> dari {MAX_VIOLATIONS} kesempatan.</span>
              </div>
              <p className="text-xs text-gray-400">
                *Catatan: Jika batas maksimal pelanggaran terlampaui, lembar ujian Anda akan otomatis dikumpulkan paksa oleh server.
              </p>
              <div className="flex justify-end pt-2">
                <button onClick={dismissCheatModal} className="w-full sm:w-auto bg-rose-600 hover:bg-rose-700 text-white px-5 py-2 rounded-xl text-sm font-semibold shadow-md transition-colors">Saya Mengerti & Kembali Ujian</button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
