import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Loader2, Sparkles, Cpu, Target, BarChart3, Zap } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface Props {
  context: string;
}

export function OrionProductInsights({ context }: Props) {
  const [insights, setInsights] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateInsights = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("orion-produtor-ai", {
        body: { action: "analyze_performance", context },
      });
      if (error) throw error;
      setInsights(data.result);
    } catch (err: any) {
      toast.error("Erro no processamento preditivo: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-[hsl(270,60%,50%,0.3)] bg-gradient-to-b from-card to-[hsl(270,60%,50%,0.04)] min-h-[200px] flex flex-col relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-[0.03]">
         <Target className="h-24 w-24 text-primary" />
      </div>

      <CardHeader className="pb-3 flex flex-row items-center justify-between border-b border-border/40">
        <CardTitle className="text-xs font-bold uppercase tracking-[0.2em] flex items-center gap-2 text-primary">
          <BarChart3 className="h-3.5 w-3.5" />
          Growth Intelligence Engine
        </CardTitle>
        <Button
          size="sm"
          variant="outline"
          onClick={generateInsights}
          disabled={loading}
          className="h-7 gap-1.5 text-[9px] uppercase tracking-widest border-primary/20 hover:bg-primary/10 transition-all"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
          {insights ? "Re-Calcular ROI" : "Analisar Métricas"}
        </Button>
      </CardHeader>

      <CardContent className="flex-1 p-4 relative">
        <ScrollArea className="h-full">
          {!insights && !loading && (
            <div className="py-6 flex flex-col items-center justify-center text-center space-y-3">
              <Sparkles className="h-6 w-6 text-primary/30 animate-pulse" />
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
                Pronto para análise de performance de mercado
              </p>
            </div>
          )}

          {loading && (
            <div className="py-12 flex flex-col items-center justify-center space-y-4">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full animate-pulse" />
                <Loader2 className="h-6 w-6 animate-spin text-primary relative" />
              </div>
              <p className="text-[9px] font-mono animate-pulse uppercase tracking-[0.3em]">Auditing Sales Data...</p>
            </div>
          )}

          {insights && !loading && (
            <div className="text-xs text-muted-foreground leading-relaxed animate-in fade-in duration-500 font-sans">
              <div className="p-3 rounded border border-primary/10 bg-primary/5 mb-3">
                 <p className="text-[9px] font-bold uppercase tracking-tighter text-primary mb-1">PROPOSTA DE ESCALABILIDADE</p>
                 <div className="text-foreground font-medium">
                    {insights}
                 </div>
              </div>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
