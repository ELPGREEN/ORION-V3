import { useState, useEffect } from "react";
import {
  Users, Loader2, Search, Mail, Calendar, Shield, User, FileText,
  MessageSquare, ChevronRight, Clock, Phone, Briefcase, Trash2,
  Edit, FolderOpen, Plus, Copy, AlertTriangle, X, Save, Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
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
import { useUserRole } from "@/hooks/useUserRole";
import { useToast } from "@/hooks/use-toast";
import { useNeuralFeedback } from "@/hooks/useNeuralFeedback";

interface UserProfile {
  user_id: string;
  email: string;
  nome: string | null;
  role: string;
  telefone: string | null;
  tipo_caso: string | null;
  status_cliente: string | null;
  created_at: string;
  last_sign_in: string | null;
  provider: string;
}

interface UserDocument {
  id: string;
  title: string;
  document_type: string;
  created_at: string;
  status: string;
  folder_id: string | null;
}

interface UserFolder {
  id: string;
  name: string;
  color: string | null;
  parent_id: string | null;
  client_profile_id: string | null;
  created_at: string;
}

interface UserClientDoc {
  id: string;
  file_name: string;
  file_type: string | null;
  file_size: number | null;
  categoria: string | null;
  created_at: string;
}

interface UserNotificacao {
  id: string;
  titulo: string;
  descricao: string | null;
  tipo: string;
  created_at: string;
  lida: boolean;
}

interface UserDetails {
  documents: UserDocument[];
  folders: UserFolder[];
  client_documents: UserClientDoc[];
  shared_documents: any[];
  notifications: UserNotificacao[];
  profile: any | null;
}

export default function UsuariosPage() {
  const { user } = useAuth();
  const { isAdvogado } = useUserRole();
  const { toast } = useToast();
  const { logNeural } = useNeuralFeedback();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [details, setDetails] = useState<UserDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<UserProfile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [editUser, setEditUser] = useState<UserProfile | null>(null);
  const [editForm, setEditForm] = useState({ nome: "", telefone: "", tipo_caso: "", email: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAdvogado) return;
    fetchUsers();
  }, [isAdvogado]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-api", { body: { action: "list_users" } });
      if (error) throw error;
      setUsers(data?.users || []);
    } catch (err) {
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (userId: string) => {
    setLoadingDetails(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-api", {
        body: { action: "get_user_details", user_id: userId },
      });
      if (error) throw error;
      setDetails(data as UserDetails);
    } catch (err) {
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleUserClick = (u: UserProfile) => {
    setSelectedUser(u);
    fetchUserDetails(u.user_id);
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-api", {
        body: { action: "delete_user", user_id: deleteConfirm.user_id },
      });
      if (error) throw error;
      toast({ title: "Usuário excluído", description: `${deleteConfirm.nome || deleteConfirm.email} foi removido.` });
      // 🧠 Neural: exclusão de usuário = evento administrativo crítico
      logNeural({
        interaction_type: "neural_admin",
        input_text: `Usuário excluído: ${deleteConfirm.email}`,
        output_text: `Nome: ${deleteConfirm.nome || "N/A"} | Role: ${deleteConfirm.role}`,
        quality_score: 0.7,
        user_id: user?.id,
        metadata: { action: "delete_user", target_email: deleteConfirm.email, module: "usuarios" },
      });
      setUsers((prev) => prev.filter((u) => u.user_id !== deleteConfirm.user_id));
      setDeleteConfirm(null);
      setSelectedUser(null);
    } catch (err: any) {
      toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
    } finally {
      setDeleting(false);
    }
  };

  const handleEditOpen = (u: UserProfile) => {
    setEditUser(u);
    setEditForm({
      nome: u.nome || "",
      telefone: u.telefone || "",
      tipo_caso: u.tipo_caso || "",
      email: u.email,
    });
  };

  const handleEditSave = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      const { error } = await supabase.functions.invoke("admin-api", {
        body: {
          action: "update_user",
          user_id: editUser.user_id,
          data: editForm,
        },
      });
      if (error) throw error;
      toast({ title: "Usuário atualizado" });
      // 🧠 Neural: edição de usuário = sinal administrativo
      logNeural({
        interaction_type: "neural_admin",
        input_text: `Usuário atualizado: ${editUser.email}`,
        output_text: `Nome: ${editForm.nome} | Caso: ${editForm.tipo_caso || "N/A"}`,
        quality_score: 0.75,
        user_id: user?.id,
        metadata: { action: "update_user", target_email: editUser.email, module: "usuarios" },
      });
      setUsers((prev) =>
        prev.map((u) =>
          u.user_id === editUser.user_id
            ? { ...u, nome: editForm.nome || u.nome, telefone: editForm.telefone || u.telefone, tipo_caso: editForm.tipo_caso || u.tipo_caso, email: editForm.email || u.email }
            : u
        )
      );
      setEditUser(null);
      if (selectedUser?.user_id === editUser.user_id) {
        setSelectedUser((prev) => prev ? { ...prev, nome: editForm.nome, telefone: editForm.telefone, tipo_caso: editForm.tipo_caso, email: editForm.email } : null);
      }
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast({ title: "ID copiado", description: id });
  };

  const filteredUsers = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      (u.nome?.toLowerCase().includes(q) || false) ||
      u.email.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q) ||
      u.user_id.toLowerCase().includes(q)
    );
  });

  const formatDate = (date: string | null) => {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  const formatBytes = (bytes: number | null) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  if (!isAdvogado) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Acesso restrito a advogados.</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-xl md:text-2xl font-serif text-foreground">Gestão de Usuários</h1>
            <p className="text-xs text-muted-foreground">
              Gerencie usuários, documentos, pastas e permissões.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px]">
          {users.length} usuário(s)
        </Badge>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por nome, e-mail, ID ou tipo..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-card border-border"
        />
      </div>

      {/* Users list */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-card border border-border p-8 text-center">
          <Users className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum usuário encontrado.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filteredUsers.map((u) => (
            <div
              key={u.user_id}
              className="w-full bg-card border border-border p-4 hover:border-primary/30 transition-all flex items-center gap-4"
            >
              <div
                onClick={() => handleUserClick(u)}
                className="flex items-center gap-4 flex-1 min-w-0 text-left cursor-pointer"
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && handleUserClick(u)}
              >
                <div className="h-10 w-10 border border-border flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {u.nome || u.email.split("@")[0]}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                  <span
                    onClick={(e) => { e.stopPropagation(); copyId(u.user_id); }}
                    className="text-[9px] text-muted-foreground/50 hover:text-primary font-mono flex items-center gap-1 mt-0.5 cursor-pointer"
                    role="button"
                    tabIndex={0}
                  >
                    <Copy className="h-2.5 w-2.5" />
                    {u.user_id.slice(0, 8)}...
                  </span>
                </div>
                <div className="hidden sm:flex flex-col items-end gap-1">
                  <p className="text-[9px] text-muted-foreground">
                    Cadastro: {new Date(u.created_at).toLocaleDateString("pt-BR")}
                  </p>
                  {u.last_sign_in && (
                    <p className="text-[9px] text-muted-foreground/60">
                      Último acesso: {new Date(u.last_sign_in).toLocaleDateString("pt-BR")}
                    </p>
                  )}
                </div>
                <span
                  className={`inline-flex items-center border px-2.5 py-0.5 text-[9px] uppercase tracking-wider rounded-full font-semibold ${
                    u.role === "advogado"
                      ? "border-primary/40 text-primary"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  {u.role === "advogado" ? "Advogado" : "Cliente"}
                </span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1 flex-shrink-0">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEditOpen(u)} title="Editar">
                  <Edit className="h-3.5 w-3.5" />
                </Button>
                {u.role !== "advogado" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleteConfirm(u)}
                    title="Excluir"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* User Detail Dialog */}
      <Dialog open={!!selectedUser} onOpenChange={(open) => { if (!open) { setSelectedUser(null); setDetails(null); } }}>
        <DialogContent className="sm:max-w-3xl bg-card border-border max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-foreground">
              <User className="h-5 w-5 text-primary" />
              {selectedUser?.nome || selectedUser?.email.split("@")[0]}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              <button onClick={() => copyId(selectedUser?.user_id || "")} className="font-mono text-[11px] hover:text-primary flex items-center gap-1">
                <Copy className="h-3 w-3" /> ID: {selectedUser?.user_id}
              </button>
            </DialogDescription>
          </DialogHeader>

          {selectedUser && (
            <div className="space-y-4">
              {/* User info */}
              <div className="bg-background border border-border p-4 space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">{selectedUser.email}</span>
                </div>
                {selectedUser.telefone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{selectedUser.telefone}</span>
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="outline" className="text-[10px]">
                    {selectedUser.role === "advogado" ? "Advogado" : "Cliente"}
                  </Badge>
                  <Badge variant="outline" className="text-[10px] ml-1">
                    via {selectedUser.provider}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground text-xs">Cadastro: {formatDate(selectedUser.created_at)}</span>
                </div>
                {selectedUser.last_sign_in && (
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground text-xs">Último acesso: {formatDate(selectedUser.last_sign_in)}</span>
                  </div>
                )}
                {selectedUser.tipo_caso && (
                  <div className="flex items-center gap-2 text-sm">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground text-xs">Caso: {selectedUser.tipo_caso}</span>
                  </div>
                )}
              </div>

              {/* Action bar */}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => handleEditOpen(selectedUser)}>
                  <Edit className="h-3.5 w-3.5 mr-1" /> Editar
                </Button>
                {selectedUser.role !== "advogado" && (
                  <Button variant="outline" size="sm" className="text-destructive border-destructive/30" onClick={() => setDeleteConfirm(selectedUser)}>
                    <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
                  </Button>
                )}
              </div>

              {loadingDetails ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              ) : details ? (
                <Tabs defaultValue="docs">
                  <TabsList className="bg-background border border-border flex-wrap h-auto">
                    <TabsTrigger value="docs" className="text-xs">
                      <FileText className="h-3 w-3 mr-1" />
                      Documentos ({details.documents.length})
                    </TabsTrigger>
                    <TabsTrigger value="folders" className="text-xs">
                      <FolderOpen className="h-3 w-3 mr-1" />
                      Pastas ({details.folders.length})
                    </TabsTrigger>
                    <TabsTrigger value="uploads" className="text-xs">
                      <Plus className="h-3 w-3 mr-1" />
                      Uploads ({details.client_documents.length})
                    </TabsTrigger>
                    <TabsTrigger value="notifs" className="text-xs">
                      <MessageSquare className="h-3 w-3 mr-1" />
                      Notificações ({details.notifications.length})
                    </TabsTrigger>
                  </TabsList>

                  {/* Documents tab */}
                  <TabsContent value="docs" className="space-y-2 mt-3">
                    {details.documents.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhum documento encontrado.</p>
                    ) : (
                      details.documents.map((doc) => (
                        <div key={doc.id} className="bg-background border border-border p-3 flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-foreground truncate">{doc.title}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {doc.document_type} • {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                              {doc.folder_id && " • 📁 Na pasta"}
                            </p>
                            <button onClick={() => copyId(doc.id)} className="text-[9px] font-mono text-muted-foreground/50 hover:text-primary flex items-center gap-0.5">
                              <Copy className="h-2 w-2" /> {doc.id.slice(0, 8)}
                            </button>
                          </div>
                          <Badge variant="outline" className="text-[9px] flex-shrink-0">{doc.status}</Badge>
                        </div>
                      ))
                    )}
                  </TabsContent>

                  {/* Folders tab */}
                  <TabsContent value="folders" className="space-y-2 mt-3">
                    {details.folders.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhuma pasta encontrada.</p>
                    ) : (
                      details.folders.map((folder) => (
                        <div key={folder.id} className="bg-background border border-border p-3 flex items-center gap-3">
                          <FolderOpen className="h-5 w-5 flex-shrink-0" style={{ color: folder.color || "hsl(var(--primary))" }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-foreground">{folder.name}</p>
                            <div className="flex items-center gap-2">
                              <button onClick={() => copyId(folder.id)} className="text-[9px] font-mono text-muted-foreground/50 hover:text-primary flex items-center gap-0.5">
                                <Copy className="h-2 w-2" /> {folder.id.slice(0, 8)}
                              </button>
                              {folder.client_profile_id && (
                                <Badge variant="outline" className="text-[8px]">Vinculada a cliente</Badge>
                              )}
                              {folder.parent_id && (
                                <Badge variant="outline" className="text-[8px]">Subpasta</Badge>
                              )}
                            </div>
                          </div>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(folder.created_at).toLocaleDateString("pt-BR")}
                          </span>
                        </div>
                      ))
                    )}
                  </TabsContent>

                  {/* Client uploads tab */}
                  <TabsContent value="uploads" className="space-y-2 mt-3">
                    {details.client_documents.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhum upload do cliente.</p>
                    ) : (
                      details.client_documents.map((cdoc) => (
                        <div key={cdoc.id} className="bg-background border border-border p-3 flex items-center justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-foreground truncate">{cdoc.file_name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {cdoc.categoria || "geral"} • {formatBytes(cdoc.file_size)} • {new Date(cdoc.created_at).toLocaleDateString("pt-BR")}
                            </p>
                            <button onClick={() => copyId(cdoc.id)} className="text-[9px] font-mono text-muted-foreground/50 hover:text-primary flex items-center gap-0.5">
                              <Copy className="h-2 w-2" /> {cdoc.id.slice(0, 8)}
                            </button>
                          </div>
                          <Badge variant="outline" className="text-[9px] flex-shrink-0">{cdoc.file_type?.split("/")[1] || "file"}</Badge>
                        </div>
                      ))
                    )}
                  </TabsContent>

                  {/* Notifications tab */}
                  <TabsContent value="notifs" className="space-y-2 mt-3">
                    {details.notifications.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-4">Nenhuma notificação.</p>
                    ) : (
                      details.notifications.map((notif) => (
                        <div key={notif.id} className="bg-background border border-border p-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-foreground">{notif.titulo}</p>
                            <Badge variant={notif.lida ? "outline" : "default"} className="text-[8px]">
                              {notif.lida ? "Lida" : "Não lida"}
                            </Badge>
                          </div>
                          {notif.descricao && (
                            <p className="text-[11px] text-muted-foreground mt-0.5">{notif.descricao}</p>
                          )}
                          <p className="text-[10px] text-muted-foreground/60 mt-1">
                            {notif.tipo} • {new Date(notif.created_at).toLocaleDateString("pt-BR")}
                          </p>
                        </div>
                      ))
                    )}
                  </TabsContent>
                </Tabs>
              ) : null}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className="sm:max-w-md bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-primary" /> Editar Usuário
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={editForm.nome} onChange={(e) => setEditForm((p) => ({ ...p, nome: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>E-mail</Label>
              <Input value={editForm.email} onChange={(e) => setEditForm((p) => ({ ...p, email: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <Input value={editForm.telefone} onChange={(e) => setEditForm((p) => ({ ...p, telefone: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Tipo de Caso</Label>
              <Input value={editForm.tipo_caso} onChange={(e) => setEditForm((p) => ({ ...p, tipo_caso: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditUser(null)}>Cancelar</Button>
            <Button className="btn-gold" onClick={handleEditSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Save className="h-4 w-4 mr-1" />}
              Salvar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Excluir Usuário
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir <strong>{deleteConfirm?.nome || deleteConfirm?.email}</strong>?
              Esta ação removerá todos os dados do usuário (documentos, notificações, conversas) e não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deleting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Trash2 className="h-4 w-4 mr-1" />}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
