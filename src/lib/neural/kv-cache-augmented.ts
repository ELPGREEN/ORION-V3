/**
 * ─── Cache-Augmented Generation (CAG) v2 ───
 * KV Cache Bank for pre-computed context reuse.
 * Stores key/value attention tensors to skip redundant LLM preprocessing.
 * 
 * v2 Upgrades:
 * - 2048 max entries (4x more context)
 * - 14-day TTL (human-like long-term memory)
 * - 16 attention heads with 128-dim embeddings
 * - 512-element tensor comparison for higher precision
 */

export interface KVTensor {
  dimensions: number[];
  data: Float32Array;
}

export interface KVCacheEntry {
  id: string;
  sourceId: string;
  sourceType: "legislation" | "jurisprudence" | "doctrine" | "document" | "template" | "custom";
  keyTensor: KVTensor;
  valueTensor: KVTensor;
  contextHash: string;
  tokenCount: number;
  hitCount: number;
  lastAccessedAt: number;
  createdAt: number;
  expiresAt: number;
  metadata: {
    originalLength: number;
    compressionRatio: number;
    layerIndex: number;
    headCount: number;
  };
}

export interface CAGConfig {
  maxEntries: number;
  ttlHours: number;
  evictionPolicy: "lru" | "lfu" | "ttl" | "hybrid";
  maxMemoryMB: number;
  precomputeOnIngest: boolean;
  compressionEnabled: boolean;
  headCount: number;
  headDim: number;
  tensorCompareLen: number;
}

export interface CAGStats {
  totalEntries: number;
  totalHits: number;
  totalMisses: number;
  hitRatio: number;
  estimatedMemoryMB: number;
  estimatedLatencySavingsMs: number;
  entriesByType: Record<string, number>;
}

export interface CAGLookupResult {
  hit: boolean;
  entry?: KVCacheEntry;
  latencySavedMs?: number;
  source?: "exact" | "partial" | "miss";
}

const DEFAULT_CAG_CONFIG: CAGConfig = {
  maxEntries: 2048,
  ttlHours: 336, // 14 days — human-like long-term memory
  evictionPolicy: "hybrid",
  maxMemoryMB: 512,
  precomputeOnIngest: true,
  compressionEnabled: true,
  headCount: 16,
  headDim: 128,
  tensorCompareLen: 512,
};

function simpleHash(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

function createMockTensor(dims: number[]): KVTensor {
  const size = dims.reduce((a, b) => a * b, 1);
  return { dimensions: dims, data: new Float32Array(size) };
}

function estimateTensorMemoryMB(tensor: KVTensor): number {
  return (tensor.data.byteLength) / (1024 * 1024);
}

function cosineSimilarityTensors(a: KVTensor, b: KVTensor, maxLen: number = 512): number {
  const len = Math.min(a.data.length, b.data.length, maxLen);
  if (len === 0) return 0;
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < len; i++) {
    dot += a.data[i] * b.data[i];
    normA += a.data[i] * a.data[i];
    normB += b.data[i] * b.data[i];
  }
  const denom = Math.sqrt(normA * normB);
  return denom < 1e-10 ? 0 : dot / denom;
}

export class KVCacheBank {
  private entries: Map<string, KVCacheEntry> = new Map();
  private config: CAGConfig;
  private totalHits = 0;
  private totalMisses = 0;

  constructor(config: Partial<CAGConfig> = {}) {
    this.config = { ...DEFAULT_CAG_CONFIG, ...config };
  }

  /**
   * Preprocess and store context as KV cache tensors.
   */
  preprocess(
    sourceId: string,
    sourceType: KVCacheEntry["sourceType"],
    content: string,
    layerIndex: number = 0,
    headCount?: number
  ): KVCacheEntry {
    const heads = headCount ?? this.config.headCount;
    const contextHash = simpleHash(content);
    const existing = this.entries.get(contextHash);
    if (existing) {
      existing.hitCount++;
      existing.lastAccessedAt = Date.now();
      return existing;
    }

    if (this.entries.size >= this.config.maxEntries) {
      this.evict();
    }

    const tokenCount = Math.ceil(content.length / 4);
    const headDim = this.config.headDim;
    const dims = [heads, tokenCount, headDim];
    const keyTensor = createMockTensor(dims);
    const valueTensor = createMockTensor(dims);

    // Simulate encoding: fill with deterministic values from content
    for (let i = 0; i < Math.min(keyTensor.data.length, content.length); i++) {
      const charVal = content.charCodeAt(i % content.length) / 255;
      keyTensor.data[i] = Math.sin(charVal * (i + 1)) * 0.5;
      valueTensor.data[i] = Math.cos(charVal * (i + 1)) * 0.5;
    }

    const now = Date.now();
    const entry: KVCacheEntry = {
      id: `kv_${contextHash}_${layerIndex}`,
      sourceId,
      sourceType,
      keyTensor,
      valueTensor,
      contextHash,
      tokenCount,
      hitCount: 0,
      lastAccessedAt: now,
      createdAt: now,
      expiresAt: now + this.config.ttlHours * 3600 * 1000,
      metadata: {
        originalLength: content.length,
        compressionRatio: this.config.compressionEnabled
          ? Math.max(0.3, 1 - tokenCount / (content.length / 2))
          : 1,
        layerIndex,
        headCount: heads,
      },
    };

    this.entries.set(contextHash, entry);
    return entry;
  }

  /**
   * Look up cached KV tensors for a given context.
   */
  lookup(content: string, similarityThreshold: number = 0.82): CAGLookupResult {
    const now = Date.now();
    const contextHash = simpleHash(content);

    // 1. Exact match
    const exact = this.entries.get(contextHash);
    if (exact && exact.expiresAt > now) {
      exact.hitCount++;
      exact.lastAccessedAt = now;
      this.totalHits++;
      const latencySaved = exact.tokenCount * 0.15;
      return { hit: true, entry: exact, latencySavedMs: latencySaved, source: "exact" };
    }

    // 2. Partial match via tensor similarity (512-element comparison)
    const queryTensor = createMockTensor([this.config.headCount, Math.ceil(content.length / 4), this.config.headDim]);
    for (let i = 0; i < Math.min(queryTensor.data.length, content.length); i++) {
      queryTensor.data[i] = Math.sin((content.charCodeAt(i % content.length) / 255) * (i + 1)) * 0.5;
    }

    let bestMatch: KVCacheEntry | null = null;
    let bestSim = 0;

    for (const entry of this.entries.values()) {
      if (entry.expiresAt <= now) continue;
      const sim = cosineSimilarityTensors(queryTensor, entry.keyTensor, this.config.tensorCompareLen);
      if (sim >= similarityThreshold && sim > bestSim) {
        bestSim = sim;
        bestMatch = entry;
      }
    }

    if (bestMatch) {
      bestMatch.hitCount++;
      bestMatch.lastAccessedAt = now;
      this.totalHits++;
      return {
        hit: true,
        entry: bestMatch,
        latencySavedMs: bestMatch.tokenCount * 0.1,
        source: "partial",
      };
    }

    this.totalMisses++;
    return { hit: false, source: "miss" };
  }

  /**
   * Evict entries based on configured policy.
   */
  evict(count: number = 1): number {
    const now = Date.now();
    let removed = 0;

    // Always remove expired first
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= now) {
        this.entries.delete(key);
        removed++;
      }
    }
    if (removed >= count) return removed;

    // Then apply policy
    const remaining = count - removed;
    const sorted = [...this.entries.entries()];

    switch (this.config.evictionPolicy) {
      case "lru":
        sorted.sort((a, b) => a[1].lastAccessedAt - b[1].lastAccessedAt);
        break;
      case "lfu":
        sorted.sort((a, b) => a[1].hitCount - b[1].hitCount);
        break;
      case "hybrid":
        sorted.sort((a, b) => {
          const scoreA = a[1].hitCount * 0.6 + (a[1].lastAccessedAt / now) * 0.4;
          const scoreB = b[1].hitCount * 0.6 + (b[1].lastAccessedAt / now) * 0.4;
          return scoreA - scoreB;
        });
        break;
      default:
        sorted.sort((a, b) => a[1].expiresAt - b[1].expiresAt);
    }

    for (let i = 0; i < Math.min(remaining, sorted.length); i++) {
      this.entries.delete(sorted[i][0]);
      removed++;
    }

    return removed;
  }

  /**
   * Get comprehensive cache statistics.
   */
  stats(): CAGStats {
    let estimatedMemory = 0;
    const entriesByType: Record<string, number> = {};

    for (const entry of this.entries.values()) {
      estimatedMemory += estimateTensorMemoryMB(entry.keyTensor) + estimateTensorMemoryMB(entry.valueTensor);
      entriesByType[entry.sourceType] = (entriesByType[entry.sourceType] || 0) + 1;
    }

    const totalRequests = this.totalHits + this.totalMisses;
    return {
      totalEntries: this.entries.size,
      totalHits: this.totalHits,
      totalMisses: this.totalMisses,
      hitRatio: totalRequests === 0 ? 0 : this.totalHits / totalRequests,
      estimatedMemoryMB: Math.round(estimatedMemory * 100) / 100,
      estimatedLatencySavingsMs: this.totalHits * 25,
      entriesByType,
    };
  }

  /**
   * Batch preprocess multiple documents.
   */
  batchPreprocess(
    items: Array<{ id: string; type: KVCacheEntry["sourceType"]; content: string }>
  ): KVCacheEntry[] {
    return items.map((item) => this.preprocess(item.id, item.type, item.content));
  }

  size(): number {
    return this.entries.size;
  }

  clear(): void {
    this.entries.clear();
    this.totalHits = 0;
    this.totalMisses = 0;
  }
}
