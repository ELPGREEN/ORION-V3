import { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Loader2, FileText, X, CreditCard, Home, FileCheck, Briefcase, Globe, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface ClientUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientProfileId: string;
  onSuccess: () => void;
}

// Categoria principal
const CATEGORIA_GROUPS = [
  {
    group: "Documentos Pessoais",
    items: [
      { value: "rg", label: "RG — Registro Geral", icon: CreditCard },
      { value: "cnh", label: "CNH — Carteira de Motorista", icon: CreditCard },
      { value: "cpf", label: "CPF — Cadastro de Pessoa Física", icon: CreditCard },
      { value: "passaporte", label: "Passaporte", icon: Globe },
      { value: "ctps", label: "CTPS — Carteira de Trabalho", icon: Briefcase },
      { value: "comprovante_residencia", label: "Comprovante de Residência", icon: Home },
      { value: "certidao_nascimento", label: "Certidão de Nascimento", icon: FileCheck },
      { value: "certidao_casamento", label: "Certidão de Casamento", icon: Users },
      { value: "certidao_obito", label: "Certidão de Óbito", icon: FileCheck },
    ],
  },
  {
    group: "Documentos do Caso",
    items: [
      { value: "procuracao", label: "Procuração", icon: FileText },
      { value: "contrato", label: "Contrato", icon: FileText },
      { value: "comprovante_renda", label: "Comprovante de Renda", icon: FileText },
      { value: "outros", label: "Outros (especificar)", icon: FileText },
    ],
  },
];

// flat list for display name lookup
const ALL_OPTIONS = CATEGORIA_GROUPS.flatMap((g) => g.items);

// Map category → canonical key for processo_documents (pessoal_ prefix)
const PESSOAL_CATEGORIAS = new Set([
  "rg", "cnh", "cpf", "passaporte", "ctps",
  "comprovante_residencia", "certidao_nascimento", "certidao_casamento", "certidao_obito",
]);

export function ClientUploadDialog({
  open,
  onOpenChange,
  clientProfileId,
  onSuccess,
}: ClientUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [categoria, setCategoria] = useState("rg");
  const [customName, setCustomName] = useState("");
  const [notas, setNotas] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [classifying, setClassifying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  // Auto-categorize based on file name
  const autoCategorize = (fileName: string): string => {
    const name = fileName.toLowerCase();
    if (name.includes("rg") || name.includes("identidade")) return "rg";
    if (name.includes("cnh") || name.includes("habilitacao") || name.includes("habilitação")) return "cnh";
    if (name.includes("cpf")) return "cpf";
    if (name.includes("passaporte")) return "passaporte";
    if (name.includes("ctps") || name.includes("carteira_trabalho")) return "ctps";
    if (name.includes("comprovante") && name.includes("resid")) return "comprovante_residencia";
    if (name.includes("certidao") && name.includes("nasc")) return "certidao_nascimento";
    if (name.includes("certidao") && name.includes("casamento")) return "certidao_casamento";
    if (name.includes("procuracao") || name.includes("procuração")) return "procuracao";
    if (name.includes("contrato")) return "contrato";
    if (name.includes("comprovante") && name.includes("renda")) return "comprovante_renda";
    return "outros";
  };

  // Document AI: classify via OCR when filename detection fails
  const classifyViaAI = async (selectedFile: File) => {
    // Only for images and PDFs
    const isImage = selectedFile.type.startsWith("image/");
    const isPdf = selectedFile.type === "application/pdf";
    if (!isImage && !isPdf) return;

    setClassifying(true);
    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]); // strip data:...;base64,
        };
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      const { data, error } = await supabase.functions.invoke("ocr-document", {
        body: { imageBase64: base64, mimeType: selectedFile.type },
      });

      if (!error && data?.classification?.category && data.classification.category !== "outros") {
        const validCategories = ALL_OPTIONS.map(o => o.value);
        if (validCategories.includes(data.classification.category)) {
          setCategoria(data.classification.category);
          toast({
            title: "🤖 Document AI — Categoria detectada!",
            description: `Identificado como: ${data.classification.label} (${Math.round(data.classification.confidence * 100)}% confiança)`,
          });
        }
      }
    } catch (err) {
    } finally {
      setClassifying(false);
    }
  };

  const processFile = (selectedFile: File) => {
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "Máximo 10MB.", variant: "destructive" });
      return;
    }
    setFile(selectedFile);
    // Auto-categorize by filename first
    const detected = autoCategorize(selectedFile.name);
    if (detected !== "outros") {
      setCategoria(detected);
      toast({ title: "Categoria detectada!", description: `Identificado como: ${ALL_OPTIONS.find(o => o.value === detected)?.label || detected}` });
    } else {
      // Fallback: use Document AI (OCR + classification) for unknown files
      classifyViaAI(selectedFile);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) processFile(selectedFile);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files?.[0];
    if (droppedFile) processFile(droppedFile);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => setIsDragOver(false);

  const handleUpload = async () => {
    if (!file || !user || !clientProfileId) return;

    // Validate clientProfileId is a proper UUID to prevent path traversal
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(clientProfileId)) {
      toast({ title: "ID de perfil inválido", variant: "destructive" });
      return;
    }

    setUploading(true);

    try {
      const safeName = file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");
      const fileName = `clients/${clientProfileId}/${Date.now()}-${safeName}`;

      const { error: uploadError } = await supabase.storage.from("documents").upload(fileName, file);
      if (uploadError) throw uploadError;

      const displayName =
        categoria === "outros" && customName.trim()
          ? customName.trim()
          : ALL_OPTIONS.find((c) => c.value === categoria)?.label || categoria;

      // Insert into client_documents
      const { error: insertError } = await supabase.from("client_documents").insert({
        client_profile_id: clientProfileId,
        user_id: user.id,
        file_name: displayName,
        storage_path: fileName,
        file_type: file.type,
        file_size: file.size,
        categoria: categoria,
        notas: notas || null,
      });

      if (insertError) {
        await supabase.storage.from("documents").remove([fileName]);
        throw insertError;
      }

      // Auto-link to all open processes of this client
      const { data: processos } = await supabase
        .from("processos")
        .select("id, user_id")
        .eq("client_profile_id", clientProfileId)
        .not("status", "eq", "arquivado");

      if (processos && processos.length > 0) {
        const processoInserts = processos.map((p: any) => ({
          processo_id: p.id,
          file_name: displayName,
          storage_path: fileName,
          file_type: file.type,
          file_size: file.size,
          user_id: p.user_id,
          notas: "Vinculado automaticamente via upload do cliente",
          categoria: PESSOAL_CATEGORIAS.has(categoria)
            ? `pessoal_${categoria}`
            : categoria,
        }));

        // Only insert if not already linked (same storage_path + processo_id)
        for (const insert of processoInserts) {
          const { data: existing } = await supabase
            .from("processo_documents")
            .select("id")
            .eq("processo_id", insert.processo_id)
            .eq("storage_path", fileName)
            .maybeSingle();
          if (!existing) {
            await supabase.from("processo_documents").insert(insert);
          }
        }
      }

      // Notify advogados
      try {
        const clientName = user.user_metadata?.nome || user.email?.split("@")[0] || "Cliente";
        await supabase.functions.invoke("admin-api", {
          body: {
            action: "notify_advogados",
            user_id: user.id,
            data: {
              tipo: "documento",
              titulo: `${clientName} enviou um documento`,
              descricao: `Novo documento: "${displayName}"`,
              link: "/dashboard/clientes",
              referencia_tipo: "client_document",
            },
          },
        });
      } catch (notifErr) {
      }

      toast({ title: "Documento enviado!", description: processos && processos.length > 0 ? "Vinculado automaticamente ao(s) processo(s) em aberto." : "Salvo na pasta do cliente." });

      setFile(null);
      setCategoria("rg");
      setCustomName("");
      setNotas("");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: "Erro no envio", description: error.message || "Não foi possível enviar.", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    if (!uploading) {
      setFile(null);
      setCategoria("rg");
      setCustomName("");
      setNotas("");
      onOpenChange(false);
    }
  };

  const selectedOption = ALL_OPTIONS.find((c) => c.value === categoria);
  const SelectedIcon = selectedOption?.icon || FileText;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-primary" />
            Enviar Documento
          </DialogTitle>
          <DialogDescription>
            Documentos pessoais são vinculados automaticamente aos processos em aberto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Tipo de Documento com agrupamento */}
          <div className="space-y-2">
            <Label>Tipo de Documento <span className="text-destructive">*</span></Label>
            <Select value={categoria} onValueChange={(v) => { setCategoria(v); setCustomName(""); }}>
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
            {PESSOAL_CATEGORIAS.has(categoria) && (
              <p className="text-[10px] text-primary/80 flex items-center gap-1">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                Será vinculado automaticamente aos processos em aberto
              </p>
            )}
          </div>

          {/* Nome personalizado para "Outros" */}
          {categoria === "outros" && (
            <div className="space-y-2">
              <Label>Nome do documento <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Ex: Declaração de Imposto de Renda..."
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
            </div>
          )}

          {/* File Input */}
          <div className="space-y-2">
            <Label>Arquivo</Label>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.txt"
            />
            {file ? (
              <div className="flex items-center gap-3 p-3 bg-muted border border-border rounded-md">
                <FileText className="h-8 w-8 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                    {classifying && (
                      <span className="ml-2 inline-flex items-center gap-1 text-primary">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Classificando via IA...
                      </span>
                    )}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={() => setFile(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
                className={`w-full h-28 border-2 border-dashed rounded-lg flex items-center justify-center cursor-pointer transition-all ${
                  isDragOver
                    ? "border-primary bg-primary/5 scale-[1.02]"
                    : "border-border hover:border-primary/50 hover:bg-muted/30"
                }`}
              >
                <div className="flex flex-col items-center gap-2 pointer-events-none">
                  <Upload className={`h-7 w-7 transition-colors ${isDragOver ? "text-primary" : "text-muted-foreground"}`} />
                  <span className="text-sm text-muted-foreground">
                    {isDragOver ? "Solte o arquivo aqui" : "Arraste ou clique para selecionar"}
                  </span>
                  <span className="text-xs text-muted-foreground/60">PDF, DOC, JPG, PNG (máx. 10MB)</span>
                </div>
              </div>
            )}
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label>Observações (opcional)</Label>
            <Textarea
              placeholder="Adicione uma observação sobre o documento..."
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose} disabled={uploading}>
            Cancelar
          </Button>
          <Button
            className="btn-gold"
            onClick={handleUpload}
            disabled={!file || uploading || (categoria === "outros" && !customName.trim())}
          >
            {uploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Enviar
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
