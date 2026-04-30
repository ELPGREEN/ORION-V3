import { RENDER_BACKEND_URL } from "./render-config";
import { supabase } from "@/integrations/supabase/client";

/**
 * Invokes a Supabase Edge Function through the Render Proxy.
 * This saves Supabase Egress by using Render's bandwidth instead.
 *
 * FALLBACK: If Render is offline, it automatically falls back to direct Supabase call.
 * Returns the exact shape { data, error } expected by wrapEdgeFunction.
 */
export async function invokeViaRender(
  functionName: string,
  options: { body?: any; headers?: Record<string, string> } = {}
) {
  const url = `${RENDER_BACKEND_URL}/api/proxy/${functionName}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      body: JSON.stringify(options.body),
      signal: AbortSignal.timeout(15000),
    });

    if (response.ok) {
      const data = await response.json();
      return { data, error: null };
    }

    const errText = await response.text();
    console.warn(`[RenderProxy] ${functionName} failed on Render (${response.status}): ${errText.slice(0, 100)}`);
  } catch (err) {
    console.warn(`[RenderProxy] Render error for ${functionName}, falling back...`);
  }

  // Direct Supabase Fallback
  return await supabase.functions.invoke(functionName, options);
}
