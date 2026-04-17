/**
 * Automatic Rejection Panel — YOLO detects defect → Stop conveyor
 * Prioridade 3: Automação industrial com visão computacional
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Wifi, WifiOff, Eye, AlertTriangle, CheckCircle, XCircle,
  Play, Pause, StopCircle, MoveRight, Package, Boxes,
  Settings, Zap, Activity, Clock, TrendingUp, ShieldAlert,
} from "lucide-react";
const ConveyorBelt = MoveRight;
import { useRosBridge } from "@/hooks/useRosBridge";
import { toast } from "sonner";

interface DefectDetection {
  timestamp: number;
  className: string;
  confidence: number;
  bbox: { x: number; y: number; w: number; h: number };
  isDefect: boolean;
}

interface ConveyorState {
  running: boolean;
  speed: number;  // m/s
  position: number;  // meters from start
  itemsProcessed: number;
  itemsRejected: number;
  itemsAccepted: number;
}

interface RejectionSettings {
  minConfidence: number;
  defectClasses: string[];
  enableAutoReject: boolean;
  rejectDelay: number;  // ms after detection
  conveyorStopDuration: number;  // ms
}

const DEFAULT_DEFECT_CLASSES = [
  "crack", "scratch", "dent", "hole", "tear", "discoloration",
  "bubble", "异物", "defect", "damaged", "broken", "missing"
];

export default function AutomaticRejectionPanel() {
  const [rosbridgeUrl, setRosbridgeUrl] = useState("ws://localhost:9090");
  const [connected, setConnected] = useState(false);
  
  // Conveyor state
  const [conveyorState, setConveyorState] = useState<ConveyorState>({
    running: false,
    speed: 0.5,
    position: 0,
    itemsProcessed: 0,
    itemsRejected: 0,
    itemsAccepted: 0,
  });
  
  // Detection state
  const [latestDetection, setLatestDetection] = useState<DefectDetection | null>(null);
  const [detectionHistory, setDetectionHistory] = useState<DefectDetection[]>([]);
  const [isInspecting, setIsInspecting] = useState(false);
  
  // Settings
  const [settings, setSettings] = useState<RejectionSettings>({
    minConfidence: 0.6,
    defectClasses: DEFAULT_DEFECT_CLASSES,
    enableAutoReject: true,
    rejectDelay: 200,
    conveyorStopDuration: 3000,
  });
  
  // Stats
  const [stats, setStats] = useState({
    totalScanned: 0,
    defectsFound: 0,
    falsePositives: 0,
    accuracy: 0,
    lastHour: 0,
  });
  
  const unsubsRef = useRef<Array<() => void>>([]);
  const inspectionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { isConnected, connect, disconnect, subscribe, publish } = useRosBridge({ url: rosbridgeUrl });

  useEffect(() => {
    setConnected(isConnected);
  }, [isConnected]);

  const handleConnect = useCallback(() => {
    if (isConnected) {
      disconnect();
      unsubsRef.current.forEach((fn) => fn());
      unsubsRef.current = [];
    } else {
      connect();
    }
  }, [isConnected, connect, disconnect]);

  // Subscribe to inspection results
  useEffect(() => {
    if (!isConnected) return;
    
    const unsubs: Array<() => void> = [];

    // Subscribe to YOLO detection results
    unsubs.push(
      subscribe("/yolo/detections", "orion_vision_msgs/msg/DetectionArray", (msg: any) => {
        if (!isInspecting) return;
        
        const detections = msg.detections ?? [];
        for (const det of detections) {
          const isDefect = settings.defectClasses.some(
            cls => det.class_name?.toLowerCase().includes(cls.toLowerCase())
          );
          
          if (det.confidence >= settings.minConfidence && isDefect) {
            const detection: DefectDetection = {
              timestamp: Date.now(),
              className: det.class_name,
              confidence: det.confidence,
              bbox: det.bbox,
              isDefect: true,
            };
            
            setLatestDetection(detection);
            setDetectionHistory(prev => [...prev.slice(-50), detection]);
            
            // Auto-reject logic
            if (settings.enableAutoReject) {
              handleDefectDetected(detection);
            }
            
            setStats(prev => ({
              ...prev,
              defectsFound: prev.defectsFound + 1,
              totalScanned: prev.totalScanned + 1,
            }));
          }
        }
      }, 100)
    );

    // Subscribe to conveyor state
    unsubs.push(
      subscribe("/conveyor/state", "orion_conveyor_msgs/msg/ConveyorState", (msg: any) => {
        setConveyorState({
          running: msg.running,
          speed: msg.speed,
          position: msg.position,
          itemsProcessed: msg.items_processed,
          itemsRejected: msg.items_rejected,
          itemsAccepted: msg.items_accepted,
        });
      }, 500)
    );

    unsubsRef.current = unsubs;
    return () => { unsubs.forEach((fn) => fn()); };
  }, [isConnected, isInspecting, subscribe, settings]);

  // Handle defect detection
  const handleDefectDetected = useCallback((detection: DefectDetection) => {
    console.log("[Rejection] Defect detected:", detection.className, detection.confidence);
    
    // Stop conveyor
    publish("/conveyor/cmd", "orion_conveyor_msgs/msg/ConveyorCommand", {
      command: "stop",
      duration: settings.conveyorStopDuration,
    });
    
    setConveyorState(prev => ({ ...prev, running: false }));
    
    toast.error(`🛑 DEFEITO DETECTADO: ${detection.className} (${(detection.confidence * 100).toFixed(0)}%)`);
  }, [publish, settings.conveyorStopDuration]);

  // Start/Stop inspection
  const toggleInspection = () => {
    if (isInspecting) {
      setIsInspecting(false);
      toast.info("⏹️ Inspeção paralisada");
    } else {
      setIsInspecting(true);
      toast.success("🔍 Inspeção iniciada");
    }
  };

  // Start conveyor
  const startConveyor = () => {
    publish("/conveyor/cmd", "orion_conveyor_msgs/msg/ConveyorCommand", {
      command: "start",
      speed: conveyorState.speed,
    });
    setConveyorState(prev => ({ ...prev, running: true }));
    toast.success("▶️ Esteira iniciada");
  };

  // Stop conveyor
  const stopConveyor = () => {
    publish("/conveyor/cmd", "orion_conveyor_msgs/msg/ConveyorCommand", {
      command: "stop",
    });
    setConveyorState(prev => ({ ...prev, running: false }));
    toast.info("⏹️ Esteira parada");
  };

  // Simulate detection (for testing without real YOLO)
  const simulateDetection = () => {
    const classes = ["crack", "scratch", "bubble", "dent", "正常"];
    const randomClass = classes[Math.floor(Math.random() * classes.length)];
    const isDefect = randomClass !== "正常";
    const confidence = 0.5 + Math.random() * 0.5;
    
    const detection: DefectDetection = {
      timestamp: Date.now(),
      className: randomClass,
      confidence,
      bbox: { x: 0.3, y: 0.4, w: 0.2, h: 0.2 },
      isDefect,
    };
    
    setLatestDetection(detection);
    setDetectionHistory(prev => [...prev.slice(-50), detection]);
    
    if (isDefect && confidence >= settings.minConfidence && settings.enableAutoReject) {
      handleDefectDetected(detection);
    }
    
    setStats(prev => ({
      ...prev,
      totalScanned: prev.totalScanned + 1,
      defectsFound: isDefect ? prev.defectsFound + 1 : prev.defectsFound,
      accuracy: prev.totalScanned > 0 ? (prev.defectsFound / prev.totalScanned) * 100 : 0,
    }));
  };

  // Reset stats
  const resetStats = () => {
    setStats({
      totalScanned: 0,
      defectsFound: 0,
      falsePositives: 0,
      accuracy: 0,
      lastHour: 0,
    });
    setDetectionHistory([]);
  };

  const accuracy = stats.totalScanned > 0 
    ? ((stats.totalScanned - stats.defectsFound) / stats.totalScanned * 100) 
    : 0;

  return (
    <Card className="bg-zinc-950 border-zinc-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <ConveyorBelt className="h-4 w-4 text-[hsl(var(--tron-neon))]" />
            Rejeição Automática — YOLO → Esteira
          </CardTitle>
          <Badge variant={connected ? "default" : "secondary"} className="text-[10px]">
            {connected ? "🟢 Online" : "🔴 Offline"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection */}
        <div className="flex items-center gap-2">
          <Input
            value={rosbridgeUrl}
            onChange={(e) => setRosbridgeUrl(e.target.value)}
            placeholder="ws://robot-ip:9090"
            className="flex-1 text-xs font-mono"
            disabled={connected}
          />
          <Button size="sm" variant={connected ? "destructive" : "default"} onClick={handleConnect}>
            {connected ? <WifiOff className="h-3.5 w-3.5" /> : <Wifi className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {/* Status Banner */}
        <div className={`p-4 rounded-lg border ${
          isInspecting && conveyorState.running 
            ? "bg-green-950/30 border-green-900" 
            : "bg-zinc-900/30 border-zinc-800"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-3 h-3 rounded-full ${
                isInspecting && conveyorState.running ? "bg-green-500 animate-pulse" : "bg-zinc-500"
              }`} />
              <div>
                <div className="text-sm font-medium">
                  {isInspecting && conveyorState.running 
                    ? "🔴 INSPEÇÃO ATIVA - Monitorando defeitos" 
                    : "⚪ Sistema em standby"}
                </div>
                <div className="text-[10px] text-zinc-500">
                  {conveyorState.running ? `Esteira movendo a ${conveyorState.speed.toFixed(2)} m/s` : "Esteira parada"}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={isInspecting ? "destructive" : "default"}
                onClick={toggleInspection}
              >
                {isInspecting ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                {isInspecting ? "Parar" : "Iniciar"}
              </Button>
              <Button
                size="sm"
                variant={conveyorState.running ? "outline" : "default"}
                onClick={conveyorState.running ? stopConveyor : startConveyor}
              >
                {conveyorState.running ? <StopCircle className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-4 gap-3">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="pt-3 pb-2">
              <div className="flex items-center gap-2">
                <Boxes className="h-3 w-3 text-[hsl(var(--tron-info))]" />
                <span className="text-[10px] text-zinc-500">Total</span>
              </div>
              <div className="text-xl font-mono font-bold text-[hsl(var(--tron-info))]">
                {stats.totalScanned}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="pt-3 pb-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3 w-3 text-[hsl(var(--tron-danger))]" />
                <span className="text-[10px] text-zinc-500">Defeitos</span>
              </div>
              <div className="text-xl font-mono font-bold text-[hsl(var(--tron-danger))]">
                {stats.defectsFound}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="pt-3 pb-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-3 w-3 text-[hsl(var(--tron-neon))]" />
                <span className="text-[10px] text-zinc-500">Aceitos</span>
              </div>
              <div className="text-xl font-mono font-bold text-[hsl(var(--tron-neon))]">
                {stats.totalScanned - stats.defectsFound}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="pt-3 pb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-3 w-3 text-[hsl(var(--tron-neon))]" />
                <span className="text-[10px] text-zinc-500">Precisão</span>
              </div>
              <div className="text-xl font-mono font-bold text-[hsl(var(--tron-neon))]">
                {accuracy.toFixed(1)}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Latest Detection */}
        {latestDetection && (
          <div className={`p-3 rounded-lg border ${
            latestDetection.isDefect ? "bg-red-950/30 border-red-900" : "bg-green-950/30 border-green-900"
          }`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {latestDetection.isDefect ? (
                  <XCircle className="h-5 w-5 text-[hsl(var(--tron-danger))]" />
                ) : (
                  <CheckCircle className="h-5 w-5 text-[hsl(var(--tron-neon))]" />
                )}
                <div>
                  <div className="text-sm font-medium">
                    {latestDetection.isDefect ? `❌ DEFEITO: ${latestDetection.className}` : "✅ OK"}
                  </div>
                  <div className="text-[10px] text-zinc-500">
                    Confiança: {(latestDetection.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              </div>
              <div className="text-[10px] font-mono text-zinc-500">
                {new Date(latestDetection.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        )}

        <Separator />

        {/* Settings */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-zinc-400">Configurações</Label>
            <Button size="sm" variant="outline" onClick={resetStats}>
              <Settings className="h-3 w-3 mr-1" /> Reset
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-zinc-500">Confiança mínima</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  value={settings.minConfidence}
                  onChange={(e) => setSettings(s => ({ ...s, minConfidence: parseFloat(e.target.value) }))}
                  min={0}
                  max={1}
                  step={0.1}
                  className="text-xs font-mono"
                />
                <span className="text-xs text-zinc-500">
                  {(settings.minConfidence * 100).toFixed(0)}%
                </span>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs text-zinc-500">Tempo de parada (ms)</Label>
              <Input
                type="number"
                value={settings.conveyorStopDuration}
                onChange={(e) => setSettings(s => ({ ...s, conveyorStopDuration: parseInt(e.target.value) }))}
                min={500}
                max={10000}
                step={500}
                className="text-xs font-mono"
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-zinc-900/30 rounded-lg">
            <div>
              <div className="text-xs font-medium">Rejeição Automática</div>
              <div className="text-[10px] text-zinc-500">Para esteeira ao detectar defeito</div>
            </div>
            <Switch
              checked={settings.enableAutoReject}
              onCheckedChange={(checked) => setSettings(s => ({ ...s, enableAutoReject: checked }))}
            />
          </div>
        </div>

        {/* Test Button */}
        <div className="flex gap-2">
          <Button
            className="flex-1"
            variant="outline"
            onClick={simulateDetection}
            disabled={!isInspecting}
          >
            <Eye className="h-4 w-4 mr-2" />
            Simular Detecção (Teste)
          </Button>
        </div>

        {/* Detection History */}
        <div className="space-y-2">
          <Label className="text-xs text-zinc-500">Histórico de Detecções</Label>
          <div className="h-24 overflow-y-auto space-y-1">
            {detectionHistory.slice(-10).reverse().map((det, idx) => (
              <div key={idx} className="flex items-center justify-between text-[10px] p-1 bg-zinc-900/30 rounded">
                <div className="flex items-center gap-2">
                  {det.isDefect ? (
                    <XCircle className="h-3 w-3 text-[hsl(var(--tron-danger))]" />
                  ) : (
                    <CheckCircle className="h-3 w-3 text-[hsl(var(--tron-neon))]" />
                  )}
                  <span className={det.isDefect ? "text-[hsl(var(--tron-danger))]" : "text-[hsl(var(--tron-neon))]"}>
                    {det.className}
                  </span>
                </div>
                <span className="text-zinc-500">
                  {(det.confidence * 100).toFixed(0)}% | {new Date(det.timestamp).toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Pipeline Status */}
        <div className="flex items-center justify-between text-xs text-zinc-500 pt-2 border-t border-zinc-800">
          <span>Pipeline: <span className="text-[hsl(var(--tron-neon))]">YOLO → Detecção → Rejeição</span></span>
          <span>Latência: ~50ms</span>
        </div>
      </CardContent>
    </Card>
  );
}