import { useState } from "react";
import { Activity, ShieldCheck, Zap, Globe, AlertTriangle, CheckCircle2, Loader2, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface DiagnosticResult {
  provider: string;
  status: "success" | "error" | "pending";
  ttft: number;
  error?: string;
}

export function OrionDiagnostics() {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const runDiagnostics = async () => {
    setIsRunning(true);
    const providers = [
      { name: "OpenRouter (Gemma)", provider: "openrouter", model: "google/gemma-3-27b-it:free" },
      { name: "OpenRouter (Gemini)", provider: "openrouter", model: "google/gemini-2.5-flash:free" },
      { name: "Groq (Llama)", provider: "groq", model: "llama-3.3-70b-versatile" },
      { name: "Google (Direct)", provider: "google", model: "gemini-2.5-flash" }
    ];

    setResults(providers.map(p => ({ provider: p.name, status: "pending", ttft: 0 })));

    for (let i = 0; i < providers.length; i++) {
      const p = providers[i];
      const start = performance.now();
      try {
        const { data, error } = await supabase.functions.invoke("ai-orchestrator", {
          body: { prompt: "ping", preferredProvider: `${p.provider}/${p.model}`, stream: false }
        });
        const ttft = Math.round(performance.now() - start);
        setResults(prev => prev.map((r, idx) => idx === i ? {
          ...r,
          status: error ? "error" : "success",
          ttft,
          error: error?.message
        } : r));
      } catch (e: any) {
        setResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: "error", error: e.message } : r));
      }
    }
    setIsRunning(false);
  };

  return (
    <Card className="border-primary/20 bg-card/40 backdrop-blur">
      <CardHeader className="pb-3 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Diagnóstico de Conectividade
          </CardTitle>
        </div>
        <Button size="sm" onClick={runDiagnostics} disabled={isRunning} variant="outline" className="h-8 border-primary/20 hover:bg-primary/10">
          {isRunning ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Play className="h-3 w-3 mr-2" />}
          Testar Chaves
        </Button>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {results.map((res) => (
            <div key={res.provider} className="flex items-center justify-between p-2 rounded bg-black/20 border border-white/5">
              <div className="flex items-center gap-2">
                {res.status === "success" && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />}
                {res.status === "error" && <AlertTriangle className="h-3.5 w-3.5 text-red-400" />}
                {res.status === "pending" && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
                <span className="text-xs font-medium">{res.provider}</span>
              </div>
              <div className="flex items-center gap-3">
                {res.ttft > 0 && (
                  <span className={`text-[10px] font-mono ${res.ttft < 1500 ? "text-emerald-400" : "text-amber-400"}`}>
                    {res.ttft}ms
                  </span>
                )}
                <Badge status={res.status} />
              </div>
            </div>
          ))}
          {results.length === 0 && (
            <p className="text-[10px] text-muted-foreground text-center py-4 italic">
              Clique em "Testar Chaves" para iniciar a verificação de latência.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function Badge({ status }: { status: string }) {
  const styles: any = {
    success: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    error: "bg-red-500/20 text-red-400 border-red-500/30",
    pending: "bg-white/5 text-muted-foreground border-white/10"
  };
  return (
    <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${styles[status]}`}>
      {status.toUpperCase()}
    </span>
  );
}
