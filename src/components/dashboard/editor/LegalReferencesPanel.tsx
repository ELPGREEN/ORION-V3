import { useMemo, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Scale, BookOpen, Gavel, ExternalLink, FileText, Tag, X } from "lucide-react";
import { detectThemes, type DetectedTheme } from "@/lib/analysis";

interface LegalReference {
  type: "lei" | "artigo" | "sumula" | "jurisprudencia" | "decreto" | "codigo";
  text: string;
  normalized: string;
  count: number;
}

interface LegalReferencesPanelProps {
  editorHtml: string;
  documentCategory?: string;
}

const TYPE_CONFIG: Record<string, { label: string; icon: typeof Scale; color: string; searchUrl: (q: string) => string }> = {
  lei: { label: "Lei", icon: Scale, color: "border-blue-500/30 text-blue-400 bg-blue-500/10", searchUrl: (q) => `https://www.planalto.gov.br/ccivil_03/leis/pesquisa.htm?q=${encodeURIComponent(q)}` },
  artigo: { label: "Artigo", icon: BookOpen, color: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10", searchUrl: (q) => `https://www.planalto.gov.br/ccivil_03/leis/pesquisa.htm?q=${encodeURIComponent(q)}` },
  sumula: { label: "Súmula", icon: Gavel, color: "border-amber-500/30 text-amber-400 bg-amber-500/10", searchUrl: (q) => `https://portal.stf.jus.br/jurisprudencia/sumariosumulas.asp?q=${encodeURIComponent(q)}` },
  jurisprudencia: { label: "Jurisprudência", icon: Gavel, color: "border-purple-500/30 text-purple-400 bg-purple-500/10", searchUrl: (q) => `https://jurisprudencia.stf.jus.br/pages/search?q=${encodeURIComponent(q)}` },
  decreto: { label: "Decreto", icon: FileText, color: "border-cyan-500/30 text-cyan-400 bg-cyan-500/10", searchUrl: (q) => `https://www.planalto.gov.br/ccivil_03/decreto/pesquisa.htm?q=${encodeURIComponent(q)}` },
  codigo: { label: "Código", icon: BookOpen, color: "border-rose-500/30 text-rose-400 bg-rose-500/10", searchUrl: (q) => `https://www.planalto.gov.br/ccivil_03/leis/pesquisa.htm?q=${encodeURIComponent(q)}` },
};

function extractReferences(html: string): LegalReference[] {
  const text = html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ");
  const refs = new Map<string, LegalReference>();

  const patterns: { type: LegalReference["type"]; regex: RegExp }[] = [
    { type: "lei", regex: /Lei\s+(?:n[°º.]?\s*)?[\d.]+(?:\/\d{2,4})?/gi },
    { type: "lei", regex: /Lei\s+Complementar\s+(?:n[°º.]?\s*)?[\d.]+/gi },
    { type: "decreto", regex: /Decreto(?:-Lei)?\s+(?:n[°º.]?\s*)?[\d.]+(?:\/\d{2,4})?/gi },
    { type: "artigo", regex: /Art(?:igo)?\.?\s*\d+[°º]?(?:\s*,?\s*§\s*\d+[°º]?)?(?:\s*,?\s*(?:inciso\s+)?[IVXLCDM]+)?/gi },
    { type: "sumula", regex: /Súmula\s+(?:Vinculante\s+)?(?:n[°º.]?\s*)?\d+/gi },
    { type: "jurisprudencia", regex: /(?:RE|REsp|HC|MS|ADI|ADC|ADPF|AgRg|RHC)\s+(?:n[°º.]?\s*)?[\d.]+/gi },
    { type: "codigo", regex: /(?:Código\s+(?:Civil|Penal|de\s+Processo\s+(?:Civil|Penal)|de\s+Defesa\s+do\s+Consumidor|Tributário\s+Nacional)|C(?:P|PC|PP|DC|TN|LT|C)(?:\s|\/|\b))/gi },
    { type: "lei", regex: /CF(?:\/88)?(?:\s|,)/gi },
    { type: "lei", regex: /Constituição\s+Federal/gi },
  ];

  for (const { type, regex } of patterns) {
    let match;
    while ((match = regex.exec(text)) !== null) {
      const raw = match[0].trim().replace(/[,\s]+$/, "");
      const normalized = raw.replace(/\s+/g, " ");
      const key = `${type}:${normalized.toLowerCase()}`;
      if (refs.has(key)) {
        refs.get(key)!.count++;
      } else {
        refs.set(key, { type, text: raw, normalized, count: 1 });
      }
    }
  }

  return Array.from(refs.values()).sort((a, b) => b.count - a.count);
}

const RELATED_LEGISLATION: Record<string, string[]> = {
  "peticao_inicial": ["CPC Art. 319-321", "CF/88 Art. 5º", "Lei 13.105/2015"],
  "contestacao": ["CPC Art. 335-342", "CPC Art. 336"],
  "recurso": ["CPC Art. 994-1044", "CF/88 Art. 5º, LV"],
  "habeas_corpus": ["CPP Art. 647-667", "CF/88 Art. 5º, LXVIII"],
  "contrato": ["CC Art. 421-480", "CDC Art. 46-54"],
  "trabalhista": ["CLT Art. 1-922", "CF/88 Art. 7º"],
};

export function LegalReferencesPanel({ editorHtml, documentCategory }: LegalReferencesPanelProps) {
  const [activeTheme, setActiveTheme] = useState<string | null>(null);
  const references = useMemo(() => extractReferences(editorHtml), [editorHtml]);
  const relatedLaws = documentCategory ? RELATED_LEGISLATION[documentCategory] || [] : [];

  // Detect themes using keyword extractor
  const themes = useMemo(() => {
    const plainText = editorHtml.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ");
    return detectThemes(plainText);
  }, [editorHtml]);

  const grouped = useMemo(() => {
    const groups: Record<string, LegalReference[]> = {};
    for (const ref of references) {
      if (!groups[ref.type]) groups[ref.type] = [];
      groups[ref.type].push(ref);
    }
    return groups;
  }, [references]);

  // Filter references by active theme keywords
  const filteredGrouped = useMemo(() => {
    if (!activeTheme) return grouped;
    const theme = themes.find((t) => t.label === activeTheme);
    if (!theme) return grouped;

    const themeKeywords = theme.keywords.map((k) => k.toLowerCase());
    const filtered: Record<string, LegalReference[]> = {};

    for (const [type, refs] of Object.entries(grouped)) {
      const matchedRefs = refs.filter((ref) =>
        themeKeywords.some((kw) => ref.normalized.toLowerCase().includes(kw))
      );
      if (matchedRefs.length > 0) filtered[type] = matchedRefs;
    }

    return filtered;
  }, [grouped, activeTheme, themes]);

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        {/* Summary */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Scale className="h-4 w-4 text-primary" />
          <span><strong className="text-foreground">{references.length}</strong> referência{references.length !== 1 ? "s" : ""} detectada{references.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Detected Themes */}
        {themes.length > 0 && (
          <div className="space-y-1.5">
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Tag className="h-3 w-3" />
              Temas Detectados
            </h4>
            <div className="flex flex-wrap gap-1">
              {themes.map((theme) => (
                <button
                  key={theme.label}
                  onClick={() => setActiveTheme(activeTheme === theme.label ? null : theme.label)}
                  className="group"
                >
                  <Badge
                    variant={activeTheme === theme.label ? "default" : "outline"}
                    className={`text-[8px] h-5 px-1.5 cursor-pointer transition-colors ${
                      activeTheme === theme.label
                        ? "bg-primary text-primary-foreground"
                        : "hover:bg-accent"
                    }`}
                  >
                    {theme.label}
                    <span className="ml-1 opacity-60">{Math.round(theme.score * 100)}%</span>
                    {activeTheme === theme.label && <X className="h-2.5 w-2.5 ml-0.5" />}
                  </Badge>
                </button>
              ))}
            </div>
            {activeTheme && (
              <p className="text-[9px] text-muted-foreground">
                Filtrando referências por: <strong className="text-foreground">{activeTheme}</strong>
              </p>
            )}
          </div>
        )}

        {references.length === 0 && (
          <div className="text-center py-8">
            <Scale className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">Nenhuma referência legal detectada.</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">Adicione artigos de lei, súmulas ou jurisprudência ao documento.</p>
          </div>
        )}

        {/* Grouped references */}
        {Object.entries(filteredGrouped).map(([type, refs]) => {
          const config = TYPE_CONFIG[type] || TYPE_CONFIG.lei;
          const Icon = config.icon;
          return (
            <div key={type} className="space-y-1.5">
              <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Icon className="h-3 w-3" />
                {config.label} ({refs.length})
              </h4>
              <div className="space-y-1">
                {refs.map((ref, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 group">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <Badge variant="outline" className={`text-[8px] h-4 px-1 shrink-0 ${config.color}`}>
                        {ref.count > 1 ? `×${ref.count}` : config.label}
                      </Badge>
                      <span className="text-[11px] text-foreground truncate">{ref.normalized}</span>
                    </div>
                    <a
                      href={config.searchUrl(ref.normalized)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      title="Buscar online"
                    >
                      <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-primary" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* Related legislation */}
        {relatedLaws.length > 0 && (
          <div className="space-y-1.5 pt-2 border-t border-border">
            <h4 className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <BookOpen className="h-3 w-3" />
              Legislação Relacionada
            </h4>
            <div className="space-y-1">
              {relatedLaws.map((law, i) => (
                <div key={i} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                  <span className="w-1 h-1 rounded-full bg-primary/50 shrink-0" />
                  <span>{law}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
