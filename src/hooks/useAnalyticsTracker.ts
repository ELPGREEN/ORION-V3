/**
 * useAnalyticsTracker — Auto-track page views and user identity
 */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export function useAnalyticsTracker() {
  const location = useLocation();

  useEffect(() => {
    // Page view tracking placeholder
  }, [location.pathname]);
}
