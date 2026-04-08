/**
 * ─── Sistema Olfatório: Bypass Attention Fast-Path ───
 * Detects urgent/special tokens and bypasses the full neural pipeline.
 * Like the olfactory system, which bypasses the thalamus and goes
 * directly to the limbic system for fast emotional response.
 *
 * Triggers on: user name, emergency commands, stop signals, direct actions.
 * Returns pre-computed fast responses without stages 4-7 of the pipeline.
 *
 * Ref: Shepherd (2005) "Perception without a Thalamus"
 *      Carmichael et al. (1994) "Olfactory cortex → amygdala direct"
 */

// ─── Types ───

export interface BypassPattern {
  id: string;
  /** Regex pattern to match */
  pattern: RegExp;
  /** Category of bypass */
  category: "emergency" | "stop" | "identity" | "direct_command" | "greeting";
  /** Priority (higher = checked first) */
  priority: number;
  /** Pre-computed response template (supports {name} placeholder) */
  responseTemplate?: string;
  /** Should this completely skip LLM? */
  skipLLM: boolean;
  /** Max latency target (ms) */
  targetLatencyMs: number;
}

export interface BypassResult {
  /** Was bypass triggered? */
  triggered: boolean;
  /** Which pattern matched */
  matchedPattern?: string;
  /** Category */
  category?: BypassPattern["category"];
  /** Pre-computed response (if skipLLM) */
  fastResponse?: string;
  /** Should skip pipeline stages 4-7 */
  skipStages?: number[];
  /** Latency of bypass check (ms) */
  checkLatencyMs: number;
}

export interface BypassConfig {
  /** User's name for identity detection */
  userName?: string;
  /** Custom urgent patterns */
  customPatterns?: BypassPattern[];
  /** Enable/disable bypass */
  enabled: boolean;
}

// ─── Default Patterns ───

const DEFAULT_PATTERNS: BypassPattern[] = [
  // Emergency / Stop signals (highest priority)
  {
    id: "stop_now",
    pattern: /^(par[ea]|stop|cal[ae]|silêncio|quiet|shut\s*up)[\s!.]*$/i,
    category: "stop",
    priority: 100,
    responseTemplate: "Ok, parei.",
    skipLLM: true,
    targetLatencyMs: 10,
  },
  {
    id: "emergency",
    pattern: /\b(emergência|urgente|socorro|help\s*me|perigo|danger)\b/i,
    category: "emergency",
    priority: 95,
    skipLLM: false, // Still process with LLM but fast-path
    targetLatencyMs: 50,
  },
  {
    id: "cancel",
    pattern: /^(cancel[ae]r?|abortar?|abort|undo|desfaz)[\s!.]*$/i,
    category: "direct_command",
    priority: 90,
    responseTemplate: "Cancelado.",
    skipLLM: true,
    targetLatencyMs: 10,
  },

  // Identity / Name detection
  {
    id: "greeting_name",
    pattern: /^(oi|olá|hey|hi|hello|e\s*aí|fala)\s*,?\s*(orion|jarvis)/i,
    category: "greeting",
    priority: 70,
    skipLLM: false,
    targetLatencyMs: 50,
  },

  // Direct commands (skip analysis stages)
  {
    id: "time_query",
    pattern: /^(que\s*horas?|hora\s*agora|what\s*time)[\s?!.]*$/i,
    category: "direct_command",
    priority: 60,
    responseTemplate: `São ${new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}.`,
    skipLLM: true,
    targetLatencyMs: 5,
  },
  {
    id: "yes_no",
    pattern: /^(sim|não|yes|no|ok|tá|beleza|confirmo|negativo)[\s!.]*$/i,
    category: "direct_command",
    priority: 50,
    skipLLM: false, // Pass to LLM but skip heavy stages
    targetLatencyMs: 30,
  },

  // Repeat / confirmation
  {
    id: "repeat",
    pattern: /^(repet[ei]r?|repita|repeat|de\s*novo|again)[\s!.]*$/i,
    category: "direct_command",
    priority: 55,
    skipLLM: false,
    targetLatencyMs: 30,
  },
];

// ─── State ───

let config: BypassConfig = { enabled: true };
let allPatterns: BypassPattern[] = [...DEFAULT_PATTERNS];

// ─── Core Logic ───

/**
 * Check if input matches any bypass pattern.
 * Returns in < 1ms for most inputs.
 */
export function checkBypass(input: string): BypassResult {
  const start = performance.now();

  if (!config.enabled || !input || input.trim().length === 0) {
    return { triggered: false, checkLatencyMs: performance.now() - start };
  }

  const trimmed = input.trim();

  // Sort by priority (highest first)
  const sorted = [...allPatterns].sort((a, b) => b.priority - a.priority);

  for (const pattern of sorted) {
    if (pattern.pattern.test(trimmed)) {
      let fastResponse = pattern.responseTemplate;

      // Replace placeholders
      if (fastResponse && config.userName) {
        fastResponse = fastResponse.replace(/\{name\}/g, config.userName);
      }

      // Determine which stages to skip
      const skipStages = pattern.skipLLM
        ? [1, 2, 3, 4, 5, 6, 7, 8, 9] // Skip all
        : [4, 5, 6, 7]; // Skip analysis/reasoning stages

      return {
        triggered: true,
        matchedPattern: pattern.id,
        category: pattern.category,
        fastResponse: pattern.skipLLM ? fastResponse : undefined,
        skipStages,
        checkLatencyMs: performance.now() - start,
      };
    }
  }

  return { triggered: false, checkLatencyMs: performance.now() - start };
}

/**
 * Configure the bypass system.
 */
export function configureBypass(newConfig: Partial<BypassConfig>): void {
  config = { ...config, ...newConfig };

  // Rebuild patterns with custom ones
  allPatterns = [...DEFAULT_PATTERNS];
  if (config.customPatterns) {
    allPatterns.push(...config.customPatterns);
  }

  // Add user name pattern if provided
  if (config.userName && config.userName.length > 1) {
    const namePattern: BypassPattern = {
      id: "user_name_call",
      pattern: new RegExp(`\\b${escapeRegex(config.userName)}\\b`, "i"),
      category: "identity",
      priority: 80,
      skipLLM: false,
      targetLatencyMs: 20,
    };
    allPatterns.push(namePattern);
  }
}

/**
 * Add a custom bypass pattern at runtime.
 */
export function addBypassPattern(pattern: BypassPattern): void {
  allPatterns.push(pattern);
}

/**
 * Get all active patterns (for introspection).
 */
export function getActivePatterns(): BypassPattern[] {
  return [...allPatterns].sort((a, b) => b.priority - a.priority);
}

// ─── Helpers ───

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
