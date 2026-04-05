import React, { useState, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ShieldCheck,
  RefreshCw,
  FileText,
  Globe,
  Scale,
  BookOpen,
} from "lucide-react";
import { CitationBadge } from "./CitationBadge";
import {
  Citation,
  getUserCitations,
  reverifyCitation,
  getReliabilityLevel,
} from "@/lib/citations/citationService";
import { toast } from "sonner";

interface CitationPanelProps {
  citations?: Citation[];
  documentId?: string;
  conversationId?: string;
  onCitationClick?: (citation: Citation) => void;
}

export const CitationPanel: React.FC<CitationPanelProps> = ({
  citations: propCitations,
  documentId,
  onCitationClick,
}) => {
  const [citations, setCitations] = useState<Citation[]>(propCitations || []);
  const [filter, setFilter] = useState<string>("all");
  const [loading, setLoading] = useState(false);
  const [reverifying, setReverifying] = useState<string | null>(null);

  useEffect(() => {
    if (propCitations) {
      setCitations(propCitations);
    } else {
      loadCitations();
    }
  }, [propCitations]);

  const loadCitations = async () => {
    setLoading(true);
    try {
      const data = await getUserCitations({ limit: 50 });
      setCitations(data);
    } catch {
      console.error("Failed to load citations");
    } finally {
      setLoading(false);
    }
  };

  const handleReverify = async (citationId: string) => {
    setReverifying(citationId);
    try {
      const result = await reverifyCitation(citationId);
      toast.success(`Citação reverificada: ${Math.round(result.reliability_score * 100)}% confiável`);
      loadCitations();
    } catch {
      toast.error("Erro ao reverificar citação");
    } finally {
      setReverifying(null);
    }
  };

  const filtered = citations.filter((c) => {
    if (filter === "all") return true;
    if (filter === "verified") return c.is_verified;
    if (filter === "unverified") return !c.is_verified;
    return c.citation_type === filter;
  });

  const stats = {
    total: citations.length,
    verified: citations.filter((c) => c.is_verified).length,
    avgScore: citations.length
      ? Math.round(
          (citations.reduce((sum, c) => sum + c.reliability_score, 0) / citations.length) * 100
        )
      : 0,
  };

  const typeIcon = (type: string) => {
    switch (type) {
      case "legislation": return <Scale className="h-3 w-3" />;
      case "jurisprudence": return <BookOpen className="h-3 w-3" />;
      case "doctrine": return <FileText className="h-3 w-3" />;
      default: return <Globe className="h-3 w-3" />;
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b space-y-2">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-primary" />
            Citações Verificáveis
          </h3>
          <Button variant="ghost" size="sm" onClick={loadCitations} disabled={loading}>
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Stats */}
        <div className="flex gap-2 text-xs">
          <Badge variant="outline">{stats.total} total</Badge>
          <Badge variant="default" className="gap-1">
            <ShieldCheck className="h-3 w-3" />
            {stats.verified} verificadas
          </Badge>
          <Badge variant="secondary">{stats.avgScore}% média</Badge>
        </div>

        {/* Filter */}
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="h-7 text-xs">
            <SelectValue placeholder="Filtrar..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="verified">Verificadas</SelectItem>
            <SelectItem value="unverified">Não verificadas</SelectItem>
            <Separator className="my-1" />
            <SelectItem value="legislation">Legislação</SelectItem>
            <SelectItem value="jurisprudence">Jurisprudência</SelectItem>
            <SelectItem value="doctrine">Doutrina</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Citations list */}
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">
              Nenhuma citação encontrada
            </p>
          )}
          {filtered.map((citation, idx) => (
            <div key={citation.id} className="group relative">
              <CitationBadge
                citation={citation}
                index={idx + 1}
                format="full"
                onClick={() => onCitationClick?.(citation)}
              />
              <Button
                variant="ghost"
                size="sm"
                className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 p-0"
                onClick={() => handleReverify(citation.id)}
                disabled={reverifying === citation.id}
              >
                <RefreshCw className={`h-3 w-3 ${reverifying === citation.id ? "animate-spin" : ""}`} />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
