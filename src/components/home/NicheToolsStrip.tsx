import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, X } from "lucide-react";
import { useUserNiche } from "@/hooks/useUserNiche";
import { Badge } from "@/components/ui/badge";

export function NicheToolsStrip() {
  const { niche, label, tools, setNiche } = useUserNiche();
  if (!niche) return null;

  return (
    <section className="container mx-auto px-4 sm:px-6 py-8">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-primary/30 text-primary">
            <Sparkles className="h-3 w-3 mr-1" /> Sua vertical: {label}
          </Badge>
          <span className="text-xs text-muted-foreground">Ferramentas filtradas para você</span>
        </div>
        <button
          onClick={() => setNiche(null)}
          className="text-xs text-muted-foreground hover:text-primary inline-flex items-center gap-1"
        >
          <X className="h-3 w-3" /> Trocar vertical
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {tools.map((t) => (
          <Link
            key={t.to}
            to={t.to}
            className="group p-4 rounded-lg border border-border/40 hover:border-primary/40 hover:bg-primary/5 transition-all"
          >
            <div className="flex items-start justify-between mb-1">
              <span className="text-sm font-medium text-foreground">{t.label}</span>
              <ArrowRight className="h-3.5 w-3.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <p className="text-xs text-muted-foreground">{t.description}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
