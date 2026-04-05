import { useEffect, useRef } from "react";

/**
 * Reloads data when the browser tab regains focus.
 * Prevents stale data after switching tabs.
 * Includes a 2-second throttle to avoid rapid refetches.
 */
export function useRefreshOnFocus(callback: () => void) {
  const lastRefresh = useRef(Date.now());

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && Date.now() - lastRefresh.current > 2000) {
        lastRefresh.current = Date.now();
        callback();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [callback]);
}
