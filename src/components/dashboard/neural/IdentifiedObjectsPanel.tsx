import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const CATEGORY_CONFIG: Record<string, { bg: string; text: string; border: string; icon: typeof Target }> = {
  pessoa:      { bg: "bg-cyan-500/15",    text: "text-cyan-400",    border: "border-cyan-500/30", icon: User },
  eletronico:  { bg: "bg-blue-500/15",    text: "text-blue-400",    border: "border-blue-500/30", icon: Monitor },
  movel:       { bg: "bg-amber-500/15",   text: "text-amber-400",   border: "border-amber-500/30", icon: Armchair },
  documento:   { bg: "bg-green-500/15",   text: "text-green-400",   border: "border-green-500/30", icon: FileText },
  veiculo:     { bg: "bg-red-500/15",     text: "text-red-400",     border: "border-red-500/30", icon: Car },
  animal:      { bg: "bg-purple-500/15",  text: "text-purple-400",  border: "border-purple-500/30", icon: Dog },
  alimento:    { bg: "bg-orange-500/15",  text: "text-orange-400",  border: "border-orange-500/30", icon: Apple },
  vestuario:   { bg: "bg-pink-500/15",    text: "text-pink-400",    border: "border-pink-500/30", icon: Shirt },
  ambiente:    { bg: "bg-teal-500/15",    text: "text-teal-400",    border: "border-teal-500/30", icon: TreePine },
  ferramenta:  { bg: "bg-yellow-500/15",  text: "text-yellow-400",  border: "border-yellow-500/30", icon: Wrench },
  codigo:      { bg: "bg-indigo-500/15",  text: "text-indigo-400",  border: "border-indigo-500/30", icon: Barcode },
  embalagem:   { bg: "bg-lime-500/15",    text: "text-lime-400",    border: "border-lime-500/30", icon: Package },
  esporte:     { bg: "bg-emerald-500/15", text: "text-emerald-400", border: "border-emerald-500/30", icon: Dumbbell },
  instrumento: { bg: "bg-violet-500/15",  text: "text-violet-400",  border: "border-violet-500/30", icon: Music },
  arte:        { bg: "bg-rose-500/15",    text: "text-rose-400",    border: "border-rose-500/30", icon: Palette },
  outro:       { bg: "bg-white/10",       text: "text-white/60",    border: "border-white/20", icon: HelpCircle },
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

  // Track "new" objects
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

  const categories = [...new Set(objects.map(o => {
    const key = o.category.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return key;
  }))];

  const filtered = activeFilter
    ? objects.filter(o => o.category.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === activeFilter)
    : objects;

  const objectsWithPosition = filtered.filter(o => o.position && POSITION_MAP[o.position]);

  return (
    <Card className="border-white/[0.04] bg-[#060a10]">
      <CardHeader className="pb-1 pt-3 px-3">
        <CardTitle className="text-[11px] font-mono flex items-center gap-1.5">
          <Target className="h-3 w-3 text-cyan-400" />
          Objetos Identificados
          {totalCount > 0 && (
            <Badge variant="outline" className="text-[7px] h-3.5 ml-auto border-cyan-500/30 text-cyan-400">
              {totalCount}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-3 pb-3 space-y-1.5">
        {/* Category filter chips */}
        {categories.length > 1 && (
          <div className="flex flex-wrap gap-1 pb-1">
            <button
              onClick={() => setActiveFilter(null)}
              className={`text-[7px] px-1.5 py-0.5 rounded-full font-mono transition-colors ${!activeFilter ? "bg-cyan-500/20 text-cyan-400" : "bg-white/5 text-white/30 hover:text-white/50"}`}
            >
              Todos
            </button>
            {categories.map(cat => {
              const cfg = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.outro;
              const Icon = cfg.icon;
              return (
                <button
                  key={cat}
                  onClick={() => setActiveFilter(activeFilter === cat ? null : cat)}
                  className={`text-[7px] px-1.5 py-0.5 rounded-full font-mono transition-colors flex items-center gap-0.5 ${activeFilter === cat ? `${cfg.bg} ${cfg.text}` : "bg-white/5 text-white/30 hover:text-white/50"}`}
                >
                  <Icon className="h-2 w-2" />
                  {cat}
                </button>
              );
            })}
          </div>
        )}

        {/* Mini position map */}
        {objectsWithPosition.length > 0 && (
          <div className="relative w-full h-14 bg-white/[0.02] rounded border border-white/[0.04] mb-1">
            <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 opacity-10">
              {Array(9).fill(0).map((_, i) => <div key={i} className="border border-white/10" />)}
            </div>
            {objectsWithPosition.slice(0, 8).map((obj, i) => {
              const pos = POSITION_MAP[obj.position!];
              const cfg = getCategoryConfig(obj.category);
              const Icon = cfg.icon;
              return (
                <div
                  key={`pos-${i}`}
                  className={`absolute w-3.5 h-3.5 rounded-full flex items-center justify-center ${cfg.bg} ${cfg.border} border`}
                  style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%,-50%)" }}
                  title={`${obj.name} (${obj.distance || "?"})`}
                >
                  <Icon className={`h-2 w-2 ${cfg.text}`} />
                </div>
              );
            })}
            <span className="absolute bottom-0.5 right-1 text-[6px] text-white/15 font-mono flex items-center gap-0.5">
              <MapPin className="h-1.5 w-1.5" /> mapa
            </span>
          </div>
        )}

        {/* Object list */}
        {filtered.length > 0 ? filtered.slice(0, 12).map((obj, i) => {
          const cfg = getCategoryConfig(obj.category);
          const Icon = cfg.icon;
          const pct = Math.round(obj.confidence * 100);
          const isNew = newNames.has(obj.name);
          return (
            <div
              key={`${obj.name}-${i}`}
              className={`bg-white/[0.02] rounded px-2 py-1.5 animate-in fade-in duration-300 ${isNew ? "ring-1 ring-cyan-500/30" : ""}`}
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <Badge
                  variant="outline"
                  className={`text-[7px] h-3.5 px-1 ${cfg.bg} ${cfg.text} ${cfg.border} flex items-center gap-0.5`}
                >
                  <Icon className="h-2 w-2" />
                  {obj.category}
                </Badge>
                <span className="text-[10px] font-mono text-white/60 flex-1 truncate">{obj.name}</span>
                {isNew && (
                  <Badge className="text-[6px] h-3 px-1 bg-cyan-500/20 text-cyan-400 border-cyan-500/30 animate-pulse">
                    NOVO
                  </Badge>
                )}
                {obj.count > 1 && (
                  <span className="text-[9px] font-mono text-white/30">×{obj.count}</span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <div className="flex-1 h-1 bg-white/[0.04] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${pct}%`,
                      background: `linear-gradient(90deg, rgba(0,229,255,0.6), rgba(0,229,255,0.2))`,
                    }}
                  />
                </div>
                <span className="text-[8px] font-mono text-cyan-400/50 w-7 text-right">{pct}%</span>
                {obj.distance && (
                  <span className="text-[7px] font-mono text-white/20 truncate max-w-[3rem]">{obj.distance}</span>
                )}
              </div>
            </div>
          );
        }) : (
          <p className="text-[9px] text-white/15 font-mono text-center py-3">
            Nenhum objeto identificado ainda
          </p>
        )}
      </CardContent>
    </Card>
  );
}
