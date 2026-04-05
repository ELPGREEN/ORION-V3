-- Remove placeholder/template documents that pollute search results
-- These are not real legal content, just search instructions
DELETE FROM public.legal_embeddings
WHERE content LIKE 'Pesquise %' 
   OR content LIKE 'Busque %' 
   OR content LIKE 'Estatísticas judiciais%'
   OR title LIKE 'Legislação: "%'
   OR title LIKE 'Jurisprudência: "%'
   OR title LIKE 'Acórdãos STF: "%'
   OR title LIKE 'Súmulas STF: "%'
   OR title LIKE 'Justiça em Números: "%'
   OR title LIKE 'Entidades: "%'
   OR title LIKE 'Livros: "%';