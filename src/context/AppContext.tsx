import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AppState, AppView, ExamSession, Profile, Question, ExamType, ExamPackage } from '../types';
import { mockQuestions, EXAM_CONFIGS } from '../data/mockData';
import { supabase, getProfile } from '../lib/supabase';
import {
  saveExamProgress,
  loadExamProgress,
  getActiveSessionId,
  clearExamProgress,
} from '../lib/examPersistence';

type AppAction =
  | { type: 'SET_AUTH_LOADING'; payload: boolean }
  | { type: 'SET_PROFILE'; payload: Profile | null }
  | { type: 'LOGOUT' }
  | { type: 'SET_VIEW'; payload: AppView }
  | { type: 'START_EXAM'; payload: { examType: ExamType; pkg?: ExamPackage } }
  | { type: 'RESUME_EXAM'; payload: ExamSession }
  | { type: 'ANSWER_QUESTION'; payload: { questionId: string; answers: ExamSession['answers'] } }
  | { type: 'TOGGLE_MARK'; payload: string }
  | { type: 'NAVIGATE_QUESTION'; payload: number }
  | { type: 'TICK_TIMER' }
  | { type: 'RESTORE_TIMER'; payload: number }
  | { type: 'FINALIZE_EXAM_STORE'; payload: ExamSession }
  | { type: 'CLEAR_EXAM' }
  | { type: 'OPEN_REVIEW'; payload: string }
  | { type: 'DELETE_EXAM_RESULT'; payload: string };

const initialState: AppState = {
  profile: null,
  authLoading: true,
  currentView: 'landing',
  examSession: null,
  reviewResultId: null,
};

// 🔒 LOCK FLAGS: Mencegah pemicu ganda (Double Trigger / StrictMode) di level aplikasi
let isStartingExam = false;
let isSubmittingExam = false;

export function packageTypeToExamType(pt: string): ExamType {
  if (pt === 'MINI_TIU') return 'TIU';
  if (pt === 'MINI_TWK') return 'TWK';
  if (pt === 'MINI_TKP') return 'TKP';
  return 'FULL';
}

async function fetchQuestionsForExam(examType: ExamType, packageId?: string): Promise<Question[]> {
  const config = EXAM_CONFIGS[examType];
  if (packageId) {
    const { data } = await supabase.from('questions').select('*').eq('package_id', packageId).order('created_at');
    if (data && data.length > 0) {
      const mappedData = data.map((q) => ({
        ...q,
        points_a: q.points_a ?? 0,
        points_b: q.points_b ?? 0,
        points_c: q.points_c ?? 0,
        points_d: q.points_d ?? 0,
        points_e: q.points_e ?? 0,
      })) as Question[];
      const filtered = examType === 'FULL' ? mappedData : mappedData.filter((q) => q.category === examType);
      if (filtered.length > 0) return filtered.slice(0, config.questionCount);
    }
  }
  const mock = examType === 'FULL' ? mockQuestions : mockQuestions.filter((q) => q.category === examType);
  const mappedMock = mock.map((q) => ({
    ...q,
    points_a: (q as any).points_a ?? 0,
    points_b: (q as any).points_b ?? 0,
    points_c: (q as any).points_c ?? 0,
    points_d: (q as any).points_d ?? 0,
    points_e: (q as any).points_e ?? 0,
  })) as Question[];
  let padded = mappedMock;
  while (padded.length < config.questionCount) { padded = [...padded, ...padded].slice(0, config.questionCount); }
  return padded.slice(0, config.questionCount);
}

function buildSession(examType: ExamType, questions: Question[], pkg?: ExamPackage): ExamSession {
  const config = EXAM_CONFIGS[examType];
  const answers: ExamSession['answers'] = {};
  const securedQuestions = questions.map((q) => ({
    ...q,
    points_a: (q as any).points_a ?? 0,
    points_b: (q as any).points_b ?? 0,
    points_c: (q as any).points_c ?? 0,
    points_d: (q as any).points_d ?? 0,
    points_e: (q as any).points_e ?? 0,
  })) as Question[];
  securedQuestions.forEach((q) => {
    answers[q.id] = { questionId: q.id, selectedAnswer: null, isMarked: false };
  });
  return {
    id: crypto.randomUUID(),
    packageId: pkg?.id,
    packageName: pkg?.name,
    examType,
    questions: securedQuestions,
    answers,
    currentQuestionIndex: 0,
    timeRemaining: config.timeMinutes * 60,
    status: 'in_progress',
    startedAt: new Date(),
  };
}

function calculateScores(session: ExamSession) {
  let tiu = 0, twk = 0, tkp = 0;
  let correctCount = 0;
  session.questions.forEach((q) => {
    const answer = session.answers[q.id];
    if (!answer?.selectedAnswer) return;
    if (q.category === 'TKP') {
      const selected = answer.selectedAnswer.toLowerCase();
      let points = 0;
      if (selected === 'a') points = Number(q.points_a ?? 0);
      else if (selected === 'b') points = Number(q.points_b ?? 0);
      else if (selected === 'c') points = Number(q.points_c ?? 0);
      else if (selected === 'd') points = Number(q.points_d ?? 0);
      else if (selected === 'e') points = Number(q.points_e ?? 0);
      tkp += points;
      if (points > 0) correctCount++;
    } else {
      const pts = answer.selectedAnswer === q.correct_answer ? 5 : 0;
      if (pts > 0) correctCount++;
      if (q.category === 'TIU') tiu += pts;
      else twk += pts;
    }
  });
  return { tiu, twk, tkp, total: tiu + twk + tkp, correctCount };
}

function checkPassedStatus(examType: ExamType, scores: { tiu: number; twk: number; tkp: number }) {
  if (examType === 'FULL') {
    return scores.twk >= 65 && scores.tiu >= 80 && scores.tkp >= 166;
  }
  if (examType === 'TWK') return scores.twk >= 65;
  if (examType === 'TIU') return scores.tiu >= 80;
  if (examType === 'TKP') return scores.tkp >= 166;
  return false;
}

function getViewForProfile(p: Profile): AppView {
  if (!p.is_approved) return 'waiting-room';
  if (p.role === 'participant') return 'participant-dashboard';
  return 'admin-dashboard';
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_AUTH_LOADING':
      return { ...state, authLoading: action.payload };
    case 'SET_PROFILE': {
      if (!action.payload) return { ...state, profile: null, currentView: 'landing', authLoading: false };
      const examActive = state.currentView === 'exam-engine' || state.currentView === 'exam-results';
      return {
        ...state,
        profile: action.payload,
        authLoading: false,
        currentView: examActive ? state.currentView : getViewForProfile(action.payload),
      };
    }
    case 'LOGOUT':
      localStorage.removeItem('exam_active_session_id');
      return { ...initialState, authLoading: false };
    case 'SET_VIEW':
      return { ...state, currentView: action.payload };
    case 'START_EXAM':
      return { ...state, examSession: null, currentView: 'exam-engine' };
    case 'RESUME_EXAM':
      return { ...state, examSession: action.payload, currentView: action.payload.status === 'completed' ? 'exam-results' : 'exam-engine' };
    case 'ANSWER_QUESTION': {
      if (!state.examSession) return state;
      return {
        ...state,
        examSession: { ...state.examSession, answers: action.payload.answers }
      };
    }
    case 'TOGGLE_MARK': {
      if (!state.examSession) return state;
      const qId = action.payload;
      const cur = state.examSession.answers[qId];
      return {
        ...state,
        examSession: {
          ...state.examSession,
          answers: { ...state.examSession.answers, [qId]: { ...cur, isMarked: !cur.isMarked } },
        },
      };
    }
    case 'NAVIGATE_QUESTION':
      return state.examSession ? { ...state, examSession: { ...state.examSession, currentQuestionIndex: action.payload } } : state;
    case 'RESTORE_TIMER':
      return state.examSession ? { ...state, examSession: { ...state.examSession, timeRemaining: action.payload } } : state;
    case 'TICK_TIMER': {
      if (!state.examSession || state.examSession.timeRemaining <= 0) return state;
      return { ...state, examSession: { ...state.examSession, timeRemaining: state.examSession.timeRemaining - 1 } };
    }
    case 'FINALIZE_EXAM_STORE': {
      return {
        ...state,
        currentView: 'exam-results',
        examSession: action.payload
      };
    }
    case 'CLEAR_EXAM': {
      if (state.examSession) clearExamProgress(state.examSession.id);
      else localStorage.removeItem('exam_active_session_id');
      const isAdmin = state.profile?.role === 'admin' || state.profile?.role === 'super_admin';
      return { ...state, examSession: null, reviewResultId: null, currentView: isAdmin ? 'admin-dashboard' : 'participant-dashboard' };
    }
    case 'OPEN_REVIEW':
      return { ...state, reviewResultId: action.payload, currentView: 'exam-review' };
    case 'DELETE_EXAM_RESULT':
      return state.reviewResultId === action.payload ? { ...state, reviewResultId: null } : state;
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  startExam: (examType: ExamType, pkg?: ExamPackage) => Promise<void>;
  deleteHistory: (resultId: string) => Promise<boolean>;
  submitExamSession: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // 🔄 Realtime Auto Save Sync Effect
  useEffect(() => {
    const session = state.examSession;
    
    // 🔒 JANGAN update Supabase jika status pengerjaan sudah selesai atau sedang dikirimkan!
    if (!session || session.status === 'completed' || isSubmittingExam) return;

    if (session.status === 'in_progress') {
      saveExamProgress(session);

      const dbResultId = (session as any).resultId;
      if (dbResultId) {
        const liveScores = calculateScores(session);
        const isPassed = checkPassedStatus(session.examType, liveScores);

        supabase
          .from('exam_results')
          .update({
            score_tiu: liveScores.tiu,
            score_twk: liveScores.twk,
            score_tkp: liveScores.tkp,
            total_score: liveScores.total,
            questions_correct: liveScores.correctCount,
            passed: isPassed,
            duration_seconds: Math.max(0, (EXAM_CONFIGS[session.examType].timeMinutes * 60) - session.timeRemaining)
          })
          .eq('id', dbResultId)
          .then(({ error }) => { 
            if (error) console.error("Realtime Sync Error:", error); 
          });
      }
    }
  }, [state.examSession?.answers, state.examSession?.status]);

  // Timer Ticking effect
  useEffect(() => {
    if (!state.examSession || state.examSession.status !== 'in_progress') return;
    const timer = setInterval(() => {
      if (state.examSession && state.examSession.timeRemaining <= 1) {
        clearInterval(timer);
        submitExamSession();
      } else {
        dispatch({ type: 'TICK_TIMER' });
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [state.examSession?.status, state.examSession?.id]);

  async function refreshProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { dispatch({ type: 'SET_PROFILE', payload: null }); return; }
    try {
      const profile = await getProfile(user.id);
      dispatch({ type: 'SET_PROFILE', payload: profile ? (profile as Profile) : null });
    } catch { dispatch({ type: 'SET_PROFILE', payload: null }); }
  }

  // 🚀 Fungsi Start Exam yang Diperbaiki Secara Total & Aman dari Double-Trigger
  async function startExam(examType: ExamType, pkg?: ExamPackage) {
  if (isStartingExam) return;

  try {
    isStartingExam = true;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("Sesi login tidak valid.");
      return;
    }

    // 1️⃣ Ambil pertanyaan terlebih dahulu
    const questions = await fetchQuestionsForExam(examType, pkg?.id);
    const session = buildSession(examType, questions, pkg);

    // 2️⃣ Daftarkan sesi baru ke Supabase
    const { data: insertedData, error } = await supabase
      .from('exam_results')
      .insert({
        participant_id: user.id,
        user_name: state.profile?.full_name || user.email, // Memastikan nama peserta terisi langsung
        package_type: pkg?.package_type || examType,
        package_id: pkg?.id || null,
        package_name: pkg?.name || 'Mini Tryout',
        score_tiu: 0, score_twk: 0, score_tkp: 0, total_score: 0,
        questions_total: questions.length, questions_correct: 0,
        passed: false, 
        status: 'ON_PROGRESS', // Pastikan casing string ini sama dengan constraint DB
      })
      .select()
      .single();

    if (error) {
      // Jika terblokir karena masih ada sesi aktif di database, jangan buat baru
      if (error.code === '23505') { 
        console.warn("Anda memiliki sesi yang masih berjalan. Silakan muat ulang halaman.");
      }
      throw error;
    }

    // 3️⃣ GABUNGKAN DATA: Pastikan resultId dari Supabase dimasukkan ke dalam state
    const sessionWithResultId = { 
      ...session, 
      resultId: insertedData.id,
      userName: state.profile?.full_name || user.email // Mengunci nama di level state engine
    };

    // 4️⃣ Simpan ke penyimpan lokal dan aktifkan views secara bersamaan
    saveExamProgress(sessionWithResultId);
    
    // Pemicu tampilan engine ditaruh di sini agar data ID dan Nama sudah siap pakai
    dispatch({ type: 'RESUME_EXAM', payload: sessionWithResultId });

  } catch (err) {
    console.error("Gagal menginisialisasi sesi ujian:", err);
  } finally {
    isStartingExam = false;
  }
}

  // ✅ Fungsi Submit Terpusat yang Diperbaiki (Menghilangkan Kondisi Balapan Penyebab Nilai Reset)
  async function submitExamSession() {
    const session = state.examSession;
    if (!session || isSubmittingExam) return;

    const dbResultId = (session as any).resultId;
    if (!dbResultId) return;

    try {
      isSubmittingExam = true;

      const scores = calculateScores(session);
      const isPassed = checkPassedStatus(session.examType, scores);

      // 1️⃣ Langkah Utama: Amankan & simpan status akhir ke database Supabase terlebih dahulu
      const { error } = await supabase
        .from('exam_results')
        .update({
          score_tiu: scores.tiu,
          score_twk: scores.twk,
          score_tkp: scores.tkp,
          total_score: scores.total,
          questions_correct: scores.correctCount,
          passed: isPassed,
          status: 'COMPLETED',
          completed_at: new Date().toISOString(),
          duration_seconds: Math.max(0, (EXAM_CONFIGS[session.examType].timeMinutes * 60) - session.timeRemaining)
        })
        .eq('id', dbResultId);

      if (error) throw error;

      // 2️⃣ Langkah Kedua: Setelah Supabase ter-update penuh, baru bersihkan penyimpanan lokal
      clearExamProgress(session.id);
      localStorage.removeItem('exam_active_session_id');

      const completedSession: ExamSession = {
        ...session,
        status: 'completed',
        completedAt: new Date(),
        scores
      };

      // 3️⃣ Langkah Terakhir: Berpindah rute tampilan ke halaman hasil
      dispatch({ type: 'FINALIZE_EXAM_STORE', payload: completedSession });

    } catch (err) {
      console.error("Gagal melakukan submisi ujian akhir:", err);
    } finally {
      isSubmittingExam = false;
    }
  }

  async function deleteHistory(resultId: string): Promise<boolean> {
    try {
      const { deleteExamResult } = await import('../lib/examPersistence');
      const res = await deleteExamResult(resultId);
      if (res.success) { dispatch({ type: 'DELETE_EXAM_RESULT', payload: resultId }); return true; }
      return false;
    } catch { return false; }
  }

  // 🔄 Restore & Auth listener Effect
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const savedId = getActiveSessionId();
        if (savedId) {
          const saved = loadExamProgress(savedId);
          if (saved && (saved as any).status !== 'completed') {
            fetchQuestionsForExam(saved.examType, saved.packageId).then((questions) => {
              dispatch({
                type: 'RESUME_EXAM',
                payload: {
                  id: saved.sessionId, packageId: saved.packageId, packageName: saved.packageName,
                  examType: saved.examType, questions, answers: saved.answers,
                  currentQuestionIndex: saved.currentQuestionIndex, timeRemaining: saved.timeRemaining,
                  status: 'in_progress', startedAt: new Date(saved.startedAt), resultId: (saved as any).resultId || undefined
                } as any
              });
            });
          } else { localStorage.removeItem('exam_active_session_id'); }
        }
        refreshProfile();
      } else { dispatch({ type: 'SET_AUTH_LOADING', payload: false }); }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) { dispatch({ type: 'LOGOUT' }); return; }
      if (event === 'SIGNED_IN' && session.user) refreshProfile();
    });
    return () => subscription.unsubscribe();
  }, []);

  async function signOut() { await supabase.auth.signOut(); dispatch({ type: 'LOGOUT' }); }

  return (
    <AppContext.Provider value={{ state, dispatch, signOut, refreshProfile, startExam, deleteHistory, submitExamSession }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
