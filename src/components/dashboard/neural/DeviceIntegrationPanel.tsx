import React, { useState, useEffect, useCallback } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { bluetoothManager, type BLEDeviceInfo } from "@/lib/neural/bluetooth-manager";
import { iotBridge, type IoTDevice, type IoTMessage, type HealthCheckResult } from "@/lib/neural/iot-device-bridge";
import { smartHome, type SmartDeviceState } from "@/lib/neural/smart-home-controller";
import {
  Bluetooth, Wifi, Power, PowerOff, Radio, Thermometer, Bot, Camera,
  Speaker, Lightbulb, RefreshCw, Plug, Tv, Home, HeartPulse,
  CheckCircle2, XCircle, Activity, Clock, Zap,
  Signal, Timer, ArrowDown, ArrowUp, AlertTriangle, Palette, Sun
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DEVICE_ICONS: Record<string, React.ElementType> = {
  light: Lightbulb, sensor: Thermometer, robot: Bot,
  camera: Camera, thermostat: Thermometer, speaker: Speaker,
  plug: Plug, tv: Tv, custom: Radio,
};

function maskBrokerUrl(url: string): string {
  if (!url) return "—";
  const parts = url.split(".");
  if (parts.length > 1) return parts[0].slice(0, 8) + "***." + parts.slice(1).join(".");
  return url.slice(0, 12) + "***";
}

function formatUptime(ms: number | null): string {
  if (!ms) return "—";
  const secs = Math.floor(ms / 1000);
  if (secs < 60) return `${secs}s`;
  if (secs < 3600) return `${Math.floor(secs / 60)}m ${secs % 60}s`;
  return `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
}

function formatTime(ts: number | null): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export default function DeviceIntegrationPanel() {
  const [bleDevices, setBleDevices] = useState<BLEDeviceInfo[]>([]);
  const [iotDevices, setIotDevices] = useState<IoTDevice[]>([]);
  const [messages, setMessages] = useState<IoTMessage[]>([]);
  const [scanning, setScanning] = useState(false);
  const [mqttConnected, setMqttConnected] = useState(false);
  const [bleSupported] = useState(() => bluetoothManager.isSupported);
  const [discovering, setDiscovering] = useState(false);
  const [healthResult, setHealthResult] = useState<HealthCheckResult | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [alexaStatus, setAlexaStatus] = useState<string | null>(null);
  const [, forceUpdate] = useState(0);
  const { toast } = useToast();

  // Force re-render for uptime counter
  useEffect(() => {
    if (!mqttConnected) return;
    const interval = setInterval(() => forceUpdate(n => n + 1), 5000);
    return () => clearInterval(interval);
  }, [mqttConnected]);

  // BLE events
  useEffect(() => {
    const handler = (ev: any) => {
      if (ev.type === "device_connected" || ev.type === "device_disconnected" || ev.type === "scan_end") {
        setBleDevices(bluetoothManager.getDevices());
      }
      if (ev.type === "error") {
        toast({ title: "Bluetooth", description: ev.data.message, variant: "destructive" });
      }
    };
    bluetoothManager.on(handler);
    return () => bluetoothManager.off(handler);
  }, [toast]);

  // IoT events
  useEffect(() => {
    const handler = (ev: any) => {
      if (ev.type === "device_update") setIotDevices(iotBridge.deviceList);
      if (ev.type === "message") setMessages(iotBridge.messages.slice(-30));
      if (ev.type === "connected") {
        setMqttConnected(true);
        setConnecting(false);
        setIotDevices(iotBridge.deviceList);
        toast({ title: "MQTT Conectado", description: "Broker HiveMQ acessível via REST (persistente)" });
      }
      if (ev.type === "disconnected") {
        setMqttConnected(false);
        setConnecting(false);
      }
      if (ev.type === "reconnecting") {
        setConnecting(true);
      }
      if (ev.type === "health_check") setHealthResult(ev.data);
      if (ev.type === "error") {
        toast({ title: "IoT Bridge", description: ev.data.message, variant: "destructive" });
      }
    };
    iotBridge.on(handler);
    setIotDevices(iotBridge.deviceList);
    setMqttConnected(iotBridge.connected);
    return () => iotBridge.off(handler);
  }, [toast]);

  const handleBLEScan = useCallback(async () => {
    setScanning(true);
    try {
      const result = await bluetoothManager.scan();
      if (result) {
        await bluetoothManager.connect(result.id);
        toast({ title: "Dispositivo encontrado", description: result.name });
      }
      setBleDevices(bluetoothManager.getDevices());
    } catch {
      // Error handled by event
    }
    setScanning(false);
  }, [toast]);

  const handleMqttConnect = useCallback(async () => {
    if (mqttConnected) {
      iotBridge.disconnect();
      setMqttConnected(false);
      return;
    }
    setConnecting(true);
    try {
      const success = await iotBridge.connectViaEdgeFunction();
      if (!success) {
        toast({
          title: "Falha na conexão MQTT",
          description: iotBridge.getDiagnostics().lastError || "Verifique as credenciais HiveMQ",
          variant: "destructive",
        });
      }
    } finally {
      setConnecting(false);
    }
  }, [mqttConnected, toast]);

  const handleHealthCheck = useCallback(async () => {
    setCheckingHealth(true);
    try {
      const result = await iotBridge.healthCheck();
      if (!result.healthy) {
        toast({
          title: "Health Check falhou",
          description: result.message,
          variant: "destructive",
        });
      }
    } finally {
      setCheckingHealth(false);
    }
  }, [toast]);

  const handleDiscoverDevices = useCallback(async () => {
    if (!mqttConnected) {
      toast({ title: "Conecte ao MQTT primeiro", variant: "destructive" });
      return;
    }
    setDiscovering(true);
    try {
      const devices = await iotBridge.discoverDevices();
      setIotDevices(devices);
      const online = devices.filter(d => d.status === "online").length;
      toast({
        title: "Descoberta concluída",
        description: `${online} dispositivo(s) online de ${devices.length} registrados`,
      });
    } finally {
      setDiscovering(false);
    }
  }, [mqttConnected, toast]);

  const handleConnectAlexa = useCallback(async () => {
    setAlexaStatus("connecting");
    const result = await iotBridge.connectAlexa();
    setAlexaStatus(result.success ? "connected" : "error");
    setIotDevices(iotBridge.deviceList);
    toast({
      title: result.success ? "Alexa" : "Alexa - Atenção",
      description: result.message,
      variant: result.success ? "default" : "destructive",
    });
  }, [toast]);

  const diagnostics = iotBridge.getDiagnostics();
  const onlineDevices = iotDevices.filter(d => d.status === "online").length;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 w-full max-w-full overflow-x-hidden">
      {/* ═══ Connection Diagnostics ═══ */}
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm lg:col-span-2 overflow-hidden">
        <div className={`h-1 w-full transition-colors duration-500 ${mqttConnected ? "bg-primary" : connecting ? "bg-accent animate-pulse" : "bg-destructive/50"}`} />
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className={`p-1.5 rounded-md ${mqttConnected ? "bg-primary/10" : "bg-muted"}`}>
              <Activity className={`h-4 w-4 ${mqttConnected ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            Diagnóstico de Conexão MQTT
            <Badge variant={mqttConnected ? "default" : "destructive"} className="ml-auto text-[10px] font-medium">
              {mqttConnected ? "● Online" : connecting ? "◌ Conectando..." : "○ Offline"}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
            {[
              { label: "Broker", value: maskBrokerUrl(diagnostics.brokerUrl || ""), icon: Signal },
              { label: "Protocolo", value: "REST via Edge", icon: Zap },
              { label: "Latência", value: diagnostics.latencyMs ? `${diagnostics.latencyMs}ms` : "—", icon: Timer },
              { label: "Uptime", value: formatUptime(diagnostics.uptime), icon: Clock },
              { label: "Mensagens", value: String(diagnostics.messageCount), icon: Activity },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="p-2.5 rounded-lg bg-muted/30 border border-border/30">
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
                </div>
                <div className="text-xs font-mono font-medium text-foreground truncate">{value}</div>
              </div>
            ))}
          </div>

          {diagnostics.lastError && (
            <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20 text-xs text-destructive flex items-start gap-2">
              <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <span>{diagnostics.lastError}</span>
            </div>
          )}

          {healthResult && (
            <div className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
              healthResult.healthy
                ? "bg-primary/5 border-primary/20 text-primary"
                : "bg-destructive/5 border-destructive/20 text-destructive"
            }`}>
              {healthResult.healthy
                ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                : <XCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              }
              <div>
                <span className="font-medium">{healthResult.message}</span>
                {healthResult.latencyMs > 0 && (
                  <span className="ml-2 text-muted-foreground">({healthResult.latencyMs}ms)</span>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" onClick={handleHealthCheck} disabled={checkingHealth} className="gap-1.5">
              {checkingHealth ? <RefreshCw className="h-3 w-3 animate-spin" /> : <HeartPulse className="h-3 w-3" />}
              Health Check
            </Button>
            <Button
              size="sm"
              variant={mqttConnected ? "destructive" : "default"}
              onClick={handleMqttConnect}
              disabled={connecting}
              className="gap-1.5"
            >
              {connecting ? <RefreshCw className="h-3 w-3 animate-spin" /> : mqttConnected ? <PowerOff className="h-3 w-3" /> : <Power className="h-3 w-3" />}
              {connecting ? "Conectando..." : mqttConnected ? "Desconectar" : "Conectar HiveMQ"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ═══ BLE Panel ═══ */}
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base flex-wrap">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Bluetooth className="h-4 w-4 text-primary" />
            </div>
            <span className="truncate">Bluetooth Low Energy</span>
            <Badge variant="secondary" className="ml-auto text-[10px]">
              {bleDevices.filter(d => d.connected).length}/{bleDevices.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!bleSupported ? (
            <div className="p-4 rounded-lg bg-muted/30 border border-border/30 text-center space-y-2">
              <Bluetooth className="h-8 w-8 text-muted-foreground/30 mx-auto" />
              <p className="text-xs text-muted-foreground">
                {bluetoothManager.isNative
                  ? "Plugin BLE não instalado. Execute: npx cap sync"
                  : "Web Bluetooth não suportado neste navegador."}
              </p>
              <p className="text-[10px] text-muted-foreground/60">
                Use Chrome ou Edge (desktop) para conectar dispositivos BLE.
                Em dispositivos móveis, instale o app nativo via Capacitor.
              </p>
            </div>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={handleBLEScan} disabled={scanning} className="w-full gap-1.5">
                {scanning ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Bluetooth className="h-3 w-3" />}
                {scanning ? "Escaneando..." : "Escanear Dispositivos"}
              </Button>
              {bleDevices.length === 0 ? (
                <div className="p-6 text-center">
                  <Bluetooth className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Nenhum dispositivo BLE conectado</p>
                  <p className="text-[10px] text-muted-foreground/50 mt-1">
                    Clique em "Escanear" e selecione um dispositivo próximo
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {bleDevices.map(d => (
                    <div key={d.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/20 text-xs">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${d.connected ? "bg-primary shadow-sm shadow-primary/50" : "bg-muted-foreground/30"}`} />
                        <span className="font-medium text-foreground">{d.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        {d.batteryLevel !== undefined && (
                          <span className="text-[10px] font-mono">{d.batteryLevel}%</span>
                        )}
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0"
                          onClick={() => d.connected ? bluetoothManager.disconnect(d.id) : bluetoothManager.connect(d.id)}>
                          {d.connected ? <PowerOff className="h-3 w-3" /> : <Power className="h-3 w-3" />}
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* ═══ IoT Devices Panel ═══ */}
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base flex-wrap">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Wifi className="h-4 w-4 text-primary" />
            </div>
            <span className="truncate">Dispositivos IoT</span>
            <Badge variant={onlineDevices > 0 ? "default" : "secondary"} className="ml-auto text-[10px]">
              {onlineDevices}/{iotDevices.length} online
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {iotDevices.length === 0 ? (
            <div className="p-6 text-center">
              <Wifi className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Conecte ao MQTT para ver dispositivos</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {iotDevices.map(d => {
                const Icon = DEVICE_ICONS[d.type] || Radio;
                const isOnline = d.status === "online";
                return (
                  <div
                    key={d.id}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs transition-colors ${
                      isOnline
                        ? "bg-primary/5 border-primary/20"
                        : "bg-muted/30 border-border/20"
                    }`}
                  >
                    <div className={`p-1 rounded ${isOnline ? "bg-primary/10" : "bg-muted"}`}>
                      <Icon className={`h-3.5 w-3.5 ${isOnline ? "text-primary" : "text-muted-foreground/40"}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate text-foreground">{d.name}</div>
                      <div className="text-muted-foreground text-[10px] truncate">
                        {d.status}
                        {d.lastValue !== undefined && (
                          <span className="text-foreground/60">
                            {" — "}
                            {typeof d.lastValue === "object" ? JSON.stringify(d.lastValue) : String(d.lastValue)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Message Log */}
          {messages.length > 0 && (
            <div className="mt-2">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-muted-foreground">Histórico de Mensagens</span>
                <Button size="sm" variant="ghost" className="h-5 px-1.5 text-[10px]" onClick={() => { iotBridge.clearLog(); setMessages([]); }}>
                  Limpar
                </Button>
              </div>
              <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg bg-muted/20 border border-border/20 p-2">
                {messages.slice(-10).reverse().map((m, i) => (
                  <div key={i} className="text-[10px] font-mono flex items-start gap-1.5 text-muted-foreground">
                    {m.direction === "inbound"
                      ? <ArrowDown className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                      : <ArrowUp className="h-3 w-3 text-accent shrink-0 mt-0.5" />
                    }
                    <span className="text-muted-foreground/50">{formatTime(m.timestamp)}</span>
                    <span className="truncate text-foreground/70">
                      {m.topic}: {typeof m.payload === "object" ? JSON.stringify(m.payload) : String(m.payload)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ═══ Smart Home Discovery ═══ */}
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm lg:col-span-2 overflow-hidden">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base flex-wrap">
            <div className="p-1.5 rounded-md bg-primary/10">
              <Home className="h-4 w-4 text-primary" />
            </div>
            <span className="truncate">Casa Inteligente</span>
            <Badge variant="secondary" className="ml-auto text-[10px]">
              {onlineDevices}/{iotDevices.length} online
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!mqttConnected && (
            <div className="p-3 rounded-lg bg-accent/5 border border-accent/20 text-xs flex items-start gap-2">
              <AlertTriangle className="h-3.5 w-3.5 text-accent shrink-0 mt-0.5" />
              <span className="text-muted-foreground">
                Conecte ao broker MQTT primeiro para descobrir e controlar dispositivos.
              </span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2">
            <Button size="sm" variant="outline" onClick={handleDiscoverDevices} disabled={discovering || !mqttConnected} className="flex-1 gap-1.5">
              {discovering ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Wifi className="h-3 w-3" />}
              {discovering ? "Descobrindo..." : "Descobrir Dispositivos"}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleConnectAlexa}
              disabled={alexaStatus === "connecting"}
              className="gap-1.5"
            >
              {alexaStatus === "connecting" ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Speaker className="h-3 w-3" />}
              {alexaStatus === "connected" ? "Alexa ✓" : "Conectar Alexa"}
            </Button>
          </div>

          {/* Smart device grid filtered from IoT devices */}
          {iotDevices.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {iotDevices.filter(d => d.type === "speaker" || d.type === "light" || d.type === "thermostat" || d.type === "plug").map(d => {
                const Icon = DEVICE_ICONS[d.type] || Radio;
                const isOnline = d.status === "online";
                return (
                  <div
                    key={d.id}
                    className={`flex items-center gap-2.5 p-3 rounded-lg border text-xs transition-all ${
                      isOnline
                        ? "bg-primary/5 border-primary/20"
                        : "bg-muted/20 border-border/20"
                    }`}
                  >
                    <div className={`p-1.5 rounded-md ${isOnline ? "bg-primary/10" : "bg-muted"}`}>
                      <Icon className={`h-4 w-4 ${isOnline ? "text-primary" : "text-muted-foreground/30"}`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="font-medium truncate text-foreground">{d.name}</div>
                      <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <span className={`inline-block w-1.5 h-1.5 rounded-full ${isOnline ? "bg-primary" : "bg-muted-foreground/20"}`} />
                        {d.status}
                        {d.metadata?.protocol && (
                          <span className="text-muted-foreground/40">· {d.metadata.protocol}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-[10px] text-muted-foreground/50 text-center pt-1">
            Dispositivos descobertos via MQTT broker • Alexa requer Skill "Orion Bridge"
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
