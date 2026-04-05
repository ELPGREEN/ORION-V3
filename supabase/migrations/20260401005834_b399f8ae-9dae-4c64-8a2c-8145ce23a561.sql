-- 4. available_advogados is a SECURITY DEFINER view — recreate as INVOKER
DROP VIEW IF EXISTS public.available_advogados;

CREATE VIEW public.available_advogados
WITH (security_invoker = true)
AS
SELECT ec.user_id,
    ec.nome_escritorio AS nome,
    ec.oab,
    ec.telefone
FROM escritorio_config ec
JOIN user_roles ur ON ur.user_id = ec.user_id AND ur.role = 'advogado'::app_role;

-- 5. Fix storage policy: profile-photos UPDATE needs ownership check
DROP POLICY IF EXISTS "Users can update own profile photos" ON storage.objects;

CREATE POLICY "Users can update own profile photos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'profile-photos' AND
  (auth.uid())::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id = 'profile-photos' AND
  (auth.uid())::text = (storage.foldername(name))[1]
);

-- 6. loi_documents: Add expiry check to token-based access
DROP POLICY IF EXISTS "Token-based loi access" ON public.loi_documents;

CREATE POLICY "Token-based loi access with expiry"
ON public.loi_documents
FOR SELECT
TO anon, authenticated
USING (
  length(token) >= 20 AND
  (expires_at IS NULL OR expires_at > now())
);