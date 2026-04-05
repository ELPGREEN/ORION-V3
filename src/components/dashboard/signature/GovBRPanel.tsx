import { useState } from "react";
import { CheckCircle, ExternalLink, Loader2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface GovBRPanelProps {
  onAuthComplete: (token: string) => void;
}

export function GovBRPanel({ onAuthComplete }: GovBRPanelProps) {
  const [authenticating, setAuthenticating] = useState(false);
  const [authenticated, setAuthenticated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGovBRAuth = async () => {
    setAuthenticating(true);
    setError(null);

    try {
      // GOV.BR OAuth 2.0 flow
      // In production, this would redirect to GOV.BR login page
      // and receive a callback with the authorization code
      
      const GOVBR_CLIENT_ID = "your-client-id"; // Would be configured in env
      const GOVBR_REDIRECT_URI = `${window.location.origin}/auth/govbr/callback`;
      const GOVBR_SCOPE = "openid email phone profile govbr_confiabilidades";
      
      // Staging environment URL for GOV.BR
      const authUrl = new URL("https://sso.staging.acesso.gov.br/authorize");
      authUrl.searchParams.set("response_type", "code");
      authUrl.searchParams.set("client_id", GOVBR_CLIENT_ID);
      authUrl.searchParams.set("scope", GOVBR_SCOPE);
      authUrl.searchParams.set("redirect_uri", GOVBR_REDIRECT_URI);
      authUrl.searchParams.set("state", crypto.randomUUID());
      authUrl.searchParams.set("nonce", crypto.randomUUID());

      // For demo purposes, simulate the flow
      // In production, you would open a popup or redirect
      await new Promise((r) => setTimeout(r, 2000));
      
      // Simulated successful authentication
      setAuthenticated(true);
      onAuthComplete("govbr-demo-token");
      
    } catch (err: any) {
      setError(err.message || "Erro ao autenticar com GOV.BR");
    } finally {
      setAuthenticating(false);
    }
  };

  return (
    <div className="space-y-4 bg-secondary/30 border border-border p-4">
      <div className="flex items-center gap-2 text-xs font-medium text-foreground">
        <CheckCircle className="h-4 w-4 text-primary" />
        <span>Assinatura via GOV.BR</span>
      </div>

      <div className="flex items-start gap-2 p-3 bg-card border border-border">
        <AlertCircle className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
        <div className="text-[10px] text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Como funciona:</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>Autentique-se com sua conta GOV.BR</li>
            <li>Nível de confiabilidade mínimo: Prata</li>
            <li>Assinatura gratuita e com validade jurídica</li>
            <li>Compatível com documentos públicos e privados</li>
          </ul>
        </div>
      </div>

      {/* Reliability Levels */}
      <div className="grid grid-cols-3 gap-1 text-center">
        <div className="p-2 bg-muted border border-border">
          <p className="text-[9px] text-muted-foreground">Bronze</p>
          <p className="text-[10px] text-foreground">Básico</p>
        </div>
        <div className="p-2 bg-primary/10 border border-primary/30">
          <p className="text-[9px] text-primary">Prata</p>
          <p className="text-[10px] text-foreground">Recomendado</p>
        </div>
        <div className="p-2 bg-muted border border-border">
          <p className="text-[9px] text-muted-foreground">Ouro</p>
          <p className="text-[10px] text-foreground">Biometria</p>
        </div>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="w-full text-xs"
        onClick={handleGovBRAuth}
        disabled={authenticating || authenticated}
      >
        {authenticating ? (
          <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
        ) : authenticated ? (
          <CheckCircle className="h-3.5 w-3.5 mr-2 text-emerald-500" />
        ) : (
          <ExternalLink className="h-3.5 w-3.5 mr-2" />
        )}
        {authenticating
          ? "Conectando..."
          : authenticated
          ? "Autenticado com GOV.BR"
          : "Entrar com GOV.BR"}
      </Button>

      {error && (
        <p className="text-[10px] text-destructive">{error}</p>
      )}

      {authenticated && (
        <div className="flex items-center gap-2 text-xs text-emerald-500">
          <CheckCircle className="h-3.5 w-3.5" />
          Pronto para assinar documentos
        </div>
      )}

      <p className="text-[9px] text-muted-foreground/60">
        Assinatura avançada conforme Lei 14.063/2020 e Decreto 10.543/2020.
      </p>
    </div>
  );
}
