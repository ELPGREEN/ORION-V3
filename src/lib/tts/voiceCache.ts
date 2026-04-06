/**
 * Orion Voice Cache — IndexedDB cache for synthesized audio
 * Stores audio blobs locally to avoid repeated API calls.
 * Hash-based key from text content for instant retrieval.
 */

const DB_NAME = "orion-voice-cache";
const STORE_NAME = "audio";
const DB_VERSION = 1;
const MAX_CACHE_SIZE = 200; // max cached items
const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CachedAudio {
  key: string;
  blob: Blob;
  text: string;
  engine: string;
  createdAt: number;
  lastUsed: number;
  useCount: number;
}

/**
 * Simple hash for text → cache key
 */
async function hashText(text: string, voice: string): Promise<string> {
  const data = new TextEncoder().encode(`${voice}:${text.trim().toLowerCase()}`);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

/**
 * Open IndexedDB connection
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "key" });
        store.createIndex("lastUsed", "lastUsed", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get cached audio for text
 */
export async function getCachedAudio(text: string, voice = "Iapetus"): Promise<Blob | null> {
  try {
    const key = await hashText(text, voice);
    const db = await openDB();
    
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);
      
      request.onsuccess = () => {
        const result = request.result as CachedAudio | undefined;
        if (!result) {
          resolve(null);
          return;
        }
        
        // Check expiry
        if (Date.now() - result.createdAt > MAX_AGE_MS) {
          store.delete(key);
          resolve(null);
          return;
        }
        
        // Update usage stats
        result.lastUsed = Date.now();
        result.useCount++;
        store.put(result);
        
        console.log(`[Voice Cache] ✅ HIT "${text.slice(0, 30)}..." (${result.useCount}x, ${result.engine})`);
        resolve(result.blob);
      };
      
      request.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Store audio in cache
 */
export async function cacheAudio(text: string, blob: Blob, engine: string, voice = "Iapetus"): Promise<void> {
  try {
    const key = await hashText(text, voice);
    const db = await openDB();
    
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    
    const entry: CachedAudio = {
      key,
      blob,
      text: text.slice(0, 200),
      engine,
      createdAt: Date.now(),
      lastUsed: Date.now(),
      useCount: 1,
    };
    
    store.put(entry);
    console.log(`[Voice Cache] 💾 Cached "${text.slice(0, 30)}..." (${(blob.size / 1024).toFixed(1)}KB, ${engine})`);
    
    // Prune old entries if over limit
    const countRequest = store.count();
    countRequest.onsuccess = () => {
      if (countRequest.result > MAX_CACHE_SIZE) {
        const index = store.index("lastUsed");
        const deleteCount = countRequest.result - MAX_CACHE_SIZE;
        let deleted = 0;
        
        const cursor = index.openCursor();
        cursor.onsuccess = () => {
          const c = cursor.result;
          if (c && deleted < deleteCount) {
            store.delete(c.primaryKey);
            deleted++;
            c.continue();
          }
        };
      }
    };
  } catch (err) {
    console.warn("[Voice Cache] Cache write failed:", err);
  }
}

/**
 * Get cache stats
 */
export async function getVoiceCacheStats(): Promise<{ count: number; totalSizeKB: number }> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    
    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const items = request.result as CachedAudio[];
        const totalSize = items.reduce((sum, i) => sum + (i.blob?.size || 0), 0);
        resolve({ count: items.length, totalSizeKB: Math.round(totalSize / 1024) });
      };
      request.onerror = () => resolve({ count: 0, totalSizeKB: 0 });
    });
  } catch {
    return { count: 0, totalSizeKB: 0 };
  }
}

/**
 * Clear all cached audio
 */
export async function clearVoiceCache(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).clear();
    console.log("[Voice Cache] 🗑️ Cache cleared");
  } catch {}
}
