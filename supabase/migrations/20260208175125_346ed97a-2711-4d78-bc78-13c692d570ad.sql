-- Create publications/articles table
CREATE TABLE public.publicacoes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo text NOT NULL,
  resumo text NOT NULL,
  conteudo text NOT NULL,
  imagem_capa text,
  categoria text NOT NULL DEFAULT 'geral',
  autor text NOT NULL DEFAULT 'Diego Hermann',
  publicado boolean NOT NULL DEFAULT false,
  data_publicacao timestamp with time zone,
  slug text UNIQUE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  user_id uuid NOT NULL
);

-- Enable RLS
ALTER TABLE public.publicacoes ENABLE ROW LEVEL SECURITY;

-- Public can read published articles
CREATE POLICY "Anyone can read published articles"
ON public.publicacoes
FOR SELECT
USING (publicado = true);

-- Advogados can manage their own articles
CREATE POLICY "Advogados can manage their own articles"
ON public.publicacoes
FOR ALL
USING (has_role(auth.uid(), 'advogado') AND auth.uid() = user_id)
WITH CHECK (has_role(auth.uid(), 'advogado') AND auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_publicacoes_updated_at
BEFORE UPDATE ON public.publicacoes
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();

-- Create Pro Bono requests table
CREATE TABLE public.pro_bono_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  email text NOT NULL,
  telefone text,
  situacao_financeira text NOT NULL,
  descricao_caso text NOT NULL,
  documentos_comprovacao text,
  status text NOT NULL DEFAULT 'pendente',
  notas_internas text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.pro_bono_requests ENABLE ROW LEVEL SECURITY;

-- Anyone can submit a pro bono request
CREATE POLICY "Anyone can submit pro bono request"
ON public.pro_bono_requests
FOR INSERT
WITH CHECK (true);

-- Advogados can view and manage all requests
CREATE POLICY "Advogados can manage pro bono requests"
ON public.pro_bono_requests
FOR ALL
USING (has_role(auth.uid(), 'advogado'))
WITH CHECK (has_role(auth.uid(), 'advogado'));

-- Create trigger for updated_at
CREATE TRIGGER update_pro_bono_updated_at
BEFORE UPDATE ON public.pro_bono_requests
FOR EACH ROW
EXECUTE FUNCTION trigger_set_updated_at();