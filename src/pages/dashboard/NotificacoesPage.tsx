import { useState, useEffect, useMemo, useCallback } from "react";
import { useRefreshOnFocus } from "@/hooks/useRefreshOnFocus";
// [REMOVED] import { useNeuralFeedback } from "@/hooks/useNeuralFeedback";
import { useNavigate } from "react-router-dom";
import { Bell, FileText, Calendar, CreditCard, PenTool, CheckCircle, Loader2, Trash2, Filter, X, ChevronRight, MessageSquare, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Notificacao {
  id: string;
  tipo: string;
  titulo: string;
  descricao: string | null;
  lida: boolean;
  link: string | null;
  referencia_id: string | null;
  referencia_tipo: string | null;
  created_at: string;
}

const tipoIcons: Record<string, typeof Bell> = {
  documento: FileText,
  consulta: Calendar,
  pagamento: CreditCard,
  assinatura: PenTool,
  sistema: Bell,
  contato: MessageSquare,
  pro_bono: Users,
  chat: MessageSquare,
  novo_cadastro: Users,
};

const tipoLabels: Record<string, string> = {
  assinatura: "Assinatura",
  documento: "Documento",
  pagamento: "Pagamento",
  consulta: "Consulta",
  sistema: "Sistema",
  contato: "Contato",
  pro_bono: "Pro Bono",
  chat: "Chat",
  novo_cadastro: "Novo Cliente",
};

const periodoOptions = [
  { label: "Todos", value: "todos" },
  { label: "Hoje", value: "hoje" },
  { label: "7 dias", value: "7dias" },
  { label: "30 dias", value: "30dias" },
];

export default function NotificacoesPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState<string | null>(null);
  const [filtroPeriodo, setFiltroPeriodo] = useState("todos");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<Notificacao | null>(null);

  const fetchNotificacoes = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("notificacoes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
    } else {
      setNotificacoes((data as unknown as Notificacao[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchNotificacoes();
  }, [user]);

  useRefreshOnFocus(useCallback(() => { fetchNotificacoes(); }, [user]));

  // Realtime subscription
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("notificacoes-page")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notificacoes", filter: `user_id=eq.${user.id}` },
        (payload) => {
          const newNotif = payload.new as unknown as Notificacao;
          setNotificacoes((prev) => [newNotif, ...prev]);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  const filteredNotificacoes = useMemo(() => {
    let result = notificacoes;

    if (filtroTipo) {
      result = result.filter((n) => n.tipo === filtroTipo);
    }

    if (filtroPeriodo !== "todos") {
      const now = new Date();
      let cutoff: Date;
      if (filtroPeriodo === "hoje") {
        cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (filtroPeriodo === "7dias") {
        cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else {
        cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      result = result.filter((n) => new Date(n.created_at) >= cutoff);
    }

    return result;
  }, [notificacoes, filtroTipo, filtroPeriodo]);

  const marcarComoLida = async (id: string) => {
    await supabase.from("notificacoes").update({ lida: true }).eq("id", id);
    setNotificacoes((prev) => prev.map((n) => (n.id === id ? { ...n, lida: true } : n)));
  };

  const marcarTodasComoLidas = async () => {
    if (!user) return;
    await supabase.from("notificacoes").update({ lida: true }).eq("user_id", user.id).eq("lida", false);
    setNotificacoes((prev) => prev.map((n) => ({ ...n, lida: true })));
    toast({ title: "Todas as notificações foram marcadas como lidas" });
  };

  const excluirNotificacao = async (id: string) => {
    await supabase.from("notificacoes").delete().eq("id", id);
    setNotificacoes((prev) => prev.filter((n) => n.id !== id));
    if (selectedNotif?.id === id) setSelectedNotif(null);
  };

  const isUsefulLink = (link: string | null) => {
    return link && link !== "/dashboard" && link !== "/dashboard/notificacoes";
  };

  const handleNotifClick = (n: Notificacao) => {
    if (!n.lida) marcarComoLida(n.id);

    // 🧠 Neural: registro de leitura de notificação como sinal de engajamento
    logNeural({
      interaction_type: "notificacao_read",
      input_text: `Notificação lida: ${n.titulo} (tipo: ${n.tipo})`,
      output_text: n.descricao || "",
      quality_score: 0.55,
      user_id: user?.id,
      metadata: { notif_id: n.id, tipo: n.tipo, lida: n.lida, source: "notificacoes_page" },
    });

    // If notification has a specific link (not generic dashboard), navigate there
    if (isUsefulLink(n.link)) {
      navigate(n.link!);
      return;
    }
    setSelectedNotif(n);
  };

  const getActionLabel = (n: Notificacao) => {
    // Use the stored link if it's a specific page (not generic dashboard)
    if (isUsefulLink(n.link)) {
      const labels: Record<string, string> = {
        contato: "Ver Contato",
        documento: "Ver Documento",
        assinatura: "Ver Assinatura",
        pagamento: "Ver Pagamento",
        consulta: "Ver Consulta",
        chat: "Abrir Chat",
        pro_bono: "Ver Solicitação",
        novo_cadastro: "Ver Cliente",
      };
      return { label: labels[n.tipo] || "Abrir", path: n.link! };
    }
    // Fallback: route by notification type
    const actions: Record<string, { label: string; path: string }> = {
      contato: { label: "Ver Contatos", path: "/dashboard/contatos" },
      documento: { label: "Ver Documentos", path: "/dashboard/documentos" },
      assinatura: { label: "Ver Assinaturas", path: "/dashboard/assinatura" },
      pagamento: { label: "Ver Pagamentos", path: "/dashboard/pagamentos" },
      consulta: { label: "Ver Consultas", path: "/dashboard/consultas" },
      chat: { label: "Abrir Chat", path: "/dashboard/chat-ao-vivo" },
      pro_bono: { label: "Ver Pro Bono", path: "/dashboard/clientes" },
      novo_cadastro: { label: "Ver Cliente", path: "/dashboard/clientes" },
    };
    return actions[n.tipo] || { label: "Ver Dashboard", path: "/dashboard" };
  };

  const naoLidas = notificacoes.filter((n) => !n.lida).length;
  const hasActiveFilters = filtroTipo !== null || filtroPeriodo !== "todos";

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-serif text-foreground flex items-center gap-3">
            <Bell className="h-6 w-6 text-primary" />
            Notificações
            {naoLidas > 0 && (
              <span className="text-[10px] px-2 py-0.5 bg-primary/20 text-primary border border-primary/30">
                {naoLidas} nova(s)
              </span>
            )}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Acompanhe atualizações sobre seus documentos, consultas e pagamentos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className={`text-[10px] h-7 ${hasActiveFilters ? "text-primary" : "text-muted-foreground"}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-3 w-3 mr-1" />
            Filtros
          </Button>
          {naoLidas > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-[10px] h-7 text-primary"
              onClick={marcarTodasComoLidas}
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              Marcar todas
            </Button>
          )}
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-card border border-border p-4 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-foreground">Filtrar notificações</p>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="text-[10px] h-6 text-muted-foreground"
                onClick={() => { setFiltroTipo(null); setFiltroPeriodo("todos"); }}
              >
                <X className="h-3 w-3 mr-1" />
                Limpar filtros
              </Button>
            )}
          </div>

          {/* Type filters */}
          <div>
            <p className="text-[10px] text-muted-foreground mb-2 tracking-wider uppercase">Tipo</p>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFiltroTipo(null)}
                className={`text-[10px] px-3 py-1 border transition-all ${
                  filtroTipo === null
                    ? "border-primary/40 bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/20"
                }`}
              >
                Todos
              </button>
              {Object.entries(tipoLabels).map(([key, label]) => {
                const Icon = tipoIcons[key] || Bell;
                return (
                  <button
                    key={key}
                    onClick={() => setFiltroTipo(filtroTipo === key ? null : key)}
                    className={`text-[10px] px-3 py-1 border transition-all flex items-center gap-1 ${
                      filtroTipo === key
                        ? "border-primary/40 bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-primary/20"
                    }`}
                  >
                    <Icon className="h-3 w-3" />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Period filters */}
          <div>
            <p className="text-[10px] text-muted-foreground mb-2 tracking-wider uppercase">Período</p>
            <div className="flex flex-wrap gap-2">
              {periodoOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFiltroPeriodo(opt.value)}
                  className={`text-[10px] px-3 py-1 border transition-all ${
                    filtroPeriodo === opt.value
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:border-primary/20"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results count when filtered */}
      {hasActiveFilters && !loading && (
        <p className="text-[10px] text-muted-foreground">
          {filteredNotificacoes.length} notificação(ões) encontrada(s)
        </p>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filteredNotificacoes.length === 0 ? (
        <div className="bg-card border border-border p-8 text-center">
          <Bell className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            {hasActiveFilters ? "Nenhuma notificação encontrada com esses filtros." : "Nenhuma notificação ainda."}
          </p>
          <p className="text-[10px] text-muted-foreground/60 mt-1">
            {hasActiveFilters
              ? "Tente ajustar os filtros para ver mais resultados."
              : "Você receberá notificações sobre assinaturas, documentos e consultas."}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredNotificacoes.map((n) => {
            const Icon = tipoIcons[n.tipo] || Bell;
            return (
              <div
                key={n.id}
                onClick={() => handleNotifClick(n)}
                className={`bg-card border p-4 flex items-start gap-4 transition-all hover-gold-glow cursor-pointer ${
                  n.lida ? "border-border opacity-60" : "border-primary/20"
                }`}
              >
                <div
                  className={`h-10 w-10 border flex items-center justify-center flex-shrink-0 ${
                    n.lida ? "border-border" : "border-primary/30 bg-primary/10"
                  }`}
                >
                  <Icon className={`h-5 w-5 ${n.lida ? "text-muted-foreground" : "text-primary"}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium ${n.lida ? "text-muted-foreground" : "text-foreground"}`}>
                      {n.titulo}
                    </p>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {new Date(n.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                  {n.descricao && (
                    <p className="text-[11px] text-muted-foreground mt-0.5">{n.descricao}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] text-muted-foreground/60">
                      {tipoLabels[n.tipo] || n.tipo}
                    </span>
                    <ChevronRight className="h-3 w-3 text-primary/40" />
                    <span className="text-[9px] text-primary/60">Clique para ver detalhes</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {!n.lida && <div className="h-2 w-2 bg-primary rounded-full" />}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      excluirNotificacao(n.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Notification Detail Dialog */}
      <Dialog open={!!selectedNotif} onOpenChange={(open) => !open && setSelectedNotif(null)}>
        <DialogContent className="sm:max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-foreground">
              {selectedNotif && (() => {
                const Icon = tipoIcons[selectedNotif.tipo] || Bell;
                return <Icon className="h-5 w-5 text-primary" />;
              })()}
              {selectedNotif?.titulo}
            </DialogTitle>
          </DialogHeader>
          
          {selectedNotif && (
            <div className="space-y-4">
              {/* Type badge */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary border border-primary/30 uppercase tracking-wider">
                  {tipoLabels[selectedNotif.tipo] || selectedNotif.tipo}
                </span>
                <span className="text-[10px] text-muted-foreground">
                  {new Date(selectedNotif.created_at).toLocaleString("pt-BR")}
                </span>
              </div>

              {/* Description */}
              {selectedNotif.descricao && (
                <div className="bg-background border border-border p-4">
                  <p className="text-sm text-foreground leading-relaxed">{selectedNotif.descricao}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center gap-3 pt-2">
                <Button
                  className="flex-1"
                  onClick={() => {
                    const action = getActionLabel(selectedNotif);
                    setSelectedNotif(null);
                    navigate(action.path);
                  }}
                >
                  {getActionLabel(selectedNotif).label}
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive border-destructive/30 hover:bg-destructive/10"
                  onClick={() => excluirNotificacao(selectedNotif.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
