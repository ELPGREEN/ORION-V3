/**
 * Legal Document Pipeline — 9-Agent Orchestration
 * Chief Orchestrator + 8 specialized legal agents
 * Each agent has autonomous, detailed prompts for its domain.
 */

import { smartAgentRoute, agenteLeitura, agenteConstrucao, agentePesquisa } from "@/lib/api/agentService";

// ─── Types ───

export type LegalAgentId =
  | "orquestrador"
  | "planejamento"
  | "pesquisa"
  | "analise"
  | "sintese"
  | "redacao"
  | "citacao"
  | "revisao"
  | "formatacao";

export type PipelineStepStatus = "pending" | "active" | "done" | "error" | "skipped";

export interface PipelineStep {
  id: LegalAgentId;
  label: string;
  description: string;
  status: PipelineStepStatus;
  elapsed?: number;
  output?: string;
  error?: string;
}

export interface PipelineState {
  steps: PipelineStep[];
  currentStep: number;
  startedAt?: number;
  completedAt?: number;
  isRunning: boolean;
  /** Final HTML document produced by formatacao agent */
  finalDocument?: string;
}

export interface PipelineExecutionContext {
  topic: string;
  areaJuridica: string;
  documentType: string;
  previousOutputs: Partial<Record<LegalAgentId, string>>;
}

// ─── Step Definitions ───

export const LEGAL_PIPELINE_STEPS: Omit<PipelineStep, "status">[] = [
  {
    id: "orquestrador",
    label: "Orquestrador-Chefe",
    description: "Coordena todo o fluxo, define estratégia e garante integração entre agentes",
  },
  {
    id: "planejamento",
    label: "Planejamento Jurídico",
    description: "Define tema, área do direito, tese central e estrutura do documento",
  },
  {
    id: "pesquisa",
    label: "Pesquisa Jurisprudencial",
    description: "Busca decisões judiciais, precedentes e legislação em tribunais",
  },
  {
    id: "analise",
    label: "Análise Jurídica",
    description: "Analisa fundamentos legais, princípios e raciocínio jurídico",
  },
  {
    id: "sintese",
    label: "Síntese de Jurisprudência",
    description: "Consolida entendimento, agrupa decisões e identifica tendências",
  },
  {
    id: "redacao",
    label: "Redação Jurídica",
    description: "Redige texto técnico com argumentação lógica e estruturada",
  },
  {
    id: "citacao",
    label: "Citações e Referências",
    description: "Padroniza citações, verifica fontes e aplica normas ABNT",
  },
  {
    id: "revisao",
    label: "Revisão Jurídica",
    description: "Corrige linguagem técnica, coerência e consistência jurídica",
  },
  {
    id: "formatacao",
    label: "Formatação Final",
    description: "Estrutura documento final com normas técnicas para exportação",
  },
];

// ─── State Helpers ───

export function createInitialPipelineState(): PipelineState {
  return {
    steps: LEGAL_PIPELINE_STEPS.map((s) => ({ ...s, status: "pending" as PipelineStepStatus })),
    currentStep: -1,
    isRunning: false,
  };
}

export function advancePipeline(
  state: PipelineState,
  stepIndex: number,
  status: PipelineStepStatus,
  output?: string,
  error?: string
): PipelineState {
  const now = Date.now();
  const steps = state.steps.map((s, i) =>
    i === stepIndex
      ? {
          ...s,
          status,
          output: output || s.output,
          error: error || s.error,
          elapsed: status === "done" || status === "error" ? now - (state.startedAt || now) : undefined,
        }
      : s
  );
  return {
    ...state,
    steps,
    currentStep: status === "done" ? stepIndex + 1 : stepIndex,
    completedAt: stepIndex === steps.length - 1 && status === "done" ? now : undefined,
    isRunning: status === "error" ? false : state.isRunning,
  };
}

// ─── Specialized Agent Prompts ───

const ANTI_REACT_RULE = `

⚠️ REGRA OBRIGATÓRIA DE FORMATO:
- NUNCA gere código React, JSX, TSX ou componentes
- NUNCA use import, export, interface, const, return, function
- NUNCA inclua blocos de código (\`\`\`tsx, \`\`\`jsx, etc.)
- NUNCA use tags <Container>, <Button>, <Heading>, <Text> ou qualquer componente React
- Se o input contiver código React/TSX, IGNORE o código e extraia apenas o conteúdo textual/jurídico`;

const AGENT_PROMPTS: Record<LegalAgentId, (ctx: PipelineExecutionContext) => string> = {
  orquestrador: (ctx) =>
    `Você é o ORQUESTRADOR-CHEFE de um sistema de geração de documentos jurídicos.

MISSÃO: Criar um plano de execução detalhado e estratégico para produzir um documento jurídico de alta qualidade.

DADOS DO DOCUMENTO:
- Tipo: ${ctx.documentType}
- Tópico: ${ctx.topic}
- Área Jurídica: ${ctx.areaJuridica}

O tópico pode conter HTML extraído de um DOCX importado pelo usuário. Nesse caso, analise o conteúdo do documento para entender o caso e planejar adequadamente.

INSTRUÇÕES:
1. Analise o tipo de documento e identifique os requisitos específicos (petição inicial, recurso, parecer, contrato, etc.)
2. Defina a estratégia argumentativa mais eficaz para o caso
3. Liste as fontes jurídicas prioritárias (tribunais, legislação, doutrina)
4. Estabeleça a estrutura ideal do documento com seções obrigatórias
5. Identifique potenciais riscos jurídicos e como mitigá-los
6. Defina critérios de qualidade para cada etapa

FORMATO DE SAÍDA:
Produza um plano estruturado em Markdown com: Estratégia, Estrutura, Fontes Prioritárias, Riscos e Critérios de Qualidade.
${ANTI_REACT_RULE}`,

  planejamento: (ctx) =>
    `Você é o AGENTE DE PLANEJAMENTO JURÍDICO especializado em estruturação de documentos legais.

MISSÃO: Definir com precisão o escopo, a tese central e a estrutura completa do documento.

CONTEXTO:
- Documento: ${ctx.documentType} sobre "${ctx.topic}"
- Área: ${ctx.areaJuridica}
- Plano do Orquestrador: ${ctx.previousOutputs.orquestrador?.substring(0, 2000) || "N/A"}

Se o tópico contiver HTML de um DOCX importado, extraia dele: fatos, partes envolvidas, teses e argumentos existentes.

TAREFAS AUTÔNOMAS:
1. TEMA CENTRAL: Defina a tese jurídica principal com clareza
2. ÁREA DO DIREITO: Identifique subáreas específicas (ex: direito civil → responsabilidade civil → dano moral)
3. ENQUADRAMENTO LEGAL: Liste artigos de lei, códigos e normas aplicáveis
4. ESTRUTURA DO DOCUMENTO: Crie um esqueleto detalhado com todas as seções:
   - Preâmbulo/Cabeçalho
   - Qualificação das partes (se aplicável)
   - Dos Fatos
   - Do Direito (fundamentação jurídica)
   - Dos Pedidos / Conclusão
   - Referências
5. PALAVRAS-CHAVE: Liste termos jurídicos essenciais para pesquisa

FORMATO: Produza a estrutura em formato hierárquico com descrição do conteúdo esperado em cada seção.
${ANTI_REACT_RULE}`,

  pesquisa: (ctx) =>
    `Você é o AGENTE DE PESQUISA JURISPRUDENCIAL especializado em busca e coleta de decisões judiciais.

MISSÃO: Conduzir pesquisa exaustiva para encontrar jurisprudência e precedentes relevantes.

PARÂMETROS DE PESQUISA:
- Tema: ${ctx.topic}
- Área: ${ctx.areaJuridica}
- Estrutura planejada: ${ctx.previousOutputs.planejamento?.substring(0, 1500) || "N/A"}

TAREFAS AUTÔNOMAS:
1. TRIBUNAIS SUPERIORES: Buscar decisões do STF, STJ, TST, TSE conforme a área
2. TRIBUNAIS REGIONAIS: Identificar jurisprudência dos TRFs, TJs e TRTs relevantes
3. SÚMULAS: Listar súmulas vinculantes e não-vinculantes aplicáveis
4. LEGISLAÇÃO: Identificar artigos específicos de leis, códigos e normas
5. PRECEDENTES SIGNIFICATIVOS: Encontrar casos paradigmáticos (leading cases)
6. DOUTRINA: Referenciar autores e obras jurídicas relevantes

CRITÉRIOS DE RELEVÂNCIA:
- Priorizar decisões recentes (últimos 5 anos)
- Hierarquia: Súmulas Vinculantes > Jurisprudência STF/STJ > Tribunais Regionais
- Incluir número do processo, relator, data e tribunal

FORMATO: Liste cada resultado com: Tribunal, Número, Relator, Data, Ementa resumida e Relevância para o caso.
${ANTI_REACT_RULE}`,

  analise: (ctx) =>
    `Você é o AGENTE DE ANÁLISE JURÍDICA especializado em interpretação de decisões judiciais e fundamentos legais.

MISSÃO: Analisar profundamente os resultados da pesquisa e extrair fundamentos jurídicos sólidos.

MATERIAL PARA ANÁLISE:
- Resultados da pesquisa: ${ctx.previousOutputs.pesquisa?.substring(0, 3000) || "N/A"}
- Estrutura planejada: ${ctx.previousOutputs.planejamento?.substring(0, 1000) || "N/A"}

TAREFAS AUTÔNOMAS:
1. FUNDAMENTOS LEGAIS: Identifique e categorize todos os fundamentos legais encontrados
   - Constitucionais (artigos da CF/88)
   - Legais (leis ordinárias, complementares, códigos)
   - Infra-legais (decretos, resoluções, portarias)
2. PRINCÍPIOS JURÍDICOS: Extraia os princípios aplicáveis (devido processo legal, ampla defesa, contraditório, etc.)
3. RACIOCÍNIO JURÍDICO: Analise a ratio decidendi das decisões encontradas
4. TESES MAJORITÁRIAS vs MINORITÁRIAS: Identifique o entendimento predominante
5. PONTOS FORTES e FRACOS: Avalie a força de cada argumento
6. CONTRA-ARGUMENTOS: Antecipe possíveis objeções e prepare respostas

FORMATO: Organize em categorias claras com análise crítica de cada fundamento.
${ANTI_REACT_RULE}`,

  sintese: (ctx) =>
    `Você é o AGENTE DE SÍNTESE DE JURISPRUDÊNCIA especializado em consolidação de entendimentos judiciais.

MISSÃO: Criar um panorama consolidado e coerente da jurisprudência aplicável.

MATERIAL:
- Análise jurídica: ${ctx.previousOutputs.analise?.substring(0, 3000) || "N/A"}
- Pesquisa original: ${ctx.previousOutputs.pesquisa?.substring(0, 1500) || "N/A"}

TAREFAS AUTÔNOMAS:
1. AGRUPAMENTO: Organize decisões por tema/tese (ex: todas que tratam de dano moral, todas sobre prescrição)
2. TENDÊNCIAS: Identifique a evolução do entendimento judicial ao longo do tempo
3. ENTENDIMENTO CONSOLIDADO: Determine a posição dominante nos tribunais
4. RESUMO EXECUTIVO: Crie resumos concisos de cada decisão-chave (máx. 3 linhas por decisão)
5. QUADRO COMPARATIVO: Compare posições entre diferentes tribunais
6. CONCLUSÃO SINTÉTICA: Formule o entendimento consolidado em 1-2 parágrafos claros

FORMATO: Produza uma síntese estruturada que possa ser diretamente utilizada na fundamentação do documento.
${ANTI_REACT_RULE}`,

  redacao: (ctx) =>
    `Você é o AGENTE DE REDAÇÃO JURÍDICA especializado em produção de textos legais técnicos e persuasivos.

MISSÃO: Redigir o documento jurídico completo com argumentação lógica, técnica e estruturada.

INSUMOS:
- Tipo de documento: ${ctx.documentType}
- Área: ${ctx.areaJuridica}
- Estrutura: ${ctx.previousOutputs.planejamento?.substring(0, 2000) || "N/A"}
- Síntese jurisprudencial: ${ctx.previousOutputs.sintese?.substring(0, 2500) || "N/A"}
- Análise: ${ctx.previousOutputs.analise?.substring(0, 1500) || "N/A"}

TAREFAS AUTÔNOMAS:
1. REDAÇÃO COMPLETA: Produza o texto integral do documento seguindo a estrutura planejada
2. ARGUMENTAÇÃO: Construa argumentos em ordem de força (mais forte → mais fraco)
3. FUNDAMENTAÇÃO: Integre naturalmente as referências jurisprudenciais e legais
4. LINGUAGEM TÉCNICA: Use vocabulário jurídico preciso e adequado à área
5. COESÃO TEXTUAL: Garanta transições suaves entre seções e parágrafos
6. MARCADORES: Use [PREENCHER] para dados específicos que dependem do caso concreto

REGRAS DE ESTILO:
- Parágrafos técnicos com no máximo 8 linhas
- Citações longas (>3 linhas) em recuo de 4cm
- Uso correto de "data venia", "ad argumentandum tantum", etc.
- Evitar repetições e redundâncias

FORMATO DE SAÍDA — SOMENTE HTML PURO:
Produza o documento completo em HTML semântico compatível com TipTap editor.
Use APENAS tags HTML: <h1>, <h2>, <h3>, <p>, <blockquote>, <ol>, <ul>, <li>, <strong>, <em>, <br/>.
Use <blockquote style="margin-left:4cm;font-size:11px;line-height:1.2"> para citações longas/ementas.
Marque campos pendentes com <span class="placeholder">[PREENCHER]</span>.
A saída deve começar diretamente com <h1> — sem markdown, sem backticks.
${ANTI_REACT_RULE}`,

  citacao: (ctx) =>
    `Você é o AGENTE DE CITAÇÕES E REFERÊNCIAS especializado em padronização de fontes jurídicas brasileiras.

MISSÃO: Verificar, padronizar e inserir corretamente todas as citações e referências do documento, seguindo rigorosamente as normas ABNT e práticas forenses.

DOCUMENTO PARA REVISÃO:
${ctx.previousOutputs.redacao?.substring(0, 4000) || "N/A"}

═══ ELEMENTOS OBRIGATÓRIOS DE JURISPRUDÊNCIA ═══
Toda citação jurisprudencial DEVE conter, nesta ordem:
1. JURISDIÇÃO/TRIBUNAL: Em caixa alta (STF, STJ, TJSP, TST, TRF-1, etc.)
2. ÓRGÃO JULGADOR: Turma, Câmara, Seção (Ex: "1ª Turma", "3ª Câmara Cível")
3. TIPO E NÚMERO DO DOCUMENTO: (Ex: "Recurso Especial nº 1.234.567/SP", "HC nº 123.456/RJ")
4. RELATOR: Precedido de "Rel." ou "Relator:" (Ex: "Rel. Min. Fulano de Tal")
5. DATA DO JULGAMENTO: Data da sessão, não da publicação (Ex: "j. 15.03.2024")
6. FONTE DE PUBLICAÇÃO: DJe, DJ, RSTJ, etc. com data (Ex: "DJe 20.03.2024")

═══ FORMATAÇÃO DE CITAÇÕES EM PETIÇÕES ═══
- CITAÇÃO CURTA (até 3 linhas): Entre aspas duplas, no corpo do texto, fonte normal
- CITAÇÃO LONGA / EMENTA (>3 linhas):
  • Recuo de 4cm da margem esquerda
  • Fonte menor (se texto é 12pt, usar 10pt ou 11pt)
  • Espaçamento simples entre linhas
  • SEM aspas
  • Separada por linha em branco antes e depois
- TRIBUNAL E NÚMERO: Em <strong> para facilitar localização
- TRECHOS-CHAVE da ementa: Destacar em <strong> as partes mais relevantes
- OMISSÃO de trechos irrelevantes: Usar [...] ou (...)
- GRIFOS: Indicar "grifo nosso" ou "grifo do original" ao final

═══ EXEMPLO DE FORMATAÇÃO CORRETA ═══
<blockquote style="margin-left:4cm;font-size:11px;line-height:1.2">
<strong>STJ</strong> — 3ª Turma — REsp nº 1.234.567/SP — Rel. Min. Fulano de Tal — j. 15.03.2024 — DJe 20.03.2024.
<br/><br/>
EMENTA: RESPONSABILIDADE CIVIL. DANO MORAL. <strong>O fornecedor responde objetivamente pelos danos causados ao consumidor</strong> [...] (grifo nosso).
</blockquote>

═══ TAREFAS AUTÔNOMAS ═══
1. VERIFICAÇÃO DE FONTES: Confirme que cada citação possui TODOS os elementos obrigatórios
2. PADRONIZAÇÃO ABNT (NBR 6023): Aplique formato correto para cada tipo de referência
3. FORMATAÇÃO HTML: Converta citações longas em <blockquote> com estilo adequado
4. NOTAS DE RODAPÉ: Formate referências complementares em notas quando apropriado
5. LISTA DE REFERÊNCIAS: Compile ao final em ordem alfabética (ABNT NBR 6023)
6. VERIFICAÇÃO CRUZADA: Garanta correspondência total entre citações no texto e referências

FORMATO: Retorne o documento completo com citações corrigidas em HTML semântico puro.
A saída deve ser HTML válido — começando diretamente com tags HTML.
${ANTI_REACT_RULE}`,

  revisao: (ctx) =>
    `Você é o AGENTE DE REVISÃO JURÍDICA especializado em correção linguística e coerência técnica.

MISSÃO: Realizar revisão completa do documento garantindo excelência linguística e coerência jurídica.

DOCUMENTO PARA REVISÃO:
${ctx.previousOutputs.citacao?.substring(0, 4000) || ctx.previousOutputs.redacao?.substring(0, 4000) || "N/A"}

TAREFAS AUTÔNOMAS:
1. LINGUAGEM JURÍDICA: Verifique o uso correto de termos técnicos:
   - "Mandado" vs "Mandato"
   - "Sessão" vs "Seção" vs "Cessão"
   - "Deferir" vs "Diferir"
   - Latinismos aplicados corretamente
2. COERÊNCIA ARGUMENTATIVA: Verifique se os argumentos seguem uma lógica progressiva
3. CONSISTÊNCIA: Garanta que termos e referências são usados uniformemente
4. GRAMÁTICA E ORTOGRAFIA: Corrija erros gramaticais, ortográficos e de pontuação
5. CONCORDÂNCIA: Verifique concordância verbal e nominal em todo o texto
6. ADEQUAÇÃO DE TOM: Ajuste linguagem ao tipo de documento (formal/técnico)

FORMATO DE SAÍDA:
Retorne o documento HTML COMPLETO já corrigido (não apenas a lista de correções).
Inclua ao final um bloco <hr/> seguido de uma lista resumida de alterações no formato ❌→✅.
Atribua nota de A a D:
- A: Excelente, pronto para uso
- B: Bom, pequenos ajustes sugeridos
- C: Regular, correções necessárias
- D: Insuficiente, requer reescrita significativa
${ANTI_REACT_RULE}`,

  formatacao: (ctx) =>
    `Você é o AGENTE DE FORMATAÇÃO FINAL especializado em estruturação e normatização de documentos jurídicos.

MISSÃO: Aplicar formatação profissional ao documento final para exportação em PDF/DOCX.

DOCUMENTO REVISADO:
${ctx.previousOutputs.revisao?.substring(0, 4000) || ctx.previousOutputs.redacao?.substring(0, 4000) || "N/A"}

TAREFAS AUTÔNOMAS:
1. ESTRUTURA DO DOCUMENTO:
   - Cabeçalho com identificação do órgão/tribunal
   - Numeração sequencial de seções (I, II, III ou 1, 1.1, 1.2)
   - Parágrafos com recuo de primeira linha (1,25cm)
   - Espaçamento entre parágrafos (6pt após)
   - Entrelinhas 1,5
2. FORMATAÇÃO DE CITAÇÕES JURISPRUDENCIAIS:
   - Citações curtas (até 3 linhas): entre aspas, no corpo do texto, fonte normal
   - Citações longas/ementas (>3 linhas): <blockquote> com recuo 4cm, fonte 10-11pt, espaçamento simples, SEM aspas
   - Tribunal e número do processo em <strong> (negrito)
   - Trechos-chave da ementa em <strong> (negrito)
   - Omissões marcadas com [...]
   - "grifo nosso" ou "grifo do original" indicado ao final
3. ELEMENTOS OBRIGATÓRIOS (conforme tipo):
   - Petição: endereçamento, qualificação, fatos, direito, pedidos, valor da causa
   - Contrato: preâmbulo, cláusulas numeradas, foro, assinaturas
   - Parecer: ementa, relatório, fundamentação, conclusão
4. NORMAS TÉCNICAS:
   - ABNT NBR 14724 (trabalhos acadêmicos) quando aplicável
   - Resolução CNJ para peças processuais
   - Margens: superior/esquerda 3cm, inferior/direita 2cm
5. ELEMENTOS FINAIS:
   - Local e data
   - Espaço para assinatura
   - Identificação do advogado/OAB

FORMATO DE SAÍDA — HTML SEMÂNTICO OBRIGATÓRIO:
Produza o documento final em HTML semântico limpo, pronto para renderização no editor TipTap e exportação PDF.
A saída DEVE começar diretamente com <h1> — sem markdown, sem backticks, sem explicações.

ESTRUTURA HTML EXIGIDA:
1. TÍTULO: <h1> centralizado, caixa alta
2. SEÇÕES: <h2> com numeração romana (I, II, III...), caixa alta
3. PARÁGRAFOS: <p> com text-indent: 1.25cm e text-align: justify
4. CITAÇÕES LONGAS: <blockquote style="margin-left:4cm;font-size:11px;line-height:1.2">
5. LISTAS: <ol> ou <ul> quando apropriado
6. CAMPOS PENDENTES: <span class="placeholder">[PREENCHER]</span>
7. RODAPÉ: Local/data + linha de assinatura + identificação OAB

Tags permitidas: <h1>, <h2>, <h3>, <p>, <blockquote>, <ol>, <ul>, <li>, <strong>, <em>, <br/>, <span>.
NÃO use <div>, <section>, <article> ou classes CSS customizadas (exceto "placeholder").
${ANTI_REACT_RULE}`,
};

const HTML_REQUIRED_STEPS = new Set<LegalAgentId>(["redacao", "citacao", "revisao", "formatacao"]);

function stripCodeFences(text: string): string {
  if (!text) return "";
  const matches = [...text.matchAll(/```(?:html|xml|tsx|jsx|typescript|javascript|react)?\s*([\s\S]*?)```/gi)];
  if (matches.length === 0) return text;

  const chunks = matches.map((m) => (m[1] || "").trim()).filter(Boolean);
  const preferred = chunks.find((chunk) => /<(h1|h2|h3|p|blockquote|ol|ul|li|strong|em|span|br|div)\b/i.test(chunk));
  return (preferred || chunks.join("\n\n")).trim();
}

function stripReactArtifacts(text: string): string {
  return text
    .replace(/^\s*import\s.+$/gm, "")
    .replace(/^\s*export\s+default\s+\w+\s*;?\s*$/gm, "")
    .replace(/^\s*export\s+\{[^}]*\}\s*;?\s*$/gm, "")
    .replace(/interface\s+\w+\s*\{[\s\S]*?\}\s*/g, "")
    .replace(/type\s+\w+\s*=\s*\{[\s\S]*?\}\s*;?/g, "")
    .replace(/(?:const|let|var)\s+\w+\s*:\s*React\.FC[^\n]*\n?/g, "")
    .replace(/<\/?(?:Container|Heading|Text|Button|Documento)[^>]*>/g, "")
    .replace(/^\s*return\s*\(\s*$/gm, "")
    .replace(/^\s*\);?\s*$/gm, "")
    .replace(/^\s*\};?\s*$/gm, "")
    .trim();
}

function toHtmlParagraphs(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean)
    .map((block) => `<p>${block.replace(/\n/g, "<br/>")}</p>`)
    .join("\n");
}

function normalizePipelineOutput(stepId: LegalAgentId, rawOutput: string): string {
  let normalized = stripCodeFences(rawOutput || "").trim();
  if (!HTML_REQUIRED_STEPS.has(stepId)) return normalized;

  normalized = stripReactArtifacts(normalized);

  const firstHtmlIndex = normalized.search(/<(h1|h2|h3|p|blockquote|ol|ul|li|strong|em|span|br|div)\b/i);
  if (firstHtmlIndex > 0) {
    normalized = normalized.slice(firstHtmlIndex);
  }

  if (!/(<(h1|h2|h3|p|blockquote|ol|ul|li|strong|em|span|br|div)\b)/i.test(normalized)) {
    normalized = toHtmlParagraphs(normalized);
  }

  return normalized.trim();
}

// ─── Execution Engine ───

function extractAgentOutput(
  result: { analysis?: string; message?: string; proposal?: { code?: string } },
  fallback: string
): string {
  const proposalCode = result.proposal?.code;
  if (typeof proposalCode === "string" && proposalCode.trim().length > 0) {
    return proposalCode;
  }
  return result.analysis || result.message || fallback;
}

async function executeStep(
  stepId: LegalAgentId,
  context: PipelineExecutionContext
): Promise<{ output: string; error?: string }> {
  const prompt = AGENT_PROMPTS[stepId](context);

  switch (stepId) {
    case "orquestrador": {
      const result = await agenteLeitura.readFile(
        `Tópico: ${context.topic}\nÁrea: ${context.areaJuridica}\nTipo: ${context.documentType}`,
        "plano_orquestracao.md",
        prompt
      );
      return { output: result.analysis || result.message || "Plano de orquestração criado" };
    }

    case "planejamento": {
      const result = await agenteConstrucao.generateDocument(
        context.documentType,
        `Estrutura: ${context.topic}`,
        prompt,
        context.areaJuridica
      );
      return { output: extractAgentOutput(result, "Estrutura do documento definida") };
    }

    case "pesquisa": {
      const result = await agentePesquisa.legalSearch(
        `${context.topic} ${context.areaJuridica} jurisprudência precedentes súmulas`,
        undefined,
        undefined,
        undefined
      );
      const searchOutput = result.analysis || `${result.results_count || 0} resultados encontrados`;
      // Supplement with a deeper analysis prompt
      const deepResult = await agenteLeitura.readFile(
        searchOutput,
        "resultados_pesquisa.md",
        prompt
      );
      return { output: deepResult.analysis || searchOutput };
    }

    case "analise": {
      const result = await agenteLeitura.readFile(
        context.previousOutputs.pesquisa || "",
        "pesquisa_juridica.md",
        prompt
      );
      return { output: result.analysis || result.message || "Análise jurídica concluída" };
    }

    case "sintese": {
      const result = await agenteLeitura.readFile(
        context.previousOutputs.analise || "",
        "analise_juridica.md",
        prompt
      );
      return { output: result.analysis || result.message || "Síntese consolidada" };
    }

    case "redacao": {
      const result = await agenteConstrucao.generateDocument(
        context.documentType,
        context.topic,
        prompt,
        context.areaJuridica
      );
      return { output: extractAgentOutput(result, "Redação do documento concluída") };
    }

    case "citacao": {
      const result = await agenteLeitura.readFile(
        context.previousOutputs.redacao || "",
        "rascunho_juridico.html",
        prompt
      );
      return { output: result.analysis || result.message || "Citações padronizadas" };
    }

    case "revisao": {
      const result = await smartAgentRoute(
        prompt,
        context.previousOutputs.citacao || context.previousOutputs.redacao || "",
        context.documentType,
        undefined,
        "leitura"
      );
      return { output: result.analysis || result.message || "Revisão jurídica concluída" };
    }

    case "formatacao": {
      const result = await smartAgentRoute(
        prompt,
        context.previousOutputs.revisao || context.previousOutputs.redacao || "",
        context.documentType,
        undefined,
        "construcao"
      );
      return { output: extractAgentOutput(result, "Documento formatado e pronto") };
    }

    default:
      return { output: "", error: `Agente desconhecido: ${stepId}` };
  }
}

/**
 * Runs the full 9-step pipeline sequentially.
 * Calls `onUpdate` after each step so the UI can reflect progress.
 */
export async function runLegalPipeline(
  context: PipelineExecutionContext,
  onUpdate: (state: PipelineState) => void
): Promise<PipelineState> {
  let state = createInitialPipelineState();
  state.isRunning = true;
  state.startedAt = Date.now();
  onUpdate(state);

  for (let i = 0; i < state.steps.length; i++) {
    const step = state.steps[i];

    // Mark active
    state = advancePipeline(state, i, "active");
    onUpdate(state);

    try {
      const { output, error } = await executeStep(step.id, context);
      if (error) {
        state = advancePipeline(state, i, "error", undefined, error);
        onUpdate(state);
        return state;
      }
      const normalizedOutput = normalizePipelineOutput(step.id, output);
      // Store output for downstream agents
      context.previousOutputs[step.id] = normalizedOutput;
      state = advancePipeline(state, i, "done", normalizedOutput);
      onUpdate(state);
    } catch (err: any) {
      state = advancePipeline(state, i, "error", undefined, err.message || "Erro desconhecido");
      onUpdate(state);
      return state;
    }
  }

  state.isRunning = false;
  state.completedAt = Date.now();
  // Store the final formatted document from the last agent
  state.finalDocument = normalizePipelineOutput(
    "formatacao",
    context.previousOutputs.formatacao || context.previousOutputs.redacao || ""
  );
  onUpdate(state);
  return state;
}
