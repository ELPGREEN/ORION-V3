import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Zap, Network } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const HEAD_LABELS = ["Semântico", "Keyword", "Autoridade", "Recência", "Jurisdição", "Profundidade"];

export function HopfieldVisualization() {
  const [testQuery, setTestQuery] = useState("habeas corpus constitucional");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  async function runHopfieldTest() {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("neural-search", {
        body: { query: testQuery, mode: "neural", matchCount: 8, includeAttention: true },
      });
      if (error) throw error;
      setResult(data);
    } catch (err) {
    } finally {
      setLoading(false);
    }
  }

  const topResult = result?.results?.[0];
  const hasHopfield = topResult?.hopfield_energy !== undefined;
  const hasCompetitive = topResult?.competitive_category !== undefined;

  return (
    <Card className="bg-card border-border">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Network className="h-5 w-5 text-emerald-500" />
          Hopfield + Competitivo (v19 Rauber)
          <Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-500">
            Seções IV + V
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={testQuery}
            onChange={e => setTestQuery(e.target.value)}
            className="flex-1 text-sm px-3 py-2 bg-background border border-border rounded"
            placeholder="Query para testar memória associativa..."
          />
          <Button onClick={runHopfieldTest} size="sm" disabled={loading || !testQuery.trim()}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Zap className="h-4 w-4 mr-1" />}
            Testar
          </Button>
        </div>

        {result && (
          <div className="space-y-3">
            {/* Pipeline stages */}
            <div className="flex flex-wrap gap-1">
              {(result.pipeline || []).map((stage: string, i: number) => (
                <span
                  key={i}
                  className={`text-[8px] px-1.5 py-0.5 rounded border ${
                    stage.includes("v19") || stage.includes("hopfield") || stage.includes("competitive")
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-500 font-medium"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {stage}
                </span>
              ))}
            </div>

            {/* Competitive Classification Results */}
            {hasCompetitive && (
              <div className="p-3 border border-emerald-500/20 bg-emerald-500/5 rounded">
                <p className="text-[10px] font-medium text-emerald-500 mb-1">
                  🏆 Classificação Competitiva (Winner-Takes-All)
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {result.results?.slice(0, 6).map((r: any, i: number) => (
                    <div key={i} className="text-[9px] p-1.5 border border-border rounded">
                      <p className="font-medium text-foreground line-clamp-1">{r.title}</p>
                      <p className="text-emerald-500">
                        Categoria: {r.competitive_category || "—"}
                      </p>
                      <p className="text-muted-foreground">
                        Confiança: {((r.competitive_confidence || 0) * 100).toFixed(0)}%
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hopfield Memory Results */}
            {hasHopfield && (
              <div className="p-3 border border-violet-500/20 bg-violet-500/5 rounded">
                <p className="text-[10px] font-medium text-violet-500 mb-1">
                  🧲 Rede de Hopfield — Memória Associativa
                </p>
                <div className="grid grid-cols-4 gap-2">
                  <div className="text-center">
                    <p className="text-[9px] text-muted-foreground">Energia</p>
                    <p className="text-sm font-bold text-violet-500">
                      {(topResult.hopfield_energy || 0).toFixed(3)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] text-muted-foreground">Convergiu</p>
                    <p className={`text-sm font-bold ${topResult.hopfield_converged ? "text-green-500" : "text-red-500"}`}>
                      {topResult.hopfield_converged ? "Sim" : "Não"}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] text-muted-foreground">Padrão</p>
                    <p className="text-sm font-bold text-foreground">
                      #{topResult.hopfield_closest_pattern}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[9px] text-muted-foreground">Hamming</p>
                    <p className="text-sm font-bold text-foreground">
                      {topResult.hopfield_hamming_distance}
                    </p>
                  </div>
                </div>
                <p className="text-[8px] text-muted-foreground mt-2">
                  E = −½ · Σ wᵢⱼ · xᵢ · xⱼ (Eq. 22, Seção IV.4)
                </p>
              </div>
            )}

            {/* Results count */}
            <p className="text-[9px] text-muted-foreground">
              Pipeline v19: {result.totalResults || 0} resultados • Versão: {result.version}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
