/*
  # Add explanation column to questions table

  1. Modified Tables
    - `questions`
      - Added `explanation` (text) column for answer explanations/pembahasan
      - Default empty string so existing rows are not null

  2. Security
    - No RLS changes needed, existing policies already cover this column
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'explanation'
  ) THEN
    ALTER TABLE questions ADD COLUMN explanation text NOT NULL DEFAULT '';
  END IF;
END $$;
