/**
 * ═══ Identified Objects Panel (Compact HUD Sidebar) ═══
 * Object list with category filters and mini position map
 * Matches JARVIS HUD sidebar style (~220px wide)
 */
import { useState, useRef, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Target, User, Monitor, Armchair, FileText, Car, Dog, Apple, Shirt, TreePine, Wrench, Barcode, Package, Dumbbell, Music, Palette, HelpCircle, MapPin, Filter } from "lucide-react";

export interface IdentifiedObject {
  name: string;
  category: string;
  confidence: number;
  count: number;
  position?: string;
  distance?: string;
}

const CATEGORY_CONFIG: Record<string, { bg: string; text: string; border: string; icon: typeof Target; color: string }> = {
  pessoa:      { bg: "bg-cyan-500/15",    text: "text-cyan-400",    border: "border-cyan-500/30", icon: User, color: "#00e5ff" },
  eletronico:  { bg: "bg-blue-500/15",    text: "text-blue-400",    border: "border-blue-500/30", icon: Monitor, color: "#3b82f6" },
  movel:       { bg: "bg-amber-500/15",   text: "text-amber-400",   border: "border-amber-500/30", icon: Armchair, color: "#f59e0b" },
  documento:   { bg: "bg-green-500/15",   text: "text-green-400",   border: "border-green-500/30", icon: FileText, color: "#22c55e" },
  veiculo:     { bg: "bg-red-500/15",     text: "text-red-400",     border: "border-red-500/30", icon: Car, color: "#ef4444" },
  animal:      { bg: "bg-purple-500/15",  text: "text-purple-400",  border: "border-purple-500/30", icon: Dog, color: "#a855f7" },
  alimento:    { bg: "bg-orange-500/15",  text: "text-orange-400",  border: "border-orange-500/30", icon: Apple, color: "#f97316" },
  vestuario:   { bg: "bg-pink-500/15",    text: "text-pink-400",    border: "border-pink-500/30", icon: Shirt, color: "#ec4899" },
  ambiente:    { bg: "bg-teal-500/15",    text: "text-teal-400",    border: "border-teal-500/30", icon: TreePine, color: "#14b8a6" },
  ferramenta:  { bg: "bg-yellow-500/15",  text: "text-yellow-400",  border: "border-yellow-500/30", icon: Wrench, color: "#eab308" },
  codigo:      { bg: "bg-indigo-500/15",  text: "text-indigo-400",  border: "border-indigo-500/30", icon: Barcode, color: "#6366f1" },
  embalagem:   { bg: "bg-lime-500/15",    text: "text-lime-400",    border: "border-lime-500/30", icon: Package, color: "#84cc16" },
  esporte:     { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30", icon: Dumbbell, color: "#10b981" },
  instrumento: { bg: "bg-violet-500/15",  text: "text-violet-400",  border: "border-violet-500/30", icon: Music, color: "#8b5cf6" },
  arte:        { bg: "bg-rose-500/15",    text: "text-rose-400",    border: "border-rose-500/30", icon: Palette, color: "#f43f5e" },
  outro:       { bg: "bg-white/10",       text: "text-white/60",    border: "border-white/20", icon: HelpCircle, color: "#94a3b8" },
};

function getCategoryConfig(cat: string) {
  const key = cat.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return CATEGORY_CONFIG[key] || CATEGORY_CONFIG[cat.toLowerCase()] || CATEGORY_CONFIG.outro;
}

const POSITION_MAP: Record<string, { x: number; y: number }> = {
  "topo-esquerda": { x: 15, y: 15 }, "topo": { x: 50, y: 15 }, "topo-direita": { x: 85, y: 15 },
  "esquerda": { x: 15, y: 50 }, "centro-esquerda": { x: 30, y: 50 }, "centro": { x: 50, y: 50 },
  "centro-direita": { x: 70, y: 50 }, "direita": { x: 85, y: 50 },
  "fundo-esquerda": { x: 15, y: 85 }, "fundo": { x: 50, y: 85 }, "fundo-direita": { x: 85, y: 85 },
};

export function IdentifiedObjectsPanel({ objects }: { objects: IdentifiedObject[] }) {
  const totalCount = objects.reduce((sum, o) => sum + o.count, 0);
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const prevNamesRef = useRef<Set<string>>(new Set());
  const [newNames, setNewNames] = useState<Set<string>>(new Set());

  useEffect(() => {
    const currentNames = new Set(objects.map(o => o.name));
    const freshNames = new Set<string>();
    currentNames.forEach(n => { if (!prevNamesRef.current.has(n)) freshNames.add(n); });
    setNewNames(freshNames);
    prevNamesRef.current = currentNames;
    if (freshNames.size > 0) {
      const timer = setTimeout(() => setNewNames(new Set()), 5000);
      return () => clearTimeout(timer);
    }
  }, [objects]);

  const categories = [...new Set(objects.map(o =>
    o.category.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  ))];

  const filtered = activeFilter
    ? objects.filter(o => o.category.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === activeFilter)
    : objects;

  const objectsWithPosition = filtered.filter(o => o.position && POSITION_MAP[o.position]);

  return (
    <div className="relative bg-black/60 backdrop-blur-sm border border-cyan-500/20 rounded-sm overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-cyan-400/40 via-transparent to-transparent" />
      
      {/* Header */}
      <div className="px-3 py-1.5 flex items-center gap-1.5 border-b border-cyan-500/10">
        <Target className="h-3 w-3 text-cyan-400 shrink-0" />
        <span className="text-[10px] font-mono text-cyan-400/80 tracking-wider uppercase">Objetos</span>
        {totalCount > 0 && (
          <Badge variant="outline" className="ml-auto text-[7px] h-3.5 border-cyan-500/30 text-cyan-400 font-mono">{totalCount}</Badge>
        )}
      </div>

      <div className="px-3 py-2 space-y-1.5">
        {/* Category filter chips */}
        {categories.length > 1 && (
          <div className="flex flex-wrap gap-0.5 pb-1">
            <button
              onClick={() => setActiveFilter(null)}
              className={`text-[6px] px-1 py-0.5 rounded font-mono transition-colors ${!activeFilter ? "bg-cyan-500/20 text-cyan-400" : "bg-white/5 text-white/20 hover:text-white/40"}`}
            >
              Todos
            </button>
            {categories.slice(0, 5).map(cat => {
              const cfg = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.outro;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveFilter(activeFilter === cat ? null : cat)}
                  className={`text-[6px] px-1 py-0.5 rounded font-mono transition-colors ${activeFilter === cat ? `${cfg.bg} ${cfg.text}` : "bg-white/5 text-white/20 hover:text-white/40"}`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        )}

        {/* Mini position map */}
        {objectsWithPosition.length > 0 && (
          <div className="relative w-full h-10 bg-white/[0.02] rounded border border-white/[0.04]">
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-10">
              {Array(9).fill(0).map((_, i) => <div key={i} className="border border-white/10" />)}
            </div>
            {objectsWithPosition.slice(0, 6).map((obj, i) => {
              const pos = POSITION_MAP[obj.position!];
              const cfg = getCategoryConfig(obj.category);
              return (
                <div
                  key={`pos-${i}`}
                  className="absolute w-2.5 h-2.5 rounded-full flex items-center justify-center"
                  style={{ 
                    left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%,-50%)",
                    backgroundColor: `${cfg.color}30`, border: `1px solid ${cfg.color}60`
                  }}
                  title={`${obj.name} (${obj.distance || "?"})`}
                />
              );
            })}
            <span className="absolute bottom-0 right-0.5 text-[5px] text-white/10 font-mono">mapa</span>
          </div>
        )}

        {/* Object list */}
        {filtered.length > 0 ? filtered.slice(0, 8).map((obj, i) => {
          const cfg = getCategoryConfig(obj.category);
          const Icon = cfg.icon;
          const pct = Math.round(obj.confidence * 100);
          const isNew = newNames.has(obj.name);
          return (
            <div key={`${obj.name}-${i}`} className={`flex items-center gap-1.5 ${isNew ? "animate-pulse" : ""}`}>
              <Icon className="h-3 w-3 shrink-0" style={{ color: cfg.color }} />
              <span className="text-[9px] font-mono text-white/40 flex-1 truncate">{obj.name}</span>
              {obj.count > 1 && <span className="text-[7px] font-mono text-white/20">×{obj.count}</span>}
              <div className="w-8 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: `${cfg.color}80` }} />
              </div>
              <span className="text-[7px] font-mono text-cyan-400/40 w-5 text-right">{pct}%</span>
            </div>
          );
        }) : (
          <p className="text-[8px] text-white/15 font-mono text-center py-2">
            Nenhum objeto identificado
          </p>
        )}
      </div>
    </div>
  );
}
