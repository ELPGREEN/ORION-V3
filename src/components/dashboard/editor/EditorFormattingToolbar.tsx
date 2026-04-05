import { useState, useRef, type RefObject, type ChangeEvent } from "react";
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  IndentIncrease,
  IndentDecrease,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Undo,
  Redo,
  Minus,
  ImagePlus,
  Type,
  Table as TableIcon,
  Link as LinkIcon,
  Superscript as SuperscriptIcon,
  Subscript as SubscriptIcon,
  Search,
  ChevronDown,
  Variable,
  LayoutList,
  Quote,
  XCircle,
  Sparkles,
  Scale,
  RefreshCw,
  ArrowUpRight,
  Scissors,
  FileText,
  Bookmark,
  GraduationCap,
  Shield,
  FileSignature,
  Languages,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { DocumentFormatPresets } from "@/components/dashboard/editor/DocumentFormatPresets";
import { toast } from "sonner";

// ─── Constants ───
const FONT_SIZES = [
  "6pt","7pt","8pt","9pt","10pt","11pt","12pt","14pt","16pt","18pt",
  "20pt","24pt","28pt","32pt","36pt","48pt","64pt","72pt",
];

const FONT_FAMILIES = [
  { label: "Times New Roman", value: "Times New Roman" },
  { label: "Arial", value: "Arial" },
  { label: "Courier New", value: "Courier New" },
  { label: "Calibri", value: "Calibri" },
  { label: "Garamond", value: "Garamond" },
  { label: "Playfair Display", value: "Playfair Display" },
  { label: "Lora", value: "Lora" },
  { label: "Merriweather", value: "Merriweather" },
  { label: "Old Standard TT", value: "Old Standard TT" },
  { label: "Libre Baskerville", value: "Libre Baskerville" },
  { label: "Crimson Text", value: "Crimson Text" },
  { label: "EB Garamond", value: "EB Garamond" },
  { label: "Cormorant Garamond", value: "Cormorant Garamond" },
  { label: "Spectral", value: "Spectral" },
  { label: "Source Serif 4", value: "Source Serif 4" },
  { label: "PT Serif", value: "PT Serif" },
  { label: "Cinzel", value: "Cinzel" },
];

const LINE_HEIGHTS = ["0.5","0.75","1","1.15","1.5","1.75","2","2.5","3"];

const FONT_COLORS = [
  { label: "Preto", value: "#000000" },
  { label: "Vermelho escuro", value: "#8B0000" },
  { label: "Vermelho", value: "#DC2626" },
  { label: "Azul", value: "#2563EB" },
  { label: "Azul escuro", value: "#1E3A5F" },
  { label: "Verde", value: "#16A34A" },
  { label: "Cinza", value: "#6B7280" },
  { label: "Marrom", value: "#92400E" },
];

const HIGHLIGHT_COLORS = [
  { label: "Amarelo", value: "#FEF08A" },
  { label: "Verde", value: "#BBF7D0" },
  { label: "Rosa", value: "#FBCFE8" },
  { label: "Azul claro", value: "#BFDBFE" },
  { label: "Laranja", value: "#FED7AA" },
  { label: "Sem destaque", value: "" },
];

// ─── ToolbarButton ───
function ToolbarButton({
  children,
  onClick,
  active,
  disabled,
  title,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
}) {
  return (
    <Button
      variant="ghost"
      size="icon"
      className={`h-7 w-7 rounded-md transition-all duration-150 ${
        active
          ? "bg-primary/15 text-primary ring-1 ring-primary/25 shadow-sm"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/80 hover:shadow-sm"
      } ${disabled ? "opacity-40" : ""}`}
      onClick={onClick}
      onMouseDown={(e) => e.preventDefault()}
      disabled={disabled}
      title={title}
      type="button"
    >
      {children}
    </Button>
  );
}

/** Safely access editor.view */
function safeView(editor: any) {
  try { return editor?.view ?? null; } catch { return null; }
}

// ─── Props ───
interface EditorFormattingToolbarProps {
  editor: any;
  onAIAction?: (
    action: string,
    selectedText: string,
    nodeContext?: { nodeName: string; headingLevel?: number }
  ) => void;
  rulerLeftIndent: number;
  setRulerLeftIndent: (v: number) => void;
  showFindReplace: boolean;
  setShowFindReplace: (v: boolean) => void;
  docxImportRef: RefObject<HTMLInputElement | null>;
  handleDocxImport: (e: ChangeEvent<HTMLInputElement>) => void;
}

export function EditorFormattingToolbar({
  editor,
  onAIAction,
  rulerLeftIndent,
  setRulerLeftIndent,
  showFindReplace,
  setShowFindReplace,
  docxImportRef,
  handleDocxImport,
}: EditorFormattingToolbarProps) {
  const [fontColorOpen, setFontColorOpen] = useState(false);
  const [highlightColorOpen, setHighlightColorOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derived from editor — considers both textStyle marks and node context
  const textStyleAttrs = editor.getAttributes("textStyle");
  const currentFontFamily = textStyleAttrs.fontFamily || "Arial";
  const currentFontSize = textStyleAttrs.fontSize || "12pt";
  const currentColor = textStyleAttrs.color || "#000000";

  // Read current line height from the active paragraph/heading node
  const currentLineHeight =
    editor.getAttributes("paragraph").lineHeight ||
    editor.getAttributes("heading").lineHeight ||
    "1.5";

  const setFontSize = (size: string) => {
    editor.chain().focus().setMark("textStyle", { fontSize: size }).run();
  };

  const setLineHeight = (height: string) => {
    const { from, to } = editor.state.selection;
    const positions: number[] = [];
    editor.state.doc.nodesBetween(from, to, (node: any, pos: number) => {
      if (node.type.name === "paragraph" || node.type.name === "heading") {
        positions.push(pos);
      }
    });
    if (positions.length > 0) {
      let chain = editor.chain().focus();
      for (const pos of positions) {
        chain = chain.command(({ tr }: any) => {
          tr.setNodeAttribute(pos, "lineHeight", height);
          return true;
        });
      }
      chain.run();
    }
  };

  /** Change indent for each selected block individually (relative to its own current value) */
  const changeIndent = (delta: number) => {
    const { from, to } = editor.state.selection;
    const positions: { pos: number; newIndent: number }[] = [];
    editor.state.doc.nodesBetween(from, to, (node: any, pos: number) => {
      if (node.type.name === "paragraph" || node.type.name === "heading") {
        const current = node.attrs.indent || 0;
        const newIndent = Math.max(0, Math.min(current + delta, 320));
        positions.push({ pos, newIndent });
      }
    });
    if (positions.length > 0) {
      let chain = editor.chain().focus();
      for (const { pos, newIndent } of positions) {
        chain = chain.command(({ tr }: any) => {
          tr.setNodeAttribute(pos, "indent", newIndent);
          return true;
        });
      }
      chain.run();
      setRulerLeftIndent(positions[positions.length - 1].newIndent);
    }
  };

  const handleInsertImage = () => { fileInputRef.current?.click(); };
  const handleFileSelected = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result as string;
      editor.chain().focus().insertContent({ type: "imageResize", attrs: { src: base64 } }).run();
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };
  const handleInsertTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
  };
  const handleSetLink = () => {
    const previousUrl = editor.getAttributes("link").href;
    const url = window.prompt("URL do link:", previousUrl);
    if (url === null) return;
    if (url === "") { editor.chain().focus().extendMarkRange("link").unsetLink().run(); return; }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  /** Helper for AI action buttons that require text selection */
  const doAIAction = (action: string, requireSelection = true) => {
    if (!onAIAction) return;
    const sel = editor.state.selection;
    if (requireSelection && sel.empty) {
      toast.info("Selecione um trecho de texto para usar esta ferramenta de IA.");
      return;
    }
    const text = editor.state.doc.textBetween(sel.from, sel.to, " ");
    const $from = sel.$from;
    const nodeName = $from.parent.type.name;
    const headingLevel = nodeName === "heading" ? $from.parent.attrs?.level : undefined;
    onAIAction(action, text, { nodeName, headingLevel });
  };

  return (
    <div
      className="flex items-center flex-wrap gap-0.5 px-3 py-1.5 border-b border-border/40 bg-card/95 backdrop-blur-md shrink-0 sticky top-0 z-20"
      role="toolbar"
      aria-label="Barra de formatação"
    >
      {/* Font Family */}
      <select
        value={currentFontFamily}
        onChange={(e) => (editor.chain().focus() as any).setFontFamily(e.target.value).run()}
        className="h-7 text-[10px] bg-background border border-border/60 rounded-sm px-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 hover:border-border transition-colors"
        title="Família da Fonte"
      >
        {FONT_FAMILIES.map((f) => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>

      <select
        value={currentFontSize}
        onChange={(e) => setFontSize(e.target.value)}
        className="h-7 text-[10px] bg-background border border-border/60 rounded-sm px-1.5 w-14 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 hover:border-border transition-colors"
        title="Tamanho da Fonte"
      >
        {FONT_SIZES.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <select
        value={currentLineHeight}
        onChange={(e) => setLineHeight(e.target.value)}
        className="h-7 text-[10px] bg-background border border-border/60 rounded-sm px-1.5 w-12 text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 hover:border-border transition-colors"
        title="Espaçamento entre Linhas"
      >
        {LINE_HEIGHTS.map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <ToolbarButton onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Desfazer"><Undo className="h-3.5 w-3.5" /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Refazer"><Redo className="h-3.5 w-3.5" /></ToolbarButton>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <ToolbarButton onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Negrito"><Bold className="h-3.5 w-3.5" /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Itálico"><Italic className="h-3.5 w-3.5" /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Sublinhado"><UnderlineIcon className="h-3.5 w-3.5" /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Riscado"><Strikethrough className="h-3.5 w-3.5" /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleSuperscript().run()} active={editor.isActive("superscript")} title="Sobrescrito"><SuperscriptIcon className="h-3.5 w-3.5" /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleSubscript().run()} active={editor.isActive("subscript")} title="Subscrito"><SubscriptIcon className="h-3.5 w-3.5" /></ToolbarButton>

      <Separator orientation="vertical" className="h-6 mx-1" />

      {/* Font Color */}
      <Popover open={fontColorOpen} onOpenChange={setFontColorOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground relative" title="Cor do Texto" type="button">
            <Type className="h-3.5 w-3.5" />
            <span className="absolute bottom-0.5 left-1 right-1 h-0.5 rounded-full" style={{ backgroundColor: currentColor }} />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="grid grid-cols-4 gap-1">
            {FONT_COLORS.map((c) => (
              <button
                key={c.value}
                className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                style={{ backgroundColor: c.value }}
                title={c.label}
                onClick={() => { editor.chain().focus().setColor(c.value).run(); setFontColorOpen(false); }}
              />
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Highlight Color */}
      <Popover open={highlightColorOpen} onOpenChange={setHighlightColorOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={`h-7 w-7 ${editor.isActive("highlight") ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
            title="Cor de Destaque"
            type="button"
          >
            <Highlighter className="h-3.5 w-3.5" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="grid grid-cols-3 gap-1">
            {HIGHLIGHT_COLORS.map((c) => (
              <button
                key={c.value || "none"}
                className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform flex items-center justify-center text-[8px]"
                style={{ backgroundColor: c.value || "transparent" }}
                title={c.label}
                onClick={() => {
                  if (!c.value) { editor.chain().focus().unsetHighlight().run(); }
                  else { editor.chain().focus().toggleHighlight({ color: c.value }).run(); }
                  setHighlightColorOpen(false);
                }}
              >
                {!c.value && "✕"}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Título 1"><Heading1 className="h-3.5 w-3.5" /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Título 2"><Heading2 className="h-3.5 w-3.5" /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Título 3"><Heading3 className="h-3.5 w-3.5" /></ToolbarButton>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Esquerda"><AlignLeft className="h-3.5 w-3.5" /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Centralizar"><AlignCenter className="h-3.5 w-3.5" /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Direita"><AlignRight className="h-3.5 w-3.5" /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setTextAlign("justify").run()} active={editor.isActive({ textAlign: "justify" })} title="Justificar"><AlignJustify className="h-3.5 w-3.5" /></ToolbarButton>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <ToolbarButton
        onClick={() => changeIndent(-40)}
        title="Diminuir Recuo (Shift+Tab)"
      >
        <IndentDecrease className="h-3.5 w-3.5" />
      </ToolbarButton>
      <ToolbarButton
        onClick={() => changeIndent(40)}
        title="Aumentar Recuo (Tab)"
      >
        <IndentIncrease className="h-3.5 w-3.5" />
      </ToolbarButton>

      <Separator orientation="vertical" className="h-6 mx-1" />

      <ToolbarButton onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Lista"><List className="h-3.5 w-3.5" /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Lista Numerada"><ListOrdered className="h-3.5 w-3.5" /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Citação / Blockquote"><Quote className="h-3.5 w-3.5" /></ToolbarButton>
      <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Linha Horizontal"><Minus className="h-3.5 w-3.5" /></ToolbarButton>
      <ToolbarButton onClick={handleInsertImage} title="Inserir Imagem"><ImagePlus className="h-3.5 w-3.5" /></ToolbarButton>
      <ToolbarButton onClick={handleInsertTable} title="Inserir Tabela"><TableIcon className="h-3.5 w-3.5" /></ToolbarButton>

      {/* Multi-Column Layout */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="h-7 px-1.5 rounded hover:bg-accent/50 flex items-center gap-0.5 text-muted-foreground hover:text-foreground" title="Layout Multi-Coluna">
            <LayoutList className="h-3.5 w-3.5" />
            <ChevronDown className="h-2.5 w-2.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="text-xs">
          <DropdownMenuItem onClick={() => editor.chain().focus().insertContent({ type: "multiColumnBlock", attrs: { layout: "newspaper", columns: 2 }, content: [{ type: "paragraph", content: [{ type: "text", text: "Coluna 1..." }] }, { type: "paragraph", content: [{ type: "text", text: "Coluna 2..." }] }] }).run()}>
            📰 Colunas Jornal (2)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().insertContent({ type: "multiColumnBlock", attrs: { layout: "newspaper", columns: 3 }, content: [{ type: "paragraph", content: [{ type: "text", text: "Col 1" }] }, { type: "paragraph", content: [{ type: "text", text: "Col 2" }] }, { type: "paragraph", content: [{ type: "text", text: "Col 3" }] }] }).run()}>
            📰 Colunas Jornal (3)
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => editor.chain().focus().insertContent({ type: "multiColumnBlock", attrs: { layout: "flex-row", columns: 2 }, content: [{ type: "columnItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Bloco A" }] }] }, { type: "columnItem", content: [{ type: "paragraph", content: [{ type: "text", text: "Bloco B" }] }] }] }).run()}>
            ↔️ Flexbox (2 blocos)
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().insertContent({ type: "multiColumnBlock", attrs: { layout: "grid-2x2", columns: 2 }, content: [{ type: "columnItem", content: [{ type: "paragraph", content: [{ type: "text", text: "1" }] }] }, { type: "columnItem", content: [{ type: "paragraph", content: [{ type: "text", text: "2" }] }] }, { type: "columnItem", content: [{ type: "paragraph", content: [{ type: "text", text: "3" }] }] }, { type: "columnItem", content: [{ type: "paragraph", content: [{ type: "text", text: "4" }] }] }] }).run()}>
            ▦ Grid 2×2
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => editor.chain().focus().insertContent({ type: "multiColumnBlock", attrs: { layout: "grid-3", columns: 3 }, content: [{ type: "columnItem", content: [{ type: "paragraph", content: [{ type: "text", text: "1" }] }] }, { type: "columnItem", content: [{ type: "paragraph", content: [{ type: "text", text: "2" }] }] }, { type: "columnItem", content: [{ type: "paragraph", content: [{ type: "text", text: "3" }] }] }] }).run()}>
            ▦ Grid 3 colunas
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ToolbarButton onClick={handleSetLink} active={editor.isActive("link")} title="Link"><LinkIcon className="h-3.5 w-3.5" /></ToolbarButton>
      <ToolbarButton
        onClick={() => {
          editor.chain().focus().insertContent({
            type: "formField",
            attrs: { fieldType: "text", label: "Campo", value: "", options: "" },
          }).run();
        }}
        title="Inserir Campo de Formulário"
      >
        <Variable className="h-3.5 w-3.5" />
      </ToolbarButton>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileSelected} />
      <input ref={docxImportRef} type="file" accept=".docx,.doc" className="hidden" onChange={handleDocxImport} />

      <Separator orientation="vertical" className="h-6 mx-1" />

      <ToolbarButton onClick={() => setShowFindReplace(!showFindReplace)} active={showFindReplace} title="Buscar e Substituir"><Search className="h-3.5 w-3.5" /></ToolbarButton>

      {/* Clear all marks */}
      <ToolbarButton
        onClick={() => {
          const markType = editor.schema.marks.suggestion;
          if (markType) {
            const { from, to } = editor.state.selection;
            const isFullDoc = from === to;
            if (isFullDoc) {
              const ranges: { from: number; to: number }[] = [];
              editor.state.doc.descendants((node: any, pos: number) => {
                node.marks.forEach((mark: any) => {
                  if (mark.type.name === "suggestion") {
                    ranges.push({ from: pos, to: pos + node.nodeSize });
                  }
                });
              });
              if (ranges.length > 0) {
                const tr = editor.state.tr;
                for (let i = ranges.length - 1; i >= 0; i--) {
                  tr.removeMark(ranges[i].from, ranges[i].to, markType);
                }
                if (tr.docChanged) {
                  try { const v = safeView(editor); if (v) v.dispatch(tr); } catch { /* */ }
                }
              }
            } else {
              editor.chain().focus().unsetMark("suggestion").run();
            }
          }
        }}
        title="Limpar Marcações IA"
      >
        <XCircle className="h-3.5 w-3.5" />
      </ToolbarButton>

      <DocumentFormatPresets editor={editor} />

      {/* ── AI Actions ── */}
      {onAIAction && (
        <>
          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Transformar dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="flex items-center gap-1 rounded-md px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors">
                <LayoutList className="h-3.5 w-3.5" />Transformar<ChevronDown className="h-2.5 w-2.5 opacity-50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="min-w-[180px]">
              <DropdownMenuItem className="text-xs gap-2" onSelect={(e) => { e.preventDefault(); setTimeout(() => editor.chain().focus().setParagraph().run(), 10); }}>
                <Type className="h-3.5 w-3.5 text-muted-foreground" />Parágrafo
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs gap-2" onSelect={(e) => { e.preventDefault(); setTimeout(() => editor.chain().focus().toggleHeading({ level: 1 }).run(), 10); }}>
                <Heading1 className="h-3.5 w-3.5 text-muted-foreground" />Título 1
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs gap-2" onSelect={(e) => { e.preventDefault(); setTimeout(() => editor.chain().focus().toggleHeading({ level: 2 }).run(), 10); }}>
                <Heading2 className="h-3.5 w-3.5 text-muted-foreground" />Título 2
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs gap-2" onSelect={(e) => { e.preventDefault(); setTimeout(() => editor.chain().focus().toggleHeading({ level: 3 }).run(), 10); }}>
                <Heading3 className="h-3.5 w-3.5 text-muted-foreground" />Título 3
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs gap-2" onSelect={(e) => { e.preventDefault(); setTimeout(() => editor.chain().focus().toggleBlockquote().run(), 10); }}>
                <Quote className="h-3.5 w-3.5 text-muted-foreground" />Citação ABNT
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs gap-2" onSelect={(e) => { e.preventDefault(); setTimeout(() => editor.chain().focus().toggleBulletList().run(), 10); }}>
                <List className="h-3.5 w-3.5 text-muted-foreground" />Lista
              </DropdownMenuItem>
              <DropdownMenuItem className="text-xs gap-2" onSelect={(e) => { e.preventDefault(); setTimeout(() => editor.chain().focus().toggleOrderedList().run(), 10); }}>
                <ListOrdered className="h-3.5 w-3.5 text-muted-foreground" />Lista Numerada
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-xs gap-2" onSelect={(e) => { e.preventDefault(); setTimeout(() => editor.chain().focus().setHorizontalRule().run(), 10); }}>
                <Minus className="h-3.5 w-3.5 text-muted-foreground" />Linha Horizontal
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="h-6 mx-0.5" />

          <ToolbarButton onClick={() => doAIAction("melhorar")} title="Melhorar com IA"><Sparkles className="h-3.5 w-3.5" /></ToolbarButton>
          <ToolbarButton onClick={() => doAIAction("citacao")} title="Buscar citação legal"><Scale className="h-3.5 w-3.5" /></ToolbarButton>
          <ToolbarButton onClick={() => doAIAction("reformular")} title="Reformular"><RefreshCw className="h-3.5 w-3.5" /></ToolbarButton>

          <Separator orientation="vertical" className="h-6 mx-0.5" />

          <ToolbarButton onClick={() => doAIAction("expandir")} title="Expandir"><ArrowUpRight className="h-3.5 w-3.5" /></ToolbarButton>
          <ToolbarButton onClick={() => doAIAction("simplificar")} title="Simplificar"><Scissors className="h-3.5 w-3.5" /></ToolbarButton>
          <ToolbarButton onClick={() => doAIAction("resumir")} title="Resumir"><FileText className="h-3.5 w-3.5" /></ToolbarButton>
          <ToolbarButton onClick={() => doAIAction("fundamentar")} title="Fundamentar"><Bookmark className="h-3.5 w-3.5" /></ToolbarButton>
          <ToolbarButton onClick={() => doAIAction("formalizar")} title="Formalizar"><GraduationCap className="h-3.5 w-3.5" /></ToolbarButton>
          <ToolbarButton onClick={() => doAIAction("contra_argumentar")} title="Contra-argumentar"><Shield className="h-3.5 w-3.5" /></ToolbarButton>
          <ToolbarButton onClick={() => doAIAction("nota_rodape")} title="Nota de rodapé"><FileSignature className="h-3.5 w-3.5" /></ToolbarButton>
          <ToolbarButton onClick={() => doAIAction("traduzir")} title="Traduzir"><Languages className="h-3.5 w-3.5" /></ToolbarButton>
        </>
      )}
    </div>
  );
}
