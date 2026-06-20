import { createContext, useContext, useReducer, useEffect, ReactNode, useState, useCallback } from 'react';
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

let isStartingExam = false;

export function packageTypeToExamType(pt: string): ExamType {
  if (pt === 'MINI_TIU') return 'TIU';
  if (pt === 'MINI_TWK') return 'TWK';
  if (pt === 'MINI_TKP') return 'TKP';
  return 'FULL';
}

async function fetchQuestionsForExam(examType: ExamType, packageId?: string): Promise<Question[]> {
  const config = EXAM_CONFIGS[examType];
  
  const categoryWeight: Record<string, number> = {
    'TWK': 1,
    'TIU': 2,
    'TKP': 3 
  };

  const sortSKD = (a: Question, b: Question) => {
    const weightA = categoryWeight[a.category?.toUpperCase()] || 99;
    const weightB = categoryWeight[b.category?.toUpperCase()] || 99;
    return weightA - weightB; 
  };

  if (packageId) {
    const { data } = await supabase.from('questions').select('*').eq('package_id', packageId).order('created_at');
    if (data && data.length > 0) {
      const mappedData = data.map((q) => {
        const verifiedSub = q.sub_category || q.sub_kategori || q.SUB_KATEGORI || (q as any).sub_Kategori || 'Umum';
        return {
          ...q,
          sub_category: verifiedSub,
          sub_kategori: verifiedSub,
          points_a: q.points_a ?? 0,
          points_b: q.points_b ?? 0,
          points_c: q.points_c ?? 0,
          points_d: q.points_d ?? 0,
          points_e: q.points_e ?? 0,
        };
      }) as Question[];
      
      const filtered = examType === 'FULL' ? mappedData : mappedData.filter((q) => q.category === examType);
      if (filtered.length > 0) {
        return [...filtered.slice(0, config.questionCount)].sort(sortSKD);
      }
    }
  }

  const mock = examType === 'FULL' ? mockQuestions : mockQuestions.filter((q) => q.category === examType);
  const mappedMock = mock.map((q) => {
    const verifiedSub = (q as any).sub_category || (q as any).sub_kategori || (q as any).SUB_KATEGORI || 'Umum';
    return {
      ...q,
      sub_category: verifiedSub,
      sub_kategori: verifiedSub,
      points_a: (q as any).points_a ?? 0,
      points_b: (q as any).points_b ?? 0,
      points_c: (q as any).points_c ?? 0,
      points_d: (q as any).points_d ?? 0,
      points_e: (q as any).points_e ?? 0,
    };
  }) as Question[];
  
  let padded = mappedMock;
  while (padded.length < config.questionCount) { padded = [...padded, ...padded].slice(0, config.questionCount); }
  
  return [...padded.slice(0, config.questionCount)].sort(sortSKD);
}

function buildSession(examType: ExamType, questions: Question[], pkg?: ExamPackage): ExamSession {
  const config = EXAM_CONFIGS[examType];
  const answers: ExamSession['answers'] = {};
  const securedQuestions = questions.map((q) => {
    const verifiedSub = q.sub_category || q.sub_kategori || q.SUB_KATEGORI || 'Umum';
    return {
      ...q,
      sub_category: verifiedSub,
      sub_kategori: verifiedSub,
      points_a: (q as any).points_a ?? 0,
      points_b: (q as any).points_b ?? 0,
      points_c: (q as any).points_c ?? 0,
      points_d: (q as any).points_d ?? 0,
      points_e: (q as any).points_e ?? 0,
    };
  }) as Question[];

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
      
      const savedView = localStorage.getItem('leskd_saved_view') as AppView | null;
      const savedReviewId = localStorage.getItem('leskd_saved_review_id');
      
      const examActive = state.currentView === 'exam-engine' || state.currentView === 'exam-results';
      let targetView = examActive ? state.currentView : getViewForProfile(action.payload);
      
      if (!action.payload.is_approved) {
        targetView = 'waiting-room';
      } else if (!examActive && savedView && savedView !== 'landing') {
        targetView = savedView;
      }

      return {
        ...state,
        profile: action.payload,
        authLoading: false,
        currentView: targetView,
        reviewResultId: savedReviewId || state.reviewResultId,
      };
    }
    case 'LOGOUT':
      localStorage.removeItem('exam_active_session_id');
      localStorage.removeItem('active_db_result_id'); 
      localStorage.removeItem('leskd_saved_view');
      localStorage.removeItem('leskd_saved_review_id');
      return { ...initialState, authLoading: false };
    case 'SET_VIEW':
      return { ...state, currentView: action.payload };
    case 'START_EXAM':
      return { ...state, examSession: null, currentView: 'exam-engine' };
    case 'RESUME_EXAM': {
      if (!action.payload) return state;
      return { 
        ...state, 
        examSession: action.payload, 
        currentView: action.payload.status === 'completed' ? 'exam-results' : 'exam-engine' 
      };
    }
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
      localStorage.removeItem('active_db_result_id'); 
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
  submitExamSession: (diagnosticBreakdown?: any) => Promise<void>;
  examHistory: any[];
  fetchUserExamHistory: () => Promise<void>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [isSyncLocked, setIsSyncLocked] = useState(false);
  const [examHistory, setExamHistory] = useState<any[]>([]);

  async function signOut() {
    try {
      await supabase.auth.signOut();
      dispatch({ type: 'LOGOUT' });
    } catch (err) {
      console.error("Gagal melakukan proses log out:", err);
    }
  }

  const fetchUserExamHistory = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('exam_results')
        .select('*')
        .eq('participant_id', user.id)
        .order('completed_at', { ascending: false });

      if (error) throw error;
      let finalRecords = data || [];

      if (finalRecords.length === 0 && user.email) {
        const { data: fallbackEmail } = await supabase
          .from('exam_results')
          .select('*')
          .eq('user_name', user.email)
          .order('completed_at', { ascending: false });
        
        if (fallbackEmail && fallbackEmail.length > 0) {
          finalRecords = fallbackEmail;
        }
      }

      if (finalRecords.length === 0) {
        const profileName = state.profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name;
        if (profileName) {
          const { data: fallbackName } = await supabase
            .from('exam_results')
            .select('*')
            .eq('user_name', profileName)
            .order('completed_at', { ascending: false });
          
          if (fallbackName && fallbackName.length > 0) {
            finalRecords = fallbackName;
          }
        }
      }

      const safeCompletedRecords = finalRecords.filter((r) => {
        if (r.status === 'in_progress') return false;
        return (
          r.status === 'completed' || 
          r.status === 'selesai' || 
          r.status === null || 
          (r.total_score !== undefined && r.total_score !== null)
        );
      });

      setExamHistory(safeCompletedRecords);
    } catch (err) {
      console.error("Gagal memuat riwayat ujian:", err);
    }
  }, [state.profile?.full_name]);

  useEffect(() => {
    if (state.currentView && state.currentView !== 'landing') {
      localStorage.setItem('leskd_saved_view', state.currentView);
    }
    if (state.reviewResultId) {
      localStorage.setItem('leskd_saved_review_id', state.reviewResultId);
    } else {
      localStorage.removeItem('leskd_saved_review_id');
    }
  }, [state.currentView, state.reviewResultId]);

  // ─── 🌟 AUTO-SAVE JAWABAN & SKOR KE DATABASE ───
  useEffect(() => {
    const session = state.examSession;
    if (!session || session.status === 'completed' || isSyncLocked) return;

    if (session.status === 'in_progress') {
      saveExamProgress(session);

      const dbResultId = (session as any).resultId || localStorage.getItem('active_db_result_id');
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
  }, [state.examSession?.answers, state.examSession?.status, isSyncLocked]);

  // ─── 🌟 DISUNTIKKAN FITUR EMAS PERBAIKAN: Kunci sisa waktu ke localStorage setiap detik timer berdetak ───
  useEffect(() => {
    const session = state.examSession;
    if (session && session.status === 'in_progress') {
      saveExamProgress(session);
    }
  }, [state.examSession?.timeRemaining]);

  useEffect(() => {
    if (!state.examSession || state.examSession.status !== 'in_progress') return;
    const timer = setInterval(() => {
      dispatch({ type: 'TICK_TIMER' });
    }, 1000);
    return () => clearInterval(timer);
  }, [state.examSession?.status, state.examSession?.id]);

  useEffect(() => {
    if (
      state.examSession && 
      state.examSession.status === 'in_progress' && 
      state.examSession.timeRemaining <= 0
    ) {
      submitExamSession();
    }
  }, [state.examSession?.timeRemaining, state.examSession?.status]);

  async function refreshProfile(retries = 3) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { dispatch({ type: 'SET_PROFILE', payload: null }); return; }
    try {
      let profile = await getProfile(user.id);
      let attempts = 0;
      while (!profile && attempts < retries) {
        await new Promise(resolve => setTimeout(resolve, 600));
        profile = await getProfile(user.id);
        attempts++;
      }
      dispatch({ type: 'SET_PROFILE', payload: profile ? (profile as Profile) : null });
    } catch { 
      dispatch({ type: 'SET_PROFILE', payload: null }); 
    }
  }

  async function startExam(examType: ExamType, pkg?: ExamPackage) {
    if (isStartingExam) return;

    try {
      isStartingExam = true;
      setIsSyncLocked(false); 
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { alert("Sesi login tidak valid."); return; }

      const questions = await fetchQuestionsForExam(examType, pkg?.id);
      if (!questions || questions.length === 0) {
        alert("Gagal memuat kumpulan soal ujian.");
        return;
      }
      
      const session = buildSession(examType, questions, pkg);

      await supabase
        .from('exam_results')
        .delete()
        .eq('participant_id', user.id)
        .eq('status', 'in_progress');

      const { data: newRow, error: insertErr } = await supabase
        .from('exam_results')
        .insert({
          participant_id: user.id,
          user_name: state.profile?.full_name || user.email, 
          package_type: pkg?.package_type || examType,
          package_id: pkg?.id || null,
          package_name: pkg?.name || 'Tryout Full SKD',
          score_tiu: 0, score_twk: 0, score_tkp: 0, total_score: 0,
          questions_total: questions.length, questions_correct: 0,
          passed: false, 
          status: 'in_progress',
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (insertErr) throw insertErr;
      const finalDbRow = newRow;

      const sessionWithResultId = { 
        ...session, 
        resultId: finalDbRow.id,
        userName: state.profile?.full_name || user.email,
        packageType: pkg?.package_type || examType
      };

      localStorage.setItem('active_db_result_id', finalDbRow.id);
      saveExamProgress(sessionWithResultId);
      dispatch({ type: 'RESUME_EXAM', payload: sessionWithResultId });

    } catch (err) {
      console.error("Gagal menginisialisasi sesi ujian:", err);
      dispatch({ type: 'CLEAR_EXAM' });
      alert("Terjadi kendala jaringan saat memuat sesi tryout baru.");
    } finally {
      isStartingExam = false;
    }
  }

  async function submitExamSession(diagnosticBreakdown?: any) {
    const session = state.examSession;
    if (!session || isSyncLocked) return;

    const dbResultId = (session as any).resultId || localStorage.getItem('active_db_result_id');
    if (!dbResultId) {
      alert("Sesi ID database hilang. Silakan kembali ke dashboard.");
      return;
    }

    try {
      setIsSyncLocked(true);
      const scores = calculateScores(session);
      const isPassed = checkPassedStatus(session.examType, scores);
      
      const snapshotPayload = {
        questions: session.questions,
        answers: session.answers
      };

      let finalDiagnostic = diagnosticBreakdown;
      if (!finalDiagnostic) {
        const breakdown: Record<string, { correct: number; total: number; percentage: number }> = {};
        session.questions.forEach((q) => {
          const subCat = q.sub_category || q.sub_kategori || (q as any).SUB_KATEGORI || 'Umum';
          const userAnswer = session.answers[q.id];
          const selected = userAnswer?.selectedAnswer;

          if (!breakdown[subCat]) {
            breakdown[subCat] = { correct: 0, total: 0, percentage: 0 };
          }

          if (q.category === 'TKP') {
            const points = selected ? (q as any)[`points_${selected.toLowerCase()}`] || 0 : 0;
            breakdown[subCat].correct += points;
            breakdown[subCat].total += 5;
          } else {
            const isCorrect = selected === q.correct_answer;
            breakdown[subCat].correct += isCorrect ? 1 : 0;
            breakdown[subCat].total += 1;
          }
        });

        Object.keys(breakdown).forEach((key) => {
          const item = breakdown[key];
          item.percentage = item.total > 0 ? Math.round((item.correct / item.total) * 100) : 0;
        });
        finalDiagnostic = breakdown;
      }
      
      const { error } = await supabase
        .from('exam_results')
        .update({
          score_tiu: scores.tiu,
          score_twk: scores.twk,
          score_tkp: scores.tkp,
          total_score: scores.total,
          questions_correct: scores.correctCount,
          passed: isPassed,
          status: 'completed', 
          completed_at: new Date().toISOString(),
          duration_seconds: Math.max(0, (EXAM_CONFIGS[session.examType].timeMinutes * 60) - session.timeRemaining),
          review_snapshot: JSON.stringify(snapshotPayload),
          diagnostic_breakdown: finalDiagnostic
        })
        .eq('id', dbResultId);

      if (error) throw error;

      await fetchUserExamHistory();
      clearExamProgress(session.id);
      
      localStorage.removeItem('exam_active_session_id');
      localStorage.removeItem('active_db_result_id'); 

      const completedSession: ExamSession = {
        ...session,
        status: 'completed',
        completedAt: new Date(),
        scores
      };

      dispatch({ type: 'FINALIZE_EXAM_STORE', payload: completedSession });

    } catch (err) {
      console.error("Terjadi kegagalan submit:", err);
      setIsSyncLocked(false); 
      alert("Gagal mengirimkan lembar jawaban ke server. Silakan coba klik submit kembali.");
    }
  }

  async function deleteHistory(resultId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('exam_results')
        .delete()
        .eq('id', resultId);

      if (!error) { 
        dispatch({ type: 'DELETE_EXAM_RESULT', payload: resultId }); 
        setExamHistory((prev) => prev.filter((item) => item.id !== resultId));
        return true; 
      }
      return false;
    } catch { return false; }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const savedId = getActiveSessionId();
        if (savedId) {
          const saved = loadExamProgress(savedId);
          if (saved && (saved as any).status !== 'completed') {
            const backupResultId = localStorage.getItem('active_db_result_id') || undefined;

            fetchQuestionsForExam(saved.examType, saved.packageId).then((questions) => {
              dispatch({
                type: 'RESUME_EXAM',
                payload: {
                  id: saved.sessionId, packageId: saved.packageId, packageName: saved.packageName,
                  examType: saved.examType, questions, answers: saved.answers,
                  currentQuestionIndex: saved.currentQuestionIndex, timeRemaining: saved.timeRemaining,
                  status: 'in_progress', startedAt: new Date(saved.startedAt), 
                  resultId: (saved as any).resultId || backupResultId || undefined 
                } as any
              });
            });
          } else { 
            localStorage.removeItem('exam_active_session_id'); 
            localStorage.removeItem('active_db_result_id');
          }
        }
        refreshProfile();
        fetchUserExamHistory();
      } else { dispatch({ type: 'SET_AUTH_LOADING', payload: false }); }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) { dispatch({ type: 'LOGOUT' }); setExamHistory([]); return; }
      if (event === 'SIGNED_IN' && session.user) {
        refreshProfile();
        fetchUserExamHistory(); 
      }
    });
    return () => subscription.unsubscribe();
  }, [fetchUserExamHistory]);

  return (
    <AppContext.Provider value={{ 
      state, dispatch, signOut, refreshProfile, startExam, deleteHistory, submitExamSession,
      examHistory, fetchUserExamHistory 
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
