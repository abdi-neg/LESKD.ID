import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { AppState, AppView, ExamSession, Profile, Question, ExamType, ExamPackage } from '../types';
import { mockQuestions, EXAM_CONFIGS } from '../data/mockData';
import { supabase, getProfile } from '../lib/supabase';
import {
  saveExamProgress,
  loadExamProgress,
  getActiveSessionId,
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
  | { type: 'DELETE_EXAM_RESULT'; payload: string }; // 🚀 REGISTERED: Aksi hapus riwayat

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
    } else {
      const pts = answer.selectedAnswer === q.correct_answer ? 5 : 0;
      if (q.category === 'TIU') tiu += pts;
      else twk += pts;
    }
  });
  return { tiu, twk, tkp, total: tiu + twk + tkp };
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
      return { ...initialState, authLoading: false };

    case 'SET_VIEW':
      return { ...state, currentView: action.payload };

    case 'START_EXAM': {
      const { examType, pkg } = action.payload;
      const config = EXAM_CONFIGS[examType];
      const mock = examType === 'FULL'
        ? mockQuestions
        : mockQuestions.filter((q) => q.category === examType);
      let padded = mock;
      while (padded.length < config.questionCount) {
        padded = [...padded, ...padded].slice(0, config.questionCount);
      }
      const session = buildSession(examType, padded.slice(0, config.questionCount), pkg);
      return { ...state, examSession: session, currentView: 'exam-engine' };
    }

    case 'RESUME_EXAM':
      return { ...state, examSession: action.payload, currentView: 'exam-engine' };

    case 'ANSWER_QUESTION': {
      if (!state.examSession) return state;
      const { questionId, answer } = action.payload;
      return {
        ...state,
        examSession: {
          ...state.examSession,
          answers: {
            ...state.examSession.answers,
            [questionId]: {
              ...state.examSession.answers[questionId],
              selectedAnswer: answer as import('../types').AnswerOption,
            },
          },
        },
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

    case 'NAVIGATE_QUESTION': {
      if (!state.examSession) return state;
      return { ...state, examSession: { ...state.examSession, currentQuestionIndex: action.payload } };
    }

    case 'RESTORE_TIMER': {
      if (!state.examSession) return state;
      return { ...state, examSession: { ...state.examSession, timeRemaining: action.payload } };
    }

    case 'TICK_TIMER': {
      if (!state.examSession || state.examSession.timeRemaining <= 0) return state;
      const newTime = state.examSession.timeRemaining - 1;
      if (newTime <= 0) {
        const scores = calculateScores(state.examSession);
        return {
          ...state,
          currentView: 'exam-results',
          examSession: { ...state.examSession, timeRemaining: 0, status: 'completed', completedAt: new Date(), scores },
        };
      }
      return { ...state, examSession: { ...state.examSession, timeRemaining: newTime } };
    }

    case 'SUBMIT_EXAM': {
      if (!state.examSession) return state;
      const scores = calculateScores(state.examSession);
      return {
        ...state,
        currentView: 'exam-results',
        examSession: { ...state.examSession, status: 'completed', completedAt: new Date(), scores },
      };
    }

    case 'CLEAR_EXAM': {
      // Cek peran user yang sedang login saat ini
      const isAdmin = state.profile?.role === 'admin' || state.profile?.role === 'super_admin';
      return { 
        ...state, 
        examSession: null, 
        reviewResultId: null, // sekalian bersihkan id review-nya
        currentView: isAdmin ? 'admin-dashboard' : 'participant-dashboard' // 👈 Kembali ke tempat yang benar!
      };
    }

    case 'OPEN_REVIEW':
      return { ...state, reviewResultId: action.payload, currentView: 'exam-review' };

    case 'DELETE_EXAM_RESULT': {
      // Membersihkan ID review aktif jika riwayat tersebut sedang dibuka/dihapus
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
  deleteHistory: (resultId: string) => Promise<boolean>; // 🚀 REGISTERED: Method kontraktual
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
    const questions = await fetchQuestionsForExam(examType, pkg?.id);
    const session = buildSession(examType, questions, pkg);
    dispatch({ type: 'RESUME_EXAM', payload: session });
  }

  // 🚀 CORE FUNCTION: Fungsi eksekutor penghapus riwayat ujian
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
          if (saved) {
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
              };
              dispatch({ type: 'RESUME_EXAM', payload: restoredSession });
            });
          }
        }
        refreshProfile();
      } else {
        dispatch({ type: 'SET_AUTH_LOADING', payload: false });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      (() => {
        if (event === 'SIGNED_OUT' || !session) {
          dispatch({ type: 'LOGOUT' });
          return;
        }
        if (event === 'SIGNED_IN' && session.user) {
          refreshProfile();
        }
      })();
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const session = state.examSession;
    if (!session) return;

    if (session.status === 'in_progress' || session.status === 'completed') {
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
