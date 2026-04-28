/**
 * ─── useOrionChat Hook ───
 * Integra ORION Brain com sistema de chat/voice
 * Responde perguntas, executa comandos, coordena setores
 */

import { useState, useCallback } from "react";
import { orionBrain, getOrionHelp, getOrionStatus, getPanelForSector, type OrionResponse } from "@/lib/neural/orion-brain";
import { detectSector, type Sector } from "@/lib/neural/sector-agents";
import { toast } from "sonner";

export interface UseOrionChatOptions {
  autoSpeak?: boolean;
  onPanelOpen?: (panel: string) => void;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  sector?: Sector;
  timestamp: number;
}

export function useOrionChat(options: UseOrionChatOptions = {}) {
  const { autoSpeak = false, onPanelOpen } = options;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentSector, setCurrentSector] = useState<Sector | null>(null);

  const sendMessage = useCallback(async (input: string): Promise<void> => {
    if (!input.trim() || isProcessing) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: Date.now(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsProcessing(true);
    
    try {
      // Processar via ORION Brain
      const response = await orionBrain({ input });
      
      // Adicionar resposta
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: response.response,
        sector: response.sector,
        timestamp: Date.now(),
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
      setCurrentSector(response.sector || null);
      
      // Abrir painel se necessário
      if (response.panel && onPanelOpen) {
        onPanelOpen(response.panel);
      }
      
      // Speak se enabled
      if (autoSpeak && "speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(response.response);
        utterance.lang = "pt-BR";
        speechSynthesis.speak(utterance);
      }
      
    } catch (error) {
      console.error("[OrionChat] Error:", error);
      toast.error("Erro ao processar mensagem");
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, autoSpeak, onPanelOpen]);

  const clearChat = useCallback(() => {
    setMessages([]);
    setCurrentSector(null);
  }, []);

  const getHelp = useCallback((): string => {
    return getOrionHelp();
  }, []);

  const getStatus = useCallback(() => {
    return getOrionStatus();
  }, []);

  return {
    messages,
    isProcessing,
    currentSector,
    sendMessage,
    clearChat,
    getHelp,
    getStatus,
  };
}

/**
 * Hook para integrar ORION com Voice Input
 */
export function useOrionVoice(/** @deprecated Use useOrionChat instead */ options?: UseOrionChatOptions) {
  return useOrionChat(options);
}

/**
 * Detectar setor de uma entrada (para uso externo)
 */
export function useSectorDetector() {
  const detect = useCallback((input: string): Sector => {
    return detectSector(input);
  }, []);

  return { detect };
}