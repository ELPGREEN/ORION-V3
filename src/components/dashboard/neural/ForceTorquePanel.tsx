/**
 * Force/Torque Control Panel — Control gripper pressure and force feedback
 * Prioridade 2: Integração com sensores de força
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Wifi, WifiOff, Hand, Gauge, AlertTriangle, Zap,
  ArrowUp, ArrowDown, RotateCcw, Pause, Play,
  Target, Activity, Signal,
} from "lucide-react";
import { useRosBridge } from "@/hooks/useRosBridge";
import { toast } from "sonner";

interface ForceData {
  timestamp: number;
  force: number;
  torque: number;
  effort: number;
}

interface GripperState {
  position: number;  // 0 = closed, 1 = open
  force: number;    // Current force in Newtons
  maxForce: number;  // Max force limit
  speed: number;     // Movement speed
}

export default function ForceTorquePanel() {
  const [rosbridgeUrl, setRosbridgeUrl] = useState("ws://localhost:9090");
  const [robotNamespace, setRobotNamespace] = useState("robot1");
  const [connected, setConnected] = useState(false);
  
  // Gripper state
  const [gripperPosition, setGripperPosition] = useState(0);  // 0-100%
  const [maxForce, setMaxForce] = useState(50);  // Max force in N
  const [gripperSpeed, setGripperSpeed] = useState(50);  // Speed %
  const [forceLimitEnabled, setForceLimitEnabled] = useState(true);
  
  // Real-time force data
  const [forceHistory, setForceHistory] = useState<ForceData[]>([]);
  const [latestForce, setLatestForce] = useState<ForceData | null>(null);
  const [emergencyStop, setEmergencyStop] = useState(false);
  
  const unsubsRef = useRef<Array<() => void>>([]);
  
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

  // Subscribe to force/torque topics
  useEffect(() => {
    if (!isConnected) return;
    
    const namespace = robotNamespace.startsWith("/") ? robotNamespace : `/${robotNamespace}`;
    const unsubs: Array<() => void> = [];

    // Subscribe to gripper state
    unsubs.push(
      subscribe(`${namespace}/gripper/state`, "robotiq_2f_ msgs/msg/GripperState", (msg: any) => {
        const forceData: ForceData = {
          timestamp: Date.now(),
          force: msg.force ?? 0,
          torque: msg.torque ?? 0,
          effort: msg.effort ?? 0,
        };
        setLatestForce(forceData);
        setForceHistory(prev => [...prev.slice(-60), forceData]);
      }, 100)
    );

    // Subscribe to wrist force/torque sensor
    unsubs.push(
      subscribe(`${namespace}/wrist_ft`, "geometry_msgs/msg/WrenchStamped", (msg: any) => {
        const forceData: ForceData = {
          timestamp: Date.now(),
          force: Math.sqrt(
            Math.pow(msg.wrench?.force?.x ?? 0, 2) +
            Math.pow(msg.wrench?.force?.y ?? 0, 2) +
            Math.pow(msg.wrench?.force?.z ?? 0, 2)
          ),
          torque: Math.sqrt(
            Math.pow(msg.wrench?.torque?.x ?? 0, 2) +
            Math.pow(msg.wrench?.torque?.y ?? 0, 2) +
            Math.pow(msg.wrench?.torque?.z ?? 0, 2)
          ),
          effort: 0,
        };
        setLatestForce(prev => prev ? { ...prev, ...forceData } : forceData);
        setForceHistory(prev => [...prev.slice(-60), { ...forceData, force: prev?.force ?? 0, torque: prev?.torque ?? 0 }]);
      }, 50)
    );

    unsubsRef.current = unsubs;
    toast.success("🔧 Sensores de força conectados");

    return () => { unsubs.forEach((fn) => fn()); };
  }, [isConnected, subscribe, robotNamespace]);

  // Send gripper command
  const sendGripperCommand = useCallback((position: number, force: number, speed: number) => {
    const namespace = robotNamespace.startsWith("/") ? robotNamespace : `/${robotNamespace}`;
    const msg = {
      position: position / 100,  // Convert 0-100 to 0-1
      max_force: force,
      speed: speed / 100,
    };
    publish(`${namespace}/gripper/cmd`, "robotiq_2f_msgs/msg/GripperCommand", msg);
    console.log("[Gripper] Sent:", msg);
  }, [publish, robotNamespace]);

  const handleOpen = () => {
    if (emergencyStop) return;
    setGripperPosition(100);
    sendGripperCommand(100, maxForce, gripperSpeed);
    toast.info("🔓 Garra aberta");
  };

  const handleClose = () => {
    if (emergencyStop) return;
    setGripperPosition(0);
    sendGripperCommand(0, maxForce, gripperSpeed);
    toast.info("🔒 Garra fechada");
  };

  const handleEmergency = () => {
    setEmergencyStop(!emergencyStop);
    if (!emergencyStop) {
      // Emergency stop - stop all movement
      const namespace = robotNamespace.startsWith("/") ? robotNamespace : `/${robotNamespace}`;
      publish(`${namespace}/gripper/cmd`, "robotiq_2f_msgs/msg/GripperCommand", { position: 0, max_force: 0, speed: 0 });
      toast.error("🛑 PARADA DE EMERGÊNCIA");
    }
  };

  const handlePreset = (name: string, force: number) => {
    setMaxForce(force);
    toast.info(`⚡ Preset: ${name} (${force}N)`);
  };

  // Calculate safety status
  const forcePercent = latestForce ? (latestForce.force / maxForce) * 100 : 0;
  const safetyStatus = forcePercent > 80 ? "critical" : forcePercent > 60 ? "warning" : "safe";

  return (
    <Card className="bg-zinc-950 border-zinc-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Hand className="h-4 w-4 text-orange-400" />
            Controle de Força / Garra
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
          <Input
            value={robotNamespace}
            onChange={(e) => setRobotNamespace(e.target.value)}
            placeholder="robot1"
            className="w-20 text-xs font-mono"
            disabled={connected}
          />
          <Button size="sm" variant={connected ? "destructive" : "default"} onClick={handleConnect}>
            {connected ? <WifiOff className="h-3.5 w-3.5" /> : <Wifi className="h-3.5 w-3.5" />}
          </Button>
        </div>

        {/* Emergency Stop */}
        <div className="flex items-center justify-between p-3 bg-red-950/30 border border-red-900 rounded-lg">
          <div className="flex items-center gap-2">
            <AlertTriangle className={`h-5 w-5 ${emergencyStop ? "text-red-500 animate-pulse" : "text-zinc-400"}`} />
            <span className="text-sm font-medium">Parada de Emergência</span>
          </div>
          <Button
            variant={emergencyStop ? "default" : "destructive"}
            size="sm"
            onClick={handleEmergency}
          >
            {emergencyStop ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            {emergencyStop ? "Liberar" : "EMERGÊNCIA"}
          </Button>
        </div>

        {/* Gripper Control */}
        <div className="grid grid-cols-2 gap-4">
          {/* Position Slider */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-zinc-400">Posição da Garra</Label>
              <span className="text-xs font-mono text-primary">{gripperPosition.toFixed(0)}%</span>
            </div>
            <Slider
              value={[gripperPosition]}
              onValueChange={([v]) => {
                if (!emergencyStop) {
                  setGripperPosition(v);
                  sendGripperCommand(v, maxForce, gripperSpeed);
                }
              }}
              max={100}
              step={1}
              disabled={emergencyStop}
              className="py-2"
            />
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleOpen} disabled={emergencyStop} className="flex-1">
                <ArrowUp className="h-3 w-3" /> Abrir
              </Button>
              <Button size="sm" variant="outline" onClick={handleClose} disabled={emergencyStop} className="flex-1">
                <ArrowDown className="h-3 w-3" /> Fechar
              </Button>
            </div>
          </div>

          {/* Force Control */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-zinc-400">Força Máxima</Label>
              <span className="text-xs font-mono text-orange-400">{maxForce}N</span>
            </div>
            <Slider
              value={[maxForce]}
              onValueChange={([v]) => setMaxForce(v)}
              max={150}
              step={5}
              disabled={emergencyStop}
              className="py-2"
            />
            <div className="flex items-center gap-2">
              <Switch
                checked={forceLimitEnabled}
                onCheckedChange={setForceLimitEnabled}
                disabled={emergencyStop}
              />
              <span className="text-xs text-zinc-500">Limite de força ativo</span>
            </div>
          </div>
        </div>

        {/* Force Presets */}
        <div className="space-y-2">
          <Label className="text-xs text-zinc-500">Presets de Força</Label>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => handlePreset("Ovo", 5)} disabled={emergencyStop} className="text-xs">
              🥚 Ovo (5N)
            </Button>
            <Button size="sm" variant="outline" onClick={() => handlePreset("Garrafa", 20)} disabled={emergencyStop} className="text-xs">
              🧴 Garrafa (20N)
            </Button>
            <Button size="sm" variant="outline" onClick={() => handlePreset("Caixa", 50)} disabled={emergencyStop} className="text-xs">
              📦 Caixa (50N)
            </Button>
            <Button size="sm" variant="outline" onClick={() => handlePreset("Metal", 100)} disabled={emergencyStop} className="text-xs">
              🔧 Metal (100N)
            </Button>
          </div>
        </div>

        {/* Real-time Force Display */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="pt-3 pb-2">
              <div className="flex items-center gap-2">
                <Zap className="h-3 w-3 text-orange-400" />
                <span className="text-[10px] text-zinc-500">Força Atual</span>
              </div>
              <div className={`text-lg font-mono font-bold ${
                safetyStatus === "critical" ? "text-red-500" :
                safetyStatus === "warning" ? "text-yellow-500" : "text-green-500"
              }`}>
                {(latestForce?.force ?? 0).toFixed(1)}N
              </div>
              <div className="h-1.5 bg-zinc-800 rounded-full mt-1">
                <div
                  className={`h-full rounded-full transition-all ${
                    safetyStatus === "critical" ? "bg-red-500" :
                    safetyStatus === "warning" ? "bg-yellow-500" : "bg-green-500"
                  }`}
                  style={{ width: `${Math.min(100, forcePercent)}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="pt-3 pb-2">
              <div className="flex items-center gap-2">
                <RotateCcw className="h-3 w-3 text-purple-400" />
                <span className="text-[10px] text-zinc-500">Torque</span>
              </div>
              <div className="text-lg font-mono font-bold text-purple-400">
                {(latestForce?.torque ?? 0).toFixed(2)} Nm
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/50 border-zinc-800">
            <CardContent className="pt-3 pb-2">
              <div className="flex items-center gap-2">
                <Target className="h-3 w-3 text-cyan-400" />
                <span className="text-[10px] text-zinc-500">Esforço</span>
              </div>
              <div className="text-lg font-mono font-bold text-cyan-400">
                {(latestForce?.effort ?? 0).toFixed(0)}%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Speed Control */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs text-zinc-400">Velocidade</Label>
            <span className="text-xs font-mono text-zinc-500">{gripperSpeed}%</span>
          </div>
          <Slider
            value={[gripperSpeed]}
            onValueChange={([v]) => setGripperSpeed(v)}
            max={100}
            step={5}
            disabled={emergencyStop}
          />
        </div>

        {/* Status */}
        <div className="flex items-center justify-between text-xs text-zinc-500 pt-2 border-t border-zinc-800">
          <span>Segurança: <span className={
            safetyStatus === "critical" ? "text-red-500" :
            safetyStatus === "warning" ? "text-yellow-500" : "text-green-500"
          }>{safetyStatus === "critical" ? "CRÍTICO" : safetyStatus === "warning" ? "ATENÇÃO" : "SEGuro"}</span></span>
          <span>Força: {forcePercent.toFixed(0)}% do limite</span>
        </div>
      </CardContent>
    </Card>
  );
}