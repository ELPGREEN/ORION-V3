import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { RefreshCw, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PWAUpdateNotification() {
  const [showBanner, setShowBanner] = useState(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      console.log("[PWA] Service Worker registrado:", swUrl);
      // Check for updates every 30 minutes
      if (registration) {
        const interval = setInterval(() => {
          registration.update();
        }, 30 * 60 * 1000);
        return () => clearInterval(interval);
      }
    },
    onRegisterError(error) {
      console.error("[PWA] Erro ao registrar SW:", error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      setShowBanner(true);
    }
  }, [needRefresh]);

  if (!showBanner) return null;

  const handleUpdate = () => {
    updateServiceWorker(true);
    setShowBanner(false);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-[9999] sm:left-auto sm:right-4 sm:max-w-md animate-in slide-in-from-bottom-4 duration-500">
      <div className="rounded-xl border border-cyan-500/30 bg-background/95 backdrop-blur-xl shadow-2xl shadow-cyan-500/10 p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 rounded-lg bg-cyan-500/10 p-2">
            <Sparkles className="h-5 w-5 text-cyan-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground text-sm">
              Nova atualização disponível!
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              O ORION foi atualizado com melhorias e novos recursos. Atualize agora para a versão mais recente.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <Button
                size="sm"
                onClick={handleUpdate}
                className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs h-8 gap-1.5"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Atualizar agora
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowBanner(false)}
                className="text-xs h-8 text-muted-foreground hover:text-foreground"
              >
                Depois
              </Button>
            </div>
          </div>
          <button
            onClick={() => setShowBanner(false)}
            className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
