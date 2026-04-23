import { useState, useCallback, useRef } from "react";
import { chatWithAI, analyzeFrameWithAI } from "@/lib/neural/orion-ai-client";
import { toast } from "sonner";

export interface ChatMessage {
  role: "user" | "ai" | "system";
  text: string;
  time: string;
}

export function useOrionReasoning(
  active: boolean,
  speak: (t: string) => Promise<void>,
  canvasRef: React.RefObject<HTMLCanvasElement | null>
) {
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const isProcessingRef = useRef(false);

  const processInput = useCallback(async (input: string, source: "text" | "voice" = "text") => {
    if (isProcessingRef.current || !input.trim()) return;

    setIsProcessing(true);
    isProcessingRef.current = true;

    const newMessage: ChatMessage = {
      role: "user",
      text: input,
      time: new Date().toLocaleTimeString()
    };
    setChatHistory(prev => [...prev, newMessage]);

    try {
      let response;
      const isVisual = /\b(ver|vendo|o que é isso|olha|repara|mostra)\b/i.test(input);

      if (isVisual && active && canvasRef.current) {
        response = await analyzeFrameWithAI(canvasRef.current, input, undefined, chatHistory);
      } else {
        response = await chatWithAI(input, chatHistory);
      }

      const aiText = response.text || response.description || "Entendido.";
      const aiMessage: ChatMessage = {
        role: "ai",
        text: aiText,
        time: new Date().toLocaleTimeString()
      };
      setChatHistory(prev => [...prev, aiMessage]);

      if (source === "voice") {
        await speak(aiText);
      }
    } catch (err) {
      toast.error("Erro ao processar comando");
    } finally {
      setIsProcessing(false);
      isProcessingRef.current = false;
    }
  }, [active, canvasRef, chatHistory, speak]);

  return {
    chatHistory,
    isProcessing,
    processInput
  };
}
