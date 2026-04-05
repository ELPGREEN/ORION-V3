-- Drop old check constraint and add updated one with all categories
ALTER TABLE public.neural_specializations DROP CONSTRAINT neural_specializations_category_check;

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
  'custom'::text
]));

-- Clean up duplicate pending proposals (keep only the most recent one per scope+type)
DELETE FROM public.neural_evolution_proposals
WHERE id IN (
  SELECT id FROM (
    SELECT id, ROW_NUMBER() OVER (
      PARTITION BY scope, proposal_type, title 
      ORDER BY created_at DESC
    ) as rn
    FROM public.neural_evolution_proposals
    WHERE status = 'pending'
  ) sub
  WHERE rn > 1
);