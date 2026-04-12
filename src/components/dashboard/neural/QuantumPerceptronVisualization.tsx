import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Atom, RefreshCw, Loader2, ArrowRight, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { HopfieldVisualization } from "./HopfieldVisualization";
import { AgentCoActivationGraph } from "./AgentCoActivationGraph";

// 12 legal categories with their ideal weight vectors
const CATEGORIES = [
  { name: "constitucional", label: "Constitucional", color: "hsl(0 70% 50%)" },
  { name: "trabalhista", label: "Trabalhista", color: "hsl(30 70% 50%)" },
  { name: "penal", label: "Penal", color: "hsl(60 70% 40%)" },
  { name: "civil", label: "Civil", color: "hsl(120 50% 40%)" },
  { name: "tributario", label: "Tributário", color: "hsl(180 60% 40%)" },
  { name: "administrativo", label: "Administrativo", color: "hsl(210 60% 50%)" },
  { name: "ambiental", label: "Ambiental", color: "hsl(150 60% 40%)" },
  { name: "consumidor", label: "Consumidor", color: "hsl(280 50% 50%)" },
  { name: "previdenciario", label: "Previdenciário", color: "hsl(320 50% 50%)" },
  { name: "eleitoral", label: "Eleitoral", color: "hsl(350 60% 50%)" },
  { name: "empresarial", label: "Empresarial", color: "hsl(40 60% 45%)" },
  { name: "familia", label: "Família", color: "hsl(300 40% 50%)" },
];

const HEAD_LABELS = ["Semântico", "Keyword", "Autoridade", "Recência", "Jurisdição", "Profundidade"];

interface QuantumWeights {
  name: string;
  weights: number[];
}

export function QuantumPerceptronVisualization() {
  const [categories, setCategories] = useState<QuantumWeights[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [abResults, setAbResults] = useState<any>(null);
  const [abLoading, setAbLoading] = useState(false);
  const [testQuery, setTestQuery] = useState("recurso extraordinário constitucional");

  useEffect(() => { loadWeights(); }, []);

  async function loadWeights() {
    setLoading(true);
    try {
      const { data } = await supabase
        .from("neural_specializations")
        .select("prompts")
        .eq("name", "Quantum Category Weights")
        .eq("is_active", true)
        .maybeSingle();
      const prompts = data?.prompts as Record<string, unknown> | null;
      if (prompts?.categories) {
        setCategories(prompts.categories as QuantumWeights[]);
      } else {
        // Show defaults
        setCategories([
          { name: "constitucional", weights: [-1, -1, 1, -1, 1, -1] },
          { name: "trabalhista", weights: [-1, -1, -1, 1, 1, -1] },
          { name: "penal", weights: [1, 1, -1, -1, 1, -1] },
          { name: "civil", weights: [1, -1, -1, -1, -1, 1] },
          { name: "tributario", weights: [-1, 1, 1, -1, 1, -1] },
          { name: "administrativo", weights: [-1, 1, 1, 1, 1, -1] },
          { name: "ambiental", weights: [1, -1, -1, 1, -1, 1] },
          { name: "consumidor", weights: [1, 1, -1, 1, -1, -1] },
          { name: "previdenciario", weights: [-1, 1, 1, 1, 1, 1] },
          { name: "eleitoral", weights: [-1, -1, 1, 1, 1, -1] },
          { name: "empresarial", weights: [1, 1, -1, -1, -1, 1] },
          { name: "familia", weights: [1, -1, -1, 1, -1, 1] },
        ]);
      }
    } catch (err) {
    } finally {
      setLoading(false);
    }
  }

  async function runAbTest() {
    setAbLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("neural-search", {
        body: { mode: "ab_test", query: testQuery },
      });
      if (error) throw error;
      setAbResults(data);
    } catch (err) {
    } finally {
      setAbLoading(false);
    }
  }

  const selectedData = categories.find(c => c.name === selectedCat);
  const catMeta = CATEGORIES.find(c => c.name === selectedCat);

  return (
    <div className="space-y-4">
      {/* Quantum Perceptron Circuit Diagram */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Atom className="h-5 w-5 text-violet-500" />
              Perceptron Quântico-Inspirado
              <Badge variant="outline" className="text-[10px] border-violet-500/30 text-violet-500">v19 • 12 categorias</Badge>
            </CardTitle>
            <Button onClick={loadWeights} size="sm" variant="outline" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`} />
              Atualizar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : (
            <>
              {/* Category Weight Heatmap */}
              <div className="overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead>
                    <tr>
                      <th className="text-left p-1.5 text-muted-foreground">Categoria</th>
                      {HEAD_LABELS.map(h => (
                        <th key={h} className="text-center p-1.5 text-muted-foreground">{h}</th>
                      ))}
                      <th className="text-center p-1.5 text-muted-foreground">|c|²</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map(cat => {
                      const meta = CATEGORIES.find(c => c.name === cat.name);
                      const dotSelf = cat.weights.reduce((s, w) => s + w * w, 0);
                      const selfCompat = Math.pow(dotSelf / cat.weights.length, 2);
                      const isSelected = selectedCat === cat.name;
                      return (
                        <tr
                          key={cat.name}
                          onClick={() => setSelectedCat(isSelected ? null : cat.name)}
                          className={`cursor-pointer transition-colors ${isSelected ? "bg-violet-500/10" : "hover:bg-muted/30"}`}
                        >
                          <td className="p-1.5 font-medium" style={{ color: meta?.color }}>
                            {meta?.label || cat.name}
                          </td>
                          {cat.weights.map((w, i) => {
                            const isPositive = w >= 0;
                            const intensity = Math.abs(w);
                            return (
                              <td key={i} className="text-center p-1.5">
                                <span
                                  className="inline-block w-8 py-0.5 rounded text-[9px] font-mono"
                                  style={{
                                    backgroundColor: isPositive
                                      ? `hsla(142, 70%, 45%, ${intensity * 0.4})`
                                      : `hsla(0, 70%, 45%, ${intensity * 0.4})`,
                                    color: isPositive ? "hsl(142 70% 35%)" : "hsl(0 70% 40%)",
                                  }}
                                >
                                  {w > 0 ? "+" : ""}{w.toFixed(1)}
                                </span>
                              </td>
                            );
                          })}
                          <td className="text-center p-1.5">
                            <span className="text-violet-500 font-medium">{selfCompat.toFixed(2)}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Selected category detail */}
              {selectedData && catMeta && (
                <div className="mt-4 p-3 border border-violet-500/20 bg-violet-500/5 rounded">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium" style={{ color: catMeta.color }}>{catMeta.label}</span>
                    <Badge variant="outline" className="text-[9px]">Vetor de peso ⃗w</Badge>
                  </div>
                  <div className="flex items-center gap-1 flex-wrap">
                    {selectedData.weights.map((w, i) => (
                      <div key={i} className="flex items-center gap-1">
                        {i > 0 && <span className="text-muted-foreground text-[8px]">·</span>}
                        <span className="text-[10px] text-muted-foreground">{HEAD_LABELS[i]}=</span>
                        <span className={`text-[10px] font-mono font-bold ${w >= 0 ? "text-green-500" : "text-red-500"}`}>
                          {w > 0 ? "+" : ""}{w.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[9px] text-muted-foreground mt-2">
                    Eq. 3.7: ⟨ψᵢ|ψw⟩ = (1/m) · ⃗i · ⃗w — Compatibilidade = |c_(m-1)|²
                  </p>
                </div>
              )}

              {/* Pipeline visualization */}
              <div className="mt-4 flex items-center gap-1 flex-wrap text-[9px] text-muted-foreground">
                <Zap className="h-3 w-3 text-primary" />
                <span className="font-medium text-foreground">Pipeline v19:</span>
                {["H⊗N Superposição", "MHA 6-head", "Quantum Classify", "Competitive WTA", "Hopfield Memory", "Signal Flip", "Auto-tune", "Feedback Loop", "Cross-Encoder"].map((step, i) => (
                  <span key={i} className="flex items-center gap-0.5">
                    {i > 0 && <ArrowRight className="h-2.5 w-2.5" />}
                    <span className={`px-1.5 py-0.5 border rounded ${
                      step.includes("Competitive") || step.includes("Hopfield")
                        ? "border-emerald-500/30 text-emerald-500 bg-emerald-500/5"
                        : "border-primary/20 text-primary bg-primary/5"
                    }`}>{step}</span>
                  </span>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* A/B Testing Panel */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-500" />
            A/B Testing: Sigmoid vs Quantum
            <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-500">Fase 6.2</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={testQuery}
              onChange={e => setTestQuery(e.target.value)}
              className="flex-1 text-sm px-3 py-2 bg-background border border-border rounded"
              placeholder="Query de teste..."
            />
            <Button onClick={runAbTest} size="sm" disabled={abLoading || !testQuery.trim()}>
              {abLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Zap className="h-4 w-4 mr-1" />}
              Testar
            </Button>
          </div>

          {abResults && (
            <div className="space-y-3">
              {/* Comparison metrics */}
              <div className="grid grid-cols-4 gap-2">
                <div className="p-2 bg-muted/30 border border-border rounded text-center">
                  <p className="text-[9px] text-muted-foreground">Concordância</p>
                  <p className="text-lg font-bold text-foreground">{(abResults.comparison?.rank_agreement * 100 || 0).toFixed(0)}%</p>
                </div>
                <div className="p-2 bg-muted/30 border border-border rounded text-center">
                  <p className="text-[9px] text-muted-foreground">Score Sigmoid</p>
                  <p className="text-lg font-bold text-foreground">{(abResults.comparison?.avg_sigmoid_score || 0).toFixed(3)}</p>
                </div>
                <div className="p-2 bg-muted/30 border border-border rounded text-center">
                  <p className="text-[9px] text-muted-foreground">Score Quantum</p>
                  <p className="text-lg font-bold text-violet-500">{(abResults.comparison?.avg_quantum_score || 0).toFixed(3)}</p>
                </div>
                <div className="p-2 bg-muted/30 border border-border rounded text-center">
                  <p className="text-[9px] text-muted-foreground">Quantum Lift</p>
                  <p className={`text-lg font-bold ${(abResults.comparison?.quantum_lift || 0) > 0 ? "text-green-500" : "text-red-500"}`}>
                    {((abResults.comparison?.quantum_lift || 0) * 100).toFixed(1)}%
                  </p>
                </div>
              </div>

              {/* Side by side results */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground mb-1">Grupo A: Sigmoid (linear)</p>
                  {abResults.sigmoid_results?.slice(0, 3).map((r: any, i: number) => (
                    <div key={i} className="p-2 border border-border mb-1 rounded text-[10px]">
                      <p className="font-medium text-foreground line-clamp-1">{r.title}</p>
                      <p className="text-muted-foreground">Score: {(r.ab_score || 0).toFixed(3)}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-[10px] font-medium text-violet-500 mb-1">Grupo B: Quantum (|c|² boost)</p>
                  {abResults.quantum_results?.slice(0, 3).map((r: any, i: number) => (
                    <div key={i} className="p-2 border border-violet-500/20 bg-violet-500/5 mb-1 rounded text-[10px]">
                      <p className="font-medium text-foreground line-clamp-1">{r.title}</p>
                      <p className="text-violet-500">Score: {(r.ab_score || 0).toFixed(3)}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      {/* v19: Hopfield + Competitive Visualization */}
      <HopfieldVisualization />
      {/* STDP Agent Co-Activation Graph */}
      <AgentCoActivationGraph />
    </div>
  );
}
