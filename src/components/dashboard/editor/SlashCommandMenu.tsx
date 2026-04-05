import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import {
  Heading1, Heading2, Heading3, List, ListOrdered, Minus, Quote, Table as TableIcon,
  ImagePlus, Code, CheckSquare, Variable, Type, LayoutList
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface SlashCommandItem {
  title: string;
  description: string;
  icon: ReactNode;
  category: string;
  command: (editor: any) => void;
}

export const slashCommands: SlashCommandItem[] = [
  // ── Texto ──
  {
    title: "Parágrafo",
    description: "Texto normal",
    icon: <Type className="h-4 w-4" />,
    category: "Texto",
    command: (editor) => editor.chain().focus().setParagraph().run(),
  },
  {
    title: "Título 1",
    description: "Título grande",
    icon: <Heading1 className="h-4 w-4" />,
    category: "Texto",
    command: (editor) => editor.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    title: "Título 2",
    description: "Subtítulo",
    icon: <Heading2 className="h-4 w-4" />,
    category: "Texto",
    command: (editor) => editor.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    title: "Título 3",
    description: "Subtítulo menor",
    icon: <Heading3 className="h-4 w-4" />,
    category: "Texto",
    command: (editor) => editor.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  // ── Listas ──
  {
    title: "Lista",
    description: "Lista com marcadores",
    icon: <List className="h-4 w-4" />,
    category: "Listas",
    command: (editor) => editor.chain().focus().toggleBulletList().run(),
  },
  {
    title: "Lista Numerada",
    description: "Lista ordenada",
    icon: <ListOrdered className="h-4 w-4" />,
    category: "Listas",
    command: (editor) => editor.chain().focus().toggleOrderedList().run(),
  },
  // ── Blocos ──
  {
    title: "Citação",
    description: "Bloco de citação",
    icon: <Quote className="h-4 w-4" />,
    category: "Blocos",
    command: (editor) => editor.chain().focus().toggleBlockquote().run(),
  },
  {
    title: "Divisor",
    description: "Linha horizontal",
    icon: <Minus className="h-4 w-4" />,
    category: "Blocos",
    command: (editor) => editor.chain().focus().setHorizontalRule().run(),
  },
  {
    title: "Código",
    description: "Bloco de código",
    icon: <Code className="h-4 w-4" />,
    category: "Blocos",
    command: (editor) => editor.chain().focus().toggleCodeBlock().run(),
  },
  // ── Avançado ──
  {
    title: "Tabela",
    description: "Tabela 3×3",
    icon: <TableIcon className="h-4 w-4" />,
    category: "Avançado",
    command: (editor) => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    title: "Campo de Formulário",
    description: "Campo preenchível",
    icon: <Variable className="h-4 w-4" />,
    category: "Avançado",
    command: (editor) => editor.chain().focus().insertContent({
      type: "formField",
      attrs: { fieldType: "text", label: "Campo", value: "", options: "" },
    }).run(),
  },
];

interface SlashCommandMenuProps {
  editor: any;
  query: string;
  range: { from: number; to: number };
  onClose: () => void;
}

export function SlashCommandMenu({ editor, query, range, onClose }: SlashCommandMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const filtered = slashCommands.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.description.toLowerCase().includes(query.toLowerCase())
  );

  const selectItem = useCallback(
    (index: number) => {
      const item = filtered[index];
      if (!item) return;
      editor.chain().focus().deleteRange(range).run();
      item.command(editor);
      onClose();
    },
    [editor, filtered, range, onClose]
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => (i + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        selectItem(selectedIndex);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [filtered.length, selectedIndex, selectItem, onClose]);

  // Scroll selected into view
  useEffect(() => {
    const el = menuRef.current?.querySelector(`[data-index="${selectedIndex}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIndex]);

  if (filtered.length === 0) {
    return (
      <div className="slash-command-menu rounded-lg border border-border bg-popover p-2 shadow-xl w-64">
        <p className="text-xs text-muted-foreground px-2 py-1">Nenhum comando encontrado</p>
      </div>
    );
  }

  // Group by category
  const categories = Array.from(new Set(filtered.map((i) => i.category)));
  let globalIdx = 0;

  return (
    <div ref={menuRef} className="slash-command-menu rounded-lg border border-border bg-popover shadow-xl w-64 max-h-72 overflow-y-auto">
      {categories.map((cat) => {
        const items = filtered.filter((i) => i.category === cat);
        return (
          <div key={cat}>
            <div className="px-3 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              {cat}
            </div>
            {items.map((item) => {
              const idx = globalIdx++;
              return (
                <button
                  key={item.title}
                  data-index={idx}
                  type="button"
                  className={cn(
                    "flex items-center gap-3 w-full px-3 py-2 text-left text-sm transition-colors",
                    idx === selectedIndex
                      ? "bg-accent text-accent-foreground"
                      : "text-popover-foreground hover:bg-accent/50"
                  )}
                  onClick={() => selectItem(idx)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                >
                  <span className="flex items-center justify-center h-8 w-8 rounded-md border border-border bg-background text-muted-foreground">
                    {item.icon}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-xs">{item.title}</div>
                    <div className="text-[10px] text-muted-foreground truncate">{item.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
