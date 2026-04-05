import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";

const HEARTBEAT_INTERVAL = 30_000; // 30s
const OFFLINE_THRESHOLD = 90_000; // 90s without heartbeat = offline

/**
 * For lawyers: sends heartbeats to mark presence as online.
 * For clients: subscribes to lawyer presence to know if lawyer is online.
 */
export function useLawyerPresence() {
  const { user } = useAuth();
  const { isAdvogado } = useUserRole();
  const [isLawyerOnline, setIsLawyerOnline] = useState(false);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const accessTokenRef = useRef<string>("");

  // Keep access token ref updated
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      accessTokenRef.current = session?.access_token || "";
    });
    // Initialize
    supabase.auth.getSession().then(({ data }) => {
      accessTokenRef.current = data.session?.access_token || "";
    });
    return () => subscription.unsubscribe();
  }, []);

  // Lawyer heartbeat
  useEffect(() => {
    if (!user || !isAdvogado) return;

    const upsertPresence = async (online: boolean) => {
      await supabase.from("lawyer_presence").upsert(
        { user_id: user.id, is_online: online, last_seen_at: new Date().toISOString() },
        { onConflict: "user_id" }
      );
    };

    upsertPresence(true);
    intervalRef.current = setInterval(() => upsertPresence(true), HEARTBEAT_INTERVAL);

    const handleBeforeUnload = () => {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/lawyer_presence?user_id=eq.${user.id}`;
      const body = JSON.stringify({ is_online: false, last_seen_at: new Date().toISOString() });
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        "Prefer": "return=minimal",
      };
      if (accessTokenRef.current) {
        headers["Authorization"] = `Bearer ${accessTokenRef.current}`;
      }
      try {
        fetch(url, { method: "PATCH", headers, body, keepalive: true });
      } catch {
        // Best effort — will also be caught by OFFLINE_THRESHOLD
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      window.removeEventListener("beforeunload", handleBeforeUnload);
      upsertPresence(false);
    };
  }, [user, isAdvogado]);

  // Client: check lawyer presence
  useEffect(() => {
    if (!user || isAdvogado) {
      setLoading(false);
      return;
    }

    const checkPresence = async () => {
      const { data } = await supabase
        .from("lawyer_presence")
        .select("is_online, last_seen_at")
        .eq("is_online", true)
        .limit(1);

      if (data && data.length > 0) {
        const lastSeen = new Date(data[0].last_seen_at).getTime();
        setIsLawyerOnline(Date.now() - lastSeen < OFFLINE_THRESHOLD);
      } else {
        setIsLawyerOnline(false);
      }
      setLoading(false);
    };

    checkPresence();

    // Subscribe to presence changes
    const channel = supabase
      .channel("lawyer-presence")
      .on("postgres_changes", { event: "*", schema: "public", table: "lawyer_presence" }, () => {
        checkPresence();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, isAdvogado]);

  return { isLawyerOnline, loading };
}
