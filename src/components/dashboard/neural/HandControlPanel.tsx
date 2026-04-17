/**
 * Hand Control Panel — 22 DoF hand control (like Tesla Optimus Gen 3)
 * Prioridade 2: Controle de mãos com dexteridade humana
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Wifi, WifiOff, Hand, HandMetal, Fingerprint, Grip,
  RotateCcw, Play, Pause, Save, RefreshCw, Zap,
  Scissors, Circle,
} from "lucide-react";
const FingerPrint = Fingerprint;
const Gripper = Grip;
const HandPalm = Hand;
const HandGrab = HandMetal;
const HandPeace = Hand;
import { useRosBridge } from "@/hooks/useRosBridge";
import { toast } from "sonner";

interface FingerJoint {
  name: string;
  position: number;  // 0 = extended, 1 = flexed
  maxAngle: number;  // max extension angle in degrees
}

// Hand configuration (22 DoF per hand)
const HAND_JOINTS_LEFT: FingerJoint[] = [
  { name: "thumb_cmc", position: 0, maxAngle: 45 },
  { name: "thumb_mcp", position: 0, maxAngle: 60 },
  { name: "thumb_ip", position: 0, maxAngle: 70 },
  { name: "index_mcp", position: 0, maxAngle: 90 },
  { name: "index_pip", position: 0, maxAngle: 100 },
  { name: "index_dip", position: 0, maxAngle: 90 },
  { name: "middle_mcp", position: 0, maxAngle: 90 },
  { name: "middle_pip", position: 0, maxAngle: 100 },
  { name: "middle_dip", position: 0, maxAngle: 90 },
  { name: "ring_mcp", position: 0, maxAngle: 90 },
  { name: "ring_pip", position: 0, maxAngle: 100 },
  { name: "ring_dip", position: 0, maxAngle: 90 },
  { name: "pinky_mcp", position: 0, maxAngle: 90 },
  { name: "pinky_pip", position: 0, maxAngle: 100 },
  { name: "pinky_dip", position: 0, maxAngle: 90 },
  // Wrist rotation (2 DoF)
  { name: "wrist_prono", position: 0, maxAngle: 180 },
  { name: "wrist_dev", position: 0, maxAngle: 90 },
];

const FINGER_GROUPS = [
  { name: "Polegar", joints: ["thumb_cmc", "thumb_mcp", "thumb_ip"], icon: HandPalm },
  { name: "Indicador", joints: ["index_mcp", "index_pip", "index_dip"], icon: FingerPrint },
  { name: "Médio", joints: ["middle_mcp", "middle_pip", "middle_dip"], icon: HandGrab },
  { name: "Anelar", joints: ["ring_mcp", "ring_pip", "ring_dip"], icon: HandPeace },
  { name: "Mínimo", joints: ["pinky_mcp", "pinky_pip", "pinky_dip"], icon: HandGrab },
];

interface HandState {
  connected: boolean;
  joints: number[];
  temperature: number;
  current: number;
  force: number;
}

export default function HandControlPanel() {
  const [rosbridgeUrl, setRosbridgeUrl] = useState("ws://localhost:9090");
  const [robotNamespace, setRobotNamespace] = useState("robot1");
  const [connected, setConnected] = useState(false);
  const [selectedHand, setSelectedHand] = useState<"left" | "right">("left");
  
  // Joint positions (0-1, where 0 = extended, 1 = fully flexed)
  const [jointPositions, setJointPositions] = useState<number[]>(
    new Array(17).fill(0)
  );
  
  // Hand state from sensors
  const [handState, setHandState] = useState<HandState>({
    connected: false,
    joints: [],
    temperature: 0,
    current: 0,
    force: 0,
  });
  
  // Tactile sensors (fingertips)
  const [tactileSensors, setTactileSensors] = useState<number[]>(new Array(5).fill(0));
  
  // Emergency stop
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

  // Subscribe to hand state topics
  useEffect(() => {
    if (!isConnected) return;
    
    const namespace = robotNamespace.startsWith("/") ? robotNamespace : `/${robotNamespace}`;
    const handPrefix = selectedHand;
    const unsubs: Array<() => void> = [];

    // Subscribe to hand joint states
    unsubs.push(
      subscribe(`${namespace}/hand_${handPrefix}_state`, "orion_hand_msgs/msg/HandState", (msg: any) => {
        setHandState({
          connected: true,
          joints: msg.joints ?? [],
          temperature: msg.temperature ?? 0,
          current: msg.current ?? 0,
          force: msg.total_force ?? 0,
        });
        if (msg.joints) setJointPositions(msg.joints);
      }, 50)
    );

    // Subscribe to tactile sensors (fingertips)
    unsubs.push(
      subscribe(`${namespace}/hand_${handPrefix}_tactile`, "orion_hand_msgs/msg/TactileSensors", (msg: any) => {
        setTactileSensors(msg.sensors ?? [0, 0, 0, 0, 0]);
      }, 100)
    );

    unsubsRef.current = unsubs;
    return () => { unsubs.forEach((fn) => fn()); };
  }, [isConnected, subscribe, robotNamespace, selectedHand]);

  // Send hand command
  const sendHandCommand = useCallback((positions: number[]) => {
    const namespace = robotNamespace.startsWith("/") ? robotNamespace : `/${robotNamespace}`;
    const msg = {
      joints: positions,
      hand_id: selectedHand,
      timestamp: Date.now(),
    };
    publish(`${namespace}/hand_${selectedHand}_cmd`, "orion_hand_msgs/msg/HandCommand", msg);
  }, [publish, robotNamespace, selectedHand]);

  // Update single finger group
  const updateFingerGroup = (groupIndex: number, position: number) => {
    if (emergencyStop) return;
    
    const newPositions = [...jointPositions];
    const group = FINGER_GROUPS[groupIndex];
    
    // Update all joints in the group
    group.joints.forEach((jointName, idx) => {
      const jointIndex = HAND_JOINTS_LEFT.findIndex(j => j.name === jointName);
      if (jointIndex >= 0) {
        newPositions[jointIndex] = position;
      }
    });
    
    setJointPositions(newPositions);
    sendHandCommand(newPositions);
  };

  // Hand gesture presets (like Tesla Optimus)
  const gestures = [
    { name: "✋ Abrerta", icon: HandPalm, joints: new Array(17).fill(0) },
    { name: "✊ Punho", icon: HandGrab, joints: [0.8, 0.9, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0.5, 0] },
    { name: "👍 Ok", icon: HandPalm, joints: [0, 0.3, 0.5, 0.8, 0.9, 1, 0.8, 0.9, 1, 0.8, 0.9, 1, 0.8, 0.9, 1, 0.3, 0] },
    { name: "✌️ Paz", icon: HandPeace, joints: [0.7, 0.8, 0.9, 0, 0, 0, 0, 0, 0, 0.8, 0.9, 1, 0.8, 0.9, 1, 0.3, 0] },
    { name: "☝️ Apontar", icon: FingerPrint, joints: [0.3, 0.5, 0.6, 0, 0, 0, 0.7, 0.8, 0.9, 0.7, 0.8, 0.9, 0.7, 0.8, 0.9, 0.3, 0] },
    { name: "✌️ Tesoura", icon: Scissors, joints: [0.8, 0.9, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0.8, 0.9, 1, 0.3, 0] },
  ];

  const executeGesture = (gesture: typeof gestures[0]) => {
    if (emergencyStop) return;
    setJointPositions(gesture.joints);
    sendHandCommand(gesture.joints);
    toast.info(`🖐️ ${gesture.name}`);
  };

  // Emergency stop
  const handleEmergency = () => {
    setEmergencyStop(!emergencyStop);
    if (!emergencyStop) {
      // Stop all movement
      const namespace = robotNamespace.startsWith("/") ? robotNamespace : `/${robotNamespace}`;
      publish(`${namespace}/hand_${selectedHand}_cmd`, "orion_hand_msgs/msg/HandCommand", { joints: new Array(17).fill(0) });
      toast.error("🛑 PARADA DE EMERGÊNCIA");
    }
  };

  // Fine control for individual fingers
  const FingerControl = ({ groupIndex }: { groupIndex: number }) => {
    const group = FINGER_GROUPS[groupIndex];
    const Icon = group.icon;
    const groupPosition = jointPositions[HAND_JOINTS_LEFT.findIndex(j => j.name === group.joints[0])] || 0;
    
    return (
      <div className="space-y-2 p-3 bg-zinc-900/30 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 text-[hsl(var(--tron-neon))]" />
            <span className="text-xs font-medium">{group.name}</span>
          </div>
          <span className="text-xs font-mono text-[hsl(var(--tron-neon))] [text-shadow:0_0_8px_hsl(var(--tron-neon)/0.4)]">{(groupPosition * 100).toFixed(0)}%</span>
        </div>
        <Slider
          value={[groupPosition * 100]}
          onValueChange={([v]) => updateFingerGroup(groupIndex, v / 100)}
          max={100}
          step={5}
          disabled={emergencyStop}
        />
        <div className="flex justify-between text-[10px] text-zinc-600">
          <span>Estendido</span>
          <span>Flexionado</span>
        </div>
      </div>
    );
  };

  return (
    <Card className="bg-[hsl(var(--tron-bg-deep))] text-[hsl(var(--tron-neon))] bg-zinc-950 border-zinc-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Hand className="h-4 w-4 text-[hsl(var(--tron-neon))]" />
            Controle de Mão — 22 DoF
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

        {/* Hand Selection */}
        <div className="flex items-center gap-4">
          <Label className="text-xs text-zinc-400">Mão:</Label>
          <div className="flex gap-2">
            <Button
              variant={selectedHand === "left" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedHand("left")}
            >
              <HandMetal className="h-3 w-3 mr-1" /> Esquerda
            </Button>
            <Button
              variant={selectedHand === "right" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedHand("right")}
            >
              <HandMetal className="h-3 w-3 mr-1" /> Direita
            </Button>
          </div>
        </div>

        {/* Emergency Stop */}
        <div className="flex items-center justify-between p-3 bg-red-950/30 border border-red-900 rounded-lg">
          <div className="flex items-center gap-2">
            <Hand className={`h-5 w-5 ${emergencyStop ? "text-[hsl(var(--tron-danger))] animate-pulse" : "text-zinc-400"}`} />
            <span className="text-sm font-medium">Parada de Emergência</span>
          </div>
          <Button
            variant={emergencyStop ? "default" : "destructive"}
            size="sm"
            onClick={handleEmergency}
          >
            {emergencyStop ? <Play className="h-3.5 w-3.5" /> : <Pause className="h-3.5 w-3.5" />}
            {emergencyStop ? "Liberar" : "PARAR"}
          </Button>
        </div>

        <Tabs defaultValue="gestures" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="gestures" className="text-xs">
              <Hand className="h-3 w-3 mr-1" /> Gestos
            </TabsTrigger>
            <TabsTrigger value="fingers" className="text-xs">
              <FingerPrint className="h-3 w-3 mr-1" /> Dedos
            </TabsTrigger>
          </TabsList>

          {/* Gestures Tab */}
          <TabsContent value="gestures" className="space-y-4 mt-3">
            <div className="grid grid-cols-3 gap-2">
              {gestures.map((gesture) => {
                const Icon = gesture.icon;
                return (
                  <Button
                    key={gesture.name}
                    size="sm"
                    variant="outline"
                    onClick={() => executeGesture(gesture)}
                    disabled={emergencyStop}
                    className="flex flex-col h-14"
                  >
                    <Icon className="h-5 w-5 mb-1" />
                    <span className="text-[10px]">{gesture.name}</span>
                  </Button>
                );
              })}
            </div>
          </TabsContent>

          {/* Individual Fingers Tab */}
          <TabsContent value="fingers" className="space-y-3 mt-3">
            {FINGER_GROUPS.map((group, idx) => (
              <FingerControl key={group.name} groupIndex={idx} />
            ))}
          </TabsContent>
        </Tabs>

        {/* Tactile Sensors Display */}
        <div className="space-y-2 pt-3 border-t border-zinc-800">
          <Label className="text-xs text-zinc-500">Sensores Táteis (Fingertips)</Label>
          <div className="flex gap-2">
            {tactileSensors.map((value, idx) => (
              <div key={idx} className="flex-1">
                <div className="text-[10px] text-center text-zinc-500 mb-1">
                  {["Polegar", "Indicador", "Médio", "Anelar", "Mínimo"][idx]}
                </div>
                <div className="h-8 bg-zinc-800 rounded relative overflow-hidden">
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-green-500 to-green-400 transition-all"
                    style={{ height: `${value * 100}%` }}
                  />
                </div>
                <div className="text-[10px] text-center font-mono mt-1">
                  {(value * 100).toFixed(0)}%
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Hand Status */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          <Card className="bg-[hsl(var(--tron-bg-deep))] text-[hsl(var(--tron-neon))] bg-zinc-900/50 border-zinc-800">
            <CardContent className="pt-2 pb-2">
              <div className="text-[10px] text-zinc-500">Temperatura</div>
              <div className={`text-sm font-mono ${handState.temperature > 50 ? "text-[hsl(var(--tron-danger))]" : "text-[hsl(var(--tron-neon))]"}`}>
                {handState.temperature.toFixed(1)}°C
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[hsl(var(--tron-bg-deep))] text-[hsl(var(--tron-neon))] bg-zinc-900/50 border-zinc-800">
            <CardContent className="pt-2 pb-2">
              <div className="text-[10px] text-zinc-500">Corrente</div>
              <div className="text-sm font-mono text-amber-400">
                {handState.current.toFixed(1)}A
              </div>
            </CardContent>
          </Card>
          <Card className="bg-[hsl(var(--tron-bg-deep))] text-[hsl(var(--tron-neon))] bg-zinc-900/50 border-zinc-800">
            <CardContent className="pt-2 pb-2">
              <div className="text-[10px] text-zinc-500">Força Total</div>
              <div className="text-sm font-mono text-[hsl(var(--tron-neon))] [text-shadow:0_0_8px_hsl(var(--tron-neon)/0.4)]">
                {handState.force.toFixed(1)}N
              </div>
            </CardContent>
          </Card>
        </div>

        {/* DoF Counter */}
        <div className="flex items-center justify-between text-xs text-zinc-500 pt-2 border-t border-zinc-800">
          <span>Graus de Liberdade: <span className="text-[hsl(var(--tron-neon))]">22 DoF</span></span>
          <span>Ativos: {jointPositions.filter(p => p > 0.1).length}/17</span>
        </div>
      </CardContent>
    </Card>
  );
}