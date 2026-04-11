/**
 * Google Cloud Vision API — Fast object/text/face detection
 * Latency: ~300ms | Free tier: 1000 images/month
 * Auth: GCP_SA_KEY (service account JSON)
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Get access token from service account JSON
 */
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

  if (!tokenResp.ok) throw new Error(`Token exchange failed: ${await tokenResp.text()}`);
  const { access_token } = await tokenResp.json();
  return access_token;
}

let _cachedToken: string | null = null;
let _tokenExpiry = 0;

async function getToken(): Promise<string> {
  if (_cachedToken && Date.now() < _tokenExpiry) return _cachedToken;
  const saKey = Deno.env.get("GCP_SA_KEY");
  if (!saKey) throw new Error("GCP_SA_KEY not configured");
  _cachedToken = await getAccessToken(saKey);
  _tokenExpiry = Date.now() + 50 * 60 * 1000;
  return _cachedToken;
}

// Feature types for Vision API
type FeatureType =
  | "LABEL_DETECTION"
  | "OBJECT_LOCALIZATION"
  | "TEXT_DETECTION"
  | "FACE_DETECTION"
  | "LOGO_DETECTION"
  | "LANDMARK_DETECTION"
  | "IMAGE_PROPERTIES"
  | "SAFE_SEARCH_DETECTION"
  | "DOCUMENT_TEXT_DETECTION";

const DEFAULT_FEATURES: FeatureType[] = [
  "LABEL_DETECTION",
  "OBJECT_LOCALIZATION",
  "TEXT_DETECTION",
  "FACE_DETECTION",
  "LOGO_DETECTION",
];

interface VisionRequest {
  image_base64: string;
  features?: FeatureType[];
  max_results?: number;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const start = Date.now();

  try {
    const body: VisionRequest = await req.json();
    const { image_base64, features, max_results } = body;

    if (!image_base64) {
      return new Response(JSON.stringify({ error: "image_base64 is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = await getToken();
    const selectedFeatures = features || DEFAULT_FEATURES;
    const maxRes = max_results || 20;

    const visionBody = {
      requests: [
        {
          image: { content: image_base64 },
          features: selectedFeatures.map((type) => ({
            type,
            maxResults: maxRes,
          })),
        },
      ],
    };

    console.log(`[Cloud Vision] Analyzing with features: ${selectedFeatures.join(", ")}`);

    const resp = await fetch(
      "https://vision.googleapis.com/v1/images:annotate",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(visionBody),
      },
    );

    if (!resp.ok) {
      const errText = await resp.text();
      console.error(`[Cloud Vision] API error ${resp.status}: ${errText}`);
      if (resp.status === 401) {
        _cachedToken = null;
        _tokenExpiry = 0;
      }
      return new Response(
        JSON.stringify({ error: `Cloud Vision failed: ${resp.status}`, fallback: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await resp.json();
    const annotations = data.responses?.[0] || {};

    // Normalize into a unified format
    const labels = (annotations.labelAnnotations || []).map((l: any) => ({
      name: l.description,
      confidence: Math.round((l.score || 0) * 100),
      topicality: l.topicality,
    }));

    const objects = (annotations.localizedObjectAnnotations || []).map((o: any) => ({
      name: o.name,
      confidence: Math.round((o.score || 0) * 100),
      boundingBox: o.boundingPoly?.normalizedVertices || [],
    }));

    const texts = annotations.textAnnotations
      ? [{
          fullText: annotations.textAnnotations[0]?.description || "",
          blocks: annotations.textAnnotations.slice(1).map((t: any) => ({
            text: t.description,
            boundingBox: t.boundingPoly?.vertices || [],
          })),
        }]
      : [];

    const faces = (annotations.faceAnnotations || []).map((f: any) => ({
      joy: f.joyLikelihood,
      sorrow: f.sorrowLikelihood,
      anger: f.angerLikelihood,
      surprise: f.surpriseLikelihood,
      confidence: Math.round((f.detectionConfidence || 0) * 100),
      boundingBox: f.boundingPoly?.vertices || [],
      landmarks: f.landmarks?.length || 0,
      headwear: f.headwearLikelihood,
      pan: f.panAngle,
      tilt: f.tiltAngle,
      roll: f.rollAngle,
    }));

    const logos = (annotations.logoAnnotations || []).map((l: any) => ({
      name: l.description,
      confidence: Math.round((l.score || 0) * 100),
      boundingBox: l.boundingPoly?.vertices || [],
    }));

    const safeSearch = annotations.safeSearchAnnotation || null;

    const durationMs = Date.now() - start;
    console.log(
      `[Cloud Vision] ✅ ${labels.length} labels, ${objects.length} objects, ${faces.length} faces, ${texts.length ? "text found" : "no text"} in ${durationMs}ms`,
    );

    return new Response(
      JSON.stringify({
        labels,
        objects,
        texts,
        faces,
        logos,
        safeSearch,
        duration_ms: durationMs,
        features_used: selectedFeatures,
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    console.error("[Cloud Vision] Error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message, fallback: true }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
