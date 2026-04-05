-- Create signature envelopes table
CREATE TABLE public.signature_envelopes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  document_title TEXT NOT NULL,
  clicksign_document_key TEXT,
  clicksign_envelope_id TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  signature_method TEXT NOT NULL DEFAULT 'eletronica',
  signers JSONB NOT NULL DEFAULT '[]'::jsonb,
  clicksign_response JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.signature_envelopes ENABLE ROW LEVEL SECURITY;

-- Advogados can manage their own envelopes
CREATE POLICY "Advogados can manage their own envelopes"
ON public.signature_envelopes
FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Clientes can view envelopes where they are signers
CREATE POLICY "Clientes can view envelopes they are signers on"
ON public.signature_envelopes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM jsonb_array_elements(signers) AS s
    WHERE s->>'email' = (SELECT email FROM auth.users WHERE id = auth.uid())
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_signature_envelopes_updated_at
BEFORE UPDATE ON public.signature_envelopes
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_updated_at();