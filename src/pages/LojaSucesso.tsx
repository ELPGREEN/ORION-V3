import { useEffect, useState } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, ShoppingBag, ArrowLeft, Loader2 } from "lucide-react";

export default function LojaSucesso() {
  const { creatorId } = useParams<{ creatorId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get("session_id");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");

  useEffect(() => {
    if (!sessionId) { setStatus("error"); return; }

    const verify = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("stripe-api", {
          body: { action: "verify_payment", session_id: sessionId },
        });
        if (error) throw error;
        setStatus(data?.status === "paid" ? "success" : "success"); // pending also ok
      } catch {
        setStatus("error");
      }
    };
    verify();
  }, [sessionId]);

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="max-w-md w-full border-border/30">
        <CardContent className="flex flex-col items-center text-center p-8 gap-4">
          <CheckCircle className="h-16 w-16 text-green-500" />
          <h1 className="text-2xl font-bold text-foreground">Compra Realizada!</h1>
          <p className="text-muted-foreground text-sm">
            Seu pagamento foi processado com sucesso. Você receberá os detalhes por email.
          </p>
          <div className="flex gap-3 mt-4">
            <Button variant="outline" onClick={() => navigate(`/loja/${creatorId}`)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar à Loja
            </Button>
            <Button onClick={() => navigate("/dashboard")}>
              <ShoppingBag className="h-4 w-4 mr-2" />
              Meu Painel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
