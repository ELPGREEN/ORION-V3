import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

interface NotificacaoRecord {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: string;
  lida: boolean;
  created_at: string;
}

export function useSignatureRealtime() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [unreadCount, setUnreadCount] = useState(0);
  const processedIds = useRef<Set<string>>(new Set());

  // Fetch initial unread count
  useEffect(() => {
    if (!user) return;
    supabase
      .from("notificacoes")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("lida", false)
      .then(({ count }) => {
        setUnreadCount(count || 0);
      });
  }, [user]);

  // Realtime: listen for new notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("notificacoes-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notificacoes",
          filter: `user_id=eq.${user.id}`,
        },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          const record = payload.new as unknown as NotificacaoRecord;
          if (!record) return;

          const key = record.id;
          if (processedIds.current.has(key)) return;
          processedIds.current.add(key);

          toast({
            title: record.titulo,
            description: record.descricao || undefined,
          });

          setUnreadCount((prev) => prev + 1);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notificacoes",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          // Recount on updates (mark as read)
          supabase
            .from("notificacoes")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("lida", false)
            .then(({ count }) => {
              setUnreadCount(count || 0);
            });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, toast]);

  const clearUnread = () => {
    setUnreadCount(0);
  };

  return { unreadCount, clearUnread };
}
