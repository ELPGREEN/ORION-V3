/**
 * hCaptcha Configuration
 * Replace the test key with your real site key from hcaptcha.com
 * The same key must be configured in Supabase Dashboard → Auth → Bot Protection
 */
export const HCAPTCHA_SITE_KEY = import.meta.env.VITE_HCAPTCHA_SITE_KEY || "10000000-ffff-ffff-ffff-000000000000";
