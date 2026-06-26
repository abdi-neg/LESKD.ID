export type Category = 'TIU' | 'TWK' | 'TKP';
export type ExamType = 'TIU' | 'TWK' | 'TKP' | 'FULL';
export type PackageType = 'MINI_TIU' | 'MINI_TWK' | 'MINI_TKP' | 'FULL';
export type AnswerOption = 'A' | 'B' | 'C' | 'D' | 'E';
export type UserRole = 'participant' | 'admin' | 'super_admin';
export type SessionStatus = 'in_progress' | 'completed';

export const SUPER_ADMIN_EMAIL = 'andiabdi64@gmail.com';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  is_approved: boolean;
  approved_by?: string | null;
  approved_at?: string | null;
  whatsapp?: string;
  created_at?: string;
}

export type OptionType = 'text' | 'image';

export interface Question {
  id: string;
  category: Category;
  sub_category: string; // 🌟 TAMBAHKAN BARIS INI: Penanda sub-materi (cth: Silogisme, Nasionalisme)
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_e: string;
  correct_answer: AnswerOption;
  explanation: string;
  image_url?: string | null;
  option_type?: OptionType;
  package_id?: string | null;
  created_at?: string;
}

export interface ExamPackage {
  id: string;
  name: string;
  description: string;
  package_type: PackageType;
  token: string;
  token_updated_at?: string;
  auto_refresh_token: boolean;
  token_expires_at?: string | null;
  is_active: boolean;
  created_by?: string;
  created_at?: string;
}

export interface QuestionAnswer {
  questionId: string;
  selectedAnswer: AnswerOption | null;
  isMarked: boolean;
}

export interface ExamSession {
  id: string;
  resultId?: string; // 🚀 BERHASIL DITAMBAHKAN: Penghubung UUID hasil ujian dari database Supabase
  packageId?: string;
  packageName?: string;
  examType: ExamType;
  questions: Question[];
  answers: Record<string, QuestionAnswer>;
  currentQuestionIndex: number;
  timeRemaining: number;
  status: SessionStatus;
  startedAt: Date;
  completedAt?: Date;
  scores?: ExamScores;
}

export interface ExamScores {
  tiu: number;
  twk: number;
  tkp: number;
  total: number;
}

export interface ExamResult {
  id: string;
  participant_id: string;
  package_id?: string | null;
  package_name: string;
  package_type: PackageType;
  score_tiu: number;
  score_twk: number;
  score_tkp: number;
  total_score: number;
  questions_correct: number;
  questions_total: number;
  passed: boolean;
  duration_seconds: number;
  completed_at: string;
  participant_name?: string;
  // 🌟 TAMBAHKAN BARIS INI: Untuk menampung data objek diagnosis mikro dari database JSONB
  diagnostic_breakdown?: Record<string, { correct: number; total: number; percentage: number }>;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  tiu_score: number;
  twk_score: number;
  tkp_score: number;
  total_score: number;
}

export interface LiveParticipant {
  id: string;
  name: string;
  exam_type: ExamType;
  progress: number;
  current_score: number;
  status: 'active' | 'completed';
}

export interface AppState {
  profile: Profile | null;
  authLoading: boolean;
  currentView: AppView;
  examSession: ExamSession | null;
  reviewResultId: string | null;
}

export type AppView =
  | 'landing'
  | 'waiting-room'
  | 'participant-dashboard'
  | 'exam-engine'
  | 'exam-results'
  | 'exam-review'
  | 'admin-dashboard';
