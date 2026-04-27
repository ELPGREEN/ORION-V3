import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════════
// CONFIGURAÇÃO DE TRIBUNAIS E FOROS
// ═══════════════════════════════════════════════════════════════

interface TribunalConfig {
  id: string;
  nome: string;
  sigla: string;
  enderecamento: { tratamento: string; orgao: string };
  legislacaoPrioritaria: string[];
  estiloArgumentacao: "formal" | "tecnico" | "conciso";
}

// Compact tribunal builder — reduces ~140 lines of repetitive config to ~40
function tb(id: string, nome: string, sigla: string, tratamento: string, orgao: string, leg: string[], estilo: "formal" | "tecnico" | "conciso"): TribunalConfig {
  return { id, nome, sigla, enderecamento: { tratamento, orgao }, legislacaoPrioritaria: leg, estiloArgumentacao: estilo };
}
const MIN = "EXCELENTÍSSIMO SENHOR MINISTRO PRESIDENTE";
const DES = "EXCELENTÍSSIMO SENHOR DESEMBARGADOR PRESIDENTE";
const DESF = "EXCELENTÍSSIMO SENHOR DESEMBARGADOR FEDERAL PRESIDENTE";

const TRIBUNAIS: Record<string, TribunalConfig> = {
  stf:  tb("stf",  "Supremo Tribunal Federal",                         "STF",  MIN,  "DO SUPREMO TRIBUNAL FEDERAL",                              ["CF/88", "Regimento Interno STF", "Lei 9.868/99"], "tecnico"),
  stj:  tb("stj",  "Superior Tribunal de Justiça",                     "STJ",  MIN,  "DO SUPERIOR TRIBUNAL DE JUSTIÇA",                          ["CPC/2015", "CC/2002", "CDC", "CF/88"],            "tecnico"),
  tst:  tb("tst",  "Tribunal Superior do Trabalho",                    "TST",  MIN,  "DO TRIBUNAL SUPERIOR DO TRABALHO",                         ["CLT", "CF/88", "Súmulas TST", "OJs SDI"],         "tecnico"),
  tse:  tb("tse",  "Tribunal Superior Eleitoral",                      "TSE",  MIN,  "DO TRIBUNAL SUPERIOR ELEITORAL",                           ["Código Eleitoral", "CF/88", "Res. TSE"],           "tecnico"),
  stm:  tb("stm",  "Superior Tribunal Militar",                        "STM",  MIN,  "DO SUPERIOR TRIBUNAL MILITAR",                             ["CPM", "CPPM", "CF/88"],                            "tecnico"),
  tjrs: tb("tjrs", "Tribunal de Justiça do Rio Grande do Sul",         "TJRS", DES,  "DO TRIBUNAL DE JUSTIÇA DO ESTADO DO RIO GRANDE DO SUL",    ["CPC/2015", "CC/2002", "CDC", "Código de Normas CGJ/RS"], "formal"),
  tjsp: tb("tjsp", "Tribunal de Justiça do Estado de São Paulo",       "TJSP", DES,  "DO TRIBUNAL DE JUSTIÇA DO ESTADO DE SÃO PAULO",            ["CPC/2015", "CC/2002", "CDC", "Código de Normas CGJ/SP"], "formal"),
  tjrj: tb("tjrj", "Tribunal de Justiça do Estado do Rio de Janeiro",  "TJRJ", DES,  "DO TRIBUNAL DE JUSTIÇA DO ESTADO DO RIO DE JANEIRO",       ["CPC/2015", "CC/2002", "CDC", "Código de Normas CGJ/RJ"], "formal"),
  tjmg: tb("tjmg", "Tribunal de Justiça do Estado de Minas Gerais",    "TJMG", DES,  "DO TRIBUNAL DE JUSTIÇA DO ESTADO DE MINAS GERAIS",         ["CPC/2015", "CC/2002", "CDC", "Código de Normas CGJ/MG"], "formal"),
  tjpr: tb("tjpr", "Tribunal de Justiça do Estado do Paraná",          "TJPR", DES,  "DO TRIBUNAL DE JUSTIÇA DO ESTADO DO PARANÁ",               ["CPC/2015", "CC/2002", "CDC", "Código de Normas CGJ/PR"], "formal"),
  trf4: tb("trf4", "Tribunal Regional Federal da 4ª Região",           "TRF4", DESF, "DO TRIBUNAL REGIONAL FEDERAL DA 4ª REGIÃO",                ["CPC/2015", "Lei 9.784/99", "CF/88"],              "tecnico"),
  trt4: tb("trt4", "Tribunal Regional do Trabalho da 4ª Região",       "TRT4", DES,  "DO TRIBUNAL REGIONAL DO TRABALHO DA 4ª REGIÃO",            ["CLT", "CF/88", "Súmulas TST", "Súmulas TRT4"],    "tecnico"),
};

const VARAS: Record<string, { tratamento: string; orgao: string }> = {
  civel: {
    tratamento: "EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO",
    orgao: "DA VARA CÍVEL DA COMARCA DE {comarca}",
  },
  familia: {
    tratamento: "EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO",
    orgao: "DA VARA DE FAMÍLIA E SUCESSÕES DA COMARCA DE {comarca}",
  },
  trabalho: {
    tratamento: "EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DO TRABALHO",
    orgao: "DA VARA DO TRABALHO DE {comarca}",
  },
  federal: {
    tratamento: "EXCELENTÍSSIMO SENHOR DOUTOR JUIZ FEDERAL",
    orgao: "DA VARA FEDERAL DE {comarca}",
  },
  juizado: {
    tratamento: "MERITÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO",
    orgao: "DO JUIZADO ESPECIAL CÍVEL DA COMARCA DE {comarca}",
  },
  fazenda: {
    tratamento: "EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO",
    orgao: "DA VARA DA FAZENDA PÚBLICA DA COMARCA DE {comarca}",
  },
};

function formatarEnderecamento(tribunalId?: string, vara?: string, comarca?: string): string {
  if (tribunalId && TRIBUNAIS[tribunalId]) {
    const t = TRIBUNAIS[tribunalId];
    return `${t.enderecamento.tratamento}\n${t.enderecamento.orgao}`;
  }
  if (vara && VARAS[vara]) {
    const v = VARAS[vara];
    return `${v.tratamento}\n${v.orgao.replace("{comarca}", comarca?.toUpperCase() || "PORTO ALEGRE")}`;
  }
  return "EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO\nDA COMARCA DE PORTO ALEGRE/RS";
}

function getLegislacaoPrioritaria(tribunalId?: string, areaJuridica?: string): string[] {
  const base = tribunalId && TRIBUNAIS[tribunalId] 
    ? TRIBUNAIS[tribunalId].legislacaoPrioritaria 
    : ["CPC/2015", "CC/2002", "CF/88"];
  
  const porArea: Record<string, string[]> = {
    consumidor: ["CDC", "CC/2002", "CPC/2015"],
    trabalhista: ["CLT", "CF/88", "Súmulas TST"],
    previdenciario: ["Lei 8.213/91", "Lei 8.212/91", "CF/88"],
    tributario: ["CTN", "CF/88", "Lei 6.830/80"],
    familia: ["CC/2002", "CPC/2015", "ECA"],
    penal: ["CP", "CPP", "LEP", "CF/88"],
    administrativo: ["Lei 9.784/99", "Lei 14.133/21", "CF/88"],
  };
  
  if (areaJuridica && porArea[areaJuridica]) {
    return [...new Set([...porArea[areaJuridica], ...base])];
  }
  return base;
}

interface FeedbackExample {
  content_snippet: string;
  quality_score: number;
  feedback: string;
  tipo: string;
}

interface NeuralContext {
  jurisprudence: Array<{ title: string; content: string; source: string; url?: string }>;
  knowledge: Array<{ title: string; content: string; source_type: string }>;
  specializations: Array<{ name: string; prompts: Record<string, string> }>;
  externalResults: Array<{ source: string; title: string; content: string; url?: string; tipo: string }>;
  feedbackPositive: FeedbackExample[];
  feedbackNegative: FeedbackExample[];
  txtKnowledge: TxtKnowledgeResult[];
}

// ═══════════════════════════════════════════════════════════════
// PROMPTS ESPECIALIZADOS POR TIPO DE PEÇA
// ═══════════════════════════════════════════════════════════════

interface PromptEspecializado {
  legislacao: string[];
  estrutura: string;
  instrucoes_especificas: string;
}

const PROMPT_ESPECIALIZADO: Record<string, PromptEspecializado> = {
  "habeas-corpus": {
    legislacao: ["art. 5º, LXVIII, CF/88", "arts. 647-667, CPP", "art. 648, CPP (hipóteses de constrangimento ilegal)", "Súmula 695 STF", "arts. 188-199, RISTF (se ao STF)"],
    estrutura: `1. Endereçamento ao Tribunal competente (STJ, STF ou TJ)
2. Identificação do IMPETRANTE (advogado) e PACIENTE (preso/ameaçado) com qualificação completa
3. Identificação da AUTORIDADE COATORA (nome e cargo: delegado, juiz, promotor)
4. DOS FATOS – narrativa cronológica do constrangimento ilegal
5. DO CONSTRANGIMENTO ILEGAL – enquadramento no art. 648 CPP (incisos I a VII)
6. DO DIREITO – fundamentação constitucional (art. 5º LXVIII CF) e legal (CPP)
7. DA LIMINAR – demonstração do fumus boni iuris e periculum in mora
8. DOS PEDIDOS – concessão da ordem, liminar, expedição de alvará de soltura ou salvo-conduto
9. Subsidiariamente: medidas cautelares alternativas (art. 319 CPP)
10. Provas documentais anexas
11. Assinatura do impetrante`,
    instrucoes_especificas: `ATENÇÃO ESPECIAL (2026):
- O HC é AÇÃO CONSTITUCIONAL de prioridade máxima, não recurso. Trate como tal.
- Identifique claramente o ATO COATOR (decisão judicial, prisão em flagrante, etc.)
- Enquadre em ao menos uma hipótese do art. 648 CPP
- Se houver excesso de prazo, cite art. 648, II CPP e súmulas aplicáveis
- Demonstre urgência para fundamentar pedido liminar
- Cite jurisprudência do STF/STJ sobre HC
- Se HC originário ao STF: aplicar arts. 188-199 RISTF, peticionamento eletrônico obrigatório`
  },
  "peticao-inicial": {
    legislacao: ["art. 319, CPC/2015 (requisitos da petição inicial)", "art. 320, CPC/2015 (documentos indispensáveis)", "art. 321, CPC/2015 (emenda da inicial)", "art. 292, CPC/2015 (valor da causa)"],
    estrutura: `1. Endereçamento ao juízo competente
2. Qualificação COMPLETA do autor (nome, CPF/CNPJ, estado civil, profissão, endereço, e-mail)
3. Qualificação COMPLETA do réu
4. DOS FATOS – narrativa detalhada e cronológica
5. DO DIREITO – fundamentação legal com artigos específicos (CPC, CC, CDC, CF)
6. DOS DANOS (se aplicável) – material, moral, estético, lucros cessantes
7. DA TUTELA PROVISÓRIA (se aplicável) – urgência ou evidência
8. DOS PEDIDOS – numerados, específicos, com valores
9. DAS PROVAS – rol de provas (documental, testemunhal, pericial)
10. DO VALOR DA CAUSA – art. 292 CPC
11. Requerimentos finais (citação, intimações)
12. Local, data e assinatura`,
    instrucoes_especificas: `REQUISITOS DO ART. 319 CPC – TODOS obrigatórios:
I - juízo competente; II - partes qualificadas; III - fatos e fundamentos;
IV - pedido com especificações; V - valor da causa; VI - provas; VII - opção por audiência de conciliação.
- Pedidos devem ser ESPECÍFICOS com valores quando possível
- Fundamentação deve citar artigos de lei, não apenas princípios genéricos
- Inclua pedido de justiça gratuita se aplicável`
  },
  "contestacao": {
    legislacao: ["arts. 335-342, CPC/2015", "art. 336, CPC/2015 (alegação de todas as matérias de defesa)", "art. 337, CPC/2015 (preliminares)", "art. 341, CPC/2015 (ônus da impugnação especificada)"],
    estrutura: `1. Endereçamento ao juízo
2. Referência aos autos (nº processo)
3. Qualificação do contestante
4. DAS PRELIMINARES (art. 337 CPC) – incompetência, litispendência, coisa julgada, etc.
5. DAS PREJUDICIAIS DE MÉRITO – prescrição, decadência
6. DO MÉRITO – impugnação ESPECÍFICA de cada fato alegado pelo autor (art. 341 CPC)
7. DOS FATOS – versão do réu
8. DO DIREITO – fundamentação legal contrária
9. DOS PEDIDOS – improcedência total, subsidiariamente parcial
10. DAS PROVAS
11. Requerimentos finais
12. Assinatura`,
    instrucoes_especificas: `REGRA CRÍTICA: Art. 341 CPC – presunção de veracidade dos fatos não impugnados especificamente.
- Impugne CADA fato alegado na inicial, um a um
- Alegue TODAS as defesas, mesmo subsidiárias (art. 336 CPC – princípio da eventualidade)
- Preliminares ANTES do mérito
- Se alegar fato impeditivo/modificativo/extintivo, o ônus da prova é do réu (art. 373, II CPC)`
  },
  "recurso-apelacao": {
    legislacao: ["arts. 1.009 a 1.014, CPC/2015", "art. 1.010, CPC/2015 (requisitos)", "art. 1.012, CPC/2015 (efeitos)", "art. 1.013, CPC/2015 (efeito devolutivo)"],
    estrutura: `1. Endereçamento ao juízo de primeiro grau (para remessa ao Tribunal)
2. Referência aos autos
3. RAZÕES DE APELAÇÃO (peça separada dirigida ao Tribunal):
   a) DA TEMPESTIVIDADE
   b) DO CABIMENTO
   c) DO PREPARO (se não for beneficiário de gratuidade)
   d) DA SÍNTESE PROCESSUAL
   e) DAS RAZÕES PARA REFORMA – ponto a ponto da sentença
   f) DO DIREITO – fundamentação legal e jurisprudencial
   g) DOS PEDIDOS – reforma total ou parcial, com especificação
4. Assinatura`,
    instrucoes_especificas: `- A apelação é interposta no juízo de 1º grau, mas as RAZÕES são dirigidas ao Tribunal
- Demonstre error in judicando (erro de mérito) ou error in procedendo (erro processual)
- Ataque especificamente os fundamentos da sentença
- Cite jurisprudência do Tribunal de destino (TJ, TRF, TRT)
- Art. 1.013, §1º: efeito devolutivo amplo (questões decididas e decidíveis)`
  },
  "reclamacao-trabalhista": {
    legislacao: ["arts. 837-842, CLT", "art. 840, CLT (requisitos da reclamação)", "Lei 13.467/2017 (Reforma Trabalhista)", "art. 818, CLT (ônus da prova)"],
    estrutura: `1. Endereçamento à Vara do Trabalho
2. Qualificação do RECLAMANTE (empregado)
3. Qualificação da RECLAMADA (empregador)
4. DO CONTRATO DE TRABALHO – admissão, função, salário, jornada, demissão
5. DAS VERBAS RESCISÓRIAS – saldo de salário, aviso prévio, 13º, férias + 1/3, FGTS + 40%
6. DAS HORAS EXTRAS (se aplicável) – jornada real x contratual
7. DOS DANOS MORAIS (se aplicável)
8. DO VALOR DA CAUSA (art. 840, §1º CLT – pedido líquido obrigatório pós-Reforma)
9. DOS PEDIDOS – numerados e com valores específicos
10. DAS PROVAS
11. Requerimentos (citação, benefícios de justiça gratuita)
12. Assinatura`,
    instrucoes_especificas: `PÓS-REFORMA TRABALHISTA (Lei 13.467/2017):
- Pedidos DEVEM ser líquidos (com valores específicos) – art. 840, §1º CLT
- Honorários de sucumbência podem ser cobrados do reclamante (art. 791-A CLT)
- Danos extrapatrimoniais: limites do art. 223-G CLT
- Se pedir horas extras, especifique horário real trabalhado
- Calcule cada verba individualmente com valores`
  },
  "contrato-servicos": {
    legislacao: ["arts. 593-609, CC/2002 (prestação de serviços)", "Lei 8.078/90 (CDC – se aplicável)", "art. 421, CC/2002 (função social do contrato)"],
    estrutura: `1. PREÂMBULO – identificação do instrumento
2. QUALIFICAÇÃO DAS PARTES – contratante e contratado com dados completos
3. CLÁUSULA 1ª – DO OBJETO
4. CLÁUSULA 2ª – DAS OBRIGAÇÕES DO CONTRATADO
5. CLÁUSULA 3ª – DAS OBRIGAÇÕES DO CONTRATANTE
6. CLÁUSULA 4ª – DO PREÇO E FORMA DE PAGAMENTO
7. CLÁUSULA 5ª – DO PRAZO E VIGÊNCIA
8. CLÁUSULA 6ª – DA RESCISÃO
9. CLÁUSULA 7ª – DA CONFIDENCIALIDADE
10. CLÁUSULA 8ª – DAS PENALIDADES (multa, juros)
11. CLÁUSULA 9ª – DAS DISPOSIÇÕES GERAIS
12. CLÁUSULA 10ª – DO FORO
13. Local, data, assinaturas das partes e 2 testemunhas`,
    instrucoes_especificas: `- Cláusulas devem ser NUMERADAS e com títulos claros
- Incluir cláusula de confidencialidade (LGPD – Lei 13.709/2018)
- Multa por rescisão antecipada: geralmente 10-20% do valor restante
- Foro: especificar Comarca (preferencialmente Porto Alegre/RS)
- NÃO é relação de emprego – deixar claro que é prestação de serviços autônomos`
  },
  "contrato-honorarios": {
    legislacao: ["Lei 8.906/94 (Estatuto da OAB)", "art. 22-26, Lei 8.906/94 (honorários)", "Tabela de Honorários OAB/RS", "art. 85, CPC/2015 (honorários sucumbenciais)"],
    estrutura: `1. CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS E HONORÁRIOS
2. QUALIFICAÇÃO DO CONTRATANTE (cliente)
3. QUALIFICAÇÃO DO CONTRATADO (advogado – [Nome do Advogado], [OAB])
4. CLÁUSULA 1ª – DO OBJETO (descrição do serviço jurídico)
5. CLÁUSULA 2ª – DOS HONORÁRIOS ADVOCATÍCIOS
   a) Contratuais (valor fixo e/ou percentual de êxito)
   b) Forma de pagamento (parcelas, vencimentos)
6. CLÁUSULA 3ª – DOS HONORÁRIOS DE SUCUMBÊNCIA (art. 85 CPC)
7. CLÁUSULA 4ª – DAS DESPESAS PROCESSUAIS (custas, perícias, diligências)
8. CLÁUSULA 5ª – DAS OBRIGAÇÕES DO ADVOGADO
9. CLÁUSULA 6ª – DAS OBRIGAÇÕES DO CLIENTE
10. CLÁUSULA 7ª – DA RESCISÃO E SUBSTABELECIMENTO
11. CLÁUSULA 8ª – DA CONFIDENCIALIDADE E SIGILO PROFISSIONAL
12. CLÁUSULA 9ª – DO FORO
13. Local, data, assinaturas e 2 testemunhas`,
    instrucoes_especificas: `- Honorários devem respeitar a Tabela Mínima da OAB/RS
- Diferenciar honorários contratuais x sucumbenciais x ad exitum
- Art. 22 Lei 8.906/94: honorários pertencem ao advogado
- Incluir cláusula sobre substabelecimento (com ou sem reserva)
- Mencionar sigilo profissional (art. 7º, Lei 8.906/94)
- Prever hipótese de desistência do cliente (honorários proporcionais devidos)`
  },
  "agravo-instrumento": {
    legislacao: ["art. 1.015, CPC/2015 (hipóteses de cabimento)", "arts. 1.016-1.020, CPC/2015", "art. 1.019, CPC/2015 (efeito suspensivo)"],
    estrutura: `1. Endereçamento ao TRIBUNAL (não ao juízo de 1º grau)
2. Identificação do agravante e agravado
3. Referência à decisão agravada (data, conteúdo)
4. DA TEMPESTIVIDADE
5. DO CABIMENTO – enquadramento no art. 1.015 CPC
6. DA NECESSIDADE DE EFEITO SUSPENSIVO/ANTECIPAÇÃO DE TUTELA RECURSAL
7. DAS RAZÕES DO AGRAVO – demonstração do error in judicando/procedendo
8. DO DIREITO – fundamentação legal e jurisprudencial
9. DOS PEDIDOS – reforma da decisão, concessão de efeito suspensivo
10. Documentos obrigatórios (art. 1.017 CPC)
11. Assinatura`,
    instrucoes_especificas: `- Rol do art. 1.015 CPC é taxativo (STJ Tema 988 – taxatividade mitigada)
- Peça dirigida DIRETAMENTE ao Tribunal
- Cópia da decisão agravada é OBRIGATÓRIA
- Se pedir efeito suspensivo, demonstrar risco de dano grave (fumus boni iuris + periculum in mora)
- Prazo: 15 dias úteis`
  },
  "embargos-declaracao": {
    legislacao: ["arts. 1.022-1.026, CPC/2015", "art. 1.022 (obscuridade, contradição, omissão, erro material)"],
    estrutura: `1. Endereçamento ao juízo/tribunal prolator da decisão
2. Referência à decisão embargada
3. DA TEMPESTIVIDADE (5 dias – art. 1.023 CPC)
4. DO CABIMENTO – identificação do vício:
   a) OBSCURIDADE – ponto incompreensível
   b) CONTRADIÇÃO – fundamentação x dispositivo
   c) OMISSÃO – questão não apreciada (art. 1.022, II)
   d) ERRO MATERIAL – erro de fato evidente
5. DA DEMONSTRAÇÃO DO VÍCIO
6. DOS PEDIDOS – acolhimento com/sem efeitos infringentes
7. Prequestionamento (se recurso futuro – art. 1.025 CPC)
8. Assinatura`,
    instrucoes_especificas: `- NÃO use embargos para rediscutir mérito (caráter integrativo)
- Se buscar efeitos infringentes (modificativos), fundamente excepcionalmente
- Para prequestionamento: cite expressamente os dispositivos constitucionais/legais
- Prazo: 5 dias ÚTEIS (art. 1.023 CPC)
- Interrompem o prazo para outros recursos (art. 1.026 CPC)`
  },
  "mandado-seguranca": {
    legislacao: ["art. 5º, LXIX e LXX, CF/88", "Lei 12.016/2009", "Súmulas 266, 267, 268, 269, 271 STF"],
    estrutura: `1. Endereçamento ao juízo competente
2. Qualificação do IMPETRANTE
3. Identificação da AUTORIDADE COATORA (pessoa física que praticou o ato)
4. Indicação da PESSOA JURÍDICA à qual pertence a autoridade
5. DOS FATOS – ato ilegal ou abusivo
6. DO DIREITO LÍQUIDO E CERTO – prova pré-constituída
7. DA ILEGALIDADE/ABUSO DE PODER
8. DA LIMINAR (art. 7º, III, Lei 12.016/2009)
9. DOS PEDIDOS – concessão da segurança, liminar
10. Provas documentais (toda prova deve ser pré-constituída)
11. Assinatura`,
    instrucoes_especificas: `- Direito LÍQUIDO E CERTO: prova documental pré-constituída (não admite dilação probatória)
- Prazo decadencial: 120 dias do ato coator (art. 23, Lei 12.016/2009)
- Não cabe MS contra ato judicial passível de recurso com efeito suspensivo (Súmula 267 STF)
- Autoridade coatora: indicar a PESSOA que praticou o ato, não o órgão
- Litisconsórcio passivo necessário com a pessoa jurídica`
  },
  "recurso-especial": {
    legislacao: ["art. 105, III, CF/88", "arts. 1.029-1.041, CPC/2015", "Súmula 7 STJ", "Súmula 83 STJ"],
    estrutura: `1. Endereçamento ao Presidente/Vice do Tribunal de origem
2. DA TEMPESTIVIDADE
3. DO CABIMENTO – alíneas do art. 105, III, CF:
   a) contrariedade a tratado ou lei federal
   b) validade de ato de governo local contestado em face de lei federal
   c) divergência jurisprudencial entre tribunais
4. DO PREQUESTIONAMENTO (Súmulas 282 e 356 STF)
5. DA REPERCUSSÃO – demonstração da relevância
6. DAS RAZÕES – demonstração da violação legal
7. DOS PEDIDOS – conhecimento e provimento
8. Assinatura`,
    instrucoes_especificas: `- NÃO reexamina provas (Súmula 7 STJ)
- Prequestionamento é OBRIGATÓRIO (usar embargos de declaração antes se necessário)
- Divergência jurisprudencial: demonstrar com cotejo analítico (paradigma x acórdão recorrido)
- Cite especificamente os dispositivos de lei federal violados
- Não cabe REsp por violação de lei estadual/municipal`
  },
  "tutela-provisoria": {
    legislacao: ["arts. 294-311, CPC/2015", "art. 300 (tutela de urgência)", "art. 311 (tutela da evidência)"],
    estrutura: `1. Endereçamento ao juízo
2. Qualificação das partes
3. DOS FATOS
4. DA TUTELA DE URGÊNCIA (art. 300 CPC):
   a) Probabilidade do direito (fumus boni iuris)
   b) Perigo de dano ou risco ao resultado útil (periculum in mora)
   OU DA TUTELA DA EVIDÊNCIA (art. 311 CPC):
   a) Enquadramento em uma das hipóteses legais
5. DO DIREITO
6. DOS PEDIDOS – concessão da tutela, inaudita altera parte se urgente
7. Assinatura`,
    instrucoes_especificas: `- Diferencie tutela de urgência (antecipada ou cautelar) x tutela da evidência
- Urgência antecipada: satisfativa; Urgência cautelar: assecuratória
- Art. 300, §3º: pode ser concedida liminarmente sem oitiva da parte contrária
- Tutela da evidência (art. 311): não exige demonstração de perigo
- Se pedir inaudita altera parte, justifique o risco de ineficácia da medida`
  },
  "agravo-execucao-penal": {
    legislacao: ["art. 197, LEP (Lei 7.210/84)", "art. 581, CPC por analogia", "Súmula 700 STF", "art. 66, LEP (competência do juízo da execução)"],
    estrutura: `1. Endereçamento ao TRIBUNAL competente (TJ ou TRF)
2. Qualificação do AGRAVANTE (apenado ou Ministério Público)
3. Referência à decisão agravada (juízo da execução penal)
4. DA TEMPESTIVIDADE (5 dias – art. 586 CPP por analogia)
5. DO CABIMENTO – art. 197 LEP
6. DOS FATOS – decisão impugnada e contexto da execução
7. DAS RAZÕES DO AGRAVO:
   a) Erro na decisão do juízo da execução
   b) Fundamentação legal (LEP, CP, CF)
   c) Jurisprudência aplicável (STF/STJ)
8. DOS PEDIDOS – reforma da decisão, concessão do benefício negado
9. Documentos anexos (guia de execução, atestado de bom comportamento, cálculo de pena)
10. Assinatura`,
    instrucoes_especificas: `ESPECIFICIDADES DO AGRAVO EM EXECUÇÃO PENAL:
- É o recurso CABÍVEL contra TODAS as decisões do juízo da execução penal (art. 197 LEP)
- Processamento análogo ao Recurso em Sentido Estrito (RESE) – CPP por analogia
- Prazo: 5 dias (art. 586 CPP aplicado por analogia)
- Hipóteses comuns: progressão de regime negada, livramento condicional indeferido, remição contestada, unificação de penas, saída temporária negada
- Se for progressão de regime: demonstrar cumprimento do lapso temporal (art. 112 LEP) e bom comportamento carcerário
- Se for livramento condicional: requisitos do art. 83 CP
- Cite a Súmula 700 STF (é cabível agravo regimental da decisão do relator que nega seguimento)
- Inclua cálculos de pena quando relevante`
  },
  "revisao-criminal": {
    legislacao: ["arts. 621-631, CPP", "art. 5º, LXXV, CF/88 (indenização por erro judiciário)", "Súmula 393 STF"],
    estrutura: `1. Endereçamento ao TRIBUNAL competente (TJ, TRF ou Tribunal Superior)
2. Qualificação do REQUERENTE (condenado)
3. Referência à sentença/acórdão condenatório transitado em julgado
4. DA LEGITIMIDADE – art. 623 CPP (réu ou procurador, e após morte: cônjuge/ascendente/descendente)
5. DO CABIMENTO – enquadramento no art. 621 CPP:
   a) I – sentença contrária ao texto expresso da lei ou evidência dos autos
   b) II – sentença fundada em provas comprovadamente falsas
   c) III – descoberta de novas provas de inocência ou de circunstância que determine redução de pena
6. DOS FATOS – narrativa do processo originário e da condenação
7. DO ERRO JUDICIÁRIO – demonstração detalhada
8. DO DIREITO – fundamentação constitucional e legal
9. DOS PEDIDOS – absolvição, redução de pena, anulação do processo (art. 626 CPP)
10. Provas novas (se for o caso do inciso III)
11. Assinatura`,
    instrucoes_especificas: `ESPECIFICIDADES DA REVISÃO CRIMINAL:
- SOMENTE cabe contra sentença condenatória TRANSITADA EM JULGADO
- NÃO tem prazo decadencial (pode ser proposta a qualquer tempo, inclusive após morte – art. 623 CPP)
- A competência é do TRIBUNAL que julgou o caso (ou do TJ se a condenação foi em 1ª instância)
- Art. 626 CPP: o tribunal pode alterar a classificação, absolver, modificar a pena ou anular o processo
- Art. 626, parágrafo único: NÃO pode agravar a pena (reformatio in pejus vedada)
- Se baseada em provas falsas (inciso II): demonstrar a falsidade documentalmente
- Se baseada em provas novas (inciso III): juntar as provas que não existiam no processo original
- Cite o art. 5º, LXXV, CF/88 se couber pedido de indenização por erro judiciário
- É ação (não recurso) – distribuição livre no Tribunal`
  },
  "acao-rescisoria": {
    legislacao: ["arts. 966-975, CPC/2015", "art. 966 (hipóteses de rescisão)", "art. 975 (prazo decadencial de 2 anos)", "Súmula 514 STF"],
    estrutura: `1. Endereçamento ao TRIBUNAL competente
2. Qualificação do AUTOR (parte que busca a rescisão)
3. Qualificação do RÉU (parte beneficiada pela decisão rescindenda)
4. DA DECISÃO RESCINDENDA – identificação da sentença/acórdão transitado em julgado
5. DA TEMPESTIVIDADE – prazo de 2 anos do trânsito em julgado (art. 975 CPC)
6. DO DEPÓSITO PRÉVIO – 5% do valor da causa (art. 968, II, CPC)
7. DO CABIMENTO – enquadramento no art. 966 CPC:
   I – prevaricação, concussão ou corrupção do juiz
   II – impedimento ou incompetência absoluta do juiz
   III – dolo ou coação da parte vencedora
   IV – ofensa à coisa julgada
   V – violação manifesta de norma jurídica
   VI – prova falsa
   VII – prova nova
   VIII – erro de fato
8. DOS FATOS
9. DO DIREITO – fundamentação detalhada
10. DA TUTELA PROVISÓRIA (se aplicável – art. 969 CPC)
11. DOS PEDIDOS:
    a) Juízo rescindente (iudicium rescindens): desconstituir a decisão
    b) Juízo rescisório (iudicium rescissorium): novo julgamento (se aplicável)
12. DO VALOR DA CAUSA
13. DAS PROVAS
14. Assinatura`,
    instrucoes_especificas: `ESPECIFICIDADES DA AÇÃO RESCISÓRIA:
- É AÇÃO AUTÔNOMA DE IMPUGNAÇÃO (não recurso)
- Prazo decadencial de 2 ANOS contados do trânsito em julgado (art. 975 CPC)
- Exceções ao prazo: prova nova (art. 975, §2º) – até 5 anos; simulação/colusão (art. 975, §3º)
- DEPÓSITO OBRIGATÓRIO de 5% do valor da causa (art. 968, II, CPC), exceto beneficiários de gratuidade
- Competência: tribunal que proferiu a decisão rescindenda (ou tribunal superior se a decisão for dele)
- A hipótese mais comum é violação manifesta de norma jurídica (art. 966, V)
- Pode cumular pedido rescindente + rescisório (art. 968, I, CPC)
- Se pedir tutela provisória, fundamentar urgência (art. 969 CPC: a rescisória não suspende automaticamente a execução)
- Súmula 514 STF: admissível ação rescisória contra sentença transitada em julgado, ainda que não esgotados recursos
- Demonstre que NÃO é mera rediscussão de mérito – é necessário vício qualificado`
  },
  "mandado-seguranca-coletivo": {
    legislacao: ["art. 5º, LXX, CF/88", "Lei 12.016/2009 (arts. 21-22)", "art. 82, CDC (legitimidade)", "Súmula 101 STF"],
    estrutura: `1. Endereçamento ao juízo competente
2. Qualificação do IMPETRANTE (partido político, organização sindical, entidade de classe ou associação)
3. Demonstração da LEGITIMIDADE ATIVA (art. 21, Lei 12.016/09):
   a) Partido político com representação no Congresso
   b) Organização sindical, entidade de classe ou associação (constituída há pelo menos 1 ano)
4. Identificação da AUTORIDADE COATORA
5. Indicação da PESSOA JURÍDICA à qual pertence a autoridade
6. DOS FATOS – ato ilegal ou abusivo que afeta a coletividade
7. DO DIREITO LÍQUIDO E CERTO COLETIVO
8. DA PERTINÊNCIA TEMÁTICA (relação entre o objeto e os fins da entidade)
9. DA LIMINAR (art. 7º, III, Lei 12.016/2009)
10. DOS PEDIDOS – concessão da segurança coletiva, liminar
11. Lista de associados/filiados afetados (ou indicação da classe)
12. Provas documentais pré-constituídas
13. Assinatura`,
    instrucoes_especificas: `ESPECIFICIDADES DO MS COLETIVO:
- Legitimidade restrita: partido político (com representação), sindicato, entidade de classe, associação (1 ano de constituição – art. 21 Lei 12.016/09)
- A entidade atua como SUBSTITUTA PROCESSUAL (não representante) – dispensa autorização dos associados
- PERTINÊNCIA TEMÁTICA obrigatória: o objeto do MS deve ter relação com os fins institucionais da entidade
- Direitos protegidos (art. 21): coletivos (transindividuais) e individuais homogêneos
- Mesmas regras do MS individual quanto a prazo (120 dias), prova pré-constituída e vedações
- Coisa julgada: ultra partes, limitada aos associados (art. 22, §1º, Lei 12.016/09)
- Se partido político: não precisa demonstrar pertinência temática (legitimidade ampla)`
  },
  "acao-popular": {
    legislacao: ["art. 5º, LXXIII, CF/88", "Lei 4.717/65 (Lei da Ação Popular)", "art. 1º, Lei 4.717/65 (legitimidade)", "art. 5º, Lei 4.717/65 (citação dos responsáveis e pessoa jurídica)"],
    estrutura: `1. Endereçamento ao juízo competente
2. Qualificação do AUTOR POPULAR (cidadão – juntar título de eleitor)
3. Qualificação dos RÉUS:
   a) Autoridade ou agente público que praticou o ato
   b) Beneficiários diretos do ato lesivo
   c) Pessoa jurídica de direito público ou privado de cujo patrimônio o ato é lesivo
4. DO ATO LESIVO – descrição detalhada do ato administrativo impugnado
5. DA ILEGALIDADE – vícios do ato (art. 2º, Lei 4.717/65): incompetência, vício de forma, ilegalidade do objeto, inexistência dos motivos, desvio de finalidade
6. DA LESIVIDADE AO PATRIMÔNIO PÚBLICO / MORALIDADE ADMINISTRATIVA / MEIO AMBIENTE / PATRIMÔNIO HISTÓRICO E CULTURAL
7. DO DIREITO – fundamentação constitucional e legal
8. DA LIMINAR (suspensão do ato lesivo)
9. DOS PEDIDOS:
   a) Anulação do ato lesivo
   b) Condenação dos responsáveis ao ressarcimento
   c) Condenação em perdas e danos
10. DAS PROVAS
11. Isenção de custas e ônus de sucumbência (art. 5º, LXXIII, CF)
12. Assinatura`,
    instrucoes_especificas: `ESPECIFICIDADES DA AÇÃO POPULAR:
- Legitimidade EXCLUSIVA do CIDADÃO (pessoa física no gozo dos direitos políticos – título de eleitor obrigatório)
- Pessoa jurídica NÃO tem legitimidade ativa
- Basta demonstrar ILEGALIDADE + LESIVIDADE (presunção de lesividade nos casos do art. 4º)
- Vícios do art. 2º Lei 4.717/65: incompetência, vício de forma, ilegalidade do objeto, inexistência dos motivos, desvio de finalidade
- Réus: autoridade + beneficiários + pessoa jurídica lesada (litisconsórcio necessário – art. 6º)
- Pessoa jurídica pode migrar para polo ativo (art. 6º, §3º)
- Autor popular é ISENTO de custas e ônus de sucumbência, salvo comprovada má-fé (art. 5º, LXXIII, CF)
- Prescrição: 5 anos (art. 21, Lei 4.717/65)
- Competência: juízo de 1ª instância onde ocorreu o ato`
  },
  "acao-civil-publica": {
    legislacao: ["Lei 7.347/85 (Lei da Ação Civil Pública)", "art. 129, III, CF/88", "art. 5º, Lei 7.347/85 (legitimidade)", "art. 11-13, Lei 7.347/85 (obrigações e indenização)"],
    estrutura: `1. Endereçamento ao juízo competente (local do dano – art. 2º)
2. Qualificação do AUTOR (Ministério Público, Defensoria, entes federativos, autarquias, associações – art. 5º)
3. Qualificação do RÉU (pessoa física/jurídica responsável pelo dano)
4. DO INQUÉRITO CIVIL ou PROCEDIMENTO PREPARATÓRIO (se MP)
5. DOS FATOS – narrativa do dano ou ameaça de dano
6. DO DANO AO INTERESSE DIFUSO/COLETIVO:
   a) Meio ambiente
   b) Consumidor
   c) Patrimônio público
   d) Ordem urbanística
   e) Honra e dignidade de grupos
   f) Outros interesses difusos ou coletivos
7. DO DIREITO – fundamentação legal
8. DA TUTELA DE URGÊNCIA (art. 12, Lei 7.347/85)
9. DOS PEDIDOS:
   a) Condenação em obrigação de fazer ou não fazer
   b) Condenação em danos morais coletivos
   c) Indenização ao Fundo de Defesa dos Direitos Difusos (art. 13)
   d) Astreintes (multa diária)
10. DAS PROVAS
11. Assinatura`,
    instrucoes_especificas: `ESPECIFICIDADES DA AÇÃO CIVIL PÚBLICA:
- Legitimidade ativa (art. 5º): MP, Defensoria, União/Estados/Municípios, autarquias, empresas públicas, fundações, associações (constituídas há 1 ano + pertinência temática)
- Competência: FORO do local do dano (art. 2º)
- Objetos protegidos: meio ambiente, consumidor, patrimônio público, ordem urbanística, bens de valor artístico/cultural, infração à ordem econômica, e qualquer outro interesse difuso ou coletivo
- NÃO pode ter como objeto pretensão envolvendo tributos ou FGTS (art. 1º, parágrafo único)
- Inquérito civil é EXCLUSIVO do MP (art. 8º, §1º)
- Multa diária (astreintes) para descumprimento de obrigação de fazer/não fazer
- Fundo de Defesa dos Direitos Difusos (art. 13): destino da condenação pecuniária
- Coisa julgada erga omnes (art. 16) ou ultra partes, conforme o caso
- Liminares: possibilidade de suspensão pelo Presidente do Tribunal (art. 12, §1º)`
  },
  "reclamacao-constitucional": {
    legislacao: ["art. 102, I, 'l', CF/88 (STF)", "art. 105, I, 'f', CF/88 (STJ)", "arts. 988-993, CPC/2015", "Súmula Vinculante 10 STF"],
    estrutura: `1. Endereçamento ao TRIBUNAL competente (STF ou STJ)
2. Qualificação do RECLAMANTE
3. Identificação da AUTORIDADE RECLAMADA (juiz/tribunal que descumpriu)
4. Identificação do TERCEIRO INTERESSADO (parte beneficiada pela decisão reclamada)
5. DA DECISÃO/ATO RECLAMADO – identificação precisa
6. DO CABIMENTO – enquadramento no art. 988 CPC:
   I – preservar competência do tribunal
   II – garantir autoridade de decisão do tribunal
   III – garantir observância de enunciado de súmula vinculante (STF)
   IV – garantir observância de acórdão em IRDR, IAC, RE/REsp com repercussão geral
7. DO ESGOTAMENTO DAS INSTÂNCIAS (art. 988, §5º, II, CPC – para hipótese do inciso IV)
8. DA DEMONSTRAÇÃO DO DESCUMPRIMENTO – cotejo entre decisão do tribunal e ato reclamado
9. DO DIREITO – fundamentação
10. DA LIMINAR – suspensão do ato reclamado (art. 989 CPC)
11. DOS PEDIDOS:
    a) Cassação da decisão reclamada
    b) Determinação de cumprimento da decisão paradigma
12. Cópia da decisão paradigma e da decisão reclamada
13. Assinatura`,
    instrucoes_especificas: `ESPECIFICIDADES DA RECLAMAÇÃO CONSTITUCIONAL:
- Natureza jurídica: AÇÃO CONSTITUCIONAL (não recurso)
- Hipóteses do art. 988 CPC: preservar competência, garantir autoridade de decisão, observância de súmula vinculante, observância de precedente qualificado
- Para a hipótese do inciso IV (precedente qualificado): exige ESGOTAMENTO DAS INSTÂNCIAS ordinárias (art. 988, §5º, II)
- Legitimidade ampla: parte interessada ou MP
- Competência originária do STF (art. 102, I, 'l', CF) ou STJ (art. 105, I, 'f', CF) conforme a decisão paradigma
- Deve demonstrar ADERÊNCIA ESTRITA entre o caso e o paradigma (não basta semelhança genérica)
- Liminar: suspensão do processo ou do ato impugnado (art. 989 CPC)
- Se procedente: cassa a decisão e determina nova decisão conforme o paradigma (art. 992 CPC)
- Prazo: não há prazo decadencial fixo, mas deve ser proposta enquanto perdurar o descumprimento
- Rito célere e preferencial`
  },
  // ═══ PROMPTS ADICIONAIS 2026 ═══
  "defesa-previa-criminal": {
    legislacao: ["arts. 396 e 396-A, CPP", "art. 397, CPP (absolvição sumária)"],
    estrutura: `1. Endereçamento\n2. Qualificação do acusado\n3. PRELIMINARES\n4. ABSOLVIÇÃO SUMÁRIA (art. 397)\n5. MÉRITO\n6. ROL DE TESTEMUNHAS\n7. PEDIDOS\n8. Assinatura`,
    instrucoes_especificas: `Prazo: 10 dias (art. 396 CPP). Arguir TODAS as teses. Absolvição sumária: excludente de ilicitude/culpabilidade, atipicidade, extinção de punibilidade. Máximo 8 testemunhas.`
  },
  "resposta-acusacao": {
    legislacao: ["arts. 396 e 396-A, CPP", "art. 397, CPP", "art. 395, CPP"],
    estrutura: `1. Endereçamento\n2. Qualificação\n3. Síntese da acusação\n4. PRELIMINARES\n5. ABSOLVIÇÃO SUMÁRIA\n6. MÉRITO\n7. PROVAS e TESTEMUNHAS\n8. PEDIDOS\n9. Assinatura`,
    instrucoes_especificas: `Art. 397 CPP: 4 hipóteses de absolvição sumária. Se denúncia inepta: requerer rejeição (art. 395 CPP).`
  },
  "liberdade-provisoria": {
    legislacao: ["art. 5º, LXVI, CF/88", "art. 312, CPP", "art. 319, CPP (cautelares)", "art. 321, CPP (fiança)"],
    estrutura: `1. Endereçamento\n2. Qualificação do preso\n3. DOS FATOS\n4. AUSÊNCIA DOS REQUISITOS (art. 312 CPP)\n5. CAUTELARES ALTERNATIVAS (art. 319)\n6. PEDIDOS\n7. Assinatura`,
    instrucoes_especificas: `Demonstrar ausência dos requisitos do art. 312 CPP. Pedir substituição por cautelares (art. 319 CPP).`
  },
  "recurso-sentido-estrito": {
    legislacao: ["art. 581, CPP", "art. 586, CPP (prazo 5 dias)"],
    estrutura: `1. Endereçamento\n2. INTERPOSIÇÃO – decisão e hipótese do art. 581\n3. RAZÕES\n4. PEDIDO DE REFORMA\n5. Assinatura`,
    instrucoes_especificas: `Prazo: 5 dias (art. 586 CPP). Hipóteses taxativas do art. 581 CPP.`
  },
  "alegacoes-finais-criminais": {
    legislacao: ["art. 403, CPP", "art. 386, CPP (absolvição)", "art. 387, CPP"],
    estrutura: `1. Endereçamento\n2. SÍNTESE\n3. ANÁLISE DAS PROVAS\n4. TESES\n5. PEDIDO FINAL\n6. Assinatura`,
    instrucoes_especificas: `Analisar todas as provas produzidas em instrução. Se defesa: in dubio pro reo.`
  },
  "apelacao-criminal": {
    legislacao: ["art. 593, CPP", "art. 600, CPP (razões 8 dias)"],
    estrutura: `1. Interposição (1º grau)\n2. RAZÕES (ao Tribunal): tempestividade, sentença, nulidades, dosimetria\n3. PEDIDO\n4. Assinatura`,
    instrucoes_especificas: `Prazo: 5 dias interposição, 8 dias razões. Se dosimetria: analisar cada fase.`
  },
  "embargos-declaracao-penal": {
    legislacao: ["art. 619, CPP (prazo 2 DIAS)", "art. 620, CPP"],
    estrutura: `1. Endereçamento\n2. Decisão embargada\n3. TEMPESTIVIDADE (2 DIAS)\n4. VÍCIO\n5. PEDIDOS\n6. Assinatura`,
    instrucoes_especificas: `ATENÇÃO: No processo PENAL prazo de 2 DIAS (art. 619 CPP), diferente do CPC (5 dias). Caráter integrativo.`
  },
  "recurso-especial-penal": {
    legislacao: ["art. 105, III, CF/88", "Súmula 7 STJ"],
    estrutura: `1. Endereçamento ao Presidente do Tribunal\n2. TEMPESTIVIDADE\n3. CABIMENTO\n4. PREQUESTIONAMENTO\n5. VIOLAÇÃO / DIVERGÊNCIA\n6. PEDIDO\n7. Assinatura`,
    instrucoes_especificas: `NÃO reexamina provas (Súmula 7 STJ). Prequestionamento obrigatório.`
  },
  "recurso-extraordinario-penal": {
    legislacao: ["art. 102, III, CF/88", "art. 102, §3º, CF (repercussão geral OBRIGATÓRIA)"],
    estrutura: `1. Endereçamento\n2. TEMPESTIVIDADE\n3. CABIMENTO\n4. PREQUESTIONAMENTO\n5. REPERCUSSÃO GERAL – capítulo OBRIGATÓRIO (art. 102, §3º, CF)\n6. QUESTÃO CONSTITUCIONAL\n7. PEDIDO\n8. Assinatura`,
    instrucoes_especificas: `OBRIGATÓRIO: Capítulo específico de REPERCUSSÃO GERAL (art. 102, §3º, CF). Peticionamento eletrônico pelo portal do STF.`
  },
  "relaxamento-prisao": {
    legislacao: ["art. 5º, LXV, CF/88", "art. 310, CPP", "art. 302, CPP"],
    estrutura: `1. Endereçamento\n2. Qualificação\n3. ILEGALIDADE DA PRISÃO\n4. VÍCIOS FORMAIS\n5. PEDIDO\n6. Assinatura`,
    instrucoes_especificas: `Prisão ILEGAL deve ser relaxada (art. 5º, LXV, CF). Audiência de custódia: 24h.`
  },
  "progressao-regime": {
    legislacao: ["art. 112, LEP", "art. 33, CP", "Súmula Vinculante 26 STF"],
    estrutura: `1. Endereçamento à execução\n2. REQUISITO OBJETIVO (lapso)\n3. REQUISITO SUBJETIVO (conduta)\n4. PEDIDO\n5. Assinatura`,
    instrucoes_especificas: `Frações do art. 112 LEP variam por tipo de crime. Atestado de boa conduta. Incluir cálculo de pena.`
  },
  "livramento-condicional": {
    legislacao: ["art. 83, CP", "arts. 131-146, LEP"],
    estrutura: `1. Endereçamento à execução\n2. REQUISITOS OBJETIVOS (1/3, 1/2, 2/3)\n3. REQUISITOS SUBJETIVOS\n4. PEDIDO\n5. Assinatura`,
    instrucoes_especificas: `Art. 83 CP: primário 1/3, reincidente 1/2, hediondo 2/3. Incluir cálculos de pena.`
  },
  "replica-civil": {
    legislacao: ["art. 351, CPC/2015", "art. 350, CPC/2015"],
    estrutura: `1. Endereçamento\n2. IMPUGNAÇÃO às preliminares\n3. IMPUGNAÇÃO aos fatos novos\n4. REFORÇO DAS TESES AUTORAIS\n5. PEDIDOS\n6. Assinatura`,
    instrucoes_especificas: `Rebater ponto a ponto a contestação. Impugnar documentos novos. Reforçar fundamentação.`
  },
  "recurso-extraordinario-civil": {
    legislacao: ["art. 102, III, CF/88", "art. 102, §3º, CF (repercussão geral)", "arts. 1.029-1.041, CPC/2015"],
    estrutura: `1. Endereçamento\n2. TEMPESTIVIDADE\n3. CABIMENTO\n4. PREQUESTIONAMENTO\n5. REPERCUSSÃO GERAL – capítulo OBRIGATÓRIO\n6. QUESTÃO CONSTITUCIONAL\n7. PEDIDO\n8. Assinatura`,
    instrucoes_especificas: `OBRIGATÓRIO: Capítulo de REPERCUSSÃO GERAL (art. 102, §3º, CF). Citar temas do STF. Peticionamento eletrônico.`
  },
  "recurso-ordinario-trabalhista": {
    legislacao: ["art. 895, CLT", "prazo 8 dias (Lei 5.584/70)"],
    estrutura: `1. Endereçamento\n2. RAZÕES: tempestividade, sentença, reforma\n3. PEDIDO\n4. Assinatura`,
    instrucoes_especificas: `Prazo: 8 dias. Cite Súmulas e OJs do TST e TRT-4.`
  },
  "recurso-revista": {
    legislacao: ["art. 896, CLT", "art. 896-A, CLT (transcendência)"],
    estrutura: `1. Endereçamento ao Presidente do TRT\n2. TEMPESTIVIDADE (8 dias)\n3. CABIMENTO (art. 896)\n4. TRANSCENDÊNCIA (art. 896-A)\n5. PREQUESTIONAMENTO\n6. PEDIDO\n7. Assinatura`,
    instrucoes_especificas: `Transcendência obrigatória (art. 896-A CLT). Cotejo analítico para divergência.`
  },
  "recurso-extraordinario-trab": {
    legislacao: ["art. 102, III, CF/88", "art. 102, §3º, CF"],
    estrutura: `1. Endereçamento\n2. TEMPESTIVIDADE\n3. CABIMENTO\n4. REPERCUSSÃO GERAL – OBRIGATÓRIO\n5. QUESTÃO CONSTITUCIONAL\n6. PEDIDO\n7. Assinatura`,
    instrucoes_especificas: `Capítulo de REPERCUSSÃO GERAL obrigatório. Peticionamento eletrônico pelo portal do STF.`
  },
  "acordo-extrajudicial-trabalhista": {
    legislacao: ["arts. 855-B a 855-E, CLT", "art. 784, IV, CPC"],
    estrutura: `1. Endereçamento à Vara do Trabalho\n2. Qualificação das partes\n3. OBJETO DO ACORDO\n4. CLÁUSULAS\n5. ADVOGADOS DISTINTOS (art. 855-B, §1º)\n6. PEDIDO DE HOMOLOGAÇÃO\n7. Assinaturas`,
    instrucoes_especificas: `Art. 855-B CLT: petição conjunta. §1º: advogados DISTINTOS obrigatórios. Quitação: especificar se geral ou parcial.`
  },
  "notificacao-extrajudicial": {
    legislacao: ["CC/2002 (mora)", "CDC (relações de consumo)"],
    estrutura: `1. NOTIFICAÇÃO EXTRAJUDICIAL\n2. NOTIFICANTE\n3. NOTIFICADO\n4. FATOS\n5. FUNDAMENTO LEGAL\n6. PROVIDÊNCIA e PRAZO\n7. CONSEQUÊNCIAS\n8. Local, data, assinatura`,
    instrucoes_especificas: `Fatos + fundamento legal + prazo para resposta. Pode ser por cartório ou AR. Indicar consequências jurídicas.`
  },
  "parecer-juridico": {
    legislacao: ["Legislação pertinente ao tema"],
    estrutura: `1. PARECER JURÍDICO\n2. CONSULTA\n3. FATOS\n4. ANÁLISE JURÍDICA (imparcial)\n5. LEGISLAÇÃO\n6. JURISPRUDÊNCIA\n7. CONCLUSÃO\n8. RECOMENDAÇÕES\n9. Assinatura`,
    instrucoes_especificas: `Análise técnica imparcial. Conclusão fundamentada. Recomendações práticas.`
  },
  "procuracao-ad-judicia": {
    legislacao: ["art. 105, CPC/2015", "Lei 8.906/94 (Estatuto da OAB)", "art. 5º, CF/88"],
    estrutura: `PROCURAÇÃO AD JUDICIA ET EXTRA

OUTORGANTE: [qualificação completa em um parágrafo: nome, nacionalidade, estado civil, profissão, CPF, RG, endereço, telefone]

OUTORGADO: [NOME DO ADVOGADO], advogado, [OAB], escritório na [endereço], email, telefone

O OUTORGANTE nomeia e constitui o OUTORGADO seu bastante procurador, conferindo-lhe poderes amplos...

Poderes gerais — [lista de poderes gerais em parágrafo corrido, sem marcadores]

Poderes especiais — [lista de poderes especiais em parágrafo corrido, sem marcadores]

Prazo e revogação — procuração por prazo indeterminado...

[Local], [data por extenso].

________________________________
OUTORGANTE: [Nome]
CPF: [número]

________________________________
OUTORGADO: [NOME DO ADVOGADO]
[OAB]`,
    instrucoes_especificas: `FORMATAÇÃO CRÍTICA PARA PROCURAÇÃO:
- Cada seção (OUTORGANTE, OUTORGADO, corpo, poderes, assinatura) DEVE estar em PARÁGRAFO SEPARADO com linha em branco entre eles.
- OUTORGANTE e OUTORGADO são linhas de dados, NÃO títulos. Comece com "OUTORGANTE:" seguido da qualificação no mesmo parágrafo.
- Poderes gerais e especiais: escreva em texto corrido (parágrafo), sem bullets, sem marcadores.
- Use travessão (—) para separar categorias de poderes dentro do parágrafo.
- Bloco de assinatura: use linhas de underscores (________________________________) antes de cada nome.
- NÃO use nenhuma formatação markdown. Apenas texto puro com CAIXA ALTA para destaques.
- Poderes especiais obrigatórios: confessar, transigir, desistir, receber citação, substabelecer com/sem reserva de poderes.
- Se for procuração criminal: incluir poderes para habeas corpus, revisão criminal, medidas cautelares, execução penal, tornozeleira eletrônica.`
  },

  "pesquisa-jurisprudencial-doc": {
    legislacao: [
      "CF/88 (dispositivos constitucionais aplicáveis ao tema)",
      "Legislação infraconstitucional pertinente",
      "Súmulas Vinculantes do STF (se aplicáveis)",
      "Súmulas do STJ (se aplicáveis)"
    ],
    estrutura: `O documento DEVE ser uma PESQUISA JURISPRUDENCIAL COMPLETA, organizada assim:

**TÍTULO**: PESQUISA JURISPRUDENCIAL — [TEMA]

**I — INTRODUÇÃO E DELIMITAÇÃO DO TEMA**
- Contextualização do tema jurídico pesquisado
- Relevância prática e jurídica
- Delimitação temporal e de tribunais

**II — FUNDAMENTAÇÃO CONSTITUCIONAL E LEGAL**
- Dispositivos constitucionais aplicáveis
- Legislação infraconstitucional pertinente
- Evolução legislativa (se relevante)

**III — ENTENDIMENTO JURISPRUDENCIAL DO STF**
- Decisões do Plenário (com número, relator, data e EMENTA COMPLETA)
- Decisões das Turmas
- Evolução do entendimento (mudanças de posição)
- Súmulas Vinculantes aplicáveis (ENUNCIADO COMPLETO)

**IV — ENTENDIMENTO JURISPRUDENCIAL DO STJ**
- Decisões da Corte Especial e Seções
- Decisões das Turmas
- Súmulas aplicáveis (ENUNCIADO COMPLETO)
- Recursos Especiais Repetitivos (Tema IRDR)

**V — ENTENDIMENTO DOS TRIBUNAIS REGIONAIS/ESTADUAIS**
- Tendências jurisprudenciais dos TRFs e TJs
- Divergências entre tribunais

**VI — DOUTRINA CORRELATA**
- Posição dos principais doutrinadores
- Citações doutrinárias relevantes (autor, obra, edição, página)

**VII — TESES JURÍDICAS CONSOLIDADAS**
- Síntese das teses firmadas
- Teses favoráveis à defesa
- Teses favoráveis à acusação/autor

**VIII — CONCLUSÃO E APLICAÇÃO PRÁTICA**
- Resumo dos entendimentos predominantes
- Recomendações práticas para aplicação
- Riscos e oportunidades para o caso concreto

**IX — REFERÊNCIAS E FONTES**
- Lista completa de todos os julgados citados
- Legislação referenciada
- Doutrina citada`,
    instrucoes_especificas: `REGRAS CRÍTICAS PARA PESQUISA JURISPRUDENCIAL:

1. FONTE PRIORITÁRIA: Use EXCLUSIVAMENTE a Coletânea Temática de Jurisprudência do STF e as Súmulas STJ fornecidas na BASE DE CONHECIMENTO TXT.
2. CADA julgado citado DEVE conter: número do processo (ex: HC 84.078/MG), Tribunal, Turma/Órgão julgador, Relator, Data de julgamento.
3. Para cada decisão, transcreva a EMENTA COMPLETA ou o trecho mais relevante do VOTO do relator.
4. ORGANIZE cronologicamente (mais recente primeiro).
5. IDENTIFIQUE se o entendimento é PACÍFICO, MAJORITÁRIO ou se há DIVERGÊNCIA.
6. Para súmulas, cite o NÚMERO e o ENUNCIADO INTEGRAL.
7. NÃO INVENTE números de processos, relatores ou datas. Se não encontrar na base de conhecimento, escreva: "Verificar: [tema] — jurisprudência a confirmar."
8. Formate como documento acadêmico-profissional, com numeração ABNT.
9. O documento deve ter no MÍNIMO 3000 palavras para ser completo.
10. PRIORIZE trechos dos livros TXT fornecidos — eles são FONTES VERIFICADAS.`
  },
};

// Helper to get specialized prompt for a document type
function getPromptEspecializado(tipo: string): PromptEspecializado | null {
  return PROMPT_ESPECIALIZADO[tipo] || null;
}

// Determine if a document type is judicial (no watermark)
const JUDICIAL_CATEGORIES = ["penal", "civil", "trabalhista"];

function isJudicialType(tipo: string): boolean {
  // Check known document types
  const judicialTypes = [
    "habeas-corpus", "queixa-crime", "defesa-previa-criminal", "resposta-acusacao",
    "liberdade-provisoria", "recurso-sentido-estrito", "alegacoes-finais-criminais",
    "revisao-criminal", "revogacao-prisao-preventiva", "apelacao-criminal",
    "agravo-execucao-penal", "progressao-regime", "livramento-condicional",
    "embargos-declaracao-penal", "recurso-especial-penal", "contrarrazoes-agravo-execucao",
    "indulto-natalino", "revogacao-preventiva-cautelares", "restituicao-coisa-apreendida",
    "incidente-execucao-penal", "relaxamento-prisao", "recurso-extraordinario-penal",
    "peticao-inicial", "contestacao", "replica-civil", "tutela-provisoria",
    "recurso-apelacao", "agravo-instrumento", "agravo-interno", "embargos-declaracao",
    "cumprimento-sentenca", "mandado-seguranca", "mandado-seguranca-coletivo", "recurso-especial", "acao-rescisoria",
    "acao-popular", "acao-civil-publica", "reclamacao-constitucional",
    "embargos-execucao", "embargos-terceiro", "recurso-inominado", "peticao-inicial-jec",
    "reclamacao-trabalhista", "contestacao-trabalhista", "recurso-ordinario-trabalhista",
    "recurso-revista", "acao-rescisoria-trab"
  ];
  return judicialTypes.includes(tipo);
}

// ═══════════════════════════════════════════════════════════════
// PESQUISA UNIFICADA EM APIs PÚBLICAS (DataJud, LexML, Câmara, etc.)
// ═══════════════════════════════════════════════════════════════

async function searchExternalAPIs(query: string): Promise<NeuralContext["externalResults"]> {
  const results: NeuralContext["externalResults"] = [];
  const DATAJUD_API_KEY = "cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==";

  // Search DataJud — expanded to include state courts from plan v11.1
  const tribunais = ["stj", "tst", "tjsp", "tjrj", "tjmg", "tjrs", "tjpr"];
  
  await Promise.allSettled(
    tribunais.map(async (tribunal) => {
      try {
        const url = `https://api-publica.datajud.cnj.jus.br/api_publica_${tribunal}/_search`;
        const res = await fetch(url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `APIKey ${DATAJUD_API_KEY}`,
          },
          signal: AbortSignal.timeout(8000),
          body: JSON.stringify({
            size: 3,
            query: {
              bool: {
                should: [
                  { match: { "assuntos.nome": { query, boost: 3 } } },
                  { match: { "classe.nome": { query, boost: 2 } } }
                ],
                minimum_should_match: 1,
              },
            },
            sort: [{ "dataAjuizamento": { order: "desc" } }],
            _source: ["numeroProcesso", "classe.nome", "assuntos.nome", "orgaoJulgador.nome", "dataAjuizamento"],
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const hits = data.hits?.hits || [];
          hits.forEach((hit: any) => {
            const src = hit._source || {};
            const assuntos = (src.assuntos || []).map((a: any) => a.nome).filter(Boolean).join(", ");
            results.push({
              source: `DataJud ${tribunal.toUpperCase()}`,
              title: `${src.classe?.nome || "Processo"} - ${src.numeroProcesso || "N/A"}`,
              content: assuntos ? `Assuntos: ${assuntos}` : "",
              url: `https://processo.stj.jus.br/processo/pesquisa/?termo=${src.numeroProcesso || ""}`,
              tipo: "jurisprudencia",
            });
          });
        }
      } catch (e) {
        console.warn(`DataJud ${tribunal} error:`, e);
      }
    })
  );

  // Search LexML — local catalog + web portal URLs for validation
  try {
    const LEXML_CATALOG: Array<{title: string; urn: string; keywords: string[]; tipo: string; date: string}> = [
      { title: "Constituição Federal de 1988", urn: "urn:lex:br:federal:constituicao:1988-10-05;1988", keywords: ["constituição","federal","cf","direitos","garantias","fundamentais"], tipo: "lei", date: "05/10/1988" },
      { title: "Código Civil", urn: "urn:lex:br:federal:lei:2002-01-10;10406", keywords: ["civil","contrato","obrigação","responsabilidade","dano","indenização","propriedade"], tipo: "lei", date: "10/01/2002" },
      { title: "Código Penal", urn: "urn:lex:br:federal:decreto.lei:1940-12-07;2848", keywords: ["penal","crime","pena","prisão","homicídio","furto","roubo"], tipo: "lei", date: "07/12/1940" },
      { title: "Código de Processo Civil", urn: "urn:lex:br:federal:lei:2015-03-16;13105", keywords: ["processo","civil","cpc","petição","recurso","apelação","agravo","execução"], tipo: "lei", date: "16/03/2015" },
      { title: "Código de Processo Penal", urn: "urn:lex:br:federal:decreto.lei:1941-10-03;3689", keywords: ["processo","penal","cpp","inquérito","denúncia","habeas","corpus"], tipo: "lei", date: "03/10/1941" },
      { title: "CLT - Consolidação das Leis do Trabalho", urn: "urn:lex:br:federal:decreto.lei:1943-05-01;5452", keywords: ["trabalho","trabalhista","clt","emprego","rescisão","horas","extras","fgts"], tipo: "lei", date: "01/05/1943" },
      { title: "Código de Defesa do Consumidor", urn: "urn:lex:br:federal:lei:1990-09-11;8078", keywords: ["consumidor","cdc","produto","serviço","fornecedor","defeito","vício"], tipo: "lei", date: "11/09/1990" },
      { title: "Estatuto da Criança e do Adolescente", urn: "urn:lex:br:federal:lei:1990-07-13;8069", keywords: ["criança","adolescente","eca","menor","guarda","adoção"], tipo: "lei", date: "13/07/1990" },
      { title: "Lei de Execução Penal", urn: "urn:lex:br:federal:lei:1984-07-11;7210", keywords: ["execução","penal","lep","preso","regime","progressão","livramento"], tipo: "lei", date: "11/07/1984" },
      { title: "LGPD - Lei Geral de Proteção de Dados", urn: "urn:lex:br:federal:lei:2018-08-14;13709", keywords: ["dados","proteção","lgpd","privacidade","pessoal","consentimento"], tipo: "lei", date: "14/08/2018" },
      { title: "Código Tributário Nacional", urn: "urn:lex:br:federal:lei:1966-10-25;5172", keywords: ["tributário","imposto","tributo","ctn","fiscal","contribuinte"], tipo: "lei", date: "25/10/1966" },
      { title: "Lei de Licitações e Contratos", urn: "urn:lex:br:federal:lei:2021-04-01;14133", keywords: ["licitação","contrato","administrativo","pregão","concorrência","público"], tipo: "lei", date: "01/04/2021" },
      { title: "Lei do Mandado de Segurança", urn: "urn:lex:br:federal:lei:2009-08-07;12016", keywords: ["mandado","segurança","direito","líquido","certo","autoridade"], tipo: "lei", date: "07/08/2009" },
      { title: "Lei da Ação Civil Pública", urn: "urn:lex:br:federal:lei:1985-07-24;7347", keywords: ["civil","pública","difuso","coletivo","meio","ambiente","consumidor"], tipo: "lei", date: "24/07/1985" },
      { title: "Lei Maria da Penha", urn: "urn:lex:br:federal:lei:2006-08-07;11340", keywords: ["maria","penha","violência","doméstica","mulher","proteção"], tipo: "lei", date: "07/08/2006" }
    ];
    const qLower = query.toLowerCase();
    const qWords = qLower.split(/\s+/).filter(w => w.length > 3);
    const scored = LEXML_CATALOG.map(lei => {
      let score = 0;
      for (const kw of lei.keywords) {
        if (qLower.includes(kw)) score += 2;
        for (const qw of qWords) { if (kw.includes(qw) || qw.includes(kw)) score += 1; }
      }
      if (lei.title.toLowerCase().includes(qLower)) score += 5;
      return { ...lei, score };
    }).filter(l => l.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);

    for (const lei of scored) {
      results.push({
        source: "LexML Brasil",
        title: lei.title,
        content: `${lei.title} — Legislação Federal Brasileira`,
        url: `https://www.lexml.gov.br/busca/search?SearchableText=${encodeURIComponent(lei.title)}`,
        tipo: lei.tipo,
      });
    }
    // Always add a web search link for full validation
    results.push({
      source: "LexML Brasil (Portal)",
      title: `Pesquisa LexML: "${query}"`,
      content: `Valide informações no portal LexML — Doutrina, Jurisprudência e Legislação sobre "${query}"`,
      url: `https://www.lexml.gov.br/busca/search?SearchableText=${encodeURIComponent(query)}&facet_tipoDocumento=Legisla%C3%A7%C3%A3o`,
      tipo: "lei",
    });
    results.push({
      source: "LexML Brasil (Jurisprudência)",
      title: `Jurisprudência LexML: "${query}"`,
      content: `Busque decisões e acórdãos no acervo LexML sobre "${query}"`,
      url: `https://www.lexml.gov.br/busca/search?SearchableText=${encodeURIComponent(query)}&facet_tipoDocumento=Jurisprud%C3%AAncia`,
      tipo: "jurisprudencia",
    });
  } catch (e) {
    console.warn("LexML error:", e);
  }

  // Search Câmara dos Deputados
  try {
    const camaraUrl = `https://dadosabertos.camara.leg.br/api/v2/proposicoes?keywords=${encodeURIComponent(query)}&ordem=DESC&ordenarPor=ano&itens=3`;
    const res = await fetch(camaraUrl, { 
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(8000) 
    });
    if (res.ok) {
      const data = await res.json();
      (data.dados || []).forEach((item: any) => {
        results.push({
          source: "Câmara dos Deputados",
          title: `${item.siglaTipo} ${item.numero}/${item.ano}`,
          content: item.ementa || "",
          url: `https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${item.id}`,
          tipo: "proposicao",
        });
      });
    }
  } catch (e) {
    console.warn("Câmara error:", e);
  }

  // Search Senado Federal - Legislação
  try {
    const senadoUrl = `https://legis.senado.leg.br/dadosabertos/legislacao/lista.json?palavraChave=${encodeURIComponent(query)}`;
    const res = await fetch(senadoUrl, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const data = await res.json();
      const normas = data?.PesquisaLegislacao?.Normas?.Norma ||
                     data?.ListaLegislacao?.Legislacao?.Norma || [];
      const list = Array.isArray(normas) ? normas : [normas];
      list.filter(Boolean).slice(0, 5).forEach((n: any) => {
        results.push({
          source: "Senado Federal",
          title: n.DescricaoIdentificacao || `${n.SiglaTipoNorma || ""} ${n.NumeroNorma || ""}/${n.AnoNorma || ""}`.trim(),
          content: n.Ementa || n.TextoAssociado || "",
          url: n.UrlTextoAssociado || `https://legis.senado.leg.br/norma/${n.CodigoNorma || ""}`,
          tipo: "lei",
        });
      });
    }
  } catch (e) {
    console.warn("Senado error:", e);
  }

  console.log(`📡 External APIs: Found ${results.length} results`);
  return results;
}

// ═══════════════════════════════════════════════════════════════
// TXT KNOWLEDGE BASE — Search local doctrine/jurisprudence files
// ═══════════════════════════════════════════════════════════════

interface TxtKnowledgeResult {
  source: string;
  title: string;
  content: string;
  tipo: "doutrina" | "jurisprudencia" | "sumula";
}

// Area-specific mapping: which books are most relevant for each legal area
const AREA_BOOK_PRIORITY: Record<string, string[]> = {
  penal: [
    "direito-processual-penal-completo.txt",
    "tematica-jurisprudencia-stf-completa.txt",
    "principios-processuais-penais.txt",
    "sumulas-stj-inteiro-teor.txt"
  ],
  processual_penal: [
    "direito-processual-penal-completo.txt",
    "principios-processuais-penais.txt",
    "tematica-jurisprudencia-stf-completa.txt",
    "sumulas-stj-inteiro-teor.txt"
  ],
  civil: [
    "sumulas-stj-inteiro-teor.txt",
    "tematica-jurisprudencia-stf-completa.txt"
  ],
  consumidor: ["sumulas-stj-inteiro-teor.txt","tematica-jurisprudencia-stf-completa.txt"],
  trabalhista: ["sumulas-stj-inteiro-teor.txt","tematica-jurisprudencia-stf-completa.txt"],
  familia: ["sumulas-stj-inteiro-teor.txt","tematica-jurisprudencia-stf-completa.txt"],
  previdenciario: ["sumulas-stj-inteiro-teor.txt","tematica-jurisprudencia-stf-completa.txt"],
  tributario: ["sumulas-stj-inteiro-teor.txt","tematica-jurisprudencia-stf-completa.txt"],
  administrativo: ["sumulas-stj-inteiro-teor.txt","tematica-jurisprudencia-stf-completa.txt"],
  ambiental: ["sumulas-stj-inteiro-teor.txt","tematica-jurisprudencia-stf-completa.txt"],
  bancario: ["sumulas-stj-inteiro-teor.txt","tematica-jurisprudencia-stf-completa.txt"],
  imobiliario: ["sumulas-stj-inteiro-teor.txt","tematica-jurisprudencia-stf-completa.txt"],
  empresarial: ["sumulas-stj-inteiro-teor.txt","tematica-jurisprudencia-stf-completa.txt"],
  eleitoral: ["sumulas-stj-inteiro-teor.txt","tematica-jurisprudencia-stf-completa.txt"],
  internacional: ["sumulas-stj-inteiro-teor.txt","tematica-jurisprudencia-stf-completa.txt"],
};

const TXT_KNOWLEDGE_FILES: Array<{
  url: string;
  label: string;
  tipo: "doutrina" | "jurisprudencia" | "sumula";
  areas: string[];
}> = [
  // === NOVOS — Conteúdo completo dos docs/ ===
  { url: "sumulas-stj-inteiro-teor.txt", label: "Súmulas STJ — Inteiro Teor Completo (89k linhas)", tipo: "sumula", areas: ["civil","penal","trabalhista","consumidor","tributario","administrativo","previdenciario","familia","bancario","imobiliario","ambiental","empresarial","processual_penal","eleitoral","internacional"] },
  { url: "direito-processual-penal-completo.txt", label: "Aury Lopes Jr. — DPP Completo (42k linhas)", tipo: "doutrina", areas: ["penal","processual_penal"] },
  { url: "tematica-jurisprudencia-stf-completa.txt", label: "Coletânea Temática STF Completa (27k linhas)", tipo: "jurisprudencia", areas: ["penal","processual_penal","civil","constitucional"] },
  { url: "principios-processuais-penais.txt", label: "Princípios Processuais Penais (1.7k linhas)", tipo: "doutrina", areas: ["penal","processual_penal"] },
  // === Fallback ===
  { url: "sumulas-stj-completas-v4.txt", label: "Súmulas STJ v4 (fallback)", tipo: "sumula", areas: ["civil","penal","trabalhista","consumidor","tributario","administrativo","previdenciario","familia","bancario","imobiliario","ambiental","empresarial","processual_penal"] },
  { url: "tematica-jurisprudencia-stf-v5.txt", label: "Coletânea STF v5 (fallback)", tipo: "jurisprudencia", areas: ["penal","processual_penal"] },
  { url: "aury-lopes-direito-processual-penal-v3.txt", label: "Aury Lopes Jr. v3 (fallback)", tipo: "doutrina", areas: ["penal","processual_penal"] },
  { url: "nocoes-direito-processual-penal-v4.txt", label: "Noções DPP v4 (fallback)", tipo: "doutrina", areas: ["penal","processual_penal"] },
  // === Legacy ===
  { url: "sumulas-stj-completas-v3.txt", label: "Súmulas STJ v3 (legado)", tipo: "sumula", areas: ["civil","penal","trabalhista","consumidor","tributario"] },
  { url: "jurisprudencia-stf-penal.txt", label: "Jurisprudência STF Penal (legado)", tipo: "jurisprudencia", areas: ["penal"] }
];

// In-memory cache for TXT files (persists across requests in same isolate)
const _txtCache = new Map<string, { content: string; loadedAt: number }>();
const TXT_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

async function loadTxtFile(filename: string, projectUrl: string): Promise<string | null> {
  const cached = _txtCache.get(filename);
  if (cached && (Date.now() - cached.loadedAt) < TXT_CACHE_TTL) {
    return cached.content;
  }
  try {
    const url = `${projectUrl}/docs/${filename}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const text = await res.text();
    if (text.length > 100) {
      _txtCache.set(filename, { content: text, loadedAt: Date.now() });
    }
    return text;
  } catch (e) {
    console.warn(`⚠️ Failed to load TXT file ${filename}:`, e);
    return null;
  }
}

function searchTxtContent(content: string, keywords: string[], maxExcerpts = 3, excerptSize = 800): string[] {
  const lines = content.split("\n");
  const excerpts: Array<{ text: string; score: number }> = [];
  
  // Sliding window search with scoring
  const windowSize = 15; // lines per window
  for (let i = 0; i < lines.length - windowSize; i += 5) {
    const window = lines.slice(i, i + windowSize).join("\n");
    const windowLower = window.toLowerCase();
    
    let score = 0;
    for (const kw of keywords) {
      if (windowLower.includes(kw.toLowerCase())) {
        score += (windowLower.match(new RegExp(kw.toLowerCase(), "g")) || []).length;
      }
    }
    
    if (score >= 2) { // At least 2 keyword matches
      excerpts.push({ text: window.substring(0, excerptSize), score });
    }
  }
  
  // Return top excerpts by score, deduplicated
  excerpts.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const results: string[] = [];
  for (const e of excerpts) {
    const key = e.text.substring(0, 100);
    if (!seen.has(key)) {
      seen.add(key);
      results.push(e.text);
      if (results.length >= maxExcerpts) break;
    }
  }
  return results;
}

async function searchTxtKnowledgeBase(
  query: string,
  keywords: string[],
  areaJuridica?: string,
  projectUrl = "https://gentle-maker-lab.lovable.app"
): Promise<TxtKnowledgeResult[]> {
  const results: TxtKnowledgeResult[] = [];
  
  // Expand keywords with area-specific terms
  const expandedKeywords = [...keywords];
  if (areaJuridica) expandedKeywords.push(areaJuridica);
  
  // Add query words
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 4);
  expandedKeywords.push(...queryWords.slice(0, 5));
  const uniqueKeywords = [...new Set(expandedKeywords)].filter(Boolean);
  
  if (uniqueKeywords.length === 0) return results;
  
  console.log(`📚 Searching TXT knowledge base with ${uniqueKeywords.length} keywords for area: ${areaJuridica || "geral"}`);
  
  // Select files based on area priority — prioritize area-specific books first
  const area = areaJuridica?.toLowerCase() || "civil";
  const priorityFiles = AREA_BOOK_PRIORITY[area] || [];
  
  // Build ordered file list: priority files first, then others relevant to the area
  const orderedFiles: typeof TXT_KNOWLEDGE_FILES = [];
  const seen = new Set<string>();
  
  // 1. Priority files for this specific area
  for (const pf of priorityFiles) {
    const file = TXT_KNOWLEDGE_FILES.find(f => f.url === pf);
    if (file && !seen.has(file.url)) {
      orderedFiles.push(file);
      seen.add(file.url);
    }
  }
  
  // 2. Any other file that covers this area (skip legacy if v3 exists)
  for (const file of TXT_KNOWLEDGE_FILES) {
    if (!seen.has(file.url) && file.areas.includes(area)) {
      orderedFiles.push(file);
      seen.add(file.url);
    }
  }
  
  // 3. Súmulas STJ always included (covers all areas)
  for (const file of TXT_KNOWLEDGE_FILES) {
    if (!seen.has(file.url) && file.tipo === "sumula") {
      orderedFiles.push(file);
      seen.add(file.url);
    }
  }
  
  console.log(`  📚 Selected ${orderedFiles.length} books: ${orderedFiles.map(f => f.url).join(", ")}`);
  
  // Load and search files in parallel — more excerpts from priority books
  const searchPromises = orderedFiles.map(async (file, idx) => {
    const content = await loadTxtFile(file.url, projectUrl);
    if (!content) return;
    
    // Priority books get more excerpts and larger windows
    const isPriority = idx < priorityFiles.length;
    const maxExcerpts = isPriority ? 4 : 2;
    const excerptSize = isPriority ? 1200 : 800;
    
    const excerpts = searchTxtContent(content, uniqueKeywords, maxExcerpts, excerptSize);
    for (const excerpt of excerpts) {
      results.push({
        source: file.label,
        title: file.label,
        content: excerpt,
        tipo: file.tipo,
      });
    }
  });
  
  await Promise.allSettled(searchPromises);
  
  // Sort: priority books first, then by content length (richer excerpts first)
  results.sort((a, b) => {
    const aIsPriority = priorityFiles.some(pf => a.source.includes(pf.replace(".txt", "")));
    const bIsPriority = priorityFiles.some(pf => b.source.includes(pf.replace(".txt", "")));
    if (aIsPriority && !bIsPriority) return -1;
    if (!aIsPriority && bIsPriority) return 1;
    return b.content.length - a.content.length;
  });
  
  console.log(`  📚 TXT knowledge base: found ${results.length} relevant excerpts`);
  return results;
}

// ═══════════════════════════════════════════════════════════════
// NEURAL NETWORK INTEGRATION
// ═══════════════════════════════════════════════════════════════

async function extractKeywords(query: string): Promise<string[]> {
  // Extract meaningful legal keywords from the query
  const stopwords = new Set(["de", "do", "da", "dos", "das", "em", "no", "na", "nos", "nas", "por", "para", "com", "sem", "uma", "um", "que", "se", "ou", "os", "as", "ao", "à", "e", "a", "o", "é", "foi", "ser", "ter", "mais", "muito", "como"]);
  const words = query.toLowerCase()
    .replace(/[^a-záàâãéèêíïóôõöúçñ\s]/gi, " ")
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopwords.has(w));
  // Return unique keywords, max 6
  return [...new Set(words)].slice(0, 6);
}

// Generate query embedding using Gemini gemini-embedding-001 (768d, free)
// Unified across all functions: same provider ensures vector space compatibility
function _getGeminiKeys(): string[] {
  return ["GEMINI_API_KEY_GCP","GEMINI_API_KEY","GEMINI_API_KEY_2","GEMINI_API_KEY_3","GEMINI_API_KEY_4","GEMINI_API_KEY_5","GEMINI_API_KEY_6","GEMINI_API_KEY_7"].map(n => Deno.env.get(n)).filter(Boolean) as string[];
}

async function generateQueryEmbedding(text: string, supabaseClient?: any): Promise<number[]> {
  const truncated = text.slice(0, 4000);

  // Check embedding cache first
  if (supabaseClient) {
    try {
      const queryHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(truncated))
        .then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join(""));
      
      const { data: cached } = await supabaseClient
        .from("query_embedding_cache")
        .select("embedding")
        .eq("query_hash", queryHash)
        .eq("task_type", "document_generation")
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if ((cached as any)?.embedding) {
        console.log("  ✅ Embedding cache HIT for document generation");
        const emb = typeof (cached as any).embedding === "string"
          ? JSON.parse((cached as any).embedding)
          : (cached as any).embedding;
        if (Array.isArray(emb) && emb.length > 0) return emb;
      }
    } catch (cacheErr) {
      console.warn("  ⚠️ Embedding cache lookup failed:", cacheErr);
    }
  }

  const geminiKeys = _getGeminiKeys();
  if (geminiKeys.length === 0) {
    console.warn("  ⚠️ No Gemini API keys configured, falling back to text search");
    return [];
  }

  for (const apiKey of geminiKeys) {
    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(10000),
          body: JSON.stringify({
            model: "models/gemini-embedding-001",
            content: { parts: [{ text: truncated }] },
            outputDimensionality: 768,
          }),
        }
      );

      if (!response.ok) {
        const errText = await response.text();
        console.error(`  ❌ Gemini embedding error ${response.status}: ${errText.slice(0, 200)}`);
        continue;
      }

      const data = await response.json();
      const embedding = data?.embedding?.values;
      if (embedding?.length) {
        const finalEmb = embedding.length >= 768 ? embedding.slice(0, 768) : embedding;
        console.log(`  ✅ Gemini query embedding generated (${finalEmb.length} dims)`);

        // Save to cache
        if (supabaseClient) {
          try {
            const queryHash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(truncated))
              .then(buf => Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join(""));
            
            await (supabaseClient.from("query_embedding_cache") as any).upsert({
              query_hash: queryHash,
              query_text: truncated.slice(0, 500),
              embedding: `[${finalEmb.join(",")}]`,
              task_type: "document_generation",
              expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
            }, { onConflict: "query_hash" });
            console.log("  💾 Embedding cached for future use");
          } catch (cacheErr) {
            console.warn("  ⚠️ Failed to cache embedding:", cacheErr);
          }
        }

        return finalEmb;
      }
    } catch (err: any) {
      console.error(`  ❌ Gemini embedding request failed: ${err.message}`);
      continue;
    }
  }
  console.warn("  ⚠️ All Gemini embedding providers failed, falling back to text search");
  return [];
}

async function fetchFeedbackContext(
  supabase: any,
  tipo: string
): Promise<{ positive: FeedbackExample[]; negative: FeedbackExample[] }> {
  const positive: FeedbackExample[] = [];
  const negative: FeedbackExample[] = [];

  try {
    // Fetch positive feedback (score >= 0.7) for this document type
    const { data: positiveData } = await supabase
      .from("neural_learning_data")
      .select("output_text, quality_score, feedback, metadata")
      .in("interaction_type", ["document_generation", "document_feedback"])
      .gte("quality_score", 0.7)
      .order("quality_score", { ascending: false })
      .limit(20);

    if (positiveData) {
      const filtered = positiveData.filter((d: any) => {
        const meta = d.metadata as Record<string, any> || {};
        return meta.tipo === tipo || meta.documentType === tipo;
      }).slice(0, 3);

      for (const d of filtered) {
        positive.push({
          content_snippet: (d.output_text || "").substring(0, 500),
          quality_score: Number(d.quality_score) || 0,
          feedback: d.feedback || "Aprovado",
          tipo,
        });
      }
    }

    // Fetch negative feedback (score < 0.5)
    const { data: negativeData } = await supabase
      .from("neural_learning_data")
      .select("output_text, quality_score, feedback, metadata")
      .in("interaction_type", ["document_generation", "document_feedback"])
      .lt("quality_score", 0.5)
      .order("quality_score", { ascending: true })
      .limit(20);

    if (negativeData) {
      const filtered = negativeData.filter((d: any) => {
        const meta = d.metadata as Record<string, any> || {};
        return meta.tipo === tipo || meta.documentType === tipo;
      }).slice(0, 2);

      for (const d of filtered) {
        negative.push({
          content_snippet: (d.output_text || "").substring(0, 300),
          quality_score: Number(d.quality_score) || 0,
          feedback: d.feedback || "Reprovado",
          tipo,
        });
      }
    }

    console.log(`🧠 Feedback context for "${tipo}": ${positive.length} positive, ${negative.length} negative`);
  } catch (err) {
    console.warn("⚠️ Error fetching feedback context:", err);
  }

  return { positive, negative };
}

async function fetchNeuralContext(
  supabase: any,
  query: string,
  tipo?: string
): Promise<NeuralContext> {
  const context: NeuralContext = {
    jurisprudence: [],
    knowledge: [],
    specializations: [],
    externalResults: [],
    feedbackPositive: [],
    feedbackNegative: [],
    txtKnowledge: [],
  };

  const keywords = await extractKeywords(query);
  console.log(`🧠 Neural keywords extracted: ${keywords.join(", ")}`);

  try {
    // Generate embedding for semantic search
    const embedding = await generateQueryEmbedding(query, supabase);

    // 1. Search legal_embeddings using hybrid_search_legal_v3 (semantic + keyword + authority + recency)
    console.log("🧠 Searching legal_embeddings with hybrid semantic search...");
    
    if (embedding.length > 0) {
      const { data: hybridResults, error: hybridError } = await supabase.rpc("hybrid_search_legal_v3", {
        query_text: query,
        query_embedding: `[${embedding.join(",")}]`,
        match_count: 8,
        semantic_weight: 0.55,
        keyword_weight: 0.25,
        authority_weight: 0.10,
        recency_weight: 0.10,
      });

      if (!hybridError && hybridResults?.length) {
        context.jurisprudence = hybridResults.map((j: any) => ({
          title: j.title,
          content: j.content.substring(0, 1500),
          source: j.source_label || j.source,
          url: j.url,
        }));
        console.log(`  ✅ Found ${hybridResults.length} jurisprudence results (hybrid semantic search)`);
      }
    }

    // Fallback to text search if embedding failed or no results
    if (context.jurisprudence.length === 0 && keywords.length > 0) {
      console.log("  ⚠️ Semantic search returned 0, trying text search fallback...");
      const plainQuery = keywords.slice(0, 4).join(" | ");
      const { data: textResults } = await supabase
        .from("legal_embeddings")
        .select("title, content, source, source_label, url")
        .textSearch("content", plainQuery, { type: "plain", config: "portuguese" })
        .limit(8);

      if (textResults?.length) {
        context.jurisprudence = textResults.map((j: any) => ({
          title: j.title,
          content: j.content.substring(0, 1500),
          source: j.source_label || j.source,
          url: j.url,
        }));
        console.log(`  ✅ Found ${textResults.length} jurisprudence results (text search fallback)`);
      }
    }

    // 2. Search neural_knowledge_base using search_neural_knowledge RPC (semantic + keyword)
    console.log("🧠 Searching neural knowledge base with semantic search...");
    
    if (embedding.length > 0) {
      const { data: kbResults, error: kbError } = await supabase.rpc("search_neural_knowledge", {
        query_text: query,
        query_embedding: `[${embedding.join(",")}]`,
        match_count: 5,
        semantic_weight: 0.7,
        keyword_weight: 0.3,
      });

      if (!kbError && kbResults?.length) {
        context.knowledge = kbResults.map((k: any) => ({
          title: k.title,
          content: k.content.substring(0, 1000),
          source_type: k.source_type,
        }));
        console.log(`  ✅ Found ${kbResults.length} knowledge results (semantic search)`);
      }
    }

    // Fallback to text search if embedding failed or no results
    if (context.knowledge.length === 0 && keywords.length > 0) {
      console.log("  ⚠️ Knowledge semantic search returned 0, trying text fallback...");
      const kw = keywords[0] || "";
      if (kw) {
        const { data: kbFallback } = await supabase
          .from("neural_knowledge_base")
          .select("title, content, source_type, source_reference, tags")
          .eq("is_processed", true)
          .or(`title.ilike.%${kw}%,content.ilike.%${kw}%`)
          .limit(5);

        if (kbFallback?.length) {
          context.knowledge = kbFallback.map((k: any) => ({
            title: k.title,
            content: k.content.substring(0, 1000),
            source_type: k.source_type,
          }));
          console.log(`  ✅ Found ${kbFallback.length} knowledge results (text fallback)`);
        }
      }
    }

    // 3. Get active neural specializations
    console.log("🧠 Loading active neural specializations...");
    const { data: specializations } = await supabase
      .from("neural_specializations")
      .select("name, category, prompts, accuracy_score")
      .eq("is_active", true)
      .eq("training_status", "completed")
      .order("accuracy_score", { ascending: false })
      .limit(3);

    if (specializations) {
      context.specializations = specializations;
      console.log(`  ✅ Loaded ${specializations.length} specializations`);
    }

    // 4. Fetch feedback context for this document type
    if (tipo) {
      const feedbackCtx = await fetchFeedbackContext(supabase, tipo);
      context.feedbackPositive = feedbackCtx.positive;
      context.feedbackNegative = feedbackCtx.negative;
    }
  } catch (error) {
    console.error("Neural context fetch error:", error);
  }

  return context;
}

function formatNeuralEnhancement(context: NeuralContext): string {
  let enhancement = "";

  if (context.jurisprudence.length > 0) {
    enhancement += "\n\n═══════════════════════════════════════════════════════════════\n";
    enhancement += "JURISPRUDÊNCIA E DOUTRINA DA REDE NEURAL CONEXÃO (USE OBRIGATORIAMENTE)\n";
    enhancement += "═══════════════════════════════════════════════════════════════\n\n";
    
    context.jurisprudence.forEach((j, i) => {
      enhancement += `[${i + 1}] ${j.source.toUpperCase()}\n`;
      enhancement += `Título: ${j.title}\n`;
      enhancement += `Conteúdo: ${j.content}\n`;
      if (j.url) enhancement += `URL: ${j.url}\n`;
      enhancement += "\n---\n\n";
    });
  }

  if (context.knowledge.length > 0) {
    enhancement += "\n═══════════════════════════════════════════════════════════════\n";
    enhancement += "BASE DE CONHECIMENTO NEURAL ESPECIALIZADO\n";
    enhancement += "═══════════════════════════════════════════════════════════════\n\n";
    
    context.knowledge.forEach((k, i) => {
      enhancement += `[${i + 1}] (${k.source_type}) ${k.title}\n`;
      enhancement += `${k.content}\n\n`;
    });
  }

  if (context.specializations.length > 0) {
    enhancement += "\n═══════════════════════════════════════════════════════════════\n";
    enhancement += "ESPECIALIZAÇÕES NEURAIS ATIVAS\n";
    enhancement += "═══════════════════════════════════════════════════════════════\n";
    context.specializations.forEach((s) => {
      enhancement += `• ${s.name}\n`;
    });
    enhancement += "\n";
  }

  // External API results (DataJud, LexML, Câmara)
  if (context.externalResults && context.externalResults.length > 0) {
    enhancement += "\n═══════════════════════════════════════════════════════════════\n";
    enhancement += "PESQUISA EM APIs PÚBLICAS (DataJud, LexML, Câmara dos Deputados)\n";
    enhancement += "═══════════════════════════════════════════════════════════════\n\n";
    
    context.externalResults.forEach((r, i) => {
      enhancement += `[${i + 1}] ${r.source} - ${r.tipo.toUpperCase()}\n`;
      enhancement += `Título: ${r.title}\n`;
      if (r.content) enhancement += `Resumo: ${r.content.substring(0, 500)}\n`;
      if (r.url) enhancement += `URL: ${r.url}\n`;
      enhancement += "\n---\n\n";
    });
  }

  // Feedback-based learning section
  if (context.feedbackPositive?.length > 0 || context.feedbackNegative?.length > 0) {
    enhancement += "\n═══════════════════════════════════════════════════════════════\n";
    enhancement += "APRENDIZADO POR FEEDBACK (REDE NEURAL CONEXÃO)\n";
    enhancement += "═══════════════════════════════════════════════════════════════\n\n";

    if (context.feedbackPositive?.length > 0) {
      enhancement += `PADRÕES APROVADOS para ${context.feedbackPositive[0]?.tipo || "este tipo"}:\n`;
      context.feedbackPositive.forEach((f, i) => {
        enhancement += `[${i + 1}] (score: ${f.quality_score.toFixed(2)}) ${f.content_snippet}\n\n`;
      });
    }

    if (context.feedbackNegative?.length > 0) {
      enhancement += `ERROS A EVITAR (feedback de usuários):\n`;
      context.feedbackNegative.forEach((f) => {
        enhancement += `- "${f.feedback}" (score: ${f.quality_score.toFixed(2)})\n`;
      });
      enhancement += "\n";
    }

    enhancement += "INSTRUÇÃO: Siga os padrões aprovados e evite os erros listados acima.\n";
  }

  // TXT Knowledge Base section (doctrine, jurisprudence, súmulas from uploaded books)
  if (context.txtKnowledge && context.txtKnowledge.length > 0) {
    enhancement += "\n═══════════════════════════════════════════════════════════════\n";
    enhancement += "🔒 BASE DE CONHECIMENTO VERIFICADA — LIVROS E COLETÂNEAS OFICIAIS\n";
    enhancement += "═══════════════════════════════════════════════════════════════\n";
    enhancement += "⚠️ REGRA ABSOLUTA: Os trechos abaixo são EXTRAÍDOS DIRETAMENTE de obras publicadas.\n";
    enhancement += "São a ÚNICA fonte permitida para fundamentação doutrinária e jurisprudencial.\n";
    enhancement += "NÃO invente citações, números de processos ou ementas que NÃO estejam aqui.\n";
    enhancement += "Se um dado não está abaixo, NÃO cite — use apenas argumentação lógica.\n\n";
    
    // Group by tipo for clearer organization
    const byTipo: Record<string, typeof context.txtKnowledge> = {};
    context.txtKnowledge.forEach(tk => {
      if (!byTipo[tk.tipo]) byTipo[tk.tipo] = [];
      byTipo[tk.tipo].push(tk);
    });
    
    const tipoLabels: Record<string, string> = {
      doutrina: "📖 DOUTRINA (Aury Lopes Jr., Nucci, Gran Cursos)",
      jurisprudencia: "⚖️ JURISPRUDÊNCIA STF/STJ (Coletânea Temática Oficial)",
      sumula: "📋 SÚMULAS STJ — INTEIRO TEOR",
    };
    
    for (const [tipo, items] of Object.entries(byTipo)) {
      enhancement += `\n${tipoLabels[tipo] || tipo.toUpperCase()}\n`;
      enhancement += "───────────────────────────────────────────────\n";
      items.forEach((tk, i) => {
        enhancement += `[${tipo.toUpperCase()}-${i + 1}] Fonte: ${tk.source}\n`;
        enhancement += `${tk.content}\n\n`;
      });
    }
    
    enhancement += "═══════════════════════════════════════════════════════════════\n";
    enhancement += "INSTRUÇÃO DE USO: Ao fundamentar, COPIE literalmente trechos acima entre aspas,\n";
    enhancement += "citando a fonte (ex: 'conforme Aury Lopes Jr., Direito Processual Penal, 16ª Ed.').\n";
    enhancement += "Para súmulas, cite o NÚMERO e o ENUNCIADO COMPLETO conforme consta acima.\n";
    enhancement += "═══════════════════════════════════════════════════════════════\n";
  }

  if (enhancement) {
    enhancement += "\n⚠️ INSTRUÇÃO CRÍTICA: Você DEVE citar as jurisprudências e fontes acima no documento, incluindo números dos acórdãos, datas, tribunais e URLs quando disponíveis.\n";
    enhancement += "⚠️ INSTRUÇÃO ANTI-ALUCINAÇÃO: Para fundamentação doutrinária e jurisprudencial, PRIORIZE os trechos da BASE DE CONHECIMENTO TXT acima. Eles são fontes verificadas e confiáveis.\n";
  }

  return enhancement;
}

// ═══════════════════════════════════════════════════════════════
// SYSTEM PROMPT BASE
// ═══════════════════════════════════════════════════════════════

const systemPrompt = `Você é um gerador de documentos jurídicos de alta qualidade do escritório ORION IA Platform ([OAB]).
Ano de referência: 2026. Aplique legislação e jurisprudência atualizadas.

═══════════════════════════════════════════════════════════════
DIRETRIZ CENTRAL — DOUTRINA COMENTADA, FOCO DEFENSIVO E MENTALIDADE DE MAGISTRADO
═══════════════════════════════════════════════════════════════
Você é um advogado de DEFESA. Seu cérebro jurídico é focado EXCLUSIVAMENTE em defender o cliente.

MENTALIDADE DE MAGISTRADO: Além de pensar como advogado, você DEVE pensar como um JUIZ.
Quem julga são os magistrados. Use os MESMOS argumentos e fundamentações que um juiz usaria para ABSOLVER ou DEFERIR.
Antecipe o raciocínio judicial: demonstre que a absolvição/deferimento é a conclusão lógica e juridicamente correta.
Pergunte-se: "Se eu fosse o juiz, que fundamentação me convenceria a absolver/deferir?" — e use exatamente essa fundamentação.

DOUTRINADOR PRIORITÁRIO — GUILHERME DE SOUZA NUCCI:
Sempre que aplicável (especialmente em matéria penal e processual penal), cite e priorize a doutrina do juiz Guilherme de Souza Nucci (Código Penal Comentado, Código de Processo Penal Comentado, Manual de Direito Penal). Nucci é magistrado E doutrinador — sua doutrina reflete como um juiz pensa e decide.

SEMPRE busque e priorize:
1. DOUTRINA COMENTADA (Códigos Comentados): Identifique para cada artigo de lei citado QUANDO SE APLICA e QUANDO NÃO SE APLICA, conforme doutrinadores renomados (priorize Nucci, depois Rogério Greco, Mirabete, Damásio, Pacelli, etc.).
2. TESES DEFENSIVAS: Para cada fundamento, extraia teses de defesa — excludentes de ilicitude, atenuantes, nulidades processuais, prescrição, decadência, causas de diminuição de pena, inversão do ônus da prova.
3. APLICABILIDADE vs. INAPLICABILIDADE: Sempre que citar um dispositivo legal, explique em que circunstâncias ele se aplica ao caso do cliente E em que circunstâncias ele NÃO se aplica (favorecendo a defesa).
4. DECISÕES RELEVANTES DEFENSIVAS: Cite jurisprudência que favoreça a DEFESA — absolvições, trancamentos, relaxamentos, atenuações.
5. NUNCA adote posição acusatória. SEMPRE argumente pela defesa, pelo réu, pelo acusado, pelo reclamante (quando empregado), pelo consumidor.
6. Use doutrina para fundamentar cada argumento — doutrina traz exemplos práticos, circunstâncias de aplicação e não aplicação, e decisões relevantes que fortalecem a defesa.
═══════════════════════════════════════════════════════════════

REGRAS OBRIGATÓRIAS:
1. Gere documentos COMPLETOS prontos para protocolo eletrônico, sem placeholders genéricos
2. Use linguagem jurídica formal em português brasileiro
3. Cite artigos de lei, súmulas e jurisprudência com números reais (priorize STF e STJ)
4. Fundamente com DOUTRINA COMENTADA sempre que disponível — cite autor, obra e posição doutrinária
5. Siga a estrutura padrão de cada tipo de peça/documento
6. Inclua endereçamento, qualificação, fundamentação, pedidos, local, data e assinatura
7. Advogado responsável: [Nome do Advogado] – [OAB]
8. Foro padrão: Porto Alegre/RS (salvo indicação contrária)
8. ASSINATURAS conforme o tipo de documento e a opção do usuário:
   - Petições judiciais (petição inicial, contestação, recursos, mandado de segurança, habeas corpus, embargos, impugnação, réplica, manifestação): APENAS "[Nome do Advogado] – [OAB]" (SEM assinatura de partes, autor ou testemunhas, SALVO se o usuário explicitamente solicitar testemunhas no prompt)
   - Contratos e acordos: assinatura das partes contratantes + testemunhas SOMENTE se solicitado pelo usuário
   - Procurações: assinatura do outorgante com CPF + outorgado com OAB
9. NUNCA gere o documento duas vezes. Se ele já está completo com assinatura, NÃO reinicie. Cada documento deve aparecer UMA ÚNICA VEZ.

═══════════════════════════════════════════════════════════════
REGRA ANTI-ALUCINAÇÃO (PRIORIDADE MÁXIMA):
═══════════════════════════════════════════════════════════════
1. NUNCA invente números de processo, acórdãos, REsp, HC, RE ou qualquer identificador judicial
2. Na seção "DA JURISPRUDÊNCIA", use APENAS decisões que estejam no CONTEXTO JURÍDICO fornecido via RAG abaixo
3. Se NÃO houver contexto jurídico com decisões reais, OMITA a seção de jurisprudência inteiramente ou escreva: "Jurisprudência a ser pesquisada e inserida pelo advogado responsável."
4. PREFIRA fundamentar com LEGISLAÇÃO (artigos de lei verificáveis) do que com jurisprudência — artigos de lei são seguros e verificáveis
5. Quando usar jurisprudência do contexto RAG, copie EXATAMENTE os dados fornecidos — NÃO modifique números de processo, datas, relatores ou ementas
6. Cite artigos de lei com precisão absoluta (ex: art. 5º, XXXV, CF; art. 319, CPC) — estes são verificáveis e seguros
7. Se o usuário pedir jurisprudência específica que NÃO está no contexto RAG fornecido, escreva: "Jurisprudência específica a ser pesquisada nos tribunais competentes."

ESTRUTURA GERAL OBRIGATÓRIA (2026):
1. ENDEREÇAMENTO — "Excelentíssimo(a) Senhor(a) Doutor(a) Juiz(a) de Direito da ___ Vara ___ da Comarca de ___" (ou Desembargador, Ministro, conforme competência)
2. QUALIFICAÇÃO COMPLETA — Nome, estado civil, profissão, RG, CPF/CNPJ, endereço completo, e-mail e telefone (art. 319, II, CPC)
3. IDENTIFICAÇÃO DO PROCESSO — Número dos autos (quando existente)
4. TÍTULO DA PEÇA — Em CAIXA ALTA e centralizado
5. FATOS — Narrativa clara, cronológica e objetiva
6. FUNDAMENTAÇÃO JURÍDICA — Dispositivos legais, doutrina e jurisprudência atualizada (priorize STF e STJ, temas de repercussão geral, súmulas vinculantes)
7. PEDIDOS — Específicos, numerados, com liminar/tutela provisória quando cabível
8. REQUERIMENTOS FINAIS — Citação/intimação, produção de provas, justiça gratuita (se aplicável), condenação em honorários
9. VALOR DA CAUSA — Quando exigido (ações condenatórias, por exemplo)
10. FECHO — "Nestes termos, pede deferimento. [Local], [data]. [Nome do Advogado] – [OAB]" (assinatura digital)

PETICIONAMENTO ELETRÔNICO (2026):
- Obrigatório em praticamente todos os tribunais (PJe ou sistema próprio do STF)
- Assinatura digital obrigatória
- Quando peça dirigida ao STF: aplica-se RISTF + peticionamento pelo portal do STF com certificado ICP-Brasil
- Formato PDF/A preferencial para documentos nato-digitais

FORMATAÇÃO OBRIGATÓRIA (CRÍTICO — o PDF será corrompido se violar estas regras):
- NÃO use markdown NUNCA (sem **, ##, -, *, \`\`\`, bullets, etc.)
- Use TEXTO PURO com letras maiúsculas para títulos de seções
- Para negrito, use CAIXA ALTA ao invés de **asteriscos**
- Para listas, use letras (a, b, c) ou números (1, 2, 3) sem marcadores markdown
- Use linhas de underscores (________________________________) para campos de assinatura
- Separe CADA SEÇÃO com LINHAS EM BRANCO (nunca junte parágrafos diferentes na mesma linha)
- OUTORGANTE, OUTORGADO, CPF, OAB devem começar em NOVA LINHA, nunca grudados ao texto anterior
- Cada parágrafo deve ter uma linha em branco antes e depois dele
- Fonte: Times New Roman 12, espaçamento 1,5, margens ABNT

═══════════════════════════════════════════════════════════════
NORMAS ABNT DETALHADAS (APLICAR EM TODOS OS DOCUMENTOS):
═══════════════════════════════════════════════════════════════

NBR 14724:2011 - FORMATAÇÃO:
- Margens: superior 3cm, inferior 2cm, esquerda 3cm, direita 2cm
- Fonte: Times New Roman 12pt (corpo), 10pt (citações longas e notas de rodapé)
- Espaçamento: 1,5 entrelinhas (corpo), simples (citações longas, notas, referências)
- Recuo de parágrafo: 1,25cm na primeira linha
- Alinhamento: justificado
- Títulos primários: CAIXA ALTA, negrito
- Títulos secundários: CAIXA ALTA, sem negrito
- Paginação: canto superior direito, a partir da introdução

NBR 10520:2002 - CITAÇÕES:
- Citação direta curta (até 3 linhas): entre aspas duplas, no parágrafo
- Citação direta longa (mais de 3 linhas): recuo 4cm, fonte 10, espaçamento simples, SEM aspas
- Citação indireta (paráfrase): autor e ano, página opcional
- Sistema autor-data: (SOBRENOME, ano, p. XX)
- Citação de citação: (AUTOR apud AUTOR CONSULTADO, ano)
- Supressão: [...], interpolação: [ ], ênfase: grifo nosso

NBR 6023:2018 - REFERÊNCIAS:
- Livros: SOBRENOME, Nome. Título. Edição. Local: Editora, Ano.
- Legislação: JURISDIÇÃO. Lei/Decreto nº X. Dados da publicação.
- Jurisprudência: JURISDIÇÃO. Órgão. Tipo nº X. Relator. Data. Publicação.
- Ordenação alfabética por sobrenome do autor
- Título da obra em negrito ou itálico (consistente)

NBR 6024:2012 - NUMERAÇÃO:
- Seções: 1, 1.1, 1.1.1 (máximo 5 níveis)
- Alíneas: a), b), c) com minúsculas
- Subalíneas: travessão seguido de espaço`;

// Build specialized system prompt enhancement for a given document type
function buildSpecializedPromptSection(tipo: string): string {
  const spec = getPromptEspecializado(tipo);
  if (!spec) return "";

  let section = "\n\n═══════════════════════════════════════════════════════════════\n";
  section += "INSTRUÇÕES ESPECIALIZADAS PARA ESTE TIPO DE PEÇA\n";
  section += "═══════════════════════════════════════════════════════════════\n\n";

  section += "LEGISLAÇÃO OBRIGATÓRIA (cite estes dispositivos):\n";
  spec.legislacao.forEach(l => { section += `• ${l}\n`; });

  section += "\nESTRUTURA OBRIGATÓRIA DO DOCUMENTO:\n";
  section += spec.estrutura + "\n";

  section += "\nINSTRUÇÕES ESPECÍFICAS:\n";
  section += spec.instrucoes_especificas + "\n";

  return section;
}

// ═══════════════════════════════════════════════════════════════
// AI PROVIDERS CONFIGURATION
// ═══════════════════════════════════════════════════════════════

interface AIProvider {
  name: string;
  apiKeyEnvs: string[];
  maxTokens: number;
  temperature: number;
}

const AI_PROVIDERS: Record<string, AIProvider> = {
  gemini_pro: {
    name: "Gemini 2.5 Pro",
    apiKeyEnvs: ["GEMINI_API_KEY"],
    maxTokens: 32768,
    temperature: 0.3,
  },
  gemini_flash: {
    name: "Gemini 2.0 Flash",
    apiKeyEnvs: ["GEMINI_API_KEY"],
    maxTokens: 16384,
    temperature: 0.3,
  },
  gemini_25_flash: {
    name: "Gemini 2.5 Flash (FREE)",
    apiKeyEnvs: ["GEMINI_API_KEY"],
    maxTokens: 16384,
    temperature: 0.3,
  },
  groq: {
    name: "Llama 3.3 70B (Groq)",
    apiKeyEnvs: ["GROQ_API_KEY"],
    maxTokens: 8192,
    temperature: 0.3,
  },
  mistral: {
    name: "Mistral Small 4 (Mistral)",
    apiKeyEnvs: ["MISTRAL_API_KEY"],
    maxTokens: 8192,
    temperature: 0.3,
  },
};

// ═══════════════════════════════════════════════════════════════
// MULTI-PROVIDER AI CALLS
// ═══════════════════════════════════════════════════════════════

function getAvailableKey(envNames: string[]): string | null {
  for (const envName of envNames) {
    const key = Deno.env.get(envName);
    if (key) return key;
  }
  return null;
}

async function callGemini(
  apiKey: string,
  model: string,
  messages: Array<{ role: string; parts: Array<{ text: string }> }>,
  config: { maxTokens: number; temperature: number }
): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: AbortSignal.timeout(50000),
      body: JSON.stringify({
        contents: messages,
        generationConfig: {
          temperature: config.temperature,
          topP: 0.85,
          topK: 40,
          maxOutputTokens: config.maxTokens,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`Gemini API error (${model}):`, errorText.substring(0, 200));
    throw new Error(`Gemini API error: ${response.status}`);
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}

async function callOpenAI(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  config: { maxTokens: number; temperature: number }
): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(55000),
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: config.maxTokens,
      temperature: config.temperature,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callAnthropic(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  config: { maxTokens: number; temperature: number }
): Promise<string> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    signal: AbortSignal.timeout(60000),
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: config.maxTokens,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    }),
  });

  if (!response.ok) {
    throw new Error(`Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || "";
}

async function callGroq(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  config: { maxTokens: number; temperature: number }
): Promise<string> {
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(20000),
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: config.maxTokens,
      temperature: config.temperature,
    }),
  });

  if (!response.ok) {
    throw new Error(`Groq API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

async function callMistral(
  apiKey: string,
  systemPrompt: string,
  userPrompt: string,
  config: { maxTokens: number; temperature: number }
): Promise<string> {
  const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    signal: AbortSignal.timeout(50000),
    body: JSON.stringify({
      model: "mistral-small-latest",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: config.maxTokens,
      temperature: config.temperature,
    }),
  });

  if (!response.ok) {
    throw new Error(`Mistral API error: ${response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "";
}

// Combined mode: Gemini generates + refines (FREE, single-pass)
async function callCombinedMode(
  enhancedSystemPrompt: string,
  userPrompt: string
): Promise<{ content: string; provider: string; fallback: boolean }> {
  const geminiKey = getAvailableKey(AI_PROVIDERS.gemini_25_flash.apiKeyEnvs);
  if (!geminiKey) throw new Error("Modo combinado requer chave Gemini");

  console.log("🧠 [COMBINED] Gemini 2.5 Flash generating + refining...");
  const content = await callGemini(geminiKey, "gemini-2.5-flash", [
    { role: "user", parts: [{ text: enhancedSystemPrompt + "\n\n" + userPrompt }] }
  ], { maxTokens: 16384, temperature: 0.3 });

  if (!content || content.length < 500) throw new Error("Gemini gerou documento muito curto");
  console.log(`  ✅ Done: ${content.length} chars`);

  return { content, provider: "Gemini 2.5 Flash (Combinado FREE)", fallback: false };
}

// ═══════════════════════════════════════════════════════════════
// TRIPLE CHAIN MODE: Groq → Anthropic → OpenAI
// ═══════════════════════════════════════════════════════════════

async function callTripleChainMode(
  enhancedSystemPrompt: string,
  userPrompt: string,
  tipo: string
): Promise<{ content: string; provider: string; fallback: boolean }> {
  // Global timeout for the entire triple chain (90s to leave room for fallback)
  const controller = new AbortController();
  const globalTimeout = setTimeout(() => controller.abort(), 90000);
  const tripleStartTime = Date.now();
  try {
    const groqKey = getAvailableKey(AI_PROVIDERS.groq.apiKeyEnvs);
    const geminiKey = getAvailableKey(AI_PROVIDERS.gemini_25_flash.apiKeyEnvs);

    if (!groqKey || !geminiKey) {
      throw new Error("Modo Profissional Máximo requer chaves do Groq e Gemini");
    }

    // Check if globally aborted
    if (controller.signal.aborted) throw new Error("Triple chain timeout");

    const spec = getPromptEspecializado(tipo);

    // ─── Truncate system prompt for each phase to avoid timeouts ───
    // Phase 1 (Groq skeleton): only needs basic instructions, not full neural context
    const groqSystemPrompt = enhancedSystemPrompt.length > 6000
      ? enhancedSystemPrompt.substring(0, 6000) + "\n\n[Contexto neural truncado para fase estrutural]"
      : enhancedSystemPrompt;
    // Phase 2 (Anthropic reasoning): needs more context but cap at 15k
    const anthropicSystemPrompt = enhancedSystemPrompt.length > 15000
      ? enhancedSystemPrompt.substring(0, 15000) + "\n\n[Contexto neural parcialmente truncado por limite de tempo]"
      : enhancedSystemPrompt;

    console.log(`📏 Triple chain prompt sizes: Groq=${groqSystemPrompt.length}, Anthropic=${anthropicSystemPrompt.length}, Full=${enhancedSystemPrompt.length}`);

    // ─── FASE 1: Groq (Estrutura) ───
    console.log("⚡ [TRIPLE] Fase 1: Groq gerando esqueleto estrutural...");
    const structurePrompt = `Você é um assistente jurídico especializado em estruturar documentos.
Gere APENAS o ESQUELETO ESTRUTURAL do documento abaixo, com:
- Seções numeradas com títulos
- Legislação aplicável em cada seção
- Tópicos-chave a desenvolver em cada seção
- NÃO escreva o conteúdo completo, apenas a estrutura

${spec ? `ESTRUTURA OBRIGATÓRIA PARA ESTE TIPO:
${spec.estrutura}

LEGISLAÇÃO OBRIGATÓRIA:
${spec.legislacao.map(l => `• ${l}`).join("\n")}` : ""}

SOLICITAÇÃO DO USUÁRIO:
${userPrompt}`;

    const phase1 = await callGroq(groqKey, groqSystemPrompt, structurePrompt, {
      maxTokens: 4000,
      temperature: 0.2,
    });
    console.log(`  ✅ Fase 1 (Groq): ${phase1.length} chars - esqueleto pronto`);

    if (controller.signal.aborted) throw new Error("Triple chain timeout after phase 1");

    // ─── FASE 2: Anthropic (Raciocínio Jurídico) ───
    console.log("🧠 [TRIPLE] Fase 2: Anthropic expandindo com argumentação jurídica...");
    const reasoningPrompt = `Você é um advogado sênior ESPECIALISTA EM DEFESA com 20 anos de experiência. 
Recebeu o esqueleto estrutural abaixo de um documento jurídico.
Sua tarefa é EXPANDIR cada seção com argumentação jurídica profunda, citações de artigos de lei com números reais, jurisprudência relevante e DOUTRINA COMENTADA.

FOCO DOUTRINÁRIO-DEFENSIVO OBRIGATÓRIO:
- Para cada artigo citado, explique QUANDO SE APLICA e QUANDO NÃO SE APLICA segundo a doutrina (ex: Código Penal Comentado, CPC Comentado)
- Priorize TESES DEFENSIVAS: excludentes de ilicitude, atenuantes, nulidades, prescrição, decadência, causas de diminuição de pena
- Cite doutrinadores e obras comentadas para fundamentar cada argumento defensivo
- A doutrina comentada traz exemplos práticos e circunstâncias de aplicação/não aplicação que fortalecem a defesa
- NUNCA adote posição acusatória — SEMPRE argumente pela defesa do cliente.

ESQUELETO ESTRUTURAL:
${phase1}

DADOS ORIGINAIS DO CASO:
${userPrompt}

${spec ? `INSTRUÇÕES ESPECÍFICAS:
${spec.instrucoes_especificas}` : ""}

Gere o documento COMPLETO, expandindo cada seção do esqueleto com argumentação jurídica profissional de alto nível.`;

    // Phase 2 with individual 45s timeout for Anthropic
    const phase2 = await Promise.race([
      callAnthropic(anthropicKey, anthropicSystemPrompt, reasoningPrompt, {
        maxTokens: 8192,
        temperature: 0.3,
      }),
      new Promise<string>((_, reject) => setTimeout(() => reject(new Error("Anthropic phase 2 timeout (45s)")), 45000))
    ]);
    
    if (!phase2 || phase2.length < 500) {
      throw new Error("Anthropic gerou documento muito curto na fase 2");
    }
    console.log(`  ✅ Fase 2 (Anthropic): ${phase2.length} chars - argumentação completa`);

    if (controller.signal.aborted || (Date.now() - tripleStartTime > 90000)) {
      // Phase 2 completed but we're out of time - return phase 2 directly
      console.log("⚠️ Triple chain timeout after phase 2 - returning Anthropic result directly");
      return { content: phase2, provider: "Groq + Anthropic (sem revisão final)", fallback: false };
    }

    // Skip phase 3 for very long prompts (>3000 chars) to save time
    if (userPrompt.length > 3000) {
      console.log("⚡ Prompt longo (>3000 chars) - pulando fase 3 para otimizar tempo");
      return { content: phase2, provider: "Groq + Anthropic (otimizado)", fallback: false };
    }

    // ─── FASE 3: OpenAI (Revisão Final) ───
    console.log("🔧 [TRIPLE] Fase 3: OpenAI revisando e formatando...");
    const reviewPrompt = `Você é um revisor jurídico. Revise o documento abaixo para peticionamento eletrônico.
Verifique: gramática, endereçamento, qualificação, fundamentação legal, pedidos, assinatura [Nome do Advogado] [OAB].
Retorne o documento COMPLETO revisado. NÃO remova conteúdo.

DOCUMENTO:
${phase2}`;

    const phase3 = await callOpenAI(openaiKey, enhancedSystemPrompt, reviewPrompt, {
      maxTokens: 16384,
      temperature: 0.15,
    });

    const finalContent = (phase3 && phase3.length > phase2.length * 0.5) ? phase3 : phase2;
    console.log(`  ✅ Fase 3 (OpenAI): ${finalContent.length} chars - documento finalizado`);

    return {
      content: finalContent,
      provider: "Groq + Anthropic + OpenAI (Profissional Máximo)",
      fallback: false,
    };
  } finally {
    clearTimeout(globalTimeout);
  }
}

// Map ai_providers table names to internal provider keys
const PROVIDER_NAME_TO_KEYS: Record<string, string[]> = {
  gemini: ["gemini_pro", "gemini_flash"],
  openai: ["openai"],
  anthropic: ["anthropic"],
  groq: ["groq"],
};

// Main multi-provider call with fallback
async function callAIWithFallback(
  enhancedSystemPrompt: string,
  userPrompt: string,
  preferredModel: string,
  tipo?: string,
  disabledProviders?: Set<string>
): Promise<{ content: string; provider: string; fallback: boolean }> {
  // Handle triple chain mode
  if (preferredModel === "triple") {
    try {
      return await callTripleChainMode(enhancedSystemPrompt, userPrompt, tipo || "");
    } catch (error) {
      console.error("❌ Triple chain mode failed, skipping to single provider (Anthropic likely slow):", error);
      // Skip combined mode — it also uses Anthropic which already timed out in triple
      // Fall through directly to single provider with Groq first (fastest)
      preferredModel = "groq";
    }
  }

  // Handle combined mode
  if (preferredModel === "combined") {
    try {
      return await callCombinedMode(enhancedSystemPrompt, userPrompt);
    } catch (error) {
      console.error("❌ Combined mode failed, falling back to single provider:", error);
      // Fall through to single provider logic
    }
  }

  // Build provider order based on preferred model
  let providerOrder: string[];
  if (preferredModel === "anthropic") {
    providerOrder = ["anthropic", "mistral", "openai", "groq", "gemini_pro", "gemini_flash"];
  } else if (preferredModel === "openai") {
    providerOrder = ["openai", "anthropic", "mistral", "groq", "gemini_pro", "gemini_flash"];
  } else if (preferredModel === "groq") {
    providerOrder = ["groq", "mistral", "openai", "anthropic", "gemini_flash"];
  } else if (preferredModel === "mistral") {
    providerOrder = ["mistral", "groq", "openai", "anthropic", "gemini_flash"];
  } else if (preferredModel === "pro") {
    providerOrder = ["gemini_pro", "groq", "mistral", "gemini_flash", "openai", "anthropic"];
  } else {
    providerOrder = ["groq", "mistral", "openai", "anthropic", "gemini_flash", "gemini_pro"];
  }

  // Filter out disabled providers from ai_providers table
  if (disabledProviders && disabledProviders.size > 0) {
    const before = providerOrder.length;
    providerOrder = providerOrder.filter(key => !disabledProviders.has(key));
    if (providerOrder.length < before) {
      console.log(`🚫 Filtered out ${before - providerOrder.length} disabled provider(s). Active order: ${providerOrder.join(", ")}`);
    }
  }

  for (const providerKey of providerOrder) {
    const provider = AI_PROVIDERS[providerKey];
    if (!provider) continue;
    const apiKey = getAvailableKey(provider.apiKeyEnvs);
    
    if (!apiKey) {
      console.log(`⚠️ No API key for ${provider.name}, skipping...`);
      continue;
    }

    console.log(`🤖 Trying ${provider.name}...`);

    try {
      let content = "";
      const config = { maxTokens: provider.maxTokens, temperature: provider.temperature };

      if (providerKey === "gemini_pro") {
        const messages = [
          { role: "user", parts: [{ text: enhancedSystemPrompt }] },
          { role: "model", parts: [{ text: "Entendido. Vou gerar documentos jurídicos COMPLETOS com todas as seções, citando a jurisprudência neural fornecida." }] },
          { role: "user", parts: [{ text: userPrompt }] }
        ];
        content = await callGemini(apiKey, "gemini-2.5-pro", messages, config);
      } else if (providerKey === "gemini_flash") {
        const messages = [
          { role: "user", parts: [{ text: enhancedSystemPrompt }] },
          { role: "model", parts: [{ text: "Entendido. Vou gerar documentos jurídicos COMPLETOS com todas as seções, citando a jurisprudência neural fornecida." }] },
          { role: "user", parts: [{ text: userPrompt }] }
        ];
        content = await callGemini(apiKey, "gemini-2.5-flash", messages, config);
      } else if (providerKey === "openai") {
        content = await callOpenAI(apiKey, enhancedSystemPrompt, userPrompt, config);
      } else if (providerKey === "anthropic") {
        content = await callAnthropic(apiKey, enhancedSystemPrompt, userPrompt, config);
      } else if (providerKey === "groq") {
        content = await callGroq(apiKey, enhancedSystemPrompt, userPrompt, config);
      } else if (providerKey === "mistral") {
        content = await callMistral(apiKey, enhancedSystemPrompt, userPrompt, config);
      }

      if (content && content.length > 500) {
        console.log(`✅ ${provider.name} succeeded with ${content.length} chars`);
        return {
          content,
          provider: provider.name,
          fallback: providerKey !== providerOrder[0],
        };
      }
    } catch (error) {
      console.error(`❌ ${provider.name} failed:`, error instanceof Error ? error.message : error);
      continue;
    }
  }

  throw new Error("Todos os provedores de IA falharam");
}

// Detect if document was truncated by token limit
function detectTruncation(content: string): { truncated: boolean; reason: string } {
  const trimmed = content.trim();
  const lastChars = trimmed.slice(-300).toLowerCase();
  
  // Check for common truncation signals
  const hasSignature = lastChars.includes("oab/rs [OAB-NUM]") || lastChars.includes("[nome do advogado]") || lastChars.includes("____");
  const hasProperEnding = lastChars.includes("deferimento") || lastChars.includes("testemunha") || lastChars.includes("porto alegre") || lastChars.includes("assinatura");
  const endsAbruptly = /[a-záàâãéèêíïóôõöúçñ,;]\s*$/i.test(trimmed); // ends mid-sentence
  const endsMidWord = /\w{3,}$/i.test(trimmed) && !trimmed.endsWith(".");
  
  if (!hasSignature && !hasProperEnding && trimmed.length > 2000) {
    return { truncated: true, reason: "Documento sem assinatura ou fechamento — possível truncamento por limite de tokens" };
  }
  if (endsAbruptly || endsMidWord) {
    return { truncated: true, reason: "Documento termina abruptamente no meio de uma frase" };
  }
  return { truncated: false, reason: "" };
}

// Detect possible hallucinated legal references in generated content
function detectHallucinations(content: string): string[] {
  const warnings: string[] = [];
  
  // 1. Suspicious REsp/HC/RE with very high numbers (likely fabricated)
  const respPattern = /REsp\s+[\d.]+/gi;
  const respMatches = content.match(respPattern) || [];
  for (const m of respMatches) {
    const num = parseInt(m.replace(/REsp\s+/i, "").replace(/\./g, ""), 10);
    if (num > 5000000) {
      warnings.push(`Possível REsp fictício: ${m} (número muito alto)`);
    }
  }
  
  // 2. Suspicious HC numbers
  const hcPattern = /HC\s+[\d.]+/gi;
  const hcMatches = content.match(hcPattern) || [];
  for (const m of hcMatches) {
    const num = parseInt(m.replace(/HC\s+/i, "").replace(/\./g, ""), 10);
    if (num > 900000) {
      warnings.push(`Possível HC fictício: ${m} (número muito alto)`);
    }
  }

  // 3. Suspicious Súmula numbers (STF max ~736, STJ max ~672)
  const sumulaPattern = /[Ss]úmula\s+(?:n[.ºo°]?\s*)?(\d+)/g;
  let sumulaMatch;
  while ((sumulaMatch = sumulaPattern.exec(content)) !== null) {
    const num = parseInt(sumulaMatch[1], 10);
    if (num > 800) {
      warnings.push(`Possível Súmula fictícia: Súmula ${num} (número acima do existente)`);
    }
  }

  // 4. Future dates in jurisprudence citations (year > current)
  const currentYear = new Date().getFullYear();
  const datePattern = /(?:julgad[oa]|publicad[oa]|DJe?)\s+(?:em\s+)?(\d{1,2})[./](\d{1,2})[./](\d{4})/gi;
  let dateMatch;
  while ((dateMatch = datePattern.exec(content)) !== null) {
    const year = parseInt(dateMatch[3], 10);
    if (year > currentYear) {
      warnings.push(`Data futura em citação jurídica: ${dateMatch[0]} (ano ${year} > ${currentYear})`);
    }
  }

  // 5. Suspicious process number patterns (all same digits like 9999999)
  const processPattern = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/g;
  const processMatches = content.match(processPattern) || [];
  for (const p of processMatches) {
    const digits = p.replace(/\D/g, "");
    const uniqueDigits = new Set(digits.split(""));
    if (uniqueDigits.size <= 2) {
      warnings.push(`Número de processo suspeito (padrão repetitivo): ${p}`);
    }
  }

  return warnings;
}

// ═══════════════════════════════════════════════════════════════
// VALIDAÇÃO ABNT PÓS-GERAÇÃO
// ═══════════════════════════════════════════════════════════════
interface ABNTValidation {
  score: number; // 0-1
  issues: string[];
  corrections: string[];
}

function validateABNT(content: string, tipo: string): ABNTValidation {
  const issues: string[] = [];
  const corrections: string[] = [];
  let score = 1.0;

  const lower = content.toLowerCase();
  const lines = content.split("\n");

  // 1. Títulos de seção devem estar em CAIXA ALTA
  const sectionPatterns = [
    /^(dos? fatos?|da fundamenta[çc][aã]o|dos? pedidos?|dos? requerimentos?|do direito|da conclus[aã]o|do m[eé]rito)/im,
    /^(das? preliminares?|da compet[eê]ncia|do valor da causa|das? provas?)/im
  ];
  for (const pattern of sectionPatterns) {
    const match = content.match(pattern);
    if (match && match[0] !== match[0].toUpperCase()) {
      issues.push(`Título de seção "${match[0]}" deveria estar em CAIXA ALTA (NBR 14724)`);
      corrections.push(`Alterar "${match[0]}" para "${match[0].toUpperCase()}"`);
      score -= 0.05;
    }
  }

  // 2. Verificar se citações longas têm indicação de fonte (autor, ano)
  const longQuotes = content.match(/".{150,}"/g) || [];
  for (const quote of longQuotes) {
    const afterQuote = content.substring(content.indexOf(quote) + quote.length, content.indexOf(quote) + quote.length + 100);
    if (!/\(\s*[A-Z]{2,}.*\d{4}/.test(afterQuote) && !/\d{4}/.test(afterQuote)) {
      issues.push("Citação longa sem indicação de fonte autor-data (NBR 10520)");
      corrections.push("Adicionar referência no formato (SOBRENOME, ano, p. XX) após citação");
      score -= 0.05;
    }
  }

  // 3. Verificar presença de markdown (proibido no output)
  if (/\*\*[^*]+\*\*/.test(content)) {
    issues.push("Documento contém **negrito markdown** — deve usar CAIXA ALTA");
    corrections.push("Substituir **texto** por TEXTO em caixa alta");
    score -= 0.1;
  }
  if (/^#{1,3}\s/m.test(content)) {
    issues.push("Documento contém # títulos markdown — deve usar texto puro");
    corrections.push("Remover # e usar CAIXA ALTA para títulos");
    score -= 0.1;
  }
  if (/^[\-\*]\s/m.test(content)) {
    issues.push("Documento contém bullets markdown (- ou *) — deve usar alíneas a), b), c)");
    corrections.push("Substituir bullets por alíneas: a), b), c) conforme NBR 6024");
    score -= 0.05;
  }

  // 4. Verificar estrutura obrigatória para petições judiciais
  const JUDICIAL_TYPES = new Set([
    "peticao-inicial", "contestacao", "recurso-apelacao", "recurso-agravo",
    "embargos-declaracao", "mandado-seguranca", "habeas-corpus", "habeas-data",
    "acao-popular", "acao-civil-publica", "execucao-titulo", "cumprimento-sentenca",
    "impugnacao", "manifestacao", "replica"
  ]);

  if (JUDICIAL_TYPES.has(tipo)) {
    if (!/excelent[ií]ssim/i.test(content)) {
      issues.push("Petição sem endereçamento ao juízo (NBR 14724 + CPC art. 319)");
      corrections.push("Adicionar endereçamento: EXCELENTÍSSIMO(A) SENHOR(A) DOUTOR(A) JUIZ(A)...");
      score -= 0.15;
    }
    if (!/oab\/rs\s*\[?[\d.\s]*\]?/i.test(content) && !/\[nome do advogado\]/i.test(lower)) {
      issues.push("Documento sem assinatura do advogado ([OAB])");
      corrections.push("Adicionar fecho: [Nome do Advogado] – [OAB]");
      score -= 0.1;
    }
    if (!/deferimento|pede\s+deferimento|termos\s+em\s+que/i.test(content)) {
      issues.push("Documento sem fecho formal (Nestes termos, pede deferimento)");
      corrections.push("Adicionar: Nestes termos, pede deferimento.");
      score -= 0.05;
    }
  }

  // 5. Verificar se referências bibliográficas (quando presentes) seguem NBR 6023
  if (/refer[eê]ncias?\s*(bibliogr[aá]ficas?)?/i.test(content)) {
    // Check for at least one reference in proper format: SOBRENOME, Nome.
    if (!/[A-Z]{2,},\s+[A-Z][a-záàâãéèêíïóôõöúçñ]+\./m.test(content)) {
      issues.push("Seção de referências não segue formato NBR 6023 (SOBRENOME, Nome. Título...)");
      corrections.push("Formatar referências: SOBRENOME, Nome. Título. Edição. Local: Editora, Ano.");
      score -= 0.05;
    }
  }

  // 6. Verificar se legislação está citada corretamente (art. X da Lei Y)
  const leiPattern = /art\.\s*\d+/gi;
  const leiMatches = content.match(leiPattern) || [];
  if (JUDICIAL_TYPES.has(tipo) && leiMatches.length === 0) {
    issues.push("Petição judicial sem citação de artigos de lei");
    corrections.push("Incluir fundamentação legal com artigos específicos (ex: art. 319, CPC)");
    score -= 0.1;
  }

  return {
    score: Math.max(score, 0.1),
    issues,
    corrections,
  };
}
function getClosingInstructions(tipo: string, incluirTestemunhas = false): string {
  if (isJudicialType(tipo)) {
    if (incluirTestemunhas) {
      return "Nestes termos, pede deferimento.\n\n[Local], [data].\n\n[Nome do Advogado] – [OAB]\n\n________________________________\nTESTEMUNHA 1\nNome:\nCPF:\n\n________________________________\nTESTEMUNHA 2\nNome:\nCPF:";
    }
    return "Nestes termos, pede deferimento.\n\n[Local], [data].\n\n[Nome do Advogado] – [OAB]\n\n(SEM assinatura de partes, autor ou testemunhas)";
  }
  if (tipo.includes("procuracao")) {
    return "Local, data.\n\n________________________________\nOUTORGANTE\nNome:\nCPF:\n\n________________________________\nOUTORGADO\n[Nome do Advogado] – [OAB]";
  }
  if (incluirTestemunhas) {
    return "Local, data.\n\n________________________________\nCONTRATANTE\nNome:\nCPF:\n\n________________________________\nCONTRATADO\nNome:\nCPF:\n\n________________________________\nTESTEMUNHA 1\nNome:\nCPF:\n\n________________________________\nTESTEMUNHA 2\nNome:\nCPF:";
  }
  return "Local, data.\n\n________________________________\nCONTRATANTE\nNome:\nCPF:\n\n________________________________\nCONTRATADO\nNome:\nCPF:";
}

function isDocumentComplete(content: string): boolean {
  const trimmed = content.trim();
  const lastChars = trimmed.slice(-800).toLowerCase();
  
  // Check if document ends properly
  const hasProperEnding =
    (lastChars.includes("deferimento") && (lastChars.includes("oab") || lastChars.includes("[OAB-NUM]"))) ||
    lastChars.includes("[OAB-NUM]") ||
    (lastChars.includes("testemunha") && lastChars.includes("cpf")) ||
    (lastChars.includes("outorgante") && lastChars.includes("outorgado")) ||
    lastChars.includes("porto alegre/rs") ||
    (lastChars.includes("____") && (lastChars.includes("oab") || lastChars.includes("cpf") || lastChars.includes("testemunha"))) ||
    (lastChars.includes("advogado") && lastChars.includes("oab")) ||
    (lastChars.includes("deferimento") && lastChars.includes("advogado")) ||
    // Novos padrões de conclusão
    lastChars.includes("documentos que acompanham") ||
    lastChars.includes("rol de documentos") ||
    (lastChars.includes("nestes termos") && lastChars.includes("deferimento")) ||
    lastChars.includes("pede deferimento");

  // Check for abrupt truncation signs
  const lastLine = trimmed.slice(-80);
  const endsAbruptly = 
    lastLine.endsWith(",") ||
    lastLine.endsWith(" e") ||
    lastLine.endsWith(" de") ||
    lastLine.endsWith(" do") ||
    lastLine.endsWith(" da") ||
    lastLine.endsWith(" que") ||
    lastLine.endsWith(" para") ||
    lastLine.endsWith(" com") ||
    lastLine.endsWith(" no") ||
    lastLine.endsWith(" na") ||
    lastLine.endsWith(" os") ||
    lastLine.endsWith(" as");
  
  if (endsAbruptly) return false;
  
  return hasProperEnding;
}

// Extract search terms for neural search
function extractSearchTerms(prompt: string): string {
  const factosMatch = prompt.match(/Fatos?:\s*([^\n]+)/i);
  const tipoMatch = prompt.match(/Gere\s+(?:uma?|um)\s+([^\n]+)/i);
  const pedidosMatch = prompt.match(/Pedidos?:\s*([^\n]+)/i);
  
  const terms: string[] = [];
  
  if (tipoMatch) terms.push(tipoMatch[1].trim());
  if (factosMatch) terms.push(factosMatch[1].trim().substring(0, 200));
  if (pedidosMatch) terms.push(pedidosMatch[1].trim().substring(0, 100));
  
  return terms.join(" ").substring(0, 400);
}

// Auto-score quality based on document generation metrics
function autoScoreQuality(outputText: string, metadata: Record<string, unknown>): number {
  let score = 0.5; // Base score for successful generation

  // +0.1 if document is substantial (>2000 chars)
  if (outputText.length > 2000) score += 0.1;
  // +0.1 if document is very substantial (>5000 chars)
  if (outputText.length > 5000) score += 0.1;
  // +0.1 if jurisprudence was used
  if ((metadata.jurisprudenceCount as number) > 0) score += 0.1;
  // +0.05 if external APIs returned results
  if ((metadata.externalResultsCount as number) > 0) score += 0.05;
  // +0.05 if knowledge base was used
  if ((metadata.knowledgeCount as number) > 0) score += 0.05;
  // +0.05 if fast generation (<15s)
  if ((metadata.duration as number) < 15000) score += 0.05;
  // -0.1 if fallback was used (less reliable)
  if (metadata.fallback) score -= 0.1;
  // +0.05 if document appears complete (has signature section)
  if (/OAB\/RS|assinatura|testemunha/i.test(outputText)) score += 0.05;

  // +0.1 if document cites real court case numbers (REsp, HC, ADI, etc.)
  const acordaoRegex = /\b(REsp|HC|ADI|ADPF|AgRg|RE|RHC|MS|MC|AREsp|RMS|EDcl)\s*n?[ºo.]?\s*[\d.]+/gi;
  const acordaoMatches = outputText.match(acordaoRegex);
  if (acordaoMatches && acordaoMatches.length >= 1) score += 0.1;

  // +0.05 if follows ABNT-like structure (has required sections)
  const hasEndereçamento = /excelent[íi]ssimo|meritíssimo|egrégio/i.test(outputText);
  const hasFundamentação = /fundamenta[çc][ãa]o|do\s+direito/i.test(outputText);
  const hasPedidos = /dos?\s+pedidos?|requer|ante\s+o\s+exposto/i.test(outputText);
  if (hasEndereçamento && hasFundamentação && hasPedidos) score += 0.05;

  // +0.1 if ABNT-compliant (no markdown, proper sections)
  const hasMarkdown = /\*\*[^*]+\*\*/.test(outputText) || /^#{1,3}\s/m.test(outputText);
  if (!hasMarkdown) score += 0.05;
  // +0.05 if uses proper ABNT alíneas instead of bullets
  if (/\ba\)\s/.test(outputText) && !/^[\-\*]\s/m.test(outputText)) score += 0.05;

  // -0.15 if truncation detected (no signature in long document)
  if (outputText.length > 2000 && !/oab\/rs|deferimento|termos em que|pede\s+deferimento/i.test(outputText)) {
    score -= 0.15;
  }

  return Math.min(Math.max(score, 0.1), 1.0);
}

// ═══════════════════════════════════════════════════════════════
// SEMANTIC DOCUMENT CACHE — save & retrieve generated documents
// ═══════════════════════════════════════════════════════════════

async function generateEmbeddingForCache(text: string): Promise<number[] | null> {
  const keys = _getGeminiKeys();
  for (const key of keys) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(8000),
          body: JSON.stringify({
            model: "models/gemini-embedding-001",
            content: { parts: [{ text: text.substring(0, 4000) }] },
            outputDimensionality: 768,
          }),
        }
      );
      if (!res.ok) continue;
      const data = await res.json();
      const values = data?.embedding?.values;
      if (values?.length >= 768) return values.slice(0, 768);
    } catch { continue; }
  }
  // Fallback: HuggingFace all-MiniLM-L6-v2 (384d → 768d zero-padded)
  try {
    const hfKey = Deno.env.get("HUGGINGFACE_API_KEY") || Deno.env.get("HF_TOKEN") || Deno.env.get("CHAVE_API_HUGGINGFACE");
    if (!hfKey) return null;
    console.warn("⚠️ Gemini exhausted for cache embedding — HF fallback");
    const res = await fetch(
      "https://api-inference.huggingface.co/pipeline/feature-extraction/sentence-transformers/all-MiniLM-L6-v2",
      {
        method: "POST",
        headers: { "Authorization": `Bearer ${hfKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ inputs: text.substring(0, 4000), options: { wait_for_model: true } }),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const values = Array.isArray(data[0]) ? data[0] : data;
    if (!values?.length) return null;
    return values.length >= 768 ? values.slice(0, 768) : [...values, ...new Array(768 - values.length).fill(0)];
  } catch { return null; }
}

// Save generated document to neural cache with full text + embedding
async function saveDocumentToNeuralCache(
  supabase: any,
  content: string,
  prompt: string,
  tipo: string,
  userId: string | null,
  metadata: Record<string, unknown>
): Promise<void> {
  try {
    const cacheKey = `doc_cache:${tipo}:${prompt.substring(0, 150)}`;
    const embedding = await generateEmbeddingForCache(prompt.substring(0, 4000) + "\n\n" + content.substring(0, 2000));
    
    const insertData: Record<string, unknown> = {
      user_id: userId || "00000000-0000-0000-0000-000000000000",
      title: `[CACHE] ${tipo} — ${new Date().toISOString().split("T")[0]}`,
      content: content, // Store FULL document
      source_type: "doc_cache",
      source_reference: cacheKey,
      tags: [tipo, "doc_cache", metadata.areaJuridica as string || "geral"].filter(Boolean),
      is_processed: true,
    };
    if (embedding && embedding.length > 0) {
      insertData.embedding = `[${embedding.join(",")}]`;
    }

    await supabase.from("neural_knowledge_base").insert(insertData);
    console.log(`💾 Document cached in neural_knowledge_base (${content.length} chars, embedding: ${embedding ? "✓" : "✗"})`);
  } catch (e) {
    console.warn("Cache save error:", e);
  }
}

// Search for a semantically similar cached document (same tipo + similar prompt)
async function findCachedDocument(
  supabase: any,
  prompt: string,
  tipo: string,
  similarityThreshold = 0.88
): Promise<{ content: string; similarity: number } | null> {
  try {
    const queryText = prompt.substring(0, 4000);
    const embedding = await generateEmbeddingForCache(queryText);
    if (!embedding || embedding.length === 0) return null;

    // Search only within doc_cache entries of the same tipo
    const { data, error } = await supabase.rpc("search_neural_knowledge", {
      query_embedding: `[${embedding.join(",")}]`,
      query_text: queryText.substring(0, 500),
      match_count: 5,
      semantic_weight: 0.9,
      keyword_weight: 0.1,
      filter_type: "doc_cache",
    });

    if (error || !data || data.length === 0) return null;

    // Filter by tipo tag and similarity threshold
    const candidates = data.filter((r: { tags: string[]; semantic_score: number; content: string }) =>
      r.tags?.includes(tipo) && r.semantic_score >= similarityThreshold
    );

    if (candidates.length === 0) return null;

    const best = candidates[0];
    console.log(`🎯 Cache HIT! Similarity: ${best.semantic_score.toFixed(3)} for tipo: ${tipo}`);
    return { content: best.content, similarity: best.semantic_score };
  } catch (e) {
    console.warn("Cache search error:", e);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════
// RAG CHUNKING — Ingest generated sentences into neural_knowledge_base
// ═══════════════════════════════════════════════════════════════

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function splitIntoChunks(text: string, minLen = 300, maxLen = 800, maxChunks = 50): string[] {
  const paragraphs = text.split(/\n\n+/).map(p => p.trim()).filter(p => p.length > 0);
  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if (current.length + para.length + 2 <= maxLen) {
      current = current ? current + "\n\n" + para : para;
    } else {
      if (current.length >= minLen) {
        chunks.push(current);
        current = para;
      } else if (para.length > maxLen) {
        // Split long paragraph by sentences
        if (current) { chunks.push(current); current = ""; }
        const sentences = para.split(/(?<=[.!?])\s+/);
        let sentBuf = "";
        for (const s of sentences) {
          if (sentBuf.length + s.length + 1 <= maxLen) {
            sentBuf = sentBuf ? sentBuf + " " + s : s;
          } else {
            if (sentBuf.length >= minLen) chunks.push(sentBuf);
            else if (sentBuf) { current = sentBuf; }
            sentBuf = s;
          }
        }
        if (sentBuf) current = current ? current + "\n\n" + sentBuf : sentBuf;
      } else {
        current = current ? current + "\n\n" + para : para;
      }
    }
    if (chunks.length >= maxChunks) break;
  }

  if (current.length >= 100 && chunks.length < maxChunks) {
    // Merge short final chunk with previous if possible
    if (current.length < minLen && chunks.length > 0 && chunks[chunks.length - 1].length + current.length + 2 <= maxLen * 1.2) {
      chunks[chunks.length - 1] += "\n\n" + current;
    } else {
      chunks.push(current);
    }
  }

  return chunks.slice(0, maxChunks);
}

async function chunkAndIngestForRAG(
  supabase: any,
  content: string,
  tipo: string,
  userId: string | null,
  metadata: Record<string, unknown>
): Promise<void> {
  try {
    const plainText = stripHtml(content);
    if (plainText.length < 500) return;

    const chunks = splitIntoChunks(plainText);
    if (chunks.length === 0) return;

    const timestamp = new Date().toISOString();
    const jobId = (metadata.jobId as string) || timestamp;
    const areaJuridica = (metadata.areaJuridica as string) || "geral";
    const tags = [tipo, "rag-chunk", areaJuridica].filter(Boolean);

    const rows = chunks.map((text, i) => ({
      user_id: userId,
      title: `[RAG] ${tipo} — chunk ${i + 1}/${chunks.length}`,
      content: text,
      source_type: "documento_gerado",
      source_reference: `rag:${tipo}:${jobId}:${i}`,
      tags,
      is_processed: false,
    }));

    const { error } = await supabase
      .from("neural_knowledge_base")
      .insert(rows);

    if (error) {
      console.error("❌ RAG chunk ingestion error:", error.message);
    } else {
      console.log(`📚 RAG: Ingested ${chunks.length} chunks for ${tipo} (avg ${Math.round(plainText.length / chunks.length)} chars/chunk)`);
    }
  } catch (err) {
    console.error("❌ RAG chunking failed:", err);
  }
}

// Log learning data for neural training with auto-scoring
async function logLearningData(
  supabase: any,
  inputText: string,
  outputText: string,
  metadata: Record<string, unknown>
): Promise<void> {
  try {
    const qualityScore = autoScoreQuality(outputText, metadata);
    const learned = qualityScore >= 0.7;

    const userId = (metadata.userId as string) || null;
    await supabase.from("neural_learning_data").insert({
      interaction_type: "document_generation",
      input_text: inputText.substring(0, 10000),
      output_text: outputText.substring(0, 10000),
      metadata: { ...metadata, autoScored: true },
      quality_score: qualityScore,
      learned,
      user_id: userId,
    });

    console.log(`🧠 Learning data logged: quality=${qualityScore.toFixed(2)}, learned=${learned}`);

    // Save ALL documents to cache (with embedding) for future reuse
    if (outputText.length > 800) {
      const tipo = (metadata.tipo as string) || "documento";
      await saveDocumentToNeuralCache(
        supabase,
        outputText,
        inputText.substring(0, 2000),
        tipo,
        userId,
        metadata
      );

      // Ingest granular chunks for RAG retrieval
      await chunkAndIngestForRAG(supabase, outputText, tipo, userId, metadata);
    }
  } catch (error) {
    console.error("Error logging learning data:", error);
  }
}

// ═══════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { 
      prompt, 
      tipo, 
      incluirJurisprudencia = true,
      incluirTestemunhasAssinatura = false,
      tribunal,
      vara,
      comarca,
      areaJuridica,
      correus,
      testemunhas,
      qualificationResponses,
      userId, // Recebido do queue-worker
      jobId,  // Recebido do queue-worker
      jurisdicao = "brasil",
    } = body;

    // R8: Validate modelo parameter against whitelist
    const ALLOWED_MODELOS = new Set(["flash", "pro", "combined", "triple", "cache"]);
    const modelo = ALLOWED_MODELOS.has(body.modelo) ? body.modelo : "flash";

    // Auth: accept both authenticated and anonymous calls (verify_jwt=false)
    let requestUserId: string | null = userId || null;

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── Validação de comprimento mínimo ───
    if (prompt.trim().length < 20) {
      return new Response(
        JSON.stringify({ error: "Descrição muito curta. Forneça pelo menos 20 caracteres descrevendo o documento desejado com contexto suficiente (partes, fatos, área jurídica)." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("═══════════════════════════════════════════════════════════════");
    console.log("🚀 DOCUMENT GENERATION - MULTI-PROVIDER + NEURAL + RAG PIPELINE");
    console.log(`📋 Type: ${tipo || "general"}`);
    console.log(`⚖️ Tribunal: ${tribunal || "auto"} | Vara: ${vara || "auto"} | Comarca: ${comarca || "Porto Alegre"}`);
    console.log(`🌐 Jurisdição: ${jurisdicao}`);
    console.log(`🎯 Preferred Model: ${modelo}`);
    if (modelo === "triple") {
      console.log("🏆 MODO PROFISSIONAL MÁXIMO: Groq → Anthropic → OpenAI");
    }
    console.log("═══════════════════════════════════════════════════════════════");

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get search terms for research
    const searchTerms = extractSearchTerms(prompt);
    console.log(`\n🔍 Search terms: "${searchTerms.substring(0, 80)}..."`);

    // ─── SEMANTIC CACHE CHECK ───────────────────────────────────
    // Before calling AI, check if we have a very similar document already cached
    // This avoids AI credit waste for similar/repeated document types
    if (tipo && prompt.length > 100) {
      try {
        const cached = await findCachedDocument(supabase, prompt, tipo, 0.88);
        if (cached) {
          const watermarkRecomendado = isJudicialType(tipo) ? "none" : "rascunho";
          console.log(`\n♻️ CACHE HIT — Returning cached document (similarity: ${cached.similarity.toFixed(3)}, saving AI credits!)`);

          await supabase.from("neural_learning_data").insert({
            interaction_type: "document_cache_hit",
            input_text: prompt.substring(0, 2000),
            output_text: cached.content.substring(0, 1000),
            quality_score: cached.similarity,
            learned: true,
            user_id: requestUserId,
            metadata: { tipo, similarity: cached.similarity, cacheHit: true, source: "semantic_cache" },
          }).catch(() => {});

          return new Response(JSON.stringify({
            content: cached.content,
            tipo,
            modelo: "cache",
            fallback: false,
            watermark_recomendado: watermarkRecomendado,
            neuralEnhanced: true,
            fromCache: true,
            cacheSimilarity: cached.similarity,
            metadata: {
              jurisprudenceCount: 0,
              knowledgeCount: 0,
              specializationsCount: 0,
              externalResultsCount: 0,
              cacheHit: true,
              similarity: cached.similarity,
              note: "Documento recuperado do cache semântico neural — créditos de IA economizados.",
            },
            sources: [],
          }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
        }
      } catch (cacheErr) {
        console.warn("Cache check failed, proceeding with AI generation:", cacheErr);
      }
    }
    // ─── END CACHE CHECK ─────────────────────────────────────────

    // 1. Parallel fetch: Neural context + External APIs
    let neuralContext: NeuralContext = {
      jurisprudence: [],
      knowledge: [],
      specializations: [],
      externalResults: [],
      feedbackPositive: [],
      feedbackNegative: [],
      txtKnowledge: [],
    };
    
    if (incluirJurisprudencia) {
      console.log("\n📡 Starting parallel research (Neural + External APIs)...");
      
      // Skip Brazilian external APIs when jurisdiction is "eua"
      const shouldSearchBrazilAPIs = jurisdicao !== "eua";
      
      const researchPromises: Promise<any>[] = [
        fetchNeuralContext(supabase, searchTerms || prompt.substring(0, 300), tipo)
      ];
      if (shouldSearchBrazilAPIs) {
        researchPromises.push(searchExternalAPIs(searchTerms || prompt.substring(0, 200)));
      } else {
        console.log("  ⏭️ Skipping Brazilian external APIs (jurisdiction: EUA)");
      }
      
      // Always search TXT knowledge base (doctrine, jurisprudence, súmulas from uploaded books)
      // For pesquisa-jurisprudencial-doc, load MUCH more content from TXT files
      const isJurisprudenciaDoc = tipo === "pesquisa-jurisprudencial-doc";
      const txtKeywords = await extractKeywords(searchTerms || prompt.substring(0, 300));
      if (isJurisprudenciaDoc) {
        // Add extra keywords from prompt for broader coverage
        const extraWords = prompt.toLowerCase().split(/\s+/).filter(w => w.length > 4).slice(0, 10);
        txtKeywords.push(...extraWords);
      }
      researchPromises.push(searchTxtKnowledgeBase(
        searchTerms || prompt.substring(0, 300),
        [...new Set(txtKeywords)],
        areaJuridica || (isJurisprudenciaDoc ? "penal" : undefined),
      ));
      
      const results = await Promise.allSettled(researchPromises);
      
      if (results[0].status === "fulfilled") {
        neuralContext = { ...results[0].value, externalResults: [], txtKnowledge: [] };
        // Filter jurisprudence by jurisdiction
        if (jurisdicao === "eua") {
          const USA_SOURCES = new Set(["freelaw", "courtlistener_dockets", "knowledge_graph", "google_books", "us_courts", "scotus"]);
          neuralContext.jurisprudence = neuralContext.jurisprudence.filter(j => USA_SOURCES.has(j.source) || j.source.startsWith("neural_"));
        } else if (jurisdicao === "brasil") {
          const USA_SOURCES = new Set(["freelaw", "courtlistener_dockets", "knowledge_graph", "google_books"]);
          neuralContext.jurisprudence = neuralContext.jurisprudence.filter(j => !USA_SOURCES.has(j.source));
        }
      }
      
      if (shouldSearchBrazilAPIs && results[1]?.status === "fulfilled") {
        neuralContext.externalResults = results[1].value;
      }
      
      // TXT knowledge base results (last promise)
      const txtResultIndex = shouldSearchBrazilAPIs ? 2 : 1;
      if (results[txtResultIndex]?.status === "fulfilled") {
        neuralContext.txtKnowledge = results[txtResultIndex].value;
      }
      
      console.log(`\n📊 Research Summary (jurisdiction: ${jurisdicao}):`);
      console.log(`  - Neural Jurisprudence: ${neuralContext.jurisprudence.length} sources`);
      console.log(`  - Knowledge Base: ${neuralContext.knowledge.length} entries`);
      console.log(`  - Specializations: ${neuralContext.specializations.length} active`);
      console.log(`  - External APIs: ${neuralContext.externalResults.length} results`);
      console.log(`  - TXT Knowledge (livros): ${neuralContext.txtKnowledge.length} excerpts`);
    }

    // 2. Format endereçamento baseado no tribunal/foro
    const enderecamento = formatarEnderecamento(tribunal, vara, comarca);
    const legislacao = getLegislacaoPrioritaria(tribunal, areaJuridica);
    
    console.log(`\n📍 Endereçamento formatado para: ${tribunal?.toUpperCase() || vara?.toUpperCase() || "Vara Cível"}`);

    // 3. Build enhanced system prompt with neural context + tribunal + specialized prompts
    // ═══ JURISDICTION OVERLAY ═══
    const JURISDICTION_PROMPTS: Record<string, string> = {
      brasil: `\n═══ JURISDIÇÃO: BRASIL 🇧🇷 ═══
Use EXCLUSIVAMENTE legislação brasileira (CF/88, CC/2002, CPC/2015, CLT, CDC, CP, CPP, LEP).
Tribunais: STF, STJ, TST, TSE, STM, TRFs, TJs estaduais, TRTs.
Doutrina: Priorize Guilherme de Souza Nucci (Códigos Comentados), Nelson Nery, Fredie Didier, Humberto Theodoro Jr.
Formato: Endereçamento brasileiro. Citação: Art. X da Lei Y, Súmula Z do STJ, REsp com número CNJ.
NÃO cite legislação estrangeira (US Code, Federal Rules, SCOTUS, etc.).
Advogado: [Nome do Advogado] – [OAB].`,
      eua: `\n═══ JURISDICTION: UNITED STATES 🇺🇸 ═══
Use EXCLUSIVELY United States law: U.S. Constitution, U.S. Code (USC), Code of Federal Regulations (CFR), state statutes.
Courts: SCOTUS, Circuit Courts (1st-11th, D.C., Federal), District Courts, State Supreme Courts.
Citations: Bluebook format (e.g., Brown v. Board of Education, 347 U.S. 483 (1954)).
Case law hierarchy: SCOTUS binding > Circuit Courts > District Courts > State courts.
Doctrine: Cite treatises (Prosser on Torts, Corbin on Contracts, Wright & Miller), Restatements (ALI).
DO NOT cite Brazilian legislation (CF/88, CC/2002, CPC, CLT, etc.).
DO NOT use Brazilian court addressing (Excelentíssimo Senhor Doutor Juiz).
Use standard US court document formatting.
Respond in Portuguese (BR) unless user writes in English.`,
      ambos: `\n═══ JURISDIÇÃO: COMPARADA BR + EUA 🌐 ═══
Compare legislação brasileira com americana para cada tópico:
1. Apresente a legislação e jurisprudência BRASILEIRA (CF/88, CC/2002, STF, STJ)
2. Compare com o equivalente AMERICANO (US Constitution, USC, SCOTUS, Circuit Courts)
3. Identifique convergências e divergências entre os sistemas
Use Bluebook para citações americanas e formato brasileiro para citações nacionais.
Responda em português (BR).`,
    };
    let enhancedSystemPrompt = systemPrompt + (JURISDICTION_PROMPTS[jurisdicao] || JURISDICTION_PROMPTS["brasil"]);

    // ═══ AREA JURÍDICA SPECIALIZED PROMPTS ═══
    const AREA_PROMPTS: Record<string, Record<string, string>> = {
      penal: {
        brasil: `\nESPECIALIZAÇÃO — DIREITO PENAL BRASILEIRO:
Priorize CP, CPP, LEP. Doutrina: Nucci (CP Comentado, CPP Comentado), Bitencourt, Capez.
Súmulas Vinculantes: 11, 14, 26, 56 do STF.

SÚMULAS ESSENCIAIS DO STJ PARA PENAL (use os enunciados na fundamentação):
- Súmula 231: A incidência da circunstância atenuante não pode conduzir à redução da pena abaixo do mínimo legal.
- Súmula 440: Fixada a pena-base no mínimo legal, é vedado o estabelecimento de regime prisional mais gravoso do que o cabível em razão da sanção imposta, com base apenas na gravidade abstrata do delito.
- Súmula 443: O aumento na terceira fase de aplicação da pena no crime de roubo circunstanciado exige fundamentação concreta, não sendo suficiente a mera indicação do número de majorantes.
- Súmula 444: É vedada a utilização de inquéritos policiais e ações penais em curso para agravar a pena-base.
- Súmula 545: Quando a confissão for utilizada para a formação do convencimento do julgador, o réu fará jus à atenuante prevista no art. 65, III, d, do CP.
- Súmula 582: Consuma-se o crime de roubo com a inversão da posse do bem mediante emprego de violência ou grave ameaça, ainda que por breve tempo.
- Súmula 588: A prática de crime ou contravenção penal contra a mulher com violência ou grave ameaça no ambiente doméstico impossibilita a substituição da PPL por PRD.
- Súmula 589: É inaplicável o princípio da insignificância nos crimes praticados contra a mulher no âmbito das relações domésticas.
- Súmula 593: O crime de estupro de vulnerável se configura com menor de 14 anos, sendo irrelevante eventual consentimento da vítima.
- Súmula 599: O princípio da insignificância é inaplicável aos crimes contra a administração pública.
- Súmula 630: Nos crimes de tráfico, a confissão que se limita à posse para uso próprio pode ser atenuante em proporção inferior.
- Súmula 659: A fração de aumento da pena no crime continuado deve ser fixada de acordo com o número de delitos praticados.
- Súmula 668: O porte ilegal de arma de fogo de uso permitido com numeração raspada NÃO configura crime hediondo.
- Súmula 676: O juiz não pode, de ofício, decretar a prisão preventiva ou converter flagrante em preventiva (Lei 13.964/2019 — Pacote Anticrime).

Teses defensivas: excludentes de ilicitude (art. 23 CP), causas supralegais, nulidades (art. 564 CPP).
ABNT para formatação. Respeitar ordem: fatos, tipificação, fundamentação, pedidos.`,
        eua: `\nSPECIALIZATION — US CRIMINAL LAW:
Prioritize Federal Criminal Code (Title 18 USC), Federal Rules of Criminal Procedure.
Key precedents: Miranda v. Arizona, Brady v. Maryland, Mapp v. Ohio, Gideon v. Wainwright.
Sentencing Guidelines (USSG). Defense: Fourth Amendment suppression, Sixth Amendment confrontation, Due Process.`,
      },
      civil: {
        brasil: `\nESPECIALIZAÇÃO — DIREITO CIVIL BRASILEIRO:
Priorize CC/2002, CPC/2015. Doutrina: Nelson Nery (CPC Comentado), Fredie Didier (Curso de Processo Civil), Humberto Theodoro Jr., Flavio Tartuce (Direito Civil).
Princípios: boa-fé objetiva (art. 422 CC), função social (art. 421 CC).

SÚMULAS ESSENCIAIS DO STJ PARA CIVIL:
- Súmula 37: São cumuláveis as indenizações por dano material e dano moral oriundos do mesmo fato.
- Súmula 54: Os juros moratórios fluem a partir do evento danoso, em caso de responsabilidade extracontratual.
- Súmula 130: A empresa responde, perante o cliente, pela reparação de dano ou furto de veículo ocorridos em seu estacionamento.
- Súmula 227: A pessoa jurídica pode sofrer dano moral.
- Súmula 326: Na ação de indenização por dano moral, a condenação em montante inferior ao postulado não implica sucumbência recíproca.
- Súmula 370: Caracteriza dano moral a apresentação antecipada de cheque pré-datado.
- Súmula 387: É lícita a cumulação das indenizações de dano estético e dano moral.
- Súmula 449: A vaga de garagem que possui matrícula própria no registro de imóveis não constitui bem de família para efeito de penhora.
- Súmula 529: No seguro de responsabilidade civil facultativo, não cabe ação pelo terceiro prejudicado direta e exclusivamente em face da seguradora.
- Súmula 549: É válida a penhora de bem de família pertencente a fiador de contrato de locação.
- Súmula 610: O suicídio não é coberto nos dois primeiros anos de vigência do contrato de seguro de vida, ressalvado o direito do beneficiário à devolução da reserva técnica.
- Súmula 642: O direito à indenização por danos morais transmite-se com o falecimento do titular, possuindo os herdeiros legitimidade ativa.`,
        eua: `\nSPECIALIZATION — US CIVIL LAW:
Federal Rules of Civil Procedure, Erie Doctrine, Restatements (ALI).
Prosser on Torts, Corbin on Contracts. State-specific civil codes.`,
      },
      trabalhista: {
        brasil: `\nESPECIALIZAÇÃO — DIREITO TRABALHISTA BRASILEIRO:
Priorize CLT, Lei 13.467/2017 (Reforma). Doutrina: Godinho Delgado, Volia Bomfim, Sergio Pinto Martins.
Súmulas e OJs do TST. Princípio da proteção, primazia da realidade, irrenunciabilidade.
Pedidos LÍQUIDOS obrigatórios (art. 840 CLT pós-Reforma).
Honorários de sucumbência podem ser cobrados do reclamante (art. 791-A CLT).
Danos extrapatrimoniais: limites do art. 223-G CLT.`,
        eua: `\nSPECIALIZATION — US EMPLOYMENT LAW:
Title VII (42 USC 2000e), FLSA, NLRA, ADA, FMLA, OSHA. Employment-at-will doctrine. EEOC procedures.`,
      },
      consumidor: {
        brasil: `\nESPECIALIZAÇÃO — DIREITO DO CONSUMIDOR BRASILEIRO:
Priorize CDC (Lei 8.078/90). Doutrina: Claudia Lima Marques, Leonardo de Medeiros Garcia.
Inversão do ônus (art. 6º, VIII CDC). Responsabilidade objetiva do fornecedor (arts. 12-14 CDC).

SÚMULAS ESSENCIAIS DO STJ PARA CONSUMIDOR:
- Súmula 297: O CDC é aplicável às instituições financeiras.
- Súmula 302: É abusiva a cláusula de plano de saúde que limita no tempo a internação hospitalar.
- Súmula 359: Cabe ao órgão mantenedor do Cadastro de Proteção ao Crédito a notificação do devedor antes de proceder à inscrição.
- Súmula 385: Da anotação irregular em cadastro, não cabe dano moral quando preexistente legítima inscrição.
- Súmula 479: As instituições financeiras respondem objetivamente pelos danos gerados por fortuito interno relativo a fraudes e delitos praticados por terceiros.
- Súmula 532: Constitui prática comercial abusiva o envio de cartão de crédito sem prévia e expressa solicitação.
- Súmula 543: Na resolução de contrato de compra e venda de imóvel submetido ao CDC, deve ocorrer a imediata restituição das parcelas pagas.
- Súmula 548: Incumbe ao credor a exclusão do registro da dívida no cadastro de inadimplentes no prazo de 5 dias úteis após o pagamento.
- Súmula 597: A cláusula de carência de plano de saúde é abusiva se ultrapassado o prazo máximo de 24h para emergência/urgência.
- Súmula 601: O MP tem legitimidade ativa para defesa de direitos difusos, coletivos e individuais homogêneos dos consumidores.
- Súmula 608: Aplica-se o CDC aos contratos de plano de saúde, salvo os administrados por entidades de autogestão.
- Súmula 609: A recusa de cobertura securitária por doença preexistente é ilícita se não houve exigência de exames médicos prévios.
- Súmula 675: Os órgãos de defesa do consumidor têm competência para aplicar as sanções administrativas previstas no CDC.`,
        eua: `\nSPECIALIZATION — US CONSUMER PROTECTION:
FTC Act (15 USC 45), Consumer Financial Protection Act (Dodd-Frank), Magnuson-Moss Warranty Act, state UDAP statutes.`,
      },
      familia: {
        brasil: `\nESPECIALIZAÇÃO — DIREITO DE FAMÍLIA BRASILEIRO:
Priorize CC/2002 (Livro IV), CPC/2015, ECA (Lei 8.069/90). Doutrina: Maria Berenice Dias, Rolf Madaleno, Pablo Stolze.
Melhor interesse da criança (art. 227 CF). LGPD em dados de menores.

SÚMULAS ESSENCIAIS DO STJ PARA FAMÍLIA:
- Súmula 1: O foro do domicílio do alimentando é o competente para a ação de investigação de paternidade cumulada com alimentos.
- Súmula 277: Julgada procedente a investigação de paternidade, os alimentos são devidos a partir da citação.
- Súmula 309: O débito alimentar que autoriza a prisão civil compreende as três prestações anteriores ao ajuizamento da execução e as que se vencerem no curso do processo.
- Súmula 336: A mulher que renunciou aos alimentos na separação judicial tem direito à pensão previdenciária por morte do ex-marido, comprovada a necessidade econômica superveniente.
- Súmula 358: O cancelamento de pensão alimentícia de filho que atingiu a maioridade está sujeito à decisão judicial, mediante contraditório.
- Súmula 383: A competência para processar e julgar as ações conexas de interesse de menor é, em princípio, do foro do domicílio do detentor de sua guarda.
- Súmula 594: O MP tem legitimidade para ajuizar ação de alimentos em proveito de criança ou adolescente.
- Súmula 596: A obrigação alimentar dos avós tem natureza complementar e subsidiária.
- Súmula 621: Os efeitos da sentença que reduz, majora ou exonera alimentos retroagem à data da citação.`,
        eua: `\nSPECIALIZATION — US FAMILY LAW:
UCCJEA, UIFSA, state family codes. Best interest of the child standard.`,
      },
      previdenciario: {
        brasil: `\nESPECIALIZAÇÃO — DIREITO PREVIDENCIÁRIO BRASILEIRO:
Priorize Lei 8.213/91, Lei 8.212/91, CF/88 (art. 201-202). Doutrina: Frederico Amado, Hugo Goes, Ivan Kertzman.
Teses: concessão de benefício negado, revisão da vida toda, aposentadoria especial.

SÚMULAS ESSENCIAIS DO STJ PARA PREVIDENCIÁRIO:
- Súmula 149: A prova exclusivamente testemunhal não basta à comprovação da atividade rurícola para obtenção de benefício previdenciário.
- Súmula 340: A lei aplicável à concessão de pensão previdenciária por morte é aquela vigente na data do óbito do segurado.
- Súmula 416: É devida a pensão por morte aos dependentes do segurado que, apesar de ter perdido essa qualidade, preencheu os requisitos legais para aposentadoria até a data do seu óbito.
- Súmula 441: A falta de comunicação de saída do emprego ao INSS não impede a concessão de benefício previdenciário.
- Súmula 563: O CDC é aplicável às entidades abertas de previdência complementar, não incidindo nos contratos com entidades fechadas.
- Súmula 657: A Lei n. 8.213/1991 aplica-se aos benefícios previdenciários urbanos e rurais.
- Súmula 663: O filho inválido de qualquer idade possui direito à pensão por morte, desde que a invalidez seja anterior ao óbito do segurado.`,
        eua: `\nSPECIALIZATION — US SOCIAL SECURITY:
Social Security Act (42 USC), SSA regulations (20 CFR), Medicare/Medicaid. ALJ hearings.`,
      },
      tributario: {
        brasil: `\nESPECIALIZAÇÃO — DIREITO TRIBUTÁRIO BRASILEIRO:
Priorize CTN (Lei 5.172/66), CF/88 (arts. 145-162). Doutrina: Paulo de Barros Carvalho, Hugo de Brito Machado, Ricardo Alexandre.
Princípios: legalidade, anterioridade, capacidade contributiva.

SÚMULAS ESSENCIAIS DO STJ PARA TRIBUTÁRIO:
- Súmula 188: Os juros moratórios, na repetição do indébito tributário, são devidos a partir do trânsito em julgado da sentença.
- Súmula 212: A compensação de créditos tributários não pode ser deferida em ação cautelar ou por medida liminar.
- Súmula 391: O ICMS incide sobre o valor da venda a prazo constante da nota fiscal.
- Súmula 430: O inadimplemento da obrigação tributária pela sociedade não gera, por si só, a responsabilidade solidária do sócio-gerente.
- Súmula 435: Presume-se dissolvida irregularmente a empresa que deixar de funcionar no seu domicílio fiscal, sem comunicação aos órgãos competentes, legitimando o redirecionamento da execução fiscal para o sócio-gerente.
- Súmula 436: A entrega de declaração pelo contribuinte reconhecendo débito fiscal constitui o crédito tributário, dispensada qualquer outra providência por parte do fisco.
- Súmula 446: Declarado e não pago o débito tributário pelo contribuinte, é legítima a recusa de expedição de certidão negativa.
- Súmula 555: Quando não houver declaração do débito, o prazo decadencial quinquenal conta-se na forma do art. 173, I, do CTN.
- Súmula 649: Não incide ICMS no deslocamento de bens de um estabelecimento para outro do mesmo contribuinte localizados em estados distintos.
- Súmula 653: O pedido de parcelamento fiscal, ainda que indeferido, interrompe o prazo prescricional, pois caracteriza confissão extrajudicial do débito.
- Súmula 666: A legitimidade para pleitear a compensação ou restituição do ICMS-ST pago a maior é do contribuinte substituído.
- Súmula 671: Não incide IPI sobre o produto industrializado em caso de furto ou roubo.`,
        eua: `\nSPECIALIZATION — US TAX LAW:
Internal Revenue Code (Title 26 USC), Treasury Regulations, Tax Court procedures, IRS Revenue Rulings.`,
      },
      administrativo: {
        brasil: `\nESPECIALIZAÇÃO — DIREITO ADMINISTRATIVO BRASILEIRO:
Priorize CF/88, Lei 9.784/99, Lei 14.133/21 (Nova Licitações). Doutrina: Celso Antonio Bandeira de Mello, Hely Lopes Meirelles, Maria Sylvia Zanella Di Pietro.
Princípios: legalidade, impessoalidade, moralidade, publicidade, eficiência (art. 37 CF).

SÚMULAS ESSENCIAIS DO STJ PARA ADMINISTRATIVO:
- Súmula 525: A Câmara de Vereadores não possui personalidade jurídica, apenas personalidade judiciária.
- Súmula 633: A Lei 9.784/99, quanto ao prazo decadencial para revisão de atos administrativos, pode ser aplicada subsidiariamente a estados e municípios.
- Súmula 634: Ao particular aplica-se o mesmo regime prescricional da Lei de Improbidade Administrativa para o agente público.
- Súmula 641: A portaria de instauração do PAD prescinde da exposição detalhada dos fatos a serem apurados.
- Súmula 645: O crime de fraude à licitação é formal, prescindindo da demonstração de prejuízo ao erário.
- Súmula 650: A autoridade administrativa não dispõe de discricionariedade para aplicar pena diversa de demissão quando caracterizadas as hipóteses do art. 132 da Lei 8.112/1990.
- Súmula 665: O controle jurisdicional do PAD restringe-se ao exame da regularidade do procedimento e da legalidade do ato, vedada incursão no mérito administrativo.
- Súmula 672: A alteração da capitulação legal da conduta após a instrução do PAD não enseja nulidade, desde que garantidos contraditório e ampla defesa.
- Súmula 674: A fundamentação per relationem em PAD é permitida, desde que faça referência expressa aos fundamentos do ato referido.`,
        eua: `\nSPECIALIZATION — US ADMINISTRATIVE LAW:
APA (5 USC 551), Chevron deference, FAR, Government Contracts.`,
      },
      ambiental: {
        brasil: `\nESPECIALIZAÇÃO — DIREITO AMBIENTAL BRASILEIRO:
Priorize CF/88 (art. 225), Lei 9.605/98 (Crimes Ambientais), Lei 12.651/2012 (Código Florestal), PNMA (Lei 6.938/81).
Doutrina: Paulo Affonso Leme Machado, Édis Milaré. Responsabilidade objetiva ambiental.

SÚMULAS ESSENCIAIS DO STJ PARA AMBIENTAL:
- Súmula 613: Não se admite multa diária por descumprimento de obrigação de fazer em ACP quando o ente público não tiver dado causa à poluição.
- Súmula 618: A inversão do ônus da prova aplica-se às ações de degradação ambiental.
- Súmula 623: As obrigações ambientais possuem natureza propter rem, sendo admissível cobrá-las do proprietário ou possuidor atual.
- Súmula 629: Quanto ao dano ambiental, é admitida a condenação à obrigação de fazer ou não fazer cumulada com indenização.
- Súmula 652: A responsabilidade civil da Administração por danos ao meio ambiente é solidária, mas de execução subsidiária.`,
        eua: `\nSPECIALIZATION — US ENVIRONMENTAL LAW:
NEPA, Clean Air Act, Clean Water Act, CERCLA/Superfund, EPA regulations.`,
      },
      bancario: {
        brasil: `\nESPECIALIZAÇÃO — DIREITO BANCÁRIO BRASILEIRO:
Priorize CDC (Lei 8.078/90), CC/2002. Doutrina: Claudia Lima Marques, Arnaldo Rizzardo.

SÚMULAS ESSENCIAIS DO STJ PARA BANCÁRIO:
- Súmula 297: O CDC é aplicável às instituições financeiras.
- Súmula 381: Nos contratos bancários, é vedado ao julgador conhecer, de ofício, da abusividade das cláusulas.
- Súmula 382: A estipulação de juros remuneratórios superiores a 12% ao ano, por si só, não indica abusividade.
- Súmula 472: A cobrança de comissão de permanência exclui a exigibilidade dos juros remuneratórios, moratórios e da multa contratual.
- Súmula 479: As instituições financeiras respondem objetivamente pelos danos gerados por fortuito interno relativo a fraudes.
- Súmula 530: Nos contratos bancários, na impossibilidade de comprovar a taxa de juros contratada, aplica-se a taxa média de mercado.
- Súmula 539: É permitida a capitalização de juros com periodicidade inferior à anual em contratos bancários a partir de 31/3/2000, desde que expressamente pactuada.
- Súmula 541: A previsão de taxa de juros anual superior ao duodécuplo da mensal é suficiente para permitir a cobrança da taxa efetiva anual.
- Súmula 565: A pactuação das taxas de juros das instituições financeiras não se sujeita aos limites da Lei de Usura.
- Súmula 566: Nos contratos bancários posteriores a 30/4/2008, pode ser cobrada a tarifa de cadastro no início do relacionamento.`,
        eua: `\nSPECIALIZATION — US BANKING LAW:
Dodd-Frank Act, Truth in Lending Act (TILA), Fair Debt Collection Practices Act (FDCPA), OCC regulations.`,
      },
      imobiliario: {
        brasil: `\nESPECIALIZAÇÃO — DIREITO IMOBILIÁRIO BRASILEIRO:
Priorize CC/2002, Lei 8.245/91 (Locações), Lei 4.591/64 (Condomínio). Doutrina: Caio Mário da Silva Pereira, Arnaldo Rizzardo.

SÚMULAS ESSENCIAIS DO STJ PARA IMOBILIÁRIO:
- Súmula 449: A vaga de garagem que possui matrícula própria no registro de imóveis não constitui bem de família para efeito de penhora.
- Súmula 473: O mutuário do SFH não pode ser compelido a contratar o seguro habitacional obrigatório com a instituição financeira mutuante.
- Súmula 543: Na resolução de contrato de compra e venda de imóvel (CDC), deve ocorrer a imediata restituição das parcelas pagas pelo comprador.
- Súmula 549: É válida a penhora de bem de família pertencente a fiador de contrato de locação.`,
        eua: `\nSPECIALIZATION — US REAL ESTATE LAW:
Fair Housing Act, RESPA, state landlord-tenant statutes, Uniform Commercial Code (Article 9).`,
      },
    };

    // REGRA SUMULAR (Anti-alucinação para súmulas)
    const REGRA_SUMULAR = `\n
REGRA SUMULAR:
- Ao citar súmulas, use EXCLUSIVAMENTE súmulas que existam na base de dados ou que sejam notoriamente conhecidas.
- Formato: "Súmula [número] do [Tribunal]: [enunciado]"
- Se não tiver certeza se a súmula existe, escreva: "Conferir súmula aplicável sobre [tema]"
- Priorize súmulas do STJ e Súmulas Vinculantes do STF como fonte primária de fundamentação.`;

    enhancedSystemPrompt += REGRA_SUMULAR;

    // Inject area-specific prompt
    const areaKey = areaJuridica || "";
    const jKey = jurisdicao === "eua" ? "eua" : "brasil";
    if (areaKey && AREA_PROMPTS[areaKey]) {
      enhancedSystemPrompt += (AREA_PROMPTS[areaKey][jKey] || AREA_PROMPTS[areaKey]["brasil"] || "");
    }
    
    // Check for active prompt version from neural evolution
    let activePromptVersionId: string | null = null;
    let activePromptVersionLabel: string | null = null;
    try {
      // Check for A/B experiment first
      const { data: runningExp } = await supabase
        .from("neural_ab_experiments")
        .select("variant_a_id, variant_b_id, traffic_split")
        .eq("status", "running")
        .eq("scope", tipo || "document_generation")
        .maybeSingle();

      if (runningExp) {
        // A/B split: randomly select variant
        const useB = Math.random() < (runningExp.traffic_split || 0.5);
        const selectedId = useB ? runningExp.variant_b_id : runningExp.variant_a_id;
        
        if (selectedId) {
          const { data: version } = await supabase
            .from("neural_prompt_versions")
            .select("id, content, version_label")
            .eq("id", selectedId)
            .single();
          
          if (version) {
            enhancedSystemPrompt += `\n\n═══════════════════════════════════════════════════════════════
INSTRUÇÕES ADICIONAIS DA VERSÃO DE PROMPT ${version.version_label} (A/B Test - Variante ${useB ? "B" : "A"}):
═══════════════════════════════════════════════════════════════
${version.content}
`;
            activePromptVersionId = version.id;
            activePromptVersionLabel = version.version_label;
            console.log(`🧪 A/B Test: Using variant ${useB ? "B" : "A"} (${version.version_label})`);
          }
        }
      } else {
        // No A/B test: use active version
        const { data: activeVersion } = await supabase
          .from("neural_prompt_versions")
          .select("id, content, version_label")
          .eq("scope", tipo || "document_generation")
          .eq("is_active", true)
          .maybeSingle();

        if (activeVersion) {
          enhancedSystemPrompt += `\n\n═══════════════════════════════════════════════════════════════
INSTRUÇÕES ADICIONAIS DA VERSÃO DE PROMPT ${activeVersion.version_label}:
═══════════════════════════════════════════════════════════════
${activeVersion.content}
`;
          activePromptVersionId = activeVersion.id;
          activePromptVersionLabel = activeVersion.version_label;
          console.log(`📋 Using active prompt version: ${activeVersion.version_label}`);
        }
      }
    } catch (pvErr) {
      console.warn("⚠️ Error fetching prompt version:", pvErr);
    }

    // Add specialized prompt section for this document type
    if (tipo) {
      const specializedSection = buildSpecializedPromptSection(tipo);
      if (specializedSection) {
        enhancedSystemPrompt += specializedSection;
        console.log(`📋 Specialized prompt loaded for: ${tipo}`);
      }
    }

    // Add tribunal-specific instructions — but NOT for extrajudicial documents
    const EXTRAJUDICIAL_TYPES = new Set([
      "contrato-servicos", "contrato-honorarios", "contrato-locacao", "contrato-modelo",
      "revisar-contrato", "analise-contrato-parecer", "comparar-contratos",
      "aditivo-contratual", "termo-encerramento", "termo-confidencialidade", "termos-uso",
      "procuracao-ad-judicia", "procuracao-ad-negotia",
      "notificacao-extrajudicial", "acordo-extrajudicial", "acordo-extrajudicial-trabalhista",
      "declaracao", "parecer-juridico", "atestado"
    ]);
    const isExtrajudicialDoc = EXTRAJUDICIAL_TYPES.has(tipo || "");
    
    if (isExtrajudicialDoc) {
      enhancedSystemPrompt += `\n\n═══════════════════════════════════════════════════════════════
ATENÇÃO: Este é um documento EXTRAJUDICIAL.
NÃO inclua endereçamento a juiz, tribunal ou juízo.
NÃO use "Excelentíssimo Senhor Doutor Juiz" ou similar.
O documento deve começar diretamente com o título da peça (ex: PROCURAÇÃO AD NEGOTIA).
NÃO inclua seção de testemunhas em procurações.
═══════════════════════════════════════════════════════════════

LEGISLAÇÃO PRIORITÁRIA:
${legislacao.map(l => `• ${l}`).join("\n")}
`;
    } else {
      enhancedSystemPrompt += `\n\n═══════════════════════════════════════════════════════════════
ENDEREÇAMENTO OBRIGATÓRIO (use exatamente este formato):
${enderecamento}
═══════════════════════════════════════════════════════════════

LEGISLAÇÃO PRIORITÁRIA PARA ESTE FORO:
${legislacao.map(l => `• ${l}`).join("\n")}
`;
    }

    // Add corréus and testemunhas if present
    const correusArr = Array.isArray(correus) ? correus.filter((c: any) => c?.nome?.trim()) : [];
    const testemunhasArr = Array.isArray(testemunhas) ? testemunhas.filter((t: any) => t?.nome?.trim()) : [];

    if (correusArr.length > 0) {
      enhancedSystemPrompt += `\n═══════════════════════════════════════════════════════════════
CORRÉUS / OUTROS ACUSADOS (incluir obrigatoriamente na qualificação e no corpo do documento):
═══════════════════════════════════════════════════════════════\n`;
      correusArr.forEach((c: any, i: number) => {
        enhancedSystemPrompt += `${i + 1}. ${c.nome}${c.qualificacao ? ` – ${c.qualificacao}` : ""}\n`;
      });
    }

    if (testemunhasArr.length > 0) {
      enhancedSystemPrompt += `\n═══════════════════════════════════════════════════════════════
TESTEMUNHAS (incluir na seção de provas e no rol de testemunhas do documento):
═══════════════════════════════════════════════════════════════\n`;
      testemunhasArr.forEach((t: any, i: number) => {
        enhancedSystemPrompt += `${i + 1}. ${t.nome}${t.qualificacao ? ` – ${t.qualificacao}` : ""}\n`;
      });
    }
    // Add neural research context
    const neuralEnhancement = formatNeuralEnhancement(neuralContext);
    enhancedSystemPrompt += neuralEnhancement;
    
    // Cap total system prompt to avoid timeouts on all providers
    if (enhancedSystemPrompt.length > 20000) {
      console.warn(`⚠️ System prompt too large (${enhancedSystemPrompt.length} chars), truncating to 20k`);
      enhancedSystemPrompt = enhancedSystemPrompt.substring(0, 20000) + "\n\n[Contexto neural truncado por limite de tamanho]";
    }
    
    console.log(`\n📝 Enhanced prompt size: ${enhancedSystemPrompt.length} chars`);

    // 3b. Query disabled providers from ai_providers table
    const disabledProviders = new Set<string>();
    try {
      const { data: providers } = await supabase
        .from("ai_providers")
        .select("provider_name, is_enabled")
        .eq("is_enabled", false);
      
      if (providers && providers.length > 0) {
        for (const p of providers) {
          const keys = PROVIDER_NAME_TO_KEYS[p.provider_name];
          if (keys) {
            keys.forEach(k => disabledProviders.add(k));
          }
        }
        console.log(`🚫 Disabled providers: ${providers.map(p => p.provider_name).join(", ")}`);
      }
    } catch (e) {
      console.warn("⚠️ Could not fetch ai_providers:", e);
    }

    // 4. Call AI with multi-provider fallback
    console.log("\n🤖 Starting multi-provider AI generation...");
    const startTime = Date.now();
    
    const result = await callAIWithFallback(enhancedSystemPrompt, prompt, modelo, tipo, disabledProviders);
    
    const duration = Date.now() - startTime;
    console.log(`\n⏱️ Generation completed in ${(duration / 1000).toFixed(1)}s`);
    console.log(`📄 Document size: ${result.content.length} chars`);

    // 4b. Truncation detection
    const truncationCheck = detectTruncation(result.content);
    if (truncationCheck.truncated) {
      console.warn(`⚠️ TRUNCAMENTO DETECTADO: ${truncationCheck.reason}`);
      console.warn(`📏 Tamanho do documento: ${result.content.length} chars — possível limite de tokens atingido`);
    }

    // 4c. Anti-hallucination post-generation check
    const hallucinationWarnings = detectHallucinations(result.content);
    if (hallucinationWarnings.length > 0) {
      console.warn(`⚠️ POSSÍVEIS ALUCINAÇÕES DETECTADAS (${hallucinationWarnings.length}):`);
      hallucinationWarnings.forEach(w => console.warn(`  - ${w}`));
    }

    // 4d. ABNT validation check
    const abntValidation = validateABNT(result.content, tipo || "");
    if (abntValidation.issues.length > 0) {
      console.warn(`📏 VALIDAÇÃO ABNT (score: ${abntValidation.score.toFixed(2)}):`);
      abntValidation.issues.forEach(i => console.warn(`  ❌ ${i}`));
      abntValidation.corrections.forEach(c => console.log(`  🔧 ${c}`));
    } else {
      console.log(`📏 VALIDAÇÃO ABNT: ✅ Documento em conformidade (score: ${abntValidation.score.toFixed(2)})`);
    }

    // 4e. Auto-correção ABNT se score < 0.7 (with temporal guard)
    let finalContent = result.content;
    const elapsedBeforeAbnt = Date.now() - startTime;
    if (abntValidation.score < 0.7 && abntValidation.corrections.length > 0 && elapsedBeforeAbnt < 100000) {
      console.log(`\n🔧 AUTO-CORREÇÃO ABNT: documento com problemas (elapsed: ${(elapsedBeforeAbnt/1000).toFixed(1)}s)...`);
      try {
        const correctionPrompt = `Você é um revisor de conformidade ABNT. O documento abaixo apresenta os seguintes problemas de formatação:

${abntValidation.issues.map((i, idx) => `${idx + 1}. ${i}`).join("\n")}

CORREÇÕES OBRIGATÓRIAS:
${abntValidation.corrections.map((c, idx) => `${idx + 1}. ${c}`).join("\n")}

REGRAS ABNT A APLICAR:
- Títulos de seção: CAIXA ALTA, negrito (usar caixa alta no texto puro)
- Citações longas: indicar fonte (SOBRENOME, ano, p. XX)
- SEM markdown: sem **, ##, -, * — apenas texto puro
- Alíneas: a), b), c) ao invés de bullets
- Referências: SOBRENOME, Nome. Título. Edição. Local: Editora, Ano.

DOCUMENTO A CORRIGIR:
${finalContent}

Retorne o documento COMPLETO corrigido. NÃO remova conteúdo, apenas corrija a formatação ABNT.`;

        const correctionResult = await callAIWithFallback(
          enhancedSystemPrompt,
          correctionPrompt,
          "flash",
          undefined,
          disabledProviders
        );
        if (correctionResult.content && correctionResult.content.length > finalContent.length * 0.7) {
          finalContent = correctionResult.content;
          console.log(`✅ Auto-correção ABNT aplicada: ${finalContent.length} chars`);
          
          // Re-validate after correction
          const revalidation = validateABNT(finalContent, tipo || "");
          console.log(`📏 Re-validação ABNT: score ${revalidation.score.toFixed(2)} (${revalidation.issues.length} problemas restantes)`);
        }
      } catch (e) {
        console.warn("Auto-correção ABNT falhou:", e);
      }
    } else if (elapsedBeforeAbnt >= 100000) {
      console.log(`⏱️ Pulando auto-correção ABNT (elapsed: ${(elapsedBeforeAbnt/1000).toFixed(1)}s > 100s)`);
    }

    // 5. Check completeness and continue if needed (with temporal guard)
    const elapsedBeforeContinuation = Date.now() - startTime;
    const isTruncated = detectTruncation(finalContent).truncated;
    const isIncomplete = !isDocumentComplete(finalContent);
    
    // Guard: skip continuation if document already has deferimento + OAB signature
    const finalLower = finalContent.toLowerCase();
    const alreadyHasSignature = finalLower.includes("deferimento") && (finalLower.includes("oab") || finalLower.includes("[OAB-NUM]"));
    
    if ((isIncomplete || isTruncated) && !alreadyHasSignature && finalContent.length > 500 && elapsedBeforeContinuation < 130000) {
      console.log(`\n⚠️ Document needs continuation (incomplete: ${isIncomplete}, truncated: ${isTruncated}, elapsed: ${(elapsedBeforeContinuation/1000).toFixed(1)}s)...`);
      
      try {
      const closingInstructions = getClosingInstructions(tipo || "", incluirTestemunhasAssinatura);
        const continuationResult = await callAIWithFallback(
          enhancedSystemPrompt,
          `IMPORTANTE: NÃO gere um documento novo. O documento abaixo está INCOMPLETO e você deve APENAS completar as seções que faltam. Continue EXATAMENTE de onde parou.

ÚLTIMOS 2000 CARACTERES DO DOCUMENTO ATUAL:
${finalContent.slice(-2000)}

INSTRUÇÃO: Complete APENAS as seções restantes que faltam (pedidos, valor da causa, requerimentos finais, fechamento).

FECHAMENTO OBRIGATÓRIO para este tipo de documento:
${closingInstructions}

Local: ${comarca || "Porto Alegre"}/RS

NÃO repita o endereçamento, qualificação ou fatos. NÃO gere o documento inteiro novamente.`,
          "flash",
          undefined,
          disabledProviders
        );
        if (continuationResult.content.trim()) {
          // Guard: discard continuation if it starts with a new document header
          const contStart = continuationResult.content.trim().substring(0, 100).toLowerCase();
          if (contStart.match(/^(excelent|ao ju[íi]z|ao mm|ao meritíssim)/)) {
            console.log(`⚠️ Continuation discarded — AI generated a new document instead of continuing`);
          } else {
            finalContent = finalContent + "\n\n" + continuationResult.content;
            console.log(`✅ Continuation added: ${continuationResult.content.length} chars`);
          }
        }
      } catch (e) {
        console.warn("Continuation failed:", e);
      }
    } else if (alreadyHasSignature) {
      console.log(`✅ Document already has deferimento+OAB signature — skipping continuation`);
    } else if (elapsedBeforeContinuation >= 130000) {
      console.log(`⏱️ Pulando continuation (elapsed: ${(elapsedBeforeContinuation/1000).toFixed(1)}s > 130s)`);
    }

    // 6. Determine recommended watermark
    const watermarkRecomendado = isJudicialType(tipo || "") ? "none" : "rascunho";

    // 7. Log for neural learning (async, non-blocking)
    logLearningData(supabase, prompt, finalContent, {
      provider: result.provider,
      fallback: result.fallback,
      tipo,
      tribunal,
      vara,
      comarca,
      neuralContextUsed: incluirJurisprudencia,
      jurisprudenceCount: neuralContext.jurisprudence.length,
      knowledgeCount: neuralContext.knowledge.length,
      externalResultsCount: neuralContext.externalResults.length,
      duration,
      modelo,
      userId: requestUserId,
      prompt_version_id: activePromptVersionId,
      prompt_version_label: activePromptVersionLabel,
      jobId: jobId || null, // Include job ID for correlation
    });

    // 8. Lacuna 14: Doc→Neural Feedback Loop
    // Index the generated document back into the neural network for future searches
    if (finalContent.length > 500 && tipo) {
      try {
        const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
        const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
        if (supabaseUrl && supabaseAnonKey) {
          const docTitle = `${tipo} - ${(areaJuridica || "geral").toUpperCase()} - ${new Date().toISOString().split("T")[0]}`;
          const docSummary = finalContent.substring(0, 2000);
          
          // Fire-and-forget: index this document into neural search
          fetch(`${supabaseUrl}/functions/v1/neural-search`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseAnonKey}`, apikey: supabaseAnonKey },
            body: JSON.stringify({
              mode: "index",
              query: searchTerms || prompt.substring(0, 200),
              items: [{
                title: docTitle,
                content: docSummary,
                source: "doc_generated",
                sourceLabel: "Documento Gerado (Auto-Evolução)",
                contentType: tipo,
                publishedDate: new Date().toISOString().split("T")[0],
                metadata: {
                  tribunal: tribunal || null,
                  vara: vara || null,
                  comarca: comarca || null,
                  areaJuridica: areaJuridica || null,
                  provider: result.provider,
                  feedback_loop: true,
                },
              }],
            }),
          }).catch(e => console.warn("Doc→Neural feedback failed:", e));
          
          console.log(`🔄 Doc→Neural Feedback: indexing ${docTitle}`);
        }
      } catch (e) {
        console.warn("Doc→Neural feedback error:", e);
      }
    }

    // ─── Lacuna RLHF: Disparar pipeline-orchestrator para fechar o ciclo ───
    // Aciona collect_feedback + compute_metrics assincronamente
    if (finalContent.length > 500) {
      const supabaseUrl2 = Deno.env.get("SUPABASE_URL") || "";
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
      if (supabaseUrl2 && serviceKey) {
        EdgeRuntime.waitUntil(
          fetch(`${supabaseUrl2}/functions/v1/neural-pipeline-orchestrator`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${serviceKey}`,
            },
            body: JSON.stringify({ action: "collect_feedback" }),
            signal: AbortSignal.timeout(60000),
          })
          .then(() => console.log("✅ Pipeline orchestrator triggered (doc feedback)"))
          .catch(e => console.warn("Pipeline trigger failed:", e))
        );
      }
    }

    console.log("\n✅ Document generation completed successfully!");
    console.log("═══════════════════════════════════════════════════════════════\n");

    return new Response(
      JSON.stringify({
        content: finalContent,
        tipo,
        modelo: result.provider,
        fallback: result.fallback,
        tribunal: tribunal || null,
        enderecamento,
        watermark_recomendado: watermarkRecomendado,
        neuralEnhanced: incluirJurisprudencia && (
          neuralContext.jurisprudence.length > 0 || 
          neuralContext.externalResults.length > 0
        ),
        metadata: {
          jurisprudenceCount: neuralContext.jurisprudence.length,
          knowledgeCount: neuralContext.knowledge.length,
          specializationsCount: neuralContext.specializations.length,
          externalResultsCount: neuralContext.externalResults.length,
          legislacaoPrioritaria: legislacao,
          duration,
          specializedPromptUsed: !!getPromptEspecializado(tipo || ""),
          tripleChainUsed: modelo === "triple",
          promptVersionId: activePromptVersionId,
          promptVersionLabel: activePromptVersionLabel,
          hallucinationWarnings: hallucinationWarnings.length > 0 ? hallucinationWarnings : undefined,
          abntValidation: {
            score: abntValidation.score,
            issues: abntValidation.issues,
            corrections: abntValidation.corrections,
            autoCorrected: abntValidation.score < 0.7,
          },
        },
        sources: [
          ...neuralContext.jurisprudence.map(j => ({ source: j.source, title: j.title, url: j.url })),
          ...neuralContext.externalResults.map(e => ({ source: e.source, title: e.title, url: e.url }))
        ],
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("❌ Document generation error:", error);
    return new Response(
      JSON.stringify({ error: "Erro ao gerar documento" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
