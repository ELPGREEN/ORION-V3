import { useState, useEffect, useCallback } from "react";
import { Shield, ShieldAlert, ShieldCheck, ShieldOff, Bug, Fingerprint, Wifi, Clock, AlertTriangle, Ban, Zap, Lock, Eye, Database, Activity, Globe, Brain, BarChart3, Cpu, MonitorSpeaker, Search } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  getDefenseMetrics,
  getRecentThreats,
  onThreatDetected,
  activateMaxAlert,
  resetTarpit,
  fetchPersistedThreats,
  refreshThreatIntel,
  recheckPrivacyLeaks,
  type ThreatEvent,
  type DefenseMetrics,
} from "@/lib/neural/orion-defense-system";

const SEVERITY_CONFIG: Record<string, { color: string; bg: string; border: string; icon: typeof ShieldAlert; label: string }> = {
  probe: { color: "text-muted-foreground", bg: "bg-muted/30", border: "border-muted/30", icon: Eye, label: "Sonda" },
  attempt: { color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/30", icon: ShieldAlert, label: "Tentativa" },
  attack: { color: "text-destructive", bg: "bg-destructive/10", border: "border-destructive/30", icon: Bug, label: "Ataque" },
  critical: { color: "text-red-600", bg: "bg-red-600/10", border: "border-red-600/40", icon: Ban, label: "Crítico" },
};

const THREAT_TYPE_LABELS: Record<string, string> = {
  devtools: "DevTools Detectado",
  injection: "Injeção XSS/SQL",
  injection_url: "URL Maliciosa",
  rate_limit: "Rate Limit Excedido",
  burst_detected: "Burst Detectado",
  bot_detected: "Bot (Honeypot)",
  bot_behavioral: "Bot (Biometria)",
  storage_tampering: "Adulteração Storage",
  dom_tampering: "Adulteração DOM",
  session_hijack: "Sequestro de Sessão",
  critical_tampering: "Adulteração Crítica",
  brute_force: "Força Bruta",
  scraping: "Scraping",
  manual_ban: "Ban Manual",
  max_alert: "Alerta Máximo",
  webrtc_leak: "WebRTC Leak",
  dns_leak: "DNS Leak",
  threat_intel: "Threat Intelligence",
  iframe_embed: "Iframe Embed",
  script_injection: "Script Injetado",
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return `${diff}s atrás`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m atrás`;
  return `${Math.floor(diff / 3600)}h atrás`;
}

function ScoreGauge({ label, value, size = "sm" }: { label: string; value: number; size?: "sm" | "lg" }) {
  const color = value > 70 ? "text-green-500" : value > 40 ? "text-yellow-500" : "text-destructive";
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`${size === "lg" ? "text-3xl" : "text-xl"} font-bold font-mono ${color}`}>{value}</div>
      <Progress value={value} className={`${size === "lg" ? "w-24" : "w-16"} h-1`} />
    </div>
  );
}

export function OrionShieldPanel() {
  const [metrics, setMetrics] = useState<DefenseMetrics>(getDefenseMetrics());
  const [threats, setThreats] = useState<ThreatEvent[]>(getRecentThreats(30));
  const [persistedThreats, setPersistedThreats] = useState<ThreatEvent[]>([]);
  const [viewMode, setViewMode] = useState<"live" | "history">("live");
  const [pulse, setPulse] = useState(false);
  const [checkingIntel, setCheckingIntel] = useState(false);
  const [checkingPrivacy, setCheckingPrivacy] = useState(false);

  const refreshData = useCallback(() => {
    setMetrics(getDefenseMetrics());
    setThreats(getRecentThreats(30));
  }, []);

  const loadHistory = useCallback(async () => {
    const data = await fetchPersistedThreats(50);
    setPersistedThreats(data);
  }, []);

  const handleRefreshIntel = useCallback(async () => {
    setCheckingIntel(true);
    await refreshThreatIntel();
    refreshData();
    setCheckingIntel(false);
  }, [refreshData]);

  useEffect(() => {
    refreshData();
    loadHistory();
    const interval = setInterval(refreshData, 5000);

    const unsub = onThreatDetected((event) => {
      setThreats(prev => [...prev.slice(-29), event]);
      setMetrics(getDefenseMetrics());
      setPulse(true);
      setTimeout(() => setPulse(false), 2000);
    });

    return () => {
      clearInterval(interval);
      unsub();
    };
  }, [refreshData, loadHistory]);

  const shieldStatus = metrics.totalThreats === 0
    ? "clean"
    : metrics.attacks > 0 || metrics.critical > 0
      ? "under_attack"
      : metrics.attempts > 0
        ? "alert"
        : "monitoring";

  const displayThreats = viewMode === "live" ? threats : persistedThreats;

  const statusConfig = {
    clean: { icon: ShieldCheck, label: "Limpo — Sem Ameaças", color: "text-green-500", glow: "shadow-green-500/20" },
    monitoring: { icon: Shield, label: "Monitorando — Sondas Detectadas", color: "text-yellow-500", glow: "shadow-yellow-500/20" },
    alert: { icon: ShieldAlert, label: "Alerta — Tentativas Detectadas", color: "text-orange-500", glow: "shadow-orange-500/20" },
    under_attack: { icon: ShieldOff, label: "Sob Ataque — Contramedidas Ativas", color: "text-destructive", glow: "shadow-red-500/30" },
  };

  const status = statusConfig[shieldStatus];
  const StatusIcon = status.icon;
  const bp = metrics.behavioralProfile;
  const intel = metrics.threatIntel;

  return (
    <div className="space-y-4">
      {/* Shield Status Hero */}
      <Card className={`bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))] relative overflow-hidden ${pulse ? "ring-1 ring-primary/50" : ""} transition-all duration-500`}>
        <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary/40" />
        <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-primary/40" />
        <CardContent className="pt-6 pb-5">
          <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
            <div className={`relative flex items-center justify-center h-20 w-20 sm:h-24 sm:w-24 border border-primary/20 ${status.glow} shadow-lg ${pulse ? "animate-pulse" : ""}`}>
              <StatusIcon className={`h-10 w-10 sm:h-12 sm:w-12 ${status.color} transition-colors`} />
              <div className="absolute -top-px -left-px w-2.5 h-2.5 border-t border-l border-primary/60" />
              <div className="absolute -bottom-px -right-px w-2.5 h-2.5 border-b border-r border-primary/60" />
              {shieldStatus === "under_attack" && (
                <div className="absolute inset-0 border border-destructive/40 animate-ping" style={{ animationDuration: "2s" }} />
              )}
            </div>

            <div className="flex-1 text-center sm:text-left">
              <h3 className={`text-lg font-semibold ${status.color}`}>{status.label}</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Orion Defense System v2.1 — 14 camadas de defesa ativas
              </p>
              <div className="flex flex-wrap gap-3 mt-3 justify-center sm:justify-start">
                {[
                  { label: "Honeypot", active: true },
                  { label: "Tarpit", active: metrics.tarpitActive },
                  { label: "DOM Fortress", active: metrics.domFortressActive },
                  { label: "CSP", active: metrics.cspActive },
                  { label: "Biometrics", active: true },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5 text-xs">
                    <div className={`h-2 w-2 rounded-full ${l.active ? "bg-green-500" : "bg-muted-foreground/30"} ${l.active && l.label === "Tarpit" ? "animate-pulse" : ""}`} />
                    <span className="text-muted-foreground">{l.label}:</span>
                    <span className="text-foreground font-medium">{l.active ? "Ativo" : "Standby"}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Anomaly Score */}
            <div className="flex flex-col items-center gap-1">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Anomaly Score</div>
              <div className={`text-3xl font-bold font-mono ${metrics.anomalyScore > 60 ? "text-destructive" : metrics.anomalyScore > 20 ? "text-yellow-500" : "text-green-500"}`}>
                {metrics.anomalyScore}
              </div>
              <Progress value={metrics.anomalyScore} className="w-24 h-1.5" />
              <div className="text-[9px] text-muted-foreground">de 100</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: "Total Ameaças", value: metrics.totalThreats, icon: AlertTriangle, color: "text-primary" },
          { label: "Bloqueadas", value: metrics.blocked, icon: ShieldCheck, color: "text-green-500" },
          { label: "Sondas (1h)", value: metrics.probes, icon: Eye, color: "text-muted-foreground" },
          { label: "Tentativas (1h)", value: metrics.attempts, icon: ShieldAlert, color: "text-yellow-500" },
          { label: "Ataques (1h)", value: metrics.attacks, icon: Bug, color: "text-destructive" },
          { label: "Críticos (1h)", value: metrics.critical, icon: Ban, color: "text-red-600" },
        ].map((item) => (
          <Card key={item.label} className="bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]">
            <CardContent className="pt-3 pb-2.5 px-3">
              <div className="flex items-center gap-1.5 mb-1">
                <item.icon className={`h-3 w-3 ${item.color}`} />
                <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-wider">{item.label}</span>
              </div>
              <p className={`text-2xl font-bold font-mono ${item.value > 0 ? item.color : "text-foreground"}`}>{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Behavioral Biometrics + Threat Intel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Behavioral Biometrics */}
        <Card className="bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              Biometria Comportamental
            </CardTitle>
            <CardDescription className="text-[10px]">Análise de mouse, teclado e scroll para detectar bots</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-around mb-4">
              <ScoreGauge label="Mouse" value={bp.mouseScore} />
              <ScoreGauge label="Teclado" value={bp.keystrokeScore} />
              <ScoreGauge label="Scroll" value={bp.scrollScore} />
              <ScoreGauge label="Humano" value={bp.humanProbability} size="lg" />
            </div>
            <div className="flex items-center justify-center gap-2 pt-2 border-t border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]">
              <div className={`h-2.5 w-2.5 rounded-full ${bp.humanProbability > 50 ? "bg-green-500" : bp.humanProbability > 25 ? "bg-yellow-500" : "bg-destructive animate-pulse"}`} />
              <span className="text-xs text-muted-foreground">
                {bp.humanProbability > 50 ? "Comportamento humano confirmado" : bp.humanProbability > 25 ? "Comportamento suspeito — monitorando" : "Provável bot detectado"}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Threat Intelligence */}
        <Card className="bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Globe className="h-4 w-4 text-primary" />
              Threat Intelligence
            </CardTitle>
            <CardDescription className="text-[10px]">Reputação de IP via APIs públicas</CardDescription>
          </CardHeader>
          <CardContent>
            {intel.checked ? (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-2 p-2 border border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]/30 bg-muted/10">
                    <span className="text-muted-foreground">IP:</span>
                    <span className="font-mono text-foreground">{intel.ip || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 border border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]/30 bg-muted/10">
                    <span className="text-muted-foreground">País:</span>
                    <span className="text-foreground">{intel.country || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 border border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]/30 bg-muted/10">
                    <span className="text-muted-foreground">ISP:</span>
                    <span className="text-foreground truncate">{intel.isp || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2 p-2 border border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]/30 bg-muted/10">
                    <span className="text-muted-foreground">Risco:</span>
                    <span className={`font-bold ${intel.abuseScore > 30 ? "text-destructive" : "text-green-500"}`}>{intel.abuseScore}%</span>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  {[
                    { label: "Proxy", value: intel.isProxy },
                    { label: "VPN/Hosting", value: intel.isVpn },
                    { label: "Tor", value: intel.isTor },
                  ].map(f => (
                    <div key={f.label} className="flex items-center gap-1.5 text-xs">
                      <div className={`h-2 w-2 rounded-full ${f.value ? "bg-destructive animate-pulse" : "bg-green-500"}`} />
                      <span className="text-muted-foreground">{f.label}:</span>
                      <span className={f.value ? "text-destructive font-bold" : "text-foreground"}>{f.value ? "SIM" : "Não"}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-4 text-muted-foreground">
                <Globe className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-xs">Verificação não realizada</p>
              </div>
            )}
            <Button variant="outline" size="sm" className="w-full mt-3 text-xs" onClick={handleRefreshIntel} disabled={checkingIntel}>
              <Activity className={`h-3.5 w-3.5 mr-1.5 ${checkingIntel ? "animate-spin" : ""}`} />
              {checkingIntel ? "Verificando..." : "Verificar Meu IP"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Actions + Threat Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Quick Actions */}
        <Card className="bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Ações de Defesa
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" size="sm" className="w-full text-xs justify-start gap-2 hover:border-destructive hover:text-destructive" onClick={() => { activateMaxAlert(); refreshData(); }}>
              <Lock className="h-3.5 w-3.5" /> Ativar Alerta Máximo
            </Button>
            <Button variant="outline" size="sm" className="w-full text-xs justify-start gap-2 hover:border-green-500 hover:text-green-500" onClick={() => { resetTarpit(); refreshData(); }}>
              <ShieldCheck className="h-3.5 w-3.5" /> Resetar Tarpit
            </Button>
            <Button variant="outline" size="sm" className="w-full text-xs justify-start gap-2" onClick={refreshData}>
              <Wifi className="h-3.5 w-3.5" /> Atualizar Métricas
            </Button>

            {/* Defense Layers v2 */}
            <div className="pt-3 border-t border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))] mt-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">14 Camadas de Defesa</p>
              {[
                { name: "Behavioral Biometrics", active: true },
                { name: "Threat Intelligence", active: intel.checked },
                { name: "CSP Enforcement", active: metrics.cspActive },
                { name: "Honeypot System", active: true },
                { name: "Rate Limiter (Sliding)", active: true },
                { name: "DOM Fortress", active: metrics.domFortressActive },
                { name: "Tarpit Engine", active: metrics.tarpitActive },
                { name: "Fingerprinting v2", active: true },
                { name: "Session Poisoning", active: true },
                { name: "Input Sanitizer", active: true },
                { name: "DevTools Detection", active: true },
                { name: "Anomaly Scoring", active: true },
                { name: "WebRTC Leak Guard", active: metrics.privacyLeaks.checked },
                { name: "DNS Leak Detection", active: metrics.privacyLeaks.checked },
              ].map((layer) => (
                <div key={layer.name} className="flex items-center justify-between py-1">
                  <span className="text-[11px] text-muted-foreground">{layer.name}</span>
                  <div className={`h-1.5 w-1.5 rounded-full ${layer.active ? "bg-green-500" : "bg-muted-foreground/30"}`} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Privacy Leaks */}
        <Card className="bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))] md:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <MonitorSpeaker className="h-4 w-4 text-primary" />
              Detecção de Leaks de Privacidade
            </CardTitle>
            <CardDescription className="text-[10px]">WebRTC leak + DNS leak detection em tempo real</CardDescription>
          </CardHeader>
          <CardContent>
            {metrics.privacyLeaks.checked ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* WebRTC */}
                <div className="p-3 border border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]/30 bg-muted/10 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${metrics.privacyLeaks.webrtcLeak.detected ? "bg-destructive animate-pulse" : "bg-green-500"}`} />
                    <span className="text-xs font-medium text-foreground">WebRTC Leak</span>
                    <Badge variant={metrics.privacyLeaks.webrtcLeak.detected ? "destructive" : "secondary"} className="text-[8px] px-1.5 h-4 ml-auto">
                      {metrics.privacyLeaks.webrtcLeak.detected ? "DETECTADO" : "SEGURO"}
                    </Badge>
                  </div>
                  {metrics.privacyLeaks.webrtcLeak.localIPs.length > 0 && (
                    <div className="text-[10px] text-muted-foreground">
                      <span className="text-foreground font-medium">IPs locais:</span>{" "}
                      {metrics.privacyLeaks.webrtcLeak.localIPs.join(", ")}
                    </div>
                  )}
                  {metrics.privacyLeaks.webrtcLeak.publicIP && (
                    <div className="text-[10px] text-muted-foreground">
                      <span className="text-foreground font-medium">IP público:</span>{" "}
                      <span className="font-mono">{metrics.privacyLeaks.webrtcLeak.publicIP}</span>
                    </div>
                  )}
                </div>

                {/* DNS */}
                <div className="p-3 border border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]/30 bg-muted/10 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className={`h-2.5 w-2.5 rounded-full ${metrics.privacyLeaks.dnsLeak.detected ? "bg-destructive animate-pulse" : "bg-green-500"}`} />
                    <span className="text-xs font-medium text-foreground">DNS Leak</span>
                    <Badge variant={metrics.privacyLeaks.dnsLeak.detected ? "destructive" : "secondary"} className="text-[8px] px-1.5 h-4 ml-auto">
                      {metrics.privacyLeaks.dnsLeak.detected ? "DETECTADO" : "SEGURO"}
                    </Badge>
                  </div>
                  {metrics.privacyLeaks.dnsLeak.resolvers.length > 0 && (
                    <div className="text-[10px] text-muted-foreground">
                      <span className="text-foreground font-medium">Resolvers:</span>{" "}
                      <span className="font-mono">{metrics.privacyLeaks.dnsLeak.resolvers.join(", ")}</span>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center py-4 text-muted-foreground">
                <Search className="h-8 w-8 mb-2 opacity-30" />
                <p className="text-xs">Verificação pendente</p>
              </div>
            )}
            <Button variant="outline" size="sm" className="w-full mt-3 text-xs" onClick={async () => { setCheckingPrivacy(true); await recheckPrivacyLeaks(); refreshData(); setCheckingPrivacy(false); }} disabled={checkingPrivacy}>
              <MonitorSpeaker className={`h-3.5 w-3.5 mr-1.5 ${checkingPrivacy ? "animate-spin" : ""}`} />
              {checkingPrivacy ? "Verificando..." : "Verificar Privacidade"}
            </Button>
          </CardContent>
        </Card>
        {/* Threat Log */}
        <Card className="bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))] lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-primary" />
                Log de Ameaças
                {displayThreats.length > 0 && (
                  <Badge variant="secondary" className="text-[8px] px-1.5 py-0 h-4">{displayThreats.length}</Badge>
                )}
              </CardTitle>
              <div className="flex gap-1">
                <Button variant={viewMode === "live" ? "default" : "outline"} size="sm" className="text-[10px] h-6 px-2" onClick={() => setViewMode("live")}>
                  <Wifi className="h-3 w-3 mr-1" /> Ao Vivo
                </Button>
                <Button variant={viewMode === "history" ? "default" : "outline"} size="sm" className="text-[10px] h-6 px-2" onClick={() => { setViewMode("history"); loadHistory(); }}>
                  <Database className="h-3 w-3 mr-1" /> Histórico
                </Button>
              </div>
            </div>
            <CardDescription className="text-[10px]">
              {viewMode === "live"
                ? `${threats.length} ameaças na sessão atual`
                : `${persistedThreats.length} ameaças persistidas no Supabase`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {displayThreats.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <ShieldCheck className="h-10 w-10 mb-3 text-green-500/50" />
                <p className="text-sm font-medium">Nenhuma ameaça detectada</p>
                <p className="text-[10px] mt-1">O sistema está monitorando ativamente com 12 camadas</p>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[400px] overflow-y-auto pr-1">
                {[...displayThreats].reverse().map((threat) => {
                  const config = SEVERITY_CONFIG[threat.severity] || SEVERITY_CONFIG.probe;
                  const ThreatIcon = config.icon;
                  return (
                    <div key={threat.id} className={`flex items-start gap-2.5 p-2.5 border ${config.border} ${config.bg} transition-colors hover:brightness-110`}>
                      <ThreatIcon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${config.color}`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-medium text-foreground">{THREAT_TYPE_LABELS[threat.type] || threat.type}</span>
                          <Badge variant="outline" className={`text-[8px] px-1 py-0 h-3.5 ${config.color} border-current`}>{config.label}</Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-0.5 truncate">{threat.details}</p>
                        <div className="flex items-center gap-3 mt-1 text-[9px] text-muted-foreground/70">
                          <span className="flex items-center gap-1">
                            <Clock className="h-2.5 w-2.5" />
                            {formatTime(threat.timestamp)} ({timeAgo(threat.timestamp)})
                          </span>
                          <span>→ {threat.countermeasure}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
