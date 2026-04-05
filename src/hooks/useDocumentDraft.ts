import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { FormData } from "@/types/document-types";

const DRAFT_KEY = "document_draft";
const DEBOUNCE_MS = 800;

interface DraftState {
  formData: FormData;
  editedContent: string;
  generatedContent: string;
  qualificationResponses?: Record<string, string>;
  step: number;
  lastSaved: string | null;
  forceLetterhead?: boolean;
  customMarginTop?: number;
  customMarginBottom?: number;
}

interface UseDraftReturn {
  draft: DraftState | null;
  saveDraft: (data: Partial<DraftState>) => void;
  clearDraft: () => Promise<void>;
  restoreDraft: () => DraftState | null;
  isSaving: boolean;
  lastSavedAt: Date | null;
  hasDraft: boolean;
}

const getLocalDraft = (): DraftState | null => {
  try {
    const stored = localStorage.getItem(DRAFT_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
  }
  return null;
};

const setLocalDraft = (draft: DraftState) => {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    // Dispatch storage event for other tabs
    window.dispatchEvent(new StorageEvent("storage", {
      key: DRAFT_KEY,
      newValue: JSON.stringify(draft),
    }));
  } catch (e) {
  }
};

const clearLocalDraft = () => {
  try {
    localStorage.removeItem(DRAFT_KEY);
    window.dispatchEvent(new StorageEvent("storage", {
      key: DRAFT_KEY,
      newValue: null,
    }));
  } catch (e) {
  }
};

export function useDocumentDraft(initialFormData: FormData): UseDraftReturn {
  const { user } = useAuth();
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [hasDraft, setHasDraft] = useState(false);
  const pendingChangesRef = useRef<Partial<DraftState> | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const currentDraftRef = useRef<DraftState | null>(null);

  // Initialize current draft ref
  useEffect(() => {
    currentDraftRef.current = getLocalDraft();
    setHasDraft(!!currentDraftRef.current);
  }, []);

  // Listen for storage events from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === DRAFT_KEY) {
        const newDraft = e.newValue ? JSON.parse(e.newValue) : null;
        currentDraftRef.current = newDraft;
        setHasDraft(!!newDraft);
        if (newDraft?.lastSaved) {
          setLastSavedAt(new Date(newDraft.lastSaved));
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Save before unload - critical for navigation persistence
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Flush any pending changes immediately
      if (pendingChangesRef.current) {
        const currentDraft = getLocalDraft();
        const newDraft: DraftState = {
          formData: pendingChangesRef.current?.formData || currentDraft?.formData || initialFormData,
          editedContent: pendingChangesRef.current?.editedContent ?? currentDraft?.editedContent ?? "",
          generatedContent: pendingChangesRef.current?.generatedContent ?? currentDraft?.generatedContent ?? "",
          step: pendingChangesRef.current?.step ?? currentDraft?.step ?? 1,
          lastSaved: new Date().toISOString(),
        };
        setLocalDraft(newDraft);
      }
    };

    // Also save on visibility change (tab switch)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && pendingChangesRef.current) {
        handleBeforeUnload();
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [initialFormData]);

  // Save to Supabase (debounced, when user is logged in)
  const saveToSupabase = useCallback(async (draft: DraftState) => {
    if (!user) return;

    try {
      // First try to update existing
      const { data: existing } = await supabase
        .from("document_drafts")
        .select("id")
        .eq("user_id", user.id)
        .eq("draft_key", DRAFT_KEY)
        .single();

      if (existing) {
        await supabase
          .from("document_drafts")
          .update({
            form_data: JSON.parse(JSON.stringify(draft.formData)),
            edited_content: draft.editedContent || draft.generatedContent,
            step: draft.step,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("document_drafts")
          .insert([{
            user_id: user.id,
            draft_key: DRAFT_KEY,
            form_data: JSON.parse(JSON.stringify(draft.formData)),
            edited_content: draft.editedContent || draft.generatedContent,
            step: draft.step,
          }]);
      }
    } catch (e) {
    }
  }, [user]);

  // Main save function with debounce
  const saveDraft = useCallback((data: Partial<DraftState>) => {
    // Merge with pending changes
    pendingChangesRef.current = {
      ...pendingChangesRef.current,
      ...data,
    };

    // Clear existing debounce timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set saving indicator
    setIsSaving(true);

    // Debounce the actual save
    debounceTimerRef.current = setTimeout(() => {
      const currentDraft = getLocalDraft();
      const newDraft: DraftState = {
        formData: pendingChangesRef.current?.formData || currentDraft?.formData || initialFormData,
        editedContent: pendingChangesRef.current?.editedContent ?? currentDraft?.editedContent ?? "",
        generatedContent: pendingChangesRef.current?.generatedContent ?? currentDraft?.generatedContent ?? "",
        step: pendingChangesRef.current?.step ?? currentDraft?.step ?? 1,
        lastSaved: new Date().toISOString(),
      };

      // Save locally (instant)
      setLocalDraft(newDraft);
      currentDraftRef.current = newDraft;
      setLastSavedAt(new Date());
      setHasDraft(true);
      setIsSaving(false);

      // Save to Supabase (async, doesn't block)
      saveToSupabase(newDraft);

      // Clear pending changes
      pendingChangesRef.current = null;
    }, DEBOUNCE_MS);
  }, [initialFormData, saveToSupabase]);

  // Clear draft from both local and Supabase
  const clearDraft = useCallback(async () => {
    clearLocalDraft();
    currentDraftRef.current = null;
    setHasDraft(false);
    setLastSavedAt(null);

    if (user) {
      try {
        await supabase
          .from("document_drafts")
          .delete()
          .eq("user_id", user.id)
          .eq("draft_key", DRAFT_KEY);
      } catch (e) {
      }
    }
  }, [user]);

  // Restore draft - prefers local, falls back to Supabase
  const restoreDraft = useCallback((): DraftState | null => {
    const localDraft = getLocalDraft();
    if (localDraft) {
      currentDraftRef.current = localDraft;
      return localDraft;
    }
    return null;
  }, []);

  // Load from Supabase on mount if logged in and no local draft
  useEffect(() => {
    const loadFromSupabase = async () => {
      if (!user) return;

      const localDraft = getLocalDraft();
      if (localDraft) {
        // Already have local draft, just sync last saved time
        if (localDraft.lastSaved) {
          setLastSavedAt(new Date(localDraft.lastSaved));
        }
        return;
      }

      try {
        const { data, error } = await supabase
          .from("document_drafts")
          .select("*")
          .eq("user_id", user.id)
          .eq("draft_key", DRAFT_KEY)
          .single();

        if (data && !error) {
          const restoredDraft: DraftState = {
            formData: data.form_data as unknown as FormData,
            editedContent: data.edited_content || "",
            generatedContent: "",
            step: data.step || 1,
            lastSaved: data.updated_at,
          };
          setLocalDraft(restoredDraft);
          currentDraftRef.current = restoredDraft;
          setHasDraft(true);
          setLastSavedAt(new Date(data.updated_at));
        }
      } catch (e) {
      }
    };

    loadFromSupabase();
  }, [user]);

  // Cleanup debounce timer on unmount - but flush first!
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      // Flush pending changes on unmount
      if (pendingChangesRef.current) {
        const currentDraft = getLocalDraft();
        const newDraft: DraftState = {
          formData: pendingChangesRef.current?.formData || currentDraft?.formData || initialFormData,
          editedContent: pendingChangesRef.current?.editedContent ?? currentDraft?.editedContent ?? "",
          generatedContent: pendingChangesRef.current?.generatedContent ?? currentDraft?.generatedContent ?? "",
          step: pendingChangesRef.current?.step ?? currentDraft?.step ?? 1,
          lastSaved: new Date().toISOString(),
        };
        setLocalDraft(newDraft);
      }
    };
  }, [initialFormData]);

  return {
    draft: currentDraftRef.current,
    saveDraft,
    clearDraft,
    restoreDraft,
    isSaving,
    lastSavedAt,
    hasDraft,
  };
}
