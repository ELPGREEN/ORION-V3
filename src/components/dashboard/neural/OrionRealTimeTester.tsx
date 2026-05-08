import { useState } from "react";
import { Zap, Eye, Brain, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { analyzeFrame } from "@/lib/vision/gemini-vision";

export function OrionRealTimeTester() {
  const [isTesting, setIsTesting] = useState(false);
  const [results, setResults] = useState<{ latency: number, objects: number } | null>(null);

  const runTest = async () => {
    setIsTesting(true);
    setResults(null);
    const start = performance.now();
    try {
      // Simulate a small image frame
      const canvas = document.createElement("canvas");
      canvas.width = 160;
      canvas.height = 120;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "blue";
        ctx.fillRect(10, 10, 50, 50);
      }
      const base64 = canvas.toDataURL("image/jpeg", 0.5).split(",")[1];

      const res = await analyzeFrame(base64, "O que você vê?", "Teste de performance");
      const end = performance.now();

      setResults({
        latency: Math.round(end - start),
        objects: res.objects?.length || 0
      });
      toast.success("Teste de visão concluído");
    } catch (e) {
      toast.error("Teste falhou");
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="p-4 bg-black/40 border border-primary/20 rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-emerald-400" />
          <h3 className="text-sm font-bold text-foreground">Teste de Visão Real-Time</h3>
        </div>
        <Button size="sm" onClick={runTest} disabled={isTesting}>
          {isTesting ? "Testando..." : "Rodar Stress Test"}
        </Button>
      </div>

      {results && (
        <div className="grid grid-cols-2 gap-3">
          <div className="p-3 bg-white/5 rounded border border-white/10">
            <p className="text-[10px] text-muted-foreground uppercase">Latência E2E</p>
            <p className={`text-xl font-bold ${results.latency < 2000 ? "text-emerald-400" : "text-amber-400"}`}>
              {results.latency}ms
            </p>
          </div>
          <div className="p-3 bg-white/5 rounded border border-white/10">
            <p className="text-[10px] text-muted-foreground uppercase">Objetos</p>
            <p className="text-xl font-bold text-primary">{results.objects}</p>
          </div>
        </div>
      )}

      <div className="mt-4 flex gap-2 overflow-x-auto pb-2">
         <Badge variant="outline" className="text-[9px] bg-emerald-500/10 text-emerald-400 border-emerald-500/20">OpenRouter Active</Badge>
         <Badge variant="outline" className="text-[9px] bg-blue-500/10 text-blue-400 border-blue-500/20">Streaming Enabled</Badge>
         <Badge variant="outline" className="text-[9px] bg-purple-500/10 text-purple-400 border-purple-500/20">Gemini 2.5 Hub</Badge>
      </div>
    </div>
  );
}

function Badge({ children, variant, className }: any) {
  return <span className={`px-2 py-0.5 rounded-full border ${className}`}>{children}</span>;
}
