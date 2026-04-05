import { useState, useEffect, useCallback } from "react";
import { useRefreshOnFocus } from "@/hooks/useRefreshOnFocus";
import {
  Star,
  Check,
  X,
  Loader2,
  Search,
  Trash2,
  Eye,
  User,
  Calendar,
  Quote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNeuralFeedback } from "@/hooks/useNeuralFeedback";

interface Avaliacao {
  id: string;
  nome: string;
  nota: number;
  depoimento: string;
  foto_url: string | null;
  aprovado: boolean;
  created_at: string;
  user_id: string;
}

export default function AvaliacoesAdmin() {
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filter, setFilter] = useState<"all" | "pending" | "approved">("all");
  const [selectedAvaliacao, setSelectedAvaliacao] = useState<Avaliacao | null>(null);
  const [processing, setProcessing] = useState<string | null>(null);
  const { logNeural } = useNeuralFeedback();

  useEffect(() => {
    fetchAvaliacoes();
  }, []);

  useRefreshOnFocus(useCallback(() => { fetchAvaliacoes(); }, []));

  const fetchAvaliacoes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("avaliacoes")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Erro ao carregar avaliações");
    } else {
      setAvaliacoes(data || []);
    }
    setLoading(false);
  };

  const handleApprove = async (id: string) => {
    setProcessing(id);
    const avaliacao = avaliacoes.find((a) => a.id === id);
    const { error } = await supabase
      .from("avaliacoes")
      .update({ aprovado: true })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao aprovar");
    } else {
      toast.success("Avaliação aprovada!");
      // ─── Neural: aprovação = sinal de alta qualidade ───
      if (avaliacao) {
        logNeural({
          interaction_type: "avaliacao",
          input_text: `Avaliação aprovada: ${avaliacao.nome} — ${avaliacao.nota} estrelas`,
          output_text: avaliacao.depoimento,
          quality_score: avaliacao.nota / 5,
          metadata: { nota: avaliacao.nota, aprovado: true, source: "avaliacoes_admin_approve" },
        });
      }
      fetchAvaliacoes();
    }
    setProcessing(null);
  };

  const handleReject = async (id: string) => {
    setProcessing(id);
    const { error } = await supabase
      .from("avaliacoes")
      .update({ aprovado: false })
      .eq("id", id);

    if (error) {
      toast.error("Erro ao reprovar");
    } else {
      toast.success("Avaliação reprovada");
      fetchAvaliacoes();
    }
    setProcessing(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta avaliação?")) return;
    
    setProcessing(id);
    const { error } = await supabase.from("avaliacoes").delete().eq("id", id);

    if (error) {
      toast.error("Erro ao excluir");
    } else {
      toast.success("Avaliação excluída");
      setSelectedAvaliacao(null);
      fetchAvaliacoes();
    }
    setProcessing(null);
  };

  const filteredAvaliacoes = avaliacoes.filter((a) => {
    const matchesSearch =
      a.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.depoimento.toLowerCase().includes(searchTerm.toLowerCase());

    if (filter === "pending") return matchesSearch && !a.aprovado;
    if (filter === "approved") return matchesSearch && a.aprovado;
    return matchesSearch;
  });

  const pendingCount = avaliacoes.filter((a) => !a.aprovado).length;
  const approvedCount = avaliacoes.filter((a) => a.aprovado).length;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-serif text-foreground flex items-center gap-3">
          <Star className="h-6 w-6 text-primary" />
          Gerenciar Avaliações
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Aprove ou reprove avaliações de clientes para exibição no site
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <button
          onClick={() => setFilter("all")}
          className={`p-4 border text-center transition-all ${
            filter === "all"
              ? "border-primary bg-primary/10"
              : "border-border bg-card hover-gold-glow"
          }`}
        >
          <p className="text-2xl font-serif text-foreground">{avaliacoes.length}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Total
          </p>
        </button>
        <button
          onClick={() => setFilter("pending")}
          className={`p-4 border text-center transition-all ${
            filter === "pending"
              ? "border-warning bg-warning/10"
              : "border-border bg-card hover-gold-glow"
          }`}
        >
          <p className="text-2xl font-serif text-warning">{pendingCount}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Pendentes
          </p>
        </button>
        <button
          onClick={() => setFilter("approved")}
          className={`p-4 border text-center transition-all ${
            filter === "approved"
              ? "border-green-500 bg-green-500/10"
              : "border-border bg-card hover-gold-glow"
          }`}
        >
          <p className="text-2xl font-serif text-green-500">{approvedCount}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Aprovadas
          </p>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Buscar por nome ou conteúdo..."
          className="pl-10 bg-card border-border"
        />
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="h-6 w-6 text-primary animate-spin" />
        </div>
      ) : filteredAvaliacoes.length === 0 ? (
        <div className="bg-card border border-border p-12 text-center">
          <Star className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
          <p className="text-muted-foreground">
            {searchTerm
              ? "Nenhuma avaliação encontrada"
              : filter === "pending"
              ? "Nenhuma avaliação pendente"
              : filter === "approved"
              ? "Nenhuma avaliação aprovada"
              : "Nenhuma avaliação recebida"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredAvaliacoes.map((avaliacao) => (
            <div
              key={avaliacao.id}
              className="bg-card border border-border p-4 hover-gold-glow transition-all group"
            >
              <div className="flex items-start gap-4">
                {/* Avatar */}
                {avaliacao.foto_url ? (
                  <img
                    src={avaliacao.foto_url}
                    alt={avaliacao.nome}
                    className="h-12 w-12 rounded-full object-cover border border-primary/30 flex-shrink-0"
                  />
                ) : (
                  <div className="h-12 w-12 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                )}

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-foreground">{avaliacao.nome}</h3>
                    <Badge
                      variant={avaliacao.aprovado ? "default" : "secondary"}
                      className={`text-[9px] ${
                        avaliacao.aprovado
                          ? "bg-green-500/10 text-green-500 border-green-500/30"
                          : "bg-warning/10 text-warning border-warning/30"
                      }`}
                    >
                      {avaliacao.aprovado ? "APROVADA" : "PENDENTE"}
                    </Badge>
                  </div>

                  {/* Stars */}
                  <div className="flex gap-0.5 mb-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-3.5 w-3.5 ${
                          star <= avaliacao.nota
                            ? "text-primary fill-primary"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                  </div>

                  {/* Depoimento */}
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {avaliacao.depoimento}
                  </p>

                  {/* Meta */}
                  <div className="flex items-center gap-2 mt-2 text-[10px] text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {format(new Date(avaliacao.created_at), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setSelectedAvaliacao(avaliacao)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  {!avaliacao.aprovado && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-green-500 hover:text-green-400"
                      onClick={() => handleApprove(avaliacao.id)}
                      disabled={processing === avaliacao.id}
                    >
                      {processing === avaliacao.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                  {avaliacao.aprovado && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-warning hover:text-warning"
                      onClick={() => handleReject(avaliacao.id)}
                      disabled={processing === avaliacao.id}
                    >
                      {processing === avaliacao.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive"
                    onClick={() => handleDelete(avaliacao.id)}
                    disabled={processing === avaliacao.id}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selectedAvaliacao} onOpenChange={() => setSelectedAvaliacao(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-serif">Detalhes da Avaliação</DialogTitle>
          </DialogHeader>

          {selectedAvaliacao && (
            <div className="space-y-4 mt-4">
              {/* User info */}
              <div className="flex items-center gap-4">
                {selectedAvaliacao.foto_url ? (
                  <img
                    src={selectedAvaliacao.foto_url}
                    alt={selectedAvaliacao.nome}
                    className="h-16 w-16 rounded-full object-cover border-2 border-primary/30"
                  />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center">
                    <User className="h-8 w-8 text-primary" />
                  </div>
                )}
                <div>
                  <h3 className="text-lg font-medium text-foreground">
                    {selectedAvaliacao.nome}
                  </h3>
                  <div className="flex gap-0.5 mt-1">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`h-4 w-4 ${
                          star <= selectedAvaliacao.nota
                            ? "text-primary fill-primary"
                            : "text-muted-foreground/30"
                        }`}
                      />
                    ))}
                    <span className="text-sm text-muted-foreground ml-2">
                      {selectedAvaliacao.nota}/5
                    </span>
                  </div>
                </div>
              </div>

              {/* Depoimento */}
              <div className="bg-muted/50 p-4 border border-border">
                <Quote className="h-5 w-5 text-primary/30 mb-2" />
                <p className="text-sm text-foreground leading-relaxed">
                  {selectedAvaliacao.depoimento}
                </p>
              </div>

              {/* Meta */}
              <div className="text-xs text-muted-foreground">
                Enviada em{" "}
                {format(new Date(selectedAvaliacao.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
                  locale: ptBR,
                })}
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <Button variant="ghost" onClick={() => setSelectedAvaliacao(null)}>
                  Fechar
                </Button>
                {selectedAvaliacao.aprovado ? (
                  <Button
                    variant="outline"
                    className="border-warning text-warning"
                    onClick={() => {
                      handleReject(selectedAvaliacao.id);
                      setSelectedAvaliacao(null);
                    }}
                  >
                    <X className="h-4 w-4 mr-2" />
                    Reprovar
                  </Button>
                ) : (
                  <Button
                    className="btn-gold"
                    onClick={() => {
                      handleApprove(selectedAvaliacao.id);
                      setSelectedAvaliacao(null);
                    }}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Aprovar
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
