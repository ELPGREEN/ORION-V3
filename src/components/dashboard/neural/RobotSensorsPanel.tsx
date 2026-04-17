/**
 * Robot Sensors Panel — IMU, LaserScan, JointState Visualization
 * Completa a integração de sensores Priority 1
 */
import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Wifi, WifiOff, Compass, Gauge, Activity, Box, Eye,
  ChevronDown, ChevronUp, RotateCcw, MapPin, Navigation,
} from "lucide-react";
import { useRosBridge } from "@/hooks/useRosBridge";
import { toast } from "sonner";

interface ImuData {
  timestamp: number;
  orientation: { x: number; y: number; z: number; w: number };
  angularVelocity: { x: number; y: number; z: number };
  linearAcceleration: { x: number; y: number; z: number };
  roll: number;
  pitch: number;
  yaw: number;
}

interface JointData {
  timestamp: number;
  names: string[];
  positions: number[];
  velocities: number[];
  efforts: number[];
}

interface LaserScanData {
  timestamp: number;
  angleMin: number;
  angleMax: number;
  angleIncrement: number;
  rangeMin: number;
  rangeMax: number;
  ranges: number[];
}

const MAX_HISTORY = 30;

function toDegrees(rad: number): number {
  return rad * (180 / Math.PI);
}

function quaternionToEuler(q: { x: number; y: number; z: number; w: number }): { roll: number; pitch: number; yaw: number } {
  const { x, y, z, w } = q;
  const sinr_cosp = 2 * (w * x + y * z);
  const cosr_cosp = 1 - 2 * (x * x + y * y);
  const roll = Math.atan2(sinr_cosp, cosr_cosp);

  const sinp = 2 * (w * y - z * x);
  const pitch = Math.abs(sinp) >= 1 ? Math.sign(sinp) * Math.PI / 2 : Math.asin(sinp);

  const siny_cosp = 2 * (w * z + x * y);
  const cosy_cosp = 1 - 2 * (y * y + z * z);
  const yaw = Math.atan2(siny_cosp, cosy_cosp);

  return { roll, pitch, yaw };
}

function GaugeCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub: string; color: string }) {
  return (
    <Card className="bg-zinc-900/50 border-zinc-800">
      <CardContent className="pt-3 pb-2">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-zinc-400" />
          <span className="text-[10px] text-zinc-500 uppercase">{label}</span>
        </div>
        <div className={`text-lg font-mono font-bold ${color}`}>{value}</div>
        <div className="text-[10px] text-zinc-600">{sub}</div>
      </CardContent>
    </Card>
  );
}

export default function RobotSensorsPanel() {
  const [rosbridgeUrl, setRosbridgeUrl] = useState("ws://localhost:9090");
  const [imuHistory, setImuHistory] = useState<ImuData[]>([]);
  const [latestImu, setLatestImu] = useState<ImuData | null>(null);
  const [jointHistory, setJointHistory] = useState<JointData[]>([]);
  const [latestJoint, setLatestJoint] = useState<JointData | null>(null);
  const [laserScan, setLaserScan] = useState<LaserScanData | null>(null);
  const [robotNamespace, setRobotNamespace] = useState("robot1");
  const [connected, setConnected] = useState(false);
  const unsubsRef = useRef<Array<() => void>>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const { connectionState, isConnected, connect, disconnect, subscribe } = useRosBridge({ url: rosbridgeUrl });

  const handleConnect = useCallback(() => {
    if (isConnected) {
      disconnect();
      unsubsRef.current.forEach((fn) => fn());
      unsubsRef.current = [];
      setConnected(false);
      setImuHistory([]);
      setJointHistory([]);
      setLaserScan(null);
    } else {
      connect();
    }
  }, [isConnected, connect, disconnect]);

  useEffect(() => {
    setConnected(isConnected);
  }, [isConnected]);

  // Subscribe to sensor topics
  useEffect(() => {
    if (!isConnected) return;

    const namespace = robotNamespace.startsWith("/") ? robotNamespace : `/${robotNamespace}`;
    const unsubs: Array<() => void> = [];

    // IMU subscription
    unsubs.push(
      subscribe(`${namespace}/imu`, "sensor_msgs/msg/Imu", (msg: any) => {
        const orientation = msg.orientation ?? { x: 0, y: 0, z: 0, w: 1 };
        const euler = quaternionToEuler(orientation);
        const imuData: ImuData = {
          timestamp: Date.now(),
          orientation,
          angularVelocity: msg.angular_velocity ?? { x: 0, y: 0, z: 0 },
          linearAcceleration: msg.linear_acceleration ?? { x: 0, y: 0, z: 0 },
          roll: toDegrees(euler.roll),
          pitch: toDegrees(euler.pitch),
          yaw: toDegrees(euler.yaw),
        };
        setLatestImu(imuData);
        setImuHistory((prev) => [...prev.slice(-(MAX_HISTORY - 1)), imuData]);
      }, 50)
    );

    // Joint States subscription
    unsubs.push(
      subscribe(`${namespace}/joint_states`, "sensor_msgs/msg/JointState", (msg: any) => {
        const jointData: JointData = {
          timestamp: Date.now(),
          names: msg.name ?? [],
          positions: msg.position ?? [],
          velocities: msg.velocity ?? [],
          efforts: msg.effort ?? [],
        };
        setLatestJoint(jointData);
        setJointHistory((prev) => [...prev.slice(-(MAX_HISTORY - 1)), jointData]);
      }, 100)
    );

    // LaserScan subscription
    unsubs.push(
      subscribe(`${namespace}/scan`, "sensor_msgs/msg/LaserScan", (msg: any) => {
        const scanData: LaserScanData = {
          timestamp: Date.now(),
          angleMin: msg.angle_min ?? -Math.PI,
          angleMax: msg.angle_max ?? Math.PI,
          angleIncrement: msg.angle_increment ?? 0.01,
          rangeMin: msg.range_min ?? 0,
          rangeMax: msg.range_max ?? 10,
          ranges: msg.ranges ?? [],
        };
        setLaserScan(scanData);
      }, 200)
    );

    unsubsRef.current = unsubs;
    toast.success("📡 Sensores conectados");

    return () => { unsubs.forEach((fn) => fn()); };
  }, [isConnected, subscribe, robotNamespace]);

  // Render LaserScan visualization
  useEffect(() => {
    if (!laserScan || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const centerX = width / 2;
    const centerY = height / 2;
    const scale = Math.min(width, height) / 2 / (laserScan.rangeMax || 5);

    // Clear
    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, width, height);

    // Draw grid
    ctx.strokeStyle = "#1a1a2e";
    ctx.lineWidth = 1;
    for (let r = 1; r <= 5; r++) {
      ctx.beginPath();
      ctx.arc(centerX, centerY, r * scale, 0, 2 * Math.PI);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(centerX, 0); ctx.lineTo(centerX, height);
    ctx.moveTo(0, centerY); ctx.lineTo(width, centerY);
    ctx.stroke();

    // Draw robot (center)
    ctx.fillStyle = "#3b82f6";
    ctx.beginPath();
    ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
    ctx.fill();

    // Draw laser points
    const { ranges, angleMin, angleIncrement } = laserScan;
    ctx.fillStyle = "#22c55e";
    for (let i = 0; i < ranges.length; i++) {
      const range = ranges[i];
      if (range < laserScan.rangeMin || range > laserScan.rangeMax || !isFinite(range)) continue;
      const angle = angleMin + i * angleIncrement;
      const x = centerX + range * Math.cos(angle - Math.PI / 2) * scale;
      const y = centerY + range * Math.sin(angle - Math.PI / 2) * scale;
      const intensity = Math.min(255, Math.max(50, (range / laserScan.rangeMax) * 255));
      ctx.fillStyle = `rgba(34, 197, 94, ${intensity / 255})`;
      ctx.beginPath();
      ctx.arc(x, y, 2, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Draw direction indicator
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY);
    ctx.lineTo(centerX, centerY - 25);
    ctx.stroke();

  }, [laserScan]);

  // Joint names from robot
  const jointNames = latestJoint?.names ?? ["joint1", "joint2", "joint3", "joint4", "joint5", "joint6"];
  const jointPositions = latestJoint?.positions ?? [];
  const jointVelocities = latestJoint?.velocities ?? [];

  return (
    <Card className="bg-zinc-950 border-zinc-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Box className="h-4 w-4 text-[hsl(var(--tron-info))]" />
            Sensores Robô (IMU / LiDAR / Juntas)
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

        <Tabs defaultValue="imu" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="imu" className="text-xs">
              <Compass className="h-3 w-3 mr-1" /> IMU
            </TabsTrigger>
            <TabsTrigger value="laser" className="text-xs">
              <Eye className="h-3 w-3 mr-1" /> LiDAR
            </TabsTrigger>
            <TabsTrigger value="joints" className="text-xs">
              <Gauge className="h-3 w-3 mr-1" /> Juntas
            </TabsTrigger>
          </TabsList>

          {/* IMU Tab */}
          <TabsContent value="imu" className="space-y-3 mt-3">
            {latestImu ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  <GaugeCard icon={RotateCcw} label="Roll" value={`${latestImu.roll.toFixed(1)}°`} sub="X" color="text-[hsl(var(--tron-neon))]" />
                  <GaugeCard icon={RotateCcw} label="Pitch" value={`${latestImu.pitch.toFixed(1)}°`} sub="Y" color="text-[hsl(var(--tron-neon-soft))]" />
                  <GaugeCard icon={Navigation} label="Yaw" value={`${latestImu.yaw.toFixed(1)}°`} sub="Z" color="text-amber-400" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <Card className="bg-zinc-900/30 border-zinc-800 p-2">
                    <div className="text-[10px] text-zinc-500">Angular Velocity (rad/s)</div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-[hsl(var(--tron-neon))]">X: {latestImu.angularVelocity.x.toFixed(2)}</span>
                      <span className="text-[hsl(var(--tron-neon-soft))]">Y: {latestImu.angularVelocity.y.toFixed(2)}</span>
                      <span className="text-amber-400">Z: {latestImu.angularVelocity.z.toFixed(2)}</span>
                    </div>
                  </Card>
                  <Card className="bg-zinc-900/30 border-zinc-800 p-2">
                    <div className="text-[10px] text-zinc-500">Linear Accel (m/s²)</div>
                    <div className="flex justify-between text-xs font-mono">
                      <span className="text-[hsl(var(--tron-neon))]">X: {latestImu.linearAcceleration.x.toFixed(2)}</span>
                      <span className="text-[hsl(var(--tron-neon-soft))]">Y: {latestImu.linearAcceleration.y.toFixed(2)}</span>
                      <span className="text-amber-400">Z: {latestImu.linearAcceleration.z.toFixed(2)}</span>
                    </div>
                  </Card>
                </div>
              </>
            ) : (
              <div className="text-center text-zinc-500 text-sm py-8">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Aguardando dados do IMU...
              </div>
            )}
          </TabsContent>

          {/* LaserScan Tab */}
          <TabsContent value="laser" className="space-y-3 mt-3">
            {laserScan ? (
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] text-zinc-500">
                  <span>Range: {laserScan.rangeMin.toFixed(2)} - {laserScan.rangeMax.toFixed(2)}m</span>
                  <span>Points: {laserScan.ranges.length}</span>
                  <span>FOV: {toDegrees(laserScan.angleMax - laserScan.angleMin).toFixed(0)}°</span>
                </div>
                <canvas
                  ref={canvasRef}
                  width={300}
                  height={300}
                  className="w-full rounded-lg border border-zinc-800"
                  style={{ backgroundColor: "#0a0a0f" }}
                />
              </div>
            ) : (
              <div className="text-center text-zinc-500 text-sm py-8">
                <Eye className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Aguardando dados do LiDAR...
              </div>
            )}
          </TabsContent>

          {/* Joints Tab */}
          <TabsContent value="joints" className="space-y-3 mt-3">
            {latestJoint ? (
              <div className="space-y-2">
                <div className="text-[10px] text-zinc-500 mb-2">
                  {jointNames.length} juntas ativas
                </div>
                {jointNames.map((name, i) => (
                  <div key={name} className="flex items-center gap-2">
                    <div className="w-20 text-[10px] text-zinc-400 truncate" title={name}>
                      {name}
                    </div>
                    <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all"
                        style={{
                          width: `${Math.min(100, Math.max(0, (Math.abs(jointPositions[i] || 0) / Math.PI) * 100))}%`,
                        }}
                      />
                    </div>
                    <div className="w-16 text-[10px] font-mono text-right">
                      {(jointPositions[i] || 0).toFixed(2)} rad
                    </div>
                    <div className="w-12 text-[10px] font-mono text-right text-zinc-500">
                      {(jointVelocities[i] || 0).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-zinc-500 text-sm py-8">
                <Gauge className="h-8 w-8 mx-auto mb-2 opacity-50" />
                Aguardando dados das juntas...
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}