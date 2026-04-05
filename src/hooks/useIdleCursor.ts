import { useEffect, useRef } from "react";

interface UseIdleCursorOptions {
  /** Time in ms before cursor fades out (default: 2000) */
  idleTimeout?: number;
  /** CSS transition duration for fade (default: "0.5s") */
  fadeDuration?: string;
  /** Whether feature is enabled (default: true) */
  enabled?: boolean;
}

/**
 * Auto-hides the cursor after a period of inactivity.
 * Cursor reappears smoothly on mouse movement.
 */
export function useIdleCursor({
  idleTimeout = 2000,
  fadeDuration = "0.5s",
  enabled = true,
}: UseIdleCursorOptions = {}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const styleRef = useRef<HTMLStyleElement | null>(null);

  useEffect(() => {
    if (!enabled) return;

    // Inject CSS for cursor hiding
    const style = document.createElement("style");
    style.textContent = `
      body.cursor-idle, body.cursor-idle * {
        cursor: none !important;
      }
      body {
        transition: cursor ${fadeDuration} ease;
      }
    `;
    document.head.appendChild(style);
    styleRef.current = style;

    const showCursor = () => {
      document.body.classList.remove("cursor-idle");
    };

    const hideCursor = () => {
      document.body.classList.add("cursor-idle");
    };

    const resetTimer = () => {
      showCursor();
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(hideCursor, idleTimeout);
    };

    // Listen to mouse movement
    document.addEventListener("mousemove", resetTimer, { passive: true });
    document.addEventListener("mousedown", resetTimer, { passive: true });
    document.addEventListener("scroll", resetTimer, { passive: true });

    // Start initial timer
    timerRef.current = setTimeout(hideCursor, idleTimeout);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      document.removeEventListener("mousemove", resetTimer);
      document.removeEventListener("mousedown", resetTimer);
      document.removeEventListener("scroll", resetTimer);
      document.body.classList.remove("cursor-idle");
      if (styleRef.current) {
        document.head.removeChild(styleRef.current);
        styleRef.current = null;
      }
    };
  }, [enabled, idleTimeout, fadeDuration]);
}
