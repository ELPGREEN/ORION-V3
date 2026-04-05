import { useState, useEffect, useCallback } from "react";
import { useNeuralFeedback } from "@/hooks/useNeuralFeedback";
import { useRefreshOnFocus } from "@/hooks/useRefreshOnFocus";
import {
  ListTodo,
  Plus,
  Clock,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Loader2,
  Trash2,
  Edit2,
  X,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface Tarefa {
  id: string;
  titulo: string;
  descricao: string | null;
  prioridade: string;
  status: string;
  prazo: string | null;
  processo_ref: string | null;
  created_at: string;
}

const prioridadeConfig: Record<string, { label: string; color: string }> = {
  alta: { label: "Alta", color: "text-red-400 border-red-400/30 bg-red-400/5" },
  media: { label: "Média", color: "text-warning border-warning/30 bg-warning/5" },
  baixa: { label: "Baixa", color: "text-blue-400 border-blue-400/30 bg-blue-400/5" },
};

const statusConfig: Record<string, { label: string; icon: typeof Clock }> = {
  pendente: { label: "Pendente", icon: Clock },
  em_andamento: { label: "Em Andamento", icon: AlertTriangle },
  concluido: { label: "Concluído", icon: CheckCircle },
};

export default function TarefasContent() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { logNeural } = useNeuralFeedback();
  const [tarefas, setTarefas] = useState<Tarefa[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState<string>("todos");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTarefa, setEditingTarefa] = useState<Tarefa | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Tarefa | null>(null);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    titulo: "",
    descricao: "",
    prioridade: "media",
    status: "pendente",
    prazo: "",
    processo_ref: "",
  });

  useEffect(() => {
    if (user) fetchTarefas();
  }, [user]);

  useRefreshOnFocus(useCallback(() => { if (user) fetchTarefas(); }, [user]));

  const fetchTarefas = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("tarefas")
      .select("*")
      .order("prazo", { ascending: true, nullsFirst: false });

    if (!error) {
      setTarefas(data || []);
    }
    setLoading(false);
  };

  const openNewDialog = () => {
    setEditingTarefa(null);
    setFormData({ titulo: "", descricao: "", prioridade: "media", status: "pendente", prazo: "", processo_ref: "" });
    setDialogOpen(true);
  };

  const openEditDialog = (tarefa: Tarefa) => {
    setEditingTarefa(tarefa);
    setFormData({
      titulo: tarefa.titulo,
      descricao: tarefa.descricao || "",
      prioridade: tarefa.prioridade,
      status: tarefa.status,
      prazo: tarefa.prazo ? tarefa.prazo.split("T")[0] : "",
      processo_ref: tarefa.processo_ref || "",
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.titulo.trim()) {
      toast({ title: "Título obrigatório", variant: "destructive" });
      return;
    }
    if (!user) return;

    setSaving(true);

    const payload = {
      titulo: formData.titulo.trim(),
      descricao: formData.descricao.trim() || null,
      prioridade: formData.prioridade,
      status: formData.status,
      prazo: formData.prazo ? new Date(formData.prazo).toISOString() : null,
      processo_ref: formData.processo_ref.trim() || null,
    };

    if (editingTarefa) {
      const { error } = await supabase
        .from("tarefas")
        .update(payload)
        .eq("id", editingTarefa.id);

      if (error) {
        toast({ title: "Erro ao atualizar", variant: "destructive" });
      } else {
        toast({ title: "Tarefa atualizada!" });
        setDialogOpen(false);
        fetchTarefas();
      }
    } else {
      const { error } = await supabase.from("tarefas").insert({
        ...payload,
        user_id: user.id,
      });

      if (error) {
        toast({ title: "Erro ao criar", variant: "destructive" });
      } else {
        toast({ title: "Tarefa criada!" });
        setDialogOpen(false);
        fetchTarefas();
        logNeural({
          interaction_type: "tarefa_event",
          input_text: `Nova tarefa criada: ${payload.titulo}`,
          output_text: `Prioridade: ${payload.prioridade} | Status: ${payload.status}`,
          quality_score: payload.prioridade === "alta" ? 0.85 : 0.7,
          user_id: user.id,
          metadata: {
            prioridade: payload.prioridade,
            status: payload.status,
            processo_ref: payload.processo_ref,
            module: "tarefas",
          },
        });
      }
    }

    setSaving(false);
  };

  const handleDelete = async (tarefa: Tarefa) => {
    const { error } = await supabase.from("tarefas").delete().eq("id", tarefa.id);
    if (error) {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    } else {
      toast({ title: "Tarefa excluída" });
      fetchTarefas();
    }
    setDeleteTarget(null);
  };

  const toggleStatus = async (tarefa: Tarefa) => {
    const newStatus = tarefa.status === "concluido" ? "pendente" : "concluido";
    const { error } = await supabase
      .from("tarefas")
      .update({ status: newStatus })
      .eq("id", tarefa.id);

    if (!error) {
      setTarefas((prev) =>
        prev.map((t) => (t.id === tarefa.id ? { ...t, status: newStatus } : t))
      );
      if (newStatus === "concluido") {
        logNeural({
          interaction_type: "tarefa_event",
          input_text: `Tarefa concluída: ${tarefa.titulo}`,
          output_text: `Prioridade: ${tarefa.prioridade}`,
          quality_score: 0.9,
          user_id: user?.id,
          metadata: { module: "tarefas", status_novo: "concluido", prioridade: tarefa.prioridade },
        });
      }
    }
  };

  const filtradas = tarefas.filter((t) => {
    if (filtro === "todos") return true;
    return t.status === filtro;
  });

  const pendentes = tarefas.filter((t) => t.status !== "concluido").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end">
        <Button className="btn-gold text-[10px] h-9" onClick={openNewDialog}>
          <Plus className="h-3.5 w-3.5 mr-2" />
          NOVA TAREFA
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-card border border-border p-4 text-center">
          <p className="text-2xl font-serif text-primary">{pendentes}</p>
          <p className="text-[10px] text-muted-foreground tracking-wider uppercase">Pendentes</p>
        </div>
        <div className="bg-card border border-border p-4 text-center">
          <p className="text-2xl font-serif text-warning">
            {tarefas.filter((t) => t.prioridade === "alta" && t.status !== "concluido").length}
          </p>
          <p className="text-[10px] text-muted-foreground tracking-wider uppercase">Urgentes</p>
        </div>
        <div className="bg-card border border-border p-4 text-center">
          <p className="text-2xl font-serif text-green-400">
            {tarefas.filter((t) => t.status === "concluido").length}
          </p>
          <p className="text-[10px] text-muted-foreground tracking-wider uppercase">Concluídas</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {[
          { value: "todos", label: "Todas" },
          { value: "pendente", label: "Pendentes" },
          { value: "em_andamento", label: "Em Andamento" },
          { value: "concluido", label: "Concluídas" },
        ].map((f) => (
          <button
            key={f.value}
            onClick={() => setFiltro(f.value)}
            className={`text-[10px] px-3 py-1.5 border tracking-wider uppercase transition-all ${
              filtro === f.value
                ? "border-primary text-primary bg-primary/10"
                : "border-border text-muted-foreground hover:border-primary/30"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Tasks */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : filtradas.length === 0 ? (
        <div className="bg-card border border-border p-12 text-center">
          <ListTodo className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">Nenhuma tarefa encontrada</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Clique em "Nova Tarefa" para adicionar</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtradas.map((t) => {
            const prio = prioridadeConfig[t.prioridade] || prioridadeConfig.media;
            const status = statusConfig[t.status] || statusConfig.pendente;
            const StatusIcon = status.icon;
            const isOverdue = t.prazo && new Date(t.prazo) < new Date() && t.status !== "concluido";

            return (
              <div
                key={t.id}
                className={`bg-card border border-border p-4 hover-gold-glow transition-all group ${
                  t.status === "concluido" ? "opacity-60" : ""
                } ${isOverdue ? "border-red-500/30" : ""}`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <button onClick={() => toggleStatus(t)} className="hover:scale-110 transition-transform">
                        <StatusIcon
                          className={`h-4 w-4 ${t.status === "concluido" ? "text-green-400" : "text-muted-foreground"}`}
                        />
                      </button>
                      <p
                        className={`text-sm font-medium ${
                          t.status === "concluido" ? "line-through text-muted-foreground" : "text-foreground"
                        }`}
                      >
                        {t.titulo}
                      </p>
                    </div>
                    {t.descricao && (
                      <p className="text-[10px] text-muted-foreground ml-6">{t.descricao}</p>
                    )}
                    {t.processo_ref && (
                      <p className="text-[9px] text-primary/70 ml-6 mt-0.5">Ref: {t.processo_ref}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[9px] px-2 py-0.5 border ${prio.color}`}>{prio.label}</span>
                    {t.prazo && (
                      <span
                        className={`text-[10px] flex items-center gap-1 ${
                          isOverdue ? "text-red-400" : "text-muted-foreground"
                        }`}
                      >
                        <Calendar className="h-3 w-3" />
                        {new Date(t.prazo).toLocaleDateString("pt-BR")}
                      </span>
                    )}
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDialog(t)}>
                        <Edit2 className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget(t)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-serif">
              {editingTarefa ? "Editar Tarefa" : "Nova Tarefa"}
            </DialogTitle>
            <DialogDescription>
              {editingTarefa ? "Atualize as informações da tarefa." : "Adicione uma nova tarefa ao seu quadro."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label>Título *</Label>
              <Input
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Ex: Protocolar petição"
              />
            </div>
            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Detalhes da tarefa..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Prioridade</Label>
                <Select value={formData.prioridade} onValueChange={(v) => setFormData({ ...formData, prioridade: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="baixa">Baixa</SelectItem>
                    <SelectItem value="media">Média</SelectItem>
                    <SelectItem value="alta">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Prazo</Label>
                <Input type="date" value={formData.prazo} onChange={(e) => setFormData({ ...formData, prazo: e.target.value })} />
              </div>
              <div>
                <Label>Ref. Processo</Label>
                <Input value={formData.processo_ref} onChange={(e) => setFormData({ ...formData, processo_ref: e.target.value })} placeholder="Nº do processo" />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>Cancelar</Button>
            <Button onClick={handleSave} disabled={saving} className="btn-gold">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              {editingTarefa ? "Atualizar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deleteTarget?.titulo}" será removida permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && handleDelete(deleteTarget)} className="bg-destructive text-destructive-foreground">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
