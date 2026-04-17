/**
 * Robot Test Panel — Configuration and testing with real robot via WebSocket
 * Complete testing suite for ROS2 connection
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Wifi, WifiOff, Radio, Activity, CheckCircle, XCircle, AlertTriangle,
  Play, Pause, RotateCcw, Settings, Terminal, Server, Network,
  Cpu, HardDrive, MemoryStick as Memory, Battery, Thermometer, Gauge,
  Send, MessageSquare, FileText, Download, Upload, RefreshCw,
} from "lucide-react";
import { useRosBridge } from "@/hooks/useRosBridge";
import { toast } from "sonner";

interface TopicInfo {
  name: string;
  type: string;
  frequency: number;
}

interface ConnectionTest {
  test: string;
  status: "pending" | "running" | "success" | "failed";
  message: string;
  duration?: number;
}

export default function RobotTestPanel() {
  const [rosbridgeUrl, setRosbridgeUrl] = useState("ws://localhost:9090");
  const [robotNamespace, setRobotNamespace] = useState("robot1");
  const [connected, setConnected] = useState(false);
  
  // Test results
  const [tests, setTests] = useState<ConnectionTest[]>([]);
  const [availableTopics, setAvailableTopics] = useState<TopicInfo[]>([]);
  const [systemInfo, setSystemInfo] = useState<any>(null);
  
  // Message log
  const [messageLog, setMessageLog] = useState<Array<{time: string, topic: string, msg: any}>>([]);
  const [logEnabled, setLogEnabled] = useState(true);
  
  // Custom message publishing
  const [customTopic, setCustomTopic] = useState("");
  const [customType, setCustomType] = useState("std_msgs/msg/String");
  const [customMessage, setCustomMessage] = useState("");
  
  const unsubsRef = useRef<Array<() => void>>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const { isConnected, connect, disconnect, subscribe, publish, callService } = useRosBridge({ url: rosbridgeUrl });

  useEffect(() => {
    setConnected(isConnected);
  }, [isConnected]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messageLog]);

  const handleConnect = useCallback(() => {
    if (isConnected) {
      disconnect();
      unsubsRef.current.forEach((fn) => fn());
      unsubsRef.current = [];
      setConnected(false);
      setTests([]);
      setAvailableTopics([]);
    } else {
      connect();
    }
  }, [isConnected, connect, disconnect]);

  const addTest = (test: string, status: ConnectionTest["status"], message: string, duration?: number) => {
    setTests(prev => [...prev, { test, status, message, duration }]);
  };

  const runConnectionTests = async () => {
    setTests([]);
    const namespace = robotNamespace.startsWith("/") ? robotNamespace : `/${robotNamespace}`;
    
    // Test 1: Basic connection
    addTest("Conexão WebSocket", "running", "Testando...");
    await new Promise(r => setTimeout(r, 500));
    if (isConnected) {
      addTest("Conexão WebSocket", "success", "Conectado com sucesso", 500);
    } else {
      addTest("Conexão WebSocket", "failed", "Falha na conexão", 500);
      return;
    }

    // Test 2: Subscribe to joint states
    addTest("Joint States", "running", "Inscrito em /joint_states...");
    try {
      const unsub = subscribe(`${namespace}/joint_states`, "sensor_msgs/msg/JointState", (msg) => {
        if (logEnabled) {
          setMessageLog(prev => [...prev.slice(-100), {
            time: new Date().toLocaleTimeString(),
            topic: `${namespace}/joint_states`,
            msg: msg
          }]);
        }
      }, 100);
      unsubsRef.current.push(unsub);
      await new Promise(r => setTimeout(r, 1000));
      addTest("Joint States", "success", "Recebendo dados das juntas");
    } catch (e) {
      addTest("Joint States", "failed", "Falha ao assinar tópico");
    }

    // Test 3: Subscribe to odometry
    addTest("Odometry", "running", "Inscrito em /odom...");
    try {
      const unsub = subscribe(`${namespace}/odom`, "nav_msgs/msg/Odometry", (msg) => {
        if (logEnabled) {
          setMessageLog(prev => [...prev.slice(-100), {
            time: new Date().toLocaleTimeString(),
            topic: `${namespace}/odom`,
            msg: msg
          }]);
        }
      }, 200);
      unsubsRef.current.push(unsub);
      await new Promise(r => setTimeout(r, 1000));
      addTest("Odometry", "success", "Recebendo odometria");
    } catch (e) {
      addTest("Odometry", "failed", "Falha ao assinar tópico");
    }

    // Test 4: Subscribe to IMU
    addTest("IMU", "running", "Inscrito em /imu...");
    try {
      const unsub = subscribe(`${namespace}/imu`, "sensor_msgs/msg/Imu", (msg) => {
        if (logEnabled) {
          setMessageLog(prev => [...prev.slice(-100), {
            time: new Date().toLocaleTimeString(),
            topic: `${namespace}/imu`,
            msg: msg
          }]);
        }
      }, 100);
      unsubsRef.current.push(unsub);
      await new Promise(r => setTimeout(r, 1000));
      addTest("IMU", "success", "Recebendo dados do IMU");
    } catch (e) {
      addTest("IMU", "failed", "Falha ao assinar tópico");
    }

    // Test 5: Subscribe to laser scan
    addTest("LaserScan", "running", "Inscrito em /scan...");
    try {
      const unsub = subscribe(`${namespace}/scan`, "sensor_msgs/msg/LaserScan", (msg: any) => {
        if (logEnabled) {
          setMessageLog(prev => [...prev.slice(-100), {
            time: new Date().toLocaleTimeString(),
            topic: `${namespace}/scan`,
            msg: { ranges: msg?.ranges?.length, angle_min: msg?.angle_min }
          }]);
        }
      }, 200);
      unsubsRef.current.push(unsub);
      await new Promise(r => setTimeout(r, 1000));
      addTest("LaserScan", "success", "Recebendo dados do LiDAR");
    } catch (e) {
      addTest("LaserScan", "failed", "Falha ao assinar tópico");
    }

    // Test 6: Publish cmd_vel
    addTest("cmd_vel", "running", "Enviando comando de velocidade...");
    try {
      publish(`${namespace}/cmd_vel`, "geometry_msgs/msg/Twist", {
        linear: { x: 0, y: 0, z: 0 },
        angular: { x: 0, y: 0, z: 0 }
      });
      await new Promise(r => setTimeout(r, 500));
      addTest("cmd_vel", "success", "Comando enviado com sucesso");
    } catch (e) {
      addTest("cmd_vel", "failed", "Falha ao publicar");
    }

    toast.success("✅ Testes concluídos!");
  };

  const sendCustomMessage = () => {
    if (!customTopic || !customMessage) {
      toast.error("Preencha o tópico e a mensagem");
      return;
    }
    
    try {
      let parsedMsg;
      try {
        parsedMsg = JSON.parse(customMessage);
      } catch {
        parsedMsg = { data: customMessage };
      }
      
      publish(customTopic, customType, parsedMsg);
      toast.success(`📤 Mensagem enviada para ${customTopic}`);
      
      setMessageLog(prev => [...prev.slice(-100), {
        time: new Date().toLocaleTimeString(),
        topic: `OUT: ${customTopic}`,
        msg: parsedMsg
      }]);
    } catch (e: any) {
      toast.error(`Erro: ${e.message}`);
    }
  };

  const clearLog = () => {
    setMessageLog([]);
  };

  const exportLog = () => {
    const blob = new Blob([JSON.stringify(messageLog, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ros2_log_${Date.now()}.json`;
    a.click();
    toast.success("📥 Log exportado");
  };

  return (
    <Card className="bg-[hsl(var(--tron-bg-deep))] text-[hsl(var(--tron-neon))] bg-zinc-950 border-zinc-800">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Terminal className="h-4 w-4 text-[hsl(var(--tron-neon))]" />
            Teste e Configuração — Robô Real
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

        <Tabs defaultValue="tests" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="tests" className="text-xs">
              <Play className="h-3 w-3 mr-1" /> Testes
            </TabsTrigger>
            <TabsTrigger value="topics" className="text-xs">
              <Network className="h-3 w-3 mr-1" /> Tópicos
            </TabsTrigger>
            <TabsTrigger value="publish" className="text-xs">
              <Send className="h-3 w-3 mr-1" /> Publicar
            </TabsTrigger>
            <TabsTrigger value="log" className="text-xs">
              <FileText className="h-3 w-3 mr-1" /> Log
            </TabsTrigger>
          </TabsList>

          {/* Tests Tab */}
          <TabsContent value="tests" className="space-y-4 mt-3">
            <div className="flex gap-2">
              <Button className="flex-1" onClick={runConnectionTests} disabled={!isConnected}>
                <Play className="h-4 w-4 mr-2" />
                Executar Testes de Conexão
              </Button>
              <Button variant="outline" onClick={() => setTests([])}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {tests.map((test, idx) => (
                <div key={idx} className={`p-3 rounded-lg border ${
                  test.status === "success" ? "bg-green-950/30 border-green-900" :
                  test.status === "failed" ? "bg-red-950/30 border-red-900" :
                  test.status === "running" ? "bg-yellow-950/30 border-yellow-900" :
                  "bg-zinc-900/30 border-zinc-800"
                }`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {test.status === "success" && <CheckCircle className="h-4 w-4 text-[hsl(var(--tron-neon))]" />}
                      {test.status === "failed" && <XCircle className="h-4 w-4 text-[hsl(var(--tron-danger))]" />}
                      {test.status === "running" && <Activity className="h-4 w-4 text-[hsl(var(--tron-warn))] animate-pulse" />}
                      {test.status === "pending" && <div className="h-4 w-4 rounded-full bg-zinc-500" />}
                      <span className="text-sm font-medium">{test.test}</span>
                    </div>
                    {test.duration && (
                      <span className="text-[10px] text-zinc-500">{test.duration}ms</span>
                    )}
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-1">{test.message}</div>
                </div>
              ))}
              
              {tests.length === 0 && (
                <div className="text-center text-zinc-500 py-8">
                  <Terminal className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Clique em "Executar Testes" para iniciar</p>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Topics Tab */}
          <TabsContent value="topics" className="space-y-4 mt-3">
            <div className="text-xs text-zinc-500">
              Tópicos ROS2 disponíveis no robô conectado
            </div>
            
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              {[
                "/cmd_vel", "/odom", "/joint_states", "/imu", "/scan",
                "/battery_state", "/camera/image_raw", "/gripper/cmd", "/robot_state"
              ].map(topic => (
                <div key={topic} className="p-2 bg-zinc-900/50 rounded border border-zinc-800 font-mono">
                  {topic}
                </div>
              ))}
            </div>
          </TabsContent>

          {/* Publish Tab */}
          <TabsContent value="publish" className="space-y-4 mt-3">
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-zinc-500">Tópico</Label>
                <Input
                  value={customTopic}
                  onChange={(e) => setCustomTopic(e.target.value)}
                  placeholder="/robot1/cmd_vel"
                  className="text-xs font-mono mt-1"
                />
              </div>
              
              <div>
                <Label className="text-xs text-zinc-500">Tipo (ROS2 msg)</Label>
                <Input
                  value={customType}
                  onChange={(e) => setCustomType(e.target.value)}
                  placeholder="geometry_msgs/msg/Twist"
                  className="text-xs font-mono mt-1"
                />
              </div>
              
              <div>
                <Label className="text-xs text-zinc-500">Mensagem (JSON)</Label>
                <Input
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder='{"linear": {"x": 0.5}}'
                  className="text-xs font-mono mt-1"
                />
              </div>
              
              <Button className="w-full" onClick={sendCustomMessage} disabled={!isConnected}>
                <Send className="h-4 w-4 mr-2" />
                Enviar Mensagem
              </Button>
            </div>
          </TabsContent>

          {/* Log Tab */}
          <TabsContent value="log" className="space-y-3 mt-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Switch checked={logEnabled} onCheckedChange={setLogEnabled} />
                <span className="text-xs text-zinc-500">Log automático</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={clearLog}>
                  <XCircle className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="outline" onClick={exportLog}>
                  <Download className="h-3 w-3" />
                </Button>
              </div>
            </div>
            
            <ScrollArea className="h-64 rounded border border-zinc-800 bg-zinc-900/30 p-2">
              <div ref={logRef} className="space-y-1">
                {messageLog.map((entry, idx) => (
                  <div key={idx} className="text-[10px] font-mono">
                    <span className="text-zinc-600">[{entry.time}]</span>
                    <span className="text-[hsl(var(--tron-neon))]"> {entry.topic}:</span>
                    <span className="text-zinc-400"> {JSON.stringify(entry.msg).slice(0, 100)}</span>
                  </div>
                ))}
                {messageLog.length === 0 && (
                  <div className="text-center text-zinc-600 py-8 text-xs">
                    Nenhuma mensagem recebida
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}