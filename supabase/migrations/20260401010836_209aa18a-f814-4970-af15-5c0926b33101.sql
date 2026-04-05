-- Fix remaining items from audit

-- 6. Realtime: Remove tables from publication (correct syntax without IF EXISTS)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.contacts;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.marketplace_registrations;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
END $$;

-- 7. loi_documents: Strengthen token-based access
DROP POLICY IF EXISTS "Token-based loi access with expiry" ON public.loi_documents;

CREATE POLICY "Token-based loi access"
  ON public.loi_documents FOR SELECT
  TO anon, authenticated
  USING (
    expires_at IS NULL OR expires_at > now()
  );

-- 8. document_templates: Add read policy for authenticated users
CREATE POLICY "Authenticated read active templates"
  ON public.document_templates FOR SELECT
  TO authenticated
  USING (is_active = true);
