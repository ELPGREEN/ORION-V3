/**
 * Google Cloud Speech-to-Text — Tier 0 STT for Orion
 * Latency: ~300ms | Free: 60 min/month
 * Auth: GCP_SA_KEY (service account JSON)
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Token cache ───
let _cachedToken: string | null = null;
let _tokenExpiry = 0;

async function getAccessToken(saKey: string): Promise<string> {
  const sa = JSON.parse(saKey);
  const now = Math.floor(Date.now() / 1000);

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

async function getToken(): Promise<string> {
  if (_cachedToken && Date.now() < _tokenExpiry) return _cachedToken;
  const saKey = Deno.env.get("GCP_SA_KEY");
  if (!saKey) throw new Error("GCP_SA_KEY not configured");
  _cachedToken = await getAccessToken(saKey);
  _tokenExpiry = Date.now() + 50 * 60 * 1000;
  return _cachedToken;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const start = Date.now();

  try {
    const body = await req.json();
    const { audio_base64, language, encoding, sample_rate } = body;

    if (!audio_base64) {
      return new Response(
        JSON.stringify({ error: "audio_base64 is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const token = await getToken();

    const sttBody = {
      config: {
        encoding: encoding || "WEBM_OPUS",
        sampleRateHertz: sample_rate || 48000,
        languageCode: language || "pt-BR",
        model: "latest_short",
        enableAutomaticPunctuation: true,
        useEnhanced: true,
        alternativeLanguageCodes: ["en-US"],
      },
      audio: {
        content: audio_base64,
      },
    };

    console.log(`[Cloud STT] Recognizing ${(audio_base64.length / 1024).toFixed(1)}KB audio`);

    const resp = await fetch(
      "https://speech.googleapis.com/v1/speech:recognize",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(sttBody),
      },
    );

    if (!resp.ok) {
      const errText = await resp.text();
      console.error(`[Cloud STT] API error ${resp.status}: ${errText}`);

      if (resp.status === 401) {
        _cachedToken = null;
        _tokenExpiry = 0;
      }

      return new Response(
        JSON.stringify({ error: `Cloud STT failed: ${resp.status}`, text: null }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await resp.json();
    const results = data.results || [];
    const transcript = results
      .map((r: any) => r.alternatives?.[0]?.transcript || "")
      .join(" ")
      .trim();

    const confidence = results[0]?.alternatives?.[0]?.confidence || 0;
    const durationMs = Date.now() - start;

    console.log(`[Cloud STT] ✅ "${transcript.slice(0, 80)}" (${(confidence * 100).toFixed(0)}%) in ${durationMs}ms`);

    return new Response(
      JSON.stringify({
        text: transcript || null,
        confidence,
        duration_ms: durationMs,
        provider: "google-cloud-stt",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("[Cloud STT] Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message, text: null }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
