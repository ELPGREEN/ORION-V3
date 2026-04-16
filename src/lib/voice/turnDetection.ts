/**
 * Turn Detection — lightweight heuristics for voice turns.
 * Keeps Orion from answering in the middle of the user's sentence.
 */

export type TurnState = "finished" | "unfinished" | "wait";

const HARD_STOP_REGEX = /[.!?…]$/;
const COMMAND_REGEX = /^(abr[aei]?|ativ[aei]?|desativ[aei]?|lig[aeu]?|deslig[aeu]?|mostr[ae]?|explique|responda|veja|verifique|procure|pesquise|me diga|me fale)\b/i;
const CONTINUATION_REGEX = /\b(e|ou|mas|porque|por\s+que|que|se|quando|onde|como|pra|para|com|sem|de|da|do|das|dos|um|uma|uns|umas|o|a|os|as|me|te|lhe|sobre|em)\s*$/i;
const CLOSING_REGEX = /\b(obrigado|obrigada|valeu|por favor|agora|s[oó] isso|somente isso|era isso|pode responder|pode falar)\s*$/i;

export function detectTurnState(buffer: string[], _lang?: string): TurnState {
  const raw = buffer.join(" ").trim();
  if (!raw) return "wait";

  const normalized = raw
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s ]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  const words = normalized ? normalized.split(" ").filter(Boolean) : [];
  const wordCount = words.length;

  if (HARD_STOP_REGEX.test(raw) || CLOSING_REGEX.test(normalized)) return "finished";
  if (CONTINUATION_REGEX.test(normalized)) return "unfinished";

  if (wordCount <= 2) {
    return COMMAND_REGEX.test(normalized) ? "finished" : "wait";
  }

  if (COMMAND_REGEX.test(normalized) && wordCount <= 6) return "finished";

  // Longer phrases — wait longer to make sure user is done
  if (wordCount >= 14) return "unfinished";

  return "wait";
}

export function getOptimalSilenceDuration(state: TurnState): number {
  switch (state) {
    case "finished":
      return 700;      // Was 900 → faster response after clear end
    case "unfinished":
      return 2000;     // Was 2500 → still patient but snappier
    case "wait":
    default:
      return 1400;     // Was 1800 → moderate wait
  }
}
