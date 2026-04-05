import { useState, useEffect, useCallback, useRef } from "react";
import { useGoogleToken } from "@/hooks/useGoogleToken";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface DocChangeState {
  lastModifiedTime: string | null;
  hasRemoteChanges: boolean;
  checking: boolean;
}

/**
 * Hook para detectar mudanças em documentos Google Docs via polling.
 * Verifica a cada `intervalMs` se o documento foi modificado externamente.
 */
export function useGoogleDocChangeDetection(
  googleDocId: string | null,
  options: { intervalMs?: number; enabled?: boolean } = {}
) {
  const { intervalMs = 60000, enabled = true } = options;
  const { invokeGoogleFunction, hasGoogleToken } = useGoogleToken();
  const { session } = useAuth();
  const { toast } = useToast();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [state, setState] = useState<DocChangeState>({
    lastModifiedTime: null,
    hasRemoteChanges: false,
    checking: false,
  });

  const checkForChanges = useCallback(async () => {
    if (!googleDocId || !hasGoogleToken) return;

    setState((s) => ({ ...s, checking: true }));
    try {
      const result = await invokeGoogleFunction("google-docs", {
        action: "check_modified",
        documentId: googleDocId,
      });

      const remoteModified = result.modifiedTime;

      setState((prev) => {
        if (prev.lastModifiedTime && remoteModified !== prev.lastModifiedTime) {
          // Document was modified externally
          toast({
            title: "📝 Documento modificado externamente",
            description: `"${result.name}" foi alterado no Google Docs. Clique em Importar para atualizar.`,
          });
          return {
            lastModifiedTime: remoteModified,
            hasRemoteChanges: true,
            checking: false,
          };
        }
        return {
          lastModifiedTime: remoteModified,
          hasRemoteChanges: false,
          checking: false,
        };
      });

      // Update tracking in database
      if (session?.user?.id) {
        await supabase
          .from("google_doc_links" as any)
          .upsert({
            user_id: session.user.id,
            google_doc_id: googleDocId,
            google_doc_title: result.name,
            last_modified_time: remoteModified,
            last_synced_at: new Date().toISOString(),
          }, { onConflict: "google_doc_id,user_id" } as any)
          .select();
      }
    } catch (err: any) {
      setState((s) => ({ ...s, checking: false }));
    }
  }, [googleDocId, hasGoogleToken, invokeGoogleFunction, toast, session?.user?.id]);

  const acknowledgeChanges = useCallback(() => {
    setState((s) => ({ ...s, hasRemoteChanges: false }));
  }, []);

  // Set up polling
  useEffect(() => {
    if (!enabled || !googleDocId || !hasGoogleToken) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    // Initial check
    checkForChanges();

    // Set up interval
    intervalRef.current = setInterval(checkForChanges, intervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [enabled, googleDocId, hasGoogleToken, intervalMs, checkForChanges]);

  return {
    ...state,
    checkForChanges,
    acknowledgeChanges,
  };
}
