import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function useUnreadMessages() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    // Fetch initial count
    const fetchUnreadCount = async () => {
      try {
        const { data, error } = await supabase.rpc("get_unread_count", {
          _user_id: user.id,
        });

        if (error) {
          return;
        }

        setUnreadCount(data || 0);
      } catch (err) {
      } finally {
        setLoading(false);
      }
    };

    fetchUnreadCount();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("chat-messages-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chat_messages",
        },
        (payload) => {
          // If the new message is not from the current user, increment count
          if (payload.new && payload.new.sender_id !== user.id) {
            setUnreadCount((prev) => prev + 1);
          }
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chat_messages",
        },
        (payload) => {
          // If a message was marked as read, decrement count
          if (payload.new && payload.new.read_at && !payload.old?.read_at) {
            setUnreadCount((prev) => Math.max(0, prev - 1));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAsRead = async (messageIds: string[]) => {
    if (!user || messageIds.length === 0) return;

    const { error } = await supabase
      .from("chat_messages")
      .update({ read_at: new Date().toISOString() })
      .in("id", messageIds)
      .is("read_at", null)
      .neq("sender_id", user.id);

    if (!error) {
      setUnreadCount((prev) => Math.max(0, prev - messageIds.length));
    }
  };

  return { unreadCount, loading, markAsRead, refetch: () => {} };
}
