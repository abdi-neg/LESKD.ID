import { ExamSession, Question, QuestionAnswer, AnswerOption, ExamType } from '../types';

interface PersistedExam {
  sessionId: string;
  packageId?: string;
  packageName?: string;
  examType: ExamSession['examType'];
  answers: ExamSession['answers'];
  timeRemaining: number;
  currentQuestionIndex: number;
  startedAt: string;
}

export interface ReviewSnapshot {
  examType: ExamType;
  packageName?: string;
  completedAt: string;
  questions: Array<{
    id: string;
    category: string;
    question_text: string;
    option_a: string;
    option_b: string;
    option_c: string;
    option_d: string;
    option_e: string;
    correct_answer: AnswerOption;
    explanation: string;
    image_url?: string | null;
    option_type?: string;
  }>;
  answers: Record<string, QuestionAnswer>;
  scores: { tiu: number; twk: number; tkp: number; total: number };
}

const KEY = (sessionId: string) => `exam_session_${sessionId}`;
const ACTIVE_KEY = 'exam_active_session_id';
const REVIEW_KEY = (resultId: string) => `exam_review_${resultId}`;
const REVIEW_INDEX_KEY = 'exam_review_index';

export function saveExamProgress(session: ExamSession) {
  const data: PersistedExam = {
    sessionId: session.id,
    packageId: session.packageId,
    packageName: session.packageName,
    examType: session.examType,
    answers: session.answers,
    timeRemaining: session.timeRemaining,
    currentQuestionIndex: session.currentQuestionIndex,
    startedAt: session.startedAt.toISOString(),
  };
  try {
    localStorage.setItem(KEY(session.id), JSON.stringify(data));
    localStorage.setItem(ACTIVE_KEY, session.id);
  } catch {
    // localStorage quota exceeded — silently ignore
  }
}

export function loadExamProgress(sessionId: string): PersistedExam | null {
  try {
    const raw = localStorage.getItem(KEY(sessionId));
    if (!raw) return null;
    return JSON.parse(raw) as PersistedExam;
  } catch {
    return null;
  }
}

export function getActiveSessionId(): string | null {
  return localStorage.getItem(ACTIVE_KEY);
}

export function clearExamProgress(sessionId: string) {
  localStorage.removeItem(KEY(sessionId));
  localStorage.removeItem(ACTIVE_KEY);
}

export function saveReviewSnapshot(resultId: string, snapshot: ReviewSnapshot) {
  try {
    localStorage.setItem(REVIEW_KEY(resultId), JSON.stringify(snapshot));
    // Keep an index of up to 20 saved reviews (oldest removed first)
    const raw = localStorage.getItem(REVIEW_INDEX_KEY);
    const index: string[] = raw ? JSON.parse(raw) : [];
    const updated = [resultId, ...index.filter((id) => id !== resultId)].slice(0, 20);
    localStorage.setItem(REVIEW_INDEX_KEY, JSON.stringify(updated));
    // Remove the evicted entry if any
    const evicted = index.slice(19);
    evicted.forEach((id) => localStorage.removeItem(REVIEW_KEY(id)));
  } catch {
    // quota exceeded — ignore
  }
}

export function loadReviewSnapshot(resultId: string): ReviewSnapshot | null {
  try {
    const raw = localStorage.getItem(REVIEW_KEY(resultId));
    if (!raw) return null;
    return JSON.parse(raw) as ReviewSnapshot;
  } catch {
    return null;
  }
}

export function buildReviewSnapshot(session: ExamSession): ReviewSnapshot {
  return {
    examType: session.examType,
    packageName: session.packageName,
    completedAt: (session.completedAt ?? new Date()).toISOString(),
    questions: session.questions.map((q: Question) => ({
      id: q.id,
      category: q.category,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      option_e: q.option_e,
      correct_answer: q.correct_answer,
      explanation: q.explanation ?? '',
      image_url: q.image_url,
      option_type: q.option_type ?? 'text',
    })),
    answers: session.answers,
    scores: session.scores ?? { tiu: 0, twk: 0, tkp: 0, total: 0 },
  };
}
