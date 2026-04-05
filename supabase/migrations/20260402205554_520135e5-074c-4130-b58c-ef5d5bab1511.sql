
-- 1. Fix document_locks: add locked_by and locked_by_name columns
ALTER TABLE public.document_locks
  ADD COLUMN IF NOT EXISTS locked_by UUID REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS locked_by_name TEXT;

-- Migrate existing data: copy user_id to locked_by
UPDATE public.document_locks SET locked_by = user_id WHERE locked_by IS NULL AND user_id IS NOT NULL;

-- 2. Storage policies for 'documents' bucket
-- Users can upload files to their own folder
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can view their own files
CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can update their own files
CREATE POLICY "Users can update own documents"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Users can delete their own files
CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documents'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
