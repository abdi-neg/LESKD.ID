/*
  # Add package_id to questions table

  ## Summary
  Menghubungkan setiap soal ke paket ujian tertentu agar perhitungan jumlah soal
  bisa dilakukan per-paket, bukan secara global.

  ## Changes

  ### Modified Tables
  - `questions`
    - Tambah kolom `package_id` (uuid, nullable, FK ke exam_packages)
    - Soal lama (tanpa package_id) tetap ada dengan nilai NULL

  ## Notes
  - Kolom nullable agar soal lama tidak rusak
  - Index ditambahkan untuk performa query filter per-paket
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'package_id'
  ) THEN
    ALTER TABLE questions ADD COLUMN package_id uuid REFERENCES exam_packages(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_questions_package_id ON questions(package_id);
CREATE INDEX IF NOT EXISTS idx_questions_category ON questions(category);
