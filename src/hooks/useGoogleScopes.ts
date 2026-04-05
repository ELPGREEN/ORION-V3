import { supabase } from "@/integrations/supabase/client";

const GOOGLE_SCOPES = {
  contacts: "https://www.googleapis.com/auth/contacts.readonly",
  gmailRead: "https://www.googleapis.com/auth/gmail.readonly",
  gmailSend: "https://www.googleapis.com/auth/gmail.send",
  calendar: "https://www.googleapis.com/auth/calendar",
  drive: "https://www.googleapis.com/auth/drive",
  docs: "https://www.googleapis.com/auth/documents",
  sheets: "https://www.googleapis.com/auth/spreadsheets",
} as const;

type ScopeKey = keyof typeof GOOGLE_SCOPES;

const LOVABLE_HOSTS = ["lovable.app", "lovableproject.com"];

function isCustomDomain() {
  return !LOVABLE_HOSTS.some((host) => window.location.hostname.includes(host));
}

function getRedirectUrl() {
  return `${window.location.origin}${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function getAllowedOAuthHosts() {
  const hosts = ["accounts.google.com"];

  try {
    hosts.push(new URL(import.meta.env.VITE_SUPABASE_URL).hostname);
  } catch {
    // noop
  }

  return hosts;
}

/**
 * Solicita escopos adicionais do Google incrementalmente.
 * Use quando o usuário acessar funcionalidades que precisam de permissões extras
 * (Gmail, Drive, Calendar, etc.), evitando o aviso de "app não verificado" no login.
 */
export function useGoogleScopes() {
  const requestScopes = async (scopeKeys: ScopeKey[]) => {
    const scopes = scopeKeys.map((key) => GOOGLE_SCOPES[key]).join(" ");
    const customDomain = isCustomDomain();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getRedirectUrl(),
        scopes,
        ...(customDomain ? { skipBrowserRedirect: true } : {}),
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });

    if (error) {
      return { error: error as Error | null };
    }

    if (customDomain && data?.url) {
      const oauthUrl = new URL(data.url);
      const allowedHosts = getAllowedOAuthHosts();

      if (!allowedHosts.some((host) => oauthUrl.hostname === host)) {
        return { error: new Error("URL de redirecionamento OAuth inválida") };
      }

      window.location.href = data.url;
    }

    return { error: null };
  };

  return { requestScopes, GOOGLE_SCOPES };
}
