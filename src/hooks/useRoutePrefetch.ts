import { useCallback, useRef } from "react";

type Importer = () => Promise<unknown>;

/**
 * Composable that pre-warms a lazy route chunk on hover/focus/touchstart.
 * Each importer is fired at most once per session.
 *
 * Usage:
 *   const prefetch = useRoutePrefetch();
 *   <Link onMouseEnter={() => prefetch(() => import('@/pages/Plataforma'))} ... />
 */
export function useRoutePrefetch() {
  const triggered = useRef<Set<Importer>>(new Set());

  return useCallback((importer: Importer) => {
    if (triggered.current.has(importer)) return;
    triggered.current.add(importer);
    // Fire and forget; swallow errors so prefetch never breaks UI
    void importer().catch(() => {
      triggered.current.delete(importer);
    });
  }, []);
}
