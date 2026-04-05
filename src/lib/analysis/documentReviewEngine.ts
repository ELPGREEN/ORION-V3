// ─── Document Review Engine ───
// Parses AI review responses into structured redline operations
// that map to SuggestionMark (insert/delete/replace)

import type { Suggestion } from "@/components/dashboard/editor/types";

export interface RedlineOperation {
  type: "insert" | "delete" | "replace" | "simplify";
  /** Position in plain text where the change starts */
  originalText: string;
  suggestedText: string;
  reason: string;
  severity: "info" | "warning" | "critical";
}

export interface ReviewResult {
  operations: RedlineOperation[];
  summary: {
    totalSuggestions: number;
    risks: number;
    missingClauses: number;
    improvements: number;
  };
}

/**
 * Parse an AI review response (structured JSON or markdown) into RedlineOperations.
 * The AI is prompted to return JSON array of changes; this parses that.
 */
export function parseAIReviewResponse(aiResponse: string): RedlineOperation[] {
  const operations: RedlineOperation[] = [];

  // Try JSON parsing first
  try {
    const jsonMatch = aiResponse.match(/\[[\s\S]*?\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item.type && (item.originalText !== undefined || item.suggestedText !== undefined)) {
            operations.push({
              type: item.type === "insert" ? "insert" : item.type === "delete" ? "delete" : "replace",
              originalText: item.originalText || "",
              suggestedText: item.suggestedText || "",
              reason: item.reason || "Sugestão da IA",
              severity: item.severity || "info",
            });
          }
        }
        return operations;
      }
    }
  } catch {
    // Fall through to markdown parsing
  }

  // Markdown/text parsing fallback
  // Look for patterns like:
  // **SUBSTITUIR**: "texto original" → "texto sugerido" (razão)
  // **INSERIR**: "texto" após "contexto" (razão)
  // **REMOVER**: "texto" (razão)
  const replacePattern = /\*?\*?(?:SUBSTITU[IÍ]R|REPLACE|TROCAR)\*?\*?[:\s]+[""](.+?)[""][\s]*[→➜>]+[\s]*[""](.+?)[""](?:\s*\((.+?)\))?/gi;
  const insertPattern = /\*?\*?(?:INSERIR|INSERT|ADICIONAR)\*?\*?[:\s]+[""](.+?)[""](?:\s*(?:após|depois|before|after)\s*[""](.+?)[""])?(?:\s*\((.+?)\))?/gi;
  const deletePattern = /\*?\*?(?:REMOVER|DELETE|EXCLUIR)\*?\*?[:\s]+[""](.+?)[""](?:\s*\((.+?)\))?/gi;

  let match;
  while ((match = replacePattern.exec(aiResponse)) !== null) {
    operations.push({
      type: "replace",
      originalText: match[1],
      suggestedText: match[2],
      reason: match[3] || "Sugestão da IA",
      severity: "info",
    });
  }

  while ((match = insertPattern.exec(aiResponse)) !== null) {
    operations.push({
      type: "insert",
      originalText: match[2] || "",
      suggestedText: match[1],
      reason: match[3] || "Sugestão da IA",
      severity: "info",
    });
  }

  while ((match = deletePattern.exec(aiResponse)) !== null) {
    operations.push({
      type: "delete",
      originalText: match[1],
      suggestedText: "",
      reason: match[2] || "Sugestão da IA",
      severity: "warning",
    });
  }

  return operations;
}

/**
 * Convert RedlineOperations to Suggestion objects compatible with SuggestionMark.
 * Attempts to find each originalText in the editor's text content to determine positions.
 */
export function operationsToSuggestions(
  operations: RedlineOperation[],
  editorText: string,
  authorId: string = "ai-review",
  authorName: string = "Revisão IA"
): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const textLower = editorText.toLowerCase();

  for (const op of operations) {
    let from = 0;
    let to = 0;

    if (op.originalText) {
      const idx = textLower.indexOf(op.originalText.toLowerCase());
      if (idx >= 0) {
        from = idx;
        to = idx + op.originalText.length;
      } else {
        // Try fuzzy: first 20 chars
        const snippet = op.originalText.substring(0, 20).toLowerCase();
        const fuzzyIdx = textLower.indexOf(snippet);
        if (fuzzyIdx >= 0) {
          from = fuzzyIdx;
          to = fuzzyIdx + op.originalText.length;
        } else {
          continue; // Skip if we can't locate it
        }
      }
    }

    suggestions.push({
      id: `review-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      authorId,
      authorName,
      type: op.type,
      originalText: op.originalText,
      suggestedText: op.suggestedText,
      createdAt: new Date().toISOString(),
      status: "pending",
      from,
      to,
    });
  }

  return suggestions;
}

/**
 * Build the AI prompt for document review.
 */
export function buildReviewPrompt(documentText: string, documentType?: string): string {
  const typeContext = documentType ? `Tipo do documento: ${documentType}.` : "";
  
  return `Você é um revisor jurídico especialista. Analise o documento abaixo e retorne APENAS um array JSON com sugestões de alteração.

${typeContext}

Cada item do array deve ter:
- "type": "replace" | "insert" | "delete"
- "originalText": texto original a ser alterado (string exata do documento)
- "suggestedText": texto sugerido (vazio para delete)
- "reason": justificativa breve
- "severity": "info" | "warning" | "critical"

Foque em:
1. Termos juridicamente imprecisos ou ambíguos
2. Cláusulas com riscos para o cliente
3. Fundamentação legal incompleta ou incorreta
4. Melhorias de clareza e objetividade
5. Termos agressivos ou desequilibrados

Retorne SOMENTE o array JSON, sem explicações adicionais.

DOCUMENTO:
${documentText.substring(0, 8000)}`;
}

/**
 * Compute review summary stats from operations.
 */
export function computeReviewSummary(operations: RedlineOperation[]): ReviewResult["summary"] {
  return {
    totalSuggestions: operations.length,
    risks: operations.filter((o) => o.severity === "critical" || o.severity === "warning").length,
    missingClauses: 0,
    improvements: operations.filter((o) => o.severity === "info").length,
  };
}

/**
 * Build a prompt to simplify complex legal text into plain Portuguese.
 * Inspired by the T5-base paraphrasing approach from Legal-AI-Project.
 */
export function buildSimplificationPrompt(clauseText: string): string {
  return `Você é um especialista em linguagem jurídica simples ("legal design" / "plain language").
Reescreva o trecho jurídico abaixo em português claro e acessível, mantendo o significado legal preciso.

REGRAS:
1. Substitua jargão jurídico por equivalentes em linguagem comum.
2. Quebre períodos longos em frases curtas (máx. 25 palavras).
3. Use voz ativa sempre que possível.
4. Mantenha referências a artigos de lei, mas explique-os brevemente entre parênteses.
5. Preserve TODOS os direitos e obrigações do texto original — não omita nada.
6. Retorne APENAS o texto simplificado, sem explicações adicionais.

TRECHO ORIGINAL:
${clauseText.substring(0, 4000)}`;
}
