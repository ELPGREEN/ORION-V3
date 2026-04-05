import { ScrollArea } from "@/components/ui/scroll-area";
import { Clock, MessageSquare, Lightbulb, Check, X, Edit3 } from "lucide-react";
import type { ActivityEvent } from "./types";

interface ActivityTimelineProps {
  events: ActivityEvent[];
}

const EVENT_ICONS: Record<string, React.ReactNode> = {
  edit: <Edit3 className="h-3 w-3" />,
  comment: <MessageSquare className="h-3 w-3" />,
  suggestion: <Lightbulb className="h-3 w-3" />,
  resolve: <Check className="h-3 w-3" />,
  accept: <Check className="h-3 w-3" />,
  reject: <X className="h-3 w-3" />,
};

const EVENT_COLORS: Record<string, string> = {
  edit: "text-blue-500 bg-blue-500/10",
  comment: "text-yellow-500 bg-yellow-500/10",
  suggestion: "text-purple-500 bg-purple-500/10",
  resolve: "text-green-500 bg-green-500/10",
  accept: "text-green-600 bg-green-500/10",
  reject: "text-red-500 bg-red-500/10",
};

export function ActivityTimeline({ events }: ActivityTimelineProps) {
  if (events.length === 0) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
          <Clock className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">Atividade</span>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <p className="text-xs text-muted-foreground text-center px-4">
            Nenhuma atividade registrada ainda.
          </p>
        </div>
      </div>
    );
  }

  // Group by date
  const grouped: Record<string, ActivityEvent[]> = {};
  events.forEach((ev) => {
    const day = new Date(ev.timestamp).toLocaleDateString("pt-BR");
    if (!grouped[day]) grouped[day] = [];
    grouped[day].push(ev);
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <Clock className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Atividade</span>
        <span className="text-[10px] text-muted-foreground">{events.length} eventos</span>
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {Object.entries(grouped).map(([day, dayEvents]) => (
            <div key={day}>
              <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-2">
                {day}
              </div>
              <div className="space-y-1.5">
                {dayEvents.map((ev) => (
                  <div key={ev.id} className="flex items-start gap-2">
                    <div
                      className={`flex items-center justify-center h-5 w-5 rounded-full shrink-0 mt-0.5 ${EVENT_COLORS[ev.type] || "text-muted-foreground bg-muted"}`}
                    >
                      {EVENT_ICONS[ev.type] || <Edit3 className="h-3 w-3" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] text-foreground leading-tight">
                        <span className="font-medium">{ev.authorName}</span>{" "}
                        <span className="text-muted-foreground">{ev.description}</span>
                      </p>
                      <span className="text-[9px] text-muted-foreground">
                        {new Date(ev.timestamp).toLocaleTimeString("pt-BR", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
