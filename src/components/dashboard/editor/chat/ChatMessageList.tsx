import { forwardRef, useEffect, useRef, useMemo } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Brain, User, Copy, Eye, Plus, Replace, CheckCircle2,
  ThumbsUp, ThumbsDown, ExternalLink, BookOpen, ArrowRight,
  ShieldCheck, ShieldAlert, Shield, AlertTriangle, Globe,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import ReactMarkdown from "react-markdown";
import { SourcesLoadingIndicator } from "@/components/dashboard/SourcesLoadingIndicator";
import { checkResponseQuality, type ResponseQualityResult as QualityResult } from "@/lib/analysis";
// @ts-ignore - provider type mismatch after cleanup
// Hallucination detection removed
type HallucinationWarning = { entity: string; severity: "high" | "medium" | "low"; reason: string };
function detectHallucinations(_text: any): HallucinationWarning[] { return []; }
function detectPipelineRoute(_text: string): string | null { return null; }
import { textSimilarity, softCosineSimilarity } from "@/lib/analysis";

// ─── Types (shared) ───
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

export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  action?: ChatAction;
  applied?: boolean;
  neuralUsed?: boolean;
  previewText?: string;
  intent?: string;
  sources?: SourceItem[];
  feedbackGiven?: "up" | "down";
  suggestions?: string[];
  confidenceScore?: number;
}

const INTENT_COLORS: Record<string, string> = {
  pesquisa: "bg-blue-500/15 text-blue-400 border-blue-500/25",
  documento: "bg-amber-500/15 text-amber-400 border-amber-500/25",
  sintese: "bg-purple-500/15 text-purple-400 border-purple-500/25",
  consulta: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
  analysis: "bg-orange-500/15 text-orange-400 border-orange-500/25",
  swot: "bg-orange-500/15 text-orange-400 border-orange-500/25",
  counterargument: "bg-red-500/15 text-red-400 border-red-500/25",
  gaps: "bg-yellow-500/15 text-yellow-400 border-yellow-500/25",
  legislation: "bg-cyan-500/15 text-cyan-400 border-cyan-500/25",
  doctrine: "bg-indigo-500/15 text-indigo-400 border-indigo-500/25",
  deadlines: "bg-rose-500/15 text-rose-400 border-rose-500/25",
  jurisdiction: "bg-teal-500/15 text-teal-400 border-teal-500/25",
  redaction: "bg-zinc-500/15 text-zinc-400 border-zinc-500/25",
  add_clause: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
};

function getActionLabel(action?: ChatAction): string {
  if (!action || action.type === "info") return "";
  switch (action.type) {
    case "replace_selection": return "Substituir seleção";
    case "insert_at_cursor": return "Inserir no cursor";
    case "append": return "Adicionar ao final";
    case "replace_paragraph": return "Aplicar edição";
    case "rewrite_section": return "Reescrever seção";
    default: return "Aplicar";
  }
}

function getActionIcon(action?: ChatAction) {
  if (!action || action.type === "info") return null;
  switch (action.type) {
    case "replace_selection": return <Replace className="h-3 w-3" />;
    case "insert_at_cursor": return <Plus className="h-3 w-3" />;
    case "append": return <Plus className="h-3 w-3" />;
    default: return <CheckCircle2 className="h-3 w-3" />;
  }
}

// ─── Sub-components ───

function MessageBadges({ msg, qualityResult, route }: {
  msg: Message;
  qualityResult?: QualityResult;
  route?: ReturnType<typeof detectPipelineRoute>;
}) {
  if (!msg.neuralUsed && !msg.intent && !qualityResult && !route) return null;
  return (
    <div className="flex items-center gap-1 mb-2 flex-wrap">
      {route && (
        <>
          <Badge variant="outline" className="text-[8px] h-4 px-1.5 border-muted-foreground/20 text-muted-foreground font-normal">
            {route.icon} {route.label}
          </Badge>
          {route.fallbackUsed && (
            <Badge variant="outline" className="text-[8px] h-4 px-1.5 border-amber-500/25 text-amber-400 font-normal">
              <Globe className="h-2 w-2 mr-0.5" /> +Web
            </Badge>
          )}
        </>
      )}
      {msg.intent && (
        <Badge variant="outline" className={`text-[8px] h-4 px-1.5 font-normal ${INTENT_COLORS[msg.intent] || "border-border text-muted-foreground"}`}>
          {msg.intent}
        </Badge>
      )}
      {msg.neuralUsed && (
        <Badge variant="outline" className="text-[8px] h-4 px-1.5 border-primary/25 text-primary font-normal">
          <Brain className="h-2 w-2 mr-0.5" /> Neural
        </Badge>
      )}
      {qualityResult && (() => {
        const QIcon = qualityResult.level === "alta" ? ShieldCheck : qualityResult.level === "media" ? Shield : ShieldAlert;
        return (
          <Badge variant="outline" className={`text-[8px] h-4 px-1.5 font-normal ${qualityResult.color}`}>
            <QIcon className="h-2 w-2 mr-0.5" /> {qualityResult.label}
          </Badge>
        );
      })()}
    </div>
  );
}

function HallucinationWarnings({ warnings }: { warnings: HallucinationWarning[] }) {
  return (
    <TooltipProvider>
      <div className="mt-2 space-y-0.5">
        {warnings.map((w, i) => (
          <Tooltip key={i}>
            <TooltipTrigger asChild>
              <div className={`flex items-center gap-1.5 text-[9px] px-2 py-1 rounded-md ${
                w.severity === "high" ? "bg-destructive/10 text-destructive border border-destructive/15" :
                w.severity === "medium" ? "bg-amber-500/10 text-amber-400 border border-amber-500/15" :
                "bg-muted text-muted-foreground border border-border/20"
              }`}>
                <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate">⚠ {w.entity} — Referência não verificada</span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-[220px] text-[10px]">
              {w.reason}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}

function SourcesCollapsible({ sources }: { sources: SourceItem[] }) {
  return (
    <Collapsible>
      <CollapsibleTrigger className="flex items-center gap-1.5 text-[9px] text-muted-foreground hover:text-foreground mt-2 transition-colors">
        <BookOpen className="h-2.5 w-2.5" /> {sources.length} fonte{sources.length > 1 ? "s" : ""} neural
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="mt-1.5 pt-1.5 border-t border-border/20 space-y-1">
          {sources.map((src, i) => (
            <div key={i} className="flex items-center gap-1.5 text-[9px]">
              <Badge variant="outline" className="text-[7px] h-3.5 px-1 shrink-0 border-muted-foreground/20 text-muted-foreground font-normal">
                {src.source_label || "RAG"}
              </Badge>
              {src.url ? (
                <a href={src.url} target="_blank" rel="noopener noreferrer" className="text-primary/80 hover:text-primary truncate flex items-center gap-0.5 transition-colors">
                  {src.title} <ExternalLink className="h-2 w-2 shrink-0" />
                </a>
              ) : (
                <span className="text-muted-foreground truncate">{src.title}</span>
              )}
            </div>
          ))}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function SuggestionsBlock({ suggestions, documentContent, onSendMessage }: {
  suggestions: string[];
  documentContent?: string;
  onSendMessage: (msg: string) => void;
}) {
  return (
    <div className="mt-2.5 pt-2 border-t border-border/20 space-y-1">
      <p className="text-[8px] text-muted-foreground/50 uppercase tracking-wider font-medium">Próximos passos</p>
      {suggestions.map((s, i) => {
        const cosine = documentContent ? textSimilarity(s, documentContent) : 0;
        const soft = documentContent ? softCosineSimilarity(s, documentContent) : 0;
        const relevance = cosine * 0.5 + soft * 0.5;
        const pct = Math.min(Math.round(relevance * 100), 100);
        return (
          <button key={i} className="w-full flex items-center gap-1.5 text-[9px] text-primary/60 hover:text-primary transition-colors py-0.5"
            onClick={() => onSendMessage(s)}>
            <ArrowRight className="h-2.5 w-2.5 shrink-0" />
            <span className="flex-1 text-left">{s}</span>
            {documentContent && relevance > 0 && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="flex items-center gap-0.5 shrink-0">
                      <div className="w-8 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            pct >= 60 ? "bg-emerald-500" : pct >= 30 ? "bg-amber-500" : "bg-muted-foreground/40"
                          }`}
                          style={{ width: `${Math.max(pct, 8)}%` }}
                        />
                      </div>
                      <span className="text-[7px] text-muted-foreground w-5 text-right">{pct}%</span>
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="text-[10px]">
                    Relevância ao documento: {pct}%
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </button>
        );
      })}
    </div>
  );
}

function ActionButtons({ msg, onApplyAction, onFeedback, onInsertText, onCompare, onMarkApplied }: {
  msg: Message;
  onApplyAction: (msg: Message) => void;
  onFeedback: (msg: Message, type: "up" | "down") => void;
  onInsertText?: (text: string) => void;
  onCompare?: (msg: Message) => void;
  onMarkApplied: (msgId: string) => void;
}) {
  return (
    <div className="flex gap-2 mt-2.5 pt-2 border-t border-border/30 flex-wrap items-center">
      <button className="text-[9px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        onClick={() => navigator.clipboard.writeText(msg.content)}>
        <Copy className="h-2.5 w-2.5" /> Copiar
      </button>
      {!msg.feedbackGiven ? (
        <>
          <button className="text-[9px] text-muted-foreground hover:text-primary flex items-center gap-0.5 transition-colors"
            onClick={() => onFeedback(msg, "up")}>
            <ThumbsUp className="h-2.5 w-2.5" />
          </button>
          <button className="text-[9px] text-muted-foreground hover:text-destructive flex items-center gap-0.5 transition-colors"
            onClick={() => onFeedback(msg, "down")}>
            <ThumbsDown className="h-2.5 w-2.5" />
          </button>
        </>
      ) : (
        <span className="text-[9px] text-muted-foreground/40">
          {msg.feedbackGiven === "up" ? "👍" : "👎"}
        </span>
      )}
      {msg.action && msg.action.type !== "info" && (
        <>
          {msg.applied ? (
            <span className="text-[9px] text-primary flex items-center gap-1 font-medium">
              <CheckCircle2 className="h-3 w-3" /> Aplicado ✓
            </span>
          ) : (
            <>
              <button
                className={`text-[10px] flex items-center gap-1 font-medium px-2.5 py-1 rounded-md transition-colors ${
                  msg.action.type === "replace_paragraph" || msg.action.type === "replace_selection" || msg.action.type === "rewrite_section"
                    ? "bg-primary/15 text-primary hover:bg-primary/25 border border-primary/20"
                    : "text-primary hover:text-primary/80"
                }`}
                onClick={() => onApplyAction(msg)}>
                {getActionIcon(msg.action)} {getActionLabel(msg.action)}
              </button>
              {(msg.action.type === "replace_paragraph" || msg.action.type === "rewrite_section") && onCompare && (
                <button className="text-[9px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
                  onClick={() => onCompare(msg)}>
                  <Eye className="h-2.5 w-2.5" /> Comparar
                </button>
              )}
            </>
          )}
          {onInsertText && !msg.applied && msg.action.type !== "replace_paragraph" && (
            <button className="text-[9px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              onClick={() => {
                const actionText = (msg.action as any)?.text || msg.content;
                onInsertText(actionText);
                onMarkApplied(msg.id);
              }}>
              <Plus className="h-2.5 w-2.5" /> Inserir ao final
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ─── Main ───

interface ChatMessageListProps {
  messages: Message[];
  loading: boolean;
  activeSources: string[];
  showQuickActions: boolean;
  documentContent?: string;
  onSendMessage: (msg: string) => void;
  onApplyAction: (msg: Message) => void;
  onFeedback: (msg: Message, type: "up" | "down") => void;
  onInsertText?: (text: string) => void;
  onCompare?: (msg: Message) => void;
  onMarkApplied: (msgId: string) => void;
}

export const ChatMessageList = forwardRef<HTMLDivElement, ChatMessageListProps>(
  ({ messages, loading, activeSources, showQuickActions, documentContent, onSendMessage, onApplyAction, onFeedback, onInsertText, onCompare, onMarkApplied }, ref) => {
    const bottomRef = useRef<HTMLDivElement>(null);

    const qualityMap = useMemo(() => {
      const map = new Map<string, QualityResult>();
      for (const msg of messages) {
        if (msg.role === "assistant" && msg.content) {
          map.set(msg.id, checkResponseQuality(msg.content, documentContent || "", msg.intent));
        }
      }
      return map;
    }, [messages, documentContent]);

    const hallucinationMap = useMemo(() => {
      const map = new Map<string, HallucinationWarning[]>();
      for (const msg of messages) {
        if (msg.role === "assistant" && msg.content) {
          const warnings = detectHallucinations(msg.content);
          if (warnings.length > 0) map.set(msg.id, warnings);
        }
      }
      return map;
    }, [messages]);

    const routeMap = useMemo(() => {
      const map = new Map<string, ReturnType<typeof detectPipelineRoute>>();
      for (const msg of messages) {
        if (msg.role === "assistant") {
          map.set(msg.id, detectPipelineRoute(msg));
        }
      }
      return map;
    }, [messages]);

    useEffect(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, loading]);

    return (
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div ref={ref} className="p-3 space-y-3">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center py-10">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                <Brain className="h-5 w-5 text-primary/50" />
              </div>
              <p className="text-xs font-medium text-muted-foreground">Editor IA Jurídico</p>
              <p className="text-[10px] text-muted-foreground/50 mt-1 max-w-[200px]">
                {showQuickActions
                  ? "Diga o que editar — melhorar, formatar, adicionar leis, gerar ementa..."
                  : "Edita, melhora, formata e fundamenta seu documento diretamente."}
              </p>
            </div>
          )}

          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Brain className="h-3 w-3 text-primary" />
                </div>
              )}
              <div className={`max-w-[88%] sm:max-w-[85%] rounded-xl px-3.5 py-2.5 text-[11px] sm:text-xs leading-relaxed break-words [overflow-wrap:anywhere] ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-secondary/80 text-foreground rounded-bl-sm border border-border/30"
              }`}>
                {msg.role === "assistant" && (
                  <MessageBadges msg={msg} qualityResult={qualityMap.get(msg.id)} route={routeMap.get(msg.id)} />
                )}

                {msg.role === "assistant" ? (
                  <div className="prose prose-xs dark:prose-invert max-w-none break-words [overflow-wrap:anywhere] [&_p]:my-1 [&_li]:my-0.5 [&_ul]:my-1 [&_ol]:my-1 [&_h1]:text-sm [&_h2]:text-xs [&_h3]:text-xs [&_strong]:text-foreground [&_code]:text-[10px] [&_code]:bg-muted [&_code]:px-1 [&_code]:rounded [&_pre]:overflow-x-auto [&_pre]:max-w-full">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : msg.content}

                {msg.role === "assistant" && hallucinationMap.has(msg.id) && (
                  <HallucinationWarnings warnings={hallucinationMap.get(msg.id)!} />
                )}

                {msg.role === "assistant" && msg.sources && msg.sources.length > 0 && (
                  <SourcesCollapsible sources={msg.sources} />
                )}

                {msg.role === "assistant" && msg.previewText && (
                  <Collapsible>
                    <CollapsibleTrigger className="flex items-center gap-1 text-[9px] text-muted-foreground hover:text-foreground mt-2 transition-colors">
                      <Eye className="h-2.5 w-2.5" /> Ver preview
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-1.5 p-2 rounded-md bg-muted/40 text-[10px] text-muted-foreground max-h-[120px] overflow-y-auto whitespace-pre-wrap border border-border/20">
                        {msg.previewText}{msg.previewText.length >= 500 ? "..." : ""}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                )}

                {msg.role === "assistant" && msg.suggestions && msg.suggestions.length > 0 && (
                  <SuggestionsBlock suggestions={msg.suggestions} documentContent={documentContent} onSendMessage={onSendMessage} />
                )}

                {msg.role === "assistant" && (
                  <ActionButtons
                    msg={msg}
                    onApplyAction={onApplyAction}
                    onFeedback={onFeedback}
                    onInsertText={onInsertText}
                    onCompare={onCompare}
                    onMarkApplied={onMarkApplied}
                  />
                )}
              </div>
              {msg.role === "user" && (
                <div className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <User className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}

          {loading && <SourcesLoadingIndicator activeSources={activeSources} compact />}
          <div ref={bottomRef} />
        </div>
      </div>
    );
  }
);

ChatMessageList.displayName = "ChatMessageList";
