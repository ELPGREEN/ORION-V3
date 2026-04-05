-- Drop the restrictive check constraint and add a broader one
ALTER TABLE public.neural_knowledge_base DROP CONSTRAINT neural_knowledge_base_source_type_check;

ALTER TABLE public.neural_knowledge_base ADD CONSTRAINT neural_knowledge_base_source_type_check
CHECK (source_type = ANY (ARRAY[
  'jurisprudencia'::text,
  'doutrina'::text,
  'legislacao'::text,
  'modelo_documento'::text,
  'custom'::text,
  'catalogo_senado'::text,
  'legislacao_federal'::text,
  'datajud'::text,
  'lexml'::text,
  'senado_api'::text,
  'camara_api'::text,
  'courtlistener'::text
]));