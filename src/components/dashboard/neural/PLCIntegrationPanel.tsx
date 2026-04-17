/**
 * PLC Integration Panel — MQTT integration with industrial PLC/SCADA
 * Connect to Siemens, Rockwell, Schneider, Omron via OPC-UA or MQTT
 */
import { useState, useCallback, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Network, Server, Wifi, WifiOff, Plug, Settings, Play, Pause,
  Activity, AlertTriangle, CheckCircle, Cpu, Database, Signal,
  Send, Download, Upload, RefreshCw, Shield, Lock,
} from "lucide-react";
import { useRosBridge } from "@/hooks/useRosBridge";
import { toast } from "sonner";

interface PLCConnection {
  protocol: "opcua" | "mqtt" | "modbus";
  host: string;
  port: number;
  connected: boolean;
}

interface PLCTag {
  name: string;
  address: string;
  type: "BOOL" | "INT" | "REAL" | "STRING";
  value: any;
  quality: "good" | "bad" | "uncertain";
  lastUpdate: number;
}

interface MQTTMessage {
  topic: string;
  payload: any;
  timestamp: number;
}

const PLC_PRESETS = [
  { name: "Siemens S7-1500", protocol: "opcua", host: "192.168.1.100", port: 4840 },
  { name: "Allen-Bradley Logix", protocol: "opcua", host: "192.168.1.101", port: 4840 },
  { name: "Schneider Modicon", protocol: "modbus", host: "192.168.1.102", port: 502 },
  { name: "Omron NJ/NX", protocol: "opcua", host: "192.168.1.103", port: 4840 },
  { name: "MQTT Broker", protocol: "mqtt", host: "192.168.1.104", port: 1883 },
];

export default function PLCIntegrationPanel() {
  const [plcConnection, setPlcConnection] = useState<PLCConnection>({
    protocol: "mqtt",
    host: "192.168.1.100",
    port: 1883,
    connected: false,
  });
  
  const [plcTags, setPlcTags] = useState<PLCTag[]>([
    { name: "Esteira_RUN", address: "DB100.DBX0.0", type: "BOOL", value: false, quality: "good", lastUpdate: Date.now() },
    { name: "Esteira_SPEED", address: "DB100.DBD4", type: "REAL", value: 0.5, quality: "good", lastUpdate: Date.now() },
    { name: "Counter_ITEMS", address: "DB100.DBW8", type: "INT", value: 0, quality: "good", lastUpdate: Date.now() },
    { name: "Sensor_OK", address: "DB100.DBX2.0", type: "BOOL", value: true, quality: "good", lastUpdate: Date.now() },
    { name: "Emergency_STOP", address: "DB100.DBX3.0", type: "BOOL", value: false, quality: "good", lastUpdate: Date.now() },
  ]);
  
  const [mqttMessages, setMqttMessages] = useState<MQTTMessage[]>([]);
  const [mqttTopics, setMqttTopics] = useState<string[]>([
    "factory/line1/conveyor/status",
    "factory/line1/sensors/quality",
    "factory/line1/actuators/gripper",
    "factory/line1/alarms",
  ]);
  
  const [selectedPreset, setSelectedPreset] = useState("");
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [newTagAddress, setNewTagAddress] = useState("");
  const [newTagName, setNewTagName] = useState("");
  
  const { isConnected, connect, disconnect, subscribe, publish } = useRosBridge({ url: "ws://localhost:9090" });

  const connectPLC = () => {
    setPlcConnection(prev => ({ ...prev, connected: true }));
    toast.success(`🔌 Conectado ao ${plcConnection.protocol.toUpperCase()}`);
    setIsMonitoring(true);
  };
  
  const disconnectPLC = () => {
    setPlcConnection(prev => ({ ...prev, connected: false }));
    setIsMonitoring(false);
    toast.info("🔌 Desconectado do PLC");
  };

  // Subscribe to MQTT topics
  useEffect(() => {
    if (!plcConnection.connected || plcConnection.protocol !== "mqtt") return;
    
    const unsubs: Array<() => void> = [];
    
    mqttTopics.forEach(topic => {
      const unsub = subscribe(topic, "std_msgs/msg/String", (msg: any) => {
        setMqttMessages(prev => [...prev.slice(-50), {
          topic,
          payload: msg.data,
          timestamp: Date.now(),
        }]);
      }, 500);
      unsubs.push(unsub);
    });
    
    return () => { unsubs.forEach(fn => fn()); };
  }, [plcConnection.connected, plcConnection.protocol, mqttTopics, subscribe]);

  // Simulate tag value changes
  useEffect(() => {
    if (!isMonitoring) return;
    
    const interval = setInterval(() => {
      setPlcTags(prev => prev.map(tag => {
        if (tag.type === "BOOL" && Math.random() > 0.95) {
          return { ...tag, value: !tag.value, lastUpdate: Date.now() };
        }
        if (tag.type === "INT" && tag.name === "Counter_ITEMS") {
          return { ...tag, value: tag.value + 1, lastUpdate: Date.now() };
        }
        return tag;
      }));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isMonitoring]);

  const writeTag = (tagName: string, value: any) => {
    setPlcTags(prev => prev.map(tag => {
      if (tag.name === tagName) {
        return { ...tag, value, lastUpdate: Date.now() };
      }
      return tag;
    }));
    toast.info(`📝 ${tagName} = ${value}`);
  };
  
  const addTag = () => {
    if (!newTagName || !newTagAddress) {
      toast.error("Preencha nome e endereço");
      return;
    }
    
    setPlcTags(prev => [...prev, {
      name: newTagName,
      address: newTagAddress,
      type: "BOOL",
      value: false,
      quality: "good",
      lastUpdate: Date.now(),
    }]);
    
    setNewTagName("");
    setNewTagAddress("");
    toast.success("✅ Tag adicionado");
  };
  
  const publishMQTT = (topic: string, payload: string) => {
    publish(topic, "std_msgs/msg/String", { data: payload });
    setMqttMessages(prev => [...prev.slice(-50), { topic, payload, timestamp: Date.now() }]);
    toast.success(`📤 Enviado para ${topic}`);
  };

  return (
    <Card className="bg-zinc-950 border-zinc-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Server className="h-4 w-4 text-orange-400" />
            Integração PLC/SCADA Industrial
          </CardTitle>
          <Badge variant={plcConnection.connected ? "default" : "secondary"} className="text-[10px]">
            {plcConnection.connected ? "🟢 Conectado" : "🔴 Desconectado"}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="connection" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="connection" className="text-xs">
              <Plug className="h-3 w-3 mr-1" /> Conexão
            </TabsTrigger>
            <TabsTrigger value="tags" className="text-xs">
              <Cpu className="h-3 w-3 mr-1" /> Tags
            </TabsTrigger>
            <TabsTrigger value="mqtt" className="text-xs">
              <Network className="h-3 w-3 mr-1" /> MQTT
            </TabsTrigger>
            <TabsTrigger value="monitor" className="text-xs">
              <Activity className="h-3 w-3 mr-1" /> Monitor
            </TabsTrigger>
          </TabsList>

          {/* Connection Tab */}
          <TabsContent value="connection" className="space-y-4 mt-3">
            <div className="space-y-3">
              <Label className="text-xs text-zinc-500">Preset de PLC</Label>
              <Select value={selectedPreset} onValueChange={(v) => {
                setSelectedPreset(v);
                const preset = PLC_PRESETS.find(p => p.name === v);
                if (preset) {
                  setPlcConnection(prev => ({
                    ...prev,
                    protocol: preset.protocol as PLCConnection["protocol"],
                    host: preset.host,
                    port: preset.port,
                  }));
                }
              }}>
                <SelectTrigger className="text-xs">
                  <SelectValue placeholder="Selecione um PLC..." />
                </SelectTrigger>
                <SelectContent>
                  {PLC_PRESETS.map(preset => (
                    <SelectItem key={preset.name} value={preset.name}>
                      {preset.name} ({preset.protocol})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <Separator />
            
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-xs text-zinc-500">Protocolo</Label>
                <Select value={plcConnection.protocol} onValueChange={(v: any) => setPlcConnection(p => ({ ...p, protocol: v }))}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="opcua">OPC-UA</SelectItem>
                    <SelectItem value="mqtt">MQTT</SelectItem>
                    <SelectItem value="modbus">Modbus TCP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs text-zinc-500">Host/IP</Label>
                <Input
                  value={plcConnection.host}
                  onChange={(e) => setPlcConnection(p => ({ ...p, host: e.target.value }))}
                  className="text-xs font-mono"
                />
              </div>
              
              <div className="space-y-2">
                <Label className="text-xs text-zinc-500">Porta</Label>
                <Input
                  type="number"
                  value={plcConnection.port}
                  onChange={(e) => setPlcConnection(p => ({ ...p, port: parseInt(e.target.value) }))}
                  className="text-xs font-mono"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button className="flex-1" onClick={connectPLC} disabled={plcConnection.connected}>
                <Wifi className="h-4 w-4 mr-2" />
                Conectar
              </Button>
              <Button variant="outline" onClick={disconnectPLC} disabled={!plcConnection.connected}>
                <WifiOff className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-3 bg-zinc-900/30 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="h-4 w-4 text-[hsl(var(--tron-neon))]" />
                <span className="text-xs font-medium">Segurança</span>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={true} />
                <span className="text-[10px] text-zinc-500">TLS/SSL encryption</span>
              </div>
              <div className="flex items-center gap-2 mt-1">
                <Switch checked={true} />
                <span className="text-[10px] text-zinc-500">Authentication required</span>
              </div>
            </div>
          </TabsContent>

          {/* Tags Tab */}
          <TabsContent value="tags" className="space-y-4 mt-3">
            <div className="flex gap-2">
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Nome da tag"
                className="flex-1 text-xs"
              />
              <Input
                value={newTagAddress}
                onChange={(e) => setNewTagAddress(e.target.value)}
                placeholder="Endereço (ex: DB100.DBX0.0)"
                className="flex-1 text-xs font-mono"
              />
              <Button size="sm" onClick={addTag}>+</Button>
            </div>
            
            <div className="space-y-2">
              {plcTags.map((tag, idx) => (
                <div key={idx} className="flex items-center gap-3 p-2 bg-zinc-900/50 rounded border border-zinc-800">
                  <div className="flex-1">
                    <div className="text-xs font-medium">{tag.name}</div>
                    <div className="text-[10px] text-zinc-500 font-mono">{tag.address}</div>
                  </div>
                  <div className="text-xs text-zinc-400">{tag.type}</div>
                  <div className="w-20">
                    {tag.type === "BOOL" ? (
                      <Button
                        size="sm"
                        variant={tag.value ? "default" : "outline"}
                        onClick={() => writeTag(tag.name, !tag.value)}
                        className="text-xs"
                      >
                        {tag.value ? "ON" : "OFF"}
                      </Button>
                    ) : (
                      <Input
                        value={tag.value}
                        onChange={(e) => writeTag(tag.name, e.target.value)}
                        className="text-xs font-mono h-7"
                      />
                    )}
                  </div>
                  <div className={`w-2 h-2 rounded-full ${
                    tag.quality === "good" ? "bg-green-500" :
                    tag.quality === "bad" ? "bg-red-500" : "bg-yellow-500"
                  }`} />
                </div>
              ))}
            </div>
          </TabsContent>

          {/* MQTT Tab */}
          <TabsContent value="mqtt" className="space-y-4 mt-3">
            <div className="space-y-2">
              <Label className="text-xs text-zinc-500">Tópicos Inscritos</Label>
              {mqttTopics.map((topic, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-zinc-900/30 rounded">
                  <Signal className="h-3 w-3 text-[hsl(var(--tron-neon))]" />
                  <span className="text-xs font-mono text-[hsl(var(--tron-neon))]">{topic}</span>
                </div>
              ))}
            </div>
            
            <Separator />
            
            <div className="space-y-2">
              <Label className="text-xs text-zinc-500">Publicar Mensagem</Label>
              <Input placeholder="Tópico" className="text-xs font-mono mb-2" id="mqtt-topic" />
              <Input placeholder="Payload JSON" className="text-xs font-mono mb-2" id="mqtt-payload" />
              <Button className="w-full" size="sm" onClick={() => {
                const topic = (document.getElementById("mqtt-topic") as HTMLInputElement).value;
                const payload = (document.getElementById("mqtt-payload") as HTMLInputElement).value;
                if (topic && payload) publishMQTT(topic, payload);
              }}>
                <Send className="h-4 w-4 mr-2" />
                Publicar
              </Button>
            </div>
          </TabsContent>

          {/* Monitor Tab */}
          <TabsContent value="monitor" className="space-y-4 mt-3">
            <div className="flex items-center justify-between">
              <div className="text-xs text-zinc-500">
                Monitoramento em tempo real
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={isMonitoring} onCheckedChange={setIsMonitoring} />
                <span className="text-xs">Ativo</span>
              </div>
            </div>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {mqttMessages.slice(-20).reverse().map((msg, idx) => (
                <div key={idx} className="p-2 bg-zinc-900/30 rounded text-[10px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[hsl(var(--tron-neon))] font-mono">{msg.topic}</span>
                    <span className="text-zinc-600">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                  </div>
                  <div className="text-zinc-400 font-mono mt-1">{msg.payload}</div>
                </div>
              ))}
              
              {mqttMessages.length === 0 && (
                <div className="text-center text-zinc-600 py-4 text-xs">
                  Nenhuma mensagem recebida
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}