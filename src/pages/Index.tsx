import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Bot, Send, FileText, Scale, Shield, Sparkles, MessageSquare } from "lucide-react";

const Index = () => {
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!message.trim() || loading) return;
    const userMsg = message.trim();
    setMessage("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("chat-orion", {
        body: { message: userMsg },
      });

      if (error) throw error;
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data?.response || "Sem resposta." },
      ]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Erro: ${err.message}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const features = [
    { icon: Scale, title: "Análise Jurídica", desc: "IA especializada em direito brasileiro" },
    { icon: FileText, title: "Documentos", desc: "Geração e revisão de peças jurídicas" },
    { icon: Shield, title: "AML/KYC", desc: "Screening e compliance automatizado" },
    { icon: Sparkles, title: "Multi-IA", desc: "GPT, Claude, Gemini integrados" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 glass-panel sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center glow-primary">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground tracking-tight">ORION</h1>
            <p className="text-xs text-muted-foreground">Inteligência Jurídica Avançada</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {messages.length === 0 ? (
          /* Landing */
          <div className="space-y-10">
            <div className="text-center pt-12 space-y-4">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto glow-primary">
                <Bot className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-4xl font-bold text-foreground">
                Olá, sou o <span className="text-primary">ORION</span>
              </h2>
              <p className="text-muted-foreground text-lg max-w-xl mx-auto">
                Sua IA jurídica com acesso a legislação, jurisprudência e ferramentas avançadas de compliance.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {features.map((f) => (
                <Card key={f.title} className="glass-panel border-border/30 hover:border-primary/30 transition-colors cursor-pointer group">
                  <CardHeader className="pb-2">
                    <f.icon className="w-8 h-8 text-primary/70 group-hover:text-primary transition-colors" />
                  </CardHeader>
                  <CardContent>
                    <CardTitle className="text-sm text-foreground">{f.title}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">{f.desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Input */}
            <div className="max-w-2xl mx-auto">
              <div className="glass-panel p-3 flex gap-2 items-end">
                <Textarea
                  placeholder="Pergunte sobre legislação, jurisprudência, compliance..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
                  className="bg-transparent border-0 resize-none focus-visible:ring-0 text-foreground placeholder:text-muted-foreground min-h-[48px] max-h-[120px]"
                  rows={1}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!message.trim() || loading}
                  size="icon"
                  className="bg-primary hover:bg-primary/90 shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        ) : (
          /* Chat */
          <div className="max-w-2xl mx-auto space-y-4">
            <div className="space-y-4 pb-32">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}
                >
                  {msg.role === "assistant" && (
                    <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0 mt-1">
                      <Bot className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  <div
                    className={`rounded-xl px-4 py-3 max-w-[80%] ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "glass-panel text-foreground"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  </div>
                  {msg.role === "user" && (
                    <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0 mt-1">
                      <MessageSquare className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-primary animate-pulse" />
                  </div>
                  <div className="glass-panel rounded-xl px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" />
                      <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce [animation-delay:0.1s]" />
                      <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce [animation-delay:0.2s]" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Fixed input */}
            <div className="fixed bottom-0 left-0 right-0 bg-background/80 backdrop-blur-xl border-t border-border/50 p-4">
              <div className="max-w-2xl mx-auto flex gap-2 items-end">
                <Textarea
                  placeholder="Digite sua mensagem..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), sendMessage())}
                  className="bg-card border-border/50 resize-none focus-visible:ring-primary text-foreground placeholder:text-muted-foreground min-h-[48px] max-h-[120px]"
                  rows={1}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!message.trim() || loading}
                  size="icon"
                  className="bg-primary hover:bg-primary/90 shrink-0"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
