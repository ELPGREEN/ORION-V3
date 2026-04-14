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
import { extractVoiceFeaturesFromBlob, compareFeaturesStatic, CREATOR_VOICE_FINGERPRINT, type VoiceFeatures } from "@/lib/voice/voiceFeatureEngine";
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

  /** Auto-detect creator by email — skip voice check for owner accounts */
  const isCreatorAccount = user?.email ? isOwnerEmail(user.email) : false;

  /** Check if voice matches owner enrollment */
  const verifyVoiceIdentity = useCallback(async (audioBlob: Blob): Promise<IdentityStatus> => {
    // Owner emails are always recognized as creator — no voice check needed
    if (isCreatorAccount) {
      console.log("[VoiceGuard] 👑 Creator account detected by email — auto-verified");
      setIdentityStatus("creator");
      return "creator";
    }

    if (!user?.id) {
      console.warn("[VoiceGuard] No user ID, skipping verification");
      return "unknown";
    }
    console.log("[VoiceGuard] 🎤 Starting voice verification, blob size:", audioBlob.size, "type:", audioBlob.type);
    setIsCheckingVoice(true);

    try {
      // Extract voice features first — we'll need them for both checks
      let features: VoiceFeatures;
      try {
        features = await extractVoiceFeaturesFromBlob(audioBlob);
        console.log("[VoiceGuard] Features extracted:", {
          mfcc_len: features.mfcc_mean.length,
          pitch: features.pitch_mean.toFixed(1),
          energy: features.energy_mean.toFixed(6),
          zcr: features.zero_crossing_rate.toFixed(4),
        });
      } catch (featureErr) {
        console.error("[VoiceGuard] ❌ Feature extraction failed:", featureErr);
        // FAIL-CLOSED: do NOT default to owner — block sensitive commands
        setIdentityStatus("unknown");
        setIsCheckingVoice(false);
        return "unknown";
      }

      // ── Check against CREATOR hardcoded fingerprint first ──
      const creatorSimilarity = compareFeaturesStatic(features, CREATOR_VOICE_FINGERPRINT);
      console.log("[VoiceGuard] 🎙️ Creator voice similarity:", creatorSimilarity.toFixed(4), "(threshold: 0.60)");
      
      if (creatorSimilarity >= 0.60) {
        console.log("[VoiceGuard] 👑 Voice matches CREATOR (Ericson Piccoli)! Score:", creatorSimilarity.toFixed(4));
        setIdentityStatus("creator");
        setIsCheckingVoice(false);
        return "creator";
      }

      // ── Check against owner's enrollment ──
      const { data: enrollment, error: enrollError } = await supabase
        .from("voice_auth_enrollments")
        .select("voice_features")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .maybeSingle();

      if (enrollError) {
        console.error("[VoiceGuard] ❌ DB error loading enrollment:", enrollError.message);
        setIdentityStatus("no_enrollment");
        setIsCheckingVoice(false);
        return "no_enrollment";
      }

      if (!enrollment?.voice_features) {
        console.warn("[VoiceGuard] ⚠️ No voice enrollment found for user:", user.id);
        setIdentityStatus("no_enrollment");
        setIsCheckingVoice(false);
        return "no_enrollment";
      }

      console.log("[VoiceGuard] ✅ Enrollment found, comparing...");

      const enrolledFeatures = enrollment.voice_features as unknown as VoiceFeatures;
      const similarity = compareFeaturesStatic(features, enrolledFeatures);
      
      console.log("[VoiceGuard] 📊 Similarity score:", similarity.toFixed(4), "(threshold: 0.65)");

      const threshold = 0.65;
      const isOwner = isOwnerEmail(user?.email);
      
      if (similarity >= threshold) {
        const status: IdentityStatus = isOwner ? "creator" : "owner";
        console.log("[VoiceGuard] ✅ Voice MATCHED! Status:", status);
        setIdentityStatus(status);
        setIsCheckingVoice(false);
        return status;
      }

      console.log("[VoiceGuard] ⚠️ Voice did NOT match (score:", similarity.toFixed(4), "< threshold:", threshold, ")");
      setIdentityStatus("guest");
      setIsCheckingVoice(false);
      return "guest";
    } catch (e) {
      console.error("[VoiceGuard] ❌ Unexpected error:", e);
      // FAIL-CLOSED: do NOT default to owner — block sensitive commands
      setIdentityStatus("unknown");
      setIsCheckingVoice(false);
      return "unknown";
    }
  }, [user?.id, user?.email]);

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
