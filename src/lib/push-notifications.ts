export function isPushSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function getPushPermission(): NotificationPermission | "unsupported" {
  if (!isPushSupported()) return "unsupported";
  return Notification.permission;
}

export async function requestPushPermission(): Promise<NotificationPermission | "unsupported"> {
  if (!isPushSupported()) return "unsupported";
  if (Notification.permission === "granted") return "granted";
  if (Notification.permission === "denied") return "denied";
  try {
    return await Notification.requestPermission();
  } catch {
    return "default";
  }
}

interface PushOptions {
  tag?: string;
  vibrate?: number[];
  icon?: string;
  badge?: string;
  requireInteraction?: boolean;
}

export function sendPushNotification(
  title: string,
  body: string,
  options?: PushOptions
): boolean {
  if (!isPushSupported() || Notification.permission !== "granted") return false;

  try {
    const notifOptions: NotificationOptions & Record<string, unknown> = {
      body,
      icon: options?.icon ?? "/favicon.ico",
      badge: options?.badge,
      tag: options?.tag,
      requireInteraction: options?.requireInteraction ?? false,
    };
    if (options?.vibrate) {
      (notifOptions as any).vibrate = options.vibrate;
    }
    new Notification(title, notifOptions);
    return true;
  } catch {
    return false;
  }
}
