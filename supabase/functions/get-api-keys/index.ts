import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── AES-256-GCM Decryption (mirrors client-side user-encryption.ts) ───
const SALT_PREFIX = "elp-neural-kb-v1";
const PBKDF2_ITERATIONS = 100000;

async function deriveKey(userId: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(userId),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  const salt = encoder.encode(`${SALT_PREFIX}:${userId}`);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
}

async function decryptKey(userId: string, ciphertext: string, iv: string): Promise<string> {
  const key = await deriveKey(userId);
  const encryptedBytes = Uint8Array.from(atob(ciphertext), (c) => c.charCodeAt(0));
  const ivBytes = Uint8Array.from(atob(iv), (c) => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: ivBytes },
    key,
    encryptedBytes
  );
  return new TextDecoder().decode(decrypted);
}

// ─── System key rotation maps ───
const SYSTEM_KEY_NAMES: Record<string, string[]> = {
  gemini: ["GEMINI_API_KEY_GCP", "GEMINI_API_KEY", "GEMINI_API_KEY_2", "GEMINI_API_KEY_3", "GEMINI_API_KEY_4", "GEMINI_API_KEY_5", "GEMINI_API_KEY_6", "GEMINI_API_KEY_7"],
  groq: ["GROQ_API_KEY"],
  openai: ["OPENAI_API_KEY"],
  mistral: ["MISTRAL_API_KEY"],
  anthropic: ["ANTHROPIC_API_KEY", "ANTROPIC_API_KEY"],
  deepseek: ["DEEPSEEK_API_KEY"],
  huggingface: ["HUGGINGFACE_API_KEY", "HF_TOKEN", "CHAVE_API_HUGGINGFACE"],
  openrouter: ["OPENROUTER_API_KEY"],
};

function getSystemKey(provider: string): string | null {
  const names = SYSTEM_KEY_NAMES[provider] || [];
  const keys = names.map((n) => Deno.env.get(n)).filter(Boolean) as string[];
  if (keys.length === 0) return null;
  return keys[Math.floor(Math.random() * keys.length)];
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { user_id, provider } = await req.json();
    if (!user_id || !provider) {
      return new Response(JSON.stringify({ error: "user_id and provider required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try user key first
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: userKey } = await supabase
      .from("user_api_keys")
      .select("encrypted_key, iv")
      .eq("user_id", user_id)
      .eq("provider", provider)
      .eq("is_active", true)
      .maybeSingle();

    if (userKey?.encrypted_key && userKey?.iv) {
      try {
        const key = await decryptKey(user_id, userKey.encrypted_key, userKey.iv);
        if (key) {
          return new Response(JSON.stringify({ key, source: "user" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      } catch (e) {
        console.warn(`[get-api-keys] Decrypt failed for user ${user_id}, provider ${provider}:`, e);
      }
    }

    // Fallback to system keys
    const systemKey = getSystemKey(provider);
    if (systemKey) {
      return new Response(JSON.stringify({ key: systemKey, source: "system" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: `No key available for provider: ${provider}` }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[get-api-keys] Error:", err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
