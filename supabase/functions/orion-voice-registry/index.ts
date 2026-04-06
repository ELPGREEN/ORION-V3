/**
 * Orion Voice Registry v1.0
 * ─────────────────────────────────────────────────────────────
 * Voice profile management for owner, clients, and users.
 * Integrates with ElevenLabs for voice cloning and TTS.
 *
 * Actions:
 *   register_voice   — Upload voice sample and create profile
 *   list_voices       — List voice profiles for a user
 *   clone_voice       — Clone voice via ElevenLabs
 *   synthesize        — Generate speech from text using a profile
 *   delete_voice      — Remove a voice profile
 */
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const ELEVENLABS_API = "https://api.elevenlabs.io/v1";

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

// ─── Clone voice via ElevenLabs ───
async function handleCloneVoice(body: Record<string, unknown>, userId: string) {
  const sb = getSupabase();
  const ELEVENLABS_KEY = Deno.env.get("ELEVENLABS_API_KEY");
  if (!ELEVENLABS_KEY) throw new Error("ELEVENLABS_API_KEY not configured");

  const { profile_id, voice_name, voice_description } = body;
  if (!profile_id) throw new Error("profile_id required");

  // Get profile
  const { data: profile, error: profileError } = await sb
    .from("voice_profiles")
    .select("*")
    .eq("id", profile_id)
    .eq("user_id", userId)
    .single();

  if (profileError || !profile) throw new Error("Voice profile not found");
  if (!profile.voice_sample_url) throw new Error("No voice sample uploaded");

  // Download the sample
  const sampleRes = await fetch(profile.voice_sample_url);
  const sampleBlob = await sampleRes.blob();

  // Clone via ElevenLabs
  const formData = new FormData();
  formData.append("name", String(voice_name || profile.display_name));
  formData.append("description", String(voice_description || `Voice clone for ${profile.display_name}`));
  formData.append("files", sampleBlob, "voice_sample.wav");

  const cloneRes = await fetch(`${ELEVENLABS_API}/voices/add`, {
    method: "POST",
    headers: { "xi-api-key": ELEVENLABS_KEY },
    body: formData,
  });

  const cloneData = await cloneRes.json();
  if (!cloneRes.ok) throw new Error(`ElevenLabs clone failed: ${JSON.stringify(cloneData)}`);

  // Update profile with voice ID
  await sb.from("voice_profiles").update({
    elevenlabs_voice_id: cloneData.voice_id,
    voice_characteristics: {
      ...profile.voice_characteristics,
      cloned: true,
      elevenlabs_name: cloneData.name,
    },
  }).eq("id", profile_id);

  return { success: true, voice_id: cloneData.voice_id, message: `Voz clonada: ${cloneData.name}` };
}

// ─── Synthesize speech ───
async function handleSynthesize(body: Record<string, unknown>, userId: string) {
  const ELEVENLABS_KEY = Deno.env.get("ELEVENLABS_API_KEY");
  if (!ELEVENLABS_KEY) throw new Error("ELEVENLABS_API_KEY not configured");

  const { text, profile_id, voice_id: directVoiceId } = body;
  if (!text) throw new Error("text required");

  let voiceId = directVoiceId as string;

  // Lookup voice from profile if no direct ID
  if (!voiceId && profile_id) {
    const sb = getSupabase();
    const { data: profile } = await sb
      .from("voice_profiles")
      .select("elevenlabs_voice_id")
      .eq("id", profile_id)
      .eq("user_id", userId)
      .single();

    voiceId = profile?.elevenlabs_voice_id;
  }

  if (!voiceId) voiceId = "JBFqnCBsd6RMkjVDRZzb"; // fallback: George

  const ttsRes = await fetch(
    `${ELEVENLABS_API}/text-to-speech/${voiceId}?output_format=mp3_44100_128`,
    {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: String(text),
        model_id: "eleven_multilingual_v2",
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.5 },
      }),
    }
  );

  if (!ttsRes.ok) throw new Error(`TTS failed: ${ttsRes.status}`);

  const audioBuffer = await ttsRes.arrayBuffer();

  return new Response(audioBuffer, {
    headers: { ...corsHeaders, "Content-Type": "audio/mpeg" },
  });
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

  const { data: profile } = await sb
    .from("voice_profiles")
    .select("elevenlabs_voice_id")
    .eq("id", profile_id)
    .eq("user_id", userId)
    .single();

  // Remove from ElevenLabs if cloned
  if (profile?.elevenlabs_voice_id) {
    const ELEVENLABS_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (ELEVENLABS_KEY) {
      await fetch(`${ELEVENLABS_API}/voices/${profile.elevenlabs_voice_id}`, {
        method: "DELETE",
        headers: { "xi-api-key": ELEVENLABS_KEY },
      });
    }
  }

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
