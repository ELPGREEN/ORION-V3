-- Document locks table for edit locking (Phase 2)
CREATE TABLE public.document_locks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  locked_by uuid NOT NULL,
  locked_by_name text NOT NULL DEFAULT 'Usuário',
  locked_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes'),
  UNIQUE(document_id)
);

ALTER TABLE public.document_locks ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can see locks
CREATE POLICY "Authenticated users can view locks"
  ON public.document_locks FOR SELECT
  TO authenticated
  USING (true);

-- Users can manage their own locks
CREATE POLICY "Users can manage own locks"
  ON public.document_locks FOR INSERT
  TO authenticated
  WITH CHECK (locked_by = auth.uid());

CREATE POLICY "Users can update own locks"
  ON public.document_locks FOR UPDATE
  TO authenticated
  USING (locked_by = auth.uid());

CREATE POLICY "Users can delete own locks"
  ON public.document_locks FOR DELETE
  TO authenticated
  USING (locked_by = auth.uid());

-- Delete expired locks policy (anyone can delete expired)
CREATE POLICY "Anyone can delete expired locks"
  ON public.document_locks FOR DELETE
  TO authenticated
  USING (expires_at < now());

-- Function to clean expired locks
CREATE OR REPLACE FUNCTION public.cleanup_expired_locks()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.document_locks WHERE expires_at < now();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Enable realtime for document_locks
ALTER PUBLICATION supabase_realtime ADD TABLE public.document_locks;