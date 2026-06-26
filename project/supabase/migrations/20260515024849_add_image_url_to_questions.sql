/*
  # Add image_url to questions table + question-images storage bucket

  1. Changes
    - `questions` table: Add optional `image_url` column (text, nullable)
      to support figural/image-based questions

  2. Storage
    - Create `question-images` storage bucket (public read)
    - Allow authenticated admins to upload to the bucket via RLS policy
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'questions' AND column_name = 'image_url'
  ) THEN
    ALTER TABLE questions ADD COLUMN image_url text DEFAULT NULL;
  END IF;
END $$;

-- Create storage bucket for question images (idempotent via DO block)
INSERT INTO storage.buckets (id, name, public)
VALUES ('question-images', 'question-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to question-images bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Authenticated users can upload question images'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Authenticated users can upload question images"
        ON storage.objects
        FOR INSERT
        TO authenticated
        WITH CHECK (bucket_id = 'question-images');
    $policy$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Public can read question images'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Public can read question images"
        ON storage.objects
        FOR SELECT
        TO public
        USING (bucket_id = 'question-images');
    $policy$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Authenticated users can update question images'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Authenticated users can update question images"
        ON storage.objects
        FOR UPDATE
        TO authenticated
        USING (bucket_id = 'question-images');
    $policy$;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Authenticated users can delete question images'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY "Authenticated users can delete question images"
        ON storage.objects
        FOR DELETE
        TO authenticated
        USING (bucket_id = 'question-images');
    $policy$;
  END IF;
END $$;
