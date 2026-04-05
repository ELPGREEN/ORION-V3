/**
 * document-format-config.ts
 * Maps document types/categories to format presets (font, spacing, alignment)
 * and ruler configurations (indents in px) for automatic application in the editor.
 *
 * Pixel values are relative to A4 at 96 DPI (794px width).
 * 1cm ≈ 37.8px in this coordinate system.
 */

export interface DocumentFormatConfig {
  /** Font family to apply */
  fontFamily: string;
  /** Font size (e.g. "12pt") */
  fontSize: string;
  /** Line height (e.g. "1.5") */
  lineHeight: string;
  /** Text alignment */
  textAlign: "left" | "center" | "right" | "justify";
  /** Ruler: left indent in px */
  rulerLeftIndent: number;
  /** Ruler: first-line indent in px (text-indent / recuo de parágrafo) */
  rulerFirstLineIndent: number;
  /** Ruler: right indent in px */
  rulerRightIndent: number;
  /** Standard label (optional) */
  standard?: string;
}

// ─── Shared base configs ───

const CNJ_BASE: DocumentFormatConfig = {
  fontFamily: "Times New Roman",
  fontSize: "12pt",
  lineHeight: "1.5",
  textAlign: "justify",
  rulerLeftIndent: 0,
  rulerFirstLineIndent: 47, // ~1.25cm ABNT/CNJ
  rulerRightIndent: 0,
  standard: "CNJ",
};

const ABNT_BASE: DocumentFormatConfig = {
  ...CNJ_BASE,
  standard: "ABNT",
};

const ABNT_ACADEMICO_BASE: DocumentFormatConfig = {
  fontFamily: "Times New Roman",
  fontSize: "12pt",
  lineHeight: "1.5",
  textAlign: "justify",
  rulerLeftIndent: 0,
  rulerFirstLineIndent: 47, // ~1.25cm ABNT NBR 14724
  rulerRightIndent: 0,
  standard: "ABNT NBR 14724",
};

const SENTENCA_BASE: DocumentFormatConfig = {
  ...CNJ_BASE,
  lineHeight: "2",
};

const CONTRATO_BASE: DocumentFormatConfig = {
  fontFamily: "Times New Roman",
  fontSize: "12pt",
  lineHeight: "1.5",
  textAlign: "justify",
  rulerLeftIndent: 0,
  rulerFirstLineIndent: 0, // Contratos não usam recuo de parágrafo
  rulerRightIndent: 0,
};

const INTERNACIONAL_BASE: DocumentFormatConfig = {
  fontFamily: "Times New Roman",
  fontSize: "12pt",
  lineHeight: "1.5",
  textAlign: "justify",
  rulerLeftIndent: 0,
  rulerFirstLineIndent: 0, // Estilo contratual internacional
  rulerRightIndent: 0,
  standard: "ICC/CISG",
};

const TRABALHISTA_BASE: DocumentFormatConfig = {
  ...CNJ_BASE,
  standard: "TST",
};

// ─── Per-type overrides ───

const TYPE_CONFIGS: Record<string, Partial<DocumentFormatConfig>> = {
  // Penal — citações longas com recuo de 4cm
  "habeas-corpus": { rulerFirstLineIndent: 47 },
  "alegacoes-finais-criminais": { rulerFirstLineIndent: 47 },
  "revisao-criminal": { rulerFirstLineIndent: 47 },

  // Civil — sentença com espaçamento duplo
  "sentenca": { lineHeight: "2" },
  "cumprimento-sentenca": {},
  "peticao-inicial-jec": { fontSize: "12pt" },

  // Contratos
  "contrato-servicos": { rulerFirstLineIndent: 0 },
  "contrato-honorarios": { rulerFirstLineIndent: 0 },
  "termo-confidencialidade": { rulerFirstLineIndent: 0 },
  "acordo-extrajudicial": { rulerFirstLineIndent: 0 },

  // Extrajudicial
  "notificacao-extrajudicial": { rulerFirstLineIndent: 47 },
  "procuracao-ad-judicia": { rulerFirstLineIndent: 0 },
  "procuracao-ad-negotia": { rulerFirstLineIndent: 0 },

  // Acadêmico — ABNT NBR 14724
  "monografia-juridica": { rulerFirstLineIndent: 47 },
  "tcc-direito": { rulerFirstLineIndent: 47 },
  "artigo-cientifico": { rulerFirstLineIndent: 47 },
  "projeto-pesquisa": { rulerFirstLineIndent: 47 },

  // Internacional / Empresarial
  "loi-internacional": { rulerFirstLineIndent: 0 },
  "mou-internacional": { rulerFirstLineIndent: 0 },
  "nda-internacional": { rulerFirstLineIndent: 0 },
  "contrato-distribuicao-internacional": { rulerFirstLineIndent: 0 },
  "contrato-representacao-comercial": { rulerFirstLineIndent: 0 },
  "supply-agreement": { rulerFirstLineIndent: 0 },
  "joint-venture-agreement": { rulerFirstLineIndent: 0 },
  "proposta-comercial-internacional": { rulerFirstLineIndent: 0 },
  "invoice-proforma": { rulerFirstLineIndent: 0 },
  "estudo-viabilidade": { rulerFirstLineIndent: 0 },
  "due-diligence-report": { rulerFirstLineIndent: 0 },
  "term-sheet": { rulerFirstLineIndent: 0 },
  "power-of-attorney-internacional": { rulerFirstLineIndent: 0 },
  "compliance-report": { rulerFirstLineIndent: 0 },
  "partnership-agreement": { rulerFirstLineIndent: 0 },
};

// ─── Category defaults ───

const CATEGORY_CONFIGS: Record<string, DocumentFormatConfig> = {
  penal: CNJ_BASE,
  civil: CNJ_BASE,
  trabalhista: TRABALHISTA_BASE,
  contrato: CONTRATO_BASE,
  extrajudicial: CONTRATO_BASE,
  internacional: INTERNACIONAL_BASE,
  academico: ABNT_ACADEMICO_BASE,
  ferramentas: ABNT_BASE,
};

/**
 * Get the format configuration for a document type.
 * Falls back to category default, then to CNJ_BASE.
 */
export function getDocumentFormatConfig(
  typeId: string,
  category?: string
): DocumentFormatConfig {
  const categoryConfig = category
    ? CATEGORY_CONFIGS[category] || CNJ_BASE
    : CNJ_BASE;

  const typeOverrides = TYPE_CONFIGS[typeId];
  if (typeOverrides) {
    return { ...categoryConfig, ...typeOverrides };
  }

  return categoryConfig;
}
