/**
 * TEN-Inspired Turn Detection for Orion Voice System
 * 
 * Adapted from TEN Framework's Turn Detection concept:
 * https://github.com/TEN-framework/ten-turn-detection
 * 
 * Classifies user utterances into three states:
 * - "finished": Complete thought, expects AI response
 * - "unfinished": User paused mid-sentence, will continue
 * - "wait": User wants AI to stop speaking
 * 
 * Uses lightweight linguistic pattern matching instead of 
 * the 7B transformer model (not feasible in browser).
 */

export type TurnState = "finished" | "unfinished" | "wait";

// ═══ Wait/Stop Patterns ═══
// User explicitly wants to silence the AI
const WAIT_PATTERNS_PT = [
  /^(cala?\s*a?\s*boca|para|pare|silêncio|chega|shh+|calado|mudo|quieto|pausa|espera|espere|aguarda|aguarde|oi\s+para|ei\s+para)\s*[.!]?$/i,
  /^(não\s+fala|não\s+fale|não\s+responda?|não\s+diga|não\s+continue)\s*$/i,
  /^(ok\s+para|tá\s+bom\s+para|pera|peraí|segura|hold\s+on)\s*$/i,
];

const WAIT_PATTERNS_EN = [
  /^(shut\s+up|stop|be\s+quiet|silence|hush|shh+|mute|pause|hold\s+on|wait)\s*[.!]?$/i,
  /^(don'?t\s+(speak|talk|say|respond|continue|answer))\s*$/i,
  /^(ok\s+stop|that'?s\s+enough|enough)\s*$/i,
];

// ═══ Unfinished Patterns ═══
// Sentence clearly incomplete — user will continue
const UNFINISHED_PATTERNS_PT = [
  // Ends with conjunctions/prepositions indicating continuation
  /\b(e|ou|mas|porém|porque|pois|quando|enquanto|se|que|como|para|por|com|sem|de|do|da|dos|das|no|na|nos|nas|em|ao|à|aos|às|pelo|pela|entre|sobre|sob|ante|após|até|contra|desde|perante|mediante|conforme|segundo)\s*$/i,
  // Ends with articles (clearly unfinished)
  /\b(o|a|os|as|um|uma|uns|umas|este|esta|estes|estas|esse|essa|esses|essas|aquele|aquela)\s*$/i,
  // Ends with "é" or verbs that need complement
  /\b(é|são|foi|foram|era|eram|está|estão|fica|ficam|tem|têm|faz|fazem|vai|vão|pode|podem|deve|devem|quer|querem|precisa|precisam|gostaria|queria|deveria|poderia)\s*$/i,
  // Trailing comma or ellipsis
  /[,;]\s*$/,
  /\.{2,}\s*$/,
  // Very short (< 4 words) without terminal punctuation
  /^(\S+\s+){0,2}\S+\s*$/,
];

const UNFINISHED_PATTERNS_EN = [
  /\b(and|or|but|because|since|when|while|if|that|which|who|whom|whose|where|how|what|to|for|with|without|of|in|on|at|by|from|about|the|a|an|this|that|these|those)\s*$/i,
  /\b(is|are|was|were|has|have|had|does|do|did|will|would|can|could|should|shall|may|might|must)\s*$/i,
  /[,;]\s*$/,
  /\.{2,}\s*$/,
];

// ═══ Finished Indicators ═══
// Strong signals that the utterance is complete
const FINISHED_INDICATORS_PT = [
  // Terminal punctuation
  /[.!?]\s*$/,
  // Complete question words at start + content
  /^(o\s+que|quem|qual|quais|quando|onde|como|por\s*que|quanto)\b.{8,}/i,
  // Imperative commands
  /^(pesquise?|busque?|procure?|encontre?|mostr[ea]|abr[ae]|fech[ea]|salv[ea]|envi[ea]|cri[ea]|gere?|calcul[ea]|traduz[ae]|resum[ae]|expliqu?e?|defin[ae]|analise?)\b/i,
  // Greeting/farewell
  /^(olá|oi|bom\s+dia|boa\s+(tarde|noite)|tchau|até|obrigad[oa]|valeu|falou)\s*$/i,
];

const FINISHED_INDICATORS_EN = [
  /[.!?]\s*$/,
  /^(what|who|which|when|where|how|why)\b.{8,}/i,
  /^(search|find|show|open|close|save|send|create|generate|calculate|translate|summarize|explain|define|analyze)\b/i,
  /^(hello|hi|hey|good\s+(morning|afternoon|evening)|bye|goodbye|thanks|thank\s+you)\s*$/i,
];

/**
 * Detect turn state from transcript text.
 * Inspired by TEN Turn Detection but uses lightweight patterns
 * instead of a 7B parameter model.
 */
export function detectTurnState(text: string, lang: string = "pt-BR"): TurnState {
  const trimmed = text.trim();
  if (!trimmed) return "unfinished";

  const isPt = lang.toLowerCase().startsWith("pt");
  const waitPatterns = isPt ? WAIT_PATTERNS_PT : WAIT_PATTERNS_EN;
  const unfinishedPatterns = isPt ? UNFINISHED_PATTERNS_PT : UNFINISHED_PATTERNS_EN;
  const finishedIndicators = isPt ? FINISHED_INDICATORS_PT : FINISHED_INDICATORS_EN;

  // 1. Check WAIT first (highest priority — user wants silence)
  for (const pattern of waitPatterns) {
    if (pattern.test(trimmed)) return "wait";
  }

  // 2. Check FINISHED indicators
  for (const pattern of finishedIndicators) {
    if (pattern.test(trimmed)) return "finished";
  }

  // 3. Check UNFINISHED patterns
  for (const pattern of unfinishedPatterns) {
    if (pattern.test(trimmed)) return "unfinished";
  }

  // 4. Heuristics
  const wordCount = trimmed.split(/\s+/).length;
  
  // Very short utterances without punctuation → likely unfinished
  if (wordCount <= 2 && !/[.!?]$/.test(trimmed)) return "unfinished";
  
  // Medium-long utterances (5+ words) without trailing connectors → likely finished
  if (wordCount >= 5) return "finished";
  
  // 3-4 word utterances — use conservative "finished" 
  // (better to respond than leave user hanging)
  return "finished";
}

/**
 * Calculate optimal silence duration based on turn state.
 * TEN Framework insight: dynamic silence thresholds improve 
 * response latency without cutting off the user.
 */
export function getOptimalSilenceDuration(turnState: TurnState): number {
  switch (turnState) {
    case "wait":
      return 0; // Immediate action
    case "finished":
      return 400; // Quick response (was 700ms)
    case "unfinished":
      return 1500; // Wait longer for user to continue
  }
}

/**
 * Check if a barge-in (user interruption) should be honored.
 * TEN Framework insight: not all interruptions are intentional.
 */
export function shouldHonorBargeIn(
  transcript: string,
  currentTTSProgress: number, // 0-1, how far into TTS
  lang: string = "pt-BR",
): boolean {
  const trimmed = transcript.trim();
  
  // Always honor explicit stop commands
  const turnState = detectTurnState(trimmed, lang);
  if (turnState === "wait") return true;
  
  // Honor if transcript is substantial (> 3 words)
  const wordCount = trimmed.split(/\s+/).length;
  if (wordCount >= 3) return true;
  
  // Honor if TTS is > 70% complete (user waited, then spoke = intentional)
  if (currentTTSProgress > 0.7) return true;
  
  // Short utterance early in TTS = likely echo/noise, ignore
  if (wordCount <= 1 && currentTTSProgress < 0.3) return false;
  
  return true;
}
