import { useState, useEffect } from "react";
import {
  Eye,
  Edit,
  Save,
  X,
  Phone,
  Mail,
  FileText,
  Upload,
  Trash2,
  Loader2,
  FolderOpen,
  Download,
  MoreVertical,
  MessageCircle,
  User,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useUserRole } from "@/hooks/useUserRole";

interface ClientProfile {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  telefone: string | null;
  cpf: string | null;
  tipo_caso: string | null;
  descricao_problema: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ClientDocument {
  id: string;
  file_name: string;
  storage_path: string;
  file_type: string | null;
  file_size: number | null;
  categoria: string | null;
  notas: string | null;
  created_at: string;
  source: "upload" | "shared"; // distingue upload do advogado vs documento compartilhado
}

interface SharedDocument {
  id: string;
  document_id: string;
  created_at: string;
  documents: {
    id: string;
    title: string;
    document_type: string;
    content: string;
    created_at: string;
  } | null;
}

const statusOptions = [
  { value: "novo", label: "Novo", color: "bg-blue-500" },
  { value: "em_analise", label: "Em Análise", color: "bg-yellow-500" },
  { value: "aguardando_documentos", label: "Aguardando Documentos", color: "bg-orange-500" },
  { value: "em_atendimento", label: "Em Atendimento", color: "bg-primary" },
  { value: "concluido", label: "Concluído", color: "bg-green-500" },
  { value: "arquivado", label: "Arquivado", color: "bg-muted-foreground" },
];

const categoriaOptions = [
  { value: "geral", label: "Geral" },
  { value: "contrato", label: "Contrato" },
  { value: "procuracao", label: "Procuração" },
  { value: "peticao", label: "Petição" },
  { value: "documento_pessoal", label: "Documento Pessoal" },
  { value: "comprovante", label: "Comprovante" },
  { value: "outros", label: "Outros" },
];

interface ClientFolderDialogProps {
  client: ClientProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export default function ClientFolderDialog({
  client,
  open,
  onOpenChange,
  onUpdate,
}: ClientFolderDialogProps) {
  const [activeTab, setActiveTab] = useState("info");
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadCategoria, setUploadCategoria] = useState("geral");
  const [showUploadTypeSelect, setShowUploadTypeSelect] = useState(false);
  const [pendingUploadFile, setPendingUploadFile] = useState<File | null>(null);
  const [documents, setDocuments] = useState<ClientDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefone: "",
    cpf: "",
    tipo_caso: "",
    descricao_problema: "",
    status: "novo",
  });
  const { toast } = useToast();
  const { user } = useAuth();
  const { isAdvogado } = useUserRole();

  useEffect(() => {
    if (open && client) {
      setFormData({
        nome: client.nome,
        email: client.email,
        telefone: client.telefone || "",
        cpf: client.cpf || "",
        tipo_caso: client.tipo_caso || "",
        descricao_problema: client.descricao_problema || "",
        status: client.status,
      });
      setIsEditing(false);
      loadDocuments();
    }
  }, [open, client]);

  const loadDocuments = async () => {
    if (!client) return;
    setLoadingDocs(true);
    
    // 1. Carrega documentos enviados pelo advogado (client_documents)
    const { data: uploadedDocs, error: uploadError } = await supabase
      .from("client_documents")
      .select("*")
      .eq("client_profile_id", client.id)
      .order("created_at", { ascending: false });

    // 2. Carrega documentos compartilhados (shared_documents -> documents)
    const { data: sharedDocs, error: sharedError } = await supabase
      .from("shared_documents")
      .select(`
        id,
        document_id,
        created_at,
        documents (
          id,
          title,
          document_type,
          content,
          created_at
        )
      `)
      .eq("shared_with", client.user_id)
      .order("created_at", { ascending: false });

    const allDocs: ClientDocument[] = [];

    // Adiciona documentos de upload
    if (!uploadError && uploadedDocs) {
      uploadedDocs.forEach((doc: any) => {
        allDocs.push({
          ...doc,
          source: "upload" as const,
        });
      });
    }

    // Adiciona documentos compartilhados
    if (!sharedError && sharedDocs) {
      sharedDocs.forEach((sd: any) => {
        if (sd.documents) {
          allDocs.push({
            id: sd.id,
            file_name: sd.documents.title,
            storage_path: "",
            file_type: sd.documents.document_type,
            file_size: null,
            categoria: sd.documents.document_type,
            notas: null,
            created_at: sd.created_at,
            source: "shared" as const,
          });
        }
      });
    }

    // Ordena por data
    allDocs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    setDocuments(allDocs);
    setLoadingDocs(false);
  };

  const handleSave = async () => {
    if (!client || !user) return;

    setSaving(true);
    const { error } = await supabase
      .from("client_profiles")
      .update({
        nome: formData.nome,
        email: formData.email,
        telefone: formData.telefone || null,
        cpf: formData.cpf || null,
        tipo_caso: formData.tipo_caso || null,
        descricao_problema: formData.descricao_problema || null,
        status: formData.status,
      })
      .eq("id", client.id);

    setSaving(false);

    if (error) {
      toast({ title: "Erro", description: "Erro ao salvar.", variant: "destructive" });
    } else {
      toast({ title: "Salvo!", description: "Informações atualizadas." });
      setIsEditing(false);
      onUpdate();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !client || !user) return;
    setPendingUploadFile(file);
    setUploadCategoria("geral");
    setShowUploadTypeSelect(true);
    e.target.value = "";
  };

  const handleConfirmUpload = async () => {
    if (!pendingUploadFile || !client || !user) return;

    setShowUploadTypeSelect(false);
    setUploading(true);
    const file = pendingUploadFile;
    const fileName = `clients/${client.id}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(fileName, file);

    if (uploadError) {
      toast({ title: "Erro", description: "Erro ao fazer upload.", variant: "destructive" });
      setUploading(false);
      setPendingUploadFile(null);
      return;
    }

    const { error: insertError } = await supabase.from("client_documents").insert({
      client_profile_id: client.id,
      user_id: user.id,
      file_name: file.name,
      storage_path: fileName,
      file_type: file.type,
      file_size: file.size,
      categoria: uploadCategoria,
    });

    setUploading(false);

    if (insertError) {
      toast({ title: "Erro", description: "Erro ao registrar documento.", variant: "destructive" });
    } else {
      toast({ title: "Upload concluído!", description: file.name });
      loadDocuments();

      // Notify client about the new document
      try {
        if (client.user_id) {
          await supabase.from("notificacoes").insert({
            user_id: client.user_id,
            tipo: "documento",
            titulo: "Novo documento na sua pasta",
            descricao: `O advogado adicionou o documento "${file.name}" (${categoriaOptions.find(c => c.value === uploadCategoria)?.label || uploadCategoria}) à sua pasta.`,
            link: "/dashboard/documentos",
            referencia_tipo: "client_document",
          });
        }
      } catch (notifErr) {
      }
    }

    setPendingUploadFile(null);
  };

  const handleDeleteDoc = async (doc: ClientDocument) => {
    if (doc.source === "shared") {
      // Remove o compartilhamento
      const { error } = await supabase.from("shared_documents").delete().eq("id", doc.id);
      if (error) {
        toast({ title: "Erro", description: "Erro ao remover compartilhamento.", variant: "destructive" });
      } else {
        toast({ title: "Compartilhamento removido" });
        loadDocuments();
      }
    } else {
      // Remove arquivo do storage e registro
      if (doc.storage_path) {
        await supabase.storage.from("documents").remove([doc.storage_path]);
      }
      const { error } = await supabase.from("client_documents").delete().eq("id", doc.id);

      if (error) {
        toast({ title: "Erro", description: "Erro ao excluir.", variant: "destructive" });
      } else {
        toast({ title: "Documento excluído" });
        loadDocuments();
      }
    }
  };

  const handleDownload = async (doc: ClientDocument) => {
    if (doc.source === "shared") {
      // Para documentos compartilhados, redireciona para o editor
      toast({ title: "Documento compartilhado", description: "Visualize na aba de documentos do cliente." });
      return;
    }

    if (!doc.storage_path) {
      toast({ title: "Erro", description: "Caminho do arquivo não encontrado.", variant: "destructive" });
      return;
    }

    const { data } = await supabase.storage
      .from("documents")
      .createSignedUrl(doc.storage_path, 60);

    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    }
  };

  const formatCPF = (cpf: string) => {
    if (!cpf) return "";
    const numbers = cpf.replace(/\D/g, "");
    if (numbers.length !== 11) return cpf;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  };

  const getStatusBadge = (status: string) => {
    const statusInfo = statusOptions.find((s) => s.value === status);
    return (
      <Badge variant="secondary" className={`${statusInfo?.color} text-primary-foreground`}>
        {statusInfo?.label || status}
      </Badge>
    );
  };

  if (!client) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3 text-foreground font-serif">
            <div className="h-10 w-10 bg-primary/10 border border-primary/20 flex items-center justify-center">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <span className="block">{client.nome}</span>
              <span className="text-xs font-normal text-muted-foreground">
                Pasta do Cliente
              </span>
            </div>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info" className="gap-2">
              <User className="h-4 w-4" />
              Informações
            </TabsTrigger>
            <TabsTrigger value="docs" className="gap-2">
              <FolderOpen className="h-4 w-4" />
              Documentos ({documents.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            {isEditing ? (
              <>
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Nome</Label>
                    <Input
                      value={formData.nome}
                      onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">E-mail</Label>
                    <Input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Telefone</Label>
                    <Input
                      value={formData.telefone}
                      onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">CPF</Label>
                    <Input
                      value={formData.cpf}
                      onChange={(e) => setFormData({ ...formData, cpf: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Tipo de Caso</Label>
                    <Input
                      value={formData.tipo_caso}
                      onChange={(e) => setFormData({ ...formData, tipo_caso: e.target.value })}
                      className="h-9"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {statusOptions.map((s) => (
                          <SelectItem key={s.value} value={s.value}>
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Descrição do Problema</Label>
                  <Textarea
                    value={formData.descricao_problema}
                    onChange={(e) =>
                      setFormData({ ...formData, descricao_problema: e.target.value })
                    }
                    rows={4}
                  />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button variant="ghost" size="sm" onClick={() => setIsEditing(false)}>
                    <X className="h-4 w-4 mr-1" />
                    Cancelar
                  </Button>
                  <Button size="sm" className="btn-gold" onClick={handleSave} disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                    Salvar
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Nome</p>
                    <p className="text-sm font-medium">{client.nome}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">CPF</p>
                    <p className="text-sm font-medium">{formatCPF(client.cpf || "")}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">E-mail</p>
                    <a href={`mailto:${client.email}`} className="text-sm text-primary hover:underline">
                      {client.email}
                    </a>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Telefone</p>
                    {client.telefone ? (
                      <a
                        href={`https://wa.me/55${client.telefone.replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        {client.telefone}
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground">-</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Tipo de Caso</p>
                    <p className="text-sm font-medium">{client.tipo_caso || "-"}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Status</p>
                    {getStatusBadge(client.status)}
                  </div>
                </div>

                {client.descricao_problema && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                      Descrição do Problema
                    </p>
                    <div className="p-3 bg-muted/30 border border-border text-sm">
                      {client.descricao_problema}
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between pt-4 border-t border-border">
                  <p className="text-[10px] text-muted-foreground">
                    Cadastrado em {format(new Date(client.created_at), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                      <Edit className="h-4 w-4 mr-1" />
                      Editar
                    </Button>
                    <Button size="sm" className="btn-gold" asChild>
                      <a href={`mailto:${client.email}`}>
                        <Mail className="h-4 w-4 mr-1" />
                        E-mail
                      </a>
                    </Button>
                    {isAdvogado && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4 mr-1" />
                            Excluir
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir cliente?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Isso removerá o cadastro do cliente e tentará apagar os documentos da pasta. Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={async () => {
                                if (!client) return;

                                // Fetch docs to delete from storage
                                const { data: docs } = await supabase
                                  .from("client_documents")
                                  .select("id,storage_path")
                                  .eq("client_profile_id", client.id);

                                const paths = (docs || []).map((d: any) => d.storage_path).filter(Boolean);
                                if (paths.length) {
                                  await supabase.storage.from("documents").remove(paths);
                                }

                                await supabase.from("client_documents").delete().eq("client_profile_id", client.id);

                                const { error: delError } = await supabase
                                  .from("client_profiles")
                                  .delete()
                                  .eq("id", client.id);

                                if (delError) {
                                  toast({
                                    title: "Erro",
                                    description: "Não foi possível excluir o cliente.",
                                    variant: "destructive",
                                  });
                                  return;
                                }

                                toast({ title: "Cliente excluído" });
                                onUpdate();
                                onOpenChange(false);
                              }}
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="docs" className="space-y-4 mt-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                Documentos do cliente ({documents.length})
              </span>
              <label className="cursor-pointer">
                <input
                  type="file"
                  className="hidden"
                  onChange={handleFileSelect}
                  disabled={uploading}
                />
                <Button size="sm" variant="outline" className="btn-outline-gold" asChild>
                  <span>
                    {uploading ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5 mr-1" />
                    )}
                    Upload Documento
                  </span>
                </Button>
              </label>
            </div>

            {/* Upload type selection dialog */}
            {showUploadTypeSelect && pendingUploadFile && (
              <div className="border border-primary/30 bg-card p-4 space-y-3">
                <p className="text-sm font-medium text-foreground">
                  Classificar documento: <span className="text-primary">{pendingUploadFile.name}</span>
                </p>
                <div className="space-y-1.5">
                  <Label className="text-xs">Tipo do Documento</Label>
                  <Select value={uploadCategoria} onValueChange={setUploadCategoria}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categoriaOptions.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => { setShowUploadTypeSelect(false); setPendingUploadFile(null); }}
                  >
                    Cancelar
                  </Button>
                  <Button size="sm" className="btn-gold" onClick={handleConfirmUpload}>
                    <Upload className="h-3.5 w-3.5 mr-1" />
                    Enviar
                  </Button>
                </div>
              </div>
            )}

            {loadingDocs ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : documents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">Nenhum documento na pasta</p>
                <p className="text-xs mt-1">Faça upload de documentos para organizar aqui</p>
              </div>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className={`flex items-center justify-between p-3 border transition-colors ${
                      doc.source === "shared"
                        ? "bg-accent/5 border-accent/20 hover:border-accent/40"
                        : "bg-muted/20 border-border hover:border-primary/30"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className={`h-5 w-5 ${doc.source === "shared" ? "text-accent" : "text-primary"}`} />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate max-w-[240px]">
                            {doc.file_name}
                          </p>
                          {doc.source === "shared" && (
                            <Badge variant="secondary" className="text-[8px] px-1.5 py-0 bg-accent/10 text-accent border-accent/20">
                              Compartilhado
                            </Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground">
                          {format(new Date(doc.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          {doc.file_size && ` • ${(doc.file_size / 1024).toFixed(0)} KB`}
                          {doc.source === "upload" && doc.categoria && ` • ${doc.categoria}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {doc.source === "upload" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDownload(doc)}
                          title="Baixar"
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                      {doc.source === "shared" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-accent"
                          onClick={() => handleDownload(doc)}
                          title="Ver documento"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteDoc(doc)}
                        title={doc.source === "shared" ? "Remover compartilhamento" : "Excluir"}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

// Action menu for table rows
interface ClientActionsMenuProps {
  client: ClientProfile;
  onViewFolder: () => void;
  onEdit: () => void;
}

export function ClientActionsMenu({ client, onViewFolder, onEdit }: ClientActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={onViewFolder}>
          <FolderOpen className="h-4 w-4 mr-2" />
          Ver Pasta do Cliente
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onEdit}>
          <Edit className="h-4 w-4 mr-2" />
          Editar Informações
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href={`mailto:${client.email}`}>
            <Mail className="h-4 w-4 mr-2" />
            Enviar E-mail
          </a>
        </DropdownMenuItem>
        {client.telefone && (
          <DropdownMenuItem asChild>
            <a
              href={`https://wa.me/55${client.telefone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="h-4 w-4 mr-2" />
              WhatsApp
            </a>
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
