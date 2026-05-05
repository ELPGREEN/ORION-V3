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
  lastIntent?: string;
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
  if (typeof window === "undefined") return [];
  try {
    const raw = (typeof window !== "undefined" ? localStorage.getItem : () => null).bind(typeof window !== "undefined" ? localStorage : {})( MEMORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    // Migrate old format (string[]) to new format
    if (Array.isArray(parsed) && typeof parsed[0] === "string") {
      return parsed.map((f: string) => ({
        fact: f,
        category: "fact",
        confidence: 0.7,
        timestamp: Date.now(),
        source: "system",
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

/** Optimized tokenization: avoids intermediate array creation and uses non-capturing split */
const TOKEN_SPLIT_RE = /\s+/;

function getTokens(text: string): Set<string> {
  const tokens = new Set<string>();
  const words = text.toLowerCase().split(TOKEN_SPLIT_RE);
  for (let i = 0; i < words.length; i++) {
    const w = words[i];
    if (w.length > 2) {
      tokens.add(w);
    }
  }
  return tokens;
}

/**
 * Module-level cache for tokens to avoid O(N^2) processing in high-frequency loops.
 */
const _tokenCache = new Map<string, Set<string>>();

function getCachedTokens(text: string): Set<string> {
  let tokens = _tokenCache.get(text);
  if (!tokens) {
    tokens = getTokens(text);
    _tokenCache.set(text, tokens);
    if (_tokenCache.size > 500) {
      const keys = _tokenCache.keys();
      for (let i = 0; i < 50; i++) {
        const k = keys.next().value;
        if (k !== undefined) _tokenCache.delete(k);
      }
    }
  }
  return tokens;
}

function wordOverlap(setA: Set<string>, setB: Set<string>): number {
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection++;
  }
  return intersection / Math.min(setA.size, setB.size);
}

const VISUAL_KEYWORDS = /\b(?:aparência|vestindo|usando|óculos|camisa|suéter|barba|cabelo|roupa|camiseta|cortina|ambiente|mesa|cadeira|fundo|iluminação|wearing|glasses|shirt|hair|beard|background|lighting)\b/i;

function isVisualObservation(fact: string): boolean {
  return VISUAL_KEYWORDS.test(fact);
}

function compactVisualMemories(mem: MemoryEntry[]): MemoryEntry[] {
  const visual = mem.filter(m => isVisualObservation(m.fact));
  if (visual.length <= MAX_VISUAL_OBSERVATIONS) return mem;
  
  // Keep only most recent visual observations
  const nonVisual = mem.filter(m => !isVisualObservation(m.fact));
  const recentVisual = visual
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, MAX_VISUAL_OBSERVATIONS);

  return [...nonVisual, ...recentVisual];
}

const SPECULATIVE_PATTERNS = /\b(?:parece\s+prefer|pode\s+indicar|possivelmente|provavelmente\s+gosta|aparentemente\s+prefer|sugere\s+que|talvez\s+(?:goste|prefira|seja)|pode\s+ser\s+que|indica\s+que\s+talvez|é\s+possível\s+que)\b/i;

function isSpeculativeContent(fact: string): boolean {
  return SPECULATIVE_PATTERNS.test(fact.toLowerCase());
}

function sanitizeIdentityClaim(fact: string): string {
  // If user says "meu nome é X", ensure we store it clearly
  if (/meu\s+nome\s+[eé]\s+/i.test(fact)) {
    return fact.replace(/meu\s+nome\s+[eé]\s+/i, "O nome do usuário é ");
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
  
  // PERF: Use cached tokens to avoid redundant processing
  const memCache = mem.map(m => {
    const low = m.fact.toLowerCase();
    return { low, tokens: getCachedTokens(low) };
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
    const fTokens = getCachedTokens(fLow);
    
    // Enhanced deduplication: exact, substring, or word overlap
    const overlapThreshold = isVisualObservation(f) ? 0.55 : 0.7;
    const existingIdx = mem.findIndex((m, i) => {
      const cached = memCache[i];
      return cached.low === fLow || cached.low.includes(fLow) || fLow.includes(cached.low) || wordOverlap(cached.tokens, fTokens) > overlapThreshold;
    });
    
    if (existingIdx !== -1) {
      mem[existingIdx].confidence = Math.min(1, mem[existingIdx].confidence + 0.1);
      mem[existingIdx].timestamp = now;
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
  if (typeof window !== "undefined") {
    if (typeof window !== "undefined") localStorage.setItem(MEMORY_KEY, JSON.stringify(trimmed));
  }
  return trimmed;
}

// ─── Session State (persistent across reloads) ───
export function getSessionState(): SessionState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = (typeof window !== "undefined" ? localStorage.getItem : () => null).bind(typeof window !== "undefined" ? localStorage : {})( SESSION_KEY);
    if (!raw) return null;
    const state: SessionState = JSON.parse(raw);
    // Check if session is expired
    if (Date.now() - state.lastActive > SESSION_EXPIRY_MS) {
      if (typeof window !== "undefined") localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return state;
  } catch {
    return null;
  }
}

export function saveSessionState(state: Partial<SessionState>): void {
  if (typeof window === "undefined") return;
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
  
  if (typeof window !== "undefined") localStorage.setItem(SESSION_KEY, JSON.stringify(updated));
}

export function clearSession(): void {
  if (typeof window !== "undefined") {
    if (typeof window !== "undefined") localStorage.removeItem(SESSION_KEY);
  }
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

  // Relational context
  const relationalCtx = buildRelationalContext(memories);
  if (relationalCtx) parts.push(relationalCtx);

  return parts.length > 0 ? parts.join("\n\n") : "";
}

// Re-export working memory init for app bootstrap
export { initWorkingMemory } from "./orion-working-memory";


// ─── Last Intent Persistence ───
export function setLastIntent(intent: string): void {
  saveSessionState({ lastIntent: intent });
}

export function getLastIntent(): string | undefined {
  return getSessionState()?.lastIntent;
}

// ─── Relational Memory (Mem0-inspired) ───

export interface MemoryRelation {
  from: string;
  to: string;
  type: "related_to" | "contradicts" | "refines" | "caused_by";
  strength: number;
}

/**
 * Finds relationships between memory entries based on token overlap
 * and semantic patterns.
 */
export function discoverRelationships(memories: MemoryEntry[]): MemoryRelation[] {
  const relations: MemoryRelation[] = [];
  const tokenCache = memories.map(m => getCachedTokens(m.fact));

  for (let i = 0; i < memories.length; i++) {
    for (let j = i + 1; j < memories.length; j++) {
      const overlap = wordOverlap(tokenCache[i], tokenCache[j]);

      if (overlap > 0.4) {
        relations.push({
          from: memories[i].fact,
          to: memories[j].fact,
          type: "related_to",
          strength: overlap,
        });
      }
    }
  }
  return relations;
}

/**
 * Enhanced context builder that includes discovered relationships.
 */
export function buildRelationalContext(memories: MemoryEntry[]): string {
  const relations = discoverRelationships(memories);
  if (relations.length === 0) return "";

  const topRelations = relations
    .sort((a, b) => b.strength - a.strength)
    .slice(0, 5);

  const parts = topRelations.map(r =>
    `• "${r.from}" parece estar relacionado a "${r.to}"`
  );

  return `[RELAÇÕES DE MEMÓRIA — Conexões Detectadas]\n${parts.join("\n")}`;
}
