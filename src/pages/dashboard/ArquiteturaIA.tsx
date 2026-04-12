import { useState, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Brain, Cpu, Zap, Eye, Shield, MessageCircle, ArrowRight, Layers, Target, Scissors, Workflow, Box, ScanLine, Network, Hand } from "lucide-react";
// [REMOVED] import { computeThetas, applyRoPE, computeAttentionPattern } from "@/lib/rope";
import { motion, AnimatePresence } from "framer-motion";
// [REMOVED] import { LANDMARK_NAMES, HAND_CONNECTIONS, GESTURE_ACTIONS, type GestureType } from "@/components/dashboard/neural/useGestureDetection";

// ═══ Tokenization Demo ═══
function TokenizationDemo() {
  const [text, setText] = useState("me diz uma coisa que dia que é hoje");
  const tokens = text.split(/(\s+)/).filter(t => t.trim());
  
  return (
    <Card className="border-primary/20 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageCircle className="h-4 w-4 text-primary" />
          1. Tokenização — Quebrando texto em pedaços
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          className="w-full bg-input border border-border text-foreground text-sm px-3 py-2 focus:outline-none focus:border-primary/50"
          placeholder="Digite uma frase..."
        />
        <div className="flex flex-wrap gap-1.5">
          {tokens.map((token, i) => (
            <div key={i} className="flex flex-col items-center gap-0.5">
              <Badge variant="outline" className="text-xs border-primary/30 bg-primary/5 text-primary font-mono">
                {token}
              </Badge>
              <span className="text-[8px] text-muted-foreground font-mono">#{i}</span>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-muted-foreground">
          Total: {tokens.length} tokens • Cada token vira um vetor numérico de alta dimensão
        </p>
      </CardContent>
    </Card>
  );
}

// ═══ RoPE Visualization ═══
function RoPEDemo() {
  const [position, setPosition] = useState([0]);
  const dim = 8;
  const thetas = useMemo(() => computeThetas(dim), []);
  const baseVec = useMemo(() => [1, 0, 2, 0, 1.5, 0, 0.5, 0], []);
  const rotated = useMemo(() => applyRoPE(baseVec, position[0], thetas), [position, thetas, baseVec]);
  
  return (
    <Card className="border-primary/20 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Cpu className="h-4 w-4 text-primary" />
          2. RoPE — Codificação Posicional Rotacional
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground">Posição do token: <strong className="text-primary">{position[0]}</strong></span>
          </div>
          <Slider value={position} onValueChange={setPosition} min={0} max={50} step={1} className="w-full" />
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[9px] text-muted-foreground mb-1 uppercase tracking-wider">Vetor Original</p>
            <div className="flex gap-1">
              {baseVec.map((v, i) => (
                <div key={i} className="flex-1 text-center">
                  <div className="h-8 bg-muted border border-border flex items-center justify-center">
                    <span className="text-[8px] font-mono text-foreground">{v.toFixed(1)}</span>
                  </div>
                  <span className="text-[7px] text-muted-foreground">d{i}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[9px] text-muted-foreground mb-1 uppercase tracking-wider">Após RoPE (pos={position[0]})</p>
            <div className="flex gap-1">
              {rotated.map((v, i) => {
                const diff = Math.abs(v - baseVec[i]);
                const intensity = Math.min(1, diff / 2);
                return (
                  <div key={i} className="flex-1 text-center">
                    <div
                      className="h-8 border flex items-center justify-center transition-colors"
                      style={{
                        backgroundColor: `hsl(var(--primary) / ${0.1 + intensity * 0.4})`,
                        borderColor: `hsl(var(--primary) / ${0.2 + intensity * 0.5})`,
                      }}
                    >
                      <span className="text-[8px] font-mono text-foreground">{v.toFixed(1)}</span>
                    </div>
                    <span className="text-[7px] text-muted-foreground">d{i}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        
        <p className="text-[10px] text-muted-foreground">
          O RoPE rotaciona cada par de dimensões proporcionalmente à posição. 
          Isso permite que o modelo entenda a <strong>distância relativa</strong> entre palavras.
        </p>
      </CardContent>
    </Card>
  );
}

// ═══ Attention Pattern Heatmap ═══
function AttentionDemo() {
  const seqLen = 10;
  const pattern = useMemo(() => computeAttentionPattern(seqLen, 8), []);
  const tokens = ["me", "diz", "uma", "coisa", "que", "dia", "que", "é", "hoje", "."];
  
  return (
    <Card className="border-primary/20 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Eye className="h-4 w-4 text-primary" />
          3. Atenção — Cada palavra olha para todas as outras
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="inline-block">
            <div className="flex">
              <div className="w-10" />
              {tokens.map((t, i) => (
                <div key={i} className="w-8 text-center">
                  <span className="text-[7px] font-mono text-muted-foreground">{t}</span>
                </div>
              ))}
            </div>
            {pattern.map((row, i) => (
              <div key={i} className="flex">
                <div className="w-10 flex items-center">
                  <span className="text-[7px] font-mono text-muted-foreground">{tokens[i]}</span>
                </div>
                {row.map((score, j) => (
                  <div
                    key={j}
                    className="w-8 h-7 border border-background/50"
                    style={{
                      backgroundColor: `hsl(var(--primary) / ${score * 0.8 + 0.05})`,
                    }}
                    title={`${tokens[i]} → ${tokens[j]}: ${(score * 100).toFixed(0)}%`}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground mt-3">
          Heatmap de atenção: cores mais intensas = mais relevância entre tokens. 
          Note que tokens próximos têm atenção alta (diagonal) — cortesia do RoPE.
        </p>
      </CardContent>
    </Card>
  );
}

// ═══ RLHF Pipeline ═══
function RLHFDemo() {
  const stages = [
    { icon: Brain, label: "Pré-treino", desc: "Trilhões de tokens", color: "text-blue-400" },
    { icon: Layers, label: "SFT", desc: "Fine-tuning supervisionado", color: "text-purple-400" },
    { icon: Shield, label: "RLHF", desc: "Feedback humano + IA", color: "text-emerald-400" },
    { icon: Zap, label: "DPO", desc: "Otimização direta", color: "text-warning" },
  ];
  
  return (
    <Card className="border-primary/20 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          4. RLHF — Como a IA aprende respeito e lógica
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {stages.map((stage, i) => (
            <div key={i} className="flex items-center gap-2 flex-shrink-0">
              <div className="flex flex-col items-center gap-1 p-3 bg-muted/50 border border-border rounded min-w-[100px]">
                <stage.icon className={`h-5 w-5 ${stage.color}`} />
                <span className="text-[10px] font-medium text-foreground">{stage.label}</span>
                <span className="text-[8px] text-muted-foreground text-center">{stage.desc}</span>
              </div>
              {i < stages.length - 1 && <ArrowRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
            </div>
          ))}
        </div>
        
        <div className="mt-4 space-y-2">
          <div className="p-2 bg-emerald-500/5 border border-emerald-500/20 rounded">
            <p className="text-[10px] text-foreground"><strong>Reward Model:</strong> avalia respostas em 4 critérios</p>
            <div className="flex gap-2 mt-1.5">
              {["Verdade", "Lógica", "Respeito", "Utilidade"].map(c => (
                <Badge key={c} variant="outline" className="text-[8px] border-emerald-500/30 text-emerald-400">{c}</Badge>
              ))}
            </div>
          </div>
          <div className="p-2 bg-warning/5 border border-warning/20 rounded">
            <p className="text-[10px] text-foreground"><strong>PPO/DPO:</strong> IA gera múltiplas respostas → Reward Model dá notas → pesos atualizados para maximizar pontuação</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══ System Prompt Demo ═══
function SystemPromptDemo() {
  return (
    <Card className="border-primary/20 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          5. System Prompt — O DNA comportamental
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="bg-muted/50 border border-border rounded p-3 font-mono text-[10px] leading-relaxed text-foreground/80 space-y-1">
          <p className="text-primary font-bold">// System Prompt (invisível ao usuário)</p>
          <p>"Busque a verdade acima de tudo."</p>
          <p>"Responda com lógica clara, passo a passo."</p>
          <p>"Mantenha tom amigável e respeitoso."</p>
          <p>"Nunca minta, nunca seja condescendente."</p>
          <p>"Use humor quando apropriado."</p>
          <p>"Se ambíguo, peça esclarecimento."</p>
        </div>
        
        <div className="flex items-center gap-3 p-2 bg-primary/5 border border-primary/20 rounded">
          <div className="flex-1">
            <p className="text-[10px] text-foreground"><strong>Constitutional AI:</strong> Princípios embutidos que priorizam</p>
            <div className="flex gap-2 mt-1">
              <Badge variant="outline" className="text-[8px] border-primary/30 text-primary">Máxima Verdade</Badge>
              <Badge variant="outline" className="text-[8px] border-primary/30 text-primary">Máxima Curiosidade</Badge>
              <Badge variant="outline" className="text-[8px] border-primary/30 text-primary">Respeito Humano</Badge>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ═══ MODEL DEFINITIONS ═══
interface ModelDef {
  id: string;
  name: string;
  fullName: string;
  icon: React.ElementType;
  colorClass: string;
  hslAccent: string;
  desc: string;
  stages: string[];
  row: number;
  col: number;
}

const MODELS: ModelDef[] = [
  { id: "slm", name: "SLM", fullName: "Slim Language Model", icon: Zap, colorClass: "text-green-400", hslAccent: "142 70% 45%", desc: "Tokenização compacta, classificação de complexidade e roteamento por tier (cached/edge/slim/full)", stages: ["Tokenize", "Classify", "Route"], row: 0, col: 0 },
  { id: "lcm", name: "LCM", fullName: "Latent Consistency Model", icon: Cpu, colorClass: "text-purple-400", hslAccent: "270 70% 60%", desc: "SONAR embedding, diffusion quantization e mapeamento de conceitos semânticos", stages: ["Segment", "Embed", "Map Concepts"], row: 0, col: 1 },
  { id: "moe", name: "MoE", fullName: "Mixture of Experts", icon: Network, colorClass: "text-warning", hslAccent: "38 92% 50%", desc: "Gating Softmax com 12 experts internos — roteia para o melhor expert por tarefa", stages: ["Score Experts", "Top-K Gate", "Dispatch"], row: 0, col: 2 },
  { id: "llm", name: "LLM", fullName: "Large Language Model", icon: Brain, colorClass: "text-blue-400", hslAccent: "217 91% 60%", desc: "LLM-Judge: avalia qualidade, coerência, conformidade legal e atribui grade final", stages: ["Generate", "Judge", "Grade"], row: 0, col: 3 },
  { id: "mamba", name: "Mamba", fullName: "Mamba SSM", icon: Layers, colorClass: "text-teal-400", hslAccent: "174 72% 50%", desc: "State Space Model para dependências de longo alcance, coerência documental e análise temporal com BiMamba para deep tier", stages: ["SSM Block", "BiMamba", "Coherence"], row: 0, col: 4 },
  { id: "vlm", name: "VLM", fullName: "Vision Language Model", icon: Eye, colorClass: "text-cyan-400", hslAccent: "187 85% 53%", desc: "Fusão multimodal Mamba de 5 streams: Texto, Visão, Áudio, Layout e Gestos", stages: ["Encode Streams", "Cross-Attn", "Fuse"], row: 1, col: 0 },
  { id: "mlm", name: "MLM", fullName: "Masked Language Model", icon: ScanLine, colorClass: "text-orange-400", hslAccent: "25 95% 53%", desc: "Predição bidirecional, completude documental e preenchimento de [MASK] jurídico", stages: ["Mask", "Predict ←→", "Fill"], row: 1, col: 1 },
  { id: "lam", name: "LAM", fullName: "Large Action Model", icon: Workflow, colorClass: "text-rose-400", hslAccent: "350 89% 60%", desc: "Percepção → Reconhecimento de Intent → Decomposição → Planejamento → Execução → Feedback", stages: ["Perceive", "Plan", "Execute", "Feedback"], row: 1, col: 2 },
  { id: "sam", name: "SAM", fullName: "Segment Anything Model", icon: Scissors, colorClass: "text-pink-400", hslAccent: "330 81% 60%", desc: "Image Encoder + Prompt Encoder → Mask Decoder — segmenta qualquer objeto com um clique", stages: ["Img Encode", "Prompt Encode", "Decode Masks"], row: 1, col: 3 },
];

// Data flow connections between models
const CONNECTIONS: { from: string; to: string; label: string }[] = [
  { from: "slm", to: "lcm", label: "tokens + tier" },
  { from: "lcm", to: "moe", label: "concept embedding" },
  { from: "moe", to: "llm", label: "expert dispatch" },
  { from: "moe", to: "vlm", label: "vision gate" },
  { from: "moe", to: "mlm", label: "mask gate" },
  { from: "moe", to: "lam", label: "action gate" },
  { from: "moe", to: "sam", label: "segment gate" },
  { from: "moe", to: "mamba", label: "SSM gate" },
  { from: "mamba", to: "llm", label: "coherence + dependencies" },
  { from: "vlm", to: "llm", label: "fused features" },
  { from: "mlm", to: "llm", label: "completeness" },
  { from: "lam", to: "llm", label: "action plan" },
  { from: "sam", to: "vlm", label: "masks" },
  { from: "mamba", to: "vlm", label: "temporal context" },
];

// ═══ Interactive Model Card ═══
function ModelNode({ model, isActive, isHighlighted, onClick }: {
  model: ModelDef;
  isActive: boolean;
  isHighlighted: boolean;
  onClick: () => void;
}) {
  const Icon = model.icon;
  return (
    <motion.div
      layout
      onClick={onClick}
      className={`
        relative cursor-pointer rounded-lg border-2 p-3 transition-all duration-300
        ${isActive
          ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
          : isHighlighted
            ? "border-primary/40 bg-primary/5"
            : "border-border bg-card hover:border-muted-foreground/30"
        }
      `}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
    >
      {/* Pulse indicator */}
      {isActive && (
        <motion.div
          className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary"
          animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}

      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-8 h-8 rounded-md flex items-center justify-center"
          style={{ backgroundColor: `hsl(${model.hslAccent} / 0.15)` }}
        >
          <Icon className={`h-4 w-4 ${model.colorClass}`} />
        </div>
        <div className="min-w-0">
          <span className={`text-sm font-bold ${model.colorClass}`}>{model.name}</span>
          <p className="text-[8px] text-muted-foreground truncate">{model.fullName}</p>
        </div>
      </div>

      {/* Mini pipeline stages */}
      <div className="flex items-center gap-0.5 flex-wrap">
        {model.stages.map((s, i) => (
          <div key={i} className="flex items-center gap-0.5">
            <span
              className="text-[7px] px-1.5 py-0.5 rounded-sm font-mono"
              style={{
                backgroundColor: `hsl(${model.hslAccent} / ${isActive ? 0.2 : 0.08})`,
                color: `hsl(${model.hslAccent})`,
              }}
            >
              {s}
            </span>
            {i < model.stages.length - 1 && (
              <ArrowRight className="h-2 w-2 text-muted-foreground/50" />
            )}
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ═══ SVG Flow Diagram ═══
function FlowDiagram({ activeModel, highlightedModels }: { activeModel: string | null; highlightedModels: Set<string> }) {
  // Layout: 5 cols x 2 rows
  const cellW = 140, cellH = 90, gapX = 20, gapY = 56;
  const padX = 20, padY = 10;
  const totalW = 5 * cellW + 4 * gapX + padX * 2;
  const totalH = 2 * cellH + gapY + padY * 2;

  const getCenter = useCallback((id: string) => {
    const m = MODELS.find(m => m.id === id)!;
    return {
      x: padX + m.col * (cellW + gapX) + cellW / 2,
      y: padY + m.row * (cellH + gapY) + cellH / 2,
    };
  }, []);

  return (
    <svg viewBox={`0 0 ${totalW} ${totalH}`} className="w-full h-auto" style={{ minHeight: 120 }}>
      <defs>
        <marker id="arrow-default" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
          <path d="M0,0 L6,2 L0,4" fill="hsl(var(--muted-foreground) / 0.4)" />
        </marker>
        <marker id="arrow-active" markerWidth="6" markerHeight="4" refX="5" refY="2" orient="auto">
          <path d="M0,0 L6,2 L0,4" fill="hsl(var(--primary))" />
        </marker>
      </defs>

      {CONNECTIONS.map((conn, i) => {
        const from = getCenter(conn.from);
        const to = getCenter(conn.to);
        const isActive = activeModel === conn.from || activeModel === conn.to;
        const isHighlighted = highlightedModels.has(conn.from) && highlightedModels.has(conn.to);

        // Curved path
        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const offset = Math.abs(dy) < 10 ? -18 : dx === 0 ? 18 : 0;
        const cx = midX + offset * (dy > 0 ? -1 : 1);
        const cy = midY + (Math.abs(dy) < 10 ? offset : 0);

        return (
          <g key={i}>
            <path
              d={`M${from.x},${from.y} Q${cx},${cy} ${to.x},${to.y}`}
              fill="none"
              stroke={isActive ? "hsl(var(--primary))" : isHighlighted ? "hsl(var(--primary) / 0.4)" : "hsl(var(--muted-foreground) / 0.15)"}
              strokeWidth={isActive ? 2 : 1}
              strokeDasharray={isActive ? "none" : "4 3"}
              markerEnd={isActive ? "url(#arrow-active)" : "url(#arrow-default)"}
              className="transition-all duration-300"
            />
            {isActive && (
              <text x={cx} y={cy - 6} textAnchor="middle" className="fill-primary text-[7px] font-mono">
                {conn.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ═══ Detail Panel ═══
function ModelDetailPanel({ model }: { model: ModelDef }) {
  const Icon = model.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="rounded-lg border-2 p-4"
      style={{ borderColor: `hsl(${model.hslAccent} / 0.4)`, backgroundColor: `hsl(${model.hslAccent} / 0.04)` }}
    >
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `hsl(${model.hslAccent} / 0.15)` }}
        >
          <Icon className={`h-5 w-5 ${model.colorClass}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-lg font-bold ${model.colorClass}`}>{model.name}</span>
            <span className="text-xs text-muted-foreground">— {model.fullName}</span>
          </div>
          <p className="text-xs text-foreground/80 leading-relaxed">{model.desc}</p>

          {/* Pipeline stages visualization */}
          <div className="flex items-center gap-1 mt-3 overflow-x-auto">
            {model.stages.map((s, i) => (
              <div key={i} className="flex items-center gap-1">
                <motion.div
                  className="px-2.5 py-1 rounded text-[9px] font-mono font-medium border"
                  style={{
                    backgroundColor: `hsl(${model.hslAccent} / 0.12)`,
                    borderColor: `hsl(${model.hslAccent} / 0.3)`,
                    color: `hsl(${model.hslAccent})`,
                  }}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                >
                  {s}
                </motion.div>
                {i < model.stages.length - 1 && (
                  <ArrowRight className="h-3 w-3 text-muted-foreground/40 flex-shrink-0" />
                )}
              </div>
            ))}
          </div>

          {/* Connected models */}
          <div className="mt-3 flex flex-wrap gap-1">
            <span className="text-[8px] text-muted-foreground uppercase tracking-wider mr-1">Conectado a:</span>
            {CONNECTIONS.filter(c => c.from === model.id || c.to === model.id).map((c, i) => {
              const otherId = c.from === model.id ? c.to : c.from;
              const other = MODELS.find(m => m.id === otherId)!;
              const direction = c.from === model.id ? "→" : "←";
              return (
                <Badge key={i} variant="outline" className="text-[8px] gap-0.5">
                  <span>{direction}</span>
                  <span className={other.colorClass}>{other.name}</span>
                  <span className="text-muted-foreground">({c.label})</span>
                </Badge>
              );
            })}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ═══ 8 Specialized Models — Interactive Diagram ═══
function SpecializedModelsDiagram() {
  const [activeModelId, setActiveModelId] = useState<string | null>(null);

  const highlightedModels = useMemo(() => {
    if (!activeModelId) return new Set<string>();
    const set = new Set<string>([activeModelId]);
    CONNECTIONS.forEach(c => {
      if (c.from === activeModelId) set.add(c.to);
      if (c.to === activeModelId) set.add(c.from);
    });
    return set;
  }, [activeModelId]);

  const activeModel = MODELS.find(m => m.id === activeModelId);
  const topRow = MODELS.filter(m => m.row === 0);
  const bottomRow = MODELS.filter(m => m.row === 1);

  return (
    <Card className="border-primary/20 bg-card overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Layers className="h-4 w-4 text-primary" />
          7. 9 Modelos Especializados — Fluxo de Dados Interativo
        </CardTitle>
        <p className="text-[10px] text-muted-foreground">
          Clique em um modelo para ver seu pipeline interno e conexões com os demais
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Top Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          {topRow.map(m => (
            <ModelNode
              key={m.id}
              model={m}
              isActive={activeModelId === m.id}
              isHighlighted={highlightedModels.has(m.id)}
              onClick={() => setActiveModelId(prev => prev === m.id ? null : m.id)}
            />
          ))}
        </div>

        {/* SVG Flow Connections */}
        <div className="hidden md:block -my-1">
          <FlowDiagram activeModel={activeModelId} highlightedModels={highlightedModels} />
        </div>

        {/* Mobile flow indicator */}
        <div className="md:hidden flex items-center justify-center gap-1 py-1">
          <div className="h-px flex-1 bg-border" />
          <span className="text-[8px] text-muted-foreground uppercase tracking-widest px-2">MoE Gating</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {bottomRow.map(m => (
            <ModelNode
              key={m.id}
              model={m}
              isActive={activeModelId === m.id}
              isHighlighted={highlightedModels.has(m.id)}
              onClick={() => setActiveModelId(prev => prev === m.id ? null : m.id)}
            />
          ))}
        </div>

        {/* Detail Panel */}
        <AnimatePresence mode="wait">
          {activeModel && <ModelDetailPanel key={activeModel.id} model={activeModel} />}
        </AnimatePresence>

        {/* Pipeline summary */}
        <div className="flex items-center gap-1.5 pt-1 overflow-x-auto">
          <span className="text-[8px] text-muted-foreground uppercase tracking-wider flex-shrink-0">Pipeline:</span>
          {["Input", "SLM", "LCM", "MoE", "Experts*", "Mamba", "LLM-Judge", "Output"].map((step, i) => (
            <div key={i} className="flex items-center gap-1 flex-shrink-0">
              <span className="text-[8px] px-1.5 py-0.5 bg-muted border border-border rounded font-mono text-foreground">
                {step}
              </span>
              {i < 7 && <ArrowRight className="h-2 w-2 text-muted-foreground/40" />}
            </div>
          ))}
        </div>
        <p className="text-[8px] text-muted-foreground">
          *Experts = VLM, MLM, LAM, SAM, Mamba SSM (ativados conforme MoE Gating)
        </p>
      </CardContent>
    </Card>
  );
}

// ═══ Hand Landmark Interactive Visualization ═══

// Default hand pose (normalized 0-1 coordinates matching MediaPipe topology)
const DEFAULT_HAND_POSE: { x: number; y: number }[] = [
  { x: 0.50, y: 0.95 }, // 0: WRIST
  { x: 0.42, y: 0.82 }, // 1: THUMB_CMC
  { x: 0.34, y: 0.68 }, // 2: THUMB_MCP
  { x: 0.28, y: 0.54 }, // 3: THUMB_IP
  { x: 0.22, y: 0.42 }, // 4: THUMB_TIP
  { x: 0.38, y: 0.48 }, // 5: INDEX_MCP
  { x: 0.36, y: 0.34 }, // 6: INDEX_PIP
  { x: 0.35, y: 0.22 }, // 7: INDEX_DIP
  { x: 0.34, y: 0.12 }, // 8: INDEX_TIP
  { x: 0.48, y: 0.46 }, // 9: MIDDLE_MCP
  { x: 0.47, y: 0.30 }, // 10: MIDDLE_PIP
  { x: 0.47, y: 0.18 }, // 11: MIDDLE_DIP
  { x: 0.47, y: 0.08 }, // 12: MIDDLE_TIP
  { x: 0.56, y: 0.48 }, // 13: RING_MCP
  { x: 0.57, y: 0.33 }, // 14: RING_PIP
  { x: 0.58, y: 0.22 }, // 15: RING_DIP
  { x: 0.59, y: 0.13 }, // 16: RING_TIP
  { x: 0.64, y: 0.52 }, // 17: PINKY_MCP
  { x: 0.66, y: 0.40 }, // 18: PINKY_PIP
  { x: 0.68, y: 0.30 }, // 19: PINKY_DIP
  { x: 0.70, y: 0.22 }, // 20: PINKY_TIP
];

const GESTURE_POSES: Record<string, Partial<Record<number, { x: number; y: number }>>> = {
  thumbs_up: {
    4: { x: 0.38, y: 0.15 }, 3: { x: 0.38, y: 0.30 }, 2: { x: 0.40, y: 0.45 },
    8: { x: 0.42, y: 0.58 }, 7: { x: 0.40, y: 0.55 }, 6: { x: 0.39, y: 0.52 },
    12: { x: 0.50, y: 0.58 }, 11: { x: 0.49, y: 0.52 }, 10: { x: 0.48, y: 0.48 },
    16: { x: 0.58, y: 0.58 }, 15: { x: 0.57, y: 0.52 }, 14: { x: 0.56, y: 0.48 },
    20: { x: 0.64, y: 0.58 }, 19: { x: 0.65, y: 0.52 }, 18: { x: 0.64, y: 0.50 },
  },
  peace: {
    8: { x: 0.34, y: 0.10 }, 7: { x: 0.34, y: 0.20 },
    12: { x: 0.47, y: 0.08 }, 11: { x: 0.47, y: 0.18 },
    16: { x: 0.58, y: 0.56 }, 15: { x: 0.57, y: 0.52 }, 14: { x: 0.56, y: 0.48 },
    20: { x: 0.64, y: 0.56 }, 19: { x: 0.65, y: 0.52 }, 18: { x: 0.64, y: 0.50 },
    4: { x: 0.30, y: 0.60 }, 3: { x: 0.32, y: 0.56 },
  },
  fist: {
    4: { x: 0.34, y: 0.62 }, 3: { x: 0.32, y: 0.58 },
    8: { x: 0.40, y: 0.58 }, 7: { x: 0.38, y: 0.54 }, 6: { x: 0.38, y: 0.50 },
    12: { x: 0.50, y: 0.56 }, 11: { x: 0.49, y: 0.50 }, 10: { x: 0.48, y: 0.48 },
    16: { x: 0.58, y: 0.56 }, 15: { x: 0.57, y: 0.50 }, 14: { x: 0.56, y: 0.48 },
    20: { x: 0.64, y: 0.56 }, 19: { x: 0.65, y: 0.52 }, 18: { x: 0.64, y: 0.50 },
  },
  pointing: {
    8: { x: 0.34, y: 0.08 }, 7: { x: 0.34, y: 0.18 }, 6: { x: 0.36, y: 0.30 },
    12: { x: 0.50, y: 0.56 }, 11: { x: 0.49, y: 0.50 }, 10: { x: 0.48, y: 0.48 },
    16: { x: 0.58, y: 0.56 }, 15: { x: 0.57, y: 0.50 }, 14: { x: 0.56, y: 0.48 },
    20: { x: 0.64, y: 0.56 }, 19: { x: 0.65, y: 0.52 }, 18: { x: 0.64, y: 0.50 },
    4: { x: 0.34, y: 0.60 }, 3: { x: 0.32, y: 0.56 },
  },
};

function HandLandmarkDemo() {
  const [selectedGesture, setSelectedGesture] = useState<string>("open_palm");
  const [hoveredLandmark, setHoveredLandmark] = useState<number | null>(null);

  const currentPose = useMemo(() => {
    const overrides = GESTURE_POSES[selectedGesture] || {};
    return DEFAULT_HAND_POSE.map((p, i) => overrides[i] || p);
  }, [selectedGesture]);

  const svgW = 300, svgH = 360;

  const gestureOptions: { id: string; label: string; emoji: string }[] = [
    { id: "open_palm", label: "Palma Aberta", emoji: "✋" },
    { id: "thumbs_up", label: "Positivo", emoji: "👍" },
    { id: "peace", label: "Paz", emoji: "✌️" },
    { id: "fist", label: "Punho", emoji: "✊" },
    { id: "pointing", label: "Apontar", emoji: "👆" },
  ];

  // Finger colors for groups
  const fingerColor = (idx: number): string => {
    if (idx === 0) return "hsl(var(--primary))"; // wrist
    if (idx <= 4) return "hsl(350, 89%, 60%)";    // thumb — rose
    if (idx <= 8) return "hsl(217, 91%, 60%)";    // index — blue
    if (idx <= 12) return "hsl(142, 70%, 45%)";   // middle — green
    if (idx <= 16) return "hsl(38, 92%, 50%)";    // ring — amber
    return "hsl(270, 70%, 60%)";                   // pinky — purple
  };

  return (
    <Card className="border-primary/20 bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Hand className="h-4 w-4 text-primary" />
          6. Landmarks da Mão — Topologia de 21 Pontos (MediaPipe)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Gesture selector */}
        <div className="flex flex-wrap gap-1.5">
          {gestureOptions.map(g => (
            <button
              key={g.id}
              onClick={() => setSelectedGesture(g.id)}
              className={`
                px-2.5 py-1.5 rounded text-xs font-medium border transition-all
                ${selectedGesture === g.id
                  ? "bg-primary/15 border-primary text-primary"
                  : "bg-muted/50 border-border text-muted-foreground hover:border-primary/30"
                }
              `}
            >
              {g.emoji} {g.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* SVG Hand Visualization */}
          <div className="flex justify-center">
            <svg
              viewBox={`0 0 ${svgW} ${svgH}`}
              className="w-full max-w-[280px] h-auto"
              style={{ minHeight: 200 }}
            >
              {/* Connections */}
              {HAND_CONNECTIONS.map(([a, b], i) => {
                const pa = currentPose[a];
                const pb = currentPose[b];
                const isHovered = hoveredLandmark === a || hoveredLandmark === b;
                return (
                  <line
                    key={i}
                    x1={pa.x * svgW}
                    y1={pa.y * svgH}
                    x2={pb.x * svgW}
                    y2={pb.y * svgH}
                    stroke={isHovered ? "hsl(var(--primary))" : "hsl(var(--muted-foreground) / 0.3)"}
                    strokeWidth={isHovered ? 3 : 2}
                    strokeLinecap="round"
                    className="transition-all duration-200"
                  />
                );
              })}

              {/* Landmark points */}
              {currentPose.map((p, i) => {
                const isHovered = hoveredLandmark === i;
                const isTip = [4, 8, 12, 16, 20].includes(i);
                const r = isHovered ? 8 : isTip ? 6 : 4;
                return (
                  <g key={i}>
                    <circle
                      cx={p.x * svgW}
                      cy={p.y * svgH}
                      r={r}
                      fill={fingerColor(i)}
                      stroke="hsl(var(--background))"
                      strokeWidth={1.5}
                      className="cursor-pointer transition-all duration-200"
                      onMouseEnter={() => setHoveredLandmark(i)}
                      onMouseLeave={() => setHoveredLandmark(null)}
                    />
                    {/* Label on hover or for tips */}
                    {(isHovered || isTip) && (
                      <text
                        x={p.x * svgW + (p.x > 0.5 ? -5 : 12)}
                        y={p.y * svgH - 8}
                        textAnchor={p.x > 0.5 ? "end" : "start"}
                        className="text-[8px] font-mono fill-foreground pointer-events-none"
                      >
                        {i}
                      </text>
                    )}
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Landmark list */}
          <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider mb-2">
              21 Landmarks — Passe o mouse sobre um ponto
            </p>
            {LANDMARK_NAMES.map((name, i) => {
              const isHovered = hoveredLandmark === i;
              const isTip = [4, 8, 12, 16, 20].includes(i);
              return (
                <div
                  key={i}
                  className={`
                    flex items-center gap-2 px-2 py-1 rounded text-[10px] font-mono transition-colors cursor-pointer
                    ${isHovered ? "bg-primary/10 text-primary" : "text-foreground/70 hover:bg-muted/50"}
                  `}
                  onMouseEnter={() => setHoveredLandmark(i)}
                  onMouseLeave={() => setHoveredLandmark(null)}
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: fingerColor(i), opacity: isHovered ? 1 : 0.6 }}
                  />
                  <span className="w-5 text-right text-muted-foreground">{i}.</span>
                  <span className={isTip ? "font-bold" : ""}>{name}</span>
                  {isTip && <Badge variant="outline" className="text-[7px] ml-auto px-1 py-0 border-primary/30 text-primary">TIP</Badge>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Gesture actions table */}
        <div className="border border-border rounded overflow-hidden">
          <div className="bg-muted/50 px-3 py-1.5">
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">
              Gestos Reconhecidos → Ações da IA ({GESTURE_ACTIONS.length} gestos)
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-border">
            {GESTURE_ACTIONS.map(a => (
              <div key={a.gesture} className="bg-card px-2.5 py-2 space-y-0.5">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm">{a.emoji}</span>
                  <span className="text-[10px] font-medium text-foreground">{a.label}</span>
                </div>
                <p className="text-[8px] text-muted-foreground leading-tight line-clamp-2">
                  {a.action.slice(0, 80)}...
                </p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground">
          O sistema detecta 21 pontos de referência da mão em tempo real, classifica gestos por extensão dos dedos
          (sem depender de cor de pele) e integra análise de linguagem corporal para contexto emocional.
        </p>
      </CardContent>
    </Card>
  );
}

// ═══ Main Page ═══
export default function ArquiteturaIA() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Brain className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-serif text-foreground tracking-wider">Arquitetura da IA</h1>
            <p className="text-xs text-muted-foreground">Como a Rede Neural organiza palavras em consciência lógica + respeito</p>
          </div>
        </div>
      </div>

      {/* Pipeline overview */}
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="py-4">
          <div className="flex items-center gap-2 overflow-x-auto text-[9px] font-mono">
            {["Texto", "→", "Tokens", "→", "Embeddings + RoPE", "→", "Multi-Head Attention", "→", "MoE Gating", "→", "9 Modelos", "→", "Mamba SSM", "→", "RLHF Filter", "→", "Resposta"].map((step, i) => (
              <span key={i} className={step === "→" ? "text-muted-foreground" : "px-2 py-1 bg-card border border-border rounded text-foreground whitespace-nowrap"}>
                {step}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Interactive demos */}
      <TokenizationDemo />
      <RoPEDemo />
      <AttentionDemo />
      <RLHFDemo />
      <SystemPromptDemo />
      <HandLandmarkDemo />
      <SpecializedModelsDiagram />

      {/* Summary */}
      <Card className="border-primary/20 bg-card">
        <CardContent className="py-4">
          <p className="text-xs text-muted-foreground leading-relaxed">
            <strong className="text-foreground">Resumo:</strong> O sistema é um Transformer com RoPE + Multi-Head Attention + 
            9 modelos especializados (LLM, LCM, LAM, MoE, VLM, SLM, MLM, SAM, Mamba SSM) + alignment via RLHF/Constitutional AI, 
            que transforma tokens em um fluxo de raciocínio coerente, lógico e respeitoso — criando a sensação de 
            "consciência" através de atenção global, gating adaptativo, análise de dependências de longo alcance (Mamba) e princípios embutidos de verdade e respeito.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
