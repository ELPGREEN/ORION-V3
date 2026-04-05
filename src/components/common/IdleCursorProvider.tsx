import { useIdleCursor } from "@/hooks/useIdleCursor";

/**
 * Wraps the app to auto-hide the cursor after 2s of inactivity.
 * Cursor reappears smoothly on any mouse movement.
 */
export function IdleCursorProvider({ children }: { children: React.ReactNode }) {
  useIdleCursor({ idleTimeout: 2000, fadeDuration: "0.3s" });
  return <>{children}</>;
}
