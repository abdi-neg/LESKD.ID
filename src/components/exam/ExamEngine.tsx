import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Flag, Send, Menu, X, AlertCircle, ShieldAlert } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AnswerOption } from '../../types';
import ExamTimer from './ExamTimer';
import QuestionNavigator from './QuestionNavigator';

const OPTIONS: AnswerOption[] = ['A', 'B', 'C', 'D', 'E'];
const MAX_VIOLATIONS = 3;

export default function ExamEngine() {
  const { state, dispatch } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [showCheatModal, setShowCheatModal] = useState(false);
  const [violationCount, setViolationCount] = useState(0);
  const violationsRef = useRef(0);

  const session = state.examSession;

  const handleSubmit = useCallback(() => {
    dispatch({ type: 'SUBMIT_EXAM' });
    setConfirmSubmit(false);
  }, [dispatch]);

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
      payload: { questionId: currentQuestion.id, answer: option },
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
    TIU: 'bg-blue-100 text-blue-700',
    TWK: 'bg-emerald-100 text-emerald-700',
    TKP: 'bg-rose-100 text-rose-700',
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col select-none">

      {/* Anti-cheat Modal */}
      <AnimatePresence>
        {showCheatModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
          >
            <motion.div
              initial={{ scale: 0.88, y: 24 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.88, y: 24 }}
              transition={{ type: 'spring', damping: 26, stiffness: 300 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-sm p-6 text-center"
            >
              {/* Icon */}
              <div className="w-16 h-16 rounded-2xl bg-amber-100 flex items-center justify-center mx-auto mb-4">
                <ShieldAlert className="w-8 h-8 text-amber-500" />
              </div>

              {/* Title */}
              <h3 className="text-lg font-extrabold mb-1 text-gray-800">
                Peringatan Anti-Kecurangan
              </h3>

              {/* Body */}
              <p className="text-sm text-gray-500 mb-4">
                Terdeteksi perpindahan tab pada halaman ujian. Tindakan ini melanggar aturan integritas ujian.
              </p>

              {/* Violation progress dots */}
              <div className="flex items-center justify-center gap-2 mb-3">
                {Array.from({ length: MAX_VIOLATIONS }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      i < violationCount ? 'bg-amber-400 w-8' : 'bg-gray-200 w-8'
                    }`}
                  />
                ))}
              </div>

              <p className="text-xs text-gray-400 mb-5">
                Pelanggaran ke-<span className="font-bold text-amber-500">{violationCount}</span> dari{' '}
                <span className="font-bold">{MAX_VIOLATIONS}</span>.{' '}
                {MAX_VIOLATIONS - violationCount === 1
                  ? <span className="text-red-400 font-semibold">Satu pelanggaran lagi akan mengakhiri ujian secara otomatis!</span>
                  : <span>Sisa {MAX_VIOLATIONS - violationCount} kesempatan sebelum ujian dikumpulkan otomatis.</span>
                }
              </p>

              {/* CTA Button */}
              <button
                onClick={dismissCheatModal}
                className="w-full py-3 rounded-2xl font-bold text-white bg-[#1e3a8a] hover:bg-[#1e40af] transition-colors"
              >
                Saya Mengerti
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Bar */}
      <header className="bg-[#1e3a8a] text-white px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-lg">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden w-9 h-9 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <span className="text-white font-extrabold text-sm">LESKD.ID</span>
            <span className="text-blue-200 text-sm">|</span>
            <span className="text-sm font-medium text-blue-200">Ujian</span>
            <span className="font-bold">{examType}</span>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 bg-white/10 rounded-lg px-3 py-1 text-sm">
            <span className="text-blue-200">Soal</span>
            <span className="font-bold">{currentQuestionIndex + 1}</span>
            <span className="text-blue-200">dari</span>
            <span className="font-bold">{totalQuestions}</span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {violationCount > 0 && (
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-400/20 text-amber-200">
              <ShieldAlert className="w-3.5 h-3.5" />
              {violationCount}/{MAX_VIOLATIONS}
            </div>
          )}
          <ExamTimer />
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setConfirmSubmit(true)}
            className="flex items-center gap-2 bg-[#10b981] hover:bg-[#059669] text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors shadow-md"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Selesai</span>
          </motion.button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:flex flex-col w-64 bg-white border-r border-gray-100 flex-shrink-0 sticky top-[61px] h-[calc(100vh-61px)] overflow-hidden">
          <QuestionNavigator />
        </aside>

        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {sidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/40 z-40 lg:hidden"
                onClick={() => setSidebarOpen(false)}
              />
              <motion.aside
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                className="fixed left-0 top-0 bottom-0 w-72 bg-white z-50 lg:hidden shadow-2xl flex flex-col"
              >
                <div className="flex items-center justify-between p-4 bg-[#1e3a8a] text-white">
                  <span className="font-semibold">Navigasi Soal</span>
                  <button onClick={() => setSidebarOpen(false)}>
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="flex-1 overflow-hidden">
                  <QuestionNavigator />
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Main Question Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-3xl mx-auto p-4 sm:p-6 py-8">
            {/* Progress Bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between text-sm text-gray-500 mb-2">
                <span>{answeredCount} dari {totalQuestions} soal dijawab</span>
                <span>{Math.round((answeredCount / totalQuestions) * 100)}%</span>
              </div>
              <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-[#10b981] rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>

            {/* Question Card */}
            <AnimatePresence mode="wait">
              <motion.div
                key={currentQuestionIndex}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden"
              >
                {/* Question Header */}
                <div className="p-6 border-b border-gray-50">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-sm font-bold text-gray-700">
                      Soal {currentQuestionIndex + 1}
                    </span>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${categoryColors[currentQuestion.category]}`}>
                      {currentQuestion.category}
                    </span>
                    {currentAnswer?.isMarked && (
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700 flex items-center gap-1">
                        <Flag className="w-3 h-3 fill-amber-500" />
                        Ragu-ragu
                      </span>
                    )}
                  </div>
                  <p className="text-gray-800 text-base sm:text-lg leading-relaxed font-medium">
                    {currentQuestion.question_text}
                  </p>

                  {/* Figural / question image */}
                  {currentQuestion.image_url && (
                    <div className="mt-4 flex justify-center">
                      <img
                        src={currentQuestion.image_url}
                        alt="Gambar soal"
                        className="max-h-64 max-w-full rounded-2xl border border-gray-200 object-contain shadow-sm"
                      />
                    </div>
                  )}
                </div>

                {/* Answer Options */}
                {currentQuestion.option_type === 'image' ? (
                  // Figural: 2-column image grid
                  <div className="p-6">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {OPTIONS.map((option) => {
                        const isSelected = currentAnswer?.selectedAnswer === option;
                        const imgUrl = optionLabels[option];
                        return (
                          <motion.button
                            key={option}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => handleAnswer(option)}
                            className={`relative rounded-2xl border-2 overflow-hidden transition-all
                              ${isSelected
                                ? 'border-[#1e3a8a] shadow-md ring-2 ring-[#1e3a8a]/20'
                                : 'border-gray-200 hover:border-gray-300'}`}
                          >
                            <div className={`absolute top-2 left-2 z-10 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow
                              ${isSelected ? 'bg-[#1e3a8a] text-white' : 'bg-white/90 text-gray-600 border border-gray-200'}`}>
                              {option}
                            </div>
                            {isSelected && (
                              <div className="absolute inset-0 bg-[#1e3a8a]/10 z-10" />
                            )}
                            <img
                              src={imgUrl}
                              alt={`Opsi ${option}`}
                              className="w-full aspect-square object-contain bg-white p-2"
                            />
                          </motion.button>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  // Text options
                  <div className="p-6 space-y-3">
                    {OPTIONS.map((option) => {
                      const isSelected = currentAnswer?.selectedAnswer === option;
                      return (
                        <motion.button
                          key={option}
                          whileHover={{ scale: 1.005 }}
                          whileTap={{ scale: 0.995 }}
                          onClick={() => handleAnswer(option)}
                          className={`w-full flex items-start gap-4 p-4 rounded-2xl border-2 transition-all text-left
                            ${isSelected
                              ? 'border-[#1e3a8a] bg-blue-50 shadow-sm'
                              : 'border-gray-100 bg-gray-50/50 hover:border-gray-200 hover:bg-gray-50'}`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0
                            ${isSelected ? 'bg-[#1e3a8a] text-white' : 'bg-white border-2 border-gray-200 text-gray-500'}`}>
                            {option}
                          </div>
                          <span className={`text-sm leading-relaxed pt-1 ${isSelected ? 'text-[#1e3a8a] font-medium' : 'text-gray-600'}`}>
                            {optionLabels[option]}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                )}

                {/* Footer Actions */}
                <div className="px-6 pb-6 flex items-center justify-between gap-3">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleToggleMark}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all
                      ${currentAnswer?.isMarked
                        ? 'bg-amber-100 text-amber-700 border border-amber-200'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                  >
                    <Flag className={`w-4 h-4 ${currentAnswer?.isMarked ? 'fill-amber-500' : ''}`} />
                    {currentAnswer?.isMarked ? 'Hapus Tandai' : 'Tandai Ragu'}
                  </motion.button>

                  <div className="flex items-center gap-2">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={goPrev}
                      disabled={currentQuestionIndex === 0}
                      className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                    >
                      <ChevronLeft className="w-5 h-5 text-gray-600" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={goNext}
                      disabled={currentQuestionIndex === totalQuestions - 1}
                      className="w-10 h-10 rounded-xl bg-[#1e3a8a] hover:bg-[#1e40af] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                    >
                      <ChevronRight className="w-5 h-5 text-white" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Submit Confirmation Modal */}
      <AnimatePresence>
        {confirmSubmit && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setConfirmSubmit(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800 text-lg">Konfirmasi Submit</h3>
                  <p className="text-gray-500 text-sm">Pastikan jawaban sudah benar</p>
                </div>
              </div>

              <div className="bg-amber-50 rounded-2xl p-4 mb-6 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Soal dijawab</span>
                  <span className="font-semibold text-[#10b981]">{answeredCount}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Belum dijawab</span>
                  <span className={`font-semibold ${unansweredCount > 0 ? 'text-red-500' : 'text-gray-500'}`}>
                    {unansweredCount}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmSubmit(false)}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-600 font-medium hover:bg-gray-50 transition-colors"
                >
                  Kembali
                </button>
                <button
                  onClick={handleSubmit}
                  className="flex-1 py-3 rounded-xl bg-[#10b981] hover:bg-[#059669] text-white font-semibold transition-colors"
                >
                  Ya, Kumpulkan
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
