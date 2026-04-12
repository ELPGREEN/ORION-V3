import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
// [REMOVED] import { useNeuralFeedback } from "@/hooks/useNeuralFeedback";
import { Send, User, Scale, MessageSquare, Plus, Trash2, Search, X, Bot, BellRing, CheckCircle2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { useLawyerPresence } from "@/hooks/useLawyerPresence";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender_role: string;
  content: string;
  read_at: string | null;
  created_at: string;
}

interface Conversation {
  id: string;
  cliente_id: string;
  advogado_id: string | null;
  ultima_mensagem: string | null;
  created_at: string;
  updated_at: string;
  cliente_nome?: string;
}

interface ClientProfile {
  id: string;
  user_id: string;
  nome: string;
  email: string;
}

export default function ChatHumano() {
  const { user } = useAuth();
  const { isAdvogado, isCliente } = useUserRole();
  const { toast } = useToast();
  const { logNeural } = useNeuralFeedback();
  const { isLawyerOnline } = useLawyerPresence();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [secretaryTyping, setSecretaryTyping] = useState(false);
  const [deletingConversation, setDeletingConversation] = useState<string | null>(null);
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [allClients, setAllClients] = useState<ClientProfile[]>([]);
  const [clientSearch, setClientSearch] = useState("");
  const [startingConv, setStartingConv] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const conversaFromUrl = searchParams.get("conversa");

  // Takeover state for lawyer
  const [takeoverRequest, setTakeoverRequest] = useState<{
    conversationId: string;
    clienteNome: string;
    clienteId: string;
    lastMessage: string;
  } | null>(null);
  const [showInstructionDialog, setShowInstructionDialog] = useState(false);
  const [lawyerInstructions, setLawyerInstructions] = useState("");
  const [conversationModes, setConversationModes] = useState<Record<string, { mode: string; instructions?: string }>>({});
  const [orionLoading, setOrionLoading] = useState(false);
  const [orionResult, setOrionResult] = useState<string | null>(null);

  // Fetch conversations
  useEffect(() => {
    if (!user) return;

    const fetchConversations = async () => {
      const { data, error } = await supabase
        .from("chat_conversations")
        .select("*")
        .order("last_message_at", { ascending: false });

      if (error) {
        return;
      }

      // For advogado, fetch client names
      if (isAdvogado && data) {
        const clienteIds = data.map((c) => c.cliente_id);
        const { data: profiles } = await supabase
          .from("client_profiles")
          .select("user_id, nome")
          .in("user_id", clienteIds);

        const conversationsWithNames = data.map((conv: any) => ({
          ...conv,
          cliente_nome: profiles?.find((p) => p.user_id === conv.cliente_id)?.nome || "Cliente",
        }));
        setConversations(conversationsWithNames as Conversation[]);
        // Load conversation modes
        const modes: Record<string, { mode: string; instructions?: string }> = {};
        data.forEach((c: any) => {
          if (c.conversation_mode && c.conversation_mode !== "direct") {
            modes[c.id] = { mode: c.conversation_mode, instructions: c.lawyer_instructions || undefined };
          }
        });
        setConversationModes(prev => ({ ...prev, ...modes }));
      } else {
        setConversations((data || []) as Conversation[]);
        // Load modes for clients too
        const modes: Record<string, { mode: string; instructions?: string }> = {};
        (data || []).forEach((c: any) => {
          if (c.conversation_mode && c.conversation_mode !== "direct") {
            modes[c.id] = { mode: c.conversation_mode, instructions: c.lawyer_instructions || undefined };
          }
        });
        setConversationModes(prev => ({ ...prev, ...modes }));
      }

      // Auto-select: prefer URL param, else first conversation
      if (data && data.length > 0 && !activeConversation) {
        if (conversaFromUrl && data.find((c) => c.id === conversaFromUrl)) {
          setActiveConversation(conversaFromUrl);
        } else {
          setActiveConversation(data[0].id);
        }
      } else if (conversaFromUrl && !activeConversation) {
        setActiveConversation(conversaFromUrl);
      }

      setLoading(false);
    };

    fetchConversations();

    // Subscribe to new conversations
    const channel = supabase
      .channel("conversations-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_conversations" },
        () => fetchConversations()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, isAdvogado]);

  // Lawyer: listen for incoming client messages to show takeover notification
  // Use refs to avoid re-subscribing on every conversations/modes change
  const conversationsRef = useRef(conversations);
  const conversationModesRef = useRef(conversationModes);
  useEffect(() => { conversationsRef.current = conversations; }, [conversations]);
  useEffect(() => { conversationModesRef.current = conversationModes; }, [conversationModes]);

  useEffect(() => {
    if (!user || !isAdvogado) return;

    const channel = supabase
      .channel("lawyer-takeover-listener")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        async (payload) => {
          const msg = payload.new as Message;
          if (msg.sender_role !== "cliente") return;

          const conv = conversationsRef.current.find(c => c.id === msg.conversation_id);
          if (!conv) return;

          const mode = conversationModesRef.current[msg.conversation_id]?.mode;
          if (mode === "direct") return;

          setTakeoverRequest({
            conversationId: msg.conversation_id,
            clienteNome: conv.cliente_nome || "Cliente",
            clienteId: conv.cliente_id,
            lastMessage: msg.content.slice(0, 100),
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, isAdvogado]);

  // Fetch messages for active conversation
  useEffect(() => {
    if (!activeConversation || !user) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("conversation_id", activeConversation)
        .order("created_at", { ascending: true });

      if (error) {
        return;
      }

      setMessages(data || []);

      // Mark messages as read
      const unreadIds = (data || [])
        .filter((m) => !m.read_at && m.sender_id !== user.id)
        .map((m) => m.id);

      if (unreadIds.length > 0) {
        await supabase
          .from("chat_messages")
          .update({ read_at: new Date().toISOString() })
          .in("id", unreadIds);
      }
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`messages-${activeConversation}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
          filter: `conversation_id=eq.${activeConversation}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
          
          // Mark as read if from other user
          if (payload.new.sender_id !== user.id) {
            supabase
              .from("chat_messages")
              .update({ read_at: new Date().toISOString() })
              .eq("id", payload.new.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversation, user]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load all clients for advogado picker
  useEffect(() => {
    if (!isAdvogado) return;
    supabase
      .from("client_profiles")
      .select("id, user_id, nome, email")
      .order("nome")
      .then(({ data }) => setAllClients((data as ClientProfile[]) || []));
  }, [isAdvogado]);

  // Takeover handlers for lawyer
  const handleTakeoverYes = () => {
    // Lawyer wants to guide the AI → show instruction dialog
    setShowInstructionDialog(true);
  };

  const handleTakeoverNo = () => {
    // Lawyer declines → set conversation to AI autonomous mode
    if (takeoverRequest) {
      const convId = takeoverRequest.conversationId;
      setConversationModes(prev => ({ ...prev, [convId]: { mode: "ai_autonomous" } }));
      supabase.from("chat_conversations").update({ ultima_mensagem: "ai_autonomous" } as any).eq("id", convId);
      toast({ title: "Modo autônomo ativado", description: "A secretária IA continuará atendendo este cliente." });
    }
    setTakeoverRequest(null);
  };

  const handleSubmitInstructions = async () => {
    if (!takeoverRequest || !lawyerInstructions.trim()) return;
    const convId = takeoverRequest.conversationId;
    const instructions = lawyerInstructions.trim();

    // Save mode and instructions
    setConversationModes(prev => ({
      ...prev,
      [convId]: { mode: "ai_guided", instructions },
    }));
    await supabase.from("chat_conversations").update({
      ultima_mensagem: `ai_guided:${instructions}`,
    } as any).eq("id", convId);

    toast({ title: "Instruções salvas", description: "A secretária IA seguirá suas orientações nesta conversa." });
    setShowInstructionDialog(false);
    setTakeoverRequest(null);
    setLawyerInstructions("");

    // Switch to this conversation
    setActiveConversation(convId);
  };

  const handleTakeoverDirect = () => {
    // Lawyer wants to handle directly (no AI)
    if (takeoverRequest) {
      const convId = takeoverRequest.conversationId;
      setConversationModes(prev => ({ ...prev, [convId]: { mode: "direct" } }));
      supabase.from("chat_conversations").update({ ultima_mensagem: "direct" } as any).eq("id", convId);
      setActiveConversation(convId);
      toast({ title: "Você assumiu a conversa", description: "A secretária IA foi desativada nesta conversa." });
    }
    setTakeoverRequest(null);
    setShowInstructionDialog(false);
  };

  // Create new conversation (for clients)
  const createConversation = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("chat_conversations")
      .insert({ cliente_id: user.id })
      .select()
      .single();

    if (error) {
      toast({ title: "Erro", description: "Não foi possível iniciar conversa", variant: "destructive" });
      return;
    }

    setActiveConversation(data.id);
    setConversations((prev) => [data as unknown as Conversation, ...prev]);
  };

  // Start conversation with a specific client (for advogado)
  const startConversationWithClient = async (client: ClientProfile) => {
    setStartingConv(true);
    const existing = conversations.find((c) => c.cliente_id === client.user_id);
    if (existing) {
      setActiveConversation(existing.id);
      setShowClientPicker(false);
      setStartingConv(false);
      return;
    }

    const { data, error } = await supabase
      .from("chat_conversations")
      .insert({ cliente_id: client.user_id, advogado_id: user!.id })
      .select()
      .single();

    if (error) {
      toast({ title: "Erro", description: "Não foi possível iniciar conversa", variant: "destructive" });
      setStartingConv(false);
      return;
    }

    const newConv: Conversation = { ...(data as unknown as Conversation), cliente_nome: client.nome };
    setConversations((prev) => [newConv, ...prev]);
    setActiveConversation(data.id);
    setShowClientPicker(false);
    setStartingConv(false);
  };

  // Send message
  const handleSend = async () => {
    if (!input.trim() || !activeConversation || !user || sending) return;

    setSending(true);
    const content = input.trim();
    setInput("");

    const { data: insertedMessage, error } = await supabase
      .from("chat_messages")
      .insert({
        conversation_id: activeConversation,
        sender_id: user.id,
        sender_role: isAdvogado ? "advogado" : "cliente",
        content,
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Erro", description: "Não foi possível enviar mensagem", variant: "destructive" });
      setInput(content);
      setSending(false);
      return;
    }

    // Update last_message_at
    await supabase
      .from("chat_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", activeConversation);

    // Neural Feedback
    logNeural({
      interaction_type: "chat_humano",
      input_text: content,
      output_text: content,
      user_id: user.id,
      metadata: {
        conversation_id: activeConversation,
        sender_role: isAdvogado ? "advogado" : "cliente",
        source: "chat_humano",
      },
    });

    // Trigger email notification
    if (insertedMessage) {
      supabase.functions.invoke("notifications", {
        body: { record: insertedMessage },
      }).catch((err) => console.log("Notification send failed:", err));
    }

    // Determine if AI secretary should respond
    const convMode = conversationModes[activeConversation]?.mode;
    const convInstructions = conversationModes[activeConversation]?.instructions;
    // AI should respond when: lawyer offline (regardless of mode), or mode is explicitly AI
    // AI should NOT respond when: mode is "direct" (lawyer handling manually)
    const isDirectMode = convMode === "direct";
    const shouldTriggerAI = isCliente && !isDirectMode && (
      !isLawyerOnline || // Lawyer offline → AI responds
      convMode === "ai_autonomous" || // Lawyer declined takeover
      convMode === "ai_guided" // Lawyer provided instructions
    );

    if (shouldTriggerAI) {
      setSecretaryTyping(true);
      try {
        const recentMessages = [...messages.slice(-10), { id: "new", conversation_id: activeConversation, sender_id: user.id, sender_role: "cliente", content, read_at: null, created_at: new Date().toISOString() }];
        const chatHistory = recentMessages.map(m => ({
          role: m.sender_role === "cliente" ? "user" : "assistant",
          content: m.content,
        }));

        // Integração Agente-Eu v22.3: envia estado consciente para a Secretaria
// [REMOVED]         const { getAgenteEu } = await import("@/lib/neural/agents/self-model-agent");
        const agenteEu = getAgenteEu();
        const selfState = agenteEu.getState();

        const { data: secretaryData, error: secError } = await supabase.functions.invoke("secretaria-ia", {
          body: {
            messages: chatHistory,
            conversationId: activeConversation,
            clienteId: user.id,
            mode: convMode || "ai_autonomous",
            lawyerInstructions: convInstructions || null,
            consciousnessState: {
              confidence: selfState.confidenceLevel,
              emotionalValence: selfState.emotionalState.valence,
              arousal: selfState.emotionalState.arousal,
              attentionFocus: selfState.attentionFocus,
              activeModalities: selfState.activeModalities,
            },
          },
        });

        if (!secError && secretaryData?.content) {
          // sender_id must be auth.uid() due to RLS; sender_role="secretaria" distinguishes AI messages
          await supabase.from("chat_messages").insert({
            conversation_id: activeConversation,
            sender_id: user.id,
            sender_role: "secretaria",
            content: secretaryData.content,
          });
        }
      } catch (err) {
      } finally {
        setSecretaryTyping(false);
      }
    }

    setSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const deleteConversation = async (convId: string) => {
    setDeletingConversation(convId);
    try {
      // Delete messages first
      await supabase.from("chat_messages").delete().eq("conversation_id", convId);
      // Then delete conversation
      const { error } = await supabase.from("chat_conversations").delete().eq("id", convId);
      if (error) throw error;

      setConversations((prev) => prev.filter((c) => c.id !== convId));
      if (activeConversation === convId) {
        const remaining = conversations.filter((c) => c.id !== convId);
        setActiveConversation(remaining.length > 0 ? remaining[0].id : null);
        setMessages([]);
      }
      toast({ title: "Conversa excluída" });
    } catch (e: any) {
      toast({ title: "Erro", description: "Não foi possível excluir a conversa.", variant: "destructive" });
    }
    setDeletingConversation(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <>
    {/* Takeover Notification Banner for Lawyer */}
    {isAdvogado && takeoverRequest && !showInstructionDialog && (
      <div className="fixed top-4 right-4 z-50 max-w-sm animate-fade-in">
        <div className="bg-card border border-primary/30 shadow-lg rounded-lg p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <BellRing className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground">Nova mensagem de {takeoverRequest.clienteNome}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">"{takeoverRequest.lastMessage}"</p>
              <p className="text-[10px] text-muted-foreground mt-1">Deseja assumir a conversa?</p>
              <div className="flex items-center gap-2 mt-3">
                <Button size="sm" className="h-7 text-[10px] btn-gold" onClick={handleTakeoverYes}>
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Sim, orientar IA
                </Button>
                <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={handleTakeoverDirect}>
                  Assumir direto
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-[10px]" onClick={handleTakeoverNo}>
                  <XCircle className="h-3 w-3 mr-1" /> Não
                </Button>
              </div>
            </div>
            <button onClick={() => setTakeoverRequest(null)} className="text-muted-foreground hover:text-foreground">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    )}

    {/* Lawyer Instruction Dialog */}
    <Dialog open={showInstructionDialog} onOpenChange={(open) => { if (!open) { setShowInstructionDialog(false); } }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            Instruções para a Secretária IA
          </DialogTitle>
          <DialogDescription>
            Forneça orientações sobre como a IA deve conduzir a conversa com {takeoverRequest?.clienteNome || "o cliente"}.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Textarea
            value={lawyerInstructions}
            onChange={(e) => setLawyerInstructions(e.target.value)}
            placeholder="Ex: Colete informações sobre o acidente de trabalho. Pergunte sobre data do ocorrido, se houve testemunhas, se já comunicou a empresa. Sugira agendar consulta presencial para análise dos documentos..."
            rows={5}
            className="resize-none"
            autoFocus
          />
          <p className="text-[10px] text-muted-foreground">
            A IA seguirá estas instruções ao responder o cliente. Você pode acompanhar a conversa em tempo real.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={handleTakeoverDirect}>
              Assumir direto
            </Button>
            <Button
              size="sm"
              className="btn-gold"
              onClick={handleSubmitInstructions}
              disabled={!lawyerInstructions.trim()}
            >
              Enviar instruções
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
    {/* Client Picker Dialog (for advogado) */}
    <Dialog open={showClientPicker} onOpenChange={setShowClientPicker}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif">Nova Conversa</DialogTitle>
          <DialogDescription>
            Selecione um cliente para iniciar ou retomar uma conversa.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              className="pl-9"
              autoFocus
            />
            {clientSearch && (
              <button onClick={() => setClientSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <ScrollArea className="h-64">
            {allClients
              .filter((c) =>
                c.nome.toLowerCase().includes(clientSearch.toLowerCase()) ||
                c.email.toLowerCase().includes(clientSearch.toLowerCase())
              )
              .map((client) => {
                const hasConv = conversations.some((c) => c.cliente_id === client.user_id);
                return (
                  <button
                    key={client.id}
                    onClick={() => startConversationWithClient(client)}
                    disabled={startingConv}
                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted/60 transition-colors text-left"
                  >
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{client.nome}</p>
                      <p className="text-xs text-muted-foreground truncate">{client.email}</p>
                    </div>
                    {hasConv && (
                      <span className="text-[10px] text-primary border border-primary/30 rounded px-1.5 py-0.5 flex-shrink-0">
                        ativo
                      </span>
                    )}
                  </button>
                );
              })}
            {allClients.length === 0 && (
              <p className="text-center text-muted-foreground text-sm py-6">Nenhum cliente cadastrado.</p>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>

    <div className="h-[calc(100vh-12rem)] flex flex-col md:flex-row border border-border rounded-lg overflow-hidden bg-card">
      {/* Sidebar - Conversations */}
      <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-border flex flex-col max-h-48 md:max-h-none">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h3 className="font-serif text-sm text-foreground">Conversas</h3>
          {isCliente && (
            <Button size="icon" variant="ghost" onClick={createConversation} className="h-8 w-8">
              <Plus className="h-4 w-4" />
            </Button>
          )}
          {isAdvogado && (
            <Button size="icon" variant="ghost" onClick={() => { setClientSearch(""); setShowClientPicker(true); }} className="h-8 w-8" title="Nova conversa com cliente">
              <Plus className="h-4 w-4" />
            </Button>
          )}
        </div>

        <ScrollArea className="flex-1">
          {conversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground text-xs">
              {isCliente ? (
                <>
                  <p>Nenhuma conversa ainda.</p>
                  <Button size="sm" variant="outline" className="mt-2" onClick={createConversation}>
                    Iniciar conversa
                  </Button>
                </>
              ) : (
                <div className="space-y-2">
                  <p>Nenhuma conversa ainda.</p>
                  <Button size="sm" variant="outline" className="mt-2 w-full" onClick={() => { setClientSearch(""); setShowClientPicker(true); }}>
                    <Plus className="h-3 w-3 mr-1" /> Iniciar com cliente
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="divide-y divide-border">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={cn(
                    "w-full p-3 text-left hover:bg-muted/50 transition-colors flex items-center gap-1",
                    activeConversation === conv.id && "bg-primary/10 border-l-2 border-l-primary"
                  )}
                >
                  <button
                    onClick={() => setActiveConversation(conv.id)}
                    className="flex items-center gap-2 flex-1 min-w-0"
                  >
                    <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      <User className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {isAdvogado ? conv.cliente_nome : "[Nome do Advogado]"}
                      </p>
                      <div className="flex items-center gap-1">
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(conv.updated_at).toLocaleDateString("pt-BR")}
                        </p>
                        {isAdvogado && conversationModes[conv.id]?.mode === "ai_guided" && (
                          <span className="text-[8px] px-1 py-0.5 bg-primary/10 border border-primary/20 text-primary rounded">IA</span>
                        )}
                        {isAdvogado && conversationModes[conv.id]?.mode === "ai_autonomous" && (
                          <span className="text-[8px] px-1 py-0.5 bg-muted border border-border text-muted-foreground rounded">AUTO</span>
                        )}
                      </div>
                    </div>
                  </button>
                  {isAdvogado && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 flex-shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Excluir conversa?</AlertDialogTitle>
                          <AlertDialogDescription>
                            Todas as mensagens desta conversa serão excluídas permanentemente. Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteConversation(conv.id)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={deletingConversation === conv.id}
                          >
                            {deletingConversation === conv.id ? "Excluindo..." : "Excluir"}
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col">
        {activeConversation ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-border flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                {isAdvogado ? (
                  <User className="h-5 w-5 text-primary" />
                ) : (
                  <Scale className="h-5 w-5 text-primary" />
                )}
              </div>
              <div>
                <p className="text-sm font-serif text-foreground">
                  {isAdvogado
                    ? conversations.find((c) => c.id === activeConversation)?.cliente_nome || "Cliente"
                    : "[Nome do Advogado]"}
                </p>
                <div className="flex items-center gap-2">
                  <p className="text-[10px] text-primary tracking-wider">CHAT AO VIVO</p>
                  {isCliente && (
                    <span className={cn(
                      "flex items-center gap-1 text-[10px] tracking-wider",
                      isLawyerOnline ? "text-primary" : "text-muted-foreground"
                    )}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", isLawyerOnline ? "bg-primary animate-pulse" : "bg-muted-foreground")} />
                      {isLawyerOnline ? "ONLINE" : "OFFLINE"}
                    </span>
                   )}
                  {isCliente && !isLawyerOnline && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-accent/10 border border-accent/20 text-accent-foreground/70 tracking-wider flex items-center gap-1">
                      <Bot className="h-3 w-3" /> ASSISTENTE IA
                    </span>
                  )}
                  {isAdvogado && activeConversation && conversationModes[activeConversation]?.mode === "ai_guided" && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 border border-primary/20 text-primary tracking-wider flex items-center gap-1">
                      <Bot className="h-3 w-3" /> IA GUIADA
                    </span>
                  )}
                  {isAdvogado && activeConversation && conversationModes[activeConversation]?.mode === "ai_autonomous" && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-muted border border-border text-muted-foreground tracking-wider flex items-center gap-1">
                      <Bot className="h-3 w-3" /> IA AUTÔNOMA
                    </span>
                  )}
                </div>
              </div>
              {/* Mode controls for lawyer */}
              {isAdvogado && activeConversation && conversationModes[activeConversation]?.mode && conversationModes[activeConversation]?.mode !== "direct" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="ml-auto text-[10px] h-7"
                  onClick={() => {
                    const convId = activeConversation;
                    setConversationModes(prev => ({ ...prev, [convId]: { mode: "direct" } }));
                    supabase.from("chat_conversations").update({ ultima_mensagem: "direct" } as any).eq("id", convId);
                    toast({ title: "Modo direto ativado", description: "Você assumiu o controle da conversa." });
                  }}
                >
                  Assumir conversa
                </Button>
              )}
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-muted-foreground text-sm py-8">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>Nenhuma mensagem ainda.</p>
                    <p className="text-xs mt-1">Envie uma mensagem para iniciar a conversa.</p>
                  </div>
                ) : (
                  messages.map((msg) => {
                    const isOwn = msg.sender_id === user?.id && msg.sender_role !== "secretaria";
                    const isSecretary = msg.sender_role === "secretaria";
                    return (
                      <div
                        key={msg.id}
                        className={cn("flex", isOwn ? "justify-end" : "justify-start")}
                      >
                        {isSecretary && (
                          <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center mr-2 flex-shrink-0 mt-1">
                            <Bot className="h-4 w-4 text-accent-foreground" />
                          </div>
                        )}
                        <div
                          className={cn(
                            "max-w-[70%] px-4 py-2 rounded-lg",
                            isSecretary
                              ? "bg-accent/10 border border-accent/30 text-foreground"
                              : isOwn
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted text-foreground"
                          )}
                        >
                          {isSecretary && (
                            <div className="flex items-center gap-1.5 mb-1">
                              <span className="text-[9px] text-accent-foreground/70 tracking-wider uppercase font-medium">Secretária IA • Orion</span>
                            </div>
                          )}
                          {isSecretary ? (
                            <div className="text-sm prose prose-sm dark:prose-invert max-w-none prose-p:my-1">
                              <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                          ) : (
                            <p className="text-sm">{msg.content}</p>
                          )}
                          <div className="flex items-center gap-1 mt-1">
                            <p className={cn("text-[10px]", isOwn ? "text-primary-foreground/70" : "text-muted-foreground")}>
                              {new Date(msg.created_at).toLocaleTimeString("pt-BR", {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                            {isOwn && msg.read_at && (
                              <span className="text-[10px] text-primary-foreground/70">✓✓</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                )}
                {/* Secretary typing indicator */}
                {secretaryTyping && (
                  <div className="flex justify-start">
                    <div className="h-8 w-8 rounded-full bg-accent/20 flex items-center justify-center mr-2 flex-shrink-0">
                      <Bot className="h-4 w-4 text-accent-foreground" />
                    </div>
                    <div className="bg-accent/10 border border-accent/30 px-4 py-3 rounded-lg">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[9px] text-accent-foreground/70 tracking-wider uppercase">Secretária IA</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 bg-accent-foreground/40 rounded-full animate-bounce" />
                        <span className="w-2 h-2 bg-accent-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0.15s" }} />
                        <span className="w-2 h-2 bg-accent-foreground/40 rounded-full animate-bounce" style={{ animationDelay: "0.3s" }} />
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Orion AI Result */}
            {orionResult && (
              <div className="px-4 py-2 border-t border-border bg-primary/5">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-primary flex items-center gap-1"><Bot className="h-3 w-3" /> Orion IA</span>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => { setInput(orionResult); setOrionResult(null); }}>Usar</Button>
                    <Button variant="ghost" size="sm" className="h-6 text-xs" onClick={() => setOrionResult(null)}>✕</Button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground whitespace-pre-wrap max-h-32 overflow-auto">{orionResult}</p>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-border">
              {/* Orion buttons for advogado */}
              {isAdvogado && activeConversation && (
                <div className="flex gap-2 mb-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1"
                    disabled={orionLoading}
                    onClick={async () => {
                      setOrionLoading(true);
                      try {
                        const lastMsg = messages[messages.length - 1]?.content || "";
                        const { data, error } = await supabase.functions.invoke("orion-advogado-ai", {
                          body: { action: "draft_response", conversation_id: activeConversation, last_message: lastMsg },
                        });
                        if (error) throw error;
                        setOrionResult(data?.result || "");
                      } catch (e: any) {
                        toast({ title: "Erro Orion", description: e.message, variant: "destructive" });
                      } finally {
                        setOrionLoading(false);
                      }
                    }}
                  >
                    <Bot className="h-3 w-3" />
                    {orionLoading ? "..." : "Redigir Resposta"}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs gap-1"
                    disabled={orionLoading}
                    onClick={async () => {
                      setOrionLoading(true);
                      try {
                        const { data, error } = await supabase.functions.invoke("orion-advogado-ai", {
                          body: { action: "summarize_conversation", conversation_id: activeConversation },
                        });
                        if (error) throw error;
                        setOrionResult(data?.result || "");
                      } catch (e: any) {
                        toast({ title: "Erro Orion", description: e.message, variant: "destructive" });
                      } finally {
                        setOrionLoading(false);
                      }
                    }}
                  >
                    <Bot className="h-3 w-3" />
                    {orionLoading ? "..." : "Resumir Conversa"}
                  </Button>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Digite sua mensagem..."
                  className="flex-1"
                  disabled={sending}
                />
                <Button onClick={handleSend} disabled={!input.trim() || sending} className="btn-gold">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Selecione uma conversa</p>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
