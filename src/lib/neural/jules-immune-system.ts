/**
 * Jules Immune System — Adaptive Memory & Quarantine
 * ───────────────────────────────────────────────────
 * Antibodies: registry of fixed error patterns (won't re-trigger)
 * Immune memory: PRs that resolved issues suppress retriggers for 7 days
 * Quarantine: modules with 5+ consecutive failures get isolated
 */

import { supabase } from "@/integrations/supabase/client";

// ─── Types ───

const IMMUNE_STORE_KEY = "orion_jules_immune";

export interface ImmuneMemory {
  /** hash → { fixedAt, sessionId, expiresAt } */
  antibodies: Record<string, AntibodyEntry>;
  /** subsystem → quarantine info */
  quarantine: Record<string, QuarantineEntry>;
}

interface AntibodyEntry {
  fixedAt: number;
  sessionId: string;
  expiresAt: number; // 7 days after fix
}

interface QuarantineEntry {
  consecutiveFailures: number;
  quarantinedAt: number;
  fallbackSuggested: boolean;
}

// ─── Store ───

function loadStore(): ImmuneMemory {
  try {
    return JSON.parse(localStorage.getItem(IMMUNE_STORE_KEY) || '{"antibodies":{},"quarantine":{}}');
  } catch {
    return { antibodies: {}, quarantine: {} };
  }
}

function saveStore(store: ImmuneMemory): void {
  try {
    localStorage.setItem(IMMUNE_STORE_KEY, JSON.stringify(store));
  } catch {}
}

// ─── Antibody Registry ───

export function getImmuneMemory(): ImmuneMemory {
  const store = loadStore();
  // Purge expired antibodies
  const now = Date.now();
  let changed = false;
  for (const [hash, entry] of Object.entries(store.antibodies)) {
    if (entry.expiresAt < now) {
      delete store.antibodies[hash];
      changed = true;
    }
  }
  if (changed) saveStore(store);
  return store;
}

const ANTIBODY_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function registerAntibody(errorHash: string, sessionId: string): void {
  const store = loadStore();
  store.antibodies[errorHash] = {
    fixedAt: Date.now(),
    sessionId,
    expiresAt: Date.now() + ANTIBODY_TTL_MS,
  };
  saveStore(store);
  console.log(`[Immune] Antibody registered for ${errorHash} (TTL: 7d)`);
}

export function hasAntibody(errorHash: string): boolean {
  const store = getImmuneMemory();
  return !!store.antibodies[errorHash];
}

// ─── Quarantine ───

const QUARANTINE_THRESHOLD = 5;

export function recordModuleFailure(subsystem: string): QuarantineEntry {
  const store = loadStore();
  const entry = store.quarantine[subsystem] || { consecutiveFailures: 0, quarantinedAt: 0, fallbackSuggested: false };
  entry.consecutiveFailures++;

  if (entry.consecutiveFailures >= QUARANTINE_THRESHOLD && !entry.quarantinedAt) {
    entry.quarantinedAt = Date.now();
    entry.fallbackSuggested = true;
    console.warn(`[Immune] ${subsystem} quarantined after ${entry.consecutiveFailures} failures`);
  }

  store.quarantine[subsystem] = entry;
  saveStore(store);
  return entry;
}

export function shouldQuarantine(subsystem: string): boolean {
  const store = loadStore();
  const entry = store.quarantine[subsystem];
  if (!entry?.quarantinedAt) return false;

  // Auto-release after 2 hours
  if (Date.now() - entry.quarantinedAt > 7200_000) {
    entry.quarantinedAt = 0;
    entry.consecutiveFailures = 0;
    entry.fallbackSuggested = false;
    store.quarantine[subsystem] = entry;
    saveStore(store);
    return false;
  }
  return true;
}

export function clearQuarantine(subsystem: string): void {
  const store = loadStore();
  delete store.quarantine[subsystem];
  saveStore(store);
}

export function resetModuleFailures(subsystem: string): void {
  const store = loadStore();
  if (store.quarantine[subsystem]) {
    store.quarantine[subsystem].consecutiveFailures = 0;
  }
  saveStore(store);
}

// ─── Resolution Check (DB-backed) ───

export async function checkAndRegisterResolutions(): Promise<number> {
  let registered = 0;
  try {
    const { data } = await supabase
      .from("jules_sessions")
      .select("session_id, subsystem, error_snapshot")
      .eq("status", "completed")
      .eq("resolved", true)
      .order("resolved_at", { ascending: false })
      .limit(20);

    if (!data) return 0;

    const store = loadStore();
    for (const session of data as Array<{ session_id: string; subsystem: string | null; error_snapshot: string | null }>) {
      if (!session.error_snapshot) continue;
      const hash = `${session.subsystem || "unknown"}:${session.error_snapshot.slice(0, 50)}`;
      if (!store.antibodies[hash]) {
        registerAntibody(hash, session.session_id);
        registered++;
      }
      // Clear quarantine for resolved subsystems
      if (session.subsystem) {
        resetModuleFailures(session.subsystem);
        clearQuarantine(session.subsystem);
      }
    }
  } catch (e) {
    console.warn("[Immune] Resolution check failed:", e);
  }
  return registered;
}

// ─── Stats ───

export function getImmuneStats(): {
  antibodyCount: number;
  quarantinedModules: string[];
  totalFailures: number;
} {
  const store = getImmuneMemory();
  return {
    antibodyCount: Object.keys(store.antibodies).length,
    quarantinedModules: Object.entries(store.quarantine)
      .filter(([, v]) => v.quarantinedAt > 0)
      .map(([k]) => k),
    totalFailures: Object.values(store.quarantine).reduce((s, v) => s + v.consecutiveFailures, 0),
  };
}
