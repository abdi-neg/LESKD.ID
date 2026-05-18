/*
  # Add option_type column to questions

  1. Changes
    - `questions` table: add `option_type` column (text, default 'text')
      - 'text'  → option_a/b/c/d/e contain plain text
      - 'image' → option_a/b/c/d/e contain image URLs

  2. Notes
    - Default 'text' ensures all existing questions are unaffected
    - No data migration needed — existing rows get the default
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'option_type'
  ) THEN
    ALTER TABLE questions ADD COLUMN option_type text NOT NULL DEFAULT 'text';
  END IF;
END $$;
