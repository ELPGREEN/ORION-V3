
-- Orion Financial Entries
CREATE TABLE public.orion_financial_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('entrada', 'saida')),
  category TEXT NOT NULL DEFAULT 'outros',
  description TEXT,
  amount_cents INTEGER NOT NULL DEFAULT 0,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.orion_financial_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own financial entries"
  ON public.orion_financial_entries FOR SELECT
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can insert own financial entries"
  ON public.orion_financial_entries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own financial entries"
  ON public.orion_financial_entries FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own financial entries"
  ON public.orion_financial_entries FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_orion_financial_entries_updated_at
  BEFORE UPDATE ON public.orion_financial_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_orion_financial_entries_user ON public.orion_financial_entries(user_id);
CREATE INDEX idx_orion_financial_entries_date ON public.orion_financial_entries(date);

-- Orion Reports
CREATE TABLE public.orion_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  report_type TEXT NOT NULL DEFAULT 'daily',
  data JSONB NOT NULL DEFAULT '{}',
  period_start DATE,
  period_end DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.orion_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view reports"
  ON public.orion_reports FOR SELECT
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Service role can insert reports"
  ON public.orion_reports FOR INSERT
  WITH CHECK (true);

CREATE INDEX idx_orion_reports_type ON public.orion_reports(report_type);
CREATE INDEX idx_orion_reports_created ON public.orion_reports(created_at DESC);
