
DROP POLICY IF EXISTS "Public can view logs by document hash" ON public.signature_log;

CREATE POLICY "Authenticated view signature_log"
  ON public.signature_log FOR SELECT
  TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.generated_documents gd
      WHERE gd.id = signature_log.document_id
      AND gd.generated_by = auth.uid()
    )
  );
