import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Loader2, Brain, Cpu, Bot, Wifi, Shield, Activity, Zap, Server } from "lucide-react";
import { toast } from "sonner";
import { StatusLED } from "@/components/dashboard/DashboardTheme";
import { processOrionRequest } from "@/lib/neural/orion-brain";

interface SubsystemStatus {
  name: string;
  icon: typeof Brain;
  status: "online" | "offline" | "loading";
  description: string;
}

export default function OrionComandoTotal() {
  const { user } = useAuth();
  const [loading, setLoading] = useState<string | null>(null);
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [rosEnabled, setRosEnabled] = useState(false);

  const subsystems: SubsystemStatus[] = [
    { name: "Orion IA Core", icon: Brain, status: "online", description: "LLM Gemini + RAG" },
    { name: "TTS Engine", icon: Zap, status: "online", description: "Piper WASM + Gemini TTS" },
    { name: "Rede Neural", icon: Cpu, status: "online", description: "Knowledge Base + Embeddings" },
    { name: "ROSBridge", icon: Bot, status: rosEnabled ? "online" : "offline", description: "ROS2 WebSocket" },
    { name: "IoT/MQTT", icon: Wifi, status: "online", description: "HiveMQ Broker" },
    { name: "RAG Pipeline", icon: Server, status: "online", description: "Hybrid Search v3" },
  ];

  const callOwnerAction = async (action: string, label: string) => {
    if (!user) return;
    setLoading(action);
    setAiResponse(null);
    try {
      const prompt = `Executar comando de proprietário: ${label} (${action}). Contexto: Usuário ${user.email}, Setor de Monitoramento.`;
      const response = await processOrionRequest(prompt, {
        source: "system",
        conversationContext: "Comando Total do Proprietário"
      });

      setAiResponse(response.response || "Sem resposta.");
      toast.success(`${label} concluído via Pentagon`);
    } catch (e: any) {
      toast.error(e.message || "Erro ao executar ação");
    } finally {
      setLoading(null);
    }
  };

  const ownerActions = [
    { action: "system_health", label: "Health Check", icon: Activity, desc: "Status de todos os subsistemas" },
    { action: "global_analytics", label: "Analytics Global", icon: Zap, desc: "Métricas consolidadas" },
    { action: "security_audit", label: "Auditoria", icon: Shield, desc: "Scan de segurança" },
  ];

  return (
    <Card className="border-[hsl(30,85%,52%,0.2)] bg-gradient-to-br from-card to-[hsl(30,85%,52%,0.04)] overflow-hidden relative">
      <div className="absolute inset-0 pointer-events-none" style={{
        backgroundImage: "linear-gradient(hsl(30,85%,52%,0.02) 1px, transparent 1px), linear-gradient(90deg, hsl(30,85%,52%,0.02) 1px, transparent 1px)",
        backgroundSize: "30px 30px",
      }} />
      <CardHeader className="pb-3 relative z-10">
        <CardTitle className="flex items-center justify-between text-lg font-serif">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-[hsl(30,85%,52%)]" />
            Orion — Comando Total (Pentagon)
          </div>
          <div className="flex items-center gap-3">
            <StatusLED status="online" label="CORE" />
            <StatusLED status={rosEnabled ? "online" : "offline"} label="ROS2" />
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 relative z-10">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {subsystems.map((s) => (
            <div key={s.name} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[hsl(220,20%,6%)] border border border-[hsl(30,85%,52%,0.1)] hover:border-[hsl(30,85%,52%,0.25)] transition-colors">
              <s.icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-mono font-medium truncate text-foreground">{s.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{s.description}</p>
              </div>
              <StatusLED status={s.status} />
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg bg-[hsl(220,20%,6%)] border border-[hsl(30,85%,52%,0.1)]">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-[hsl(30,85%,52%)]" />
            <div>
              <p className="text-sm font-medium font-mono">Automação Robótica via Orion</p>
              <p className="text-[10px] text-muted-foreground">Habilitar comandos ROS2 pelo Orion IA</p>
            </div>
          </div>
          <Switch checked={rosEnabled} onCheckedChange={setRosEnabled} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {ownerActions.map((a) => (
            <Button
              key={a.action}
              variant="outline"
              size="sm"
              className="justify-start gap-2 h-auto py-2.5 border-[hsl(30,85%,52%,0.15)] hover:border-[hsl(30,85%,52%,0.4)] hover:bg-[hsl(30,85%,52%,0.05)]"
              disabled={loading !== null}
              onClick={() => callOwnerAction(a.action, a.label)}
            >
              {loading === a.action ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <a.icon className="h-3.5 w-3.5 text-[hsl(30,85%,52%)]" />}
              <div className="text-left">
                <p className="text-xs font-mono font-medium">{a.label}</p>
                <p className="text-[10px] text-muted-foreground">{a.desc}</p>
              </div>
            </Button>
          ))}
        </div>

        {aiResponse && (
          <div className="p-3 rounded-lg bg-[hsl(220,20%,6%)] border border-[hsl(30,85%,52%,0.15)] max-h-48 overflow-y-auto">
            <p className="text-xs font-mono whitespace-pre-wrap text-foreground/80">{aiResponse}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
