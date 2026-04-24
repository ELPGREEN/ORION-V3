
-- ═══════════════════════════════════════════════════════════════
-- 1. INGESTÃO DAS REGRAS ABNT NA BASE DE CONHECIMENTO NEURAL
-- ═══════════════════════════════════════════════════════════════

-- Buscar user_id do advogado para associar ao conhecimento
DO $$
DECLARE
  v_user_id UUID;
BEGIN
  SELECT user_id INTO v_user_id FROM public.user_roles WHERE role = 'advogado' LIMIT 1;
  IF v_user_id IS NOT NULL THEN

  -- NBR 14724:2011 - Trabalhos Acadêmicos (Formatação Geral)
  INSERT INTO public.neural_knowledge_base (user_id, title, content, source_type, source_reference, tags, is_processed) VALUES
  (v_user_id, 'ABNT NBR 14724:2011 - Formatação de Trabalhos Acadêmicos e Documentos Técnicos',
   'NORMA ABNT NBR 14724:2011 - REGRAS DE FORMATAÇÃO OBRIGATÓRIAS

MARGENS:
- Superior: 3 cm
- Inferior: 2 cm
- Esquerda: 3 cm
- Direita: 2 cm

FONTE:
- Corpo do texto: Times New Roman ou Arial, tamanho 12
- Citações longas (mais de 3 linhas): tamanho 10, recuo de 4 cm da margem esquerda, espaçamento simples
- Notas de rodapé: tamanho 10
- Legendas de figuras e tabelas: tamanho 10

ESPAÇAMENTO:
- Entrelinhas do corpo do texto: 1,5
- Citações longas: espaçamento simples
- Notas de rodapé: espaçamento simples
- Referências bibliográficas: espaçamento simples entre linhas, duplo entre referências
- Entre título da seção e texto: duplo (2 x 1,5)

PAGINAÇÃO:
- Contagem inicia na folha de rosto
- Numeração aparece a partir da primeira folha de texto (Introdução)
- Posição: canto superior direito, a 2 cm da borda superior
- Fonte da numeração: tamanho 10

TÍTULOS E SEÇÕES:
- Seção primária: CAIXA ALTA, negrito, tamanho 12
- Seção secundária: CAIXA ALTA, sem negrito, tamanho 12
- Seção terciária: Apenas inicial maiúscula, negrito, tamanho 12
- Seção quaternária: Apenas inicial maiúscula, itálico, tamanho 12
- Seção quinária: Apenas inicial maiúscula, sem destaque, tamanho 12
- Numeração progressiva conforme ABNT NBR 6024

PARÁGRAFOS:
- Recuo de primeira linha: 1,25 cm (ou 2 cm conforme convenção)
- Alinhamento: justificado
- Sem espaço extra entre parágrafos do mesmo bloco

ELEMENTOS PRÉ-TEXTUAIS:
- Capa, folha de rosto, errata, folha de aprovação, dedicatória, agradecimentos, epígrafe, resumo, abstract, listas, sumário
- Sumário conforme ABNT NBR 6027

ELEMENTOS PÓS-TEXTUAIS:
- Referências (obrigatório), glossário, apêndice, anexo, índice',
   'norma_tecnica', 'ABNT:NBR14724:2011', ARRAY['abnt', 'formatacao', 'nbr-14724', 'margens', 'fonte', 'espacamento', 'paginacao'], true);

  -- NBR 6023:2018 - Referências Bibliográficas
  INSERT INTO public.neural_knowledge_base (user_id, title, content, source_type, source_reference, tags, is_processed) VALUES
  (v_user_id, 'ABNT NBR 6023:2018 - Referências Bibliográficas',
   'NORMA ABNT NBR 6023:2018 - ELABORAÇÃO DE REFERÊNCIAS

REGRA GERAL: Toda citação no texto deve ter entrada correspondente na lista de referências.

FORMATO PARA LIVROS:
SOBRENOME, Nome. Título: subtítulo. Edição. Local: Editora, Ano.
Exemplo: SILVA, José Afonso da. Curso de Direito Constitucional Positivo. 43. ed. São Paulo: Malheiros, 2020.

FORMATO PARA ARTIGOS DE PERIÓDICOS:
SOBRENOME, Nome. Título do artigo. Nome do Periódico, Local, v., n., p. inicial-final, mês abreviado. ano.

FORMATO PARA LEGISLAÇÃO:
JURISDIÇÃO. Título e numeração da legislação. Dados da publicação. Seção, página.
Exemplo: BRASIL. Lei nº 13.105, de 16 de março de 2015. Código de Processo Civil. Diário Oficial da União, Brasília, DF, 17 mar. 2015. Seção 1, p. 1.

FORMATO PARA JURISPRUDÊNCIA:
JURISDIÇÃO. Órgão judiciário. Tipo de documento e número. Partes (se houver). Relator. Data de julgamento. Dados da publicação.
Exemplo: BRASIL. Superior Tribunal de Justiça. Recurso Especial nº 1.234.567/RS. Relator: Ministro Fulano de Tal. Julgado em 15 mar. 2024. DJe, 20 mar. 2024.

FORMATO PARA DOCUMENTOS ELETRÔNICOS:
Acrescenta-se ao final: Disponível em: URL. Acesso em: dia mês abreviado. ano.

ORDENAÇÃO:
- Sistema alfabético: ordem alfabética por sobrenome do autor
- Sistema numérico: ordem de citação no texto

DESTAQUES TIPOGRÁFICOS:
- Título da obra: negrito, itálico ou sublinhado (escolher um e manter em toda a lista)
- Títulos de periódicos: negrito
- Em meio eletrônico, usar itálico para título',
   'norma_tecnica', 'ABNT:NBR6023:2018', ARRAY['abnt', 'referencias', 'nbr-6023', 'bibliografia', 'citacao-referencia'], true);

  -- NBR 10520:2002 - Citações em Documentos
  INSERT INTO public.neural_knowledge_base (user_id, title, content, source_type, source_reference, tags, is_processed) VALUES
  (v_user_id, 'ABNT NBR 10520:2002 - Citações em Documentos',
   'NORMA ABNT NBR 10520:2002 - APRESENTAÇÃO DE CITAÇÕES

CITAÇÃO DIRETA CURTA (até 3 linhas):
- Inserida no parágrafo, entre aspas duplas
- Exemplo: Segundo Silva (2020, p. 45), "a dignidade da pessoa humana é fundamento da República".

CITAÇÃO DIRETA LONGA (mais de 3 linhas):
- Em parágrafo separado
- Recuo de 4 cm da margem esquerda
- Fonte tamanho 10
- Espaçamento simples
- SEM aspas
- Indicar autor, ano e página obrigatoriamente

CITAÇÃO INDIRETA (paráfrase):
- Texto baseado na obra consultada, com palavras próprias
- Indicar autor e ano (página é opcional mas recomendada)
- Exemplo: Conforme Silva (2020), a dignidade humana fundamenta todo o ordenamento jurídico brasileiro.

SISTEMA AUTOR-DATA:
- No texto: (SOBRENOME, ano, p. XX)
- Quando no início da frase: Sobrenome (ano, p. XX)
- Dois autores: (SOBRENOME1; SOBRENOME2, ano)
- Três ou mais: (SOBRENOME1 et al., ano)
- Sem autor: primeira palavra do título em caixa alta

SISTEMA NUMÉRICO:
- Número entre colchetes, parênteses ou sobrescrito, sequencial
- Exemplo: [1], (1) ou ¹

CITAÇÃO DE CITAÇÃO (apud):
- Usar apenas quando impossível acessar a fonte original
- Formato: (AUTOR ORIGINAL apud AUTOR CONSULTADO, ano, p. XX)
- Na lista de referências, incluir APENAS a obra consultada

SUPRESSÕES E INTERPOLAÇÕES:
- Supressão: [...]
- Interpolação/comentário: [ ]
- Ênfase: grifo nosso ou grifo do autor
- Tradução: tradução nossa

EM DOCUMENTOS JURÍDICOS:
- Legislação: (BRASIL, ano) ou conforme art. X da Lei Y
- Jurisprudência: (BRASIL. STJ, ano) com dados do julgado
- Doutrina: sistema autor-data padrão',
   'norma_tecnica', 'ABNT:NBR10520:2002', ARRAY['abnt', 'citacoes', 'nbr-10520', 'autor-data', 'citacao-direta', 'citacao-indireta'], true);

  -- NBR 6024 - Numeração Progressiva de Seções
  INSERT INTO public.neural_knowledge_base (user_id, title, content, source_type, source_reference, tags, is_processed) VALUES
  (v_user_id, 'ABNT NBR 6024:2012 - Numeração Progressiva de Seções',
   'NORMA ABNT NBR 6024:2012 - NUMERAÇÃO PROGRESSIVA DAS SEÇÕES DE UM DOCUMENTO

REGRAS:
- Seções primárias: 1, 2, 3... (CAIXA ALTA, negrito)
- Seções secundárias: 1.1, 1.2, 2.1... (CAIXA ALTA, sem negrito)
- Seções terciárias: 1.1.1, 1.1.2... (inicial maiúscula, negrito)
- Não se utilizam mais de 5 níveis de subdivisão
- Os títulos das seções devem ser separados do texto por um espaço de 1,5 entrelinhas
- Alíneas: letras minúsculas seguidas de parêntese (a), b), c)...)
- Subalíneas: travessão seguido de espaço

EM DOCUMENTOS JURÍDICOS, a numeração progressiva aplica-se a:
- Memoriais
- Pareceres jurídicos
- Relatórios técnicos
- Contratos complexos (capítulos e cláusulas)

Petições seguem estrutura própria do CPC mas adotam princípios de organização lógica similar.',
   'norma_tecnica', 'ABNT:NBR6024:2012', ARRAY['abnt', 'numeracao', 'nbr-6024', 'secoes', 'alineas'], true);

  -- Regras ABNT específicas para documentos jurídicos
  INSERT INTO public.neural_knowledge_base (user_id, title, content, source_type, source_reference, tags, is_processed) VALUES
  (v_user_id, 'Aplicação das Normas ABNT em Documentos Jurídicos - Guia Prático',
   'GUIA DE APLICAÇÃO DAS NORMAS ABNT EM PEÇAS JURÍDICAS

1. PETIÇÕES JUDICIAIS:
- Margens: 3cm (superior/esquerda), 2cm (inferior/direita) conforme NBR 14724
- Fonte: Times New Roman 12pt, espaçamento 1,5
- Endereçamento: CAIXA ALTA, centralizado, negrito
- Qualificação: parágrafo contínuo, justificado
- Títulos de seções (DOS FATOS, DO DIREITO, DOS PEDIDOS): CAIXA ALTA, negrito, centralizado
- Citações doutrinárias longas: recuo 4cm, fonte 10, espaçamento simples (NBR 10520)
- Referências ao final: conforme NBR 6023

2. CONTRATOS:
- Cláusulas numeradas: CLÁUSULA PRIMEIRA, CLÁUSULA SEGUNDA (CAIXA ALTA, negrito)
- Subcláusulas: Parágrafo Primeiro, Parágrafo Segundo
- Alíneas: a), b), c) conforme NBR 6024
- Margens e fonte: padrão ABNT

3. PARECERES JURÍDICOS:
- Estrutura: Ementa, Consulta, Fundamentação, Conclusão
- Numeração progressiva conforme NBR 6024
- Citações e referências conforme NBR 10520 e NBR 6023
- Notas de rodapé: fonte 10, espaçamento simples

4. MEMORIAIS:
- Aplicação integral da NBR 14724
- Sumário conforme NBR 6027
- Referências conforme NBR 6023

5. NOTIFICAÇÕES EXTRAJUDICIAIS:
- Formatação simplificada mas respeitando margens e fonte ABNT
- Sem necessidade de numeração progressiva

REGRA DE OURO: Todo documento jurídico formal deve seguir as margens 3/2cm, Times New Roman 12pt e espaçamento 1,5 como padrão mínimo ABNT.',
   'norma_tecnica', 'ABNT:JURIDICO:GUIA', ARRAY['abnt', 'juridico', 'peticao', 'contrato', 'parecer', 'memorial', 'formatacao-juridica'], true);

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

  END IF;
END $$;
