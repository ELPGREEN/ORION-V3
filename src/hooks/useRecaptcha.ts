/**
 * useRecaptcha — Hook for Google reCAPTCHA v3 integration
 * Auto-loads reCAPTCHA on mount when site key is available.
 */
import { useEffect, useCallback, useState } from "react";
import { loadRecaptcha, executeRecaptcha, isRecaptchaAvailable } from "@/lib/google-recaptcha";

export function useRecaptcha() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isRecaptchaAvailable()) return;
    loadRecaptcha().then(() => setReady(true)).catch(() => {});
  }, []);

  const verify = useCallback(async (action: string = "submit"): Promise<string | null> => {
    return executeRecaptcha(action);
  }, []);

  return { ready, verify, available: isRecaptchaAvailable() };
}
