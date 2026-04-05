import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface LocalEvent {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  location?: string | null;
  start_at: string;
  end_at?: string | null;
  all_day: boolean;
  color: string;
  category: string;
  recurrence?: string | null;
  google_event_id?: string | null;
  processo_id?: string | null;
  client_profile_id?: string | null;
  created_at: string;
  updated_at: string;
}

export type LocalEventInput = Pick<LocalEvent, "title"> &
  Partial<Pick<LocalEvent, "description" | "location" | "start_at" | "end_at" | "all_day" | "color" | "category" | "recurrence" | "google_event_id" | "processo_id" | "client_profile_id">>;

export function useLocalCalendar() {
  const { user } = useAuth();
  const [events, setEvents] = useState<LocalEvent[]>([]);
  const [loading, setLoading] = useState(false);

  const loadEvents = useCallback(async (from?: Date, to?: Date) => {
    if (!user) return;
    setLoading(true);
    try {
      let q = (supabase
        .from("local_events") as any)
        .select("*")
        .eq("user_id", user.id)
        .order("start_at", { ascending: true });

      if (from) q = q.gte("start_at", from.toISOString());
      if (to) q = q.lte("start_at", to.toISOString());

      const { data, error } = await q.limit(200);
      if (error) throw error;
      setEvents((data as LocalEvent[]) || []);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const createEvent = useCallback(async (input: LocalEventInput) => {
    if (!user) throw new Error("Não autenticado");
    const { data, error } = await (supabase
      .from("local_events") as any)
      .insert({ ...input, user_id: user.id })
      .select()
      .single();
    if (error) throw error;
    setEvents((prev) => [...prev, data as LocalEvent].sort((a, b) => a.start_at.localeCompare(b.start_at)));
    return data as LocalEvent;
  }, [user]);

  const updateEvent = useCallback(async (id: string, updates: Partial<LocalEventInput>) => {
    const { data, error } = await (supabase
      .from("local_events") as any)
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    setEvents((prev) => prev.map((e) => (e.id === id ? (data as LocalEvent) : e)));
    return data as LocalEvent;
  }, []);

  const deleteEvent = useCallback(async (id: string) => {
    const { error } = await (supabase.from("local_events") as any).delete().eq("id", id);
    if (error) throw error;
    setEvents((prev) => prev.filter((e) => e.id !== id));
  }, []);

  useEffect(() => {
    if (user) {
      const now = new Date();
      const from = new Date(now.getFullYear(), now.getMonth(), 1);
      const to = new Date(now.getFullYear(), now.getMonth() + 2, 0);
      loadEvents(from, to);
    }
  }, [user, loadEvents]);

  return { events, loading, loadEvents, createEvent, updateEvent, deleteEvent };
}
