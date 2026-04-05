import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Bot, AlertTriangle, Clock, CheckCircle2, User, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface SecretarySummary {
  id: string;
  conversation_id: string;
  cliente_id: string;
  summary: string;
  collected_info: Record<string, string>;
  urgency: string;
  status: string;
  created_at: string;
  cliente_nome?: string;
}

export default function SecretarySummariesWidget() {
  const [summaries, setSummaries] = useState<SecretarySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetchSummaries();

    const channel = supabase
      .channel("secretary-summaries-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "secretary_summaries" }, () => fetchSummaries())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const fetchSummaries = async () => {
    const { data } = await supabase
      .from("secretary_summaries")
      .select("*")
      .eq("status", "pendente")
      .order("created_at", { ascending: false })
      .limit(20);

    if (data && data.length > 0) {
      // Fetch client names
      const clienteIds = [...new Set(data.map(s => s.cliente_id))];
      const { data: profiles } = await supabase
        .from("client_profiles")
        .select("user_id, nome")
        .in("user_id", clienteIds);

      const enriched = data.map(s => ({
        ...s,
        collected_info: (s.collected_info || {}) as Record<string, string>,
        cliente_nome: profiles?.find(p => p.user_id === s.cliente_id)?.nome || "Cliente",
      }));
      setSummaries(enriched);
    } else {
      setSummaries([]);
    }
    setLoading(false);
  };

  const markAsReviewed = async (id: string) => {
    await supabase.from("secretary_summaries").update({ status: "revisado" }).eq("id", id);
    setSummaries(prev => prev.filter(s => s.id !== id));
  };

  const urgencyConfig: Record<string, { label: string; color: string; icon: any }> = {
    muito_urgente: { label: "Muito Urgente", color: "text-red-500 bg-red-500/10 border-red-500/30", icon: AlertTriangle },
    urgente: { label: "Urgente", color: "text-amber-500 bg-amber-500/10 border-amber-500/30", icon: AlertTriangle },
    normal: { label: "Normal", color: "text-primary bg-primary/10 border-primary/30", icon: Clock },
  };

  if (loading) return null;
  if (summaries.length === 0) return null;

  return (
    <div className="border border-border bg-card rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-card/80">
        <Bot className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-serif text-foreground tracking-wider">Resumos da Secretária IA</h3>
        <Badge variant="secondary" className="ml-auto text-[10px]">{summaries.length} pendente{summaries.length !== 1 ? "s" : ""}</Badge>
      </div>

      <div className="divide-y divide-border max-h-96 overflow-y-auto">
        {summaries.map((s) => {
          const urg = urgencyConfig[s.urgency] || urgencyConfig.normal;
          const UrgIcon = urg.icon;
          const isExpanded = expanded === s.id;
          const info = s.collected_info;

          return (
            <div key={s.id} className="px-4 py-3">
              <div className="flex items-center gap-2 mb-1">
                <User className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">{s.cliente_nome}</span>
                <span className={cn("text-[9px] px-1.5 py-0.5 border rounded flex items-center gap-1", urg.color)}>
                  <UrgIcon className="h-2.5 w-2.5" />
                  {urg.label}
                </span>
                <span className="text-[10px] text-muted-foreground ml-auto">
                  {new Date(s.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>

              {info.tipo_problema && (
                <p className="text-[11px] text-muted-foreground mb-1">
                  <strong>Tipo:</strong> {info.tipo_problema}
                </p>
              )}
              {s.summary && (
                <p className="text-xs text-foreground line-clamp-2">{s.summary}</p>
              )}

              <div className="flex items-center gap-2 mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 text-[10px] px-2"
                  onClick={() => setExpanded(isExpanded ? null : s.id)}
                >
                  {isExpanded ? <ChevronUp className="h-3 w-3 mr-1" /> : <ChevronDown className="h-3 w-3 mr-1" />}
                  {isExpanded ? "Menos" : "Detalhes"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-6 text-[10px] px-2 ml-auto"
                  onClick={() => markAsReviewed(s.id)}
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" /> Revisado
                </Button>
              </div>

              {isExpanded && (
                <div className="mt-2 p-2 bg-muted/30 border border-border rounded text-[11px] space-y-1">
                  {info.descricao && <p><strong>Descrição:</strong> {info.descricao}</p>}
                  {info.documentos && <p><strong>Documentos:</strong> {info.documentos}</p>}
                  {info.quer_agendar && <p><strong>Quer agendar:</strong> {info.quer_agendar}</p>}
                  {info.info_extra && <p><strong>Info extra:</strong> {info.info_extra}</p>}
                  {Object.keys(info).filter(k => !["tipo_problema", "descricao", "urgencia", "documentos", "quer_agendar", "info_extra"].includes(k)).map(k => (
                    <p key={k}><strong>{k}:</strong> {info[k]}</p>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
