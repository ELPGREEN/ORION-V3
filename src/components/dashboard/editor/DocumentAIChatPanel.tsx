import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Minimize2, Maximize2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Brain, X, History, PlusCircle, Scissors, ChevronUp, ChevronDown } from "lucide-react";
import { buildInitialState, refreshGuidanceState, shouldRefreshGuidance, type GuidanceState } from "@/lib/legalGuidanceEngine";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
// [REMOVED] import { useNeuralFeedback } from "@/hooks/useNeuralFeedback";
import { useChatIAPersistence } from "@/hooks/useChatIAPersistence";
import { safeApplyAIResult, classifyApplyMode } from "@/lib/document";
import { smartAgentRoute } from "@/lib/api";
import { reapplyUserStyles } from "@/lib/document";
import { getLearnedStyle, styleToPromptContext } from "@/lib/document";
import { analyzeClarity, isConfirmation } from "@/lib/analysis";
import { cleanAIResponse } from "@/lib/document";
import { DocumentComparisonViewer } from "./DocumentComparisonViewer";

// Sub-components
import { ChatDocContextBar } from "./chat/ChatDocContextBar";
import { SmartLegalGuidancePanel } from "./SmartLegalGuidancePanel";
import { ChatHistoryPanel } from "./chat/ChatHistoryPanel";
import { ChatQuickActions } from "./chat/ChatQuickActions";
import { ChatMessageList, type Message } from "./chat/ChatMessageList";
import { ChatInputArea } from "./chat/ChatInputArea";
import { AgentSelector, type AgentType, AGENTS } from "./chat/AgentSelector";
import { ModeSelector, type ChatMode, MODES } from "./chat/ModeSelector";
import { PendingAttachments, type PendingFile } from "./chat/PendingAttachments";

// ─── Types ───
interface SourceItem {
  title: string;
  source_label?: string;
  url?: string;
  content?: string;
}

type ChatAction =
  | { type: "replace_selection"; text: string }
  | { type: "insert_at_cursor"; text: string }
  | { type: "replace_paragraph"; index: number; text: string }
  | { type: "append"; text: string }
  | { type: "rewrite_section"; sectionTitle: string; text: string }
  | { type: "info" };

interface DocumentAIChatPanelProps {
  documentContent: string;
  documentType: string;
  documentId?: string;
  onInsertText?: (text: string) => void;
  onReplaceContent?: (text: string) => void;
  onReplaceSelection?: (text: string) => void;
  onInsertAtCursor?: (text: string) => void;
  selectedText?: string;
  cursorPosition?: number;
  onImprove?: (mode: string) => void;
  onSave?: () => void;
  onRedaction?: () => void;
  onRulerChange?: (left: number, firstLine: number, right: number) => void;
  /** When true, renders as inline docked panel instead of floating overlay */
  inline?: boolean;
  /** Callback to close the inline panel */
  onClose?: () => void;
  /** External message to auto-send (set to non-null to trigger, parent resets to null) */
  externalMessage?: string | null;
  onExternalMessageSent?: () => void;
}

// ═══════════════════════════════════════════════════════════════
// INTENT DETECTION
// ═══════════════════════════════════════════════════════════════
interface DetectedIntent {
  action: string;
  mode?: string;
  target?: string;
  description: string;
  isEditCommand: boolean;
  requiresNeural: boolean;
  category: "edit" | "research" | "analysis" | "tool" | "meta";
}

function detectIntent(message: string): DetectedIntent | null {
  const lower = message.toLowerCase().trim();

  if (/^(reescreva|reescreve|reformule|reformula)\s/i.test(lower))
    return { action: "rewrite", description: "Reescrever trecho", isEditCommand: true, requiresNeural: false, category: "edit" };
  if (/^(substitua|substitui|troque|troca)\s/i.test(lower))
    return { action: "replace", description: "Substituir texto", isEditCommand: true, requiresNeural: false, category: "edit" };
  if (/^(adicione|adiciona|insira|insir[ae]|inclua|inclui|acrescente)\s/i.test(lower))
    return { action: "insert", description: "Inserir conteúdo", isEditCommand: true, requiresNeural: false, category: "edit" };
  if (/^(remova|remove|delete|apague|exclua)\s/i.test(lower))
    return { action: "delete", description: "Remover trecho", isEditCommand: true, requiresNeural: false, category: "edit" };
  if (/^(melhore|melhora|aprimore|aprimora)\s/i.test(lower))
    return { action: "improve", description: "Aprimorar trecho", isEditCommand: true, requiresNeural: false, category: "edit" };
  if (/adicionar?\s+(lei|cita|jurisprud|fundament)/i.test(lower))
    return { action: "improve", mode: "legal", description: "Adicionar fundamentação legal", isEditCommand: true, requiresNeural: true, category: "edit" };
  if (/formata[r]?\s+(abnt|documento)/i.test(lower))
    return { action: "improve", mode: "formatting", description: "Formatar ABNT", isEditCommand: true, requiresNeural: false, category: "edit" };
  if (/corrig[aie]r?\s+(gram|orto|erros)/i.test(lower))
    return { action: "improve", mode: "light", description: "Corrigir gramática", isEditCommand: true, requiresNeural: false, category: "edit" };
  if (/resum[aoie]/i.test(lower))
    return { action: "summarize", description: "Resumir documento", isEditCommand: true, requiresNeural: false, category: "edit" };
  if (/gerar?\s+ementa/i.test(lower))
    return { action: "ementa", description: "Gerar ementa", isEditCommand: true, requiresNeural: false, category: "edit" };
  if (/lacuna|gap|falt[ae]|ponto\s+fraco/i.test(lower))
    return { action: "gaps", description: "Verificar lacunas", isEditCommand: true, requiresNeural: true, category: "analysis" };
  if (/adicionar?\s+cl[aá]usula|nova\s+cl[aá]usula|inserir?\s+cl[aá]usula|acrescentar?\s+cl[aá]usula/i.test(lower))
    return { action: "add_clause", description: "Adicionar cláusula", isEditCommand: true, requiresNeural: false, category: "edit" };
  if (/redatar?|redação|dados?\s+sensív|ocultar?\s+(cpf|cnpj|email|nome|telefone)/i.test(lower))
    return { action: "redaction", description: "Redação de dados sensíveis", isEditCommand: false, requiresNeural: false, category: "tool" };
  if (/marca\s+d.?água|watermark|confidencial/i.test(lower))
    return { action: "watermark", description: "Marca d'água", isEditCommand: false, requiresNeural: false, category: "tool" };
  if (/template|variáve[il]|placeholder|\{\{/i.test(lower))
    return { action: "template", description: "Templates com variáveis", isEditCommand: false, requiresNeural: false, category: "tool" };
  if (/proteger?|bloquear?|read.?only|somente\s+leitura/i.test(lower))
    return { action: "protect", description: "Proteger documento", isEditCommand: false, requiresNeural: false, category: "tool" };
  if (/salvar?\s/i.test(lower))
    return { action: "save", description: "Salvar documento", isEditCommand: false, requiresNeural: false, category: "meta" };
  if (/analis[ea]r?\s+(tese|viabilidade|argumento|estratégia|risco)/i.test(lower))
    return { action: "analysis", description: "Análise estratégica", isEditCommand: false, requiresNeural: true, category: "analysis" };
  if (/ponto[s]?\s+(forte|fraco)|swot|forç[ao]|fraqueza/i.test(lower))
    return { action: "swot", description: "Análise SWOT jurídica", isEditCommand: false, requiresNeural: true, category: "analysis" };
  if (/contra.?argumento|argumento\s+contrário|tese\s+adversa/i.test(lower))
    return { action: "counterargument", description: "Contra-argumentos", isEditCommand: false, requiresNeural: true, category: "analysis" };
  if (/prazo|prescri[çc]|decad[eê]ncia|tempestiv/i.test(lower))
    return { action: "deadlines", description: "Análise de prazos", isEditCommand: false, requiresNeural: true, category: "analysis" };
  if (/compet[eê]ncia|foro|jurisdi[çc]/i.test(lower))
    return { action: "jurisdiction", description: "Análise de competência", isEditCommand: false, requiresNeural: true, category: "analysis" };
  if (/jurisprud|súmula|precedente|entendiment/i.test(lower))
    return { action: "pesquisa", description: "Pesquisa jurisprudencial", isEditCommand: false, requiresNeural: true, category: "research" };
  if (/o que (diz|dispõe|prevê)\s+(a lei|o art|a cf|o código)/i.test(lower))
    return { action: "consulta", description: "Consulta legislativa", isEditCommand: false, requiresNeural: true, category: "research" };
  if (/explique|o que é|qual (a |o )?diferença|conceito de/i.test(lower))
    return { action: "sintese", description: "Síntese jurídica", isEditCommand: false, requiresNeural: true, category: "research" };
  if (/artigo|art\.|§|inciso|alínea|parágrafo/i.test(lower))
    return { action: "legislation", description: "Consulta de artigo", isEditCommand: false, requiresNeural: true, category: "research" };
  if (/doutrina|autor|renato|aury|bitencourt|nucci/i.test(lower))
    return { action: "doctrine", description: "Consulta doutrinária", isEditCommand: false, requiresNeural: true, category: "research" };
  if (/lei\s|código|constituição|cf\s|cpp\s|cp\s|clt\s|cdc\s|cpc\s|eca\s|eab\s/i.test(lower))
    return { action: "consulta", description: "Consulta jurídica", isEditCommand: false, requiresNeural: true, category: "research" };
  if (/r[eé]gua|recuo|indent|margem\s+(esquerda|direita)|text.?indent|primeira\s+linha/i.test(lower))
    return { action: "ruler", description: "Ajustar régua/recuos", isEditCommand: false, requiresNeural: false, category: "tool" };

  return null;
}

// ═══════════════════════════════════════════════════════════════
// RULER COMMANDS
// ═══════════════════════════════════════════════════════════════
function parseRulerCommand(msg: string): { left: number; firstLine: number; right: number } | null {
  const lower = msg.toLowerCase();
  const leftMatch = lower.match(/(?:recuo\s+)?esquerdo?\s*[:=]?\s*([\d.,]+)\s*cm/);
  const firstLineMatch = lower.match(/(?:primeira?\s+linha|1[ªa]\s+linha|text.?indent)\s*[:=]?\s*([\d.,]+)\s*cm/);
  const rightMatch = lower.match(/(?:recuo\s+)?direito?\s*[:=]?\s*([\d.,]+)\s*cm/);
  if (!leftMatch && !firstLineMatch && !rightMatch) return null;
  const cmToPx = (cm: number) => Math.round(cm * 37.8);
  return {
    left: leftMatch ? cmToPx(parseFloat(leftMatch[1].replace(",", "."))) : 0,
    firstLine: firstLineMatch ? cmToPx(parseFloat(firstLineMatch[1].replace(",", "."))) : 47,
    right: rightMatch ? cmToPx(parseFloat(rightMatch[1].replace(",", "."))) : 0,
  };
}

function detectRulerFromContent(html: string): { left: number; firstLine: number; right: number; fontFamily: string | null; fontSize: string | null; lineHeight: string | null; textAlign: string | null } {
  const marginLeftValues: number[] = [];
  const textIndentValues: number[] = [];
  const fontFamilies: string[] = [];
  const fontSizes: string[] = [];
  const lineHeights: string[] = [];
  const textAligns: string[] = [];
  const styleRegex = /style="([^"]*)"/gi;
  let m;
  while ((m = styleRegex.exec(html)) !== null) {
    const style = m[1];
    const ml = style.match(/margin-left:\s*([^;}"']+)/i);
    if (ml) { const px = cssValToPx(ml[1].trim()); if (px > 0 && px < 400) marginLeftValues.push(px); }
    const ti = style.match(/text-indent:\s*([^;}"']+)/i);
    if (ti) { const px = cssValToPx(ti[1].trim()); if (px >= 0 && px < 400) textIndentValues.push(px); }
    const ff = style.match(/font-family:\s*([^;}"']+)/i);
    if (ff) { const v = ff[1].trim().replace(/['"]/g, "").split(",")[0].trim(); if (v) fontFamilies.push(v); }
    const fs = style.match(/font-size:\s*([^;}"']+)/i);
    if (fs) { const v = fs[1].trim(); if (v) fontSizes.push(v); }
    const lh = style.match(/line-height:\s*([^;}"']+)/i);
    if (lh) { const v = lh[1].trim(); if (v) lineHeights.push(v); }
    const ta = style.match(/text-align:\s*([^;}"']+)/i);
    if (ta) { const v = ta[1].trim().toLowerCase(); if (["left", "center", "right", "justify"].includes(v)) textAligns.push(v); }
  }
  const modeVal = (arr: number[]) => {
    if (arr.length === 0) return -1;
    const freq = new Map<number, number>();
    for (const v of arr) freq.set(v, (freq.get(v) || 0) + 1);
    let best = arr[0], bestC = 0;
    for (const [v, c] of freq) { if (c > bestC) { best = v; bestC = c; } }
    return best;
  };
  const modeStr = (arr: string[]) => {
    if (arr.length === 0) return null;
    const freq = new Map<string, number>();
    for (const v of arr) freq.set(v, (freq.get(v) || 0) + 1);
    let best = arr[0], bestC = 0;
    for (const [v, c] of freq) { if (c > bestC) { best = v; bestC = c; } }
    return best;
  };
  return {
    left: Math.max(0, modeVal(marginLeftValues)),
    firstLine: textIndentValues.length > 0 ? Math.max(0, modeVal(textIndentValues)) : 47,
    right: 0,
    fontFamily: modeStr(fontFamilies),
    fontSize: modeStr(fontSizes),
    lineHeight: modeStr(lineHeights),
    textAlign: modeStr(textAligns),
  };
}

function cssValToPx(val: string): number {
  if (val.includes("cm")) return Math.round(parseFloat(val) * 37.8);
  if (val.includes("mm")) return Math.round(parseFloat(val) * 3.78);
  if (val.includes("pt")) return Math.round(parseFloat(val) * 1.333);
  if (val.includes("in")) return Math.round(parseFloat(val) * 96);
  if (val.includes("px")) return parseInt(val, 10);
  const num = parseFloat(val);
  return isNaN(num) ? 0 : Math.round(num);
}

// ═══════════════════════════════════════════════════════════════
// DOCUMENT ANALYSIS
// ═══════════════════════════════════════════════════════════════
interface DocumentAnalysis {
  wordCount: number;
  paragraphCount: number;
  hasLegalBasis: boolean;
  hasJurisprudence: boolean;
  hasDoctrine: boolean;
  sections: string[];
  missingElements: string[];
  qualityHints: string[];
}

function analyzeDocument(html: string, docType: string): DocumentAnalysis {
  const text = html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  const words = text.split(/\s+/).filter(w => w.length > 1);
  const paragraphs = html.split(/<\/p>|<br\s*\/?>/).filter(p => p.trim().length > 10);
  const hasLegalBasis = /art\.\s*\d|lei\s+(n[°º.]?\s*)?\d|código|constituição|cf\/|decreto/i.test(text);
  const hasJurisprudence = /súmula|stf|stj|tst|trf|resp\s|re\s\d|hc\s\d|agravo|recurso\s+especial/i.test(text);
  const hasDoctrine = /segundo|conforme|ensina|leciona|doutr|autor/i.test(text);
  const headingMatches = html.match(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/gi) || [];
  const sections = headingMatches.map(h => h.replace(/<[^>]*>/g, "").trim()).filter(Boolean);
  const missing: string[] = [];
  const hints: string[] = [];
  if (!hasLegalBasis) { missing.push("Fundamentação legal (artigos de lei)"); hints.push("💡 Diga \"adicione fundamentação legal\" para enriquecer"); }
  if (!hasJurisprudence && /peti[çc]|recurso|defesa|contestação|habeas/i.test(docType)) { missing.push("Jurisprudência (STF/STJ)"); hints.push("💡 Diga \"pesquise jurisprudência sobre...\" para buscar precedentes"); }
  if (words.length < 200 && /peti[çc]|recurso|defesa|contestação/i.test(docType)) { missing.push("Documento curto para peça processual"); hints.push("💡 Diga \"melhore o documento\" para expandir a argumentação"); }
  if (words.length > 5000) hints.push("💡 Documento extenso — considere \"resumir em tópicos\"");
  if (sections.length === 0 && words.length > 300) { missing.push("Sem estrutura de seções/títulos"); hints.push("💡 Diga \"organize em seções\" para estruturar"); }
  return { wordCount: words.length, paragraphCount: paragraphs.length, hasLegalBasis, hasJurisprudence, hasDoctrine, sections, missingElements: missing, qualityHints: hints };
}

function generateSuggestions(intent: string | undefined, analysis: DocumentAnalysis, docType: string): string[] {
  const suggestions: string[] = [];
  if (intent === "pesquisa" || intent === "consulta") {
    suggestions.push("Inserir essa fundamentação no documento", "Buscar mais jurisprudência sobre o tema", "Analisar contra-argumentos");
  } else if (intent === "rewrite" || intent === "improve") {
    suggestions.push("Verificar lacunas no documento", "Adicionar fundamentação legal");
    if (!analysis.hasJurisprudence) suggestions.push("Pesquisar jurisprudência relevante");
  } else if (intent === "gaps" || intent === "analysis") {
    suggestions.push("Corrigir as lacunas identificadas", "Adicionar fundamentação para os pontos fracos", "Reescrever seção mais vulnerável");
  }
  if (!analysis.hasLegalBasis && suggestions.length < 3) suggestions.push("Adicionar artigos de lei relevantes");
  if (!analysis.hasJurisprudence && suggestions.length < 3) suggestions.push("Pesquisar jurisprudência do STF/STJ");
  return suggestions.slice(0, 3);
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export function DocumentAIChatPanel({
  documentContent, documentType, documentId, onInsertText, onReplaceContent,
  onReplaceSelection, onInsertAtCursor, selectedText, onImprove, onSave, onRedaction,
  onRulerChange,
  inline = false, onClose,
  externalMessage, onExternalMessageSent,
}: DocumentAIChatPanelProps) {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(inline);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [showQuickActions, setShowQuickActions] = useState(true);
  const [showHistory, setShowHistory] = useState(false);
  const [lastAssistantText, setLastAssistantText] = useState("");
  const [pendingAction, setPendingAction] = useState<{ message: string; intent: DetectedIntent | null } | null>(null);
  const [comparisonData, setComparisonData] = useState<{ original: string; modified: string; msg: Message } | null>(null);
  const [activeSources, setActiveSources] = useState<string[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<AgentType>("revisor");
  const [selectedMode, setSelectedMode] = useState<ChatMode>("edicao");
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
   const [learnedStyleContext, setLearnedStyleContext] = useState<string>("");
   const [guidanceState, setGuidanceState] = useState<GuidanceState | null>(null);
    const [guidanceJustUpdated, setGuidanceJustUpdated] = useState(false);
    const [showContextBar, setShowContextBar] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { user } = useAuth();
  const {
    conversations, activeConversationId, loadingConversations,
    createConversation, saveMessage, deleteConversation,
    switchConversation, messages: persistedMessages,
  } = useChatIAPersistence();

  const docAnalysis = useMemo(() => analyzeDocument(documentContent, documentType), [documentContent, documentType]);

  // Load learned style on mount
  useEffect(() => {
    if (!user || !documentType) return;
    getLearnedStyle(user.id, documentType).then(fp => {
      if (fp) setLearnedStyleContext(styleToPromptContext(fp, documentType));
    }).catch(() => {});
  }, [user, documentType]);

  // Initialize guidance state
  useEffect(() => {
    const plainText = documentContent.replace(/<[^>]*>/g, " ");
    setGuidanceState(buildInitialState(documentType, plainText));
  }, [documentType]);

  // Auto-refresh guidance every N messages
  useEffect(() => {
    if (!guidanceState) return;
    if (shouldRefreshGuidance(messages.length, guidanceState.messageCountAtRefresh)) {
      const conversationText = messages.map(m => m.content).join(" ");
      const newState = refreshGuidanceState(conversationText, documentType, messages.length);
      setGuidanceState(newState);
      setGuidanceJustUpdated(true);
      setTimeout(() => setGuidanceJustUpdated(false), 3000);
    }
  }, [messages.length, documentType]);

  // ─── localStorage persistence for editor chat ───
  const storageKey = useMemo(() => {
    const key = documentId || documentType;
    return `chat_editor_${key}`;
  }, [documentId, documentType]);

  // Load from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Message[];
        if (parsed.length > 0) {
          setMessages(parsed.map(m => ({ ...m, timestamp: new Date(m.timestamp) })));
          setShowQuickActions(false);
        }
      }
    } catch (e) { console.warn("[AIChatPanel] Failed to load saved messages:", e); }
  }, [storageKey]);

  // Save to localStorage on message change
  useEffect(() => {
    if (messages.length > 0) {
      try {
        const toSave = messages.slice(-50); // FIFO limit
        localStorage.setItem(storageKey, JSON.stringify(toSave));
      } catch (e) { console.warn("[AIChatPanel] Failed to persist messages:", e); }
    }
  }, [messages, storageKey]);

  // Sync persisted messages when switching conversations
  useEffect(() => {
    if (persistedMessages.length > 0 && activeConversationId) {
      setMessages(persistedMessages.map(m => ({
        id: m.id, role: m.role, content: m.content, timestamp: m.timestamp,
        intent: m.intent, sources: m.sources as SourceItem[] | undefined, neuralUsed: m.neuralEnhanced,
      })));
      setShowQuickActions(false);
    }
  }, [persistedMessages, activeConversationId]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // ─── External message auto-send ───
  const externalMessageSentRef = useRef<string | null>(null);
  useEffect(() => {
    if (externalMessage && externalMessage !== externalMessageSentRef.current && !loading) {
      externalMessageSentRef.current = externalMessage;
      sendMessage(externalMessage);
      onExternalMessageSent?.();
    }
  }, [externalMessage, loading]);

  // ─── System prompt with smart chunking ───
  const buildSystemPrompt = useCallback(() => {
    // Smart chunking: extract headings + relevant section instead of first 6000 chars
    const plainText = documentContent.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ");
    const headingRegex = /<h[1-3][^>]*>(.*?)<\/h[1-3]>/gi;
    const headings: string[] = [];
    let match;
    while ((match = headingRegex.exec(documentContent)) !== null) {
      headings.push(match[1].replace(/<[^>]*>/g, "").trim());
    }
    const headingsStr = headings.length > 0 ? `\nESTRUTURA: ${headings.join(" → ")}` : "";
    const plainContent = plainText.substring(0, 5000);

    const selectionContext = selectedText ? `\n\nTRECHO SELECIONADO:\n"${selectedText.substring(0, 1000)}"` : "";

    const agentSuffix = AGENTS[selectedAgent].promptSuffix;
    const modeSuffix = MODES[selectedMode].promptSuffix;

    return `Você é o assistente jurídico IA integrado ao editor de documentos.

═══ PODERES ═══
1. REESCREVER 2. INSERIR 3. SUBSTITUIR 4. FUNDAMENTAR (leis, jurisprudência, doutrina reais)
5. FORMATAR (ABNT) 6. ANALISAR (lacunas, riscos) 7. PESQUISAR (rede neural 35+ fontes)
8. CONTRA-ARGUMENTAR 9. PRAZOS 10. LGPD

═══ REGRA ABSOLUTA DE PRESERVAÇÃO ═══
- NUNCA omita, encurte ou resuma o texto existente do usuário
- Se o usuário pedir correção/formatação de um trecho ou seção, corrija APENAS aquele trecho
- NUNCA reescreva o documento inteiro — edite cirurgicamente apenas o necessário
- Para editar uma seção específica, use <<<REWRITE section="Nome da Seção">>>conteúdo_corrigido<<<END>>>
- Para adicionar conteúdo novo sem alterar o existente, use <<<INSERT>>> ou <<<CLAUSE>>>
- Use <<<EDIT>>> SOMENTE quando o documento tem menos de 500 palavras E a edição afeta tudo
- EXCEÇÃO: Para REORGANIZAÇÃO ESTRUTURAL (adicionar títulos H1/H2/H3, reordenar seções, criar estrutura de tópicos), use <<<EDIT>>> MESMO para documentos grandes, pois a estrutura inteira muda
- Ao adicionar títulos H1/H2/H3, PRESERVE TODO o texto original — apenas insira as tags <h1>, <h2>, <h3> nos pontos apropriados sem remover, encurtar ou resumir nenhum parágrafo

═══ PROTOCOLOS ═══
- EDIÇÃO PARCIAL (seção específica): <<<REWRITE section="Nome">>>conteúdo_da_seção_corrigido<<<END>>>
- EDIÇÃO TOTAL (documentos curtos <500 palavras OU reorganização estrutural): <<<EDIT>>>documento_completo<<<END>>>
- INSERÇÕES (só texto novo): <<<INSERT>>>conteúdo<<<END>>>
- CLÁUSULA (apenas acrescenta): <<<CLAUSE>>>texto<<<END>>>
- ANÁLISE/CONVERSA: responda sem blocos.
- SEMPRE português jurídico formal.
- Se o documento tem mais de 500 palavras, PREFIRA <<<REWRITE section>>> ou <<<INSERT>>> em vez de <<<EDIT>>> (exceto para reorganização estrutural)

═══ ANTI-ALUCINAÇÃO ═══
- Números de processo DEVEM ser reais (do contexto neural)
- Súmulas DEVEM existir de fato
- Artigos DEVEM ter número E diploma legal corretos
- Sem certeza ABSOLUTA → "conforme entendimento majoritário"
- NUNCA invente decisões ou súmulas inexistentes

═══ DOCUMENTO ═══
Tipo: ${documentType} | ${docAnalysis.wordCount} palavras | ${docAnalysis.paragraphCount} parágrafos
Legal: ${docAnalysis.hasLegalBasis ? "✓" : "✗"} | Jurisp: ${docAnalysis.hasJurisprudence ? "✓" : "✗"} | Doutrina: ${docAnalysis.hasDoctrine ? "✓" : "✗"}
${docAnalysis.missingElements.length > 0 ? "⚠️ LACUNAS: " + docAnalysis.missingElements.join("; ") : ""}${headingsStr}

${learnedStyleContext ? `\n${learnedStyleContext}\n` : ""}
${plainContent}${selectionContext}${agentSuffix}${modeSuffix}`;
  }, [documentContent, documentType, selectedText, docAnalysis, selectedAgent, selectedMode, learnedStyleContext]);

  // ─── Response parser ───
  const parseAssistantResponse = (content: string): { text: string; action?: ChatAction; previewText?: string } => {
    const rewriteMatch = content.match(/<<<REWRITE\s+section="([^"]+)">>>\s*([\s\S]*?)\s*<<<END>>>/);
    if (rewriteMatch) {
      const sectionTitle = rewriteMatch[1].trim();
      const rewriteText = cleanAIResponse(rewriteMatch[2].trim());
      const explanation = content.replace(/<<<REWRITE\s+section="[^"]+?">>>[\s\S]*?<<<END>>>/, "").trim();
      return { text: explanation || `✅ Seção "${sectionTitle}" reescrita:`, action: { type: "rewrite_section", sectionTitle, text: rewriteText }, previewText: rewriteText.substring(0, 500) };
    }
    const editMatch = content.match(/<<<EDIT>>>\s*([\s\S]*?)\s*<<<END>>>/);
    if (editMatch) {
      const editedText = cleanAIResponse(editMatch[1].trim());
      const explanation = content.replace(/<<<EDIT>>>[\s\S]*?<<<END>>>/, "").trim();
      // If there's a selection, replace just that. Otherwise check if the AI returned the full
      // document or only a partial snippet — partial snippets should try smart merge.
      let editAction: ChatAction;
      if (selectedText) {
        editAction = { type: "replace_selection", text: editedText };
      } else {
        const origPlain = documentContent.replace(/<[^>]*>/g, "").trim();
        const candPlain = editedText.replace(/<[^>]*>/g, "").trim();
        const origWordCount = origPlain.split(/\s+/).filter(Boolean).length;
        const candWordCount = candPlain.split(/\s+/).filter(Boolean).length;
        if (origWordCount > 30 && candWordCount < origWordCount * 0.5) {
          // Tentar merge inteligente — buscar seção correspondente no documento
          const candHeadingMatch = editedText.match(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/i);
          if (candHeadingMatch) {
            const sectionTitle = candHeadingMatch[1].replace(/<[^>]*>/g, "").trim();
            editAction = { type: "rewrite_section", sectionTitle, text: editedText };
          } else {
            // Verificar se o trecho parcial é duplicata de conteúdo existente
            const candNorm = candPlain.substring(0, 120).toLowerCase().replace(/\s+/g, " ");
            const docContainsSnippet = origPlain.toLowerCase().replace(/\s+/g, " ").includes(candNorm);
            if (docContainsSnippet && candNorm.length > 30) {
              // O trecho já existe no documento — append para evitar duplicação no meio
              editAction = { type: "append", text: editedText };
            } else {
              // Trecho realmente novo — inserir no cursor
              editAction = { type: "insert_at_cursor", text: editedText };
            }
          }
        } else {
          // Full replacement — only safe when AI returned comparable content
          editAction = { type: "replace_paragraph", index: 0, text: editedText };
        }
      }
      return { text: explanation || "✅ Texto editado pronto para aplicar:", action: editAction, previewText: editedText.substring(0, 500) };
    }
    const insertMatch = content.match(/<<<INSERT>>>\s*([\s\S]*?)\s*<<<END>>>/);
    if (insertMatch) {
      const insertText = cleanAIResponse(insertMatch[1].trim());
      const explanation = content.replace(/<<<INSERT>>>[\s\S]*?<<<END>>>/, "").trim();
      return { text: explanation || "✅ Conteúdo pronto para inserir:", action: { type: "insert_at_cursor", text: insertText }, previewText: insertText.substring(0, 500) };
    }
    const clauseMatch = content.match(/<<<CLAUSE>>>\s*([\s\S]*?)\s*<<<END>>>/);
    if (clauseMatch) {
      const clauseText = clauseMatch[1].trim();
      const explanation = content.replace(/<<<CLAUSE>>>[\s\S]*?<<<END>>>/, "").trim();
      return { text: explanation || "✅ Cláusula pronta para adicionar:", action: { type: "append", text: clauseText }, previewText: clauseText.substring(0, 500) };
    }
    return { text: content, action: { type: "info" } };
  };

  // ─── Neural search ───
  const fetchNeuralContext = async (query: string): Promise<{ context: string; sources: SourceItem[]; used: boolean }> => {
    try {
      const truncatedQuery = query.length > 3500 ? query.substring(0, 3500) : query;
      const { data: neuralData } = await supabase.functions.invoke("neural-search", {
        body: { query: truncatedQuery, mode: "search_and_index", hybrid: true, rerank: true, matchCount: 8 },
      });
      if (neuralData?.results?.length > 0) {
        const context = "\n\n═══ CONTEXTO JURÍDICO ═══\n" +
          neuralData.results.slice(0, 8).map((r: any, i: number) =>
            `[${i + 1}] ${r.title || "Resultado"}\nFonte: ${r.source_label || r.source || "Base jurídica"}\nRelevância: ${((r.similarity || r.combined_score || 0) * 100).toFixed(0)}%\n${(r.content || "").substring(0, 500)}`
          ).join("\n\n") + "\n═══ FIM ═══";
        const sources = neuralData.results.slice(0, 8).map((r: any) => ({
          title: r.title || "Resultado", source_label: r.source_label || r.source, url: r.url, content: (r.content || "").substring(0, 200),
        }));
        return { context, sources, used: true };
      }
    } catch { /* optional */ }
    return { context: "", sources: [], used: false };
  };

  // ─── Send message ───
  const sendMessage = useCallback(async (userMessage: string) => {
    // Concatenate pending attachments text
    let fullMessage = userMessage.trim();
    if (pendingFiles.length > 0) {
      const attachmentsText = pendingFiles.map(f =>
        f.html
          ? `[Documento "${f.fileName}"]\n═══ HTML ═══\n${f.html.substring(0, 3000)}\n═══ TEXTO ═══\n${f.text.substring(0, 2000)}\n═══ FIM ═══`
          : `[Arquivo "${f.fileName}"]\n${f.text.substring(0, 3000)}`
      ).join("\n\n");
      fullMessage = `${fullMessage}\n\n${attachmentsText}`;
      setPendingFiles([]);
    }
    if (!fullMessage || loading) return;

    const intent = detectIntent(userMessage);

    if (pendingAction && isConfirmation(userMessage)) {
      setPendingAction(null);
      return sendMessage(pendingAction.message);
    }
    if (pendingAction) setPendingAction(null);

    if (intent?.isEditCommand) {
      const clarity = analyzeClarity(userMessage, documentContent, intent.action);
      if (clarity.level !== "clear") {
        setPendingAction({ message: userMessage, intent });
        addSystemMessage(`🤔 ${clarity.suggestedQuestion || "Pode detalhar melhor?"}\n\n_Responda "sim" para prosseguir mesmo assim._`);
        return;
      }
    }

    if (intent?.action === "save" && onSave) { onSave(); addSystemMessage("✅ Documento salvo!"); return; }
    if (intent?.action === "redaction" && onRedaction) { onRedaction(); addSystemMessage("🔒 Ferramenta de redação aberta."); return; }
    // Correção 1: NÃO bypassa para onImprove — todas as edições vão pelo chat
    // para preservar a instrução específica do usuário (ex: "adicionar títulos H1, H2")
    if (intent?.action === "ruler" && onRulerChange) {
      // Parse ruler values from message
      const rulerValues = parseRulerCommand(userMessage);
      if (rulerValues) {
        onRulerChange(rulerValues.left, rulerValues.firstLine, rulerValues.right);
        addSystemMessage(`📏 Régua ajustada! Recuo esquerdo: ${(rulerValues.left / 37.8).toFixed(1)}cm | 1ª linha: ${(rulerValues.firstLine / 37.8).toFixed(1)}cm | Recuo direito: ${(rulerValues.right / 37.8).toFixed(1)}cm`);
        return;
      }
      // Auto-detect from document content (includes font/spacing)
      const detected = detectRulerFromContent(documentContent);
      onRulerChange(detected.left, detected.firstLine, detected.right);
      const parts = [
        `• Recuo esquerdo: **${(detected.left / 37.8).toFixed(1)}cm**`,
        `• 1ª linha: **${(detected.firstLine / 37.8).toFixed(1)}cm**`,
        `• Recuo direito: **${(detected.right / 37.8).toFixed(1)}cm**`,
      ];
      if (detected.fontFamily) parts.push(`• Fonte: **${detected.fontFamily}**`);
      if (detected.fontSize) parts.push(`• Tamanho: **${detected.fontSize}**`);
      if (detected.lineHeight) parts.push(`• Entrelinhas: **${detected.lineHeight}**`);
      if (detected.textAlign) parts.push(`• Alinhamento: **${detected.textAlign}**`);
      addSystemMessage(`📏 Formatação detectada no documento!\n\n${parts.join("\n")}`);
      return;
    }

    const userMsg: Message = { id: crypto.randomUUID(), role: "user", content: fullMessage, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setLoading(true);
    setShowQuickActions(false);

    let convId = activeConversationId;
    if (!convId) convId = await createConversation(userMessage.substring(0, 80));
    if (convId) saveMessage(convId, { role: "user", content: userMessage.trim() });

    try {
      const isEdgeAgent = ["leitor", "construtor", "investigador"].includes(selectedAgent);

      if (isEdgeAgent) {
        // Route through specialized edge function agents — force the selected agent
        const edgeFnName = AGENTS[selectedAgent].edgeFunction || selectedAgent;
        setActiveSources([edgeFnName]);
        const forceAgentMap: Record<string, "leitura" | "construcao" | "pesquisa"> = {
          leitor: "leitura",
          construtor: "construcao",
          investigador: "pesquisa",
        };
        const agentResult = await smartAgentRoute(
          userMessage, documentContent, documentType, documentId,
          forceAgentMap[selectedAgent]
        );

        let responseText = "";
        let edgeAction: ChatAction = { type: "info" };

        if (agentResult.success) {
          responseText = agentResult.analysis || agentResult.message || "✅ Processado com sucesso.";

          // ─── Construtor: generated documents/code are insertable ───
          if (agentResult.proposal) {
            const proposalCode = agentResult.proposal.code || "";
            const isHtmlContent = /<(p|div|h[1-6]|ul|ol|table)\b/i.test(proposalCode);
            
            if (isHtmlContent || agentResult.proposal.type === "document") {
              // Document generation → offer to insert/replace
              const cleanedCode = cleanAIResponse(proposalCode);
              responseText = `📋 **${agentResult.proposal.type === "document" ? "Documento" : "Proposta"} gerado** (${agentResult.proposal.description})\n\nClique em "Aplicar" para inserir no editor.`;
              
              const origWords = documentContent.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length;
              if (origWords < 50) {
                edgeAction = { type: "replace_paragraph", index: 0, text: cleanedCode };
              } else {
                edgeAction = { type: "append", text: cleanedCode };
              }
            } else {
              // Code/SQL proposals → show in code block (not insertable in document)
              responseText += `\n\n📋 **Proposta** (${agentResult.proposal.type})\nStatus: ⏳ ${agentResult.proposal.status}\n\n\`\`\`\n${proposalCode.substring(0, 1500)}\n\`\`\``;
            }
          }

          // ─── Investigador/Pesquisa: search results can be inserted as fundamentação ───
          if (selectedAgent === "investigador" && agentResult.raw_results && (agentResult.raw_results as unknown[]).length > 0) {
            responseText += `\n\n📊 ${agentResult.results_count} resultados encontrados.`;
            // If the analysis contains legal references, offer to insert
            const analysis = agentResult.analysis || "";
            if (/art\.|lei\s|súmula|jurisprud|stf|stj/i.test(analysis) && analysis.length > 200) {
              const formattedInsert = `<p>${analysis.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>")}</p>`;
              edgeAction = { type: "insert_at_cursor", text: formattedInsert };
              responseText = `🔍 **Pesquisa concluída** — ${agentResult.results_count} fontes encontradas.\n\nClique em "Aplicar" para inserir a fundamentação no documento.`;
            }
          }

          // ─── Leitor: analysis results with suggestions → offer insert ───
          if (selectedAgent === "leitor" && agentResult.analysis) {
            const analysis = agentResult.analysis;
            // If analysis contains actionable suggestions (numbered items), format for insertion
            if (/\d+\.\s/.test(analysis) && analysis.length > 300) {
              responseText = `📖 **Análise do Leitor IA**\n\n${analysis}`;
              // Don't auto-create insert action for analysis — it's informational
              // But if user asked to "melhorar" or "corrigir", create an action
              if (/melhore|corrija|reescreva|ajuste|formate/i.test(userMessage)) {
                const formattedInsert = `<p>${analysis.replace(/\n\n/g, "</p><p>").replace(/\n/g, "<br>")}</p>`;
                edgeAction = { type: "replace_paragraph", index: 0, text: formattedInsert };
              }
            }
          }
        } else {
          responseText = `❌ Erro: ${agentResult.error || "Falha no agente."}`;
        }

        const assistantMsg: Message = {
          id: crypto.randomUUID(), role: "assistant", content: responseText, timestamp: new Date(),
          action: edgeAction, neuralUsed: false,
          ...(edgeAction.type !== "info" && "text" in edgeAction ? { previewText: (edgeAction as any).text?.replace(/<[^>]*>/g, "").substring(0, 500) } : {}),
        };
        setMessages(prev => [...prev, assistantMsg]);
        setLastAssistantText(responseText);
        if (convId) saveMessage(convId, { role: "assistant", content: responseText, neuralEnhanced: false });
      } else {
        // Original flow for editor agents (revisor, pesquisador, estrategista, formatador)
        setActiveSources(["aprimorar", "neural_search"]);
        const neuralCtx = await fetchNeuralContext(userMessage);
        const systemPrompt = buildSystemPrompt();
        const chatHistory = messages.slice(-10).map(m => ({ role: m.role, content: m.content }));

        const { data, error } = await supabase.functions.invoke("aprimorar-documento", {
          body: {
            currentText: documentContent, documentType, query: userMessage, mode: "chat",
            chatHistory, contextSnippet: documentContent.replace(/<[^>]*>/g, "").substring(0, 4000),
            systemOverride: systemPrompt + neuralCtx.context, isJudicial: true,
          },
        });
        if (error) throw error;

      const enrichedText = data?.enrichedText || data?.content;
      const chatResponse = data?.chatResponse;
      let responseText = "";
      let editActionText: string | null = null;

      if (enrichedText && enrichedText !== documentContent) {
        responseText = chatResponse || "✅ Documento editado pela IA. Clique para aplicar:";
        editActionText = cleanAIResponse(enrichedText);
      } else if (chatResponse) {
        responseText = chatResponse;
      } else {
        responseText = enrichedText || "Desculpe, não consegui processar.";
      }

      let { text, action, previewText } = parseAssistantResponse(responseText);

      if (editActionText && (!action || action.type === "info")) {
        const plainPreview = editActionText.replace(/<[^>]*>/g, "").substring(0, 500);
        
        // ─── Fallback inteligente: detectar resposta parcial ───
        const origWordCount = documentContent.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length;
        const candidateWordCount = editActionText.replace(/<[^>]*>/g, "").split(/\s+/).filter(Boolean).length;
        const isPartialResponse = origWordCount > 30 && candidateWordCount < origWordCount * 0.5;
        
        if (selectedText) {
          action = { type: "replace_selection", text: editActionText };
        } else if (isPartialResponse) {
          // Merge inteligente — detectar seção por heading
          const candHeadingMatch = editActionText.match(/<h[1-3][^>]*>(.*?)<\/h[1-3]>/i);
          if (candHeadingMatch) {
            const sectionTitle = candHeadingMatch[1].replace(/<[^>]*>/g, "").trim();
            action = { type: "rewrite_section", sectionTitle, text: editActionText };
            if (!text || text === responseText) text = `✅ Seção "${sectionTitle}" editada pela IA:`;
          } else {
            // Verificar overlap antes de inserir
            const candNorm = editActionText.replace(/<[^>]*>/g, "").substring(0, 120).toLowerCase().replace(/\s+/g, " ");
            const origNorm = documentContent.replace(/<[^>]*>/g, "").toLowerCase().replace(/\s+/g, " ");
            if (origNorm.includes(candNorm) && candNorm.length > 30) {
              action = { type: "append", text: editActionText };
              if (!text || text === responseText) text = "✅ Trecho editado pela IA (adicionado ao final para evitar duplicação):";
            } else {
              action = { type: "insert_at_cursor", text: editActionText };
              if (!text || text === responseText) text = "✅ Trecho gerado pela IA. Será inserido na posição do cursor:";
            }
          }
        } else {
          action = { type: "replace_paragraph", index: 0, text: editActionText };
        }
        previewText = plainPreview;
        if (!text || text === responseText) text = "✅ Documento editado pela IA. Revise e aplique:";
      }

      // Conversational responses without edit markers stay as info — do NOT append to document
      // (previously this forced append, inserting chat explanations into the document)

      const suggestions = generateSuggestions(intent?.action, docAnalysis, documentType);
      const assistantMsg: Message = {
        id: crypto.randomUUID(), role: "assistant", content: text, timestamp: new Date(),
        action, neuralUsed: neuralCtx.used, previewText, intent: intent?.action, sources: neuralCtx.sources, suggestions,
      };

      setMessages(prev => [...prev, assistantMsg]);
      setLastAssistantText(text);

      if (convId) saveMessage(convId, { role: "assistant", content: text, intent: intent?.action, sources: neuralCtx.sources, neuralEnhanced: neuralCtx.used });

      logNeural({
        interaction_type: "chat", input_text: userMessage, output_text: text.substring(0, 2000),
        metadata: { intent: intent?.action, isEdit: true, documentType, neuralUsed: neuralCtx.used, docWordCount: docAnalysis.wordCount, category: intent?.category || "general", sourcesCount: neuralCtx.sources.length },
      });
      } // close else block for non-edge agents
    } catch (err) {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "assistant", content: "❌ Erro ao processar. Verifique sua conexão e tente novamente.", timestamp: new Date() }]);
    } finally {
      setLoading(false);
      setActiveSources([]);
    }
  }, [loading, pendingAction, pendingFiles, messages, documentContent, documentType, documentId, selectedText, selectedAgent, activeConversationId, docAnalysis, buildSystemPrompt, createConversation, saveMessage, onSave, onRedaction, onImprove, logNeural]);

  const addSystemMessage = (content: string) => {
    setMessages(prev => [...prev, { id: crypto.randomUUID(), role: "assistant", content, timestamp: new Date() }]);
  };

  const applyAction = useCallback((msg: Message) => {
    if (!msg.action || msg.action.type === "info") return;
    const action = { ...msg.action };
    if ("text" in action && action.text) action.text = cleanAIResponse(action.text);

    const isFullReplace = action.type === "replace_paragraph" || action.type === "rewrite_section";
    if (isFullReplace && onReplaceContent) {
      const mode = classifyApplyMode(msg.intent);
      const candidateHtml = reapplyUserStyles(documentContent, action.text);
      const result = safeApplyAIResult({ originalHtml: documentContent, candidateHtml, mode });
      
      if (!result.safe) {
        // ─── Merge inteligente: se a IA devolveu trecho parcial, converter para append ───
        const origWords = result.metrics.originalWordCount;
        const candWords = result.metrics.candidateWordCount;
        if (origWords > 30 && candWords < origWords * 0.5) {
          // A IA devolveu só um trecho — adicionar ao final em vez de substituir
          action.type = "append" as any;
          addSystemMessage(`⚠️ A IA retornou apenas um trecho (${candWords} palavras vs ${origWords} no documento). O conteúdo será **adicionado ao final** em vez de substituir tudo.`);
        } else {
          // Abrir comparador para o usuário decidir
          setComparisonData({ original: documentContent, modified: candidateHtml, msg });
          addSystemMessage(`⚠️ ${result.blockedReason}\n\nAbri o comparador para você revisar.`);
          return;
        }
      }
    }

    let summaryParts: string[] = [];

    switch (action.type) {
      case "replace_selection":
        if (onReplaceSelection) onReplaceSelection(action.text);
        else if (onReplaceContent && selectedText) onReplaceContent(documentContent.replace(selectedText, action.text));
        summaryParts.push("Substituiu o trecho selecionado");
        break;
      case "insert_at_cursor":
        if (onInsertAtCursor) onInsertAtCursor(action.text);
        else onInsertText?.(action.text);
        summaryParts.push("Inseriu conteúdo na posição do cursor");
        break;
      case "append": onInsertText?.(action.text); summaryParts.push("Adicionou conteúdo ao final do documento"); break;
      case "replace_paragraph":
        if (onReplaceContent) onReplaceContent(reapplyUserStyles(documentContent, action.text));
        else onInsertText?.(action.text);
        summaryParts.push("Reescreveu o documento preservando a estrutura");
        break;
      case "rewrite_section":
        if (onReplaceContent) {
          // Try to find the section by its title in HTML headings first
          const escapedTitle = action.sectionTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const htmlHeadingRegex = new RegExp(
            `(<h[1-3][^>]*>\\s*${escapedTitle}\\s*<\\/h[1-3]>[\\s\\S]*?)(?=<h[1-3][^>]*>|$)`, "i"
          );
          let replaced = documentContent.replace(htmlHeadingRegex, action.text);
          
          if (replaced === documentContent) {
            // Fallback: try plain text section match
            const plainSectionRegex = new RegExp(
              `(${escapedTitle}[\\s\\S]*?)(?=\\n[A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÜÇ]{5,}|$)`, "i"
            );
            replaced = documentContent.replace(plainSectionRegex, action.text);
          }
          
          if (replaced === documentContent) {
            // Final fallback: apply as full replacement (structural reorganization)
            onReplaceContent(reapplyUserStyles(documentContent, action.text));
            summaryParts.push(`Seção "${action.sectionTitle}" não encontrada — aplicou como reescrita completa`);
          } else {
            onReplaceContent(replaced);
            summaryParts.push(`Reescreveu a seção "${action.sectionTitle}"`);
          }
        } else {
          summaryParts.push(`Reescreveu a seção "${action.sectionTitle}"`);
        }
        break;
    }
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, applied: true } : m));

    // Summary of what was done
    const plainText = ("text" in action && action.text) ? action.text.replace(/<[^>]*>/g, "") : "";
    const wordCount = plainText.split(/\s+/).filter(Boolean).length;
    const intentLabel = msg.intent ? ` (${msg.intent})` : "";
    const summary = `✅ **Edição aplicada${intentLabel}**\n\n${summaryParts.join(". ")}. (~${wordCount} palavras${msg.neuralUsed ? ", com base neural" : ""})`;
    addSystemMessage(summary);
  }, [documentContent, selectedText, onReplaceContent, onReplaceSelection, onInsertAtCursor, onInsertText]);

  const handleFeedback = useCallback((msg: Message, type: "up" | "down") => {
    setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, feedbackGiven: type } : m));
    logNeural({ interaction_type: "document_feedback", input_text: msg.content.substring(0, 500), output_text: type, quality_score: type === "up" ? 0.9 : 0.2, metadata: { messageId: msg.id, intent: msg.intent } });
  }, [logNeural]);

  const handleNewConversation = async () => {
    await createConversation("Nova conversa");
    setMessages([]);
    setShowQuickActions(true);
    setShowHistory(false);
    try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
  };

  const handleCompare = useCallback((msg: Message) => {
    if (onReplaceContent && msg.action && "text" in msg.action) {
      const candidateHtml = reapplyUserStyles(documentContent, (msg.action as any).text);
      setComparisonData({ original: documentContent, modified: candidateHtml, msg });
    }
  }, [documentContent, onReplaceContent]);

  const handleFileExtracted = useCallback((text: string, fileName: string, html?: string) => {
    setPendingFiles(prev => [...prev, { id: crypto.randomUUID(), fileName, text, html }]);
  }, []);

  const handleRemovePendingFile = useCallback((id: string) => {
    setPendingFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  // ─── Floating button (collapsed) — skip in inline mode ───
  if (!isOpen && !inline) {
    return (
      <Button onClick={() => setIsOpen(true)} size="sm" className="fixed bottom-6 right-6 z-50 gap-2 shadow-lg btn-gold">
        <Brain className="h-4 w-4" />
        <span className="text-xs">Chat IA</span>
        {selectedText && <Badge variant="secondary" className="text-[9px] h-4 px-1 bg-primary-foreground/20">Seleção</Badge>}
        {docAnalysis.missingElements.length > 0 && <Badge variant="destructive" className="text-[9px] h-4 px-1">{docAnalysis.missingElements.length}</Badge>}
      </Button>
    );
  }

  // ─── Minimized preview — skip in inline mode ───
  const lastAiMessage = [...messages].reverse().find(m => m.role === "assistant");
  if (isMinimized && !inline) {
    return (
      <div
        className="fixed bottom-6 right-6 z-50 max-w-[320px] w-[calc(100vw-2rem)] bg-card border border-border rounded-lg shadow-2xl overflow-hidden cursor-pointer transition-all duration-300 ease-out animate-in fade-in-0 slide-in-from-bottom-2"
        onClick={() => setIsMinimized(false)}
      >
        <div className="flex items-center justify-between px-3 py-1.5 border-b border-border/50 bg-muted/50">
          <div className="flex items-center gap-1.5">
            <Brain className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-medium text-foreground">Editor IA</span>
            {loading && <span className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); setIsMinimized(false); }} title="Expandir">
              <Maximize2 className="h-3 w-3" />
            </Button>
            <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); setIsOpen(false); setIsMinimized(false); }}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
        {lastAiMessage ? (
          <div className="px-3 py-2 text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
            {lastAiMessage.content.replace(/[#*`_]/g, "").slice(0, 120)}
            {lastAiMessage.content.length > 120 && "…"}
          </div>
        ) : (
          <div className="px-3 py-2 text-[11px] text-muted-foreground italic">Nenhuma mensagem ainda</div>
        )}
      </div>
    );
  }

  // ─── Render ───
  const handleClosePanel = () => {
    if (inline && onClose) onClose();
    else setIsOpen(false);
  };

  return (
    <div className={`flex flex-col overflow-hidden transition-all duration-300 ease-out ${
      inline
        ? "h-full min-h-0 max-h-full w-full border-l border-border/50 bg-card"
        : isMobile
          ? "fixed z-50 inset-0 w-full h-full rounded-none animate-in fade-in-0 slide-in-from-bottom-4 border border-border shadow-2xl bg-card"
          : "fixed z-50 bottom-6 right-6 max-w-[400px] w-[calc(100vw-2rem)] max-h-[480px] h-[calc(100vh-8rem)] rounded-xl animate-in fade-in-0 slide-in-from-bottom-4 border border-border/60 shadow-2xl bg-card"
    }`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-muted/30 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center">
            <Brain className="h-3.5 w-3.5 text-primary" />
          </div>
          <span className="text-sm font-semibold text-foreground">Editor IA</span>
          <AgentSelector value={selectedAgent} onChange={setSelectedAgent} />
        </div>
        <div className="flex items-center gap-0.5">
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg" onClick={() => setShowHistory(!showHistory)} title="Histórico">
            <History className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg" onClick={handleNewConversation} title="Nova conversa">
            <PlusCircle className="h-3.5 w-3.5" />
          </Button>
          {!inline && (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg" onClick={() => setIsMinimized(true)} title="Minimizar">
              <Minimize2 className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-lg" onClick={handleClosePanel}>
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {showContextBar && (
        <div className="px-3 py-1.5 border-b border-border/30 bg-muted/10 flex items-center justify-between shrink-0">
          <ChatDocContextBar docAnalysis={docAnalysis} />
          <div className="flex items-center gap-1">
            <ModeSelector value={selectedMode} onChange={setSelectedMode} />
            <Button variant="ghost" size="icon" className="h-5 w-5 text-muted-foreground hover:text-foreground" onClick={() => setShowContextBar(false)} title="Esconder barra de contexto">
              <ChevronUp className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}
      {!showContextBar && (
        <div className="px-2 py-0.5 border-b border-border/30 bg-muted/10 flex items-center justify-end shrink-0">
          <Button variant="ghost" size="sm" className="h-5 text-[9px] text-muted-foreground hover:text-foreground gap-1 px-1.5" onClick={() => setShowContextBar(true)}>
            <ChevronDown className="h-3 w-3" />Contexto
          </Button>
        </div>
      )}

      {/* Smart Legal Guidance Panel */}
      {guidanceState && (
        <div className="shrink-0">
          <SmartLegalGuidancePanel
            guidanceState={guidanceState}
            justUpdated={guidanceJustUpdated}
            onRefresh={() => {
              const conversationText = messages.map(m => m.content).join(" ");
              const newState = refreshGuidanceState(conversationText, documentType, messages.length);
              setGuidanceState(newState);
              setGuidanceJustUpdated(true);
              setTimeout(() => setGuidanceJustUpdated(false), 3000);
            }}
          />
        </div>
      )}

      <div className="shrink-0"><PendingAttachments files={pendingFiles} onRemove={handleRemovePendingFile} /></div>

      {showHistory && (
        <ChatHistoryPanel
          conversations={conversations}
          activeConversationId={activeConversationId}
          loading={loadingConversations}
          onSwitch={(id) => { switchConversation(id); setShowHistory(false); }}
          onDelete={deleteConversation}
          onClose={() => setShowHistory(false)}
        />
      )}

      {selectedText && (
        <div className="px-3 py-1.5 bg-primary/5 border-b border-primary/15 flex items-center gap-2 shrink-0">
          <Scissors className="h-3 w-3 text-primary/70" />
          <span className="text-[10px] text-primary/80 truncate font-medium">
            Seleção: "{selectedText.substring(0, 60)}{selectedText.length > 60 ? "..." : ""}"
          </span>
        </div>
      )}

      {showQuickActions && messages.length === 0 && (
        <div className="shrink-0"><ChatQuickActions qualityHints={docAnalysis.qualityHints} onSendMessage={sendMessage} /></div>
      )}

      <ChatMessageList
        ref={scrollRef}
        messages={messages}
        loading={loading}
        activeSources={activeSources}
        showQuickActions={showQuickActions}
        documentContent={documentContent}
        onSendMessage={sendMessage}
        onApplyAction={applyAction}
        onFeedback={handleFeedback}
        onInsertText={onInsertText}
        onCompare={onReplaceContent ? handleCompare : undefined}
        onMarkApplied={(msgId) => setMessages(prev => prev.map(m => m.id === msgId ? { ...m, applied: true } : m))}
      />

      <div className="shrink-0">
        <ChatInputArea
          onSendMessage={sendMessage}
          onFileExtracted={handleFileExtracted}
          onInsertInDocument={onInsertText}
          onSave={onSave}
          loading={loading}
          selectedText={selectedText}
          lastAssistantText={lastAssistantText}
        />
      </div>

      {comparisonData && (
        <DocumentComparisonViewer
          originalHtml={comparisonData.original}
          modifiedHtml={comparisonData.modified}
          open={!!comparisonData}
          onClose={() => setComparisonData(null)}
          onAccept={() => {
            if (onReplaceContent) onReplaceContent(comparisonData.modified);
            setMessages(prev => prev.map(m => m.id === comparisonData.msg.id ? { ...m, applied: true } : m));
            setComparisonData(null);
          }}
          onReject={() => setComparisonData(null)}
          title="Revisão de alterações da IA"
        />
      )}
    </div>
  );
}
