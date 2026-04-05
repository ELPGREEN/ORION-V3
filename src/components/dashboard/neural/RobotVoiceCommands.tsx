import { useState, useCallback, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, MicOff, Volume2, Bot, CheckCircle, XCircle } from "lucide-react";
import { ros2Bridge } from "@/lib/neural/ros2-protocol-bridge";
import { toast } from "sonner";

interface VoiceLog {
  timestamp: number;
  command: string;
  action: string;
  success: boolean;
}

interface Props {
  robotId: string;
}

const ROBOT_COMMANDS: Array<{
  patterns: RegExp[];
  action: string;
  label: string;
  execute: (robotId: string, match: RegExpMatchArray | null) => Promise<boolean>;
}> = [
  {
    patterns: [/mover.*frente|para frente|forward/i, /andar|caminhar/i],
    action: "cmd_vel_forward",
    label: "Mover para frente",
    execute: (rid) => ros2Bridge.sendCmdVel(rid, { x: 0.3, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }),
  },
  {
    patterns: [/mover.*tr[áa]s|para tr[áa]s|backward|r[ée]/i],
    action: "cmd_vel_backward",
    label: "Mover para trás",
    execute: (rid) => ros2Bridge.sendCmdVel(rid, { x: -0.3, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }),
  },
  {
    patterns: [/girar.*esquerda|virar.*esquerda|turn left/i],
    action: "cmd_vel_left",
    label: "Girar à esquerda",
    execute: (rid) => ros2Bridge.sendCmdVel(rid, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0.5 }),
  },
  {
    patterns: [/girar.*direita|virar.*direita|turn right/i],
    action: "cmd_vel_right",
    label: "Girar à direita",
    execute: (rid) => ros2Bridge.sendCmdVel(rid, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: -0.5 }),
  },
  {
    patterns: [/parar|stop|pare/i],
    action: "cmd_vel_stop",
    label: "Parar robô",
    execute: (rid) => ros2Bridge.sendCmdVel(rid, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }),
  },
  {
    patterns: [/emerg[eê]ncia|e-?stop|parada de emerg[eê]ncia/i],
    action: "emergency_stop",
    label: "Parada de emergência",
    execute: (rid) => ros2Bridge.emergencyStop(rid, true),
  },
  {
    patterns: [/desativar emerg[eê]ncia|liberar e-?stop/i],
    action: "emergency_release",
    label: "Liberar emergência",
    execute: (rid) => ros2Bridge.emergencyStop(rid, false),
  },
  {
    patterns: [/navegar.*?(-?\d+[\.,]?\d*)\s*[,\s]+\s*(-?\d+[\.,]?\d*)/i],
    action: "nav_goal",
    label: "Navegar para coordenadas",
    execute: async (rid, match) => {
      const x = parseFloat((match?.[1] ?? "0").replace(",", "."));
      const y = parseFloat((match?.[2] ?? "0").replace(",", "."));
      return ros2Bridge.sendNavGoal(rid, x, y, 0);
    },
  },
  {
    patterns: [/cancelar navega[çc][ãa]o|cancel nav/i],
    action: "nav_cancel",
    label: "Cancelar navegação",
    execute: (rid) => ros2Bridge.cancelNavigation(rid),
  },
  {
    patterns: [/abrir garra|open gripper/i],
    action: "gripper_open",
    label: "Abrir garra",
    execute: (rid) => ros2Bridge.sendActuatorCommand(rid, "gripper", 1),
  },
  {
    patterns: [/fechar garra|close gripper/i],
    action: "gripper_close",
    label: "Fechar garra",
    execute: (rid) => ros2Bridge.sendActuatorCommand(rid, "gripper", -1),
  },
  {
    patterns: [/status.*rob[oô]|robot status|como.*rob[oô]/i],
    action: "robot_status",
    label: "Status do robô",
    execute: async (rid) => {
      const robot = ros2Bridge.getRobot(rid);
      if (!robot) { toast.info("Robô não encontrado"); return false; }
      const bat = robot.battery ? `${(robot.battery.percentage * 100).toFixed(0)}%` : "N/A";
      toast.info(`Robô ${robot.name}: ${robot.connected ? "Online" : "Offline"} | Bateria: ${bat} | Modo: ${robot.operationalMode}`);
      return true;
    },
  },
];

export default function RobotVoiceCommands({ robotId }: Props) {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [voiceLog, setVoiceLog] = useState<VoiceLog[]>([]);
  const recognitionRef = useRef<any>(null);

  const processCommand = useCallback(async (text: string) => {
    for (const cmd of ROBOT_COMMANDS) {
      for (const pattern of cmd.patterns) {
        const match = text.match(pattern);
        if (match) {
          try {
            const ok = await cmd.execute(robotId, match);
            setVoiceLog(prev => [...prev.slice(-49), {
              timestamp: Date.now(), command: text, action: cmd.label, success: ok,
            }]);
            toast[ok ? "success" : "error"](`${cmd.label}: ${ok ? "OK" : "Falhou"}`);
            return;
          } catch {
            setVoiceLog(prev => [...prev.slice(-49), {
              timestamp: Date.now(), command: text, action: cmd.label, success: false,
            }]);
            toast.error(`Erro: ${cmd.label}`);
            return;
          }
        }
      }
    }
    toast.info(`Comando não reconhecido: "${text}"`);
    setVoiceLog(prev => [...prev.slice(-49), {
      timestamp: Date.now(), command: text, action: "desconhecido", success: false,
    }]);
  }, [robotId]);

  const startListening = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { toast.error("SpeechRecognition não suportado"); return; }

    const recognition = new SR();
    recognition.lang = "pt-BR";
    recognition.continuous = true;
    recognition.interimResults = true;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let final = "";
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const t = event.results[i][0].transcript;
        if (event.results[i].isFinal) final += t;
        else interim += t;
      }
      setTranscript(interim || final);
      if (final) processCommand(final);
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => {
      if (listening) {
        try { recognition.start(); } catch { setListening(false); }
      }
    };

    recognition.start();
    recognitionRef.current = recognition;
    setListening(true);
  }, [listening, processCommand]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setListening(false);
    setTranscript("");
  }, []);

  useEffect(() => () => { recognitionRef.current?.stop(); }, []);

  return (
    <div className="space-y-4">
      {/* Voice Control */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Mic className="h-4 w-4" />
            Controle por Voz
            {listening && (
              <Badge variant="default" className="ml-auto animate-pulse text-[10px]">
                🎙️ Escutando
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={listening ? stopListening : startListening}
            variant={listening ? "destructive" : "default"}
            className="w-full"
          >
            {listening ? <MicOff className="h-4 w-4 mr-2" /> : <Mic className="h-4 w-4 mr-2" />}
            {listening ? "Parar Escuta" : "Iniciar Controle por Voz"}
          </Button>

          {transcript && (
            <div className="p-3 rounded-md bg-muted/50 border border-border">
              <span className="text-xs text-muted-foreground">Transcrevendo:</span>
              <p className="text-sm font-mono mt-1">{transcript}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Commands */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Bot className="h-4 w-4" />
            Comandos Disponíveis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { label: "Mover para frente", example: "\"mover robô para frente\"" },
              { label: "Mover para trás", example: "\"mover para trás\"" },
              { label: "Girar esquerda/direita", example: "\"girar à esquerda\"" },
              { label: "Parar", example: "\"parar robô\"" },
              { label: "Emergência", example: "\"parada de emergência\"" },
              { label: "Navegar", example: "\"navegar para 3, 5\"" },
              { label: "Garra", example: "\"abrir garra\" / \"fechar garra\"" },
              { label: "Status", example: "\"status do robô\"" },
            ].map(c => (
              <div key={c.label} className="p-2 rounded border border-border/50 text-xs">
                <p className="font-medium">{c.label}</p>
                <p className="text-muted-foreground font-mono text-[10px]">{c.example}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Voice Log */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Volume2 className="h-4 w-4" />
            Log de Comandos de Voz
            <Badge variant="outline" className="ml-auto text-[10px]">{voiceLog.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-48">
            <div className="space-y-1">
              {[...voiceLog].reverse().map((entry, i) => (
                <div key={i} className="flex items-start gap-2 text-[10px] py-1 border-b border-border/30 last:border-0">
                  {entry.success ? (
                    <CheckCircle className="h-3 w-3 text-green-500 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-3 w-3 text-red-500 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0">
                    <span className="font-mono text-muted-foreground">{new Date(entry.timestamp).toLocaleTimeString()}</span>
                    <span className="ml-1 font-medium">{entry.action}</span>
                    <p className="font-mono text-muted-foreground truncate">"{entry.command}"</p>
                  </div>
                </div>
              ))}
              {voiceLog.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">Nenhum comando por voz</p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
