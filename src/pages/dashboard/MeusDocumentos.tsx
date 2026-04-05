import { useEffect, useState, useCallback } from "react";
import { useRefreshOnFocus } from "@/hooks/useRefreshOnFocus";
import { useNeuralFeedback } from "@/hooks/useNeuralFeedback";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  FileText,
  Download,
  Trash2,
  Search,
  FolderOpen,
  Sparkles,
  Pencil,
  ExternalLink,
  CheckCircle,
  Clock,
  ArrowLeft,
  Loader2,
  Calendar,
  PenTool,
  Share2,
  Upload,
  FolderPlus,
  ChevronLeft,
  MoreHorizontal,
  FolderInput,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { downloadHTMLAsPDF } from "@/lib/generators";
import { documentTypes } from "@/pages/dashboard/GerarDocumento";
import { SignatureDialog } from "@/components/dashboard/SignatureDialog";
import { ShareDocumentDialog } from "@/components/dashboard/ShareDocumentDialog";
import { CreateFolderDialog } from "@/components/dashboard/documents/CreateFolderDialog";
import { RenameFolderDialog } from "@/components/dashboard/documents/RenameFolderDialog";
import { UploadDocumentDialog } from "@/components/dashboard/documents/UploadDocumentDialog";
import { ClientUploadDialog } from "@/components/dashboard/clients/ClientUploadDialog";
import { FolderTree, FolderItem } from "@/components/dashboard/documents/FolderTree";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

interface Document {
  id: string;
  title: string;
  document_type: string | null;
  content: string | null;
  parties_author: string | null;
  parties_defendant: string | null;
  case_number: string | null;
  watermark: string | null;
  signature_status: string | null;
  created_at: string;
  updated_at: string;
  user_id: string;
  folder_id: string | null;
  pdf_url: string | null;
  metadata?: {
    storage_path?: string;
    original_filename?: string;
    file_size?: number;
    file_type?: string;
  } | null;
}

interface SignatureInfo {
  documentId: string;
  envelopeId: string;
  signerStatus: string; // "assinado" | "pendente" | etc
}

export default function MeusDocumentos() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user } = useAuth();
  const { isCliente, isAdvogado, loading: roleLoading } = useUserRole();
  const { logNeural } = useNeuralFeedback();
  
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<FolderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [signatureDoc, setSignatureDoc] = useState<{ id: string; title: string } | null>(null);
  const [shareDoc, setShareDoc] = useState<{ id: string; title: string } | null>(null);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [clientUploadOpen, setClientUploadOpen] = useState(false);
  const [clientProfileId, setClientProfileId] = useState<string | null>(null);
  const [moveDocDialog, setMoveDocDialog] = useState<Document | null>(null);
  const [moveToFolderId, setMoveToFolderId] = useState<string>("root");
  const [deleteFolderConfirm, setDeleteFolderConfirm] = useState<string | null>(null);
  const [renameFolderData, setRenameFolderData] = useState<{ id: string; name: string; client_profile_id?: string | null } | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  // Client category folder navigation
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [signatureMap, setSignatureMap] = useState<Map<string, SignatureInfo>>(new Map());
  const [signingNow, setSigningNow] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchFolders();
      fetchDocuments();
      if (isCliente) {
        fetchClientProfile();
      }
    }
  }, [user, isCliente, isAdvogado]);

  useEffect(() => {
    const searchFromUrl = searchParams.get("search");
    if (searchFromUrl !== null) {
      setSearch(searchFromUrl);
    }
  }, [searchParams]);

  useRefreshOnFocus(useCallback(() => { if (user) { fetchFolders(); fetchDocuments(); } }, [user]));

  const fetchClientProfile = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("client_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      setClientProfileId(data.id);
    }
  };

  const fetchFolders = async () => {
    if (!user || isCliente) return;
    
    const { data, error } = await supabase
      .from("document_folders")
      .select("*")
      .order("name");

    if (error) {
    } else {
      setFolders((data as FolderItem[]) || []);
    }
  };

  const fetchDocuments = async () => {
    setLoading(true);
    
    if (isCliente && user) {
      const { data: sharedDocs, error } = await supabase
        .from("shared_documents")
        .select(`
          document_id,
          created_at,
          documents (*)
        `)
        .eq("shared_with", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        toast({ title: "Erro ao carregar documentos", variant: "destructive" });
      } else {
        const docs = sharedDocs
          ?.map((sd: any) => sd.documents)
          .filter(Boolean) as Document[] || [];
        setDocuments(docs);

        // Fetch signature envelopes for these documents
        if (docs.length > 0 && user.email) {
          const docIds = docs.map(d => d.id);
          const { data: envelopes } = await supabase
            .from("signature_envelopes")
            .select("*")
            .in("document_id", docIds);

          if (envelopes) {
            const sigMap = new Map<string, SignatureInfo>();
            envelopes.forEach((env: any) => {
              const signersList = env.signers as any[];
              const mySigner = Array.isArray(signersList) && signersList.find(
                (s: any) => s.email?.toLowerCase() === user.email!.toLowerCase()
              );
              if (mySigner && env.document_id) {
                sigMap.set(env.document_id, {
                  documentId: env.document_id,
                  envelopeId: env.id,
                  signerStatus: mySigner.status || "pendente",
                });
              }
            });
            setSignatureMap(sigMap);
          }
        }
      }
    } else {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        toast({ title: "Erro ao carregar documentos", variant: "destructive" });
      } else {
        setDocuments((data as unknown as Document[]) || []);
      }
    }
    setLoading(false);
  };

  const handleSignNow = async (envelopeId: string) => {
    setSigningNow(envelopeId);
    try {
      const { data, error } = await supabase.functions.invoke("clicksign-signature", {
        body: { action: "get-signing-url", envelope_id: envelopeId },
      });
      if (error) throw error;
      if (data?.signing_url) {
        window.open(data.signing_url, "_blank");
      } else if (data?.needs_resend) {
        toast({ title: "Ação necessária", description: data.error || "Verifique seu e-mail ou peça para reenviar a notificação." });
      } else {
        throw new Error(data?.error || "URL de assinatura não disponível");
      }
    } catch (e: any) {
      toast({ title: "Erro", description: e.message || "Não foi possível obter URL de assinatura.", variant: "destructive" });
    }
    setSigningNow(null);
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    const docToDelete = documents.find((d) => d.id === id);
    const { error } = await supabase.from("documents").delete().eq("id", id);

    if (error) {
      toast({ title: "Erro ao excluir", variant: "destructive" });
    } else {
      setDocuments((prev) => prev.filter((d) => d.id !== id));
      toast({ title: "Documento excluído" });
      // ─── Neural: registra exclusão como sinal negativo de qualidade ───
      if (docToDelete) {
        logNeural({
          interaction_type: "document_deleted",
          input_text: `Documento excluído: ${docToDelete.title} (${docToDelete.document_type})`,
          output_text: docToDelete.content?.substring(0, 500) || "",
          quality_score: 0.2, // Sinal negativo — documento foi descartado
          user_id: user?.id,
          metadata: {
            document_id: id,
            document_type: docToDelete.document_type,
            status: docToDelete.document_type || "unknown",
            source: "meus_documentos_delete",
          },
        });
      }
    }
    setDeleting(null);
  };

  const handleDeleteFolder = async (folderId: string) => {
    const { error } = await supabase
      .from("document_folders")
      .delete()
      .eq("id", folderId);

    if (error) {
      toast({ title: "Erro ao excluir pasta", variant: "destructive" });
    } else {
      setFolders((prev) => prev.filter((f) => f.id !== folderId));
      if (selectedFolderId === folderId) {
        setSelectedFolderId(null);
      }
      toast({ title: "Pasta excluída" });
    }
    setDeleteFolderConfirm(null);
  };

  const handleOpenRenameFolder = (folderId: string) => {
    const folder = folders.find((f) => f.id === folderId);
    if (folder) {
      setRenameFolderData({ 
        id: folder.id, 
        name: folder.name,
        client_profile_id: folder.client_profile_id
      });
    }
  };

  const handleMoveDocument = async () => {
    if (!moveDocDialog) return;

    const newFolderId = moveToFolderId === "root" ? null : moveToFolderId;
    
    const { error } = await supabase
      .from("documents")
      .update({ folder_id: newFolderId })
      .eq("id", moveDocDialog.id);

    if (error) {
      toast({ title: "Erro ao mover documento", variant: "destructive" });
    } else {
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === moveDocDialog.id ? { ...d, folder_id: newFolderId } : d
        )
      );
      toast({ title: "Documento movido" });
    }
    setMoveDocDialog(null);
  };

  const handleDownload = async (doc: Document) => {
    // Try to download from storage first (pdf_url or metadata.storage_path)
    const storagePath = doc.pdf_url || doc.metadata?.storage_path;
    if (storagePath) {
      try {
        const { data: signedUrlData, error } = await supabase.storage
          .from("documents")
          .createSignedUrl(storagePath, 3600);
        
        if (!error && signedUrlData?.signedUrl) {
          window.open(signedUrlData.signedUrl, "_blank");
          toast({ title: "Download iniciado!" });
          // ─── Neural: download = sinal positivo de uso do documento ───
          logNeural({
            interaction_type: "document_viewed",
            input_text: `Download: ${doc.title} (${doc.document_type})`,
            output_text: doc.content?.substring(0, 300) || "",
            quality_score: 0.75,
            user_id: user?.id,
            metadata: { document_id: doc.id, document_type: doc.document_type, source: "meus_documentos_download" },
          });
          return;
        }
      } catch (e) {
      }
    }

    // Fallback: regenerate PDF from content (preserve HTML for formatting)
    const typeLabel = documentTypes.find((t) => t.id === doc.document_type)?.label || doc.document_type;
    await downloadHTMLAsPDF({
      content: doc.content,
      watermark: doc.watermark || "none",
      fileName: `${typeLabel.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}-${Date.now()}.pdf`,
      documentType: doc.document_type,
    });
    toast({ title: "PDF baixado!" });
    // ─── Neural: PDF gerado = sinal positivo ───
    logNeural({
      interaction_type: "document_viewed",
      input_text: `PDF gerado: ${doc.title} (${doc.document_type})`,
      output_text: doc.content?.substring(0, 300) || "",
      quality_score: 0.8,
      user_id: user?.id,
      metadata: { document_id: doc.id, document_type: doc.document_type, source: "meus_documentos_pdf" },
    });
  };

  // Filter documents
  const filtered = documents.filter((doc) => {
    const matchesSearch =
      !search ||
      doc.title.toLowerCase().includes(search.toLowerCase()) ||
      doc.parties_author?.toLowerCase().includes(search.toLowerCase()) ||
      doc.parties_defendant?.toLowerCase().includes(search.toLowerCase());
    const matchesType = !filterType || doc.document_type === filterType;
    const matchesFolder =
      selectedFolderId === null || doc.folder_id === selectedFolderId || (isCliente && !doc.folder_id);
    return matchesSearch && matchesType && matchesFolder;
  });

  // Compute document counts per folder
  const documentCounts = documents.reduce<Record<string, number>>((acc, doc) => {
    if (doc.folder_id) {
      acc[doc.folder_id] = (acc[doc.folder_id] || 0) + 1;
    }
    return acc;
  }, {});

  const uploadTypeLabels: Record<string, string> = {
    upload: "Arquivo",
    contrato: "Contrato",
    procuracao: "Procuração",
    peticao: "Petição",
    parecer: "Parecer",
    relatorio: "Relatório",
    recibo: "Recibo",
    notificacao: "Notificação",
    outros: "Outros",
  };

  const categoryIcons: Record<string, string> = {
    contrato: "📋",
    procuracao: "📜",
    peticao: "⚖️",
    parecer: "📝",
    relatorio: "📊",
    recibo: "🧾",
    notificacao: "🔔",
    upload: "📁",
    outros: "📄",
  };

  const getTypeLabel = (typeId: string) =>
    documentTypes.find((t) => t.id === typeId)?.label || uploadTypeLabels[typeId] || typeId;

  const getSignatureStatusBadge = (status: string | null) => {
    switch (status) {
      case "assinado":
        return <span className="text-[9px] px-1.5 py-0.5 bg-accent/10 text-accent border border-accent/20 flex items-center gap-1" title="Este documento foi assinado digitalmente"><CheckCircle className="h-3 w-3" />Assinado ✓</span>;
      case "pendente":
        return <span className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20 flex items-center gap-1 animate-pulse" title="Aguardando assinatura digital — clique em 'Assinar' para concluir"><PenTool className="h-3 w-3" />Aguardando Assinatura</span>;
      case "recusado":
        return <span className="text-[9px] px-1.5 py-0.5 bg-destructive/10 text-destructive border border-destructive/20">Recusado</span>;
      default:
        return null;
    }
  };

  // Group documents by category for client view
  const categorizedDocs = documents.reduce<Record<string, Document[]>>((acc, doc) => {
    const cat = uploadTypeLabels[doc.document_type] ? doc.document_type : "outros";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(doc);
    return acc;
  }, {});

  const categoryList = Object.entries(categorizedDocs).map(([key, docs]) => {
    const pendingCount = docs.filter(d => {
      const sig = signatureMap.get(d.id);
      return sig && sig.signerStatus !== "assinado";
    }).length;
    return { key, label: uploadTypeLabels[key] || key, docs, pendingCount, icon: categoryIcons[key] || "📄" };
  });

  const selectedCategoryDocs = selectedCategory ? (categorizedDocs[selectedCategory] || []) : [];

  const currentFolder = folders.find((f) => f.id === selectedFolderId);

  const getFolderPath = (folderId: string | null): string => {
    if (!folderId) return "Todos os Documentos";
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return "";
    if (!folder.parent_id) return folder.name;
    return `${getFolderPath(folder.parent_id)} / ${folder.name}`;
  };

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto animate-fade-in">
      <div className="flex gap-6">
        {/* Sidebar - Folders */}
        {isAdvogado && showSidebar && (
          <div className="w-56 flex-shrink-0">
            <div className="bg-card border border-border rounded-lg p-3 sticky top-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-medium text-foreground">Pastas</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setCreateFolderOpen(true)}
                  title="Nova pasta"
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                </Button>
              </div>
              <FolderTree
                folders={folders}
                selectedFolderId={selectedFolderId}
                onSelectFolder={setSelectedFolderId}
                onDeleteFolder={(id) => setDeleteFolderConfirm(id)}
                onRenameFolder={handleOpenRenameFolder}
                onCreateSubfolder={(parentId) => {
                  setSelectedFolderId(parentId);
                  setCreateFolderOpen(true);
                }}
                documentCounts={documentCounts}
                totalDocuments={documents.length}
              />
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="flex-1 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isAdvogado && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 md:hidden"
                  onClick={() => setShowSidebar(!showSidebar)}
                >
                  <FolderOpen className="h-4 w-4" />
                </Button>
              )}
              <div>
                <h1 className="text-xl md:text-2xl font-serif text-foreground">
                  {isCliente ? "Documentos Recebidos" : "Meus Documentos"}
                </h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isCliente
                    ? selectedCategory
                      ? `📂 ${uploadTypeLabels[selectedCategory] || selectedCategory}`
                      : `${documents.length} documento(s) disponível(is)`
                    : selectedFolderId
                    ? `📂 ${getFolderPath(selectedFolderId)}`
                    : `${filtered.length} documento(s) salvos`}
                </p>
              </div>
            </div>
            {isAdvogado && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => setUploadOpen(true)}
                >
                  <Upload className="h-3.5 w-3.5 mr-1" />
                  Upload
                </Button>
                <Button
                  className="btn-gold text-xs"
                  onClick={() => navigate("/dashboard/gerar-documento")}
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Novo Documento
                </Button>
              </div>
            )}
            {isCliente && clientProfileId && (
              <Button
                size="sm"
                className="btn-gold text-xs"
                onClick={() => setClientUploadOpen(true)}
              >
                <Upload className="h-3.5 w-3.5 mr-1" />
                Enviar Documento
              </Button>
            )}
          </div>

          {/* Client: Category Folders View */}
          {isCliente ? (
            <>
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : selectedCategory ? (
                /* Inside a category folder */
                <div className="space-y-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground hover:text-foreground"
                    onClick={() => setSelectedCategory(null)}
                  >
                    <ArrowLeft className="h-3.5 w-3.5 mr-1" />
                    Voltar às Pastas
                  </Button>
                  <h2 className="text-lg font-serif text-foreground flex items-center gap-2">
                    {categoryIcons[selectedCategory] || "📄"} {uploadTypeLabels[selectedCategory] || selectedCategory}
                    <span className="text-xs text-muted-foreground font-normal">({selectedCategoryDocs.length} documento(s))</span>
                  </h2>
                  
                  {/* Search within category */}
                  <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar nesta categoria..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="pl-10 bg-card border-border h-9 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    {selectedCategoryDocs
                      .filter(doc => !search || doc.title.toLowerCase().includes(search.toLowerCase()))
                      .map((doc) => {
                        const sigInfo = signatureMap.get(doc.id);
                        const sigStatus = sigInfo?.signerStatus || null;
                        return (
                          <div
                            key={doc.id}
                            className="bg-card border border-border p-4 hover-gold-glow transition-all group"
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3 flex-1 min-w-0">
                                <div className="h-9 w-9 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                                  <FileText className="h-4 w-4 text-primary" />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="text-sm font-medium text-foreground truncate">
                                      {doc.title}
                                    </h3>
                                    {sigStatus && sigStatus !== "pendente" && getSignatureStatusBadge(sigStatus)}
                                  </div>
                                  <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Calendar className="h-3 w-3" />
                                      {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-1">
                                {sigInfo && sigStatus === "pendente" && (
                                  <Button
                                    size="sm"
                                    className="btn-gold text-[10px] h-7"
                                    disabled={signingNow === sigInfo.envelopeId}
                                    onClick={() => handleSignNow(sigInfo.envelopeId)}
                                  >
                                    {signingNow === sigInfo.envelopeId ? (
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                    ) : (
                                      <ExternalLink className="h-3 w-3 mr-1" />
                                    )}
                                    Assinar
                                  </Button>
                                )}
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                  title="Baixar PDF"
                                  onClick={() => handleDownload(doc)}
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              ) : categoryList.length === 0 ? (
                <div className="bg-card border border-border p-12 flex flex-col items-center justify-center text-center">
                  <FolderOpen className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="text-sm text-muted-foreground mb-1">Nenhum documento disponível</p>
                  <p className="text-xs text-muted-foreground/60">
                    Documentos enviados pelo advogado aparecerão aqui organizados por categoria.
                  </p>
                </div>
              ) : (
                /* Category folder grid */
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {categoryList.map((cat) => (
                    <button
                      key={cat.key}
                      onClick={() => { setSelectedCategory(cat.key); setSearch(""); }}
                      className="bg-card border border-border p-5 text-left hover-gold-glow transition-all group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 border border-primary/20 flex items-center justify-center text-2xl flex-shrink-0">
                          {cat.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-foreground">{cat.label}</h3>
                          <p className="text-[11px] text-muted-foreground">
                            {cat.docs.length} documento(s)
                          </p>
                          {cat.pendingCount > 0 && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-primary/10 text-primary border border-primary/20 inline-flex items-center gap-1 mt-1 animate-pulse" title="Documentos aguardando sua assinatura digital">
                              <PenTool className="h-3 w-3" />
                              {cat.pendingCount} aguardando assinatura
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          ) : (
            <>
              {/* Filters - Advogado only */}
              <div className="flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por título, partes..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10 bg-card border-border h-9 text-sm"
                  />
                </div>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="bg-card border border-border px-3 py-2 text-xs text-foreground h-9 rounded-md"
                >
                  <option value="">Todos os tipos</option>
                  <option value="upload">Uploads</option>
                  {documentTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Documents List */}
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="bg-card border border-border p-12 flex flex-col items-center justify-center text-center">
                  <FolderOpen className="h-12 w-12 text-muted-foreground/30 mb-4" />
                  <p className="text-sm text-muted-foreground mb-1">
                    {selectedFolderId
                      ? `Pasta "${getFolderPath(selectedFolderId)}" está vazia`
                      : search || filterType
                      ? "Nenhum documento encontrado com esses filtros"
                      : "Nenhum documento salvo"}
                  </p>
                  <p className="text-xs text-muted-foreground/60 mb-4">
                    {selectedFolderId
                      ? "Salve documentos nesta pasta ao gerá-los ou mova documentos existentes."
                      : "Gere ou faça upload de um documento."}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => setUploadOpen(true)}
                    >
                      <Upload className="h-3 w-3 mr-1" />
                      Upload nesta pasta
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => navigate("/dashboard/gerar-documento")}
                    >
                      <Sparkles className="h-3 w-3 mr-1" />
                      Gerar com IA
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {filtered.map((doc) => (
                    <div
                      key={doc.id}
                      className="bg-card border border-border p-4 hover-gold-glow transition-all group"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          <div className="h-9 w-9 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <FileText className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-medium text-foreground truncate">
                                {doc.title}
                              </h3>
                              <span className="text-[9px] px-1.5 py-0.5 border border-border text-muted-foreground">
                                {getTypeLabel(doc.document_type)}
                              </span>
                              {doc.signature_status && doc.signature_status !== "pendente" && getSignatureStatusBadge(doc.signature_status)}
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-[10px] text-muted-foreground">
                              {doc.parties_author && (
                                <span>Parte 1: {doc.parties_author}</span>
                              )}
                              {doc.parties_defendant && (
                                <span>Parte 2: {doc.parties_defendant}</span>
                              )}
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-accent"
                            title="Compartilhar com Cliente"
                            onClick={() => setShareDoc({ id: doc.id, title: doc.title })}
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-primary"
                            title="Enviar para Assinatura"
                            onClick={() => setSignatureDoc({ id: doc.id, title: doc.title })}
                          >
                            <PenTool className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            title="Editar documento"
                            onClick={() => navigate(`/dashboard/gerar-documento?doc=${doc.id}`)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground"
                            title="Baixar PDF"
                            onClick={() => handleDownload(doc)}
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground"
                              >
                                <MoreHorizontal className="h-3.5 w-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setMoveDocDialog(doc)}>
                                <FolderInput className="h-4 w-4 mr-2" />
                                Mover para pasta
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDelete(doc.id)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <SignatureDialog
        open={!!signatureDoc}
        onOpenChange={(open) => { if (!open) setSignatureDoc(null); }}
        documentTitle={signatureDoc?.title || ""}
        documentId={signatureDoc?.id}
        onSuccess={() => {
          setSignatureDoc(null);
          fetchDocuments();
          toast({ title: "Enviado para assinatura!", description: "Acompanhe em Assinatura Digital." });
        }}
      />

      <ShareDocumentDialog
        open={!!shareDoc}
        onOpenChange={(open) => { if (!open) setShareDoc(null); }}
        documentId={shareDoc?.id || ""}
        documentTitle={shareDoc?.title || ""}
        onSuccess={() => {
          setShareDoc(null);
          toast({ title: "Documento compartilhado!", description: "O cliente foi notificado." });
        }}
      />

      <CreateFolderDialog
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
        onSuccess={() => {
          fetchFolders();
        }}
        folders={folders}
        parentId={selectedFolderId}
      />

      <RenameFolderDialog
        open={!!renameFolderData}
        onOpenChange={(open) => { if (!open) setRenameFolderData(null); }}
        folderId={renameFolderData?.id || ""}
        currentName={renameFolderData?.name || ""}
        linkedClientId={renameFolderData?.client_profile_id}
        onSuccess={() => {
          fetchFolders();
          setRenameFolderData(null);
        }}
      />

      {/* Client Upload Dialog */}
      {clientProfileId && (
        <ClientUploadDialog
          open={clientUploadOpen}
          onOpenChange={setClientUploadOpen}
          clientProfileId={clientProfileId}
          onSuccess={() => {
            fetchDocuments();
            toast({ title: "Documento enviado!", description: "O advogado foi notificado." });
          }}
        />
      )}

      <UploadDocumentDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onSuccess={() => {
          fetchDocuments();
          setUploadOpen(false);
        }}
        folders={folders}
        currentFolderId={selectedFolderId}
      />

      {/* Move Document Dialog */}
      <AlertDialog open={!!moveDocDialog} onOpenChange={() => setMoveDocDialog(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mover Documento</AlertDialogTitle>
            <AlertDialogDescription>
              Selecione a pasta de destino para "{moveDocDialog?.title}"
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Select value={moveToFolderId} onValueChange={setMoveToFolderId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a pasta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="root">📁 Raiz (sem pasta)</SelectItem>
                {folders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    📂 {getFolderPath(folder.id)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleMoveDocument} className="btn-gold">
              Mover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Folder Confirmation */}
      <AlertDialog open={!!deleteFolderConfirm} onOpenChange={() => setDeleteFolderConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Pasta?</AlertDialogTitle>
            <AlertDialogDescription>
              A pasta será excluída permanentemente. Os documentos dentro dela serão movidos para a raiz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteFolderConfirm && handleDeleteFolder(deleteFolderConfirm)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
