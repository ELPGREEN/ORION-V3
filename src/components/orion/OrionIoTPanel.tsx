/**
 * Orion IoT Panel — Manage connected devices (MQTT, Bluetooth, WiFi)
 * Cameras, lamps, TVs, radios, computers — all from the Neural Panel
 */
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Radio, Wifi, Bluetooth, Camera, Lightbulb, Tv, Speaker,
  Thermometer, Power, RefreshCw, MonitorSmartphone, Cpu, Plug,
  Signal, AlertTriangle, CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { iotBridge, type IoTDevice } from "@/lib/neural/iot-device-bridge";
import { bluetoothManager, type BLEDeviceInfo } from "@/lib/neural/bluetooth-manager";

const DEVICE_ICONS: Record<string, React.ElementType> = {
  camera: Camera, light: Lightbulb, tv: Tv, speaker: Speaker,
  thermostat: Thermometer, sensor: Thermometer, plug: Plug,
  computer: MonitorSmartphone, robot: Cpu, custom: Radio,
};

export function OrionIoTPanel() {
  const [iotDevices, setIotDevices] = useState<IoTDevice[]>([]);
  const [bleDevices, setBleDevices] = useState<BLEDeviceInfo[]>([]);
  const [mqttConnected, setMqttConnected] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [discovering, setDiscovering] = useState(false);

  const refreshDevices = useCallback(async () => {
    try {
      setMqttConnected(iotBridge.isConnected);
      const devices = iotBridge.getDevices();
      setIotDevices([...devices]);
      setBleDevices(bluetoothManager.getDevices());
    } catch {}
  }, []);

  useEffect(() => {
    refreshDevices();
    const interval = setInterval(refreshDevices, 5000);
    return () => clearInterval(interval);
  }, [refreshDevices]);

  const handleMqttConnect = useCallback(async () => {
    try {
      await iotBridge.connect();
      setMqttConnected(true);
      toast.success("MQTT conectado");
    } catch (e: any) {
      toast.error(`Falha MQTT: ${e.message}`);
    }
  }, []);

  const handleBleScan = useCallback(async () => {
    if (!bluetoothManager.isSupported) {
      toast.error("Bluetooth não suportado neste navegador");
      return;
    }
    setScanning(true);
    try {
      await bluetoothManager.scan();
      setBleDevices(bluetoothManager.getDevices());
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setScanning(false);
    }
  }, []);

  const handleDiscoverMqtt = useCallback(async () => {
    setDiscovering(true);
    try {
      await iotBridge.discoverDevices();
      setTimeout(() => {
        setIotDevices([...iotBridge.getDevices()]);
        setDiscovering(false);
      }, 3000);
    } catch {
      setDiscovering(false);
    }
  }, []);

  const toggleDevice = useCallback(async (device: IoTDevice) => {
    try {
      const newState = device.state?.on ? "off" : "on";
      await iotBridge.sendCommand(device.id, { action: "toggle", state: newState });
      toast.success(`${device.name}: ${newState.toUpperCase()}`);
      setTimeout(refreshDevices, 1000);
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`);
    }
  }, [refreshDevices]);

  const Icon = (type: string) => DEVICE_ICONS[type] || Radio;
  const allDevices = [
    ...iotDevices.map(d => ({ ...d, connection: "mqtt" as const })),
    ...bleDevices.map(d => ({
      id: d.id, name: d.name, type: "custom" as const,
      status: d.connected ? "online" as const : "offline" as const,
      connection: "bluetooth" as const, state: null, rssi: d.rssi,
    })),
  ];

  return (
    <Card className="border-[#D4AF37]/10 bg-gradient-to-br from-card to-card/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-[#D4AF37]/15 flex items-center justify-center">
              <Radio className="h-3.5 w-3.5" style={{ color: "#D4AF37" }} />
            </div>
            <span style={{ color: "#D4AF37" }}>Orion IoT Hub</span>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant={mqttConnected ? "default" : "outline"}
              className={`text-[8px] ${mqttConnected ? "bg-green-500/20 text-green-400 border-green-500/30" : "border-red-500/30 text-red-400"}`}>
              {mqttConnected ? "MQTT ON" : "MQTT OFF"}
            </Badge>
            <Badge variant="outline" className="text-[8px] border-blue-500/30 text-blue-400">
              {allDevices.length} dispositivos
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Connection controls */}
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1"
            onClick={handleMqttConnect} disabled={mqttConnected}>
            <Wifi className="h-3 w-3" />
            {mqttConnected ? "Conectado" : "Conectar MQTT"}
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1"
            onClick={handleBleScan} disabled={scanning}>
            <Bluetooth className="h-3 w-3" />
            {scanning ? "Buscando..." : "Scan BLE"}
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-[10px] gap-1"
            onClick={handleDiscoverMqtt} disabled={discovering || !mqttConnected}>
            <RefreshCw className={`h-3 w-3 ${discovering ? "animate-spin" : ""}`} />
            Descobrir
          </Button>
        </div>

        {/* Device list */}
        {allDevices.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-xs">
            <Radio className="h-8 w-8 mx-auto mb-2 opacity-30" />
            <p>Nenhum dispositivo conectado</p>
            <p className="text-[10px] mt-1">Conecte ao MQTT ou faça scan Bluetooth</p>
          </div>
        ) : (
          <ScrollArea className="h-[200px]">
            <div className="space-y-1.5">
              {allDevices.map((device) => {
                const DevIcon = Icon(device.type);
                const isOnline = device.status === "online";
                return (
                  <div key={device.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-[#D4AF37]/20 transition-colors">
                    <div className={`h-8 w-8 rounded-md flex items-center justify-center ${
                      isOnline ? "bg-green-500/10" : "bg-white/5"
                    }`}>
                      <DevIcon className={`h-4 w-4 ${isOnline ? "text-green-400" : "text-muted-foreground"}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-medium truncate">{device.name}</p>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className={`text-[7px] px-1 py-0 ${
                          device.connection === "mqtt" ? "border-cyan-500/30 text-cyan-400" : "border-blue-500/30 text-blue-400"
                        }`}>
                          {device.connection === "mqtt" ? "MQTT" : "BLE"}
                        </Badge>
                        {isOnline ? (
                          <CheckCircle2 className="h-2.5 w-2.5 text-green-400" />
                        ) : (
                          <AlertTriangle className="h-2.5 w-2.5 text-yellow-500" />
                        )}
                        {"rssi" in device && device.rssi != null && (
                          <span className="text-[8px] text-muted-foreground flex items-center gap-0.5">
                            <Signal className="h-2 w-2" /> {device.rssi}dBm
                          </span>
                        )}
                      </div>
                    </div>
                    {device.connection === "mqtt" && (
                      <Switch
                        checked={!!(device as IoTDevice).state?.on}
                        onCheckedChange={() => toggleDevice(device as IoTDevice)}
                        className="scale-75"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
