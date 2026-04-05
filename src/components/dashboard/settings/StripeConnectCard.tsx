import { useState, useEffect } from "react";
import { CreditCard, ExternalLink, CheckCircle, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ConnectStatus {
  connected: boolean;
  account_id?: string;
  onboarding_complete?: boolean;
  charges_enabled?: boolean;
  payouts_enabled?: boolean;
  display_name?: string;
  already_complete?: boolean;
}

export function StripeConnectCard() {
  const { toast } = useToast();
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    checkStatus();
  }, []);

  // Check on return from Stripe onboarding
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("stripe") === "success") {
      checkStatus();
      toast({ title: "✅ Onboarding Stripe concluído!" });
      // Clean URL
      window.history.replaceState({}, "", window.location.pathname);
    }
    if (params.get("stripe") === "refresh") {
      handleConnect();
    }
  }, []);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-api", {
        body: { action: "connect_check_status" },
      });
      if (error) throw error;
      setStatus(data);
    } catch {
      setStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-api", {
        body: { action: "connect_create_account" },
      });
      if (error) throw error;

      if (data?.already_complete) {
        toast({ title: "Sua conta Stripe já está configurada!" });
        checkStatus();
      } else if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      toast({
        title: "Erro ao conectar Stripe",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDashboard = async () => {
    setActionLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-api", {
        body: { action: "connect_dashboard_link" },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast({
        title: "Erro ao abrir dashboard",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="border-border">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-serif flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-primary" />
          Stripe Connect — Recebimento de Pagamentos
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Conecte sua conta Stripe para receber pagamentos diretamente. A plataforma retém 10% de comissão.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {!status?.connected ? (
          <>
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <p className="text-xs text-foreground font-medium">Como funciona:</p>
              <ul className="text-xs text-muted-foreground space-y-1.5">
                <li className="flex items-start gap-2">
                  <span className="text-primary">1.</span>
                  Conecte sua conta Stripe (criação rápida se não tiver)
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">2.</span>
                  Clientes pagam pela plataforma
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">3.</span>
                  Você recebe 90% automaticamente na sua conta bancária
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">4.</span>
                  10% é retido como taxa da plataforma
                </li>
              </ul>
            </div>
            <Button
              className="w-full btn-gold"
              onClick={handleConnect}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Conectar ao Stripe
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            {/* Status badges */}
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={status.charges_enabled ? "default" : "outline"}
                className={status.charges_enabled ? "bg-green-600/20 text-green-400 border-green-400/30" : ""}
              >
                {status.charges_enabled ? (
                  <CheckCircle className="h-3 w-3 mr-1" />
                ) : (
                  <AlertCircle className="h-3 w-3 mr-1" />
                )}
                {status.charges_enabled ? "Cobranças ativas" : "Cobranças pendentes"}
              </Badge>
              <Badge
                variant={status.payouts_enabled ? "default" : "outline"}
                className={status.payouts_enabled ? "bg-green-600/20 text-green-400 border-green-400/30" : ""}
              >
                {status.payouts_enabled ? "Pagamentos ativos" : "Pagamentos pendentes"}
              </Badge>
              {status.onboarding_complete && (
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                  Onboarding completo
                </Badge>
              )}
            </div>

            {/* Account info */}
            <div className="text-xs text-muted-foreground bg-muted/30 p-3 rounded-md space-y-1">
              <p><span className="font-medium text-foreground">Conta:</span> {status.display_name}</p>
              <p><span className="font-medium text-foreground">ID:</span> {status.account_id}</p>
              <p><span className="font-medium text-foreground">Comissão plataforma:</span> 10% por transação</p>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              {!status.onboarding_complete || !status.charges_enabled ? (
                <Button
                  className="flex-1 btn-gold"
                  onClick={handleConnect}
                  disabled={actionLoading}
                  size="sm"
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 mr-2" />
                      Completar Onboarding
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleDashboard}
                  disabled={actionLoading}
                  size="sm"
                >
                  {actionLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Dashboard Stripe
                    </>
                  )}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={checkStatus}
                disabled={loading}
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
