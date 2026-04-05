/**
 * ambiguityDetector.ts — Analyzes user messages for clarity before AI execution.
 * Prevents misinterpretation by detecting vague, short, or conflicting commands.
 */

export type ClarityLevel = "clear" | "ambiguous" | "vague";

export interface ClarityResult {
  level: ClarityLevel;
  reasons: string[];
  suggestedQuestion?: string;
}

/** Detect confirmation patterns in Portuguese */
export function isConfirmation(text: string): boolean {
  const lower = text.toLowerCase().trim();
  return /^(sim|isso|confirma|pode|ok|certo|exato|prossiga|vai|faz|aplica|aceito|concordo|pode ser|manda|tá|ta|beleza|perfeito|positivo|afirmativo)\b/.test(lower);
}

/** Analyze clarity of a user message before executing */
export function analyzeClarity(
  message: string,
  documentContent: string,
  intent: string | undefined
): ClarityResult {
  const lower = message.toLowerCase().trim();
  const reasons: string[] = [];

  // 1. Too short (< 3 words) for edit commands
  const wordCount = lower.split(/\s+/).length;
  if (wordCount < 3 && intent && ["edit", "format", "clause"].includes(getIntentCategory(intent))) {
    reasons.push("Mensagem muito curta para comando de edição");
  }

  // 2. Vague pronouns without clear referent
  if (/\b(isso|aquilo|esse|essa|este|esta|ele|ela|eles|elas|isto)\b/.test(lower) && wordCount < 8) {
    reasons.push("Pronome vago sem referente claro");
  }

  // 3. Conflicting actions
  if (/\b(adicione|insira)\b/.test(lower) && /\b(remova|delete|apague)\b/.test(lower)) {
    reasons.push("Ações conflitantes na mesma mensagem");
  }
  if (/\b(melhore|aprimore)\b/.test(lower) && /\b(simplifique|resuma|encurte)\b/.test(lower)) {
    reasons.push("Melhoria e simplificação podem ser contraditórias");
  }

  // 4. Missing target for edit commands
  if (/\b(substitua|troque|replace)\b/.test(lower) && !/"/.test(lower) && !/por\s/.test(lower)) {
    reasons.push("Substituição sem indicar o que trocar");
  }

  // 5. Extremely generic
  if (/^(melhore|arrume|conserte|ajuste|corrija)\.?$/i.test(lower)) {
    reasons.push("Comando genérico sem especificar o que melhorar");
  }

  // Determine level
  let level: ClarityLevel = "clear";
  if (reasons.length >= 2) {
    level = "vague";
  } else if (reasons.length === 1) {
    level = "ambiguous";
  }

  // Generate suggested question if not clear
  let suggestedQuestion: string | undefined;
  if (level !== "clear") {
    if (reasons.some((r) => r.includes("curta") || r.includes("genérico"))) {
      suggestedQuestion = "Pode especificar qual trecho ou aspecto do documento você quer que eu altere?";
    } else if (reasons.some((r) => r.includes("conflitantes"))) {
      suggestedQuestion = "Você quer que eu adicione ou remova conteúdo? São ações opostas.";
    } else if (reasons.some((r) => r.includes("Pronome"))) {
      suggestedQuestion = "A que trecho ou seção do documento você está se referindo?";
    } else {
      suggestedQuestion = "Pode detalhar melhor o que deseja? Assim consigo atender com precisão.";
    }
  }

  return { level, reasons, suggestedQuestion };
}

function getIntentCategory(intent: string): string {
  const editIntents = ["rewrite", "replace", "delete", "insert", "improve", "formatting", "format", "summarize", "ementa"];
  if (editIntents.includes(intent)) return "edit";
  return "research";
}
