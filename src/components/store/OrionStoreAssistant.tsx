import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import ReactMarkdown from "react-markdown";
import { processOrionRequest } from "@/lib/neural/orion-brain";

interface OrionStoreAssistantProps {
  productTitle: string;
  productDescription?: string;
  productPrice?: number;
}

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function OrionStoreAssistant({ productTitle, productDescription, productPrice }: OrionStoreAssistantProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async () => {
    const question = input.trim();
    if (!question || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    setLoading(true);

    try {
      const priceStr = productPrice ? `R$ ${(productPrice / 100).toFixed(2)}` : "N/A";
      const fullPrompt = `Pergunta sobre o produto "${productTitle}". Descrição: ${productDescription || "N/A"}. Preço: ${priceStr}. Pergunta do usuário: ${question}`;

      const response = await processOrionRequest(fullPrompt, {
        source: "text",
        conversationContext: `Produto: ${productTitle}`
      });

      setMessages((prev) => [...prev, { role: "assistant", content: response.response }]);
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Desculpe, meu núcleo neural está processando outras informações no momento. Tente novamente." }]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 left-6 z-50 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-2xl transition-all hover:scale-105 bg-primary text-primary-foreground"
      >
        <MessageCircle className="h-5 w-5" />
        <span className="text-sm font-medium hidden sm:inline">Dúvidas? Pergunte ao Orion</span>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 left-6 z-50 w-[360px] max-w-[calc(100vw-48px)] bg-card border border-border/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
      style={{ maxHeight: "480px" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-primary/5">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <div>
            <p className="text-sm font-semibold text-foreground">Orion Assistente</p>
            <p className="text-[10px] text-muted-foreground">Governança Pentagon Ativa</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3" style={{ minHeight: "200px" }}>
        {messages.length === 0 && (
          <div className="text-center py-8">
            <Bot className="h-10 w-10 text-primary/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              Pergunte sobre <span className="text-foreground font-medium">{productTitle}</span>
            </p>
            <div className="mt-3 space-y-1.5">
              {["O que está incluído?", "Tem garantia?", "Como funciona o acesso?"].map((q) => (
                <button
                  key={q}
                  onClick={() => { setInput(q); }}
                  className="block w-full text-xs px-3 py-1.5 rounded-lg bg-muted/50 text-muted-foreground hover:bg-muted transition-colors text-left"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-foreground"
            }`}>
              {msg.role === "assistant" ? (
                <div className="prose prose-sm prose-invert max-w-none">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-xl px-3 py-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border/30">
        <form onSubmit={(e) => { e.preventDefault(); sendMessage(); }} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Sua dúvida..."
            className="text-xs h-9"
            disabled={loading}
          />
          <Button type="submit" size="icon" className="h-9 w-9 shrink-0" disabled={loading || !input.trim()}>
            <Send className="h-3.5 w-3.5" />
          </Button>
        </form>
      </div>
    </div>
  );
}
