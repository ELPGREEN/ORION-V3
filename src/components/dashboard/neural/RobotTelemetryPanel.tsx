/**
 * Robot Telemetry Dashboard — Real-time sensor data visualization
 * Connects via ROSBridge to display battery, temperature, velocity, IMU
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Battery, Thermometer, Gauge, Activity, Wifi, WifiOff,
  Zap, RotateCcw, ArrowUp, Navigation,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";
import { useRosBridge } from "@/hooks/useRosBridge";
import { toast } from "sonner";

interface TelemetryData {
  timestamp: number;
  battery: number;
  voltage: number;
  current: number;
  temperature: number;
  linearVel: number;
  angularVel: number;
  cpuUsage: number;
}

const MAX_POINTS = 60;

export default function RobotTelemetryPanel() {
  const [rosbridgeUrl, setRosbridgeUrl] = useState("ws://localhost:9090");
  const [history, setHistory] = useState<TelemetryData[]>([]);
  const [latest, setLatest] = useState<TelemetryData | null>(null);
  const unsubsRef = useRef<Array<() => void>>([]);

  const { connectionState, isConnected, connect, disconnect, subscribe } = useRosBridge({
    url: rosbridgeUrl,
  });

  const handleConnect = useCallback(() => {
    if (isConnected) {
      disconnect();
      unsubsRef.current.forEach((fn) => fn());
      unsubsRef.current = [];
    } else {
      connect();
    }
  }, [isConnected, connect, disconnect]);

  // Subscribe to topics when connected
  useEffect(() => {
    if (!isConnected) return;

    const addPoint = (partial: Partial<TelemetryData>) => {
      setLatest((prev) => {
        const updated = { ...(prev ?? { timestamp: 0, battery: 0, voltage: 0, current: 0, temperature: 0, linearVel: 0, angularVel: 0, cpuUsage: 0 }), ...partial, timestamp: Date.now() };
        setHistory((h) => [...h.slice(-(MAX_POINTS - 1)), updated]);
        return updated;
      });
    };

    const unsubs: Array<() => void> = [];

    // Battery
    unsubs.push(
      subscribe("/battery_state", "sensor_msgs/msg/BatteryState", (msg: any) => {
        addPoint({
          battery: (msg.percentage ?? 0) * 100,
          voltage: msg.voltage ?? 0,
          current: msg.current ?? 0,
          temperature: msg.temperature ?? 0,
        });
      }, 2000)
    );

    // Odometry → velocity
    unsubs.push(
      subscribe("/odom", "nav_msgs/msg/Odometry", (msg: any) => {
        addPoint({
          linearVel: Math.abs(msg?.twist?.twist?.linear?.x ?? 0),
          angularVel: Math.abs(msg?.twist?.twist?.angular?.z ?? 0),
        });
      }, 200)
    );

    // Diagnostics → CPU/temperature
    unsubs.push(
      subscribe("/diagnostics", "diagnostic_msgs/msg/DiagnosticArray", (msg: any) => {
        const statuses = msg?.status ?? [];
        for (const s of statuses) {
          for (const kv of s.values ?? []) {
            if (kv.key === "CPU Usage") addPoint({ cpuUsage: parseFloat(kv.value) || 0 });
            if (kv.key === "Temperature") addPoint({ temperature: parseFloat(kv.value) || 0 });
          }
        }
      }, 5000)
    );

    unsubsRef.current = unsubs;
    toast.success("📡 Telemetria conectada");

    return () => { unsubs.forEach((fn) => fn()); };
  }, [isConnected, subscribe]);

  const batteryColor = (latest?.battery ?? 0) > 50 ? "text-green-500" : (latest?.battery ?? 0) > 20 ? "text-yellow-500" : "text-red-500";

  return (
    <div className="space-y-4">
      {/* Connection bar */}
      <Card>
        <CardContent className="pt-4">
          <div className="flex items-center gap-3">
            <Input
              value={rosbridgeUrl}
              onChange={(e) => setRosbridgeUrl(e.target.value)}
              placeholder="ws://robot-ip:9090"
              className="flex-1 text-xs font-mono"
              disabled={isConnected}
            />
            <Button size="sm" variant={isConnected ? "destructive" : "default"} onClick={handleConnect}>
              {isConnected ? <WifiOff className="h-3.5 w-3.5 mr-1.5" /> : <Wifi className="h-3.5 w-3.5 mr-1.5" />}
              {isConnected ? "Desconectar" : "Conectar"}
            </Button>
            <Badge variant={isConnected ? "default" : "secondary"} className="text-[10px]">
              {connectionState}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Live gauges */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <GaugeCard icon={Battery} label="Bateria" value={`${(latest?.battery ?? 0).toFixed(0)}%`} sub={`${(latest?.voltage ?? 0).toFixed(1)}V`} color={batteryColor} />
        <GaugeCard icon={Thermometer} label="Temperatura" value={`${(latest?.temperature ?? 0).toFixed(1)}°C`} sub="Interno" color={(latest?.temperature ?? 0) > 60 ? "text-red-500" : "text-blue-400"} />
        <GaugeCard icon={Gauge} label="Velocidade" value={`${(latest?.linearVel ?? 0).toFixed(2)} m/s`} sub={`ω ${(latest?.angularVel ?? 0).toFixed(2)} rad/s`} color="text-primary" />
        <GaugeCard icon={Activity} label="CPU" value={`${(latest?.cpuUsage ?? 0).toFixed(0)}%`} sub="Processamento" color={(latest?.cpuUsage ?? 0) > 80 ? "text-red-500" : "text-green-500"} />
      </div>

      {/* Charts */}
      {history.length > 2 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <TelemetryChart title="Bateria (%)" data={history} dataKey="battery" color="hsl(var(--primary))" />
          <TelemetryChart title="Velocidade (m/s)" data={history} dataKey="linearVel" color="hsl(142, 76%, 36%)" />
          <TelemetryChart title="Temperatura (°C)" data={history} dataKey="temperature" color="hsl(0, 84%, 60%)" />
          <TelemetryChart title="CPU (%)" data={history} dataKey="cpuUsage" color="hsl(262, 83%, 58%)" />
        </div>
      )}

      {!isConnected && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground text-sm">
            <Navigation className="h-8 w-8 mx-auto mb-3 opacity-40" />
            <p>Conecte ao ROSBridge para visualizar telemetria em tempo real</p>
            <p className="text-[10px] mt-1 font-mono">ros2 launch rosbridge_server rosbridge_websocket_launch.xml</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ─── Gauge Card ───

function GaugeCard({ icon: Icon, label, value, sub, color }: { icon: any; label: string; value: string; sub: string; color: string }) {
  return (
    <Card>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`h-4 w-4 ${color}`} />
          <span className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</span>
        </div>
        <p className={`text-lg font-bold font-mono ${color}`}>{value}</p>
        <p className="text-[10px] text-muted-foreground">{sub}</p>
      </CardContent>
    </Card>
  );
}

// ─── Telemetry Chart ───

function TelemetryChart({ title, data, dataKey, color }: { title: string; data: TelemetryData[]; dataKey: string; color: string }) {
  const formatted = data.map((d) => ({
    t: new Date(d.timestamp).toLocaleTimeString("pt-BR", { minute: "2-digit", second: "2-digit" }),
    v: (d as any)[dataKey] ?? 0,
  }));

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={120}>
          <LineChart data={formatted}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="t" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" width={35} />
            <Tooltip contentStyle={{ fontSize: 11, background: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
            <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
