import { useState, useEffect } from "react";
import { Scale, CheckCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Advogado {
  user_id: string;
  nome: string;
  escritorio: string | null;
  oab: string | null;
}

interface LawyerSelectionCardProps {
  clientProfileId: string;
  onLinked: () => void;
}

export function LawyerSelectionCard({ clientProfileId, onLinked }: LawyerSelectionCardProps) {
  const [advogados, setAdvogados] = useState<Advogado[]>([]);
  const [loading, setLoading] = useState(true);
  const [linking, setLinking] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    loadAdvogados();
  }, []);

  const loadAdvogados = async () => {
    const { data } = await supabase
      .from("available_advogados" as any)
      .select("*");
    setAdvogados((data as any[]) || []);
    setLoading(false);
  };

  const handleSelect = async (advogadoId: string) => {
    setLinking(advogadoId);
    try {
      const { error } = await supabase
        .from("client_profiles")
        .update({ advogado_id: advogadoId } as any)
        .eq("id", clientProfileId);

      if (error) throw error;

      toast({
        title: "Advogado selecionado!",
        description: "Você foi vinculado ao advogado escolhido.",
      });
      onLinked();
    } catch (err: any) {
      toast({
        title: "Erro",
        description: "Não foi possível vincular ao advogado.",
        variant: "destructive",
      });
    } finally {
      setLinking(null);
    }
  };

  if (loading) {
    return (
      <Card className="border-primary/20 bg-primary/5">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (!advogados.length) return null;

  return (
    <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-serif flex items-center gap-2">
          <Scale className="h-4 w-4 text-primary" />
          Escolha seu Advogado
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Selecione um advogado para acompanhar seu caso.
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {advogados.map((adv) => (
          <div
            key={adv.user_id}
            className="flex items-center justify-between p-3 rounded-lg border border-border bg-card hover:border-primary/40 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {adv.nome}
              </p>
              {adv.oab && (
                <Badge variant="outline" className="text-[10px] mt-1">
                  {adv.oab}
                </Badge>
              )}
            </div>
            <Button
              size="sm"
              className="btn-gold text-[10px] h-7 ml-3"
              onClick={() => handleSelect(adv.user_id)}
              disabled={linking === adv.user_id}
            >
              {linking === adv.user_id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Escolher
                </>
              )}
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
