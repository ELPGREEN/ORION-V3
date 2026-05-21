/**
 * ═══ Intent Feedback System ═══
 * Learns from user corrections to improve Orion's intent classification.
 * When user says "não era isso" or "errado", captures the correction
 * and uses it to bias future classifications.
 * 
 * Storage: localStorage (instant, no network cost)
 * Format: { "normalized_text" → { correctIntent, count, lastUsed } }
 */

import { addMemoryFacts } from "./orion-memory";
import { getTokensEfficiently } from "@/lib/utils/text-utils";

const STORAGE_KEY = "orion_intent_feedback";
const MAX_ENTRIES = 500;

export interface IntentCorrection {
  originalIntent: string;
  correctIntent: string;
  originalText: string;
  count: number;
  lastUsed: number;
}

// In-memory mirror of localStorage
let _corrections: Map<string, IntentCorrection> | null = null;

function normalize(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, " ").slice(0, 200);
}

function loadCorrections(): Map<string, IntentCorrection> {
  if (typeof window === "undefined") return new Map();
  if (_corrections) return _corrections;
  try {
    const raw = (typeof window !== "undefined" ? localStorage.getItem : () => null).bind(typeof window !== "undefined" ? localStorage : {})( STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Record<string, IntentCorrection>;
      _corrections = new Map(Object.entries(parsed));
    } else {
      _corrections = new Map();
    }
  } catch {
    _corrections = new Map();
  }
  return _corrections;
}

function saveCorrections(): void {
  if (typeof window === "undefined") return;
  if (!_corrections) return;
  try {
    // Evict oldest entries if over limit
    if (_corrections.size > MAX_ENTRIES) {
      const sorted = [..._corrections.entries()].sort((a, b) => a[1].lastUsed - b[1].lastUsed);
      const toDelete = sorted.slice(0, _corrections.size - MAX_ENTRIES);
      for (const [key] of toDelete) _corrections.delete(key);
    }
    const obj = Object.fromEntries(_corrections);
    if (typeof window !== "undefined") localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
  } catch {
    // localStorage full — silently fail
  }
}

/**
 * Record a user correction: "I said X, you classified as Y, but the correct intent is Z"
 */
export function recordCorrection(
  originalText: string,
  originalIntent: string,
  correctIntent: string
): void {
  const corrections = loadCorrections();
  const key = normalize(originalText);
  
  const existing = corrections.get(key);
  if (existing) {
    existing.correctIntent = correctIntent;
    existing.count += 1;
    existing.lastUsed = Date.now();
  } else {
    corrections.set(key, {
      originalText: originalText.slice(0, 200),
      originalIntent,
      correctIntent,
      count: 1,
      lastUsed: Date.now(),
    });
  }
  
  saveCorrections();

  // 🍕 IMMEDIATE IMPACT: Inject correction into active working memory facts
  addMemoryFacts(
    [`[Correction] O usuário corrigiu o intent de "${originalIntent}" para "${correctIntent}" para o input: "${originalText}"`],
    "fact",
    "system",
    1.0 // Maximum priority
  );

  console.log(`[IntentFeedback] Recorded: "${originalText}" → ${correctIntent} (was ${originalIntent})`);
}

/**
 * Check if there's a learned correction for this text.
 * Returns the correct intent if found, null otherwise.
 */
export function getLearnedCorrection(text: string): IntentCorrection | null {
  const corrections = loadCorrections();
  const key = normalize(text);
  
  // Exact match
  const exact = corrections.get(key);
  if (exact) return exact;
  
  // Fuzzy match: find corrections with similar text (>80% overlap)
  for (const [, correction] of corrections) {
    if (fuzzyMatch(key, normalize(correction.originalText)) > 0.8) {
      return correction;
    }
  }
  
  return null;
}

/**
 * Get all learned corrections (for debug/display)
 */
export function getAllCorrections(): IntentCorrection[] {
  const corrections = loadCorrections();
  return [...corrections.values()].sort((a, b) => b.lastUsed - a.lastUsed);
}

/**
 * Clear all learned corrections
 */
export function clearCorrections(): void {
  _corrections = new Map();
  if (typeof window === "undefined") return;
  _corrections = new Map();
  if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY);
}

const NEGATIVE_FEEDBACK_RE = /(?:n[ãa]o\s+(?:era\s+)?isso|errad[oa]|n[ãa]o\s+(?:foi\s+)?(?:isso|o\s+que)|n[ãa]o\s+(?:é|eh)\s+(?:isso|o\s+que)|eu\s+(?:disse|falei|quis|queria)\s+|corrig[ae]|(?:t[áa]|ta|est[áa])\s+errad|wrong|not\s+(?:that|what|right))/i;

/**
 * Detect if user is giving negative feedback about the last classification
 */
export function isNegativeFeedback(text: string): boolean {
  return NEGATIVE_FEEDBACK_RE.test(text.trim());
}

const CORRECTION_TARGET_RE = /(?:(?:(?:eu\s+)?(?:quis|queria|quero)\s+(?:dizer\s+)?)|(?:(?:era\s+pra|deveria)\s+)|(?:(?:na\s+verdade|na\s+real)\s*,?\s*)|(?:(?:eu\s+)?(?:disse|falei)\s+))(.+)/i;

/**
 * Extract what the user actually wanted from their correction text
 * e.g. "não era isso, eu queria abrir o youtube" → "abrir o youtube"
 */
export function extractCorrectionTarget(text: string): string | null {
  if (CORRECTION_TARGET_RE.test(text)) {
    const m = text.match(CORRECTION_TARGET_RE);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

// Simple character-level similarity
function fuzzyMatch(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length === 0 || b.length === 0) return 0;
  
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  
  let matches = 0;
  const words1 = getTokensEfficiently(longer);
  const words2 = getTokensEfficiently(shorter);

  for (const w of words2) {
    if (words1.has(w)) matches++;
  }
  
  return matches / Math.max(words1.size, words2.size);
}
