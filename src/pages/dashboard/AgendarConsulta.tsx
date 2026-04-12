import { useState, useEffect, useCallback } from "react";
import { useNeuralFeedback } from "@/hooks/useNeuralFeedback";
import { useRefreshOnFocus } from "@/hooks/useRefreshOnFocus";
import { Calendar, Clock, CreditCard, Loader2, FileText, X } from "lucide-react";
import type { PaymentMethod } from "@/components/dashboard/consultas/StepPagamento";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ConsultasAdvogado from "@/components/dashboard/consultas/ConsultasAdvogado";
import StepTipo from "@/components/dashboard/consultas/StepTipo";
import StepDataHora from "@/components/dashboard/consultas/StepDataHora";
import StepPagamento from "@/components/dashboard/consultas/StepPagamento";
import type { Currency } from "@/components/dashboard/consultas/StepPagamento";
import ReactMarkdown from "react-markdown";

export interface HonorarioOption {
  tipo_servico: string;
  descricao: string;
  valor: number;
}

const horariosDisponiveis = [
  "09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00",
];

export default function AgendarConsulta() {
  const { user } = useAuth();
  const { isAdvogado } = useUserRole();
  const { toast } = useToast();
  const { logNeural } = useNeuralFeedback();
  const [honorarios, setHonorarios] = useState<HonorarioOption[]>([]);
  const [loadingHonorarios, setLoadingHonorarios] = useState(true);
  const [selectedTipo, setSelectedTipo] = useState<string | null>(null);
  const [selectedData, setSelectedData] = useState("");
  const [selectedHora, setSelectedHora] = useState<string | null>(null);
  const [step, setStep] = useState(1);
  const [paying, setPaying] = useState(false);
  const [executiveSummary, setExecutiveSummary] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);

  const tipoSelecionado = honorarios.find((h) => h.tipo_servico === selectedTipo);

  const [myConsultas, setMyConsultas] = useState<any[]>([]);
  const [occupiedSlots, setOccupiedSlots] = useState<string[]>([]);

  useEffect(() => {
    loadHonorarios();
    loadMyConsultas();
    
    // Check for executive summary from chat
    const summary = sessionStorage.getItem("consultaSummary");
    if (summary) {
      setExecutiveSummary(summary);
      setShowSummary(true);
      sessionStorage.removeItem("consultaSummary");
    }
  }, []);

  const loadMyConsultas = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("consultas")
      .select("*")
      .eq("cliente_id", user.id)
      .order("data_hora", { ascending: true });
    setMyConsultas(data || []);
  };

  // Load occupied slots when date changes
  useEffect(() => {
    if (!selectedData) return;
    const loadOccupied = async () => {
      const dayStart = `${selectedData}T00:00:00`;
      const dayEnd = `${selectedData}T23:59:59`;
      const { data } = await supabase
        .from("consultas")
        .select("data_hora")
        .gte("data_hora", dayStart)
        .lte("data_hora", dayEnd)
        .in("status", ["confirmada", "pendente"]);
      if (data) {
        setOccupiedSlots(data.map(c => {
          const d = new Date(c.data_hora!);
          return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
        }));
      }
    };
    loadOccupied();
  }, [selectedData]);

  useRefreshOnFocus(useCallback(() => { loadHonorarios(); }, []));

  const loadHonorarios = async () => {
    setLoadingHonorarios(true);
    const { data, error } = await supabase
      .from("honorarios_config")
      .select("tipo_servico, descricao, valor")
      .eq("ativo", true)
      .in("tipo_servico", ["consulta_inicial", "consulta_retorno", "parecer_juridico"])
      .order("valor");

    if (data && data.length > 0) {
      setHonorarios(data.map((d) => ({
        tipo_servico: d.tipo_servico,
        descricao: d.descricao || d.tipo_servico,
        valor: Number(d.valor),
      })));
    } else {
      // Fallback defaults if no config exists
      setHonorarios([
        { tipo_servico: "consulta_inicial", descricao: "Consulta Inicial (até 1h)", valor: 200 },
        { tipo_servico: "consulta_retorno", descricao: "Consulta de Retorno", valor: 150 },
        { tipo_servico: "parecer_juridico", descricao: "Parecer Jurídico", valor: 500 },
      ]);
    }
    setLoadingHonorarios(false);
  };

  const handlePagar = async (method: PaymentMethod, currency: Currency = "brl") => {
    if (!tipoSelecionado || !user) return;

    setPaying(true);
    try {
      const dataHora = selectedData && selectedHora
        ? `${selectedData}T${selectedHora}:00`
        : null;

      const { data, error } = await supabase.functions.invoke("stripe-api", {
        body: {
          action: "checkout",
          tipo_servico: tipoSelecionado.tipo_servico,
          data_hora: dataHora,
          resumo_executivo: executiveSummary || null,
          payment_method: method,
          currency: currency,
        },
      });

      if (error) throw error;
      if (data?.url) {
        // 🧠 Neural: registra agendamento de consulta como sinal de alta qualidade
        logNeural({
          interaction_type: "crm_client_event",
          input_text: `Consulta agendada: ${tipoSelecionado.tipo_servico}`,
          output_text: `Data: ${dataHora || "a definir"} | Valor: R$ ${tipoSelecionado.valor}`,
          quality_score: 0.9,
          user_id: user?.id,
          metadata: {
            tipo_servico: tipoSelecionado.tipo_servico,
            valor: tipoSelecionado.valor,
            data_hora: dataHora,
            payment_method: method,
            currency,
            module: "agendar_consulta",
            status_novo: "aguardando_pagamento",
          },
        });
        window.location.href = data.url;
      } else {
        throw new Error("URL de checkout não retornada");
      }
    } catch (err: any) {
      toast({
        title: "Erro no pagamento",
        description: err.message || "Não foi possível iniciar o pagamento. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setPaying(false);
    }
  };


  if (isAdvogado) {
    return <ConsultasAdvogado />;
  }

  if (loadingHonorarios) {
    return (
      <div className="max-w-3xl mx-auto flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl md:text-2xl font-serif text-foreground flex items-center gap-3">
          <Calendar className="h-6 w-6 text-primary" />
          Agendar Consulta
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Selecione o tipo de consulta, data e horário para agendar com o [Nome do Advogado].
        </p>
      </div>

      {/* Executive Summary Card */}
      {executiveSummary && showSummary && (
        <Card className="p-4 bg-accent/5 border-accent/30">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-medium text-foreground mb-2">
                  Resumo Executivo da Consulta IA
                </h3>
                <div className="text-xs text-muted-foreground prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown>{executiveSummary}</ReactMarkdown>
                </div>
                <p className="text-[10px] text-muted-foreground/60 mt-3">
                  Este resumo será anexado à sua consulta para análise prévia do advogado.
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground"
              onClick={() => setShowSummary(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {/* Collapsed summary indicator */}
      {executiveSummary && !showSummary && (
        <button
          onClick={() => setShowSummary(true)}
          className="flex items-center gap-2 text-xs text-accent hover:underline"
        >
          <FileText className="h-4 w-4" />
          Resumo executivo anexado (clique para ver)
        </button>
      )}

      {/* Existing appointments */}
      {myConsultas.length > 0 && (
        <Card className="p-4 space-y-3">
          <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Suas Consultas
          </h3>
          <div className="space-y-2">
            {myConsultas.slice(0, 5).map((c) => {
              const isPast = c.data_hora && new Date(c.data_hora) < new Date();
              return (
                <div key={c.id} className={`flex items-center justify-between p-2 border border-border text-xs ${isPast ? "opacity-50" : ""}`}>
                  <div className="flex items-center gap-3">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    <div>
                      <span className="font-medium">{c.tipo}</span>
                      {c.data_hora && (
                        <span className="text-muted-foreground ml-2">
                          {new Date(c.data_hora).toLocaleDateString("pt-BR")} às{" "}
                          {new Date(c.data_hora).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className={`text-[9px] px-2 py-0.5 border tracking-wider uppercase ${
                    c.status === "confirmado" ? "text-green-400 border-green-400/30" :
                    c.status === "pendente" ? "text-warning border-warning/30" :
                    "text-muted-foreground border-border"
                  }`}>
                    {c.status}
                  </span>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Steps */}
      <div className="flex items-center gap-3 text-[10px] tracking-wider uppercase text-muted-foreground">
        <span className={step >= 1 ? "text-primary" : ""}>1. Tipo</span>
        <span>→</span>
        <span className={step >= 2 ? "text-primary" : ""}>2. Data/Hora</span>
        <span>→</span>
        <span className={step >= 3 ? "text-primary" : ""}>3. Pagamento</span>
      </div>

      {step === 1 && (
        <StepTipo
          honorarios={honorarios}
          selectedTipo={selectedTipo}
          onSelect={(tipo) => {
            setSelectedTipo(tipo);
            setStep(2);
          }}
        />
      )}

      {step === 2 && (
        <StepDataHora
          selectedData={selectedData}
          selectedHora={selectedHora}
          horarios={horariosDisponiveis.filter(h => !occupiedSlots.includes(h))}
          onDataChange={setSelectedData}
          onHoraSelect={(hora) => {
            setSelectedHora(hora);
            setStep(3);
          }}
          onBack={() => setStep(1)}
        />
      )}

      {step === 3 && tipoSelecionado && (
        <StepPagamento
          tipo={tipoSelecionado}
          data={selectedData}
          hora={selectedHora}
          paying={paying}
          onPagar={handlePagar}
          onBack={() => setStep(2)}
        />
      )}

      {/* OAB Disclaimer */}
      <p className="text-[9px] text-muted-foreground/60 text-center">
        Honorários conforme tabela da OAB/RS. Recibo emitido com dados do escritório. Provimento 205/2021 e LGPD aplicáveis.
      </p>
    </div>
  );
}
