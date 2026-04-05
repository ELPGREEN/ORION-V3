
-- Enum para tipos de fonte jurídica
CREATE TYPE public.citation_type AS ENUM ('legislation', 'jurisprudence', 'doctrine', 'regulation', 'treaty', 'custom');

-- Enum para status de vigência
CREATE TYPE public.citation_validity AS ENUM ('vigente', 'revogada', 'parcialmente_revogada', 'pendente', 'desconhecida');

-- ══════════════════════════════════════════════════════════
-- Tabela 1: Fontes oficiais cadastradas
-- ══════════════════════════════════════════════════════════
CREATE TABLE public.citation_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  jurisdiction TEXT NOT NULL DEFAULT 'BR',
  base_url TEXT NOT NULL,
  api_url TEXT,
  source_type citation_type NOT NULL DEFAULT 'legislation',
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  reliability_score NUMERIC(3,2) NOT NULL DEFAULT 1.00,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.citation_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view sources"
  ON public.citation_sources FOR SELECT
  TO authenticated USING (true);

-- ══════════════════════════════════════════════════════════
-- Tabela 2: Citações jurídicas verificáveis
-- ══════════════════════════════════════════════════════════
CREATE TABLE public.legal_citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  source_id UUID REFERENCES public.citation_sources(id),
  citation_type citation_type NOT NULL,
  jurisdiction TEXT NOT NULL DEFAULT 'BR',
  
  -- Conteúdo da citação
  title TEXT NOT NULL,
  full_reference TEXT NOT NULL,
  abnt_reference TEXT,
  excerpt TEXT,
  
  -- Identificação oficial
  official_id TEXT,
  official_url TEXT,
  official_date DATE,
  
  -- Verificação
  validity_status citation_validity NOT NULL DEFAULT 'desconhecida',
  verification_hash TEXT,
  last_verified_at TIMESTAMPTZ,
  reliability_score NUMERIC(3,2) DEFAULT 0.00,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  
  -- Contexto
  context_document_id UUID REFERENCES public.documents(id) ON DELETE SET NULL,
  context_conversation_id UUID,
  tags TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_legal_citations_user ON public.legal_citations(user_id);
CREATE INDEX idx_legal_citations_type ON public.legal_citations(citation_type);
CREATE INDEX idx_legal_citations_jurisdiction ON public.legal_citations(jurisdiction);
CREATE INDEX idx_legal_citations_official_id ON public.legal_citations(official_id);
CREATE INDEX idx_legal_citations_verified ON public.legal_citations(is_verified);

ALTER TABLE public.legal_citations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own citations"
  ON public.legal_citations FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can create own citations"
  ON public.legal_citations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own citations"
  ON public.legal_citations FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own citations"
  ON public.legal_citations FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ══════════════════════════════════════════════════════════
-- Tabela 3: Log de verificações
-- ══════════════════════════════════════════════════════════
CREATE TABLE public.citation_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  citation_id UUID NOT NULL REFERENCES public.legal_citations(id) ON DELETE CASCADE,
  
  verification_type TEXT NOT NULL DEFAULT 'url_check',
  url_accessible BOOLEAN,
  content_matches BOOLEAN,
  validity_confirmed BOOLEAN,
  
  response_status INTEGER,
  response_hash TEXT,
  error_message TEXT,
  
  verification_details JSONB DEFAULT '{}',
  verified_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_citation_verifications_citation ON public.citation_verifications(citation_id);

ALTER TABLE public.citation_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view verifications of own citations"
  ON public.citation_verifications FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.legal_citations lc
      WHERE lc.id = citation_id AND lc.user_id = auth.uid()
    )
  );

-- ══════════════════════════════════════════════════════════
-- Trigger de updated_at
-- ══════════════════════════════════════════════════════════
CREATE TRIGGER update_citation_sources_updated_at
  BEFORE UPDATE ON public.citation_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_legal_citations_updated_at
  BEFORE UPDATE ON public.legal_citations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ══════════════════════════════════════════════════════════
-- Dados iniciais: Fontes oficiais
-- ══════════════════════════════════════════════════════════
INSERT INTO public.citation_sources (name, jurisdiction, base_url, api_url, source_type, description, reliability_score) VALUES
-- Brasil
('Planalto - Legislação Federal', 'BR', 'https://www.planalto.gov.br', 'https://www.planalto.gov.br/ccivil_03', 'legislation', 'Portal oficial da legislação federal brasileira', 1.00),
('LexML Brasil', 'BR', 'https://www.lexml.gov.br', 'https://www.lexml.gov.br/busca/SRU', 'legislation', 'Rede de informação legislativa e jurídica brasileira com API SRU', 1.00),
('STF - Supremo Tribunal Federal', 'BR', 'https://portal.stf.jus.br', 'https://portal.stf.jus.br/jurisprudencia', 'jurisprudence', 'Jurisprudência do STF', 1.00),
('STJ - Superior Tribunal de Justiça', 'BR', 'https://www.stj.jus.br', 'https://scon.stj.jus.br/SCON', 'jurisprudence', 'Jurisprudência do STJ', 1.00),
('TST - Tribunal Superior do Trabalho', 'BR', 'https://www.tst.jus.br', NULL, 'jurisprudence', 'Jurisprudência trabalhista', 1.00),
('JusBrasil', 'BR', 'https://www.jusbrasil.com.br', NULL, 'jurisprudence', 'Agregador de jurisprudência e legislação', 0.85),

-- Internacional
('EUR-Lex', 'EU', 'https://eur-lex.europa.eu', 'https://eur-lex.europa.eu/search.html', 'legislation', 'Legislação da União Europeia', 1.00),
('US Code', 'US', 'https://uscode.house.gov', NULL, 'legislation', 'Código dos Estados Unidos', 1.00),
('Cornell Law - LII', 'US', 'https://www.law.cornell.edu', NULL, 'legislation', 'Legal Information Institute - referência jurídica americana', 0.95),
('Supreme Court US', 'US', 'https://www.supremecourt.gov', NULL, 'jurisprudence', 'Suprema Corte dos EUA', 1.00),
('Diário da República', 'PT', 'https://dre.pt', 'https://dre.pt/web/soapserver/action', 'legislation', 'Legislação portuguesa oficial', 1.00),
('Norme in Rete', 'IT', 'https://www.normattiva.it', NULL, 'legislation', 'Legislação italiana', 1.00),
('BOE - Boletín Oficial del Estado', 'ES', 'https://www.boe.es', 'https://www.boe.es/datosabiertos', 'legislation', 'Legislação espanhola oficial', 1.00),
('中国法律法规数据库', 'CN', 'https://flk.npc.gov.cn', NULL, 'legislation', 'Base de dados legislativa da China', 1.00);
