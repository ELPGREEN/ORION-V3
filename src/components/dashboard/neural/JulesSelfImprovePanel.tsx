/**
 * Jules Self-Improvement Dashboard Panel v2
 * With activity viewer, DB sessions, resolution badges, rate limit display.
 */

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Bot, GitPullRequest, AlertTriangle, CheckCircle2, RefreshCw, Send,
  Cpu, Eye, Mic, Volume2, Wifi, Activity, Clock, XCircle, Loader2,
} from "lucide-react";
import {
  julesClient, orionSelfImprove, checkJulesRateLimit,
  getJulesDBSessions, type JulesDBSession, type JulesActivity,
} from "@/lib/neural/jules-client";
import { getSubsystemFailureStatus, resetSubsystemFailures } from "@/lib/neural/jules-auto-triggers";
import { startJulesPolling, stopJulesPolling } from "@/lib/neural/jules-session-poller";
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
};

function StatusBadge({ status, resolved }: { status: string; resolved: boolean | null }) {
  if (status === "completed" && resolved === true) {
    return <Badge className="text-[10px] px-1.5 py-0 bg-green-600/20 text-green-400 border-green-500/30">Resolvido</Badge>;
  }
  if (status === "completed" && resolved === false) {
    return <Badge className="text-[10px] px-1.5 py-0 bg-red-600/20 text-red-400 border-red-500/30">Não resolvido</Badge>;
  }
  if (status === "completed") {
    return <Badge className="text-[10px] px-1.5 py-0 bg-blue-600/20 text-blue-400 border-blue-500/30">PR criado</Badge>;
  }
  if (status === "running") {
    return <Badge className="text-[10px] px-1.5 py-0 bg-yellow-600/20 text-yellow-400 border-yellow-500/30">Em andamento</Badge>;
  }
  if (status === "failed") {
    return <Badge variant="destructive" className="text-[10px] px-1.5 py-0">Falhou</Badge>;
  }
  return <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Pendente</Badge>;
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

export function JulesSelfImprovePanel() {
  const [dbSessions, setDbSessions] = useState<JulesDBSession[]>([]);
  const [failures, setFailures] = useState<ReturnType<typeof getSubsystemFailureStatus>>({});
  const [loading, setLoading] = useState(false);
  const [manualTask, setManualTask] = useState("");
  const [sending, setSending] = useState(false);
  const [rateLimit, setRateLimit] = useState({ current: 0, max: 3 });

  const refresh = useCallback(async () => {
    setLoading(true);
    setFailures(getSubsystemFailureStatus());
    try {
      const [sessions, rl] = await Promise.all([
        getJulesDBSessions(15),
        checkJulesRateLimit(),
      ]);
      setDbSessions(sessions);
      setRateLimit({ current: rl.current, max: 3 });
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    startJulesPolling();

    const handlePR = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      toast.success("Jules criou um PR!", {
        description: detail?.prTitle || detail?.prUrl,
        action: detail?.prUrl ? { label: "Abrir", onClick: () => window.open(detail.prUrl, "_blank") } : undefined,
      });
      refresh();
    };

    window.addEventListener("jules:pr-ready", handlePR);
    return () => {
      stopJulesPolling();
      window.removeEventListener("jules:pr-ready", handlePR);
    };
  }, [refresh]);

  const handleManualTrigger = async () => {
    if (!manualTask.trim()) return;
    setSending(true);
    const result = await orionSelfImprove({ task: manualTask, autoPR: true });
    if (result.success) {
      toast.success("Jules ativado", { description: `Sessão criada` });
      setManualTask("");
      refresh();
    } else {
      toast.error("Erro", { description: result.error });
    }
    setSending(false);
  };

  const failureEntries = Object.entries(failures).filter(([, v]) => v.count > 0);
  const groups = new Map<string, Array<[string, typeof failures[string]]>>();
  failureEntries.forEach(([key, val]) => {
    const group = SUBSYSTEM_ICONS[key]?.group || "Outros";
    if (!groups.has(group)) groups.set(group, []);
    groups.get(group)!.push([key, val]);
  });

  return (
    <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Bot className="h-5 w-5 text-primary" />
          Jules Self-Improvement
          <Badge variant="outline" className="ml-2 text-[10px] px-1.5 py-0">
            {rateLimit.current}/{rateLimit.max}/h
          </Badge>
          <Button variant="ghost" size="icon" onClick={refresh} disabled={loading} className="ml-auto h-7 w-7">
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Subsystem Failure Status */}
        {failureEntries.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
              Falhas por Subsistema
            </h4>
            {Array.from(groups.entries()).map(([group, entries]) => (
              <div key={group} className="space-y-1">
                <span className="text-xs font-semibold text-muted-foreground uppercase">{group}</span>
                {entries.map(([key, val]) => {
                  const meta = SUBSYSTEM_ICONS[key];
                  const Icon = meta?.icon || Activity;
                  return (
                    <div key={key} className="flex items-center justify-between rounded-md bg-muted/50 px-2 py-1 text-xs">
                      <div className="flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5" />
                        <span>{meta?.label || key}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Badge variant={val.count >= 3 ? "destructive" : "secondary"} className="text-[10px] px-1.5 py-0">
                          {val.count}x
                        </Badge>
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
            ))}
          </div>
        )}

        {failureEntries.length === 0 && (
          <div className="text-center text-xs text-muted-foreground py-2">
            <CheckCircle2 className="h-4 w-4 mx-auto mb-1 text-green-500" />
            Todos os subsistemas operando sem falhas
          </div>
        )}

        {/* DB Sessions with Activity Viewer */}
        {dbSessions.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <GitPullRequest className="h-3.5 w-3.5" />
              Sessões Jules ({dbSessions.length})
            </h4>
            <ScrollArea className="max-h-64">
              <Accordion type="single" collapsible className="space-y-1">
                {dbSessions.map((s) => (
                  <AccordionItem key={s.session_id} value={s.session_id} className="border-none">
                    <AccordionTrigger className="py-1.5 px-2 rounded-md bg-muted/30 hover:bg-muted/50 text-xs hover:no-underline">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <StatusBadge status={s.status} resolved={s.resolved} />
                        <span className="truncate max-w-[180px]">{s.title || s.prompt?.slice(0, 40)}</span>
                        {s.pr_url && (
                          <a href={s.pr_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-0.5 ml-auto mr-2" onClick={(e) => e.stopPropagation()}>
                            <GitPullRequest className="h-3 w-3" /> PR
                          </a>
                        )}
                        {s.follow_up_count > 0 && (
                          <Badge variant="outline" className="text-[10px] px-1 py-0">{s.follow_up_count} follow-up</Badge>
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
        <div className="space-y-1.5">
          <h4 className="text-sm font-medium text-muted-foreground">Trigger Manual</h4>
          <Textarea
            placeholder="Descreva a melhoria ou correção que o Jules deve fazer..."
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
            {rateLimit.current >= rateLimit.max ? "Rate limit atingido" : "Enviar para Jules"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
