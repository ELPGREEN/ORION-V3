/**
 * useFirebaseNotifications — Hook for FCM push notifications
 * Auto-requests permission and listens for foreground messages.
 */
import { useEffect, useState, useCallback } from "react";
import { isFCMSupported, requestNotificationPermission, onForegroundMessage } from "@/lib/firebase-messaging";
import { toast } from "sonner";

export function useFirebaseNotifications() {
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  const requestPermission = useCallback(async () => {
    if (!isFCMSupported()) return;
    const token = await requestNotificationPermission();
    if (token) {
      setFcmToken(token);
      setPermissionGranted(true);
    }
  }, []);

  useEffect(() => {
    if (!isFCMSupported()) return;

    // Listen for foreground messages
    const unsubscribe = onForegroundMessage((payload) => {
      const { title, body } = payload.notification || {};
      if (title || body) {
        toast.info(title || "Notificação", {
          description: body,
        });
      }
    });

    return unsubscribe;
  }, []);

  return { fcmToken, permissionGranted, requestPermission, isSupported: isFCMSupported() };
}
