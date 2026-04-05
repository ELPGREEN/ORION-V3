-- Add missing categories to neural_specializations check constraint
ALTER TABLE public.neural_specializations DROP CONSTRAINT IF EXISTS neural_specializations_category_check;

ALTER TABLE public.neural_specializations ADD CONSTRAINT neural_specializations_category_check 
CHECK (category = ANY (ARRAY[
  'direito_civil'::text, 
  'direito_penal'::text, 
  'direito_trabalhista'::text, 
  'direito_tributario'::text, 
  'direito_familia'::text, 
  'direito_consumidor'::text, 
  'direito_empresarial'::text, 
  'direito_previdenciario'::text,
  'direito_administrativo'::text,
  'direito_ambiental'::text,
  'direito_constitucional'::text,
  'direito_eleitoral'::text,
  'direito_bancario'::text,
  'direito_imobiliario'::text,
  'direito_internacional'::text,
  'us_constitutional'::text,
  'us_civil'::text,
  'us_criminal'::text,
  'comparado'::text,
  'jurisprudencia'::text,
  'custom'::text
]));