/**
 * Firebase Cloud Messaging — Push Notifications for Orion
 * Handles foreground/background notifications with VAPID key.
 */
import { getMessaging, getToken, onMessage, type MessagePayload } from "firebase/messaging";
import { firebaseApp } from "@/lib/firebase";
import { supabase } from "@/integrations/supabase/client";

let messagingInstance: ReturnType<typeof getMessaging> | null = null;

function getMessagingInstance() {
  if (!messagingInstance) {
    messagingInstance = getMessaging(firebaseApp);
  }
  return messagingInstance;
}

/**
 * Request notification permission and get FCM token
 */
export async function requestNotificationPermission(): Promise<string | null> {
  try {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.log("[FCM] Notification permission denied");
      return null;
    }

    const messaging = getMessagingInstance();
    
    // Register service worker
    const registration = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
    
    const token = await getToken(messaging, {
      vapidKey: import.meta.env.VITE_VAPID_PUBLIC_KEY || "",
      serviceWorkerRegistration: registration,
    });

    if (token) {
      console.log("[FCM] Token obtained:", token.slice(0, 20) + "...");
      
      // Save token to user's profile metadata
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("profiles").update({
          fcm_token: token,
        } as any).eq("user_id", user.id);
      }
      
      return token;
    }
    
    return null;
  } catch (err) {
    console.warn("[FCM] Error getting token:", err);
    return null;
  }
}

/**
 * Listen for foreground messages
 */
export function onForegroundMessage(callback: (payload: MessagePayload) => void): () => void {
  try {
    const messaging = getMessagingInstance();
    return onMessage(messaging, (payload) => {
      console.log("[FCM] Foreground message:", payload);
      callback(payload);
    });
  } catch {
    return () => {};
  }
}

/**
 * Check if FCM is supported in this browser
 */
export function isFCMSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}
