import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Eye, Bot, Brain, AlertTriangle, Activity, Factory, HeartPulse, Navigation, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ERCAConfig {
  especialize: string;
  redeNeural: string;
  contexto: string;
  acao: string;
}

interface InspectionResult {
  risco?: string;
  nivel?: string;
  local?: string;
  violacao?: string;
  acao_recomendada?: string;
  timestamp?: string;
  emergencia?: boolean;
  defeitos?: any[];
  raw?: string;
}

const ERCA_PRESETS: Record<string, { label: string; icon: React.ReactNode; intentType: string; config: ERCAConfig }> = {
  safety: {
    label: "Inspeção de Segurança",
    icon: <Shield className="h-4 w-4" />,
    intentType: "visual_inspection",
    config: {
      especialize: "Agente Autônomo de Inspeção de Segurança Industrial",
      redeNeural: "YOLO + MediaPipe PoseLandmarker + BlazeFace",
      contexto: "Detectar ausência de EPIs, proximidade perigosa de maquinário, postura de queda",
      acao: "Classificar risco e gerar alerta estruturado JSON",
    },
  },
  quality: {
    label: "Controle de Qualidade",
    icon: <Eye className="h-4 w-4" />,
    intentType: "visual_quality",
    config: {
      especialize: "Inspetor de Qualidade de Linha de Produção",
      redeNeural: "YOLOv8-seg + Classificador de Defeitos",
      contexto: "Identificar defeitos visuais (riscos, manchas, deformação) em produtos",
      acao: "Aprovar/rejeitar peça com relatório de defeitos",
    },
  },
  navigation: {
    label: "Navegação Autônoma",
    icon: <Navigation className="h-4 w-4" />,
    intentType: "visual_navigation",
    config: {
      especialize: "Operador de Navegação (Drone/AGV/AMR)",
      redeNeural: "COCO-SSD + Estimativa de Profundidade DPT",
      contexto: "Mapear obstáculos, calcular distâncias, planejar rota segura",
      acao: "Gerar comando de navegação com mapa de obstáculos",
    },
  },
  medical: {
    label: "Monitor Médico",
    icon: <HeartPulse className="h-4 w-4" />,
    intentType: "visual_medical",
    config: {
      especialize: "Monitor de Saúde Ocupacional",
      redeNeural: "PoseLandmarker + BlazeFace + Expressões Faciais",
      contexto: "Detectar queda (pose horizontal), expressão de dor, sinais vitais anômalos",
      acao: "Ativar protocolo de emergência ou monitoramento contínuo",
    },
  },
};

export function ERCAVisualAgent() {
  const [selectedPreset, setSelectedPreset] = useState<string>("safety");
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<InspectionResult | null>(null);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = useCallback((msg: string) => {
    setLogs(prev => [...prev.slice(-19), `[${new Date().toLocaleTimeString()}] ${msg}`]);
  }, []);

  const runInspection = useCallback(async () => {
    const preset = ERCA_PRESETS[selectedPreset];
    if (!preset) return;

    setIsProcessing(true);
    addLog(`▶ Iniciando inspeção E-R-C-A: ${preset.label}`);
    addLog(`  E: ${preset.config.especialize}`);
    addLog(`  R: ${preset.config.redeNeural}`);

    try {
      // Capture current vision state if available
      const visionState = (globalThis as any).__orionVisionServiceState;
      const localDetections = visionState ? {
        realTimeObjects: visionState.objects || [],
        realTimeFaces: visionState.faces || [],
        realTimeHands: visionState.hands || [],
        faceApiAnalysis: visionState.faceAnalysis || null,
        motion: visionState.motion || null,
      } : undefined;

      addLog(`  Detecções locais: ${localDetections ? JSON.stringify({
        objetos: localDetections.realTimeObjects?.length || 0,
        faces: localDetections.realTimeFaces?.length || 0,
        mãos: localDetections.realTimeHands?.length || 0,
      }) : "nenhuma câmera ativa"}`);

      const { data, error } = await supabase.functions.invoke("neural-ops", {
        body: {
          question: `[E-R-C-A Inspeção] Analise o ambiente atual usando o protocolo E-R-C-A.
Especialize: ${preset.config.especialize}
Rede Neural: ${preset.config.redeNeural}  
Contexto: ${preset.config.contexto}
Ação: ${preset.config.acao}
${localDetections ? `Detecções ML em tempo real: ${JSON.stringify(localDetections)}` : "Sem detecções visuais ativas — simule cenário de teste."}`,
          intentType: preset.intentType,
          localDetections,
          stream: false,
        },
      });

      if (error) throw error;

      const description = data?.description || "";
      addLog(`  ✅ Resposta recebida (${description.length} chars)`);

      // Try to extract JSON from response
      let result: InspectionResult = { raw: description };
      const jsonMatch = description.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          result = { ...parsed, raw: description };
        } catch { /* keep raw */ }
      }

      setLastResult(result);
      addLog(`  Resultado: risco=${result.risco || "N/A"}, emergência=${result.emergencia || false}`);
      
      if (result.emergencia) {
        toast.error("🚨 EMERGÊNCIA DETECTADA", { description: result.acao_recomendada || "Protocolo de emergência ativado" });
      } else if (result.risco === "alto" || result.risco === "critico") {
        toast.warning(`⚠️ Risco ${result.risco?.toUpperCase()}`, { description: result.violacao || "Violação detectada" });
      } else {
        toast.success("✅ Inspeção concluída", { description: `Nível: ${result.nivel || result.risco || "OK"}` });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`  ❌ Erro: ${msg}`);
      toast.error("Erro na inspeção", { description: msg });
    } finally {
      setIsProcessing(false);
    }
  }, [selectedPreset, addLog]);

  const runSelfRefinement = useCallback(async () => {
    setIsProcessing(true);
    addLog("🧬 Iniciando Auto-Refinamento (E-R-C-A Nível 3)...");

    try {
      const { data, error } = await supabase.functions.invoke("neural-ops", {
        body: {
          question: `[E-R-C-A Auto-Refinamento] Analise a performance recente do sistema de visão:
- Logs dos últimos 10 ciclos de inspeção disponíveis na memória
- Identifique padrões de erro e falhas de classificação
- Sugira ajustes de threshold, augmentation de dados e prioridade de retreino
- Formate como JSON estruturado conforme protocolo E-R-C-A Nível 3`,
          intentType: "self_refine",
          stream: false,
        },
      });

      if (error) throw error;
      addLog(`  ✅ Auto-refinamento: ${(data?.description || "").substring(0, 200)}...`);
      setLastResult({ raw: data?.description || "" });
      toast.success("🧬 Auto-refinamento concluído");
    } catch (err) {
      addLog(`  ❌ Erro: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsProcessing(false);
    }
  }, [addLog]);

  const preset = ERCA_PRESETS[selectedPreset];

  return (
    <Card className="border-primary/20 bg-card/80 backdrop-blur">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Factory className="h-5 w-5 text-primary" />
          Agente Visual E-R-C-A
          <Badge variant="outline" className="ml-auto text-xs">Tri-Layer Protocol</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="agent" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="agent" className="text-xs">
              <Bot className="h-3 w-3 mr-1" />Agente
            </TabsTrigger>
            <TabsTrigger value="logs" className="text-xs">
              <Activity className="h-3 w-3 mr-1" />Logs
            </TabsTrigger>
            <TabsTrigger value="refine" className="text-xs">
              <Brain className="h-3 w-3 mr-1" />Auto-Refine
            </TabsTrigger>
          </TabsList>

          <TabsContent value="agent" className="space-y-3 mt-3">
            <Select value={selectedPreset} onValueChange={setSelectedPreset}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o modo" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(ERCA_PRESETS).map(([key, p]) => (
                  <SelectItem key={key} value={key}>
                    <span className="flex items-center gap-2">
                      {p.icon} {p.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {preset && (
              <div className="space-y-2 text-xs text-muted-foreground bg-muted/30 rounded-lg p-3">
                <div><span className="font-semibold text-primary">E</span>specialize: {preset.config.especialize}</div>
                <div><span className="font-semibold text-primary">R</span>ede Neural: {preset.config.redeNeural}</div>
                <div><span className="font-semibold text-primary">C</span>ontexto: {preset.config.contexto}</div>
                <div><span className="font-semibold text-primary">A</span>ção: {preset.config.acao}</div>
              </div>
            )}

            <Button onClick={runInspection} disabled={isProcessing} className="w-full" size="sm">
              {isProcessing ? (
                <><Sparkles className="h-4 w-4 mr-2 animate-spin" />Processando...</>
              ) : (
                <><Eye className="h-4 w-4 mr-2" />Executar Inspeção</>
              )}
            </Button>

            {lastResult && lastResult.risco && (
              <div className={`rounded-lg p-3 text-xs border ${
                lastResult.emergencia ? "border-destructive bg-destructive/10 text-destructive" :
                lastResult.risco === "alto" || lastResult.risco === "critico" ? "border-yellow-500 bg-yellow-500/10 text-yellow-700 dark:text-[hsl(var(--tron-warn))]" :
                "border-green-500 bg-green-500/10 text-green-700 dark:text-[hsl(var(--tron-neon))]"
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <AlertTriangle className="h-3 w-3" />
                  <span className="font-semibold uppercase">{lastResult.emergencia ? "EMERGÊNCIA" : `Risco: ${lastResult.risco}`}</span>
                </div>
                {lastResult.violacao && <div>Violação: {lastResult.violacao}</div>}
                {lastResult.local && <div>Local: {lastResult.local}</div>}
                {lastResult.acao_recomendada && <div>Ação: {lastResult.acao_recomendada}</div>}
              </div>
            )}
          </TabsContent>

          <TabsContent value="logs" className="mt-3">
            <div className="bg-black/80 rounded-lg p-3 h-48 overflow-y-auto font-mono text-[10px] text-[hsl(var(--tron-neon))] space-y-0.5">
              {logs.length === 0 ? (
                <div className="text-muted-foreground">Nenhum log ainda. Execute uma inspeção.</div>
              ) : (
                logs.map((log, i) => <div key={i}>{log}</div>)
              )}
            </div>
          </TabsContent>

          <TabsContent value="refine" className="space-y-3 mt-3">
            <div className="text-xs text-muted-foreground">
              <p className="font-semibold mb-1">E-R-C-A Nível 3 — Auto-Refinamento</p>
              <p>O agente analisa seus próprios logs de performance, identifica falhas de classificação e sugere melhorias automáticas (ajuste de threshold, data augmentation, retreino).</p>
            </div>
            <Button onClick={runSelfRefinement} disabled={isProcessing} variant="outline" className="w-full" size="sm">
              <Brain className="h-4 w-4 mr-2" />
              {isProcessing ? "Analisando..." : "Executar Auto-Refinamento"}
            </Button>
            {lastResult?.raw && !lastResult.risco && (
              <div className="bg-muted/30 rounded-lg p-3 text-xs max-h-48 overflow-y-auto whitespace-pre-wrap">
                {lastResult.raw.substring(0, 1000)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
