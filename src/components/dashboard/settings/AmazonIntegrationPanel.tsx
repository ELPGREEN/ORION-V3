import { useAmazonIntegration } from "@/hooks/useAmazonIntegration";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ShoppingCart, Music, Mic, Home, CheckCircle2, XCircle,
  Loader2, LogIn, LogOut, RefreshCw, Shield
} from "lucide-react";
import { AppstoreSDKPanel } from "@/components/amazon/AppstoreSDKPanel";

const SCOPE_LABELS: Record<string, { label: string; icon: React.ElementType; description: string }> = {
  "profile": { label: "Login com Amazon", icon: LogIn, description: "Autenticação e perfil do usuário" },
};

export default function AmazonIntegrationPanel() {
  const { status, loading, connecting, connect, disconnect, refresh } = useAmazonIntegration();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
          <ShoppingCart className="h-5 w-5 text-[#FF9900]" />
          Amazon & Alexa
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Login with Amazon e Alexa Smart Home com status real da conexão
        </p>
      </div>

      {/* Connection Status */}
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
        <div className={`h-1 w-full ${status.connected ? "bg-[#FF9900]" : "bg-muted"}`} />
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className={`p-1.5 rounded-md ${status.connected ? "bg-[#FF9900]/10" : "bg-muted"}`}>
              <ShoppingCart className={`h-4 w-4 ${status.connected ? "text-[#FF9900]" : "text-muted-foreground"}`} />
            </div>
            Conta Amazon
            <Badge
              variant={status.connected ? "default" : "secondary"}
              className={`ml-auto text-[10px] ${status.connected ? "bg-[#FF9900]/10 text-[#FF9900] border-[#FF9900]/20" : ""}`}
            >
              {status.connected ? (
                <><CheckCircle2 className="h-3 w-3 mr-1" /> Conectado</>
              ) : (
                <><XCircle className="h-3 w-3 mr-1" /> Desconectado</>
              )}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status.connected && status.profile && (
            <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
              <div className="text-sm font-medium text-foreground">{status.profile.name}</div>
              <div className="text-xs text-muted-foreground">{status.profile.email}</div>
              {status.updated_at && (
                <div className="text-[10px] text-muted-foreground/60 mt-1">
                  Conectado em {new Date(status.updated_at).toLocaleDateString("pt-BR")}
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2">
            {status.connected ? (
              <>
                <Button size="sm" variant="outline" onClick={refresh} className="gap-1.5">
                  <RefreshCw className="h-3 w-3" /> Atualizar
                </Button>
                <Button size="sm" variant="destructive" onClick={disconnect} className="gap-1.5">
                  <LogOut className="h-3 w-3" /> Desconectar
                </Button>
              </>
            ) : (
              <Button
                size="sm"
                onClick={connect}
                disabled={connecting}
                className="gap-1.5 bg-[#FF9900] hover:bg-[#E88B00] text-black"
              >
                {connecting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <LogIn className="h-3 w-3" />
                )}
                {connecting ? "Conectando..." : "Conectar com Amazon"}
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Services Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Object.entries(SCOPE_LABELS).map(([scope, { label, icon: Icon, description }]) => {
          const hasScope = status.scopes.includes(scope);
          return (
            <Card key={scope} className={`border-border/40 bg-card/50 backdrop-blur-sm transition-opacity ${!status.connected ? "opacity-50" : ""}`}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${hasScope ? "bg-[#FF9900]/10" : "bg-muted"}`}>
                    <Icon className={`h-5 w-5 ${hasScope ? "text-[#FF9900]" : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-foreground">{label}</span>
                      {hasScope && (
                        <Badge variant="outline" className="text-[9px] border-[#FF9900]/30 text-[#FF9900]">
                          Ativo
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
                  </div>
                  <div className={`w-2 h-2 rounded-full mt-1.5 ${hasScope ? "bg-[#FF9900]" : "bg-muted-foreground/20"}`} />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Appstore SDK (DRM / IAP / SSI) */}
      <div>
        <h2 className="text-lg font-semibold text-foreground flex items-center gap-2 mb-4">
          <Shield className="h-5 w-5 text-primary" />
          Appstore SDK
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          DRM (licença), IAP (compras in-app) e SSI (Simple Sign-In) para Fire OS e Amazon Appstore.
        </p>
        <AppstoreSDKPanel />
      </div>

      {/* Integration Info */}
      <Card className="border-border/40 bg-card/50 backdrop-blur-sm">
        <CardContent className="p-4">
          <div className="text-xs text-muted-foreground space-y-2">
            <p className="font-medium text-foreground text-sm">Sobre a Integração Amazon</p>
            <ul className="space-y-1 list-disc list-inside">
              <li><strong>Login with Amazon:</strong> Autenticação OAuth 2.0 com perfil do usuário</li>
              <li><strong>Amazon Music:</strong> sugestões e abertura no app oficial por link externo, não streaming nativo embutido</li>
              <li><strong>Alexa Smart Home:</strong> descoberta e controle de dispositivos compatíveis quando a conta Amazon estiver conectada</li>
              <li><strong>Appstore SDK:</strong> DRM, compras in-app e sign-in nativo para Fire OS</li>
            </ul>
            <p className="text-[10px] text-muted-foreground/60 mt-2">
              Security Profile ID: amzn1.application-oa2-client.b0c43badecf1451aabc4300e84415b21
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
