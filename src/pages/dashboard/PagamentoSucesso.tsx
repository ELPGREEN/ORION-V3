import { useState, useEffect } from "react";
import { CheckCircle, Loader2, Download, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
// [REMOVED] import { useNeuralFeedback } from "@/hooks/useNeuralFeedback";
import { useAuth } from "@/contexts/AuthContext";
interface PaymentDetails {
  status: string;
  amount: number;
  currency: string;
  customer_email: string;
  tipo_servico: string;
  data_hora: string;
}

const tipoLabels: Record<string, string> = {
  consulta_inicial: "Consulta Inicial",
  consulta_retorno: "Consulta de Retorno",
  parecer_juridico: "Parecer Jurídico",
};

export default function PagamentoSucesso() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [details, setDetails] = useState<PaymentDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sessionId = searchParams.get("session_id");
    if (!sessionId) {
      setError("Sessão de pagamento não encontrada.");
      setLoading(false);
      return;
    }

    const verifyPayment = async () => {
      try {
        const { data, error: fnError } = await supabase.functions.invoke("stripe-api", {
          body: { action: "verify_payment", session_id: sessionId },
        });

        if (fnError) throw fnError;
        if (data?.status === "paid") {
          setDetails(data);
          // 🧠 Neural: pagamento confirmado = sinal de conversão de alta qualidade
        } else {
          setError("Pagamento ainda não confirmado. Tente novamente em instantes.");
        }
      } catch (err: any) {
        setError(err.message || "Erro ao verificar pagamento.");
      } finally {
        setLoading(false);
      }
    };

    verifyPayment();
  }, [searchParams]);

  if (loading) {
    return (
      <div className="max-w-lg mx-auto flex flex-col items-center justify-center py-20 animate-fade-in">
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
        <p className="text-sm text-muted-foreground">Verificando pagamento...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-lg mx-auto text-center py-20 animate-fade-in space-y-4">
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/consultas")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-6 animate-fade-in">
      <div className="text-center space-y-3">
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <CheckCircle className="h-8 w-8 text-primary" />
        </div>
        <h1 className="text-xl font-serif text-foreground">Pagamento Confirmado!</h1>
        <p className="text-xs text-muted-foreground">
          Sua consulta foi agendada com sucesso. A equipe ORION entrará em contato.
        </p>
      </div>

      {details && (
        <div className="bg-card border border-border p-5 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Serviço:</span>
            <span className="text-foreground">
              {tipoLabels[details.tipo_servico] || details.tipo_servico}
            </span>
          </div>
          {details.data_hora && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Data/Hora:</span>
              <span className="text-foreground">
                {new Date(details.data_hora).toLocaleString("pt-BR")}
              </span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">E-mail:</span>
            <span className="text-foreground">{details.customer_email}</span>
          </div>
          <div className="border-t border-border pt-3 flex justify-between">
            <span className="text-sm font-medium text-foreground">Total pago:</span>
            <span className="text-lg font-serif text-primary">
              R$ {details.amount.toFixed(2).replace(".", ",")}
            </span>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-xs text-muted-foreground"
          onClick={() => navigate("/dashboard")}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Voltar ao Painel
        </Button>
      </div>

      <p className="text-[9px] text-muted-foreground/60 text-center">
        Recibo disponível na seção Pagamentos. Valores conforme tabela vigente.
      </p>
    </div>
  );
}
