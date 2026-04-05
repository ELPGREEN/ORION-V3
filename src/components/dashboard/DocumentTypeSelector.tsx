import { useState, useMemo } from "react";
import type { ComponentType } from "react";
import { Gavel, ScrollText, Shield, Briefcase, Wrench, Users, Search, GraduationCap, Globe } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import type { DocumentType } from "@/types/document-types";

interface DocumentTypeSelectorProps {
  selectedType: string;
  onSelect: (typeId: string) => void;
  types: DocumentType[];
  categoryLabels: Record<string, string>;
}

const categoryIcons: Record<string, ComponentType<{ className?: string }>> = {
  penal: Shield,
  civil: Gavel,
  trabalhista: Users,
  contrato: Briefcase,
  extrajudicial: ScrollText,
  internacional: Globe,
  academico: GraduationCap,
  ferramentas: Wrench,
};

const categoryOrder = ["penal", "civil", "trabalhista", "contrato", "extrajudicial", "internacional", "academico", "ferramentas"];

export function DocumentTypeSelector({ selectedType, onSelect, types, categoryLabels }: DocumentTypeSelectorProps) {
  const [category, setCategory] = useState(categoryOrder[0]);
  const [search, setSearch] = useState("");

  const filteredTypes = useMemo(() => {
    const byCategory = types.filter((t) => t.category === category);
    if (!search.trim()) return byCategory;
    const q = search.toLowerCase().trim();
    return byCategory.filter(
      (t) => t.label.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q)
    );
  }, [types, category, search]);

  // Count matches across all categories for search
  const categoryCounts = useMemo(() => {
    const q = search.toLowerCase().trim();
    const counts: Record<string, number> = {};
    for (const cat of categoryOrder) {
      const catTypes = types.filter((t) => t.category === cat);
      counts[cat] = q
        ? catTypes.filter((t) => t.label.toLowerCase().includes(q) || t.desc.toLowerCase().includes(q)).length
        : catTypes.length;
    }
    return counts;
  }, [types, search]);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          placeholder="Buscar tipo de documento..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 h-9 bg-card border-border text-sm"
        />
      </div>

      {/* Category Tabs */}
      <div className="flex border-b border-border overflow-x-auto scrollbar-hide -mx-2 px-2 gap-0.5">
        {categoryOrder.map((cat) => {
          const Icon = categoryIcons[cat] || Gavel;
          const count = categoryCounts[cat] ?? 0;
          return (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-[10px] font-medium tracking-wide uppercase transition-all relative whitespace-nowrap rounded-t-md ${
                category === cat
                  ? "text-primary bg-primary/5"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{categoryLabels[cat]}</span>
              <Badge
                variant="outline"
                className={`text-[8px] h-4 px-1 ml-0.5 ${
                  category === cat ? "border-primary/30 text-primary" : "border-border text-muted-foreground/50"
                }`}
              >
                {count}
              </Badge>
              {category === cat && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t" />
              )}
            </button>
          );
        })}
      </div>

      {/* Type Grid */}
      {filteredTypes.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          Nenhum documento encontrado para "{search}"
        </div>
      ) : (
        <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
          {filteredTypes.map((type, i) => (
            <button
              key={type.id}
              onClick={() => onSelect(type.id)}
              className={`bg-card border p-3 sm:p-4 text-left transition-all group animate-fade-in-up ${
                selectedType === type.id
                  ? "border-primary ring-1 ring-primary/20 bg-primary/5"
                  : "border-border hover:border-primary/40 hover:bg-accent/30"
              }`}
              style={{ animationDelay: `${i * 25}ms` }}
            >
              <div className={`h-7 w-7 sm:h-9 sm:w-9 border flex items-center justify-center mb-1.5 sm:mb-2 transition-colors ${
                selectedType === type.id
                  ? "border-primary/40 bg-primary/10"
                  : "border-primary/20 group-hover:border-primary/40"
              }`}>
                <type.icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
              </div>
              <h3 className="text-[11px] sm:text-xs font-medium text-foreground mb-0.5">{type.label}</h3>
              <p className="text-[9px] sm:text-[10px] text-muted-foreground leading-relaxed line-clamp-2">{type.desc}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
