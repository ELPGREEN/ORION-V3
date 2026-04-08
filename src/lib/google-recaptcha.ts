/**
 * Google reCAPTCHA v3 — Invisible bot protection
 * Uses Google's free reCAPTCHA v3 for form protection.
 * Site key is publishable (safe for client-side).
 */

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || "";

let recaptchaLoaded = false;
let loadPromise: Promise<void> | null = null;

/**
 * Load reCAPTCHA v3 script dynamically
 */
export function loadRecaptcha(): Promise<void> {
  if (recaptchaLoaded) return Promise.resolve();
  if (loadPromise) return loadPromise;
  
  if (!RECAPTCHA_SITE_KEY) {
    console.warn("[reCAPTCHA] No site key configured (VITE_RECAPTCHA_SITE_KEY)");
    return Promise.resolve();
  }

  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      recaptchaLoaded = true;
      resolve();
    };
    script.onerror = () => reject(new Error("Failed to load reCAPTCHA"));
    document.head.appendChild(script);
  });

  return loadPromise;
}

/**
 * Execute reCAPTCHA v3 and get a token for verification
 */
export async function executeRecaptcha(action: string = "submit"): Promise<string | null> {
  if (!RECAPTCHA_SITE_KEY) return null;
  
  try {
    await loadRecaptcha();
    const grecaptcha = (window as any).grecaptcha;
    if (!grecaptcha) return null;

    return new Promise((resolve) => {
      grecaptcha.ready(() => {
        grecaptcha.execute(RECAPTCHA_SITE_KEY, { action }).then(resolve).catch(() => resolve(null));
      });
    });
  } catch {
    return null;
  }
}

/**
 * Check if reCAPTCHA is available
 */
export function isRecaptchaAvailable(): boolean {
  return !!RECAPTCHA_SITE_KEY;
}
