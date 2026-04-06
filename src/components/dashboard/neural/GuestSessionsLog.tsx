/**
 * GuestSessionsLog — Panel for the owner to view who else accessed their login.
 */

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, Clock, MessageSquare, ChevronDown, ChevronUp, ShieldAlert, RefreshCw } from "lucide-react";
import { useVoiceIdentityGuard } from "@/hooks/useVoiceIdentityGuard";
import { cn } from "@/lib/utils";

interface GuestSessionRow {
  id: string;
  guest_name: string;
  started_at: string;
  ended_at: string | null;
  messages: Array<{ role: string; content: string; timestamp: string }>;
  is_active: boolean;
  device_info: Record<string, unknown> | null;
}

export function GuestSessionsLog() {
  const { fetchGuestSessions } = useVoiceIdentityGuard();
  const [sessions, setSessions] = useState<GuestSessionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const data = await fetchGuestSessions();
    setSessions(data as GuestSessionRow[]);
    setLoading(false);
  }, [fetchGuestSessions]);

  useEffect(() => { load(); }, [load]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "2-digit" }) +
      " " + d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <Card className="border-primary/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          Registro de Acessos — Visitantes
          <Badge variant="outline" className="ml-auto text-[10px]">
            {sessions.length} sessão(ões)
          </Badge>
          <Button variant="ghost" size="icon" onClick={load} disabled={loading} className="h-7 w-7">
            <RefreshCw className={cn("h-3.5 w-3.5", loading && "animate-spin")} />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sessions.length === 0 ? (
          <div className="text-center py-8 space-y-2">
            <ShieldAlert className="h-10 w-10 text-muted-foreground/30 mx-auto" />
            <p className="text-sm text-muted-foreground">Nenhum visitante acessou seu login ainda.</p>
            <p className="text-[10px] text-muted-foreground/60">
              Quando alguém usar o Orion com sua conta, o registro aparecerá aqui.
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[400px]">
            <div className="space-y-2">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="border border-border/50 rounded-lg overflow-hidden"
                >
                  <button
                    onClick={() => setExpandedId(expandedId === s.id ? null : s.id)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-muted/30 transition-colors text-left"
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                      s.is_active ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      {s.guest_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {s.guest_name}
                        {s.is_active && (
                          <Badge variant="default" className="ml-2 text-[9px]">Ativo</Badge>
                        )}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDate(s.started_at)}
                        {s.messages?.length > 0 && (
                          <>
                            <MessageSquare className="h-3 w-3 ml-1" />
                            {s.messages.length} msg
                          </>
                        )}
                      </div>
                    </div>
                    {expandedId === s.id ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </button>

                  {expandedId === s.id && s.messages?.length > 0 && (
                    <div className="border-t border-border/30 p-3 space-y-2 bg-muted/10">
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                        Conversa registrada
                      </p>
                      {s.messages.map((msg, i) => (
                        <div
                          key={i}
                          className={cn(
                            "p-2 rounded-lg text-xs",
                            msg.role === "user"
                              ? "bg-muted/50 text-foreground ml-4"
                              : "bg-primary/5 text-foreground mr-4 border-l-2 border-primary/30"
                          )}
                        >
                          <span className="text-[9px] text-muted-foreground block mb-0.5">
                            {msg.role === "user" ? s.guest_name : "Orion"} • {formatDate(msg.timestamp)}
                          </span>
                          {msg.content}
                        </div>
                      ))}
                    </div>
                  )}

                  {expandedId === s.id && (!s.messages || s.messages.length === 0) && (
                    <div className="border-t border-border/30 p-3 text-center">
                      <p className="text-[10px] text-muted-foreground">Nenhuma mensagem registrada nesta sessão.</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
