import { useState } from "react";
import {
  PenTool,
  Send,
  Loader2,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { SignersList, type Signer } from "./signature";
import { generateHTMLPDFBlob } from "@/lib/generators/html-pdf-printer";
import { Checkbox } from "@/components/ui/checkbox";
import { ClientSearchSelect } from "@/components/dashboard/ClientSearchSelect";

interface SignatureDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentTitle: string;
  documentId?: string;
  documentContent?: string;
  documentWatermark?: string;
  documentType?: string;
  onSuccess?: () => void;
}

export function SignatureDialog({
  open,
  onOpenChange,
  documentTitle,
  documentId,
  documentContent,
  documentWatermark,
  documentType,
  onSuccess,
}: SignatureDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [title, setTitle] = useState(documentTitle);
  const [signers, setSigners] = useState<Signer[]>([{ name: "", email: "", phone: "" }]);
  const [sending, setSending] = useState(false);
  const [lawyerSignsFirst, setLawyerSignsFirst] = useState(false);
  const [onlyLawyerSigns, setOnlyLawyerSigns] = useState(false);
  const [linkedClientId, setLinkedClientId] = useState<string | null>(null);

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      setTitle(documentTitle || "");
      setSigners([{ name: "", email: "", phone: "" }]);
      setLawyerSignsFirst(false);
      setOnlyLawyerSigns(false);
      setLinkedClientId(null);
    }
    onOpenChange(isOpen);
  };

  const addSigner = () => {
    setSigners([...signers, { name: "", email: "", phone: "" }]);
  };

  const updateSigner = (index: number, field: keyof Signer, value: string) => {
    const updated = [...signers];
    updated[index] = { ...updated[index], [field]: value };
    setSigners(updated);
  };

  const removeSigner = (index: number) => {
    if (signers.length > 1) {
      setSigners(signers.filter((_, i) => i !== index));
    }
  };

  const handleSend = async () => {
    const docTitle = title || documentTitle;
    if (!docTitle) {
      toast({ title: "Informe o título do documento", variant: "destructive" });
      return;
    }

    const validSigners = onlyLawyerSigns ? [] : signers.filter((s) => s.name && s.email);
    if (!onlyLawyerSigns && validSigners.length === 0) {
      toast({ title: "Adicione ao menos um signatário", variant: "destructive" });
      return;
    }

    setSending(true);

    try {
      let contentBase64: string | undefined;
      if (documentContent) {
        try {
          const pdfBlob = await generateHTMLPDFBlob({
            content: documentContent,
            watermark: documentWatermark || "none",
            documentType,
          });
          const arrayBuffer = await pdfBlob.arrayBuffer();
          const uint8 = new Uint8Array(arrayBuffer);
          let binary = "";
          for (let i = 0; i < uint8.length; i++) {
            binary += String.fromCharCode(uint8[i]);
          }
          contentBase64 = btoa(binary);
        } catch (pdfErr) {
          console.warn("PDF generation for signature failed:", pdfErr);
        }
      }

      let plainContent: string | undefined;
      if (!contentBase64 && documentContent) {
        plainContent = documentContent.replace(/<[^>]*>/g, "").trim();
      }

      const { data, error } = await supabase.functions.invoke("clicksign-signature", {
        body: {
          action: "create",
          document_title: docTitle,
          document_id: documentId || undefined,
          document_content_base64: contentBase64 || undefined,
          document_content_text: !contentBase64 ? plainContent : undefined,
          signers: validSigners,
          signature_method: "eletronica",
          lawyer_signs_first: onlyLawyerSigns ? true : lawyerSignsFirst,
          only_lawyer_signs: onlyLawyerSigns,
          lawyer_email: (onlyLawyerSigns || lawyerSignsFirst) ? user?.email : undefined,
          lawyer_name: (onlyLawyerSigns || lawyerSignsFirst)
            ? (() => {
                const name = user?.user_metadata?.full_name as string | undefined;
                if (name && !name.includes("@")) return name;
                // Fallback: extract name from email prefix
                const email = user?.email || "";
                const prefix = email.split("@")[0] || "Advogado";
                return prefix.replace(/[._-]/g, " ").replace(/\b\w/g, c => c.toUpperCase());
              })()
            : undefined,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.lawyer_signing_url) {
        window.open(data.lawyer_signing_url, "_blank");
        toast({
          title: onlyLawyerSigns ? "Assine o documento!" : "Abra a aba para assinar!",
          description: onlyLawyerSigns
            ? "O documento foi criado na Clicksign. Assine na aba que abriu."
            : "Após sua assinatura, os demais signatários serão notificados automaticamente.",
        });
      } else {
        toast({
          title: onlyLawyerSigns
            ? "Envelope criado — verifique seu e-mail para assinar!"
            : lawyerSignsFirst
            ? "Envelope criado — verifique seu e-mail para assinar!"
            : "Documento enviado para assinatura!",
          description: onlyLawyerSigns
            ? "Somente você precisa assinar este documento."
            : lawyerSignsFirst
            ? "Após sua assinatura, os demais signatários receberão o link."
            : `${validSigners.length} signatário(s) receberão o link por e-mail.`,
        });
      }

      onSuccess?.();
    } catch (e: any) {
      toast({
        title: "Erro ao enviar para assinatura",
        description: e.message || "Tente novamente.",
        variant: "destructive",
      });
    }

    setSending(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg bg-card border-border max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif text-foreground flex items-center gap-2">
            <PenTool className="h-5 w-5 text-primary" />
            Assinatura Digital
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            Envio via Clicksign • MP 2.200-2/2001
          </DialogDescription>
        </DialogHeader>

        {/* Document Title */}
        {!documentTitle && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground tracking-wider uppercase">
              Título do Documento
            </label>
            <Input
              placeholder="Ex: Contrato de Prestação de Serviços"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-secondary border-border h-9 text-sm"
            />
          </div>
        )}

        {documentTitle && (
          <div className="bg-secondary/50 border border-border p-3">
            <p className="text-xs text-muted-foreground">Documento:</p>
            <p className="text-sm font-medium text-foreground">{documentTitle}</p>
          </div>
        )}
        {/* Client linking */}
        <ClientSearchSelect
          value={linkedClientId}
          onSelect={(id, client) => {
            setLinkedClientId(id);
            // Auto-fill first signer if empty
            if (client && signers.length === 1 && !signers[0].name && !signers[0].email) {
              setSigners([{ name: client.nome, email: client.email, phone: "" }]);
            }
          }}
          label="Vincular a Cliente (opcional)"
          allowClear={true}
        />


        <div className="bg-secondary/30 border border-border p-3">
          <p className="text-[10px] text-muted-foreground">
            <strong className="text-foreground">Assinatura via Clicksign:</strong> Os signatários
            receberão um link por e-mail para assinar o documento. A Clicksign suporta ICP-Brasil, GOV.BR e assinatura eletrônica — o signatário escolhe no momento da assinatura.
          </p>
        </div>

        {/* Only lawyer signs */}
        <div className="flex items-start gap-3 p-3 border border-primary/20 bg-primary/5">
          <Checkbox
            id="only-lawyer-signs"
            checked={onlyLawyerSigns}
            onCheckedChange={(checked) => {
              setOnlyLawyerSigns(checked === true);
              if (checked) setLawyerSignsFirst(false);
            }}
            className="mt-0.5"
          />
          <label htmlFor="only-lawyer-signs" className="cursor-pointer space-y-0.5">
            <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
              <UserCheck className="h-3.5 w-3.5 text-primary" />
              Apenas eu assino (sem signatários externos)
            </p>
            <p className="text-[10px] text-muted-foreground">
              Somente o advogado assina. Ideal para documentos internos ou que não exigem assinatura do cliente.
            </p>
          </label>
        </div>

        {/* Lawyer signs first option — only when there are external signers */}
        {!onlyLawyerSigns && (
          <div className="flex items-start gap-3 p-3 border border-border bg-secondary/20">
            <Checkbox
              id="lawyer-signs"
              checked={lawyerSignsFirst}
              onCheckedChange={(checked) => setLawyerSignsFirst(checked === true)}
              className="mt-0.5"
            />
            <label htmlFor="lawyer-signs" className="cursor-pointer space-y-0.5">
              <p className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                Assinar como advogado antes de enviar
              </p>
              <p className="text-[10px] text-muted-foreground">
                Você assina primeiro. Os demais signatários receberão o documento após sua assinatura.
              </p>
            </label>
          </div>
        )}

        {/* Signers — hidden when only lawyer signs */}
        {!onlyLawyerSigns && (
          <SignersList
            signers={signers}
            onUpdate={updateSigner}
            onAdd={addSigner}
            onRemove={removeSigner}
          />
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <p className="text-[9px] text-muted-foreground/60 max-w-[200px]">
            Trilha de auditoria preservada. Conformidade OAB/LGPD.
          </p>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="btn-gold text-xs"
              onClick={handleSend}
              disabled={sending}
            >
              {sending ? (
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
              ) : (
                <Send className="h-3 w-3 mr-1" />
              )}
              Enviar para Assinatura
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
