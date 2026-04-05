import { useState, useEffect, useCallback, useRef, lazy, Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bot, Wifi, WifiOff, Battery, Navigation, Gauge, AlertTriangle,
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight, Square, RotateCcw,
  Crosshair, Activity, Thermometer, Clock, Send, Zap,
  Cpu, Radio, Mic, Truck, Factory, Globe, Shield,
} from "lucide-react";
import { ros2Bridge, type RobotState, type ROS2CommandLog } from "@/lib/neural/ros2-protocol-bridge";
import { iotBridge } from "@/lib/neural/iot-device-bridge";
import { toast } from "sonner";

const RobotDigitalTwinPanel = lazy(() => import("./RobotDigitalTwinPanel"));
const RobotFleetManager = lazy(() => import("./RobotFleetManager"));
const RobotVoiceCommands = lazy(() => import("./RobotVoiceCommands"));
const VDA5050FleetPanel = lazy(() => import("./VDA5050FleetPanel"));
const ROS2AdvancedPanel = lazy(() => import("./ROS2AdvancedPanel"));
const IndustrialProtocolsPanel = lazy(() => import("./IndustrialProtocolsPanel"));
const NetworkIoTPanel = lazy(() => import("./NetworkIoTPanel"));
const SecurityCompliancePanel = lazy(() => import("./SecurityCompliancePanel"));

// ─── Joystick Component ───

function VirtualJoystick({ onMove, disabled }: { onMove: (lx: number, az: number) => void; disabled: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const radius = 60;

  const handlePointer = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const cx = rect.width / 2;
    const cy = rect.height / 2;
    let dx = clientX - rect.left - cx;
    let dy = clientY - rect.top - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > radius) { dx = (dx / dist) * radius; dy = (dy / dist) * radius; }
    setPos({ x: dx, y: dy });
    const lx = -dy / radius;
    const az = -dx / radius;
    onMove(Number((lx * 0.5).toFixed(3)), Number((az * 1.0).toFixed(3)));
  }, [onMove, radius]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    setDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    handlePointer(e.clientX, e.clientY);
  };
  const onPointerMove = (e: React.PointerEvent) => { if (dragging) handlePointer(e.clientX, e.clientY); };
  const onPointerUp = () => { setDragging(false); setPos({ x: 0, y: 0 }); onMove(0, 0); };

  return (
    <div
      ref={containerRef}
      className="relative w-[160px] h-[160px] rounded-full border-2 border-muted bg-muted/30 cursor-pointer select-none touch-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
    >
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
        <div className="w-full h-px bg-foreground" />
      </div>
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
        <div className="h-full w-px bg-foreground" />
      </div>
      <div
        className="absolute w-10 h-10 rounded-full bg-primary shadow-lg border-2 border-primary-foreground transition-transform"
        style={{
          left: `calc(50% + ${pos.x}px - 20px)`,
          top: `calc(50% + ${pos.y}px - 20px)`,
          opacity: disabled ? 0.3 : 1,
        }}
      />
      <ArrowUp className="absolute top-1 left-1/2 -translate-x-1/2 h-3 w-3 text-muted-foreground" />
      <ArrowDown className="absolute bottom-1 left-1/2 -translate-x-1/2 h-3 w-3 text-muted-foreground" />
      <ArrowLeft className="absolute left-1 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
      <ArrowRight className="absolute right-1 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
    </div>
  );
}

// ─── Control Tab Content (original panel) ───

function ControlTab({ robotId }: { robotId: string }) {
  const [robotState, setRobotState] = useState<RobotState | null>(null);
  const [mqttConnected, setMqttConnected] = useState(iotBridge.connected);
  const [commandLog, setCommandLog] = useState<ROS2CommandLog[]>([]);
  const [navGoal, setNavGoal] = useState({ x: 0, y: 0, theta: 0 });
  const [actuators, setActuators] = useState<Record<string, number>>({ gripper: 0, arm_joint_1: 0, arm_joint_2: 0 });
  const [polling, setPolling] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const demoIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    const unsub = ros2Bridge.onStateChange((state) => {
      if (state.id === robotId) {
        setRobotState({ ...state });
        setCommandLog([...ros2Bridge.log]);
      }
    });
    const initialState = ros2Bridge.getRobot(robotId);
    if (initialState) setRobotState({ ...initialState });
    setCommandLog([...ros2Bridge.log]);
    return unsub;
  }, [robotId]);

  useEffect(() => {
    const handler = () => setMqttConnected(iotBridge.connected);
    iotBridge.on(handler);
    return () => iotBridge.off(handler);
  }, []);

  // Auto-connect on mount if not connected
  useEffect(() => {
    if (!iotBridge.connected && !connecting) {
      setConnecting(true);
      iotBridge.connectViaEdgeFunction().then(ok => {
        setMqttConnected(ok);
        setConnecting(false);
        if (ok) {
          toast.success("MQTT conectado automaticamente");
          ros2Bridge.startTelemetryPolling(robotId, 3000);
          setPolling(true);
        }
      }).catch(() => setConnecting(false));
    } else if (iotBridge.connected && !polling) {
      ros2Bridge.startTelemetryPolling(robotId, 3000);
      setPolling(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Demo mode: simulate robot telemetry locally
  useEffect(() => {
    if (!demoMode) {
      if (demoIntervalRef.current) { clearInterval(demoIntervalRef.current); demoIntervalRef.current = null; }
      return;
    }
    const robot = ros2Bridge.getRobot(robotId);
    if (robot) {
      robot.connected = true;
      robot.lastHeartbeat = Date.now();
      robot.operationalMode = "idle";
    }

    demoIntervalRef.current = window.setInterval(() => {
      const r = ros2Bridge.getRobot(robotId);
      if (!r) return;
      const t = Date.now();
      r.connected = true;
      r.lastHeartbeat = t;
      r.battery = {
        header: { stamp: t, frame_id: "base_link" },
        voltage: 24.2 + Math.random() * 0.5,
        current: 1.2 + Math.random() * 0.3,
        charge: 0.75, capacity: 1.0,
        percentage: 0.72 + Math.random() * 0.05,
        power_supply_status: "discharging", present: true,
        temperature: 35 + Math.random() * 3,
      };
      r.odometry = {
        header: { stamp: t, frame_id: "odom" },
        child_frame_id: "base_link",
        pose: { pose: { position: { x: Math.sin(t / 5000) * 2, y: Math.cos(t / 5000) * 2, z: 0 }, orientation: { x: 0, y: 0, z: 0, w: 1 } } },
        twist: { twist: { linear: { x: 0.1, y: 0, z: 0 }, angular: { x: 0, y: 0, z: 0.05 } } },
      };
      r.imu = {
        header: { stamp: t, frame_id: "imu_link" },
        orientation: { x: 0, y: 0, z: 0, w: 1 },
        angular_velocity: { x: 0.01, y: -0.005, z: 0.02 + Math.random() * 0.01 },
        linear_acceleration: { x: 0.05, y: 0.02, z: 9.81 },
      };
      r.diagnostics = {
        level: "ok", name: "sistema", message: "Todos os sistemas operacionais",
        hardware_id: "orion-main",
        values: [
          { key: "cpu_temp", value: `${(45 + Math.random() * 10).toFixed(1)}°C` },
          { key: "ram_usage", value: `${(55 + Math.random() * 15).toFixed(0)}%` },
          { key: "disk_free", value: "12.4 GB" },
          { key: "uptime", value: "3h 42m" },
        ],
      };
      ros2Bridge["emitState"](r);
    }, 2000);

    return () => { if (demoIntervalRef.current) clearInterval(demoIntervalRef.current); };
  }, [demoMode, robotId]);

  const handleConnect = async () => {
    setConnecting(true);
    const ok = await iotBridge.connectViaEdgeFunction();
    setMqttConnected(ok);
    setConnecting(false);
    if (ok) {
      toast.success("MQTT conectado");
      if (!polling) {
        ros2Bridge.startTelemetryPolling(robotId, 3000);
        setPolling(true);
      }
    } else {
      toast.error("Falha ao conectar MQTT. Ative o modo Demo para testar.");
    }
  };

  const handleStartPolling = () => {
    ros2Bridge.startTelemetryPolling(robotId, 3000);
    setPolling(true);
    toast.success("Telemetria ativada");
  };

  const handleStopPolling = () => {
    ros2Bridge.stopTelemetryPolling(robotId);
    setPolling(false);
  };

  const handleJoystickMove = useCallback(async (lx: number, az: number) => {
    if (!mqttConnected && !demoMode) return;
    if (demoMode) {
      // In demo mode, update local state directly
      const r = ros2Bridge.getRobot(robotId);
      if (r) {
        r.operationalMode = (lx !== 0 || az !== 0) ? "manual" : "idle";
        ros2Bridge["emitState"](r);
      }
      return;
    }
    await ros2Bridge.sendCmdVel(robotId, { x: lx, y: 0, z: 0 }, { x: 0, y: 0, z: az });
    setCommandLog([...ros2Bridge.log]);
  }, [mqttConnected, robotId, demoMode]);

  const handleSendNavGoal = async () => {
    if (demoMode) {
      toast.success(`Nav goal simulado: (${navGoal.x.toFixed(1)}, ${navGoal.y.toFixed(1)})`);
      const r = ros2Bridge.getRobot(robotId);
      if (r) { r.operationalMode = "autonomous"; ros2Bridge["emitState"](r); }
      return;
    }
    const ok = await ros2Bridge.sendNavGoal(robotId, navGoal.x, navGoal.y, navGoal.theta);
    setCommandLog([...ros2Bridge.log]);
    if (ok) toast.success(`Nav goal enviado: (${navGoal.x}, ${navGoal.y})`);
  };

  const handleCancelNav = async () => {
    if (demoMode) {
      toast.info("Navegação cancelada (demo)");
      const r = ros2Bridge.getRobot(robotId);
      if (r) { r.operationalMode = "idle"; ros2Bridge["emitState"](r); }
      return;
    }
    await ros2Bridge.cancelNavigation(robotId);
    setCommandLog([...ros2Bridge.log]);
    toast.info("Navegação cancelada");
  };

  const handleActuator = async (name: string, value: number) => {
    setActuators(prev => ({ ...prev, [name]: value }));
    if (demoMode) return;
    await ros2Bridge.sendActuatorCommand(robotId, name, value);
    setCommandLog([...ros2Bridge.log]);
  };

  const handleEmergencyStop = async () => {
    const activate = !robotState?.emergencyStopped;
    if (demoMode) {
      const r = ros2Bridge.getRobot(robotId);
      if (r) {
        r.emergencyStopped = activate;
        r.operationalMode = activate ? "emergency_stop" : "idle";
        ros2Bridge["emitState"](r);
      }
      if (activate) toast.error("🚨 PARADA DE EMERGÊNCIA ATIVADA (Demo)");
      else toast.success("Parada de emergência desativada (Demo)");
      return;
    }
    await ros2Bridge.emergencyStop(robotId, activate);
    setCommandLog([...ros2Bridge.log]);
    if (activate) toast.error("🚨 PARADA DE EMERGÊNCIA ATIVADA");
    else toast.success("Parada de emergência desativada");
  };

  const isDisabled = (!mqttConnected && !demoMode) || robotState?.emergencyStopped === true;
  const batteryPct = robotState?.battery?.percentage ?? null;
  const batteryColor = batteryPct === null ? "text-muted-foreground" : batteryPct > 0.5 ? "text-green-500" : batteryPct > 0.2 ? "text-yellow-500" : "text-destructive";

  return (
    <div className="space-y-4">
      {/* Connection controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant={mqttConnected ? "default" : demoMode ? "outline" : "secondary"} className="gap-1">
          {mqttConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {mqttConnected ? "MQTT Online" : demoMode ? "🎮 Demo Mode" : connecting ? "Conectando..." : "Offline"}
        </Badge>
        <Badge variant={robotState?.connected ? "default" : "outline"} className="gap-1">
          <Activity className="h-3 w-3" />
          {robotState?.operationalMode ?? "idle"}
        </Badge>
        {!mqttConnected && !connecting && (
          <Button size="sm" onClick={handleConnect} disabled={connecting}>
            {connecting ? "Conectando..." : "Conectar MQTT"}
          </Button>
        )}
        {connecting && (
          <Button size="sm" variant="ghost" disabled>
            <span className="animate-spin mr-1">⟳</span> Conectando...
          </Button>
        )}
        <Button
          size="sm"
          variant={demoMode ? "default" : "outline"}
          onClick={() => setDemoMode(!demoMode)}
          className={demoMode ? "bg-amber-600 hover:bg-amber-500 text-white" : ""}
        >
          {demoMode ? "🎮 Demo Ativo" : "🎮 Modo Demo"}
        </Button>
        <Button size="sm" variant={polling ? "secondary" : "outline"} onClick={polling ? handleStopPolling : handleStartPolling} disabled={!mqttConnected && !demoMode}>
          {polling ? "Parar Telemetria" : "Iniciar Telemetria"}
        </Button>
      </div>

      {/* Demo mode info banner */}
      {demoMode && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300">
          <span>🎮</span>
          <span>Modo Demo ativo — dados simulados localmente. Conecte um robô real via MQTT para dados reais.</span>
        </div>
      )}

      {/* Emergency Stop */}
      <Button
        variant="destructive" size="lg"
        className={`w-full h-14 text-lg font-bold tracking-wider ${robotState?.emergencyStopped ? "animate-pulse" : ""}`}
        onClick={handleEmergencyStop}
      >
        <AlertTriangle className="h-6 w-6 mr-2" />
        {robotState?.emergencyStopped ? "🚨 EMERGÊNCIA ATIVA — CLIQUE PARA DESATIVAR" : "PARADA DE EMERGÊNCIA (E-STOP)"}
      </Button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Column 1: Joystick + Nav */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Crosshair className="h-4 w-4" />Controle Manual (cmd_vel)</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-4">
              <VirtualJoystick onMove={handleJoystickMove} disabled={isDisabled} />
              <div className="grid grid-cols-3 gap-1 w-full max-w-[180px]">
                <div />
                <Button size="sm" variant="outline" disabled={isDisabled} onPointerDown={() => handleJoystickMove(0.3, 0)} onPointerUp={() => handleJoystickMove(0, 0)}><ArrowUp className="h-4 w-4" /></Button>
                <div />
                <Button size="sm" variant="outline" disabled={isDisabled} onPointerDown={() => handleJoystickMove(0, 0.5)} onPointerUp={() => handleJoystickMove(0, 0)}><RotateCcw className="h-4 w-4" /></Button>
                <Button size="sm" variant="outline" disabled={isDisabled} onClick={() => handleJoystickMove(0, 0)}><Square className="h-3 w-3" /></Button>
                <Button size="sm" variant="outline" disabled={isDisabled} onPointerDown={() => handleJoystickMove(0, -0.5)} onPointerUp={() => handleJoystickMove(0, 0)}><RotateCcw className="h-4 w-4 scale-x-[-1]" /></Button>
                <div />
                <Button size="sm" variant="outline" disabled={isDisabled} onPointerDown={() => handleJoystickMove(-0.3, 0)} onPointerUp={() => handleJoystickMove(0, 0)}><ArrowDown className="h-4 w-4" /></Button>
                <div />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Navigation className="h-4 w-4" />Navegação Autônoma</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {(["x", "y", "theta"] as const).map((axis) => (
                <div key={axis} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground uppercase">{axis === "theta" ? "θ (rad)" : `${axis} (m)`}</span>
                    <span className="font-mono">{navGoal[axis].toFixed(2)}</span>
                  </div>
                  <Slider min={axis === "theta" ? -Math.PI : -10} max={axis === "theta" ? Math.PI : 10} step={0.1} value={[navGoal[axis]]} onValueChange={([v]) => setNavGoal(prev => ({ ...prev, [axis]: v }))} disabled={isDisabled} />
                </div>
              ))}
              <div className="flex gap-2">
                <Button size="sm" className="flex-1" disabled={isDisabled} onClick={handleSendNavGoal}><Send className="h-3 w-3 mr-1" /> Enviar Goal</Button>
                <Button size="sm" variant="outline" disabled={isDisabled} onClick={handleCancelNav}>Cancelar</Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Column 2: Sensors */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Battery className={`h-4 w-4 ${batteryColor}`} />Bateria</CardTitle></CardHeader>
            <CardContent>
              {robotState?.battery ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold">{(robotState.battery.percentage * 100).toFixed(0)}%</span>
                    <Badge variant="outline">{robotState.battery.power_supply_status}</Badge>
                  </div>
                  <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${batteryColor.replace("text-", "bg-")}`} style={{ width: `${robotState.battery.percentage * 100}%` }} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <span>Tensão: {robotState.battery.voltage.toFixed(1)}V</span>
                    <span>Corrente: {robotState.battery.current.toFixed(2)}A</span>
                    {robotState.battery.temperature != null && <span>Temp: {robotState.battery.temperature}°C</span>}
                  </div>
                </div>
              ) : <p className="text-sm text-muted-foreground">Sem dados de bateria</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Gauge className="h-4 w-4" />Odometria</CardTitle></CardHeader>
            <CardContent>
              {robotState?.odometry ? (
                <div className="grid grid-cols-3 gap-2 text-center">
                  {(["x", "y", "z"] as const).map((a) => (
                    <div key={a} className="space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase">{a}</span>
                      <p className="text-sm font-mono">{(robotState.odometry!.pose.pose.position[a] ?? 0).toFixed(3)}</p>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground">Sem dados de odometria</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4" />IMU</CardTitle></CardHeader>
            <CardContent>
              {robotState?.imu ? (
                <div className="space-y-2 text-xs">
                  <div><span className="text-muted-foreground">Aceleração:</span><span className="font-mono ml-1">x:{robotState.imu.linear_acceleration.x.toFixed(2)} y:{robotState.imu.linear_acceleration.y.toFixed(2)} z:{robotState.imu.linear_acceleration.z.toFixed(2)}</span></div>
                  <div><span className="text-muted-foreground">Vel. Angular:</span><span className="font-mono ml-1">x:{robotState.imu.angular_velocity.x.toFixed(2)} y:{robotState.imu.angular_velocity.y.toFixed(2)} z:{robotState.imu.angular_velocity.z.toFixed(2)}</span></div>
                </div>
              ) : <p className="text-sm text-muted-foreground">Sem dados de IMU</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Thermometer className="h-4 w-4" />Diagnósticos</CardTitle></CardHeader>
            <CardContent>
              {robotState?.diagnostics ? (
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant={robotState.diagnostics.level === "ok" ? "default" : "destructive"}>{robotState.diagnostics.level.toUpperCase()}</Badge>
                    <span className="text-xs">{robotState.diagnostics.message}</span>
                  </div>
                  {robotState.diagnostics.values.slice(0, 5).map((v, i) => (
                    <div key={i} className="flex justify-between text-xs text-muted-foreground"><span>{v.key}</span><span className="font-mono">{v.value}</span></div>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground">Sem diagnósticos</p>}
            </CardContent>
          </Card>
        </div>

        {/* Column 3: Actuators + Log */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4" />Atuadores</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              {Object.entries(actuators).map(([name, value]) => (
                <div key={name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{name.replace(/_/g, " ")}</span>
                    <span className="font-mono">{value.toFixed(2)}</span>
                  </div>
                  <Slider min={-1} max={1} step={0.01} value={[value]} onValueChange={([v]) => handleActuator(name, v)} disabled={isDisabled} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Bot className="h-4 w-4" />Status do Robô</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Conexão</span><Badge variant={robotState?.connected ? "default" : "secondary"} className="text-[10px]">{robotState?.connected ? "Online" : "Offline"}</Badge></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Modo</span><span className="font-mono">{robotState?.operationalMode ?? "idle"}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">E-Stop</span><Badge variant={robotState?.emergencyStopped ? "destructive" : "outline"} className="text-[10px]">{robotState?.emergencyStopped ? "ATIVO" : "Desativado"}</Badge></div>
                {robotState?.lastHeartbeat ? <div className="flex justify-between"><span className="text-muted-foreground">Heartbeat</span><span className="font-mono">{new Date(robotState.lastHeartbeat).toLocaleTimeString()}</span></div> : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" />Log de Comandos<Badge variant="outline" className="ml-auto text-[10px]">{commandLog.length}</Badge></CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-48">
                <div className="space-y-1">
                  {commandLog.slice(-30).reverse().map((entry, i) => (
                    <div key={i} className="flex items-start gap-2 text-[10px] py-1 border-b border-border/30 last:border-0">
                      <Badge variant={entry.direction === "sent" ? "default" : "secondary"} className="text-[9px] px-1 shrink-0">{entry.direction === "sent" ? "→" : "←"}</Badge>
                      <div className="min-w-0">
                        <span className="font-mono text-muted-foreground">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                        <span className="ml-1 text-foreground">{entry.type}</span>
                        <p className="font-mono text-muted-foreground truncate">{entry.topic}</p>
                      </div>
                    </div>
                  ))}
                  {commandLog.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Nenhum comando registrado</p>}
                </div>
              </ScrollArea>
              {commandLog.length > 0 && (
                <Button size="sm" variant="ghost" className="w-full mt-2 text-xs" onClick={() => { ros2Bridge.clearLog(); setCommandLog([]); }}>Limpar Log</Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Main Panel with Tabs ───

export default function RobotControlPanel() {
  const [activeRobotId, setActiveRobotId] = useState("main");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Bot className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Controle Robótico</h1>
          <p className="text-sm text-muted-foreground">ROS2 via MQTT • Digital Twin AAS • Frota Multi-Robô</p>
        </div>
      </div>

      <Tabs defaultValue="control" className="w-full">
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
          <TabsTrigger value="control" className="gap-1.5">
            <Crosshair className="h-3.5 w-3.5" /> Controle
          </TabsTrigger>
          <TabsTrigger value="twin" className="gap-1.5">
            <Cpu className="h-3.5 w-3.5" /> Digital Twin
          </TabsTrigger>
          <TabsTrigger value="fleet" className="gap-1.5">
            <Radio className="h-3.5 w-3.5" /> Frota
          </TabsTrigger>
          <TabsTrigger value="voice" className="gap-1.5">
            <Mic className="h-3.5 w-3.5" /> Voz
          </TabsTrigger>
          <TabsTrigger value="vda5050" className="gap-1.5">
            <Truck className="h-3.5 w-3.5" /> VDA 5050
          </TabsTrigger>
          <TabsTrigger value="ros2adv" className="gap-1.5">
            <Activity className="h-3.5 w-3.5" /> ROS2+
          </TabsTrigger>
          <TabsTrigger value="industrial" className="gap-1.5">
            <Factory className="h-3.5 w-3.5" /> Industrial
          </TabsTrigger>
          <TabsTrigger value="network" className="gap-1.5">
            <Globe className="h-3.5 w-3.5" /> Rede/IoT
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-1.5">
            <Shield className="h-3.5 w-3.5" /> Segurança
          </TabsTrigger>
        </TabsList>

        <Suspense fallback={<div className="py-8 text-center text-muted-foreground text-sm">Carregando...</div>}>
          <TabsContent value="control">
            <ControlTab robotId={activeRobotId} />
          </TabsContent>
          <TabsContent value="twin">
            <RobotDigitalTwinPanel robotId={activeRobotId} />
          </TabsContent>
          <TabsContent value="fleet">
            <RobotFleetManager activeRobotId={activeRobotId} onSelectRobot={setActiveRobotId} />
          </TabsContent>
          <TabsContent value="voice">
            <RobotVoiceCommands robotId={activeRobotId} />
          </TabsContent>
          <TabsContent value="vda5050">
            <VDA5050FleetPanel />
          </TabsContent>
          <TabsContent value="ros2adv">
            <ROS2AdvancedPanel />
          </TabsContent>
          <TabsContent value="industrial">
            <IndustrialProtocolsPanel />
          </TabsContent>
          <TabsContent value="network">
            <NetworkIoTPanel />
          </TabsContent>
          <TabsContent value="security">
            <SecurityCompliancePanel />
          </TabsContent>
        </Suspense>
      </Tabs>
    </div>
  );
}
