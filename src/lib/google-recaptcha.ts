/**
 * Google reCAPTCHA v3 — Invisible bot protection
 * Uses Google's free reCAPTCHA v3 for form protection.
 * Site key is publishable (safe for client-side).
 */

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6LcDia0sAAAAABs_4aIZI-Thp9lZvcaMNFvQ-_Jq";
const RECAPTCHA_LOAD_TIMEOUT_MS = 8000;
const RECAPTCHA_EXEC_TIMEOUT_MS = 8000;

let recaptchaLoaded = false;
let loadPromise: Promise<void> | null = null;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = globalThis.setTimeout(() => reject(new Error("reCAPTCHA timeout")), ms);

    promise
      .then((value) => {
        globalThis.clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        globalThis.clearTimeout(timeoutId);
        reject(error);
      });
  });
}

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
    await withTimeout(loadRecaptcha(), RECAPTCHA_LOAD_TIMEOUT_MS);
    const grecaptcha = (window as any).grecaptcha;
    if (!grecaptcha || typeof grecaptcha.ready !== "function" || typeof grecaptcha.execute !== "function") return null;

    return await withTimeout(
      new Promise<string | null>((resolve) => {
        grecaptcha.ready(() => {
          Promise.resolve(grecaptcha.execute(RECAPTCHA_SITE_KEY, { action }))
            .then((token: string | null) => resolve(token ?? null))
            .catch(() => resolve(null));
        });
      }),
      RECAPTCHA_EXEC_TIMEOUT_MS,
    );
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
