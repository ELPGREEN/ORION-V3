import { useState, useEffect } from "react";
import { useNeuralFeedback } from "@/hooks/useNeuralFeedback";
import { PenTool, Upload, Send, Clock, CheckCircle, FileText, Plus, RefreshCw, XCircle, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUserRole } from "@/hooks/useUserRole";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { SignatureDialog } from "@/components/dashboard/SignatureDialog";
import { DocumentPickerDialog } from "@/components/dashboard/DocumentPickerDialog";

interface SignatureEnvelope {
  id: string;
  document_title: string;
  status: string;
  signature_method: string;
  signers: Array<{
    name: string;
    email: string;
    signer_key: string;
    request_signature_key: string;
  }>;
  created_at: string;
  clicksign_document_key: string | null;
}

const statusMap: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  draft: { label: "Rascunho", color: "text-muted-foreground border-border", icon: FileText },
  pendente: { label: "Aguardando Assinatura", color: "text-warning border-warning/30", icon: Clock },
  parcialmente_assinado: { label: "Assinatura Parcial", color: "text-blue-400 border-blue-400/30", icon: Clock },
  assinado: { label: "Assinado", color: "text-green-400 border-green-400/30", icon: CheckCircle },
  cancelado: { label: "Cancelado", color: "text-red-400 border-red-400/30", icon: XCircle },
  expirado: { label: "Expirado", color: "text-orange-400 border-orange-400/30", icon: Clock },
  erro_validacao: { label: "Erro de Validação", color: "text-red-400 border-red-400/30", icon: XCircle },
};

export default function AssinaturaDigital() {
  const { isAdvogado } = useUserRole();
  const { user } = useAuth();
  const { toast } = useToast();
  const { logNeural } = useNeuralFeedback();
  const [envelopes, setEnvelopes] = useState<SignatureEnvelope[]>([]);
  const [loading, setLoading] = useState(true);
  const [resending, setResending] = useState<string | null>(null);
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [docPickerOpen, setDocPickerOpen] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<{ id: string; title: string } | null>(null);

  const fetchEnvelopes = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("clicksign-signature", {
        body: { action: "list" },
      });
      if (error) throw error;
      setEnvelopes(data.envelopes || []);
    } catch (e: any) {
      // Fallback: query table directly
      const { data } = await supabase
        .from("signature_envelopes")
        .select("*")
        .order("created_at", { ascending: false });
      if (data) setEnvelopes(data as unknown as SignatureEnvelope[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchEnvelopes();
  }, [user]);

  const handleResend = async (envelopeId: string) => {
    setResending(envelopeId);
    try {
      const { error } = await supabase.functions.invoke("clicksign-signature", {
        body: { action: "resend", envelope_id: envelopeId },
      });
      if (error) throw error;
      toast({ title: "Notificação reenviada com sucesso!" });
      // 🧠 Neural: reenvio = acompanhamento ativo de assinatura
      logNeural({
        interaction_type: "assinatura_event",
        input_text: `Reenvio de notificação de assinatura: envelope ${envelopeId}`,
        output_text: "Notificação reenviada via Clicksign",
        quality_score: 0.7,
        user_id: user?.id,
        metadata: { module: "assinatura_digital", action: "resend", envelope_id: envelopeId },
      });
    } catch (e: any) {
      toast({ title: "Erro ao reenviar", description: e.message, variant: "destructive" });
    }
    setResending(null);
  };

  const handleCancel = async (envelopeId: string) => {
    try {
      const { error } = await supabase.functions.invoke("clicksign-signature", {
        body: { action: "cancel", envelope_id: envelopeId },
      });
      if (error) throw error;
      toast({ title: "Envelope cancelado" });
      fetchEnvelopes();
    } catch (e: any) {
      toast({ title: "Erro ao cancelar", description: e.message, variant: "destructive" });
    }
  };

  const handleDelete = async (envelopeId: string) => {
    try {
      const { error } = await supabase
        .from("signature_envelopes")
        .delete()
        .eq("id", envelopeId);
      if (error) throw error;
      toast({ title: "Envelope excluído" });
      fetchEnvelopes();
    } catch (e: any) {
      toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" });
    }
  };

  const handleDocSelected = (docId: string, docTitle: string, _hasContent?: boolean) => {
    setSelectedDoc({ id: docId, title: docTitle });
    setDocPickerOpen(false);
    setSignatureDialogOpen(true);
  };

  const handleNewEnvelope = () => {
    setSelectedDoc(null);
    setSignatureDialogOpen(true);
  };

  const handleSignatureSent = () => {
    setSignatureDialogOpen(false);
    setSelectedDoc(null);
    fetchEnvelopes();

    // 🧠 Neural: envelope enviado = sinal de alta qualidade
    logNeural({
      interaction_type: "assinatura_event",
      input_text: `Envelope de assinatura enviado: ${selectedDoc?.title || "Novo documento"}`,
      output_text: "Envelope criado e enviado para assinatura digital via Clicksign",
      quality_score: 0.88,
      user_id: user?.id,
      metadata: { module: "assinatura_digital", document_id: selectedDoc?.id },
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-serif text-foreground flex items-center gap-3">
            <PenTool className="h-6 w-6 text-primary" />
            Assinatura Digital
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {isAdvogado
              ? "Envie documentos para assinatura digital via Clicksign."
              : "Assine documentos enviados pelo escritório de forma digital e segura."}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            onClick={fetchEnvelopes}
            title="Atualizar"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
          {isAdvogado && (
            <Button className="btn-gold text-[10px] h-9" onClick={handleNewEnvelope}>
              <Plus className="h-3.5 w-3.5 mr-2" />
              NOVO ENVELOPE
            </Button>
          )}
        </div>
      </div>

      {/* Provider Info */}
      <div className="bg-card border border-primary/20 p-4 flex items-center gap-3">
        <div className="h-10 w-10 bg-primary/10 border border-primary/30 flex items-center justify-center flex-shrink-0">
          <PenTool className="h-5 w-5 text-primary" />
        </div>
        <div>
          <p className="text-xs font-medium text-foreground">Provedor: Clicksign</p>
          <p className="text-[10px] text-muted-foreground">
            Assinatura eletrônica com validade jurídica via Clicksign
          </p>
        </div>
        <span className="ml-auto text-[9px] px-2 py-1 border border-green-400/30 text-green-400 tracking-wider uppercase">
          ● Conectado
        </span>
      </div>

      {/* Actions for advogado */}
      {isAdvogado && (
        <div className="grid sm:grid-cols-2 gap-3">
          <button
            onClick={handleNewEnvelope}
            className="bg-card border border-border p-4 text-left hover-gold-glow transition-all"
          >
            <Upload className="h-5 w-5 text-primary mb-2" />
            <p className="text-xs font-medium text-foreground">Novo Documento</p>
            <p className="text-[10px] text-muted-foreground">Crie um envelope com título e signatários</p>
          </button>
          <button
            onClick={() => setDocPickerOpen(true)}
            className="bg-card border border-border p-4 text-left hover-gold-glow transition-all"
          >
            <FileText className="h-5 w-5 text-primary mb-2" />
            <p className="text-xs font-medium text-foreground">Documento do Repositório</p>
            <p className="text-[10px] text-muted-foreground">Selecione documento gerado para assinar</p>
          </button>
        </div>
      )}

      {/* Envelopes List */}
      <div className="space-y-3">
        <h2 className="text-sm font-serif text-foreground">
          {isAdvogado ? "Envelopes Recentes" : "Documentos para Assinar"}
        </h2>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : envelopes.length === 0 ? (
          <div className="bg-card border border-border p-8 text-center">
            <PenTool className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Nenhum envelope encontrado.
            </p>
            {isAdvogado && (
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                Clique em "Novo Envelope" para enviar seu primeiro documento para assinatura.
              </p>
            )}
          </div>
        ) : (
          envelopes.map((envelope) => {
            const s = statusMap[envelope.status] || statusMap.pendente;
            const StatusIcon = s.icon;
            return (
              <div
                key={envelope.id}
                className="bg-card border border-border p-4 hover-gold-glow transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {envelope.document_title}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Signatários:{" "}
                      {Array.isArray(envelope.signers)
                        ? envelope.signers.map((s: any) => s.name || s.email).join(", ")
                        : "—"}
                    </p>
                  </div>
                  <span
                    className={`text-[9px] px-2 py-0.5 border tracking-wider uppercase flex items-center gap-1 ${s.color}`}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {s.label}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">
                    Clicksign • {new Date(envelope.created_at).toLocaleDateString("pt-BR")}
                  </span>
                  <div className="flex gap-2">
                    {envelope.status === "assinado" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[10px] h-7 text-primary"
                        onClick={async () => {
                          try {
                            const { data, error } = await supabase.functions.invoke("clicksign-signature", {
                              body: { action: "status", envelope_id: envelope.id },
                            });
                            if (error) throw error;
                            toast({ title: "Status atualizado" });
                            fetchEnvelopes();
                          } catch (e: any) {
                            toast({ title: "Erro ao verificar status", description: e.message, variant: "destructive" });
                          }
                        }}
                      >
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verificar Status
                      </Button>
                    )}
                    {envelope.status === "pendente" && isAdvogado && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[10px] h-7 text-primary"
                          disabled={resending === envelope.id}
                          onClick={() => handleResend(envelope.id)}
                        >
                          {resending === envelope.id ? (
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          ) : (
                            <Send className="h-3 w-3 mr-1" />
                          )}
                          Reenviar Notificações
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[10px] h-7 text-destructive"
                          onClick={() => handleCancel(envelope.id)}
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Cancelar
                        </Button>
                      </>
                    )}
                    {(envelope.status === "cancelado" || envelope.status === "expirado") && isAdvogado && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[10px] h-7 text-destructive"
                        onClick={() => handleDelete(envelope.id)}
                      >
                        <Trash2 className="h-3 w-3 mr-1" />
                        Excluir
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Disclaimer */}
      <p className="text-[9px] text-muted-foreground/60 text-center">
        Assinatura digital conforme MP 2.200-2/2001 via Clicksign. OAB Provimento 205/2021.
      </p>

      {/* Dialogs */}
      <SignatureDialog
        open={signatureDialogOpen}
        onOpenChange={setSignatureDialogOpen}
        documentTitle={selectedDoc?.title || ""}
        documentId={selectedDoc?.id}
        onSuccess={handleSignatureSent}
      />

      <DocumentPickerDialog
        open={docPickerOpen}
        onOpenChange={setDocPickerOpen}
        onSelect={handleDocSelected}
      />
    </div>
  );
}
