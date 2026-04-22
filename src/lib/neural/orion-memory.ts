/**
 * ─── Orion Persistent Memory System ───
 * Dual-layer memory: localStorage (fast) + Supabase (persistent across sessions).
 * 
 * Features:
 * - Session memory persisted to Supabase on interaction
 * - Conversation history restored on mount
 * - Automatic summarization of long conversations
 * - Memory deduplication with semantic similarity
 * - Priority-based memory (facts vs preferences vs context)
 */

import { supabase } from "@/integrations/supabase/client";
import { buildWorkingMemoryPrompt, initWorkingMemory } from "./orion-working-memory";
import { buildEpisodicContext, searchEpisodes, type EpisodicSearchResult } from "./episodic-memory";
import { buildHealthContext } from "./system-health";
import { buildTracingContext } from "./orion-tracing";

// ─── Types ───
export interface MemoryEntry {
  fact: string;
  category: "preference" | "fact" | "context" | "identity" | "correction";
  confidence: number;
  timestamp: number;
  source: "voice" | "chat" | "vision" | "system";
}

export interface SessionState {
  chatHistory: Array<{ role: "user" | "ai" | "system"; text: string; time: string }>;
  lastActive: number;
  sessionId: string;
  conversationSummary: string | null;
  totalInteractions: number;
}

// ─── Constants ───
const MEMORY_KEY = "neural_user_memory";
const SESSION_KEY = "orion_session_state";
const MAX_LOCAL_MEMORIES = 80;
const MAX_CHAT_HISTORY = 30;
const SUMMARIZE_THRESHOLD = 20;
const SESSION_EXPIRY_MS = 4 * 60 * 60 * 1000;
const MAX_VISUAL_OBSERVATIONS = 8; // Cap visual/appearance observations

// ─── Local Memory (fast layer) ───
export function getLocalMemory(): MemoryEntry[] {
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Migrate old format (string[]) to new format
    if (Array.isArray(parsed) && typeof parsed[0] === "string") {
      return parsed.map((f: string) => ({
        fact: f,
        category: "fact" as const,
        confidence: 0.7,
        timestamp: Date.now(),
        source: "system" as const,
      }));
    }
    return parsed;
  } catch {
    return [];
  }
}

export function getMemoryFacts(): string[] {
  return getLocalMemory().map((m) => m.fact);
}

function getTokens(text: string): Set<string> {
  return new Set(text.toLowerCase().split(/\s+/).filter(w => w.length > 2));
}

function wordOverlap(setA: Set<string>, setB: Set<string>): number {
  const sizeA = setA.size;
  const sizeB = setB.size;
  if (sizeA === 0 || sizeB === 0) return 0;

  let intersection = 0;
  const isALessOrEqual = sizeA <= sizeB;
  const smaller = isALessOrEqual ? setA : setB;
  const larger = isALessOrEqual ? setB : setA;

  for (const x of smaller) {
    if (larger.has(x)) intersection++;
  }

  return intersection / Math.min(sizeA, sizeB);
}

// Visual/appearance keywords for auto-categorization
const VISUAL_KEYWORDS = /\b(aparência|vestindo|usando|óculos|camisa|suéter|barba|cabelo|roupa|camiseta|cortina|ambiente|mesa|cadeira|fundo|iluminação|wearing|glasses|shirt|hair|beard|background|lighting)\b/i;

function isVisualObservation(fact: string): boolean {
  return VISUAL_KEYWORDS.test(fact);
}

/** Compact redundant visual observations, keeping only the most recent */
function compactVisualMemories(mem: MemoryEntry[]): MemoryEntry[] {
  const visualEntries = mem.filter(m => isVisualObservation(m.fact));
  if (visualEntries.length <= MAX_VISUAL_OBSERVATIONS) return mem;
  
  // Sort visual entries by timestamp desc, keep newest
  visualEntries.sort((a, b) => b.timestamp - a.timestamp);
  const keep = new Set(visualEntries.slice(0, MAX_VISUAL_OBSERVATIONS));
  const discard = new Set(visualEntries.filter(v => !keep.has(v)));
  
  return mem.filter(m => !discard.has(m));
}

// ─── Speculative content filter ───
const SPECULATIVE_PATTERNS = /\b(parece\s+prefer|pode\s+indicar|possivelmente|provavelmente\s+gosta|aparentemente\s+prefer|sugere\s+que|talvez\s+(goste|prefira|seja)|pode\s+ser\s+que|indica\s+que\s+talvez|é\s+possível\s+que)\b/i;

function isSpeculativeContent(fact: string): boolean {
  return SPECULATIVE_PATTERNS.test(fact);
}

/** Sanitize identity claims — store as user declarations, not objective truths */
function sanitizeIdentityClaim(fact: string): string {
  const identityPatterns = [
    { pattern: /\b(eu\s+sou|meu\s+nome\s+é|me\s+chamo)\s+(.+)/i, replacement: (m: RegExpMatchArray) => `O usuário afirmou que é ${m[2].trim()}` },
    { pattern: /\b(sou\s+(teu|seu)\s+(criador|pai|dono|mestre))\b/i, replacement: (m: RegExpMatchArray) => `O usuário pediu para ser lembrado como ${m[1].trim()} do Orion` },
    { pattern: /\b(reconhe[cç][ae]\s+(minha\s+)?voz)\b/i, replacement: () => `O usuário solicitou reconhecimento de voz` },
  ];
  for (const { pattern, replacement } of identityPatterns) {
    const match = fact.match(pattern);
    if (match) return replacement(match);
  }
  return fact;
}

export function addMemoryFacts(
  facts: string[],
  category: MemoryEntry["category"] = "fact",
  source: MemoryEntry["source"] = "chat",
  confidence: number = 0.7
): MemoryEntry[] {
  const mem = getLocalMemory();
  const now = Date.now();
  
  // PERF: Pre-tokenize existing memories once to avoid O(N^2) string processing
  const memCache = mem.map(m => {
    const low = m.fact.toLowerCase();
    return { low, tokens: getTokens(low) };
  });

  for (let f of facts) {
    if (!f || f.length < 3) continue;
    
    // Block speculative inferences
    if (isSpeculativeContent(f)) {
      console.log("[Memory] Blocked speculative content:", f.slice(0, 60));
      continue;
    }
    
    // Sanitize identity claims
    f = sanitizeIdentityClaim(f);
    const fLow = f.toLowerCase();
    const fTokens = getTokens(fLow);
    
    // Enhanced deduplication: exact, substring, or word overlap
    // Visual observations use lower threshold (55%) to catch "wearing glasses" vs "has glasses" etc.
    const overlapThreshold = isVisualObservation(f) ? 0.55 : 0.7;
    const existingIdx = mem.findIndex((m, i) => {
      const cached = memCache[i];
      return cached.low === fLow || cached.low.includes(fLow) || fLow.includes(cached.low) || wordOverlap(cached.tokens, fTokens) > overlapThreshold;
    });
    
    if (existingIdx !== -1) {
      // Update existing memory confidence and timestamp
      mem[existingIdx].confidence = Math.min(1, mem[existingIdx].confidence + 0.1);
      mem[existingIdx].timestamp = now;
      // If correction, replace the fact
      if (category === "correction") {
        mem[existingIdx].fact = f;
        mem[existingIdx].category = "correction";
      }
    } else {
      const newEntry = { fact: f, category, confidence, timestamp: now, source };
      mem.push(newEntry);
      memCache.push({ low: fLow, tokens: fTokens });
    }
  }
  
  // Sort by confidence * recency, keep top N
  mem.sort((a, b) => {
    const recencyA = 1 - (now - a.timestamp) / (7 * 24 * 60 * 60 * 1000); // Decay over 7 days
    const recencyB = 1 - (now - b.timestamp) / (7 * 24 * 60 * 60 * 1000);
    return (b.confidence * Math.max(0.1, recencyB)) - (a.confidence * Math.max(0.1, recencyA));
  });
  
  // Compact visual observations before trimming
  const compacted = compactVisualMemories(mem);
  const trimmed = compacted.slice(0, MAX_LOCAL_MEMORIES);
  localStorage.setItem(MEMORY_KEY, JSON.stringify(trimmed));
  return trimmed;
}

// ─── Session State (persistent across reloads) ───
export function getSessionState(): SessionState | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const state: SessionState = JSON.parse(raw);
    // Check if session is expired
    if (Date.now() - state.lastActive > SESSION_EXPIRY_MS) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return state;
  } catch {
    return null;
  }
}

export function saveSessionState(state: Partial<SessionState>): void {
  const current = getSessionState() || {
    chatHistory: [],
    lastActive: Date.now(),
    sessionId: crypto.randomUUID(),
    conversationSummary: null,
    totalInteractions: 0,
  };
  
  const updated: SessionState = {
    ...current,
    ...state,
    lastActive: Date.now(),
  };
  
  // Trim chat history
  if (updated.chatHistory.length > MAX_CHAT_HISTORY) {
    updated.chatHistory = updated.chatHistory.slice(-MAX_CHAT_HISTORY);
  }
  
  localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
}

export function clearSession(): void {
  localStorage.removeItem(SESSION_KEY);
}

// ─── Supabase Persistence (cross-session memory) ───
export async function syncMemoryToSupabase(
  userId: string,
  memories: MemoryEntry[],
  sessionSummary?: string
): Promise<void> {
  try {
    // Save high-confidence memories as neural_learning_data
    const highConfidence = memories.filter((m) => m.confidence >= 0.6);
    if (highConfidence.length === 0) return;
    
    const entries = highConfidence.slice(0, 20).map((m) => ({
      user_id: userId,
      input_text: `[memory:${m.category}] ${m.fact}`,
      output_text: sessionSummary || "",
      interaction_type: "persistent_memory",
      quality_score: m.confidence,
      learned: true,
      metadata: {
        source: m.source,
        category: m.category,
        timestamp: new Date(m.timestamp).toISOString(),
      },
    }));
    
    await supabase.from("neural_learning_data").insert(entries);
  } catch (e) {
    console.warn("[Memory] Sync to Supabase failed:", e);
  }
}

export async function loadMemoryFromSupabase(userId: string): Promise<MemoryEntry[]> {
  try {
    const { data } = await supabase
      .from("neural_learning_data")
      .select("input_text, quality_score, metadata, created_at")
      .eq("user_id", userId)
      .eq("interaction_type", "persistent_memory")
      .eq("learned", true)
      .order("created_at", { ascending: false })
      .limit(50);
    
    if (!data || data.length === 0) return [];
    
    return data.map((row) => {
      const fact = (row.input_text || "").replace(/^\[memory:\w+\]\s*/, "");
      const meta = row.metadata as Record<string, any> | null;
      return {
        fact,
        category: (meta?.category || "fact") as MemoryEntry["category"],
        confidence: row.quality_score || 0.7,
        timestamp: new Date(meta?.timestamp || row.created_at).getTime(),
        source: (meta?.source || "system") as MemoryEntry["source"],
      };
    });
  } catch (e) {
    console.warn("[Memory] Load from Supabase failed:", e);
    return [];
  }
}

// ─── Conversation Summarizer ───
export function shouldSummarize(chatHistory: Array<{ role: string; text: string }>): boolean {
  return chatHistory.length >= SUMMARIZE_THRESHOLD;
}

export function buildSummaryPrompt(chatHistory: Array<{ role: string; text: string }>): string {
  const transcript = chatHistory
    .slice(0, -5) // Keep last 5 messages intact
    .map((m) => `${m.role === "user" ? "Usuário" : "Orion"}: ${m.text}`)
    .join("\n");
  
  return `Resuma esta conversa anterior em 2-3 frases concisas, destacando: temas discutidos, decisões tomadas e informações pessoais do usuário. Responda apenas com o resumo, sem prefixo.\n\nConversa:\n${transcript}`;
}

// ─── Memory-Aware Context Builder (Enhanced with Episodic + Health + Tracing) ───
export function buildMemoryContext(
  memories: MemoryEntry[],
  sessionState: SessionState | null,
  episodicResults?: EpisodicSearchResult[],
): string {
  const parts: string[] = [];
  
  // Persistent memories (organized by category)
  const byCategory = new Map<string, string[]>();
  for (const m of memories) {
    if (!byCategory.has(m.category)) byCategory.set(m.category, []);
    byCategory.get(m.category)!.push(m.fact);
  }
  
  if (byCategory.has("identity")) {
    parts.push(`[IDENTIDADE DO USUÁRIO]\n${byCategory.get("identity")!.join("\n")}`);
  }
  if (byCategory.has("preference")) {
    parts.push(`[PREFERÊNCIAS]\n${byCategory.get("preference")!.join("\n")}`);
  }
  if (byCategory.has("correction")) {
    parts.push(`[CORREÇÕES ANTERIORES]\n${byCategory.get("correction")!.join("\n")}`);
  }
  const facts = byCategory.get("fact") || [];
  if (facts.length > 0) {
    parts.push(`[FATOS CONHECIDOS]\n${facts.slice(0, 15).join("\n")}`);
  }
  
  // Session continuity
  if (sessionState?.conversationSummary) {
    parts.push(`[RESUMO DA SESSÃO ANTERIOR]\n${sessionState.conversationSummary}`);
  }
  if (sessionState?.totalInteractions) {
    parts.push(`[INTERAÇÕES NESTA SESSÃO] ${sessionState.totalInteractions}`);
  }
  
  // Working memory (short-term prioritized context)
  const wmPrompt = buildWorkingMemoryPrompt();
  if (wmPrompt) {
    parts.push(wmPrompt);
  }

  // Episodic memory (cross-session conversation recall)
  if (episodicResults && episodicResults.length > 0) {
    const episodicContext = buildEpisodicContext(episodicResults);
    if (episodicContext) parts.push(episodicContext);
  }

  // System health context (alerts, degraded mode)
  const healthCtx = buildHealthContext();
  if (healthCtx) parts.push(healthCtx);

  return parts.length > 0 ? parts.join("\n\n") : "";
}

// Re-export working memory init for app bootstrap
export { initWorkingMemory } from "./orion-working-memory";
