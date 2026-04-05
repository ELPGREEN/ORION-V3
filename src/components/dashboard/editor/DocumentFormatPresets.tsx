import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Settings2 } from "lucide-react";
import type { Editor } from "@tiptap/react";
import { toast } from "@/hooks/use-toast";

export interface FormatPreset {
  id: string;
  label: string;
  category: string;
  fontFamily: string;
  fontSize: string;
  lineHeight: string;
  textAlign: string;
  standard?: string;
  description?: string;
}

const PRESETS: FormatPreset[] = [
  // Padrões Brasileiros
  {
    id: "peticao",
    label: "Petição Judicial",
    category: "Jurídico",
    fontFamily: "Times New Roman",
    fontSize: "12pt",
    lineHeight: "1.5",
    textAlign: "justify",
    standard: "CNJ",
    description: "Times 12pt, 1.5, justificado, recuo 12.5mm, títulos centralizados",
  },
  {
    id: "contrato",
    label: "Contrato",
    category: "Jurídico",
    fontFamily: "Times New Roman",
    fontSize: "12pt",
    lineHeight: "1.5",
    textAlign: "justify",
    description: "Times 12pt, 1.5, justificado, cláusulas numeradas",
  },
  {
    id: "parecer",
    label: "Parecer Jurídico",
    category: "Jurídico",
    fontFamily: "Times New Roman",
    fontSize: "12pt",
    lineHeight: "1.5",
    textAlign: "justify",
    standard: "OAB",
    description: "Times 12pt, 1.5, justificado, seções com numeração",
  },
  {
    id: "sentenca",
    label: "Sentença / Decisão",
    category: "Jurídico",
    fontFamily: "Times New Roman",
    fontSize: "12pt",
    lineHeight: "2",
    textAlign: "justify",
    standard: "CNJ",
    description: "Times 12pt, espaçamento duplo, justificado",
  },
  {
    id: "recurso",
    label: "Recurso / Apelação",
    category: "Jurídico",
    fontFamily: "Times New Roman",
    fontSize: "12pt",
    lineHeight: "1.5",
    textAlign: "justify",
    description: "Times 12pt, 1.5, justificado, recuo 12.5mm",
  },
  // ABNT
  {
    id: "abnt",
    label: "ABNT NBR 14724",
    category: "Acadêmico",
    fontFamily: "Times New Roman",
    fontSize: "12pt",
    lineHeight: "1.5",
    textAlign: "justify",
    standard: "ABNT",
    description: "Times 12pt, 1.5, justificado, recuo 12.5mm, margens 3/2cm",
  },
  {
    id: "academico",
    label: "Artigo Acadêmico",
    category: "Acadêmico",
    fontFamily: "Times New Roman",
    fontSize: "12pt",
    lineHeight: "1.5",
    textAlign: "justify",
    standard: "ABNT",
    description: "Times 12pt, 1.5, justificado, notas 10pt",
  },
  // Monografia ABNT
  {
    id: "monografia-abnt",
    label: "Monografia ABNT NBR 14724",
    category: "Acadêmico",
    fontFamily: "Times New Roman",
    fontSize: "12pt",
    lineHeight: "1.5",
    textAlign: "justify",
    standard: "ABNT NBR 14724",
    description: "Times 12pt, 1.5, justificado, recuo 1.25cm, margens 3/2cm, citações 4cm recuo 10pt",
  },
  {
    id: "artigo-abnt",
    label: "Artigo Científico ABNT",
    category: "Acadêmico",
    fontFamily: "Times New Roman",
    fontSize: "12pt",
    lineHeight: "1.5",
    textAlign: "justify",
    standard: "ABNT",
    description: "Times 12pt, 1.5, justificado, notas 10pt, referências ABNT NBR 6023",
  },
  // Internacionais
  {
    id: "us-legal",
    label: "US Legal",
    category: "Internacional",
    fontFamily: "Times New Roman",
    fontSize: "12pt",
    lineHeight: "2",
    textAlign: "left",
    standard: "US Courts",
    description: "Times 12pt, double-spaced, left-aligned",
  },
  {
    id: "eu-contract",
    label: "EU Contract",
    category: "Internacional",
    fontFamily: "Arial",
    fontSize: "11pt",
    lineHeight: "1.5",
    textAlign: "justify",
    description: "Arial 11pt, 1.5, justified",
  },
  // Compacto
  {
    id: "compact",
    label: "Compacto",
    category: "Outros",
    fontFamily: "Arial",
    fontSize: "10pt",
    lineHeight: "1.15",
    textAlign: "left",
    description: "Arial 10pt, espaçamento mínimo",
  },
];

interface DocumentFormatPresetsProps {
  editor: Editor;
  onPresetApplied?: (preset: FormatPreset) => void;
}

export function DocumentFormatPresets({ editor, onPresetApplied }: DocumentFormatPresetsProps) {
  const applyPreset = (preset: FormatPreset) => {
    // Save current cursor position
    const { from, to } = editor.state.selection;

    // Apply font family
    (editor.chain().focus() as any).setFontFamily(preset.fontFamily).run();

    // Apply font size via textStyle
    editor.chain().focus().setMark("textStyle", { fontSize: preset.fontSize }).run();

    // Apply text alignment to all content
    editor.chain().focus().selectAll().setTextAlign(preset.textAlign as any).run();

    // Apply line height to all paragraphs and headings via setNodeAttribute
    {
      const positions: number[] = [];
      editor.state.doc.descendants((node: any, pos: number) => {
        if (node.type.name === "paragraph" || node.type.name === "heading") {
          positions.push(pos);
        }
      });
      if (positions.length > 0) {
        let chain = editor.chain();
        for (const pos of positions) {
          chain = chain.command(({ tr }: any) => {
            tr.setNodeAttribute(pos, "lineHeight", preset.lineHeight);
            return true;
          });
        }
        chain.run();
      }
    }

    // Restore cursor position
    try {
      const docSize = editor.state.doc.content.size;
      const safeFrom = Math.min(from, docSize);
      const safeTo = Math.min(to, docSize);
      editor.chain().setTextSelection({ from: safeFrom, to: safeTo }).run();
    } catch { /* ignore */ }

    onPresetApplied?.(preset);

    toast({
      title: `Estilo "${preset.label}" aplicado`,
      description: preset.description || `${preset.fontFamily} ${preset.fontSize}, espaçamento ${preset.lineHeight}`,
    });
  };

  const groupedPresets = PRESETS.reduce(
    (acc, p) => {
      if (!acc[p.category]) acc[p.category] = [];
      acc[p.category].push(p);
      return acc;
    },
    {} as Record<string, FormatPreset[]>
  );

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" title="Presets de Formatação">
          <Settings2 className="h-3.5 w-3.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-2" align="start">
        <p className="text-[10px] font-medium text-muted-foreground mb-2 px-1">Presets de Formatação</p>
        {Object.entries(groupedPresets).map(([category, presets]) => (
          <div key={category} className="mb-2">
            <p className="text-[9px] uppercase text-muted-foreground/60 px-2 mb-1">{category}</p>
            {presets.map((preset) => (
              <button
                key={preset.id}
                className="w-full text-left px-2 py-1.5 rounded text-xs hover:bg-accent hover:text-accent-foreground transition-colors"
                onClick={() => applyPreset(preset)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{preset.label}</span>
                  {preset.standard && (
                    <span className="text-[9px] bg-primary/10 text-primary px-1 rounded">{preset.standard}</span>
                  )}
                </div>
                {preset.description && (
                  <p className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{preset.description}</p>
                )}
              </button>
            ))}
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}
