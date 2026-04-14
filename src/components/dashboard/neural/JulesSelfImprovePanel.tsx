/**
 * Jules Self-Improvement Dashboard Panel
 * Shows subsystem failure status, Jules sessions, and manual trigger.
 */

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bot, GitPullRequest, AlertTriangle, CheckCircle2, RefreshCw, Send,
  Cpu, Eye, Mic, Volume2, Wifi, Activity,
} from "lucide-react";
import { julesClient, orionSelfImprove, type JulesSession } from "@/lib/neural/jules-client";
import { getSubsystemFailureStatus, resetSubsystemFailures } from "@/lib/neural/jules-auto-triggers";
import { useToast } from "@/hooks/use-toast";

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

export function JulesSelfImprovePanel() {
  const [sessions, setSessions] = useState<JulesSession[]>([]);
  const [failures, setFailures] = useState<ReturnType<typeof getSubsystemFailureStatus>>({});
  const [loading, setLoading] = useState(false);
  const [manualTask, setManualTask] = useState("");
  const [sending, setSending] = useState(false);
  const { toast } = useToast();

  const refresh = useCallback(async () => {
    setLoading(true);
    setFailures(getSubsystemFailureStatus());
    try {
      const result = await julesClient.listSessions(10);
      if (result.success && result.data?.sessions) {
        setSessions(result.data.sessions);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleManualTrigger = async () => {
    if (!manualTask.trim()) return;
    setSending(true);
    const result = await orionSelfImprove({ task: manualTask, autoPR: true });
    if (result.success) {
      toast({ title: "Jules ativado", description: `Sessão: ${result.sessionId}` });
      setManualTask("");
      refresh();
    } else {
      toast({ title: "Erro", description: result.error, variant: "destructive" });
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
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-5 w-5"
                          onClick={() => {
                            resetSubsystemFailures(key as any);
                            setFailures(getSubsystemFailureStatus());
                          }}
                        >
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

        {/* Recent Jules Sessions */}
        {sessions.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              <GitPullRequest className="h-3.5 w-3.5" />
              Sessões Recentes
            </h4>
            <ScrollArea className="max-h-32">
              {sessions.slice(0, 5).map((s) => {
                const pr = s.outputs?.find((o) => o.pullRequest);
                return (
                  <div key={s.id} className="flex items-center justify-between rounded-md bg-muted/30 px-2 py-1 text-xs mb-1">
                    <span className="truncate max-w-[200px]">{s.title || s.prompt?.slice(0, 40)}</span>
                    {pr?.pullRequest ? (
                      <a
                        href={pr.pullRequest.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-0.5"
                      >
                        <GitPullRequest className="h-3 w-3" /> PR
                      </a>
                    ) : (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">pendente</Badge>
                    )}
                  </div>
                );
              })}
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
            disabled={sending || !manualTask.trim()}
            className="w-full text-xs"
          >
            {sending ? <RefreshCw className="h-3 w-3 mr-1 animate-spin" /> : <Send className="h-3 w-3 mr-1" />}
            Enviar para Jules
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
