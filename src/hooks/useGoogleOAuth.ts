import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/drive.readonly",
  "https://www.googleapis.com/auth/contacts.readonly",
  "https://www.googleapis.com/auth/tasks",
].join(" ");

interface GoogleOAuthState {
  connected: boolean;
  email: string | null;
  loading: boolean;
}

export function useGoogleOAuth() {
  const [state, setState] = useState<GoogleOAuthState>({
    connected: false,
    email: null,
    loading: true,
  });
  const { toast } = useToast();

  const checkStatus = useCallback(async () => {
    try {
      const { data, error } = await supabase.functions.invoke("firebase-admin", {
        body: { action: "google.oauth.status" },
      });
      if (error) throw error;
      const result = data?.data ?? data;
      setState({
        connected: result?.connected || false,
        email: result?.email || null,
        loading: false,
      });
    } catch {
      setState((s) => ({ ...s, loading: false }));
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Handle OAuth callback (code in URL)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const oauthState = params.get("state");
    
    if (code && oauthState === "google_connect") {
      // Remove code from URL
      const url = new URL(window.location.href);
      url.searchParams.delete("code");
      url.searchParams.delete("state");
      url.searchParams.delete("scope");
      window.history.replaceState({}, "", url.pathname);

      const exchangeCode = async () => {
        setState((s) => ({ ...s, loading: true }));
        try {
          const redirectUri = `${window.location.origin}/dashboard/ferramentas-google`;
          const { data, error } = await supabase.functions.invoke("firebase-admin", {
            body: { action: "google.oauth.exchange", code, redirectUri },
          });
          if (error) throw error;
          const result = data?.data ?? data;
          setState({
            connected: true,
            email: result?.email || null,
            loading: false,
          });
          toast({ title: "Google conectado!", description: `Conta ${result?.email} vinculada com sucesso.` });
        } catch (err: any) {
          toast({ title: "Erro ao conectar Google", description: err.message, variant: "destructive" });
          setState((s) => ({ ...s, loading: false }));
        }
      };
      exchangeCode();
    }
  }, [toast]);

  const connect = useCallback(() => {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    if (!clientId) {
      toast({ title: "Google Client ID não configurado", variant: "destructive" });
      return;
    }

    const redirectUri = `${window.location.origin}/dashboard/ferramentas-google`;
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: GOOGLE_SCOPES,
      access_type: "offline",
      prompt: "consent",
      state: "google_connect",
    });

    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
  }, [toast]);

  const disconnect = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      await supabase.functions.invoke("firebase-admin", {
        body: { action: "google.oauth.disconnect" },
      });
      setState({ connected: false, email: null, loading: false });
      toast({ title: "Google desconectado" });
    } catch (err: any) {
      toast({ title: "Erro ao desconectar", description: err.message, variant: "destructive" });
      setState((s) => ({ ...s, loading: false }));
    }
  }, [toast]);

  return { ...state, connect, disconnect, refresh: checkStatus };
}
