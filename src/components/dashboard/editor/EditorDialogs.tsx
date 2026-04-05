import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SaveToFolderDialog } from "@/components/dashboard/documents/SaveToFolderDialog";
import { SignatureDialog } from "@/components/dashboard/SignatureDialog";
import { ShareDocumentDialog } from "@/components/dashboard/ShareDocumentDialog";
import { AIPromptDialog, type AIPromptCheckbox } from "@/components/dashboard/AIPromptDialog";
import { RedactionTool } from "@/components/dashboard/editor/RedactionTool";
import { TemplateVariablesPanel } from "@/components/dashboard/editor/TemplateVariablesPanel";

const FORMATTING_CHECKBOXES: AIPromptCheckbox[] = [
  { id: "grammar", label: "Corrigir gramática e ortografia", defaultChecked: true },
  { id: "alignment", label: "Verificar alinhamento e espaçamento", defaultChecked: true },
  { id: "punctuation", label: "Padronizar pontuação (., , -)", defaultChecked: true },
  { id: "lists", label: "Organizar listas e numeração", defaultChecked: true },
];

interface EditorDialogsProps {
  // Save
  saveDialogOpen: boolean;
  setSaveDialogOpen: (v: boolean) => void;
  onSaveToFolder: (folderId: string | null) => Promise<void>;
  documentTitle: string;
  defaultFolderName: string;
  // Signature
  signatureOpen: boolean;
  setSignatureOpen: (v: boolean) => void;
  savedDocId: string | null;
  editedContent: string;
  formData: { watermark?: string; [key: string]: any };
  selectedTypeId?: string;
  onSignatureSuccess: () => void;
  // Share
  shareOpen: boolean;
  setShareOpen: (v: boolean) => void;
  // PDF Name
  pdfNameDialogOpen: boolean;
  setPdfNameDialogOpen: (v: boolean) => void;
  pdfFileName: string;
  setPdfFileName: (v: string) => void;
  onConfirmDownload: () => void;
  // AI Prompts
  legalDialogOpen: boolean;
  setLegalDialogOpen: (v: boolean) => void;
  formattingDialogOpen: boolean;
  setFormattingDialogOpen: (v: boolean) => void;
  aggregateDialogOpen: boolean;
  setAggregateDialogOpen: (v: boolean) => void;
  improving: boolean;
  improvingMode: string | null;
  detectingGaps: boolean;
  onLegalSubmit: (text: string) => void;
  onFormattingSubmit: (opts: string[]) => void;
  onAggregateSubmit: (text: string) => void;
  // Redaction
  redactionOpen: boolean;
  setRedactionOpen: (v: boolean) => void;
  onApplyRedaction: (redacted: string) => void;
  // Template Variables
  templateVarsOpen: boolean;
  setTemplateVarsOpen: (v: boolean) => void;
  onApplyVariables: (filled: string) => void;
  onInsertVariable: (placeholder: string) => void;
  editorRef: React.MutableRefObject<any>;
}

export function EditorDialogs(props: EditorDialogsProps) {
  return (
    <>
      <SaveToFolderDialog
        open={props.saveDialogOpen}
        onOpenChange={props.setSaveDialogOpen}
        onSave={props.onSaveToFolder}
        documentTitle={props.documentTitle}
        defaultFolderName={props.defaultFolderName}
      />
      <SignatureDialog
        open={props.signatureOpen}
        onOpenChange={props.setSignatureOpen}
        documentTitle={props.documentTitle}
        documentId={props.savedDocId || undefined}
        documentContent={props.editedContent}
        documentWatermark={props.formData.watermark}
        documentType={props.selectedTypeId}
        onSuccess={props.onSignatureSuccess}
      />
      {props.savedDocId && (
        <ShareDocumentDialog
          open={props.shareOpen}
          onOpenChange={props.setShareOpen}
          documentId={props.savedDocId}
          documentTitle={props.documentTitle}
        />
      )}

      <Dialog open={props.pdfNameDialogOpen} onOpenChange={props.setPdfNameDialogOpen}>
        <DialogContent className="sm:max-w-md bg-card">
          <DialogHeader><DialogTitle className="text-sm">Nomear arquivo PDF</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <Label className="text-xs">Nome do arquivo</Label>
            <div className="flex items-center gap-2">
              <Input className="h-9 text-sm flex-1" value={props.pdfFileName} onChange={(e) => props.setPdfFileName(e.target.value)} placeholder="nome-do-documento" onKeyDown={(e) => e.key === "Enter" && props.onConfirmDownload()} />
              <span className="text-xs text-muted-foreground">.pdf</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => props.setPdfNameDialogOpen(false)}>Cancelar</Button>
            <Button size="sm" className="btn-gold" onClick={props.onConfirmDownload}><Download className="h-3 w-3 mr-1" />Baixar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AIPromptDialog open={props.legalDialogOpen} onOpenChange={props.setLegalDialogOpen} title="Adicionar Leis e Citações" description="A IA buscará fundamentação legal relevante. Deixe em branco para busca automática baseada no conteúdo." placeholder="Ex: 'Código Civil artigo 123' (opcional — busca automática se vazio)..." showTextInput={true} loading={props.improving && props.improvingMode === "legal"} submitLabel="Buscar e Adicionar" allowEmpty onSubmit={({ text }) => { props.setLegalDialogOpen(false); props.onLegalSubmit(text); }} />
      <AIPromptDialog open={props.formattingDialogOpen} onOpenChange={props.setFormattingDialogOpen} title="Formatar ABNT" description="Selecione verificações de formatação." checkboxes={FORMATTING_CHECKBOXES} showTextInput={false} loading={props.improving && props.improvingMode === "formatting"} submitLabel="Aplicar Formatação" onSubmit={({ checkedOptions }) => { props.setFormattingDialogOpen(false); props.onFormattingSubmit(checkedOptions); }} />
      <AIPromptDialog open={props.aggregateDialogOpen} onOpenChange={props.setAggregateDialogOpen} title="Agregar com IA" description="Diga à IA o que aprimorar. Deixe em branco para detecção automática de lacunas." placeholder="Ex: 'Melhorar argumentação defensiva' (opcional)..." showTextInput={true} loading={props.detectingGaps} submitLabel="Analisar e Agregar" allowEmpty onSubmit={({ text }) => { props.setAggregateDialogOpen(false); props.onAggregateSubmit(text); }} />

      <RedactionTool open={props.redactionOpen} onOpenChange={props.setRedactionOpen} contentHtml={props.editedContent} onApplyRedaction={props.onApplyRedaction} />

      <TemplateVariablesPanel
        open={props.templateVarsOpen}
        onOpenChange={props.setTemplateVarsOpen}
        contentHtml={props.editedContent}
        onApplyVariables={props.onApplyVariables}
        onInsertVariable={props.onInsertVariable}
      />
    </>
  );
}
