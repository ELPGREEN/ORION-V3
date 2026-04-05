import { useState, useEffect, useCallback } from "react";

let globalDeferredPrompt: any = null;
const listeners = new Set<() => void>();

function notifyListeners() {
  listeners.forEach(fn => fn());
}

// Global listener — only one per app
if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e: Event) => {
    e.preventDefault();
    globalDeferredPrompt = e;
    notifyListeners();
  });

  window.addEventListener("appinstalled", () => {
    globalDeferredPrompt = null;
    notifyListeners();
  });
}

export function useInstallPrompt() {
  const [, forceUpdate] = useState(0);

  const isIOS = typeof navigator !== "undefined" && /iPad|iPhone|iPod/.test(navigator.userAgent);

  const isInstalled =
    typeof window !== "undefined" &&
    (window.matchMedia("(display-mode: standalone)").matches ||
     (window.navigator as any).standalone === true);

  const canInstall = !isInstalled && !!globalDeferredPrompt;

  useEffect(() => {
    const update = () => forceUpdate(n => n + 1);
    listeners.add(update);
    return () => { listeners.delete(update); };
  }, []);

  const triggerInstall = useCallback(async (): Promise<boolean> => {
    if (!globalDeferredPrompt) return false;
    globalDeferredPrompt.prompt();
    const { outcome } = await globalDeferredPrompt.userChoice;
    if (outcome === "accepted") {
      globalDeferredPrompt = null;
      notifyListeners();
      return true;
    }
    return false;
  }, []);

  return { canInstall, isInstalled, isIOS, triggerInstall };
}
