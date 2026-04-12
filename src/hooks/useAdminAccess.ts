import { useState, useCallback, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
const OWNER_EMAILS = ["fancullomartins@gmail.com", "admin@elpgreen.com"];
function isOwnerEmail(email?: string | null): boolean {
  if (!email) return false;
  return OWNER_EMAILS.includes(email.toLowerCase());
}

const ADMIN_SESSION_KEY = "orion_admin_unlocked";
const ADMIN_CODE_HASH = "b3Jpb24tYWRtaW4tRmFuY3VsbzA5MTcwNzExJCQ="; // base64 encoded

function hashCode(code: string): string {
  return btoa(`orion-admin-${code}`);
}

export function useAdminAccess() {
  const { user } = useAuth();
  const isOwner = isOwnerEmail(user?.email);

  const [unlocked, setUnlocked] = useState(() => {
    try {
      return sessionStorage.getItem(ADMIN_SESSION_KEY) === "true";
    } catch {
      return false;
    }
  });

  // Auto-unlock for owner — no code needed
  useEffect(() => {
    if (isOwner && !unlocked) {
      setUnlocked(true);
      try {
        sessionStorage.setItem(ADMIN_SESSION_KEY, "true");
      } catch { /* ignore */ }
    }
  }, [isOwner, unlocked]);

  const validate = useCallback((code: string): boolean => {
    const isValid = hashCode(code) === ADMIN_CODE_HASH;
    if (isValid) {
      setUnlocked(true);
      try {
        sessionStorage.setItem(ADMIN_SESSION_KEY, "true");
      } catch { /* ignore */ }
    }
    return isValid;
  }, []);

  const lock = useCallback(() => {
    // Owner cannot be locked out
    if (isOwner) return;
    setUnlocked(false);
    try {
      sessionStorage.removeItem(ADMIN_SESSION_KEY);
    } catch { /* ignore */ }
  }, [isOwner]);

  return { unlocked: unlocked || isOwner, validate, lock, isOwner };
}
