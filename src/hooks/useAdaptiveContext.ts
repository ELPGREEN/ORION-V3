import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { analyzeUserMessage, getMirroringRecommendations } from "@/lib/neural/neural-mirroring";

export interface CommunicationContext {
  id?: string;
  estilo_comunicacao: string;
  nivel_formalidade: number;
  girias_regional: string;
  perfil_fala: string;
  reatividade_visual: boolean;
  humor_atual: string;
  historico_interacoes: any[];
  preferencias_explicitas: Record<string, any>;
  topicos_evitar: string[];
  expressoes_favoritas: string[];
}

export interface EnvironmentalEntry {
  id: string;
  objeto_detectado: string;
  categoria: string;
  confianca: number;
  contexto_adicional?: string;
  emocao_detectada?: string;
  posicao_relativa?: string;
  ativo: boolean;
  created_at: string;
}

const DEFAULT_CONTEXT: CommunicationContext = {
  estilo_comunicacao: "coloquial",
  nivel_formalidade: 5,
  girias_regional: "brasileiro_geral",
  perfil_fala: "Amigável/Coloquial",
  reatividade_visual: true,
  humor_atual: "neutro",
  historico_interacoes: [],
  preferencias_explicitas: {},
  topicos_evitar: [],
  expressoes_favoritas: [],
};

export function useAdaptiveContext() {
  const { user } = useAuth();
  const [context, setContext] = useState<CommunicationContext>(DEFAULT_CONTEXT);
  const [envContext, setEnvContext] = useState<EnvironmentalEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Load user communication context
  useEffect(() => {
    if (!user?.id) return;
    
    const load = async () => {
      const { data } = await supabase
        .from("user_communication_context" as any)
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (data) {
        setContext(data as any);
      } else {
        // Auto-create context for new users
        const { data: created } = await supabase
          .from("user_communication_context" as any)
          .insert({ user_id: user.id } as any)
          .select()
          .single();
        if (created) setContext(created as any);
      }
      setLoading(false);
    };
    load();
  }, [user?.id]);

  // Load active environmental context
  useEffect(() => {
    if (!user?.id) return;
    
    const load = async () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data } = await supabase
        .from("environmental_context" as any)
        .select("*")
        .eq("user_id", user.id)
        .eq("ativo", true)
        .gte("created_at", fiveMinAgo)
        .order("created_at", { ascending: false })
        .limit(20);
      
      if (data) setEnvContext(data as any);
    };
    load();
    const interval = setInterval(load, 10000);
    return () => clearInterval(interval);
  }, [user?.id]);

  // Update communication context
  const updateContext = useCallback(async (updates: Partial<CommunicationContext>) => {
    if (!user?.id) return;
    
    const newCtx = { ...context, ...updates };
    setContext(newCtx);

    await supabase
      .from("user_communication_context" as any)
      .upsert({ ...newCtx, user_id: user.id } as any, { onConflict: "user_id" });
  }, [user?.id, context]);

  // Update humor based on text sentiment analysis (simple heuristic)
  const detectHumor = useCallback((text: string) => {
    const lower = text.toLowerCase();
    const frustratedWords = ["merda", "droga", "porra", "pqp", "inferno", "raiva", "ódio", "absurdo", "não aguento", "cansado"];
    const happyWords = ["kkk", "haha", "show", "top", "massa", "maneiro", "dahora", "incrível", "perfeito"];
    const sadWords = ["triste", "chorar", "dor", "perdi", "morreu", "luto", "deprimido"];
    const urgentWords = ["urgente", "emergência", "agora", "rápido", "socorro", "ajuda"];

    if (frustratedWords.some(w => lower.includes(w))) return "frustrado";
    if (happyWords.some(w => lower.includes(w))) return "zueira";
    if (sadWords.some(w => lower.includes(w))) return "empático";
    if (urgentWords.some(w => lower.includes(w))) return "urgente";
    return "neutro";
  }, []);

  // Detect formality level from text
  const detectFormality = useCallback((text: string) => {
    const lower = text.toLowerCase();
    const informalMarkers = ["ae", "aí", "blz", "vlw", "tmj", "kkkk", "po", "mano", "brother", "cara"];
    const formalMarkers = ["prezado", "senhor", "vossa", "excelência", "doutor", "solicito", "conforme"];
    
    const informalCount = informalMarkers.filter(m => lower.includes(m)).length;
    const formalCount = formalMarkers.filter(m => lower.includes(m)).length;
    
    if (informalCount >= 2) return Math.max(1, context.nivel_formalidade - 2);
    if (formalCount >= 1) return Math.min(10, context.nivel_formalidade + 2);
    return context.nivel_formalidade;
  }, [context.nivel_formalidade]);

  // Auto-adapt context from user message — now enhanced with Neural Mirroring (Layer 10)
  const adaptFromMessage = useCallback(async (message: string) => {
    const humor = detectHumor(message);
    const formalidade = detectFormality(message);
    
    const updates: Partial<CommunicationContext> = {};
    if (humor !== context.humor_atual) updates.humor_atual = humor;
    if (Math.abs(formalidade - context.nivel_formalidade) >= 2) updates.nivel_formalidade = formalidade;
    
    // Layer 10: Feed Neural Mirroring engine with user message
    if (user?.id) {
      try {
        analyzeUserMessage(user.id, message);
        const mirroring = getMirroringRecommendations(user.id);
        if (mirroring) {
          // Apply mirroring-based formality adjustment
          const mirroredFormality = Math.round(mirroring.formalityLevel * 10);
          if (Math.abs(mirroredFormality - context.nivel_formalidade) >= 1) {
            updates.nivel_formalidade = mirroredFormality;
          }
          // Adapt communication style based on mirroring profile
          const styleMap: Record<string, string> = {
            formal: "formal",
            casual: "coloquial",
            technical: "técnico",
            empathetic: "empático",
          };
          if (styleMap[mirroring.style] && styleMap[mirroring.style] !== context.estilo_comunicacao) {
            updates.estilo_comunicacao = styleMap[mirroring.style];
          }
        }
      } catch (e) {
        console.warn("[AdaptiveContext] Neural mirroring error:", e);
      }
    }

    if (Object.keys(updates).length > 0) {
      await updateContext(updates);
    }
    
    return { humor, formalidade };
  }, [context, detectHumor, detectFormality, updateContext, user?.id]);

  // Push environmental detection
  const pushEnvironmentalDetection = useCallback(async (detection: {
    objeto_detectado: string;
    categoria?: string;
    confianca?: number;
    emocao_detectada?: string;
    posicao_relativa?: string;
    contexto_adicional?: string;
  }) => {
    if (!user?.id) return;
    
    await supabase
      .from("environmental_context" as any)
      .insert({
        user_id: user.id,
        ...detection,
      } as any);
  }, [user?.id]);

  // Submit interaction feedback
  const submitFeedback = useCallback(async (feedback: {
    resposta_sistema: string;
    avaliacao: "positivo" | "negativo" | "neutro";
    naturalidade_score?: number;
    contexto_correto?: boolean;
    comentario_adicional?: string;
    conversation_id?: string;
  }) => {
    if (!user?.id) return;

    await supabase
      .from("interaction_feedback" as any)
      .insert({
        user_id: user.id,
        ...feedback,
      } as any);
  }, [user?.id]);

  return {
    context,
    envContext,
    loading,
    updateContext,
    adaptFromMessage,
    pushEnvironmentalDetection,
    submitFeedback,
    detectHumor,
  };
}
