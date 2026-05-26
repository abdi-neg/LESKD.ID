import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Flag, Send, Menu, X, AlertCircle, ShieldAlert } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { AnswerOption } from '../../types';
import { supabase } from '../../lib/supabase'; // 🚀 IMPORT SUPABASE COUPLING
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

  // 🚀 LOGIKA BARU: HITUNG SKOR SECARA REAL-TIME BERDASARKAN KATEGORI SOAL CPNS
  async function handleAnswer(option: AnswerOption) {
    // 1. Perbarui state lokal terlebih dahulu agar UI terasa instan tanpa delay network
    dispatch({
      type: 'ANSWER_QUESTION',
      payload: { questionId: currentQuestion.id, answer: option },
    });

    // 2. Siapkan kalkulasi bayangan untuk dikirim ke database Supabase
    // Menggabungkan jawaban yang baru saja dipilih dengan jawaban yang sudah tersimpan sebelumnya
    const simulatedAnswers = {
      ...answers,
      [currentQuestion.id]: { ...answers[currentQuestion.id], selectedAnswer: option }
    };

    let calculatedTiu = 0;
    let calculatedTwk = 0;
    let calculatedTkp = 0;

    questions.forEach((q) => {
      const ans = simulatedAnswers[q.id];
      if (!ans || !ans.selectedAnswer) return;

      if (q.category === 'TKP') {
        // Logika TKP Skala 1-5 (Membaca skema bobot poin dari field json/kolom database jika ada)
        const points = q.points_mapping ? q.points_mapping[ans.selectedAnswer] : 0;
        calculatedTkp += Number(points || 0);
      } else {
        // Logika TIU & TWK: Benar dapat 5, Salah dapat 0
        const isCorrect = q.correct_answer === ans.selectedAnswer;
        if (isCorrect) {
          if (q.category === 'TIU') calculatedTiu += 5;
          if (q.category === 'TWK') calculatedTwk += 5;
        }
      }
    });

    const calculatedTotal = calculatedTiu + calculatedTwk + calculatedTkp;

    // 3. Tembakkan langsung ke kolom baris database yang sedang berjalan (ON PROGRESS)
    // Catatan: Pastikan session.resultId / examSession memiliki referensi ID baris database 'exam_results' yang valid.
    if (session.resultId) {
      await supabase
        .from('exam_results')
        .update({
          score_tiu: calculatedTiu,
          score_twk: calculatedTwk,
          score_tkp: calculatedTkp,
          total_score: calculatedTotal,
          // Opsional: perbarui kolom progress array jawaban jika dibutuhkan admin
          updated_at: new Date().toISOString()
        })
        .eq('id', session.resultId);
    }
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
      {/* Konten UI Seterusnya Tetap Sama Persis Seperti Kode Awal Kamu... */}
      {/* ... (Gunakan sisa struktur JSX bawaan kamu ke bawah tanpa perlu diubah) */}
