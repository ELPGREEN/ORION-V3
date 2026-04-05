import { useState, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Upload, FileText, X, CheckCircle, CreditCard, Home, FileCheck, Briefcase, Globe, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { autoShareDocumentWithFolderClient } from "@/hooks/useAutoShareDocument";
import { sanitizeStorageFileName } from "@/lib/utils";

const CATEGORIA_GROUPS = [
  {
    group: "Documentos Pessoais",
    items: [
      { value: "identidade", label: "RG / CNH / Identidade", icon: CreditCard },
      { value: "cpf", label: "CPF — Cadastro de Pessoa Física", icon: CreditCard },
      { value: "passaporte", label: "Passaporte", icon: Globe },
      { value: "ctps", label: "CTPS — Carteira de Trabalho", icon: Briefcase },
      { value: "comprovante_residencia", label: "Comprovante de Residência", icon: Home },
      { value: "certidao_nascimento", label: "Certidão de Nascimento", icon: FileCheck },
      { value: "certidao_casamento", label: "Certidão de Casamento", icon: Users },
      { value: "certidao_obito", label: "Certidão de Óbito", icon: FileCheck },
      { value: "comprovante_renda", label: "Comprovante de Renda", icon: FileText },
    ],
  },
  {
    group: "Documentos do Caso",
    items: [
      { value: "procuracao", label: "Procuração", icon: FileText },
      { value: "contrato", label: "Contrato", icon: FileText },
      { value: "peticao", label: "Petição", icon: FileText },
      { value: "parecer", label: "Parecer", icon: FileText },
      { value: "relatorio", label: "Relatório", icon: FileText },
      { value: "recibo", label: "Recibo", icon: FileText },
      { value: "notificacao", label: "Notificação", icon: FileText },
      { value: "upload", label: "Arquivo Geral", icon: FileText },
      { value: "outros", label: "Outros (especificar)", icon: FileText },
    ],
  },
];

const ALL_DOC_OPTIONS = CATEGORIA_GROUPS.flatMap((g) => g.items);

const PESSOAL_CATEGORIAS = new Set([
  "identidade", "cpf", "passaporte", "ctps", "comprovante_residencia",
  "certidao_nascimento", "certidao_casamento", "certidao_obito", "comprovante_renda",
]);

async function autoLinkToProcesso(
  storagePath: string,
  fileName: string,
  fileType: string,
  fileSize: number,
  documentType: string,
  clientProfileId: string,
  userId: string
) {
  const { data: processos } = await supabase
    .from("processos")
    .select("id")
    .eq("client_profile_id", clientProfileId)
    .not("status", "eq", "arquivado");

  if (!processos || processos.length === 0) return;

  for (const p of processos) {
    const { data: existing } = await supabase
      .from("processo_documents")
      .select("id")
      .eq("processo_id", p.id)
      .eq("storage_path", storagePath)
      .maybeSingle();
    if (!existing) {
      await supabase.from("processo_documents").insert({
        processo_id: p.id,
        file_name: fileName,
        storage_path: storagePath,
        file_type: fileType,
        file_size: fileSize,
        user_id: userId,
        notas: "Vinculado automaticamente via upload do advogado",
        categoria: PESSOAL_CATEGORIAS.has(documentType)
          ? `pessoal_${documentType}`
          : documentType,
      });
    }
  }
}

interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  client_profile_id?: string | null;
}

interface UploadDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  folders: Folder[];
  currentFolderId?: string | null;
}

interface UploadFile {
  file: File;
  progress: number;
  status: "pending" | "uploading" | "done" | "error";
  error?: string;
}

export function UploadDocumentDialog({
  open,
  onOpenChange,
  onSuccess,
  folders,
  currentFolderId = null,
}: UploadDocumentDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>(currentFolderId || "root");
  const [documentType, setDocumentType] = useState<string>("upload");
  const [customName, setCustomName] = useState("");
  const [uploading, setUploading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);
  const [aiClassifying, setAiClassifying] = useState(false);

  // Auto-classify uploaded files using zero-shot classification (browser-side)
  useEffect(() => {
    if (files.length === 0 || documentType !== "upload") return;
    const file = files[0]?.file;
    if (!file || file.type !== "application/pdf") return;

    let cancelled = false;
    const classify = async () => {
      setAiClassifying(true);
      try {
        // Extract text from first part of file name + type hints
        const fileName = file.name.replace(/\.[^.]+$/, "").replace(/[-_]/g, " ");
        const { zeroShotClassify } = await import("@/lib/huggingface/transformers-browser");
        const labels = [
          "procuração", "contrato", "petição", "parecer", "relatório",
          "identidade", "comprovante de residência", "certidão", "recibo", "notificação",
        ];
        const result = await zeroShotClassify(fileName, labels);
        if (cancelled) return;

        const topLabel = result.labels[0];
        const topScore = result.scores[0];
        if (topScore > 0.3) {
          // Map label to category value
          const labelMap: Record<string, string> = {
            "procuração": "procuracao", "contrato": "contrato", "petição": "peticao",
            "parecer": "parecer", "relatório": "relatorio", "identidade": "identidade",
            "comprovante de residência": "comprovante_residencia", "certidão": "certidao_nascimento",
            "recibo": "recibo", "notificação": "notificacao",
          };
          const mapped = labelMap[topLabel];
          if (mapped) {
            setAiSuggestion(mapped);
            setDocumentType(mapped);
          }
        }
      } catch (err) {
        console.warn("[Auto-classify]", err);
      } finally {
        if (!cancelled) setAiClassifying(false);
      }
    };
    classify();
    return () => { cancelled = true; };
  }, [files, documentType]);

  const handleFileDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter((file) => {
      const maxSize = 50 * 1024 * 1024;
      if (file.size > maxSize) {
        toast({
          title: "Arquivo muito grande",
          description: `${file.name} excede o limite de 50MB.`,
          variant: "destructive",
        });
        return false;
      }
      return true;
    });

    setFiles((prev) => [
      ...prev,
      ...validFiles.map((file) => ({
        file,
        progress: 0,
        status: "pending" as const,
      })),
    ]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (!user || files.length === 0) return;

    setUploading(true);

    for (let i = 0; i < files.length; i++) {
      const uploadFile = files[i];

      setFiles((prev) =>
        prev.map((f, idx) =>
          idx === i ? { ...f, status: "uploading" as const, progress: 10 } : f
        )
      );

      try {
        const safeName = sanitizeStorageFileName(uploadFile.file.name);
        const fileName = `${user.id}/${Date.now()}-${safeName}`;

        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(fileName, uploadFile.file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (uploadError) throw uploadError;

        setFiles((prev) =>
          prev.map((f, idx) => (idx === i ? { ...f, progress: 70 } : f))
        );

        const folderId = selectedFolder === "root" ? null : selectedFolder;
        const docTitle =
          documentType === "outros" && customName.trim()
            ? customName.trim()
            : uploadFile.file.name.replace(/\.[^/.]+$/, "");

        const { data: docData, error: docError } = await supabase
          .from("documents")
          .insert({
            user_id: user.id,
            title: docTitle,
            document_type: documentType,
            content: `Arquivo carregado: ${uploadFile.file.name}`,
            folder_id: folderId,
            status: "rascunho",
            watermark: "none",
            signature_status: null,
            metadata: {
              original_filename: uploadFile.file.name,
              file_size: uploadFile.file.size,
              file_type: uploadFile.file.type,
              storage_path: fileName,
            },
          })
          .select("id")
          .single();

        if (docError) throw docError;

        if (docData?.id && folderId) {
          await autoShareDocumentWithFolderClient(docData.id, folderId, user.id);

          const folder = folders.find((f) => f.id === folderId);
          if (folder?.client_profile_id) {
            await autoLinkToProcesso(
              fileName,
              docTitle,
              uploadFile.file.type,
              uploadFile.file.size,
              documentType,
              folder.client_profile_id,
              user.id
            );
          }
        }

        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i ? { ...f, status: "done" as const, progress: 100 } : f
          )
        );
      } catch (err: any) {
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? { ...f, status: "error" as const, error: err.message }
              : f
          )
        );
      }
    }

    setUploading(false);

    setFiles((prev) => {
      const successCount = prev.filter((f) => f.status === "done").length;
      if (successCount > 0) {
        toast({ title: `${successCount} arquivo(s) enviado(s)!` });
        setTimeout(() => onSuccess(), 100);
      }
      return prev;
    });
  };

  const handleClose = () => {
    if (!uploading) {
      setFiles([]);
      setSelectedFolder(currentFolderId || "root");
      setDocumentType("upload");
      setCustomName("");
      onOpenChange(false);
    }
  };

  const getFolderPath = (folderId: string, allFolders: Folder[]): string => {
    const folder = allFolders.find((f) => f.id === folderId);
    if (!folder) return "";
    if (!folder.parent_id) return folder.name;
    return `${getFolderPath(folder.parent_id, allFolders)} / ${folder.name}`;
  };

  const allDone = files.length > 0 && files.every((f) => f.status === "done");
  const selectedOption = ALL_DOC_OPTIONS.find((c) => c.value === documentType);
  const SelectedIcon = selectedOption?.icon || FileText;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Upload de Documentos
          </DialogTitle>
          <DialogDescription>
            Faça upload de arquivos PDF, Word, imagens (até 50MB cada).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Folder selection */}
          <div className="space-y-2">
            <Label>Pasta de destino</Label>
            <Select value={selectedFolder} onValueChange={setSelectedFolder} disabled={uploading}>
              <SelectTrigger>
                <SelectValue placeholder="Raiz" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="root">📁 Raiz</SelectItem>
                {folders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    📂 {getFolderPath(folder.id, folders)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tipo de Documento com agrupamento */}
          <div className="space-y-2">
            <Label>Tipo de Documento <span className="text-destructive">*</span></Label>
            <Select
              value={documentType}
              onValueChange={(v) => { setDocumentType(v); setCustomName(""); }}
              disabled={uploading}
            >
              <SelectTrigger>
                <div className="flex items-center gap-2">
                  <SelectedIcon className="h-4 w-4 text-primary flex-shrink-0" />
                  <SelectValue />
                </div>
              </SelectTrigger>
              <SelectContent>
                {CATEGORIA_GROUPS.map((group) => (
                  <div key={group.group}>
                    <div className="px-2 py-1.5 text-[10px] uppercase tracking-widest text-muted-foreground font-semibold border-b border-border mb-1">
                      {group.group}
                    </div>
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <SelectItem key={item.value} value={item.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                            {item.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                    <div className="h-2" />
                  </div>
                ))}
              </SelectContent>
            </Select>

            {/* Badge de vinculação automática */}
            {PESSOAL_CATEGORIAS.has(documentType) && (
              <p className="text-[10px] text-primary/80 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Será vinculado automaticamente aos processos em aberto
              </p>
            )}
            {aiSuggestion && documentType === aiSuggestion && (
              <p className="text-[10px] text-primary/80 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
                🤖 Sugerido por IA (classificação automática)
              </p>
            )}
            {aiClassifying && (
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin" /> Classificando com IA...
              </p>
            )}
          </div>

          {/* Nome personalizado para "Outros" */}
          {documentType === "outros" && (
            <div className="space-y-2">
              <Label>Nome do documento <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Ex: Declaração de Imposto de Renda..."
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                disabled={uploading}
              />
            </div>
          )}

          <div
            className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            onDrop={handleFileDrop}
            onDragOver={(e) => e.preventDefault()}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <Upload className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Arraste arquivos aqui ou clique para selecionar
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              PDF, DOC, DOCX, JPG, PNG (máx. 50MB)
            </p>
            <input
              id="file-input"
              type="file"
              multiple
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Files list */}
          {files.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {files.map((uploadFile, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                >
                  <FileText className="h-5 w-5 text-primary flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">
                      {uploadFile.file.name}
                    </p>
                    {uploadFile.status === "uploading" && (
                      <Progress value={uploadFile.progress} className="h-1 mt-1" />
                    )}
                    {uploadFile.status === "error" && (
                      <p className="text-xs text-destructive mt-1">
                        {uploadFile.error || "Erro no upload"}
                      </p>
                    )}
                  </div>
                  {uploadFile.status === "done" ? (
                    <CheckCircle className="h-4 w-4 text-accent flex-shrink-0" />
                  ) : uploadFile.status === "uploading" ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary flex-shrink-0" />
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 flex-shrink-0"
                      onClick={() => removeFile(idx)}
                      disabled={uploading}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={uploading}>
            {allDone ? "Fechar" : "Cancelar"}
          </Button>
          {!allDone && (
            <Button
              onClick={uploadFiles}
              disabled={uploading || files.length === 0 || (documentType === "outros" && !customName.trim())}
              className="btn-gold"
            >
              {uploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Enviar {files.length > 0 ? `${files.length} arquivo(s)` : ""}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
