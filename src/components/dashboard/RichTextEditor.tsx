import { useEditor, EditorContent, Extension } from "@tiptap/react";
import { CITACAO_LEGAL_RE, JURISPRUDENCIA_RE, EMENTA_RE, ASSINATURA_RE, LISTA_RE } from "@/lib/analysis/contentTypeDetector";
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-caret";
import { useCollaboration } from "@/hooks/useCollaboration";
import { useDocumentPresence } from "@/hooks/useDocumentPresence";
import { useDocumentLock } from "@/hooks/useDocumentLock";
import { DocumentPresenceBar } from "@/components/dashboard/editor/DocumentPresenceBar";
import { BubbleMenu } from "@tiptap/react/menus";
import { SlashCommandExtension, getSlashCommandState } from "@/components/dashboard/editor/SlashCommandExtension";
import { SlashCommandMenu } from "@/components/dashboard/editor/SlashCommandMenu";
import { BlockHandle } from "@/components/dashboard/editor/BlockHandle";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import { Color } from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import CharacterCount from "@tiptap/extension-character-count";
import ImageResize from "tiptap-extension-resize-image";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
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
  TableIcon,
  Link as LinkIcon,
  Superscript as SuperscriptIcon,
  Subscript as SubscriptIcon,
  Search,
  ZoomIn,
  ZoomOut,
  Maximize,
  Minimize,
  ChevronUp,
  RefreshCw,
  Copy,
  Printer,
  PlusCircle,
  History,
  ShieldAlert,
  Lock,
  Unlock,
  PenTool,
  FolderOpen,
  Download,
  Share2,
  ChevronDown,
  Loader2,
  Scale,
  FileDown,
  FileText,
  Variable,
  Eye,
  EyeOff,
  LayoutList,
  Quote,
  ShieldCheck,
  FileUp,
  Sparkles,
  Languages,
  FileSignature,
  Bookmark,
  Wand2,
  ArrowUpRight,
  Scissors,
  GraduationCap,
  Shield,
  MessageSquareText,
  AlignVerticalSpaceAround } from
"lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger } from
"@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator } from
"@/components/ui/dropdown-menu";
import { type ReactNode, useEffect, useRef, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { createPortal } from "react-dom";
import { SearchAndReplace } from "@/components/dashboard/editor/SearchAndReplace";
import { PageBreakSpacerExtension } from "@/components/dashboard/editor/PageBreakSpacerExtension";
import { MultiColumnBlock, ColumnItem } from "@/components/dashboard/editor/MultiColumnExtension";
import { FindReplaceBar } from "@/components/dashboard/editor/FindReplaceBar";
import { DicionarioPopover } from "@/components/dashboard/editor/DicionarioPopover";
import { EditorRuler } from "@/components/dashboard/editor/EditorRuler";
import { EditorVerticalRuler, validatePageGeometry } from "@/components/dashboard/editor/EditorVerticalRuler";
import { FormFieldExtension } from "@/components/dashboard/editor/FormFieldExtension";
import { DocumentFormatPresets } from "@/components/dashboard/editor/DocumentFormatPresets";
import { WatermarkControl, WatermarkCSS, type WatermarkConfig } from "@/components/dashboard/editor/WatermarkOverlay";
import { getQualityLabel } from "@/lib/analysis";
import { CommentMark } from "@/components/dashboard/editor/CommentMark";
import { SuggestionMark } from "@/components/dashboard/editor/SuggestionMark";
import type { Comment, Suggestion, ActivityEvent } from "@/components/dashboard/editor/types";
import { DocumentOutline } from "@/components/dashboard/editor/DocumentOutline";
import { DocumentContextAnalysisPanel } from "@/components/dashboard/editor/DocumentContextAnalysisPanel";
import { LegalReferencesPanel } from "@/components/dashboard/editor/LegalReferencesPanel";
import { AIProgressIndicator } from "@/components/dashboard/editor/AIProgressIndicator";
import { LegalReferenceSearch } from "@/components/dashboard/editor/LegalReferenceSearch";
import { PageNavigator } from "@/components/dashboard/editor/PageNavigator";
import { useDocumentLinting } from "@/hooks/useDocumentLinting";
import { PageBreakOverlay } from "@/components/dashboard/editor/PageBreakOverlay";
import { FloatingPageIndicator } from "@/components/dashboard/editor/FloatingPageIndicator";
import { EditorPageFrame } from "@/components/dashboard/editor/EditorPageFrame";
import { getUsableHeight, getSpacerBase, BRANDED_MARGIN_TOP_PX, BRANDED_RESERVED_BOTTOM_PX, STD_MARGIN_TOP_PX, STD_MARGIN_BOTTOM_PX, EDITOR_WORKSPACE_BG_HSL, PAGE_HEIGHT_PX } from "@/components/dashboard/editor/pageConstants";
import { isBrandedDocument } from "@/lib/generators";
import { AlertTriangle, Brain, XCircle, Info as InfoIcon, BarChart3, BookOpen, Lightbulb, Ruler, Settings, PanelTop, Crown } from "lucide-react";
import { EditorFormattingToolbar } from "@/components/dashboard/editor/EditorFormattingToolbar";
import { EditorCanvasArea } from "@/components/dashboard/editor/EditorCanvasArea";
import { EditorTabPanels } from "@/components/dashboard/editor/EditorTabPanels";
import { EditorStatusBar } from "@/components/dashboard/editor/EditorStatusBar";

/** Safely access editor.view (TipTap v3 throws if not mounted) */
function safeView(editor: any) {
  try {return editor?.view ?? null;} catch {return null;}
}

// ─── Custom FontSize extension ───
const FontSize = Extension.create({
  name: "fontSize",
  addGlobalAttributes() {
    return [
    {
      types: ["textStyle"],
      attributes: {
        fontSize: {
          default: null,
          parseHTML: (el) => el.style.fontSize?.replace(/['"]+/g, "") || null,
          renderHTML: (attrs) => {
            if (!attrs.fontSize) return {};
            return { style: `font-size: ${attrs.fontSize}` };
          }
        }
      }
    }];

  }
});

// ─── Custom LineHeight extension ───
const LineHeight = Extension.create({
  name: "lineHeight",
  addGlobalAttributes() {
    return [
    {
      types: ["paragraph", "heading"],
      attributes: {
        lineHeight: {
          default: null,
          parseHTML: (el) => el.style.lineHeight || null,
          renderHTML: (attrs) => {
            if (!attrs.lineHeight) return {};
            return { style: `line-height: ${attrs.lineHeight}` };
          }
        }
      }
    }];

  }
});

// ─── Shared refs so Enter/Backspace handlers can read ruler's current values ───
// Module-level state is required because TipTap extensions are created outside React.
// Safe as long as only ONE editor instance exists at a time.
const _rulerState = { left: 0, firstLine: 0, right: 0 };
export function setRulerIndentRef(v: number) {_rulerState.left = v;}
export function setRulerFirstLineIndentRef(v: number) {_rulerState.firstLine = v;}
export function setRulerRightIndentRef(v: number) {_rulerState.right = v;}
export function getRulerIndentRef() {return _rulerState.left;}
export function getRulerFirstLineIndentRef() {return _rulerState.firstLine;}
export function getRulerRightIndentRef() {return _rulerState.right;}

// ─── Custom Indent extension (Tab / Shift+Tab / Enter / Backspace) ───
// Tab = text-indent (first line only); Indent/Outdent buttons = margin-left (whole paragraph)
// Enter = applies all 3 ruler values; Backspace at start = removes indent step by step
const Indent = Extension.create({
  name: "indent",
  addGlobalAttributes() {
    return [
    {
      types: ["paragraph", "heading"],
      attributes: {
        indent: {
          default: null,
          parseHTML: (el) => {
            const ml = el.style.marginLeft;
            if (!ml) return null;
            return parseInt(ml, 10) || 0;
          },
          renderHTML: (attrs) => {
            if (attrs.indent === null || attrs.indent === undefined) return {};
            if (attrs.indent <= 0) return { style: `margin-left: 0px` };
            return { style: `margin-left: ${attrs.indent}px` };
          }
        },
        textIndent: {
          default: null,
          parseHTML: (el) => {
            const ti = el.style.textIndent;
            if (!ti) return null;
            return parseInt(ti, 10) || 0;
          },
          renderHTML: (attrs) => {
            if (attrs.textIndent === null || attrs.textIndent === undefined) return {};
            if (attrs.textIndent <= 0) return { style: `text-indent: 0px` };
            return { style: `text-indent: ${attrs.textIndent}px` };
          }
        },
        marginRight: {
          default: null,
          parseHTML: (el) => {
            // Support both margin-right and legacy padding-right
            const mr = el.style.marginRight || el.style.paddingRight;
            if (!mr) return null;
            return parseInt(mr, 10) || 0;
          },
          renderHTML: (attrs) => {
            if (attrs.marginRight === null || attrs.marginRight === undefined) return {};
            if (attrs.marginRight <= 0) return { style: `margin-right: 0px` };
            return { style: `margin-right: ${attrs.marginRight}px` };
          }
        }
      }
    }];

  },
  addKeyboardShortcuts() {
    return {
      Tab: ({ editor }) => {
        if (editor.isActive("listItem")) {
          return editor.chain().sinkListItem("listItem").run();
        }
        if (editor.isActive("table")) {
          return editor.chain().goToNextCell().run();
        }
        // Tab = text-indent (first line only) — per-node
        const { from, to } = editor.state.selection;
        const positions: { pos: number; newVal: number }[] = [];
        editor.state.doc.nodesBetween(from, to, (node: any, pos: number) => {
          if (node.type.name === "paragraph" || node.type.name === "heading") {
            const current = node.attrs.textIndent || 0;
            positions.push({ pos, newVal: Math.min(current + 40, 320) });
          }
        });
        if (positions.length > 0) {
          let chain = editor.chain().focus();
          for (const { pos, newVal } of positions) {
            chain = chain.command(({ tr }: any) => {
              tr.setNodeAttribute(pos, "textIndent", newVal);
              return true;
            });
          }
          chain.run();
        }
        return positions.length > 0;
      },
      "Shift-Tab": ({ editor }) => {
        if (editor.isActive("listItem")) {
          return editor.chain().liftListItem("listItem").run();
        }
        if (editor.isActive("table")) {
          return editor.chain().goToPreviousCell().run();
        }
        // Shift+Tab = reduce text-indent — per-node
        const { from, to } = editor.state.selection;
        const positions: { pos: number; newVal: number }[] = [];
        editor.state.doc.nodesBetween(from, to, (node: any, pos: number) => {
          if (node.type.name === "paragraph" || node.type.name === "heading") {
            const current = node.attrs.textIndent || 0;
            if (current > 0) {
              positions.push({ pos, newVal: Math.max(current - 40, 0) });
            }
          }
        });
        if (positions.length > 0) {
          let chain = editor.chain().focus();
          for (const { pos, newVal } of positions) {
            chain = chain.command(({ tr }: any) => {
              tr.setNodeAttribute(pos, "textIndent", newVal);
              return true;
            });
          }
          chain.run();
        }
        return positions.length > 0;
      },
      Enter: ({ editor }) => {
        // After TipTap splits the node, apply ALL 3 ruler values to the new paragraph
        const rulerLeft = _rulerState.left;
        const rulerFirstLine = _rulerState.firstLine;
        const rulerRight = _rulerState.right;
        queueMicrotask(() => {
          const nodeType = editor.isActive("heading") ? "heading" : "paragraph";
          if (editor.isActive(nodeType)) {
            editor.commands.updateAttributes(nodeType, {
              indent: rulerLeft,
              textIndent: rulerFirstLine,
              marginRight: rulerRight
            });
          }
        });
        return false; // let default Enter behavior proceed
      },
      Backspace: ({ editor }) => {
        // At the very start of a paragraph, remove indents step by step
        const { from } = editor.state.selection;
        const $from = editor.state.doc.resolve(from);
        const isAtStart = $from.parentOffset === 0;
        if (!isAtStart) return false; // normal backspace

        const nodeType = editor.isActive("heading") ? "heading" : "paragraph";
        const attrs = editor.getAttributes(nodeType);
        const currentTextIndent = attrs.textIndent || 0;
        const currentIndent = attrs.indent || 0;

        // Step 1: Remove text-indent first
        if (currentTextIndent > 0) {
          editor.commands.updateAttributes(nodeType, { textIndent: 0 });
          return true; // consumed
        }
        // Step 2: Remove margin-left
        if (currentIndent > 0) {
          editor.commands.updateAttributes(nodeType, { indent: 0 });
          return true; // consumed
        }
        return false; // let default backspace proceed (merge paragraphs)
      }
    };
  }
});

export type AIBubbleAction = "melhorar" | "citacao" | "reformular" | "verificar_referencia" | "expandir" | "simplificar" | "fundamentar" | "formalizar" | "contra_argumentar" | "traduzir" | "resumir" | "nota_rodape";

export interface AIBubbleActionPayload {
  action: AIBubbleAction;
  selectedText: string;
  nodeContext: {nodeName: string;headingLevel?: number;};
}

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  className?: string;
  onAIAction?: (action: AIBubbleAction, selectedText: string, nodeContext?: {nodeName: string;headingLevel?: number;}) => void;
  readOnly?: boolean;
  onSelectionChange?: (text: string) => void;
  onEditorReady?: (editor: any) => void;
  // Bar 1 action callbacks
  onImprove?: (mode: string) => void;
  onImproveWithDialog?: (mode: string) => void;
  onAggregate?: () => void;
  onPlanning?: () => void;
  onStartPipeline?: () => void;
  pipelineRunning?: boolean;
  planningLoading?: boolean;
  onCopy?: () => void;
  onPrint?: () => void;
  onSave?: () => void;
  onDownload?: () => void;
  onDownloadDocx?: () => void;
  onSignature?: () => void;
  onShare?: () => void;
  onRedaction?: () => void;
  onTemplates?: () => void;
  onUndoAI?: () => void;
  isDocProtected?: boolean;
  onToggleProtection?: () => void;
  qualityScore?: number | null;
  improving?: boolean;
  improvingLabel?: string;
  contentHistory?: number;
  savedDocId?: string | null;
  signatureStatus?: string | null;
  saving?: boolean;
  detectingGaps?: boolean;
  isAddingContent?: boolean;
  // Tab content
  previewContent?: ReactNode;
  settingsContent?: ReactNode;
  commentsContent?: ReactNode;
  suggestionsContent?: ReactNode;
  activityContent?: ReactNode;
  livePreviewContent?: ReactNode;
  // Document info
  documentLabel?: string;
  documentCategory?: string;
  documentTypeId?: string;
  forceLetterhead?: boolean;
  onForceLetterheadChange?: (v: boolean) => void;
  // Collaboration
  comments?: Comment[];
  suggestions?: Suggestion[];
  activityEvents?: ActivityEvent[];
  onAddComment?: (from: number, to: number, quotedText: string) => void;
  // Ruler control callback — exposes ruler setters to parent
  onRulerReady?: (setters: {setLeft: (v: number) => void;setFirstLine: (v: number) => void;setRight: (v: number) => void;}) => void;
  // Portal target for Bar 1 (renders toolbar into external container)
  bar1PortalTarget?: HTMLDivElement | null;
  // Fullscreen control from parent
  isFullscreen?: boolean;
  onFullscreenToggle?: () => void;
  onExternalChatMessage?: (msg: string) => void;
}

const FONT_SIZES = ["6pt", "7pt", "8pt", "9pt", "10pt", "11pt", "12pt", "14pt", "16pt", "18pt", "20pt", "24pt", "28pt", "32pt", "36pt", "48pt", "64pt", "72pt"];
const FONT_FAMILIES = [
// ── Padrão / Jurídico ──
{ label: "Times New Roman", value: "Times New Roman" },
{ label: "Arial", value: "Arial" },
{ label: "Courier New", value: "Courier New" },
{ label: "Calibri", value: "Calibri" },
{ label: "Garamond", value: "Garamond" },
// ── Serifs Clássicas (Jornal / Editorial) ──
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
{ label: "Cinzel", value: "Cinzel" }];

const LINE_HEIGHTS = ["0.5", "0.75", "1", "1.15", "1.5", "1.75", "2", "2.5", "3"];

const FONT_COLORS = [
{ label: "Preto", value: "#000000" },
{ label: "Vermelho escuro", value: "#8B0000" },
{ label: "Vermelho", value: "#DC2626" },
{ label: "Azul", value: "#2563EB" },
{ label: "Azul escuro", value: "#1E3A5F" },
{ label: "Verde", value: "#16A34A" },
{ label: "Cinza", value: "#6B7280" },
{ label: "Marrom", value: "#92400E" }];


const HIGHLIGHT_COLORS = [
{ label: "Amarelo", value: "#FEF08A" },
{ label: "Verde", value: "#BBF7D0" },
{ label: "Rosa", value: "#FBCFE8" },
{ label: "Azul claro", value: "#BFDBFE" },
{ label: "Laranja", value: "#FED7AA" },
{ label: "Sem destaque", value: "" }];


const SIGNATURE_BADGES: Record<string, {label: string;variant: "default" | "secondary" | "outline" | "destructive";}> = {
  pendente: { label: "Assinatura Pendente", variant: "outline" },
  enviado: { label: "Enviado p/ Assinatura", variant: "secondary" },
  assinado: { label: "Assinado ✓", variant: "default" },
  recusado: { label: "Assinatura Recusada", variant: "destructive" }
};

export function RichTextEditor({
  content,
  onChange,
  className,
  onAIAction,
  readOnly,
  onImprove,
  onImproveWithDialog,
  onAggregate,
  onPlanning,
  onStartPipeline,
  pipelineRunning,
  planningLoading,
  onCopy,
  onPrint,
  onSave,
  onDownload,
  onDownloadDocx,
  onSignature,
  onShare,
  onRedaction,
  onTemplates,
  onUndoAI,
  isDocProtected,
  onToggleProtection,
  qualityScore,
  improving,
  improvingLabel,
  contentHistory = 0,
  savedDocId,
  signatureStatus,
  saving,
  detectingGaps,
  isAddingContent,
  previewContent,
  settingsContent,
  commentsContent,
  suggestionsContent,
  activityContent,
  livePreviewContent,
  documentLabel,
  documentCategory,
  documentTypeId,
  forceLetterhead,
  onForceLetterheadChange,
  onSelectionChange,
  onEditorReady,
  comments,
  suggestions,
  activityEvents,
  onAddComment,
  onRulerReady,
  bar1PortalTarget,
  isFullscreen: isFullscreenProp,
  onFullscreenToggle,
  onExternalChatMessage
}: RichTextEditorProps) {
  const docxImportRef = useRef<HTMLInputElement>(null);
  const [importingDocx, setImportingDocx] = useState(false);
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [zoom, setZoom] = useState(100);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-fit zoom to scroll container width on mount and resize
  useEffect(() => {
    const container = scrollContainerRef.current ?? canvasContainerRef.current;
    if (!container) return;
    const calculateZoom = () => {
      const availableWidth = container.clientWidth - 48; // 24px padding each side
      const canvasWidth = 794; // A4 width at 96 DPI (210mm)
      if (availableWidth < canvasWidth) {
        const fitZoom = Math.floor((availableWidth / canvasWidth) * 100);
        setZoom(Math.max(50, Math.min(fitZoom, 100)));
      } else {
        setZoom(100);
      }
    };
    calculateZoom();
    const observer = new ResizeObserver(calculateZoom);
    observer.observe(container);
    return () => observer.disconnect();
  }, []);
  const [editorWatermark, setEditorWatermark] = useState<WatermarkConfig | null>(null);
  const [activeTab, setActiveTab] = useState("editar");
  const [showLivePreview, setShowLivePreview] = useState(false);
  // Use parent fullscreen if provided, otherwise local
  const [localFullscreen, setLocalFullscreen] = useState(false);
  const isFullscreen = onFullscreenToggle ? isFullscreenProp ?? false : localFullscreen;
  const toggleFullscreen = onFullscreenToggle || (() => setLocalFullscreen((f) => !f));

  // When exiting fullscreen, reset to "editar" tab
  const prevFullscreenRef = useRef(isFullscreen);
  useEffect(() => {
    if (prevFullscreenRef.current && !isFullscreen) {
      setActiveTab("editar");
    }
    prevFullscreenRef.current = isFullscreen;
  }, [isFullscreen]);
  const [dictSelectedText, setDictSelectedText] = useState("");
  const [outlineCollapsed, setOutlineCollapsed] = useState(true);
  const [showRuler, setShowRuler] = useState(true);
  const [showVerticalRuler, setShowVerticalRuler] = useState(false);
  // showLetterhead controls ONLY the visual preview in the editor (default: off)
  // forceLetterhead controls export behavior (PDF/DOCX) independently
  const [showLetterhead, setShowLetterhead] = useState(true);
  const [letterheadSrc, setLetterheadSrc] = useState<string | null>(null);

  // Pre-load letterhead image so it's ready if user toggles visual preview
  useEffect(() => {
    if (!letterheadSrc) {
      import("@/lib/generators").then((mod) => {
        mod.loadLetterheadImage().then((src) => setLetterheadSrc(src));
      });
    }
  }, []);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [scrollPageHeight, setScrollPageHeight] = useState(1123);
  const [editorPageBreaks, setEditorPageBreaks] = useState<number[]>([]);
  const [syncTrigger, setSyncTrigger] = useState(0);
  const { issues: lintIssues, errorCount: lintErrors, warningCount: lintWarnings, infoCount: lintInfos, totalCount: lintTotal } = useDocumentLinting({ html: content, documentCategory, enabled: true });

  // Auto-switch to suggestions tab when new pending suggestions arrive
  const prevPendingCountRef = useRef(0);
  useEffect(() => {
    const pendingCount = suggestions?.filter((s) => s.status === "pending").length || 0;
    if (pendingCount > prevPendingCountRef.current && pendingCount > 0) {
      setActiveTab("sugestoes");
    }
    prevPendingCountRef.current = pendingCount;
  }, [suggestions]);
  // Ruler indent state (px values relative to usable area)
  const [rulerLeftIndent, setRulerLeftIndent] = useState(0);
  const [rulerRightIndent, setRulerRightIndent] = useState(0);
  const [rulerFirstLineIndent, setRulerFirstLineIndent] = useState(Math.round(12.5 * 96 / 25.4)); // 12.5mm ABNT default
  // Saved selection for ruler drag (snapshot before drag steals focus)
  const rulerSelRef = useRef<{ from: number; to: number }>({ from: 0, to: 0 });
  const editorRefForRuler = useRef<any>(null);
  const handleRulerDragStart = useCallback(() => {
    const ed = editorRefForRuler.current;
    if (ed) {
      const { from, to } = ed.state.selection;
      rulerSelRef.current = { from, to };
    }
  }, []);
  // Keep module-level refs in sync with ruler values
  useEffect(() => {setRulerIndentRef(rulerLeftIndent);}, [rulerLeftIndent]);
  useEffect(() => {setRulerFirstLineIndentRef(rulerFirstLineIndent);}, [rulerFirstLineIndent]);
  useEffect(() => {setRulerRightIndentRef(rulerRightIndent);}, [rulerRightIndent]);
  const [slashMenuState, setSlashMenuState] = useState<{active: boolean;query: string;range: {from: number;to: number;};coords: {left: number;top: number;} | null;}>({ active: false, query: "", range: { from: 0, to: 0 }, coords: null });

  // ── Collaboration (Yjs + WebRTC) ──
  const { ydoc, provider, connectedPeers, isConnected } = useCollaboration({
    documentId: savedDocId || null,
    user: { name: "Você", color: "#f59e0b" },
    enabled: !!savedDocId
  });

  // ── Supabase Presence (Phase 1) ──
  const { presentUsers, otherUsers, totalViewers, updateEditingState } = useDocumentPresence({
    documentId: savedDocId || null,
    userName: "Você",
    enabled: !!savedDocId,
  });

  // ── Document Locking (Phase 2) ──
  const { isLockedByOther, isMyLock, lockOwnerName, acquireLock, releaseLock } = useDocumentLock({
    documentId: savedDocId || null,
    userName: "Você",
    enabled: !!savedDocId,
  });

  // Build collaboration extensions dynamically
  const collabExtensions = useMemo(() => {
    if (!ydoc || !provider) return [];
    return [
    Collaboration.configure({ document: ydoc }),
    CollaborationCursor.configure({
      provider: provider as any,
      user: { name: "Você", color: "#f59e0b" }
    })];

  }, [ydoc, provider]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      // Disable built-in link and underline — we configure them separately below
      link: false,
      underline: false,
    }),
    Underline,
    TextAlign.configure({
      types: ["heading", "paragraph"],
      alignments: ["left", "center", "right", "justify"],
      defaultAlignment: "justify"
    }),
    Highlight.configure({ multicolor: true }),
    TextStyle,
    Color,
    FontFamily.configure({
      types: ["textStyle"]
    }),
    FontSize,
    LineHeight,
    CharacterCount,
    ImageResize.configure({
      minWidth: 50,
      maxWidth: 800
    } as any),
    Table.configure({ resizable: true }),
    TableRow,
    TableCell,
    TableHeader,
    Link.configure({
      openOnClick: false,
      HTMLAttributes: { class: "text-primary underline cursor-pointer" }
    }),
    Placeholder.configure({
      placeholder: "Comece a redigir seu documento jurídico aqui..."
    }),
    Superscript,
    Subscript,
    SearchAndReplace,
    PageBreakSpacerExtension,
    FormFieldExtension,
    CommentMark,
    SuggestionMark,
    SlashCommandExtension,
    MultiColumnBlock,
    ColumnItem,
    Indent,
    ...collabExtensions],

    content: ydoc ? undefined : convertPlainTextToHtml(content),
    onUpdate: ({ editor }) => {
      // IMPORTANT: Do NOT strip suggestion spans here — they are needed for the
      // suggestion panel UI and accept/reject logic. Stripping is done only on
      // save/export in DocumentEditor.tsx (stripSuggestionSpans).
      const html = editor.getHTML();
      onChange(html);
    },
    editorProps: {
      attributes: {
        class: "focus:outline-none"
      }
    }
  });

  // Track when editor view is actually available (TipTap v3 defers view creation)
  const [isEditorMounted, setIsEditorMounted] = useState(false);
  useEffect(() => {
    if (!editor) return;
    // The 'create' event fires once the view is ready
    const onReady = () => setIsEditorMounted(true);
    if (safeView(editor)) {setIsEditorMounted(true);return;}
    editor.on("create", onReady);
    return () => {editor.off("create", onReady);};
  }, [editor]);

  // Make editor read-only when locked by another user or explicitly readOnly
  const effectiveReadOnly = readOnly || isLockedByOther;
  useEffect(() => {
    if (editor) {
      editor.setEditable(!effectiveReadOnly);
    }
  }, [effectiveReadOnly, editor]);

  // DOCX/DOC import handler — high-fidelity with docshift, mammoth fallback, .doc detection
  const handleDocxImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editor) return;
    const ext = file.name.toLowerCase().split(".").pop();
    if (!["docx", "doc"].includes(ext || "")) {
      toast.error("Selecione um arquivo .docx ou .doc");
      return;
    }
    setImportingDocx(true);

    // ── Post-process HTML for TipTap compatibility ──
    const postProcessHtml = (raw: string): string => {
      let html = raw;

      // ── Unit converter: cm/mm/in/pt → px for TipTap ──
      const toPx = (value: string): string => {
        const match = value.match(/^([\d.]+)\s*(cm|mm|in|pt|px|em|rem)?$/i);
        if (!match) return value;
        const num = parseFloat(match[1]);
        const unit = (match[2] || 'px').toLowerCase();
        switch (unit) {
          case 'cm': return `${Math.round(num * 37.7953)}px`;
          case 'mm': return `${Math.round(num * 3.77953)}px`;
          case 'in': return `${Math.round(num * 96)}px`;
          case 'pt': return `${Math.round(num * 1.3333)}px`;
          case 'em': return `${Math.round(num * 16)}px`;
          case 'rem': return `${Math.round(num * 16)}px`;
          default: return `${Math.round(num)}px`;
        }
      };

      // Convert all margin/indent/padding units to px
      html = html.replace(/(margin-left|margin-right|text-indent|padding-left|padding-right)\s*:\s*([\d.]+\s*(?:cm|mm|in|pt))/gi,
        (_m, prop, val) => `${prop}: ${toPx(val.trim())}`
      );

      // Convert line-height units if specified in pt/cm
      html = html.replace(/line-height\s*:\s*([\d.]+)\s*(?:pt)/gi,
        (_m, val) => `line-height: ${(parseFloat(val) / 12).toFixed(2)}`
      );

      // Preserve spacing-before/after as margin-top/bottom on paragraphs
      // (docshift sometimes outputs these as data attributes)
      html = html.replace(/spacing-before\s*:\s*([\d.]+\s*\w*)/gi,
        (_m, val) => `margin-top: ${toPx(val.trim())}`
      );
      html = html.replace(/spacing-after\s*:\s*([\d.]+\s*\w*)/gi,
        (_m, val) => `margin-bottom: ${toPx(val.trim())}`
      );

      // Normalize Word alignment values to valid CSS/Tiptap values
      html = html.replace(/text-align\s*:\s*both/gi, "text-align: justify");
      html = html.replace(/text-align\s*:\s*start/gi, "text-align: left");
      html = html.replace(/text-align\s*:\s*end/gi, "text-align: right");

      // ── Convert inline formatting to semantic tags ──
      // Bold
      html = html.replace(/<span([^>]*?)style="([^"]*?font-weight:\s*(?:bold|[7-9]\d{2})[^"]*?)"([^>]*?)>([\s\S]*?)<\/span>/gi,
        (_m, pre, style, post, content) => {
          const cleanStyle = style.replace(/font-weight:\s*(?:bold|\d+);?\s*/gi, '').trim();
          const inner = cleanStyle ? `<span${pre}style="${cleanStyle}"${post}>${content}</span>` : content;
          return `<strong>${inner}</strong>`;
        }
      );
      // Italic
      html = html.replace(/<span([^>]*?)style="([^"]*?font-style:\s*italic[^"]*?)"([^>]*?)>([\s\S]*?)<\/span>/gi,
        (_m, pre, style, post, content) => {
          const cleanStyle = style.replace(/font-style:\s*italic;?\s*/gi, '').trim();
          const inner = cleanStyle ? `<span${pre}style="${cleanStyle}"${post}>${content}</span>` : content;
          return `<em>${inner}</em>`;
        }
      );
      // Underline
      html = html.replace(/<span([^>]*?)style="([^"]*?text-decoration:\s*underline[^"]*?)"([^>]*?)>([\s\S]*?)<\/span>/gi,
        (_m, pre, style, post, content) => {
          const cleanStyle = style.replace(/text-decoration:\s*underline;?\s*/gi, '').trim();
          const inner = cleanStyle ? `<span${pre}style="${cleanStyle}"${post}>${content}</span>` : content;
          return `<u>${inner}</u>`;
        }
      );

      // ── Color: normalize named colors to hex ──
      html = html.replace(/(?:^|;)\s*color:\s*([a-zA-Z]+)\s*(?:;|")/gi, (match, colorName) => {
        const colorMap: Record<string, string> = {
          red: '#ff0000', blue: '#0000ff', green: '#008000', black: '#000000',
          white: '#ffffff', gray: '#808080', grey: '#808080', navy: '#000080',
          maroon: '#800000', purple: '#800080', orange: '#ffa500',
        };
        const hex = colorMap[colorName.toLowerCase()];
        return hex ? match.replace(colorName, hex) : match;
      });

      // ── Font family: keep as-is ──
      html = html.replace(/font-family:\s*["']?([^"';,]+)/gi, (_m, font) => {
        return `font-family: ${font.trim()}`;
      });

      // ── Cleanup ──
      html = html.replace(/<span\s*>([\s\S]*?)<\/span>/gi, '$1');
      html = html.replace(/style="\s*;\s*/gi, 'style="');
      html = html.replace(/;\s*"/gi, '"');
      html = html.replace(/style=""/gi, '');

      // ── Tables ──
      html = html.replace(/<table(?![^>]*style=)([^>]*)>/gi,
        '<table$1 style="border-collapse: collapse; width: 100%;">'
      );
      html = html.replace(/<td(?![^>]*style=)([^>]*)>/gi,
        '<td$1 style="border: 1px solid #ccc; padding: 4px 8px;">'
      );
      html = html.replace(/<th(?![^>]*style=)([^>]*)>/gi,
        '<th$1 style="border: 1px solid #ccc; padding: 4px 8px; font-weight: bold;">'
      );

      // ── Images ──
      html = html.replace(/<img([^>]*)>/gi, (_m, attrs) => {
        let imgTag = `<img${attrs}>`;
        if (!/width/i.test(attrs) && !/style="[^"]*width/i.test(attrs)) {
          imgTag = imgTag.replace('<img', '<img style="max-width: 100%; height: auto;"');
        }
        return imgTag;
      });

      return html;
    };

    type ImportedParagraphMeta = {
      text: string;
      indentLeftPx: number | null;
      indentRightPx: number | null;
      textIndentPx: number | null;
      textAlign: "left" | "center" | "right" | "justify" | null;
    };

    const normalizeImportedText = (value: string) =>
      value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim().toLowerCase();

    const extractNodeText = (node: any): string => {
      if (!node) return "";
      if (typeof node.value === "string") return node.value;
      if (Array.isArray(node.children)) return node.children.map(extractNodeText).join("");
      return "";
    };

    const twipsToPx = (value: string | number | null | undefined): number | null => {
      if (value === null || value === undefined || value === "") return null;
      const num = typeof value === "number" ? value : parseFloat(String(value));
      if (Number.isNaN(num)) return null;
      return Math.round((num / 1440) * 96);
    };

    const mapWordAlignment = (value: string | null | undefined): ImportedParagraphMeta["textAlign"] => {
      switch ((value || "").toLowerCase()) {
        case "both":
        case "justify":
          return "justify";
        case "center":
          return "center";
        case "right":
          return "right";
        case "left":
          return "left";
        default:
          return null;
      }
    };

    const extractParagraphMeta = async (arrayBuffer: ArrayBuffer): Promise<ImportedParagraphMeta[]> => {
      const mammoth = await import("mammoth");
      const paragraphTransform = (mammoth as any)?.transforms?.paragraph;
      const metas: ImportedParagraphMeta[] = [];

      if (typeof paragraphTransform !== "function") {
        return metas;
      }

      await mammoth.convertToHtml(
        { arrayBuffer },
        {
          includeDefaultStyleMap: true,
          transformDocument: paragraphTransform((paragraph: any) => {
            const text = normalizeImportedText(extractNodeText(paragraph));
            const firstLine = twipsToPx(paragraph?.indent?.firstLine);
            const hanging = twipsToPx(paragraph?.indent?.hanging);

            metas.push({
              text,
              indentLeftPx: twipsToPx(paragraph?.indent?.start),
              indentRightPx: twipsToPx(paragraph?.indent?.end),
              textIndentPx: hanging ? -hanging : firstLine,
              textAlign: mapWordAlignment(paragraph?.alignment),
            });

            return paragraph;
          }),
        } as any
      );

      return metas;
    };

    const applyParagraphMetaToHtml = (html: string, metas: ImportedParagraphMeta[]): string => {
      if (!metas.length) return html;

      const parser = new DOMParser();
      const doc = parser.parseFromString(`<div id="docx-import-root">${html}</div>`, "text/html");
      const root = doc.getElementById("docx-import-root");
      if (!root) return html;

      const blocks = Array.from(root.querySelectorAll<HTMLElement>("p, h1, h2, h3, h4, h5, h6"));
      let metaIndex = 0;

      for (const block of blocks) {
        const blockText = normalizeImportedText(block.textContent || "");
        if (!blockText) continue;

        let matchedIndex = -1;
        for (let i = metaIndex; i < Math.min(metas.length, metaIndex + 12); i += 1) {
          const metaText = metas[i]?.text;
          if (!metaText) continue;
          if (metaText === blockText || metaText.startsWith(blockText) || blockText.startsWith(metaText)) {
            matchedIndex = i;
            break;
          }
        }

        if (matchedIndex === -1) continue;

        metaIndex = matchedIndex + 1;
        const meta = metas[matchedIndex];

        if (meta.textAlign) block.style.textAlign = meta.textAlign;
        if (meta.indentLeftPx && meta.indentLeftPx > 0) block.style.marginLeft = `${meta.indentLeftPx}px`;
        if (meta.indentRightPx && meta.indentRightPx > 0) block.style.marginRight = `${meta.indentRightPx}px`;
        if (meta.textIndentPx !== null && meta.textIndentPx !== undefined) block.style.textIndent = `${meta.textIndentPx}px`;
      }

      return root.innerHTML;
    };

    const applyContent = (html: string) => {
      editor.commands.setContent(html);
      onChange(editor.getHTML());
      const detected = detectFullFormatFromHtml(html);
      if (detected.marginLeft > 0) setRulerLeftIndent(detected.marginLeft);
      if (detected.textIndent >= 0) setRulerFirstLineIndent(detected.textIndent);
      if (detected.paddingRight > 0) setRulerRightIndent(detected.paddingRight);
    };

    const validateHtml = (html: string): string | null => {
      const tempDiv = document.createElement("div");
      tempDiv.innerHTML = html;
      return (tempDiv.textContent || "").trim() || null;
    };

    // ── Handle .doc files ──
    if (ext === "doc") {
      try {
        // Check if it's actually a .docx with wrong extension (ZIP magic bytes)
        const buffer = await file.arrayBuffer();
        const bytes = new Uint8Array(buffer);
        if (bytes[0] === 0x50 && bytes[1] === 0x4B) {
          // It's a .docx in disguise — process as docx
          const renamedFile = new File([buffer], file.name.replace(/\.doc$/, ".docx"), {
            type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          });
          const paragraphMeta = await extractParagraphMeta(buffer).catch(() => []);
          try {
            const { toHtml } = await import("docshift");
            const html = applyParagraphMetaToHtml(postProcessHtml(await toHtml(renamedFile)), paragraphMeta);
            const text = validateHtml(html);
            if (text) {
              applyContent(html);
              toast.success(`DOC importado — ${text.split(/\s+/).filter(Boolean).length.toLocaleString("pt-BR")} palavras`);
              return;
            }
          } catch {
            // try mammoth below
          }
          const mammoth = await import("mammoth");
          const result = await mammoth.convertToHtml({ arrayBuffer: buffer }, { includeDefaultStyleMap: true });
          const html = applyParagraphMetaToHtml(postProcessHtml(result.value), paragraphMeta);
          const text = validateHtml(html);
          if (text) {
            applyContent(html);
            toast.success(`DOC importado — ${text.split(/\s+/).filter(Boolean).length.toLocaleString("pt-BR")} palavras`);
            return;
          }
        }
        // True .doc format
        toast.error("Formato .doc (Word 97-2003) não é suportado diretamente. Abra no Word ou Google Docs e salve como .docx.", { duration: 6000 });
      } catch (err) {
        toast.error("Formato .doc não suportado. Salve como .docx e tente novamente.", { duration: 5000 });
      } finally {
        setImportingDocx(false);
        if (docxImportRef.current) docxImportRef.current.value = "";
      }
      return;
    }

    // ── Handle .docx files ──
    try {
      const arrayBuffer = await file.arrayBuffer();
      const paragraphMeta = await extractParagraphMeta(arrayBuffer).catch(() => []);

      // Primary: docshift (best structural + style fidelity)
      const { toHtml } = await import("docshift");
      const html = applyParagraphMetaToHtml(postProcessHtml(await toHtml(file)), paragraphMeta);
      const text = validateHtml(html);
      if (!text) {
        toast.error("DOCX importado sem conteúdo de texto");
        return;
      }
      applyContent(html);
      const wc = text.split(/\s+/).filter(Boolean).length;
      const imgCount = (html.match(/<img/gi) || []).length;
      toast.success(`DOCX importado — ${wc.toLocaleString("pt-BR")} palavras${imgCount ? `, ${imgCount} imagem(ns)` : ""}`);
    } catch (err) {
      // Fallback: mammoth with rich style mapping
      try {
        const mammoth = await import("mammoth");
        const arrayBuffer = await file.arrayBuffer();
        const paragraphMeta = await extractParagraphMeta(arrayBuffer).catch(() => []);
        const result = await mammoth.convertToHtml({ arrayBuffer }, {
          includeDefaultStyleMap: true,
          convertImage: mammoth.images.imgElement(function(image: any) {
            return image.read("base64").then(function(imageBuffer: string) {
              return { src: `data:${image.contentType};base64,${imageBuffer}` };
            });
          }),
          styleMap: [
            "p[style-name='Heading 1'] => h1:fresh",
            "p[style-name='Heading 2'] => h2:fresh",
            "p[style-name='Heading 3'] => h3:fresh",
            "p[style-name='Title'] => h1:fresh",
            "p[style-name='Subtitle'] => h2:fresh",
            "p[style-name='List Paragraph'] => p:fresh",
            "p[style-name='Normal (Web)'] => p:fresh",
            "p[style-name='Body Text'] => p:fresh",
            "p[style-name='No Spacing'] => p:fresh",
            "r[style-name='Strong'] => strong",
            "r[style-name='Emphasis'] => em",
            "r[style-name='Intense Emphasis'] => em",
            "r[style-name='Book Title'] => strong > em:fresh",
            "b => strong",
            "i => em",
            "u => u",
            "strike => s",
            "comment-reference => sup",
          ],
        });
        const html = applyParagraphMetaToHtml(postProcessHtml(result.value), paragraphMeta);
        const imgCount = (html.match(/<img/gi) || []).length;
        const text = validateHtml(html);
        if (!text) {
          toast.error("DOCX importado sem conteúdo de texto");
          return;
        }
        applyContent(html);
        const wc = text.split(/\s+/).filter(Boolean).length;
        toast.success(`DOCX importado (mammoth) — ${wc.toLocaleString("pt-BR")} palavras${imgCount ? `, ${imgCount} imagem(ns)` : ""}`);
      } catch (err2) {
        toast.error("Erro ao importar DOCX");
      }
    } finally {
      setImportingDocx(false);
      if (docxImportRef.current) docxImportRef.current.value = "";
    }
  }, [editor, onChange]);

  // Auto-detect full formatting from imported content (DOCX/PDF)
  const prevContentRef = useRef(content);
  useEffect(() => {
    if (editor && content && !editor.isFocused) {
      const currentHtml = editor.getHTML();
      const newHtml = convertPlainTextToHtml(content);
      if (currentHtml !== newHtml) {
        editor.commands.setContent(newHtml);

        // If content changed significantly (import), detect ALL format values
        const prevPlain = prevContentRef.current?.replace(/<[^>]*>/g, "") || "";
        const newPlain = content.replace(/<[^>]*>/g, "") || "";
        if (Math.abs(newPlain.length - prevPlain.length) > 100 || prevPlain.length < 50) {
          const detected = detectFullFormatFromHtml(content);
          // Ruler
          if (detected.marginLeft > 0) setRulerLeftIndent(detected.marginLeft);
          if (detected.textIndent >= 0) setRulerFirstLineIndent(detected.textIndent);
          if (detected.paddingRight > 0) setRulerRightIndent(detected.paddingRight);

          // NON-DESTRUCTIVE: apply defaults only to nodes WITHOUT existing formatting
          // This preserves headings, bold, centered titles, etc.
          const { tr } = editor.state;
          let applied = false;
          editor.state.doc.descendants((node, pos) => {
            const isBlock = node.type.name === "paragraph" || node.type.name === "heading";
            if (!isBlock) return;

            const isHeading = node.type.name === "heading";

            // Font family: apply only to paragraphs (headings keep their own style)
            if (detected.fontFamily && !isHeading) {
              // Check if any text in this node already has a fontFamily mark
              let hasFontMark = false;
              node.descendants((child) => {
                if (child.marks?.some((m: any) => m.type.name === "textStyle" && m.attrs.fontFamily)) {
                  hasFontMark = true;
                }
              });
              if (!hasFontMark && node.textContent.length > 0) {
                const from = pos + 1;
                const to = pos + node.nodeSize - 1;
                const markType = editor.schema.marks.textStyle;
                if (markType) {
                  tr.addMark(from, to, markType.create({ fontFamily: detected.fontFamily }));
                  applied = true;
                }
              }
            }

            // Font size: apply only to paragraphs without existing fontSize
            if (detected.fontSize && !isHeading) {
              let hasSizeMark = false;
              node.descendants((child) => {
                if (child.marks?.some((m: any) => m.type.name === "textStyle" && m.attrs.fontSize)) {
                  hasSizeMark = true;
                }
              });
              if (!hasSizeMark && node.textContent.length > 0) {
                const from = pos + 1;
                const to = pos + node.nodeSize - 1;
                const markType = editor.schema.marks.textStyle;
                if (markType) {
                  tr.addMark(from, to, markType.create({ fontSize: detected.fontSize }));
                  applied = true;
                }
              }
            }

            // Line height: apply to all blocks without existing lineHeight
            if (detected.lineHeight && !node.attrs.lineHeight) {
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, lineHeight: detected.lineHeight });
              applied = true;
            }

            // Text align: apply only to paragraphs without existing textAlign (preserve heading alignment)
            if (detected.textAlign && !isHeading && (!node.attrs.textAlign || node.attrs.textAlign === "left")) {
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, textAlign: detected.textAlign });
              applied = true;
            }
          });

          if (applied) {
            try {const v = safeView(editor);if (v) v.dispatch(tr);} catch {/* view not ready */}
            editor.commands.focus("end");
          }
          // Build toast message
          const parts: string[] = [];
          if (detected.marginLeft > 0) parts.push(`Recuo: ${(detected.marginLeft / 37.8).toFixed(1)}cm`);
          if (detected.textIndent >= 0) parts.push(`1ª linha: ${(detected.textIndent / 37.8).toFixed(1)}cm`);
          if (detected.fontFamily) parts.push(`Fonte: ${detected.fontFamily}`);
          if (detected.fontSize) parts.push(`Tamanho: ${detected.fontSize}`);
          if (detected.lineHeight) parts.push(`Entrelinhas: ${detected.lineHeight}`);
          if (detected.textAlign) parts.push(`Alinhamento: ${detected.textAlign}`);
          if (parts.length > 0) {
            import("sonner").then(({ toast }) => {
              toast.success("Formatação detectada e aplicada", { description: parts.join(" • "), duration: 5000 });
            });
          }
        }
      }
      prevContentRef.current = content;
    }
  }, [content, editor]);

  // Keep ruler editor ref in sync
  useEffect(() => { editorRefForRuler.current = editor; }, [editor]);

  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      const state = getSlashCommandState(editor.state);
      if (state?.active) {
        // Get cursor coordinates for positioning
        try {
          const v = safeView(editor);
          if (!v) return;
          const coords = v.coordsAtPos(state.range.to);
          setSlashMenuState({
            active: true,
            query: state.query,
            range: state.range,
            coords: { left: coords.left, top: coords.bottom + 4 }
          });
        } catch {/* view not ready */}
      } else {
        setSlashMenuState((prev) => prev.active ? { active: false, query: "", range: { from: 0, to: 0 }, coords: null } : prev);
      }
    };
    editor.on("transaction", handler);
    return () => {editor.off("transaction", handler);};
  }, [editor]);

  // Propagate selection changes to parent + dictionary + ruler sync
  useEffect(() => {
    if (!editor) return;
    const handler = () => {
      const { from, to } = editor.state.selection;
      const text = from !== to ? editor.state.doc.textBetween(from, to, " ") : "";
      setDictSelectedText(text);
      onSelectionChange?.(text);
      // Sync ruler with current paragraph attributes
      const pAttrs = editor.getAttributes("paragraph");
      const hAttrs = editor.getAttributes("heading");
      const curIndent = pAttrs.indent ?? hAttrs.indent ?? 0;
      const curTextIndent = pAttrs.textIndent ?? hAttrs.textIndent;
      const curPaddingRight = pAttrs.marginRight ?? hAttrs.marginRight ?? pAttrs.paddingRight ?? hAttrs.paddingRight;
      setRulerLeftIndent(curIndent);
      if (curTextIndent !== undefined) setRulerFirstLineIndent(curTextIndent);
      if (curPaddingRight !== undefined) setRulerRightIndent(curPaddingRight);
    };
    editor.on("selectionUpdate", handler);
    editor.on("transaction", handler);
    return () => {editor.off("selectionUpdate", handler);editor.off("transaction", handler);};
  }, [editor, onSelectionChange]);

  // ── Page tracking: use only the writable page area shown in the editor ──
  const branded = !!forceLetterhead || isBrandedDocument(documentTypeId || documentLabel);
  const usablePageHeight = getUsableHeight(branded);
  const firstPageTopOffset = branded ? BRANDED_MARGIN_TOP_PX : STD_MARGIN_TOP_PX;

  useEffect(() => {
    const view = safeView(editor);
    if (!view?.dom) return;
    const dom = view.dom as HTMLElement;
    const scrollEl = scrollContainerRef.current;
    if (!scrollEl) return;

    const updatePages = () => {
      // Subtract spacer widget heights from total to get real content height
      const spacerWidgets = dom.querySelectorAll(".page-break-spacer-widget");
      let spacerTotal = 0;
      spacerWidgets.forEach((el) => {
        const h = (el as HTMLElement).getAttribute("data-spacer-height");
        spacerTotal += h ? parseInt(h, 10) : (el as HTMLElement).offsetHeight;
      });
      const contentHeight = Math.max(dom.scrollHeight - spacerTotal, usablePageHeight);
      // Use editorPageBreaks (from PageBreakOverlay) when available — they are calculated
      // from actual block positions and are more accurate than ceil-based estimation.
      // Fall back to ceil only when no breaks have been computed yet.
      const ceilTotal = Math.max(1, Math.ceil(contentHeight / usablePageHeight));
      const breakBasedTotal = editorPageBreaks.length > 0 ? editorPageBreaks.length + 1 : ceilTotal;
      // Use the smaller of the two to avoid ghost pages from rounding
      const total = Math.min(ceilTotal, breakBasedTotal) || breakBasedTotal;
      setTotalPages(total);

      // Current page: use scroll position relative to full DOM (including spacers)
      const avgSpacerPerPage = spacerWidgets.length > 0 ? spacerTotal / spacerWidgets.length : 0;
      const fullPageHeight = usablePageHeight + avgSpacerPerPage;
      setScrollPageHeight(fullPageHeight);
      const scrollTop = scrollEl.scrollTop;
      setCurrentPage(Math.min(total, Math.max(1, 1 + Math.floor(scrollTop / (fullPageHeight || usablePageHeight)))));
    };

    updatePages();
    const ro = new ResizeObserver(updatePages);
    ro.observe(dom);
    scrollEl.addEventListener("scroll", updatePages, { passive: true });

    return () => {
      ro.disconnect();
      scrollEl.removeEventListener("scroll", updatePages);
    };
  }, [editor, usablePageHeight, editorPageBreaks]);

  const scrollToPage = useCallback((page: number) => {
    const scrollEl = scrollContainerRef.current;
    if (!scrollEl) return;
    const targetY = Math.max(0, (page - 1) * usablePageHeight - 20);
    scrollEl.scrollTo({ top: targetY, behavior: "smooth" });
  }, [usablePageHeight]);

  // Expose editor instance to parent
  useEffect(() => {
    if (editor && onEditorReady) onEditorReady(editor);
  }, [editor, onEditorReady]);

  // Expose ruler setters to parent
  useEffect(() => {
    if (onRulerReady) {
      onRulerReady({
        setLeft: setRulerLeftIndent,
        setFirstLine: setRulerFirstLineIndent,
        setRight: setRulerRightIndent
      });
    }
  }, [onRulerReady]);

  // Keyboard shortcut: Ctrl+Shift+M → improve selection with AI
  useEffect(() => {
    if (!editor || !onAIAction) return;
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "m") {
        e.preventDefault();
        const { from, to } = editor.state.selection;
        if (from === to) return; // no selection
        const text = editor.state.doc.textBetween(from, to, " ");
        if (!text.trim()) return;
        const $from = editor.state.selection.$from;
        const nodeName = $from.parent.type.name;
        const headingLevel = nodeName === "heading" ? $from.parent.attrs?.level : undefined;
        onAIAction("melhorar", text, { nodeName, headingLevel });
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [editor, onAIAction]);

  if (!editor) return null;

  const currentFontFamily = editor.getAttributes("textStyle").fontFamily || "Arial";
  const currentFontSize = editor.getAttributes("textStyle").fontSize || "12pt";

  const wordCount = editor.storage.characterCount?.words() ?? 0;
  const charCount = editor.storage.characterCount?.characters() ?? 0;
  const estimatedPages = Math.max(1, Math.ceil(wordCount / 300));

  const hasBar1 = !!(onImprove || onSave || onDownload);

  const bar1Content = hasBar1 ?
  <div className="shrink-0 bg-card border-b border-border shadow-sm">
          {/* ═══ LINHA 1: IA + Ferramentas + Zoom ═══ */}
          <div className="flex items-center gap-1.5 px-3 py-2 overflow-hidden">
            {/* ── AI Group ── */}
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-gradient-to-r from-primary/8 to-primary/4 border border-primary/15 shrink-0">
              {onImproveWithDialog &&
        <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                     <Button variant="ghost" size="sm" className="h-7 text-xs text-primary hover:text-primary hover:bg-primary/10 px-2 font-semibold gap-1.5" disabled={improving}>
                      {improving ?
              <AIProgressIndicator active={true} label={improvingLabel} /> :
              <><Sparkles className="h-3.5 w-3.5" /><span className="hidden sm:inline">Aprimorar</span><ChevronDown className="h-3 w-3 opacity-60" /></>
              }
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-popover border border-border z-50 min-w-[240px]">
                    <DropdownMenuItem onClick={() => onImproveWithDialog("legal")} className="text-xs gap-2.5 py-2.5 cursor-pointer">
                      <RefreshCw className="h-4 w-4 text-primary" />
                      <div><div className="font-semibold">Aprimoramento Jurídico</div><div className="text-[10px] text-muted-foreground mt-0.5">Técnica jurídica, coerência e fundamentação</div></div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onImproveWithDialog("grammar")} className="text-xs gap-2.5 py-2.5 cursor-pointer">
                      <ShieldCheck className="h-4 w-4 text-accent" />
                      <div><div className="font-semibold">Revisão Gramatical</div><div className="text-[10px] text-muted-foreground mt-0.5">Gramática, ortografia e pontuação</div></div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onImproveWithDialog("style")} className="text-xs gap-2.5 py-2.5 cursor-pointer">
                      <Type className="h-4 w-4 text-primary/70" />
                      <div><div className="font-semibold">Melhoria de Estilo</div><div className="text-[10px] text-muted-foreground mt-0.5">Clareza, concisão e elegância</div></div>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onImproveWithDialog("abnt")} className="text-xs gap-2.5 py-2.5 cursor-pointer">
                      <AlignLeft className="h-4 w-4 text-muted-foreground" />
                      <div><div className="font-semibold">Formatar ABNT</div><div className="text-[10px] text-muted-foreground mt-0.5">Formatação conforme normas ABNT</div></div>
                    </DropdownMenuItem>
                    {onStartPipeline && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={onStartPipeline} disabled={pipelineRunning} className="text-xs gap-2.5 py-2.5 cursor-pointer">
                          <Crown className="h-4 w-4 text-primary" />
                          <div><div className="font-semibold">Pipeline Completo (9 Agentes)</div><div className="text-[10px] text-muted-foreground mt-0.5">Orquestração completa</div></div>
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
        }
              {onAggregate &&
        <Button variant="ghost" size="sm" className="h-7 text-xs text-primary hover:text-primary hover:bg-primary/10 px-2 font-medium gap-1" onClick={onAggregate} disabled={improving}>
                  <PlusCircle className="h-3.5 w-3.5" /><span className="hidden md:inline">Agregar</span>
                </Button>
        }
              {onPlanning &&
        <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-primary hover:text-primary hover:bg-primary/10 px-2 font-medium gap-1" disabled={improving || planningLoading || pipelineRunning}>
                      {(planningLoading || pipelineRunning) ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Brain className="h-3.5 w-3.5" />}
                      <span className="hidden md:inline">Planejar</span>
                      <ChevronDown className="h-3 w-3 opacity-60" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="bg-popover border border-border z-50 min-w-[300px] max-h-[420px] overflow-y-auto">
                    <DropdownMenuItem onClick={onPlanning} className="text-xs gap-2.5 py-2.5 cursor-pointer">
                      <Brain className="h-4 w-4 text-primary" />
                      <div><div className="font-semibold">Plano de Ação Rápido</div><div className="text-[10px] text-muted-foreground mt-0.5">Análise CoT e sugestões de melhoria</div></div>
                    </DropdownMenuItem>
                    {onStartPipeline && (
                      <>
                        <div className="px-3 py-2 mt-1 border-t border-border">
                          <div className="flex items-center gap-2">
                            <Crown className="h-4 w-4 text-primary" />
                            <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">Pipeline Jurídico Orquestrado</span>
                          </div>
                          <p className="text-[9px] text-muted-foreground mt-1">8 agentes autônomos coordenados pelo orquestrador</p>
                        </div>
                        <DropdownMenuItem onClick={onStartPipeline} disabled={pipelineRunning} className="text-xs gap-2.5 py-2 pl-3.5 cursor-pointer">
                          <Crown className="h-3.5 w-3.5 text-primary shrink-0" />
                          <div><div className="font-semibold text-primary">▶ Executar Pipeline Completo</div><div className="text-[9px] text-muted-foreground">Coordena e executa os 8 agentes abaixo em sequência</div></div>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <div className="px-3 py-1.5">
                          <p className="text-[9px] text-muted-foreground font-semibold">Agentes executados automaticamente:</p>
                        </div>
                        {[
                          { icon: Lightbulb, label: "1. Planejamento Jurídico", desc: "Define tema, área e estrutura" },
                          { icon: Search, label: "2. Pesquisa Jurisprudencial", desc: "Busca decisões e precedentes" },
                          { icon: BarChart3, label: "3. Análise Jurídica", desc: "Identifica fundamentos legais" },
                          { icon: BookOpen, label: "4. Síntese de Jurisprudência", desc: "Consolida entendimento" },
                          { icon: PenTool, label: "5. Redação Jurídica", desc: "Escreve texto com argumentação" },
                          { icon: Quote, label: "6. Citações e Referências", desc: "Padroniza citações ABNT" },
                          { icon: ShieldCheck, label: "7. Revisão Jurídica", desc: "Corrige linguagem e coerência" },
                          { icon: FileText, label: "8. Formatação e Exportação", desc: "Estrutura final para PDF/DOCX" },
                        ].map(({ icon: Icon, label, desc }) => (
                          <div key={label} className="flex items-center gap-2.5 px-5 py-1.5 text-xs text-muted-foreground/80">
                            <Icon className="h-3 w-3 shrink-0" />
                            <div><span className="text-[10px]">{label}</span><span className="text-[9px] ml-1.5 opacity-60">— {desc}</span></div>
                          </div>
                        ))}
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
        }
              {onUndoAI && contentHistory > 0 &&
        <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground px-1.5 gap-1" onClick={onUndoAI} title="Desfazer IA">
                  <History className="h-3.5 w-3.5" />{contentHistory}
                </Button>
        }
            </div>

            <Separator orientation="vertical" className="h-6 mx-1 shrink-0" />

            {/* ── Ferramentas (collapsed into dropdown on small screens) ── */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground px-2 shrink-0 md:hidden gap-1">
                  <Settings className="h-3.5 w-3.5" />Ferramentas<ChevronDown className="h-3 w-3 opacity-60" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="min-w-[180px]">
                {onCopy && <DropdownMenuItem onClick={onCopy} className="text-xs gap-2.5 cursor-pointer"><Copy className="h-4 w-4" />Copiar</DropdownMenuItem>}
                {onRedaction && <DropdownMenuItem onClick={onRedaction} disabled={isDocProtected} className="text-xs gap-2.5 cursor-pointer"><ShieldAlert className="h-4 w-4" />LGPD</DropdownMenuItem>}
                {onTemplates && <DropdownMenuItem onClick={onTemplates} disabled={isDocProtected} className="text-xs gap-2.5 cursor-pointer"><Variable className="h-4 w-4" />Templates</DropdownMenuItem>}
                {onToggleProtection && <DropdownMenuItem onClick={onToggleProtection} className="text-xs gap-2.5 cursor-pointer">{isDocProtected ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}{isDocProtected ? "Desproteger" : "Proteger"}</DropdownMenuItem>}
              </DropdownMenuContent>
            </DropdownMenu>
            <div className="hidden md:flex items-center gap-0.5 shrink-0">
              {onCopy &&
        <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-foreground px-2 gap-1" onClick={onCopy} title="Copiar conteúdo">
                  <Copy className="h-3.5 w-3.5" /><span className="hidden lg:inline">Copiar</span>
                </Button>
        }
              {onRedaction &&
        <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-destructive px-2 gap-1" onClick={onRedaction} disabled={isDocProtected} title="Redação LGPD">
                  <ShieldAlert className="h-3.5 w-3.5" /><span className="hidden lg:inline">LGPD</span>
                </Button>
        }
              {onTemplates &&
        <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground hover:text-primary px-2 gap-1" onClick={onTemplates} disabled={isDocProtected} title="Variáveis de template">
                  <Variable className="h-3.5 w-3.5" /><span className="hidden lg:inline">Templates</span>
                </Button>
        }
              {onToggleProtection &&
        <Button variant="ghost" size="sm" className={`h-7 text-xs px-2 ${isDocProtected ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"}`} onClick={onToggleProtection} title={isDocProtected ? "Documento protegido" : "Proteger documento"}>
                  {isDocProtected ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                </Button>
        }
              <WatermarkControl config={editorWatermark} onChange={setEditorWatermark} />
              <DicionarioPopover selectedText={dictSelectedText} />
            </div>

            <div className="flex-1 min-w-0" />

            {/* ── Zoom + View (compact) ── */}
            <div className="flex items-center gap-1 shrink-0">
              {qualityScore !== null &&
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getQualityLabel(qualityScore / 100).color} bg-secondary hidden sm:inline`}>
                  {getQualityLabel(qualityScore / 100).icon} {qualityScore}%
                </span>
        }
              <div className="flex items-center gap-0 border border-border/50 rounded-lg bg-background/50 overflow-hidden">
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground rounded-none" onClick={() => setZoom((z) => Math.max(50, z - 10))} disabled={zoom <= 50}>
                  <ZoomOut className="h-3 w-3" />
                </Button>
                <span className="text-[10px] font-medium text-muted-foreground w-8 text-center border-x border-border/30 tabular-nums">{zoom}%</span>
                <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground rounded-none" onClick={() => setZoom((z) => Math.min(200, z + 10))} disabled={zoom >= 200}>
                  <ZoomIn className="h-3 w-3" />
                </Button>
              </div>
              {/* Timbre toggle — direct button */}
              <Button
                variant="ghost"
                size="icon"
                className={`h-6 w-6 rounded-md ${showLetterhead ? "bg-primary/20 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                title={showLetterhead ? "Ocultar timbre" : "Mostrar timbre"}
                onClick={() => {
                  const next = !showLetterhead;
                  setShowLetterhead(next);
                  if (next && !letterheadSrc) {
                    import("@/lib/generators").then((mod) => {
                      mod.loadLetterheadImage().then((src: string) => setLetterheadSrc(src));
                    });
                  }
                }}
              >
                <PanelTop className="h-3.5 w-3.5" />
              </Button>
              {/* View toggles dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground rounded-md" title="Opções de visualização">
                    <Settings className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[180px]">
                  <DropdownMenuItem onClick={() => setShowRuler(!showRuler)} className="text-xs gap-2.5 cursor-pointer">
                    <Ruler className="h-4 w-4" />{showRuler ? "Ocultar régua" : "Mostrar régua"}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowVerticalRuler(!showVerticalRuler)} className="text-xs gap-2.5 cursor-pointer">
                    <Ruler className="h-4 w-4" style={{ transform: "rotate(90deg)" }} />{showVerticalRuler ? "Ocultar régua lateral" : "Régua lateral"}
                  </DropdownMenuItem>
                  {livePreviewContent && (
                    <DropdownMenuItem onClick={() => setShowLivePreview(!showLivePreview)} className="text-xs gap-2.5 cursor-pointer">
                      {showLivePreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      {showLivePreview ? "Ocultar preview" : "Preview ao vivo"}
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-foreground rounded-md" onClick={toggleFullscreen} title={isFullscreen ? "Sair da tela cheia" : "Tela cheia"}>
                {isFullscreen ? <Minimize className="h-3.5 w-3.5" /> : <Maximize className="h-3.5 w-3.5" />}
              </Button>
            </div>
          </div>

          {/* ═══ LINHA 2: Painéis + Ações ═══ */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 border-t border-border/30 bg-muted/30 overflow-hidden">
            {/* ── Painéis ── */}
            <div className="flex items-center gap-0.5 p-0.5 rounded-lg bg-muted/60 border border-border/40 shrink-0 overflow-x-auto fade-scroll-x">
              <Button variant="ghost" size="sm" className={`h-6 text-[10px] px-2 rounded-md transition-all shrink-0 font-medium ${activeTab === "editar" ? "text-primary-foreground bg-primary shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-background/60"}`} onClick={() => setActiveTab("editar")}>
                ✏️ Editar
              </Button>
              {settingsContent &&
        <Button variant="ghost" size="sm" className={`h-6 text-[10px] px-2 rounded-md transition-all shrink-0 font-medium ${activeTab === "configuracoes" ? "text-primary-foreground bg-primary shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-background/60"}`} onClick={() => setActiveTab("configuracoes")}>
                  <Settings className="h-3 w-3 mr-0.5" />Config
                </Button>
        }
              <Button variant="ghost" size="sm" className={`h-6 text-[10px] px-2 rounded-md transition-all shrink-0 font-medium ${activeTab === "sugestoes" ? "text-primary-foreground bg-primary shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-background/60"}`} onClick={() => setActiveTab(activeTab === "sugestoes" ? "editar" : "sugestoes")}>
                <Lightbulb className="h-3 w-3 mr-0.5" />Sugestões
                {suggestions && suggestions.filter((s) => s.status === "pending").length > 0 &&
          <Badge variant="secondary" className="text-[7px] h-3.5 ml-1 px-1 rounded-full">{suggestions.filter((s) => s.status === "pending").length}</Badge>
          }
              </Button>
              <Button variant="ghost" size="sm" className={`h-6 text-[10px] px-2 rounded-md transition-all shrink-0 font-medium ${activeTab === "analise" ? "text-primary-foreground bg-primary shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-background/60"}`} onClick={() => setActiveTab("analise")}>
                <BarChart3 className="h-3 w-3 mr-0.5" />Análise
                {lintTotal > 0 && <Badge variant="destructive" className="text-[7px] h-3.5 ml-1 px-1 rounded-full">{lintTotal}</Badge>}
              </Button>
              <Button variant="ghost" size="sm" className={`h-6 text-[10px] px-2 rounded-md transition-all shrink-0 font-medium ${activeTab === "referencias" ? "text-primary-foreground bg-primary shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-background/60"}`} onClick={() => setActiveTab("referencias")}>
                <BookOpen className="h-3 w-3 mr-0.5" />Refs
              </Button>
            </div>

            {/* ── Sincronizar ── */}
            <Button
        variant="ghost"
        size="sm"
        className="h-7 text-[10px] px-2.5 text-muted-foreground hover:text-primary hover:bg-primary/10 gap-1.5 rounded-md font-medium"
        title="Recalcula quebras de página e alinhamento PDF"
        onClick={() => {
          if (!editor || editor.isDestroyed) return;
          const runSync = () => {
            if (!editor || editor.isDestroyed) return;
            editor.view.dispatch(
              editor.state.tr.
              setMeta("pageBreakData", { branded: false, positions: [] }).
              setMeta("forcePageBreakUpdate", true)
            );
            setSyncTrigger((prev) => prev + 1);
          };
          editor.commands.focus();
          editor.view.updateState(editor.view.state);
          runSync();
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              runSync();
              requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                  runSync();
                  const view = safeView(editor);
                  const contentH = view?.dom?.scrollHeight ?? 0;
                  const liveBreaks = view
                    ? Array.from(view.dom.querySelectorAll(".page-break-spacer-widget"))
                        .map((el) => (el as HTMLElement).offsetTop + (view.dom as HTMLElement).offsetTop)
                        .sort((a, b) => a - b)
                    : [];
                  const validation = validatePageGeometry({
                    branded,
                    editorContentHeight: contentH,
                    pageBreaks: liveBreaks.length > 0 ? liveBreaks : editorPageBreaks
                  });
                  if (validation.valid) {
                    toast.success("✅ Alinhamento sincronizado", { description: "Quebras, cabeçalho e rodapé verificados — tudo OK para PDF.", duration: 3000 });
                  } else {
                    toast.warning("⚠️ Sincronizado com avisos", { description: validation.issues.join(" | "), duration: 5000 });
                  }
                });
              });
            });
          });
        }}>
        
              <AlignVerticalSpaceAround className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Sincronizar</span>
            </Button>

            <div className="flex-1 min-w-0" />

            {/* ── Ações (compact) ── */}
            <div className="flex items-center gap-1 shrink-0">
              {savedDocId && onShare &&
        <Button variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground hover:text-foreground px-1.5 rounded-md" onClick={onShare} title="Compartilhar documento">
                  <Share2 className="h-3.5 w-3.5" />
                </Button>
        }
              {savedDocId &&
        <DocumentPresenceBar
          presentUsers={presentUsers}
          otherUsers={otherUsers}
          totalViewers={totalViewers}
          isConnected={isConnected}
          connectedPeers={connectedPeers}
          isLockedByOther={isLockedByOther}
          isMyLock={isMyLock ?? false}
          lockOwnerName={lockOwnerName}
          onAcquireLock={async () => {
            const ok = await acquireLock();
            if (ok) updateEditingState(true);
          }}
          onReleaseLock={async () => {
            await releaseLock();
            updateEditingState(false);
          }}
        />
        }
              {onSave &&
        <Button variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground hover:text-foreground px-1.5 rounded-md" onClick={onSave} disabled={saving} title="Salvar documento">
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FolderOpen className="h-3.5 w-3.5" />}
                </Button>
        }
              {onSignature &&
        <Button variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground hover:text-foreground px-1.5 rounded-md" onClick={onSignature} disabled={saving} title="Assinatura digital">
                  <PenTool className="h-3.5 w-3.5" />
                </Button>
        }
              {onDownload &&
        <Button size="sm" className="h-7 text-xs btn-gold px-3 rounded-lg shadow-sm font-semibold gap-1" onClick={onDownload} title="Baixar PDF">
                  <Download className="h-3.5 w-3.5" />PDF
                </Button>
        }
            </div>
          </div>
        </div> :
  null;

  return (
    <div className={`border border-border flex flex-col h-full ${className || ""}`}>
      {/* Bar 1: render via portal if target provided, otherwise inline */}
      {bar1Content && bar1PortalTarget ? createPortal(bar1Content, bar1PortalTarget) : bar1Content}

      {/* ═══ TABS (strip hidden — navigation via Painéis dropdown in Bar 1) ═══ */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Hidden TabsList — required by Radix but not visible */}
        <TabsList className="hidden">
          <TabsTrigger value="editar">Editar</TabsTrigger>
          {previewContent && <TabsTrigger value="visualizar">Preview</TabsTrigger>}
          {settingsContent && <TabsTrigger value="configuracoes">Config</TabsTrigger>}
          <TabsTrigger value="sugestoes">Sugestões</TabsTrigger>
          <TabsTrigger value="analise">Análise</TabsTrigger>
          <TabsTrigger value="referencias">Refs</TabsTrigger>
        </TabsList>

        {/* ═══ TAB: Editar ═══ */}
        <TabsContent value="editar" className="mt-0 flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* DocumentOutline + Editor side by side */}
          <EditorFormattingToolbar
            editor={editor}
            onAIAction={onAIAction}
            rulerLeftIndent={rulerLeftIndent}
            setRulerLeftIndent={setRulerLeftIndent}
            showFindReplace={showFindReplace}
            setShowFindReplace={setShowFindReplace}
            docxImportRef={docxImportRef}
            handleDocxImport={handleDocxImport}
          />

          {/* FindReplaceBar */}
          {showFindReplace && <FindReplaceBar editor={editor} onClose={() => setShowFindReplace(false)} />}

          <EditorCanvasArea
            editor={editor}
            isEditorMounted={isEditorMounted}
            zoom={zoom}
            showRuler={showRuler}
            showVerticalRuler={showVerticalRuler}
            showLetterhead={showLetterhead}
            branded={branded}
            rulerLeftIndent={rulerLeftIndent}
            rulerRightIndent={rulerRightIndent}
            rulerFirstLineIndent={rulerFirstLineIndent}
            setRulerLeftIndent={setRulerLeftIndent}
            setRulerRightIndent={setRulerRightIndent}
            setRulerFirstLineIndent={setRulerFirstLineIndent}
            handleRulerDragStart={handleRulerDragStart}
            rulerSelRef={rulerSelRef}
            canvasContainerRef={canvasContainerRef}
            scrollContainerRef={scrollContainerRef}
            outlineCollapsed={outlineCollapsed}
            setOutlineCollapsed={setOutlineCollapsed}
            documentLabel={documentLabel}
            forceLetterhead={forceLetterhead}
            onExternalChatMessage={onExternalChatMessage}
            currentPage={currentPage}
            totalPages={totalPages}
            editorPageBreaks={editorPageBreaks}
            setEditorPageBreaks={setEditorPageBreaks}
            syncTrigger={syncTrigger}
            usablePageHeight={usablePageHeight}
            firstPageTopOffset={firstPageTopOffset}
            isLockedByOther={isLockedByOther}
            letterheadSrc={letterheadSrc}
            editorWatermark={editorWatermark}
            slashMenuState={slashMenuState}
            setSlashMenuState={setSlashMenuState}
            showLivePreview={showLivePreview}
            livePreviewContent={livePreviewContent}
          />
        </TabsContent>

        <EditorTabPanels
          previewContent={previewContent}
          settingsContent={settingsContent}
          commentsContent={commentsContent}
          suggestionsContent={suggestionsContent}
          activityContent={activityContent}
          content={content}
          documentLabel={documentLabel}
          documentCategory={documentCategory}
          editor={editor}
        />
      </Tabs>



      <EditorStatusBar
        isEditorMounted={isEditorMounted}
        scrollContainerRef={scrollContainerRef}
        currentPage={currentPage}
        totalPages={totalPages}
        scrollPageHeight={scrollPageHeight}
        wordCount={wordCount}
        charCount={charCount}
        currentFontFamily={currentFontFamily}
        currentFontSize={currentFontSize}
        lintTotal={lintTotal}
        lintErrors={lintErrors}
        lintWarnings={lintWarnings}
        lintInfos={lintInfos}
        qualityScore={qualityScore}
        onShowAnalysis={() => setActiveTab("analise")}
      />
    </div>);

}


/** Full format detection from imported HTML */
interface DetectedFormat {
  marginLeft: number;
  textIndent: number;
  paddingRight: number;
  fontFamily: string | null;
  fontSize: string | null;
  lineHeight: string | null;
  textAlign: string | null;
}

function detectFullFormatFromHtml(html: string): DetectedFormat {
  const marginLeftValues: number[] = [];
  const textIndentValues: number[] = [];
  const paddingRightValues: number[] = [];
  const fontFamilies: string[] = [];
  const fontSizes: string[] = [];
  const lineHeights: string[] = [];
  const textAligns: string[] = [];

  const styleRegex = /style="([^"]*)"/gi;
  let sm;
  while ((sm = styleRegex.exec(html)) !== null) {
    const style = sm[1];
    const ml = style.match(/margin-left:\s*([^;}"']+)/i);
    if (ml) {const px = cssValueToPx(ml[1].trim());if (px > 0 && px < 400) marginLeftValues.push(px);}
    const ti = style.match(/text-indent:\s*([^;}"']+)/i);
    if (ti) {const px = cssValueToPx(ti[1].trim());if (px >= 0 && px < 400) textIndentValues.push(px);}
    const pr = style.match(/(?:margin-right|padding-right):\s*([^;}"']+)/i);
    if (pr) {const px = cssValueToPx(pr[1].trim());if (px > 0 && px < 400) paddingRightValues.push(px);}
    const ff = style.match(/font-family:\s*([^;}"']+)/i);
    if (ff) {const v = ff[1].trim().replace(/['"]/g, "").split(",")[0].trim();if (v) fontFamilies.push(v);}
    const fs = style.match(/font-size:\s*([^;}"']+)/i);
    if (fs) {const v = fs[1].trim();if (v) fontSizes.push(v);}
    const lh = style.match(/line-height:\s*([^;}"']+)/i);
    if (lh) {const v = lh[1].trim();if (v) lineHeights.push(v);}
    const ta = style.match(/text-align:\s*([^;}"']+)/i);
    if (ta) {const v = ta[1].trim().toLowerCase();if (["left", "center", "right", "justify"].includes(v)) textAligns.push(v);}
  }

  return {
    marginLeft: marginLeftValues.length > 0 ? mode(marginLeftValues) : 0,
    textIndent: textIndentValues.length > 0 ? mode(textIndentValues) : -1,
    paddingRight: paddingRightValues.length > 0 ? mode(paddingRightValues) : 0,
    fontFamily: fontFamilies.length > 0 ? modeStr(fontFamilies) : null,
    fontSize: fontSizes.length > 0 ? modeStr(fontSizes) : null,
    lineHeight: lineHeights.length > 0 ? modeStr(lineHeights) : null,
    textAlign: textAligns.length > 0 ? modeStr(textAligns) : null
  };
}

function cssValueToPx(val: string): number {
  if (val.includes("cm")) return Math.round(parseFloat(val) * 37.8);
  if (val.includes("mm")) return Math.round(parseFloat(val) * 3.78);
  if (val.includes("pt")) return Math.round(parseFloat(val) * 1.333);
  if (val.includes("in")) return Math.round(parseFloat(val) * 96);
  if (val.includes("px")) return parseInt(val, 10);
  const num = parseFloat(val);
  return isNaN(num) ? 0 : Math.round(num);
}

function mode(arr: number[]): number {
  const freq = new Map<number, number>();
  for (const v of arr) freq.set(v, (freq.get(v) || 0) + 1);
  let best = arr[0],bestCount = 0;
  for (const [v, c] of freq) {if (c > bestCount) {best = v;bestCount = c;}}
  return best;
}

function modeStr(arr: string[]): string {
  const freq = new Map<string, number>();
  for (const v of arr) freq.set(v, (freq.get(v) || 0) + 1);
  let best = arr[0],bestCount = 0;
  for (const [v, c] of freq) {if (c > bestCount) {best = v;bestCount = c;}}
  return best;
}

function convertPlainTextToHtml(text: string): string {
  if (!text) return "";
  if (text.trimStart().startsWith("<")) return text;

  // Regex patterns imported from contentTypeDetector (single source of truth)

  return text.
  split("\n\n").
  map((paragraph) => {
    const trimmed = paragraph.trim();
    if (!trimmed) return "";
    const len = trimmed.length;

    // Ementa — high priority specific pattern
    if (EMENTA_RE.test(trimmed)) {
      return `<h2><strong>${trimmed}</strong></h2>`;
    }

    // Title — short UPPERCASE text
    if (/^[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇ\s\-–—:\.]{5,}$/.test(trimmed) && len < 100) {
      return `<h1><strong>${trimmed}</strong></h1>`;
    }

    // Subtitle — short title-case text without periods (sentence fragments)
    if (len < 100 && /^[A-ZÀ-Ú]/.test(trimmed) && !trimmed.includes(". ") && !/[a-z]{3,}\s[a-z]{3,}/.test(trimmed)) {
      return `<h2>${trimmed}</h2>`;
    }

    // Legal citation (Art., §, Lei nº, Súmula, etc.) — blockquote
    if (CITACAO_LEGAL_RE.test(trimmed)) {
      return `<blockquote><p>${trimmed.replace(/\n/g, "<br>")}</p></blockquote>`;
    }

    // Jurisprudência reference
    if (JURISPRUDENCIA_RE.test(trimmed) && len < 500) {
      return `<blockquote><p><em>${trimmed.replace(/\n/g, "<br>")}</em></p></blockquote>`;
    }

    // Signature block
    if (ASSINATURA_RE.test(trimmed) && len < 300) {
      return `<p style="text-align: center">${trimmed.replace(/\n/g, "<br>")}</p>`;
    }

    // Numbered list
    if (/^\d+[\.\)]/.test(trimmed)) {
      const items = trimmed.split("\n").filter(Boolean);
      const listItems = items.map((item) => `<li>${item.replace(/^\d+[\.\)]\s*/, "")}</li>`).join("");
      return `<ol>${listItems}</ol>`;
    }

    // Lettered/bulleted list
    if (LISTA_RE.test(trimmed)) {
      const items = trimmed.split("\n").filter(Boolean);
      const listItems = items.map((item) => `<li>${item.replace(/^\s*([a-z]\)|[IVX]+[.)]\s|[•●○▪]\s|\d+[.)]\s)/, "")}</li>`).join("");
      return `<ul>${listItems}</ul>`;
    }

    // Bold detection: short all-caps words within longer paragraph → wrap in <strong>
    let htmlParagraph = trimmed.replace(/\n/g, "<br>");
    htmlParagraph = htmlParagraph.replace(/\b([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇ]{4,}(?:\s+[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇ]{3,})*)\b/g, (match) => {
      // Only bold if it's not the entire paragraph (that would be a title)
      if (match.length < trimmed.length * 0.8) {
        return `<strong>${match}</strong>`;
      }
      return match;
    });

    return `<p>${htmlParagraph}</p>`;
  }).
  filter(Boolean).
  join("");
}