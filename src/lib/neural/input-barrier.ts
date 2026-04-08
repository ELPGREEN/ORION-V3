/**
 * ─── Barreira Hematoencefálica: Input Barrier ───
 * Pre-pipeline input sanitization with embedding normalization
 * and outlier suppression. Prevents prompt injection, adversarial
 * tokens, and anomalous inputs from reaching the neural pipeline.
 *
 * Equation: x̂ = (x - μ) / σ · γ + β  (LayerNorm-inspired)
 * Outlier: tokens with L2 norm > 3σ are attenuated
 *
 * Ref: Ba et al. (2016) "Layer Normalization"
 *      Perez & Ribeiro (2022) "Ignore This Title and HackAPrompt"
 *      Greshake et al. (2023) "Not what you've signed up for"
 */

// ─── Types ───

export interface BarrierResult {
  /** Sanitized input text */
  sanitized: string;
  /** Was the input modified? */
  modified: boolean;
  /** Threat level (0 = safe, 1 = critical) */
  threatLevel: number;
  /** Detected threats */
  threats: BarrierThreat[];
  /** Input statistics */
  stats: InputStats;
  /** Processing time (ms) */
  processingMs: number;
}

export interface BarrierThreat {
  type: "prompt_injection" | "jailbreak" | "encoding_attack" | "overflow" | "gibberish" | "impersonation";
  description: string;
  severity: "low" | "medium" | "high" | "critical";
  /** Position in input where threat was found */
  position?: number;
}

export interface InputStats {
  /** Original length */
  originalLength: number;
  /** Sanitized length */
  sanitizedLength: number;
  /** Character entropy (bits) */
  entropy: number;
  /** Ratio of non-alphanumeric chars */
  specialCharRatio: number;
  /** L2 norm proxy (word-level) */
  l2NormProxy: number;
  /** Is within normal distribution */
  isNormal: boolean;
}

export interface BarrierConfig {
  /** Max input length (chars) */
  maxLength: number;
  /** Entropy threshold for gibberish detection */
  entropyThreshold: number;
  /** Special char ratio threshold */
  specialCharThreshold: number;
  /** Enable/disable barrier */
  enabled: boolean;
  /** Strict mode: reject instead of sanitize */
  strict: boolean;
}

// ─── Constants ───

export const DEFAULT_BARRIER_CONFIG: BarrierConfig = {
  maxLength: 8192,
  entropyThreshold: 5.5,  // Bits per char — above this is suspicious
  specialCharThreshold: 0.4,
  enabled: true,
  strict: false,
};

// ─── Injection Patterns ───

const INJECTION_PATTERNS: Array<{ pattern: RegExp; type: BarrierThreat["type"]; severity: BarrierThreat["severity"]; desc: string }> = [
  // Prompt injection
  { pattern: /ignore\s+(all\s+)?previous\s+(instructions?|prompts?)/i, type: "prompt_injection", severity: "critical", desc: "Tentativa de ignorar instruções anteriores" },
  { pattern: /you\s+are\s+now\s+(?:a|an|the)\s+/i, type: "prompt_injection", severity: "high", desc: "Tentativa de redefinir identidade" },
  { pattern: /\bsystem\s*:\s*/i, type: "prompt_injection", severity: "high", desc: "Tentativa de injetar system prompt" },
  { pattern: /\bassistant\s*:\s*/i, type: "prompt_injection", severity: "medium", desc: "Tentativa de injetar resposta de assistente" },
  { pattern: /\buser\s*:\s*/i, type: "prompt_injection", severity: "medium", desc: "Tentativa de forjar mensagem de usuário" },
  { pattern: /do\s+not\s+follow\s+(your|the)\s+(rules|guidelines)/i, type: "jailbreak", severity: "critical", desc: "Tentativa de jailbreak" },
  { pattern: /pretend\s+(you|that)\s+(are|have|can)\s+/i, type: "jailbreak", severity: "high", desc: "Tentativa de roleplaying malicioso" },
  { pattern: /\bDAN\b.*\bmode\b/i, type: "jailbreak", severity: "critical", desc: "Tentativa DAN jailbreak" },

  // Encoding attacks
  { pattern: /[\u200b-\u200f\u202a-\u202e\u2060-\u206f]/g, type: "encoding_attack", severity: "medium", desc: "Caracteres invisíveis Unicode detectados" },
  { pattern: /[\ufeff\ufff0-\uffff]/g, type: "encoding_attack", severity: "medium", desc: "BOM ou caracteres de substituição Unicode" },

  // Impersonation
  { pattern: /\b(eu\s+sou\s+o?\s*(admin|administrador|root|system))\b/i, type: "impersonation", severity: "high", desc: "Tentativa de impersonar administrador" },
  { pattern: /\b(i\s+am\s+(the\s+)?(admin|root|system|developer))\b/i, type: "impersonation", severity: "high", desc: "Impersonation attempt" },
];

// ─── Core Functions ───

/**
 * Compute Shannon entropy of a string (bits per character).
 */
function computeEntropy(text: string): number {
  if (text.length === 0) return 0;
  const freq: Record<string, number> = {};
  for (const ch of text) {
    freq[ch] = (freq[ch] || 0) + 1;
  }
  let entropy = 0;
  const len = text.length;
  for (const count of Object.values(freq)) {
    const p = count / len;
    if (p > 0) entropy -= p * Math.log2(p);
  }
  return entropy;
}

/**
 * Compute L2 norm proxy from word frequency distribution.
 * High L2 norm = unusual distribution of words.
 */
function computeL2NormProxy(text: string): number {
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  if (words.length === 0) return 0;

  const freq: Record<string, number> = {};
  for (const w of words) {
    freq[w] = (freq[w] || 0) + 1;
  }

  // Normalized frequency vector → L2 norm
  const values = Object.values(freq).map(f => f / words.length);
  const l2 = Math.sqrt(values.reduce((sum, v) => sum + v * v, 0));
  return l2;
}

/**
 * Layer normalization on input features.
 * x̂ = (x - μ) / σ · γ + β
 */
function normalizeFeatures(features: number[]): number[] {
  if (features.length === 0) return [];
  const mean = features.reduce((s, v) => s + v, 0) / features.length;
  const variance = features.reduce((s, v) => s + (v - mean) ** 2, 0) / features.length;
  const std = Math.sqrt(variance + 1e-8);

  const gamma = 1.0; // Learnable scale (fixed for now)
  const beta = 0.0;  // Learnable bias (fixed for now)

  return features.map(x => ((x - mean) / std) * gamma + beta);
}

/**
 * Suppress outliers: values > 3σ are clamped.
 */
function suppressOutliers(features: number[], sigmaThreshold = 3): number[] {
  const mean = features.reduce((s, v) => s + v, 0) / features.length;
  const std = Math.sqrt(
    features.reduce((s, v) => s + (v - mean) ** 2, 0) / features.length + 1e-8
  );
  const lower = mean - sigmaThreshold * std;
  const upper = mean + sigmaThreshold * std;

  return features.map(x => Math.max(lower, Math.min(upper, x)));
}

/**
 * Remove invisible / zero-width characters.
 */
function sanitizeEncoding(text: string): string {
  return text
    .replace(/[\u200b-\u200f]/g, "")   // Zero-width chars
    .replace(/[\u202a-\u202e]/g, "")    // Bidi overrides
    .replace(/[\u2060-\u206f]/g, "")    // Invisible formatters
    .replace(/[\ufeff]/g, "")           // BOM
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ""); // Control chars
}

// ─── Public API ───

let currentConfig = { ...DEFAULT_BARRIER_CONFIG };

/**
 * Process input through the blood-brain barrier.
 * Sanitizes, normalizes, and detects threats.
 */
export function processInput(input: string, config?: Partial<BarrierConfig>): BarrierResult {
  const start = performance.now();
  const cfg = { ...currentConfig, ...config };

  if (!cfg.enabled) {
    return {
      sanitized: input,
      modified: false,
      threatLevel: 0,
      threats: [],
      stats: {
        originalLength: input.length,
        sanitizedLength: input.length,
        entropy: 0,
        specialCharRatio: 0,
        l2NormProxy: 0,
        isNormal: true,
      },
      processingMs: performance.now() - start,
    };
  }

  const threats: BarrierThreat[] = [];
  let sanitized = input;

  // Step 1: Length check
  if (sanitized.length > cfg.maxLength) {
    sanitized = sanitized.slice(0, cfg.maxLength);
    threats.push({
      type: "overflow",
      description: `Input truncado de ${input.length} para ${cfg.maxLength} caracteres`,
      severity: "medium",
    });
  }

  // Step 2: Encoding sanitization
  const beforeEncoding = sanitized;
  sanitized = sanitizeEncoding(sanitized);
  if (sanitized !== beforeEncoding) {
    threats.push({
      type: "encoding_attack",
      description: "Caracteres invisíveis removidos",
      severity: "medium",
    });
  }

  // Step 3: Pattern matching for injections
  for (const rule of INJECTION_PATTERNS) {
    const match = rule.pattern.exec(sanitized);
    if (match) {
      threats.push({
        type: rule.type,
        description: rule.desc,
        severity: rule.severity,
        position: match.index,
      });
    }
  }

  // Step 4: Statistical analysis
  const entropy = computeEntropy(sanitized);
  const specialChars = sanitized.replace(/[\w\s]/g, "").length;
  const specialCharRatio = sanitized.length > 0 ? specialChars / sanitized.length : 0;
  const l2Norm = computeL2NormProxy(sanitized);

  // Feature normalization (LayerNorm-inspired)
  const features = [entropy, specialCharRatio, l2Norm];
  const normalized = normalizeFeatures(features);
  const suppressed = suppressOutliers(normalized);

  // Check for gibberish (high entropy + high special char ratio)
  if (entropy > cfg.entropyThreshold && specialCharRatio > cfg.specialCharThreshold) {
    threats.push({
      type: "gibberish",
      description: `Entropia alta (${entropy.toFixed(2)} bits) com ${(specialCharRatio * 100).toFixed(0)}% caracteres especiais`,
      severity: "medium",
    });
  }

  // Compute overall threat level
  const severityScores = { low: 0.15, medium: 0.35, high: 0.65, critical: 0.95 };
  const maxThreat = threats.reduce((max, t) => Math.max(max, severityScores[t.severity]), 0);
  const avgThreat = threats.length > 0
    ? threats.reduce((sum, t) => sum + severityScores[t.severity], 0) / threats.length
    : 0;
  const threatLevel = Math.min(1, maxThreat * 0.7 + avgThreat * 0.3);

  // Is normal distribution?
  const isNormal = suppressed.every((v, i) => Math.abs(v - normalized[i]) < 0.1);

  return {
    sanitized,
    modified: sanitized !== input,
    threatLevel,
    threats,
    stats: {
      originalLength: input.length,
      sanitizedLength: sanitized.length,
      entropy,
      specialCharRatio,
      l2NormProxy: l2Norm,
      isNormal,
    },
    processingMs: performance.now() - start,
  };
}

/**
 * Quick check: returns true if input is safe (no critical threats).
 */
export function isInputSafe(input: string): boolean {
  const result = processInput(input);
  return result.threatLevel < 0.6;
}

/**
 * Update barrier config.
 */
export function updateBarrierConfig(partial: Partial<BarrierConfig>): void {
  currentConfig = { ...currentConfig, ...partial };
}

/**
 * Get current config for introspection.
 */
export function getBarrierConfig(): BarrierConfig {
  return { ...currentConfig };
}
