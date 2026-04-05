// ─── Intelligent Legal Content Type Detector ───

export type ContentType =
  | "titulo"
  | "subtitulo"
  | "citacao_legal"
  | "jurisprudencia"
  | "apelacao"
  | "paragrafo"
  | "lista"
  | "assinatura"
  | "ementa";

export interface ContentTypeResult {
  type: ContentType;
  label: string;
  confidence: number;
}

export interface NodeContext {
  nodeName?: string; // e.g. "heading", "paragraph", "listItem", "blockquote"
  headingLevel?: number;
}

export const CITACAO_LEGAL_RE =
  /\b(art\.|artigo|§\s*\d|inciso|alínea|Lei\s+n[ºo°]|Decreto\s+n[ºo°]|Súmula|Resolução\s+n[ºo°]|Código\s+(Penal|Civil|Processo|Tributário|Defesa))/i;

export const JURISPRUDENCIA_RE =
  /\b(STF|STJ|TST|TSE|TRF|TJSP|TJRJ|TJMG|TJRS|Tribunal|Acórdão|REsp|RE\s+\d|HC\s+\d|AgRg|AgInt|RHC|RMS|Relator[a]?|Min\.|Ministro|Turma\s+\d)/i;

export const APELACAO_RE =
  /\b(apelação|recurso|razões\s+recursais|contrarrazões|recurso\s+especial|recurso\s+extraordinário|agravo|embargos|apelante|apelado|recorrente|recorrido)/i;

export const EMENTA_RE =
  /\b(EMENTA\s*[:–\-]|HABEAS\s+CORPUS|RECURSO\s+ESPECIAL|AGRAVO\s+REGIMENTAL|AÇÃO\s+DIRETA)/i;

export const ASSINATURA_RE =
  /(_{3,}|OAB\s*\/?\s*[A-Z]{2}|Advogad[oa]|Procurad[oa]|Defensor)/i;

export const LISTA_RE =
  /^(\s*[a-z]\)|^\s*[IVX]+[.)]\s|^\s*\d+[.)]\s|^\s*[•●○▪]\s)/m;

/**
 * Detect the type of legal content from selected text + TipTap node context.
 */
export function detectContentType(
  text: string,
  nodeContext?: NodeContext
): ContentTypeResult {
  const trimmed = text.trim();
  const len = trimmed.length;

  // ── Ementa (high priority — specific pattern) ──
  if (EMENTA_RE.test(trimmed)) {
    return { type: "ementa", label: "Ementa", confidence: 0.9 };
  }

  // ── Assinatura ──
  if (ASSINATURA_RE.test(trimmed) && len < 300) {
    return { type: "assinatura", label: "Assinatura", confidence: 0.85 };
  }

  // ── Heading nodes → titulo/subtitulo ──
  if (nodeContext?.nodeName === "heading") {
    if (nodeContext.headingLevel === 1) {
      return { type: "titulo", label: "Título", confidence: 0.95 };
    }
    return { type: "subtitulo", label: "Subtítulo", confidence: 0.95 };
  }

  // ── Short uppercase text → titulo ──
  if (len < 100 && trimmed === trimmed.toUpperCase() && /[A-ZÀ-Ú]{3,}/.test(trimmed)) {
    return { type: "titulo", label: "Título", confidence: 0.8 };
  }

  // ── Short title-case text → subtitulo ──
  if (len < 100 && /^[A-ZÀ-Ú]/.test(trimmed) && !trimmed.includes(". ")) {
    return { type: "subtitulo", label: "Subtítulo", confidence: 0.6 };
  }

  // ── Citação legal ──
  if (CITACAO_LEGAL_RE.test(trimmed)) {
    return { type: "citacao_legal", label: "Citação Legal", confidence: 0.9 };
  }

  // ── Jurisprudência ──
  if (JURISPRUDENCIA_RE.test(trimmed)) {
    return { type: "jurisprudencia", label: "Jurisprudência", confidence: 0.85 };
  }

  // ── Apelação / Recurso ──
  if (APELACAO_RE.test(trimmed)) {
    return { type: "apelacao", label: "Apelação/Recurso", confidence: 0.8 };
  }

  // ── Lista ──
  if (LISTA_RE.test(trimmed) || nodeContext?.nodeName === "listItem") {
    return { type: "lista", label: "Lista", confidence: 0.85 };
  }

  // ── Blockquote → citação legal por contexto ──
  if (nodeContext?.nodeName === "blockquote") {
    return { type: "citacao_legal", label: "Citação Legal", confidence: 0.7 };
  }

  // ── Default: parágrafo ──
  return { type: "paragrafo", label: "Parágrafo", confidence: 0.7 };
}

/**
 * Generate contextual prompt for "Melhorar" action based on detected content type.
 */
export function getImprovePrompt(type: ContentType, text: string): string {
  const prompts: Record<ContentType, string> = {
    titulo: `Melhore este título jurídico. Mantenha conciso, em CAIXA ALTA se já estiver, e com terminologia técnica precisa. Retorne APENAS o título melhorado:\n\n"${text}"`,
    subtitulo: `Melhore este subtítulo jurídico. Mantenha conciso e claro, com terminologia técnica adequada. Retorne APENAS o subtítulo melhorado:\n\n"${text}"`,
    citacao_legal: `Verifique e melhore esta referência legal. Corrija número de artigo, lei, parágrafo ou súmula se necessário. Mantenha a formatação técnica correta (Art. X, § Y, inciso Z). Retorne APENAS a citação corrigida/melhorada:\n\n"${text}"`,
    jurisprudencia: `Verifique os dados desta jurisprudência (tribunal, número do processo, relator, data). Melhore a redação da citação mantendo precisão técnica. Retorne APENAS a citação melhorada:\n\n"${text}"`,
    apelacao: `Melhore a redação deste trecho de razões recursais. Fortaleça a argumentação e a persuasão sem alterar os fatos nem expandir significativamente. Mantenha comprimento SIMILAR. Retorne APENAS o trecho melhorado:\n\n"${text}"`,
    paragrafo: `Melhore este parágrafo com linguagem jurídica mais técnica e persuasiva. NÃO adicione parágrafos extras. Mantenha comprimento SIMILAR ao original. Retorne APENAS o parágrafo melhorado:\n\n"${text}"`,
    lista: `Melhore os itens desta lista jurídica. Mantenha a estrutura de lista, melhore a clareza e precisão técnica de cada item. Retorne APENAS a lista melhorada:\n\n"${text}"`,
    assinatura: `Melhore a formatação deste bloco de assinatura jurídica. Padronize a estrutura (nome, OAB, cargo). Retorne APENAS o bloco corrigido:\n\n"${text}"`,
    ementa: `Melhore esta ementa jurisprudencial. Mantenha a estrutura padrão (tema, tese, dispositivo), melhore clareza e precisão. Retorne APENAS a ementa melhorada:\n\n"${text}"`,
  };
  return prompts[type];
}

/**
 * Generate contextual prompt for "Reformular" action based on detected content type.
 */
export function getReformulatePrompt(type: ContentType, text: string): string {
  const prompts: Record<ContentType, string> = {
    titulo: `Reformule este título jurídico com clareza e impacto, mantendo-o conciso. Retorne APENAS o título reformulado:\n\n"${text}"`,
    subtitulo: `Reformule este subtítulo com mais clareza, mantendo-o conciso. Retorne APENAS o subtítulo reformulado:\n\n"${text}"`,
    citacao_legal: `Reformule a redação em torno desta referência legal, mantendo os números de artigos, leis e parágrafos EXATAMENTE iguais. Melhore apenas a construção frasal. Retorne APENAS o trecho reformulado:\n\n"${text}"`,
    jurisprudencia: `Reformule a apresentação desta jurisprudência, mantendo TODOS os dados (tribunal, número, relator, data) intactos. Melhore a construção textual. Retorne APENAS o trecho reformulado:\n\n"${text}"`,
    apelacao: `Reformule estas razões recursais com mais clareza e fluidez, sem alterar os argumentos jurídicos. Retorne APENAS o trecho reformulado:\n\n"${text}"`,
    paragrafo: `Reformule este parágrafo mantendo o sentido original mas com mais clareza, fluidez e técnica jurídica. Retorne APENAS o parágrafo reformulado:\n\n"${text}"`,
    lista: `Reformule os itens desta lista mantendo a estrutura, melhorando clareza e concisão. Retorne APENAS a lista reformulada:\n\n"${text}"`,
    assinatura: `Reformule este bloco de assinatura com formatação profissional padrão. Retorne APENAS o bloco reformulado:\n\n"${text}"`,
    ementa: `Reformule esta ementa com clareza e objetividade, mantendo a estrutura jurisprudencial. Retorne APENAS a ementa reformulada:\n\n"${text}"`,
  };
  return prompts[type];
}
