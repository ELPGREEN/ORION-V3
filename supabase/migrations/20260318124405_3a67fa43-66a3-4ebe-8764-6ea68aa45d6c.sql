CREATE TABLE public.google_doc_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id uuid REFERENCES public.documents(id) ON DELETE SET NULL,
  processo_id uuid REFERENCES public.processos(id) ON DELETE SET NULL,
  google_doc_id text NOT NULL,
  google_doc_title text,
  google_doc_url text,
  last_modified_time timestamptz,
  last_synced_at timestamptz,
  auto_sync boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.google_doc_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own google_doc_links"
  ON public.google_doc_links FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.processos ADD COLUMN IF NOT EXISTS google_calendar_event_id text;

CREATE TRIGGER set_updated_at_google_doc_links
  BEFORE UPDATE ON public.google_doc_links
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();