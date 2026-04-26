import { useState } from "react";
import { Bot, Loader2, RefreshCw, Sparkles, Brain, Cpu, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function OrionAdvogadoInsights() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [insights, setInsights] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchInsights = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("orion-advogado-ai", {
        body: { action: "deadline_analysis", user_id: user.id },
      });
      if (error) throw error;
      setInsights(data?.result || "Sem insights disponíveis no momento.");
    } catch (err: any) {
      toast({ title: "Erro de Processamento Neural", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-[hsl(160,60%,40%,0.3)] bg-gradient-to-b from-card to-[hsl(160,60%,40%,0.03)] h-[320px] flex flex-col relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-2 opacity-5">
         <Brain className="h-24 w-24 text-primary" />
      </div>

      <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-border/40">
        <CardTitle className="text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2 text-primary">
          <Cpu className="h-3.5 w-3.5 animate-pulse" />
          Orion Neural Intelligence
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={fetchInsights}
          disabled={loading}
          className="h-7 gap-1.5 text-[9px] uppercase tracking-widest border-primary/20 hover:bg-primary/10 transition-all"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
          {insights ? "Re-Processar" : "Iniciar Escaneamento"}
        </Button>
      </CardHeader>

      <CardContent className="flex-1 p-0 overflow-hidden relative">
        <ScrollArea className="h-full p-4">
          {!insights && !loading && (
            <div className="flex flex-col items-center justify-center py-12 text-center space-y-4">
              <div className="p-4 rounded-full bg-primary/5 border border-primary/10 group-hover:scale-110 transition-transform duration-500">
                <Sparkles className="h-8 w-8 text-primary/40" />
              </div>
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">Otimização de Workflow Disponível</p>
                <p className="text-[10px] text-muted-foreground/60 max-w-[240px] mx-auto leading-relaxed">
                  Acione o núcleo Orion para análise preditiva de prazos e eficiência operacional.
                </p>
              </div>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-16 space-y-4">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                <Loader2 className="h-8 w-8 animate-spin text-primary relative" />
              </div>
              <div className="text-center space-y-1">
                 <p className="text-[10px] font-mono animate-pulse uppercase tracking-[0.3em]">Processing Logic...</p>
                 <p className="text-[8px] text-muted-foreground font-mono uppercase tracking-tighter opacity-50">Accessing Hybrid Cloud Infrastructure</p>
              </div>
            </div>
          )}

          {insights && !loading && (
            <div className="prose prose-xs dark:prose-invert max-w-none font-sans text-xs leading-relaxed animate-in fade-in duration-700">
              <ReactMarkdown
                components={{
                  p: ({ children }) => <p className="mb-2 text-muted-foreground last:mb-0">{children}</p>,
                  strong: ({ children }) => <strong className="text-foreground font-bold">{children}</strong>,
                  ul: ({ children }) => <ul className="list-disc pl-4 space-y-1 mb-2">{children}</ul>,
                  li: ({ children }) => <li className="text-muted-foreground">{children}</li>,
                }}
              >
                {insights}
              </ReactMarkdown>
            </div>
          )}
        </ScrollArea>

        {/* Decorative corner accent */}
        <div className="absolute bottom-0 right-0 w-12 h-12 bg-gradient-to-tl from-primary/10 to-transparent pointer-events-none opacity-20" />
      </CardContent>
    </Card>
  );
}
