
-- Fix anonymous access on documents table: restrict to authenticated only
DROP POLICY IF EXISTS "Users can view their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can create their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can update their own documents" ON public.documents;
DROP POLICY IF EXISTS "Users can delete their own documents" ON public.documents;

CREATE POLICY "Users can view their own documents"
ON public.documents FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own documents"
ON public.documents FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own documents"
ON public.documents FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own documents"
ON public.documents FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Fix storage policies: restrict to authenticated only
DROP POLICY IF EXISTS "Users can upload their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own documents" ON storage.objects;

CREATE POLICY "Users can upload their own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);
