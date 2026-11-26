export type Category = 'TIU' | 'TWK' | 'TKP';
export type ExamType = 'TIU' | 'TWK' | 'TKP' | 'FULL';
export type PackageType = 'MINI_TIU' | 'MINI_TWK' | 'MINI_TKP' | 'TO_SUBKATEGORI' | 'FULL';
export type AnswerOption = 'A' | 'B' | 'C' | 'D' | 'E';
export type UserRole = 'participant' | 'admin' | 'super_admin';
export type SessionStatus = 'in_progress' | 'completed';

export type AccessGroup = 'UMUM' | 'OFFLINE' | 'ONLINE_B1';
export type PackageTargetGroup = 'SEMUA' | AccessGroup;

export const USER_GROUP_OPTIONS: {
  id: AccessGroup;
  label: string;
  shortLabel: string;
  badgeClass: string;
  activeBtnClass: string;
}[] = [
  {
    id: 'UMUM',
    label: 'Umum / Tryout',
    shortLabel: 'Umum',
    badgeClass: 'bg-slate-100 text-slate-600 border-slate-200',
    activeBtnClass: 'bg-slate-700 text-white border-slate-700',
  },
  {
    id: 'OFFLINE',
    label: 'Kelas Offline',
    shortLabel: 'Offline',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    activeBtnClass: 'bg-emerald-600 text-white border-emerald-600',
  },
  {
    id: 'ONLINE_B1',
    label: 'Kelas Online Batch 1',
    shortLabel: 'Online B1',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    activeBtnClass: 'bg-indigo-600 text-white border-indigo-600',
  },
];

export const PACKAGE_TARGET_OPTIONS: {
  id: PackageTargetGroup;
  label: string;
  shortLabel: string;
  badgeClass: string;
  activeBtnClass: string;
}[] = [
  {
    id: 'SEMUA',
    label: 'Semua Peserta',
    shortLabel: 'Semua',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
    activeBtnClass: 'bg-[#1e3a8a] text-white border-[#1e3a8a]',
  },
  ...USER_GROUP_OPTIONS,
];

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
  access_groups?: string[];
}

export type OptionType = 'text' | 'image';

export interface Question {
  id: string;
  category: Category;
  sub_category: string;
  sub_kategori?: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  option_e: string;
  correct_answer: AnswerOption;
  explanation: string;
  points_a?: number;
  points_b?: number;
  points_c?: number;
  points_d?: number;
  points_e?: number;
  image_url?: string | null;
  explanation_image_url?: string | null;
  option_a_image?: string | null;
  option_b_image?: string | null;
  option_c_image?: string | null;
  option_d_image?: string | null;
  option_e_image?: string | null;
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
  duration_minutes?: number;
  question_count?: number;
  target_groups?: string[];
  is_teaser?: boolean;
}

export interface QuestionAnswer {
  questionId: string;
  selectedAnswer: AnswerOption | null;
  isMarked: boolean;
}

export interface ExamSession {
  id: string;
  resultId?: string;
  packageId?: string;
  packageName?: string;
  packageType?: PackageType | string;
  userName?: string;
  examType: ExamType;
  questions: Question[];
  answers: Record<string, QuestionAnswer>;
  currentQuestionIndex: number;
  timeRemaining: number;
  initialTimeSeconds?: number;
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
  user_name?: string;
  package_id?: string | null;
  package_name: string;
  package_type: PackageType | string;
  score_tiu: number;
  score_twk: number;
  score_tkp: number;
  total_score: number;
  questions_correct: number;
  questions_total: number;
  passed: boolean;
  status?: SessionStatus | string | null;
  started_at?: string;
  duration_seconds: number;
  completed_at: string;
  participant_name?: string;
  review_snapshot?: any;
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
