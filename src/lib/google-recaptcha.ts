/**
 * Google reCAPTCHA v3 — Invisible bot protection
 * Uses Google's free reCAPTCHA v3 for form protection.
 * Site key is publishable (safe for client-side).
 */

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6Le7eq8sAAAAAOAx1JsHy279Sxg3Ak_mscz7owTI";
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
    console.info("[reCAPTCHA] executeRecaptcha start", { action, hasSiteKey: !!RECAPTCHA_SITE_KEY });
    await withTimeout(loadRecaptcha(), RECAPTCHA_LOAD_TIMEOUT_MS);
    const grecaptcha = (window as any).grecaptcha;
    const hasReady = typeof grecaptcha?.ready === "function";
    const hasExecute = typeof grecaptcha?.execute === "function";

    console.info("[reCAPTCHA] grecaptcha availability", {
      action,
      exists: !!grecaptcha,
      hasReady,
      hasExecute,
    });

    if (!grecaptcha || !hasReady || !hasExecute) return null;

    return await withTimeout(
      new Promise<string | null>((resolve) => {
        grecaptcha.ready(() => {
          console.info("[reCAPTCHA] ready callback fired", { action });
          Promise.resolve(grecaptcha.execute(RECAPTCHA_SITE_KEY, { action }))
            .then((token: string | null) => {
              const normalizedToken = typeof token === "string" ? token.trim() : "";
              console.info("[reCAPTCHA] execute result", {
                action,
                tokenType: typeof token,
                tokenLength: normalizedToken.length,
              });
              resolve(normalizedToken || null);
            })
            .catch((error: unknown) => {
              console.error("[reCAPTCHA] execute failed", {
                action,
                message: error instanceof Error ? error.message : String(error),
              });
              resolve(null);
            });
        });
      }),
      RECAPTCHA_EXEC_TIMEOUT_MS,
    );
  } catch (error) {
    console.error("[reCAPTCHA] executeRecaptcha failed", {
      action,
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

/**
 * Check if reCAPTCHA is available
 */
export function isRecaptchaAvailable(): boolean {
  return !!RECAPTCHA_SITE_KEY;
}
