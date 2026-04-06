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
  BarChart3, Camera, ScanSearch, Workflow, Settings,
} from "lucide-react";
import { useRobotConnection } from "@/hooks/useRobotConnection";
import { useRobotConnectionContext } from "@/contexts/RobotConnectionContext";
import { toast } from "sonner";

const RobotDigitalTwinPanel = lazy(() => import("./RobotDigitalTwinPanel"));
const RobotFleetManager = lazy(() => import("./RobotFleetManager"));
const RobotVoiceCommands = lazy(() => import("./RobotVoiceCommands"));
const VDA5050FleetPanel = lazy(() => import("./VDA5050FleetPanel"));
const ROS2AdvancedPanel = lazy(() => import("./ROS2AdvancedPanel"));
const IndustrialProtocolsPanel = lazy(() => import("./IndustrialProtocolsPanel"));
const NetworkIoTPanel = lazy(() => import("./NetworkIoTPanel"));
const SecurityCompliancePanel = lazy(() => import("./SecurityCompliancePanel"));
const RobotTelemetryPanel = lazy(() => import("./RobotTelemetryPanel"));
const WebRTCCameraViewer = lazy(() => import("./WebRTCCameraViewer"));
const YOLOv8InspectionPanel = lazy(() => import("./YOLOv8InspectionPanel"));
const NodeREDPanel = lazy(() => import("./NodeREDPanel"));
const TireProductionPanel = lazy(() => import("./TireProductionPanel"));
const RobotConnectionManager = lazy(() => import("./RobotConnectionManager"));
const GrafanaDashboardPanel = lazy(() => import("./GrafanaDashboardPanel"));

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

// ─── Control Tab Content (unified client) ───

function ControlTab() {
  const { rosbridgeUrl } = useRobotConnectionContext();
  const {
    state, isConnected, connect, disconnect,
    sendCmdVel, sendNav2Goal: sendGoal, cancelNavigation,
    emergencyStop: eStop,
  } = useRobotConnection({ rosbridgeUrl });

  const [navGoal, setNavGoal] = useState({ x: 0, y: 0, theta: 0 });
  const [actuators, setActuators] = useState<Record<string, number>>({ gripper: 0, arm_joint_1: 0, arm_joint_2: 0 });

  const handleConnect = useCallback(() => {
    connect(rosbridgeUrl, "rosbridge");
    toast.info("Conectando ao ROSBridge...");
  }, [connect, rosbridgeUrl]);

  const handleDemo = useCallback(() => {
    connect(rosbridgeUrl, "demo");
    toast.success("🎮 Modo Demo ativado");
  }, [connect, rosbridgeUrl]);

  const handleJoystickMove = useCallback((lx: number, az: number) => {
    sendCmdVel(lx, az);
  }, [sendCmdVel]);

  const handleSendNavGoal = useCallback(() => {
    sendGoal(navGoal.x, navGoal.y, navGoal.theta);
    toast.success(`Nav goal enviado: (${navGoal.x.toFixed(1)}, ${navGoal.y.toFixed(1)})`);
  }, [sendGoal, navGoal]);

  const handleCancelNav = useCallback(() => {
    cancelNavigation();
    toast.info("Navegação cancelada");
  }, [cancelNavigation]);

  const handleEmergencyStop = useCallback(() => {
    const activate = !state.emergencyStopped;
    eStop(activate);
    if (activate) toast.error("🚨 PARADA DE EMERGÊNCIA ATIVADA");
    else toast.success("Parada de emergência desativada");
  }, [eStop, state.emergencyStopped]);

  const isDisabled = !isConnected || state.emergencyStopped;
  const batteryPct = state.battery?.percentage ?? null;
  const batteryColor = batteryPct === null ? "text-muted-foreground" : batteryPct > 0.5 ? "text-green-500" : batteryPct > 0.2 ? "text-yellow-500" : "text-destructive";

  return (
    <div className="space-y-4">
      {/* Connection controls */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge variant={isConnected ? "default" : "secondary"} className="gap-1">
          {isConnected ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {isConnected
            ? state.transport === "demo" ? "🎮 Demo Mode" : `ROSBridge (${state.connectionState})`
            : state.connectionState === "connecting" ? "Conectando..." : "Offline"}
        </Badge>
        <Badge variant={isConnected ? "default" : "outline"} className="gap-1">
          <Activity className="h-3 w-3" />
          {state.operationalMode}
        </Badge>
        {!isConnected && (
          <>
            <Button size="sm" onClick={handleConnect}>
              Conectar ROSBridge
            </Button>
            <Button size="sm" variant="outline" onClick={handleDemo} className="bg-amber-600/10 hover:bg-amber-600/20 text-amber-500">
              🎮 Modo Demo
            </Button>
          </>
        )}
        {isConnected && (
          <Button size="sm" variant="outline" onClick={disconnect}>
            Desconectar
          </Button>
        )}
      </div>

      {/* Demo mode info banner */}
      {state.transport === "demo" && isConnected && (
        <div className="flex items-center gap-2 px-3 py-2 bg-amber-500/10 border border-amber-500/20 rounded-lg text-xs text-amber-300">
          <span>🎮</span>
          <span>Modo Demo ativo — dados simulados. Conecte ROSBridge para dados reais.</span>
        </div>
      )}

      {/* Emergency Stop */}
      <Button
        variant="destructive" size="lg"
        className={`w-full h-14 text-lg font-bold tracking-wider ${state.emergencyStopped ? "animate-pulse" : ""}`}
        onClick={handleEmergencyStop}
      >
        <AlertTriangle className="h-6 w-6 mr-2" />
        {state.emergencyStopped ? "🚨 EMERGÊNCIA ATIVA — CLIQUE PARA DESATIVAR" : "PARADA DE EMERGÊNCIA (E-STOP)"}
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
              {state.battery ? (
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-2xl font-bold">{(state.battery.percentage * 100).toFixed(0)}%</span>
                    <Badge variant="outline">{state.battery.status}</Badge>
                  </div>
                  <div className="w-full h-3 bg-muted rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${batteryColor.replace("text-", "bg-")}`} style={{ width: `${state.battery.percentage * 100}%` }} />
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    <span>Tensão: {state.battery.voltage.toFixed(1)}V</span>
                    <span>Corrente: {state.battery.current.toFixed(2)}A</span>
                    {state.battery.temperature != null && <span>Temp: {state.battery.temperature.toFixed(1)}°C</span>}
                  </div>
                </div>
              ) : <p className="text-sm text-muted-foreground">Sem dados de bateria</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Gauge className="h-4 w-4" />Odometria</CardTitle></CardHeader>
            <CardContent>
              {state.odometry ? (
                <div className="grid grid-cols-3 gap-2 text-center">
                  {(["x", "y", "z"] as const).map((a) => (
                    <div key={a} className="space-y-1">
                      <span className="text-[10px] text-muted-foreground uppercase">{a}</span>
                      <p className="text-sm font-mono">{state.odometry![a].toFixed(3)}</p>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground">Sem dados de odometria</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Activity className="h-4 w-4" />IMU</CardTitle></CardHeader>
            <CardContent>
              {state.imu ? (
                <div className="space-y-2 text-xs">
                  <div><span className="text-muted-foreground">Aceleração:</span><span className="font-mono ml-1">x:{state.imu.ax.toFixed(2)} y:{state.imu.ay.toFixed(2)} z:{state.imu.az.toFixed(2)}</span></div>
                  <div><span className="text-muted-foreground">Vel. Angular:</span><span className="font-mono ml-1">x:{state.imu.gx.toFixed(2)} y:{state.imu.gy.toFixed(2)} z:{state.imu.gz.toFixed(2)}</span></div>
                </div>
              ) : <p className="text-sm text-muted-foreground">Sem dados de IMU</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Thermometer className="h-4 w-4" />Diagnósticos</CardTitle></CardHeader>
            <CardContent>
              {state.diagnostics.length > 0 ? (
                <div className="space-y-1">
                  {state.diagnostics.slice(0, 6).map((v, i) => (
                    <div key={i} className="flex justify-between text-xs text-muted-foreground"><span>{v.key}</span><span className="font-mono">{v.value}</span></div>
                  ))}
                </div>
              ) : <p className="text-sm text-muted-foreground">Sem diagnósticos</p>}
            </CardContent>
          </Card>
        </div>

        {/* Column 3: Actuators + Status */}
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
                  <Slider min={-1} max={1} step={0.01} value={[value]} onValueChange={([v]) => setActuators(prev => ({ ...prev, [name]: v }))} disabled={isDisabled} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Bot className="h-4 w-4" />Status do Robô</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Conexão</span><Badge variant={isConnected ? "default" : "secondary"} className="text-[10px]">{isConnected ? "Online" : "Offline"}</Badge></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Transporte</span><span className="font-mono">{state.transport}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Modo</span><span className="font-mono">{state.operationalMode}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">E-Stop</span><Badge variant={state.emergencyStopped ? "destructive" : "outline"} className="text-[10px]">{state.emergencyStopped ? "ATIVO" : "Desativado"}</Badge></div>
                {state.lastHeartbeat > 0 && <div className="flex justify-between"><span className="text-muted-foreground">Heartbeat</span><span className="font-mono">{new Date(state.lastHeartbeat).toLocaleTimeString()}</span></div>}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ─── Main Panel with Tabs ───

export default function RobotControlPanel() {
  const { rosbridgeUrl } = useRobotConnectionContext();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Bot className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Controle Robótico</h1>
          <p className="text-sm text-muted-foreground">ROS2 via ROSBridge WebSocket • Conexão Real</p>
        </div>
      </div>

      <Tabs defaultValue="connection" className="w-full">
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
          <TabsTrigger value="connection" className="gap-1.5">
            <Settings className="h-3.5 w-3.5" /> Conexão
          </TabsTrigger>
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
          <TabsTrigger value="telemetry" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" /> Telemetria
          </TabsTrigger>
          <TabsTrigger value="camera" className="gap-1.5">
            <Camera className="h-3.5 w-3.5" /> Câmera
          </TabsTrigger>
          <TabsTrigger value="yolov8" className="gap-1.5">
            <ScanSearch className="h-3.5 w-3.5" /> YOLOv8
          </TabsTrigger>
          <TabsTrigger value="nodered" className="gap-1.5">
            <Workflow className="h-3.5 w-3.5" /> Node-RED
          </TabsTrigger>
          <TabsTrigger value="tireline" className="gap-1.5">
            <Factory className="h-3.5 w-3.5" /> Linha Pneus
          </TabsTrigger>
          <TabsTrigger value="grafana" className="gap-1.5">
            <BarChart3 className="h-3.5 w-3.5" /> Grafana
          </TabsTrigger>
        </TabsList>

        <Suspense fallback={<div className="py-8 text-center text-muted-foreground text-sm">Carregando...</div>}>
          <TabsContent value="connection">
            <RobotConnectionManager />
          </TabsContent>
          <TabsContent value="control">
            <ControlTab />
          </TabsContent>
          <TabsContent value="twin">
            <RobotDigitalTwinPanel robotId="main" />
          </TabsContent>
          <TabsContent value="fleet">
            <RobotFleetManager activeRobotId="main" onSelectRobot={() => {}} />
          </TabsContent>
          <TabsContent value="voice">
            <RobotVoiceCommands robotId="main" />
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
          <TabsContent value="telemetry">
            <RobotTelemetryPanel rosbridgeUrl={rosbridgeUrl} />
          </TabsContent>
          <TabsContent value="camera">
            <WebRTCCameraViewer rosbridgeUrl={rosbridgeUrl} />
          </TabsContent>
          <TabsContent value="yolov8">
            <YOLOv8InspectionPanel />
          </TabsContent>
          <TabsContent value="nodered">
            <NodeREDPanel />
          </TabsContent>
          <TabsContent value="tireline">
            <TireProductionPanel rosbridgeUrl={rosbridgeUrl} />
          </TabsContent>
          <TabsContent value="grafana">
            <GrafanaDashboardPanel />
          </TabsContent>
        </Suspense>
      </Tabs>
    </div>
  );
}
