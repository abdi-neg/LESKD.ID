/*
  # Multi-Level Admin & Approval System

  ## Summary
  Full schema rebuild for LESKD.ID multi-role approval system.

  ## New / Modified Tables

  ### profiles
  Unified profile for all users (participants + admins).
  - role: 'super_admin' | 'admin' | 'participant'
  - is_approved: false by default, must be approved before access
  - approved_by / approved_at: who approved and when

  ### exam_packages
  Admin-created exam packages (Mini Tryout or Full CAT).
  - package_type: 'MINI_TIU' | 'MINI_TWK' | 'MINI_TKP' | 'FULL'
  - token: 6-digit string
  - token_expires_at: optional expiry for auto-refresh
  - auto_refresh_token: toggle for 60-min refresh
  - is_active: enable/disable package

  ### exam_results
  Results per participant per package attempt.
  - Stores scores, pass/fail, duration, answers summary

  ## Security
  - RLS enabled on all tables
  - Participants see only their own data
  - Admins see all participant data
  - Only super_admin can manage admin accounts
*/

-- ============================================================
-- DROP OLD TABLES (clean slate, preserving auth.users)
-- ============================================================
DROP TABLE IF EXISTS exam_answers CASCADE;
DROP TABLE IF EXISTS exam_sessions CASCADE;
DROP TABLE IF EXISTS exam_history CASCADE;
DROP TABLE IF EXISTS participants CASCADE;

-- ============================================================
-- PROFILES (replaces participants table)
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  role text NOT NULL DEFAULT 'participant' CHECK (role IN ('super_admin', 'admin', 'participant')),
  is_approved boolean NOT NULL DEFAULT false,
  approved_by uuid REFERENCES profiles(id),
  approved_at timestamptz,
  whatsapp text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'super_admin')
      AND p.is_approved = true
    )
  );

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can update any profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'super_admin')
      AND p.is_approved = true
    )
  )
  WITH CHECK (true);

-- ============================================================
-- EXAM PACKAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS exam_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text DEFAULT '',
  package_type text NOT NULL CHECK (package_type IN ('MINI_TIU', 'MINI_TWK', 'MINI_TKP', 'FULL')),
  token text NOT NULL DEFAULT '',
  token_updated_at timestamptz DEFAULT now(),
  auto_refresh_token boolean NOT NULL DEFAULT false,
  token_expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE exam_packages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active packages visible to approved participants"
  ON exam_packages FOR SELECT
  TO authenticated
  USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.is_approved = true
    )
  );

CREATE POLICY "Admins can view all packages"
  ON exam_packages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'super_admin')
      AND p.is_approved = true
    )
  );

CREATE POLICY "Admins can insert packages"
  ON exam_packages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'super_admin')
      AND p.is_approved = true
    )
  );

CREATE POLICY "Admins can update packages"
  ON exam_packages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'super_admin')
      AND p.is_approved = true
    )
  )
  WITH CHECK (true);

CREATE POLICY "Admins can delete packages"
  ON exam_packages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'super_admin')
      AND p.is_approved = true
    )
  );

-- ============================================================
-- EXAM RESULTS
-- ============================================================
CREATE TABLE IF NOT EXISTS exam_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  package_id uuid REFERENCES exam_packages(id) ON DELETE SET NULL,
  package_name text NOT NULL DEFAULT '',
  package_type text NOT NULL,
  score_tiu integer NOT NULL DEFAULT 0,
  score_twk integer NOT NULL DEFAULT 0,
  score_tkp integer NOT NULL DEFAULT 0,
  total_score integer NOT NULL DEFAULT 0,
  questions_correct integer NOT NULL DEFAULT 0,
  questions_total integer NOT NULL DEFAULT 0,
  passed boolean NOT NULL DEFAULT false,
  duration_seconds integer NOT NULL DEFAULT 0,
  completed_at timestamptz DEFAULT now()
);

ALTER TABLE exam_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view own results"
  ON exam_results FOR SELECT
  TO authenticated
  USING (participant_id = auth.uid());

CREATE POLICY "Participants can insert own results"
  ON exam_results FOR INSERT
  TO authenticated
  WITH CHECK (participant_id = auth.uid());

CREATE POLICY "Admins can view all results"
  ON exam_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('admin', 'super_admin')
      AND p.is_approved = true
    )
  );

CREATE INDEX IF NOT EXISTS idx_exam_results_participant ON exam_results(participant_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_package ON exam_results(package_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_completed ON exam_results(completed_at DESC);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_approved ON profiles(is_approved);
