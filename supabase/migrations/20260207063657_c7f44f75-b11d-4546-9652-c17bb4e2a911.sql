-- Tabela para compartilhamento de documentos entre advogado e clientes
CREATE TABLE public.shared_documents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  shared_by UUID NOT NULL,
  shared_with UUID NOT NULL,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.shared_documents ENABLE ROW LEVEL SECURITY;

-- Advogados podem compartilhar documentos
CREATE POLICY "Advogados can share documents"
  ON public.shared_documents FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'advogado') AND shared_by = auth.uid());

-- Advogados podem ver todos os compartilhamentos
CREATE POLICY "Advogados can view all shared documents"
  ON public.shared_documents FOR SELECT
  USING (has_role(auth.uid(), 'advogado'));

-- Clientes podem ver documentos compartilhados com eles
CREATE POLICY "Clientes can view shared documents"
  ON public.shared_documents FOR SELECT
  USING (shared_with = auth.uid());

-- Advogados podem deletar compartilhamentos
CREATE POLICY "Advogados can delete shared documents"
  ON public.shared_documents FOR DELETE
  USING (has_role(auth.uid(), 'advogado') AND shared_by = auth.uid());

-- Atualizar política de documentos para clientes verem docs compartilhados
CREATE POLICY "Clientes can view shared documents"
  ON public.documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.shared_documents sd
      WHERE sd.document_id = documents.id
        AND sd.shared_with = auth.uid()
    )
  );

-- Criar índices para performance
CREATE INDEX idx_shared_documents_document_id ON public.shared_documents(document_id);
CREATE INDEX idx_shared_documents_shared_with ON public.shared_documents(shared_with);
CREATE INDEX idx_shared_documents_shared_by ON public.shared_documents(shared_by);