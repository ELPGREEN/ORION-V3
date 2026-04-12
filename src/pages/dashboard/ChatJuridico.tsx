import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft, Send, Loader2, Copy, ThumbsUp, ThumbsDown,
  Sparkles, User, RotateCcw, Brain, ExternalLink, Calendar,
  BookOpen, GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useChatIA } from "@/contexts/ChatIAContext";
import type { ChatIAMessage } from "@/hooks/useChatIAPersistence";
import ProviderDiagnosticPanel from "@/components/dashboard/ProviderDiagnosticPanel";
// [REMOVED] import { useNeuralFeedback } from "@/hooks/useNeuralFeedback";
  const neuralConfig = { enabled: false } as any;
import { useMessageNLP } from "@/hooks/useMessageNLP";

const sugestoesIniciais = [
  "O que é usucapião e quais são os requisitos?",
  "Como funciona a pensão alimentícia?",
  "Quais são os direitos do consumidor em compras online?",
  "Explique a diferença entre dano moral e dano material",
];

// Contextual follow-up suggestions based on last response
function getContextualSuggestions(lastAssistantContent: string): string[] {
  const suggestions: string[] = [];
  const content = lastAssistantContent.toLowerCase();

  if (content.includes("prazo") || content.includes("prescrição"))
    suggestions.push("Quais são os prazos prescricionais aplicáveis?");
  if (content.includes("dano") || content.includes("indenização"))
    suggestions.push("Como calcular o valor da indenização?");
  if (content.includes("contrato") || content.includes("cláusula"))
    suggestions.push("Quais cláusulas são abusivas neste contexto?");
  if (content.includes("recurso") || content.includes("apelação"))
    suggestions.push("Qual recurso cabe nesta situação?");
  if (content.includes("lgpd") || content.includes("dado pessoal"))
    suggestions.push("Quais penalidades a LGPD prevê?");
  if (content.includes("trabalhista") || content.includes("empregado"))
    suggestions.push("Quais são os direitos do trabalhador neste caso?");
  if (content.includes("consumidor") || content.includes("fornecedor"))
    suggestions.push("O que diz o CDC sobre garantia?");

  // Always add a generic deepening suggestion
  if (suggestions.length === 0)
    suggestions.push("Pode explicar em mais detalhes?", "Quais são as jurisprudências recentes?");

  return suggestions.slice(0, 3);
}

export default function ChatJuridico() {
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const neuralConfig = { enabled: false } as any;
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [laypersonMode, setLaypersonMode] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    messages, setMessages, activeConversationId,
    createConversation, saveMessage, loadingMessages,
  } = useChatIA();
  const { nlpData, analyzeMessage } = useMessageNLP();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || loading) return;

    let convId = activeConversationId;
    if (!convId) {
      convId = await createConversation(messageText.slice(0, 80));
      if (!convId) return;
    }

    const userMessage: ChatIAMessage = {
      id: Date.now().toString(),
      role: "user",
      content: messageText,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setLoading(true);

    await saveMessage(convId, { role: "user", content: messageText });

    try {
      const { data, error } = await supabase.functions.invoke("chat-juridico", {
        body: {
          messages: updatedMessages.map(m => ({ role: m.role, content: m.content })),
          laypersonMode,
          personaConfig: neuralConfig ? {
            speech_style: neuralConfig.speech_style,
            formality_level: neuralConfig.formality_level,
            humor_mode: neuralConfig.humor_mode,
            nickname: neuralConfig.nickname,
            mirroring_enabled: neuralConfig.mirroring_enabled,
            personality_prompt: neuralConfig.personality_prompt,
            proactive_vision: neuralConfig.proactive_vision,
          } : undefined,
        },
      });
      if (error) throw error;

      const assistantMessage: ChatIAMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data?.content || "Desculpe, não consegui processar sua consulta.",
        timestamp: new Date(),
        provider: data?.provider,
        sources: data?.sources,
        neuralEnhanced: data?.neuralEnhanced,
        diagnostics: data?.diagnostics,
      };

      setMessages(prev => [...prev, assistantMessage]);
      await saveMessage(convId, {
        role: "assistant",
        content: assistantMessage.content,
        provider: assistantMessage.provider,
        sources: assistantMessage.sources,
        neuralEnhanced: assistantMessage.neuralEnhanced,
      });

      // 🧠 Neural feedback: registra cada troca como sinal de aprendizado
      // 🤖 NLP browser-side: sentiment do user + NER da resposta
      analyzeMessage(userMessage.id, messageText);
      analyzeMessage(assistantMessage.id, assistantMessage.content);
    } catch (err: any) {
      toast({ title: "Erro na consulta", description: "Não foi possível processar sua mensagem.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!", description: "Texto copiado para a área de transferência." });
  };

  const handleNewChat = async () => {
    await createConversation("Nova consulta");
  };

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      <header className="sticky top-0 z-50 bg-secondary border-b border-sidebar-border">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="text-secondary-foreground" asChild>
              <Link to="/dashboard"><ArrowLeft className="h-5 w-5" /></Link>
            </Button>
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-gold" />
              <span className="font-semibold text-secondary-foreground">Chat Jurídico IA</span>
            </div>
          </div>
           <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-secondary-foreground" onClick={handleNewChat}>
              <RotateCcw className="h-4 w-4 mr-1" /> Nova Consulta
            </Button>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={laypersonMode ? "default" : "ghost"}
                    size="sm"
                    className={laypersonMode ? "bg-primary text-primary-foreground" : "text-secondary-foreground"}
                    onClick={() => setLaypersonMode(!laypersonMode)}
                  >
                    <GraduationCap className="h-4 w-4 mr-1" />
                    {laypersonMode ? "Modo Leigo ✓" : "Modo Leigo"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="max-w-[200px] text-xs">
                  {laypersonMode
                    ? "Ativo: respostas simplificadas sem jargão jurídico"
                    : "Ative para receber respostas em linguagem simples, sem termos técnicos"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="container max-w-3xl py-6 space-y-6">
          {loadingMessages ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center py-12">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h2 className="font-serif text-2xl font-semibold mb-2">Chat Jurídico com IA</h2>
              <div className="flex items-center justify-center gap-2 mb-3">
                <span className="text-[10px] px-2 py-1 bg-primary/10 border border-primary/20 text-primary flex items-center gap-1.5 rounded-full">
                  <Brain className="h-3 w-3" /> RAG Neural Ativo
                </span>
                <span className="text-[10px] px-2 py-1 bg-muted border border-border text-muted-foreground rounded-full">
                  63k+ fontes jurídicas
                </span>
              </div>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                Tire suas dúvidas jurídicas com nossa IA especializada em direito brasileiro, 
                conectada à <span className="text-primary font-medium">Rede Neural Conexão</span> com acesso a jurisprudência, legislação e doutrina.
              </p>
              <div className="grid sm:grid-cols-2 gap-3 max-w-lg mx-auto">
                {sugestoesIniciais.map((sugestao) => (
                  <button key={sugestao} onClick={() => handleSend(sugestao)} className="p-3 text-left text-sm rounded-lg border border-border bg-card hover:bg-accent transition-colors">
                    {sugestao}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => (
              <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}>
                {message.role === "assistant" && (
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <Sparkles className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
                <div className={`max-w-[80%] ${message.role === "user" ? "order-first" : ""}`}>
                  <Card className={`p-4 ${message.role === "user" ? "bg-primary text-primary-foreground" : "bg-card"}`}>
                    {message.role === "assistant" && (
                      <div className="flex items-center gap-2 mb-3 flex-wrap">
                        {message.provider && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-primary/10 border border-primary/20 text-primary uppercase">via {message.provider}</span>
                        )}
                        {message.neuralEnhanced && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-primary/10 border border-primary/20 text-primary flex items-center gap-1">
                            <Brain className="h-2.5 w-2.5" /> RAG Neural
                          </span>
                         )}
                        {/* NLP Sentiment Badge */}
                        {nlpData[message.id]?.sentiment && (
                          <span className={`text-[9px] px-1.5 py-0.5 border rounded-sm flex items-center gap-1 ${
                            nlpData[message.id].sentiment!.label === "POSITIVE"
                              ? "bg-accent/10 border-accent/30 text-accent"
                              : nlpData[message.id].sentiment!.label === "NEGATIVE"
                              ? "bg-destructive/10 border-destructive/30 text-destructive"
                              : "bg-muted border-border text-muted-foreground"
                          }`}>
                            {nlpData[message.id].sentiment!.label === "POSITIVE" ? "😊" : nlpData[message.id].sentiment!.label === "NEGATIVE" ? "😟" : "😐"}
                            {" "}{(nlpData[message.id].sentiment!.score * 100).toFixed(0)}%
                          </span>
                        )}
                        {message.sources && message.sources.length > 0 && (
                          <span className="text-[9px] px-1.5 py-0.5 bg-muted border border-border text-muted-foreground">{message.sources.length} fontes</span>
                        )}
                      </div>
                    )}
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                    {message.sources && message.sources.length > 0 && (
                      <div className="mt-4 pt-3 border-t border-border/50">
                        <div className="flex items-center gap-2 mb-2">
                          <BookOpen className="h-3.5 w-3.5 text-primary" />
                          <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                            Fontes Jurídicas ({message.sources.length})
                          </span>
                        </div>
                        <div className="space-y-1.5">
                          {message.sources.slice(0, 5).map((source: any, idx: number) => (
                            <a
                              key={idx}
                              href={source.url || "#"}
                              target={source.url ? "_blank" : undefined}
                              rel="noopener noreferrer"
                              className={`block bg-muted/30 border border-border/50 p-2.5 rounded-md transition-colors ${
                                source.url ? "hover:bg-primary/5 hover:border-primary/30 cursor-pointer" : "cursor-default"
                              }`}
                            >
                              <div className="flex items-start gap-2">
                                <Badge variant="outline" className="text-[8px] h-4 px-1.5 shrink-0 border-primary/25 text-primary font-normal mt-0.5">
                                  {source.source_label || source.source || "RAG"}
                                </Badge>
                                <div className="flex-1 min-w-0">
                                  <span className="text-[11px] font-medium text-foreground line-clamp-2 leading-snug">
                                    {source.title}
                                  </span>
                                  {source.content && (
                                    <p className="text-[9px] text-muted-foreground line-clamp-2 mt-0.5 leading-relaxed">
                                      {source.content.slice(0, 150)}...
                                    </p>
                                  )}
                                </div>
                                {source.url && (
                                  <ExternalLink className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                                )}
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* NLP Entities chips */}
                    {nlpData[message.id]?.entities && nlpData[message.id].entities!.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-border/30 flex flex-wrap gap-1.5">
                        {nlpData[message.id].entities!.slice(0, 8).map((ent, i) => (
                          <span key={i} className="text-[9px] px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary">
                            {ent.entity.replace("B-", "").replace("I-", "")} · {ent.word}
                          </span>
                        ))}
                      </div>
                    )}
                  </Card>
                  {message.role === "assistant" && (
                    <div className="space-y-2 mt-2">
                      <ProviderDiagnosticPanel diagnostics={message.diagnostics} />
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground" onClick={() => copyToClipboard(message.content)}>
                          <Copy className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground" onClick={() => console.log("thumbs up", message.provider)}>
                          <ThumbsUp className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground" onClick={() => console.log("thumbs down", message.provider)}>
                          <ThumbsDown className="h-3 w-3" />
                        </Button>
                      </div>
                      {/* Contextual suggestion chips */}
                      {messages.indexOf(message) === messages.length - 1 && (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {getContextualSuggestions(message.content).map((suggestion, i) => (
                            <button
                              key={i}
                              onClick={() => handleSend(suggestion)}
                              className="text-[10px] px-2.5 py-1 rounded-full border border-primary/20 bg-primary/5 text-primary hover:bg-primary/10 transition-colors flex items-center gap-1"
                            >
                              <Sparkles className="h-2.5 w-2.5" />
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                      {/* CTA: Agendar Consulta */}
                      <button
                        onClick={() => {
                          const lastMessages = messages.slice(-4);
                          const summary = lastMessages.map(m => `**${m.role === "user" ? "Pergunta" : "Resposta"}:** ${m.content.slice(0, 300)}`).join("\n\n");
                          sessionStorage.setItem("consultaSummary", summary);
                          navigate("/dashboard/consultas");
                        }}
                        className="flex items-center gap-2 text-[11px] text-primary hover:underline px-2 py-1 rounded border border-primary/20 bg-primary/5 hover:bg-primary/10 transition-colors"
                      >
                        <Calendar className="h-3.5 w-3.5" />
                        Deseja agendar uma consulta especializada sobre este tema?
                      </button>
                    </div>
                  )}
                </div>
                {message.role === "user" && (
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))
          )}
          {loading && (
            <div className="flex gap-3">
              <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                <Sparkles className="h-4 w-4 text-primary-foreground" />
              </div>
              <Card className="p-4 bg-card">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Consultando Rede Neural + APIs jurídicas...</span>
                </div>
              </Card>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="sticky bottom-0 bg-background border-t border-border p-4">
        <div className="container max-w-3xl">
          <div className="flex gap-2">
            <Textarea ref={textareaRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder="Digite sua dúvida jurídica..." className="min-h-[48px] max-h-[200px] resize-none" rows={1} disabled={loading} />
            <Button onClick={() => handleSend()} disabled={!input.trim() || loading} size="icon" className="h-12 w-12">
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            O Chat Jurídico IA fornece informações gerais. Consulte um advogado para casos específicos.
          </p>
        </div>
      </div>
    </div>
  );
}