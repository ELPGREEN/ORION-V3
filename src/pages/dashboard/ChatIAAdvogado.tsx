import { useState, useRef, useEffect } from "react";
import { useNeuralFeedback } from "@/hooks/useNeuralFeedback";
import ReactMarkdown from "react-markdown";
import { useNavigate } from "react-router-dom";
import {
  Send, Loader2, Copy, Sparkles, User, Search, FileText, Scale, BookOpen,
  Gavel, Lightbulb, Trash2, Brain, ExternalLink, ArrowRight, Share2,
} from "lucide-react";
import { VoiceInputButton } from "@/components/dashboard/VoiceInputButton";
import { ChatFileUpload } from "@/components/dashboard/ChatFileUpload";
import { SourcesLoadingIndicator } from "@/components/dashboard/SourcesLoadingIndicator";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useChatIA } from "@/contexts/ChatIAContext";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "@/integrations/supabase/config";
import type { ChatIAMessage } from "@/hooks/useChatIAPersistence";

const ferramentasRapidas = [
  { icon: Search, label: "Pesquisar Jurisprudência", prompt: "Pesquise jurisprudência recente sobre " },
  { icon: FileText, label: "Redigir Peça", prompt: "Me ajude a redigir uma petição inicial sobre " },
  { icon: Gavel, label: "Analisar Caso", prompt: "Analise o seguinte caso jurídico e aponte os pontos fortes e fracos: " },
  { icon: BookOpen, label: "Fundamentação Legal", prompt: "Qual a fundamentação legal aplicável para " },
  { icon: Lightbulb, label: "Estratégia Processual", prompt: "Sugira uma estratégia processual para o seguinte cenário: " },
  { icon: Scale, label: "Comparar Teses", prompt: "Compare as seguintes teses jurídicas e indique qual é mais forte: " },
];

export default function ChatIAAdvogado() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { logNeural } = useNeuralFeedback();
  const navigate = useNavigate();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeSources, setActiveSources] = useState<string[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const {
    messages, setMessages, activeConversationId,
    createConversation, saveMessage, loadingMessages,
  } = useChatIA();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  const handleSend = async (text?: string) => {
    const messageText = text || input.trim();
    if (!messageText || loading) return;

    // Ensure we have a conversation
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

    // Save user message
    await saveMessage(convId, { role: "user", content: messageText });

    // Create placeholder assistant message for streaming
    const assistantId = (Date.now() + 1).toString();
    const placeholderMsg: ChatIAMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, placeholderMsg]);

    try {
      // Show source indicators
      setActiveSources(["neural_search", "chat_juridico", "stf", "datajud_stj", "lexml", "senado_legislacao", "txt_biblioteca"]);

      // Get session token for auth
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || SUPABASE_PUBLISHABLE_KEY;

      const response = await fetch(`${SUPABASE_URL}/functions/v1/chat-juridico`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          apikey: SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
          stream: true,
        }),
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const contentType = response.headers.get("content-type") || "";

      if (contentType.includes("text/event-stream") && response.body) {
        // ── STREAMING ──
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let streamedContent = "";
        let metadata: any = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6).trim();
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === "token" && parsed.content) {
                streamedContent += parsed.content;
                setMessages((prev) =>
                  prev.map((m) =>
                    m.id === assistantId ? { ...m, content: streamedContent } : m
                  )
                );
              } else if (parsed.type === "metadata") {
                metadata = parsed;
              }
            } catch { /* skip */ }
          }
        }

        // Finalize the message with metadata
        const finalMsg: ChatIAMessage = {
          id: assistantId,
          role: "assistant",
          content: streamedContent || "Desculpe, não consegui processar sua consulta.",
          timestamp: new Date(),
          intent: metadata?.intent,
          intentParams: metadata?.intentParams,
          provider: metadata?.provider,
          sources: metadata?.sources,
          neuralEnhanced: metadata?.neuralEnhanced,
        };
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? finalMsg : m)));

        // Save assistant message
        await saveMessage(convId, {
          role: "assistant",
          content: finalMsg.content,
          intent: finalMsg.intent,
          intentParams: finalMsg.intentParams,
          provider: finalMsg.provider,
          sources: finalMsg.sources,
          neuralEnhanced: finalMsg.neuralEnhanced,
        });

        logNeural({
          interaction_type: "chat",
          input_text: messageText,
          output_text: finalMsg.content,
          user_id: user?.id,
          metadata: {
            provider: finalMsg.provider || "unknown",
            neuralEnhanced: finalMsg.neuralEnhanced,
            sourcesCount: (finalMsg.sources as any[])?.length || 0,
            intent: finalMsg.intent,
            module: "chat_ia_advogado",
            streamed: true,
          },
        });
      } else {
        // ── NON-STREAMING FALLBACK ──
        const data = await response.json();
        const finalMsg: ChatIAMessage = {
          id: assistantId,
          role: "assistant",
          content: data?.content || "Desculpe, não consegui processar sua consulta.",
          timestamp: new Date(),
          intent: data?.intent,
          intentParams: data?.intentParams,
          provider: data?.provider,
          sources: data?.sources,
          neuralEnhanced: data?.neuralEnhanced,
        };
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? finalMsg : m)));

        await saveMessage(convId, {
          role: "assistant",
          content: finalMsg.content,
          intent: finalMsg.intent,
          intentParams: finalMsg.intentParams,
          provider: finalMsg.provider,
          sources: finalMsg.sources,
          neuralEnhanced: finalMsg.neuralEnhanced,
        });

        logNeural({
          interaction_type: "chat",
          input_text: messageText,
          output_text: finalMsg.content,
          user_id: user?.id,
          metadata: {
            provider: finalMsg.provider || "unknown",
            neuralEnhanced: finalMsg.neuralEnhanced,
            sourcesCount: (finalMsg.sources as any[])?.length || 0,
            intent: finalMsg.intent,
            module: "chat_ia_advogado",
          },
        });
      }
    } catch (err: any) {
      // Remove the empty placeholder on error
      setMessages((prev) => prev.filter((m) => m.id !== assistantId));
      toast({ title: "Erro na consulta", description: "Não foi possível processar sua mensagem.", variant: "destructive" });
    } finally {
      setLoading(false);
      setActiveSources([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado!", description: "Texto copiado para a área de transferência." });
  };

  const handleToolClick = (prompt: string) => {
    setInput(prompt);
    textareaRef.current?.focus();
  };

  const handleGenerateDocument = (msg: ChatIAMessage) => {
    const params = msg.intentParams;
    const qp = new URLSearchParams();
    if (params?.tipo) qp.set("tipo", params.tipo);
    if (params?.tipo_documento) qp.set("tipo", params.tipo_documento);
    if (params?.area) qp.set("area", params.area);
    if (params?.tribunal) qp.set("tribunal", params.tribunal);
    if (params?.comarca) qp.set("comarca", params.comarca);
    if (params?.vara) qp.set("vara", params.vara);
    if (params?.tema_pesquisa) qp.set("tema", params.tema_pesquisa);
    if (params?.tema) qp.set("tema", params.tema);
    navigate(`/dashboard/gerar-documento?${qp.toString()}`);
  };

  const getIntentColor = (intent?: string) => {
    switch (intent) {
      case "documento": return "bg-emerald-500/10 border-emerald-500/30 text-emerald-400";
      case "pesquisa": return "bg-blue-500/10 border-blue-500/30 text-blue-400";
      case "sintese": return "bg-purple-500/10 border-purple-500/30 text-purple-400";
      default: return "bg-accent/50 border-accent text-accent-foreground";
    }
  };

  const getIntentIcon = (intent?: string) => {
    switch (intent) {
      case "documento": return "📄";
      case "pesquisa": return "🔍";
      case "sintese": return "🧬";
      default: return "💬";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative h-10 w-10 glass-panel-light rounded-lg flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
            <div className="absolute -inset-0.5 bg-primary/20 blur-sm animate-pulse pointer-events-none" style={{ animationDuration: '3s' }} />
          </div>
          <div>
            <h1 className="text-lg font-serif text-foreground tracking-wide">Assistente IA Jurídico</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="h-1.5 w-1.5 bg-emerald-400 animate-pulse" style={{ animationDuration: '2s' }} />
              <p className="text-[10px] text-muted-foreground tracking-[0.15em] uppercase">
                Online • Rede Neural Conexão • Sem limite
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="glass-card overflow-hidden">
        <div className="h-[calc(100vh-22rem)] overflow-y-auto">
          <div className="max-w-4xl mx-auto py-6 px-4 md:px-6 space-y-6">
            {loadingMessages ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : messages.length === 0 ? (
              <div className="py-8">
                <div className="text-center mb-10 relative">
                  {/* Animated glow behind icon */}
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/10 blur-[60px] animate-pulse pointer-events-none" style={{ animationDuration: '3s' }} />
                  <div className="relative h-20 w-20 glass-premium rounded-2xl flex items-center justify-center mx-auto mb-5">
                    <Sparkles className="h-10 w-10 text-primary icon-gold-glow" />
                    <div className="absolute -inset-px bg-gradient-to-br from-primary/20 to-transparent opacity-0 animate-pulse" style={{ animationDuration: '2s' }} />
                  </div>
                  <h2 className="font-serif text-2xl text-foreground mb-3">Assistente Jurídico IA</h2>
                  <p className="text-sm text-muted-foreground max-w-lg mx-auto leading-relaxed">
                    Conectado à <span className="text-primary font-medium">Rede Neural Conexão</span> com acesso a
                    DataJud, LexML, Senado Federal, Câmara dos Deputados e base de conhecimento jurídico.
                  </p>
                  <div className="flex items-center justify-center gap-3 mt-4">
                    {["DataJud", "LexML", "Senado", "Câmara", "OAB"].map((source, i) => (
                      <span key={source} className="text-[9px] px-2 py-1 bg-primary/5 border border-primary/15 text-primary/70 uppercase tracking-wider animate-fade-in-up" style={{ animationDelay: `${i * 100}ms` }}>
                        {source}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-3xl mx-auto">
                  {ferramentasRapidas.map((tool, idx) => (
                    <button
                      key={tool.label}
                      onClick={() => handleToolClick(tool.prompt)}
                      className="group p-5 text-left glass-card-subtle hover:border-primary/30 transition-all duration-300 animate-fade-in-up relative overflow-hidden rounded-lg"
                      style={{ animationDelay: `${idx * 80}ms` }}
                    >
                      {/* Hover shimmer */}
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/5 to-transparent translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700 pointer-events-none" />
                      <div className="relative z-10">
                        <div className="h-9 w-9 glass-panel-light rounded-lg flex items-center justify-center mb-3 group-hover:border-primary/40 transition-colors">
                          <tool.icon className="h-4.5 w-4.5 text-primary group-hover:scale-110 transition-transform" />
                        </div>
                        <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{tool.label}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div key={message.id} className={`flex gap-3 ${message.role === "user" ? "justify-end" : ""}`}>
                  {message.role === "assistant" && (
                    <div className="h-8 w-8 glass-panel-light rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                      <Sparkles className="h-4 w-4 text-primary" />
                    </div>
                  )}
                  <div className={`max-w-[85%] ${message.role === "user" ? "order-first" : ""}`}>
                    <div className={`px-5 py-4 rounded-lg ${message.role === "user" ? "bg-primary text-primary-foreground" : "glass-panel-light"}`}>
                      {message.role === "assistant" && (
                        <div className="flex items-center gap-2 mb-3 flex-wrap">
                          {message.provider && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-primary/10 border border-primary/20 text-primary uppercase">via {message.provider}</span>
                          )}
                          {message.intent && message.intent !== "consulta" && (
                            <span className={`text-[9px] px-1.5 py-0.5 border uppercase flex items-center gap-1 ${getIntentColor(message.intent)}`}>
                              {getIntentIcon(message.intent)} {message.intent}
                            </span>
                          )}
                          {message.neuralEnhanced && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-primary/10 border border-primary/20 text-primary flex items-center gap-1">
                              <Brain className="h-2.5 w-2.5" /> RAG Neural
                            </span>
                          )}
                          {message.sources && message.sources.length > 0 && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-muted border border-border text-muted-foreground">{message.sources.length} fontes</span>
                          )}
                        </div>
                      )}
                      {message.intentParams && (message.intent === "documento" || message.intent === "sintese") && (
                        <div className="mb-3 p-2 bg-muted/30 border border-border/50 text-[10px] space-y-1">
                          <div className="flex flex-wrap gap-2">
                            {message.intentParams.tipo && <span className="px-1.5 py-0.5 bg-background border border-border">📝 {message.intentParams.tipo}</span>}
                            {message.intentParams.tipo_documento && <span className="px-1.5 py-0.5 bg-background border border-border">📝 {message.intentParams.tipo_documento}</span>}
                            {(message.intentParams.tribunal || message.intentParams.comarca || message.intentParams.vara) && (
                              <span className="px-1.5 py-0.5 bg-background border border-border">
                                🏛️ {[message.intentParams.tribunal, message.intentParams.vara, message.intentParams.comarca].filter(Boolean).join(" • ")}
                              </span>
                            )}
                            {message.intentParams.area && <span className="px-1.5 py-0.5 bg-background border border-border">⚖️ {message.intentParams.area}</span>}
                          </div>
                        </div>
                      )}
                      <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1.5 prose-strong:text-primary prose-li:my-0.5 prose-ul:my-1 prose-ol:my-1 prose-headings:text-foreground prose-code:text-primary prose-code:bg-muted prose-code:px-1 prose-code:py-0.5">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>
                      {message.sources && message.sources.length > 0 && (
                        <div className="mt-4 pt-3 border-t border-border/50">
                          <div className="flex items-center gap-2 mb-2">
                            <Brain className="h-3 w-3 text-primary" />
                            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Fontes da Rede Neural ({message.sources.length})</span>
                          </div>
                          <div className="space-y-1.5">
                            {message.sources.slice(0, 5).map((source: any, idx: number) => (
                              <div key={idx} className="bg-muted/30 border border-border/50 p-2 flex items-start justify-between gap-2">
                                <div className="flex-1 min-w-0">
                                  <span className="text-[9px] px-1 py-0.5 bg-primary/10 text-primary border border-primary/20 mr-2">{source.source_label || source.source}</span>
                                  <span className="text-[10px] font-medium text-foreground line-clamp-1">{source.title}</span>
                                  {source.published_date && <span className="text-[9px] text-muted-foreground ml-2">{source.published_date}</span>}
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 px-1.5 text-primary hover:bg-primary/10"
                                    onClick={() => {
                                      const searchTerm = source.title?.replace(/^(Processo|REsp|HC|RE|AI|AgRg|AREsp)\s*-?\s*/i, '').trim() || '';
                                      navigate(`/dashboard/pesquisa?q=${encodeURIComponent(searchTerm)}`);
                                    }}
                                    title="Verificar na Pesquisa Jurisprudencial"
                                  >
                                    <Search className="h-3 w-3" />
                                  </Button>
                                  {source.url && (
                                    <a href={source.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                                      <ExternalLink className="h-3 w-3" />
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                          <p className="text-[8px] text-muted-foreground/50 mt-2 italic">
                            ⚠️ Verifique sempre as citações nos sites oficiais dos tribunais. Clique em 🔍 para verificar.
                          </p>
                        </div>
                      )}
                    </div>
                    {message.role === "assistant" && (
                      <div className="flex items-center gap-1 mt-1 flex-wrap">
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-foreground" onClick={() => copyToClipboard(message.content)}>
                          <Copy className="h-3 w-3 mr-1" /><span className="text-[10px]">Copiar</span>
                        </Button>
                         {(message.intent === "documento" || message.intent === "sintese") && (
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-primary hover:text-primary hover:bg-primary/10" onClick={() => handleGenerateDocument(message)}>
                            <FileText className="h-3 w-3 mr-1" /><span className="text-[10px]">Gerar Documento</span><ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        )}
                         {(message.intent === "pesquisa" || message.intent === "sintese") && (
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-blue-400 hover:text-blue-400 hover:bg-blue-400/10" onClick={() => {
                            const tema = message.intentParams?.tema || message.intentParams?.tema_pesquisa || '';
                            navigate(`/dashboard/pesquisa?q=${encodeURIComponent(tema)}`);
                          }}>
                            <Search className="h-3 w-3 mr-1" /><span className="text-[10px]">Verificar Jurisprudência</span><ArrowRight className="h-3 w-3 ml-1" />
                          </Button>
                        )}
                        {message.intent === "documento" && (
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-muted-foreground hover:text-foreground" onClick={() => { navigate("/dashboard/meus-documentos"); toast({ title: "Salve o documento primeiro", description: "Gere o documento e depois compartilhe com o cliente." }); }}>
                            <Share2 className="h-3 w-3 mr-1" /><span className="text-[10px]">Compartilhar</span>
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                  {message.role === "user" && (
                    <div className="h-8 w-8 bg-muted border border-border flex items-center justify-center flex-shrink-0 mt-1">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
              ))
            )}
            {loading && activeSources.length > 0 && (
              <SourcesLoadingIndicator activeSources={activeSources} />
            )}
            {loading && activeSources.length === 0 && messages.length > 0 && messages[messages.length - 1]?.role === "assistant" && messages[messages.length - 1]?.content === "" && (
              <div className="flex gap-3">
                <div className="h-8 w-8 bg-primary/10 border border-primary/30 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-background border border-border px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Processando...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Input Area */}
        <div className="border-t border-border p-4 bg-background">
          <div className="max-w-4xl mx-auto">
            <div className="flex gap-2 items-end">
              <VoiceInputButton
                onTranscript={(text) => setInput(prev => prev ? prev + " " + text : text)}
                speakText={messages.filter(m => m.role === "assistant").at(-1)?.content}
              />
              <ChatFileUpload
                onTextExtracted={(text, fileName) => {
                  const ocrPrompt = `[OCR de "${fileName}"]\n\nTexto extraído:\n\n${text}\n\nAnalise o conteúdo deste documento e forneça um resumo dos pontos jurídicos relevantes.`;
                  handleSend(ocrPrompt);
                }}
                disabled={loading}
              />
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Fale, envie imagem/PDF, ou digite — pesquise, redija, analise..."
                className="min-h-[48px] max-h-[200px] resize-none bg-card flex-1"
                rows={1}
                disabled={loading}
              />
              <Button
                onClick={() => handleSend()}
                disabled={!input.trim() || loading}
                className="btn-gold h-12 w-12 p-0 flex items-center justify-center flex-shrink-0"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground/50 text-center mt-2 tracking-wider">
              🎙️ R.A.G ELP Voice · IA + Rede Neural Conexão · DataJud · LexML · Senado · Câmara · [OAB]
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
