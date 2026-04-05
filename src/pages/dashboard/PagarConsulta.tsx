import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { loadStripe } from "@stripe/stripe-js";
import {
  EmbeddedCheckoutProvider,
  EmbeddedCheckout,
} from "@stripe/react-stripe-js";
import { ArrowLeft, Loader2, Shield, CreditCard, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export default function PagarConsulta() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stripePromise, setStripePromise] = useState<ReturnType<typeof loadStripe> | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<{
    amount: number;
    description: string;
  } | null>(null);

  const tipoServico = searchParams.get("tipo") || "";
  const dataHora = searchParams.get("data_hora") || "";
  const resumoExecutivo = searchParams.get("resumo") || "";

  useEffect(() => {
    if (!user || !tipoServico) {
      setError("Dados de pagamento inválidos.");
      setLoading(false);
      return;
    }
    initCheckout();
  }, [user, tipoServico]);

  const initCheckout = async () => {
    try {
      setLoading(true);
      const { data, error: fnError } = await supabase.functions.invoke("stripe-api", {
        body: {
          action: "checkout",
          tipo_servico: tipoServico,
          data_hora: dataHora || null,
          resumo_executivo: resumoExecutivo || null,
          embedded: true,
        },
      });

      if (fnError) throw fnError;
      if (!data?.clientSecret || !data?.publishableKey) {
        throw new Error("Falha ao iniciar checkout. Verifique a configuração do Stripe.");
      }

      setStripePromise(loadStripe(data.publishableKey));
      setClientSecret(data.clientSecret);
      setPaymentInfo({
        amount: data.amount,
        description: data.description,
      });
    } catch (err: any) {
      setError(err.message || "Erro ao iniciar pagamento.");
    } finally {
      setLoading(false);
    }
  };

  const onComplete = useCallback(() => {
    // Stripe will redirect to return_url automatically
  }, []);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto flex flex-col items-center justify-center py-20 animate-fade-in">
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
        <p className="text-sm text-muted-foreground">Preparando pagamento seguro...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 animate-fade-in space-y-4">
        <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/consultas")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-serif text-foreground flex items-center gap-3">
            <CreditCard className="h-5 w-5 text-primary" />
            Pagamento Seguro
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Pague diretamente na plataforma com total segurança.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => navigate("/dashboard/consultas")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>

      {/* Payment Info Summary */}
      {paymentInfo && (
        <Card className="p-4 border-primary/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-foreground">{paymentInfo.description}</p>
              <p className="text-xs text-muted-foreground">
                [Nome do Advogado] — [OAB]
              </p>
            </div>
            <p className="text-xl font-serif text-primary">
              R$ {paymentInfo.amount.toFixed(2).replace(".", ",")}
            </p>
          </div>
        </Card>
      )}

      {/* Embedded Stripe Checkout */}
      {stripePromise && clientSecret && (
        <Card className="overflow-hidden border-border">
          <EmbeddedCheckoutProvider
            stripe={stripePromise}
            options={{ clientSecret, onComplete }}
          >
            <EmbeddedCheckout className="min-h-[400px]" />
          </EmbeddedCheckoutProvider>
        </Card>
      )}

      {/* Security Badge */}
      <div className="flex items-center justify-center gap-2 text-muted-foreground/60">
        <Shield className="h-3.5 w-3.5" />
        <p className="text-[9px]">
          Pagamento protegido por criptografia PCI-DSS via Stripe. Seus dados estão seguros.
        </p>
      </div>
    </div>
  );
}
