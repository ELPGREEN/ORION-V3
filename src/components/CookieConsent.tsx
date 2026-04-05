import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Cookie, X } from "lucide-react";

const COOKIE_KEY = "cookie_consent_accepted";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 2; // 2 years

function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

function isConsentStored(): boolean {
  return !!(localStorage.getItem(COOKIE_KEY) || getCookie(COOKIE_KEY));
}

function storeConsent(value: string) {
  localStorage.setItem(COOKIE_KEY, value);
  setCookie(COOKIE_KEY, value);
}

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isConsentStored()) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    storeConsent("true");
    setVisible(false);
  };

  const dismiss = () => {
    storeConsent("dismissed");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] p-4 animate-in slide-in-from-bottom-4 duration-500">
      <div className="max-w-4xl mx-auto bg-card/95 backdrop-blur-xl border border-border rounded-xl p-4 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <Cookie className="h-5 w-5 text-primary shrink-0 mt-0.5 sm:mt-0" />
        <p className="text-sm text-muted-foreground flex-1">
          Este site utiliza cookies e armazenamento local para garantir o funcionamento correto,
          salvar suas preferências e melhorar sua experiência. Ao continuar navegando, você concorda
          com nossa{" "}
          <a href="/privacidade" className="text-primary hover:underline font-medium">
            Política de Privacidade
          </a>
          .
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <Button size="sm" onClick={accept} className="h-8 text-xs font-semibold px-4">
            Aceitar
          </Button>
          <Button size="sm" variant="ghost" onClick={dismiss} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
