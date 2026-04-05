/**
 * useDocumentLock – Document edit locking via Supabase.
 * Acquires a lock when editing, releases on blur/unmount.
 * Other users see the document as read-only when locked.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface DocumentLock {
  id: string;
  document_id: string;
  locked_by: string;
  locked_by_name: string;
  locked_at: string;
  expires_at: string;
}

const LOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutes
const LOCK_RENEW_INTERVAL_MS = 2 * 60 * 1000; // Renew every 2 min

interface UseDocumentLockOptions {
  documentId: string | null;
  userName?: string;
  enabled?: boolean;
}

export function useDocumentLock({
  documentId,
  userName = "Usuário",
  enabled = true,
}: UseDocumentLockOptions) {
  const { user } = useAuth();
  const [currentLock, setCurrentLock] = useState<DocumentLock | null>(null);
  const [isLockedByOther, setIsLockedByOther] = useState(false);
  const [lockOwnerName, setLockOwnerName] = useState<string | null>(null);
  const renewRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch current lock status
  const fetchLock = useCallback(async () => {
    if (!documentId || !enabled) return;

    // Clean expired locks first
    await supabase.from("document_locks" as any).delete().lt("expires_at", new Date().toISOString());

    const { data } = await supabase
      .from("document_locks" as any)
      .select("*")
      .eq("document_id", documentId)
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();

    if (data) {
      const lock = data as unknown as DocumentLock;
      setCurrentLock(lock);
      if (user && lock.locked_by !== user.id) {
        setIsLockedByOther(true);
        setLockOwnerName(lock.locked_by_name);
      } else {
        setIsLockedByOther(false);
        setLockOwnerName(null);
      }
    } else {
      setCurrentLock(null);
      setIsLockedByOther(false);
      setLockOwnerName(null);
    }
  }, [documentId, enabled, user]);

  // Acquire lock
  const acquireLock = useCallback(async (): Promise<boolean> => {
    if (!documentId || !user || !enabled) return false;

    // Try to delete expired locks first
    await supabase.from("document_locks" as any).delete().lt("expires_at", new Date().toISOString());

    const expiresAt = new Date(Date.now() + LOCK_DURATION_MS).toISOString();

    const { error } = await supabase.from("document_locks" as any).upsert(
      {
        document_id: documentId,
        locked_by: user.id,
        locked_by_name: userName,
        locked_at: new Date().toISOString(),
        expires_at: expiresAt,
      } as any,
      { onConflict: "document_id" }
    );

    if (error) {
      await fetchLock();
      return false;
    }

    await fetchLock();

    // Start renewal interval
    if (renewRef.current) clearInterval(renewRef.current);
    renewRef.current = setInterval(async () => {
      const newExpiry = new Date(Date.now() + LOCK_DURATION_MS).toISOString();
      await supabase
        .from("document_locks" as any)
        .update({ expires_at: newExpiry } as any)
        .eq("document_id", documentId)
        .eq("locked_by", user.id);
    }, LOCK_RENEW_INTERVAL_MS);

    return true;
  }, [documentId, user, enabled, userName, fetchLock]);

  // Release lock
  const releaseLock = useCallback(async () => {
    if (!documentId || !user || !enabled) return;

    if (renewRef.current) {
      clearInterval(renewRef.current);
      renewRef.current = null;
    }

    await supabase
      .from("document_locks" as any)
      .delete()
      .eq("document_id", documentId)
      .eq("locked_by", user.id);

    setCurrentLock(null);
    setIsLockedByOther(false);
    setLockOwnerName(null);
  }, [documentId, user, enabled]);

  // Subscribe to lock changes via realtime
  useEffect(() => {
    if (!documentId || !enabled) return;

    fetchLock();

    const channel = supabase
      .channel(`doc-lock:${documentId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "document_locks", filter: `document_id=eq.${documentId}` },
        () => {
          fetchLock();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (renewRef.current) clearInterval(renewRef.current);
    };
  }, [documentId, enabled, fetchLock]);

  // Release lock on unmount
  useEffect(() => {
    return () => {
      if (documentId && user && enabled) {
        // Best-effort cleanup
        supabase
          .from("document_locks" as any)
          .delete()
          .eq("document_id", documentId)
          .eq("locked_by", user.id)
          .then(() => {});
      }
    };
  }, [documentId, user, enabled]);

  const isMyLock = currentLock && user ? currentLock.locked_by === user.id : false;

  return {
    currentLock,
    isLockedByOther,
    isMyLock,
    lockOwnerName,
    acquireLock,
    releaseLock,
    fetchLock,
  };
}
