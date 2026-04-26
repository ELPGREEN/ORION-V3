import { useState, useEffect } from "react";
import { Cpu, Globe, Server } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { detectSystemCapabilities, SystemCapabilities } from "@/lib/neural/smart-hybrid-router";

export function RoutingIndicator() {
  const [caps, setCaps] = useState<SystemCapabilities | null>(null);

  useEffect(() => {
    detectSystemCapabilities().then(setCaps);
  }, []);

  if (!caps) return null;

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 border border-[hsl(var(--tron-neon))/20 rounded-full backdrop-blur-md">
      <div className="flex items-center gap-1.5">
        {caps.ollamaAvailable ? (
          <Badge variant="outline" className="bg-green-500/10 text-[hsl(var(--tron-neon))] border-[hsl(var(--tron-neon))/30 flex items-center gap-1 text-[10px] uppercase tracking-tighter">
            <Cpu className="h-3 w-3" /> Local GPU Active
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/30 flex items-center gap-1 text-[10px] uppercase tracking-tighter">
            <Globe className="h-3 w-3" /> Cloud-Only Mode
          </Badge>
        )}
      </div>

      <div className="h-3 w-[1px] bg-white/10 mx-1" />

      <div className="flex items-center gap-2 text-[9px] font-mono text-white/40 uppercase tracking-widest">
        <span>RAM: {caps.ramGB}GB</span>
        <span>Cores: {caps.cores}</span>
      </div>
    </div>
  );
}
