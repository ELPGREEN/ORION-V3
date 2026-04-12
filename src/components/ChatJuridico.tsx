import { useState, useRef, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { Send, Scale, AlertTriangle, Calendar, Brain, ExternalLink, Sparkles, Loader2, Lock, ThumbsUp, ThumbsDown } from "lucide-react";
// [REMOVED] import { VoiceInputButton } from "@/components/dashboard/VoiceInputButton";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import { useChatIA } from "@/contexts/ChatIAContext";
  const neuralConfig = { enabled: false };
  const adaptiveCtx = {};
import type { ChatIAMessage } from "@/hooks/useChatIAPersistence";

const MAX_FREE_QUERIES = 5;

export function ChatJuridico() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isCliente } = useUserRole();
  const neuralConfig = { enabled: false };
  const adaptiveCtx = {};
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [hasShownWelcome, setHasShownWelcome] = useState(false);

  // Client limit states
  const [consultaCount, setConsultaCount] = useState(0);
  const [hasPaidConsulta, setHasPaidConsulta] = useState(false);
  const [limitLoading, setLimitLoading] = useState(true);

  const isLimitReached = isCliente && consultaCount >= MAX_FREE_QUERIES && !hasPaidConsulta;
  const showCounter = isCliente && !hasPaidConsulta && !isLimitReached;

  const {
    messages, setMessages, activeConversationId,
    createConversation, saveMessage, loadingMessages,
  } = useChatIA();

  // Fetch client query count and paid status
  useEffect(() => {
    if (!isCliente || !user) {
      setLimitLoading(false);
      return;
    }

    const fetchLimits = async () => {
      setLimitLoading(true);
      try {
        // Count user messages across all conversations using a join-based approach
        const { data: convData } = await supabase
          .from("chat_ia_conversations")
          .select("id")
          .eq("user_id", user.id);

        const convIds = convData?.map((c) => c.id) || [];
        let msgCount = 0;
        if (convIds.length > 0) {
          const { count } = await supabase
            .from("chat_ia_messages")
            .select("id", { count: "exact", head: true })
            .eq("role", "user")
            .in("conversation_id", convIds);
          msgCount = count || 0;
        }

        setConsultaCount(msgCount || 0);

        // Check for paid consultation
        const { data: paidData } = await supabase
          .from("consultas")
          .select("id")
          .eq("cliente_id", user.id)
          .eq("payment_status", "pago")
          .limit(1);

        setHasPaidConsulta((paidData?.length || 0) > 0);
      } catch (err) {
      } finally {
        setLimitLoading(false);
      }
    };

    fetchLimits();
  }, [isCliente, user]);

  // Show proactive welcome message for empty conversations
  useEffect(() => {
    if (!hasShownWelcome && !loadingMessages && !limitLoading && messages.length === 0) {
      const remainingQueries = Math.max(0, MAX_FREE_QUERIES - consultaCount);
      const welcomeContent = isCliente
        ? `Olá! Sou o assistente jurídico do escritório **ORION IA by ELP** ([OAB]). 👋\n\nPosso ajudá-lo com dúvidas sobre diversas áreas do Direito brasileiro.${
            !hasPaidConsulta
              ? `\n\n📋 Você tem **${remainingQueries} consulta${remainingQueries !== 1 ? "s" : ""} gratuita${remainingQueries !== 1 ? "s" : ""}** disponíve${remainingQueries !== 1 ? "is" : "l"}.`
              : ""
          }\n\n💡 **Gostaria de agendar uma consulta** com o ORION IA?`
        : `Olá! Sou o assistente jurídico IA do escritório **ORION IA by ELP** ([OAB]).\n\nPosso auxiliar com brainstorming jurídico, análise de documentos, redação de peças e pesquisa de jurisprudência.`;

      setMessages([{
        id: "welcome",
        role: "assistant",
        content: welcomeContent,
        timestamp: new Date(),
      }]);
      setHasShownWelcome(true);
    }
  }, [isCliente, hasShownWelcome, loadingMessages, messages.length, limitLoading, consultaCount, hasPaidConsulta]);

  // Reset welcome flag when conversation changes
  useEffect(() => {
    setHasShownWelcome(false);
  }, [activeConversationId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  // Track if last message was sent via voice
  const isVoiceMessageRef = useRef(false);

  // Get last assistant response for TTS
  const lastAssistantContent = messages
    .filter(m => m.role === "assistant" && m.id !== "welcome")
    .pop()?.content || "";

  const handleSend = async (textOverride?: string) => {
    const messageText = textOverride || input.trim();
    if (!messageText || isTyping || isLimitReached) return;

    const voiceFlag = isVoiceMessageRef.current;
    isVoiceMessageRef.current = false; // reset

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

    setMessages((prev) => [...prev.filter(m => m.id !== "welcome"), userMessage]);
    if (!textOverride) setInput("");
    setIsTyping(true);

    await saveMessage(convId, { role: "user", content: messageText });
    
    // Auto-adapt communication context based on user message
    // adaptFromMessage(messageText).catch(() => {});

    if (isCliente) {
      setConsultaCount((prev) => prev + 1);
    }

    try {
      const conversationHistory = [...messages.filter(m => m.id !== "welcome"), userMessage]
        .map((m) => ({ role: m.role, content: m.content }));

      const { data, error } = await supabase.functions.invoke("chat-juridico", {
        body: {
          messages: conversationHistory,
          isVoice: voiceFlag,
          personaConfig: neuralConfig ? {
            speech_style: "normal",
            formality_level: "formal",
            humor_mode: "none",
            nickname: "",
            mirroring_enabled: false,
            personality_prompt: "",
          } : undefined,
        },
      });

      if (error) throw error;

      const assistantMessage: ChatIAMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.content || "Desculpe, não consegui processar sua consulta.",
        timestamp: new Date(),
        intent: data.intent,
        intentParams: data.intentParams,
        provider: data.provider,
        sources: data.sources,
        neuralEnhanced: data.neuralEnhanced,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      await saveMessage(convId, {
        role: "assistant", content: assistantMessage.content,
        intent: assistantMessage.intent, intentParams: assistantMessage.intentParams,
        provider: assistantMessage.provider, sources: assistantMessage.sources,
        neuralEnhanced: assistantMessage.neuralEnhanced,
      });
    } catch (err) {
      const errorMessage: ChatIAMessage = {
        id: (Date.now() + 1).toString(), role: "assistant",
        content: "Desculpe, ocorreu um erro. Por favor, tente novamente.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center gap-3 px-6 py-4 border-b border-border bg-card/50">
        <div className="w-10 h-10 bg-primary/10 border border-primary/30 flex items-center justify-center">
          <Scale className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-serif text-foreground tracking-wider">Assistente Jurídico IA</h3>
          <p className="text-[10px] text-muted-foreground tracking-wider uppercase">ORION IA by ELP • Rede Neural Conexão</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Counter for clients without paid consultation */}
          {showCounter && (
            <span className="text-[10px] px-2 py-1 bg-primary/10 border border-primary/20 text-primary tracking-wider">
              {consultaCount}/{MAX_FREE_QUERIES} CONSULTAS
            </span>
          )}
          {isCliente && (
            <Button size="sm" className="btn-gold text-[9px] h-7 px-3" onClick={() => navigate("/dashboard/consultas")}>
              <Calendar className="h-3 w-3 mr-1" /> AGENDAR
            </Button>
          )}
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: "hsl(var(--online))" }} />
            <span className="text-[10px] tracking-wider" style={{ color: "hsl(var(--online))" }}>ONLINE</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-6">
        {loadingMessages ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}>
              <div className={`max-w-[85%] md:max-w-[75%] ${message.role === "user" ? "bg-muted border border-border text-foreground" : "bg-card border border-primary/20 text-foreground"} px-5 py-4`}>
                {message.role === "assistant" && (
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <Scale className="h-3 w-3 text-primary" />
                    <span className="text-[10px] text-primary tracking-[0.2em] uppercase font-medium">Assistente</span>
                    {/* Technical badges only for non-clients */}
                    {!isCliente && message.provider && <span className="text-[9px] px-1.5 py-0.5 bg-primary/10 border border-primary/20 text-primary uppercase">via {message.provider}</span>}
                    {!isCliente && message.neuralEnhanced && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-primary/10 border border-primary/20 text-primary flex items-center gap-1">
                        <Brain className="h-2.5 w-2.5" /> RAG
                      </span>
                    )}
                    {!isCliente && message.sources && message.sources.length > 0 && (
                      <span className="text-[9px] px-1.5 py-0.5 bg-muted border border-border text-muted-foreground">{message.sources.length} fontes</span>
                    )}
                  </div>
                )}
                <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-strong:text-primary">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
                {/* Sources section only for non-clients */}
                {!isCliente && message.sources && message.sources.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="h-3 w-3 text-primary" />
                      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Fontes</span>
                    </div>
                    <div className="space-y-2">
                      {message.sources.slice(0, 3).map((source: any, idx: number) => (
                        <div key={idx} className="bg-muted/30 border border-border/50 p-2 flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <span className="text-[9px] px-1 py-0.5 bg-primary/10 text-primary border border-primary/20 mr-2">{source.source_label}</span>
                            <span className="text-[10px] font-medium text-foreground line-clamp-1">{source.title}</span>
                          </div>
                          {source.url && (
                            <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex-shrink-0">
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {/* RLHF-style feedback buttons for assistant messages */}
                {message.role === "assistant" && message.id !== "welcome" && (
                  <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border/30">
                    <span className="text-[9px] text-muted-foreground mr-1">Útil?</span>
                    <button
                      onClick={() => {
                        toast.success("👍 Feedback registrado! Obrigado.");
                        supabase.from("neural_learning_data").insert({
                          input_text: messages.find(m => m.role === "user" && messages.indexOf(m) < messages.indexOf(message))?.content || "",
                          output_text: message.content,
                          interaction_type: "rlhf_feedback",
                          feedback: "positive",
                          quality_score: 1.0,
                          user_id: user?.id,
                        } as any);
                      }}
                      className="p-1 rounded hover:bg-emerald-500/10 transition-colors group"
                    >
                      <ThumbsUp className="h-3 w-3 text-muted-foreground group-hover:text-emerald-400 transition-colors" />
                    </button>
                    <button
                      onClick={() => {
                        toast.info("👎 Feedback registrado. Vamos melhorar!");
                        supabase.from("neural_learning_data").insert({
                          input_text: messages.find(m => m.role === "user" && messages.indexOf(m) < messages.indexOf(message))?.content || "",
                          output_text: message.content,
                          interaction_type: "rlhf_feedback",
                          feedback: "negative",
                          quality_score: 0.0,
                          user_id: user?.id,
                        } as any);
                      }}
                      className="p-1 rounded hover:bg-red-500/10 transition-colors group"
                    >
                      <ThumbsDown className="h-3 w-3 text-muted-foreground group-hover:text-red-400 transition-colors" />
                    </button>
                  </div>
                )}
                <p className={`text-[10px] mt-2 ${message.role === "user" ? "text-muted-foreground text-right" : "text-muted-foreground"}`}>
                  {message.timestamp.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))
        )}
        {isTyping && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-card border border-primary/20 px-5 py-4">
              <div className="flex items-center gap-2 mb-2">
                <Scale className="h-3 w-3 text-primary" />
                <span className="text-[10px] text-primary tracking-[0.2em] uppercase font-medium">Assistente</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" />
                <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
                <span className="w-2 h-2 bg-primary/50 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Disclaimer */}
      <div className="px-6 py-2 border-t border-border/50">
        <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
          <AlertTriangle className="h-3 w-3 flex-shrink-0" />
          <span>Esta é uma ferramenta de IA auxiliar. Não substitui consulta jurídica presencial. [OAB] — Provimento 205/2021 OAB.</span>
        </div>
      </div>

      {/* Quick actions for clients */}
      {isCliente && messages.length <= 2 && !isLimitReached && (
        <div className="px-4 md:px-6 py-2 border-t border-border/30 flex gap-2 overflow-x-auto">
          <Button variant="outline" size="sm" className="btn-outline-gold text-[9px] h-7 whitespace-nowrap" onClick={() => { setInput("Gostaria de saber sobre os tipos de consulta disponíveis e valores."); inputRef.current?.focus(); }}>
            💰 Valores de consulta
          </Button>
          <Button variant="outline" size="sm" className="btn-outline-gold text-[9px] h-7 whitespace-nowrap" onClick={() => { setInput("Gostaria de agendar uma consulta com o ORION IA."); inputRef.current?.focus(); }}>
            📅 Agendar consulta
          </Button>
          <Button variant="outline" size="sm" className="btn-outline-gold text-[9px] h-7 whitespace-nowrap" onClick={() => { setInput("Quais são as áreas de atuação do escritório?"); inputRef.current?.focus(); }}>
            📋 Áreas de atuação
          </Button>
        </div>
      )}

      {/* Limit reached banner */}
      {isLimitReached && (
        <div className="px-4 md:px-6 py-3 border-t border-primary/30 bg-primary/5">
          <div className="flex items-center gap-3">
            <Lock className="h-4 w-4 text-primary flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-foreground font-medium">Você utilizou suas {MAX_FREE_QUERIES} consultas gratuitas.</p>
              <p className="text-[10px] text-muted-foreground">Agende uma consulta com o ORION IA para continuar usando o assistente.</p>
            </div>
            <Button size="sm" className="btn-gold text-[9px] h-7 px-3 flex-shrink-0" onClick={() => navigate("/dashboard/consultas")}>
              <Calendar className="h-3 w-3 mr-1" /> AGENDAR CONSULTA
            </Button>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-4 md:px-6 py-4 border-t border-border bg-card/30">
        <div className="flex items-end gap-2">
          
          <div className="flex-1 relative">
            <textarea ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
              placeholder={isLimitReached ? "Limite de consultas gratuitas atingido. Agende uma consulta para continuar." : "Digite sua consulta jurídica aqui..."} rows={1}
              disabled={isLimitReached}
              className="w-full bg-input border border-border text-foreground text-sm px-4 py-3 pr-12 resize-none focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 placeholder:text-muted-foreground/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ minHeight: "44px", maxHeight: "120px" }} />
          </div>
          <Button onClick={() => handleSend()} disabled={!input.trim() || isTyping || isLimitReached} className="btn-gold h-[44px] w-[44px] p-0 flex items-center justify-center flex-shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
