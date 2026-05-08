import { useState, useEffect } from "react";
import { Brain, ChevronDown, Check, Zap, Eye, FileText, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { OPENROUTER_FREE_MODELS } from "@/lib/integrations/openrouter-free-models";
import { motion } from "framer-motion";

export type OrionTaskType = "chat" | "vision" | "docs";

interface ModelConfig {
  chatModel: string;
  visionModel: string;
  docsModel: string;
  [key: string]: string;
}

export function OrionModelSelector() {
  const [config, setConfig] = useState<ModelConfig>({
    chatModel: "mistralai/mistral-small-3.1-24b-instruct:free",
    visionModel: "google/gemini-2.5-flash:free",
    docsModel: "meta-llama/llama-3.3-70b-instruct:free",
  });

  useEffect(() => {
    const saved = localStorage.getItem("orion_model_config");
    if (saved) {
      try {
        setConfig(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load orion model config", e);
      }
    }
  }, []);

  const saveConfig = (newConfig: ModelConfig) => {
    setConfig(newConfig);
    localStorage.setItem("orion_model_config", JSON.stringify(newConfig));
    window.dispatchEvent(new CustomEvent("orion-config-changed", { detail: newConfig }));
  };

  const selectModel = (task: OrionTaskType, modelId: string) => {
    const key = task + "Model";
    const newConfig = { ...config, [key]: modelId };
    saveConfig(newConfig);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden p-6 bg-[#030508]/80 border border-primary/30 rounded-xl shadow-[0_0_30px_-5px_hsl(var(--primary)/0.2)] backdrop-blur-md"
    >
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/40 to-transparent animate-[scan_3s_linear_infinite]" />

      <div className="relative z-10">
        <div className="w-full flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10 border border-primary/20 shadow-[0_0_15px_hsl(var(--primary)/0.3)]">
              <Brain className="h-6 w-6 text-primary animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-[0.2em] text-primary/90">Núcleo de Modelos</h3>
              <p className="text-[10px] text-muted-foreground/70 font-mono uppercase">Cascade Architecture v3.5 • 2026</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]" />
            <span className="text-[9px] font-mono text-emerald-400">READY</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <TaskSelector task="chat" label="Diálogo & Voz" icon={<Zap className="h-3.5 w-3.5" />} current={config.chatModel} onSelect={(id) => selectModel("chat", id)} />
          <TaskSelector task="vision" label="Visão Neural" icon={<Eye className="h-3.5 w-3.5" />} current={config.visionModel} onSelect={(id) => selectModel("vision", id)} />
          <TaskSelector task="docs" label="Análise de Docs" icon={<FileText className="h-3.5 w-3.5" />} current={config.docsModel} onSelect={(id) => selectModel("docs", id)} />
        </div>

        <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-between">
           <div className="flex gap-4 font-mono text-[9px] uppercase">
              <div className="flex flex-col"><span className="text-muted-foreground">TTFT Budget</span><span className="text-primary">1500ms</span></div>
              <div className="flex flex-col"><span className="text-muted-foreground">Fallback</span><span className="text-primary">AUTO-SMOL</span></div>
           </div>
           <div className="p-1 px-3 rounded bg-primary/10 border border-primary/20">
              <span className="text-[10px] font-bold text-primary flex items-center gap-1 uppercase tracking-tighter">
                <Sparkles className="h-3 w-3" /> Streaming Ativo
              </span>
           </div>
        </div>
      </div>

      <style>{`
        @keyframes scan {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </motion.div>
  );
}

function TaskSelector({ task, label, icon, current, onSelect }: { task: string, label: string, icon: React.ReactNode, current: string, onSelect: (id: string) => void }) {
  const model = OPENROUTER_FREE_MODELS.find(m => m.id === current);
  return (
    <div className="flex flex-col gap-2">
      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
        <span className="text-primary/60">{icon}</span> {label}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="w-full justify-between bg-black/40 border-white/5 hover:border-primary/40 h-12">
            <div className="flex flex-col items-start min-w-0">
              <span className="text-xs font-bold text-foreground truncate w-full">{model?.name || current}</span>
              <span className="text-[9px] text-muted-foreground/60 font-mono truncate uppercase">
                {model?.tier || "custom"} • {model?.reliabilityScore ? (model.reliabilityScore * 100).toFixed(0) : 95}% REL
              </span>
            </div>
            <ChevronDown className="h-4 w-4 opacity-30" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[300px] bg-[#0a0c10] border-primary/20 backdrop-blur-xl">
          <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-primary/60 py-3">Frontier Models 2026</DropdownMenuLabel>
          <DropdownMenuSeparator className="bg-white/5" />
          <div className="max-h-[350px] overflow-y-auto">
            {OPENROUTER_FREE_MODELS.map((m) => (
              <DropdownMenuItem key={m.id} className="flex items-center justify-between py-3 px-4 cursor-pointer hover:bg-primary/10 focus:bg-primary/10 border-b border-white/5 last:border-0" onClick={() => onSelect(m.id)}>
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-foreground">{m.name}</span>
                    {m.id === current && <div className="h-1 w-1 rounded-full bg-primary shadow-[0_0_5px_hsl(var(--primary))]" />}
                  </div>
                  <span className="text-[10px] text-muted-foreground/70">{m.strengths.slice(0, 3).join(" • ")}</span>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${m.tier === "fast" ? "bg-emerald-500/10 text-emerald-500" : m.tier === "reasoning" ? "bg-purple-500/10 text-purple-500" : "bg-blue-500/10 text-blue-500"}`}>{m.tier.toUpperCase()}</span>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
