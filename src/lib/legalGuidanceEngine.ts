/**
 * Legal Guidance Engine
 * Inspired by LegalNexus RightPanel.js — generates contextual legal guidance locally
 */

export interface LegalGuidance {
  id: string;
  title: string;
  content: string;
  category: "orientacao" | "alerta" | "dica";
  relevance: number; // 0-100
}

export interface LiveResource {
  label: string;
  url: string;
  type: "legislacao" | "tribunal" | "doutrina" | "ferramenta";
}

export interface GuidanceState {
  guidances: LegalGuidance[];
  resources: LiveResource[];
  detectedArea: string | null;
  lastRefreshAt: Date;
  messageCountAtRefresh: number;
}

// ─── Area detection from conversation context ───
const AREA_PATTERNS: Record<string, RegExp[]> = {
  "Direito Penal": [/penal|crime|delito|réu|acusad|pena\s|prisão|hc\s|habeas|inquérito|denúncia|absolvição/i],
  "Direito Civil": [/contrato|obrigaç|dano\s|indeniza|responsabilidade\s+civil|posse|propriedade|usucapião/i],
  "Direito Trabalhista": [/trabalh|empregad|clt|rescisão|fgts|férias|justa\s+causa|reclamação\s+trabalhista/i],
  "Direito do Consumidor": [/consumidor|cdc|fornecedor|produto\s+defeitu|propaganda\s+enganosa|recall/i],
  "Direito Tributário": [/tribut|imposto|icms|iss|irpf|contribuição|isenção\s+fiscal|planejamento\s+tributário/i],
  "Direito Administrativo": [/licitaç|contrato\s+administr|servidor\s+público|ato\s+administr|improbidade/i],
  "Direito Constitucional": [/constitucional|direito\s+fundamental|adi|adpf|mandado\s+de\s+segurança|cf\/88/i],
  "Direito de Família": [/divórcio|pensão\s+aliment|guarda|inventário|partilha|união\s+estável/i],
};

export function detectLegalArea(text: string): string | null {
  let bestArea: string | null = null;
  let bestScore = 0;
  for (const [area, patterns] of Object.entries(AREA_PATTERNS)) {
    let score = 0;
    for (const p of patterns) {
      const matches = text.match(new RegExp(p.source, "gi"));
      if (matches) score += matches.length;
    }
    if (score > bestScore) { bestScore = score; bestArea = area; }
  }
  return bestScore >= 1 ? bestArea : null;
}

// ─── Generate contextual guidances ───
const GUIDANCE_DB: Record<string, LegalGuidance[]> = {
  "Direito Penal": [
    { id: "penal-1", title: "Princípio da Presunção de Inocência", content: "Art. 5º, LVII, CF — ninguém será considerado culpado até o trânsito em julgado. Fundamentação obrigatória em peças de defesa.", category: "orientacao", relevance: 95 },
    { id: "penal-2", title: "Dosimetria da Pena", content: "Verifique as 3 fases: circunstâncias judiciais (Art. 59 CP), agravantes/atenuantes e causas de aumento/diminuição.", category: "dica", relevance: 85 },
    { id: "penal-3", title: "Nulidades Processuais", content: "Art. 563-573 CPP — identifique nulidades absolutas (incompetência, ausência de defensor) que podem ser alegadas a qualquer tempo.", category: "alerta", relevance: 90 },
  ],
  "Direito Civil": [
    { id: "civil-1", title: "Prescrição e Decadência", content: "Arts. 189-211 CC — verifique prazos prescricionais. Ação indenizatória: 3 anos (Art. 206, §3º, V). Contratos: 10 anos (Art. 205).", category: "alerta", relevance: 95 },
    { id: "civil-2", title: "Responsabilidade Civil", content: "Art. 186 CC (subjetiva) e Art. 927, § único (objetiva). Demonstre nexo causal, dano e conduta.", category: "orientacao", relevance: 90 },
    { id: "civil-3", title: "Boa-fé Objetiva", content: "Arts. 113, 187 e 422 CC — princípio fundamental na interpretação contratual.", category: "dica", relevance: 80 },
  ],
  "Direito Trabalhista": [
    { id: "trab-1", title: "Ônus da Prova", content: "Art. 818 CLT e Súmula 338 TST — empregador deve apresentar controles de jornada em empresas com mais de 20 empregados.", category: "orientacao", relevance: 90 },
    { id: "trab-2", title: "Verbas Rescisórias", content: "Verifique saldo de salário, aviso prévio, 13º proporcional, férias + 1/3, FGTS + 40% conforme modalidade da rescisão.", category: "dica", relevance: 85 },
  ],
  "Direito do Consumidor": [
    { id: "cons-1", title: "Inversão do Ônus da Prova", content: "Art. 6º, VIII, CDC — aplicável quando verossímil a alegação ou hipossuficiente o consumidor.", category: "orientacao", relevance: 95 },
    { id: "cons-2", title: "Responsabilidade Objetiva", content: "Arts. 12-14 CDC — fornecedor responde independentemente de culpa por defeitos do produto/serviço.", category: "orientacao", relevance: 90 },
  ],
  "Direito Constitucional": [
    { id: "const-1", title: "Controle de Constitucionalidade", content: "Arts. 102-103 CF — ADI, ADC, ADPF. Legitimados ativos: Art. 103 CF. Efeitos erga omnes e vinculante.", category: "orientacao", relevance: 90 },
  ],
};

const DEFAULT_GUIDANCES: LegalGuidance[] = [
  { id: "gen-1", title: "Fundamentação Legal Obrigatória", content: "Toda peça processual deve conter fundamentação legal específica (Art. 489, §1º, CPC). Evite argumentação genérica.", category: "orientacao", relevance: 80 },
  { id: "gen-2", title: "Citações em Formato ABNT", content: "Jurisprudência deve seguir formato: TRIBUNAL. Órgão julgador. Recurso nº. Relator: Min./Des. Data de julgamento.", category: "dica", relevance: 70 },
  { id: "gen-3", title: "Anti-Alucinação", content: "Sempre verifique: números de súmulas existem? Artigos pertencem à lei correta? Decisões citadas são reais?", category: "alerta", relevance: 95 },
];

export function generateGuidances(area: string | null, docType: string): LegalGuidance[] {
  const specific = area ? (GUIDANCE_DB[area] || []) : [];
  return [...specific, ...DEFAULT_GUIDANCES].sort((a, b) => b.relevance - a.relevance).slice(0, 5);
}

// ─── Live Resources ───
const RESOURCES_BY_AREA: Record<string, LiveResource[]> = {
  "Direito Penal": [
    { label: "Código Penal (Planalto)", url: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del2848compilado.htm", type: "legislacao" },
    { label: "CPP Atualizado", url: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del3689compilado.htm", type: "legislacao" },
    { label: "STF — Jurisprudência Penal", url: "https://jurisprudencia.stf.jus.br/", type: "tribunal" },
  ],
  "Direito Civil": [
    { label: "Código Civil (Planalto)", url: "https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm", type: "legislacao" },
    { label: "CPC Atualizado", url: "https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2015/lei/l13105.htm", type: "legislacao" },
  ],
  "Direito Trabalhista": [
    { label: "CLT Atualizada", url: "https://www.planalto.gov.br/ccivil_03/decreto-lei/del5452compilado.htm", type: "legislacao" },
    { label: "TST — Súmulas", url: "https://www.tst.jus.br/sumulas", type: "tribunal" },
  ],
};

const DEFAULT_RESOURCES: LiveResource[] = [
  { label: "Constituição Federal", url: "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm", type: "legislacao" },
  { label: "STJ — Jurisprudência", url: "https://scon.stj.jus.br/SCON/", type: "tribunal" },
  { label: "STF — Jurisprudência", url: "https://jurisprudencia.stf.jus.br/", type: "tribunal" },
  { label: "Planalto — Legislação", url: "https://www.planalto.gov.br/ccivil_03/", type: "legislacao" },
];

export function generateResources(area: string | null): LiveResource[] {
  const specific = area ? (RESOURCES_BY_AREA[area] || []) : [];
  return [...specific, ...DEFAULT_RESOURCES].slice(0, 6);
}

// ─── Refresh check ───
export const REFRESH_INTERVAL = 10; // messages

export function shouldRefreshGuidance(currentMsgCount: number, lastRefreshCount: number): boolean {
  return currentMsgCount - lastRefreshCount >= REFRESH_INTERVAL;
}

export function buildInitialState(docType: string, documentText: string): GuidanceState {
  const area = detectLegalArea(documentText);
  return {
    guidances: generateGuidances(area, docType),
    resources: generateResources(area),
    detectedArea: area,
    lastRefreshAt: new Date(),
    messageCountAtRefresh: 0,
  };
}

export function refreshGuidanceState(conversationText: string, docType: string, currentMsgCount: number): GuidanceState {
  const area = detectLegalArea(conversationText);
  return {
    guidances: generateGuidances(area, docType),
    resources: generateResources(area),
    detectedArea: area,
    lastRefreshAt: new Date(),
    messageCountAtRefresh: currentMsgCount,
  };
}
