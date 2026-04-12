/**
 * useAnalyticsTracker — Auto-track page views and user identity
 */
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
// [REMOVED] import { OrionAnalytics, setAnalyticsUser, setAnalyticsUserProperties } from "@/lib/firebase-analytics-events";
import { supabase } from "@/integrations/supabase/client";

export function useAnalyticsTracker() {
  const location = useLocation();

  // Track page views on route change
  useEffect(() => {
    // OrionAnalytics.pageView(location.pathname);
  }, [location.pathname]);

  // Set user identity when authenticated
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        // setAnalyticsUser(session.user.id);
        // setAnalyticsUserProperties({
          email_domain: session.user.email?.split("@")[1] || "unknown",
          auth_provider: session.user.app_metadata?.provider || "email",
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);
}
