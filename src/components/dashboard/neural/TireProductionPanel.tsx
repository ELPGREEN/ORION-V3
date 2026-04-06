/**
 * Tire Production Line Panel — Real-time OEE via unified ROSBridge connection
 */
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Factory, Play, Square, ScanSearch, AlertTriangle,
  CheckCircle, XCircle, BarChart3, Gauge, Zap, Timer, Settings,
} from "lucide-react";
import { useRosBridge } from "@/hooks/useRosBridge";
import { toast } from "sonner";

interface ProductionStats {
  tire_count: number;
  good_count: number;
  defect_count: number;
  oee_pct: number;
  throughput_per_hour: number;
  conveyor_running: boolean;
  timestamp: number;
}

interface DefectAlert {
  tire_id: number;
  defect: string;
  confidence: number;
  timestamp: number;
  action: string;
}

interface LineStatus {
  conveyor_running: boolean;
  conveyor_speed_mps: number;
  emergency_stopped: boolean;
  tire_count: number;
  good_count: number;
  defect_count: number;
  defect_rate_pct: number;
  oee_pct: number;
  uptime_hours: number;
  throughput_per_hour: number;
}

interface Props {
  rosbridgeUrl?: string;
}

export default function TireProductionPanel({ rosbridgeUrl }: Props) {
  const [stats, setStats] = useState<ProductionStats | null>(null);
  const [lineStatus, setLineStatus] = useState<LineStatus | null>(null);
  const [recentDefects, setRecentDefects] = useState<DefectAlert[]>([]);
  const [inspecting, setInspecting] = useState(false);
  const [calibrating, setCalibrating] = useState(false);
  const { isConnected, subscribe, callService } = useRosBridge({ url: rosbridgeUrl });

  useEffect(() => {
    if (!isConnected) return;
    const unsubs: Array<() => void> = [];

    unsubs.push(
      subscribe("/tire_line/production_stats", "std_msgs/msg/String", (msg: any) => {
        try { setStats(JSON.parse(msg.data)); } catch {}
      }, 5000)
    );

    unsubs.push(
      subscribe("/tire_line/defect_alert", "std_msgs/msg/String", (msg: any) => {
        try {
          const alert: DefectAlert = JSON.parse(msg.data);
          setRecentDefects(prev => [alert, ...prev.slice(0, 9)]);
          toast.error(`🔴 Defeito: ${alert.defect} no pneu #${alert.tire_id} (${(alert.confidence * 100).toFixed(0)}%)`, { duration: 8000 });
        } catch {}
      })
    );

    callService("/tire_line/get_line_status").then((res: any) => {
      if (res?.success && res.message) {
        try { setLineStatus(JSON.parse(res.message)); } catch {}
      }
    }).catch(() => {});

    return () => unsubs.forEach(fn => fn());
  }, [isConnected, subscribe, callService]);

  const handleConveyor = useCallback(async (start: boolean) => {
    try {
      const res = await callService<{ success: boolean; message: string }>("/tire_line/set_conveyor", { data: start });
      toast.success(res.message);
      const status = await callService<{ success: boolean; message: string }>("/tire_line/get_line_status");
      if (status?.message) try { setLineStatus(JSON.parse(status.message)); } catch {}
    } catch { toast.error("Falha ao controlar esteira"); }
  }, [callService]);

  const handleInspection = useCallback(async () => {
    setInspecting(true);
    try {
      const res = await callService<{ success: boolean; message: string }>("/tire_line/start_inspection");
      toast[res.success ? "success" : "error"](res.message);
    } catch { toast.error("Falha na inspeção"); }
    setInspecting(false);
  }, [callService]);

  const handleCalibrate = useCallback(async () => {
    setCalibrating(true);
    try {
      const res = await callService<{ success: boolean; message: string }>("/tire_line/calibrate_camera");
      toast.success(res.message);
    } catch { toast.error("Falha na calibração"); }
    setCalibrating(false);
  }, [callService]);

  const oee = stats?.oee_pct ?? lineStatus?.oee_pct ?? 0;
  const oeeColor = oee >= 85 ? "text-green-500" : oee >= 60 ? "text-yellow-500" : "text-red-500";
  const conveyorRunning = stats?.conveyor_running ?? lineStatus?.conveyor_running ?? false;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card><CardContent className="pt-4 pb-3 text-center"><Gauge className={`h-5 w-5 mx-auto mb-1 ${oeeColor}`} /><p className="text-[10px] text-muted-foreground uppercase">OEE</p><p className={`text-2xl font-bold font-mono ${oeeColor}`}>{oee.toFixed(1)}%</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center"><BarChart3 className="h-5 w-5 mx-auto mb-1 text-primary" /><p className="text-[10px] text-muted-foreground uppercase">Produzidos</p><p className="text-2xl font-bold font-mono">{stats?.tire_count ?? lineStatus?.tire_count ?? 0}</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center"><CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-500" /><p className="text-[10px] text-muted-foreground uppercase">Aprovados</p><p className="text-2xl font-bold font-mono text-green-500">{stats?.good_count ?? lineStatus?.good_count ?? 0}</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center"><XCircle className="h-5 w-5 mx-auto mb-1 text-destructive" /><p className="text-[10px] text-muted-foreground uppercase">Defeitos</p><p className="text-2xl font-bold font-mono text-destructive">{stats?.defect_count ?? lineStatus?.defect_count ?? 0}</p></CardContent></Card>
        <Card><CardContent className="pt-4 pb-3 text-center"><Zap className="h-5 w-5 mx-auto mb-1 text-blue-400" /><p className="text-[10px] text-muted-foreground uppercase">Pneus/hora</p><p className="text-2xl font-bold font-mono">{(stats?.throughput_per_hour ?? lineStatus?.throughput_per_hour ?? 0).toFixed(0)}</p></CardContent></Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Factory className="h-4 w-4" />Controle da Esteira</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`h-3 w-3 rounded-full ${conveyorRunning ? "bg-green-500 animate-pulse" : "bg-muted"}`} />
                <span className="text-sm font-medium">{conveyorRunning ? "Em operação" : "Parada"}</span>
              </div>
              <Badge variant={conveyorRunning ? "default" : "secondary"}>{lineStatus?.conveyor_speed_mps?.toFixed(2) ?? "0.00"} m/s</Badge>
            </div>
            {lineStatus?.uptime_hours !== undefined && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground"><Timer className="h-3 w-3" />Uptime: {lineStatus.uptime_hours.toFixed(1)}h</div>
            )}
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={() => handleConveyor(true)} disabled={!isConnected || conveyorRunning}><Play className="h-3.5 w-3.5 mr-1" /> Iniciar</Button>
              <Button size="sm" variant="destructive" className="flex-1" onClick={() => handleConveyor(false)} disabled={!isConnected || !conveyorRunning}><Square className="h-3.5 w-3.5 mr-1" /> Parar</Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ScanSearch className="h-4 w-4" />Inspeção Visual</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm"><span className="text-muted-foreground">Taxa de defeito</span><span className="font-mono font-medium">{(lineStatus?.defect_rate_pct ?? 0).toFixed(1)}%</span></div>
            <Progress value={100 - (lineStatus?.defect_rate_pct ?? 0)} className="h-2" />
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={handleInspection} disabled={!isConnected || inspecting}><ScanSearch className="h-3.5 w-3.5 mr-1" />{inspecting ? "Inspecionando..." : "Inspecionar Pneu"}</Button>
              <Button size="sm" variant="outline" onClick={handleCalibrate} disabled={!isConnected || calibrating}><Settings className="h-3.5 w-3.5 mr-1" />{calibrating ? "..." : "Calibrar"}</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {recentDefects.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" />Alertas de Defeito Recentes</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {recentDefects.map((d, i) => (
                <div key={`${d.tire_id}-${i}`} className="flex items-center justify-between text-xs p-2 rounded bg-destructive/10 border border-destructive/20">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-3.5 w-3.5 text-destructive" />
                    <span className="font-medium">Pneu #{d.tire_id}</span>
                    <Badge variant="destructive" className="text-[9px]">{d.defect}</Badge>
                  </div>
                  <span className="font-mono text-muted-foreground">{(d.confidence * 100).toFixed(0)}%</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!isConnected && (
        <Card>
          <CardContent className="py-6 text-center text-muted-foreground text-sm">
            <Factory className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>Conecte ao ROSBridge para controlar a linha de produção</p>
            <p className="text-[10px] mt-1 font-mono">python3 tire_line_services.py</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
