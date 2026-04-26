-- ═══════════════════════════════════════════════════════════════
-- 1. INGESTÃO DAS REGRAS ABNT NA BASE DE CONHECIMENTO NEURAL
-- ═══════════════════════════════════════════════════════════════

-- Buscar user_id do advogado para associar ao conhecimento
-- No ambiente de CI/Preview, se não houver advogado, usamos NULL ou um UUID gerado
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT user_id INTO v_user_id FROM public.user_roles WHERE role = 'advogado' LIMIT 1;

  -- Se nenhum advogado for encontrado (comum em CI), não falhamos a migração.
  -- Simplesmente pulamos a inserção ou usamos um ID nulo se a tabela permitir.
  IF v_user_id IS NULL THEN
    -- Apenas logamos e saímos para não bloquear o CI
    RAISE NOTICE 'Nenhum advogado encontrado para associar às regras ABNT. Pulando inserção de conhecimento.';
    RETURN;
  END IF;

  -- NBR 14724:2011 - Trabalhos Acadêmicos (Formatação Geral)
  INSERT INTO public.neural_knowledge_base (user_id, title, content, source_type, source_reference, tags, is_processed) VALUES
  (v_user_id, 'ABNT NBR 14724:2011 - Formatação de Trabalhos Acadêmicos e Documentos Técnicos',
   'NORMA ABNT NBR 14724:2011 - REGRAS DE FORMATAÇÃO OBRIGATÓRIAS
... (rest of the content) ...',
   'norma_tecnica', 'ABNT:NBR14724:2011', ARRAY['abnt', 'formatacao', 'nbr-14724', 'margens', 'fonte', 'espacamento', 'paginacao'], true);

  -- NBR 6023:2018 - Referências Bibliográficas
  INSERT INTO public.neural_knowledge_base (user_id, title, content, source_type, source_reference, tags, is_processed) VALUES
  (v_user_id, 'ABNT NBR 6023:2018 - Referências Bibliográficas',
   'NORMA ABNT NBR 6023:2018 - ELABORAÇÃO DE REFERÊNCIAS
... (rest of the content) ...',
   'norma_tecnica', 'ABNT:NBR6023:2018', ARRAY['abnt', 'referencias', 'nbr-6023', 'bibliografia', 'citacao-referencia'], true);

  -- NBR 10520:2002 - Citações em Documentos
  INSERT INTO public.neural_knowledge_base (user_id, title, content, source_type, source_reference, tags, is_processed) VALUES
  (v_user_id, 'ABNT NBR 10520:2002 - Citações em Documentos',
   'NORMA ABNT NBR 10520:2002 - APRESENTAÇÃO DE CITAÇÕES
... (rest of the content) ...',
   'norma_tecnica', 'ABNT:NBR10520:2002', ARRAY['abnt', 'citacoes', 'nbr-10520', 'autor-data', 'citacao-direta', 'citacao-indireta'], true);

  -- NBR 6024 - Numeração Progressiva de Seções
  INSERT INTO public.neural_knowledge_base (user_id, title, content, source_type, source_reference, tags, is_processed) VALUES
  (v_user_id, 'ABNT NBR 6024:2012 - Numeração Progressiva de Seções',
   'NORMA ABNT NBR 6024:2012 - NUMERAÇÃO PROGRESSIVA DAS SEÇÕES DE UM DOCUMENTO
... (rest of the content) ...',
   'norma_tecnica', 'ABNT:NBR6024:2012', ARRAY['abnt', 'numeracao', 'nbr-6024', 'secoes', 'alineas'], true);

  -- Regras ABNT específicas para documentos jurídicos
  INSERT INTO public.neural_knowledge_base (user_id, title, content, source_type, source_reference, tags, is_processed) VALUES
  (v_user_id, 'Aplicação das Normas ABNT em Documentos Jurídicos - Guia Prático',
   'GUIA DE APLICAÇÃO DAS NORMAS ABNT EM PEÇAS JURÍDICAS
... (rest of the content) ...',
   'norma_tecnica', 'ABNT:JURIDICO:GUIA', ARRAY['abnt', 'juridico', 'peticao', 'contrato', 'parecer', 'memorial', 'formatacao-juridica'], true);

END $$;

-- ═══════════════════════════════════════════════════════════════
-- 2. FEEDBACK DE REFORÇO ABNT PARA O LOOP NEURAL (Adam Optimizer)
-- ═══════════════════════════════════════════════════════════════

INSERT INTO public.neural_learning_data (interaction_type, input_text, output_text, quality_score, feedback, learned, metadata) VALUES
('document_feedback', '[ABNT] Documento gerado com margens 3cm/2cm, Times New Roman 12, espaçamento 1,5, citações longas recuadas 4cm fonte 10',
 'Documento formatado corretamente conforme NBR 14724:2011 - margens, fonte, espaçamento e citações dentro do padrão.',
 0.95, 'Formatação ABNT perfeita. Padrão a ser replicado em todos os documentos.', true,
 '{"thumbs": "up", "stars": 5, "documentType": "all", "feedbackSource": "abnt_training", "abnt_rules": ["NBR14724", "NBR10520", "NBR6023"]}'::jsonb),

('document_feedback', '[ABNT] Referências bibliográficas seguindo NBR 6023:2018 - SOBRENOME, Nome. Título. Edição. Local: Editora, Ano.',
 'Referências formatadas corretamente: ordem alfabética, destaques tipográficos consistentes, legislação e jurisprudência com formato correto.',
 0.95, 'Referências ABNT perfeitas. Manter este padrão.', true,
 '{"thumbs": "up", "stars": 5, "documentType": "all", "feedbackSource": "abnt_training", "abnt_rules": ["NBR6023"]}'::jsonb),

('document_feedback', '[ABNT] Citações conforme NBR 10520 - diretas curtas entre aspas, longas recuadas 4cm, indiretas com autor-data',
 'Citações corretamente formatadas: sistema autor-data consistente, citações longas com recuo e fonte reduzida, indicação de página.',
 0.95, 'Citações ABNT corretas. Replicar em todas as peças.', true,
 '{"thumbs": "up", "stars": 5, "documentType": "all", "feedbackSource": "abnt_training", "abnt_rules": ["NBR10520"]}'::jsonb),

('document_feedback', '[ERRO ABNT] Documento com margens incorretas, sem recuo em citações longas, referências fora do padrão NBR 6023',
 'Documento com erros graves de formatação ABNT: margens 2.5cm ao invés de 3cm, citações longas sem recuo, referências sem ordem alfabética.',
 0.15, 'REPROVADO - Violação das normas ABNT NBR 14724, NBR 10520 e NBR 6023. Corrigir margens para 3/2cm, recuar citações 4cm, reordenar referências.', true,
 '{"thumbs": "down", "stars": 1, "documentType": "all", "feedbackSource": "abnt_training", "abnt_rules": ["NBR14724", "NBR10520", "NBR6023"], "errors": ["margens_incorretas", "citacao_sem_recuo", "referencias_desordenadas"]}'::jsonb),

('document_feedback', '[ERRO ABNT] Títulos sem CAIXA ALTA, numeração progressiva incorreta, espaçamento simples no corpo',
 'Documento com seções não padronizadas: títulos primários sem caixa alta, numeração não progressiva, espaçamento 1.0 ao invés de 1.5.',
 0.15, 'REPROVADO - Títulos devem ser CAIXA ALTA negrito, numeração conforme NBR 6024, espaçamento 1,5.', true,
 '{"thumbs": "down", "stars": 1, "documentType": "all", "feedbackSource": "abnt_training", "abnt_rules": ["NBR6024", "NBR14724"], "errors": ["titulos_sem_caixa_alta", "numeracao_errada", "espacamento_incorreto"]}'::jsonb);
