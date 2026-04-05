import { useState, useEffect, useMemo, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Network } from "lucide-react";
import {
  createAgentSociety,
  recordAgentCoActivation,
  type AgentSocietyState,
  type AgentRole,
} from "@/lib/neural/multi-agent";

const ROLES: AgentRole[] = [
  "leitura", "pesquisa", "construcao", "planejador",
  "supervisor", "critico", "refinador", "monitoramento",
  "colaborador", "multimodal",
];

const ROLE_LABELS: Record<string, string> = {
  leitura: "Leitura",
  pesquisa: "Pesquisa",
  construcao: "Construção",
  planejador: "Planejador",
  supervisor: "Supervisor",
  critico: "Crítico",
  refinador: "Refinador",
  monitoramento: "Monitor",
  colaborador: "Colaborador",
  multimodal: "Multimodal",
};

const ROLE_COLORS: Record<string, string> = {
  leitura: "#3b82f6",
  pesquisa: "#8b5cf6",
  construcao: "#f59e0b",
  planejador: "#10b981",
  supervisor: "#ef4444",
  critico: "#f97316",
  refinador: "#06b6d4",
  monitoramento: "#84cc16",
  colaborador: "#ec4899",
  multimodal: "#6366f1",
};

function getNodePositions(count: number, cx: number, cy: number, radius: number) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (2 * Math.PI * i) / count - Math.PI / 2;
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  });
}

export function AgentCoActivationGraph() {
  const [society, setSociety] = useState<AgentSocietyState>(() => createAgentSociety());
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);
  const [activeEdge, setActiveEdge] = useState<{ from: number; to: number } | null>(null);

  // Simulate periodic co-activations for demo
  useEffect(() => {
    const interval = setInterval(() => {
      setSociety(prev => {
        const fromIdx = Math.floor(Math.random() * ROLES.length);
        let toIdx = Math.floor(Math.random() * ROLES.length);
        if (toIdx === fromIdx) toIdx = (toIdx + 1) % ROLES.length;
        const success = Math.random() > 0.3;
        const updated = recordAgentCoActivation(prev, ROLES[fromIdx], ROLES[toIdx], success);
        setActiveEdge({ from: fromIdx, to: toIdx });
        setTimeout(() => setActiveEdge(null), 800);
        return updated;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const width = 460;
  const height = 380;
  const cx = width / 2;
  const cy = height / 2;
  const radius = 140;
  const positions = useMemo(() => getNodePositions(ROLES.length, cx, cy, radius), []);

  // Get max weight for normalization
  const maxWeight = useMemo(() => {
    let max = 0.01;
    for (let i = 0; i < ROLES.length; i++) {
      for (let j = 0; j < ROLES.length; j++) {
        if (i !== j) {
          const w = Math.abs(society.binding.weights[i]?.[j] || 0);
          if (w > max) max = w;
        }
      }
    }
    return max;
  }, [society.binding.weights]);

  const edges = useMemo(() => {
    const result: Array<{ from: number; to: number; weight: number; normalized: number }> = [];
    for (let i = 0; i < ROLES.length; i++) {
      for (let j = i + 1; j < ROLES.length; j++) {
        const w = society.binding.weights[i]?.[j] || 0;
        if (Math.abs(w) > 0.001) {
          result.push({ from: i, to: j, weight: w, normalized: Math.abs(w) / maxWeight });
        }
      }
    }
    return result.sort((a, b) => Math.abs(a.weight) - Math.abs(b.weight));
  }, [society.binding.weights, maxWeight]);

  const totalEvents = society.coActivationLog.length;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Network className="h-5 w-5 text-primary" />
          Grafo de Co-Ativação STDP
          <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
            {totalEvents} eventos
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-2">
        <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="select-none">
          {/* Edges */}
          {edges.map(({ from, to, weight, normalized }, idx) => {
            const p1 = positions[from];
            const p2 = positions[to];
            const isActive = activeEdge?.from === from && activeEdge?.to === to;
            const isHovered = hoveredNode === from || hoveredNode === to;
            const opacity = isHovered ? 0.9 : isActive ? 1 : 0.15 + normalized * 0.6;
            const strokeWidth = 1 + normalized * 3;
            const color = weight > 0 ? "#10b981" : "#ef4444";
            return (
              <line
                key={`e-${idx}`}
                x1={p1.x} y1={p1.y}
                x2={p2.x} y2={p2.y}
                stroke={color}
                strokeWidth={isActive ? strokeWidth + 1.5 : strokeWidth}
                opacity={opacity}
                strokeLinecap="round"
                className={isActive ? "animate-pulse" : ""}
              />
            );
          })}

          {/* Nodes */}
          {positions.map((pos, i) => {
            const role = ROLES[i];
            const color = ROLE_COLORS[role];
            const isHovered = hoveredNode === i;
            const agent = society.agents[i];
            const reliability = agent?.reliabilityScore || 0;
            const nodeRadius = isHovered ? 24 : 20;

            return (
              <g
                key={`n-${i}`}
                onMouseEnter={() => setHoveredNode(i)}
                onMouseLeave={() => setHoveredNode(null)}
                className="cursor-pointer"
              >
                {/* Glow */}
                <circle cx={pos.x} cy={pos.y} r={nodeRadius + 6} fill={color} opacity={isHovered ? 0.2 : 0.08} />
                {/* Reliability ring */}
                <circle
                  cx={pos.x} cy={pos.y} r={nodeRadius + 2}
                  fill="none" stroke={color} strokeWidth={2}
                  strokeDasharray={`${reliability * 2 * Math.PI * (nodeRadius + 2)} ${2 * Math.PI * (nodeRadius + 2)}`}
                  opacity={0.6}
                  transform={`rotate(-90 ${pos.x} ${pos.y})`}
                />
                {/* Node circle */}
                <circle cx={pos.x} cy={pos.y} r={nodeRadius} fill="hsl(var(--card))" stroke={color} strokeWidth={2} />
                {/* Status dot */}
                <circle
                  cx={pos.x + nodeRadius - 4} cy={pos.y - nodeRadius + 4} r={4}
                  fill={agent?.status === "busy" ? "#f59e0b" : agent?.status === "error" ? "#ef4444" : "#10b981"}
                />
                {/* Label */}
                <text x={pos.x} y={pos.y + 1} textAnchor="middle" dominantBaseline="middle"
                  fill={color} fontSize={isHovered ? 9 : 8} fontWeight="600"
                >
                  {ROLE_LABELS[role]}
                </text>
                {/* Quality score below */}
                <text x={pos.x} y={pos.y + nodeRadius + 14} textAnchor="middle"
                  fill="hsl(var(--muted-foreground))" fontSize={7}
                >
                  Q: {((agent?.qualityScore || 0) * 100).toFixed(0)}%
                </text>
              </g>
            );
          })}

          {/* Active edge animation pulse */}
          {activeEdge && (
            <circle
              cx={(positions[activeEdge.from].x + positions[activeEdge.to].x) / 2}
              cy={(positions[activeEdge.from].y + positions[activeEdge.to].y) / 2}
              r={6} fill="#10b981" opacity={0.8}
              className="animate-ping"
            />
          )}
        </svg>

        {/* Legend */}
        <div className="flex items-center justify-between px-2 mt-1">
          <div className="flex items-center gap-3 text-[9px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-emerald-500 inline-block rounded" /> Excitatório
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-0.5 bg-red-500 inline-block rounded" /> Inibitório
            </span>
          </div>
          <span className="text-[9px] text-muted-foreground">
            Pesos STDP: max {maxWeight.toFixed(3)}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
