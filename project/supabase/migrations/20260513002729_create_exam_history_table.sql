/*
  # Create exam history table

  1. New Tables
    - `exam_history` - Stores completed exam records for participants
      - `id` (uuid, primary key)
      - `participant_id` (uuid, references participants)
      - `exam_type` (text: TIU, TWK, TKP, FULL)
      - `score_tiu/twk/tkp` (integer) - scores per category
      - `total_score` (integer)
      - `questions_correct` (integer)
      - `questions_total` (integer)
      - `passed` (boolean)
      - `duration_seconds` (integer)
      - `completed_at` (timestamp)

  2. Security
    - Enable RLS on exam_history table
    - Participants can only view their own exam history
    - Admins can view all exam history via service role
*/

CREATE TABLE IF NOT EXISTS exam_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id uuid NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
  exam_type text NOT NULL CHECK (exam_type IN ('TIU', 'TWK', 'TKP', 'FULL')),
  score_tiu integer DEFAULT 0,
  score_twk integer DEFAULT 0,
  score_tkp integer DEFAULT 0,
  total_score integer NOT NULL,
  questions_correct integer NOT NULL DEFAULT 0,
  questions_total integer NOT NULL,
  passed boolean NOT NULL DEFAULT false,
  duration_seconds integer NOT NULL DEFAULT 0,
  completed_at timestamptz DEFAULT now()
);

ALTER TABLE exam_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view own exam history"
  ON exam_history FOR SELECT
  TO authenticated
  USING (participant_id = auth.uid());

CREATE POLICY "Participants can insert own exam history"
  ON exam_history FOR INSERT
  TO authenticated
  WITH CHECK (participant_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_exam_history_participant ON exam_history(participant_id);
CREATE INDEX IF NOT EXISTS idx_exam_history_completed ON exam_history(completed_at DESC);
