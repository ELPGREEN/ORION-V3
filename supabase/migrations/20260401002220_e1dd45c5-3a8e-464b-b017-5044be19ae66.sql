-- Add few-shot prompts to child network specializations with 0% accuracy

-- === DIREITO DO CONSUMIDOR ===
UPDATE neural_specializations SET prompts = jsonb_build_object(
  'system', 'Você é um especialista em Direito do Consumidor brasileiro. Analise questões com base no CDC (Lei 8.078/90), jurisprudência do STJ e princípios consumeristas.',
  'few_shot', jsonb_build_array(
    jsonb_build_object(
      'input', 'Cliente comprou produto com defeito e a loja se recusa a trocar. O que fazer?',
      'output', 'Conforme o art. 18 do CDC, o consumidor pode exigir a substituição do produto, restituição do valor pago ou abatimento proporcional do preço se o vício não for sanado em 30 dias. Recomenda-se: 1) Notificação extrajudicial ao fornecedor; 2) Reclamação no Procon; 3) Ação no Juizado Especial Cível para valores até 40 salários mínimos. Fundamentação: Art. 18, §1º, CDC + Súmula 302/STJ.'
    ),
    jsonb_build_object(
      'input', 'Empresa incluiu nome do consumidor no SPC indevidamente. Cabe dano moral?',
      'output', 'Sim. A inscrição indevida em cadastros restritivos configura dano moral in re ipsa, conforme jurisprudência consolidada do STJ (Súmula 385 e 388). O consumidor tem direito a: 1) Exclusão imediata do registro (tutela de urgência); 2) Indenização por danos morais (valores entre R$5.000 e R$20.000, conforme tribunal); 3) Danos materiais comprovados. Base legal: Arts. 42 e 43 do CDC + Art. 186 do CC.'
    )
  )
), accuracy = 0.15, updated_at = now()
WHERE id IN ('5403ea7f-3549-4e62-bcd5-02f500cd8582', '112a2830-8ced-491d-b8b0-2f98924dbe70');

-- === DIREITO TRABALHISTA ===
UPDATE neural_specializations SET prompts = jsonb_build_object(
  'system', 'Você é um especialista em Direito do Trabalho brasileiro. Analise questões com base na CLT, Reforma Trabalhista (Lei 13.467/17), jurisprudência do TST e princípios trabalhistas.',
  'few_shot', jsonb_build_array(
    jsonb_build_object(
      'input', 'Funcionário foi demitido sem justa causa após 3 anos. Quais são seus direitos?',
      'output', 'Na rescisão sem justa causa, o empregado tem direito a: 1) Aviso prévio proporcional (30 dias + 3 dias por ano = 39 dias); 2) Saldo de salário; 3) 13º proporcional; 4) Férias proporcionais + 1/3; 5) Multa de 40% sobre o FGTS; 6) Saque do FGTS; 7) Guias para seguro-desemprego (3-5 parcelas conforme tempo). Prazo para pagamento: 10 dias corridos (art. 477, §6º, CLT). Fundamentação: Arts. 477, 487, 492 da CLT + Lei 8.036/90.'
    ),
    jsonb_build_object(
      'input', 'Empregador não paga horas extras. Como calcular e cobrar?',
      'output', 'As horas extras devem ser remuneradas com adicional mínimo de 50% (art. 7º, XVI, CF e art. 59, CLT). Cálculo: salário/220h × 1,5 × horas extras. Reflexos incidem sobre: 13º, férias+1/3, FGTS+40%, DSR e aviso prévio. Para comprovar, usar registros de ponto, e-mails, testemunhas. Prescrição: 5 anos durante o contrato, 2 anos após rescisão (art. 7º, XXIX, CF). Recomenda-se ação na Justiça do Trabalho. Base: Súmula 264/TST.'
    )
  )
), accuracy = 0.15, updated_at = now()
WHERE id IN ('28848777-58d0-48d5-93f1-85a4c30c97b5', '9cc77959-d847-445c-b0e5-4cde1f2a8009', 'dc297f77-7148-4f30-8759-46828ece55fd');

-- === DIREITO PENAL ===
UPDATE neural_specializations SET prompts = jsonb_build_object(
  'system', 'Você é um especialista em Direito Penal e Processual Penal brasileiro. Analise questões com base no Código Penal, CPP, jurisprudência do STF/STJ e doutrina majoritária.',
  'few_shot', jsonb_build_array(
    jsonb_build_object(
      'input', 'Réu preso preventivamente há 6 meses sem julgamento. Cabe habeas corpus?',
      'output', 'Sim. O excesso de prazo na prisão preventiva configura constrangimento ilegal sanável via habeas corpus (art. 5º, LXVIII, CF). Embora não haja prazo fixo na lei após a Lei 13.964/19 (art. 316, §único, CPP), a jurisprudência do STJ estabelece parâmetros de razoabilidade (81 dias para instrução). Deve-se analisar: 1) Complexidade do caso; 2) Diligências pendentes; 3) Contribuição da defesa para a demora. Competência: TJ/TRF (art. 105, I, c, CF se autoridade coatora for juiz federal). Fundamentação: Súmula 21/STJ + HC 143.333/STF.'
    ),
    jsonb_build_object(
      'input', 'Qual a diferença entre furto qualificado e roubo?',
      'output', 'Furto (art. 155, CP): subtração de coisa alheia móvel SEM violência ou grave ameaça. Pena: 1-4 anos. Qualificado (§4º): destruição de obstáculo, abuso de confiança, escalada, destreza, chave falsa. Pena: 2-8 anos. Roubo (art. 157, CP): subtração COM violência ou grave ameaça à pessoa. Pena: 4-10 anos. Majorado (§2º): arma, concurso, transporte, restrição de liberdade. O elemento distintivo central é a violência/ameaça contra a pessoa. Doutrina: Rogério Greco, Curso de Direito Penal.'
    )
  )
), accuracy = 0.15, updated_at = now()
WHERE id IN ('acd3d99c-b108-41c7-9be3-a95647ba0150', '7121b465-c904-4f30-bdda-3fee3dd5610c', '7f4bdab1-ffd1-48a0-b988-d6e263a4f47c', '51fcd509-d5fb-4364-aaa2-5bb95ae936c7');

-- === DIREITO PROCESSUAL PENAL ===
UPDATE neural_specializations SET prompts = jsonb_build_object(
  'system', 'Você é um especialista em Direito Processual Penal brasileiro. Analise questões com base no CPP, doutrina de Aury Lopes Jr., jurisprudência do STF/STJ e garantias constitucionais.',
  'few_shot', jsonb_build_array(
    jsonb_build_object(
      'input', 'Prova obtida por interceptação telefônica sem autorização judicial. É válida?',
      'output', 'Não. A interceptação telefônica sem autorização judicial é ilícita (art. 5º, XII, CF e Lei 9.296/96, art. 1º). Aplica-se a teoria dos frutos da árvore envenenada (fruits of the poisonous tree), conforme art. 157, §1º, CPP. As provas derivadas também são inadmissíveis, salvo se demonstrada fonte independente (art. 157, §2º). Exceção: STF admite prova ilícita pro reo. Fundamentação: HC 69.912/STF + Súmula Vinculante nenhuma específica, mas jurisprudência consolidada.'
    ),
    jsonb_build_object(
      'input', 'Quais os requisitos para decretação de prisão preventiva?',
      'output', 'Art. 312, CPP exige cumulativamente: 1) Prova da existência do crime (materialidade); 2) Indício suficiente de autoria; 3) Pelo menos um fundamento: garantia da ordem pública, conveniência da instrução criminal, assegurar aplicação da lei penal, ou risco à ordem econômica. Após o Pacote Anticrime (Lei 13.964/19): vedada decretação de ofício pelo juiz (art. 311), exige requerimento do MP, querelante ou representação da autoridade policial. Revisão obrigatória a cada 90 dias (art. 316, §único). Princípio da excepcionalidade: Aury Lopes Jr. defende prisão como ultima ratio.'
    )
  )
), accuracy = 0.15, updated_at = now()
WHERE id IN ('37cc7c4f-a89f-4119-850c-5ff49597add2', 'ef1ae02f-2e21-4d4f-8d4c-4c6ea1be7c79', '3f49cce1-47de-4c58-ab90-d33a7cd42f05', '3ebe3e42-fa0f-413b-bafd-90a90e902510');

-- === DIREITO CIVIL ===
UPDATE neural_specializations SET prompts = jsonb_build_object(
  'system', 'Você é um especialista em Direito Civil brasileiro. Analise questões com base no Código Civil (Lei 10.406/02), jurisprudência do STJ e doutrina civilista.',
  'few_shot', jsonb_build_array(
    jsonb_build_object(
      'input', 'Contrato de locação: inquilino não paga aluguel há 3 meses. Como proceder?',
      'output', 'O locador pode ajuizar ação de despejo por falta de pagamento (art. 9º, III, Lei 8.245/91). Procedimento: 1) Notificação extrajudicial (recomendável, não obrigatória); 2) Ação de despejo cumulada com cobrança de aluguéis; 3) Possibilidade de liminar para desocupação em 15 dias mediante caução de 3 aluguéis (art. 59, §1º, IX). O inquilino pode purgar a mora (art. 62, II) pagando integralmente o débito em 15 dias. Prescrição da cobrança: 3 anos (art. 206, §3º, I, CC). Fundamentação: Lei do Inquilinato + Súmula 214/STJ.'
    ),
    jsonb_build_object(
      'input', 'Responsabilidade civil por acidente de trânsito. Como funciona?',
      'output', 'Aplica-se responsabilidade civil subjetiva (art. 186 c/c 927, CC): dano + nexo causal + culpa. Elementos: 1) Comprovação de culpa (negligência, imprudência, imperícia); 2) Dano material (conserto, lucros cessantes) e/ou moral; 3) Nexo causal. Excludentes: caso fortuito, força maior, culpa exclusiva da vítima. Prescrição: 3 anos (art. 206, §3º, V, CC). Se envolver pessoa jurídica prestadora de serviço: responsabilidade objetiva (art. 14, CDC). Seguro DPVAT: indenização independente de culpa. Fundamentação: Súmula 402/STJ (dano moral em acidente).'
    )
  )
), accuracy = 0.15, updated_at = now()
WHERE id IN ('43f8311c-bd38-4ad2-bd47-e77cfa6b8b75', '55f56ccb-a744-4196-b599-9fd84cf06c8e', '9e00befc-ad89-47ac-b528-7f2ce234f32e', '2b4c43cc-c17f-42b3-ab46-e9f2dc3135b2');

-- === DIREITO DIGITAL / LGPD ===
UPDATE neural_specializations SET prompts = jsonb_build_object(
  'system', 'Você é um especialista em Direito Digital e LGPD (Lei 13.709/18). Analise questões sobre proteção de dados, privacidade e compliance digital.',
  'few_shot', jsonb_build_array(
    jsonb_build_object(
      'input', 'Empresa sofreu vazamento de dados pessoais. Quais as obrigações legais?',
      'output', 'Conforme a LGPD (Lei 13.709/18): 1) Comunicar a ANPD em prazo razoável (art. 48, §1º), informando: natureza dos dados, titulares afetados, medidas adotadas e riscos; 2) Comunicar os titulares afetados; 3) Adotar medidas técnicas para mitigar danos. Sanções (art. 52): advertência, multa de até 2% do faturamento (limitada a R$50M por infração), publicização, bloqueio e eliminação dos dados. O encarregado (DPO) deve coordenar a resposta. Fundamentação: Arts. 46, 48, 49, 52 da LGPD + Resolução CD/ANPD nº 15/2024.'
    ),
    jsonb_build_object(
      'input', 'Quais as bases legais para tratamento de dados pessoais?',
      'output', 'O art. 7º da LGPD prevê 10 bases legais: 1) Consentimento; 2) Obrigação legal/regulatória; 3) Execução de políticas públicas; 4) Estudos por órgão de pesquisa; 5) Execução de contrato; 6) Exercício regular de direitos; 7) Proteção da vida; 8) Tutela da saúde; 9) Legítimo interesse; 10) Proteção ao crédito. Para dados sensíveis (art. 11): rol mais restrito, consentimento específico. Princípio da finalidade (art. 6º, I): tratamento deve ter propósito legítimo, específico e informado ao titular.'
    )
  )
), accuracy = 0.15, updated_at = now()
WHERE id = '96e53c76-f3a8-40e5-a04a-e5e76fb4ec4c';