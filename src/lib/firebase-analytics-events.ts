/**
 * Firebase Analytics — Event tracking for Orion
 * Wraps Firebase Analytics with typed events and auto-tracking.
 */
// [REMOVED] import { getAnalytics, logEvent, setUserId, setUserProperties, isSupported } from "firebase/analytics";
import { firebaseApp } from "@/lib/firebase";

let analyticsInstance: ReturnType<typeof getAnalytics> | null = null;
let analyticsReady = false;

async function getAnalyticsInstance() {
  if (analyticsInstance) return analyticsInstance;
  const supported = await isSupported();
  if (!supported) return null;
  analyticsInstance = getAnalytics(firebaseApp);
  analyticsReady = true;
  return analyticsInstance;
}

// Initialize on import
getAnalyticsInstance().catch(() => {});

/**
 * Track a custom event
 */
export async function trackEvent(eventName: string, params?: Record<string, any>) {
  const analytics = await getAnalyticsInstance();
  if (!analytics) return;
  logEvent(analytics, eventName, params);
}

/**
 * Set user ID for analytics
 */
export async function setAnalyticsUser(userId: string) {
  const analytics = await getAnalyticsInstance();
  if (!analytics) return;
  setUserId(analytics, userId);
}

/**
 * Set user properties
 */
export async function setAnalyticsUserProperties(properties: Record<string, string>) {
  const analytics = await getAnalyticsInstance();
  if (!analytics) return;
  setUserProperties(analytics, properties);
}

// ─── Pre-defined Orion Events ───

export const OrionAnalytics = {
  // Auth events
  login: (method: string) => trackEvent("login", { method }),
  signUp: (method: string) => trackEvent("sign_up", { method }),
  
  // Feature usage
  documentCreated: (type: string) => trackEvent("document_created", { document_type: type }),
  documentAnalyzed: () => trackEvent("document_analyzed"),
  aiChatMessage: (provider: string) => trackEvent("ai_chat_message", { provider }),
  voiceCommand: () => trackEvent("voice_command_used"),
  ocrUsed: () => trackEvent("ocr_used"),
  
  // TTS events
  ttsPlayed: (engine: string) => trackEvent("tts_played", { engine }),
  
  // Search events
  legalSearch: (source: string) => trackEvent("legal_search", { source }),
  
  // Neural events
  neuralTrainingStarted: () => trackEvent("neural_training_started"),
  faceAuthAttempt: (success: boolean) => trackEvent("face_auth_attempt", { success: String(success) }),
  visionDetection: (type: string) => trackEvent("vision_detection", { detection_type: type }),
  
  // Commerce events
  productViewed: (productId: string) => trackEvent("view_item", { item_id: productId }),
  checkoutStarted: (value: number) => trackEvent("begin_checkout", { value }),
  purchaseCompleted: (value: number, transactionId: string) => 
    trackEvent("purchase", { value, transaction_id: transactionId }),
  
  // Page views
  pageView: (pageName: string) => trackEvent("page_view", { page_title: pageName }),
  
  // Errors
  errorOccurred: (errorType: string, message: string) => 
    trackEvent("app_error", { error_type: errorType, error_message: message.slice(0, 100) }),
};
