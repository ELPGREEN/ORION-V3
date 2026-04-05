/**
 * ─── Amazon Appstore SDK Panel ───
 * Settings panel showing DRM status, IAP products, and unified Amazon Sign-In.
 * On Fire OS/Android: uses native SSI.
 * On Web: uses OAuth/LWA flow via useAmazonIntegration.
 */

import { useEffect, useState } from "react";
import { GlassCard } from "@/components/ui/TechElements";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAppstoreSDK } from "@/hooks/useAppstoreSDK";
import { useAmazonIntegration } from "@/hooks/useAmazonIntegration";
import {
  Shield, ShoppingCart, LogIn, LogOut, RefreshCw, Check, X, AlertTriangle, Loader2,
  Smartphone, Package, CreditCard, Globe,
} from "lucide-react";

export function AppstoreSDKPanel() {
  const {
    state, products, loading, purchasing,
    loadProducts, handlePurchase, recheckLicense,
    handleSignIn: nativeSignIn, handleSignOut: nativeSignOut, restorePurchases,
  } = useAppstoreSDK();

  const {
    status: oauthStatus, loading: oauthLoading, connect: oauthConnect,
    disconnect: oauthDisconnect, connecting: oauthConnecting,
  } = useAmazonIntegration();

  const [productsLoaded, setProductsLoaded] = useState(false);

  const isNative = state?.available === true && state.platform !== "web";
  const isSignedIn = isNative ? state?.ssi.signedIn : oauthStatus.connected;
  const userName = isNative
    ? (state?.ssi.displayName || state?.ssi.email)
    : (oauthStatus.profile?.name || oauthStatus.profile?.email);

  // Load products once state is available
  useEffect(() => {
    if (state && !productsLoaded) {
      loadProducts().then(() => setProductsLoaded(true));
    }
  }, [state, productsLoaded, loadProducts]);

  if (loading) {
    return (
      <GlassCard className="p-6 flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground">Verificando Amazon Appstore SDK...</span>
      </GlassCard>
    );
  }

  if (!state) return null;

  const drmIcon = {
    LICENSED: <Check className="h-4 w-4 text-green-400" />,
    NOT_LICENSED: <X className="h-4 w-4 text-red-400" />,
    EXPIRED: <AlertTriangle className="h-4 w-4 text-yellow-400" />,
    UNKNOWN: <AlertTriangle className="h-4 w-4 text-muted-foreground" />,
    ERROR: <X className="h-4 w-4 text-red-400" />,
  };

  const drmLabel = {
    LICENSED: "Licenciado",
    NOT_LICENSED: "Não licenciado",
    EXPIRED: "Expirado",
    UNKNOWN: "Desconhecido",
    ERROR: "Erro",
  };

  const platformLabel = {
    fire_os: "Fire OS",
    android: "Android",
    web: "Web (OAuth/LWA)",
  };

  const handleUnifiedSignIn = () => {
    if (isNative) {
      nativeSignIn();
    } else {
      oauthConnect();
    }
  };

  const handleUnifiedSignOut = () => {
    if (isNative) {
      nativeSignOut();
    } else {
      oauthDisconnect();
    }
  };

  const signingIn = isNative ? false : (oauthConnecting || oauthLoading);

  return (
    <div className="space-y-4">
      {/* Header */}
      <GlassCard className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <h3 className="font-serif text-foreground">Amazon Appstore SDK</h3>
          </div>
          <Badge variant={state.available ? "default" : "secondary"} className="text-[10px]">
            {platformLabel[state.platform]}
          </Badge>
        </div>
        {!state.available && (
          <p className="text-xs text-muted-foreground">
            SDK nativo disponível apenas em dispositivos Android/Fire OS.
            Usando Login with Amazon (OAuth) para autenticação web.
          </p>
        )}
      </GlassCard>

      {/* DRM */}
      <GlassCard className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">DRM — Licença</span>
          </div>
          <div className="flex items-center gap-2">
            {drmIcon[state.drm.status]}
            <span className="text-xs text-muted-foreground">{drmLabel[state.drm.status]}</span>
          </div>
        </div>
        {state.drm.userId && (
          <p className="text-[10px] text-muted-foreground font-mono">
            User: {state.drm.userId} · Market: {state.drm.marketplace}
          </p>
        )}
        <Button size="sm" variant="outline" className="w-full text-xs" onClick={recheckLicense}>
          <RefreshCw className="mr-2 h-3 w-3" />
          Verificar Licença
        </Button>
      </GlassCard>

      {/* Unified Amazon Sign-In */}
      <GlassCard className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <LogIn className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Amazon Sign-In</span>
          </div>
          <div className="flex items-center gap-1.5">
            {isNative ? (
              <Smartphone className="h-3 w-3 text-muted-foreground" />
            ) : (
              <Globe className="h-3 w-3 text-muted-foreground" />
            )}
            <Badge variant={isSignedIn ? "default" : "outline"} className="text-[10px]">
              {isSignedIn ? "Conectado" : "Desconectado"}
            </Badge>
          </div>
        </div>

        <p className="text-[10px] text-muted-foreground">
          {isNative
            ? "Usando SSI nativo do Amazon Appstore."
            : "Usando Login with Amazon (OAuth/LWA) via navegador."}
        </p>

        {isSignedIn && userName && (
          <div className="text-[10px] text-muted-foreground space-y-0.5 p-2 rounded bg-muted/30 border border-border/20">
            <p className="font-medium text-foreground">{userName}</p>
            {!isNative && oauthStatus.profile?.email && (
              <p>{oauthStatus.profile.email}</p>
            )}
            {isNative && state.ssi.email && (
              <p>{state.ssi.email}</p>
            )}
          </div>
        )}

        <Button
          size="sm"
          variant={isSignedIn ? "outline" : "default"}
          className={`w-full text-xs ${!isSignedIn ? "bg-[#FF9900] hover:bg-[#E88B00] text-black" : ""}`}
          onClick={isSignedIn ? handleUnifiedSignOut : handleUnifiedSignIn}
          disabled={signingIn}
        >
          {signingIn ? (
            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
          ) : isSignedIn ? (
            <LogOut className="mr-2 h-3 w-3" />
          ) : (
            <LogIn className="mr-2 h-3 w-3" />
          )}
          {signingIn
            ? "Conectando..."
            : isSignedIn
              ? "Desconectar Amazon"
              : "Conectar com Amazon"}
        </Button>
      </GlassCard>

      {/* IAP Products */}
      <GlassCard className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">IAP — Compras In-App</span>
          </div>
          <span className="text-[10px] text-muted-foreground">
            {state.purchasedSkus.length} itens adquiridos
          </span>
        </div>

        <div className="space-y-2">
          {products.map((product) => {
            const owned = state.purchasedSkus.includes(product.sku);
            return (
              <div key={product.sku} className="flex items-center justify-between p-3 rounded bg-muted/30 border border-border/20">
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-medium text-foreground truncate">{product.title}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{product.description}</div>
                  <div className="text-[10px] font-mono text-primary/70 mt-0.5">{product.price}</div>
                </div>
                {owned ? (
                  <Badge variant="default" className="text-[9px] ml-2 shrink-0">
                    <Check className="mr-1 h-2.5 w-2.5" />
                    Adquirido
                  </Badge>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-[10px] h-7 px-2 ml-2 shrink-0"
                    disabled={purchasing}
                    onClick={() => handlePurchase(product.sku)}
                  >
                    <CreditCard className="mr-1 h-3 w-3" />
                    Comprar
                  </Button>
                )}
              </div>
            );
          })}
        </div>

        <Button size="sm" variant="outline" className="w-full text-xs" onClick={restorePurchases}>
          <RefreshCw className="mr-2 h-3 w-3" />
          Restaurar Compras
        </Button>
      </GlassCard>
    </div>
  );
}
