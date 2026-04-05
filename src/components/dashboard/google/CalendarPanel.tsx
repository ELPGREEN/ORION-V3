import { useState, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  Plus,
  Loader2,
  Clock,
  MapPin,
  Trash2,
  RefreshCw,
  CloudOff,
  Cloud,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useLocalCalendar } from "@/hooks/useLocalCalendar";
import { googleCalendarList, googleCalendarCreate, googleCalendarDelete } from "@/lib/google-server";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface GoogleEvent {
  id: string;
  summary: string;
  description?: string;
  location?: string;
  start: { dateTime?: string; date?: string };
  end: { dateTime?: string; date?: string };
  status?: string;
}

interface MergedEvent {
  id: string;
  title: string;
  description?: string;
  location?: string;
  startAt: string;
  endAt?: string;
  source: "local" | "google";
  category?: string;
  color?: string;
  googleEventId?: string;
}

const CATEGORY_LABELS: Record<string, string> = {
  audiencia: "Audiência",
  prazo: "Prazo",
  reuniao: "Reunião",
  compromisso: "Compromisso",
  outro: "Outro",
};

const CATEGORY_COLORS: Record<string, string> = {
  audiencia: "#ef4444",
  prazo: "#f59e0b",
  reuniao: "#3b82f6",
  compromisso: "#8b5cf6",
  outro: "#6b7280",
};

export function CalendarPanel() {
  const { events: localEvents, loading: localLoading, createEvent, deleteEvent, loadEvents: reloadLocal } = useLocalCalendar();
  const { toast } = useToast();

  const [googleEvents, setGoogleEvents] = useState<GoogleEvent[]>([]);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newEvent, setNewEvent] = useState({
    summary: "",
    description: "",
    location: "",
    startDate: "",
    startTime: "",
    endDate: "",
    endTime: "",
    category: "outro",
    syncToGoogle: true,
  });

  // Load Google events via server-side service account
  const loadGoogleEvents = async () => {
    setGoogleLoading(true);
    try {
      const now = new Date();
      const timeMin = now.toISOString();
      const timeMax = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000).toISOString();
      const data = await googleCalendarList(timeMin, timeMax, 50);
      setGoogleEvents(data.items || []);
    } catch (err: any) {
      console.warn("Google Calendar sync failed:", err.message);
    } finally {
      setGoogleLoading(false);
    }
  };

  useEffect(() => {
    loadGoogleEvents();
  }, []);

  // Merge local + google events
  const mergedEvents: MergedEvent[] = [
    ...localEvents.map((e): MergedEvent => ({
      id: e.id,
      title: e.title,
      description: e.description ?? undefined,
      location: e.location ?? undefined,
      startAt: e.start_at,
      endAt: e.end_at ?? undefined,
      source: "local",
      category: e.category,
      color: e.color,
      googleEventId: e.google_event_id ?? undefined,
    })),
    ...googleEvents
      .filter((ge) => !localEvents.some((le) => le.google_event_id === ge.id))
      .map((ge): MergedEvent => ({
        id: `g-${ge.id}`,
        title: ge.summary || "Sem título",
        description: ge.description,
        location: ge.location,
        startAt: ge.start.dateTime || ge.start.date || "",
        endAt: ge.end?.dateTime || ge.end?.date || undefined,
        source: "google",
        category: "outro",
        color: "#4285f4",
        googleEventId: ge.id,
      })),
  ].sort((a, b) => a.startAt.localeCompare(b.startAt));

  const handleCreate = async () => {
    if (!newEvent.summary || !newEvent.startDate || !newEvent.startTime) {
      toast({ title: "Preencha título, data e hora de início", variant: "destructive" });
      return;
    }
    setCreating(true);
    try {
      const startAt = `${newEvent.startDate}T${newEvent.startTime}:00`;
      const endDate = newEvent.endDate || newEvent.startDate;
      const endTime = newEvent.endTime || newEvent.startTime;
      const endAt = `${endDate}T${endTime}:00`;
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

      let googleEventId: string | undefined;

      // Always sync to Google via server-side service account
      if (newEvent.syncToGoogle) {
        try {
          const gResult = await googleCalendarCreate({
            summary: newEvent.summary,
            description: newEvent.description || undefined,
            location: newEvent.location || undefined,
            start: { dateTime: startAt, timeZone: tz },
            end: { dateTime: endAt, timeZone: tz },
          });
          if (gResult?.id) googleEventId = gResult.id;
        } catch {
          // Don't fail if Google sync fails
        }
      }

      await createEvent({
        title: newEvent.summary,
        description: newEvent.description || undefined,
        location: newEvent.location || undefined,
        start_at: new Date(startAt).toISOString(),
        end_at: new Date(endAt).toISOString(),
        category: newEvent.category,
        color: CATEGORY_COLORS[newEvent.category] || "#3b82f6",
        google_event_id: googleEventId,
      });

      toast({ title: googleEventId ? "Evento criado e sincronizado com Google!" : "Evento criado!" });
      setNewEvent({ summary: "", description: "", location: "", startDate: "", startTime: "", endDate: "", endTime: "", category: "outro", syncToGoogle: true });
      setDialogOpen(false);
      if (googleEventId) loadGoogleEvents();
    } catch (err: any) {
      toast({ title: "Erro ao criar evento", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (event: MergedEvent) => {
    try {
      if (event.source === "local") {
        if (event.googleEventId) {
          try { await googleCalendarDelete(event.googleEventId); } catch { /* ignore */ }
        }
        await deleteEvent(event.id);
      } else if (event.source === "google" && event.googleEventId) {
        await googleCalendarDelete(event.googleEventId);
        setGoogleEvents((prev) => prev.filter((e) => e.id !== event.googleEventId));
      }
      toast({ title: "Evento removido!" });
    } catch (err: any) {
      toast({ title: "Erro ao deletar", description: err.message, variant: "destructive" });
    }
  };

  const formatDt = (iso: string) => {
    if (!iso) return "Sem data";
    return new Date(iso).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  const isLoading = localLoading || googleLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <CalendarIcon className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium text-foreground">Agenda</h3>
          <Badge variant="outline" className="text-[10px]">
            {mergedEvents.length} eventos
          </Badge>
          <Badge className="text-[10px] bg-green-500/10 text-green-600 border-green-500/30">
            <Cloud className="h-3 w-3 mr-1" />
            Orion sync
          </Badge>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const now = new Date();
              reloadLocal(new Date(now.getFullYear(), now.getMonth(), 1), new Date(now.getFullYear(), now.getMonth() + 2, 0));
              loadGoogleEvents();
            }}
            disabled={isLoading}
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isLoading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="btn-gold">
                <Plus className="h-3.5 w-3.5 mr-1" />
                Novo Evento
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Evento</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Título do evento"
                  value={newEvent.summary}
                  onChange={(e) => setNewEvent({ ...newEvent, summary: e.target.value })}
                />
                <Textarea
                  placeholder="Descrição (opcional)"
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                  rows={2}
                />
                <Input
                  placeholder="Local (opcional)"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                />
                <Select value={newEvent.category} onValueChange={(v) => setNewEvent({ ...newEvent, category: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Data início</label>
                    <Input type="date" value={newEvent.startDate} onChange={(e) => setNewEvent({ ...newEvent, startDate: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Hora início</label>
                    <Input type="time" value={newEvent.startTime} onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Data fim</label>
                    <Input type="date" value={newEvent.endDate} onChange={(e) => setNewEvent({ ...newEvent, endDate: e.target.value })} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Hora fim</label>
                    <Input type="time" value={newEvent.endTime} onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })} />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newEvent.syncToGoogle}
                    onChange={(e) => setNewEvent({ ...newEvent, syncToGoogle: e.target.checked })}
                    className="rounded border-primary/30"
                  />
                  <Cloud className="h-3.5 w-3.5 text-blue-500" />
                  Sincronizar com Google Calendar (Orion)
                </label>
                <Button className="w-full btn-gold" onClick={handleCreate} disabled={creating}>
                  {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                  Criar Evento
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      )}

      {/* Empty */}
      {!isLoading && mergedEvents.length === 0 && (
        <Card className="border-dashed border-2 border-primary/20">
          <CardContent className="p-8 text-center">
            <CalendarIcon className="h-10 w-10 text-primary/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum evento encontrado.</p>
          </CardContent>
        </Card>
      )}

      {/* Events */}
      {!isLoading && mergedEvents.length > 0 && (
        <div className="space-y-3">
          {mergedEvents.map((event) => (
            <Card key={event.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: event.color || "#6b7280" }}
                      />
                      <h4 className="text-sm font-medium text-foreground">{event.title}</h4>
                      {event.source === "google" && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0">
                          <Cloud className="h-2.5 w-2.5 mr-0.5" />
                          Google
                        </Badge>
                      )}
                      {event.source === "local" && event.googleEventId && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 text-green-600">
                          <Cloud className="h-2.5 w-2.5 mr-0.5" />
                          Sincronizado
                        </Badge>
                      )}
                      {event.source === "local" && !event.googleEventId && (
                        <Badge variant="outline" className="text-[9px] px-1 py-0 text-muted-foreground">
                          <CloudOff className="h-2.5 w-2.5 mr-0.5" />
                          Local
                        </Badge>
                      )}
                      {event.category && CATEGORY_LABELS[event.category] && (
                        <Badge variant="secondary" className="text-[9px]">
                          {CATEGORY_LABELS[event.category]}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDt(event.startAt)}
                      </span>
                      {event.location && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {event.location}
                        </span>
                      )}
                    </div>
                    {event.description && (
                      <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{event.description}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleDelete(event)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
