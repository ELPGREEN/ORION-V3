/**
 * Inverse Kinematics Panel — Move robot arm to X,Y,Z position
 * Prioridade 2: Cinética inversa para controle de braços
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Wifi, WifiOff, Bone, Box, Target, RotateCcw, Play, Pause,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Move, Zap,
  ChevronRight, Save, RefreshCw,
} from "lucide-react";
const Arm = Bone;
import { useRosBridge } from "@/hooks/useRosBridge";
import { toast } from "sonner";

interface JointAngles {
  shoulder_pan: number;
  shoulder_lift: number;
  elbow: number;
  wrist1: number;
  wrist2: number;
  wrist3: number;
}

interface CartesianPosition {
  x: number;
  y: number;
  z: number;
  roll: number;
  pitch: number;
  yaw: number;
}

interface TrajectoryPoint {
  timestamp: number;
  targetPos: CartesianPosition;
  currentPos: CartesianPosition;
  error: number;
}

// Default safe home position
const HOME_POSITION: CartesianPosition = { x: 0.3, y: 0, z: 0.5, roll: 0, pitch: 0, yaw: 0 };

// Workspace limits (in meters)
const WORKSPACE_LIMITS = {
  x: { min: -0.5, max: 0.8 },
  y: { min: -0.8, max: 0.8 },
  z: { min: 0, max: 0.8 },
};

export default function InverseKinematicsPanel() {
  const [rosbridgeUrl, setRosbridgeUrl] = useState("ws://localhost:9090");
  const [robotNamespace, setRobotNamespace] = useState("robot1");
  const [connected, setConnected] = useState(false);
  const [selectedArm, setSelectedArm] = useState("left");  // left or right arm
  
  // Target position (Cartesian)
  const [targetPos, setTargetPos] = useState<CartesianPosition>(HOME_POSITION);
  
  // Current joint angles (from robot feedback)
  const [currentJoints, setCurrentJoints] = useState<JointAngles | null>(null);
  
  // Calculated joint angles (from IK solver)
  const [calculatedJoints, setCalculatedJoints] = useState<JointAngles | null>(null);
  
  // Trajectory tracking
  const [trajectory, setTrajectory] = useState<TrajectoryPoint[]>([]);
  const [isMoving, setIsMoving] = useState(false);
  
  const unsubsRef = useRef<Array<() => void>>([]);
  const { isConnected, connect, disconnect, subscribe, publish, callService } = useRosBridge({ url: rosbridgeUrl });

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

  // Subscribe to joint states
  useEffect(() => {
    if (!isConnected) return;
    
    const namespace = robotNamespace.startsWith("/") ? robotNamespace : `/${robotNamespace}`;
    const armPrefix = selectedArm === "left" ? "arm_left" : "arm_right";
    const unsubs: Array<() => void> = [];

    // Subscribe to joint states
    unsubs.push(
      subscribe(`${namespace}/${armPrefix}_joint_states`, "sensor_msgs/msg/JointState", (msg: any) => {
        const names = msg.name ?? [];
        const positions = msg.position ?? [];
        
        const joints: JointAngles = {
          shoulder_pan: positions[names.indexOf(`${armPrefix}_shoulder_pan_joint`)] ?? 0,
          shoulder_lift: positions[names.indexOf(`${armPrefix}_shoulder_lift_joint`)] ?? 0,
          elbow: positions[names.indexOf(`${armPrefix}_elbow_joint`)] ?? 0,
          wrist1: positions[names.indexOf(`${armPrefix}_wrist_1_joint`)] ?? 0,
          wrist2: positions[names.indexOf(`${armPrefix}_wrist_2_joint`)] ?? 0,
          wrist3: positions[names.indexOf(`${armPrefix}_wrist_3_joint`)] ?? 0,
        };
        setCurrentJoints(joints);
      }, 100)
    );

    unsubsRef.current = unsubs;
    return () => { unsubs.forEach((fn) => fn()); };
  }, [isConnected, subscribe, robotNamespace, selectedArm]);

  // Simple IK solver (simplified version for demo)
  // In production, useMoveIt or external IK solver
  const solveIK = (pos: CartesianPosition): JointAngles => {
    // Simplified analytical IK for 6-DOF arm
    // This is a placeholder - real implementation would use MoveIt! or similar
    const shoulderPan = Math.atan2(pos.y, pos.x);
    const shoulderLift = Math.atan2(pos.z, Math.sqrt(pos.x * pos.x + pos.y * pos.y)) - Math.PI / 4;
    const elbow = -Math.abs(Math.atan2(pos.z - 0.3, 0.4)) + Math.PI / 2;
    const joints: JointAngles = {
      shoulder_pan: shoulderPan,
      shoulder_lift: shoulderLift,
      elbow,
      wrist1: -shoulderLift - elbow,
      wrist2: pos.roll,
      wrist3: pos.pitch,
    };
    return joints;
  };

  // Send trajectory goal to MoveIt
  const sendTrajectory = useCallback(async () => {
    const namespace = robotNamespace.startsWith("/") ? robotNamespace : `/${robotNamespace}`;
    const armPrefix = selectedArm === "left" ? "arm_left" : "arm_right";
    
    // Calculate IK
    const joints = solveIK(targetPos);
    setCalculatedJoints(joints);
    
    // Build trajectory message
    const trajectoryMsg = {
      joint_names: [
        `${armPrefix}_shoulder_pan_joint`,
        `${armPrefix}_shoulder_lift_joint`,
        `${armPrefix}_elbow_joint`,
        `${armPrefix}_wrist_1_joint`,
        `${armPrefix}_wrist_2_joint`,
        `${armPrefix}_wrist_3_joint`,
      ],
      points: [{
        positions: [
          joints.shoulder_pan,
          joints.shoulder_lift,
          joints.elbow,
          joints.wrist1,
          joints.wrist2,
          joints.wrist3,
        ],
        velocities: Array(6).fill(0),
        accelerations: Array(6).fill(0),
        time_from_start: { secs: 2, nsecs: 0 },
      }],
    };
    
    // Send to MoveIt action
    publish(`${namespace}/${armPrefix}_controller/follow_joint_trajectory`, "control_msgs/msg/FollowJointTrajectoryGoal", trajectoryMsg);
    
    setIsMoving(true);
    toast.info(`🎯 Movendo para X:${targetPos.x.toFixed(2)} Y:${targetPos.y.toFixed(2)} Z:${targetPos.z.toFixed(2)}`);
    
    // Simulate movement completion
    setTimeout(() => setIsMoving(false), 2000);
  }, [publish, robotNamespace, selectedArm, targetPos]);

  // Move to home position
  const moveHome = () => {
    setTargetPos(HOME_POSITION);
    sendTrajectory();
  };

  // Quick position presets
  const presets = [
    { name: "🏠 Home", pos: HOME_POSITION },
    { name: "📦 Pick", pos: { x: 0.4, y: 0.3, z: 0.2, roll: 0, pitch: 0, yaw: 0 } },
    { name: "🧩 Place", pos: { x: 0.4, y: -0.3, z: 0.4, roll: 0, pitch: 0, yaw: 0 } },
    { name: "🔧 Inspect", pos: { x: 0.5, y: 0, z: 0.3, roll: 0, pitch: Math.PI/4, yaw: 0 } },
  ];

  // Move incrementally
  const moveIncremental = (axis: "x" | "y" | "z", direction: number) => {
    const delta = 0.05;
    setTargetPos(prev => ({
      ...prev,
      [axis]: Math.max(WORKSPACE_LIMITS[axis].min, Math.min(WORKSPACE_LIMITS[axis].max, prev[axis] + direction * delta))
    }));
  };

  return (
    <Card className="bg-zinc-950 border-zinc-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Arm className="h-4 w-4 text-purple-400" />
            Cinética Inversa — Braço Robótico
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

        {/* Arm Selection */}
        <div className="flex items-center gap-4">
          <Label className="text-xs text-zinc-400">Braço:</Label>
          <div className="flex gap-2">
            <Button
              variant={selectedArm === "left" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedArm("left")}
            >
              <ChevronRight className="h-3 w-3 rotate-180" /> Esquerdo
            </Button>
            <Button
              variant={selectedArm === "right" ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedArm("right")}
            >
              <ChevronRight className="h-3 w-3" /> Direito
            </Button>
          </div>
        </div>

        <Tabs defaultValue="cartesian" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="cartesian" className="text-xs">
              <Target className="h-3 w-3 mr-1" /> Cartesianas
            </TabsTrigger>
            <TabsTrigger value="joints" className="text-xs">
              <RotateCcw className="h-3 w-3 mr-1" /> Juntas
            </TabsTrigger>
          </TabsList>

          {/* Cartesian Control */}
          <TabsContent value="cartesian" className="space-y-4 mt-3">
            {/* Target Position Display */}
            <div className="grid grid-cols-3 gap-3">
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="pt-3 pb-2">
                  <Label className="text-[10px] text-zinc-500">X (m)</Label>
                  <div className="text-lg font-mono text-cyan-400">{targetPos.x.toFixed(3)}</div>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="pt-3 pb-2">
                  <Label className="text-[10px] text-zinc-500">Y (m)</Label>
                  <div className="text-lg font-mono text-purple-400">{targetPos.y.toFixed(3)}</div>
                </CardContent>
              </Card>
              <Card className="bg-zinc-900/50 border-zinc-800">
                <CardContent className="pt-3 pb-2">
                  <Label className="text-[10px] text-zinc-500">Z (m)</Label>
                  <div className="text-lg font-mono text-amber-400">{targetPos.z.toFixed(3)}</div>
                </CardContent>
              </Card>
            </div>

            {/* Position Sliders */}
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <Label className="text-zinc-400">X (frente/trás)</Label>
                  <span className="text-zinc-500">{targetPos.x.toFixed(2)}m</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => moveIncremental("x", -1)}>-</Button>
                  <Slider
                    value={[targetPos.x]}
                    onValueChange={([v]) => setTargetPos(p => ({ ...p, x: v }))}
                    min={WORKSPACE_LIMITS.x.min}
                    max={WORKSPACE_LIMITS.x.max}
                    step={0.01}
                    className="flex-1"
                  />
                  <Button size="sm" variant="outline" onClick={() => moveIncremental("x", 1)}>+</Button>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <Label className="text-zinc-400">Y (esquerda/direita)</Label>
                  <span className="text-zinc-500">{targetPos.y.toFixed(2)}m</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => moveIncremental("y", -1)}>-</Button>
                  <Slider
                    value={[targetPos.y]}
                    onValueChange={([v]) => setTargetPos(p => ({ ...p, y: v }))}
                    min={WORKSPACE_LIMITS.y.min}
                    max={WORKSPACE_LIMITS.y.max}
                    step={0.01}
                    className="flex-1"
                  />
                  <Button size="sm" variant="outline" onClick={() => moveIncremental("y", 1)}>+</Button>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <Label className="text-zinc-400">Z (cima/baixo)</Label>
                  <span className="text-zinc-500">{targetPos.z.toFixed(2)}m</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => moveIncremental("z", -1)}>-</Button>
                  <Slider
                    value={[targetPos.z]}
                    onValueChange={([v]) => setTargetPos(p => ({ ...p, z: v }))}
                    min={WORKSPACE_LIMITS.z.min}
                    max={WORKSPACE_LIMITS.z.max}
                    step={0.01}
                    className="flex-1"
                  />
                  <Button size="sm" variant="outline" onClick={() => moveIncremental("z", 1)}>+</Button>
                </div>
              </div>
            </div>

            {/* Position Presets */}
            <div className="space-y-2">
              <Label className="text-xs text-zinc-500">Posições Pré-definidas</Label>
              <div className="grid grid-cols-2 gap-2">
                {presets.map((preset) => (
                  <Button
                    key={preset.name}
                    size="sm"
                    variant="outline"
                    onClick={() => { setTargetPos(preset.pos); }}
                  >
                    {preset.name}
                  </Button>
                ))}
              </div>
            </div>

            {/* Execute Button */}
            <Button
              className="w-full"
              onClick={sendTrajectory}
              disabled={isMoving}
            >
              {isMoving ? (
                <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Movendo...</>
              ) : (
                <><Move className="h-4 w-4 mr-2" /> Executar Movimento</>
              )}
            </Button>
          </TabsContent>

          {/* Joint Angles Display */}
          <TabsContent value="joints" className="space-y-4 mt-3">
            {/* Current Joints */}
            {currentJoints ? (
              <div className="space-y-2">
                <Label className="text-xs text-zinc-500">Ângulos Atuais (rad)</Label>
                {Object.entries(currentJoints).map(([name, value]) => (
                  <div key={name} className="flex items-center gap-2">
                    <div className="w-28 text-[10px] text-zinc-400 capitalize">{name.replace("_", " ")}</div>
                    <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-400"
                        style={{ width: `${Math.min(100, Math.abs(value) / Math.PI * 100)}%` }}
                      />
                    </div>
                    <div className="w-16 text-[10px] font-mono text-right">{value.toFixed(3)}</div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-zinc-500 py-4">
                <RotateCcw className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Aguardando dados das juntas...</p>
              </div>
            )}

            {/* Calculated Joints from IK */}
            {calculatedJoints && (
              <div className="space-y-2 pt-3 border-t border-zinc-800">
                <Label className="text-xs text-purple-400">Ângulos Calculados (IK)</Label>
                {Object.entries(calculatedJoints).map(([name, value]) => (
                  <div key={name} className="flex items-center gap-2">
                    <div className="w-28 text-[10px] text-zinc-400 capitalize">{name.replace("_", " ")}</div>
                    <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-purple-500 to-pink-400"
                        style={{ width: `${Math.min(100, Math.abs(value) / Math.PI * 100)}%` }}
                      />
                    </div>
                    <div className="w-16 text-[10px] font-mono text-right text-purple-400">{value.toFixed(3)}</div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        {/* Quick Actions */}
        <div className="flex gap-2 pt-2 border-t border-zinc-800">
          <Button size="sm" variant="outline" onClick={moveHome} className="flex-1">
            <Home className="h-3 w-3 mr-1" /> Home
          </Button>
          <Button size="sm" variant="outline" onClick={() => setTargetPos(HOME_POSITION)} className="flex-1">
            <RefreshCw className="h-3 w-3 mr-1" /> Reset
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function Home({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}