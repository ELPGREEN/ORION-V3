/**
 * useDocumentPresence – Supabase Realtime Presence for document viewing.
 * Shows which users are currently viewing/editing the same document.
 */
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { RealtimeChannel } from "@supabase/supabase-js";

export interface PresenceUser {
  userId: string;
  name: string;
  color: string;
  isEditing: boolean;
  joinedAt: string;
}

const PRESENCE_COLORS = [
  "#f59e0b", "#ef4444", "#10b981", "#3b82f6",
  "#8b5cf6", "#ec4899", "#14b8a6", "#f97316",
];

function pickColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return PRESENCE_COLORS[Math.abs(hash) % PRESENCE_COLORS.length];
}

interface UseDocumentPresenceOptions {
  documentId: string | null;
  userName?: string;
  enabled?: boolean;
}

export function useDocumentPresence({
  documentId,
  userName = "Usuário",
  enabled = true,
}: UseDocumentPresenceOptions) {
  const { user } = useAuth();
  const [presentUsers, setPresentUsers] = useState<PresenceUser[]>([]);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (!documentId || !enabled || !user) return;

    const channel = supabase.channel(`doc-presence:${documentId}`, {
      config: { presence: { key: user.id } },
    });

    channelRef.current = channel;

    const color = pickColor(userName);

    channel
      .on("presence", { event: "sync" }, () => {
        const state = channel.presenceState<{
          userId: string;
          name: string;
          color: string;
          isEditing: boolean;
          joinedAt: string;
        }>();

        const users: PresenceUser[] = [];
        for (const [, presences] of Object.entries(state)) {
          if (presences.length > 0) {
            const p = presences[0];
            users.push({
              userId: p.userId,
              name: p.name,
              color: p.color,
              isEditing: p.isEditing,
              joinedAt: p.joinedAt,
            });
          }
        }
        setPresentUsers(users);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            userId: user.id,
            name: userName,
            color,
            isEditing: false,
            joinedAt: new Date().toISOString(),
          });
        }
      });

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [documentId, enabled, user, userName]);

  // Update editing state in presence
  const updateEditingState = async (editing: boolean) => {
    setIsEditing(editing);
    if (channelRef.current && user) {
      await channelRef.current.track({
        userId: user.id,
        name: userName,
        color: pickColor(userName),
        isEditing: editing,
        joinedAt: new Date().toISOString(),
      });
    }
  };

  const otherUsers = presentUsers.filter((u) => u.userId !== user?.id);

  return {
    presentUsers,
    otherUsers,
    updateEditingState,
    isEditing,
    totalViewers: presentUsers.length,
  };
}
