-- Fix storage policies for documents bucket
-- First, remove existing restrictive policies
DROP POLICY IF EXISTS "Allow authenticated uploads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated reads" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload to documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can view documents" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete documents" ON storage.objects;

-- Create permissive policies for the documents bucket
CREATE POLICY "Authenticated users can upload to documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Authenticated users can view documents"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "Authenticated users can update documents"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "Authenticated users can delete documents"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents');

-- Create contact_documents table for organizing documents per contact
CREATE TABLE IF NOT EXISTS public.contact_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE public.contact_documents ENABLE ROW LEVEL SECURITY;

-- RLS policies for contact_documents
CREATE POLICY "Users can manage their own contact documents"
ON public.contact_documents
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);