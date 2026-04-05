import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useCodeSnippets(filter?: any) {
  const [snippets, setSnippets] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchSnippets = async () => {
    setLoading(true);
    const { data } = await supabase.from("code_snippets").select("*").order("created_at", { ascending: false });
    setSnippets(data || []);
    setLoading(false);
  };

  const saveSnippet = async (snippet: any) => {
    await supabase.from("code_snippets").insert(snippet);
    await fetchSnippets();
  };

  const deleteSnippet = async (id: string) => {
    await supabase.from("code_snippets").delete().eq("id", id);
    await fetchSnippets();
  };

  return { snippets, data: snippets, loading, isLoading: loading, fetchSnippets, saveSnippet, deleteSnippet };
}

export function useCreateSnippet() {
  const [isPending, setIsPending] = useState(false);
  const fn = async (...args: any[]) => {
    setIsPending(true);
    const snippet = args.length === 2 ? args[1] : args[0];
    await supabase.from("code_snippets").insert(snippet);
    setIsPending(false);
  };
  return { mutateAsync: fn, mutate: fn, isPending };
}

export function useDeleteSnippet() {
  const [isPending, setIsPending] = useState(false);
  const fn = async (...args: any[]) => {
    setIsPending(true);
    const id = typeof args[0] === "string" ? args[0] : args[1];
    await supabase.from("code_snippets").delete().eq("id", id);
    setIsPending(false);
  };
  return { mutateAsync: fn, mutate: fn, isPending };
}
