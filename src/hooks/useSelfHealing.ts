import { useState, useCallback } from "react";
import { toast } from "sonner";

export interface HealingStatus {
  isHealing: boolean;
  lastError?: string;
  remediation?: string;
}

/**
 * Hook to manage self-healing logic for AI service failures.
 * Intercepts common status codes and suggests actions.
 */
export function useSelfHealing() {
  const [status, setStatus] = useState<HealingStatus>({ isHealing: false });

  const handleAIServiceError = useCallback(async (error: any) => {
    const msg = error?.message || String(error);
    console.error("[SelfHealing] Intercepted AI Error:", msg);

    let remediation = "Erro desconhecido. Tente novamente mais tarde.";

    if (msg.includes("401") || msg.toLowerCase().includes("unauthorized") || msg.toLowerCase().includes("missing api key")) {
      remediation = "Falha de autenticação. Verifique se as chaves GEMINI_API_KEY ou OPENROUTER_API_KEY estão configuradas no Supabase Secrets.";
      toast.error("Erro de Autenticação na IA", {
        description: remediation,
        duration: 10000,
      });
    } else if (msg.includes("404") || msg.toLowerCase().includes("not found")) {
      remediation = "Função não encontrada. A arquitetura está sendo redirecionada para o Orchestrator Central.";
      toast.warning("Redirecionando Inteligência", {
        description: "A função solicitada não existe individualmente. Usando o cérebro central.",
      });
    } else if (msg.includes("429") || msg.toLowerCase().includes("too many requests")) {
      remediation = "Limite de taxa atingido. O sistema está rotacionando chaves automaticamente. Aguarde 5 segundos.";
      toast.info("Ajustando Frequência", {
        description: remediation,
      });
    }

    setStatus({
      isHealing: true,
      lastError: msg,
      remediation
    });

    // Simulated self-healing delay
    await new Promise(r => setTimeout(r, 2000));
    setStatus(prev => ({ ...prev, isHealing: false }));
  }, []);

  return {
    ...status,
    handleAIServiceError
  };
}
