import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Loader2, Brain, Cpu, Bot, Wifi, Shield, Activity, Zap, Server } from "lucide-react";
import { toast } from "sonner";
import { StatusLED } from "@/components/dashboard/DashboardTheme";

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
      // ⚡ New High-Speed Streaming Path
      const { data: stream } = await supabase.functions.invoke("ai-orchestrator", {
        body: { prompt: `Execute ${action} and provide summary.`, stream: true, useCase: "chat" }
      });

      if (stream) {
        const { streamOrionSpeech } = await import("@/lib/tts/geminiTTS");
        const abort = new AbortController();
        const [s1, s2] = stream.tee();

        (async () => {
          const reader = s1.getReader();
          const decoder = new TextDecoder();
          let full = "";
          while(true) {
            const {done, value} = await reader.read();
            if(done) break;
            const lines = decoder.decode(value).split("\n");
            for(const line of lines) {
              if(line.startsWith("data: ")) {
                try {
                   const parsed = JSON.parse(line.slice(6));
                   if(parsed.type === "token") {
                     full += parsed.content;
                     setAiResponse(full);
                   }
                } catch{}
              }
            }
          }
        })();

        await streamOrionSpeech(s2 as any, "Enceladus", abort.signal);
      }
      toast.success(`${label} em execução`);
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
      <CardHeader className="pb-3 relative z-10">
        <CardTitle className="flex items-center justify-between text-lg font-serif">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-[hsl(30,85%,52%)]" />
            Orion — Comando Total
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
            <div key={s.name} className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[hsl(220,20%,6%)] border border-[hsl(30,85%,52%,0.1)] transition-colors">
              <s.icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-mono font-medium truncate text-foreground">{s.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{s.description}</p>
              </div>
              <StatusLED status={s.status} />
            </div>
          ))}
        </div>

        {aiResponse && (
          <div className="p-4 rounded-lg bg-black/60 border border-primary/30 animate-in fade-in slide-in-from-top-2">
            <p className="text-xs font-mono text-primary mb-1 uppercase tracking-tighter flex items-center gap-2">
              <Zap className="h-3 w-3" /> Resposta em Tempo Real:
            </p>
            <p className="text-sm leading-relaxed text-foreground">{aiResponse}</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          {ownerActions.map((act) => (
            <Button
              key={act.action}
              variant="outline"
              size="sm"
              disabled={loading !== null}
              className="flex-col h-auto py-3 gap-2 border-[hsl(30,85%,52%,0.15)] hover:bg-[hsl(30,85%,52%,0.05)]"
              onClick={() => callOwnerAction(act.action, act.label)}
            >
              {loading === act.action ? <Loader2 className="h-4 w-4 animate-spin" /> : <act.icon className="h-4 w-4 text-[hsl(30,85%,52%)]" />}
              <span className="text-[10px] uppercase font-bold">{act.label}</span>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
