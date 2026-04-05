import { useState, useRef, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UseAIAutocompleteOptions {
  enabled: boolean;
  documentType?: string;
  debounceMs?: number;
}

export function useAIAutocomplete({ enabled, documentType, debounceMs = 1200 }: UseAIAutocompleteOptions) {
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const lastTextRef = useRef("");

  const clearSuggestion = useCallback(() => {
    setSuggestion(null);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (abortRef.current) abortRef.current.abort();
  }, []);

  const requestCompletion = useCallback(async (context: string, cursorText: string) => {
    if (!enabled || cursorText.length < 10) {
      clearSuggestion();
      return;
    }

    // Don't re-request for same text
    if (lastTextRef.current === cursorText) return;
    lastTextRef.current = cursorText;

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-autocomplete", {
        body: { mode: "autocomplete", context, cursorText, documentType },
      });
      if (error) throw error;
      const completion = data?.completion;
      if (completion && completion.trim().length > 3) {
        setSuggestion(completion.trim());
      } else {
        setSuggestion(null);
      }
    } catch (err) {
      if ((err as any)?.name !== "AbortError") {
      }
      setSuggestion(null);
    } finally {
      setLoading(false);
    }
  }, [enabled, documentType, clearSuggestion]);

  const onTextChange = useCallback((context: string, cursorText: string) => {
    if (!enabled) return;
    clearSuggestion();
    
    // Only trigger after a pause
    timerRef.current = setTimeout(() => {
      requestCompletion(context, cursorText);
    }, debounceMs);
  }, [enabled, debounceMs, clearSuggestion, requestCompletion]);

  const acceptSuggestion = useCallback(() => {
    const current = suggestion;
    clearSuggestion();
    return current;
  }, [suggestion, clearSuggestion]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  return {
    suggestion,
    loading,
    onTextChange,
    acceptSuggestion,
    clearSuggestion,
  };
}
