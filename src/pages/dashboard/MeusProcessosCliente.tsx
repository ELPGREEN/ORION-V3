import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { FileText, Clock, Loader2, Scale, AlertCircle } from "lucide-react";

interface Processo {
  id: string;
  numero_processo: string | null;
  tipo: string | null;
  status: string | null;
  ultima_movimentacao: string | null;
  created_at: string;
}

interface Andamento {
  id: string;
  tipo: string;
  descricao: string;
  data_ocorrencia: string;
}

const statusColors: Record<string, string> = {
  ativo: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  em_andamento: "bg-primary/15 text-primary border-primary/30",
  arquivado: "bg-muted text-muted-foreground border-border",
  encerrado: "bg-muted text-muted-foreground border-border",
  suspenso: "bg-warning/15 text-warning border-warning/30",
};

export default function MeusProcessosCliente() {
  const { user } = useAuth();
  const [processos, setProcessos] = useState<Processo[]>([]);
  const [andamentos, setAndamentos] = useState<Record<string, Andamento[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const load = async () => {
      // Get client profile
      const { data: profile } = await supabase
        .from("client_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!profile) {
        setLoading(false);
        return;
      }

      // Get processos
      const { data: procs } = await supabase
        .from("processos")
        .select("id, numero_processo, tipo, status, ultima_movimentacao, created_at")
        .eq("client_profile_id", profile.id)
        .order("created_at", { ascending: false });

      setProcessos(procs || []);

      // Get andamentos
      if (procs && procs.length > 0) {
        const ids = procs.map((p) => p.id);
        const { data: ands } = await supabase
          .from("andamentos")
          .select("id, tipo, descricao, data_ocorrencia, processo_id")
          .in("processo_id", ids)
          .order("data_ocorrencia", { ascending: false })
          .limit(100);

        if (ands) {
          const grouped: Record<string, Andamento[]> = {};
          ands.forEach((a: any) => {
            if (!grouped[a.processo_id]) grouped[a.processo_id] = [];
            grouped[a.processo_id].push(a);
          });
          setAndamentos(grouped);
        }
      }

      setLoading(false);
    };

    load();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-serif text-foreground">Meus Processos</h1>
        <p className="text-sm text-muted-foreground">Acompanhe o andamento dos seus processos jurídicos.</p>
      </div>

      {processos.length === 0 ? (
        <div className="bg-card border border-border p-8 text-center">
          <Scale className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum processo vinculado à sua conta.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Quando seu advogado cadastrar um processo, ele aparecerá aqui.</p>
        </div>
      ) : (
        <Accordion type="single" collapsible className="space-y-3">
          {processos.map((proc) => (
            <AccordionItem key={proc.id} value={proc.id} className="bg-card border border-border px-4">
              <AccordionTrigger className="hover:no-underline py-4">
                <div className="flex items-center gap-3 text-left w-full pr-4">
                  <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {proc.numero_processo || "Processo sem número"}
                    </p>
                    <p className="text-xs text-muted-foreground">{proc.tipo || "Tipo não informado"}</p>
                  </div>
                  <Badge className={`text-[10px] ${statusColors[proc.status || ""] || statusColors.ativo}`}>
                    {proc.status || "ativo"}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pb-4">
                {proc.ultima_movimentacao && (
                  <p className="text-xs text-muted-foreground mb-3 flex items-center gap-1.5">
                    <AlertCircle className="h-3 w-3" />
                    Última movimentação: {proc.ultima_movimentacao}
                  </p>
                )}

                <h4 className="text-xs font-medium text-foreground mb-2">Andamentos Recentes</h4>
                {(andamentos[proc.id] || []).length === 0 ? (
                  <p className="text-xs text-muted-foreground/60">Nenhum andamento registrado.</p>
                ) : (
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {andamentos[proc.id].slice(0, 10).map((a) => (
                      <div key={a.id} className="flex gap-3 items-start border-l-2 border-primary/20 pl-3 py-1">
                        <Clock className="h-3.5 w-3.5 text-primary/60 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-foreground">{a.descricao}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(a.data_ocorrencia).toLocaleDateString("pt-BR")} · {a.tipo}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  );
}
