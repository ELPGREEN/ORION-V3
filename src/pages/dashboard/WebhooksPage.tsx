import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// [REMOVED] import { useNeuralFeedback } from "@/hooks/useNeuralFeedback";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Webhook,
  Copy,
  RefreshCw,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Info,
} from "lucide-react";

const WEBHOOK_URL = `https://dlwafedtlvbvuoaopvsl.supabase.co/functions/v1/courtlistener-webhook`;

const EVENT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  DOCKET_ALERT: { label: "Docket Alert", color: "bg-blue-500/10 text-blue-400 border-blue-500/30" },
  SEARCH_ALERT: { label: "Search Alert", color: "bg-green-500/10 text-green-400 border-green-500/30" },
  OLD_DOCKET_ALERT: { label: "Old Docket Alert", color: "bg-warning/10 text-warning border-warning/30" },
  RECAP_FETCH: { label: "RECAP Fetch", color: "bg-purple-500/10 text-purple-400 border-purple-500/30" },
};

interface WebhookEvent {
  id: string;
  event_type: string;
  event_type_label: string | null;
  payload: Record<string, unknown>;
  processed: boolean;
  created_at: string;
}

export default function WebhooksPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { logNeural } = useNeuralFeedback();
  const queryClient = useQueryClient();
  const [expandedEvent, setExpandedEvent] = useState<string | null>(null);

  const { data: events, isLoading } = useQuery({
    queryKey: ["webhook-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courtlistener_webhook_events")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      return data as WebhookEvent[];
    },
  });

  const markProcessed = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("courtlistener_webhook_events")
        .update({ processed: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      const event = events?.find(e => e.id === id);
      queryClient.invalidateQueries({ queryKey: ["webhook-events"] });
      toast({ title: "Evento marcado como processado" });
      // 🧠 Neural: evento processado = sinal de uso jurídico real
      logNeural({
        interaction_type: "webhook_event",
        input_text: `Webhook CourtListener processado — tipo: ${event?.event_type_label || "desconhecido"}`,
        output_text: JSON.stringify(event?.payload || {}).substring(0, 500),
        quality_score: 0.82,
        user_id: user?.id,
        metadata: { event_id: id, event_type: event?.event_type, source: "courtlistener_webhook" },
      });
    },
  });

  const deleteEvent = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("courtlistener_webhook_events")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["webhook-events"] });
      toast({ title: "Evento removido" });
    },
  });

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(WEBHOOK_URL);
    toast({ title: "URL copiada", description: "Cole no painel de webhooks do CourtListener." });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-serif text-foreground tracking-wide flex items-center gap-2">
            <Webhook className="h-5 w-5 text-primary" />
            Webhooks CourtListener
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            Receba alertas automáticos de dockets e pesquisas
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={() => queryClient.invalidateQueries({ queryKey: ["webhook-events"] })}
        >
          <RefreshCw className="h-3 w-3 mr-1" />
          Atualizar
        </Button>
      </div>

      {/* Setup Instructions */}
      <div className="bg-card border border-border p-4 space-y-3">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="text-sm font-medium text-foreground">Configuração</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Configure este URL como endpoint de webhook no seu painel do CourtListener:
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-secondary p-3 border border-border">
          <code className="text-[10px] text-primary flex-1 break-all font-mono">
            {WEBHOOK_URL}
          </code>
          <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onClick={handleCopyUrl}>
            <Copy className="h-3 w-3" />
          </Button>
        </div>

        <div className="text-[10px] text-muted-foreground space-y-1">
          <p>1. Acesse <a href="https://www.courtlistener.com/profile/webhooks/" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">courtlistener.com/profile/webhooks/ <ExternalLink className="h-2.5 w-2.5 inline" /></a></p>
          <p>2. Clique em <strong>"Add webhook"</strong> e cole a URL acima</p>
          <p>3. Selecione os tipos de evento desejados (Docket Alert, Search Alert, etc.)</p>
          <p>4. Salve — os eventos aparecerão automaticamente abaixo</p>
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
          <Clock className="h-3.5 w-3.5" />
          Eventos Recebidos
          {events && events.length > 0 && (
            <Badge variant="secondary" className="text-[9px]">{events.length}</Badge>
          )}
        </h3>

        {isLoading ? (
          <div className="text-xs text-muted-foreground p-8 text-center">Carregando...</div>
        ) : !events || events.length === 0 ? (
          <div className="bg-card border border-border p-8 text-center">
            <Webhook className="h-8 w-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-xs text-muted-foreground">
              Nenhum evento recebido ainda. Configure o webhook no CourtListener para começar.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {events.map((event) => {
              const typeInfo = EVENT_TYPE_LABELS[event.event_type_label || ""] || {
                label: event.event_type_label || `Tipo ${event.event_type}`,
                color: "bg-muted text-muted-foreground border-border",
              };
              const isExpanded = expandedEvent === event.id;

              return (
                <div key={event.id} className="bg-card border border-border hover:border-primary/20 transition-colors">
                  <div
                    className="flex items-center gap-3 p-3 cursor-pointer"
                    onClick={() => setExpandedEvent(isExpanded ? null : event.id)}
                  >
                    {event.processed ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-400 flex-shrink-0" />
                    ) : (
                      <AlertCircle className="h-3.5 w-3.5 text-warning flex-shrink-0" />
                    )}

                    <span className={`text-[9px] px-1.5 py-0.5 border tracking-wider font-medium ${typeInfo.color}`}>
                      {typeInfo.label}
                    </span>

                    <span className="text-[10px] text-muted-foreground flex-1">
                      {new Date(event.created_at).toLocaleString("pt-BR")}
                    </span>

                    <div className="flex items-center gap-1">
                      {!event.processed && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={(e) => {
                            e.stopPropagation();
                            markProcessed.mutate(event.id);
                          }}
                          title="Marcar como processado"
                        >
                          <CheckCircle2 className="h-3 w-3" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive/60 hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteEvent.mutate(event.id);
                        }}
                        title="Remover"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="px-3 pb-3 border-t border-border pt-2">
                      <pre className="text-[9px] text-muted-foreground bg-secondary p-3 overflow-auto max-h-64 whitespace-pre-wrap break-words">
                        {JSON.stringify(event.payload, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
