import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { encryptContent, decryptContent } from "@/lib/crypto/user-encryption";

export interface PrivateKnowledgeEntry {
  id: string;
  title: string;
  content: string; // decrypted
  tags: string[];
  created_at: string;
  updated_at: string;
}

export function usePrivateKnowledge() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<PrivateKnowledgeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);

    try {
      const { data, error: dbError } = await supabase
        .from("user_private_knowledge" as any)
        .select("id, title, encrypted_content, encryption_iv, tags, created_at, updated_at")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false });

      if (dbError) {
        setError(dbError.message);
        return;
      }

      const decrypted = await Promise.all(
        (data || []).map(async (entry: any) => {
          try {
            const content = await decryptContent(
              user.id,
              entry.encrypted_content,
              entry.encryption_iv
            );
            return {
              id: entry.id,
              title: entry.title,
              content,
              tags: entry.tags || [],
              created_at: entry.created_at,
              updated_at: entry.updated_at,
            };
          } catch {
            return {
              id: entry.id,
              title: entry.title,
              content: "[Erro ao descriptografar]",
              tags: entry.tags || [],
              created_at: entry.created_at,
              updated_at: entry.updated_at,
            };
          }
        })
      );

      setEntries(decrypted);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  const addEntry = useCallback(
    async (title: string, content: string, tags: string[] = []) => {
      if (!user?.id) return null;

      try {
        const { ciphertext, iv } = await encryptContent(user.id, content);

        const { data, error: dbError } = await supabase
          .from("user_private_knowledge" as any)
          .insert({
            user_id: user.id,
            title,
            encrypted_content: ciphertext,
            encryption_iv: iv,
            tags,
          })
          .select("id")
          .single();

        if (dbError) {
          setError(dbError.message);
          return null;
        }

        await loadEntries();
        return data?.id;
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to add");
        return null;
      }
    },
    [user?.id, loadEntries]
  );

  const deleteEntry = useCallback(
    async (id: string) => {
      if (!user?.id) return;

      const { error: dbError } = await supabase
        .from("user_private_knowledge" as any)
        .delete()
        .eq("id", id)
        .eq("user_id", user.id);

      if (dbError) {
        setError(dbError.message);
        return;
      }

      setEntries((prev) => prev.filter((e) => e.id !== id));
    },
    [user?.id]
  );

  const deleteAll = useCallback(async () => {
    if (!user?.id) return;

    const { error: dbError } = await supabase
      .from("user_private_knowledge" as any)
      .delete()
      .eq("user_id", user.id);

    if (dbError) {
      setError(dbError.message);
      return;
    }

    setEntries([]);
  }, [user?.id]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  return {
    entries,
    loading,
    error,
    addEntry,
    deleteEntry,
    deleteAll,
    refresh: loadEntries,
  };
}
