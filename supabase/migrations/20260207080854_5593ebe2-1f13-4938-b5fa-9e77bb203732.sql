-- Create document folders table (hierarchy system)
CREATE TABLE public.document_folders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  parent_id UUID REFERENCES public.document_folders(id) ON DELETE CASCADE,
  color TEXT DEFAULT '#d4af37',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unique_folder_name_per_parent UNIQUE (user_id, parent_id, name)
);

-- Enable RLS
ALTER TABLE public.document_folders ENABLE ROW LEVEL SECURITY;

-- RLS policies for document_folders
CREATE POLICY "Users can manage their own folders"
  ON public.document_folders FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add folder_id to documents table
ALTER TABLE public.documents ADD COLUMN folder_id UUID REFERENCES public.document_folders(id) ON DELETE SET NULL;

-- Create index for faster folder queries
CREATE INDEX idx_document_folders_parent ON public.document_folders(parent_id);
CREATE INDEX idx_document_folders_user ON public.document_folders(user_id);
CREATE INDEX idx_documents_folder ON public.documents(folder_id);

-- Create invoices table for tracking cobranças
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  client_profile_id UUID REFERENCES public.client_profiles(id) ON DELETE SET NULL,
  stripe_invoice_id TEXT,
  stripe_payment_link TEXT,
  stripe_checkout_session_id TEXT,
  description TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  currency TEXT NOT NULL DEFAULT 'brl',
  status TEXT NOT NULL DEFAULT 'pending',
  payment_method TEXT,
  due_date DATE,
  paid_at TIMESTAMPTZ,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for invoices
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

-- RLS policies for invoices
CREATE POLICY "Advogados can manage their own invoices"
  ON public.invoices FOR ALL
  USING (has_role(auth.uid(), 'advogado'))
  WITH CHECK (has_role(auth.uid(), 'advogado'));

CREATE POLICY "Clients can view their own invoices"
  ON public.invoices FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.client_profiles cp
      WHERE cp.id = invoices.client_profile_id
        AND cp.user_id = auth.uid()
    )
  );

-- Create indexes for invoices
CREATE INDEX idx_invoices_user ON public.invoices(user_id);
CREATE INDEX idx_invoices_client ON public.invoices(client_profile_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);

-- Trigger to update updated_at
CREATE TRIGGER update_document_folders_updated_at
  BEFORE UPDATE ON public.document_folders
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();

CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.trigger_set_updated_at();