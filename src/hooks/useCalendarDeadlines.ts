import { useCallback } from "react";
import { useGoogleToken } from "@/hooks/useGoogleToken";
import { useToast } from "@/hooks/use-toast";

interface CalendarDeadline {
  summary: string;
  description?: string;
  date: string; // ISO date string
  location?: string;
  reminderMinutes?: number[];
}

/**
 * Hook para criar eventos de prazos/audiências no Google Calendar automaticamente.
 */
export function useCalendarDeadlines() {
  const { invokeGoogleFunction, hasGoogleToken } = useGoogleToken();
  const { toast } = useToast();

  const createDeadlineEvent = useCallback(
    async (deadline: CalendarDeadline): Promise<string | null> => {
      if (!hasGoogleToken) {
        toast({ title: "Login com Google necessário para criar eventos no Calendar", variant: "destructive" });
        return null;
      }

      try {
        const startDate = new Date(deadline.date);
        const endDate = new Date(startDate);
        endDate.setHours(endDate.getHours() + 1);

        const eventData: any = {
          summary: deadline.summary,
          description: deadline.description || "",
          start: {
            dateTime: startDate.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          end: {
            dateTime: endDate.toISOString(),
            timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          },
          reminders: {
            useDefault: false,
            overrides: (deadline.reminderMinutes || [1440, 60, 15]).map((min) => ({
              method: "popup",
              minutes: min,
            })),
          },
          colorId: "11", // Red for deadlines
        };

        if (deadline.location) {
          eventData.location = deadline.location;
        }

        const result = await invokeGoogleFunction("google-calendar", {
          action: "create_event",
          eventData,
        });

        toast({ title: "📅 Prazo adicionado ao Google Calendar!", description: deadline.summary });
        return result.id;
      } catch (err: any) {
        toast({ title: "Erro ao criar evento no Calendar", description: err.message, variant: "destructive" });
        return null;
      }
    },
    [hasGoogleToken, invokeGoogleFunction, toast]
  );

  const createProcessoDeadlines = useCallback(
    async (processo: {
      numero_processo: string;
      tipo: string;
      cliente_nome: string;
      data_distribuicao?: string;
      comarca?: string;
      vara?: string;
    }) => {
      if (!hasGoogleToken) return null;

      const location = [processo.vara, processo.comarca].filter(Boolean).join(" - ");

      // Create main event for the processo
      const eventId = await createDeadlineEvent({
        summary: `📋 ${processo.tipo} - ${processo.numero_processo}`,
        description: `Cliente: ${processo.cliente_nome}\nProcesso: ${processo.numero_processo}\nTipo: ${processo.tipo}`,
        date: processo.data_distribuicao || new Date().toISOString(),
        location,
        reminderMinutes: [1440, 60],
      });

      return eventId;
    },
    [hasGoogleToken, createDeadlineEvent]
  );

  const createAudienciaEvent = useCallback(
    async (audiencia: {
      data: string;
      processoNumero: string;
      clienteNome: string;
      tipo: string;
      local?: string;
      descricao?: string;
    }) => {
      if (!hasGoogleToken) return null;

      return createDeadlineEvent({
        summary: `⚖️ Audiência: ${audiencia.tipo} - ${audiencia.processoNumero}`,
        description: `Cliente: ${audiencia.clienteNome}\n${audiencia.descricao || ""}`,
        date: audiencia.data,
        location: audiencia.local,
        reminderMinutes: [2880, 1440, 60, 15], // 2 days, 1 day, 1 hour, 15 min
      });
    },
    [hasGoogleToken, createDeadlineEvent]
  );

  const createPrazoEvent = useCallback(
    async (prazo: {
      data: string;
      processoNumero: string;
      clienteNome: string;
      descricao: string;
    }) => {
      if (!hasGoogleToken) return null;

      return createDeadlineEvent({
        summary: `⏰ Prazo: ${prazo.descricao} - ${prazo.processoNumero}`,
        description: `Cliente: ${prazo.clienteNome}\nProcesso: ${prazo.processoNumero}`,
        date: prazo.data,
        reminderMinutes: [4320, 1440, 120], // 3 days, 1 day, 2 hours
      });
    },
    [hasGoogleToken, createDeadlineEvent]
  );

  return {
    hasGoogleToken,
    createDeadlineEvent,
    createProcessoDeadlines,
    createAudienciaEvent,
    createPrazoEvent,
  };
}
