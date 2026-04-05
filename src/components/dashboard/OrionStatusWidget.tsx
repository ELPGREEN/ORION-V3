import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Mic, MicOff, Brain, Zap, Volume2, ChevronRight, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OrionStatusWidget() {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState(true);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [lastCommandTime, setLastCommandTime] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("orion_last_command");
    const storedTime = localStorage.getItem("orion_last_command_time");
    if (stored) setLastCommand(stored);
    if (storedTime) setLastCommandTime(storedTime);

    const handleOrionEvent = (e: CustomEvent) => {
      if (e.detail?.command) {
        setLastCommand(e.detail.command);
        setLastCommandTime(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
      }
    };
    window.addEventListener("orion-command" as any, handleOrionEvent);
    
    const checkOnline = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", checkOnline);
    window.addEventListener("offline", checkOnline);

    return () => {
      window.removeEventListener("orion-command" as any, handleOrionEvent);
      window.removeEventListener("online", checkOnline);
      window.removeEventListener("offline", checkOnline);
    };
  }, []);

  const capabilities = [
    { label: "Voz", active: true, icon: Volume2 },
    { label: "Visão", active: true, icon: Brain },
    { label: "IoT", active: isOnline, icon: isOnline ? Wifi : WifiOff },
  ];

  return (
    <div className="relative overflow-hidden bg-card border border-primary/20 p-5 group">
      {/* Animated orb background */}
      <div className="absolute top-2 right-2 w-32 h-32 bg-primary/8 blur-[60px] animate-pulse pointer-events-none" style={{ animationDuration: '3s' }} />
      <div className="absolute bottom-0 left-0 w-24 h-24 bg-accent/5 blur-[50px] pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className={`h-10 w-10 rounded-full flex items-center justify-center border transition-all ${
                isOnline 
                  ? "bg-primary/15 border-primary/40 shadow-[0_0_20px_-5px_hsl(var(--primary)/0.4)]" 
                  : "bg-muted border-border"
              }`}>
                <Zap className={`h-5 w-5 ${isOnline ? "text-primary" : "text-muted-foreground"}`} />
              </div>
              <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-card ${
                isOnline ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground"
              }`} style={{ animationDuration: '2s' }} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-foreground">Orion</h3>
              <p className="text-[10px] text-muted-foreground">
                {isOnline ? "Neural ativo • Pronto para comandos" : "Offline • Modo local"}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-[10px] text-primary hover:text-primary/80 h-7 px-2"
            onClick={() => navigate("/dashboard/orion")}
          >
            Abrir <ChevronRight className="h-3 w-3 ml-0.5" />
          </Button>
        </div>

        {/* Capabilities */}
        <div className="flex gap-2 mb-4">
          {capabilities.map((cap) => (
            <div
              key={cap.label}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[10px] font-medium border transition-all ${
                cap.active
                  ? "bg-primary/10 border-primary/25 text-primary"
                  : "bg-muted/50 border-border text-muted-foreground"
              }`}
            >
              <cap.icon className="h-3 w-3" />
              {cap.label}
            </div>
          ))}
        </div>

        {/* Last command */}
        {lastCommand ? (
          <div className="bg-muted/30 border border-border p-3">
            <p className="text-[10px] text-muted-foreground/70 uppercase tracking-wider mb-1">Último comando</p>
            <p className="text-xs text-foreground truncate">"{lastCommand}"</p>
            {lastCommandTime && (
              <p className="text-[10px] text-muted-foreground mt-1">às {lastCommandTime}</p>
            )}
          </div>
        ) : (
          <div className="bg-muted/20 border border-dashed border-border p-3 text-center">
            <Mic className="h-4 w-4 text-muted-foreground/40 mx-auto mb-1" />
            <p className="text-[10px] text-muted-foreground">
              Diga <span className="text-primary font-medium">"Orion"</span> para começar
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
