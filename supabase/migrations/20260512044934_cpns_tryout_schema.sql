/*
  # CPNS Tryout Platform Schema

  1. New Tables
    - `questions` - Stores all exam questions with options and correct answers
      - `id` (uuid, primary key)
      - `category` (text: TIU, TWK, TKP)
      - `question_text` (text)
      - `option_a/b/c/d/e` (text)
      - `correct_answer` (text: A-E)
      - `created_at` (timestamp)
    - `participants` - Stores participant profile data
      - `id` (uuid, primary key, references auth.users)
      - `full_name` (text)
      - `created_at` (timestamp)
    - `exam_sessions` - Tracks each exam attempt
      - `id` (uuid, primary key)
      - `participant_id` (uuid, references participants)
      - `exam_type` (text: TIU, TWK, TKP, FULL)
      - `score_tiw` / `score_twk` / `score_tkp` / `total_score` (integer)
      - `status` (text: in_progress, completed)
      - `started_at` / `completed_at` (timestamp)
    - `exam_answers` - Stores participant answers per session
      - `id` (uuid, primary key)
      - `session_id` (uuid, references exam_sessions)
      - `question_id` (uuid, references questions)
      - `selected_answer` (text: A-E or null)
      - `is_marked` (boolean)

  2. Security
    - Enable RLS on all tables
    - Participants can read their own data and sessions
    - Admins can manage all data via service role
*/

-- Questions table
CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL CHECK (category IN ('TIU', 'TWK', 'TKP')),
  question_text text NOT NULL,
  option_a text NOT NULL,
  option_b text NOT NULL,
  option_c text NOT NULL,
  option_d text NOT NULL,
  option_e text NOT NULL,
  correct_answer text NOT NULL CHECK (correct_answer IN ('A', 'B', 'C', 'D', 'E')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can read questions"
  ON questions FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert questions"
  ON questions FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update questions"
  ON questions FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete questions"
  ON questions FOR DELETE
  TO authenticated
  USING (true);

-- Participants table
CREATE TABLE IF NOT EXISTS participants (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read own profile"
  ON participants FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Participants can insert own profile"
  ON participants FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Participants can update own profile"
  ON participants FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Exam sessions table
CREATE TABLE IF NOT EXISTS exam_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  exam_type text NOT NULL CHECK (exam_type IN ('TIU', 'TWK', 'TKP', 'FULL')),
  score_tiu integer DEFAULT 0,
  score_twk integer DEFAULT 0,
  score_tkp integer DEFAULT 0,
  total_score integer DEFAULT 0,
  status text NOT NULL DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed')),
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE exam_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read own sessions"
  ON exam_sessions FOR SELECT
  TO authenticated
  USING (participant_id = auth.uid());

CREATE POLICY "Participants can insert own sessions"
  ON exam_sessions FOR INSERT
  TO authenticated
  WITH CHECK (participant_id = auth.uid());

CREATE POLICY "Participants can update own sessions"
  ON exam_sessions FOR UPDATE
  TO authenticated
  USING (participant_id = auth.uid())
  WITH CHECK (participant_id = auth.uid());

-- Exam answers table
CREATE TABLE IF NOT EXISTS exam_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES exam_sessions(id) ON DELETE CASCADE,
  question_id uuid NOT NULL REFERENCES questions(id),
  selected_answer text CHECK (selected_answer IN ('A', 'B', 'C', 'D', 'E')),
  is_marked boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE exam_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can read own answers"
  ON exam_answers FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM exam_sessions
      WHERE exam_sessions.id = exam_answers.session_id
      AND exam_sessions.participant_id = auth.uid()
    )
  );

CREATE POLICY "Participants can insert own answers"
  ON exam_answers FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM exam_sessions
      WHERE exam_sessions.id = exam_answers.session_id
      AND exam_sessions.participant_id = auth.uid()
    )
  );

CREATE POLICY "Participants can update own answers"
  ON exam_answers FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM exam_sessions
      WHERE exam_sessions.id = exam_answers.session_id
      AND exam_sessions.participant_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM exam_sessions
      WHERE exam_sessions.id = exam_answers.session_id
      AND exam_sessions.participant_id = auth.uid()
    )
  );
