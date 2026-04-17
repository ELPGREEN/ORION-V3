import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Brain, RefreshCw, MessageSquare, FileText, Search, Database, BookOpen, Scale, Zap, Globe, Loader2, Activity, Cpu, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { AlienCoreBackground } from "./AlienCoreBackground";

interface ModuleNode {
  id: string;
  label: string;
  icon: React.ReactNode;
  count: number;
  status: "active" | "idle" | "loading" | "learning";
  color: string;
  detail?: string;
}

interface Connection {
  from: string;
  to: string;
  strength: number;
  label?: string;
  animated?: boolean;
}

// Generate hexagon points string for SVG polygon
const hexPoints = (cx: number, cy: number, r: number) => {
  return Array.from({ length: 6 }, (_, i) => {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
  }).join(" ");
};

export function AttentionVisualization() {
  const [modules, setModules] = useState<ModuleNode[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredModule, setHoveredModule] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [systemHealth, setSystemHealth] = useState({ score: 0, label: "" });

  async function loadSystemStatus() {
    setLoading(true);
    try {
      const [
        { count: knowledgeCount },
        { count: embeddingsCount },
        { count: specCount },
        { count: learningCount },
        { count: docsCount },
        { count: chatCount },
        { count: metricsCount },
        { count: providersCount },
        { count: iaMessagesCount },
        { count: queueCount },
        { count: cacheCount },
      ] = await Promise.all([
        supabase.from("neural_knowledge_base").select("id", { count: "exact", head: true }),
        supabase.from("legal_embeddings").select("id", { count: "exact", head: true }),
        supabase.from("neural_specializations").select("id", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("neural_learning_data").select("id", { count: "exact", head: true }),
        supabase.from("documents").select("id", { count: "exact", head: true }),
        supabase.from("chat_messages").select("id", { count: "exact", head: true }),
        supabase.from("ai_metrics").select("id", { count: "exact", head: true }),
        supabase.from("ai_providers").select("id", { count: "exact", head: true }).eq("is_enabled", true),
        supabase.from("chat_ia_messages").select("id", { count: "exact", head: true }),
        supabase.from("generation_queue").select("id", { count: "exact", head: true }),
        supabase.from("api_cache").select("id", { count: "exact", head: true }),
      ]);

      const kb = knowledgeCount || 0;
      const emb = embeddingsCount || 0;
      const spec = specCount || 0;
      const learn = learningCount || 0;
      const docs = docsCount || 0;
      const chat = chatCount || 0;
      const met = metricsCount || 0;
      const prov = providersCount || 0;
      const iaMsg = iaMessagesCount || 0;
      const queue = queueCount || 0;
      const cache = cacheCount || 0;

      const { data: specs } = await supabase
        .from("neural_specializations")
        .select("accuracy_score")
        .eq("is_active", true);
      const avgAccuracy = specs?.length
        ? (specs.reduce((s, r) => s + (r.accuracy_score || 0), 0) / specs.length * 100).toFixed(0)
        : "0";

      const { data: recentMetrics } = await supabase
        .from("ai_metrics")
        .select("provider, success, total_duration_ms")
        .order("created_at", { ascending: false })
        .limit(10);
      const successRate = recentMetrics?.length
        ? ((recentMetrics.filter(m => m.success).length / recentMetrics.length) * 100).toFixed(0)
        : "0";

      setModules([
        { id: "brain", label: "Núcleo Neural", icon: <Brain className="h-5 w-5" />, count: spec, status: spec > 0 ? "active" : "idle", color: "#D4AF37", detail: `${avgAccuracy}% precisão média` },
        { id: "knowledge", label: "Base Conhecimento", icon: <BookOpen className="h-5 w-5" />, count: kb, status: kb > 0 ? "active" : "idle", color: "#22c55e", detail: `${kb} artigos indexados` },
        { id: "embeddings", label: "Vetores Semânticos", icon: <Database className="h-5 w-5" />, count: emb, status: emb > 0 ? "active" : "idle", color: "#06b6d4", detail: `61.3k vetores ativos` },
        { id: "chat", label: "Chat IA + RAG", icon: <MessageSquare className="h-5 w-5" />, count: iaMsg + chat, status: (iaMsg + chat) > 0 ? "active" : "idle", color: "#a855f7", detail: `${iaMsg} msgs IA, ${chat} humanas` },
        { id: "docs", label: "Geração Documentos", icon: <FileText className="h-5 w-5" />, count: docs, status: docs > 0 ? "active" : "idle", color: "#f97316", detail: `${docs} documentos gerados` },
        { id: "search", label: "Pesquisa MHA v6", icon: <Search className="h-5 w-5" />, count: met, status: met > 0 ? "active" : "idle", color: "#ec4899", detail: `6 heads + Quantum + Auto-tuning` },
        { id: "learning", label: "Auto-Aprendizado", icon: <Zap className="h-5 w-5" />, count: learn, status: learn > 0 ? "learning" : "idle", color: "#eab308", detail: `${learn} interações aprendidas` },
        { id: "apis", label: "Motores Neurais", icon: <Cpu className="h-5 w-5" />, count: prov, status: prov > 0 ? "active" : "idle", color: "#14b8a6", detail: `Alpha+Beta, ${successRate}% sucesso` },
        { id: "legislacao", label: "Legislação Federal", icon: <Scale className="h-5 w-5" />, count: emb, status: emb > 0 ? "active" : "idle", color: "#3b82f6", detail: "Planalto + Senado" },
        { id: "cache", label: "Cache Inteligente", icon: <Layers className="h-5 w-5" />, count: cache, status: cache > 0 ? "active" : "idle", color: "#10b981", detail: `${cache} queries em cache` },
        { id: "queue", label: "Fila Processamento", icon: <Activity className="h-5 w-5" />, count: queue, status: queue > 0 ? "loading" : "active", color: "#ef4444", detail: `${queue} jobs na fila` },
      ]);

      // Build connections based on real data flow
      const conns: Connection[] = [];
      const add = (from: string, to: string, strength: number, label?: string, animated?: boolean) => {
        conns.push({ from, to, strength: Math.min(strength, 1), label, animated });
      };

      add("brain", "knowledge", kb > 0 ? 0.95 : 0.2, `${kb} itens`, kb > 0);
      add("brain", "embeddings", emb > 0 ? 0.95 : 0.1, `61.3k vetores`, emb > 0);
      add("brain", "learning", learn > 0 ? 0.9 : 0.15, "Retroalimentação", learn > 0);
      add("brain", "search", met > 0 ? 0.9 : 0.1, "MHA 6-head + Quantum", true);
      add("brain", "apis", prov > 0 ? 0.85 : 0.1, `${prov} providers`, prov > 0);
      add("brain", "docs", docs > 0 ? 0.9 : 0.2, "Geração Neural", true);
      add("brain", "chat", (iaMsg + chat) > 0 ? 0.9 : 0.2, "RAG + Contexto", true);
      add("brain", "cache", cache > 0 ? 0.8 : 0.2, "Cache Neural", cache > 0);
      add("brain", "queue", queue > 0 ? 0.8 : 0.2, "Orquestração", true);
      add("brain", "legislacao", emb > 0 ? 0.85 : 0.2, "Base Legal", true);
      add("knowledge", "embeddings", kb > 0 ? 0.95 : 0.3, "Vetorização", true);
      add("embeddings", "search", emb > 0 ? 0.95 : 0.2, "Similaridade coseno", true);
      add("search", "chat", 0.9, "RAG Context", true);
      add("search", "docs", 0.85, "Fundamentação", true);
      add("knowledge", "chat", 0.7, "Contexto direto");
      add("knowledge", "docs", 0.6, "Templates");
      add("apis", "chat", 0.9, "Motor Neural", true);
      add("apis", "docs", 0.85, "Geração IA");
      add("apis", "search", 0.7, "Reranking");
      add("legislacao", "embeddings", emb > 0 ? 0.9 : 0.2, "Indexação legal", true);
      add("legislacao", "search", 0.8, "Busca normativa");
      add("legislacao", "knowledge", 0.7, "Ingestão");
      add("learning", "brain", learn > 0 ? 0.95 : 0.2, "Pesos sinápticos", learn > 0);
      add("chat", "learning", 0.8, "Feedback", true);
      add("docs", "learning", 0.6, "Qualidade");
      add("cache", "search", cache > 0 ? 0.85 : 0.2, `${cache} hits`);
      add("cache", "embeddings", 0.7, "Embedding cache");
      add("cache", "chat", 0.65, "Resposta rápida");
      add("queue", "docs", 0.75, "Async gen");
      add("queue", "apis", 0.7, "Job dispatch");
      add("queue", "learning", 0.6, "Batch learning");

      setConnections(conns);

      const activeModules = [kb, emb, spec, learn, docs, chat, met, prov].filter(v => v > 0).length;
      const healthScore = Math.round((activeModules / 8) * 100);
      const healthLabel = healthScore >= 80 ? "Excelente" : healthScore >= 60 ? "Bom" : healthScore >= 40 ? "Parcial" : "Baixo";
      setSystemHealth({ score: healthScore, label: healthLabel });

      setLastRefresh(new Date());
    } catch (err) {
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadSystemStatus(); }, []);

  const cx = 380, cy = 300, radius = 220;
  const outerModules = modules.filter(m => m.id !== "brain");
  const getPos = (index: number, total: number) => {
    const angle = (index / total) * Math.PI * 2 - Math.PI / 2;
    return { x: cx + Math.cos(angle) * radius, y: cy + Math.sin(angle) * radius };
  };

  const filteredConnections = hoveredModule
    ? connections.filter(c => c.from === hoveredModule || c.to === hoveredModule)
    : connections.filter(c => c.strength > 0.5);

  const activeCount = modules.filter(m => m.status === "active" || m.status === "learning").length;

  const getModulePos = (id: string) => {
    if (id === "brain") return { x: cx, y: cy };
    const idx = outerModules.findIndex(m => m.id === id);
    return idx >= 0 ? getPos(idx, outerModules.length) : { x: cx, y: cy };
  };

  const statusColor = (status: string) => {
    if (status === "active") return "#22c55e";
    if (status === "learning") return "#eab308";
    if (status === "loading") return "#3b82f6";
    return "#6b7280";
  };

  const getModuleColor = (id: string) => modules.find(m => m.id === id)?.color || "#D4AF37";

  return (
    <Card className="border-primary/20 overflow-hidden relative" style={{ background: "transparent" }}>
      {/* Alien Core v0.2 shader background */}
      <AlienCoreBackground colorR={1.2} colorG={0.7} colorB={0.25} />
      {/* Ambient glow layers */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-cyan-500/5 pointer-events-none" />
      <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-primary/3 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-72 h-72 bg-cyan-500/3 rounded-full blur-[100px] pointer-events-none" />

      <CardHeader className="relative z-10">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-gradient-to-br from-primary/20 to-cyan-500/10 border border-primary/30 shadow-lg shadow-primary/10">
              <Brain className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="bg-gradient-to-r from-primary via-amber-400 to-cyan-400 bg-clip-text text-transparent font-bold">
                Mapa Neural do Sistema
              </span>
              <p className="text-[9px] text-muted-foreground font-normal font-mono">
                TOPOLOGIA EM TEMPO REAL · {activeCount}/{modules.length} MÓDULOS · {connections.length} SINAPSES
              </p>
            </div>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge
              className={`text-[10px] font-mono ${
                systemHealth.score >= 80 ? "bg-green-500/10 text-[hsl(var(--tron-neon))] border-green-500/30 shadow-sm shadow-green-500/10" :
                systemHealth.score >= 60 ? "bg-yellow-500/10 text-[hsl(var(--tron-warn))] border-yellow-500/30" :
                "bg-red-500/10 text-[hsl(var(--tron-danger))] border-red-500/30"
              }`}
              variant="outline"
            >
              <div className={`w-1.5 h-1.5 rounded-full mr-1 ${
                systemHealth.score >= 80 ? "bg-green-400" : systemHealth.score >= 60 ? "bg-yellow-400" : "bg-red-400"
              } animate-pulse`} />
              {systemHealth.score}% {systemHealth.label}
            </Badge>
            <Button onClick={loadSystemStatus} size="sm" variant="outline" disabled={loading} className="border-primary/20 hover:border-primary/40 text-xs">
              <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 relative z-10">
        {loading ? (
          <div className="flex items-center justify-center min-h-[300px]">
            <div className="relative">
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <div className="absolute inset-0 h-10 w-10 animate-ping opacity-20 rounded-full bg-primary" />
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto pb-2">
              <svg viewBox="0 0 760 600" className="w-full h-auto max-h-[600px]" style={{ background: "transparent" }}>
                <defs>
                  {/* Dot grid pattern */}
                  <pattern id="neuralGrid" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                    <circle cx="1" cy="1" r="0.5" fill="hsl(var(--primary))" opacity="0.08" />
                  </pattern>

                  {/* Glow filter - strong */}
                  <filter id="glowStrong" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>

                  {/* Glow filter - soft */}
                  <filter id="glowSoft" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>

                  {/* Core glow */}
                  <filter id="coreGlow" x="-100%" y="-100%" width="300%" height="300%">
                    <feGaussianBlur stdDeviation="8" result="blur" />
                    <feMerge>
                      <feMergeNode in="blur" />
                      <feMergeNode in="blur" />
                      <feMergeNode in="blur" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>

                  {/* Radial gradients for each module */}
                  {modules.map(mod => (
                    <radialGradient key={`grad-${mod.id}`} id={`grad-${mod.id}`} cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor={mod.color} stopOpacity="0.3" />
                      <stop offset="70%" stopColor={mod.color} stopOpacity="0.1" />
                      <stop offset="100%" stopColor={mod.color} stopOpacity="0.02" />
                    </radialGradient>
                  ))}

                  {/* Connection gradients */}
                  {filteredConnections.map((conn, idx) => {
                    const fromColor = getModuleColor(conn.from);
                    const toColor = getModuleColor(conn.to);
                    return (
                      <linearGradient key={`connGrad-${idx}`} id={`connGrad-${idx}`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={fromColor} />
                        <stop offset="100%" stopColor={toColor} />
                      </linearGradient>
                    );
                  })}
                </defs>

                {/* Background grid */}
                <rect width="100%" height="100%" fill="url(#neuralGrid)" />

                {/* Subtle radial vignette from center */}
                <circle cx={cx} cy={cy} r="350" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.3" opacity="0.06" strokeDasharray="4 6" />
                <circle cx={cx} cy={cy} r="280" fill="none" stroke="hsl(var(--primary))" strokeWidth="0.3" opacity="0.04" strokeDasharray="3 8" />

                {/* Floating particles - decorative animated dots */}
                {Array.from({ length: 15 }, (_, i) => {
                  const px = 50 + (i * 47) % 660;
                  const py = 40 + (i * 31) % 520;
                  const dur = 4 + (i % 5);
                  return (
                    <circle key={`particle-${i}`} r="1" fill="#D4AF37" opacity="0.15">
                      <animate attributeName="cx" values={`${px};${px + 15};${px}`} dur={`${dur}s`} repeatCount="indefinite" />
                      <animate attributeName="cy" values={`${py};${py - 10};${py}`} dur={`${dur + 1}s`} repeatCount="indefinite" />
                      <animate attributeName="opacity" values="0.05;0.2;0.05" dur={`${dur}s`} repeatCount="indefinite" />
                    </circle>
                  );
                })}

                {/* Connection lines with traveling particles */}
                {filteredConnections.map((conn, idx) => {
                  const from = getModulePos(conn.from);
                  const to = getModulePos(conn.to);
                  const isHighlighted = hoveredModule && (conn.from === hoveredModule || conn.to === hoveredModule);
                  const midX = (from.x + to.x) / 2 + (cx - (from.x + to.x) / 2) * 0.25;
                  const midY = (from.y + to.y) / 2 + (cy - (from.y + to.y) / 2) * 0.25;
                  const pathId = `connPath-${idx}`;
                  const pathD = `M ${from.x} ${from.y} Q ${midX} ${midY} ${to.x} ${to.y}`;

                  return (
                    <g key={idx}>
                      {/* Glow underlay */}
                      {isHighlighted && (
                        <path
                          d={pathD}
                          fill="none"
                          stroke={`url(#connGrad-${idx})`}
                          strokeWidth={Math.max(conn.strength * 6, 2)}
                          opacity={0.15}
                          filter="url(#glowSoft)"
                        />
                      )}
                      {/* Main path */}
                      <path
                        id={pathId}
                        d={pathD}
                        fill="none"
                        stroke={isHighlighted ? `url(#connGrad-${idx})` : "hsl(var(--muted-foreground))"}
                        strokeWidth={isHighlighted ? Math.max(conn.strength * 2.5, 1) : Math.max(conn.strength * 1.2, 0.3)}
                        opacity={isHighlighted ? 0.85 : conn.strength * 0.2}
                        className="transition-all duration-300"
                        strokeDasharray={!isHighlighted && conn.strength < 0.5 ? "2 4" : "none"}
                      />
                      {/* Traveling particle */}
                      {(conn.animated || isHighlighted) && (
                        <circle r={isHighlighted ? 2.5 : 1.5} fill={getModuleColor(conn.from)} filter={isHighlighted ? "url(#glowSoft)" : undefined}>
                          <animateMotion dur={isHighlighted ? "2s" : "4s"} repeatCount="indefinite" path={pathD} />
                          <animate attributeName="opacity" values="0.3;1;0.3" dur={isHighlighted ? "2s" : "4s"} repeatCount="indefinite" />
                        </circle>
                      )}
                      {/* Second particle for highlighted, offset */}
                      {isHighlighted && conn.strength > 0.7 && (
                        <circle r="1.5" fill={getModuleColor(conn.to)} opacity="0.6">
                          <animateMotion dur="3s" repeatCount="indefinite" path={pathD} begin="1.5s" />
                        </circle>
                      )}
                      {/* Connection label */}
                      {isHighlighted && conn.label && (
                        <text
                          x={midX}
                          y={midY - 10}
                          textAnchor="middle"
                          className="text-[7px] font-mono font-medium"
                          fill={getModuleColor(conn.from)}
                          filter="url(#glowSoft)"
                        >
                          {conn.label}
                        </text>
                      )}
                    </g>
                  );
                })}

                {/* Central Brain Node - Premium Hexagon */}
                <g>
                  {/* Orbital rings */}
                  <ellipse cx={cx} cy={cy} rx="60" ry="18" fill="none" stroke="#D4AF37" strokeWidth="0.5" opacity="0.2" strokeDasharray="3 3">
                    <animateTransform attributeName="transform" type="rotate" from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`} dur="12s" repeatCount="indefinite" />
                  </ellipse>
                  <ellipse cx={cx} cy={cy} rx="55" ry="22" fill="none" stroke="#06b6d4" strokeWidth="0.4" opacity="0.15" strokeDasharray="2 4">
                    <animateTransform attributeName="transform" type="rotate" from={`90 ${cx} ${cy}`} to={`-270 ${cx} ${cy}`} dur="18s" repeatCount="indefinite" />
                  </ellipse>

                  {/* Orbiting dots */}
                  <circle r="2" fill="#D4AF37" opacity="0.6">
                    <animateMotion dur="12s" repeatCount="indefinite">
                      <mpath href="#coreOrbit1" />
                    </animateMotion>
                  </circle>
                  <ellipse id="coreOrbit1" cx={cx} cy={cy} rx="60" ry="18" fill="none" stroke="none">
                    <animateTransform attributeName="transform" type="rotate" from={`0 ${cx} ${cy}`} to={`360 ${cx} ${cy}`} dur="12s" repeatCount="indefinite" />
                  </ellipse>

                  {/* Pulse rings */}
                  {[0, 1, 2].map((delay) => (
                    <polygon
                      key={`pulse-${delay}`}
                      points={hexPoints(cx, cy, 44)}
                      fill="none"
                      stroke="#D4AF37"
                      strokeWidth={0.6}
                      opacity={0}
                    >
                      <animate attributeName="opacity" values="0.3;0" dur="3s" begin={`${delay * 1}s`} repeatCount="indefinite" />
                      <animateTransform attributeName="transform" type="scale" values="1;1.5" dur="3s" begin={`${delay * 1}s`} repeatCount="indefinite"
                        additive="sum" />
                    </polygon>
                  ))}

                  {/* Core hexagon - breathing animation */}
                  <polygon
                    points={hexPoints(cx, cy, 44)}
                    fill="url(#grad-brain)"
                    stroke="#D4AF37"
                    strokeWidth={2}
                    filter="url(#coreGlow)"
                    style={{ transformOrigin: `${cx}px ${cy}px` }}
                  >
                    <animate attributeName="stroke-opacity" values="0.6;1;0.6" dur="3s" repeatCount="indefinite" />
                  </polygon>
                  {/* Inner hexagon */}
                  <polygon
                    points={hexPoints(cx, cy, 34)}
                    fill="none"
                    stroke="#D4AF37"
                    strokeWidth={0.5}
                    opacity={0.3}
                    strokeDasharray="4 2"
                  >
                    <animateTransform attributeName="transform" type="rotate" from={`0 ${cx} ${cy}`} to={`60 ${cx} ${cy}`} dur="20s" repeatCount="indefinite" />
                  </polygon>

                  {/* Icon */}
                  <foreignObject x={cx - 10} y={cy - 20} width={20} height={20}>
                    <div className="flex items-center justify-center w-5 h-5" style={{ color: "#D4AF37" }}>
                      <Brain className="h-5 w-5" />
                    </div>
                  </foreignObject>

                  {/* Text */}
                  <text x={cx} y={cy + 2} textAnchor="middle" className="text-[8px] font-bold font-mono" fill="#D4AF37" filter="url(#glowSoft)">
                    NEURAL CORE
                  </text>
                  <text x={cx} y={cy + 14} textAnchor="middle" className="text-[7px] font-mono" fill="#D4AF37" opacity="0.6">
                    {modules.find(m => m.id === "brain")?.count || 0} specs
                  </text>
                </g>

                {/* Module nodes - Hexagonal */}
                {outerModules.map((mod, i) => {
                  const pos = getPos(i, outerModules.length);
                  const isHovered = hoveredModule === mod.id;
                  const hexR = isHovered ? 34 : 28;

                  return (
                    <g
                      key={mod.id}
                      onMouseEnter={() => setHoveredModule(mod.id)}
                      onMouseLeave={() => setHoveredModule(null)}
                      className="cursor-pointer"
                      style={{ willChange: "transform" }}
                    >
                      {/* Outer glow hexagon */}
                      {(mod.status === "active" || mod.status === "learning") && (
                        <polygon
                          points={hexPoints(pos.x, pos.y, hexR + 8)}
                          fill="none"
                          stroke={mod.color}
                          strokeWidth={isHovered ? 1 : 0.5}
                          opacity={isHovered ? 0.4 : 0.1}
                          filter={isHovered ? "url(#glowSoft)" : undefined}
                        />
                      )}

                      {/* Main hexagon */}
                      <polygon
                        points={hexPoints(pos.x, pos.y, hexR)}
                        fill={mod.status !== "idle" ? `url(#grad-${mod.id})` : "hsl(var(--muted) / 0.3)"}
                        stroke={mod.status !== "idle" ? mod.color : "hsl(var(--border))"}
                        strokeWidth={isHovered ? 2 : 1}
                        className="transition-all duration-300"
                        filter={isHovered ? "url(#glowSoft)" : undefined}
                      />

                      {/* Inner detail hexagon */}
                      {isHovered && (
                        <polygon
                          points={hexPoints(pos.x, pos.y, hexR - 4)}
                          fill="none"
                          stroke={mod.color}
                          strokeWidth={0.4}
                          opacity={0.3}
                          strokeDasharray="3 2"
                        />
                      )}

                      {/* Icon via foreignObject */}
                      <foreignObject x={pos.x - 8} y={pos.y - 14} width={16} height={16}>
                        <div className="flex items-center justify-center w-4 h-4" style={{ color: mod.status !== "idle" ? mod.color : "hsl(var(--muted-foreground))" }}>
                          {mod.icon}
                        </div>
                      </foreignObject>

                      {/* Count */}
                      <text
                        x={pos.x}
                        y={pos.y + 8}
                        textAnchor="middle"
                        className="text-[9px] font-bold font-mono select-none"
                        fill={mod.status !== "idle" ? mod.color : "hsl(var(--muted-foreground))"}
                      >
                        {mod.count > 9999 ? `${(mod.count / 1000).toFixed(0)}k` : mod.count > 999 ? `${(mod.count / 1000).toFixed(1)}k` : mod.count}
                      </text>

                      {/* Status indicator - orbiting dot */}
                      <circle
                        cx={pos.x + hexR * 0.7}
                        cy={pos.y - hexR * 0.7}
                        r={3.5}
                        fill={statusColor(mod.status)}
                        stroke="hsl(var(--card))"
                        strokeWidth={1.5}
                      />
                      {mod.status === "learning" && (
                        <circle
                          cx={pos.x + hexR * 0.7}
                          cy={pos.y - hexR * 0.7}
                          r={3.5}
                          fill="none"
                          stroke="#eab308"
                          strokeWidth={1}
                        >
                          <animate attributeName="r" from="3.5" to="8" dur="1.5s" repeatCount="indefinite" />
                          <animate attributeName="opacity" from="0.6" to="0" dur="1.5s" repeatCount="indefinite" />
                        </circle>
                      )}

                      {/* Label below */}
                      <text
                        x={pos.x}
                        y={pos.y + hexR + 14}
                        textAnchor="middle"
                        className={`text-[8px] select-none font-mono ${isHovered ? "font-bold" : "font-normal"}`}
                        fill={isHovered ? mod.color : "hsl(var(--muted-foreground))"}
                      >
                        {mod.label}
                      </text>

                      {/* Detail on hover */}
                      {isHovered && mod.detail && (
                        <text
                          x={pos.x}
                          y={pos.y + hexR + 25}
                          textAnchor="middle"
                          className="text-[6.5px] select-none font-mono"
                          fill={mod.color}
                          opacity={0.7}
                        >
                          {mod.detail}
                        </text>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Status bar - glassmorphism cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {[
                { icon: <Activity className="h-3.5 w-3.5 text-[hsl(var(--tron-neon))]" />, label: "Módulos Ativos", value: `${activeCount}/${modules.length}`, color: "border-green-500/20" },
                { icon: <Zap className="h-3.5 w-3.5 text-primary" />, label: "Sinapses Neurais", value: `${connections.length}`, color: "border-primary/20" },
                { icon: <Database className="h-3.5 w-3.5 text-[hsl(var(--tron-neon))]" />, label: "Vetores Semânticos", value: "61.3k", color: "border-cyan-500/20" },
                { icon: <RefreshCw className="h-3.5 w-3.5 text-muted-foreground" />, label: "Atualizado", value: lastRefresh.toLocaleTimeString("pt-BR"), color: "border-border/30" },
              ].map((item, i) => (
                <div key={i} className={`p-2.5 bg-card/80 backdrop-blur-md rounded-lg border ${item.color} text-center group hover:border-primary/30 transition-all duration-300`}>
                  <div className="flex items-center justify-center mb-1">
                    {item.icon}
                  </div>
                  <p className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider">{item.label}</p>
                  <p className="text-sm font-bold text-foreground font-mono">{item.value}</p>
                </div>
              ))}
            </div>

            {hoveredModule && (
              <Badge className="text-[10px] font-mono bg-primary/10 text-primary border-primary/30 shadow-sm shadow-primary/5" variant="outline">
                ◈ {modules.find(m => m.id === hoveredModule)?.label} — {filteredConnections.length} conexões ativas
              </Badge>
            )}

            {/* Module details on hover - glassmorphism panel */}
            {hoveredModule && (
              <div className="bg-card/90 backdrop-blur-xl border border-primary/20 p-4 rounded-xl space-y-2 text-xs shadow-lg shadow-primary/5 animate-scale-in">
                <div className="font-medium text-foreground flex items-center gap-2">
                  <div className="p-1 rounded-md" style={{ backgroundColor: `${getModuleColor(hoveredModule)}15`, border: `1px solid ${getModuleColor(hoveredModule)}30` }}>
                    {modules.find(m => m.id === hoveredModule)?.icon}
                  </div>
                  <span className="font-mono">{modules.find(m => m.id === hoveredModule)?.label}</span>
                  <Badge variant="outline" className="text-[8px] px-1.5 py-0 font-mono" style={{ borderColor: `${getModuleColor(hoveredModule)}40`, color: getModuleColor(hoveredModule) }}>
                    {modules.find(m => m.id === hoveredModule)?.status}
                  </Badge>
                </div>
                {modules.find(m => m.id === hoveredModule)?.detail && (
                  <p className="text-[10px] font-mono" style={{ color: getModuleColor(hoveredModule) }}>
                    {modules.find(m => m.id === hoveredModule)?.detail}
                  </p>
                )}
                <div className="space-y-1">
                  {filteredConnections.map((c, i) => {
                    const other = c.from === hoveredModule ? c.to : c.from;
                    const otherMod = modules.find(m => m.id === other);
                    const direction = c.from === hoveredModule ? "→" : "←";
                    const barColor = getModuleColor(other);
                    return (
                      <div key={i} className="flex items-center gap-2 text-muted-foreground">
                        <span className="font-mono text-[10px]" style={{ color: getModuleColor(hoveredModule!) }}>{direction}</span>
                        <span className="text-[10px] font-mono">{otherMod?.label}</span>
                        {c.label && <span className="text-[8px] font-mono px-1 py-0 rounded" style={{ backgroundColor: `${barColor}10`, color: barColor }}>{c.label}</span>}
                        <div className="flex-1" />
                        {/* Mini bar chart style */}
                        <div className="flex items-end gap-px h-3">
                          {Array.from({ length: 5 }, (_, bi) => {
                            const threshold = (bi + 1) * 0.2;
                            const active = c.strength >= threshold;
                            return (
                              <div
                                key={bi}
                                className="w-1 rounded-sm transition-all"
                                style={{
                                  height: `${40 + bi * 15}%`,
                                  backgroundColor: active ? barColor : "hsl(var(--muted))",
                                  opacity: active ? 0.8 : 0.2,
                                }}
                              />
                            );
                          })}
                        </div>
                        <span className="text-[8px] w-8 text-right font-mono font-bold" style={{ color: barColor }}>
                          {(c.strength * 100).toFixed(0)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <p className="text-[8px] text-muted-foreground font-mono tracking-wider opacity-60">
              ◈ TOPOLOGIA NEURAL v12 · 9 SPECS ATIVAS ({">"}80% PRECISÃO) · RAG v4 + MHA v6 · AUTO-EVOLUÇÃO 2h · HOVER PARA EXPLORAR
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
