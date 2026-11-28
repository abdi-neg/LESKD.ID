import { createContext, useContext, useReducer, useEffect, ReactNode, useState, useCallback, useRef } from 'react';
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

const ACTIVE_INITIAL_SECONDS_KEY = 'active_exam_initial_seconds';
let isStartingExam = false;

export function packageTypeToExamType(pt: string): ExamType {
  const norm = (pt || '').toUpperCase();
  if (norm === 'MINI_TIU' || norm === 'TIU') return 'TIU';
  if (norm === 'MINI_TWK' || norm === 'TWK') return 'TWK';
  if (norm === 'MINI_TKP' || norm === 'TKP') return 'TKP';
  return 'FULL';
}

function resolveInitialSeconds(
  examType: ExamType,
  questionsCount: number,
  packageType?: string,
  durationMinutes?: number | null,
  savedInitialSeconds?: number | null
): number {
  if (savedInitialSeconds && savedInitialSeconds > 0) {
    return savedInitialSeconds;
  }
  if (durationMinutes && durationMinutes > 0) {
    return durationMinutes * 60;
  }
  const config = EXAM_CONFIGS[examType] || EXAM_CONFIGS.FULL;
  const isSubKategori = packageType?.toUpperCase() === 'TO_SUBKATEGORI';
  const fallbackMinutes = isSubKategori ? Math.max(20, questionsCount) : config.timeMinutes;
  return fallbackMinutes * 60;
}

function computeWallClockRemaining(startedAt: Date | string | undefined, initialSeconds: number): number {
  if (!startedAt) return initialSeconds;
  const startMs = new Date(startedAt).getTime();
  if (Number.isNaN(startMs)) return initialSeconds;
  const elapsed = Math.max(0, Math.floor((Date.now() - startMs) / 1000));
  return Math.max(0, initialSeconds - elapsed);
}

function clearLocalExamArtifacts(sessionId?: string | null) {
  if (sessionId) {
    clearExamProgress(sessionId);
  } else {
    localStorage.removeItem('exam_active_session_id');
  }
  localStorage.removeItem('active_db_result_id');
  localStorage.removeItem(ACTIVE_INITIAL_SECONDS_KEY);

  const savedView = localStorage.getItem('leskd_saved_view');
  if (savedView === 'exam-engine' || savedView === 'exam-results') {
    localStorage.removeItem('leskd_saved_view');
  }
}

// Deteksi kategori otomatis untuk paket TO_SUBKATEGORI berdasarkan isi soalnya
function resolveEffectiveExamType(defaultType: ExamType, questions: Question[], packageType?: string): ExamType {
  if (packageType?.toUpperCase() !== 'TO_SUBKATEGORI' || questions.length === 0) {
    return defaultType;
  }
  const categories = new Set(questions.map((q) => q.category?.toUpperCase()).filter(Boolean));
  if (categories.size === 1) {
    const singleCat = Array.from(categories)[0];
    if (singleCat === 'TWK' || singleCat === 'TIU' || singleCat === 'TKP') {
      return singleCat as ExamType;
    }
  }
  return defaultType;
}

async function fetchQuestionsForExam(examType: ExamType, packageId?: string, packageType?: string): Promise<Question[]> {
  const config = EXAM_CONFIGS[examType] || EXAM_CONFIGS.FULL;
  const isSubKategori = packageType?.toUpperCase() === 'TO_SUBKATEGORI';

  const categoryWeight: Record<string, number> = {
    TWK: 1,
    TIU: 2,
    TKP: 3,
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
          image_url: q.image_url ?? null,
          explanation_image_url: q.explanation_image_url ?? null,
          option_a_image: q.option_a_image ?? null,
          option_b_image: q.option_b_image ?? null,
          option_c_image: q.option_c_image ?? null,
          option_d_image: q.option_d_image ?? null,
          option_e_image: q.option_e_image ?? null,
        };
      }) as Question[];

      const filtered = (examType === 'FULL' || isSubKategori)
        ? mappedData
        : mappedData.filter((q) => q.category?.toUpperCase() === examType);

      const finalQuestions = filtered.length > 0 ? filtered : mappedData;
      const sliceLimit = isSubKategori ? finalQuestions.length : Math.max(config.questionCount, finalQuestions.length);

      return [...finalQuestions.slice(0, sliceLimit)].sort(sortSKD);
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
      image_url: (q as any).image_url ?? null,
      explanation_image_url: (q as any).explanation_image_url ?? null,
    };
  }) as Question[];

  let padded = mappedMock;
  while (padded.length < config.questionCount) {
    padded = [...padded, ...padded].slice(0, config.questionCount);
  }

  return [...padded.slice(0, config.questionCount)].sort(sortSKD);
}

function buildSession(examType: ExamType, questions: Question[], pkg?: ExamPackage): ExamSession {
  const effectiveExamType = resolveEffectiveExamType(examType, questions, pkg?.package_type);
  const initialSeconds = resolveInitialSeconds(
    effectiveExamType,
    questions.length,
    pkg?.package_type,
    pkg?.duration_minutes
  );

  const answers: ExamSession['answers'] = {};
  const securedQuestions = questions.map((q) => {
    const verifiedSub = q.sub_category || (q as any).sub_kategori || (q as any).SUB_KATEGORI || 'Umum';
    return {
      ...q,
      sub_category: verifiedSub,
      sub_kategori: verifiedSub,
      points_a: (q as any).points_a ?? 0,
      points_b: (q as any).points_b ?? 0,
      points_c: (q as any).points_c ?? 0,
      points_d: (q as any).points_d ?? 0,
      points_e: (q as any).points_e ?? 0,
      image_url: (q as any).image_url ?? null,
      explanation_image_url: (q as any).explanation_image_url ?? null,
      option_a_image: (q as any).option_a_image ?? null,
      option_b_image: (q as any).option_b_image ?? null,
      option_c_image: (q as any).option_c_image ?? null,
      option_d_image: (q as any).option_d_image ?? null,
      option_e_image: (q as any).option_e_image ?? null,
    };
  }) as Question[];

  securedQuestions.forEach((q) => {
    answers[q.id] = { questionId: q.id, selectedAnswer: null, isMarked: false };
  });

  return {
    id: crypto.randomUUID(),
    packageId: pkg?.id,
    packageName: pkg?.name,
    examType: effectiveExamType,
    questions: securedQuestions,
    answers,
    currentQuestionIndex: 0,
    timeRemaining: initialSeconds,
    initialTimeSeconds: initialSeconds,
    status: 'in_progress',
    startedAt: new Date(),
  } as ExamSession;
}

function calculateScores(session: ExamSession) {
  let tiu = 0, twk = 0, tkp = 0;
  let correctCount = 0;
  session.questions.forEach((q) => {
    const answer = session.answers[q.id];
    if (!answer?.selectedAnswer) return;

    if (q.category === 'TKP') {
      const selected = answer.selectedAnswer.toLowerCase().trim();
      let points = 0;
      if (selected === 'a') points = Number((q as any).points_a ?? 0);
      else if (selected === 'b') points = Number((q as any).points_b ?? 0);
      else if (selected === 'c') points = Number((q as any).points_c ?? 0);
      else if (selected === 'd') points = Number((q as any).points_d ?? 0);
      else if (selected === 'e') points = Number((q as any).points_e ?? 0);
      tkp += points;
      if (points > 0) correctCount++;
    } else {
      const userAns = answer.selectedAnswer.toUpperCase().trim();
      const trueAns = (q.correct_answer || '').toUpperCase().trim();
      const pts = userAns === trueAns ? 5 : 0;

      if (pts > 0) correctCount++;
      if (q.category === 'TIU') tiu += pts;
      else twk += pts;
    }
  });
  return { tiu, twk, tkp, total: tiu + twk + tkp, correctCount };
}

// Evaluasi Passing Grade untuk Tryout Standar & Proporsional TO_SUBKATEGORI
function checkPassedStatus(examType: ExamType, scores: { tiu: number; twk: number; tkp: number }, session?: ExamSession) {
  const pkgType = (session as any)?.packageType?.toUpperCase();

  if (pkgType === 'TO_SUBKATEGORI' && session?.questions && session.questions.length > 0) {
    const twkCount = session.questions.filter((q) => q.category?.toUpperCase() === 'TWK').length;
    const tiuCount = session.questions.filter((q) => q.category?.toUpperCase() === 'TIU').length;
    const tkpCount = session.questions.filter((q) => q.category?.toUpperCase() === 'TKP').length;

    let passed = true;
    if (twkCount > 0) {
      const minTwk = twkCount >= 20 ? 65 : Math.ceil(twkCount * 5 * 0.65);
      if (scores.twk < minTwk) passed = false;
    }
    if (tiuCount > 0) {
      const minTiu = tiuCount >= 25 ? 80 : Math.ceil(tiuCount * 5 * 0.65);
      if (scores.tiu < minTiu) passed = false;
    }
    if (tkpCount > 0) {
      const minTkp = tkpCount >= 45 ? 166 : Math.ceil(tkpCount * 5 * (166 / 225));
      if (scores.tkp < minTkp) passed = false;
    }
    return passed;
  }

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
      } else if (
        !examActive &&
        savedView &&
        savedView !== 'landing' &&
        savedView !== 'exam-engine' &&
        savedView !== 'exam-results'
      ) {
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
      clearLocalExamArtifacts(state.examSession?.id);
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
        currentView: action.payload.status === 'completed' ? 'exam-results' : 'exam-engine',
      };
    }
    case 'ANSWER_QUESTION': {
      if (!state.examSession) return state;
      return {
        ...state,
        examSession: { ...state.examSession, answers: action.payload.answers },
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
      return state.examSession
        ? { ...state, examSession: { ...state.examSession, currentQuestionIndex: action.payload } }
        : state;
    case 'RESTORE_TIMER':
      return state.examSession
        ? { ...state, examSession: { ...state.examSession, timeRemaining: action.payload } }
        : state;
    case 'TICK_TIMER': {
      if (!state.examSession || state.examSession.status !== 'in_progress') return state;
      const initialSec = (state.examSession as any).initialTimeSeconds;
      const nextRemaining =
        typeof initialSec === 'number' && initialSec > 0 && state.examSession.startedAt
          ? computeWallClockRemaining(state.examSession.startedAt, initialSec)
          : Math.max(0, state.examSession.timeRemaining - 1);

      if (nextRemaining === state.examSession.timeRemaining) return state;
      return { ...state, examSession: { ...state.examSession, timeRemaining: nextRemaining } };
    }
    case 'FINALIZE_EXAM_STORE': {
      return {
        ...state,
        currentView: 'exam-results',
        examSession: action.payload,
      };
    }
    case 'CLEAR_EXAM': {
      clearLocalExamArtifacts(state.examSession?.id);
      const isAdmin = state.profile?.role === 'admin' || state.profile?.role === 'super_admin';
      return {
        ...state,
        examSession: null,
        reviewResultId: null,
        currentView: isAdmin ? 'admin-dashboard' : 'participant-dashboard',
      };
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
  fetchExamSnapshot: (resultId: string) => Promise<any | null>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const [isSyncLocked, setIsSyncLocked] = useState(false);
  const [examHistory, setExamHistory] = useState<any[]>([]);
  const isSubmittingRef = useRef(false);

  async function signOut() {
    try {
      await supabase.auth.signOut();
      dispatch({ type: 'LOGOUT' });
    } catch (err) {
      console.error('Gagal melakukan proses log out:', err);
    }
  }

  const fetchExamSnapshot = useCallback(async (resultId: string) => {
    try {
      const { data, error } = await supabase
        .from('exam_results')
        .select('review_snapshot, diagnostic_breakdown')
        .eq('id', resultId)
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('Gagal memuat detail snapshot:', err);
      return null;
    }
  }, []);

  // Filter status in_progress langsung di level database + tanpa kueri fallback user_name
  const fetchUserExamHistory = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const SAFE_COLUMNS =
        'id, participant_id, user_name, package_type, package_id, package_name, score_tiu, score_twk, score_tkp, total_score, questions_total, questions_correct, passed, status, started_at, completed_at, duration_seconds';

      const { data, error } = await supabase
        .from('exam_results')
        .select(SAFE_COLUMNS)
        .eq('participant_id', user.id)
        .or('status.neq.in_progress,status.is.null')
        .order('completed_at', { ascending: false });

      if (error) throw error;

      const safeCompletedRecords = (data || []).filter((r) => {
        const normStatus = String(r.status ?? '').toLowerCase().trim();
        if (normStatus === 'in_progress' || normStatus === 'abandoned') return false;
        return (
          normStatus === 'completed' ||
          normStatus === 'selesai' ||
          r.status === null ||
          (r.total_score !== undefined && r.total_score !== null)
        );
      });

      setExamHistory(safeCompletedRecords);
    } catch (err) {
      console.error('Gagal memuat riwayat ujian:', err);
    }
  }, []);

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

  // Sinkronisasi skor live setiap kali peserta menjawab (terkunci khusus status in_progress)
  useEffect(() => {
    const session = state.examSession;
    if (!session || session.status === 'completed' || isSyncLocked) return;

    if (session.status === 'in_progress') {
      saveExamProgress(session);

      const dbResultId = (session as any).resultId || localStorage.getItem('active_db_result_id');
      if (dbResultId) {
        const liveScores = calculateScores(session);
        const isPassed = checkPassedStatus(session.examType, liveScores, session);

        const initialSec = resolveInitialSeconds(
          session.examType,
          session.questions.length,
          (session as any).packageType,
          null,
          (session as any).initialTimeSeconds
        );
        const startedTimeMs = session.startedAt ? new Date(session.startedAt).getTime() : Date.now();
        const elapsedFromStart = Math.max(0, Math.floor((Date.now() - startedTimeMs) / 1000));
        const durationUsed = Math.min(initialSec, elapsedFromStart);

        supabase
          .from('exam_results')
          .update({
            score_tiu: liveScores.tiu,
            score_twk: liveScores.twk,
            score_tkp: liveScores.tkp,
            total_score: liveScores.total,
            questions_correct: liveScores.correctCount,
            passed: isPassed,
            duration_seconds: durationUsed,
          })
          .eq('id', dbResultId)
          .eq('status', 'in_progress')
          .then(({ error }) => {
            if (error) console.error('Realtime Sync Error:', error);
          });
      }
    }
  }, [state.examSession?.answers, state.examSession?.status, isSyncLocked]);

  useEffect(() => {
    const session = state.examSession;
    if (session && session.status === 'in_progress') {
      saveExamProgress(session);
    }
  }, [state.examSession?.timeRemaining, state.examSession?.answers]);

  // Timer berbasis waktu nyata + langsung sinkron ketika tab HP/browser kembali aktif
  useEffect(() => {
    if (!state.examSession || state.examSession.status !== 'in_progress') return;

    const timer = setInterval(() => {
      dispatch({ type: 'TICK_TIMER' });
    }, 1000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        dispatch({ type: 'TICK_TIMER' });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [state.examSession?.status, state.examSession?.id]);

  useEffect(() => {
    if (
      state.examSession &&
      state.examSession.status === 'in_progress' &&
      state.examSession.timeRemaining <= 0 &&
      !isSyncLocked &&
      !isSubmittingRef.current
    ) {
      submitExamSession();
    }
  }, [state.examSession?.timeRemaining, state.examSession?.status, isSyncLocked]);

  const refreshProfile = useCallback(async (retries = 3) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      dispatch({ type: 'SET_PROFILE', payload: null });
      return;
    }
    try {
      let profile = await getProfile(user.id);
      let attempts = 0;
      while (!profile && attempts < retries) {
        await new Promise((resolve) => setTimeout(resolve, 600));
        profile = await getProfile(user.id);
        attempts++;
      }
      dispatch({ type: 'SET_PROFILE', payload: profile ? (profile as Profile) : null });
    } catch {
      dispatch({ type: 'SET_PROFILE', payload: null });
    }
  }, []);

  async function startExam(examType: ExamType, pkg?: ExamPackage) {
    if (isStartingExam) return;

    try {
      isStartingExam = true;
      isSubmittingRef.current = false;
      setIsSyncLocked(false);

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        alert('Sesi login tidak valid.');
        return;
      }

      const questions = await fetchQuestionsForExam(examType, pkg?.id, pkg?.package_type);
      if (!questions || questions.length === 0) {
        alert('Gagal memuat kumpulan soal ujian.');
        return;
      }

      const session = buildSession(examType, questions, pkg);

      // Bersihkan sisa sesi in_progress lama milik peserta ini sebelum memulai sesi baru
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
          score_tiu: 0,
          score_twk: 0,
          score_tkp: 0,
          total_score: 0,
          questions_total: questions.length,
          questions_correct: 0,
          passed: false,
          status: 'in_progress',
          started_at: session.startedAt ? new Date(session.startedAt).toISOString() : new Date().toISOString(),
        })
        .select()
        .single();

      if (insertErr) throw insertErr;
      const finalDbRow = newRow;

      const sessionWithResultId = {
        ...session,
        resultId: finalDbRow.id,
        userName: state.profile?.full_name || user.email,
        packageType: pkg?.package_type || examType,
      };

      localStorage.setItem('active_db_result_id', finalDbRow.id);
      localStorage.setItem(ACTIVE_INITIAL_SECONDS_KEY, String((session as any).initialTimeSeconds || session.timeRemaining));
      saveExamProgress(sessionWithResultId);
      dispatch({ type: 'RESUME_EXAM', payload: sessionWithResultId });
    } catch (err) {
      console.error('Gagal menginisialisasi sesi ujian:', err);
      dispatch({ type: 'CLEAR_EXAM' });
      alert('Terjadi kendala jaringan saat memuat sesi tryout baru.');
    } finally {
      isStartingExam = false;
    }
  }

  async function submitExamSession(diagnosticBreakdown?: any) {
    const session = state.examSession;
    if (!session || isSyncLocked || isSubmittingRef.current) return;

    const dbResultId = (session as any).resultId || localStorage.getItem('active_db_result_id');
    if (!dbResultId) {
      alert('Sesi ID database hilang. Silakan kembali ke dashboard.');
      return;
    }

    try {
      isSubmittingRef.current = true;
      setIsSyncLocked(true);

      const scores = calculateScores(session);
      const isPassed = checkPassedStatus(session.examType, scores, session);

      const injectedQuestions = session.questions.map((q) => {
        const finalSub = q.sub_category || (q as any).sub_kategori || (q as any).SUB_KATEGORI || 'Umum';
        return {
          ...q,
          sub_category: finalSub,
          sub_kategori: finalSub,
        };
      });

      const snapshotPayload = {
        questions: injectedQuestions,
        answers: session.answers,
      };

      let finalDiagnostic = diagnosticBreakdown;
      if (!finalDiagnostic) {
        const breakdown: Record<string, { correct: number; total: number; percentage: number }> = {};
        injectedQuestions.forEach((q) => {
          const subCat = q.sub_category || 'Umum';
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

      const initialSec = resolveInitialSeconds(
        session.examType,
        session.questions.length,
        (session as any).packageType,
        null,
        (session as any).initialTimeSeconds
      );
      const startedTimeMs = session.startedAt ? new Date(session.startedAt).getTime() : Date.now();
      const elapsedSeconds = Math.max(0, Math.floor((Date.now() - startedTimeMs) / 1000));
      const finalDurationSeconds = Math.min(initialSec, elapsedSeconds);

      const completedPayload = {
        score_tiu: scores.tiu,
        score_twk: scores.twk,
        score_tkp: scores.tkp,
        total_score: scores.total,
        questions_correct: scores.correctCount,
        passed: isPassed,
        status: 'completed',
        completed_at: new Date().toISOString(),
        duration_seconds: finalDurationSeconds,
        review_snapshot: JSON.stringify(snapshotPayload),
        diagnostic_breakdown: finalDiagnostic,
      };

      const { data: updatedRow, error } = await supabase
        .from('exam_results')
        .update(completedPayload)
        .eq('id', dbResultId)
        .select('id')
        .maybeSingle();

      if (error) throw error;

      // Pengaman anti silent-failure: jika baris in_progress terlanjur dibersihkan Admin,
      // simpan hasil akhir sebagai baris baru agar jawaban peserta tetap terekam aman.
      if (!updatedRow) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Sesi autentikasi tidak ditemukan saat menyimpan hasil.');

        const { error: fallbackInsertErr } = await supabase
          .from('exam_results')
          .insert({
            participant_id: user.id,
            user_name: (session as any).userName || state.profile?.full_name || user.email,
            package_type: (session as any).packageType || session.examType,
            package_id: session.packageId || null,
            package_name: session.packageName || 'Tryout Full SKD',
            questions_total: session.questions.length,
            started_at: session.startedAt ? new Date(session.startedAt).toISOString() : new Date().toISOString(),
            ...completedPayload,
          });

        if (fallbackInsertErr) throw fallbackInsertErr;
      }

      clearLocalExamArtifacts(session.id);

      const completedSession: ExamSession = {
        ...session,
        status: 'completed',
        completedAt: new Date(),
        scores,
      };

      dispatch({ type: 'FINALIZE_EXAM_STORE', payload: completedSession });
      fetchUserExamHistory();
    } catch (err) {
      console.error('Terjadi kegagalan submit:', err);
      isSubmittingRef.current = false;
      setIsSyncLocked(false);
      alert("Gagal mengirimkan jawaban. Pastikan koneksi internet stabil lalu klik 'Selesai' lagi.");
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
    } catch {
      return false;
    }
  }

  // Inisialisasi sesi 1x saat mount + validasi database & waktu nyata sebelum RESUME_EXAM
  useEffect(() => {
    let isMounted = true;

    async function restoreSavedExamIfValid(userId: string) {
      const savedId = getActiveSessionId();
      if (!savedId) return;

      const saved = loadExamProgress(savedId);
      if (!saved || (saved as any).status === 'completed') {
        clearLocalExamArtifacts(savedId);
        return;
      }

      const dbResultId = (saved as any).resultId || localStorage.getItem('active_db_result_id') || undefined;
      if (!dbResultId) {
        clearLocalExamArtifacts(savedId);
        return;
      }

      // 1. Cek apakah baris sesi masih ada dan benar-benar berstatus in_progress di Supabase
      const { data: dbRow, error: dbCheckErr } = await supabase
        .from('exam_results')
        .select('id, status')
        .eq('id', dbResultId)
        .eq('participant_id', userId)
        .maybeSingle();

      if (!isMounted) return;

      if (!dbCheckErr && (!dbRow || String(dbRow.status ?? '').toLowerCase() !== 'in_progress')) {
        clearLocalExamArtifacts(savedId);
        return;
      }

      // 2. Muat soal + tentukan batas durasi paket yang akurat
      const questions = await fetchQuestionsForExam(saved.examType, saved.packageId, (saved as any).packageType);
      if (!isMounted) return;

      const storedInitialSec = Number(localStorage.getItem(ACTIVE_INITIAL_SECONDS_KEY) || 0);
      let pkgDurationMinutes: number | null = null;
      if (!storedInitialSec && saved.packageId) {
        const { data: pkgMeta } = await supabase
          .from('exam_packages')
          .select('duration_minutes')
          .eq('id', saved.packageId)
          .maybeSingle();
        pkgDurationMinutes = pkgMeta?.duration_minutes ?? null;
      }

      const initialSec = resolveInitialSeconds(
        saved.examType,
        questions.length,
        (saved as any).packageType,
        pkgDurationMinutes,
        (saved as any).initialTimeSeconds || storedInitialSec || null
      );

      // 3. Hitung sisa waktu nyata sejak startedAt (anti timer freeze saat tab ditutup)
      const actualRemaining = computeWallClockRemaining(saved.startedAt, initialSec);
      const hasAnyAnswer = Object.values(saved.answers || {}).some((a: any) => Boolean(a?.selectedAnswer));

      // Jika waktu sudah habis dan belum ada satu pun soal terjawab, bersihkan rapi agar tidak mengotori riwayat
      if (actualRemaining <= 0 && !hasAnyAnswer) {
        await supabase
          .from('exam_results')
          .delete()
          .eq('id', dbResultId)
          .eq('status', 'in_progress');
        clearLocalExamArtifacts(savedId);
        return;
      }

      if (!isMounted) return;

      dispatch({
        type: 'RESUME_EXAM',
        payload: {
          id: saved.sessionId,
          packageId: saved.packageId,
          packageName: saved.packageName,
          examType: saved.examType,
          questions,
          answers: saved.answers,
          currentQuestionIndex: saved.currentQuestionIndex,
          timeRemaining: actualRemaining,
          initialTimeSeconds: initialSec,
          status: 'in_progress',
          startedAt: new Date(saved.startedAt),
          resultId: dbResultId,
          packageType: (saved as any).packageType,
        } as any,
      });
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isMounted) return;
      if (session?.user) {
        restoreSavedExamIfValid(session.user.id);
        refreshProfile();
        fetchUserExamHistory();
      } else {
        dispatch({ type: 'SET_AUTH_LOADING', payload: false });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        dispatch({ type: 'LOGOUT' });
        setExamHistory([]);
        return;
      }
      if (event === 'SIGNED_IN' && session.user) {
        refreshProfile();
        fetchUserExamHistory();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [fetchUserExamHistory, refreshProfile]);

  return (
    <AppContext.Provider
      value={{
        state,
        dispatch,
        signOut,
        refreshProfile,
        startExam,
        deleteHistory,
        submitExamSession,
        examHistory,
        fetchUserExamHistory,
        fetchExamSnapshot,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
