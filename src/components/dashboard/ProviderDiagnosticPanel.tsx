import { useState } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import {
  Activity, Brain, ChevronDown, Clock, Cpu, Database,
  Globe, Search, Zap, CheckCircle2, XCircle, ArrowRight,
} from "lucide-react";

export interface DiagnosticsData {
  totalMs: number;
  intentMs: number;
  ragMs: number;
  llmMs: number;
  provider: string;
  ragKbHits: number;
  ragExternalHits: number;
  ragTxtHits: number;
  ragTotalHits: number;
  ragActive: boolean;
  fallbacksAttempted: string[];
  intent: string;
}

interface Props {
  diagnostics: DiagnosticsData | null | undefined;
}

const PROVIDER_COLORS: Record<string, string> = {
  groq: "text-green-400",
  gemini: "text-blue-400",
  mistral: "text-orange-400",
  deepseek: "text-cyan-400",
  openrouter: "text-purple-400",
  anthropic: "text-amber-400",
  huggingface: "text-yellow-400",
  lovable: "text-pink-400",
};

const INTENT_LABELS: Record<string, string> = {
  pesquisa: "🔍 Pesquisa",
  documento: "📄 Documento",
  sintese: "🔬 Síntese",
  consulta: "💬 Consulta",
};

function LatencyBar({ label, ms, icon: Icon, color }: { label: string; ms: number; icon: any; color: string }) {
  const maxMs = 10000;
  const pct = Math.min((ms / maxMs) * 100, 100);
  const isGood = ms < 2000;
  const isWarn = ms >= 2000 && ms < 5000;

  return (
    <div className="space-y-0.5">
      <div className="flex items-center justify-between text-[10px]">
        <span className="flex items-center gap-1 text-muted-foreground">
          <Icon className={`h-3 w-3 ${color}`} />
          {label}
        </span>
        <span className={`font-mono font-bold ${isGood ? "text-green-400" : isWarn ? "text-yellow-400" : "text-red-400"}`}>
          {ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`}
        </span>
      </div>
      <div className="h-1 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isGood ? "bg-green-500" : isWarn ? "bg-yellow-500" : "bg-red-500"}`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
    </div>
  );
}

export default function ProviderDiagnosticPanel({ diagnostics }: Props) {
  const [open, setOpen] = useState(false);

  if (!diagnostics) return null;

  const d = diagnostics;
  const providerColor = PROVIDER_COLORS[d.provider.toLowerCase()] || "text-foreground";

  return (
    <div className="mt-2 rounded-lg border border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-muted/30 transition-colors">
          <Activity className="h-3 w-3 text-primary shrink-0" />
          <span className="text-[10px] text-muted-foreground font-medium">Diagnóstico</span>

          {/* Compact summary badges */}
          <div className="flex items-center gap-1.5 ml-auto">
            <Badge variant="outline" className={`text-[9px] h-4 px-1.5 gap-0.5 ${providerColor} border-current/30`}>
              <Cpu className="h-2.5 w-2.5" />
              {d.provider}
            </Badge>
            <Badge variant="outline" className={`text-[9px] h-4 px-1.5 ${d.totalMs < 3000 ? "text-green-400 border-green-500/30" : d.totalMs < 6000 ? "text-yellow-400 border-yellow-500/30" : "text-red-400 border-red-500/30"}`}>
              {d.totalMs < 1000 ? `${d.totalMs}ms` : `${(d.totalMs / 1000).toFixed(1)}s`}
            </Badge>
            {d.ragActive ? (
              <Badge variant="outline" className="text-[9px] h-4 px-1.5 text-emerald-400 border-emerald-500/30 gap-0.5">
                <Database className="h-2.5 w-2.5" />
                {d.ragTotalHits}
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[9px] h-4 px-1.5 text-muted-foreground border-border/40 gap-0.5">
                <XCircle className="h-2.5 w-2.5" />
                RAG
              </Badge>
            )}
          </div>
          <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 pt-1 space-y-3 border-t border-border/30">
            {/* Latency breakdown */}
            <div className="space-y-1.5">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Latência</span>
              <LatencyBar label="Intent Classification" ms={d.intentMs} icon={Search} color="text-blue-400" />
              <LatencyBar label="RAG Search" ms={d.ragMs} icon={Database} color="text-emerald-400" />
              <LatencyBar label="LLM Generation" ms={d.llmMs} icon={Cpu} color="text-purple-400" />
              <div className="flex items-center justify-between text-[10px] pt-1 border-t border-border/20">
                <span className="text-muted-foreground font-medium flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Total
                </span>
                <span className="font-mono font-bold text-foreground">
                  {d.totalMs < 1000 ? `${d.totalMs}ms` : `${(d.totalMs / 1000).toFixed(1)}s`}
                </span>
              </div>
            </div>

            {/* RAG breakdown */}
            <div className="space-y-1">
              <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">RAG Context</span>
              <div className="grid grid-cols-3 gap-1.5">
                <div className="flex flex-col items-center rounded-md border border-border/40 py-1.5 px-1">
                  <Brain className="h-3 w-3 text-purple-400 mb-0.5" />
                  <span className="text-[11px] font-bold text-foreground">{d.ragKbHits}</span>
                  <span className="text-[8px] text-muted-foreground">Knowledge Base</span>
                </div>
                <div className="flex flex-col items-center rounded-md border border-border/40 py-1.5 px-1">
                  <Globe className="h-3 w-3 text-emerald-400 mb-0.5" />
                  <span className="text-[11px] font-bold text-foreground">{d.ragExternalHits}</span>
                  <span className="text-[8px] text-muted-foreground">APIs Externas</span>
                </div>
                <div className="flex flex-col items-center rounded-md border border-border/40 py-1.5 px-1">
                  <Database className="h-3 w-3 text-blue-400 mb-0.5" />
                  <span className="text-[11px] font-bold text-foreground">{d.ragTxtHits}</span>
                  <span className="text-[8px] text-muted-foreground">TXT/Livros</span>
                </div>
              </div>
            </div>

            {/* Provider + intent */}
            <div className="flex items-center gap-2 flex-wrap text-[10px]">
              <span className="text-muted-foreground">Intent:</span>
              <Badge variant="outline" className="text-[9px] h-4">{INTENT_LABELS[d.intent] || d.intent}</Badge>
              <span className="text-muted-foreground ml-1">Provider:</span>
              <Badge variant="outline" className={`text-[9px] h-4 gap-0.5 ${providerColor} border-current/30`}>
                <Zap className="h-2.5 w-2.5" />
                {d.provider}
              </Badge>
            </div>

            {/* Fallback chain */}
            {d.fallbacksAttempted.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">Fallback Chain</span>
                <div className="flex items-center gap-1 flex-wrap text-[9px]">
                  {d.fallbacksAttempted.map((p, i) => (
                    <span key={i} className="flex items-center gap-0.5">
                      <span className="text-red-400 line-through">{p}</span>
                      <ArrowRight className="h-2.5 w-2.5 text-muted-foreground" />
                    </span>
                  ))}
                  <span className={`font-bold ${providerColor}`}>
                    <CheckCircle2 className="h-2.5 w-2.5 inline mr-0.5" />
                    {d.provider}
                  </span>
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
