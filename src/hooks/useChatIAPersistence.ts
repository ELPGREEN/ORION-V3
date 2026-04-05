import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ChatIAMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  intent?: string;
  intentParams?: Record<string, any>;
  provider?: string;
  sources?: any[];
  neuralEnhanced?: boolean;
  diagnostics?: {
    totalMs: number;
    intentMs: number;
    ragMs: number;
    llmMs: number;
    provider: string;
    ragKbHits: number;
    ragExternalHits: number;
    ragTxtHits: number;
    ragTotalHits: number;
    ragActive: boolean;
    fallbacksAttempted: string[];
    intent: string;
  };
}

export interface ChatIAConversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export function useChatIAPersistence() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ChatIAConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatIAMessage[]>([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  // Load all conversations
  const loadConversations = useCallback(async () => {
    if (!user) return;
    setLoadingConversations(true);
    const { data, error } = await supabase
      .from("chat_ia_conversations")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (!error && data) {
      setConversations(data.map((d: any) => ({ id: d.id, title: d.titulo || "Nova conversa", created_at: d.created_at, updated_at: d.updated_at })));
      // Auto-select most recent if none selected
      setActiveConversationId(prev => {
        if (!prev && data.length > 0) return data[0].id;
        return prev;
      });
    }
    setLoadingConversations(false);
  }, [user]);

  // Load messages for active conversation
  const loadMessages = useCallback(async (conversationId: string) => {
    setLoadingMessages(true);
    const { data, error } = await supabase
      .from("chat_ia_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setMessages(
        data.map((m: any) => ({
          id: m.id,
          role: m.role as "user" | "assistant",
          content: m.content,
          timestamp: new Date(m.created_at),
          intent: m.intent,
          intentParams: m.intent_params,
          provider: m.provider,
          sources: m.sources,
          neuralEnhanced: m.neural_enhanced,
        }))
      );
    }
    setLoadingMessages(false);
  }, []);

  // Create new conversation
  const createConversation = useCallback(async (title?: string): Promise<string | null> => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("chat_ia_conversations")
      .insert({ user_id: user.id, titulo: title || "Nova conversa" })
      .select("id")
      .single();

    if (error || !data) return null;

    setActiveConversationId(data.id);
    setMessages([]);
    // Refresh conversations list
    loadConversations();
    return data.id;
  }, [user, loadConversations]);

  // Save a message
  const saveMessage = useCallback(async (
    conversationId: string,
    msg: Omit<ChatIAMessage, "id" | "timestamp">
  ): Promise<string | null> => {
    const { data, error } = await supabase
      .from("chat_ia_messages")
      .insert({
        conversation_id: conversationId,
        role: msg.role,
        content: msg.content,
        intent: msg.intent || null,
        intent_params: msg.intentParams || null,
        provider: msg.provider || null,
        sources: msg.sources || null,
        neural_enhanced: msg.neuralEnhanced || false,
      })
      .select("id, created_at")
      .single();

    if (error || !data) return null;

    // Update conversation title only from the first user message
    if (msg.role === "user") {
      setConversations(prev => {
        const currentConv = prev.find(c => c.id === conversationId);
        const isFirstMessage = !currentConv || currentConv.title === "Nova conversa";
        const title = isFirstMessage
          ? msg.content.slice(0, 80) + (msg.content.length > 80 ? "..." : "")
          : currentConv?.title || "Nova conversa";
        
        supabase
          .from("chat_ia_conversations")
          .update({ titulo: title, updated_at: new Date().toISOString() })
          .eq("id", conversationId)
          .then(); // fire-and-forget

        return prev.map(c => 
          c.id === conversationId ? { ...c, title, updated_at: new Date().toISOString() } : c
        );
      });
    } else {
      // Just update timestamp
      supabase
        .from("chat_ia_conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId)
        .then();
    }

    return data.id;
  }, []);

  // Delete conversation
  const deleteConversation = useCallback(async (conversationId: string) => {
    await supabase
      .from("chat_ia_conversations")
      .delete()
      .eq("id", conversationId);

    setConversations(prev => prev.filter(c => c.id !== conversationId));
    if (activeConversationId === conversationId) {
      setActiveConversationId(null);
      setMessages([]);
    }
  }, [activeConversationId]);

  // Switch conversation
  const switchConversation = useCallback((conversationId: string) => {
    setActiveConversationId(conversationId);
  }, []);

  // Load conversations on mount
  useEffect(() => {
    if (user) loadConversations();
  }, [user]);

  // Load messages when active conversation changes
  useEffect(() => {
    if (activeConversationId) {
      loadMessages(activeConversationId);
    } else {
      setMessages([]);
    }
  }, [activeConversationId, loadMessages]);

  return {
    conversations,
    activeConversationId,
    messages,
    setMessages,
    loadingConversations,
    loadingMessages,
    createConversation,
    saveMessage,
    deleteConversation,
    switchConversation,
    loadConversations,
  };
}
