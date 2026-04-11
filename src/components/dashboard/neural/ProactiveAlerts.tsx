import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { AlertTriangle, Bell, CheckCircle2, Clock, TrendingUp, Shield, Brain, X, Volume2, Play, EyeOff, Loader2, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { speakWithGeminiTTS } from "@/lib/tts/geminiTTS";
import { toast } from "sonner";

// ═══════════════════════════════════════════════════════════
// R.A.G ELP PROACTIVE ALERTS — Intelligent notification system
// Monitors neural health, deadlines, and system anomalies
// ═══════════════════════════════════════════════════════════

interface Alert {
  id: string;
  type: "warning" | "info" | "success" | "critical";
  title: string;
  description: string;
  timestamp: Date;
  category: "neural" | "deadline" | "system" | "learning";
  dismissed: boolean;
  actionLabel?: string;
  actionUrl?: string;
  canExecute?: boolean;
  canIgnore?: boolean;
  executeLabel?: string;
  pendingCount?: number;
}

export function ProactiveAlerts() {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const speak = async (text: string) => {
    try {
      const r = await speakWithGeminiTTS(text, "Charon");
      if (r.played) return;
    } catch {}
  };

  useEffect(() => {
    if (user?.id) {
      generateAlerts();
      const interval = setInterval(generateAlerts, 120000); // Refresh every 2 min
      return () => clearInterval(interval);
    }
  }, [user?.id]);

  async function generateAlerts() {
    if (!user?.id) return;
    setLoading(true);
    const newAlerts: Alert[] = [];

    try {
      // 1. Check unprocessed knowledge items (use RPC for accurate vector null count)
      const { data: unprocessedCount } = await supabase
        .rpc("count_items_needing_embeddings");
      const unprocessed = unprocessedCount || 0;

      if (unprocessed && unprocessed > 10) {
        newAlerts.push({
          id: "unprocessed-knowledge",
          type: "warning",
          title: `${unprocessed} itens aguardando embeddings`,
          description: "A base de conhecimento tem itens não processados. O pipeline de embeddings deve processá-los automaticamente.",
          timestamp: new Date(),
          category: "neural",
          dismissed: false,
          canExecute: true,
          executeLabel: "Processar Agora",
          pendingCount: unprocessed,
        });
      }

      // 2. Check pending evolution proposals
      const { count: pendingEvolutions } = await supabase
        .from("neural_evolution_proposals")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      if (pendingEvolutions && pendingEvolutions > 5) {
        newAlerts.push({
          id: "pending-evolutions",
          type: "info",
          title: `${pendingEvolutions} propostas de evolução pendentes`,
          description: "O sistema gerou propostas de melhoria que aguardam aprovação automática ou manual.",
          timestamp: new Date(),
          category: "learning",
          dismissed: false,
          actionLabel: "Ver Evoluções",
          actionUrl: "/dashboard/rede-neural",
          canExecute: true,
          canIgnore: true,
          executeLabel: "Executar Todas",
          pendingCount: pendingEvolutions,
        });
      }

      // 3. Check upcoming deadlines (processos)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      const { data: urgentProcessos } = await supabase
        .from("processos")
        .select("numero_processo, cliente_nome, ultima_movimentacao")
        .eq("user_id", user.id)
        .eq("status", "ativo")
        .order("ultima_movimentacao", { ascending: true })
        .limit(5);

      if (urgentProcessos) {
        const stale = urgentProcessos.filter(p => {
          if (!p.ultima_movimentacao) return true;
          const lastMov = new Date(p.ultima_movimentacao);
          const daysSince = (Date.now() - lastMov.getTime()) / (1000 * 60 * 60 * 24);
          return daysSince > 30;
        });

        if (stale.length > 0) {
          newAlerts.push({
            id: "stale-processos",
            type: "warning",
            title: `${stale.length} processo(s) sem movimentação há +30 dias`,
            description: `Processos: ${stale.map(p => p.numero_processo).join(", ")}`,
            timestamp: new Date(),
            category: "deadline",
            dismissed: false,
            actionLabel: "Ver Processos",
            actionUrl: "/dashboard/processos",
          });
        }
      }

      // 4. Check AI provider health
      const { data: providers } = await supabase
        .from("ai_providers")
        .select("display_name, is_enabled")
        .eq("is_enabled", true);

      if (!providers || providers.length === 0) {
        newAlerts.push({
          id: "no-providers",
          type: "critical",
          title: "Nenhum provedor de IA ativo",
          description: "Todos os provedores estão desabilitados. O chat IA e geração de documentos não funcionarão.",
          timestamp: new Date(),
          category: "system",
          dismissed: false,
          actionLabel: "Configurar Provedores",
          actionUrl: "/dashboard/rede-neural",
        });
      }

      // 5. Check recent AI errors
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { data: recentAiFailures, count: recentErrors } = await supabase
        .from("ai_metrics")
        .select("provider, error_message", { count: "exact" })
        .eq("success", false)
        .gte("created_at", oneDayAgo)
        .limit(20);

      if (recentErrors && recentErrors > 5) {
        const cronAuthErrors = recentAiFailures?.filter((failure) =>
          failure.provider === "cron" && failure.error_message?.includes("401")
        ) ?? [];

        const isOnlyCronAuthIssue = cronAuthErrors.length === recentErrors;

        newAlerts.push({
          id: "ai-errors",
          type: "warning",
          title: `${recentErrors} erros de IA nas últimas 24h`,
          description: isOnlyCronAuthIssue
            ? "As falhas vieram do cron interno por autenticação 401, não de quota dos provedores."
            : "Taxa de erros elevada. Verifique os logs das edge functions e quotas dos provedores.",
          timestamp: new Date(),
          category: "system",
          dismissed: false,
        });
      }

      // 6. System all-clear
      if (newAlerts.length === 0) {
        newAlerts.push({
          id: "all-clear",
          type: "success",
          title: "Todos os sistemas operacionais",
          description: "Nenhuma anomalia detectada. Rede Neural funcionando normalmente.",
          timestamp: new Date(),
          category: "system",
          dismissed: false,
        });
      }
    } catch (err) {
    }

    setAlerts(newAlerts);
    setLoading(false);
  }

  const dismiss = (id: string) => {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, dismissed: true } : a));
  };

  const [executing, setExecuting] = useState(false);
  const [ignoring, setIgnoring] = useState(false);
  const [processingEmbeddings, setProcessingEmbeddings] = useState(false);

  const processEmbeddings = async () => {
    if (!user?.id) {
      toast.error("Você precisa estar logado para processar embeddings.");
      return;
    }
    setProcessingEmbeddings(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Sessão expirada. Faça login novamente.");
        return;
      }
      const { data, error } = await supabase.functions.invoke("generate-embeddings", {
        body: { batchSize: 50, target: "neural" },
      });
      if (error) throw error;
      const processed = data?.neural?.processed || 0;
      const failed = data?.neural?.failed || 0;
      const remaining = data?.remaining?.neural || 0;
      if (processed > 0) {
        toast.success(`✅ ${processed} embeddings processados! ${remaining} restantes.`);
      } else if (failed > 0) {
        toast.warning(`⚠️ ${failed} falhas. Verifique as chaves do motor neural nas configurações.`);
      } else {
        toast.info("Nenhum item pendente para processar.");
      }
      generateAlerts();
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("401") || msg.includes("Não autorizado")) {
        toast.error("Erro de autenticação. Faça logout e login novamente.");
      } else {
        toast.error(`Erro: ${msg || "Falha na invocação"}`);
      }
    } finally {
      setProcessingEmbeddings(false);
    }
  };

  const executeEvolutions = async () => {
    setExecuting(true);
    try {
      const { error } = await supabase
        .from("neural_evolution_proposals")
        .update({ status: "approved", approved_at: new Date().toISOString(), approved_by: user?.id } as any)
        .eq("status", "pending");

      if (error) throw error;
      toast.success("Todas as propostas foram aprovadas e serão aplicadas automaticamente.");
      dismiss("pending-evolutions");
      generateAlerts();
    } catch (err) {
      toast.error("Erro ao executar propostas de evolução.");
    } finally {
      setExecuting(false);
    }
  };

  const ignoreEvolutions = async () => {
    setIgnoring(true);
    try {
      const { error } = await supabase
        .from("neural_evolution_proposals")
        .update({ status: "rejected" })
        .eq("status", "pending");

      if (error) throw error;
      toast.success("Propostas pendentes foram ignoradas.");
      dismiss("pending-evolutions");
      generateAlerts();
    } catch (err) {
      toast.error("Erro ao ignorar propostas.");
    } finally {
      setIgnoring(false);
    }
  };

  const announceAlerts = () => {
    const active = alerts.filter(a => !a.dismissed);
    if (active.length === 0) {
      speak("Todos os sistemas estão operacionais, senhor.");
      return;
    }
    const summary = active.map(a => a.title).join(". ");
    speak(`Atenção. ${active.length} alerta${active.length > 1 ? 's' : ''} ativo${active.length > 1 ? 's' : ''}. ${summary}`);
  };

  const getIcon = (type: Alert["type"]) => {
    switch (type) {
      case "critical": return <AlertTriangle className="h-4 w-4 text-red-400" />;
      case "warning": return <AlertTriangle className="h-4 w-4 text-amber-400" />;
      case "success": return <CheckCircle2 className="h-4 w-4 text-green-400" />;
      default: return <Bell className="h-4 w-4 text-cyan-400" />;
    }
  };

  const getBorderColor = (type: Alert["type"]) => {
    switch (type) {
      case "critical": return "border-red-500/30 bg-red-500/5";
      case "warning": return "border-amber-500/30 bg-amber-500/5";
      case "success": return "border-green-500/30 bg-green-500/5";
      default: return "border-cyan-500/30 bg-cyan-500/5";
    }
  };

  const activeAlerts = alerts.filter(a => !a.dismissed);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Shield className="h-4 w-4 text-cyan-400" />
            R.A.G ELP — Alertas Proativos
            {activeAlerts.length > 0 && (
              <Badge variant="outline" className="text-[9px] ml-1">
                {activeAlerts.length} ativo{activeAlerts.length > 1 ? "s" : ""}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-cyan-400 hover:bg-cyan-400/10" onClick={announceAlerts} title="Anunciar alertas por voz">
              <Volume2 className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-[10px]" onClick={generateAlerts}>
              Atualizar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <Brain className="h-5 w-5 animate-pulse text-cyan-400" />
            <span className="text-xs text-muted-foreground ml-2">Analisando sistemas...</span>
          </div>
        ) : activeAlerts.length === 0 ? (
          <div className="text-center py-3">
            <CheckCircle2 className="h-5 w-5 text-green-400 mx-auto mb-1" />
            <span className="text-xs text-muted-foreground">Todos os alertas foram resolvidos</span>
          </div>
        ) : (
          activeAlerts.map(alert => (
            <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-lg border ${getBorderColor(alert.type)}`}>
              <div className="mt-0.5">{getIcon(alert.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium text-foreground">{alert.title}</span>
                  <Badge variant="outline" className="text-[8px]">{alert.category}</Badge>
                </div>
                <p className="text-[10px] text-muted-foreground">{alert.description}</p>
                {alert.actionLabel && !alert.canExecute && (
                  <a href={alert.actionUrl} className="text-[10px] text-cyan-400 hover:underline mt-1 inline-block">
                    {alert.actionLabel} →
                  </a>
                )}
                {alert.canExecute && alert.id === "pending-evolutions" && (
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      size="sm"
                      className="h-6 text-[10px] px-3 bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30"
                      onClick={executeEvolutions}
                      disabled={executing || ignoring}
                    >
                      <Play className="h-3 w-3 mr-1" />
                      {executing ? "Executando..." : (alert.executeLabel || "Executar")}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-[10px] px-3 text-muted-foreground hover:text-foreground"
                      onClick={ignoreEvolutions}
                      disabled={executing || ignoring}
                    >
                      <EyeOff className="h-3 w-3 mr-1" />
                      {ignoring ? "Ignorando..." : "Ignorar Todas"}
                    </Button>
                    {alert.actionUrl && (
                      <a href={alert.actionUrl} className="text-[10px] text-cyan-400 hover:underline">
                        {alert.actionLabel} →
                      </a>
                    )}
                  </div>
                )}
                {alert.canExecute && alert.id === "unprocessed-knowledge" && (
                  <div className="flex items-center gap-2 mt-2">
                    <Button
                      size="sm"
                      className="h-6 text-[10px] px-3 bg-primary/20 text-primary hover:bg-primary/30 border border-primary/30"
                      onClick={processEmbeddings}
                      disabled={processingEmbeddings}
                    >
                      {processingEmbeddings ? (
                        <><Loader2 className="h-3 w-3 mr-1 animate-spin" />Processando...</>
                      ) : (
                        <><Zap className="h-3 w-3 mr-1" />Processar Agora</>
                      )}
                    </Button>
                  </div>
                )}
              </div>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground" onClick={() => dismiss(alert.id)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
