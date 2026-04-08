/**
 * AnalyticsProvider — Invisible component that enables analytics tracking
 */
import { useAnalyticsTracker } from "@/hooks/useAnalyticsTracker";

export function AnalyticsProvider() {
  useAnalyticsTracker();
  return null;
}
