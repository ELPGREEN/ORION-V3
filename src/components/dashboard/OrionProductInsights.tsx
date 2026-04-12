import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain, Loader2, Sparkles } from "lucide-react";
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
      toast.error("Erro ao gerar insights: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-card/80 border-primary/20">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          Orion Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {insights ? (
          <div className="text-sm text-muted-foreground whitespace-pre-wrap">{insights}</div>
        ) : (
          <p className="text-xs text-muted-foreground">Clique para receber insights sobre seu desempenho</p>
        )}
        <Button
          size="sm"
          variant="outline"
          onClick={generateInsights}
          disabled={loading}
          className="gap-1"
        >
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          {insights ? "Atualizar Insights" : "Gerar Insights"}
        </Button>
      </CardContent>
    </Card>
  );
}
