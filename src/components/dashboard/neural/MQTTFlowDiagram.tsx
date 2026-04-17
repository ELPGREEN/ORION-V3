import { useState } from "react";
import {
  Cloud, Eye, Brain, Bot, Home, Cpu, Radio, Mic,
  ChevronDown, ChevronUp, Shield, Zap, ArrowRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MQTTNode {
  id: string;
  icon: typeof Cloud;
  label: string;
  topics: string[];
  qos: number;
  color: string;
  borderColor: string;
  details: string;
  retained?: boolean;
  lastWill?: boolean;
}

const mqttNodes: MQTTNode[] = [
  {
    id: "vision",
    icon: Eye,
    label: "Vision Engine",
    topics: ["vision/results", "vision/emotions", "vision/frame/raw"],
    qos: 2,
    color: "text-[hsl(var(--tron-neon))]",
    borderColor: "border-cyan-500/40",
    details: "Publica resultados de detecção (YOLOv11), emoções faciais e frames brutos. QoS 2 garante entrega exata para decisões críticas.",
  },
  {
    id: "cognitive",
    icon: Brain,
    label: "Cognitive Engine",
    topics: ["neurocore/memory/update", "neurocore/heartbeat"],
    qos: 1,
    color: "text-[hsl(var(--tron-neon-soft))]",
    borderColor: "border-purple-500/40",
    details: "Recebe contexto visual e publica atualizações de memória episódica. Heartbeat a cada 15s para monitoramento.",
    retained: true,
  },
  {
    id: "assistant",
    icon: Mic,
    label: "Assistant Bridge",
    topics: ["assistant/command", "assistant/tts", "assistant/libra"],
    qos: 1,
    color: "text-fuchsia-400",
    borderColor: "border-fuchsia-500/40",
    details: "Ponte bidirecional com Google Assistant, Alexa, Siri e Home Assistant Voice. Recebe comandos de voz e responde via TTS pt-BR.",
  },
  {
    id: "robot",
    icon: Bot,
    label: "Robot Commands",
    topics: ["robot/commands", "robot/status", "robot/predictive"],
    qos: 1,
    color: "text-[hsl(var(--tron-neon))]",
    borderColor: "border-emerald-500/40",
    details: "Comandos de movimentação (MoveIt2), status do robô (retained) e diagnóstico preditivo LSTM.",
    retained: true,
    lastWill: true,
  },
  {
    id: "home",
    icon: Home,
    label: "Smart Home",
    topics: ["home/light/#", "home/camera/#", "home/environment"],
    qos: 0,
    color: "text-amber-400",
    borderColor: "border-amber-500/40",
    details: "Controle de luzes, câmeras e sensores ambientais via Home Assistant + Matter protocol. QoS 0 para alta frequência.",
    retained: true,
  },
  {
    id: "edge",
    icon: Cpu,
    label: "Edge Devices",
    topics: ["edge/jetson/status", "edge/rpi/status", "edge/coral/inference"],
    qos: 1,
    color: "text-sky-400",
    borderColor: "border-sky-500/40",
    details: "Status dos dispositivos edge (Jetson Orin, Raspberry Pi 5, Coral TPU). Monitoramento de GPU, temperatura e inferências/s.",
    lastWill: true,
  },
];

export function MQTTFlowDiagram() {
  const [expandedNode, setExpandedNode] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="flex items-center justify-center gap-2">
          <Radio className="h-6 w-6 text-[hsl(var(--tron-neon))] animate-pulse" />
          <h3 className="text-lg font-bold bg-gradient-to-r from-cyan-400 via-fuchsia-400 to-emerald-400 bg-clip-text text-transparent">
            Fluxo MQTT — NEUROCORE AI
          </h3>
        </div>
        <p className="text-[10px] text-muted-foreground">Protocolo Pub/Sub em tempo real • Latência {"<"} 50ms • TLS + Auth</p>
      </div>

      {/* Central Broker */}
      <div className="flex justify-center">
        <div className="relative px-6 py-4 rounded-2xl border-2 border-cyan-500/50 bg-gradient-to-br from-slate-900 to-slate-950 shadow-[0_0_30px_rgba(0,240,255,0.15)]">
          <div className="flex items-center gap-3">
            <Cloud className="h-8 w-8 text-[hsl(var(--tron-neon))]" />
            <div>
              <p className="text-sm font-bold text-[hsl(var(--tron-neon))]">MQTT Broker</p>
              <p className="text-[9px] text-muted-foreground">Mosquitto / HiveMQ Cloud</p>
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 mt-2">
            <Badge variant="outline" className="text-[8px] text-[hsl(var(--tron-neon))] border-emerald-500/30 px-1.5 py-0">
              <Shield className="h-2.5 w-2.5 mr-0.5" /> TLS 1.3
            </Badge>
            <Badge variant="outline" className="text-[8px] text-amber-400 border-amber-500/30 px-1.5 py-0">
              <Zap className="h-2.5 w-2.5 mr-0.5" /> {"<"} 50ms
            </Badge>
            <Badge variant="outline" className="text-[8px] text-[hsl(var(--tron-neon-soft))] border-purple-500/30 px-1.5 py-0">
              Port 8883
            </Badge>
          </div>
        </div>
      </div>

      {/* Connection lines indicator */}
      <div className="flex justify-center">
        <div className="grid grid-cols-3 gap-x-6 gap-y-0">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex justify-center">
              <div className="w-px h-4 bg-gradient-to-b from-cyan-500/60 to-transparent" />
            </div>
          ))}
        </div>
      </div>

      {/* Nodes Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {mqttNodes.map((node) => (
          <button
            key={node.id}
            onClick={() => setExpandedNode(expandedNode === node.id ? null : node.id)}
            className={`text-left rounded-xl border ${node.borderColor} bg-gradient-to-br from-slate-900/80 to-slate-950 p-3 transition-all duration-200 hover:scale-[1.02] hover:shadow-lg`}
          >
            {/* Node Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <node.icon className={`h-5 w-5 ${node.color}`} />
                <span className={`text-xs font-bold ${node.color}`}>{node.label}</span>
              </div>
              <div className="flex items-center gap-1">
                <Badge variant="secondary" className="text-[8px] px-1 py-0">
                  QoS {node.qos}
                </Badge>
                {node.retained && (
                  <Badge variant="outline" className="text-[8px] text-amber-400 border-amber-500/30 px-1 py-0">R</Badge>
                )}
                {node.lastWill && (
                  <Badge variant="outline" className="text-[8px] text-[hsl(var(--tron-danger))] border-red-500/30 px-1 py-0">LW</Badge>
                )}
                {expandedNode === node.id ? (
                  <ChevronUp className="h-3 w-3 text-muted-foreground" />
                ) : (
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                )}
              </div>
            </div>

            {/* Topics */}
            <div className="space-y-1">
              {node.topics.map((topic) => (
                <div key={topic} className="flex items-center gap-1.5">
                  <ArrowRight className="h-2.5 w-2.5 text-muted-foreground shrink-0" />
                  <code className="text-[9px] font-mono text-muted-foreground">{topic}</code>
                </div>
              ))}
            </div>

            {/* Expanded Details */}
            {expandedNode === node.id && (
              <div className="mt-2 pt-2 border-t border-border/20">
                <p className="text-[10px] text-muted-foreground leading-relaxed">{node.details}</p>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 text-[9px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <Badge variant="secondary" className="text-[7px] px-1 py-0">QoS 0</Badge> Fire & Forget
        </span>
        <span className="flex items-center gap-1">
          <Badge variant="secondary" className="text-[7px] px-1 py-0">QoS 1</Badge> At Least Once
        </span>
        <span className="flex items-center gap-1">
          <Badge variant="secondary" className="text-[7px] px-1 py-0">QoS 2</Badge> Exactly Once
        </span>
        <span className="flex items-center gap-1">
          <Badge variant="outline" className="text-[7px] text-amber-400 border-amber-500/30 px-1 py-0">R</Badge> Retained
        </span>
        <span className="flex items-center gap-1">
          <Badge variant="outline" className="text-[7px] text-[hsl(var(--tron-danger))] border-red-500/30 px-1 py-0">LW</Badge> Last Will
        </span>
      </div>
    </div>
  );
}
