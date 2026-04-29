/**
 * ═══════════════════════════════════════════════════════════════
 *  ORION WORKING MEMORY — Short-Term Prioritized Context
 * ═══════════════════════════════════════════════════════════════
 * 
 * Implements a cognitive working memory buffer inspired by Baddeley's
 * model: a limited-capacity store with contextual priority ranking.
 * 
 * Features:
 * - Priority queue with decay (recent + relevant = highest priority)
 * - Interrupt detection & suppression (prevents loops like "música pausada")
 * - Contextual relevance scoring against current conversation topic
 * - Automatic promotion of working memory to long-term (orion-memory.ts)
 * - Phonological loop simulation (tracks last N utterances for coherence)
 */

// ─── Types ───
export interface WorkingMemoryItem {
  id: string;
  content: string;
  type: "user_intent" | "ai_response" | "system_event" | "tool_result" | "context_anchor";
  priority: number; // 0-1, decays over time
  relevance: number; // 0-1, contextual relevance to current topic
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface InterruptRecord {
  pattern: string;
  count: number;
  firstSeen: number;
  lastSeen: number;
  suppressed: boolean;
}

export interface WorkingMemoryState {
  items: WorkingMemoryItem[];
  currentTopic: string | null;
  topicKeywords: string[];
  interrupts: InterruptRecord[];
  phonologicalBuffer: string[]; // Last N raw utterances
  centralExecutiveLoad: number; // 0-1 cognitive load estimate
}

// ─── Constants ───
const WM_CAPACITY = 12; // ~7±2 chunks, extended for AI
const PHONOLOGICAL_BUFFER_SIZE = 5;
const INTERRUPT_THRESHOLD = 3; // Suppress after 3 repeats in 30s
const INTERRUPT_WINDOW_MS = 30_000;
const DECAY_RATE = 0.02; // Priority decay per second
const MIN_PRIORITY = 0.05;
const WM_STORAGE_KEY = "orion_working_memory";

// ─── State ───
let wmState: WorkingMemoryState = {
  items: [],
  currentTopic: null,
  topicKeywords: [],
  interrupts: [],
  phonologicalBuffer: [],
  centralExecutiveLoad: 0,
};

// ─── Initialization ───
export function initWorkingMemory(): void {
  try {
    const stored = localStorage.getItem(WM_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as WorkingMemoryState;
      // Only restore if recent (< 10 min)
      const newest = parsed.items.reduce((max, i) => Math.max(max, i.timestamp), 0);
      if (Date.now() - newest < 10 * 60 * 1000) {
        wmState = parsed;
        applyDecay();
        return;
      }
    }
  } catch { /* fresh start */ }
  
  wmState = {
    items: [],
    currentTopic: null,
    topicKeywords: [],
    interrupts: [],
    phonologicalBuffer: [],
    centralExecutiveLoad: 0,
  };
}

// ─── Core Operations ───

/** Push an item into working memory with priority ranking */
export function pushToWorkingMemory(
  content: string,
  type: WorkingMemoryItem["type"],
  priority: number = 0.7,
  metadata?: Record<string, unknown>
): WorkingMemoryItem | null {
  // Check for interrupt patterns
  if (type === "system_event" && isInterrupt(content)) {
    console.log("[WM] Suppressed interrupt:", content.slice(0, 50));
    return null;
  }

  const item: WorkingMemoryItem = {
    id: crypto.randomUUID(),
    content,
    type,
    priority: Math.min(1, priority),
    relevance: computeRelevance(content),
    timestamp: Date.now(),
    metadata,
  };

  // User intents always get high priority
  if (type === "user_intent") {
    item.priority = Math.max(item.priority, 0.85);
    updateTopic(content);
  }

  // Add to phonological buffer
  if (type === "user_intent" || type === "ai_response") {
    wmState.phonologicalBuffer.push(content.slice(0, 200));
    if (wmState.phonologicalBuffer.length > PHONOLOGICAL_BUFFER_SIZE) {
      wmState.phonologicalBuffer.shift();
    }
  }

  wmState.items.push(item);
  
  // Apply decay to existing items
  applyDecay();
  
  // Evict lowest-priority items if over capacity
  if (wmState.items.length > WM_CAPACITY) {
    wmState.items.sort((a, b) => effectivePriority(b) - effectivePriority(a));
    wmState.items = wmState.items.slice(0, WM_CAPACITY);
  }

  // Update cognitive load
  wmState.centralExecutiveLoad = Math.min(1, wmState.items.length / WM_CAPACITY);

  persist();
  return item;
}

/** Get the top-N most relevant items for the current context */
export function getWorkingMemoryContext(maxItems: number = 6): WorkingMemoryItem[] {
  applyDecay();
  
  return [...wmState.items]
    .sort((a, b) => effectivePriority(b) - effectivePriority(a))
    .slice(0, maxItems);
}

/** Build a formatted context string for the AI prompt */
export function buildWorkingMemoryPrompt(): string {
  const items = getWorkingMemoryContext(6);
  if (items.length === 0) return "";

  const parts: string[] = ["[MEMÓRIA DE TRABALHO ATIVA]"];
  
  if (wmState.currentTopic) {
    parts.push(`Tópico atual: ${wmState.currentTopic}`);
  }

  const grouped = {
    user_intent: items.filter(i => i.type === "user_intent"),
    context_anchor: items.filter(i => i.type === "context_anchor"),
    tool_result: items.filter(i => i.type === "tool_result"),
    ai_response: items.filter(i => i.type === "ai_response"),
    system_event: items.filter(i => i.type === "system_event"),
  };

  if (grouped.user_intent.length > 0) {
    parts.push(`Intenções recentes do usuário:`);
    grouped.user_intent.forEach(i => parts.push(`  • ${i.content.slice(0, 150)}`));
  }

  if (grouped.context_anchor.length > 0) {
    parts.push(`Contexto fixado:`);
    grouped.context_anchor.forEach(i => parts.push(`  • ${i.content.slice(0, 150)}`));
  }

  if (grouped.tool_result.length > 0) {
    parts.push(`Resultados recentes:`);
    grouped.tool_result.forEach(i => parts.push(`  • ${i.content.slice(0, 120)}`));
  }

  // Cognitive load indicator
  if (wmState.centralExecutiveLoad > 0.7) {
    parts.push(`⚠️ Carga cognitiva alta (${Math.round(wmState.centralExecutiveLoad * 100)}%) — priorize a solicitação mais recente do usuário`);
  }

  return parts.join("\n");
}

/** Pin a context anchor (e.g., "user prefers Portuguese music only") */
export function pinContext(content: string, metadata?: Record<string, unknown>): void {
  pushToWorkingMemory(content, "context_anchor", 0.95, metadata);
}

/** Clear all working memory */
export function clearWorkingMemory(): void {
  wmState = {
    items: [],
    currentTopic: null,
    topicKeywords: [],
    interrupts: [],
    phonologicalBuffer: [],
    centralExecutiveLoad: 0,
  };
  persist();
}

/** Get current cognitive load (0-1) */
export function getCognitiveLoad(): number {
  return wmState.centralExecutiveLoad;
}

/** Get suppressed interrupt count */
export function getSuppressedInterrupts(): InterruptRecord[] {
  return wmState.interrupts.filter(i => i.suppressed);
}

/** Get the phonological buffer (recent utterances) */
export function getPhonologicalBuffer(): string[] {
  return [...wmState.phonologicalBuffer];
}

/** Get full state snapshot for diagnostics */
export function getWorkingMemorySnapshot(): WorkingMemoryState {
  applyDecay();
  return { ...wmState, items: [...wmState.items] };
}

// ─── Internal: Priority & Relevance ───

function effectivePriority(item: WorkingMemoryItem): number {
  const ageSec = (Date.now() - item.timestamp) / 1000;
  const decayed = item.priority - (ageSec * DECAY_RATE);
  // Relevance boosts effective priority
  const boosted = decayed * (0.6 + 0.4 * item.relevance);
  // Type bonuses
  const typeBonus = item.type === "user_intent" ? 0.15 
    : item.type === "context_anchor" ? 0.1 
    : 0;
  return Math.max(MIN_PRIORITY, boosted + typeBonus);
}

function applyDecay(): void {
  const now = Date.now();
  wmState.items = wmState.items.filter(item => {
    const ageSec = (now - item.timestamp) / 1000;
    const decayed = item.priority - (ageSec * DECAY_RATE);
    // Context anchors decay much slower
    if (item.type === "context_anchor") {
      return (item.priority - (ageSec * DECAY_RATE * 0.1)) > MIN_PRIORITY;
    }
    return decayed > MIN_PRIORITY;
  });
}

function computeRelevance(content: string): number {
  if (wmState.topicKeywords.length === 0) return 0.5;
  
  const words = new Set(content.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  const overlap = wmState.topicKeywords.filter(kw => words.has(kw)).length;
  return Math.min(1, overlap / Math.max(1, wmState.topicKeywords.length) + 0.2);
}

function updateTopic(userInput: string): void {
  // Extract significant words as topic keywords
  const stopWords = new Set([
    "que", "como", "para", "com", "por", "uma", "dos", "das", "não", "sim",
    "mas", "isso", "esse", "esta", "este", "pode", "tem", "ser", "ter",
    "the", "and", "for", "with", "you", "are", "was", "can", "has",
    "mais", "muito", "bem", "aqui", "agora", "então", "porque",
  ]);
  
  const words = userInput.toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w))
    .slice(0, 8);
  
  wmState.topicKeywords = words;
  wmState.currentTopic = userInput.slice(0, 80);
}

// ─── Internal: Interrupt Detection ───

function isInterrupt(content: string): boolean {
  const normalized = content.toLowerCase().trim().slice(0, 100);
  const now = Date.now();
  
  // Clean old interrupt records
  wmState.interrupts = wmState.interrupts.filter(
    ir => now - ir.lastSeen < INTERRUPT_WINDOW_MS * 2
  );
  
  // Check existing patterns
  const existing = wmState.interrupts.find(ir => {
    // Fuzzy match: same first 30 chars or >70% word overlap
    return ir.pattern === normalized.slice(0, 30) || 
      wordOverlapRatio(ir.pattern, normalized) > 0.7;
  });
  
  if (existing) {
    existing.count++;
    existing.lastSeen = now;
    
    if (existing.count >= INTERRUPT_THRESHOLD && 
        (now - existing.firstSeen) < INTERRUPT_WINDOW_MS) {
      existing.suppressed = true;
      return true;
    }
    return existing.suppressed; // Stay suppressed once flagged
  }
  
  // Register new pattern
  wmState.interrupts.push({
    pattern: normalized.slice(0, 30),
    count: 1,
    firstSeen: now,
    lastSeen: now,
    suppressed: false,
  });
  
  return false;
}

/**
 * Optimized word overlap ratio using Sets.
 * PERF: Uses a loop-based intersection count over the smaller Set to eliminate
 * O(N) array spreads and redundant filters in the interrupt detection path.
 */
function wordOverlapRatio(a: string, b: string): number {
  const setA = new Set(a.split(/\s+/).filter(w => w.length > 2));
  const setB = new Set(b.split(/\s+/).filter(w => w.length > 2));
  const sizeA = setA.size;
  const sizeB = setB.size;
  if (sizeA === 0 || sizeB === 0) return 0;

  let intersection = 0;
  const smaller = sizeA <= sizeB ? setA : setB;
  const larger = sizeA <= sizeB ? setB : setA;

  for (const x of smaller) {
    if (larger.has(x)) intersection++;
  }

  return intersection / Math.min(sizeA, sizeB);
}

// ─── Persistence ───

function persist(): void {
  try {
    localStorage.setItem(WM_STORAGE_KEY, JSON.stringify(wmState));
  } catch { /* silent */ }
}
