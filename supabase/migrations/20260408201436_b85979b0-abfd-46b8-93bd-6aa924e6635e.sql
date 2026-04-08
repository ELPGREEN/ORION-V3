
-- Fix: Creators can view their own product files in storage
CREATE POLICY "Creators view own product files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'product-files'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Fix: loi_documents - restrict insert to admin/editor
DROP POLICY IF EXISTS "Allow LOI insert with valid data" ON public.loi_documents;
CREATE POLICY "Admins insert LOI documents"
ON public.loi_documents FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Fix: contact_documents - restrict insert to document owner
DROP POLICY IF EXISTS "Users can insert contact documents" ON public.contact_documents;
DROP POLICY IF EXISTS "Authenticated users can insert contact documents" ON public.contact_documents;

CREATE POLICY "Users insert own contact documents"
ON public.contact_documents FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());
