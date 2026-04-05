import { Calendar } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Consulta {
  id: string;
  tipo: string;
  status: string;
  payment_status: string | null;
  data_hora: string | null;
  valor: number | null;
  created_at: string;
}

const tipoLabels: Record<string, string> = {
  consulta_inicial: "Consulta Inicial",
  consulta_retorno: "Consulta de Retorno",
  parecer_juridico: "Parecer Jurídico",
  inicial: "Consulta Inicial",
  retorno: "Consulta de Retorno",
  parecer: "Parecer Jurídico",
};

const statusColors: Record<string, string> = {
  confirmada: "text-green-500",
  pendente: "text-yellow-500",
  cancelada: "text-destructive",
};

export default function ConsultasAdvogado() {
  const [consultas, setConsultas] = useState<Consulta[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadConsultas();
  }, []);

  const loadConsultas = async () => {
    const { data } = await supabase
      .from("consultas")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) setConsultas(data);
    setLoading(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl md:text-2xl font-serif text-foreground flex items-center gap-3">
          <Calendar className="h-6 w-6 text-primary" />
          Consultas Agendadas
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Visualize consultas pagas e agendamentos pendentes.
        </p>
      </div>

      {loading ? (
        <div className="bg-card border border-border p-12 flex items-center justify-center">
          <p className="text-sm text-muted-foreground">Carregando...</p>
        </div>
      ) : consultas.length === 0 ? (
        <div className="bg-card border border-border p-12 flex flex-col items-center justify-center text-center">
          <Calendar className="h-12 w-12 text-muted-foreground/20 mb-4" />
          <p className="text-sm text-muted-foreground mb-1">Nenhuma consulta agendada</p>
          <p className="text-[10px] text-muted-foreground/60">
            Consultas agendadas pelos clientes aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {consultas.map((c) => (
            <div
              key={c.id}
              className="bg-card border border-border p-4 flex items-center justify-between"
            >
              <div>
                <p className="text-sm font-medium text-foreground">
                  {tipoLabels[c.tipo] || c.tipo}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {c.data_hora
                    ? new Date(c.data_hora).toLocaleString("pt-BR")
                    : "Data não definida"}{" "}
                  · {c.created_at ? new Date(c.created_at).toLocaleDateString("pt-BR") : ""}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm font-serif text-primary">
                  {c.valor ? `R$ ${Number(c.valor).toFixed(2).replace(".", ",")}` : "—"}
                </p>
                <p className={`text-[10px] capitalize ${statusColors[c.status] || "text-muted-foreground"}`}>
                  {c.payment_status === "pago" ? "✓ Pago" : c.status}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
