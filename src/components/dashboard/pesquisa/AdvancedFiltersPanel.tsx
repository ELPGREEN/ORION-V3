import { useState } from "react";
import {
  Filter, Calendar, Database, Sparkles, ChevronDown, ChevronUp, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { SOURCE_LABELS, TYPE_LABELS, type SourceId, type ResultType } from "@/lib/api";
import type { AdvancedFilters } from "@/hooks/useJurisprudencialSearch";
import { JurisdictionSelector, type Jurisdiction } from "@/components/dashboard/JurisdictionSelector";

interface Props {
  filters: AdvancedFilters;
  onFiltersChange: React.Dispatch<React.SetStateAction<AdvancedFilters>>;
  isNeural: boolean;
  jurisdiction: Jurisdiction;
  onJurisdictionChange: (j: Jurisdiction) => void;
}

const AVAILABLE_SOURCES: { id: SourceId; label: string }[] = [
  { id: "stf", label: "STF" },
  { id: "cnj", label: "CNJ" },
  { id: "lexml", label: "LexML" },
  { id: "camara", label: "Câmara" },
  { id: "datajud_stj", label: "STJ (Datajud)" },
  { id: "datajud_tst", label: "TST (Datajud)" },
  { id: "datajud_tse", label: "TSE (Datajud)" },
  { id: "freelaw", label: "CourtListener" },
  { id: "google_books", label: "Google Books" },
  { id: "knowledge_graph", label: "Knowledge Graph" },
];

const CONTENT_TYPES: { id: ResultType; label: string }[] = [
  { id: "jurisprudencia", label: "Jurisprudência" },
  { id: "lei", label: "Legislação" },
  { id: "doutrina", label: "Doutrina" },
  { id: "proposicao", label: "Proposição" },
  { id: "entidade", label: "Entidade" },
];

export function AdvancedFiltersPanel({ filters, onFiltersChange, isNeural, jurisdiction, onJurisdictionChange }: Props) {
  const [open, setOpen] = useState(false);

  const activeCount = [
    filters.filterSources?.length,
    filters.filterDateFrom,
    filters.filterDateTo,
    filters.filterType,
    filters.expandQueries === false ? 1 : 0,
  ].filter(Boolean).length;

  const toggleSource = (sourceId: string) => {
    onFiltersChange((prev) => {
      const current = prev.filterSources || [];
      const next = current.includes(sourceId)
        ? current.filter((s) => s !== sourceId)
        : [...current, sourceId];
      return { ...prev, filterSources: next.length > 0 ? next : undefined };
    });
  };

  const clearAll = () => {
    onFiltersChange({ expandQueries: true });
  };

  return (
    <div className="space-y-2">
      {/* Toggle button */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 text-[11px] text-muted-foreground hover:text-foreground transition-colors group"
      >
        <Filter className="h-3.5 w-3.5" />
        <span>Filtros avançados</span>
        {activeCount > 0 && (
          <Badge
            variant="default"
            className="text-[8px] px-1.5 py-0 h-4 bg-primary text-primary-foreground"
          >
            {activeCount}
          </Badge>
        )}
        {open ? (
          <ChevronUp className="h-3 w-3 ml-auto" />
        ) : (
          <ChevronDown className="h-3 w-3 ml-auto" />
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="bg-card border border-border p-4 space-y-4 animate-fade-in">
          {/* Header with clear */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-medium text-foreground uppercase tracking-wider">
              Filtros de Busca
            </span>
            {activeCount > 0 && (
              <button
                type="button"
                onClick={clearAll}
                className="text-[10px] text-destructive hover:text-destructive/80 flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                Limpar filtros
              </button>
            )}
          </div>

          {/* Jurisdiction selector */}
          <div className="space-y-2">
            <label className="text-[10px] text-muted-foreground flex items-center gap-1.5">
              🌐 Jurisdição
            </label>
            <JurisdictionSelector value={jurisdiction} onChange={onJurisdictionChange} size="sm" />
          </div>
          {/* Source multi-select */}
          <div className="space-y-2">
            <label className="text-[10px] text-muted-foreground flex items-center gap-1.5">
              <Database className="h-3 w-3" />
              Fontes específicas
            </label>
            <div className="flex flex-wrap gap-1.5">
              {AVAILABLE_SOURCES.map((source) => {
                const isActive = filters.filterSources?.includes(source.id);
                return (
                  <button
                    key={source.id}
                    type="button"
                    onClick={() => toggleSource(source.id)}
                    className={`text-[9px] px-2.5 py-1 border transition-colors tracking-wider ${
                      isActive
                        ? "border-primary text-primary bg-primary/10 font-medium"
                        : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                    }`}
                  >
                    {source.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Date range */}
          <div className="space-y-2">
            <label className="text-[10px] text-muted-foreground flex items-center gap-1.5">
              <Calendar className="h-3 w-3" />
              Período de publicação
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                value={filters.filterDateFrom || ""}
                onChange={(e) =>
                  onFiltersChange((prev) => ({
                    ...prev,
                    filterDateFrom: e.target.value || undefined,
                  }))
                }
                className="h-8 text-[11px] bg-card border-border flex-1"
                placeholder="De"
              />
              <span className="text-[10px] text-muted-foreground">até</span>
              <Input
                type="date"
                value={filters.filterDateTo || ""}
                onChange={(e) =>
                  onFiltersChange((prev) => ({
                    ...prev,
                    filterDateTo: e.target.value || undefined,
                  }))
                }
                className="h-8 text-[11px] bg-card border-border flex-1"
                placeholder="Até"
              />
            </div>
          </div>

          {/* Content type */}
          <div className="space-y-2">
            <label className="text-[10px] text-muted-foreground">Tipo de conteúdo</label>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => onFiltersChange((prev) => ({ ...prev, filterType: undefined }))}
                className={`text-[9px] px-2.5 py-1 border transition-colors tracking-wider ${
                  !filters.filterType
                    ? "border-primary text-primary bg-primary/10 font-medium"
                    : "border-border text-muted-foreground hover:border-primary/50"
                }`}
              >
                Todos
              </button>
              {CONTENT_TYPES.map((type) => (
                <button
                  key={type.id}
                  type="button"
                  onClick={() =>
                    onFiltersChange((prev) => ({
                      ...prev,
                      filterType: prev.filterType === type.id ? undefined : type.id,
                    }))
                  }
                  className={`text-[9px] px-2.5 py-1 border transition-colors tracking-wider ${
                    filters.filterType === type.id
                      ? "border-primary text-primary bg-primary/10 font-medium"
                      : "border-border text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Query expansion toggle (neural only) */}
          {isNeural && (
            <div className="flex items-center justify-between py-2 border-t border-border">
              <div className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                <div>
                  <span className="text-[10px] font-medium text-foreground">Expansão de query</span>
                  <p className="text-[9px] text-muted-foreground">
                    Gera variações semânticas da consulta para capturar sinônimos jurídicos
                  </p>
                </div>
              </div>
              <Switch
                checked={filters.expandQueries !== false}
                onCheckedChange={(checked) =>
                  onFiltersChange((prev) => ({ ...prev, expandQueries: checked }))
                }
                className="scale-75"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
