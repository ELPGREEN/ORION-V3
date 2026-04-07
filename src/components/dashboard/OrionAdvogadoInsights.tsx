import { useState } from "react";
import { Bot, Loader2, RefreshCw, Sparkles } from "lucide-react";
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
      toast({ title: "Erro ao buscar insights", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Bot className="h-4 w-4 text-primary" />
          Orion Insights
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={fetchInsights} disabled={loading} className="gap-1 text-xs">
          {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          {insights ? "Atualizar" : "Gerar Insights"}
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[240px]">
          {!insights && !loading && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Sparkles className="h-8 w-8 text-primary/40 mb-3" />
              <p className="text-sm text-muted-foreground">Clique em "Gerar Insights" para que o Orion analise seus prazos e pendências do dia.</p>
            </div>
          )}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span className="ml-2 text-sm text-muted-foreground">Analisando...</span>
            </div>
          )}
          {insights && !loading && (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown>{insights}</ReactMarkdown>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
