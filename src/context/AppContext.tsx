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
  | { type: 'ANSWER_QUESTION'; payload: { questionId: string; answer: string } }
  | { type: 'TOGGLE_MARK'; payload: string }
  | { type: 'NAVIGATE_QUESTION'; payload: number }
  | { type: 'TICK_TIMER' }
  | { type: 'RESTORE_TIMER'; payload: number }
  | { type: 'SUBMIT_EXAM' }
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

export function packageTypeToExamType(pt: string): ExamType {
  if (pt === 'MINI_TIU') return 'TIU';
  if (pt === 'MINI_TWK') return 'TWK';
  if (pt === 'MINI_TKP') return 'TKP';
  return 'FULL';
}

async function fetchQuestionsForExam(
  examType: ExamType,
  packageId?: string,
): Promise<Question[]> {
  const config = EXAM_CONFIGS[examType];

  if (packageId) {
    const query = supabase
      .from('questions')
      .select('*')
      .eq('package_id', packageId)
      .order('created_at');

    const { data } = await query;
    if (data && data.length > 0) {
      const mappedData = data.map((q) => ({
        ...q,
        points_a: q.points_a ?? 0,
        points_b: q.points_b ?? 0,
        points_c: q.points_c ?? 0,
        points_d: q.points_d ?? 0,
        points_e: q.points_e ?? 0,
      })) as Question[];

      const filtered = examType === 'FULL'
        ? mappedData
        : mappedData.filter((q) => q.category === examType);
        
      if (filtered.length > 0) return filtered.slice(0, config.questionCount);
    }
  }

  const mock = examType === 'FULL'
    ? mockQuestions
    : mockQuestions.filter((q) => q.category === examType);

  const mappedMock = mock.map((q) => ({
    ...q,
    points_a: (q as any).points_a ?? 0,
    points_b: (q as any).points_b ?? 0,
    points_c: (q as any).points_c ?? 0,
    points_d: (q as any).points_d ?? 0,
    points_e: (q as any).points_e ?? 0,
  })) as Question[];

  let padded = mappedMock;
  while (padded.length < config.questionCount) {
    padded = [...padded, ...padded].slice(0, config.questionCount);
  }
  return padded.slice(0, config.questionCount);
}

function buildSession(
  examType: ExamType,
  questions: Question[],
  pkg?: ExamPackage,
): ExamSession {
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

    case 'START_EXAM': {
      return { ...state, examSession: null, currentView: 'exam-engine' };
    }

    case 'RESUME_EXAM':
      return { ...state, examSession: action.payload, currentView: action.payload.status === 'completed' ? 'exam-results' : 'exam-engine' };

    case 'ANSWER_QUESTION': {
      if (!state.examSession) return state;
      const { questionId, answer } = action.payload;
      const dbResultId = (state.examSession as any).resultId;

      const updatedSession = {
        ...state.examSession,
        resultId: dbResultId, 
        answers: {
          ...state.examSession.answers,
          [questionId]: {
            ...state.examSession.answers[questionId],
            selectedAnswer: answer as import('../types').AnswerOption,
          },
        },
      };

      if (dbResultId) {
        const liveScores = calculateScores(updatedSession);
        
        // ✅ PERBAIKAN LOGIKA PASSING GRADE ADAPTIF
        const isPassed = 
          updatedSession.examType === 'FULL' ? (liveScores.twk >= 65 && liveScores.tiu >= 80 && liveScores.tkp >= 166) :
          updatedSession.examType === 'TWK'  ? (liveScores.twk >= 65) :
          updatedSession.examType === 'TIU'  ? (liveScores.tiu >= 80) :
          updatedSession.examType === 'TKP'  ? (liveScores.tkp >= 166) : false;

        // ✅ PERBAIKAN: Menghapus chain .from() ganda yang memicu duplikasi query database
        supabase
          .from('exam_results')
          .update({
            score_tiu: liveScores.tiu,
            score_twk: liveScores.twk,
            score_tkp: liveScores.tkp,
            total_score: liveScores.total,
            questions_correct: liveScores.correctCount,
            passed: isPassed,
            duration_seconds: Math.max(0, (EXAM_CONFIGS[updatedSession.examType].timeMinutes * 60) - updatedSession.timeRemaining)
          })
          .eq('id', dbResultId)
          .then(({ error }) => {
            if (error) console.error("Realtime Score Update Failed:", error);
          });
      }

      return { ...state, examSession: updatedSession };
    }

    case 'TOGGLE_MARK': {
      if (!state.examSession) return state;
      const qId = action.payload;
      const cur = state.examSession.answers[qId];
      const dbResultId = (state.examSession as any).resultId;
      return {
        ...state,
        examSession: {
          ...state.examSession,
          resultId: dbResultId,
          answers: { ...state.examSession.answers, [qId]: { ...cur, isMarked: !cur.isMarked } },
        },
      };
    }

    case 'NAVIGATE_QUESTION': {
      if (!state.examSession) return state;
      const dbResultId = (state.examSession as any).resultId;
      return { ...state, examSession: { ...state.examSession, resultId: dbResultId, currentQuestionIndex: action.payload } };
    }

    case 'RESTORE_TIMER': {
      if (!state.examSession) return state;
      const dbResultId = (state.examSession as any).resultId;
      return { ...state, examSession: { ...state.examSession, resultId: dbResultId, timeRemaining: action.payload } };
    }

    case 'TICK_TIMER': {
      if (!state.examSession || state.examSession.timeRemaining <= 0) return state;
      const newTime = state.examSession.timeRemaining - 1;
      const dbResultId = (state.examSession as any).resultId;
      
      if (newTime <= 0) {
        const scores = calculateScores(state.examSession);
        
        clearExamProgress(state.examSession.id);
        localStorage.removeItem('exam_active_session_id');

        if (dbResultId) {
          // ✅ PERBAIKAN LOGIKA PASSING GRADE ADAPTIF
          const isPassed = 
            state.examSession.examType === 'FULL' ? (scores.twk >= 65 && scores.tiu >= 80 && scores.tkp >= 166) :
            state.examSession.examType === 'TWK'  ? (scores.twk >= 65) :
            state.examSession.examType === 'TIU'  ? (scores.tiu >= 80) :
            state.examSession.examType === 'TKP'  ? (scores.tkp >= 166) : false;

          supabase
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
              duration_seconds: Math.max(0, (EXAM_CONFIGS[state.examSession.examType].timeMinutes * 60))
            })
            .eq('id', dbResultId)
            .then(({ error }) => {
              if (error) console.error("Gagal melakukan update otomatis batas waktu:", error);
            });
        }

        return {
          ...state,
          currentView: 'exam-results',
          examSession: { ...state.examSession, resultId: dbResultId, timeRemaining: 0, status: 'completed', completedAt: new Date(), scores },
        };
      }
      return { ...state, examSession: { ...state.examSession, resultId: dbResultId, timeRemaining: newTime } };
    }

    case 'SUBMIT_EXAM': {
      if (!state.examSession) return state;
      const scores = calculateScores(state.examSession);
      const dbResultId = (state.examSession as any).resultId;
      
      clearExamProgress(state.examSession.id);
      localStorage.removeItem('exam_active_session_id');
      
      if (dbResultId) {
        // ✅ PERBAIKAN LOGIKA PASSING GRADE ADAPTIF
        const isPassed = 
          state.examSession.examType === 'FULL' ? (scores.twk >= 65 && scores.tiu >= 80 && scores.tkp >= 166) :
          state.examSession.examType === 'TWK'  ? (scores.twk >= 65) :
          state.examSession.examType === 'TIU'  ? (scores.tiu >= 80) :
          state.examSession.examType === 'TKP'  ? (scores.tkp >= 166) : false;

        supabase
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
            duration_seconds: Math.max(0, (EXAM_CONFIGS[state.examSession.examType].timeMinutes * 60) - state.examSession.timeRemaining)
          })
          .eq('id', dbResultId)
          .then(({ error }) => {
            if (error) console.error("Gagal melakukan update akhir status COMPLETED:", error);
          });
      }

      return {
        ...state,
        currentView: 'exam-results',
        examSession: { 
          ...state.examSession, 
          resultId: dbResultId, 
          status: 'completed', 
          completedAt: new Date(), 
          scores 
        },
      };
    }

    case 'CLEAR_EXAM': {
      if (state.examSession) {
        clearExamProgress(state.examSession.id);
      } else {
        localStorage.removeItem('exam_active_session_id');
      }

      const isAdmin = state.profile?.role === 'admin' || state.profile?.role === 'super_admin';
      return { 
        ...state, 
        examSession: null, 
        reviewResultId: null, 
        currentView: isAdmin ? 'admin-dashboard' : 'participant-dashboard'
      };
    }

    case 'OPEN_REVIEW':
      return { ...state, reviewResultId: action.payload, currentView: 'exam-review' };

    case 'DELETE_EXAM_RESULT': {
      if (state.reviewResultId === action.payload) {
        return { ...state, reviewResultId: null };
      }
      return state;
    }

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
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  async function refreshProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      dispatch({ type: 'SET_PROFILE', payload: null });
      return;
    }
    try {
      const profile = await getProfile(user.id);
      if (profile) {
        dispatch({ type: 'SET_PROFILE', payload: profile as Profile });
      } else {
        dispatch({ type: 'SET_PROFILE', payload: null });
      }
    } catch {
      dispatch({ type: 'SET_PROFILE', payload: null });
    }
  }

  async function startExam(examType: ExamType, pkg?: ExamPackage) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      alert("Sesi login tidak valid. Silakan login kembali.");
      return;
    }

    dispatch({ type: 'START_EXAM', payload: { examType, pkg } });
    const questions = await fetchQuestionsForExam(examType, pkg?.id);
    const session = buildSession(examType, questions, pkg);

    try {
      const { data: insertedData, error } = await supabase
        .from('exam_results')
        .insert({
          participant_id: user.id, 
          user_name: state.profile?.full_name || user.email, 
          package_type: pkg?.package_type || examType, 
          package_id: pkg?.id || null,
          package_name: pkg?.name || 'Mini Tryout',
          score_tiu: 0,
          score_twk: 0,
          score_tkp: 0,
          total_score: 0,
          questions_total: questions.length,
          questions_correct: 0,
          passed: false,
          status: 'ON_PROGRESS',
        })
        .select()
        .single();

      if (error) throw error;

      const sessionWithResultId = {
        ...session,
        resultId: insertedData.id,
      };

      saveExamProgress(sessionWithResultId);
      dispatch({ type: 'RESUME_EXAM', payload: sessionWithResultId });

    } catch (err) {
      console.error("Gagal menginisialisasi sesi ujian di database:", err);
      dispatch({ type: 'RESUME_EXAM', payload: session });
    }
  }

  async function deleteHistory(resultId: string): Promise<boolean> {
    try {
      const { deleteExamResult } = await import('../lib/examPersistence');
      const res = await deleteExamResult(resultId);
      if (res.success) {
        dispatch({ type: 'DELETE_EXAM_RESULT', payload: resultId });
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const savedId = getActiveSessionId();
        if (savedId) {
          const saved = loadExamProgress(savedId);
          
          if (saved && (saved as any).status !== 'completed') {
            fetchQuestionsForExam(saved.examType, saved.packageId).then((questions) => {
              const restoredSession: ExamSession = {
                id: saved.sessionId,
                packageId: saved.packageId,
                packageName: saved.packageName,
                examType: saved.examType,
                questions,
                answers: saved.answers,
                currentQuestionIndex: saved.currentQuestionIndex,
                timeRemaining: saved.timeRemaining,
                status: 'in_progress',
                startedAt: new Date(saved.startedAt),
                resultId: (saved as any).resultId || undefined
              } as any;
              dispatch({ type: 'RESUME_EXAM', payload: restoredSession });
            });
          } else {
            localStorage.removeItem('exam_active_session_id');
          }
        }
        refreshProfile();
      } else {
        dispatch({ type: 'SET_AUTH_LOADING', payload: false });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        dispatch({ type: 'LOGOUT' });
        return;
      }
      if (event === 'SIGNED_IN' && session.user) {
        refreshProfile();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ✅ PEMBATASAN PERSISTENCE AUTO-SAVE KETAT AGAR TIDAK RE-TRIGGER SETELAH COMPLETED
  useEffect(() => {
    const session = state.examSession;
    if (!session || session.status === 'completed') return;

    if (session.status === 'in_progress') {
      saveExamProgress(session);
    }
  }, [state.examSession]);

  async function signOut() {
    await supabase.auth.signOut();
    dispatch({ type: 'LOGOUT' });
  }

  return (
    <AppContext.Provider value={{ state, dispatch, signOut, refreshProfile, startExam, deleteHistory }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
