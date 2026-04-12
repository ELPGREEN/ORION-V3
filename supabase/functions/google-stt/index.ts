const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Google Cloud Speech-to-Text Edge Function
 * Receives audio chunks (base64 LINEAR16) and returns transcription.
 * Uses GCP Service Account for authentication.
 */

const GCP_STT_URL = "https://speech.googleapis.com/v1/speech:recognize";

interface STTRequest {
  audio: string; // base64 LINEAR16
  sampleRate?: number;
  languageCode?: string;
  model?: string;
  enhancedModel?: boolean;
  alternativeLanguageCodes?: string[];
}

async function getAccessToken(): Promise<string> {
  const saKeyRaw = Deno.env.get("GCP_SA_KEY") || Deno.env.get("FIREBASE_SERVICE_ACCOUNT_KEY");
  if (!saKeyRaw) throw new Error("GCP_SA_KEY not configured");

  let sa: any;
  try {
    sa = JSON.parse(saKeyRaw);
  } catch {
    throw new Error("Invalid GCP_SA_KEY JSON");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: sa.client_email,
    sub: sa.client_email,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
    scope: "https://www.googleapis.com/auth/cloud-platform",
  };

  const enc = (obj: any) => btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const headerB64 = enc(header);
  const payloadB64 = enc(payload);
  const signingInput = `${headerB64}.${payloadB64}`;

  // Import RSA private key
  const pemBody = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");
  const keyData = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    new TextEncoder().encode(signingInput)
  );
  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const jwt = `${headerB64}.${payloadB64}.${sigB64}`;

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Token exchange failed: ${tokenRes.status} ${errText}`);
  }

  const tokenData = await tokenRes.json();
  return tokenData.access_token;
}

// Token cache
let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getCachedToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) return cachedToken;
  cachedToken = await getAccessToken();
  tokenExpiry = now + 50 * 60 * 1000; // 50 min
  return cachedToken;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: STTRequest = await req.json();
    
    if (!body.audio || typeof body.audio !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing 'audio' field (base64 LINEAR16)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const languageCode = body.languageCode || "pt-BR";
    const sampleRate = body.sampleRate || 16000;
    const model = body.model || "latest_long";
    
    const token = await getCachedToken();

    const sttBody = {
      config: {
        encoding: "LINEAR16",
        sampleRateHertz: sampleRate,
        languageCode,
        model,
        enableAutomaticPunctuation: true,
        useEnhanced: body.enhancedModel !== false,
        alternativeLanguageCodes: body.alternativeLanguageCodes || ["en-US"],
        speechContexts: [
          {
            phrases: [
              "Orion", "Iapetus", "ELP", "IASoftHub",
              "robótica", "AGV", "pneu", "esteira",
            ],
            boost: 15,
          },
        ],
        metadata: {
          interactionType: "VOICE_COMMAND",
          microphoneDistance: "NEARFIELD",
          recordingDeviceType: "SMARTPHONE",
        },
      },
      audio: {
        content: body.audio,
      },
    };

    const sttRes = await fetch(GCP_STT_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sttBody),
    });

    if (!sttRes.ok) {
      const errText = await sttRes.text();
      console.error(`[google-stt] API error ${sttRes.status}:`, errText);
      
      // If token expired, retry once
      if (sttRes.status === 401) {
        cachedToken = null;
        tokenExpiry = 0;
        const newToken = await getCachedToken();
        const retryRes = await fetch(GCP_STT_URL, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${newToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(sttBody),
        });
        if (!retryRes.ok) {
          const retryErr = await retryRes.text();
          throw new Error(`STT retry failed [${retryRes.status}]: ${retryErr}`);
        }
        const retryData = await retryRes.json();
        return new Response(JSON.stringify(formatResponse(retryData)), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`STT failed [${sttRes.status}]: ${errText}`);
    }

    const data = await sttRes.json();
    return new Response(JSON.stringify(formatResponse(data)), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[google-stt] Error:", msg);
    return new Response(
      JSON.stringify({ error: msg, text: "" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function formatResponse(data: any) {
  const results = data.results || [];
  const texts: string[] = [];
  let confidence = 0;
  let count = 0;

  for (const r of results) {
    const alt = r.alternatives?.[0];
    if (alt?.transcript) {
      texts.push(alt.transcript);
      if (alt.confidence) { confidence += alt.confidence; count++; }
    }
  }

  return {
    text: texts.join(" ").trim(),
    confidence: count > 0 ? confidence / count : 0,
    results: results.map((r: any) => ({
      transcript: r.alternatives?.[0]?.transcript || "",
      confidence: r.alternatives?.[0]?.confidence || 0,
      isFinal: true,
    })),
    languageCode: results[0]?.languageCode || "pt-BR",
  };
}
