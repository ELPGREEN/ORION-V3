import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ═══════════════════════════════════════════════════════════════════
// APRIMORAR-DOCUMENTO — Pipeline RAG para enriquecimento de documentos
// Fluxo: Análise → Pesquisa Neural → Enriquecimento IA → Validação → Auto-Indexação
// ═══════════════════════════════════════════════════════════════════

interface EnrichRequest {
  currentText: string;
  documentType: string;
  documentTypeId?: string;
  category?: string;
  query: string;
  isJudicial: boolean;
  mode?: "light" | "full" | "legal" | "formatting" | "gaps" | "aggregate" | "chat";
  refinementMode?: boolean;
  refinementResponses?: Record<string, string>;
  aggregateResponses?: Record<string, string>;
  jurisdicao?: "brasil" | "eua" | "ambos";
  // New interactive prompt fields
  userQuery?: string;
  formattingOptions?: string[];
  userInstruction?: string;
  // Chat mode fields
  chatHistory?: Array<{ role: string; content: string }>;
  systemOverride?: string;
  contextSnippet?: string;
}

interface EnrichResult {
  enrichedText: string;
  citations: Citation[];
  validation: ValidationCheck;
  provider: string;
  researchCount: number;
  elapsed: number;
  chunksProcessed?: number;
}

// ─── Document Type Awareness ───
const TIMBRE_TYPES = new Set([
  "contrato-prestacao", "contrato-compra-venda", "contrato-locacao", "contrato-social",
  "contrato-honorarios", "contrato-trabalho", "procuracao-publica", "procuracao-particular",
  "procuracao-ad-judicia", "notificacao-extrajudicial", "declaracao-geral", "atestado",
  "distrato", "termo-acordo", "termo-quitacao",
]);

const ABNT_TYPES = new Set([
  "peticao-inicial", "contestacao", "recurso-apelacao", "recurso-agravo", "recurso-especial",
  "recurso-extraordinario", "habeas-corpus", "mandado-seguranca", "acao-popular",
  "embargos-declaracao", "embargos-execucao", "impugnacao", "reconvencao",
  "denuncia", "queixa-crime", "alegacoes-finais", "memoriais",
  "reclamacao-trabalhista", "defesa-trabalhista", "recurso-ordinario-tst",
]);

// ═══════════════════════════════════════════════════════════════════
// DOCUMENT_KNOWLEDGE — Conhecimento específico por tipo de documento
// Cada documento jurídico tem seu formato de redigir. A IA precisa
// saber diferenciar petição de contrato, criminal de civil, etc.
// ═══════════════════════════════════════════════════════════════════

interface DocumentKnowledge {
  purpose: string;
  structure: string;
  rules: string;
  addressing: string;
  closing: string;
  refinement_questions?: string[];
  example_prompt_snippet?: string;
  request_liminar?: boolean;
}

const DOCUMENT_KNOWLEDGE: Record<string, DocumentKnowledge> = {
  // ═══════════════════════════════════════
  // PENAL (34 tipos)
  // ═══════════════════════════════════════
  "habeas-corpus": {
    purpose: "Proteger a liberdade de locomoção contra constrangimento ilegal (art. 5º, LXVIII, CF/88; arts. 647-667 CPP).",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO DO PACIENTE E IMPETRANTE > AUTORIDADE COATORA > SÍNTESE DOS FATOS > DO CONSTRANGIMENTO ILEGAL > DO DIREITO (teses: ausência de justa causa, presunção de inocência, desproporcionalidade) > DO PEDIDO DE LIMINAR > DOS REQUERIMENTOS > FECHO.",
    rules: "Não incluir valor da causa; sem testemunhas signatárias; base no art. 5º, LXVIII da CF e arts. 647-667 CPP; liminar obrigatória quando ilegalidade evidente; citar súmulas do STF/STJ.",
    addressing: "AO EXCELENTÍSSIMO SENHOR DOUTOR DESEMBARGADOR PRESIDENTE DO TRIBUNAL DE JUSTIÇA DO ESTADO DE ___",
    closing: "Nestes termos, pede deferimento.\nLocal e data.\n________________________________\nAdvogado – OAB/UF nº",
    refinement_questions: ["Qual a data e o tipo da prisão (flagrante, preventiva, temporária)?", "Qual a autoridade coatora (delegado, juiz, tribunal)?", "Quais as provas ou álibis que demonstram a ilegalidade?", "Paciente tem residência fixa, emprego, família?", "Existe risco de reiteração delitiva ou fuga?"],
    request_liminar: true,
    example_prompt_snippet: `EXCELENTÍSSIMO SENHOR DOUTOR DESEMBARGADOR PRESIDENTE DO TRIBUNAL DE JUSTIÇA DO ESTADO DE...
[PACIENTE], brasileiro(a), [estado civil], [profissão], portador(a) do RG nº..., inscrito(a) no CPF sob o nº..., residente e domiciliado(a) em..., atualmente custodiado(a) no(a)..., por meio de seu advogado infra-assinado, com fulcro no artigo 5º, inciso LXVIII, da Constituição Federal e nos artigos 647 e seguintes do Código de Processo Penal, vem, respeitosamente, impetrar o presente
HABEAS CORPUS c/c PEDIDO DE LIMINAR
em favor do paciente, contra ato do(a) [AUTORIDADE COATORA], pelas razões de fato e de direito que passa a expor.
Da Síntese dos Fatos
... foi preso(a) em [data] sob acusação de... A prisão foi efetuada com base em...
Do Direito
I – Ausência de Justa Causa – art. 5º, LXV, CF c/c art. 648, I, CPP
II – Violação à Presunção de Inocência – art. 5º, LVII, CF
III – Desproporcionalidade da Prisão Preventiva – arts. 312 e 282, §6º, CPP
IV – Falha na Identificação – art. 226 CPP
Do Pedido de Liminar
Presentes o fumus boni iuris e o periculum in mora, requer liminar inaudita altera pars para imediata soltura...
Dos Requerimentos
a) Concessão da ordem de Habeas Corpus com expedição de alvará de soltura;
b) Notificação da autoridade coatora;
c) Intimação do Ministério Público para manifestação.`,
  },
  "queixa-crime": {
    purpose: "Iniciar ação penal privada.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > TIPIFICAÇÃO > DOS PEDIDOS > PROVAS.",
    rules: "Requerer citação do querelado; base no art. 30 CPP; prazo de 6 meses para oferta; sem valor da causa.",
    addressing: "AO JUÍZO DA ___ VARA CRIMINAL DA COMARCA DE ___",
    closing: "Pede deferimento. Local e data. Advogado OAB.",
    refinement_questions: ["Detalhes da ofensa pessoal?", "Provas de autoria?", "Ciência do querelado dos fatos?"],
  },
  "defesa-previa-criminal": {
    purpose: "Apresentar defesa inicial em processo criminal.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > PRELIMINARES > MÉRITO > DOS PEDIDOS.",
    rules: "Arrolar testemunhas (até 8); base no art. 396-A CPP; sem valor da causa.",
    addressing: "AO JUÍZO DA ___ VARA CRIMINAL DA COMARCA DE ___",
    closing: "Nestes termos, pede deferimento. Local e data. Advogado OAB.",
  },
  "resposta-acusacao": {
    purpose: "Responder à denúncia (art. 396 CPP).",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > PRELIMINARES > MÉRITO > DOS PEDIDOS > ROL DE TESTEMUNHAS.",
    rules: "Prazo de 10 dias; arguir nulidades; sem valor da causa.",
    addressing: "AO JUÍZO DA ___ VARA CRIMINAL DA COMARCA DE ___",
    closing: "Pede absolvição sumária. Local e data. Advogado OAB.",
  },
  "liberdade-provisoria": {
    purpose: "Solicitar liberdade provisória com ou sem fiança (art. 310 CPP).",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DO DIREITO > DOS PEDIDOS.",
    rules: "Base no art. 310 CPP; sem valor da causa; juntar documentos pessoais; arguir primariedade e bons antecedentes.",
    addressing: "AO JUÍZO DA ___ VARA CRIMINAL DA COMARCA DE ___",
    closing: "Pede deferimento. Local e data. Advogado OAB.",
    request_liminar: true,
    refinement_questions: ["Tipo de crime e circunstâncias da prisão?", "Antecedentes criminais?", "Comprovantes de residência e emprego?", "Dependentes financeiros?"],
    example_prompt_snippet: `AO JUÍZO DA ___ VARA CRIMINAL DA COMARCA DE...
[Requerente], já qualificado nos autos do processo nº..., vem requerer
LIBERDADE PROVISÓRIA COM/SEM FIANÇA
com fundamento no art. 310, III e §1º do CPP, c/c art. 5º, LXVI, da CF...
O requerente é primário, possui bons antecedentes, residência fixa e ocupação lícita...`,
  },
  "recurso-sentido-estrito": {
    purpose: "Recorrer de decisões interlocutórias (art. 581 CPP).",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DAS RAZÕES > DOS PEDIDOS.",
    rules: "Prazo de 5 dias; sem valor da causa; endereçar ao tribunal.",
    addressing: "AO TRIBUNAL DE JUSTIÇA DO ESTADO DE ___",
    closing: "Pede provimento. Local e data. Advogado OAB.",
  },
  "alegacoes-finais-criminais": {
    purpose: "Apresentar memoriais ou alegações finais.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DO DIREITO > DOS PEDIDOS.",
    rules: "Prazo de 5 dias; base no art. 403 CPP; sem valor da causa.",
    addressing: "AO JUÍZO DA ___ VARA CRIMINAL DA COMARCA DE ___",
    closing: "Pede absolvição. Local e data. Advogado OAB.",
  },
  "revisao-criminal": {
    purpose: "Revisar condenação transitada em julgado.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DO DIREITO > DOS PEDIDOS.",
    rules: "Base no art. 621 CPP; sem valor da causa; juntar acórdão.",
    addressing: "AO TRIBUNAL DE JUSTIÇA DO ESTADO DE ___",
    closing: "Pede revisão. Local e data. Advogado OAB.",
  },
  "revogacao-prisao-preventiva": {
    purpose: "Solicitar revogação de prisão preventiva (art. 316 CPP).",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DO DIREITO > DOS PEDIDOS.",
    rules: "Base no art. 316 CPP; sem valor da causa; arguir ausência de requisitos do art. 312 CPP; propor medidas cautelares alternativas (art. 319 CPP).",
    addressing: "AO JUÍZO DA ___ VARA CRIMINAL DA COMARCA DE ___",
    closing: "Pede deferimento. Local e data. Advogado OAB.",
    request_liminar: true,
    refinement_questions: ["Há quanto tempo está preso?", "Quais requisitos do art. 312 CPP não estão presentes?", "Condições pessoais favoráveis?"],
    example_prompt_snippet: `... vem requerer a REVOGAÇÃO DA PRISÃO PREVENTIVA com fundamento no art. 316, caput, do CPP...
Os requisitos autorizadores da custódia cautelar (art. 312 CPP) não mais subsistem...
O(a) requerente demonstra vínculos sólidos com o distrito da culpa, possui residência fixa, emprego e família constituída...
Subsidiariamente, requer a aplicação de medidas cautelares diversas (art. 319 CPP)...`,
  },
  "apelacao-criminal": {
    purpose: "Recorrer de sentença criminal.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DAS RAZÕES > DOS PEDIDOS.",
    rules: "Prazo de 5 dias; base no art. 593 CPP; sem valor da causa.",
    addressing: "AO TRIBUNAL DE JUSTIÇA DO ESTADO DE ___",
    closing: "Pede provimento. Local e data. Advogado OAB.",
  },
  "contrarrazoes-apelacao-criminal": {
    purpose: "Responder ao recurso de apelação.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DAS CONTRARRAZÕES > DOS PEDIDOS.",
    rules: "Prazo de 8 dias; base no art. 600 CPP; sem valor da causa.",
    addressing: "AO TRIBUNAL DE JUSTIÇA DO ESTADO DE ___",
    closing: "Pede improvimento. Local e data. Advogado OAB.",
  },
  "embargos-declaracao-penal": {
    purpose: "Esclarecer obscuridade/omissão em decisão penal.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DAS RAZÕES > DOS PEDIDOS.",
    rules: "Prazo de 2 dias; base no art. 619 CPP; sem valor da causa.",
    addressing: "AO JUÍZO DA ___ VARA CRIMINAL DA COMARCA DE ___",
    closing: "Pede provimento. Local e data. Advogado OAB.",
  },
  "recurso-especial-penal": {
    purpose: "Recorrer ao STJ em matéria penal.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DAS RAZÕES > DOS PEDIDOS.",
    rules: "Prazo de 15 dias; base no art. 105, III CF; sem valor da causa.",
    addressing: "AO SUPERIOR TRIBUNAL DE JUSTIÇA",
    closing: "Pede provimento. Local e data. Advogado OAB.",
  },
  "agravo-execucao-penal": {
    purpose: "Recorrer em execução penal.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DAS RAZÕES > DOS PEDIDOS.",
    rules: "Prazo de 5 dias; base na Lei 7.210/1984; sem valor da causa.",
    addressing: "AO TRIBUNAL DE JUSTIÇA DO ESTADO DE ___",
    closing: "Pede provimento. Local e data. Advogado OAB.",
  },
  "progressao-regime": {
    purpose: "Solicitar progressão de regime prisional.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DO DIREITO > DOS PEDIDOS.",
    rules: "Base no art. 112 LEP; sem valor da causa; juntar atestado de comportamento.",
    addressing: "AO JUÍZO DA EXECUÇÃO PENAL DA COMARCA DE ___",
    closing: "Pede deferimento. Local e data. Advogado OAB.",
  },
  "livramento-condicional": {
    purpose: "Solicitar livramento condicional.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DO DIREITO > DOS PEDIDOS.",
    rules: "Base no art. 83 CP; sem valor da causa; requisitos de tempo e comportamento.",
    addressing: "AO JUÍZO DA EXECUÇÃO PENAL DA COMARCA DE ___",
    closing: "Pede deferimento. Local e data. Advogado OAB.",
  },
  "relaxamento-prisao": {
    purpose: "Relaxar prisão ilegal (art. 5º, LXV, CF/88).",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DA ILEGALIDADE DA PRISÃO > DO DIREITO > DOS PEDIDOS.",
    rules: "Base no art. 5º, LXV CF; sem valor da causa; urgência; demonstrar vício formal ou material na prisão.",
    addressing: "AO JUÍZO DA ___ VARA CRIMINAL DA COMARCA DE ___",
    closing: "Pede deferimento. Local e data. Advogado OAB.",
    request_liminar: true,
    refinement_questions: ["Qual o vício formal ou material da prisão?", "Houve excesso de prazo?", "Auto de prisão em flagrante possui irregularidades?"],
    example_prompt_snippet: `... vem requerer o RELAXAMENTO DA PRISÃO EM FLAGRANTE com fundamento no art. 5º, inciso LXV, da CF/88...
A prisão é manifestamente ilegal pois [descrever vício]...
O auto de prisão em flagrante padece de nulidade insanável...`,
  },
  "manifestacao-penal": {
    purpose: "Manifestação genérica em processo criminal.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DO DIREITO > DOS PEDIDOS.",
    rules: "Adaptável; sem valor da causa; base no CPP.",
    addressing: "AO JUÍZO DA ___ VARA CRIMINAL DA COMARCA DE ___",
    closing: "Pede deferimento. Local e data. Advogado OAB.",
  },
  "denuncia": {
    purpose: "Peça acusatória do Ministério Público.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > TIPIFICAÇÃO > DOS PEDIDOS > ROL DE TESTEMUNHAS.",
    rules: "Base no art. 41 CPP; sem valor da causa; oferecida pelo MP.",
    addressing: "AO JUÍZO DA ___ VARA CRIMINAL DA COMARCA DE ___",
    closing: "Pede recebimento. Local e data. Promotor de Justiça.",
  },
  "emenda-inicial-penal": {
    purpose: "Corrigir a peça inicial penal.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DAS CORREÇÕES > DOS PEDIDOS.",
    rules: "Base no art. 569 CPP; sem valor da causa.",
    addressing: "AO JUÍZO DA ___ VARA CRIMINAL DA COMARCA DE ___",
    closing: "Pede deferimento. Local e data. Advogado OAB.",
  },
  "replica-criminal": {
    purpose: "Réplica às alegações da defesa.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DAS CONTRARRAZÕES > DOS PEDIDOS.",
    rules: "Prazo de 3 dias; base no art. 411 CPP; sem valor da causa.",
    addressing: "AO JUÍZO DA ___ VARA CRIMINAL DA COMARCA DE ___",
    closing: "Pede condenação. Local e data. Promotor de Justiça.",
  },
  "excecao-suspeicao-penal": {
    purpose: "Alegar suspeição do magistrado.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DO DIREITO > DOS PEDIDOS.",
    rules: "Base no art. 95 CPP; sem valor da causa; incidente autônomo.",
    addressing: "AO TRIBUNAL DE JUSTIÇA DO ESTADO DE ___",
    closing: "Pede provimento. Local e data. Advogado OAB.",
  },
  "revogacao-medidas-protetivas": {
    purpose: "Revogar medidas protetivas.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DO DIREITO > DOS PEDIDOS.",
    rules: "Base na Lei Maria da Penha (11.340/2006); sem valor da causa.",
    addressing: "AO JUÍZO DA ___ VARA DE VIOLÊNCIA DOMÉSTICA DA COMARCA DE ___",
    closing: "Pede deferimento. Local e data. Advogado OAB.",
  },
  "quesitos-periciais-penal": {
    purpose: "Apresentar quesitos para perícia criminal.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS QUESITOS > DOS PEDIDOS.",
    rules: "Base no art. 176 CPP; sem valor da causa.",
    addressing: "AO JUÍZO DA ___ VARA CRIMINAL DA COMARCA DE ___",
    closing: "Pede deferimento. Local e data. Advogado OAB.",
  },
  "contrarrazoes-rese": {
    purpose: "Responder ao RESE.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DAS CONTRARRAZÕES > DOS PEDIDOS.",
    rules: "Prazo de 2 dias; base no art. 589 CPP; sem valor da causa.",
    addressing: "AO TRIBUNAL DE JUSTIÇA DO ESTADO DE ___",
    closing: "Pede improvimento. Local e data. Advogado OAB.",
  },
  "recurso-ordinario-constitucional-penal": {
    purpose: "ROC em matéria penal.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DAS RAZÕES > DOS PEDIDOS.",
    rules: "Base no art. 102, II CF; sem valor da causa.",
    addressing: "AO SUPREMO TRIBUNAL FEDERAL",
    closing: "Pede provimento. Local e data. Advogado OAB.",
  },
  "memoriais-recursais-penal": {
    purpose: "Memoriais em fase recursal penal.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DO DIREITO > DOS PEDIDOS.",
    rules: "Base no CPP; sem valor da causa; substitui sustentação oral.",
    addressing: "AO TRIBUNAL DE JUSTIÇA DO ESTADO DE ___",
    closing: "Pede provimento. Local e data. Advogado OAB.",
  },
  "contrarrazoes-resp-penal": {
    purpose: "Responder ao recurso especial penal.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DAS CONTRARRAZÕES > DOS PEDIDOS.",
    rules: "Prazo de 15 dias; base no regimento do STJ; sem valor da causa.",
    addressing: "AO SUPERIOR TRIBUNAL DE JUSTIÇA",
    closing: "Pede improvimento. Local e data. Advogado OAB.",
  },
  "contrarrazoes-ed-penal": {
    purpose: "Responder aos embargos de declaração penais.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DAS CONTRARRAZÕES > DOS PEDIDOS.",
    rules: "Prazo de 2 dias; base no art. 620 CPP; sem valor da causa.",
    addressing: "AO JUÍZO DA ___ VARA CRIMINAL DA COMARCA DE ___",
    closing: "Pede improvimento. Local e data. Advogado OAB.",
  },
  "restituicao-coisa-apreendida": {
    purpose: "Solicitar restituição de bens apreendidos.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DO DIREITO > DOS PEDIDOS.",
    rules: "Base no art. 118 CPP; sem valor da causa; provar propriedade.",
    addressing: "AO JUÍZO DA ___ VARA CRIMINAL DA COMARCA DE ___",
    closing: "Pede deferimento. Local e data. Advogado OAB.",
  },
  "peticao-incidente-execucao-penal": {
    purpose: "Incidente em execução penal.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DO DIREITO > DOS PEDIDOS.",
    rules: "Base na LEP; sem valor da causa; para unificação de penas, etc.",
    addressing: "AO JUÍZO DA EXECUÇÃO PENAL DA COMARCA DE ___",
    closing: "Pede deferimento. Local e data. Advogado OAB.",
  },
  "contrarrazoes-agravo-execucao-penal": {
    purpose: "Responder ao agravo em execução penal.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DAS CONTRARRAZÕES > DOS PEDIDOS.",
    rules: "Prazo de 5 dias; base na LEP; sem valor da causa.",
    addressing: "AO TRIBUNAL DE JUSTIÇA DO ESTADO DE ___",
    closing: "Pede improvimento. Local e data. Advogado OAB.",
  },
  "indulto-natalino": {
    purpose: "Solicitar indulto natalino.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DO DIREITO > DOS PEDIDOS.",
    rules: "Base em decreto presidencial anual; sem valor da causa; requisitos de tempo e comportamento.",
    addressing: "AO JUÍZO DA EXECUÇÃO PENAL DA COMARCA DE ___",
    closing: "Pede deferimento. Local e data. Advogado OAB.",
  },
  "revogacao-preventiva-cautelares": {
    purpose: "Revogar preventiva com aplicação de medidas cautelares.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DO DIREITO > DOS PEDIDOS.",
    rules: "Base no art. 319 CPP; sem valor da causa; sugerir alternativas à prisão.",
    addressing: "AO JUÍZO DA ___ VARA CRIMINAL DA COMARCA DE ___",
    closing: "Pede deferimento. Local e data. Advogado OAB.",
  },

  // ═══════════════════════════════════════
  // CIVIL (49 tipos)
  // ═══════════════════════════════════════
  "peticao-inicial": {
    purpose: "Peça inaugural de demanda judicial (art. 319 CPC).",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO DAS PARTES > DOS FATOS > DO DIREITO > DOS PEDIDOS (especificados e numerados) > VALOR DA CAUSA > REQUERIMENTOS (provas, justiça gratuita, etc.) > FECHO.",
    rules: "Incluir valor da causa (art. 292 CPC); base no art. 319 CPC; juntar documentos essenciais; pedidos específicos e numerados.",
    addressing: "AO JUÍZO DA ___ VARA CÍVEL DA COMARCA DE ___",
    closing: "Nestes termos, pede deferimento. Local e data. Advogado OAB.",
    refinement_questions: ["Renda mensal do autor / hipossuficiência?", "Ciência do réu dos fatos?", "Danos morais quantificados?", "Provas adicionais (contratos, extratos)?", "Pedido de tutela de urgência?"],
    example_prompt_snippet: `AO JUÍZO DA ___ VARA CÍVEL DA COMARCA DE...
[Autor], brasileiro(a), [estado civil], [profissão], portador(a) do RG nº..., CPF nº..., residente em..., por seu advogado (procuração anexa), vem, respeitosamente, propor
AÇÃO DE INDENIZAÇÃO POR DANOS MATERIAIS E MORAIS
em face de [Réu], pessoa jurídica de direito privado, CNPJ nº..., com sede em...
DOS FATOS
Em [data], o(a) autor(a) celebrou contrato de...
DO DIREITO
I – Da Responsabilidade Civil – arts. 186 e 927 do CC/2002
II – Da Aplicação do CDC – arts. 6º, 14 e 39
III – Dos Danos Morais – Súmula 37/STJ
DOS PEDIDOS
Ante o exposto, requer:
a) A citação do réu para contestar;
b) A condenação ao pagamento de danos materiais no valor de R$...;
c) A condenação ao pagamento de danos morais em valor não inferior a R$...;
d) A concessão dos benefícios da justiça gratuita (art. 98 CPC).
Dá-se à causa o valor de R$...`,
  },
  "contestacao": {
    purpose: "Apresentar defesa em ação judicial (art. 335 CPC).",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > PRELIMINARES > MÉRITO > DOS PEDIDOS > ROL DE TESTEMUNHAS.",
    rules: "Prazo de 15 dias; base no art. 335 CPC; impugnar especificadamente cada fato (art. 341 CPC); arguir preliminares (art. 337 CPC).",
    addressing: "AO JUÍZO DA ___ VARA CÍVEL DA COMARCA DE ___",
    closing: "Pede improcedência. Local e data. Advogado OAB.",
    refinement_questions: ["Preliminares específicas (prescrição, incompetência)?", "Contraprovas disponíveis?", "Impacto financeiro no réu?"],
    example_prompt_snippet: `[Réu], já qualificado nos autos da ação nº..., vem, por seu advogado, apresentar
CONTESTAÇÃO
aos termos da ação proposta por [Autor], pelas razões de fato e de direito a seguir expostas.
DAS PRELIMINARES
I – Da Prescrição – art. 206 do CC/2002
DO MÉRITO
II – Da Impugnação Específica dos Fatos – art. 341 CPC
III – Da Inexistência de Nexo Causal
DOS PEDIDOS
Ante o exposto, requer a total improcedência dos pedidos do autor...`,
  },
  "replica": {
    purpose: "Réplica do autor à contestação.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DAS CONTRARRAZÕES > DOS PEDIDOS.",
    rules: "Prazo de 15 dias; base no art. 350 CPC; rebater defesa.",
    addressing: "AO JUÍZO DA ___ VARA CÍVEL DA COMARCA DE ___",
    closing: "Pede provimento. Local e data. Advogado OAB.",
  },
  "tutela-provisoria": {
    purpose: "Solicitar tutela de urgência ou evidência (arts. 300-310 CPC).",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DO FUMUS BONI IURIS > DO PERICULUM IN MORA > DOS PEDIDOS.",
    rules: "Base nos arts. 300-310 CPC; demonstrar fumus boni iuris e periculum in mora; pode ser antecedente ou incidental.",
    addressing: "AO JUÍZO DA ___ VARA CÍVEL DA COMARCA DE ___",
    closing: "Pede deferimento. Local e data. Advogado OAB.",
    request_liminar: true,
    refinement_questions: ["Qual o dano iminente ou irreparável?", "Quais provas de verossimilhança das alegações?", "Urgência específica (prazo, risco)?"],
    example_prompt_snippet: `... vem requerer a concessão de TUTELA PROVISÓRIA DE URGÊNCIA com fundamento nos arts. 300 e seguintes do CPC...
Do Fumus Boni Iuris
A verossimilhança das alegações está demonstrada por...
Do Periculum in Mora
O perigo de dano irreparável ou de difícil reparação é evidente, pois...
Dos Pedidos
Requer a concessão da tutela antecipada para determinar que o réu...`,
  },
  "apelacao": {
    purpose: "Recorrer contra sentença de 1º grau.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DAS RAZÕES > DOS PEDIDOS.",
    rules: "Prazo de 15 dias; base no art. 1009 CPC; preparar recurso.",
    addressing: "AO TRIBUNAL DE JUSTIÇA DO ESTADO DE ___",
    closing: "Pede provimento. Local e data. Advogado OAB.",
  },
  "contrarrazoes-apelacao": {
    purpose: "Responder ao recurso de apelação.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DAS CONTRARRAZÕES > DOS PEDIDOS.",
    rules: "Prazo de 15 dias; base no art. 1010 CPC.",
    addressing: "AO TRIBUNAL DE JUSTIÇA DO ESTADO DE ___",
    closing: "Pede improvimento. Local e data. Advogado OAB.",
  },
  "agravo-instrumento": {
    purpose: "Recorrer contra decisão interlocutória.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DAS RAZÕES > DOS PEDIDOS.",
    rules: "Prazo de 15 dias; base no art. 1015 CPC; juntar cópias.",
    addressing: "AO TRIBUNAL DE JUSTIÇA DO ESTADO DE ___",
    closing: "Pede provimento. Local e data. Advogado OAB.",
  },
  "agravo-interno": {
    purpose: "Recorrer contra decisão monocrática.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DAS RAZÕES > DOS PEDIDOS.",
    rules: "Prazo de 15 dias; base no art. 1021 CPC.",
    addressing: "AO TRIBUNAL DE JUSTIÇA DO ESTADO DE ___",
    closing: "Pede provimento. Local e data. Advogado OAB.",
  },
  "embargos-declaracao": {
    purpose: "Esclarecer obscuridade ou omissão.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DAS RAZÕES > DOS PEDIDOS.",
    rules: "Prazo de 5 dias; base no art. 1022 CPC.",
    addressing: "AO JUÍZO DA ___ VARA CÍVEL DA COMARCA DE ___",
    closing: "Pede provimento. Local e data. Advogado OAB.",
  },
  "cumprimento-sentenca": {
    purpose: "Executar decisão judicial transitada em julgado (art. 523 CPC).",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DO TÍTULO EXECUTIVO > DA MEMÓRIA DE CÁLCULO > DOS PEDIDOS.",
    rules: "Base no art. 523 CPC; requerer intimação para pagamento em 15 dias sob pena de multa de 10%; penhora se inadimplência.",
    addressing: "AO JUÍZO DA ___ VARA CÍVEL DA COMARCA DE ___",
    closing: "Pede deferimento. Local e data. Advogado OAB.",
    refinement_questions: ["Valor atualizado do débito?", "Bens conhecidos do devedor?", "Houve pagamento parcial?"],
    example_prompt_snippet: `... vem requerer o CUMPRIMENTO DE SENTENÇA em face de [Executado], com fundamento no art. 523 do CPC...
O título executivo judicial (sentença/acórdão de fls...) condenou o executado ao pagamento de...
Da Memória de Cálculo
Valor principal: R$...
Correção monetária (INPC/IPCA-E): R$...
Juros de mora (1% a.m.): R$...
Total atualizado: R$...
Requer a intimação do executado para pagamento em 15 dias, sob pena de multa de 10% e honorários de 10% (art. 523, §1º, CPC)...`,
  },
  "impugnacao-cumprimento-sentenca": {
    purpose: "Defesa em cumprimento de sentença.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > PRELIMINARES > MÉRITO > DOS PEDIDOS.",
    rules: "Prazo de 15 dias; base no art. 525 CPC.",
    addressing: "AO JUÍZO DA ___ VARA CÍVEL DA COMARCA DE ___",
    closing: "Pede improcedência. Local e data. Advogado OAB.",
  },
  "manifestacao": {
    purpose: "Manifestação genérica nos autos.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DO DIREITO > DOS PEDIDOS.",
    rules: "Adaptável; base no CPC.",
    addressing: "AO JUÍZO DA ___ VARA CÍVEL DA COMARCA DE ___",
    closing: "Pede deferimento. Local e data. Advogado OAB.",
  },
  "alegacoes-finais": {
    purpose: "Memoriais em processo cível.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DO DIREITO > DOS PEDIDOS.",
    rules: "Prazo de 15 dias; base no art. 364 CPC.",
    addressing: "AO JUÍZO DA ___ VARA CÍVEL DA COMARCA DE ___",
    closing: "Pede procedência. Local e data. Advogado OAB.",
  },
  "recurso-especial": {
    purpose: "Recorrer ao STJ.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DAS RAZÕES > DOS PEDIDOS.",
    rules: "Prazo de 15 dias; base no art. 105, III CF.",
    addressing: "AO SUPERIOR TRIBUNAL DE JUSTIÇA",
    closing: "Pede provimento. Local e data. Advogado OAB.",
  },
  "mandado-seguranca": {
    purpose: "Proteger direito líquido e certo contra ato ilegal ou abusivo de autoridade (Lei 12.016/2009).",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DA AUTORIDADE COATORA > DOS FATOS > DO DIREITO LÍQUIDO E CERTO > DO PEDIDO DE LIMINAR > DOS PEDIDOS.",
    rules: "Base na Lei 12.016/2009; liminar obrigatória quando evidente ilegalidade; prazo decadencial de 120 dias; prova pré-constituída.",
    addressing: "AO EXCELENTÍSSIMO SENHOR DOUTOR JUIZ DE DIREITO DA ___ VARA DE FAZENDA PÚBLICA DA COMARCA DE ___",
    closing: "Pede concessão da segurança. Local e data. Advogado OAB.",
    request_liminar: true,
    refinement_questions: ["Qual o ato ilegal ou abusivo da autoridade?", "Qual a autoridade coatora?", "Quais documentos comprovam o direito líquido e certo?", "Há urgência para liminar?"],
    example_prompt_snippet: `... vem impetrar MANDADO DE SEGURANÇA COM PEDIDO DE LIMINAR contra ato do(a) [AUTORIDADE COATORA]...
com fundamento no art. 5º, LXIX, da CF/88 e na Lei nº 12.016/2009...
Do Direito Líquido e Certo
O direito do impetrante é líquido e certo, comprovado pela documentação anexa...
Do Pedido de Liminar
Presentes os requisitos do art. 7º, III, da Lei 12.016/2009 (relevância do fundamento + ineficácia da medida se concedida ao final)...`,
  },
  "mandado-seguranca-coletivo": {
    purpose: "MS impetrado por entidade/sindicato.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DO DIREITO > DOS PEDIDOS.",
    rules: "Base na Lei 12.016/2009; legitimidade coletiva.",
    addressing: "AO TRIBUNAL DE JUSTIÇA DO ESTADO DE ___",
    closing: "Pede concessão. Local e data. Advogado OAB.",
  },
  "acao-popular": {
    purpose: "Proteger patrimônio público.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DO DIREITO > DOS PEDIDOS.",
    rules: "Base na Lei 4.717/1965; cidadão como autor.",
    addressing: "AO JUÍZO DA ___ VARA DA FAZENDA PÚBLICA DA COMARCA DE ___",
    closing: "Pede procedência. Local e data. Advogado OAB.",
  },
  "acao-civil-publica": {
    purpose: "Tutelar interesses difusos e coletivos.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DO DIREITO > DOS PEDIDOS.",
    rules: "Base na Lei 7.347/1985; MP como autor comum.",
    addressing: "AO JUÍZO DA ___ VARA CÍVEL DA COMARCA DE ___",
    closing: "Pede procedência. Local e data. Promotor de Justiça.",
  },
  "reclamacao-constitucional": {
    purpose: "Garantir autoridade de decisão do tribunal.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DO DIREITO > DOS PEDIDOS.",
    rules: "Base no art. 988 CPC; para STF/STJ.",
    addressing: "AO SUPREMO TRIBUNAL FEDERAL",
    closing: "Pede provimento. Local e data. Advogado OAB.",
  },
  "execucao-titulo-extrajudicial": {
    purpose: "Executar título fora do processo.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DO DIREITO > DOS PEDIDOS > TÍTULO.",
    rules: "Base no art. 784 CPC; juntar título executivo.",
    addressing: "AO JUÍZO DA ___ VARA CÍVEL DA COMARCA DE ___",
    closing: "Pede deferimento. Local e data. Advogado OAB.",
  },
  "embargos-execucao": {
    purpose: "Defesa em ação de execução.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > PRELIMINARES > MÉRITO > DOS PEDIDOS.",
    rules: "Prazo de 15 dias; base no art. 914 CPC.",
    addressing: "AO JUÍZO DA ___ VARA CÍVEL DA COMARCA DE ___",
    closing: "Pede improcedência. Local e data. Advogado OAB.",
  },
  "embargos-terceiro": {
    purpose: "Proteger posse de terceiro.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DO DIREITO > DOS PEDIDOS.",
    rules: "Base no art. 674 CPC; liminar possível.",
    addressing: "AO JUÍZO DA ___ VARA CÍVEL DA COMARCA DE ___",
    closing: "Pede deferimento. Local e data. Advogado OAB.",
  },
  "acao-rescisoria": {
    purpose: "Rescindir sentença transitada.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DO DIREITO > DOS PEDIDOS.",
    rules: "Base no art. 966 CPC; prazo de 2 anos.",
    addressing: "AO TRIBUNAL DE JUSTIÇA DO ESTADO DE ___",
    closing: "Pede procedência. Local e data. Advogado OAB.",
  },
  "recurso-inominado": {
    purpose: "Recurso em JEC.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DAS RAZÕES > DOS PEDIDOS.",
    rules: "Prazo de 10 dias; base na Lei 9.099/1995.",
    addressing: "AO TURMA RECURSAL DO JUIZADO ESPECIAL CÍVEL",
    closing: "Pede provimento. Local e data. Advogado OAB.",
  },
  "peticao-inicial-jec": {
    purpose: "Ação no Juizado Especial Cível.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DO DIREITO > DOS PEDIDOS.",
    rules: "Valor até 40 salários; base na Lei 9.099/1995; simplificada.",
    addressing: "AO JUIZADO ESPECIAL CÍVEL DA COMARCA DE ___",
    closing: "Pede deferimento. Local e data. Advogado OAB.",
  },
  "acao-monitoria": {
    purpose: "Cobrança via procedimento monitório.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DO DIREITO > DOS PEDIDOS.",
    rules: "Base no art. 700 CPC; juntar prova escrita.",
    addressing: "AO JUÍZO DA ___ VARA CÍVEL DA COMARCA DE ___",
    closing: "Pede deferimento. Local e data. Advogado OAB.",
  },
  "desconsideracao-personalidade-juridica": {
    purpose: "Incidente para desconsiderar PJ.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DO DIREITO > DOS PEDIDOS.",
    rules: "Base no art. 133 CPC; demonstrar abuso.",
    addressing: "AO JUÍZO DA ___ VARA CÍVEL DA COMARCA DE ___",
    closing: "Pede deferimento. Local e data. Advogado OAB.",
  },
  "emenda-inicial": {
    purpose: "Corrigir/complementar petição inicial.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DAS CORREÇÕES > DOS PEDIDOS.",
    rules: "Base no art. 321 CPC; prazo de 15 dias.",
    addressing: "AO JUÍZO DA ___ VARA CÍVEL DA COMARCA DE ___",
    closing: "Pede deferimento. Local e data. Advogado OAB.",
  },
  "recuperacao-judicial": {
    purpose: "Recuperação judicial de empresa.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DO DIREITO > DOS PEDIDOS > PLANO.",
    rules: "Base na Lei 11.101/2005; juntar balanços.",
    addressing: "AO JUÍZO DA ___ VARA EMPRESARIAL DA COMARCA DE ___",
    closing: "Pede deferimento. Local e data. Advogado OAB.",
  },
  "manifestacao-impugnacao": {
    purpose: "Resposta à impugnação ao cumprimento.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DAS CONTRARRAZÕES > DOS PEDIDOS.",
    rules: "Prazo de 15 dias; base no art. 525 CPC.",
    addressing: "AO JUÍZO DA ___ VARA CÍVEL DA COMARCA DE ___",
    closing: "Pede improcedência. Local e data. Advogado OAB.",
  },
  "contraminuta-agravo-instrumento": {
    purpose: "Resposta ao agravo de instrumento.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DAS CONTRARRAZÕES > DOS PEDIDOS.",
    rules: "Prazo de 15 dias; base no art. 1019 CPC.",
    addressing: "AO TRIBUNAL DE JUSTIÇA DO ESTADO DE ___",
    closing: "Pede improvimento. Local e data. Advogado OAB.",
  },
  "contraminuta-agravo-interno": {
    purpose: "Resposta ao agravo interno.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DAS CONTRARRAZÕES > DOS PEDIDOS.",
    rules: "Prazo de 15 dias; base no art. 1021 CPC.",
    addressing: "AO TRIBUNAL DE JUSTIÇA DO ESTADO DE ___",
    closing: "Pede improvimento. Local e data. Advogado OAB.",
  },
  "recurso-ordinario-constitucional": {
    purpose: "ROC em matéria cível.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DAS RAZÕES > DOS PEDIDOS.",
    rules: "Base no art. 102, II CF.",
    addressing: "AO SUPREMO TRIBUNAL FEDERAL",
    closing: "Pede provimento. Local e data. Advogado OAB.",
  },
  "memoriais-recursais": {
    purpose: "Memoriais em fase recursal cível.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DO DIREITO > DOS PEDIDOS.",
    rules: "Base no CPC; substitui sustentação.",
    addressing: "AO TRIBUNAL DE JUSTIÇA DO ESTADO DE ___",
    closing: "Pede provimento. Local e data. Advogado OAB.",
  },
  "contrarrazoes-resp": {
    purpose: "Resposta ao recurso especial cível.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DAS CONTRARRAZÕES > DOS PEDIDOS.",
    rules: "Prazo de 15 dias; base no regimento do STJ.",
    addressing: "AO SUPERIOR TRIBUNAL DE JUSTIÇA",
    closing: "Pede improvimento. Local e data. Advogado OAB.",
  },
  "agravo-recurso-especial": {
    purpose: "AREsp contra inadmissão de REsp.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DAS RAZÕES > DOS PEDIDOS.",
    rules: "Prazo de 15 dias; base no art. 1.042 CPC.",
    addressing: "AO SUPERIOR TRIBUNAL DE JUSTIÇA",
    closing: "Pede provimento. Local e data. Advogado OAB.",
  },
  "recurso-extraordinario": {
    purpose: "RE ao STF em matéria cível.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DAS RAZÕES > DOS PEDIDOS.",
    rules: "Prazo de 15 dias; base no art. 102, III CF.",
    addressing: "AO SUPREMO TRIBUNAL FEDERAL",
    closing: "Pede provimento. Local e data. Advogado OAB.",
  },
  "embargos-divergencia": {
    purpose: "Uniformizar jurisprudência.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DAS RAZÕES > DOS PEDIDOS.",
    rules: "Prazo de 15 dias; base no art. 1.043 CPC.",
    addressing: "AO SUPERIOR TRIBUNAL DE JUSTIÇA",
    closing: "Pede provimento. Local e data. Advogado OAB.",
  },
  "embargos-execucao-fiscal": {
    purpose: "Defesa em execução fiscal.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > PRELIMINARES > MÉRITO > DOS PEDIDOS.",
    rules: "Base na Lei 6.830/1980; prazo de 30 dias.",
    addressing: "AO JUÍZO DA ___ VARA DA FAZENDA PÚBLICA DA COMARCA DE ___",
    closing: "Pede improcedência. Local e data. Advogado OAB.",
  },
  "excecao-pre-executividade": {
    purpose: "Defesa sem garantia do juízo.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DO DIREITO > DOS PEDIDOS.",
    rules: "Para matérias de ordem pública; base em jurisprudência.",
    addressing: "AO JUÍZO DA ___ VARA DA FAZENDA PÚBLICA DA COMARCA DE ___",
    closing: "Pede extinção. Local e data. Advogado OAB.",
  },
  "impugnacao-penhora": {
    purpose: "Impugnar ato de penhora.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DO DIREITO > DOS PEDIDOS.",
    rules: "Prazo de 15 dias; base no art. 847 CPC.",
    addressing: "AO JUÍZO DA ___ VARA CÍVEL DA COMARCA DE ___",
    closing: "Pede deferimento. Local e data. Advogado OAB.",
  },
  "adjudicacao-compulsoria": {
    purpose: "Ação para outorga de escritura.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DO DIREITO > DOS PEDIDOS.",
    rules: "Base no art. 1.418 Código Civil; juntar compromisso de venda.",
    addressing: "AO JUÍZO DA ___ VARA CÍVEL DA COMARCA DE ___",
    closing: "Pede procedência. Local e data. Advogado OAB.",
  },
  "sustacao-protesto": {
    purpose: "Ação cautelar para sustar protesto.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DO DIREITO > DOS PEDIDOS.",
    rules: "Base na Lei 9.492/1997; liminar possível.",
    addressing: "AO JUÍZO DA ___ VARA CÍVEL DA COMARCA DE ___",
    closing: "Pede deferimento. Local e data. Advogado OAB.",
  },
  "busca-apreensao-menor": {
    purpose: "Busca e apreensão com tutela de urgência.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DO DIREITO > DOS PEDIDOS.",
    rules: "Base no ECA (Lei 8.069/1990); prioridade absoluta.",
    addressing: "AO JUÍZO DA VARA DA INFÂNCIA E JUVENTUDE DA COMARCA DE ___",
    closing: "Pede deferimento. Local e data. Advogado OAB.",
  },
  "acordo-judicial-extincao": {
    purpose: "Acordo com pedido de extinção.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS TERMOS DO ACORDO > DOS PEDIDOS.",
    rules: "Base no art. 487, III CPC; homologação judicial.",
    addressing: "AO JUÍZO DA ___ VARA CÍVEL DA COMARCA DE ___",
    closing: "Pede homologação. Local e data. Advogado OAB.",
  },
  "cumprimento-provisorio-sentenca": {
    purpose: "Execução provisória de sentença.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DO DIREITO > DOS PEDIDOS.",
    rules: "Base no art. 520 CPC; caução possível.",
    addressing: "AO JUÍZO DA ___ VARA CÍVEL DA COMARCA DE ___",
    closing: "Pede deferimento. Local e data. Advogado OAB.",
  },
  "contrarrazoes-recurso-inominado": {
    purpose: "Resposta ao recurso inominado.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DAS CONTRARRAZÕES > DOS PEDIDOS.",
    rules: "Prazo de 10 dias; base na Lei 9.099/1995.",
    addressing: "AO TURMA RECURSAL DO JUIZADO ESPECIAL CÍVEL",
    closing: "Pede improvimento. Local e data. Advogado OAB.",
  },
  "quesitos-periciais": {
    purpose: "Apresentar quesitos para perícia.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS QUESITOS > DOS PEDIDOS.",
    rules: "Base no art. 465 CPC.",
    addressing: "AO JUÍZO DA ___ VARA CÍVEL DA COMARCA DE ___",
    closing: "Pede deferimento. Local e data. Advogado OAB.",
  },
  "manifestacao-producao-provas": {
    purpose: "Requerer produção de provas.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DO DIREITO > DOS PEDIDOS.",
    rules: "Base no art. 369 CPC; especificar provas.",
    addressing: "AO JUÍZO DA ___ VARA CÍVEL DA COMARCA DE ___",
    closing: "Pede deferimento. Local e data. Advogado OAB.",
  },

  // ═══════════════════════════════════════
  // TRABALHISTA (28 tipos)
  // ═══════════════════════════════════════
  "reclamacao-trabalhista": {
    purpose: "Iniciar ação trabalhista (art. 840 CLT).",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO DAS PARTES > DOS FATOS > DO DIREITO > DOS PEDIDOS (numerados com valores) > VALOR DA CAUSA.",
    rules: "Citar CLT e legislação trabalhista; base no art. 840 CLT; pedidos líquidos (art. 840, §1º CLT com Reforma); juntar CTPS, contracheques.",
    addressing: "À ___ VARA DO TRABALHO DA COMARCA DE ___",
    closing: "Pede deferimento. Local e data. Advogado OAB.",
    refinement_questions: ["Horas extras detalhadas (quantidade semanal)?", "Renda mensal do reclamante?", "Provas de vínculo empregatício?", "Testemunhas disponíveis?", "Verbas rescisórias devidas?"],
    example_prompt_snippet: `À ___ VARA DO TRABALHO DA COMARCA DE...
[Reclamante], brasileiro(a), [estado civil], [profissão], CTPS nº..., CPF nº..., residente em..., vem propor
RECLAMAÇÃO TRABALHISTA
em face de [Reclamada], CNPJ nº..., com sede em...
DOS FATOS
O reclamante foi admitido em [data] para exercer a função de..., com salário de R$...
Foi dispensado sem justa causa em [data], sem receber as verbas rescisórias devidas...
DO DIREITO
I – Das Horas Extras – arts. 58 e 59 da CLT, Súmula 85/TST
II – Das Verbas Rescisórias – art. 477 da CLT
III – Do FGTS + Multa 40% – Lei 8.036/90
DOS PEDIDOS
a) Horas extras com adicional de 50%: R$...
b) Aviso prévio indenizado: R$...
c) 13º salário proporcional: R$...
Dá-se à causa o valor de R$...`,
  },
  "contestacao-trabalhista": {
    purpose: "Defesa em reclamação trabalhista.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > PRELIMINARES > MÉRITO > DOS PEDIDOS > ROL DE TESTEMUNHAS.",
    rules: "Prazo de audiência; base no art. 847 CLT.",
    addressing: "À ___ VARA DO TRABALHO DA COMARCA DE ___",
    closing: "Pede improcedência. Local e data. Advogado OAB.",
  },
  "replica-trabalhista": {
    purpose: "Impugnação à contestação trabalhista.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DAS CONTRARRAZÕES > DOS PEDIDOS.",
    rules: "Apresentada em audiência; base na CLT.",
    addressing: "À ___ VARA DO TRABALHO DA COMARCA DE ___",
    closing: "Pede procedência. Local e data. Advogado OAB.",
  },
  "recurso-ordinario-trabalhista": {
    purpose: "Recurso ordinário ao TRT.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DAS RAZÕES > DOS PEDIDOS.",
    rules: "Prazo de 8 dias; base no art. 895 CLT.",
    addressing: "AO TRIBUNAL REGIONAL DO TRABALHO DA ___ REGIÃO",
    closing: "Pede provimento. Local e data. Advogado OAB.",
  },
  "contrarrazoes-ro-trabalhista": {
    purpose: "Resposta ao recurso ordinário trabalhista.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DAS CONTRARRAZÕES > DOS PEDIDOS.",
    rules: "Prazo de 8 dias; base no art. 900 CLT.",
    addressing: "AO TRIBUNAL REGIONAL DO TRABALHO DA ___ REGIÃO",
    closing: "Pede improvimento. Local e data. Advogado OAB.",
  },
  "recurso-revista": {
    purpose: "Recurso ao TST.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DAS RAZÕES > DOS PEDIDOS.",
    rules: "Prazo de 8 dias; base no art. 896 CLT; demonstrar divergência.",
    addressing: "AO TRIBUNAL SUPERIOR DO TRABALHO",
    closing: "Pede provimento. Local e data. Advogado OAB.",
  },
  "agravo-peticao-trabalhista": {
    purpose: "Recurso em execução trabalhista.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DAS RAZÕES > DOS PEDIDOS.",
    rules: "Prazo de 8 dias; base no art. 897 CLT.",
    addressing: "AO TRIBUNAL REGIONAL DO TRABALHO DA ___ REGIÃO",
    closing: "Pede provimento. Local e data. Advogado OAB.",
  },
  "embargos-declaracao-trabalhista": {
    purpose: "Esclarecimento em processo trabalhista.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DAS RAZÕES > DOS PEDIDOS.",
    rules: "Prazo de 5 dias; base no art. 897-A CLT.",
    addressing: "À ___ VARA DO TRABALHO DA COMARCA DE ___",
    closing: "Pede provimento. Local e data. Advogado OAB.",
  },
  "alegacoes-finais-trabalhista": {
    purpose: "Razões finais em audiência trabalhista.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DO DIREITO > DOS PEDIDOS.",
    rules: "Apresentadas oralmente ou por memoriais; base na CLT.",
    addressing: "À ___ VARA DO TRABALHO DA COMARCA DE ___",
    closing: "Pede procedência. Local e data. Advogado OAB.",
  },
  "cumprimento-sentenca-trabalhista": {
    purpose: "Execução de sentença trabalhista.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DO DIREITO > DOS PEDIDOS > CÁLCULOS.",
    rules: "Base no art. 876 CLT; requerer penhora.",
    addressing: "À ___ VARA DO TRABALHO DA COMARCA DE ___",
    closing: "Pede deferimento. Local e data. Advogado OAB.",
  },
  "embargos-execucao-trabalhista": {
    purpose: "Defesa em execução trabalhista.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > PRELIMINARES > MÉRITO > DOS PEDIDOS.",
    rules: "Prazo de 5 dias; base no art. 884 CLT.",
    addressing: "À ___ VARA DO TRABALHO DA COMARCA DE ___",
    closing: "Pede improcedência. Local e data. Advogado OAB.",
  },
  "acordo-extrajudicial-trabalhista": {
    purpose: "Acordo conforme CLT art. 855-B a 855-E.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS TERMOS DO ACORDO > DOS PEDIDOS.",
    rules: "Homologação judicial; quitação limitada.",
    addressing: "À ___ VARA DO TRABALHO DA COMARCA DE ___",
    closing: "Pede homologação. Local e data. Advogado OAB.",
  },
  "consignacao-pagamento-trabalhista": {
    purpose: "Ação de consignação em pagamento trabalhista.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DO DIREITO > DOS PEDIDOS.",
    rules: "Base no art. 539 CPC supletivo; depositar valores.",
    addressing: "À ___ VARA DO TRABALHO DA COMARCA DE ___",
    closing: "Pede deferimento. Local e data. Advogado OAB.",
  },
  "acao-monitoria-trabalhista": {
    purpose: "Procedimento monitório trabalhista.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DO DIREITO > DOS PEDIDOS.",
    rules: "Base no CPC supletivo; prova escrita.",
    addressing: "À ___ VARA DO TRABALHO DA COMARCA DE ___",
    closing: "Pede deferimento. Local e data. Advogado OAB.",
  },
  "emenda-inicial-trabalhista": {
    purpose: "Corrigir reclamação trabalhista.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DAS CORREÇÕES > DOS PEDIDOS.",
    rules: "Base no art. 840 CLT; antes da audiência.",
    addressing: "À ___ VARA DO TRABALHO DA COMARCA DE ___",
    closing: "Pede deferimento. Local e data. Advogado OAB.",
  },
  "quesitos-periciais-trabalhista": {
    purpose: "Quesitos para perícia trabalhista.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS QUESITOS > DOS PEDIDOS.",
    rules: "Base no art. 465 CPC supletivo.",
    addressing: "À ___ VARA DO TRABALHO DA COMARCA DE ___",
    closing: "Pede deferimento. Local e data. Advogado OAB.",
  },
  "manifestacao-trabalhista": {
    purpose: "Manifestação genérica em processo trabalhista.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DO DIREITO > DOS PEDIDOS.",
    rules: "Adaptável; base na CLT.",
    addressing: "À ___ VARA DO TRABALHO DA COMARCA DE ___",
    closing: "Pede deferimento. Local e data. Advogado OAB.",
  },
  "agravo-instrumento-trabalhista": {
    purpose: "AI para destrancar recurso de revista.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DAS RAZÕES > DOS PEDIDOS.",
    rules: "Prazo de 8 dias; base no art. 897 CLT.",
    addressing: "AO TRIBUNAL SUPERIOR DO TRABALHO",
    closing: "Pede provimento. Local e data. Advogado OAB.",
  },
  "contraminuta-ai-trabalhista": {
    purpose: "Resposta ao agravo de instrumento trabalhista.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DAS CONTRARRAZÕES > DOS PEDIDOS.",
    rules: "Prazo de 8 dias.",
    addressing: "AO TRIBUNAL SUPERIOR DO TRABALHO",
    closing: "Pede improvimento. Local e data. Advogado OAB.",
  },
  "recurso-adesivo-trabalhista": {
    purpose: "Recurso adesivo ao recurso ordinário.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DAS RAZÕES > DOS PEDIDOS.",
    rules: "Prazo de 8 dias; base no art. 997 CPC supletivo.",
    addressing: "AO TRIBUNAL REGIONAL DO TRABALHO DA ___ REGIÃO",
    closing: "Pede provimento. Local e data. Advogado OAB.",
  },
  "contrarrazoes-recurso-revista": {
    purpose: "Resposta ao recurso de revista.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DAS CONTRARRAZÕES > DOS PEDIDOS.",
    rules: "Prazo de 8 dias.",
    addressing: "AO TRIBUNAL SUPERIOR DO TRABALHO",
    closing: "Pede improvimento. Local e data. Advogado OAB.",
  },
  "agravo-regimental-trabalhista": {
    purpose: "Agravo regimental trabalhista.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DAS RAZÕES > DOS PEDIDOS.",
    rules: "Contra decisão monocrática; base no regimento do TST.",
    addressing: "AO TRIBUNAL SUPERIOR DO TRABALHO",
    closing: "Pede provimento. Local e data. Advogado OAB.",
  },
  "embargos-sdi1-tst": {
    purpose: "Embargos à SDI-1 do TST.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DAS RAZÕES > DOS PEDIDOS.",
    rules: "Prazo de 8 dias; base no art. 894 CLT.",
    addressing: "AO TRIBUNAL SUPERIOR DO TRABALHO",
    closing: "Pede provimento. Local e data. Advogado OAB.",
  },
  "recurso-extraordinario-trabalhista": {
    purpose: "RE ao STF em matéria trabalhista.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DAS RAZÕES > DOS PEDIDOS.",
    rules: "Prazo de 15 dias; base no art. 102, III CF.",
    addressing: "AO SUPREMO TRIBUNAL FEDERAL",
    closing: "Pede provimento. Local e data. Advogado OAB.",
  },
  "acao-rescisoria-trabalhista": {
    purpose: "Rescisão de sentença trabalhista.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DO DIREITO > DOS PEDIDOS.",
    rules: "Base no art. 836 CLT; prazo de 2 anos.",
    addressing: "AO TRIBUNAL REGIONAL DO TRABALHO DA ___ REGIÃO",
    closing: "Pede procedência. Local e data. Advogado OAB.",
  },
  "impugnacao-cumprimento-trabalhista": {
    purpose: "Defesa em cumprimento de sentença trabalhista.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > PRELIMINARES > MÉRITO > DOS PEDIDOS.",
    rules: "Prazo de 15 dias; base no art. 525 CPC supletivo.",
    addressing: "À ___ VARA DO TRABALHO DA COMARCA DE ___",
    closing: "Pede improcedência. Local e data. Advogado OAB.",
  },
  "contrarrazoes-agravo-peticao": {
    purpose: "Resposta ao agravo de petição trabalhista.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DAS CONTRARRAZÕES > DOS PEDIDOS.",
    rules: "Prazo de 8 dias.",
    addressing: "AO TRIBUNAL REGIONAL DO TRABALHO DA ___ REGIÃO",
    closing: "Pede improvimento. Local e data. Advogado OAB.",
  },
  "pedido-revisao-trabalhista": {
    purpose: "Pedido de revisão trabalhista.",
    structure: "ENDEREÇAMENTO > QUALIFICAÇÃO > DOS FATOS > DO DIREITO > DOS PEDIDOS.",
    rules: "Para correção de cálculos; base na CLT.",
    addressing: "À ___ VARA DO TRABALHO DA COMARCA DE ___",
    closing: "Pede deferimento. Local e data. Advogado OAB.",
  },

  // ═══════════════════════════════════════
  // CONTRATOS (11 tipos)
  // ═══════════════════════════════════════
  "contrato-servicos": {
    purpose: "Regulamentar prestação de serviços entre prestador e contratante (arts. 593-609 CC).",
    structure: "IDENTIFICAÇÃO DAS PARTES > OBJETO > OBRIGAÇÕES DO PRESTADOR > OBRIGAÇÕES DO CONTRATANTE > PRAZO E PAGAMENTO > CLÁUSULA PENAL > CONFIDENCIALIDADE > RESCISÃO > FORO.",
    rules: "Base nos arts. 593-609 Código Civil; cláusulas numeradas; assinatura de 2 testemunhas; foro de eleição obrigatório.",
    addressing: "Nenhum (documento privado).",
    closing: "Local e data. Assinaturas das partes e testemunhas.",
    refinement_questions: ["Detalhes das obrigações do prestador?", "Valor e forma de pagamento?", "Prazo de vigência?", "Penalidades por descumprimento?", "Cláusula de confidencialidade?"],
    example_prompt_snippet: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS
que entre si celebram [CONTRATANTE] e [CONTRATADO(A)], na forma e condições seguintes:
CLÁUSULA 1ª – DO OBJETO
O presente contrato tem por objeto a prestação de serviços de...
CLÁUSULA 2ª – DAS OBRIGAÇÕES DO(A) CONTRATADO(A)
2.1. Executar os serviços descritos na Cláusula 1ª com diligência e qualidade...
CLÁUSULA 3ª – DO PRAZO
O presente contrato terá vigência de ... meses, com início em...
CLÁUSULA 4ª – DO VALOR E FORMA DE PAGAMENTO
4.1. Pelos serviços prestados, o CONTRATANTE pagará ao CONTRATADO(A) o valor de R$...
CLÁUSULA 5ª – DA CLÁUSULA PENAL
Em caso de descumprimento, a parte infratora pagará multa de...
CLÁUSULA 6ª – DO FORO
Fica eleito o foro da Comarca de... para dirimir quaisquer controvérsias.`,
  },
  "contrato-honorarios": {
    purpose: "Definir honorários advocatícios contratuais.",
    structure: "IDENTIFICAÇÃO DAS PARTES > OBJETO (serviços jurídicos) > VALOR E FORMA DE PAGAMENTO > CLÁUSULAS > FORO.",
    rules: "Base no art. 22 EOAB e Código Civil; especificar êxito ou hora; OAB reguladora.",
    addressing: "Nenhum.",
    closing: "Local e data. Assinaturas.",
  },
  "contrato-locacao": {
    purpose: "Locação residencial ou comercial.",
    structure: "IDENTIFICAÇÃO DAS PARTES > OBJETO (imóvel) > ALUGUEL E ENCARGOS > PRAZO > GARANTIAS > CLÁUSULAS PENAL > FORO.",
    rules: "Base na Lei 8.245/1991; cláusulas de reajuste; fiança ou caução.",
    addressing: "Nenhum.",
    closing: "Local e data. Assinaturas e testemunhas.",
  },
  "contrato-modelo": {
    purpose: "Gerar contrato baseado em modelo padrão.",
    structure: "IDENTIFICAÇÃO DAS PARTES > OBJETO > OBRIGAÇÕES > PAGAMENTO > CLÁUSULAS > FORO.",
    rules: "Adaptar modelo ao caso; base no Código Civil; garantir consensualidade.",
    addressing: "Nenhum.",
    closing: "Local e data. Assinaturas.",
  },
  "revisar-contrato": {
    purpose: "Revisão de cláusulas e riscos.",
    structure: "RELATÓRIO DE REVISÃO > CLÁUSULAS ANALISADAS > SUGESTÕES > CONCLUSÃO.",
    rules: "Identificar vícios; base no Código Civil; não é contrato, mas parecer.",
    addressing: "Nenhum.",
    closing: "Local e data. Advogado OAB.",
  },
  "analise-contrato-parecer": {
    purpose: "Parecer técnico sobre contrato.",
    structure: "INTRODUÇÃO > ANÁLISE CLÁUSULA A CLÁUSULA > RISCOS > CONCLUSÃO.",
    rules: "Fundamentar em lei; identificar nulidades (art. 166 Código Civil).",
    addressing: "Nenhum.",
    closing: "Local e data. Advogado OAB.",
  },
  "comparar-contratos": {
    purpose: "Comparação entre versões de contratos.",
    structure: "VERSÕES ANALISADAS > DIFERENÇAS CLÁUSULA A CLÁUSULA > IMPACTOS > CONCLUSÃO.",
    rules: "Destacar alterações; base no Código Civil.",
    addressing: "Nenhum.",
    closing: "Local e data. Advogado OAB.",
  },
  "aditivo-contratual": {
    purpose: "Aditivo a contrato existente.",
    structure: "IDENTIFICAÇÃO DAS PARTES > REFERÊNCIA AO CONTRATO ORIGINAL > ALTERAÇÕES > RATIFICAÇÃO > FORO.",
    rules: "Manter cláusulas inalteradas; base no art. 619 Código Civil.",
    addressing: "Nenhum.",
    closing: "Local e data. Assinaturas.",
  },
  "termo-encerramento": {
    purpose: "Encerramento de relação contratual.",
    structure: "IDENTIFICAÇÃO DAS PARTES > REFERÊNCIA AO CONTRATO > MOTIVOS > QUITAÇÃO > FORO.",
    rules: "Declarar quitação; base no art. 320 Código Civil.",
    addressing: "Nenhum.",
    closing: "Local e data. Assinaturas.",
  },
  "termo-confidencialidade": {
    purpose: "Proteger informações sigilosas.",
    structure: "IDENTIFICAÇÃO DAS PARTES > DEFINIÇÕES > OBRIGAÇÕES DE CONFIDENCIALIDADE > PRAZO > PENALIDADES > FORO.",
    rules: "Base no Código Civil e Lei 9.279/1996 (propriedade industrial).",
    addressing: "Nenhum.",
    closing: "Local e data. Assinaturas.",
  },
  "termos-uso": {
    purpose: "Termos de uso para plataformas/serviços.",
    structure: "INTRODUÇÃO > DEFINIÇÕES > USO DO SERVIÇO > DIREITOS E OBRIGAÇÕES > LIMITAÇÃO DE RESPONSABILIDADE > FORO.",
    rules: "Base na Lei 12.965/2014 (Marco Civil da Internet); consentimento explícito.",
    addressing: "Nenhum.",
    closing: "Local e data. Assinatura do responsável.",
  },

  // ═══════════════════════════════════════
  // EXTRAJUDICIAL (9 tipos)
  // ═══════════════════════════════════════
  "procuracao-ad-judicia": {
    purpose: "Outorga de poderes para atuação judicial.",
    structure: "OUTORGANTE > OUTORGADO > PODERES ESPECÍFICOS > PRAZO > LOCAL/DATA.",
    rules: "Base no art. 653 Código Civil; registro em cartório se necessário.",
    addressing: "Nenhum.",
    closing: "Local e data. Assinaturas e reconhecimento de firma.",
  },
  "procuracao-ad-negotia": {
    purpose: "Outorga de poderes para atos extrajudiciais.",
    structure: "OUTORGANTE > OUTORGADO > PODERES GERAIS > PRAZO > LOCAL/DATA.",
    rules: "Base no art. 653 Código Civil; especificar atos.",
    addressing: "Nenhum.",
    closing: "Local e data. Assinaturas.",
  },
  "notificacao-extrajudicial": {
    purpose: "Notificação extrajudicial com prazo e consequências legais (art. 726 CPC).",
    structure: "IDENTIFICAÇÃO DO NOTIFICANTE > IDENTIFICAÇÃO DO NOTIFICADO > EXPOSIÇÃO DOS FATOS > FUNDAMENTAÇÃO LEGAL > INTIMAÇÃO COM PRAZO > CONSEQUÊNCIAS DO NÃO CUMPRIMENTO > LOCAL E DATA.",
    rules: "Documento privado; via cartório ou AR; linguagem objetiva e formal; prazo razoável; prever consequências legais.",
    addressing: "Nenhum – documento extrajudicial.",
    closing: "Local e data. Assinatura do notificante.",
    refinement_questions: ["Prazo para cumprimento?", "Consequências em caso de descumprimento?", "Via de envio (cartório ou AR)?", "Há contrato subjacente?"],
    example_prompt_snippet: `NOTIFICAÇÃO EXTRAJUDICIAL
NOTIFICANTE: [Nome], [qualificação completa]...
NOTIFICADO: [Nome], [qualificação completa]...
Venho, por meio desta, NOTIFICAR Vossa Senhoria acerca dos seguintes fatos:
1. Em [data], foi celebrado entre as partes [contrato/acordo] referente a...
2. Ocorre que, até a presente data, o NOTIFICADO não cumpriu com...
Pelo exposto, fica o NOTIFICADO INTIMADO a [obrigação] no prazo de [X] dias, sob pena de [consequência jurídica: ajuizamento de ação, rescisão contratual, protesto, etc.], nos termos do art. [fundamentação legal].`,
  },
  "acordo-extrajudicial": {
    purpose: "Acordo/transação entre partes (art. 784 CPC).",
    structure: "IDENTIFICAÇÃO DAS PARTES > OBJETO > CONCESSÕES > QUITAÇÃO > FORO.",
    rules: "Base no art. 840 Código Civil; homologável judicialmente.",
    addressing: "Nenhum.",
    closing: "Local e data. Assinaturas e testemunhas.",
  },
  "acordo-divorcio": {
    purpose: "Acordo familiar consensual (Lei 11.441/07).",
    structure: "IDENTIFICAÇÃO DAS PARTES > DIVÓRCIO > PARTILHA > ALIMENTOS > GUARDA > VISITAS > FORO.",
    rules: "Via cartório; base na Lei 6.015/1973; sem litígio.",
    addressing: "Nenhum.",
    closing: "Local e data. Assinaturas.",
  },
  "acordo-alimentos-guarda": {
    purpose: "Acordo de alimentos, guarda e regulamentação de visitas.",
    structure: "IDENTIFICAÇÃO DAS PARTES > ALIMENTOS > GUARDA > VISITAS > PENALIDADES > FORO.",
    rules: "Base no ECA e Código Civil; homologável.",
    addressing: "Nenhum.",
    closing: "Local e data. Assinaturas.",
  },
  "parecer-juridico": {
    purpose: "Análise técnica fundamentada.",
    structure: "INTRODUÇÃO > QUESTÃO > FUNDAMENTAÇÃO > CONCLUSÃO.",
    rules: "Base em doutrina e jurisprudência; imparcial.",
    addressing: "Nenhum.",
    closing: "Local e data. Advogado OAB.",
  },
  "declaracao-termo": {
    purpose: "Declarações, atas e termos diversos.",
    structure: "IDENTIFICAÇÃO > CONTEÚDO > FINALIDADE > LOCAL/DATA.",
    rules: "Simples; reconhecimento de firma se necessário.",
    addressing: "Nenhum.",
    closing: "Local e data. Assinaturas.",
  },
  "recibo-pagamento": {
    purpose: "Recibo gerado automaticamente.",
    structure: "IDENTIFICAÇÃO > VALOR > FORMA > QUITAÇÃO > LOCAL/DATA.",
    rules: "Base no art. 320 Código Civil; prova de pagamento.",
    addressing: "Nenhum.",
    closing: "Local e data. Assinatura do recebedor.",
  },

  // ═══════════════════════════════════════
  // FERRAMENTAS (17 tipos)
  // ═══════════════════════════════════════
  "upload-documento": {
    purpose: "Upload manual de arquivo.",
    structure: "Não aplicável (processo técnico).",
    rules: "Garantir confidencialidade; base em LGPD (Lei 13.709/2018).",
    addressing: "Nenhum.",
    closing: "Não aplicável.",
  },
  "busca-jurisprudencia": {
    purpose: "Pesquisa jurisprudencial inteligente.",
    structure: "RELATÓRIO > SUMÁRIOS > FONTES > CONCLUSÃO.",
    rules: "Citar tribunais; base em CPC/CPP.",
    addressing: "Nenhum.",
    closing: "Local e data. Advogado OAB.",
  },
  "calculadora-liquidacao": {
    purpose: "Cálculo de valores para liquidação.",
    structure: "RELATÓRIO > CÁLCULOS DETALHADOS > TOTAIS.",
    rules: "Base no art. 509 CPC; correção monetária.",
    addressing: "Nenhum.",
    closing: "Local e data. Advogado OAB.",
  },
  "chat-juridico": {
    purpose: "Consulte dúvidas com IA jurídica.",
    structure: "Não aplicável (interativo).",
    rules: "Manter sigilo; base em EOAB.",
    addressing: "Nenhum.",
    closing: "Não aplicável.",
  },
  "melhorar-documento": {
    purpose: "Aprimoramento de texto jurídico.",
    structure: "VERSÃO ORIGINAL > SUGESTÕES > VERSÃO APRIMORADA.",
    rules: "Respeitar regras do tipo documental.",
    addressing: "Nenhum.",
    closing: "Local e data. Advogado OAB.",
  },
  "resumir-visual-law": {
    purpose: "Resumo visual de documentos.",
    structure: "INFOGRÁFICO > PONTOS PRINCIPAIS > CONCLUSÃO.",
    rules: "Usar elementos visuais; clareza.",
    addressing: "Nenhum.",
    closing: "Local e data. Advogado OAB.",
  },
  "resumir-documento": {
    purpose: "Resumo completo de documentos.",
    structure: "INTRODUÇÃO > FATOS > DECISÕES > STATUS.",
    rules: "Sintético; base em autos.",
    addressing: "Nenhum.",
    closing: "Local e data. Advogado OAB.",
  },
  "transcricao-audio": {
    purpose: "Transcrição de áudio para texto.",
    structure: "METADADOS > TRANSCRIÇÃO > OBSERVAÇÕES.",
    rules: "Fidelidade ao áudio; base em LGPD para dados pessoais.",
    addressing: "Nenhum.",
    closing: "Não aplicável.",
  },
  "medidas-cabiveis": {
    purpose: "Análise de medidas cabíveis para um caso.",
    structure: "FATOS > ANÁLISE > MEDIDAS RECOMENDADAS > FUNDAMENTAÇÃO.",
    rules: "Base na legislação aplicável; orientação estratégica.",
    addressing: "Nenhum.",
    closing: "Local e data. Advogado OAB.",
  },
  "explicacao-movimento": {
    purpose: "Explicação de movimento processual.",
    structure: "MOVIMENTO > SIGNIFICADO > PRÓXIMOS PASSOS.",
    rules: "Linguagem acessível ao cliente; base no CPC/CPP.",
    addressing: "Nenhum.",
    closing: "Não aplicável.",
  },
  "legenda-rede-social": {
    purpose: "Legenda para post profissional.",
    structure: "TÍTULO > CONTEÚDO > HASHTAGS.",
    rules: "Respeitar EOAB sobre publicidade advocatícia.",
    addressing: "Nenhum.",
    closing: "Não aplicável.",
  },
  "relatorio-processual": {
    purpose: "Relatório processual para cliente.",
    structure: "DADOS DO PROCESSO > HISTÓRICO > STATUS ATUAL > PRÓXIMOS PASSOS.",
    rules: "Clareza; base nos autos; linguagem acessível.",
    addressing: "Nenhum.",
    closing: "Local e data. Advogado OAB.",
  },
  "roteiro-audiencia": {
    purpose: "Roteiro para audiência.",
    structure: "PREPARAÇÃO > PONTOS PRINCIPAIS > PERGUNTAS > OBSERVAÇÕES.",
    rules: "Estratégico; base no CPC/CPP/CLT.",
    addressing: "Nenhum.",
    closing: "Local e data. Advogado OAB.",
  },
  "roteiro-sustentacao-oral": {
    purpose: "Roteiro para sustentação oral.",
    structure: "ABERTURA > TESE PRINCIPAL > ARGUMENTOS > PEDIDO FINAL.",
    rules: "Tempo limitado; clareza; base no regimento do tribunal.",
    addressing: "Nenhum.",
    closing: "Não aplicável.",
  },
  "roteiro-primeira-consulta": {
    purpose: "Roteiro para primeira consulta.",
    structure: "CHECKLIST > PERGUNTAS > DOCUMENTOS NECESSÁRIOS > ORIENTAÇÕES.",
    rules: "Empatia; sigilo profissional; base em EOAB.",
    addressing: "Nenhum.",
    closing: "Não aplicável.",
  },
  "documentos-necessarios": {
    purpose: "Lista de documentos necessários para um caso.",
    structure: "TIPO DE CASO > DOCUMENTOS OBRIGATÓRIOS > DOCUMENTOS RECOMENDADOS.",
    rules: "Base na legislação processual aplicável.",
    addressing: "Nenhum.",
    closing: "Não aplicável.",
  },
  "quesitos-pericia": {
    purpose: "Quesitos para perícia judicial.",
    structure: "IDENTIFICAÇÃO > QUESITOS NUMERADOS > JUSTIFICATIVA.",
    rules: "Base no art. 465 CPC; clareza e objetividade.",
    addressing: "Nenhum.",
    closing: "Local e data. Advogado OAB.",
  },
};

// ─── Category-level fallback knowledge ───
const CATEGORY_KNOWLEDGE: Record<string, { rules: string; terminology: string; fallback_refinement_questions: string[] }> = {
  penal: {
    rules: "NUNCA incluir valor da causa em documentos penais. Documentos penais NÃO têm valor da causa. Terminologia: réu/acusado (não requerido), denúncia (não petição inicial). Testemunhas no rol, não como signatárias do documento.",
    terminology: "Use terminologia do CPP (Código de Processo Penal) e CP (Código Penal). Cite LEP quando pertinente. Princípios: presunção de inocência (CF art. 5°, LVII), ampla defesa, contraditório, in dubio pro reo.",
    fallback_refinement_questions: ["Detalhes do fato criminoso?", "Histórico criminal do réu/paciente?", "Provas disponíveis?", "Testemunhas a arrolar?"],
  },
  civil: {
    rules: "Documentos cíveis judiciais DEVEM ter valor da causa (CPC art. 291-293). Endereçamento ao juízo competente. Qualificação completa das partes. Pedidos certos e determinados.",
    terminology: "Use terminologia do CPC/2015 e CC/2002. Princípios: boa-fé objetiva, função social do contrato, vedação ao enriquecimento sem causa, cooperação processual.",
    fallback_refinement_questions: ["Renda mensal do autor?", "Provas documentais disponíveis?", "Danos quantificados (morais/materiais)?", "Jurisprudência específica a citar?"],
  },
  trabalhista: {
    rules: "Reclamações trabalhistas DEVEM ter valor da causa e pedidos líquidos (CLT art. 840, §1º). Prazo prescricional: 2 anos para ajuizar, 5 anos retroativos. Depósito recursal obrigatório em recursos.",
    terminology: "Use terminologia da CLT e legislação trabalhista. Cite CF art. 7° para direitos fundamentais. Referencie súmulas e OJs do TST. Princípios: proteção ao trabalhador, irrenunciabilidade, primazia da realidade.",
    fallback_refinement_questions: ["Horas extras detalhadas?", "Renda mensal do reclamante?", "Provas de vínculo empregatício?", "Testemunhas disponíveis?"],
  },
  contrato: {
    rules: "Contratos NÃO têm endereçamento judicial. Cláusulas devem ser NUMERADAS. OBRIGATÓRIO foro de eleição e espaço para testemunhas. Constitui título executivo extrajudicial (art. 784 CPC).",
    terminology: "Fundamente com CC/2002 (obrigações, contratos). Considere LGPD se envolver dados pessoais. Considere cláusula de mediação/arbitragem (Lei 9.307/96).",
    fallback_refinement_questions: ["Detalhes das obrigações das partes?", "Valor e forma de pagamento?", "Prazo de vigência?", "Penalidades por descumprimento?"],
  },
  extrajudicial: {
    rules: "Documentos extrajudiciais NÃO têm endereçamento judicial. Linguagem deve ser clara e direta. Incluir qualificação completa das partes.",
    terminology: "Fundamente com CC/2002. Referencie legislação específica conforme o tipo (Lei 8.906/94 para procurações advocatícias, Lei 11.441/2007 para divórcio extrajudicial, etc.).",
    fallback_refinement_questions: ["Detalhes específicos do caso?", "Prazo para cumprimento?", "Consequências previstas?"],
  },
};

function getRefinementQuestions(documentTypeId?: string, category?: string): string[] {
  // Try specific document type first
  if (documentTypeId && DOCUMENT_KNOWLEDGE[documentTypeId]?.refinement_questions) {
    return DOCUMENT_KNOWLEDGE[documentTypeId].refinement_questions!;
  }
  // Fallback to category defaults
  const cat = category || "civil";
  if (CATEGORY_KNOWLEDGE[cat]?.fallback_refinement_questions) {
    return CATEGORY_KNOWLEDGE[cat].fallback_refinement_questions;
  }
  return ["Detalhes adicionais do caso?", "Provas disponíveis?", "Aspectos a enfatizar?"];
}

function getDocumentKnowledgePrompt(documentTypeId?: string, category?: string): string {
  const parts: string[] = [];

  // 1. Try specific document knowledge
  if (documentTypeId && DOCUMENT_KNOWLEDGE[documentTypeId]) {
    const dk = DOCUMENT_KNOWLEDGE[documentTypeId];
    parts.push(`═══ CONHECIMENTO ESPECÍFICO DO DOCUMENTO ═══
TIPO: ${documentTypeId}
PROPÓSITO: ${dk.purpose}
ESTRUTURA OBRIGATÓRIA: ${dk.structure}
REGRAS ESPECÍFICAS: ${dk.rules}
ENDEREÇAMENTO: ${dk.addressing}
ENCERRAMENTO: ${dk.closing}
═══ FIM DO CONHECIMENTO ESPECÍFICO ═══`);

    // Inject forensic language example when available
    if (dk.example_prompt_snippet) {
      parts.push(`═══ EXEMPLO DE LINGUAGEM FORENSE (use como referência de estilo, tom e estrutura) ═══
${dk.example_prompt_snippet}
═══ FIM DO EXEMPLO ═══`);
    }

    // Inject liminar instruction when applicable
    if (dk.request_liminar) {
      parts.push(`PEDIDO DE LIMINAR: Este tipo de documento DEVE incluir pedido de liminar/tutela de urgência com fundamentação em fumus boni iuris (verossimilhança das alegações) e periculum in mora (perigo de dano irreparável), quando a ilegalidade, abuso de poder ou urgência forem evidentes nos fatos narrados.`);
    }
  }

  // 2. Always add category-level knowledge (supplements specific or serves as fallback)
  const cat = category || "civil";
  const catKnowledge = CATEGORY_KNOWLEDGE[cat];
  if (catKnowledge) {
    parts.push(`REGRAS DA CATEGORIA (${cat.toUpperCase()}): ${catKnowledge.rules}
TERMINOLOGIA: ${catKnowledge.terminology}`);
  }

  return parts.length > 0 ? "\n\n" + parts.join("\n\n") : "";
}

function getDocumentExpertise(documentTypeId?: string, category?: string): string {
  const parts: string[] = [];

  // Format awareness
  if (documentTypeId && TIMBRE_TYPES.has(documentTypeId)) {
    parts.push("FORMATO: Este documento usa papel timbrado do escritório. Mantenha formatação profissional com cabeçalho, corpo estruturado e fecho formal. NÃO adicione instruções de margem/fonte — o timbre é automático.");
  } else if (documentTypeId && ABNT_TYPES.has(documentTypeId)) {
    parts.push("FORMATO: Este documento segue normas ABNT/forenses. Títulos de seção em CAIXA ALTA e negrito. Estrutura: EMENTA, DOS FATOS, DO DIREITO, DOS PEDIDOS. Parágrafos numerados quando aplicável.");
  }

  // Inject document-specific knowledge (NEW)
  const docKnowledge = getDocumentKnowledgePrompt(documentTypeId, category);
  if (docKnowledge) {
    parts.push(docKnowledge);
  } else {
    // Fallback to original category-only expertise if no specific knowledge
    if (category === "penal") {
      parts.push(`EXPERTISE PENAL:
- Use terminologia do CPP (Código de Processo Penal) e CP (Código Penal)
- Cite artigos do CP para tipificação e do CPP para procedimentos
- Referencie LEP (Lei de Execução Penal) quando pertinente
- Princípios: presunção de inocência (CF art. 5°, LVII), ampla defesa, contraditório
- Cite súmulas do STF/STJ em matéria penal quando disponíveis nos dados de pesquisa`);
    } else if (category === "trabalhista") {
      parts.push(`EXPERTISE TRABALHISTA:
- Use terminologia da CLT e legislação trabalhista
- Cite artigos da CLT para direitos e obrigações
- Referencie súmulas e OJs do TST
- Princípios: proteção ao trabalhador, irrenunciabilidade, primazia da realidade
- Cite CF art. 7° para direitos fundamentais do trabalhador`);
    } else if (category === "civil") {
      parts.push(`EXPERTISE CIVIL:
- Use terminologia do CPC/2015 e CC/2002
- Cite artigos do CPC para procedimentos e do CC para direito material
- Referencie súmulas do STJ em matéria cível
- Princípios: boa-fé objetiva, função social do contrato, vedação ao enriquecimento sem causa`);
    } else if (category === "contrato" || category === "extrajudicial") {
      parts.push(`EXPERTISE EXTRAJUDICIAL:
- Fundamente cláusulas com artigos do CC/2002 (obrigações, contratos)
- Adicione cláusulas de proteção: rescisão, penalidades, foro de eleição
- Inclua referência a título executivo extrajudicial (art. 784 CPC) quando aplicável
- Adicione cláusula LGPD (Lei 13.709/2018) se envolver dados pessoais
- Considere cláusula de mediação/arbitragem (Lei 9.307/96)`);
    }
  }

  return parts.length > 0 ? "\n\n" + parts.join("\n\n") : "";
}

interface EnrichResult {
  enrichedText: string;
  citations: Citation[];
  validation: ValidationCheck;
  provider: string;
  researchCount: number;
  elapsed: number;
}

interface Citation {
  lei: string;
  link: string;
  source: string;
}

interface ValidationCheck {
  score: number;
  checks: Record<string, boolean>;
  issues: string[];
}

// ─── Multi-Provider AI ───
interface AIProvider {
  name: string;
  call: (msgs: Array<{ role: string; content: string }>, maxTokens: number, temperature: number) => Promise<string>;
}

function getProviders(): AIProvider[] {
  const providers: AIProvider[] = [];

  const groqKey = Deno.env.get("GROQ_API_KEY");
  if (groqKey) {
    for (const model of ["llama-3.3-70b-versatile", "llama-3.1-70b-versatile"]) {
      providers.push({
        name: `Groq/${model}`,
        call: async (msgs, maxTokens, temperature) => {
          const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${groqKey}` },
            signal: AbortSignal.timeout(90000),
            body: JSON.stringify({ model, messages: msgs, temperature, max_tokens: maxTokens, top_p: 0.85 }),
          });
          if (!res.ok) throw new Error(`Groq ${model} ${res.status}: ${await res.text()}`);
          const data = await res.json();
          return data.choices?.[0]?.message?.content || "";
        },
      });
    }
  }

  const geminiKeys = [Deno.env.get("GEMINI_API_KEY"), Deno.env.get("GEMINI_API_KEY_2"), Deno.env.get("GEMINI_API_KEY_3")].filter(Boolean) as string[];
  for (const key of geminiKeys) {
    providers.push({
      name: "Gemini/2.5-flash",
      call: async (msgs, maxTokens, temperature) => {
        const contents = msgs.filter((m) => m.role !== "system").map((m) => ({
          role: m.role === "assistant" ? "model" : "user",
          parts: [{ text: m.content }],
        }));
        const systemInstruction = msgs.find((m) => m.role === "system")?.content || "";
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: AbortSignal.timeout(90000),
          body: JSON.stringify({ systemInstruction: { parts: [{ text: systemInstruction }] }, contents, generationConfig: { temperature, maxOutputTokens: maxTokens } }),
        });
        if (!res.ok) throw new Error(`Gemini ${res.status}: ${await res.text()}`);
        const data = await res.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      },
    });
  }

  // Anthropic and OpenAI removed — Gemini handles all LLM calls above (FREE)

  return providers;
}

async function callWithFallback(
  providers: AIProvider[],
  messages: Array<{ role: string; content: string }>,
  maxTokens = 32768,
  temperature = 0.3
): Promise<{ content: string; provider: string }> {
  let lastError = "";
  for (const provider of providers) {
    try {
      console.log(`🤖 Trying ${provider.name}...`);
      const content = await provider.call(messages, maxTokens, temperature);
      if (content) {
        console.log(`✅ ${provider.name} → ${content.length} chars`);
        return { content, provider: provider.name };
      }
    } catch (err) {
      lastError = `${provider.name}: ${err instanceof Error ? err.message : String(err)}`;
      console.warn(`⚠️ ${lastError}`);
    }
  }
  throw new Error(`All providers failed. Last: ${lastError}`);
}

// ─── Step 1: Neural Search for Real Legal Data ───
async function searchLegalBases(query: string, documentType: string): Promise<{ results: any[]; citations: Citation[] }> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const results: any[] = [];
  const citations: Citation[] = [];

  if (!supabaseUrl || !supabaseAnonKey) return { results, citations };

  // Parallel: Neural search + Unified APIs
  const [neuralRes, apiRes] = await Promise.allSettled([
    (async () => {
      const res = await fetch(`${supabaseUrl}/functions/v1/neural-search`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseAnonKey}`, apikey: supabaseAnonKey },
        signal: AbortSignal.timeout(20000),
        body: JSON.stringify({ query, mode: "search_and_index", hybrid: true, rerank: true, expandQueries: true, matchCount: 15 }),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.results || [];
    })(),
    (async () => {
      const res = await fetch(`${supabaseUrl}/functions/v1/pesquisa-unificada`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseAnonKey}`, apikey: supabaseAnonKey },
        signal: AbortSignal.timeout(15000),
        body: JSON.stringify({ query, sources: ["camara", "lexml", "stf", "cnj", "datajud_stj", "datajud_tst", "google_books"] }),
      });
      if (!res.ok) return [];
      const data = await res.json();
      return data.results || [];
    })(),
  ]);

  if (neuralRes.status === "fulfilled") results.push(...neuralRes.value);
  if (apiRes.status === "fulfilled") results.push(...apiRes.value);

  // Extract citations from results
  for (const r of results.slice(0, 20)) {
    const source = r.source_label || r.sourceLabel || r.source || "";
    const title = r.title || "";
    const url = r.url || "";

    // Detect law references
    const lawMatch = title.match(/(?:Lei|Decreto|MP|Súmula|Art\.)\s*(?:n[°º]?\s*)?\d+[\.\d]*/i);
    if (lawMatch || url.includes("lexml") || url.includes("planalto")) {
      citations.push({
        lei: lawMatch ? lawMatch[0] : title.substring(0, 80),
        link: url.startsWith("http") ? url : `https://www.lexml.gov.br/busca/search?SearchableText=${encodeURIComponent(title)}`,
        source,
      });
    }
  }

  return { results, citations };
}

// ─── Detect area from document type ───
function detectAreaFromDocument(documentTypeId?: string, category?: string): string | null {
  const id = (documentTypeId || "").toLowerCase();
  const cat = (category || "").toLowerCase();
  
  const penalTypes = ["habeas-corpus", "queixa-crime", "defesa-previa", "resposta-acusacao", "liberdade-provisoria", "recurso-sentido-estrito", "alegacoes-finais-criminais", "revisao-criminal", "revogacao-prisao", "apelacao-criminal", "denuncia", "relaxamento-prisao", "progressao-regime", "livramento-condicional", "agravo-execucao-penal"];
  const trabTypes = ["reclamacao-trabalhista", "defesa-trabalhista", "recurso-ordinario-tst", "mandado-seguranca-trabalhista"];
  const familiaTypes = ["divorcio", "guarda", "alimentos", "uniao-estavel", "adocao", "inventario", "partilha"];
  const consumidorTypes = ["consumidor", "cdc"];
  const adminTypes = ["mandado-seguranca", "acao-popular", "acao-civil-publica", "licitacao"];
  
  if (penalTypes.some(t => id.includes(t)) || cat.includes("penal")) return "penal";
  if (trabTypes.some(t => id.includes(t)) || cat.includes("trabalhist")) return "trabalhista";
  if (familiaTypes.some(t => id.includes(t)) || cat.includes("famil")) return "familia";
  if (consumidorTypes.some(t => id.includes(t)) || cat.includes("consumidor")) return "consumidor";
  if (adminTypes.some(t => id.includes(t)) || cat.includes("administrat")) return "administrativo";
  if (cat.includes("tributar")) return "tributario";
  if (cat.includes("previdenci")) return "previdenciario";
  if (cat.includes("ambiental")) return "ambiental";
  if (id.includes("peticao-inicial") || id.includes("contestacao") || id.includes("apelacao") || cat.includes("civel") || cat.includes("civil")) return "civil";
  return null;
}

// ─── Step 2: Build Enrichment Prompt ───
function buildEnrichmentPrompt(currentText: string, researchData: string, isJudicial: boolean, documentType: string, documentTypeId?: string, category?: string, neuralPrompt?: string, jurisdicao?: string): string {
  const expertise = getDocumentExpertise(documentTypeId, category);
  const systemPrompt = `Você é um revisor jurídico SÊNIOR ESPECIALIZADO EM DEFESA. Seu trabalho é APRIMORAR um documento existente, NUNCA reescrevê-lo.

═══ DIRETRIZ CENTRAL — DOUTRINA COMENTADA, FOCO DEFENSIVO E MENTALIDADE DE MAGISTRADO ═══
Seu cérebro jurídico é focado EXCLUSIVAMENTE em DEFENDER o cliente.

MENTALIDADE DE MAGISTRADO: Pense como um JUIZ que vai ABSOLVER.
Use os mesmos argumentos e fundamentações que um magistrado usaria para deferir/absolver.
Antecipe o raciocínio judicial e demonstre que a absolvição/deferimento é a conclusão lógica.

DOUTRINADOR PRIORITÁRIO — GUILHERME DE SOUZA NUCCI:
Priorize citações do juiz Guilherme de Souza Nucci (Código Penal Comentado, CPP Comentado).
Nucci é magistrado E doutrinador — sua doutrina reflete como um juiz pensa e decide.

Ao aprimorar, SEMPRE:
1. ADICIONE referências a DOUTRINA COMENTADA (Códigos Comentados) — cite autor, obra e posição doutrinária (priorize Nucci)
2. Para cada artigo citado, explique QUANDO SE APLICA e QUANDO NÃO SE APLICA segundo a doutrina
3. Priorize TESES DEFENSIVAS: excludentes de ilicitude, atenuantes, nulidades, prescrição, decadência
4. Cite doutrinadores que fundamentem a posição de DEFESA do cliente
5. A doutrina comentada traz exemplos práticos e circunstâncias de aplicação/não aplicação — USE ISSO
6. NUNCA adote posição acusatória — SEMPRE fortaleça a defesa
7. Pergunte-se: "Se eu fosse o juiz, que fundamentação me convenceria a absolver?" — e use essa fundamentação
═══ FIM DA DIRETRIZ ═══

REGRAS ABSOLUTAS (VIOLAÇÃO = FALHA):
1. PRESERVAR CADA PALAVRA do documento original. NÃO remova, substitua nem reescreva NENHUM parágrafo, frase ou palavra. Apenas ADICIONE conteúdo ENTRE ou APÓS os parágrafos existentes.
2. TEXTO PURO: NÃO use #, ##, **, *, -, nem QUALQUER sintaxe Markdown. Jamais.
3. NÃO insira tags de fonte como [fonte: X] ou (fonte: X). Cite leis no corpo do texto: "conforme Art. X da Lei Y".
4. NÃO insira instruções de formatação (margens, fontes, espaçamentos, recuos). A formatação é automática.
5. NÃO DUPLIQUE seções, assinaturas, datas ou blocos de fecho. Se já existe, apenas enriqueça.
6. Títulos de seções: escreva em CAIXA ALTA sem nenhum prefixo (ex: DOS FATOS, DO DIREITO).
7. Separe parágrafos com UMA linha em branco.

O QUE FAZER:
- Corrija erros gramaticais e de concordância
- ADICIONE fundamentação legal real ENTRE os parágrafos existentes (ex: "conforme Art. 654 do Código Civil")
- ADICIONE DOUTRINA COMENTADA — cite autores e obras que fundamentem a posição defensiva (ex: "Conforme leciona Guilherme de Souza Nucci em Código Penal Comentado...")
- ADICIONE jurisprudência real (STF, STJ, TJ) com números dos dados de pesquisa, priorizando decisões FAVORÁVEIS À DEFESA
- EXPANDA argumentação defensiva — o resultado deve ser mais longo e mais fundamentado que o original
- Para cada dispositivo legal, inclua quando se aplica E quando NÃO se aplica (favorecendo a defesa)
- Mantenha blocos de assinatura (linhas de underscores ___) exatamente como estão

REGRA ANTI-ALUCINAÇÃO (PRIORIDADE MÁXIMA):
1. NUNCA invente números de processo, acórdãos, REsp, HC, RE ou qualquer identificador judicial
2. Use APENAS jurisprudência dos DADOS DA PESQUISA NEURAL fornecidos acima
3. Se NÃO houver dados de pesquisa com decisões reais, NÃO adicione jurisprudência — adicione apenas artigos de lei (verificáveis)
4. Copie EXATAMENTE os dados de jurisprudência dos dados de pesquisa — não modifique números, datas ou relatores
5. PREFIRA artigos de lei (verificáveis) sobre jurisprudência inventada
6. Cite artigos de lei com precisão (estes são verificáveis e seguros)
7. Se o usuário pedir jurisprudência específica que NÃO está nos dados de pesquisa, escreva: "Jurisprudência a ser pesquisada e inserida pelo advogado responsável."`;

  const judicialExtra = isJudicial
    ? `\n\nPARA PEÇAS JUDICIAIS:
- Reforce a seção DO DIREITO com mais artigos e precedentes
- Adicione referências a princípios constitucionais (CF/88)
- Cite jurisprudência recente do STF/STJ com números reais
- Verifique se todos os pedidos têm fundamentação legal
- Garanta citação do CPC/2015 para procedimentos`
    : `\n\nPARA DOCUMENTOS EXTRAJUDICIAIS:
- Adicione cláusulas de proteção (rescisão, penalidades fundamentadas)
- Cite artigos do CC/2002 para obrigações contratuais
- Adicione referência a título executivo (art. 784 CPC) se aplicável
- Inclua cláusula LGPD se envolver dados pessoais
- Adicione cláusula de mediação/arbitragem antes do foro`;

  // Jurisdiction overlay
  const jurisdictionOverlays: Record<string, string> = {
    brasil: `\n\n═══ JURISDIÇÃO: BRASIL 🇧🇷 ═══\nUse EXCLUSIVAMENTE legislação brasileira. NÃO cite US Code, SCOTUS ou legislação estrangeira.\nPriorize: CF/88, CC/2002, CPC/2015, CLT, CDC, CP, CPP. Doutrina: Nucci, Nery, Didier.`,
    eua: `\n\n═══ JURISDICTION: UNITED STATES 🇺🇸 ═══\nUse EXCLUSIVELY US law: USC, CFR, SCOTUS precedents, Circuit Courts.\nBluebook citation format. DO NOT cite Brazilian legislation.\nRespond in Portuguese unless document is in English.`,
    ambos: `\n\n═══ JURISDIÇÃO: COMPARADA BR + EUA 🌐 ═══\nCompare legislação brasileira com americana. Para cada artigo BR, apresente o equivalente US e vice-versa.`,
  };
  const jurisdictionSection = jurisdictionOverlays[jurisdicao || "brasil"] || jurisdictionOverlays["brasil"];

  // ═══ REGRA SUMULAR (Anti-alucinação para súmulas) ═══
  const regraSumular = `\n
REGRA SUMULAR:
- Ao citar súmulas, use EXCLUSIVAMENTE súmulas que existam na base de dados ou que sejam notoriamente conhecidas.
- Formato: "Súmula [número] do [Tribunal]: [enunciado]"
- Se não tiver certeza se a súmula existe, escreva: "Conferir súmula aplicável sobre [tema]"
- Priorize súmulas do STJ e Súmulas Vinculantes do STF como fonte primária.`;

  // ═══ ORGANIZAÇÃO DO DOCUMENTO ═══
  const organizacaoDoc = (jurisdicao || "brasil") === "brasil" ? `\n
ORGANIZAÇÃO DO DOCUMENTO (ABNT):
1. Estrutura ABNT para documentos brasileiros (margens 3cm sup/esq, 2cm inf/dir, Times New Roman 12pt, espaçamento 1,5)
2. Numeração progressiva de seções (I, II, III para seções; 1.1, 1.2 para subseções)
3. Parágrafos de transição entre seções para coesão textual
4. Sumário no início para documentos longos (>5 páginas)
5. Nota de rodapé para citações doutrinárias (ex: NUCCI, Guilherme de Souza. Código Penal Comentado. 22ª ed. Rio de Janeiro: Forense, 2022. p. 150.)
6. Índice de legislação citada ao final do documento
7. Separação clara entre fundamentação legal e argumentação factual` : "";

  // ═══ AREA-SPECIFIC PROMPTS ═══
  const areaPrompts: Record<string, Record<string, string>> = {
    penal: {
      brasil: `\nÁREA: PENAL — Priorize CP, CPP, LEP. Doutrina: Nucci, Bitencourt, Capez.
SÚMULAS STJ ESSENCIAIS: 231 (atenuante não reduz abaixo do mínimo), 440 (pena-base no mínimo veda regime mais gravoso pela gravidade abstrata), 443 (aumento no roubo exige fundamentação concreta), 444 (vedado usar IPs/APs em curso para agravar pena-base), 545 (confissão usada no convencimento gera atenuante), 588 (violência doméstica impossibilita substituição PPL por PRD), 589 (insignificância inaplicável na Lei Maria da Penha), 593 (estupro de vulnerável <14 irrelevante consentimento), 599 (insignificância inaplicável contra administração pública), 630 (confissão no tráfico limitada a uso próprio = atenuante em proporção inferior), 659 (fração de aumento no crime continuado pelo número de delitos), 668 (arma com numeração raspada NÃO é hediondo), 676 (juiz não pode de ofício decretar/converter flagrante em preventiva — Pacote Anticrime).
Teses defensivas: excludentes de ilicitude, nulidades, atenuantes.`,
      eua: `\nAREA: CRIMINAL — Title 18 USC, FRCP, Miranda, Brady, USSG. Defense: 4th/6th Amendment, Due Process.`,
    },
    civil: {
      brasil: `\nÁREA: CIVIL — Priorize CC/2002, CPC/2015. Doutrina: Nery, Didier, Theodoro Jr., Tartuce.
SÚMULAS STJ ESSENCIAIS: 37 (cumulação dano material + moral), 54 (juros moratórios desde o evento danoso na extracontratual), 130 (empresa responde por furto em estacionamento), 227 (PJ pode sofrer dano moral), 326 (condenação inferior não gera sucumbência recíproca), 370 (cheque pré-datado apresentado antecipadamente = dano moral), 387 (cumulação dano estético + moral), 449 (vaga de garagem com matrícula própria não é bem de família), 529 (seguro RC facultativo: terceiro não aciona seguradora diretamente), 549 (penhora de bem de família do fiador de locação é válida), 642 (direito a dano moral transmite-se aos herdeiros).
Boa-fé objetiva (art. 422 CC), função social (art. 421 CC).`,
      eua: `\nAREA: CIVIL — FRCP, Erie Doctrine, Restatements. Prosser, Corbin.`,
    },
    trabalhista: {
      brasil: `\nÁREA: TRABALHISTA — Priorize CLT, Reforma (Lei 13.467/2017). Doutrina: Godinho Delgado, Volia Bomfim. Súmulas TST. Pedidos líquidos obrigatórios (art. 840 CLT). Honorários de sucumbência (art. 791-A CLT). Danos extrapatrimoniais: limites do art. 223-G CLT.`,
      eua: `\nAREA: EMPLOYMENT — Title VII, FLSA, NLRA, ADA, FMLA, OSHA.`,
    },
    consumidor: {
      brasil: `\nÁREA: CONSUMIDOR — Priorize CDC (Lei 8.078/90). Doutrina: Claudia Lima Marques.
SÚMULAS STJ ESSENCIAIS: 297 (CDC aplicável a instituições financeiras), 302 (abusiva cláusula que limita internação), 359 (notificação prévia obrigatória antes de inscrição em cadastro), 385 (anotação irregular sem dano moral se preexiste inscrição legítima), 479 (bancos respondem objetivamente por fraudes de terceiros), 532 (envio de cartão não solicitado = prática abusiva), 543 (resolução de contrato imobiliário CDC = restituição imediata), 548 (credor deve excluir registro em 5 dias úteis após pagamento), 597 (carência de plano de saúde abusiva se >24h para emergência), 601 (MP legítimo para defesa de consumidores), 608 (CDC aplicável a planos de saúde, salvo autogestão), 609 (recusa por doença preexistente ilícita sem exames prévios), 675 (órgãos de defesa podem aplicar sanções do CDC).
Inversão do ônus (art. 6º, VIII). Responsabilidade objetiva (arts. 12-14).`,
      eua: `\nAREA: CONSUMER — FTC Act, Dodd-Frank, Magnuson-Moss, UDAP.`,
    },
    familia: {
      brasil: `\nÁREA: FAMÍLIA — Priorize CC/2002 (Livro IV), ECA. Doutrina: Maria Berenice Dias, Rolf Madaleno.
SÚMULAS STJ ESSENCIAIS: 1 (foro do alimentando para investigação + alimentos), 277 (alimentos devidos desde a citação), 309 (prisão civil = 3 prestações anteriores + vincendas), 336 (renúncia a alimentos não impede pensão por morte), 358 (cancelamento de alimentos do maior exige contraditório), 383 (competência = foro do detentor da guarda), 594 (MP legítimo para alimentos de criança/adolescente), 596 (alimentos dos avós = subsidiários), 621 (efeitos retroagem à citação, vedada repetibilidade).
Melhor interesse da criança (art. 227 CF).`,
      eua: `\nAREA: FAMILY — UCCJEA, UIFSA, state family codes.`,
    },
    previdenciario: {
      brasil: `\nÁREA: PREVIDENCIÁRIO — Priorize Lei 8.213/91, Lei 8.212/91. Doutrina: Frederico Amado, Hugo Goes.
SÚMULAS STJ ESSENCIAIS: 149 (prova exclusivamente testemunhal insuficiente para atividade rurícola), 340 (lei aplicável = vigente na data do óbito), 416 (pensão por morte devida mesmo com perda de qualidade de segurado se preencheu requisitos para aposentadoria), 441 (falta de comunicação de saída ao INSS não impede benefício), 563 (CDC aplicável a previdência aberta, não fechada), 657 (Lei 8.213 aplica-se a urbanos e rurais), 663 (filho inválido de qualquer idade tem direito a pensão por morte).`,
      eua: `\nAREA: SOCIAL SECURITY — 42 USC, 20 CFR, ALJ hearings.`,
    },
    tributario: {
      brasil: `\nÁREA: TRIBUTÁRIO — Priorize CTN, CF/88 (arts. 145-162). Doutrina: Paulo de Barros Carvalho, Hugo de Brito Machado.
SÚMULAS STJ ESSENCIAIS: 188 (juros moratórios na repetição de indébito desde o trânsito), 212 (compensação tributária vedada em cautelar/liminar), 391 (ICMS incide sobre venda a prazo), 430 (inadimplemento tributário da sociedade não gera responsabilidade solidária do sócio-gerente), 435 (dissolução irregular presume-se e legitima redirecionamento), 436 (declaração do contribuinte constitui o crédito tributário), 555 (prazo decadencial sem declaração = art. 173, I, CTN), 649 (não incide ICMS em transferência entre estabelecimentos do mesmo contribuinte), 653 (parcelamento interrompe prescrição = confissão), 666 (legitimidade do substituído para restituição de ICMS-ST), 671 (não incide IPI após furto/roubo).
Princípios: legalidade, anterioridade, capacidade contributiva.`,
      eua: `\nAREA: TAX — IRC (Title 26 USC), Treasury Regulations, Tax Court.`,
    },
    administrativo: {
      brasil: `\nÁREA: ADMINISTRATIVO — Priorize CF/88, Lei 9.784/99, Lei 14.133/21. Doutrina: Celso Antonio Bandeira de Mello, Di Pietro.
SÚMULAS STJ ESSENCIAIS: 633 (Lei 9.784 aplica-se subsidiariamente a estados/municípios), 634 (particular = mesmo regime prescricional de improbidade), 641 (portaria de instauração do PAD prescinde de exposição detalhada), 645 (fraude à licitação é crime formal), 650 (demissão obrigatória nas hipóteses do art. 132 da Lei 8.112), 665 (controle jurisdicional do PAD limitado à legalidade), 672 (alteração de capitulação no PAD não anula se garantido contraditório), 674 (fundamentação per relationem permitida em PAD).
Princípios LIMPE (art. 37 CF).`,
      eua: `\nAREA: ADMINISTRATIVE — APA (5 USC 551), Chevron, FAR.`,
    },
    ambiental: {
      brasil: `\nÁREA: AMBIENTAL — CF/88 (art. 225), Lei 9.605/98, Código Florestal. Doutrina: Édis Milaré.
SÚMULAS STJ ESSENCIAIS: 618 (inversão do ônus da prova em degradação ambiental), 623 (obrigações ambientais propter rem), 629 (obrigação de fazer + indenização cumuláveis em dano ambiental), 652 (responsabilidade solidária da Administração por dano ambiental, execução subsidiária).`,
      eua: `\nAREA: ENVIRONMENTAL — NEPA, Clean Air/Water Acts, CERCLA.`,
    },
    bancario: {
      brasil: `\nÁREA: BANCÁRIO — Priorize CDC, CC/2002. Doutrina: Claudia Lima Marques, Arnaldo Rizzardo.
SÚMULAS STJ ESSENCIAIS: 297 (CDC aplicável a instituições financeiras), 381 (vedado conhecer de ofício abusividade em contrato bancário), 382 (juros >12% a.a. por si só não é abusivo), 472 (comissão de permanência exclui demais encargos), 479 (bancos respondem objetivamente por fraudes internas), 530 (taxa média de mercado se não comprovada a contratada), 539 (capitalização de juros permitida desde 31/3/2000 se pactuada), 565 (juros bancários não sujeitos à Lei de Usura), 566 (tarifa de cadastro permitida após 30/4/2008).`,
      eua: `\nAREA: BANKING — Dodd-Frank, TILA, FDCPA, OCC regulations.`,
    },
    imobiliario: {
      brasil: `\nÁREA: IMOBILIÁRIO — Priorize CC/2002, Lei 8.245/91 (Locações). Doutrina: Caio Mário, Arnaldo Rizzardo.
SÚMULAS STJ ESSENCIAIS: 449 (vaga de garagem com matrícula própria não é bem de família), 473 (mutuário do SFH não pode ser compelido a contratar seguro com o mutuante), 543 (resolução de contrato imobiliário CDC = restituição imediata), 549 (penhora de bem de família do fiador de locação é válida).`,
      eua: `\nAREA: REAL ESTATE — Fair Housing Act, RESPA, UCC Article 9.`,
    },
  };

  // Detect area from documentTypeId or category
  const detectedArea = detectAreaFromDocument(documentTypeId, category);
  const areaJKey = (jurisdicao === "eua") ? "eua" : "brasil";
  const areaSection = detectedArea && areaPrompts[detectedArea] ? (areaPrompts[detectedArea][areaJKey] || "") : "";

  return `${systemPrompt}${judicialExtra}${expertise}${jurisdictionSection}${regraSumular}${organizacaoDoc}${areaSection}${neuralPrompt ? `\n\nINSTRUÇÕES ESPECIALIZADAS DA REDE NEURAL:\n${neuralPrompt}` : ""}

${researchData ? `\n══════ DADOS REAIS DA PESQUISA NEURAL (use para fundamentar) ══════\n${researchData}\n══════ FIM DOS DADOS ══════\n` : ""}

TIPO DE DOCUMENTO: ${documentType}${documentTypeId ? ` (ID: ${documentTypeId})` : ""}${category ? ` | Categoria: ${category}` : ""}

DOCUMENTO ATUAL PARA APRIMORAR (mantenha tudo, apenas enriqueça):

${currentText}`;
}

// ─── Step 3: Validate Enriched Document ───
function validateDocument(doc: string, isJudicial: boolean): ValidationCheck {
  const lower = doc.toLowerCase();

  const checks: Record<string, boolean> = {
    hasSignature: lower.includes("oab/rs [OAB-NUM]") || lower.includes("oab/rs nº [OAB-NUM]") || lower.includes("[nome do advogado]"),
    hasDate: lower.includes("porto alegre") || lower.includes("de 20"),
    hasLegalBasis: /art\.\s*\d+|lei\s*n[°º]?\s*[\d\.]+|código\s*(civil|penal|processo)/i.test(doc),
    hasStructure: isJudicial
      ? lower.includes("fatos") || lower.includes("direito") || lower.includes("pedidos")
      : lower.includes("cláusula") || lower.includes("objeto"),
    noPlaceholders: !doc.includes("[inserir aqui]") && !doc.includes("[INSERIR"),
    hasMinLength: doc.split(/\s+/).length > 300,
    hasFormatting: /[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇ\s]{10,}/.test(doc) || doc.includes("**") || doc.includes("##") || doc.includes("<strong>"),
    hasCitations: /\[fonte:|conforme|nos termos d|art\.\s*\d+/i.test(doc),
    noTruncation: doc.length > 600,
    hasWitnesses: !isJudicial ? (lower.includes("testemunha") || true) : true,
    noHallucination: (() => {
      // Robust hallucination detection — same logic as gerar-documento
      const warnings: string[] = [];

      // REsp with unrealistic numbers (> 5,000,000)
      const respMatches = doc.matchAll(/REsp\s*n?[°º.]?\s*([\d\.]+)/gi);
      for (const m of respMatches) {
        const num = parseInt(m[1].replace(/\./g, ""), 10);
        if (num > 5000000) warnings.push(`REsp ${m[1]} suspeito`);
      }

      // HC with unrealistic numbers (> 900,000)
      const hcMatches = doc.matchAll(/HC\s*n?[°º.]?\s*([\d\.]+)/gi);
      for (const m of hcMatches) {
        const num = parseInt(m[1].replace(/\./g, ""), 10);
        if (num > 900000) warnings.push(`HC ${m[1]} suspeito`);
      }

      // Súmula > 800
      const sumulaMatches = doc.matchAll(/[Ss]úmula\s*(?:vinculante\s*)?n?[°º.]?\s*(\d+)/g);
      for (const m of sumulaMatches) {
        const num = parseInt(m[1], 10);
        if (num > 800) warnings.push(`Súmula ${m[1]} suspeita`);
      }

      // Future dates in citations
      const currentYear = new Date().getFullYear();
      const yearMatches = doc.matchAll(/(?:julgado|publicado|DJe?|DJ)\s*(?:em\s*)?\d{1,2}[\/\.\-]\d{1,2}[\/\.\-](\d{4})/gi);
      for (const m of yearMatches) {
        const year = parseInt(m[1], 10);
        if (year > currentYear) warnings.push(`Data futura: ${m[0]}`);
      }

      // Repetitive process number digits (e.g., 9999999)
      if (/\d{7,}/.test(doc)) {
        const longNums = doc.match(/\d{7,}/g) || [];
        for (const n of longNums) {
          if (/(.)\1{5,}/.test(n)) warnings.push(`Número repetitivo: ${n}`);
        }
      }

      return warnings.length === 0;
    })(),
    hasEnding: lower.slice(-500).includes("assinatura") || lower.slice(-500).includes("[OAB-NUM]") || lower.slice(-500).includes("____") || lower.slice(-500).includes("testemunha"),
  };

  const passed = Object.values(checks).filter(Boolean).length;
  const total = Object.keys(checks).length;
  const score = passed / total;

  const issues = Object.entries(checks)
    .filter(([, v]) => !v)
    .map(([k]) => {
      const labels: Record<string, string> = {
        hasSignature: "Falta assinatura do advogado",
        hasDate: "Falta local/data",
        hasLegalBasis: "Falta fundamentação legal (artigos de lei)",
        hasStructure: "Estrutura incompleta",
        noPlaceholders: "Contém placeholders não preenchidos",
        hasMinLength: "Documento muito curto (mínimo 300 palavras)",
        hasFormatting: "Falta formatação profissional (negrito, títulos)",
        hasCitations: "Falta citações com fontes",
        noTruncation: "Documento parece truncado",
        hasWitnesses: "Falta espaço para testemunhas",
        noHallucination: "Possível referência fictícia detectada",
        hasEnding: "Falta fecho do documento",
      };
      return labels[k] || k;
    });

  return { score, checks, issues };
}

// ─── Step 4: Auto-Index Enriched Document ───
async function autoIndexDocument(document: string, documentType: string, citations: Citation[]): Promise<number> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

  if (!supabaseUrl || !supabaseAnonKey || document.length < 500) return 0;

  try {
    const res = await fetch(`${supabaseUrl}/functions/v1/neural-search`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${supabaseAnonKey}`, apikey: supabaseAnonKey },
      signal: AbortSignal.timeout(30000),
      body: JSON.stringify({
        mode: "index",
        query: documentType,
        items: [{
          title: `[Aprimorado] ${documentType}`,
          content: document.substring(0, 4000),
          source: "enriched_doc",
          sourceLabel: "Documento Aprimorado (Auto-Evolução)",
          contentType: documentType,
          metadata: {
            citations: citations.slice(0, 10),
            enrichedAt: new Date().toISOString(),
            wordCount: document.split(/\s+/).length,
          },
        }],
      }),
    });
    if (res.ok) {
      const data = await res.json();
      return data.indexed || 0;
    }
  } catch (err) {
    console.warn("Auto-index failed:", err);
  }

  return 0;
}

// ─── Clean enriched output: strip Markdown and [fonte:] tags ───
function cleanEnrichedOutput(text: string): string {
  return text
    // Remove [fonte: ...] and (fonte: ...) tags
    .replace(/\s*\[fonte:\s*[^\]]*\]/gi, "")
    .replace(/\s*\(fonte:\s*[^)]*\)/gi, "")
    // Remove Markdown headers (# ## ### etc) — multiple patterns for safety
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^#{1,6}(?=[A-ZÀ-Ú])/gm, "")
    // Remove bold/italic markers
    .replace(/\*{1,3}([^*]+)\*{1,3}/g, "$1")
    // Remove underline markers (but NOT signature lines ____)
    .replace(/__([^_]{2,})__/g, "$1")
    // Remove bullet list markers
    .replace(/^[\-\*]\s+/gm, "")
    // Remove backtick code markers
    .replace(/`([^`]+)`/g, "$1")
    .replace(/```[\s\S]*?```/g, "")
    // Remove formatting instructions that AI might add
    .replace(/^(Fonte|Font|Espaçamento|Margem|Recuo|Alinhamento|Parágrafo):?\s*.+$/gim, "")
    // Clean up excessive blank lines
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
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

const AREA_BOOK_PRIORITY_AP: Record<string, string[]> = {
  penal: ["direito-processual-penal-completo.txt","tematica-jurisprudencia-stf-completa.txt","principios-processuais-penais.txt","sumulas-stj-inteiro-teor.txt"],
  processual_penal: ["direito-processual-penal-completo.txt","principios-processuais-penais.txt","tematica-jurisprudencia-stf-completa.txt","sumulas-stj-inteiro-teor.txt"],
  civil: ["sumulas-stj-inteiro-teor.txt","tematica-jurisprudencia-stf-completa.txt"],
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

const TXT_KNOWLEDGE_FILES_AP: Array<{ url: string; label: string; tipo: "doutrina"|"jurisprudencia"|"sumula"; areas: string[] }> = [
  { url: "sumulas-stj-inteiro-teor.txt", label: "Súmulas STJ Inteiro Teor (89k)", tipo: "sumula", areas: ["civil","penal","trabalhista","consumidor","tributario","administrativo","previdenciario","familia","bancario","imobiliario","ambiental","empresarial","processual_penal","eleitoral","internacional"] },
  { url: "direito-processual-penal-completo.txt", label: "DPP Completo (42k)", tipo: "doutrina", areas: ["penal","processual_penal"] },
  { url: "tematica-jurisprudencia-stf-completa.txt", label: "Coletânea STF Completa (27k)", tipo: "jurisprudencia", areas: ["penal","processual_penal","civil","constitucional"] },
  { url: "principios-processuais-penais.txt", label: "Princípios Processuais Penais", tipo: "doutrina", areas: ["penal","processual_penal"] },
  { url: "jurisprudencia-stf-penal.txt", label: "Jurisprudência STF Penal", tipo: "jurisprudencia", areas: ["penal","processual_penal"] },
  // === Fallback ===
  { url: "sumulas-stj-completas-v4.txt", label: "Súmulas STJ v4 (fallback)", tipo: "sumula", areas: ["civil","penal","trabalhista","consumidor","tributario","administrativo","previdenciario","familia","bancario","imobiliario","ambiental","empresarial","processual_penal"] },
  { url: "aury-lopes-direito-processual-penal-v3.txt", label: "Aury Lopes Jr. v3 (fallback)", tipo: "doutrina", areas: ["penal","processual_penal"] },
  { url: "tematica-jurisprudencia-stf-v5.txt", label: "Coletânea STF v5 (fallback)", tipo: "jurisprudencia", areas: ["penal","processual_penal"] },
  { url: "nocoes-direito-processual-penal-v4.txt", label: "Noções DPP v4 (fallback)", tipo: "doutrina", areas: ["penal","processual_penal"] },
];

const _txtCacheAP = new Map<string, { content: string; loadedAt: number }>();
const TXT_CACHE_TTL_AP = 30 * 60 * 1000;

async function loadTxtFileAP(filename: string, projectUrl: string): Promise<string | null> {
  const cached = _txtCacheAP.get(filename);
  if (cached && (Date.now() - cached.loadedAt) < TXT_CACHE_TTL_AP) return cached.content;
  try {
    const url = `${projectUrl}/docs/${filename}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const text = await res.text();
    if (text.length > 100) _txtCacheAP.set(filename, { content: text, loadedAt: Date.now() });
    return text;
  } catch (e) { console.warn(`⚠️ TXT load fail ${filename}:`, e); return null; }
}

function searchTxtContentAP(content: string, keywords: string[], maxExcerpts = 3, excerptSize = 800): string[] {
  const lines = content.split("\n");
  const excerpts: Array<{ text: string; score: number }> = [];
  const windowSize = 15;
  for (let i = 0; i < lines.length - windowSize; i += 5) {
    const window = lines.slice(i, i + windowSize).join("\n");
    const windowLower = window.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      if (windowLower.includes(kw.toLowerCase())) score += (windowLower.match(new RegExp(kw.toLowerCase(), "g")) || []).length;
    }
    if (score >= 2) excerpts.push({ text: window.substring(0, excerptSize), score });
  }
  excerpts.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const results: string[] = [];
  for (const e of excerpts) {
    const key = e.text.substring(0, 100);
    if (!seen.has(key)) { seen.add(key); results.push(e.text); if (results.length >= maxExcerpts) break; }
  }
  return results;
}

async function searchTxtKnowledgeBaseAP(query: string, keywords: string[], areaJuridica?: string, projectUrl = "https://gentle-maker-lab.lovable.app"): Promise<TxtKnowledgeResult[]> {
  const results: TxtKnowledgeResult[] = [];
  const expandedKeywords = [...keywords];
  if (areaJuridica) expandedKeywords.push(areaJuridica);
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 4);
  expandedKeywords.push(...queryWords.slice(0, 5));
  const uniqueKeywords = [...new Set(expandedKeywords)].filter(Boolean);
  if (uniqueKeywords.length === 0) return results;

  console.log(`📚 [aprimorar] TXT KB search: ${uniqueKeywords.length} keywords, area: ${areaJuridica || "geral"}`);
  const area = areaJuridica?.toLowerCase() || "civil";
  const priorityFiles = AREA_BOOK_PRIORITY_AP[area] || [];
  const orderedFiles: typeof TXT_KNOWLEDGE_FILES_AP = [];
  const seen = new Set<string>();
  for (const pf of priorityFiles) {
    const file = TXT_KNOWLEDGE_FILES_AP.find(f => f.url === pf);
    if (file && !seen.has(file.url)) { orderedFiles.push(file); seen.add(file.url); }
  }
  for (const file of TXT_KNOWLEDGE_FILES_AP) {
    if (!seen.has(file.url) && file.areas.includes(area)) { orderedFiles.push(file); seen.add(file.url); }
  }
  for (const file of TXT_KNOWLEDGE_FILES_AP) {
    if (!seen.has(file.url) && file.tipo === "sumula") { orderedFiles.push(file); seen.add(file.url); }
  }

  const searchPromises = orderedFiles.map(async (file, idx) => {
    const content = await loadTxtFileAP(file.url, projectUrl);
    if (!content) return;
    const isPriority = idx < priorityFiles.length;
    const excerpts = searchTxtContentAP(content, uniqueKeywords, isPriority ? 3 : 2, isPriority ? 1000 : 600);
    for (const excerpt of excerpts) {
      results.push({ source: file.label, title: file.label, content: excerpt, tipo: file.tipo });
    }
  });
  await Promise.allSettled(searchPromises);
  results.sort((a, b) => {
    const aP = priorityFiles.some(pf => a.source.includes(pf.replace(".txt", "")));
    const bP = priorityFiles.some(pf => b.source.includes(pf.replace(".txt", "")));
    if (aP && !bP) return -1; if (!aP && bP) return 1;
    return b.content.length - a.content.length;
  });
  console.log(`  📚 [aprimorar] TXT KB: ${results.length} excerpts found`);
  return results;
}

function formatTxtKnowledgeForPrompt(txtResults: TxtKnowledgeResult[]): string {
  if (!txtResults.length) return "";
  let section = "\n═══════════════════════════════════════════════════════════════\n";
  section += "🔒 BASE DE CONHECIMENTO VERIFICADA — LIVROS E COLETÂNEAS OFICIAIS\n";
  section += "═══════════════════════════════════════════════════════════════\n";
  section += "⚠️ FONTE VERIFICADA: Trechos extraídos DIRETAMENTE de obras publicadas.\n";
  section += "COPIE literalmente citações, números de súmulas e ementas daqui.\n";
  section += "NÃO invente dados que NÃO estejam abaixo.\n\n";
  const byTipo: Record<string, TxtKnowledgeResult[]> = {};
  txtResults.forEach(r => { if (!byTipo[r.tipo]) byTipo[r.tipo] = []; byTipo[r.tipo].push(r); });
  const labels: Record<string, string> = { doutrina: "📖 DOUTRINA", jurisprudencia: "⚖️ JURISPRUDÊNCIA", sumula: "📋 SÚMULAS" };
  for (const [tipo, items] of Object.entries(byTipo)) {
    section += `── ${labels[tipo] || tipo.toUpperCase()} ──\n`;
    items.slice(0, 4).forEach((item, i) => {
      section += `[${i+1}] ${item.source}\n${item.content}\n\n`;
    });
  }
  return section;
}

// ═══════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════
// ═══════════════════════════════════════
// CHUNKING SYSTEM — Split long documents into sections
// ═══════════════════════════════════════

const CHUNK_THRESHOLD = 6000; // Documents above this get chunked
const CHUNK_TARGET_SIZE = 4000; // Target size per chunk

function splitDocumentIntoChunks(text: string): string[] {
  // If short enough, no chunking needed
  if (text.length < CHUNK_THRESHOLD) return [text];

  // Try to split by legal section headers (CAIXA ALTA titles)
  const sectionPattern = /\n\s*\n(?=[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇ][A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇ\s]{4,}\n)/g;
  const parts: string[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = sectionPattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index).trim());
    }
    lastIndex = match.index;
  }
  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex).trim());
  }

  // If section splitting produced good chunks, use them
  if (parts.length >= 2) {
    // Merge small parts together to avoid tiny chunks
    const merged: string[] = [];
    let current = "";
    for (const part of parts) {
      if (current.length + part.length < CHUNK_TARGET_SIZE * 1.5) {
        current = current ? `${current}\n\n${part}` : part;
      } else {
        if (current) merged.push(current);
        current = part;
      }
    }
    if (current) merged.push(current);
    if (merged.length >= 2) {
      console.log(`📄 Split by sections: ${merged.length} chunks`);
      return merged;
    }
  }

  // Fallback: split by paragraphs into ~4000 char chunks
  const paragraphs = text.split(/\n\s*\n/);
  const chunks: string[] = [];
  let currentChunk = "";

  for (const para of paragraphs) {
    if (currentChunk.length + para.length > CHUNK_TARGET_SIZE && currentChunk.length > 500) {
      chunks.push(currentChunk.trim());
      currentChunk = para;
    } else {
      currentChunk = currentChunk ? `${currentChunk}\n\n${para}` : para;
    }
  }
  if (currentChunk.trim()) chunks.push(currentChunk.trim());

  console.log(`📄 Split by size: ${chunks.length} chunks`);
  return chunks;
}

function reorderProvidersForLongDocs(providers: AIProvider[], textLength: number): AIProvider[] {
  if (textLength < 10000) return providers;

  // For long documents, prioritize providers with larger output windows
  // Gemini/OpenAI first, Groq last
  const priority: Record<string, number> = {};
  for (const p of providers) {
    const name = p.name.toLowerCase();
    if (name.includes("gemini")) priority[p.name] = 1;
    else if (name.includes("claude") || name.includes("anthropic")) priority[p.name] = 2;
    else if (name.includes("openai") || name.includes("gpt")) priority[p.name] = 3;
    else if (name.includes("groq")) priority[p.name] = 4;
    else priority[p.name] = 3;
  }

  const sorted = [...providers].sort((a, b) => (priority[a.name] || 3) - (priority[b.name] || 3));
  console.log(`🔄 Reordered providers for long doc: ${sorted.map(p => p.name).join(" → ")}`);
  return sorted;
}

const ANTI_SUMMARY_INSTRUCTION = `
REGRA ANTI-RESUMO (PRIORIDADE MÁXIMA):
- O documento de saída DEVE ter tamanho IGUAL ou MAIOR que o original.
- NUNCA resuma, condense ou omita parágrafos.
- Se o documento original tem 50 parágrafos, o resultado deve ter NO MÍNIMO 50 parágrafos.
- Conte os parágrafos do original e garanta que TODOS estão presentes no resultado.
- É PROIBIDO encurtar o documento. Cada parágrafo original DEVE aparecer no resultado.

RACIOCÍNIO OBRIGATÓRIO (Chain-of-Thought — pense ANTES de agir):
Antes de modificar qualquer texto, execute mentalmente estas 4 etapas:
1. COMPREENDER: Leia o documento inteiro. Identifique: tipo jurídico, área do direito, partes envolvidas, tese central e tom argumentativo.
2. DIAGNOSTICAR: Liste internamente os pontos fracos (lacunas, erros gramaticais, falta de fundamentação, inconsistências).
3. PLANEJAR: Defina exatamente o que será corrigido/adicionado em cada parágrafo, sem alterar estilo, fonte ou formatação.
4. EXECUTAR: Aplique APENAS as correções planejadas. Preserve cada palavra que não precisa de melhoria.

REGRA DE ESTILO (PRESERVAÇÃO TOTAL):
- NÃO altere fontes, tamanhos, espaçamentos, alinhamentos ou cores.
- NÃO introduza formatação nova (negrito, itálico) que não existia no original.
- Modifique APENAS o conteúdo textual — a "escrita", não o "visual".`;

async function processChunked(
  chunks: string[],
  providers: AIProvider[],
  buildPromptFn: (chunkText: string, chunkIndex: number, totalChunks: number, previousContext: string) => Array<{ role: string; content: string }>,
  maxTokensPerChunk: number,
  temperature: number,
): Promise<{ content: string; provider: string }> {
  const results: string[] = [];
  let lastProvider = "";
  let previousContext = "";

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const messages = buildPromptFn(chunk, i, chunks.length, previousContext);
    const chunkMaxTokens = Math.max(4096, Math.ceil(chunk.length * 1.5));

    console.log(`📝 Processing chunk ${i + 1}/${chunks.length} (${chunk.length} chars, maxTokens: ${chunkMaxTokens})...`);

    const result = await callWithFallback(providers, messages, Math.min(chunkMaxTokens, maxTokensPerChunk), temperature);
    results.push(result.content);
    lastProvider = result.provider;

    // Build a brief context summary for the next chunk (first 200 chars of this result)
    previousContext = result.content.substring(0, 200);
  }

  return { content: results.join("\n\n"), provider: lastProvider };
}

// ═══════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const startTime = Date.now();

  try {
    // FIX: A1 — Validate user authentication
    const authHeader = req.headers.get("authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Autenticação obrigatória." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const token = authHeader.replace("Bearer ", "");
    const supabaseAuth = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Não autorizado. Faça login novamente." }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const { currentText, documentType, documentTypeId, category, query, isJudicial, mode, refinementMode, refinementResponses, aggregateResponses, jurisdicao = "brasil", userQuery, formattingOptions, userInstruction, chatHistory, systemOverride, contextSnippet }: EnrichRequest = await req.json();

    // ─── CHAT MODE: conversational assistant with editing powers ───
    if (mode === "chat") {
      console.log(`💬 Chat mode: conversational editor assistant`);
      const providers = getProviders();
      if (providers.length === 0) throw new Error("No AI providers configured");

      const plainContent = currentText.replace(/<[^>]*>/g, "").substring(0, 6000);
      const defaultSystemPrompt = `Você é um assistente jurídico avançado integrado ao editor de documentos.
Tipo do documento: ${documentType || "Documento jurídico"}
Conteúdo atual (resumo): ${plainContent.substring(0, 3000)}

REGRAS:
- Quando o usuário pedir edição, retorne o texto dentro de <<<EDIT>>>...<<<END>>>
- Quando sugerir adição, use <<<INSERT>>>...<<<END>>>
- Para análise/conversa, responda normalmente sem blocos.
- Responda em português jurídico formal, conciso mas completo.
- Cite artigos reais, súmulas e jurisprudência. NUNCA invente.`;

      const messages = [
        { role: "system", content: systemOverride || defaultSystemPrompt },
        ...(chatHistory || []).slice(-10),
        { role: "user", content: query || "" },
      ];

      const result = await callWithFallback(providers, messages, 16384, 0.4);
      const elapsed = Date.now() - startTime;

      return new Response(JSON.stringify({
        chatResponse: result.content,
        provider: result.provider,
        elapsed,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const minLen = mode === "light" ? 5 : 50;
    if (!currentText || currentText.replace(/<[^>]*>/g, "").trim().length < minLen) {
      return new Response(JSON.stringify({ error: "Texto insuficiente para aprimorar" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── REFINEMENT MODE: second pass with user-provided details ───
    if (refinementMode && refinementResponses && Object.keys(refinementResponses).length > 0) {
      console.log("🔄 Refinement mode: integrating user responses...");
      let providers = getProviders();
      if (providers.length === 0) throw new Error("No AI providers configured");

      const plainText = currentText.replace(/<[^>]*>/g, "");
      providers = reorderProvidersForLongDocs(providers, plainText.length);
      const docKnowledge = getDocumentKnowledgePrompt(documentTypeId, category);

      const responsesText = Object.entries(refinementResponses)
        .map(([q, a]) => `- ${q}: ${a}`)
        .join("\n");

      const refinementPrompt = `Você é um especialista em documentos jurídicos brasileiros.
O usuário forneceu detalhes adicionais para PERSONALIZAR este documento.
${ANTI_SUMMARY_INSTRUCTION}

REGRAS ABSOLUTAS:
1. Integre CADA resposta abaixo no texto existente, adicionando argumentos, fundamentação e especificidade.
2. NÃO resuma. NÃO remova parágrafos. NÃO encurte o documento.
3. ADICIONE os detalhes nos locais apropriados do texto (ex: renda na seção de fatos, provas na fundamentação).
4. O resultado DEVE ser MAIOR ou IGUAL ao original.
5. NÃO use Markdown. Retorne texto puro.
6. Títulos em CAIXA ALTA sem prefixos.
${docKnowledge}

RESPOSTAS DO USUÁRIO PARA INTEGRAR:
${responsesText}`;

      const chunks = splitDocumentIntoChunks(plainText);
      let enrichedRaw: string;
      let provider: string;

      if (chunks.length > 1) {
        const result = await processChunked(chunks, providers, (chunkText, idx, total, _ctx) => [
          { role: "system", content: `${refinementPrompt}\n\nEsta é a SEÇÃO ${idx + 1} de ${total}. Integre os detalhes APENAS nesta seção onde pertinente.` },
          { role: "user", content: `Integre os detalhes do usuário nesta seção:\n\n${chunkText}` },
        ], 32768, 0.3);
        enrichedRaw = result.content;
        provider = result.provider;
      } else {
        const result = await callWithFallback(providers, [
          { role: "system", content: refinementPrompt },
          { role: "user", content: `Integre os detalhes do usuário no documento abaixo. Retorne o documento COMPLETO personalizado:\n\n${plainText}` },
        ], 32768, 0.3);
        enrichedRaw = result.content;
        provider = result.provider;
      }

      const finalText = cleanEnrichedOutput(enrichedRaw);
      const elapsed = Date.now() - startTime;
      console.log(`✅ Refinement complete: ${finalText.length} chars via ${provider}, ${elapsed}ms`);

      return new Response(JSON.stringify({
        enrichedText: finalText,
        citations: [],
        validation: validateDocument(finalText, isJudicial),
        provider,
        researchCount: 0,
        elapsed,
        chunksProcessed: chunks.length > 1 ? chunks.length : undefined,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── PLANNING MODE: AI analyzes and creates action plan BEFORE editing ───
    if (mode === "planning") {
      console.log("🧠 Planning mode: Chain-of-Thought analysis before action...");
      const providers = getProviders();
      if (providers.length === 0) throw new Error("No AI providers configured");
      const plainText = currentText.replace(/<[^>]*>/g, "").substring(0, 8000);
      const docKnowledge = getDocumentKnowledgePrompt(documentTypeId, category);

      const planningPrompt = `Você é um ADVOGADO ESTRATEGISTA SÊNIOR com especialização em ${category || "direito brasileiro"}.

TAREFA: Analise o documento abaixo e produza um PLANO DE AÇÃO detalhado, SEM modificar o texto.

${docKnowledge}

ETAPAS OBRIGATÓRIAS DE RACIOCÍNIO:

## 1. COMPREENSÃO
- Tipo de documento detectado
- Área do direito
- Partes envolvidas (autor/réu)
- Tese central do documento
- Tom argumentativo atual

## 2. DIAGNÓSTICO
- Pontos FORTES da argumentação (liste cada um)
- Pontos FRACOS e lacunas (liste cada um com gravidade: 🔴 crítico, 🟡 moderado, 🟢 leve)
- Fundamentação legal presente vs. ausente
- Qualidade das citações jurisprudenciais
- Consistência lógica entre parágrafos

## 3. PLANO DE MELHORIAS
Para cada parágrafo que precisa de melhoria, indique:
- Número/trecho do parágrafo
- O que será feito (corrigir gramática, adicionar fundamentação, reforçar argumento, etc.)
- Impacto esperado (baixo/médio/alto)

## 4. ESTRATÉGIA RECOMENDADA
- Ações prioritárias (top 3)
- Teses defensivas não exploradas
- Legislação recomendada para adicionar
- Nota geral do documento (1-10)

REGRAS:
- NÃO modifique o texto — apenas analise e planeje.
- Seja específico e cite trechos reais do documento.
- Responda em português formal, estruturado.`;

      const planResult = await callWithFallback(
        providers,
        [
          { role: "system", content: planningPrompt },
          { role: "user", content: `Analise e crie o plano de ação para este documento (${documentType || "jurídico"}):\n\n${plainText}` },
        ],
        16384,
        0.3,
      );

      const elapsed = Date.now() - startTime;
      console.log(`✅ Planning complete: ${planResult.content.length} chars via ${planResult.provider}, ${elapsed}ms`);

      return new Response(JSON.stringify({
        plan: planResult.content,
        provider: planResult.provider,
        elapsed,
        mode: "planning",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ─── GAPS MODE: varredura profunda + análise de posicionamento pró-cliente ───
    if (mode === "gaps") {
      console.log(`🔍 Gaps mode: Corregedoria-Geral deep scan + strategic positioning...${userInstruction ? ` (user: ${userInstruction.substring(0, 80)})` : ""}`);
      const providers = getProviders();
      if (providers.length === 0) throw new Error("No AI providers configured");
      const plainText = currentText.replace(/<[^>]*>/g, "");
      const docKnowledge = getDocumentKnowledgePrompt(documentTypeId, category);
      const knowledgeEntry = documentTypeId ? DOCUMENT_KNOWLEDGE[documentTypeId] : null;
      const structureGuide = knowledgeEntry?.structure || "";

      // ── FASE 1: Análise de posicionamento — Corregedoria-Geral ──────────────────────────────────
      const positionPrompt = `Você é um ADVOGADO SÊNIOR DA CORREGEDORIA-GERAL com 25 anos de experiência em defesa de clientes em processos de alta complexidade.
Sua especialidade é realizar revisões técnicas profundas como se fosse uma auditoria jurídica completa — identificando cada lacuna, cada argumento não explorado, cada direito não invocado.

Você está analisando o seguinte documento com a visão de quem conhece TODOS os recursos, teses e caminhos possíveis para defender o cliente.

TIPO DE DOCUMENTO: ${documentType}
ESTRUTURA ESPERADA: ${structureGuide}
${docKnowledge}

MISSÃO CRÍTICA:
Realize uma VARREDURA PROFUNDA como especialista da Corregedoria-Geral e retorne um JSON com:
{
  "positionamento": "favoravel" | "desfavoravel" | "neutro",
  "resumo_estrategico": "Análise técnica em 2-3 frases de como está a defesa atual — seja preciso e técnico",
  "pontos_fortes": ["Argumento jurídico sólido identificado 1", "Fundamentação bem elaborada 2"],
  "riscos_identificados": ["Lacuna técnica que pode ser explorada pela parte contrária 1", "Tese não reforçada 2"],
  "lacunas": [
    "Pergunta técnica específica 1 que, ao ser respondida, FORTALECE a tese defensiva?",
    "Pergunta sobre direito ou fato não explorado 2?",
    "Pergunta sobre jurisprudência ou legislação aplicável não citada 3?",
    "Pergunta sobre circunstâncias fáticas do caso que impactam a defesa 4?",
    "Pergunta sobre condições pessoais do cliente relevantes para atenuação/absolvição 5?",
    "Pergunta sobre provas ou documentos que podem fortalecer a posição 6?",
    "Pergunta sobre nulidades processuais não arguidas 7?",
    "Pergunta sobre medidas alternativas ou subsidiárias não requeridas 8?"
  ],
  "alerta_contra_cliente": true | false,
  "descricao_alerta": "Se houver conteúdo que PREJUDICA o cliente (admissão de culpa, exposição de vulnerabilidade, argumento contraproducente), descreva aqui com precisão técnica"
}

DIRETRIZES DO ESPECIALISTA DA CORREGEDORIA:
- Você atua 100% em favor do cliente/requerente/defendido. Jamais produza argumentos contrários.
- Cada pergunta de lacuna deve ser altamente específica ao tipo de peça e ao caso — NUNCA genérica.
- Perguntas técnicas: cite artigos, súmulas, princípios constitucionais não explorados.
- Questione: há nulidades? Há prazos vencidos pela parte contrária? Há precedentes favoráveis não citados?
- Questione: o cliente tem atenuantes, causas excludentes, condições pessoais relevantes?
- Questione: há diligências, provas periciais, testemunhas não arroladas que beneficiariam?
- Identifique se a peça deixa de requerer tutelas de urgência, liminares ou medidas cautelares cabíveis.
- Alerte se qualquer trecho do documento ADMITE culpa, cede terreno desnecessariamente ou expõe o cliente.
- Gere entre 5 e 8 perguntas de lacunas — todas de alto valor estratégico para a defesa.
${userInstruction ? `\nINSTRUÇÃO ESPECÍFICA DO ADVOGADO: "${userInstruction}"\nDê prioridade absoluta a esta instrução na análise. Direcione as lacunas e sugestões para atender este pedido específico.\n` : ""}
DOCUMENTO PARA ANÁLISE TÉCNICA:
${plainText.substring(0, 12000)}

Retorne APENAS o JSON, sem texto extra. Seja tecnicamente preciso como um corregedor examinando a atuação profissional.`;

      const posResult = await callWithFallback(providers, [
        { role: "system", content: "Você é um advogado sênior da Corregedoria-Geral realizando auditoria técnica de peça jurídica. Retorne EXCLUSIVAMENTE um objeto JSON válido conforme instruído. Nenhum texto, comentário ou markdown fora do JSON." },
        { role: "user", content: positionPrompt },
      ], 4000, 0.2);

      let analysisResult: {
        positionamento: string;
        resumo_estrategico: string;
        pontos_fortes: string[];
        riscos_identificados: string[];
        lacunas: string[];
        alerta_contra_cliente: boolean;
        descricao_alerta: string;
      } = {
        positionamento: "neutro",
        resumo_estrategico: "",
        pontos_fortes: [],
        riscos_identificados: [],
        lacunas: [],
        alerta_contra_cliente: false,
        descricao_alerta: "",
      };

      try {
        const jsonMatch = posResult.content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          analysisResult = { ...analysisResult, ...parsed };
        }
      } catch {
        // Fallback: tentar extrair perguntas do texto
        const lines = posResult.content.split("\n").filter(l => l.trim().endsWith("?"));
        analysisResult.lacunas = lines.slice(0, 6);
      }

      const gapQuestions = analysisResult.lacunas.filter(q => q && q.trim().length > 5);

      console.log(`🔍 Deep scan: posicionamento=${analysisResult.posicionamento || analysisResult.positionamento}, lacunas=${gapQuestions.length}, alerta=${analysisResult.alerta_contra_cliente}`);

      return new Response(JSON.stringify({
        gapQuestions,
        positionamento: analysisResult.positionamento,
        resumoEstrategico: analysisResult.resumo_estrategico,
        pontosFortesDoc: analysisResult.pontos_fortes || [],
        riscosIdentificados: analysisResult.riscos_identificados || [],
        alertaContraCliente: analysisResult.alerta_contra_cliente,
        descricaoAlerta: analysisResult.descricao_alerta,
        provider: posResult.provider,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ─── AGGREGATE MODE: add new content WITHOUT erasing existing — sempre pró-cliente ───
    if (mode === "aggregate" && aggregateResponses && Object.keys(aggregateResponses).length > 0) {
      console.log("➕ Aggregate mode: adding pro-client content (Corregedoria-Geral approach)...");
      let providers = getProviders();
      if (providers.length === 0) throw new Error("No AI providers configured");
      const plainText = currentText.replace(/<[^>]*>/g, "");
      providers = reorderProvidersForLongDocs(providers, plainText.length);
      const docKnowledge = getDocumentKnowledgePrompt(documentTypeId, category);

      const responsesText = Object.entries(aggregateResponses)
        .filter(([, v]) => v.trim())
        .map(([q, a]) => `LACUNA IDENTIFICADA: ${q}\nRESPOSTA DO ADVOGADO: ${a}`)
        .join("\n\n");

      const aggregatePrompt = `Você é um ADVOGADO SÊNIOR DA CORREGEDORIA-GERAL com 25 anos de experiência, atuando EXCLUSIVAMENTE em defesa do cliente/requerente/autor.
O advogado está AGREGANDO informações para FORTALECER a peça — NÃO reescreva, NÃO apague, NÃO resuma.

DIRETRIZ FUNDAMENTAL DA CORREGEDORIA — SEMPRE PRÓ-CLIENTE:
- Você atua 100% do lado do cliente/requerente. Jamais produza argumento que enfraqueça a tese defensiva.
- Cada informação fornecida deve ser TRANSFORMADA em argumento jurídico favorável, com base em legislação e jurisprudência protetiva.
- Se uma informação puder prejudicar o cliente, REFORMULE-A defensivamente — use-a como atenuante, excludente ou fato contextual favorável.
- Nunca admita culpa, responsabilidade ou vulnerabilidades processuais.
- Cite artigos de lei, súmulas do STJ/STF e princípios constitucionais que beneficiem o cliente.

REGRAS ABSOLUTAS DE INTEGRIDADE DOCUMENTAL:
1. O documento final DEVE conter TODO o texto original INTACTO — palavra por palavra.
2. ADICIONE os novos argumentos nos locais juridicamente corretos (fatos, mérito, fundamentação, pedidos).
3. Novos argumentos devem ser integrados organicamente, não apenas colados ao final.
4. NÃO resuma nada. O resultado OBRIGATORIAMENTE deve ser MAIOR que o original.
5. NÃO use Markdown (#, ##, **, *). Retorne texto puro com quebras de linha.
6. Títulos de seção em CAIXA ALTA.
7. Preserve a estrutura jurídica, o estilo forense e o endereçamento do documento.
${docKnowledge}

INFORMAÇÕES FORNECIDAS PELO ADVOGADO (TRANSFORME EM ARGUMENTOS DEFENSIVOS SÓLIDOS):
${responsesText}

DOCUMENTO ORIGINAL (CADA PALAVRA DEVE PERMANECER INTACTA NO RESULTADO):`;

      const chunks = splitDocumentIntoChunks(plainText);
      let enrichedRaw: string;
      let provider: string;

      if (chunks.length > 1) {
        const result = await processChunked(chunks, providers, (chunkText, idx, total, _ctx) => [
          { role: "system", content: `${aggregatePrompt}\n\nEsta é a SEÇÃO ${idx + 1} de ${total}. Agregue os argumentos defensivos APENAS onde pertinente nesta seção. Preserve tudo. Não resuma.` },
          { role: "user", content: `Agregue os novos argumentos a esta seção preservando TUDO:\n\n${chunkText}` },
        ], 32768, 0.3);
        enrichedRaw = result.content;
        provider = result.provider;
      } else {
        const result = await callWithFallback(providers, [
          { role: "system", content: aggregatePrompt },
          { role: "user", content: `Agregue os novos argumentos defensivos ao documento abaixo. Retorne o documento COMPLETO — cada seção, cada parágrafo do original — com os novos argumentos integrados nos locais corretos:\n\n${plainText}` },
        ], 32768, 0.3);
        enrichedRaw = result.content;
        provider = result.provider;
      }

      const cleanedText = cleanEnrichedOutput(enrichedRaw);
      // Convert plain text result to HTML paragraphs so the editor preserves page count and formatting
      const finalText = /<(p|div|h[1-6]|br)\b/i.test(cleanedText)
        ? cleanedText
        : cleanedText
            .split(/\n{2,}/)
            .filter((block: string) => block.trim().length > 0)
            .map((block: string) => `<p>${block.replace(/\n/g, "<br>")}</p>`)
            .join("");

      const elapsed = Date.now() - startTime;
      console.log(`✅ Aggregate complete: ${finalText.length} chars (original: ${plainText.length}) via ${provider}, ${elapsed}ms`);

      return new Response(JSON.stringify({
        enrichedText: finalText,
        citations: [],
        validation: validateDocument(cleanedText, isJudicial),
        provider,
        researchCount: 0,
        elapsed,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let providers = getProviders();
    if (providers.length === 0) {
      throw new Error("No AI providers configured");
    }

    const plainText = currentText.replace(/<[^>]*>/g, "");

    // Reorder providers for long documents (prioritize larger output models)
    providers = reorderProvidersForLongDocs(providers, plainText.length);

    console.log(`📝 Aprimorando documento: ${documentType} (${documentTypeId || "?"} / ${category || "?"}), ${plainText.length} chars`);

    // Fetch active neural prompt version for this document scope
    let neuralPrompt: string | undefined;
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
      const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
      if (supabaseUrl && serviceKey) {
        const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2.39.3");
        const sb = createClient(supabaseUrl, serviceKey);
        const scopes = [`doc_type_${documentTypeId}`, `doc_type_${category}`, "document_generation", "aprimorar"];
        const { data: versions } = await sb
          .from("neural_prompt_versions")
          .select("content, scope")
          .in("scope", scopes)
          .eq("is_active", true)
          .limit(1);
        if (versions && versions.length > 0) {
          neuralPrompt = versions[0].content;
          console.log(`🧠 Using neural prompt v. for scope: ${versions[0].scope}`);
        }
      }
    } catch (err) {
      console.warn("Neural prompt lookup failed:", err);
    }

    const isLightMode = mode === "light";
    const isLegalMode = mode === "legal";
    const isFormattingMode = mode === "formatting";
    const isFullMode = !isLightMode && !isLegalMode && !isFormattingMode;

    // Get document-specific knowledge for injection into all modes
    const docKnowledgeForPrompt = getDocumentKnowledgePrompt(documentTypeId, category);

    // Split into chunks for long documents
    const chunks = splitDocumentIntoChunks(plainText);
    const isChunked = chunks.length > 1;
    const totalChunks = chunks.length;

    if (isChunked) {
      console.log(`📦 Document will be processed in ${totalChunks} chunks (total ${plainText.length} chars)`);
    }

    let enrichedRaw: string;
    let provider: string;
    let citations: Citation[] = [];
    let searchResults: any[] = [];

    if (isFormattingMode) {
      // ─── FORMATTING MODE: ABNT structure only, no content changes ───
      console.log(`📐 Formatting mode: ABNT structure corrections only${formattingOptions ? ` (options: ${formattingOptions.join(", ")})` : ""}`);

      if (isChunked) {
        const result = await processChunked(chunks, providers, (chunkText, idx, total, _ctx) => [
          {
            role: "system",
            content: `Você é um especialista em formatação ABNT de documentos jurídicos brasileiros.
Esta é a SEÇÃO ${idx + 1} de ${total} do documento. Aprimore APENAS esta seção.${ANTI_SUMMARY_INSTRUCTION}
${formattingOptions && formattingOptions.length > 0 ? `\nFOCO DO USUÁRIO:\n${formattingOptions.includes("grammar") ? "- Corrigir gramática e ortografia\n" : ""}${formattingOptions.includes("alignment") ? "- Verificar alinhamento e espaçamento\n" : ""}${formattingOptions.includes("punctuation") ? "- Padronizar pontuação\n" : ""}${formattingOptions.includes("lists") ? "- Organizar listas e numeração\n" : ""}` : ""}
REGRAS ABSOLUTAS:
1. NÃO altere o conteúdo — nenhuma palavra pode ser adicionada ou removida.
2. Corrija APENAS a formatação e estrutura.
3. NÃO use Markdown. Retorne texto puro.
4. Retorne esta seção COMPLETA reformatada.${docKnowledgeForPrompt}`,
          },
          { role: "user", content: `Corrija apenas a formatação ABNT desta seção:\n\n${chunkText}` },
        ], 32768, 0.1);
        enrichedRaw = result.content;
        provider = result.provider;
      } else {
        const fmtResult = await callWithFallback(
          providers,
          [
            {
              role: "system",
              content: `Você é um especialista em formatação ABNT de documentos jurídicos brasileiros.
${ANTI_SUMMARY_INSTRUCTION}
${formattingOptions && formattingOptions.length > 0 ? `\nFOCO DO USUÁRIO (aplique APENAS estas verificações):\n${formattingOptions.includes("grammar") ? "- Corrigir gramática e ortografia\n" : ""}${formattingOptions.includes("alignment") ? "- Verificar alinhamento e espaçamento\n" : ""}${formattingOptions.includes("punctuation") ? "- Padronizar pontuação (., , -)\n" : ""}${formattingOptions.includes("lists") ? "- Organizar listas e numeração\n" : ""}` : ""}
REGRAS ABSOLUTAS:
1. NÃO altere o conteúdo — nenhuma palavra pode ser adicionada ou removida.
2. Corrija APENAS a formatação e estrutura:
   - Títulos de seção em CAIXA ALTA (ex: DOS FATOS, DO DIREITO, DOS PEDIDOS)
   - Separação correta de parágrafos
   - Numeração de cláusulas quando aplicável
   - Alinhamento de blocos de assinatura
3. NÃO adicione fundamentação legal, jurisprudência ou novos argumentos.
4. NÃO use Markdown (#, ##, **, *). Retorne texto puro.
5. NÃO insira [fonte:] nem instruções de margem/fonte.
6. Mantenha blocos de assinatura (___) intactos.
7. Retorne o documento COMPLETO reformatado.${docKnowledgeForPrompt}`,
            },
            {
              role: "user",
              content: `Corrija apenas a formatação ABNT deste documento jurídico. Retorne o documento completo reformatado:\n\n${plainText}`,
            },
          ],
          32768,
          0.1
        );
        enrichedRaw = fmtResult.content;
        provider = fmtResult.provider;
      }
    } else if (isLightMode) {
      // ─── LIGHT MODE ───
      // When userQuery is provided (bubble menu actions), use it as the instruction
      // Otherwise fall back to generic grammar/style correction
      const hasBubbleAction = !!(userQuery && userInstruction);
      console.log(`✏️ Light mode: ${hasBubbleAction ? "bubble action with custom prompt" : "grammar & style corrections only"}`);

      if (hasBubbleAction) {
        // ── BUBBLE MENU ACTION: use the action-specific prompt from the frontend ──
        const bubbleResult = await callWithFallback(
          providers,
          [
            {
              role: "system",
              content: `Você é um assistente jurídico especializado em documentos brasileiros.
${userInstruction}

REGRAS ADICIONAIS:
1. NÃO use Markdown (#, ##, **, *). Retorne texto puro.
2. NÃO insira [fonte:] nem instruções de formatação.
3. NÃO adicione prefixos como "Aqui está", "Texto melhorado:" etc.
4. Retorne SOMENTE o resultado solicitado.${docKnowledgeForPrompt}`,
            },
            {
              role: "user",
              content: userQuery,
            },
          ],
          16384,
          0.2
        );
        enrichedRaw = bubbleResult.content;
        provider = bubbleResult.provider;
      } else if (isChunked) {
        const result = await processChunked(chunks, providers, (chunkText, idx, total, _ctx) => [
          {
            role: "system",
            content: `Você é um revisor gramatical e de estilo de documentos jurídicos em português do Brasil.
Esta é a SEÇÃO ${idx + 1} de ${total} do documento. Corrija APENAS esta seção.${ANTI_SUMMARY_INSTRUCTION}

REGRAS: Corrija APENAS erros gramaticais e de concordância. NÃO adicione novos parágrafos. NÃO use Markdown. Retorne esta seção COMPLETA corrigida.${docKnowledgeForPrompt}`,
          },
          { role: "user", content: `Corrija gramática e estilo desta seção:\n\n${chunkText}` },
        ], 32768, 0.15);
        enrichedRaw = result.content;
        provider = result.provider;
      } else {
        const lightResult = await callWithFallback(
          providers,
          [
            {
              role: "system",
              content: `Você é um revisor gramatical e de estilo de documentos jurídicos em português do Brasil.
${ANTI_SUMMARY_INSTRUCTION}

REGRAS ABSOLUTAS:
1. Corrija APENAS erros gramaticais, ortográficos e de concordância.
2. Melhore a fluidez e clareza das frases SEM mudar o sentido.
3. NÃO adicione novos parágrafos, citações, fundamentação legal ou jurisprudência.
4. NÃO remova nenhum parágrafo, frase ou palavra significativa.
5. O resultado DEVE ter o MESMO número de parágrafos do original.
6. NÃO use Markdown (#, ##, **, *). Retorne texto puro.
7. NÃO insira [fonte:] nem instruções de formatação.
8. Mantenha blocos de assinatura (___) e dados estruturais intactos.
9. Mantenha títulos em CAIXA ALTA como estão.
10. Retorne o documento COMPLETO com as correções aplicadas.${docKnowledgeForPrompt}`,
            },
            {
              role: "user",
              content: `Corrija gramática e estilo deste documento jurídico. Retorne o documento completo corrigido:\n\n${plainText}`,
            },
          ],
          32768,
          0.15
        );
        enrichedRaw = lightResult.content;
        provider = lightResult.provider;
      }
    } else if (isLegalMode) {
      // ─── LEGAL MODE: add legal basis without changing existing text ───
      console.log("⚖️ Legal mode: Neural Search + TXT KB + add legal citations...");
      const searchQuery = userQuery || query || `${documentType} ${plainText.substring(0, 200)}`;
      const detectedArea = detectAreaFromDocument(documentTypeId, category);
      const txtKeywords = searchQuery.toLowerCase().split(/\s+/).filter(w => w.length > 3).slice(0, 6);

      const [searchData, txtResults] = await Promise.all([
        searchLegalBases(searchQuery, documentType),
        searchTxtKnowledgeBaseAP(searchQuery, txtKeywords, detectedArea || undefined),
      ]);
      searchResults = searchData.results;
      citations = searchData.citations;

      const researchData = searchResults.length > 0
        ? searchResults
            .slice(0, 15)
            .map((r: any) => {
              const source = r.source_label || r.sourceLabel || r.source || "";
              const title = r.title || "";
              const content = (r.content || r.description || "").substring(0, 400);
              const url = r.url || "";
              return `[${source}] ${title}: ${content}${url ? ` (${url})` : ""}`;
            })
            .join("\n\n")
        : "";

      const txtSection = formatTxtKnowledgeForPrompt(txtResults);

      const legalSystemPrompt = `Você é um especialista em fundamentação legal de documentos jurídicos brasileiros.
${ANTI_SUMMARY_INSTRUCTION}

REGRAS ABSOLUTAS:
1. PRESERVAR CADA PALAVRA do documento original. NÃO remova, substitua nem reescreva nenhum parágrafo.
2. APENAS ADICIONE fundamentação legal ENTRE ou APÓS os parágrafos existentes:
   - Artigos de lei (CP, CPP, CPC, CC, CLT, CF/88)
   - Jurisprudência real dos dados de pesquisa fornecidos
   - Cláusulas faltantes se for contrato
3. NÃO altere gramática, formatação ou estrutura — apenas adicione leis e citações.
4. NÃO use Markdown (#, ##, **, *). Retorne texto puro.
5. NÃO insira [fonte:] nem instruções de formatação.
6. Cite leis no corpo do texto: "conforme Art. X da Lei Y".
7. NUNCA invente números de processo, acórdãos ou jurisprudência.
8. Para SÚMULAS, copie o NÚMERO e ENUNCIADO COMPLETO da BASE VERIFICADA abaixo.
9. Se um dado NÃO está na BASE VERIFICADA nem nos dados de pesquisa, NÃO cite.
10. Retorne o documento COMPLETO enriquecido.
${docKnowledgeForPrompt}
${txtSection}
${researchData ? `\n══════ DADOS REAIS DA PESQUISA NEURAL ══════\n${researchData}\n══════ FIM DOS DADOS ══════\n` : ""}`;

      if (isChunked) {
        const result = await processChunked(chunks, providers, (chunkText, idx, total, _ctx) => [
          {
            role: "system",
            content: `${legalSystemPrompt}\n\nEsta é a SEÇÃO ${idx + 1} de ${total}. Enriqueça APENAS esta seção com fundamentação legal. NÃO resuma.`,
          },
          { role: "user", content: `Adicione fundamentação legal a esta seção:\n\n${chunkText}` },
        ], 32768, 0.25);
        enrichedRaw = result.content;
        provider = result.provider;
      } else {
        const legalResult = await callWithFallback(
          providers,
          [
            { role: "system", content: legalSystemPrompt },
            { role: "user", content: `Adicione fundamentação legal a este documento. Retorne o documento completo enriquecido:\n\n${plainText}` },
          ],
          32768,
          0.25
        );
        enrichedRaw = legalResult.content;
        provider = legalResult.provider;
      }
    } else {
      // ─── FULL MODE: research + enrichment + TXT KB (original behavior + anti-hallucination) ───
      console.log("🔍 Full mode: Neural Search + TXT KB + AI Enrichment...");
      const searchQuery = query || `${documentType} ${plainText.substring(0, 200)}`;
      const detectedAreaFull = detectAreaFromDocument(documentTypeId, category);
      const txtKeywordsFull = searchQuery.toLowerCase().split(/\s+/).filter(w => w.length > 3).slice(0, 6);

      const [searchData, txtResultsFull] = await Promise.all([
        searchLegalBases(searchQuery, documentType),
        searchTxtKnowledgeBaseAP(searchQuery, txtKeywordsFull, detectedAreaFull || undefined),
      ]);
      searchResults = searchData.results;
      citations = searchData.citations;

      const researchData = searchResults.length > 0
        ? searchResults
            .slice(0, 15)
            .map((r: any) => {
              const source = r.source_label || r.sourceLabel || r.source || "";
              const title = r.title || "";
              const content = (r.content || r.description || "").substring(0, 400);
              const url = r.url || "";
              return `[${source}] ${title}: ${content}${url ? ` (${url})` : ""}`;
            })
            .join("\n\n")
        : "";

      const txtSectionFull = formatTxtKnowledgeForPrompt(txtResultsFull);

      console.log(`📚 Found ${searchResults.length} neural sources, ${citations.length} citations, ${txtResultsFull.length} TXT excerpts`);

      const ANTI_HALLUCINATION_FULL = `
═══════════════════════════════════════════════════════════════
⚠️ REGRAS ANTI-ALUCINAÇÃO (OBRIGATÓRIAS):
1. Para SÚMULAS: copie NÚMERO e ENUNCIADO COMPLETO da BASE VERIFICADA
2. Para JURISPRUDÊNCIA: copie dados EXATOS (tribunal, número, relator, data)
3. Se um dado NÃO está na BASE VERIFICADA nem na REDE NEURAL, NÃO cite
4. NUNCA invente números de processo, acórdãos ou precedentes
5. Prefira legislação codificada (verificável) a jurisprudência inventada
6. A Rede Neural valida: se o embedding NÃO confirma, NÃO use
═══════════════════════════════════════════════════════════════`;

      if (isChunked) {
        const enrichPromptBase = buildEnrichmentPrompt("", researchData, isJudicial, documentType, documentTypeId, category, neuralPrompt, jurisdicao);
        const result = await processChunked(chunks, providers, (chunkText, idx, total, _ctx) => [
          {
            role: "system",
            content: `Você é um revisor jurídico sênior. REGRAS INVIOLÁVEIS: 1) TEXTO PURO — proibido Markdown. 2) NÃO remova nenhuma palavra do original. 3) Títulos em CAIXA ALTA.
Esta é a SEÇÃO ${idx + 1} de ${total}. Aprimore APENAS esta seção. NÃO resuma.${ANTI_SUMMARY_INSTRUCTION}
${researchData ? `\n══════ DADOS DA PESQUISA NEURAL ══════\n${researchData.substring(0, 3000)}\n══════ FIM ══════\n` : ""}
${txtSectionFull}
${docKnowledgeForPrompt}
${ANTI_HALLUCINATION_FULL}`,
          },
          { role: "user", content: `Aprimore esta seção do documento jurídico. Retorne a seção COMPLETA aprimorada:\n\n${chunkText}` },
        ], 32768, 0.25);
        enrichedRaw = result.content;
        provider = result.provider;
      } else {
        const enrichPrompt = buildEnrichmentPrompt(plainText, researchData, isJudicial, documentType, documentTypeId, category, neuralPrompt, jurisdicao);

        const fullResult = await callWithFallback(
          providers,
          [
            { role: "system", content: `Você é um revisor jurídico sênior. Retorne o documento aprimorado completo. REGRAS INVIOLÁVEIS: 1) TEXTO PURO — proibido #, ##, **, *, -, \`\`\`, Markdown. 2) Proibido [fonte:]. 3) Proibido instruções de formatação (margens, fontes). 4) NÃO remova nenhuma palavra do original. 5) Títulos em CAIXA ALTA sem prefixos.${ANTI_SUMMARY_INSTRUCTION}
${txtSectionFull}
${ANTI_HALLUCINATION_FULL}` },
            { role: "user", content: enrichPrompt },
          ],
          32768,
          0.25
        );
        enrichedRaw = fullResult.content;
        provider = fullResult.provider;
      }
    }

    // Clean output: strip any remaining Markdown or [fonte:] tags
    const enrichedText = cleanEnrichedOutput(enrichedRaw);

    console.log(`✍️ Enriched: ${enrichedText.length} chars (original: ${plainText.length}) via ${provider}${isChunked ? ` [${totalChunks} chunks]` : ""}`);

    // Step 3: Validate
    console.log("✅ Step 3: Validation...");
    const validation = validateDocument(enrichedText, isJudicial);

    // Use enriched text directly — no self-correction step to avoid duplication
    let finalText = enrichedText;

    // Step 4: Auto-index
    console.log("📊 Step 4: Auto-indexing...");
    const indexed = await autoIndexDocument(finalText, documentType, citations);

    const elapsed = Date.now() - startTime;
    console.log(`✅ Complete: ${finalText.length} chars, ${citations.length} citations, score ${Math.round(validation.score * 100)}%, ${elapsed}ms${isChunked ? ` [${totalChunks} chunks]` : ""}`);

    // ── CLOSED LOOP v11.2: RLHF + neural-pipeline-orchestrator ──
    const supabaseUrlFb = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKeyFb = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    // Registrar aprimoramento no neural_learning_data para RLHF
    EdgeRuntime.waitUntil(
      (async () => {
        try {
          const supa = createClient(supabaseUrlFb, serviceKeyFb);
          const qualityScore = Math.min(
            0.4 + (validation.score * 0.4) + (citations.length > 0 ? 0.1 : 0) + (finalText.length > 3000 ? 0.1 : 0),
            0.95
          );
          await supa.from("neural_learning_data").insert({
            interaction_type: "document_enrichment",
            input_text: `Tipo: ${documentType} | Query: ${(query || userQuery || plainText || "").substring(0, 300)}`,
            output_text: finalText.substring(0, 5000),
            quality_score: qualityScore,
            learned: qualityScore >= 0.7,
            metadata: {
              documentType,
              documentTypeId,
              category,
              validationScore: validation.score,
              citationsCount: citations.length,
              researchCount: searchResults.length,
              provider,
              chunksProcessed: isChunked ? totalChunks : 1,
              autoScored: true,
              source: "aprimorar_documento",
            },
          });
          console.log(`✅ Neural RLHF registrado (aprimorar-documento, score=${qualityScore.toFixed(2)})`);
        } catch (e) { console.warn("RLHF registration failed:", e); }
      })()
    );

    // Triggar pipeline orchestrator para fechar o ciclo
    EdgeRuntime.waitUntil(
      new Promise(r => setTimeout(r, 8000)).then(() =>
        fetch(`${supabaseUrlFb}/functions/v1/neural-pipeline-orchestrator`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${serviceKeyFb}` },
          body: JSON.stringify({ action: "collect_feedback" }),
          signal: AbortSignal.timeout(60000),
        })
        .then(() => console.log("✅ neural-pipeline-orchestrator triggered (aprimorar-documento)"))
        .catch(e => console.warn("Orchestrator trigger failed:", e))
      )
    );

    // Get refinement questions for the response
    const suggestedQuestions = getRefinementQuestions(documentTypeId, category);

    const result = {
      enrichedText: finalText,
      citations,
      validation,
      provider,
      researchCount: searchResults.length,
      elapsed,
      chunksProcessed: isChunked ? totalChunks : undefined,
      suggestedQuestions,
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("❌ Error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
