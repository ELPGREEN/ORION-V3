/**
 * TTS Cache — Two-tier (memory + IndexedDB) cache for short Gemini TTS outputs.
 *
 * Goal: cut perceived latency for short Orion phrases (≤120 chars) from
 * ~600-900ms (network + synth) to ~5-30ms (lookup + decode).
 *
 * Strategy:
 *   1. Compute deterministic key from { text, voice, lang, stylePrompt }.
 *   2. Check in-memory Map (instant).
 *   3. Fallback to IndexedDB (persists across reloads).
 *   4. On store, write to BOTH layers.
 *
 * Only short phrases are cached — long answers vary too much to be worth it.
 */

const DB_NAME = "orion-tts-cache";
const STORE = "audio";
const DB_VERSION = 1;
const MAX_CACHEABLE_CHARS = 120;
const MEM_LIMIT = 200;
const IDB_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface CachedEntry {
  key: string;
  blob: Blob;
  storedAt: number;
}

const memCache = new Map<string, Blob>();
let dbPromise: Promise<IDBDatabase | null> | null = null;

async function fnv1a(input: string): Promise<string> {
  // Use SubtleCrypto when available — collision-safe & fast
  if (typeof crypto !== "undefined" && crypto.subtle) {
    const data = new TextEncoder().encode(input);
    const hash = await crypto.subtle.digest("SHA-1", data);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Fallback: simple FNV-1a
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

export async function buildTTSKey(
  text: string,
  voice: string,
  lang?: string,
  stylePrompt?: string,
): Promise<string> {
  const norm = text.trim().toLowerCase().replace(/\s+/g, " ");
  return fnv1a(`${voice}|${lang || ""}|${stylePrompt || ""}|${norm}`);
}

export function isCacheable(text: string): boolean {
  const t = text.trim();
  return t.length > 0 && t.length <= MAX_CACHEABLE_CHARS;
}

function openDB(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "key" });
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => {
        console.warn("[TTS Cache] IndexedDB open failed");
        resolve(null);
      };
    } catch {
      resolve(null);
    }
  });
  return dbPromise;
}

export async function getCachedTTS(key: string): Promise<Blob | null> {
  // Layer 1: memory
  const mem = memCache.get(key);
  if (mem) return mem;

  // Layer 2: IndexedDB
  const db = await openDB();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(key);
      req.onsuccess = () => {
        const entry = req.result as CachedEntry | undefined;
        if (!entry) return resolve(null);
        if (Date.now() - entry.storedAt > IDB_TTL_MS) {
          // Stale — best-effort delete, return null
          deleteCachedTTS(key).catch(() => {});
          return resolve(null);
        }
        // Promote to mem
        memCache.set(key, entry.blob);
        resolve(entry.blob);
      };
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function setCachedTTS(key: string, blob: Blob): Promise<void> {
  // LRU-ish: trim oldest if over limit
  if (memCache.size >= MEM_LIMIT) {
    const firstKey = memCache.keys().next().value;
    if (firstKey) memCache.delete(firstKey);
  }
  memCache.set(key, blob);

  const db = await openDB();
  if (!db) return;
  try {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ key, blob, storedAt: Date.now() } satisfies CachedEntry);
  } catch {}
}

async function deleteCachedTTS(key: string): Promise<void> {
  memCache.delete(key);
  const db = await openDB();
  if (!db) return;
  try {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
  } catch {}
}

/** Stats for debugging / dashboards */
export function getTTSCacheStats() {
  return { memEntries: memCache.size, memLimit: MEM_LIMIT, maxChars: MAX_CACHEABLE_CHARS };
}
