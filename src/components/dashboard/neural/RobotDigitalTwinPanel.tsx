import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Cpu, Shield, Activity, Settings, RotateCcw, Heart, TrendingUp, Clock,
} from "lucide-react";
import {
  DigitalTwinRegistry, createNeuralTwinRegistry,
  type NeuralComponentTwin, type HealthIndicator, type ConfigSnapshot,
} from "@/lib/neural/digital-twin-aas";
import { ros2Bridge } from "@/lib/neural/ros2-protocol-bridge";

interface Props {
  robotId: string;
}

// Singleton registry enriched with robot twins
const registry = createNeuralTwinRegistry();

function ensureRobotTwin(robotId: string): NeuralComponentTwin {
  let twin = registry.getTwin(`robot-${robotId}`);
  if (!twin) {
    const robot = ros2Bridge.getRobot(robotId);
    twin = registry.registerTwin(
      `robot-${robotId}`,
      "robot",
      robot?.name ?? `Robô ${robotId}`,
      { motor_left: 0, motor_right: 0, gripper: 0 }
    );
  }
  return twin;
}

function statusColor(s: string) {
  switch (s) {
    case "healthy": case "active": return "text-green-500";
    case "warning": case "degraded": return "text-yellow-500";
    case "critical": case "offline": return "text-red-500";
    default: return "text-muted-foreground";
  }
}

function statusBadge(s: string) {
  switch (s) {
    case "healthy": case "active": return "default" as const;
    case "warning": case "degraded": return "secondary" as const;
    default: return "destructive" as const;
  }
}

export default function RobotDigitalTwinPanel({ robotId }: Props) {
  const [tick, setTick] = useState(0);

  // Refresh every 3s to reflect telemetry updates
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 3000);
    return () => clearInterval(id);
  }, []);

  const twin = useMemo(() => {
    void tick; // dependency
    const t = ensureRobotTwin(robotId);
    // Sync from robot state
    const robot = ros2Bridge.getRobot(robotId);
    if (robot) {
      registry.updateMetrics(`robot-${robotId}`, {
        accuracy: robot.connected ? 0.95 : 0.3,
        latencyMs: robot.latencyMs,
        throughput: robot.connected ? 60 : 0,
      });
    }
    return t;
  }, [robotId, tick]);

  const resilience = useMemo(() => registry.assessSystemResilience(), [tick]);

  const handleRollback = (version: string) => {
    const ok = registry.rollbackToVersion(`robot-${robotId}`, version);
    if (ok) setTick(t => t + 1);
  };

  const { aas, operationalState, performanceMetrics, healthIndicators, configurationHistory } = twin;

  return (
    <div className="space-y-4">
      {/* AAS Identity */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Cpu className="h-4 w-4" />
            Asset Administration Shell (AAS)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-muted-foreground">ID</span>
              <p className="font-mono">{aas.idShort}</p>
            </div>
            <div>
              <span className="text-muted-foreground">URN</span>
              <p className="font-mono truncate">{aas.identification}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Versão</span>
              <p className="font-mono">{aas.administration.version}.{aas.administration.revision}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Tipo</span>
              <Badge variant="outline" className="text-[10px]">{aas.assetKind}</Badge>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">{aas.description}</p>
          <div className="flex flex-wrap gap-1">
            {aas.submodels.map(sm => (
              <Badge key={sm.idShort} variant="secondary" className="text-[10px]">
                {sm.idShort}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Operational State + Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Estado Operacional
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <Badge variant={statusBadge(operationalState.status)} className="text-[10px]">
                {operationalState.status.toUpperCase()}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Carga</span>
              <span className="font-mono">{(operationalState.currentLoad * 100).toFixed(0)}%</span>
            </div>
            <Progress value={operationalState.currentLoad * 100} className="h-2" />
            <div className="flex justify-between">
              <span className="text-muted-foreground">Taxa de Erro</span>
              <span className={`font-mono ${operationalState.errorRate > 0.1 ? "text-red-500" : ""}`}>
                {(operationalState.errorRate * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Heartbeat</span>
              <span className="font-mono">
                {operationalState.lastHeartbeat ? new Date(operationalState.lastHeartbeat).toLocaleTimeString() : "—"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs">
            {[
              { label: "Accuracy", value: performanceMetrics.accuracy, fmt: (v: number) => `${(v * 100).toFixed(1)}%` },
              { label: "Latência", value: performanceMetrics.latencyMs, fmt: (v: number) => `${v.toFixed(0)}ms` },
              { label: "Throughput", value: performanceMetrics.throughput, fmt: (v: number) => `${v.toFixed(0)} req/min` },
              { label: "Qualidade", value: performanceMetrics.qualityScore, fmt: (v: number) => `${(v * 100).toFixed(0)}%` },
              { label: "Learning Rate", value: performanceMetrics.learningRate, fmt: (v: number) => v.toFixed(4) },
              { label: "Epoch", value: performanceMetrics.epoch, fmt: (v: number) => String(v) },
            ].map(m => (
              <div key={m.label} className="flex justify-between">
                <span className="text-muted-foreground">{m.label}</span>
                <span className="font-mono">{m.fmt(m.value)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Health Indicators */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Heart className="h-4 w-4" />
            Indicadores de Saúde
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {healthIndicators.map((hi: HealthIndicator) => (
            <div key={hi.name} className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground capitalize">{hi.name.replace(/_/g, " ")}</span>
                <div className="flex items-center gap-2">
                  <span className="font-mono">{hi.value.toFixed(3)} / {hi.threshold}</span>
                  <Badge variant={statusBadge(hi.status)} className="text-[9px]">{hi.status}</Badge>
                </div>
              </div>
              <Progress
                value={Math.min(100, (hi.value / (hi.threshold * 2)) * 100)}
                className={`h-1.5 ${hi.status === "critical" ? "[&>div]:bg-red-500" : hi.status === "warning" ? "[&>div]:bg-yellow-500" : ""}`}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Resilience Assessment */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Avaliação de Resiliência (Flex4Res)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div>
              <p className="text-lg font-bold">{resilience.totalComponents}</p>
              <span className="text-[10px] text-muted-foreground">Total</span>
            </div>
            <div>
              <p className="text-lg font-bold text-green-500">{resilience.healthyComponents}</p>
              <span className="text-[10px] text-muted-foreground">Saudáveis</span>
            </div>
            <div>
              <p className="text-lg font-bold text-yellow-500">{resilience.degradedComponents}</p>
              <span className="text-[10px] text-muted-foreground">Degradados</span>
            </div>
            <div>
              <p className="text-lg font-bold">{(resilience.overallHealth * 100).toFixed(0)}%</p>
              <span className="text-[10px] text-muted-foreground">Saúde Global</span>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-muted-foreground">Capacidade de Reconfiguração</span>
              <span className="font-mono">{(resilience.reconfigurationCapability * 100).toFixed(0)}%</span>
            </div>
            <Progress value={resilience.reconfigurationCapability * 100} className="h-2" />
          </div>
        </CardContent>
      </Card>

      {/* Configuration History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Histórico de Configurações
            <Badge variant="outline" className="ml-auto text-[10px]">{configurationHistory.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-48">
            <div className="space-y-2">
              {[...configurationHistory].reverse().map((snap: ConfigSnapshot, i: number) => (
                <div key={i} className="flex items-center justify-between border-b border-border/30 pb-2 last:border-0">
                  <div className="text-xs space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span className="font-mono">v{snap.version}</span>
                      <Badge variant="outline" className="text-[9px]">{snap.trigger}</Badge>
                    </div>
                    <span className="text-muted-foreground">
                      {new Date(snap.timestamp).toLocaleString()}
                    </span>
                  </div>
                  {i > 0 && (
                    <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => handleRollback(snap.version)}>
                      <RotateCcw className="h-3 w-3 mr-1" /> Rollback
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
