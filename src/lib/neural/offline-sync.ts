/**
 * ─── v21.2: Offline Sync (IndexedDB + Queue) ───
 * Offline editing capability with automatic sync when connectivity restores.
 * Leverages Yjs infrastructure for conflict resolution.
 */

export interface PendingChange {
  id: string;
  table: string;
  operation: "insert" | "update" | "delete";
  data: Record<string, unknown>;
  createdAt: number;
  retries: number;
  lastError?: string;
}

export interface OfflineSyncState {
  isOnline: boolean;
  pendingChanges: number;
  lastSyncAt: string | null;
  syncInProgress: boolean;
}

const DB_NAME = "rag-elp-offline";
const STORE_CHANGES = "pending_changes";
const STORE_STATE = "sync_state";
const MAX_RETRIES = 5;

export function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_CHANGES)) {
        db.createObjectStore(STORE_CHANGES, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE_STATE)) {
        db.createObjectStore(STORE_STATE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function addPendingChange(change: PendingChange): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_CHANGES, "readwrite");
  tx.objectStore(STORE_CHANGES).put(change);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getPendingChanges(): Promise<PendingChange[]> {
  const db = await openDB();
  const tx = db.transaction(STORE_CHANGES, "readonly");
  const request = tx.objectStore(STORE_CHANGES).getAll();
  return new Promise((resolve, reject) => {
    request.onsuccess = () => {
      const changes = (request.result as PendingChange[])
        .sort((a, b) => a.createdAt - b.createdAt);
      resolve(changes);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function removePendingChange(id: string): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(STORE_CHANGES, "readwrite");
  tx.objectStore(STORE_CHANGES).delete(id);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function syncAllChanges(
  applyFn: (change: PendingChange) => Promise<boolean>
): Promise<{ synced: number; failed: number }> {
  const changes = await getPendingChanges();
  let synced = 0;
  let failed = 0;

  for (const change of changes) {
    try {
      const success = await applyFn(change);
      if (success) {
        await removePendingChange(change.id);
        synced++;
      } else {
        change.retries++;
        change.lastError = "Apply returned false";
        if (change.retries >= MAX_RETRIES) {
          failed++;
        } else {
          await addPendingChange(change);
        }
      }
    } catch (err) {
      change.retries++;
      change.lastError = err instanceof Error ? err.message : String(err);
      if (change.retries >= MAX_RETRIES) {
        failed++;
      } else {
        await addPendingChange(change);
      }
    }
  }

  return { synced, failed };
}

export function getOfflineSyncState(): OfflineSyncState {
  return {
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    pendingChanges: 0,
    lastSyncAt: null,
    syncInProgress: false,
  };
}

export function initOfflineSync(onStatusChange: (online: boolean) => void): () => void {
  const handleOnline = () => onStatusChange(true);
  const handleOffline = () => onStatusChange(false);

  window.addEventListener("online", handleOnline);
  window.addEventListener("offline", handleOffline);

  return () => {
    window.removeEventListener("online", handleOnline);
    window.removeEventListener("offline", handleOffline);
  };
}
