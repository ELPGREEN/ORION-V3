import { useState, useEffect, useRef } from "react";
import { Send, Loader2, Sparkles, User, Bot, Shield, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { processOrionRequest } from "@/lib/neural/orion-brain";
import { logNeural } from "@/lib/neural/neural-telemetry-hub";

export default function ChatHumano() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [aiTyping, setAiTyping] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMsg = { id: Date.now(), role: "user", content: input };
    setMessages(prev => [...prev, userMsg]);
    const text = input;
    setInput("");

    // Simulação de Secretaria IA integrada ao Pentagon
    setAiTyping(true);
    try {
      const res = await processOrionRequest(text, {
        source: "text",
        conversationContext: "Chat ao Vivo / Secretaria IA"
      });

      const assistantMsg = { id: Date.now() + 1, role: "assistant", content: res.response };
      setMessages(prev => [...prev, assistantMsg]);

      logNeural({
        interaction_type: "chat_humano_secretaria_v3",
        input_text: text,
        output_text: res.response,
        user_id: user?.id,
        metadata: { agent: res.agentUsed, mode: "pentagon_gate" }
      });
    } catch (err: any) {
      toast({ title: "Erro de Mediação Neural", description: err.message, variant: "destructive" });
    } finally {
      setAiTyping(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-background">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="container max-w-3xl space-y-4">
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 flex items-center gap-3">
             <Shield className="h-5 w-5 text-primary" />
             <p className="text-xs text-muted-foreground">
               Este chat é mediado pela **Secretaria Inteligente Orion V3**. Sua privacidade e governança são garantidas pelo protocolo Pentagon.
             </p>
          </div>

          {messages.map((m) => (
            <div key={m.id} className={`flex gap-3 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "assistant" && (
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
              )}
              <Card className={`p-3 text-sm max-w-[80%] ${m.role === "user" ? "bg-primary text-primary-foreground" : "bg-card"}`}>
                {m.content}
              </Card>
            </div>
          ))}

          {aiTyping && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center animate-pulse">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="flex items-center gap-2">
                <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-mono">Secretária Processando...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="p-4 border-t bg-background">
        <div className="container max-w-3xl flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Fale com a secretaria ou aguarde um advogado..."
          />
          <Button onClick={handleSend} disabled={!input.trim() || loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
