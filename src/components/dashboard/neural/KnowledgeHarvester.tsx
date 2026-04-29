import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Brain, Zap, CheckCircle, XCircle, Loader2, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { AUTOCOGNITIVE_PROTOCOLS, AutocognitiveProtocolId } from "@/lib/neural/autocognitive-protocols";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface HarvestDetail {
  topic: string;
  bestProvider: string;
  qualityScore: number;
  inserted: boolean;
}

interface HarvestSummary {
  totalTopics: number;
  successfulHarvests: number;
  insertedCount: number;
  avgQuality: number;
  providerStats: Record<string, { available: boolean; successRate: number; avgLatency: number }>;
  trainingResult: unknown;
}

export function KnowledgeHarvester() {
  const [topics, setTopics] = useState(
    "Explique habeas corpus no direito brasileiro\nO que é LGPD e quais são os princípios fundamentais?\nQuais são os requisitos para usucapião extraordinária?"
  );
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [summary, setSummary] = useState<HarvestSummary | null>(null);
  const [details, setDetails] = useState<HarvestDetail[]>([]);
  const [triggerTraining, setTriggerTraining] = useState(true);
  const [selectedProtocol, setSelectedProtocol] = useState<AutocognitiveProtocolId | "none">("none");

  const startHarvest = async () => {
    const topicList = topics.split("\n").map((t) => t.trim()).filter(Boolean);
    if (topicList.length === 0) {
      toast.error("Adicione pelo menos um tópico");
      return;
    }

    setLoading(true);
    setProgress(10);
    setSummary(null);
    setDetails([]);

    try {
      setProgress(30);

      const { data, error } = await supabase.functions.invoke("neural-knowledge-harvester", {
        body: {
          topics: topicList,
          triggerTraining,
          batchSize: 20,
          protocol: selectedProtocol === "none" ? undefined : selectedProtocol,
        },
      });

      setProgress(90);

      if (error) {
        toast.error("Erro no harvester: " + error.message);
        return;
      }

      if (data?.success) {
        setSummary(data.summary);
        setDetails(data.details || []);
        toast.success(
          `Coleta concluída! ${data.summary.insertedCount}/${data.summary.totalTopics} inseridos (qualidade média: ${(data.summary.avgQuality * 100).toFixed(0)}%)`
        );
      } else {
        toast.error(data?.error || "Erro desconhecido");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha na coleta");
    } finally {
      setProgress(100);
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Brain className="h-5 w-5 text-primary" />
            Knowledge Harvester — Coleta Multi-LLM
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium text-muted-foreground mb-1 block">
                Tópicos de Treino (um por linha)
              </label>
              <Textarea
                value={topics}
                onChange={(e) => setTopics(e.target.value)}
                rows={6}
                placeholder="Explique habeas corpus..."
                className="font-mono text-sm"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground mb-1 block flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Protocolo Autocognitivo
              </label>
              <Select
                value={selectedProtocol}
                onValueChange={(v) => setSelectedProtocol(v as any)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um protocolo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum (Coleta Simples)</SelectItem>
                  {Object.values(AUTOCOGNITIVE_PROTOCOLS).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex flex-col text-left">
                        <span className="font-medium">{p.name}</span>
                        <span className="text-[10px] text-muted-foreground leading-tight">{p.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedProtocol !== "none" && (
                <div className="p-3 bg-primary/5 border border-primary/20 rounded-md text-[11px] font-mono text-primary animate-in fade-in slide-in-from-top-1">
                  <p className="font-bold mb-1 uppercase tracking-tighter">Estrutura Esperada:</p>
                  {AUTOCOGNITIVE_PROTOCOLS[selectedProtocol].expectedOutput}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={triggerTraining}
                onChange={(e) => setTriggerTraining(e.target.checked)}
                className="rounded"
              />
              Disparar treino neural após coleta
            </label>
          </div>

          {loading && <Progress value={progress} className="h-2" />}

          <Button onClick={startHarvest} disabled={loading} className="w-full">
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Coletando de múltiplas IAs...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                Iniciar Coleta ({topics.split("\n").filter(Boolean).length} tópicos)
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {summary && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resultado da Coleta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{summary.totalTopics}</div>
                <div className="text-xs text-muted-foreground">Tópicos</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold text-primary">{summary.insertedCount}</div>
                <div className="text-xs text-muted-foreground">Inseridos</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{(summary.avgQuality * 100).toFixed(0)}%</div>
                <div className="text-xs text-muted-foreground">Qualidade Média</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-2xl font-bold">{summary.successfulHarvests}</div>
                <div className="text-xs text-muted-foreground">Sucessos</div>
              </div>
            </div>

            {/* Provider stats */}
            <div className="space-y-1">
              <div className="text-sm font-medium">Provedores</div>
              {Object.entries(summary.providerStats).map(([name, stats]) => (
                <div key={name} className="flex items-center justify-between text-sm py-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={stats.available ? "default" : "secondary"} className="text-xs">
                      {name}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <span>{(stats.successRate * 100).toFixed(0)}% sucesso</span>
                    <span>{stats.avgLatency.toFixed(0)}ms</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {details.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalhes por Tópico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {details.map((d, i) => (
                <div key={i} className="flex items-start justify-between py-2 border-b border-border last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm truncate">{d.topic}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{d.bestProvider}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {(d.qualityScore * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  {d.inserted ? (
                    <CheckCircle className="h-4 w-4 text-primary flex-shrink-0 mt-1" />
                  ) : (
                    <XCircle className="h-4 w-4 text-destructive flex-shrink-0 mt-1" />
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
