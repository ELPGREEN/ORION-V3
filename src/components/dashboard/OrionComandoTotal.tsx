import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Loader2, Brain, Cpu, Bot, Wifi, Shield, Activity, Zap, Server } from "lucide-react";
import { toast } from "sonner";

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
      const { data, error } = await supabase.functions.invoke("orion-produtor-ai", {
        body: { action, context: `User: ${user.email}, Timestamp: ${new Date().toISOString()}` },
      });
      if (error) throw error;
      setAiResponse(data?.result || "Sem resposta.");
      toast.success(`${label} concluído`);
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
    <Card className="border-primary/30 bg-gradient-to-br from-card to-primary/5">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg font-serif">
          <Brain className="h-5 w-5 text-primary" />
          Orion — Comando Total
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Subsystems Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {subsystems.map((s) => (
            <div key={s.name} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/50">
              <s.icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{s.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{s.description}</p>
              </div>
              <Badge variant={s.status === "online" ? "default" : "secondary"} className="text-[9px] px-1.5 py-0 shrink-0">
                {s.status === "online" ? "ON" : "OFF"}
              </Badge>
            </div>
          ))}
        </div>

        {/* ROS2 Toggle */}
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/20 border border-border/50">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-primary" />
            <div>
              <p className="text-sm font-medium">Automação Robótica via Orion</p>
              <p className="text-[10px] text-muted-foreground">Habilitar comandos ROS2 pelo Orion IA</p>
            </div>
          </div>
          <Switch checked={rosEnabled} onCheckedChange={setRosEnabled} />
        </div>

        {/* Owner Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {ownerActions.map((a) => (
            <Button
              key={a.action}
              variant="outline"
              size="sm"
              className="justify-start gap-2 h-auto py-2"
              disabled={loading !== null}
              onClick={() => callOwnerAction(a.action, a.label)}
            >
              {loading === a.action ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <a.icon className="h-3.5 w-3.5" />}
              <div className="text-left">
                <p className="text-xs font-medium">{a.label}</p>
                <p className="text-[10px] text-muted-foreground">{a.desc}</p>
              </div>
            </Button>
          ))}
        </div>

        {/* AI Response */}
        {aiResponse && (
          <div className="p-3 rounded-lg bg-muted/30 border border-primary/20 max-h-48 overflow-y-auto">
            <p className="text-xs whitespace-pre-wrap">{aiResponse}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
