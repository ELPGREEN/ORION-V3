import { useState, useRef } from "react";
import { toHtml } from "docshift";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Crown, Upload, FileText, X, Loader2 } from "lucide-react";
import type { PipelineExecutionContext } from "@/lib/legal-pipeline";

const AREAS_JURIDICAS = [
  "civil", "penal", "trabalhista", "tributário", "administrativo",
  "constitucional", "empresarial", "ambiental", "consumidor", "família",
  "previdenciário", "eleitoral", "digital", "internacional",
];

const TIPOS_DOCUMENTO = [
  "Petição Inicial", "Contestação", "Recurso de Apelação", "Agravo de Instrumento",
  "Habeas Corpus", "Mandado de Segurança", "Contrato", "Parecer Jurídico",
  "Notificação Extrajudicial", "Procuração", "Memoriais", "Embargos de Declaração",
];

interface PipelineIntakeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStart: (context: PipelineExecutionContext) => void;
  /** Pre-fill from current document context */
  defaultTopic?: string;
  defaultArea?: string;
  defaultDocType?: string;
  /** Current editor content to use as base */
  editorContent?: string;
}

export function PipelineIntakeDialog({
  open, onOpenChange, onStart,
  defaultTopic = "", defaultArea = "civil", defaultDocType = "Petição Inicial",
  editorContent,
}: PipelineIntakeDialogProps) {
  const [topic, setTopic] = useState(defaultTopic);
  const [area, setArea] = useState(defaultArea);
  const [docType, setDocType] = useState(defaultDocType);
  const [fatos, setFatos] = useState("");
  const [tese, setTese] = useState("");
  const [uploadedFile, setUploadedFile] = useState<{ name: string; content: string } | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasEditorContent = editorContent && editorContent.replace(/<[^>]*>/g, "").trim().length > 50;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      if (file.type === "text/plain" || file.name.endsWith(".txt") || file.name.endsWith(".md")) {
        const text = await file.text();
        setUploadedFile({ name: file.name, content: text.substring(0, 8000) });
      } else if (file.type === "application/pdf" || file.name.endsWith(".pdf")) {
        // PDF: basic text extraction
        const text = await file.text();
        const cleaned = text.replace(/[^\x20-\x7E\xC0-\xFF\n\r\t]/g, " ").replace(/\s{3,}/g, " ").trim();
        setUploadedFile({ name: file.name, content: cleaned.substring(0, 8000) || `[PDF: ${file.name} — conteúdo não extraível como texto]` });
      } else if (
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        file.name.endsWith(".docx")
      ) {
        // DOCX: extract HTML content using docshift (preserves formatting better than mammoth)
        const htmlContent = await toHtml(file);
        if (htmlContent && htmlContent.trim().length > 0) {
          setUploadedFile({ name: file.name, content: htmlContent.trim().substring(0, 8000) });
        } else {
          setUploadedFile({ name: file.name, content: `[DOCX sem conteúdo extraível: ${file.name}]` });
        }
      } else {
        const text = await file.text();
        setUploadedFile({ name: file.name, content: text.substring(0, 5000) });
      }
    } catch (err) {
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleStart = () => {
    // Build rich topic from all collected info
    const parts: string[] = [];
    if (topic.trim()) parts.push(topic.trim());
    if (fatos.trim()) parts.push(`FATOS: ${fatos.trim()}`);
    if (tese.trim()) parts.push(`TESE CENTRAL: ${tese.trim()}`);
    if (uploadedFile) parts.push(`DOCUMENTO DE REFERÊNCIA (${uploadedFile.name}): ${uploadedFile.content}`);
    if (hasEditorContent) {
      const plainText = editorContent!.replace(/<[^>]*>/g, "").substring(0, 3000);
      parts.push(`CONTEÚDO EXISTENTE NO EDITOR: ${plainText}`);
    }

    const fullTopic = parts.join("\n\n");

    onStart({
      topic: fullTopic || "documento jurídico",
      areaJuridica: area,
      documentType: docType,
      previousOutputs: {},
    });
    onOpenChange(false);
  };

  const canStart = topic.trim().length > 5 || fatos.trim().length > 10 || !!uploadedFile || !!hasEditorContent;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Crown className="h-4 w-4 text-primary" />
            Pipeline Jurídico — 9 Agentes
          </DialogTitle>
          <DialogDescription className="text-xs">
            Forneça as informações do caso para que os agentes produzam um documento completo e fundamentado.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Document type & Area */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium">Tipo de Documento</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_DOCUMENTO.map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] font-medium">Área Jurídica</Label>
              <Select value={area} onValueChange={setArea}>
                <SelectTrigger className="h-8 text-xs capitalize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {AREAS_JURIDICAS.map((a) => (
                    <SelectItem key={a} value={a} className="text-xs capitalize">{a}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Topic / Title */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium">Tema / Título do Documento *</Label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="Ex: Ação de indenização por danos morais contra empresa X"
              className="h-8 text-xs"
            />
          </div>

          {/* Facts */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium">Fatos do Caso</Label>
            <Textarea
              value={fatos}
              onChange={(e) => setFatos(e.target.value)}
              placeholder="Descreva os fatos relevantes: o que aconteceu, quando, quem são as partes envolvidas, danos sofridos..."
              className="text-xs min-h-[80px] resize-y"
            />
          </div>

          {/* Central thesis */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium">Tese Central (opcional)</Label>
            <Input
              value={tese}
              onChange={(e) => setTese(e.target.value)}
              placeholder="Ex: Responsabilidade civil objetiva do fornecedor (art. 14, CDC)"
              className="h-8 text-xs"
            />
          </div>

          {/* File upload */}
          <div className="space-y-1.5">
            <Label className="text-[11px] font-medium">Documento de Referência (opcional)</Label>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                {uploading ? "Carregando..." : "Anexar PDF, DOCX ou TXT"}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.doc,.txt,.md"
                className="hidden"
                onChange={handleFileUpload}
              />
            </div>
            {uploadedFile && (
              <div className="flex items-center gap-2 mt-1.5 px-2 py-1.5 bg-muted/50 rounded border border-border text-xs">
                <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                <span className="truncate flex-1">{uploadedFile.name}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0"
                  onClick={() => setUploadedFile(null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>

          {/* Editor content indicator */}
          {hasEditorContent && (
            <div className="flex items-center gap-2 px-2 py-1.5 bg-primary/5 rounded border border-primary/20 text-xs text-primary">
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span>O conteúdo atual do editor será usado como base para os agentes.</span>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleStart}
            disabled={!canStart}
            className="text-xs gap-1.5"
          >
            <Crown className="h-3.5 w-3.5" />
            Iniciar Pipeline (9 Agentes)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
