/**
 * Google Cloud Speech-to-Text v1 Edge Function
 * Uses v1 API with latest_long model + enhanced mode
 * Billing goes to GCP project credits
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface STTRequest {
  audio: string; // base64 LINEAR16
  sampleRate?: number;
  languageCode?: string;
  encoding?: string;
  alternativeLanguageCodes?: string[];
}

// ─── GCP Auth ──────────────────────────────────────────────

async function getAccessToken(): Promise<string> {
  const saKeyRaw = Deno.env.get("GCP_SA_KEY") || Deno.env.get("FIREBASE_SERVICE_ACCOUNT_KEY");
  if (!saKeyRaw) throw new Error("GCP_SA_KEY not configured");

  let sa: any;
  try { sa = JSON.parse(saKeyRaw); } catch { throw new Error("Invalid GCP_SA_KEY JSON"); }

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

  const pemBody = sa.private_key
    .replace(/-----BEGIN PRIVATE KEY-----/g, "")
    .replace(/-----END PRIVATE KEY-----/g, "")
    .replace(/\s/g, "");
  const keyData = Uint8Array.from(atob(pemBody), (c) => c.charCodeAt(0));

  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8", keyData,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false, ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5", cryptoKey,
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

  return (await tokenRes.json()).access_token;
}

let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getCachedToken(): Promise<string> {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) return cachedToken;
  cachedToken = await getAccessToken();
  tokenExpiry = now + 50 * 60 * 1000;
  return cachedToken;
}

// ─── v1 Recognize ──────────────────────────────────────────

async function recognize(body: STTRequest, token: string) {
  const url = "https://speech.googleapis.com/v1/speech:recognize";
  const reqBody = {
    config: {
      encoding: body.encoding || "LINEAR16",
      sampleRateHertz: body.sampleRate || 16000,
      languageCode: body.languageCode || "pt-BR",
      model: "latest_long",
      enableAutomaticPunctuation: true,
      useEnhanced: true,
      alternativeLanguageCodes: body.alternativeLanguageCodes || ["en-US"],
      speechContexts: [
        {
          phrases: [
            "Orion", "Oríon", "Ericson", "ELP", "IASoftHub",
          ],
          boost: 8,
        },
      ],
    },
    audio: { content: body.audio },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(reqBody),
  });

  if (!res.ok) {
    const errText = await res.text();

    // Token expired → retry once
    if (res.status === 401) {
      cachedToken = null;
      tokenExpiry = 0;
      const newToken = await getCachedToken();
      const retryRes = await fetch(url, {
        method: "POST",
        headers: { "Authorization": `Bearer ${newToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(reqBody),
      });
      if (!retryRes.ok) {
        const retryErr = await retryRes.text();
        throw new Error(`STT retry failed [${retryRes.status}]: ${retryErr}`);
      }
      return formatResponse(await retryRes.json());
    }

    throw new Error(`STT failed [${res.status}]: ${errText}`);
  }

  return formatResponse(await res.json());
}

// ─── Response Formatter ────────────────────────────────────

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
    apiVersion: "v1",
    results: results.map((r: any) => ({
      transcript: r.alternatives?.[0]?.transcript || "",
      confidence: r.alternatives?.[0]?.confidence || 0,
      isFinal: true,
    })),
    languageCode: results[0]?.languageCode || "pt-BR",
  };
}

// ─── Main Handler ──────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body: STTRequest = await req.json();

    if (!body.audio || typeof body.audio !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing 'audio' field (base64)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = await getCachedToken();

    console.log(`[google-stt] v1 recognize, Lang: ${body.languageCode || "pt-BR"}`);

    const result = await recognize(body, token);

    return new Response(JSON.stringify(result), {
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
