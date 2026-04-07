/**
 * Orion Voice Registry v2.0
 * ─────────────────────────────────────────────────────────────
 * Voice profile management for owner, clients, and users.
 * Uses Gemini TTS for synthesis (FREE). Voice cloning via Fish Speech.
 *
 * Actions:
 *   register_voice   — Upload voice sample and create profile
 *   list_voices       — List voice profiles for a user
 *   clone_voice       — Clone voice (placeholder — Fish Speech)
 *   synthesize        — Generate speech from text using Gemini TTS
 *   delete_voice      — Remove a voice profile
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function getSupabase(authHeader?: string) {
  if (authHeader) {
    return createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
  }
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function getAuthUser(req: Request) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  const sb = getSupabase(authHeader);
  const { data: { user } } = await sb.auth.getUser();
  return user;
}

// ─── Register voice sample ───
async function handleRegisterVoice(body: Record<string, unknown>, userId: string) {
  const sb = getSupabase();
  const { display_name, profile_type, voice_sample_base64, voice_characteristics } = body;

  if (!display_name) throw new Error("display_name required");

  let voiceSampleUrl: string | null = null;

  // Upload voice sample to storage if provided
  if (voice_sample_base64) {
    const buffer = Uint8Array.from(atob(String(voice_sample_base64)), c => c.charCodeAt(0));
    const filename = `voice_${userId}_${Date.now()}.wav`;
    const { error: uploadError } = await sb.storage
      .from("orion-voice-samples")
      .upload(filename, buffer, { contentType: "audio/wav" });

    if (!uploadError) {
      const { data: urlData } = sb.storage.from("orion-voice-samples").getPublicUrl(filename);
      voiceSampleUrl = urlData?.publicUrl || null;
    }
  }

  const { data, error } = await sb.from("voice_profiles").insert({
    user_id: userId,
    display_name: String(display_name),
    profile_type: String(profile_type || "user"),
    voice_sample_url: voiceSampleUrl,
    voice_characteristics: voice_characteristics || {},
    is_primary: false,
  }).select().single();

  if (error) throw new Error(`Failed to register: ${error.message}`);
  return { success: true, profile: data };
}

// ─── Clone voice (Fish Speech placeholder) ───
async function handleCloneVoice(body: Record<string, unknown>, userId: string) {
  const sb = getSupabase();
  const { profile_id, voice_name } = body;
  if (!profile_id) throw new Error("profile_id required");

  const { data: profile, error: profileError } = await sb
    .from("voice_profiles")
    .select("*")
    .eq("id", profile_id)
    .eq("user_id", userId)
    .single();

  if (profileError || !profile) throw new Error("Voice profile not found");
  if (!profile.voice_sample_url) throw new Error("No voice sample uploaded");

  // Mark as cloned (Fish Speech integration placeholder)
  await sb.from("voice_profiles").update({
    voice_characteristics: {
      ...profile.voice_characteristics,
      cloned: true,
      clone_engine: "fish_speech",
      clone_name: voice_name || profile.display_name,
    },
  }).eq("id", profile_id);

  return { success: true, message: `Voz registrada: ${voice_name || profile.display_name}. Clone via Fish Speech pendente.` };
}

// ─── Synthesize speech via Gemini TTS (FREE) ───
async function handleSynthesize(body: Record<string, unknown>, _userId: string) {
  const { text } = body;
  if (!text) throw new Error("text required");

  const geminiKeys = [
    Deno.env.get("GEMINI_API_KEY")
  ].filter((k): k is string => !!k);

  for (const key of geminiKeys) {
    try {
      const resp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: `Leia em voz alta: ${String(text)}` }] }],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: "Charon" } } },
            },
          }),
        }
      );

      if (!resp.ok) { await resp.text(); continue; }
      const data = await resp.json();
      const audioData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (audioData) {
        const audioBuffer = Uint8Array.from(atob(audioData), c => c.charCodeAt(0));
        return new Response(audioBuffer.buffer, {
          headers: { ...corsHeaders, "Content-Type": "audio/wav" },
        });
      }
    } catch { continue; }
  }

  throw new Error("Gemini TTS failed with all keys");
}

// ─── List voices ───
async function handleListVoices(userId: string) {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("voice_profiles")
    .select("*")
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return { success: true, profiles: data };
}

// ─── Delete voice ───
async function handleDeleteVoice(body: Record<string, unknown>, userId: string) {
  const sb = getSupabase();
  const { profile_id } = body;

  await sb.from("voice_profiles").update({ is_active: false }).eq("id", profile_id).eq("user_id", userId);
  return { success: true, message: "Perfil de voz removido" };
}

// ─── Main Handler ───
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const user = await getAuthUser(req);
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contentType = req.headers.get("content-type") || "";

    // Handle multipart (voice upload with audio file)
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const audioFile = formData.get("audio") as File;
      const displayName = formData.get("display_name") as string || "Voice Sample";
      const profileType = formData.get("profile_type") as string || "user";

      if (!audioFile) throw new Error("audio file required");

      const buffer = await audioFile.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer).slice(0, 5_000_000)));

      const result = await handleRegisterVoice({
        display_name: displayName,
        profile_type: profileType,
        voice_sample_base64: base64,
      }, user.id);

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    let result: Record<string, unknown> | Response;

    switch (action) {
      case "register":
        result = await handleRegisterVoice(body, user.id);
        break;
      case "clone":
        result = await handleCloneVoice(body, user.id);
        break;
      case "synthesize":
        result = await handleSynthesize(body, user.id);
        if (result instanceof Response) return result;
        break;
      case "list":
        result = await handleListVoices(user.id);
        break;
      case "delete":
        result = await handleDeleteVoice(body, user.id);
        break;
      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("❌ orion-voice-registry error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
