import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface AmazonProfile {
  user_id: string;
  email: string;
  name: string;
}

interface AmazonStatus {
  connected: boolean;
  profile: AmazonProfile | null;
  scopes: string[];
  expires_at: string | null;
  updated_at: string | null;
}

const BASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const API_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

if (!BASE_URL) console.warn("[useAmazonIntegration] VITE_SUPABASE_URL not set");

function getHeaders(accessToken: string): Record<string, string> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
  if (API_KEY) headers.apikey = API_KEY;
  return headers;
}

export function useAmazonIntegration() {
  const { session } = useAuth();
  const { toast } = useToast();
  const [status, setStatus] = useState<AmazonStatus>({
    connected: false, profile: null, scopes: [], expires_at: null, updated_at: null,
  });
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);

  const checkStatus = useCallback(async () => {
    if (!session) { setLoading(false); return; }
    try {
      const res = await fetch(
        `${BASE_URL}/functions/v1/amazon-auth?action=status`,
        { headers: getHeaders(session.access_token) }
      );
      if (res.ok) {
        setStatus(await res.json());
      }
    } catch (e) {
      console.error("Amazon status check failed:", e);
    } finally {
      setLoading(false);
    }
  }, [session]);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Handle callback from Amazon OAuth (when redirect lands on same page)
  useEffect(() => {
    if (!session) return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const hasCallback = params.get("amazon_callback");

    if (code && hasCallback) {
      // Clean URL
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, "", cleanUrl);

      // Exchange code
      const redirectUri = `${window.location.origin}/dashboard/configuracoes?amazon_callback=true`;
      const state = params.get("state");
      fetch(`${BASE_URL}/functions/v1/amazon-auth?action=exchange`, {
        method: "POST",
        headers: getHeaders(session.access_token),
        body: JSON.stringify({ code, redirect_uri: redirectUri, state }),
      })
        .then(async (res) => {
          if (res.ok) {
            toast({ title: "Amazon conectado!", description: "Integração configurada com sucesso." });
            checkStatus();
          } else {
            const err = await res.json().catch(() => ({}));
            toast({ title: "Erro na conexão Amazon", description: err.error || "Falha ao trocar o código", variant: "destructive" });
          }
        })
        .catch(() => {
          toast({ title: "Erro na conexão Amazon", description: "Falha na comunicação", variant: "destructive" });
        });
    }
  }, [session, checkStatus, toast]);

  const connect = useCallback(async () => {
    if (!session) return;
    setConnecting(true);
    try {
      const configRes = await fetch(
        `${BASE_URL}/functions/v1/amazon-auth?action=config`,
        { headers: getHeaders(session.access_token) }
      );
      if (!configRes.ok) throw new Error("Failed to get Amazon config");
      const config = await configRes.json();

      // Use same-page redirect (more reliable than popup for cross-origin)
      const redirectUri = `${window.location.origin}/dashboard/configuracoes?amazon_callback=true`;
      const scope = config.scopes.join(" ");
      const state = btoa(JSON.stringify({ ts: Date.now(), origin: window.location.origin }));

      const authUrl = new URL("https://www.amazon.com/ap/oa");
      authUrl.searchParams.set("client_id", config.client_id);
      authUrl.searchParams.set("scope", scope);
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("redirect_uri", redirectUri);
      authUrl.searchParams.set("state", state);

      // Redirect in same window (avoids popup blockers and cross-origin issues)
      window.location.href = authUrl.toString();
    } catch (e) {
      console.error("Amazon connect failed:", e);
      toast({ title: "Erro", description: "Falha ao iniciar conexão Amazon", variant: "destructive" });
      setConnecting(false);
    }
  }, [session, toast]);

  const disconnect = useCallback(async () => {
    if (!session) return;
    try {
      const res = await fetch(
        `${BASE_URL}/functions/v1/amazon-auth?action=disconnect`,
        { method: "POST", headers: getHeaders(session.access_token) }
      );
      if (res.ok) {
        setStatus({ connected: false, profile: null, scopes: [], expires_at: null, updated_at: null });
        toast({ title: "Amazon desconectado", description: "Integração removida." });
      }
    } catch (e) {
      console.error("Amazon disconnect failed:", e);
    }
  }, [session, toast]);

  const callApi = useCallback(async (endpoint: string, method = "GET", payload?: unknown) => {
    if (!session) return null;
    try {
      const res = await fetch(
        `${BASE_URL}/functions/v1/amazon-auth?action=api`,
        {
          method: "POST",
          headers: getHeaders(session.access_token),
          body: JSON.stringify({ endpoint, method, payload }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 401) {
          toast({ title: "Amazon desconectado", description: "Reconecte sua conta Amazon", variant: "destructive" });
          setStatus(s => ({ ...s, connected: false }));
        }
        return null;
      }
      return res.json();
    } catch {
      return null;
    }
  }, [session, toast]);

  return { status, loading, connecting, connect, disconnect, callApi, refresh: checkStatus };
}
