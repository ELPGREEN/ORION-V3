
-- Catálogo de Dados Abertos do Senado Federal
CREATE TABLE public.catalogo_dados_senado (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nom_categoria text NOT NULL,
  nom_sub_categoria text,
  des_grupo_dados text,
  cod_orgao_responsavel integer,
  nom_orgao_responsavel text,
  nom_conjunto_dados text,
  des_conjunto_dados text,
  txt_url text,
  des_frequencia_atualizacao text,
  dth_ultima_atualizacao text,
  nom_dicionario_dados text,
  des_dicionario_dados text,
  des_tipo_campo text,
  num_ordem integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.catalogo_dados_senado ENABLE ROW LEVEL SECURITY;

-- Public read access (dados abertos)
CREATE POLICY "Anyone can read catalogo dados" ON public.catalogo_dados_senado
  FOR SELECT USING (true);

-- Only advogados can manage
CREATE POLICY "Advogados can manage catalogo" ON public.catalogo_dados_senado
  FOR ALL USING (has_role(auth.uid(), 'advogado'::app_role))
  WITH CHECK (has_role(auth.uid(), 'advogado'::app_role));
