/**
 * Render Backend Configuration for ORION V3
 * Used to offload heavy logic from Supabase Edge Functions to save Egress.
 */

export const RENDER_BACKEND_URL = "https://orion-v3.onrender.com";

export const isRenderAvailable = async () => {
  try {
    const resp = await fetch(`${RENDER_BACKEND_URL}/health`, { signal: AbortSignal.timeout(3000) });
    return resp.ok;
  } catch {
    return false;
  }
};
