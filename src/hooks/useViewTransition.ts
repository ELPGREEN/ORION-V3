import { flushSync } from "react-dom";
import { useCallback } from "react";

type DocumentWithVT = Document & {
  startViewTransition?: (cb: () => void) => { finished: Promise<void> };
};

/**
 * Wraps the experimental View Transitions API with a graceful fallback
 * for browsers that do not support it.
 *
 *   const withTransition = useViewTransition();
 *   withTransition(() => setTab('next'));
 */
export function useViewTransition() {
  return useCallback((update: () => void) => {
    const doc = document as DocumentWithVT;
    if (typeof doc.startViewTransition !== "function") {
      update();
      return;
    }
    doc.startViewTransition(() => {
      // flushSync ensures React commits synchronously inside the snapshot
      flushSync(update);
    });
  }, []);
}
