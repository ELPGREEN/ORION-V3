import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      return new Response(JSON.stringify({ error: "ELEVENLABS_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const contentType = req.headers.get("content-type") || "";

    // DELETE: remove cloned voice
    if (req.method === "DELETE") {
      const { voiceId } = await req.json();
      if (!voiceId) {
        return new Response(JSON.stringify({ error: "voiceId required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const delResp = await fetch(`https://api.elevenlabs.io/v1/voices/${voiceId}`, {
        method: "DELETE",
        headers: { "xi-api-key": ELEVENLABS_API_KEY },
      });

      if (!delResp.ok) {
        const errText = await delResp.text();
        console.error(`ElevenLabs delete error: ${errText}`);
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST: clone voice — supports FormData OR JSON with samplePaths
    let files: File[] = [];

    if (contentType.includes("application/json")) {
      // JSON mode: fetch files from Supabase Storage using service role
      const body = await req.json();
      const samplePaths: string[] = body.samplePaths;

      if (!samplePaths || samplePaths.length < 1) {
        return new Response(JSON.stringify({ error: "samplePaths array required (min 1)" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const adminClient = createClient(supabaseUrl, serviceRoleKey);

      console.log(`[Voice Clone] Fetching ${samplePaths.length} samples from Storage for user ${user.id}`);

      for (const path of samplePaths) {
        const { data, error } = await adminClient.storage
          .from("orion-voice-samples")
          .download(path);

        if (error || !data) {
          console.error(`Failed to download ${path}:`, error);
          continue;
        }

        const fileName = path.split("/").pop() || "sample.webm";
        const file = new File([data], fileName, { type: "audio/webm" });
        files.push(file);
      }

      if (files.length < 1) {
        return new Response(JSON.stringify({ error: "No valid samples could be downloaded from Storage" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else if (contentType.includes("multipart/form-data")) {
      // FormData mode (legacy/fallback)
      const formData = await req.formData();
      for (const [key, value] of formData.entries()) {
        if (key === "file" && value instanceof File) {
          files.push(value);
        }
      }

      if (files.length < 1) {
        return new Response(JSON.stringify({ error: "At least 1 audio file required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      return new Response(JSON.stringify({ error: "Content-Type must be multipart/form-data or application/json" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build FormData for ElevenLabs
    const elFormData = new FormData();
    elFormData.append("name", `Orion - ${user.id.slice(0, 8)}`);
    elFormData.append("description", "Voz personalizada do assistente Orion");
    elFormData.append("remove_background_noise", "true");
    elFormData.append("labels", JSON.stringify({
      language: "pt-BR",
      accent: "brasileiro",
      use_case: "assistant",
    }));

    for (const file of files) {
      elFormData.append("files", file, file.name);
    }

    console.log(`[Voice Clone] Sending ${files.length} samples to ElevenLabs for user ${user.id}`);

    const response = await fetch("https://api.elevenlabs.io/v1/voices/add", {
      method: "POST",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
      },
      body: elFormData,
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error(`ElevenLabs clone error ${response.status}: ${errText}`);
      return new Response(JSON.stringify({ error: "Voice cloning failed", details: errText }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await response.json();
    console.log(`[Voice Clone] Success! voice_id: ${result.voice_id}`);

    return new Response(JSON.stringify({ voice_id: result.voice_id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Voice clone error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
