import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useRef } from "react";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3, List, ListOrdered,
  Quote, Minus, Link as LinkIcon, Image as ImageIcon,
  AlignLeft, AlignCenter, AlignRight, Highlighter, Undo, Redo,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface PublicacaoEditorProps {
  content: string;
  onChange: (content: string) => void;
}

function markdownToHtml(md: string): string {
  let html = md;
  html = html.replace(/^### (.+)$/gm, "<h3>$1</h3>");
  html = html.replace(/^## (.+)$/gm, "<h2>$1</h2>");
  html = html.replace(/^# (.+)$/gm, "<h1>$1</h1>");
  html = html.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.+?)\*/g, "<em>$1</em>");
  html = html.replace(/~~(.+?)~~/g, "<s>$1</s>");
  html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  html = html.replace(/^---$/gm, "<hr>");
  html = html.replace(/^> (.+)$/gm, "<blockquote><p>$1</p></blockquote>");
  html = html.replace(/^- (.+)$/gm, "<li>$1</li>");
  html = html.replace(/(<li>.*<\/li>\n?)+/g, (match) => `<ul>${match}</ul>`);
  const lines = html.split("\n\n");
  html = lines
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return "";
      if (/^<(h[1-3]|ul|ol|blockquote|hr|li)/.test(trimmed)) return trimmed;
      return `<p>${trimmed}</p>`;
    })
    .join("");
  return html;
}

function htmlToMarkdown(html: string): string {
  let md = html;
  md = md.replace(/<h1[^>]*>(.*?)<\/h1>/gi, "# $1\n\n");
  md = md.replace(/<h2[^>]*>(.*?)<\/h2>/gi, "## $1\n\n");
  md = md.replace(/<h3[^>]*>(.*?)<\/h3>/gi, "### $1\n\n");
  md = md.replace(/<strong>(.*?)<\/strong>/gi, "**$1**");
  md = md.replace(/<b>(.*?)<\/b>/gi, "**$1**");
  md = md.replace(/<em>(.*?)<\/em>/gi, "*$1*");
  md = md.replace(/<i>(.*?)<\/i>/gi, "*$1*");
  md = md.replace(/<u>(.*?)<\/u>/gi, "$1");
  md = md.replace(/<s>(.*?)<\/s>/gi, "~~$1~~");
  md = md.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gis, "> $1\n\n");
  md = md.replace(/<a href="([^"]*)"[^>]*>(.*?)<\/a>/gi, "[$2]($1)");
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, "![$2]($1)");
  md = md.replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, "![]($1)");
  md = md.replace(/<hr\s*\/?>/gi, "\n---\n\n");
  md = md.replace(/<li[^>]*>(.*?)<\/li>/gi, "- $1\n");
  md = md.replace(/<\/?[uo]l[^>]*>/gi, "\n");
  md = md.replace(/<p[^>]*>(.*?)<\/p>/gi, "$1\n\n");
  md = md.replace(/<br\s*\/?>/gi, "\n");
  md = md.replace(/<[^>]+>/g, "");
  md = md.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  md = md.replace(/\n{3,}/g, "\n\n");
  return md.trim();
}

const ToolBtn = ({
  onClick,
  active,
  children,
  title,
}: {
  onClick: () => void;
  active?: boolean;
  children: React.ReactNode;
  title: string;
}) => (
  <Button
    type="button"
    variant="ghost"
    size="icon"
    className={`h-7 w-7 ${active ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
    onClick={onClick}
    title={title}
  >
    {children}
  </Button>
);

export function PublicacaoEditor({ content, onChange }: PublicacaoEditorProps) {
  const isInternalUpdate = useRef(false);

  // Detect if content looks like markdown (has ** or ## etc)
  const isMarkdown = /(\*\*|^#{1,3}\s|^- |\[.*\]\(.*\))/m.test(content);
  const initialHtml = isMarkdown ? markdownToHtml(content) : (content || "<p></p>");

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ link: false }),
      Link.configure({ openOnClick: false }),
      Underline,
      Highlight,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image,
      Placeholder.configure({ placeholder: "Escreva o conteúdo do artigo aqui..." }),
    ],
    content: initialHtml,
    onUpdate: ({ editor }) => {
      isInternalUpdate.current = true;
      // Store as HTML to preserve formatting
      const html = editor.getHTML();
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: "prose prose-sm dark:prose-invert max-w-none min-h-[300px] p-4 focus:outline-none",
      },
    },
  });

  useEffect(() => {
    if (editor && !isInternalUpdate.current && !editor.isFocused) {
      const newIsMarkdown = /(\*\*|^#{1,3}\s|^- |\[.*\]\(.*\))/m.test(content);
      const newHtml = newIsMarkdown ? markdownToHtml(content) : content;
      if (editor.getHTML() !== newHtml) {
        editor.commands.setContent(newHtml);
      }
    }
    isInternalUpdate.current = false;
  }, [content, editor]);

  if (!editor) return null;

  return (
    <div className="border border-border rounded-md overflow-hidden bg-card">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 p-1.5 border-b border-border bg-muted/50">
        <ToolBtn onClick={() => editor.chain().focus().undo().run()} title="Desfazer">
          <Undo className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().redo().run()} title="Refazer">
          <Redo className="h-3.5 w-3.5" />
        </ToolBtn>

        <div className="w-px h-5 bg-border mx-1" />

        <ToolBtn onClick={() => editor.chain().focus().toggleBold().run()} active={editor.isActive("bold")} title="Negrito">
          <Bold className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleItalic().run()} active={editor.isActive("italic")} title="Itálico">
          <Italic className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleUnderline().run()} active={editor.isActive("underline")} title="Sublinhado">
          <UnderlineIcon className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleStrike().run()} active={editor.isActive("strike")} title="Tachado">
          <Strikethrough className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHighlight().run()} active={editor.isActive("highlight")} title="Destaque">
          <Highlighter className="h-3.5 w-3.5" />
        </ToolBtn>

        <div className="w-px h-5 bg-border mx-1" />

        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} active={editor.isActive("heading", { level: 1 })} title="Título 1">
          <Heading1 className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} active={editor.isActive("heading", { level: 2 })} title="Título 2">
          <Heading2 className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} active={editor.isActive("heading", { level: 3 })} title="Título 3">
          <Heading3 className="h-3.5 w-3.5" />
        </ToolBtn>

        <div className="w-px h-5 bg-border mx-1" />

        <ToolBtn onClick={() => editor.chain().focus().toggleBulletList().run()} active={editor.isActive("bulletList")} title="Lista">
          <List className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Lista Numerada">
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Citação">
          <Quote className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Linha">
          <Minus className="h-3.5 w-3.5" />
        </ToolBtn>

        <div className="w-px h-5 bg-border mx-1" />

        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("left").run()} active={editor.isActive({ textAlign: "left" })} title="Esquerda">
          <AlignLeft className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Centro">
          <AlignCenter className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn onClick={() => editor.chain().focus().setTextAlign("right").run()} active={editor.isActive({ textAlign: "right" })} title="Direita">
          <AlignRight className="h-3.5 w-3.5" />
        </ToolBtn>

        <div className="w-px h-5 bg-border mx-1" />

        <ToolBtn
          onClick={() => {
            const url = window.prompt("URL do link:");
            if (url) editor.chain().focus().setLink({ href: url }).run();
          }}
          active={editor.isActive("link")}
          title="Link"
        >
          <LinkIcon className="h-3.5 w-3.5" />
        </ToolBtn>
        <ToolBtn
          onClick={() => {
            const url = window.prompt("URL da imagem:");
            if (url) editor.chain().focus().setImage({ src: url }).run();
          }}
          title="Imagem"
        >
          <ImageIcon className="h-3.5 w-3.5" />
        </ToolBtn>
      </div>

      {/* Editor */}
      <EditorContent editor={editor} />
    </div>
  );
}
