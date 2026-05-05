import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type UserNiche = "digital" | "juridico" | "industria";

const KEY = "orion_user_niche";

export interface NicheTool {
  label: string;
  description: string;
  to: string;
}

export const NICHE_LABELS: Record<UserNiche, string> = {
  digital: "Empreendedor Digital",
  juridico: "Jurídico / Advocacia",
  industria: "Indústria / Robótica",
};

export const NICHE_TOOLS: Record<UserNiche, NicheTool[]> = {
  digital: [
    { label: "Funil de Vendas", description: "Página + e-mails + upsell prontos", to: "/templates/funil-de-vendas" },
    { label: "Copy + VSL", description: "Carta de vendas e roteiro de vídeo", to: "/templates/copy-vsl" },
    { label: "Lançamento 7 dias", description: "Cronograma completo com copy", to: "/templates/lancamento-7-dias" },
    { label: "Tráfego Pago", description: "Ângulos e criativos Meta/Google", to: "/templates/trafego-pago" },
  ],
  juridico: [
    { label: "Petição em 1 clique", description: "Padrão CNJ com fundamentos", to: "/templates/peticao" },
    { label: "Contrato por IA", description: "Minuta personalizada em segundos", to: "/templates/contrato-ia" },
    { label: "Análise de Processo", description: "Estratégia a partir dos autos", to: "/templates/analise-processo" },
  ],
  industria: [
    { label: "Diagnóstico de Linha", description: "OEE, gargalos e ROI", to: "/templates/diagnostico-industrial" },
    { label: "Plano de Manutenção", description: "Preventiva + sensores IoT", to: "/templates/plano-manutencao" },
  ],
};

const isValidNiche = (v: unknown): v is UserNiche =>
  v === "digital" || v === "juridico" || v === "industria";

export function useUserNiche() {
  const { user } = useAuth();
  const [niche, setNicheState] = useState<UserNiche | null>(() => {
    if (typeof window === "undefined") return null;
    const v = localStorage.getItem(KEY);
    return isValidNiche(v) ? v : null;
  });

  // Sync from DB on login
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("niche")
        .eq("user_id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const dbNiche = (data as any)?.niche;
      if (isValidNiche(dbNiche)) {
        localStorage.setItem(KEY, dbNiche);
        setNicheState(dbNiche);
      } else {
        const local = localStorage.getItem(KEY);
        if (isValidNiche(local)) {
          await supabase.from("profiles").update({ niche: local }).eq("user_id", user.id);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setNicheState(isValidNiche(e.newValue) ? e.newValue : null);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const setNiche = useCallback(async (n: UserNiche | null) => {
    if (n) localStorage.setItem(KEY, n);
    else localStorage.removeItem(KEY);
    setNicheState(n);
    if (user?.id) {
      await supabase.from("profiles").update({ niche: n }).eq("user_id", user.id);
    }
  }, [user?.id]);

  const tools = niche ? NICHE_TOOLS[niche] : [];

  return { niche, setNiche, tools, label: niche ? NICHE_LABELS[niche] : null };
}
