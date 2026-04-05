import { useState } from "react";
import { Eye, Edit, Save, X, Phone, Mail, Building, FileText, Upload, Trash2, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Contact {
  id: string;
  nome: string;
  email: string;
  empresa: string | null;
  telefone: string | null;
  notas: string | null;
}

interface ContactDocument {
  id: string;
  file_name: string;
  storage_path: string;
  file_type: string | null;
  file_size: number | null;
  created_at: string;
}

interface ContactDetailsDialogProps {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdate: () => void;
}

export default function ContactDetailsDialog({
  contact,
  open,
  onOpenChange,
  onUpdate,
}: ContactDetailsDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState<ContactDocument[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    empresa: "",
    telefone: "",
    notas: "",
  });
  const { toast } = useToast();
  const { user } = useAuth();

  const loadDocuments = async () => {
    if (!contact || contact.id.startsWith("pre-")) return;
    setLoadingDocs(true);
    const { data, error } = await supabase
      .from("contact_documents")
      .select("*")
      .eq("contact_id", contact.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setDocuments(data as ContactDocument[]);
    }
    setLoadingDocs(false);
  };

  const handleOpen = (isOpen: boolean) => {
    if (isOpen && contact) {
      setFormData({
        nome: contact.nome,
        email: contact.email,
        empresa: contact.empresa || "",
        telefone: contact.telefone || "",
        notas: contact.notas || "",
      });
      setIsEditing(false);
      loadDocuments();
    }
    onOpenChange(isOpen);
  };

  const handleSave = async () => {
    if (!contact || !user || contact.id.startsWith("pre-")) {
      toast({
        title: "Erro",
        description: "Importe os contatos antes de editar.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("contacts")
      .update({
        nome: formData.nome,
        email: formData.email,
        empresa: formData.empresa || null,
        telefone: formData.telefone || null,
        notas: formData.notas || null,
      })
      .eq("id", contact.id);

    setSaving(false);

    if (error) {
      toast({ title: "Erro", description: "Erro ao salvar.", variant: "destructive" });
    } else {
      toast({ title: "Salvo!", description: "Contato atualizado com sucesso." });
      setIsEditing(false);
      onUpdate();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !contact || !user || contact.id.startsWith("pre-")) return;

    setUploading(true);
    const fileName = `${contact.id}/${Date.now()}-${file.name}`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(fileName, file);

    if (uploadError) {
      toast({ title: "Erro", description: "Erro ao fazer upload.", variant: "destructive" });
      setUploading(false);
      return;
    }

    const { error: insertError } = await supabase.from("contact_documents").insert({
      contact_id: contact.id,
      user_id: user.id,
      file_name: file.name,
      storage_path: fileName,
      file_type: file.type,
      file_size: file.size,
    });

    setUploading(false);

    if (insertError) {
      toast({ title: "Erro", description: "Erro ao registrar documento.", variant: "destructive" });
    } else {
      toast({ title: "Upload concluído!", description: file.name });
      loadDocuments();
    }

    e.target.value = "";
  };

  const handleDeleteDoc = async (doc: ContactDocument) => {
    const { error: storageError } = await supabase.storage
      .from("documents")
      .remove([doc.storage_path]);

    if (storageError) {
    }

    const { error } = await supabase.from("contact_documents").delete().eq("id", doc.id);

    if (error) {
      toast({ title: "Erro", description: "Erro ao excluir documento.", variant: "destructive" });
    } else {
      toast({ title: "Documento excluído" });
      loadDocuments();
    }
  };

  const handleDownload = async (doc: ContactDocument) => {
    const { data } = await supabase.storage
      .from("documents")
      .createSignedUrl(doc.storage_path, 60);

    if (data?.signedUrl) {
      window.open(data.signedUrl, "_blank");
    }
  };

  if (!contact) return null;

  const isPre = contact.id.startsWith("pre-");

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <div className="h-8 w-8 bg-primary/10 border border-primary/20 flex items-center justify-center">
              <span className="text-sm font-serif text-primary">{contact.nome.charAt(0)}</span>
            </div>
            {contact.nome}
          </DialogTitle>
          <DialogDescription className="sr-only">Detalhes do contato</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="info" className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="info">Informações</TabsTrigger>
            <TabsTrigger value="docs">Documentos</TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-4 mt-4">
            {isEditing ? (
              <>
                <div className="space-y-3">
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
                    <Label className="text-xs">Empresa</Label>
                    <Input
                      value={formData.empresa}
                      onChange={(e) => setFormData({ ...formData, empresa: e.target.value })}
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
                    <Label className="text-xs">Notas</Label>
                    <Textarea
                      value={formData.notas}
                      onChange={(e) => setFormData({ ...formData, notas: e.target.value })}
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditing(false)}
                    disabled={saving}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    className="btn-gold"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-1" />}
                    Salvar
                  </Button>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-foreground">{contact.email}</span>
                  </div>
                  {contact.empresa && (
                    <div className="flex items-center gap-2 text-sm">
                      <Building className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">{contact.empresa}</span>
                    </div>
                  )}
                  {contact.telefone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-foreground">{contact.telefone}</span>
                    </div>
                  )}
                  {contact.notas && (
                    <div className="mt-3 p-3 bg-muted/30 border border-border text-xs text-muted-foreground">
                      {contact.notas}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsEditing(true)}
                    disabled={isPre}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                  <Button size="sm" className="btn-gold" asChild>
                    <a href={`mailto:${contact.email}`}>
                      <Mail className="h-4 w-4 mr-1" />
                      Enviar E-mail
                    </a>
                  </Button>
                </div>
                {isPre && (
                  <div className="space-y-2">
                    <p className="text-[10px] text-muted-foreground text-center">
                      Este contato é pré-carregado. Para editar ou anexar documentos, primeiro importe-o.
                    </p>
                    <div className="flex justify-center">
                      <Button
                        size="sm"
                        className="btn-gold"
                        onClick={async () => {
                          if (!user || !contact) return;
                          const { error } = await supabase.from("contacts").insert({
                            user_id: user.id,
                            name: contact.nome,
                            email: contact.email,
                            company: contact.empresa || null,
                            message: contact.notas || "",
                          });

                          if (error) {
                            toast({
                              title: "Erro",
                              description: "Não foi possível importar este contato.",
                              variant: "destructive",
                            });
                            return;
                          }

                          toast({
                            title: "Contato importado!",
                            description: "Reabra o contato para editar e anexar documentos.",
                          });
                          onUpdate();
                          onOpenChange(false);
                        }}
                      >
                        Importar este contato
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          <TabsContent value="docs" className="space-y-4 mt-4">
            {isPre ? (
              <p className="text-xs text-muted-foreground text-center py-6">
                Importe os contatos para adicionar documentos.
              </p>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    Documentos do contato ({documents.length})
                  </span>
                  <label className="cursor-pointer">
                    <input
                      type="file"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={uploading}
                    />
                    <Button size="sm" variant="outline" className="btn-outline-gold" asChild>
                      <span>
                        {uploading ? (
                          <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />
                        ) : (
                          <Upload className="h-3.5 w-3.5 mr-1" />
                        )}
                        Upload
                      </span>
                    </Button>
                  </label>
                </div>

                {loadingDocs ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : documents.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">
                    Nenhum documento anexado.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="flex items-center justify-between p-3 bg-muted/20 border border-border hover:border-primary/30 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary" />
                          <div>
                            <p className="text-xs font-medium text-foreground truncate max-w-[200px]">
                              {doc.file_name}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                              {doc.file_size && ` • ${(doc.file_size / 1024).toFixed(0)} KB`}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleDownload(doc)}
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteDoc(doc)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
