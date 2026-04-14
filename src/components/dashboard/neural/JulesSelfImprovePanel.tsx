/**
 * Orion Auto-Evolution Dashboard Panel v4
 * With tabs (Subsystems, Bugs, Performance, Design, Security, Industrial),
 * health gauges, scan button, activity viewer, DB sessions, industrial robotics.
 */

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { isCreatorVerified } from "@/lib/neural/jules-client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Bot, GitPullRequest, AlertTriangle, CheckCircle2, RefreshCw, Send,
  Cpu, Eye, Mic, Volume2, Wifi, Activity, Clock, Loader2,
  Shield, Zap, Palette, Bug, Scan, Factory, Wrench,
} from "lucide-react";
import {
  julesClient, orionSelfImprove, checkJulesRateLimit,
  getJulesDBSessions, type JulesDBSession, type JulesActivity,
} from "@/lib/neural/jules-client";
import { getSubsystemFailureStatus, resetSubsystemFailures } from "@/lib/neural/jules-auto-triggers";
import { startJulesPolling, stopJulesPolling } from "@/lib/neural/jules-session-poller";
import { runFullScan, getHealthScore, startAutoScan, stopAutoScan, type ScanResult } from "@/lib/neural/jules-evolution-engine";
import { getImmuneStats } from "@/lib/neural/jules-immune-system";
import {
  getRegisteredDevices, triggerIndustrialAutoProgram,
  type IndustrialDomain, type IoTDevice,
} from "@/lib/neural/jules-orion-fusion";
import { computeIndustrialMetrics, scanIndustrialHealth } from "@/lib/neural/jules-industrial-scanner";
import { toast } from "sonner";

const SUBSYSTEM_ICONS: Record<string, { icon: typeof Cpu; label: string; group: string }> = {
  tf_continuous_learning: { icon: Cpu, label: "TF Continuous Learning", group: "TensorFlow" },
  tf_predictive: { icon: Cpu, label: "TF Predictive", group: "TensorFlow" },
  tf_mlops: { icon: Cpu, label: "TF MLOps", group: "TensorFlow" },
  tf_inference: { icon: Cpu, label: "TF Inference", group: "TensorFlow" },
  tf_model_monitoring: { icon: Activity, label: "TF Monitoring", group: "TensorFlow" },
  onnx_yolo: { icon: Eye, label: "YOLO ONNX", group: "Vision" },
  vision_gemini: { icon: Eye, label: "Gemini Vision", group: "Vision" },
  vision_mediapipe: { icon: Eye, label: "MediaPipe", group: "Vision" },
  stt_gcp: { icon: Mic, label: "GCP STT", group: "Voice" },
  stt_webspeech: { icon: Mic, label: "Web Speech STT", group: "Voice" },
  tts_gemini: { icon: Volume2, label: "Gemini TTS", group: "Voice" },
  tts_webspeech: { icon: Volume2, label: "Web Speech TTS", group: "Voice" },
  iot_mqtt: { icon: Wifi, label: "MQTT", group: "IoT" },
  iot_bluetooth: { icon: Wifi, label: "Bluetooth", group: "IoT" },
  iot_smart_home: { icon: Wifi, label: "Smart Home", group: "IoT" },
  iot_ros2: { icon: Wifi, label: "ROS2", group: "IoT" },
  core_routing: { icon: Bug, label: "Routing", group: "Core" },
  core_state: { icon: Bug, label: "State", group: "Core" },
  core_auth: { icon: Shield, label: "Auth", group: "Core" },
  core_api: { icon: Bug, label: "API", group: "Core" },
  perf_bundle: { icon: Zap, label: "Bundle", group: "Performance" },
  perf_render: { icon: Zap, label: "Render", group: "Performance" },
  perf_memory: { icon: Zap, label: "Memory", group: "Performance" },
  perf_network: { icon: Zap, label: "Network", group: "Performance" },
  design_responsive: { icon: Palette, label: "Responsive", group: "Design" },
  design_accessibility: { icon: Palette, label: "Accessibility", group: "Design" },
  design_animation: { icon: Palette, label: "Animation", group: "Design" },
  sec_rls: { icon: Shield, label: "RLS", group: "Security" },
  sec_xss: { icon: Shield, label: "XSS", group: "Security" },
  sec_injection: { icon: Shield, label: "Injection", group: "Security" },
  sec_auth_flow: { icon: Shield, label: "Auth Flow", group: "Security" },
  industrial_welding: { icon: Factory, label: "Soldagem", group: "Industrial" },
  industrial_assembly: { icon: Wrench, label: "Montagem", group: "Industrial" },
  industrial_painting: { icon: Palette, label: "Pintura", group: "Industrial" },
  industrial_inspection: { icon: Eye, label: "Inspeção", group: "Industrial" },
  industrial_palletization: { icon: Factory, label: "Paletização", group: "Industrial" },
  industrial_adaptive_mfg: { icon: Cpu, label: "Manufatura Adaptativa", group: "Industrial" },
  industrial_protocol_bridge: { icon: Wifi, label: "Protocol Bridge", group: "Industrial" },
  industrial_safety: { icon: Shield, label: "Segurança Industrial", group: "Industrial" },
};

const DOMAIN_LABELS: Record<IndustrialDomain, string> = {
  welding: "Soldagem",
  assembly: "Montagem",
  painting: "Pintura",
  inspection: "Inspeção",
  palletization: "Paletização",
  adaptive_manufacturing: "Manufatura Adaptativa",
};

// ─── Sub-components ───

function StatusBadge({ status, resolved }: { status: string; resolved: boolean | null }) {
  if (status === "completed" && resolved === true) return <Badge className="text-[10px] px-1.5 py-0 bg-green-600/20 text-green-400 border-green-500/30">Resolvido</Badge>;
  if (status === "completed" && resolved === false) return <Badge className="text-[10px] px-1.5 py-0 bg-red-600/20 text-red-400 border-red-500/30">Não resolvido</Badge>;
  if (status === "completed") return <Badge className="text-[10px] px-1.5 py-0 bg-blue-600/20 text-blue-400 border-blue-500/30">PR criado</Badge>;
  if (status === "running") return <Badge className="text-[10px] px-1.5 py-0 bg-yellow-600/20 text-yellow-400 border-yellow-500/30">Em andamento</Badge>;
  if (status === "failed") return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Falhou</Badge>;
  return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Pendente</Badge>;
}

function HealthGauge({ label, score, icon: Icon }: { label: string; score: number; icon: typeof Cpu }) {
  const color = score >= 80 ? "text-green-400" : score >= 50 ? "text-yellow-400" : "text-red-400";
  const bg = score >= 80 ? "bg-green-500/20" : score >= 50 ? "bg-yellow-500/20" : "bg-red-500/20";
  return (
    <div className={`flex items-center gap-2 rounded-lg px-3 py-2 ${bg}`}>
      <Icon className={`h-4 w-4 ${color}`} />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-medium">{label}</div>
        <div className="w-full bg-muted/50 rounded-full h-1.5 mt-1">
          <div className={`h-1.5 rounded-full ${score >= 80 ? "bg-green-500" : score >= 50 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${score}%` }} />
        </div>
      </div>
      <span className={`text-sm font-bold ${color}`}>{score}</span>
    </div>
  );
}

function ActivityTimeline({ sessionId }: { sessionId: string }) {
  const [activities, setActivities] = useState<JulesActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    julesClient.listActivities(sessionId, 20).then((res) => {
      if (res.success && res.data?.activities) setActivities(res.data.activities);
      setLoading(false);
    });
  }, [sessionId]);

  if (loading) return <div className="flex items-center gap-1 text-xs text-muted-foreground py-1"><Loader2 className="h-3 w-3 animate-spin" />Carregando...</div>;
  if (activities.length === 0) return <div className="text-xs text-muted-foreground py-1">Sem atividades ainda</div>;

  return (
    <div className="space-y-1 pl-2 border-l border-border/50">
      {activities.map((a, i) => (
        <div key={i} className="text-[11px] text-muted-foreground">
          <span className="font-medium text-foreground/80">{a.role || "system"}: </span>
          {a.content?.slice(0, 120) || a.name}
        </div>
      ))}
    </div>
  );
}

function ScanDomainTab({ results, domain }: { results: ScanResult | undefined; domain: string }) {
  if (!results) return <div className="text-xs text-muted-foreground text-center py-4">Execute um scan para ver resultados</div>;
  if (results.issues.length === 0) return (
    <div className="text-center py-4">
      <CheckCircle2 className="h-5 w-5 mx-auto mb-1 text-green-500" />
      <span className="text-xs text-muted-foreground">Nenhum problema detectado em {domain}</span>
    </div>
  );
  return (
    <div className="space-y-1.5">
      {results.issues.map((issue, i) => (
        <div key={i} className="flex items-start gap-2 rounded-md bg-muted/30 px-2 py-1.5 text-xs">
          <Badge variant={issue.severity === "critical" ? "destructive" : issue.severity === "high" ? "destructive" : "secondary"} className="text-[10px] px-1.5 py-0 shrink-0">
            {issue.severity}
          </Badge>
          <div className="min-w-0">
            <div className="font-medium">{issue.message}</div>
            {issue.context && <div className="text-muted-foreground text-[10px] mt-0.5 font-mono break-all">{issue.context.slice(0, 150)}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}

function IndustrialTab() {
  const [triggering, setTriggering] = useState<string | null>(null);
  const devices = getRegisteredDevices();
  const metrics = computeIndustrialMetrics();
  const industrialScan = scanIndustrialHealth();

  const handleTrigger = async (domain: IndustrialDomain) => {
    setTriggering(domain);
    try {
      const result = await triggerIndustrialAutoProgram({
        domain,
        description: `Auto-program ${domain} subsystem`,
        devices: devices.filter((d) => d.status === "online"),
        priority: "high",
      });
      if (result.success) {
        toast.success(`Orion Industrial: ${DOMAIN_LABELS[domain]}`, { description: `Sessão criada: ${result.sessionId.slice(0, 8)}...` });
      } else {
        toast.error("Erro", { description: result.error });
      }
    } catch { toast.error("Falha ao disparar Orion Industrial"); }
    setTriggering(null);
  };

  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground flex items-center gap-1">
        <Factory className="h-3.5 w-3.5" />
        {devices.length} dispositivos IoT registrados • {devices.filter((d) => d.status === "online").length} online
      </div>

      {industrialScan.issues.length > 0 && (
        <div className="space-y-1">
          {industrialScan.issues.map((issue, i) => (
            <div key={i} className="flex items-center gap-2 rounded-md bg-red-500/10 px-2 py-1.5 text-xs">
              <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />
              <span>{issue.message}</span>
            </div>
          ))}
        </div>
      )}

      {metrics.length > 0 ? (
        <div className="space-y-1.5">
          {metrics.map((m) => (
            <div key={m.domain} className="flex items-center justify-between rounded-md bg-muted/30 px-2 py-1.5 text-xs">
              <div className="flex items-center gap-1.5">
                <Factory className="h-3.5 w-3.5" />
                <span className="font-medium">{DOMAIN_LABELS[m.domain]}</span>
                <Badge variant="outline" className="text-[9px] px-1 py-0">
                  {m.devicesOnline}/{m.devicesTotal} online
                </Badge>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`text-[10px] font-mono ${m.safetyScore >= 80 ? "text-green-400" : m.safetyScore >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                  {m.safetyScore}%
                </span>
                <Button
                  variant="ghost" size="icon" className="h-5 w-5"
                  disabled={triggering === m.domain}
                  onClick={() => handleTrigger(m.domain)}
                  title={`Disparar Orion para ${DOMAIN_LABELS[m.domain]}`}
                >
                  {triggering === m.domain ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-4 text-xs text-muted-foreground">
          <Factory className="h-5 w-5 mx-auto mb-1 opacity-50" />
          Nenhum dispositivo industrial registrado.
          <br />Use <code className="text-[10px] bg-muted/50 px-1 rounded">registerIoTDevice()</code> para conectar.
        </div>
      )}

      {devices.length > 0 && (
        <div className="grid grid-cols-3 gap-1">
          {(Object.keys(DOMAIN_LABELS) as IndustrialDomain[]).map((domain) => (
            <Button
              key={domain}
              variant="outline"
              size="sm"
              className="text-[10px] h-7"
              disabled={!!triggering}
              onClick={() => handleTrigger(domain)}
            >
              {DOMAIN_LABELS[domain]}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Panel ───

export function JulesSelfImprovePanel() {
  const { user } = useAuth();
  const isCreator = isCreatorVerified({ email: user?.email });
  const [dbSessions, setDbSessions] = useState<JulesDBSession[]>([]);
  const [failures, setFailures] = useState<ReturnType<typeof getSubsystemFailureStatus>>({});
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [manualTask, setManualTask] = useState("");
  const [sending, setSending] = useState(false);
  const [rateLimit, setRateLimit] = useState({ current: 0, max: 3 });
  const [scanResults, setScanResults] = useState<ScanResult[]>([]);
  const [health, setHealth] = useState(getHealthScore());
  const [immune, setImmune] = useState(getImmuneStats());

  const refresh = useCallback(async () => {
    setLoading(true);
    setFailures(getSubsystemFailureStatus());
    setHealth(getHealthScore());
    setImmune(getImmuneStats());
    try {
      const [sessions, rl] = await Promise.all([getJulesDBSessions(15), checkJulesRateLimit()]);
      setDbSessions(sessions);
      setRateLimit({ current: rl.current, max: 3 });
    } catch {}
    setLoading(false);
  }, []);

  const handleScan = async () => {
    setScanning(true);
    try {
      const results = await runFullScan();
      setScanResults(results);
      setHealth(getHealthScore());
      toast.success("Scan completo", { description: `Score geral: ${getHealthScore().overall}/100` });
      refresh();
    } catch { toast.error("Erro no scan"); }
    setScanning(false);
  };

  useEffect(() => {
    refresh();
    startJulesPolling();
    startAutoScan();

    const handlePR = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      toast.success("Orion criou um PR!", {
        description: detail?.prTitle || detail?.prUrl,
        action: detail?.prUrl ? { label: "Abrir", onClick: () => window.open(detail.prUrl, "_blank") } : undefined,
      });
      refresh();
    };

    window.addEventListener("jules:pr-ready", handlePR);
    return () => {
      stopJulesPolling();
      stopAutoScan();
      window.removeEventListener("jules:pr-ready", handlePR);
    };
  }, [refresh]);


  const handleManualTrigger = async () => {
    if (!manualTask.trim() || !isCreator) return;
    setSending(true);
    const result = await orionSelfImprove({ task: manualTask, autoPR: true, callerIdentity: { email: user?.email } });
    if (result.success) {
      toast.success("Orion ativado", { description: "Sessão de auto-evolução criada" });
      setManualTask("");
      refresh();
    } else {
      toast.error("Erro", { description: result.error });
    }
    setSending(false);
  };

  const failureEntries = Object.entries(failures).filter(([, v]) => v.count > 0);
  const getScanDomain = (d: string) => scanResults.find((r) => r.domain === d);

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bot className="h-5 w-5 text-primary" />
          Orion Auto-Evolução
          <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0">
            {rateLimit.current}/{rateLimit.max}/h
          </Badge>
          {immune.antibodyCount > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-green-400 border-green-500/30">
              🛡 {immune.antibodyCount} anticorpos
            </Badge>
          )}
          {immune.quarantinedModules.length > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-red-400 border-red-500/30">
              ⚠ {immune.quarantinedModules.length} em quarentena
            </Badge>
          )}
          <div className="ml-auto flex gap-1">
            {isCreator && (
              <Button variant="ghost" size="icon" onClick={handleScan} disabled={scanning} className="h-7 w-7" title="Scan agora">
                <Scan className={`h-4 w-4 ${scanning ? "animate-spin" : ""}`} />
              </Button>
            )}
            <Button variant="ghost" size="icon" onClick={refresh} disabled={loading} className="h-7 w-7">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Health Gauges */}
        <div className="grid grid-cols-2 gap-2">
          <HealthGauge label="Bugs" score={health.bugs} icon={Bug} />
          <HealthGauge label="Performance" score={health.performance} icon={Zap} />
          <HealthGauge label="Design" score={health.design} icon={Palette} />
          <HealthGauge label="Segurança" score={health.security} icon={Shield} />
        </div>

        {/* Tabs */}
        <Tabs defaultValue="subsystems" className="w-full">
          <TabsList className="w-full grid grid-cols-6 h-8">
            <TabsTrigger value="subsystems" className="text-[10px] px-1">Subsistemas</TabsTrigger>
            <TabsTrigger value="bugs" className="text-[10px] px-1">Bugs</TabsTrigger>
            <TabsTrigger value="perf" className="text-[10px] px-1">Perf</TabsTrigger>
            <TabsTrigger value="design" className="text-[10px] px-1">Design</TabsTrigger>
            <TabsTrigger value="security" className="text-[10px] px-1">Security</TabsTrigger>
            <TabsTrigger value="industrial" className="text-[10px] px-1">🏭 Indústria</TabsTrigger>
          </TabsList>

          <TabsContent value="subsystems" className="mt-2">
            {failureEntries.length > 0 ? (
              <div className="space-y-1">
                {failureEntries.map(([key, val]) => {
                  const meta = SUBSYSTEM_ICONS[key];
                  const Icon = meta?.icon || Activity;
                  return (
                    <div key={key} className="flex items-center justify-between rounded-md bg-muted/50 px-2 py-1 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5" />
                        <span>{meta?.label || key}</span>
                        <Badge variant="outline" className="text-[9px] px-1 py-0">{meta?.group}</Badge>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant={val.count >= 3 ? "destructive" : "secondary"} className="text-[10px] px-1.5 py-0">{val.count}x</Badge>
                        {val.julesTriggered && (
                          <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-green-500 border-green-500/30">
                            <GitPullRequest className="h-2.5 w-2.5 mr-0.5" /> PR
                          </Badge>
                        )}
                        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => { resetSubsystemFailures(key as any); setFailures(getSubsystemFailureStatus()); }}>
                          <CheckCircle2 className="h-3 w-3 text-green-500" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center text-xs text-muted-foreground py-3">
                <CheckCircle2 className="h-4 w-4 mx-auto mb-1 text-green-500" />
                Todos os subsistemas operando sem falhas
              </div>
            )}
          </TabsContent>

          <TabsContent value="bugs" className="mt-2"><ScanDomainTab results={getScanDomain("bugs")} domain="Bugs" /></TabsContent>
          <TabsContent value="perf" className="mt-2"><ScanDomainTab results={getScanDomain("performance")} domain="Performance" /></TabsContent>
          <TabsContent value="design" className="mt-2"><ScanDomainTab results={getScanDomain("design")} domain="Design" /></TabsContent>
          <TabsContent value="security" className="mt-2"><ScanDomainTab results={getScanDomain("security")} domain="Security" /></TabsContent>
          <TabsContent value="industrial" className="mt-2"><IndustrialTab /></TabsContent>
        </Tabs>

        {/* DB Sessions */}
        {dbSessions.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <GitPullRequest className="h-3.5 w-3.5" />
              Sessões Orion ({dbSessions.length})
            </h4>
            <ScrollArea className="max-h-48">
              <Accordion type="single" collapsible className="space-y-1">
                {dbSessions.map((s) => (
                  <AccordionItem key={s.session_id} value={s.session_id} className="border-none">
                    <AccordionTrigger className="py-1.5 px-2 rounded-md bg-muted/30 hover:bg-muted/50 text-xs hover:no-underline">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <StatusBadge status={s.status} resolved={s.resolved} />
                        <span className="truncate max-w-[160px]">{s.title || s.prompt?.slice(0, 40)}</span>
                        {s.pr_url && (
                          <a href={s.pr_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-0.5 ml-auto mr-2" onClick={(e) => e.stopPropagation()}>
                            <GitPullRequest className="h-3 w-3" /> PR
                          </a>
                        )}
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 px-2">
                      <div className="space-y-2 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(s.created_at).toLocaleString("pt-BR")}
                          {s.subsystem && <Badge variant="outline" className="text-[10px] px-1 py-0 ml-1">{s.subsystem}</Badge>}
                        </div>
                        {s.error_snapshot && <div className="bg-muted/50 rounded p-1.5 text-[11px] font-mono break-all">{s.error_snapshot.slice(0, 200)}</div>}
                        <ActivityTimeline sessionId={s.session_id} />
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </ScrollArea>
          </div>
        )}

        {/* Manual Trigger */}
        {isCreator ? (
          <div className="space-y-1.5">
            <h4 className="text-sm font-medium text-muted-foreground">Trigger Manual</h4>
            <Textarea
              placeholder="Descreva a melhoria ou correção que o Orion deve fazer..."
              value={manualTask}
              onChange={(e) => setManualTask(e.target.value)}
              className="text-xs min-h-[60px] resize-none"
            />
            <Button
              size="sm"
              onClick={handleManualTrigger}
              disabled={sending || !manualTask.trim() || rateLimit.current >= rateLimit.max}
              className="w-full text-xs"
            >
              {sending ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
              {rateLimit.current >= rateLimit.max ? "Rate limit atingido" : "Enviar para Orion"}
            </Button>
          </div>
        ) : (
          <div className="text-xs text-muted-foreground text-center py-2">
            🔒 Controles de auto-evolução restritos ao criador
          </div>
        )}
      </CardContent>
    </Card>
  );
}
