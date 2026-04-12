import { getAnalytics, logEvent, setUserId, setUserProperties, isSupported } from "firebase/analytics";
import { firebaseApp } from "./firebase";

let analyticsInstance: ReturnType<typeof getAnalytics> | null = null;
let supported = false;

async function getOrInitAnalytics() {
  if (analyticsInstance) return analyticsInstance;
  try {
    supported = await isSupported();
    if (supported) {
      analyticsInstance = getAnalytics(firebaseApp);
    }
  } catch { /* analytics not available */ }
  return analyticsInstance;
}

export async function trackEvent(eventName: string, params?: Record<string, any>) {
  const analytics = await getOrInitAnalytics();
  if (analytics) logEvent(analytics, eventName, params);
}

export async function setAnalyticsUser(userId: string) {
  const analytics = await getOrInitAnalytics();
  if (analytics) setUserId(analytics, userId);
}

export async function setAnalyticsUserProperties(properties: Record<string, string>) {
  const analytics = await getOrInitAnalytics();
  if (analytics) setUserProperties(analytics, properties);
}

export const OrionAnalytics = {
  trackPageView: (page: string) => trackEvent("page_view", { page_path: page }),
  trackFeatureUsed: (feature: string) => trackEvent("feature_used", { feature }),
};
