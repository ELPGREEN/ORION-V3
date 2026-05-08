import { useState, useCallback } from "react";
import { orionBrain } from "@/lib/neural/orion-brain";
import { toast } from "sonner";

export interface UseOrionChatOptions {
  autoSpeak?: boolean;
  onPanelOpen?: (panel: string) => void;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export function useOrionChat(options: UseOrionChatOptions = {}) {
  const { autoSpeak = false, onPanelOpen } = options;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const sendMessage = useCallback(async (input: string): Promise<void> => {
    if (!input.trim() || isProcessing) return;
    
    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", content: input, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setIsProcessing(true);
    
    try {
      const response = await orionBrain({ input, stream: autoSpeak });
      const assistantId = (Date.now() + 1).toString();
      const assistantMsg: ChatMessage = { id: assistantId, role: "assistant", content: response.response, timestamp: Date.now() };
      setMessages((prev) => [...prev, assistantMsg]);
      
      if (response.panel && onPanelOpen) onPanelOpen(response.panel);
      
      if (autoSpeak && response.stream) {
        const { streamOrionSpeech } = await import("@/lib/tts/geminiTTS");
        const abort = new AbortController();
        const [s1, s2] = response.stream.tee();

        const updateUI = async () => {
          const reader = s1.getReader();
          const decoder = new TextDecoder();
          let fullText = "";
          try {
            while(true) {
              const {done, value} = await reader.read();
              if(done) break;
              const chunk = decoder.decode(value);
              const lines = chunk.split("\n");
              for(const line of lines) {
                if(line.startsWith("data: ")) {
                  try {
                    const data = JSON.parse(line.slice(6));
                    if(data.type === "token") {
                      fullText += data.content;
                      setMessages(prev => prev.map(m => m.id === assistantId ? {...m, content: fullText} : m));
                    }
                  } catch{}
                }
              }
            }
          } finally { reader.releaseLock(); }
        };
        updateUI();

        await streamOrionSpeech(s2 as any, "Enceladus", abort.signal);
      } else if (autoSpeak && response.response) {
        const utterance = new SpeechSynthesisUtterance(response.response);
        utterance.lang = "pt-BR";
        speechSynthesis.speak(utterance);
      }
      
    } catch (error) {
      console.error("[OrionChat]", error);
      toast.error("Erro ao processar mensagem");
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, autoSpeak, onPanelOpen]);

  return { messages, isProcessing, sendMessage, clearChat: () => setMessages([]), getHelp: () => "Help", getStatus: () => "Status" };
}

export function useOrionVoice(opts?: any) {
  return useOrionChat(opts);
}

export function useSectorDetector() {
  return { detect: () => "geral" };
}
