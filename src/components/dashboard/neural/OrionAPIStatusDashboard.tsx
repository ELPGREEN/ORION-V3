/**
 * ─── Orion API Status Dashboard ───
 * Real-time dashboard showing health of all 22+ APIs across 5 capabilities.
 */
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { RefreshCw, Wifi, WifiOff, Loader2, Zap, Eye, Ear, Mic, Brain, ScanFace, Atom } from "lucide-react";
import {
  getOrchestratorSnapshot,
  refreshAllHealth,
  type OrchestratorSnapshot,
  type OrionAPI,
  type APIHealth,
  type OrionCapability,
} from "@/lib/neural/orion-api-orchestrator";

const CAPABILITY_CONFIG: Record<OrionCapability, { icon: typeof Eye; color: string; label: string }> = {
  vision: { icon: Eye, color: "text-[hsl(var(--tron-info))]", label: "Visão Computacional" },
  hearing: { icon: Ear, color: "text-[hsl(var(--tron-neon))]", label: "Audição (STT)" },
  speech: { icon: Mic, color: "text-[hsl(var(--tron-neon-soft))]", label: "Fala (TTS)" },
  reasoning: { icon: Brain, color: "text-amber-400", label: "Raciocínio (LLMs)" },
  face_recognition: { icon: ScanFace, color: "text-rose-400", label: "Reconhecimento Facial" },
  quantum_compute: { icon: Atom, color: "text-[hsl(var(--tron-neon))]", label: "Computação Quântica" },
};

const HEALTH_BADGE: Record<APIHealth, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  online: { label: "Online", variant: "default" },
  loading: { label: "Carregando", variant: "secondary" },
  offline: { label: "Offline", variant: "outline" },
  error: { label: "Erro", variant: "destructive" },
  unknown: { label: "Desconhecido", variant: "outline" },
};

const RUNTIME_LABELS: Record<string, string> = {
  local_wasm: "🔧 WASM Local",
  local_webgl: "🎮 WebGL Local",
  local_browser: "🌐 Browser Nativo",
  local_dsp: "🎵 DSP Local",
  cloud: "☁️ Cloud",
  edge_function: "⚡ Edge Function",
};

function APICard({ api }: { api: OrionAPI }) {
  const badge = HEALTH_BADGE[api.health];
  const isOnline = api.health === "online";

  return (
    <div className={`flex items-center justify-between p-2.5 rounded-lg border transition-colors ${
      isOnline ? "border-green-500/20 bg-green-500/5" :
      api.health === "loading" ? "border-yellow-500/20 bg-yellow-500/5" :
      api.health === "error" ? "border-red-500/20 bg-red-500/5" :
      "border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))] bg-muted/30"
    }`}>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full shrink-0 ${
            isOnline ? "bg-green-500" :
            api.health === "loading" ? "bg-yellow-500 animate-pulse" :
            api.health === "error" ? "bg-red-500" : "bg-muted-foreground/30"
          }`} />
          <span className="text-xs font-medium text-foreground truncate">{api.brandName}</span>
        </div>
        <div className="flex items-center gap-2 mt-1 ml-4">
          <span className="text-[10px] text-muted-foreground">{RUNTIME_LABELS[api.runtime] || api.runtime}</span>
          <span className="text-[10px] text-muted-foreground">•</span>
          <span className="text-[10px] text-muted-foreground truncate">{api.library}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {api.lastLatencyMs > 0 && (
          <span className="text-[10px] text-muted-foreground">{api.lastLatencyMs}ms</span>
        )}
        <Badge variant={badge.variant} className="text-[9px] px-1.5 py-0 h-4">
          {badge.label}
        </Badge>
      </div>
    </div>
  );
}

export function OrionAPIStatusDashboard() {
  const [snapshot, setSnapshot] = useState<OrchestratorSnapshot | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(() => {
    setRefreshing(true);
    refreshAllHealth();
    setSnapshot(getOrchestratorSnapshot());
    setTimeout(() => setRefreshing(false), 500);
  }, []);

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 15_000);
    return () => clearInterval(interval);
  }, [refresh]);

  if (!snapshot) {
    return (
      <div className="flex items-center justify-center h-40">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  const onlinePercent = Math.round((snapshot.onlineAPIs / snapshot.totalAPIs) * 100);

  return (
    <div className="space-y-4">
      {/* Summary Bar */}
      <Card className="bg-[hsl(var(--tron-bg-deep))] text-[hsl(var(--tron-neon))] border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Orion API Orchestrator</h3>
                <p className="text-[10px] text-muted-foreground">
                  {snapshot.onlineAPIs}/{snapshot.totalAPIs} APIs online • Score: {snapshot.systemHealth.overallScore}/100
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={refresh}
              disabled={refreshing}
              className="h-8 w-8 p-0"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
            </Button>
          </div>
          <Progress value={onlinePercent} className="h-2" />
          <div className="flex justify-between mt-2">
            <span className="text-[10px] text-muted-foreground">Disponibilidade</span>
            <span className="text-[10px] font-medium text-foreground">{onlinePercent}%</span>
          </div>
        </CardContent>
      </Card>

      {/* Capability Cards */}
      <div className="grid gap-3">
        {snapshot.capabilities.map((cap) => {
          const config = CAPABILITY_CONFIG[cap.capability];
          const Icon = config.icon;
          const onlineCount = cap.apis.filter(a => a.health === "online").length;

          return (
            <Card key={cap.capability} className="overflow-hidden">
              <CardHeader className="pb-2 pt-3 px-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className={`h-4 w-4 ${config.color}`} />
                    <CardTitle className="text-sm">{config.label}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-muted-foreground">
                      {onlineCount}/{cap.apis.length}
                    </span>
                    {cap.overallHealth === "online" ? (
                      <Wifi className="h-3.5 w-3.5 text-[hsl(var(--tron-neon))]" />
                    ) : cap.overallHealth === "loading" ? (
                      <Loader2 className="h-3.5 w-3.5 text-[hsl(var(--tron-warn))] animate-spin" />
                    ) : (
                      <WifiOff className="h-3.5 w-3.5 text-[hsl(var(--tron-danger))]" />
                    )}
                  </div>
                </div>
                {cap.activeAPI && (
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Ativo: <span className="text-foreground font-medium">{cap.activeAPI}</span>
                    {cap.activeTier && ` (${cap.activeTier})`}
                  </p>
                )}
              </CardHeader>
              <CardContent className="px-4 pb-3 space-y-1.5">
                {cap.apis.map((api) => (
                  <APICard key={api.id} api={api} />
                ))}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* System Alerts */}
      {snapshot.systemHealth.alerts.length > 0 && (
        <Card className="bg-[hsl(var(--tron-bg-deep))] text-[hsl(var(--tron-neon))] border-yellow-500/30">
          <CardHeader className="pb-2 pt-3 px-4">
            <CardTitle className="text-sm text-[hsl(var(--tron-warn))]">⚠️ Alertas do Sistema</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="space-y-1">
              {snapshot.systemHealth.alerts.map((alert, i) => (
                <p key={i} className="text-[11px] text-muted-foreground">{alert}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
