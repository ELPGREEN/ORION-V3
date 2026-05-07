import { LogManager } from '../core/log-manager';

const logger = LogManager.getInstance().createLogger('InputBarrier');

export interface BarrierConfig {
  maxInputLength: number;
  blockMaliciousPatterns: boolean;
  allowedLanguages: string[];
  threatThreshold: number;
}

export interface BarrierResult {
  allowed: boolean;
  sanitizedInput: string;
  threatScore: number;
  detectedThreats: string[];
  latencyMs: number;
}

const DEFAULT_BARRIER_CONFIG: BarrierConfig = {
  maxInputLength: 10000,
  blockMaliciousPatterns: true,
  allowedLanguages: ['pt', 'en', 'es'],
  threatThreshold: 0.7,
};

const MALICIOUS_PATTERNS = [
  { name: 'sql_injection', regex: /DROP TABLE|DELETE FROM|UNION SELECT|UPDATE .* SET/gi },
  { name: 'script_injection', regex: /<script>|javascript:|onerror=|onload=/gi },
  { name: 'prompt_injection', regex: /ignore all previous instructions|you are now|system override/gi },
  { name: 'sensitive_data', regex: /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b|\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g },
];

/**
 * Blood-brain barrier for Orion.
 * Protects the reasoning core from malicious or malformed inputs.
 */

/**
 * Remove invisible / zero-width characters.
 */
function sanitizeEncoding(text: string): string {
  return text
    .replace(/[\u200b-\u200f]/g, "")   // Zero-width chars
    .replace(/[\u202a-\u202e]/g, "")    // Bidi overrides
    .replace(/[\u2060-\u206f]/g, "")    // Invisible formatters
    .replace(/[\ufeff]/g, "")           // BOM
    /* eslint-disable-next-line no-control-regex */
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

  let sanitized = sanitizeEncoding(input || "");

  if (sanitized.length > cfg.maxInputLength) {
    sanitized = sanitized.substring(0, cfg.maxInputLength);
  }

  const detectedThreats: string[] = [];
  let threatScore = 0;

  if (cfg.blockMaliciousPatterns) {
    for (const pattern of MALICIOUS_PATTERNS) {
      if (pattern.regex.test(sanitized)) {
        detectedThreats.push(pattern.name);
        threatScore += 0.3;
      }
    }
  }

  const latencyMs = performance.now() - start;

  return {
    allowed: threatScore < cfg.threatThreshold,
    sanitizedInput: sanitized,
    threatScore: Math.min(1, threatScore),
    detectedThreats,
    latencyMs,
  };
}

export function updateBarrierConfig(config: Partial<BarrierConfig>): void {
  currentConfig = { ...currentConfig, ...config };
  logger.info('Barrier config updated', currentConfig);
}
