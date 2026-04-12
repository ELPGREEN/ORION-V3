const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Google Cloud Speech-to-Text v2 Edge Function
 * Uses the latest v2 API (same as GCP Console tutorial)
 * Supports both inline recognize and batch recognize
 * Billing goes to your GCP project credits
 */

interface STTRequest {
  audio: string; // base64 LINEAR16 or WEBM_OPUS etc
  sampleRate?: number;
  languageCode?: string;
  model?: string;
  encoding?: string;
  mode?: "recognize" | "batch"; // default: recognize
  gcsUri?: string; // for batch mode: gs://bucket/file.wav
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

function getProjectId(): string {
  const saKeyRaw = Deno.env.get("GCP_SA_KEY") || Deno.env.get("FIREBASE_SERVICE_ACCOUNT_KEY");
  if (!saKeyRaw) return "unknown";
  try { return JSON.parse(saKeyRaw).project_id || "unknown"; } catch { return "unknown"; }
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

// ─── v2 Recognize (inline audio) ───────────────────────────

async function recognizeV2(body: STTRequest, token: string, projectId: string) {
  const languageCode = body.languageCode || "pt-BR";
  const sampleRate = body.sampleRate || 16000;
  const encoding = body.encoding || "LINEAR16";
  const model = body.model || "chirp_2"; // chirp_2 is best for multilingual (pt-BR), fallback: "long"

  const url = `https://speech.googleapis.com/v2/projects/${projectId}/locations/global/recognizers/_:recognize`;

  const reqBody = {
    config: {
      autoDecodingConfig: encoding === "AUTO" ? {} : undefined,
      explicitDecodingConfig: encoding !== "AUTO" ? {
        encoding,
        sampleRateHertz: sampleRate,
        audioChannelCount: 1,
      } : undefined,
      model,
      languageCodes: [languageCode, ...(body.alternativeLanguageCodes || ["en-US"])],
      features: {
        enableAutomaticPunctuation: true,
        enableWordTimeOffsets: false,
        enableWordConfidence: true,
      },
      adaptation: {
        phraseSets: [
          {
            inlinePhraseSet: {
              phrases: [
                { value: "Orion", boost: 15 },
                { value: "Iapetus", boost: 15 },
                { value: "ELP", boost: 10 },
                { value: "IASoftHub", boost: 10 },
                { value: "robótica", boost: 5 },
                { value: "AGV", boost: 5 },
                { value: "pneu", boost: 5 },
                { value: "esteira", boost: 5 },
              ],
            },
          },
        ],
      },
    },
    content: body.audio,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(reqBody),
  });

  if (!res.ok) {
    const errText = await res.text();
    
    // Token expired → retry
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
        throw new Error(`STT v2 retry failed [${retryRes.status}]: ${retryErr}`);
      }
      return formatV2Response(await retryRes.json());
    }

    // If v2 fails (API not enabled), fallback to v1
    if (res.status === 403 || res.status === 404) {
      console.warn(`[google-stt] v2 API unavailable (${res.status}), falling back to v1`);
      return await recognizeV1Fallback(body, token);
    }

    throw new Error(`STT v2 failed [${res.status}]: ${errText}`);
  }

  return formatV2Response(await res.json());
}

// ─── v2 Batch Recognize (GCS audio) ────────────────────────

async function batchRecognizeV2(body: STTRequest, token: string, projectId: string) {
  if (!body.gcsUri) throw new Error("gcsUri required for batch mode");

  const languageCode = body.languageCode || "pt-BR";
  const model = body.model || "long";

  const url = `https://speech.googleapis.com/v2/projects/${projectId}/locations/global/recognizers/_:batchRecognize`;

  const reqBody = {
    config: {
      autoDecodingConfig: {},
      model,
      languageCodes: [languageCode, ...(body.alternativeLanguageCodes || ["en-US"])],
      features: {
        enableAutomaticPunctuation: true,
        enableWordTimeOffsets: true,
        enableWordConfidence: true,
      },
    },
    files: [{ uri: body.gcsUri }],
    recognitionOutputConfig: {
      inlineResponseConfig: {},
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(reqBody),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Batch STT failed [${res.status}]: ${errText}`);
  }

  const data = await res.json();

  // Batch returns a long-running operation
  if (data.name) {
    // Poll for completion (max 60s in edge function)
    const opUrl = `https://speech.googleapis.com/v2/${data.name}`;
    let attempts = 0;
    while (attempts < 12) {
      await new Promise(r => setTimeout(r, 5000));
      const pollRes = await fetch(opUrl, {
        headers: { "Authorization": `Bearer ${token}` },
      });
      if (!pollRes.ok) break;
      const pollData = await pollRes.json();
      if (pollData.done) {
        return formatBatchResponse(pollData);
      }
      attempts++;
    }
    return { text: "", confidence: 0, status: "processing", operationName: data.name };
  }

  return formatBatchResponse(data);
}

// ─── v1 Fallback ───────────────────────────────────────────

async function recognizeV1Fallback(body: STTRequest, token: string) {
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
    throw new Error(`STT v1 fallback failed [${res.status}]: ${errText}`);
  }

  const data = await res.json();
  return formatV1Response(data);
}

// ─── Response Formatters ───────────────────────────────────

function formatV2Response(data: any) {
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
    apiVersion: "v2",
    results: results.map((r: any) => ({
      transcript: r.alternatives?.[0]?.transcript || "",
      confidence: r.alternatives?.[0]?.confidence || 0,
      words: r.alternatives?.[0]?.words || [],
      isFinal: true,
    })),
    languageCode: results[0]?.languageCode || "pt-BR",
  };
}

function formatBatchResponse(data: any) {
  // Batch results are nested in response.results
  const response = data.response || data.result || data;
  const inlineResults = response?.results || {};
  const allTexts: string[] = [];
  let totalConfidence = 0;
  let totalCount = 0;

  for (const fileKey of Object.keys(inlineResults)) {
    const fileResult = inlineResults[fileKey];
    const transcript = fileResult?.transcript;
    if (transcript?.results) {
      for (const r of transcript.results) {
        const alt = r.alternatives?.[0];
        if (alt?.transcript) {
          allTexts.push(alt.transcript);
          if (alt.confidence) { totalConfidence += alt.confidence; totalCount++; }
        }
      }
    }
  }

  return {
    text: allTexts.join(" ").trim(),
    confidence: totalCount > 0 ? totalConfidence / totalCount : 0,
    apiVersion: "v2-batch",
    status: "completed",
  };
}

function formatV1Response(data: any) {
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
    apiVersion: "v1-fallback",
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
    const mode = body.mode || "recognize";

    if (mode === "recognize" && (!body.audio || typeof body.audio !== "string")) {
      return new Response(
        JSON.stringify({ error: "Missing 'audio' field (base64)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (mode === "batch" && !body.gcsUri) {
      return new Response(
        JSON.stringify({ error: "Missing 'gcsUri' for batch mode (e.g. gs://bucket/file.wav)" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = await getCachedToken();
    const projectId = getProjectId();

    console.log(`[google-stt] Mode: ${mode}, Project: ${projectId}, Lang: ${body.languageCode || "pt-BR"}`);

    let result;
    if (mode === "batch") {
      result = await batchRecognizeV2(body, token, projectId);
    } else {
      result = await recognizeV2(body, token, projectId);
    }

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
