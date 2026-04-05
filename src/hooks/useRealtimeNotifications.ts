import { useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Subscribes to Supabase Realtime for new notifications,
 * shared documents, andamentos, and chat messages for the current user.
 */
export function useRealtimeNotifications(onRefresh?: () => void) {
  const { toast } = useToast();
  const { user } = useAuth();

  const showNotification = useCallback(
    (title: string, description: string) => {
      toast({ title, description });
      onRefresh?.();
    },
    [toast, onRefresh]
  );

  useEffect(() => {
    if (!user) return;

    // 1. New notifications (covers andamentos + shared docs via DB triggers)
    const notifChannel = supabase
      .channel("realtime-notificacoes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notificacoes",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const n = payload.new as any;
          showNotification(n.titulo || "Nova notificação", n.descricao || "");
        }
      )
      .subscribe();

    // 2. New shared documents (immediate UI refresh)
    const sharedChannel = supabase
      .channel("realtime-shared-docs")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "shared_documents",
          filter: `shared_with=eq.${user.id}`,
        },
        () => {
          onRefresh?.();
        }
      )
      .subscribe();

    // 3. New chat messages — only for conversations the user is part of
    const chatChannel = supabase
      .channel("realtime-chat-messages")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        async (payload) => {
          const msg = payload.new as any;
          if (msg.sender_id === user.id) return;

          // Verify this conversation belongs to the current user
          const { data: conv } = await supabase
            .from("chat_conversations")
            .select("id")
            .eq("id", msg.conversation_id)
            .or(`cliente_id.eq.${user.id},advogado_id.eq.${user.id}`)
            .maybeSingle();

          if (conv) {
            showNotification(
              "💬 Nova mensagem",
              "Você recebeu uma nova mensagem no chat."
            );
          }
        }
      )
      .subscribe();

    // 4. Andamentos changes (for process timeline refresh)
    const andamentosChannel = supabase
      .channel("realtime-andamentos")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "andamentos",
        },
        () => {
          onRefresh?.();
        }
      )
      .subscribe();

    // 5. Process status changes
    const processosChannel = supabase
      .channel("realtime-processos")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "processos",
        },
        () => {
          onRefresh?.();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(sharedChannel);
      supabase.removeChannel(chatChannel);
      supabase.removeChannel(andamentosChannel);
      supabase.removeChannel(processosChannel);
    };
  }, [user, showNotification]);
}
