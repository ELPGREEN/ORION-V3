import { useState, useEffect, useRef } from "react";
import { Send, Loader2, User, Sparkles, Copy, ThumbsUp, ThumbsDown, BookOpen, ExternalLink, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { processOrionRequest } from "@/lib/neural/orion-brain";
import { logNeural } from "@/lib/neural/neural-telemetry-hub";

interface ChatIAMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  sources?: any[];
  provider?: string;
  diagnostics?: any;
}

export default function ChatJuridico() {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatIAMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  const handleSend = async (overrideText?: string) => {
    const text = (overrideText || input).trim();
    if (!text || loading) return;

    const userMsg: ChatIAMessage = {
      id: Date.now().toString(),
      role: "user",
      content: text,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMsg]);
    if (!overrideText) setInput("");
    setLoading(true);

    try {
      // 🍕 Utilizando o Cérebro Central Orion (com Pentagon pre-pass)
      const res = await processOrionRequest(text, {
        source: "text",
        conversationContext: "Chat Jurídico Especializado"
      });

      const assistantMsg: ChatIAMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: res.response,
        timestamp: new Date(),
        provider: res.agentUsed,
      };

      setMessages(prev => [...prev, assistantMsg]);

      logNeural({
        interaction_type: "chat_juridico_v3",
        input_text: text,
        output_text: res.response,
        user_id: user?.id,
        metadata: { agent: res.agentUsed, confidence: res.confidence }
      });
    } catch (err: any) {
      toast({ title: "Erro na Rede Neural", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-120px)] bg-background">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="container max-w-3xl space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
              <div className="p-4 rounded-full bg-primary/10 border border-primary/20">
                <Sparkles className="h-10 w-10 text-primary" />
              </div>
              <div className="space-y-2">
                <h2 className="text-xl font-bold tracking-tight">Assistência Jurídica Orion V3</h2>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Raciocínio jurídico avançado com governança Pentagon e RAG integrado.
                </p>
              </div>
            </div>
          )}

          {messages.map((message) => (
            <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              {message.role === "assistant" && (
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
              <div className={`max-w-[85%] ${message.role === "user" ? "order-1" : "order-2"}`}>
                <Card className={`p-3 text-sm ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-card"}`}>
                  <ReactMarkdown className="prose prose-sm dark:prose-invert max-w-none">
                    {message.content}
                  </ReactMarkdown>
                </Card>
                {message.role === "assistant" && (
                   <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[9px] uppercase tracking-tighter opacity-70">
                        {message.provider || "Orion Core"}
                      </Badge>
                   </div>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <Loader2 className="h-4 w-4 animate-spin text-primary-foreground" />
              </div>
              <Card className="p-3 bg-muted/50 border-dashed animate-pulse">
                <span className="text-xs text-muted-foreground">Orion está processando o raciocínio jurídico...</span>
              </Card>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="p-4 border-t bg-background">
        <div className="container max-w-3xl flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder="Descreva seu caso jurídico ou dúvida..."
            className="min-h-[48px] max-h-[150px] resize-none"
          />
          <Button onClick={() => handleSend()} disabled={!input.trim() || loading} size="icon" className="h-[48px] w-[48px]">
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </div>
  );
}
