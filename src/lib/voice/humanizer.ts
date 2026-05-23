/**
 * humanizer.ts — Post-processor that strips AI-isms from Orion's responses.
 * Based on Wikipedia's "Signs of AI writing" (29 patterns).
 * Makes text sound like a real Brazilian speaking, not a chatbot.
 *
 * Applied BEFORE TTS so the spoken output sounds natural.
 */

// ── Pattern 1: Significance inflation ──
const INFLATION_PHRASES = [
  /marca(?:ndo)? um momento pivotal/gi,
  /representando? um marco/gi,
  /na evolução d[aeo]/gi,
  /transform(?:ador|ativa|ando)/gi,
  /revolucion(?:ário|ando|ar)/gi,
  /um verdadeiro divisor de águas/gi,
  /inovador(?:a)? e disruptiv[oa]/gi,
  /paradigm(?:a|ático)/gi,
];

// ── Pattern 4: Promotional language ──
const PROMOTIONAL = [
  /aninhad[oa] n[oa]/gi,
  /de tirar o fôlego/gi,
  /impressionante(?:mente)?/gi,
  /absolutamente incrível/gi,
  /verdadeiramente notável/gi,
  /excepcional(?:mente)?/gi,
];

// ── Pattern 7: AI vocabulary (PT-BR) ──
const AI_VOCAB: [RegExp, string][] = [
  [/\badicionalmente\b/gi, "além disso"],
  [/\btestamento de\b/gi, "mostra"],
  [/\bpaisagem\b(?=\s+(?:tecnológ|digital|d[eo]))/gi, "cenário"],
  [/\bshowcasing\b/gi, "mostrando"],
  [/\blandscape\b/gi, "cenário"],
  [/\btestament\b/gi, "prova"],
  [/\brobust(?:o|a)?\b/gi, "sólido"],
  [/\bholístic[oa]\b/gi, "completo"],
  [/\bsinerg(?:ia|ético)/gi, "combinação"],
  [/\balavanca(?:r|gem)\b/gi, "usar"],
  [/\botimiza(?:r|ção)\b/gi, "melhorar"],
  [/\bempoderar\b/gi, "dar poder"],
  [/\bcatalisador\b/gi, "impulso"],
  [/\becossistema\b(?=\s+(?:de|do|da))/gi, "ambiente"],
  [/\binterface intuitiva\b/gi, "interface fácil"],
];

// ── Pattern 8: Copula avoidance ──
const COPULA: [RegExp, string][] = [
  [/serve como/gi, "é"],
  [/funciona como/gi, "é"],
  [/atua como um(?:a)?\b/gi, "é"],
  [/desempenha o papel de/gi, "é"],
];

// ── Pattern 10: Rule of three (detect triple comma lists ending with "e") ──
// Not auto-fixable reliably, but we can flag excessive patterns

// ── Pattern 14: Em dash overuse — replace with comma or period ──
const EM_DASH_EXCESS = /—([^—]{1,60})—/g;

// ── Pattern 18: Emoji removal for spoken text ──
const EMOJI_REGEX = /(?:[\uD83C-\uD83E][\uDC00-\uDFFF]|[\u2600-\u26FF]|[\u2700-\u27BF]|[\uFE00-\uFE0F]|\u200D|\u20E3)+/gu;

// ── Pattern 20: Chatbot artifacts ──
const CHATBOT_ARTIFACTS = [
  /espero que (?:isso )?ajude!?/gi,
  /me avise se (?:precisar|quiser)\b.*?[.!]/gi,
  /fico à disposição[.!]?/gi,
  /não hesite em perguntar[.!]?/gi,
  /estou aqui para ajudar[.!]?/gi,
  /qualquer dúvida,? (?:é só )?(?:perguntar|falar)[.!]?/gi,
  /com certeza[!.] /gi,
  /^(?:ótima|excelente|boa) (?:pergunta|questão)[!.]\s*/gi,
];

// ── Pattern 22: Sycophantic tone ──
const SYCOPHANTIC = [
  /^(?:ótima|excelente|boa|bela) pergunta[!.]\s*/gim,
  /você está absolutamente cert[oa][!.]\s*/gi,
  /que pergunta interessante[!.]\s*/gi,
  /essa é uma questão muito (?:boa|importante)[!.]\s*/gi,
];

// ── Pattern 23: Filler phrases ──
const FILLERS: [RegExp, string][] = [
  [/\bcom o objetivo de\b/gi, "para"],
  [/\ba fim de\b/gi, "para"],
  [/\bdevido ao fato de que\b/gi, "porque"],
  [/\bno que diz respeito a\b/gi, "sobre"],
  [/\bé importante notar que\b/gi, ""],
  [/\bvale a pena mencionar que\b/gi, ""],
  [/\bé interessante observar que\b/gi, ""],
  [/\bnesse sentido,?\s*/gi, ""],
  [/\bdito isto,?\s*/gi, ""],
  [/\bsendo assim,?\s*/gi, ""],
  [/\bbasicamente,?\s*/gi, ""],
  [/\bessencialmente,?\s*/gi, ""],
  [/\bfundamentalmente,?\s*/gi, ""],
];

// ── Pattern 24: Excessive hedging ──
const HEDGING: [RegExp, string][] = [
  [/poderia potencialmente/gi, "pode"],
  [/possivelmente poderia/gi, "pode"],
  [/é possível que possa/gi, "pode"],
  [/em certa medida/gi, ""],
  [/de certa forma/gi, ""],
];

// ── Pattern 25: Generic conclusions ──
const GENERIC_CONCLUSIONS = [
  /o futuro (?:é|parece) promissor[.!]?\s*/gi,
  /tempos empolgantes nos aguardam[.!]?\s*/gi,
  /(?:em|na) conclusão,?\s*/gi,
  /para concluir,?\s*/gi,
  /em resumo,?\s*/gi,
];

// ── Pattern 27: Persuasive authority tropes ──
const AUTHORITY_TROPES = [
  /em sua essência,?\s*/gi,
  /no fundo,?\s*/gi,
  /o que realmente importa é\s*/gi,
  /a verdade é que\s*/gi,
  /não é segredo que\s*/gi,
];

// ── Pattern 28: Signposting announcements ──
const SIGNPOSTING = [
  /vamos (?:mergulhar|explorar|ver)[.!]?\s*/gi,
  /aqui está o que você precisa saber[.:]\s*/gi,
  /sem mais delongas,?\s*/gi,
  /dito isso,?\s*/gi,
];

/**
 * Humanize a text response from the LLM.
 * Strips AI-isms, filler, and chatbot artifacts.
 * Returns cleaner, more direct text.
 */
export function humanizeText(text: string): string {
  if (!text || text.length < 10) return text;

  let result = text;

  // Remove chatbot artifacts
  for (const pat of CHATBOT_ARTIFACTS) {
    result = result.replace(pat, "");
  }

  // Remove sycophantic openers
  for (const pat of SYCOPHANTIC) {
    result = result.replace(pat, "");
  }

  // Replace AI vocabulary
  for (const [pat, rep] of AI_VOCAB) {
    result = result.replace(pat, rep);
  }

  // Fix copula avoidance
  for (const [pat, rep] of COPULA) {
    result = result.replace(pat, rep);
  }

  // Remove filler phrases
  for (const [pat, rep] of FILLERS) {
    result = result.replace(pat, rep);
  }

  // Reduce hedging
  for (const [pat, rep] of HEDGING) {
    result = result.replace(pat, rep);
  }

  // Remove generic conclusions
  for (const pat of GENERIC_CONCLUSIONS) {
    result = result.replace(pat, "");
  }

  // Remove authority tropes
  for (const pat of AUTHORITY_TROPES) {
    result = result.replace(pat, "");
  }

  // Remove signposting
  for (const pat of SIGNPOSTING) {
    result = result.replace(pat, "");
  }

  // Remove promotional inflation (just delete — context-dependent)
  for (const pat of PROMOTIONAL) {
    result = result.replace(pat, "");
  }

  // Simplify excessive em-dashes to commas
  result = result.replace(EM_DASH_EXCESS, ", $1,");

  // Remove emojis for cleaner spoken text
  result = result.replace(EMOJI_REGEX, "");

  // Clean up double spaces and leading/trailing whitespace
  result = result.replace(/  +/g, " ");
  result = result.replace(/\n{3,}/g, "\n\n");
  result = result.trim();

  // Fix orphaned punctuation from removals
  result = result.replace(/^\s*[.,;:]\s*/gm, "");
  result = result.replace(/([.,;:])\s*[.,;:]/g, "$1");

  // Capitalize first letter after cleanup
  if (result.length > 0 && /[a-záéíóúâêôãõç]/.test(result[0])) {
    result = result[0].toUpperCase() + result.slice(1);
  }

  return result;
}

/**
 * Light humanization for spoken output only.
 * Removes emojis, markdown bold/italic, and chatbot closers.
 */
export function humanizeForSpeech(text: string): string {
  let result = humanizeText(text);
  
  // Remove markdown formatting that sounds weird spoken
  result = result.replace(/\*\*([^*]+)\*\*/g, "$1");
  result = result.replace(/\*([^*]+)\*/g, "$1");
  result = result.replace(/`([^`]+)`/g, "$1");
  result = result.replace(/#{1,6}\s*/g, "");
  
  // Remove bullet points — convert to flowing text
  result = result.replace(/^[-•*]\s+/gm, "");
  
  // Remove numbered lists prefix
  result = result.replace(/^\d+[.)]\s+/gm, "");

  return result;
}
