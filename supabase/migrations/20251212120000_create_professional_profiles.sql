-- ============================================================
-- SAFE PROFILE MEDIA BUCKET CREATION (Version-agnostic)
-- Works even when storage.buckets has no "public" or "public_read"
-- ============================================================

DO $$
BEGIN
  -- Only run if the storage schema and buckets table exist
  IF EXISTS (
    SELECT 1
    FROM information_schema.schemata
    WHERE schema_name = 'storage'
  )
  AND EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'storage'
      AND table_name = 'buckets'
  ) THEN

    -- Create bucket if it doesn't already exist
    IF NOT EXISTS (
      SELECT 1
      FROM storage.buckets
      WHERE id = 'profile-media'
    ) THEN
      INSERT INTO storage.buckets (id, name)
      VALUES ('profile-media', 'profile-media');
    END IF;

  END IF;
END $$;

-- ============================================================
-- RLS POLICIES FOR PROFILE MEDIA OBJECTS
-- ============================================================

-- Clean up any old policies if they exist
DROP POLICY IF EXISTS "Profile media user access" ON storage.objects;
DROP POLICY IF EXISTS "Profile media service role access" ON storage.objects;

-- Only allow authenticated users to interact with their own files
CREATE POLICY "Profile media user access"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'profile-media'
    AND owner = auth.uid()
  )
  WITH CHECK (
    bucket_id = 'profile-media'
    AND owner = auth.uid()
  );

-- Service role (backend) has full access
CREATE POLICY "Profile media service role access"
  ON storage.objects
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
