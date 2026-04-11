/**
 * Google Cloud TTS — Official Neural2/Journey voices via REST API
 * Latency: ~500ms | Free tier: 1M chars/month
 * Auth: GCP_SA_KEY (service account JSON) or GEMINI_API_KEY_GCP
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SynthesizeRequest {
  text: string;
  voice?: string;
  lang?: string;
  encoding?: string;
  speakingRate?: number;
  pitch?: number;
}

/**
 * Get access token from service account JSON (JWT → OAuth2)
 */
async function getAccessToken(saKey: string): Promise<string> {
  const sa = JSON.parse(saKey);
  const now = Math.floor(Date.now() / 1000);

  // Create JWT header + claim
  const header = { alg: "RS256", typ: "JWT" };
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const enc = (obj: unknown) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

  const unsignedToken = `${enc(header)}.${enc(claim)}`;

  // Import private key and sign
  const pemBody = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/, "")
    .replace(/-----END PRIVATE KEY-----/, "")
    .replace(/\s/g, "");
  const keyData = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(unsignedToken),
  );

  const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const jwt = `${unsignedToken}.${sig}`;

  // Exchange JWT for access token
  const tokenResp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });

  if (!tokenResp.ok) {
    const err = await tokenResp.text();
    throw new Error(`Token exchange failed: ${err}`);
  }

  const { access_token } = await tokenResp.json();
  return access_token;
}

// Cache token in memory (edge function lifetime)
let _cachedToken: string | null = null;
let _tokenExpiry = 0;

async function getToken(): Promise<string> {
  if (_cachedToken && Date.now() < _tokenExpiry) return _cachedToken;

  const saKey = Deno.env.get("GCP_SA_KEY");
  if (!saKey) throw new Error("GCP_SA_KEY not configured");

  _cachedToken = await getAccessToken(saKey);
  _tokenExpiry = Date.now() + 50 * 60 * 1000; // 50 min
  return _cachedToken;
}

// Voice presets optimized for Orion
const VOICE_PRESETS: Record<string, { name: string; ssmlGender: string }> = {
  "neural2-grave": { name: "pt-BR-Neural2-B", ssmlGender: "MALE" },
  "neural2-medio": { name: "pt-BR-Neural2-C", ssmlGender: "FEMALE" },
  "journey-masculino": { name: "pt-BR-Journey-D", ssmlGender: "MALE" },
  "journey-feminino": { name: "pt-BR-Journey-F", ssmlGender: "FEMALE" },
  "studio-masculino": { name: "pt-BR-Studio-B", ssmlGender: "MALE" },
  "wavenet-grave": { name: "pt-BR-Wavenet-B", ssmlGender: "MALE" },
  default: { name: "pt-BR-Neural2-B", ssmlGender: "MALE" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const start = Date.now();

  try {
    const body: SynthesizeRequest = await req.json();
    const { text, voice, lang, encoding, speakingRate, pitch } = body;

    if (!text?.trim()) {
      return new Response(JSON.stringify({ error: "text is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanText = text.trim().slice(0, 5000);
    const preset = VOICE_PRESETS[voice || "default"] || VOICE_PRESETS["default"];
    const ttsLang = lang || "pt-BR";

    const token = await getToken();

    const ttsBody = {
      input: { text: cleanText },
      voice: {
        languageCode: ttsLang,
        name: preset.name,
        ssmlGender: preset.ssmlGender,
      },
      audioConfig: {
        audioEncoding: encoding || "OGG_OPUS",
        speakingRate: speakingRate || 1.0,
        pitch: pitch || 0.0,
        effectsProfileId: ["headphone-class-device"],
      },
    };

    console.log(`[Cloud TTS] Synthesizing ${cleanText.length} chars with ${preset.name}`);

    const resp = await fetch(
      "https://texttospeech.googleapis.com/v1/text:synthesize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(ttsBody),
      },
    );

    if (!resp.ok) {
      const errText = await resp.text();
      console.error(`[Cloud TTS] API error ${resp.status}: ${errText}`);

      // If token expired, clear cache
      if (resp.status === 401) {
        _cachedToken = null;
        _tokenExpiry = 0;
      }

      return new Response(
        JSON.stringify({ error: `Cloud TTS failed: ${resp.status}`, fallback: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await resp.json();
    const audioContent = data.audioContent; // base64-encoded audio

    if (!audioContent) {
      return new Response(
        JSON.stringify({ error: "No audio content returned", fallback: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Decode base64 to binary
    const binaryString = atob(audioContent);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    const contentType = encoding === "MP3" ? "audio/mpeg"
      : encoding === "LINEAR16" ? "audio/wav"
      : "audio/ogg";

    const durationMs = Date.now() - start;
    console.log(`[Cloud TTS] ✅ Generated ${(bytes.length / 1024).toFixed(1)}KB in ${durationMs}ms`);

    return new Response(bytes.buffer, {
      headers: {
        ...corsHeaders,
        "Content-Type": contentType,
        "Content-Length": String(bytes.length),
        "X-Duration-Ms": String(durationMs),
        "X-Voice": preset.name,
      },
    });
  } catch (error: any) {
    console.error("[Cloud TTS] Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message, fallback: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
