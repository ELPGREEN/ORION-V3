-- Create table for client reviews/testimonials
CREATE TABLE public.avaliacoes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  nome TEXT NOT NULL,
  foto_url TEXT,
  nota INTEGER NOT NULL CHECK (nota >= 1 AND nota <= 5),
  depoimento TEXT NOT NULL,
  aprovado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.avaliacoes ENABLE ROW LEVEL SECURITY;

-- Clients can create their own reviews
CREATE POLICY "Clientes can create their own review"
ON public.avaliacoes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Clients can view their own reviews
CREATE POLICY "Clientes can view their own review"
ON public.avaliacoes
FOR SELECT
USING (auth.uid() = user_id);

-- Clients can update their own reviews
CREATE POLICY "Clientes can update their own review"
ON public.avaliacoes
FOR UPDATE
USING (auth.uid() = user_id);

-- Clients can delete their own reviews
CREATE POLICY "Clientes can delete their own review"
ON public.avaliacoes
FOR DELETE
USING (auth.uid() = user_id);

-- Anyone can view approved reviews (for public testimonials page)
CREATE POLICY "Anyone can view approved reviews"
ON public.avaliacoes
FOR SELECT
USING (aprovado = true);

-- Advogados can view all reviews
CREATE POLICY "Advogados can view all reviews"
ON public.avaliacoes
FOR SELECT
USING (has_role(auth.uid(), 'advogado'::app_role));

-- Advogados can update reviews (to approve them)
CREATE POLICY "Advogados can update reviews"
ON public.avaliacoes
FOR UPDATE
USING (has_role(auth.uid(), 'advogado'::app_role));

-- Advogados can delete reviews
CREATE POLICY "Advogados can delete reviews"
ON public.avaliacoes
FOR DELETE
USING (has_role(auth.uid(), 'advogado'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_avaliacoes_updated_at
BEFORE UPDATE ON public.avaliacoes
FOR EACH ROW
EXECUTE FUNCTION public.trigger_set_updated_at();