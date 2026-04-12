import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Package, Download, Star, Search, Filter, Zap, Code2, 
  Layers, Puzzle, LayoutGrid, GitBranch, Terminal, Sparkles,
  ChevronRight, Plus, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  getMarketplaceFrameworks,
  installFramework,
  runFrameworkPipeline,
  type OrionFramework,
  type FrameworkType,
  type FrameworkGenerationRequest,
} from "@/lib/neural/framework-factory";

const TYPE_META: Record<FrameworkType, { icon: any; color: string; label: string }> = {
  ui_component: { icon: LayoutGrid, color: "from-cyan-500 to-blue-600", label: "UI Component" },
  business_logic: { icon: Code2, color: "from-emerald-500 to-green-600", label: "Business Logic" },
  full_stack: { icon: Layers, color: "from-violet-500 to-purple-600", label: "Full Stack" },
  utility: { icon: Terminal, color: "from-amber-500 to-orange-600", label: "Utility" },
  integration: { icon: Puzzle, color: "from-rose-500 to-pink-600", label: "Integration" },
  template: { icon: GitBranch, color: "from-sky-500 to-indigo-600", label: "Template" },
  pipeline: { icon: Zap, color: "from-yellow-500 to-amber-600", label: "Pipeline" },
};

export default function MarketplaceModules() {
  const { user } = useAuth();
  const [frameworks, setFrameworks] = useState<OrionFramework[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeType, setActiveType] = useState<FrameworkType | "all">("all");
  const [generating, setGenerating] = useState(false);
  const [selectedFw, setSelectedFw] = useState<OrionFramework | null>(null);

  useEffect(() => {
    loadFrameworks();
  }, [activeType, search]);

  async function loadFrameworks() {
    setLoading(true);
    const data = await getMarketplaceFrameworks({
      type: activeType === "all" ? undefined : activeType,
      search: search || undefined,
    });
    setFrameworks(data);
    setLoading(false);
  }

  async function handleInstall(fw: OrionFramework) {
    if (!user?.id) { toast.error("Faça login para instalar"); return; }
    const ok = await installFramework(fw.id, user.id);
    if (ok) {
      toast.success(`"${fw.name}" instalado com sucesso!`);
      loadFrameworks();
    } else {
      toast.error("Erro ao instalar módulo");
    }
  }

  async function handleGenerate() {
    if (!user?.id) return;
    setGenerating(true);

    const request: FrameworkGenerationRequest = {
      name: "Auto Validator",
      type: "utility",
      description: "Framework de validação automática gerado pelo Orion",
      requirements: ["Validação de inputs", "Sanitização de dados", "Type checking"],
      tags: ["validation", "security", "auto-generated"],
    };

    const result = await runFrameworkPipeline(request, user.id);
    
    if (result.success) {
      toast.success("Framework gerado e publicado com sucesso!");
      loadFrameworks();
    } else {
      const failedPhase = result.phases.find(p => !p.success);
      toast.error(`Geração falhou na fase: ${failedPhase?.phase || "unknown"}`);
    }
    setGenerating(false);
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white relative overflow-hidden">
      {/* Neural grid background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute inset-0" style={{
          backgroundImage: `
            linear-gradient(rgba(59,130,246,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(59,130,246,0.03) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
        }} />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-cyan-500/5 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">Orion Module Marketplace</h1>
                <p className="text-sm text-gray-400">Frameworks autônomos • Gerados pela IA • Plug & Play</p>
              </div>
            </div>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={generating}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white border-0 gap-2"
          >
            {generating ? (
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity }}>
                <Sparkles className="w-4 h-4" />
              </motion.div>
            ) : (
              <Plus className="w-4 h-4" />
            )}
            {generating ? "Gerando..." : "Gerar Framework"}
          </Button>
        </div>

        {/* Search + Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar módulos..."
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            <Badge
              variant={activeType === "all" ? "default" : "outline"}
              className={`cursor-pointer whitespace-nowrap ${activeType === "all" ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40" : "border-white/10 text-gray-400 hover:text-white"}`}
              onClick={() => setActiveType("all")}
            >
              <Filter className="w-3 h-3 mr-1" /> Todos
            </Badge>
            {(Object.keys(TYPE_META) as FrameworkType[]).map((type) => {
              const meta = TYPE_META[type];
              const Icon = meta.icon;
              return (
                <Badge
                  key={type}
                  variant={activeType === type ? "default" : "outline"}
                  className={`cursor-pointer whitespace-nowrap ${
                    activeType === type
                      ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40"
                      : "border-white/10 text-gray-400 hover:text-white"
                  }`}
                  onClick={() => setActiveType(type)}
                >
                  <Icon className="w-3 h-3 mr-1" /> {meta.label}
                </Badge>
              );
            })}
          </div>
        </div>

        {/* Framework Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1,2,3,4,5,6].map(i => (
              <div key={i} className="h-56 rounded-xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : frameworks.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center mx-auto mb-4">
              <Package className="w-10 h-10 text-cyan-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Marketplace vazio</h3>
            <p className="text-gray-400 mb-4">O Orion ainda não gerou nenhum framework. Clique em "Gerar Framework" para iniciar.</p>
            <Button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-0 gap-2"
            >
              <Sparkles className="w-4 h-4" /> Gerar Primeiro Framework
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <AnimatePresence>
              {frameworks.map((fw, idx) => {
                const meta = TYPE_META[fw.framework_type] || TYPE_META.utility;
                const Icon = meta.icon;
                return (
                  <motion.div
                    key={fw.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="group relative rounded-xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.05] transition-all duration-300 overflow-hidden"
                  >
                    {/* Glow effect on hover */}
                    <div className={`absolute inset-0 bg-gradient-to-br ${meta.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`} />

                    <div className="relative p-5">
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${meta.color} flex items-center justify-center shrink-0`}>
                          <Icon className="w-4 h-4 text-white" />
                        </div>
                        <Badge variant="outline" className="text-[10px] border-white/10 text-gray-400">
                          v{fw.version}
                        </Badge>
                      </div>

                      {/* Title */}
                      <h3 className="font-semibold text-sm mb-1 group-hover:text-cyan-300 transition-colors">{fw.name}</h3>
                      <p className="text-xs text-gray-400 line-clamp-2 mb-3">{fw.description || "Auto-generated module"}</p>

                      {/* Tags */}
                      <div className="flex flex-wrap gap-1 mb-4">
                        {fw.tags?.slice(0, 3).map(tag => (
                          <span key={tag} className="px-1.5 py-0.5 text-[10px] rounded bg-white/5 text-gray-400">
                            {tag}
                          </span>
                        ))}
                      </div>

                      {/* Stats */}
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1">
                            <Download className="w-3 h-3" /> {fw.downloads}
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-yellow-500" /> {fw.rating_avg?.toFixed(1) || "0.0"}
                          </span>
                        </div>
                        <span className="text-cyan-400/60 text-[10px]">{fw.author_agent}</span>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 mt-4">
                        <Button
                          size="sm"
                          onClick={() => handleInstall(fw)}
                          className="flex-1 bg-gradient-to-r from-cyan-500/20 to-blue-600/20 hover:from-cyan-500/30 hover:to-blue-600/30 text-cyan-300 border border-cyan-500/20 text-xs h-8"
                        >
                          <Download className="w-3 h-3 mr-1" /> Instalar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedFw(fw)}
                          className="text-gray-400 hover:text-white text-xs h-8 px-2"
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

        {/* Source Code Viewer Modal */}
        <AnimatePresence>
          {selectedFw && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
              onClick={() => setSelectedFw(null)}
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 20 }}
                className="w-full max-w-3xl max-h-[80vh] rounded-xl border border-white/10 bg-[#0d0d14] overflow-hidden"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between p-4 border-b border-white/10">
                  <div>
                    <h3 className="font-semibold text-cyan-300">{selectedFw.name}</h3>
                    <p className="text-xs text-gray-400">Código-fonte gerado pelo Orion</p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedFw(null)} className="text-gray-400">✕</Button>
                </div>
                <pre className="p-4 overflow-auto text-xs text-gray-300 font-mono max-h-[60vh]">
                  {selectedFw.source_code}
                </pre>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
