import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Copy, Download, Layers } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export interface LayoutSegment {
  type: string;
  content: string;
  page_number?: number;
  bounding_box?: { left: number; top: number; width: number; height: number };
}

const SEGMENT_COLORS: Record<string, { bg: string; border: string; label: string }> = {
  title: { bg: "bg-primary/10", border: "border-primary/40", label: "Título" },
  section_header: { bg: "bg-primary/10", border: "border-primary/40", label: "Seção" },
  text: { bg: "bg-muted/30", border: "border-border", label: "Texto" },
  paragraph: { bg: "bg-muted/30", border: "border-border", label: "Parágrafo" },
  list_item: { bg: "bg-accent/10", border: "border-accent/40", label: "Lista" },
  table: { bg: "bg-chart-2/10", border: "border-chart-2/40", label: "Tabela" },
  figure: { bg: "bg-chart-3/10", border: "border-chart-3/40", label: "Figura" },
  caption: { bg: "bg-chart-4/10", border: "border-chart-4/40", label: "Legenda" },
  formula: { bg: "bg-chart-5/10", border: "border-chart-5/40", label: "Fórmula" },
  page_header: { bg: "bg-muted/20", border: "border-muted-foreground/20", label: "Cabeçalho" },
  page_footer: { bg: "bg-muted/20", border: "border-muted-foreground/20", label: "Rodapé" },
  // Categorias jurídicas (Docutron-inspired)
  ementa: { bg: "bg-primary/15", border: "border-primary/50", label: "Ementa" },
  dispositivo: { bg: "bg-destructive/10", border: "border-destructive/40", label: "Dispositivo" },
  fundamentacao_legal: { bg: "bg-chart-1/10", border: "border-chart-1/40", label: "Fund. Legal" },
  clausula_contratual: { bg: "bg-chart-2/15", border: "border-chart-2/50", label: "Cláusula" },
  jurisprudencia: { bg: "bg-chart-3/15", border: "border-chart-3/50", label: "Jurisprud." },
  pedido: { bg: "bg-chart-4/15", border: "border-chart-4/50", label: "Pedido" },
};

// ─── Legal Segment Classification (Docutron-inspired) ───
const LEGAL_PATTERNS: Array<{ type: string; patterns: RegExp[] }> = [
  { type: "ementa", patterns: [/^EMENTA\s*[:–-]/i, /^Ementa\s*[:–-]/i, /EMENTA\s*\n/] },
  { type: "dispositivo", patterns: [/DISPOSITIVO/i, /Ante o exposto/i, /julgo\s+(im)?procedente/i, /DECIDO/i, /RESOLVO/i] },
  { type: "fundamentacao_legal", patterns: [/Art\.\s*\d+/i, /Lei\s*n[ºo°]\s*[\d.]+/i, /§\s*\d+[ºo°]/i, /Súmula\s*n?[ºo°]?\s*\d+/i] },
  { type: "clausula_contratual", patterns: [/CL[ÁA]USULA\s+\d/i, /CL[ÁA]USULA\s+[IVXLCDM]+/i, /CL[ÁA]USULA\s+[A-Z]/i] },
  { type: "jurisprudencia", patterns: [/\bSTF\b/, /\bSTJ\b/, /\bREsp\s+n?[ºo°]?\s*[\d.]+/i, /\bHC\s+n?[ºo°]?\s*[\d.]+/i, /Acórdão/i, /\bRE\s+n?[ºo°]?\s*[\d.]+/i] },
  { type: "pedido", patterns: [/\brequer\b/i, /DOS\s+PEDIDOS/i, /DO\s+PEDIDO/i, /REQUERIMENTOS/i] },
];

function classifyLegalSegment(segment: LayoutSegment): LayoutSegment {
  // Only reclassify generic types
  if (!["text", "paragraph"].includes(segment.type)) return segment;
  const content = segment.content;
  for (const { type, patterns } of LEGAL_PATTERNS) {
    if (patterns.some((p) => p.test(content))) {
      return { ...segment, type };
    }
  }
  return segment;
}

function getSegmentStyle(type: string) {
  return SEGMENT_COLORS[type] || { bg: "bg-muted/20", border: "border-border", label: type };
}

interface PDFSegmentationViewerProps {
  segments: LayoutSegment[];
  onCopyMarkdown?: () => void;
}

export function PDFSegmentationViewer({ segments, onCopyMarkdown }: PDFSegmentationViewerProps) {
  const { toast } = useToast();
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const classifiedAll = segments.map(classifyLegalSegment);
  const typeCounts = classifiedAll.reduce((acc, s) => {
    acc[s.type] = (acc[s.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Apply legal classification post-processing
  const classifiedSegments = segments.map(classifyLegalSegment);
  const filtered = selectedType ? classifiedSegments.filter((s) => s.type === selectedType) : classifiedSegments;

  const handleCopyAll = () => {
    const text = classifiedAll.map((s) => s.content).join("\n\n");
    navigator.clipboard.writeText(text);
    toast({ title: "Texto copiado!" });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Layers className="h-4 w-4 text-primary" />
            Segmentação de Layout
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={handleCopyAll}>
              <Copy className="h-3.5 w-3.5 mr-1" />
              Copiar
            </Button>
            {onCopyMarkdown && (
              <Button variant="ghost" size="sm" onClick={onCopyMarkdown}>
                <Download className="h-3.5 w-3.5 mr-1" />
                Markdown
              </Button>
            )}
          </div>
        </div>

        {/* Type filter chips */}
        <div className="flex gap-1.5 flex-wrap mt-2">
          <Badge
            variant={selectedType === null ? "default" : "outline"}
            className="text-[10px] cursor-pointer"
            onClick={() => setSelectedType(null)}
          >
            Todos ({segments.length})
          </Badge>
          {Object.entries(typeCounts).map(([type, count]) => {
            const style = getSegmentStyle(type);
            return (
              <Badge
                key={type}
                variant={selectedType === type ? "default" : "outline"}
                className="text-[10px] cursor-pointer"
                onClick={() => setSelectedType(selectedType === type ? null : type)}
              >
                {style.label} ({count})
              </Badge>
            );
          })}
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[500px]">
          <div className="space-y-2">
            {filtered.map((segment, idx) => {
              const style = getSegmentStyle(segment.type);
              return (
                <div
                  key={idx}
                  className={`p-3 border rounded-sm ${style.bg} ${style.border}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                      {style.label}
                    </Badge>
                    {segment.page_number && (
                      <span className="text-[9px] text-muted-foreground">
                        Pág. {segment.page_number}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-foreground whitespace-pre-wrap leading-relaxed">
                    {segment.content.length > 500
                      ? segment.content.substring(0, 500) + "..."
                      : segment.content}
                  </p>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                Nenhum segmento encontrado.
              </p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
