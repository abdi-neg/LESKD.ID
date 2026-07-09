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
    explanation_image_url?: string | null;
    option_type?: string;
    option_a_image?: string | null;
    option_b_image?: string | null;
    option_c_image?: string | null;
    option_d_image?: string | null;
    option_e_image?: string | null;
    points_a?: number;
    points_b?: number;
    points_c?: number;
    points_d?: number;
    points_e?: number;
    [key: string]: any; // Menampung kolom dinamis tambahan
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
    const raw = localStorage.getItem(REVIEW_INDEX_KEY);
    const index: string[] = raw ? JSON.parse(raw) : [];
    const updated = [resultId, ...index.filter((id) => id !== resultId)].slice(0, 20);
    localStorage.setItem(REVIEW_INDEX_KEY, JSON.stringify(updated));
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

// ─── 🌟 FUNGSI BUILD SNAPSHOT YANG SUDAH DIPERBAIKI (ANTI-SARING DATA) ───
export function buildReviewSnapshot(session: ExamSession): ReviewSnapshot {
  return {
    examType: session.examType,
    packageName: session.packageName,
    completedAt: (session.completedAt ?? new Date()).toISOString(),
    questions: session.questions.map((q: Question) => ({
      ...q, // Mengamankan seluruh data gambar bawaan database (image_url, explanation_image_url, dll)
      explanation: q.explanation ?? '',
      sub_category: q.sub_category || (q as any).sub_kategori || 'Umum',
    })) as any,
    answers: session.answers,
    scores: session.scores ?? { tiu: 0, twk: 0, tkp: 0, total: 0 },
  };
}

/**
 * Menghapus riwayat ujian dari database Supabase dan membersihkan snapshot dari localStorage
 */
export async function deleteExamResult(resultId: string): Promise<{ success: boolean; error: any }> {
  try {
    const { supabase } = await import('./supabase'); 

    const { error } = await supabase
      .from('exam_results') 
      .delete()
      .eq('id', resultId);

    if (error) throw error;

    localStorage.removeItem(REVIEW_KEY(resultId));

    const rawIndex = localStorage.getItem(REVIEW_INDEX_KEY);
    if (rawIndex) {
      const index: string[] = JSON.parse(rawIndex);
      const updatedIndex = index.filter((id) => id !== resultId);
      localStorage.setItem(REVIEW_INDEX_KEY, JSON.stringify(updatedIndex));
    }

    return { success: true, error: null };
  } catch (err) {
    console.error('Gagal menghapus riwayat ujian:', err);
    return { success: false, error: err };
  }
}
