
-- ══════════════════════════════════════════════════════════════════
-- SECURITY: Fix overly-broad storage policies on 'documents' bucket
-- ══════════════════════════════════════════════════════════════════

-- These 4 policies allow ANY authenticated user to read/write/delete
-- ANY file in the documents bucket — a serious data exposure risk.
-- The more specific scoped policies already exist (by user folder and
-- by advogado role), so these broad ones are redundant AND dangerous.

DROP POLICY IF EXISTS "Authenticated users can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to documents" ON storage.objects;

-- ─────────────────────────────────────────────────────────────────
-- Set file size limits (security + abuse prevention)
-- ─────────────────────────────────────────────────────────────────
UPDATE storage.buckets
SET file_size_limit = 52428800  -- 50MB
WHERE id = 'documents';

UPDATE storage.buckets
SET file_size_limit = 5242880,  -- 5MB
    allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp','image/gif']
WHERE id = 'avatars';

-- ─────────────────────────────────────────────────────────────────
-- Ensure 'documents' bucket restricts to safe MIME types
-- ─────────────────────────────────────────────────────────────────
UPDATE storage.buckets
SET allowed_mime_types = ARRAY[
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/plain'
]
WHERE id = 'documents';
