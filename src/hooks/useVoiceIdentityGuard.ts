/**
 * useVoiceIdentityGuard — Voice identity verification for Orion sessions.
 * 
 * When someone interacts with Orion, this hook checks if the voice matches
 * the enrolled owner. If not, it triggers a guest flow where the person
 * identifies themselves and their interactions are logged for the owner.
 * 
 * Uses the same spectral analysis engine as useVoiceAuth for consistency.
 */

import { useState, useCallback, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { extractVoiceFeaturesFromBlob, compareFeaturesStatic, CREATOR_VOICE_FINGERPRINT, type VoiceFeatures } from "@/lib/voice/voiceFeatureEngine";
import { isOwnerEmail } from "@/lib/neural/orion-consciousness";
...
  /** Check if voice matches owner enrollment */
  const verifyVoiceIdentity = useCallback(async (audioBlob: Blob): Promise<IdentityStatus> => {
    if (isCreatorAccount) {
      console.log("[VoiceGuard] 👑 Creator account detected by email — auto-verified");
      setIdentityStatus("creator");
      return "creator";
    }

    console.log("[VoiceGuard] 🎤 Starting voice verification, blob size:", audioBlob.size, "type:", audioBlob.type);
    setIsCheckingVoice(true);
    setIdentityStatus("verifying");

    try {
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
        setIdentityStatus("unknown");
        setIsCheckingVoice(false);
        return "unknown";
      }

      const creatorSimilarity = compareFeaturesStatic(features, CREATOR_VOICE_FINGERPRINT);
      const creatorPitchNear = features.pitch_mean > 0 && Math.abs(features.pitch_mean - CREATOR_VOICE_FINGERPRINT.pitch_mean) <= 45;
      const creatorTimbreNear = features.spectral_centroid > 0 && Math.abs(features.spectral_centroid - CREATOR_VOICE_FINGERPRINT.spectral_centroid) <= 900;
      console.log("[VoiceGuard] 🎙️ Creator voice similarity:", creatorSimilarity.toFixed(4), "(threshold: 0.44)", {
        creatorPitchNear,
        creatorTimbreNear,
      });

      if (creatorSimilarity >= 0.44 || (creatorSimilarity >= 0.40 && creatorPitchNear && creatorTimbreNear)) {
        console.log("[VoiceGuard] 👑 Voice matches CREATOR (Ericson Piccoli)! Score:", creatorSimilarity.toFixed(4));
        setIdentityStatus("creator");
        setIsCheckingVoice(false);
        return "creator";
      }

      let enrollment: { voice_features: VoiceFeatures | null; user_id: string } | null = null;
      if (user?.id) {
        const { data, error: enrollError } = await supabase
          .from("voice_auth_enrollments")
          .select("voice_features, user_id")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .maybeSingle();

        if (!enrollError && data) {
          enrollment = {
            user_id: data.user_id,
            voice_features: (data.voice_features as unknown as VoiceFeatures) || null,
          };
        }
      }

      if (enrollment?.voice_features) {
        console.log("[VoiceGuard] ✅ Enrollment found for current user, comparing...");
        const similarity = compareFeaturesStatic(features, enrollment.voice_features);
        console.log("[VoiceGuard] 📊 Similarity score:", similarity.toFixed(4), "(threshold: 0.50)");

        if (similarity >= 0.50) {
          const status: IdentityStatus = isOwnerEmail(user?.email) ? "creator" : "owner";
          console.log("[VoiceGuard] ✅ Voice MATCHED! Status:", status);
          setIdentityStatus(status);
          setIsCheckingVoice(false);
          return status;
        }
      }

      const { data: ownerEnrollments } = await supabase
        .from("voice_auth_enrollments")
        .select("voice_features, user_id")
        .eq("is_active", true)
        .limit(20);

      if (ownerEnrollments && ownerEnrollments.length > 0) {
        let bestSimilarity = 0;
        for (const ownerEnroll of ownerEnrollments) {
          if (!ownerEnroll.voice_features) continue;
          const ownerFeatures = ownerEnroll.voice_features as unknown as VoiceFeatures;
          const ownerSimilarity = compareFeaturesStatic(features, ownerFeatures);
          bestSimilarity = Math.max(bestSimilarity, ownerSimilarity);
          console.log("[VoiceGuard] 🔍 Cross-account voice check, similarity:", ownerSimilarity.toFixed(4));
          if (ownerSimilarity >= 0.52) {
            console.log("[VoiceGuard] 👑 Voice matches an active enrollment! Granting creator access.");
            setIdentityStatus("creator");
            setIsCheckingVoice(false);
            return "creator";
          }
        }
        console.log("[VoiceGuard] 🧪 Best cross-account similarity:", bestSimilarity.toFixed(4));
      }

      if (!enrollment?.voice_features) {
        console.warn("[VoiceGuard] ⚠️ No voice enrollment found for current user");
        setIdentityStatus("unknown");
        setIsCheckingVoice(false);
        return "unknown";
      }

      console.log("[VoiceGuard] ⚠️ Voice did NOT match any enrollment");
      setIdentityStatus("guest");
      setIsCheckingVoice(false);
      return "guest";
    } catch (e) {
      console.error("[VoiceGuard] ❌ Unexpected error:", e);
      setIdentityStatus("unknown");
      setIsCheckingVoice(false);
      return "unknown";
    }
  }, [isCreatorAccount, user?.id, user?.email]);

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
