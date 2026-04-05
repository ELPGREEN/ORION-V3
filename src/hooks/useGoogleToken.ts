/**
 * Compatibility wrapper — checks if user has connected their Google account
 * via the user_google_tokens table before routing calls through firebase-admin.
 */
import { useEffect, useState } from "react";
import { callGoogleServer } from "@/lib/google-server";
import { supabase } from "@/integrations/supabase/client";

const SERVICE_MAP: Record<string, string> = {
  "google-gmail": "google.gmail",
  "google-calendar": "google.calendar",
  "google-contacts": "google.contacts",
  "google-docs": "google.docs",
  "google-drive": "google.drive",
  "google-sheets": "google.sheets",
  "google-tasks": "google.tasks",
  "google-slides": "google.slides",
  "google-forms": "google.forms",
  "google-chat": "google.chat",
  "google-vision": "google.vision",
  "google-dialogflow": "google.dialogflow",
  "google-firestore": "google.firestore",
  "google-analytics": "google.analytics",
  "google-pubsub": "google.pubsub",
  "google-bigquery": "google.bigquery",
};

export function useGoogleToken() {
  const [hasGoogleToken, setHasGoogleToken] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function check() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) return;

        const { data } = await supabase
          .from("user_google_tokens")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!cancelled) setHasGoogleToken(!!data);
      } catch {
        if (!cancelled) setHasGoogleToken(false);
      }
    }
    check();
    return () => { cancelled = true; };
  }, []);

  const invokeGoogleFunction = async (
    functionName: string,
    body: Record<string, unknown>
  ) => {
    const servicePrefix = SERVICE_MAP[functionName] || functionName;
    const action = body.action ? `${servicePrefix}.${body.action}` : servicePrefix;
    const params = { ...body };
    delete params.action;
    return callGoogleServer(action, params);
  };

  return {
    getGoogleToken: () => "server-side",
    invokeGoogleFunction,
    hasGoogleToken,
  };
}
