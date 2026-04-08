/**
 * useVoiceIdentityGuard — Voice identity verification for Orion sessions.
 * 
 * When someone interacts with Orion, this hook checks if the voice matches
 * the enrolled owner. If not, it triggers a guest flow where the person
 * identifies themselves and their interactions are logged for the owner.
 * 
 * Uses the same spectral analysis engine as useVoiceAuth for consistency.
 */

import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { extractVoiceFeaturesFromBlob, compareFeaturesStatic, type VoiceFeatures } from "@/lib/voice/voiceFeatureEngine";
import { isOwnerEmail, isCreatorByName } from "@/lib/neural/orion-consciousness";

export type IdentityStatus = "unknown" | "verifying" | "owner" | "creator" | "guest" | "no_enrollment";

export interface GuestSession {
  id?: string;
  guestName: string;
  messages: Array<{ role: string; content: string; timestamp: string }>;
  startedAt: string;
}

export function useVoiceIdentityGuard() {
  const { user } = useAuth();
  const [identityStatus, setIdentityStatus] = useState<IdentityStatus>("unknown");
  const [guestSession, setGuestSession] = useState<GuestSession | null>(null);
  const [isCheckingVoice, setIsCheckingVoice] = useState(false);
  const guestSessionIdRef = useRef<string | null>(null);

  /** Check if voice matches owner enrollment */
  const verifyVoiceIdentity = useCallback(async (audioBlob: Blob): Promise<IdentityStatus> => {
    if (!user?.id) return "unknown";
    setIsCheckingVoice(true);

    try {
      // Load owner's enrollment
      const { data: enrollment } = await supabase
        .from("voice_auth_enrollments")
        .select("voice_features")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (!enrollment?.voice_features) {
        setIdentityStatus("no_enrollment");
        setIsCheckingVoice(false);
        return "no_enrollment";
      }

      const features = await extractVoiceFeaturesFromBlob(audioBlob);
      const enrolledFeatures = enrollment.voice_features as unknown as VoiceFeatures;
      const similarity = compareFeaturesStatic(features, enrolledFeatures);

      // Match threshold — raised to 0.75 to prevent false positives
      const threshold = 0.75;
      const isOwner = isOwnerEmail(user?.email);
      
      if (similarity >= threshold) {
        // If user email is creator's, set as "creator" (highest trust)
        const status: IdentityStatus = isOwner ? "creator" : "owner";
        setIdentityStatus(status);
        setIsCheckingVoice(false);
        return status;
      }

      setIdentityStatus("guest");
      setIsCheckingVoice(false);
      return "guest";
    } catch (e) {
      console.error("[VoiceGuard] Error:", e);
      setIdentityStatus("unknown");
      setIsCheckingVoice(false);
      return "unknown";
    }
  }, [user?.id]);

  /** Register a guest session */
  const startGuestSession = useCallback(async (guestName: string, voiceBlob?: Blob) => {
    if (!user?.id) return;

    let voiceFeatures = null;
    if (voiceBlob) {
      try {
        voiceFeatures = await extractVoiceFeaturesFromBlob(voiceBlob);
      } catch { /* ignore */ }
    }

    const session: GuestSession = {
      guestName,
      messages: [],
      startedAt: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from("voice_guest_sessions")
      .insert({
        owner_user_id: user.id,
        guest_name: guestName,
        voice_features: voiceFeatures as any,
        messages: [] as any,
        device_info: { userAgent: navigator.userAgent } as any,
        is_active: true,
      })
      .select("id")
      .single();

    if (!error && data) {
      session.id = data.id;
      guestSessionIdRef.current = data.id;
    }

    setGuestSession(session);
    toast.info(`Sessão de visitante iniciada: ${guestName}`);
  }, [user?.id]);

  /** Add a message to the current guest session */
  const addGuestMessage = useCallback(async (role: string, content: string) => {
    if (!guestSession || !guestSessionIdRef.current) return;

    const msg = { role, content, timestamp: new Date().toISOString() };
    const updatedMessages = [...guestSession.messages, msg];

    setGuestSession(prev => prev ? { ...prev, messages: updatedMessages } : null);

    await supabase
      .from("voice_guest_sessions")
      .update({ messages: updatedMessages as any })
      .eq("id", guestSessionIdRef.current);
  }, [guestSession]);

  /** End guest session */
  const endGuestSession = useCallback(async () => {
    if (guestSessionIdRef.current) {
      await supabase
        .from("voice_guest_sessions")
        .update({ 
          is_active: false, 
          ended_at: new Date().toISOString() 
        })
        .eq("id", guestSessionIdRef.current);
    }
    guestSessionIdRef.current = null;
    setGuestSession(null);
    setIdentityStatus("unknown");
  }, []);

  /** Owner: fetch all guest sessions */
  const fetchGuestSessions = useCallback(async () => {
    if (!user?.id) return [];
    const { data } = await supabase
      .from("voice_guest_sessions")
      .select("*")
      .eq("owner_user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    return data || [];
  }, [user?.id]);

  /** Reset to allow re-verification */
  const resetIdentity = useCallback(() => {
    setIdentityStatus("unknown");
    setGuestSession(null);
    guestSessionIdRef.current = null;
  }, []);

  return {
    identityStatus,
    guestSession,
    isCheckingVoice,
    verifyVoiceIdentity,
    startGuestSession,
    addGuestMessage,
    endGuestSession,
    fetchGuestSessions,
    resetIdentity,
    setIdentityStatus,
  };
}
