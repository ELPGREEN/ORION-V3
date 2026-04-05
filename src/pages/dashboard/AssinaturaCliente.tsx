import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { PenTool, Loader2, CheckCircle, Clock, Send, ExternalLink } from "lucide-react";

interface Envelope {
  id: string;
  document_title: string;
  status: string;
  created_at: string;
  clicksign_envelope_id: string | null;
  signers: Array<{ name: string; email: string; status?: string }>;
}

const statusMap: Record<string, { label: string; className: string; icon: typeof CheckCircle }> = {
  pendente: { label: "Pendente", className: "bg-warning/15 text-warning border-warning/30", icon: Clock },
  parcialmente_assinado: { label: "Parcial", className: "bg-primary/15 text-primary border-primary/30", icon: Clock },
  assinado: { label: "Assinado", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: CheckCircle },
  concluido: { label: "Concluído", className: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", icon: CheckCircle },
};

export default function AssinaturaCliente() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [envelopes, setEnvelopes] = useState<Envelope[]>([]);
  const [loading, setLoading] = useState(true);
  const [signingId, setSigningId] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.email) return;

    const load = async () => {
      // RLS already filters to envelopes where user is a signer,
      // but we also filter by status to reduce payload
      const { data: allEnvelopes } = await supabase
        .from("signature_envelopes")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(50);

      if (allEnvelopes) {
        const mine = allEnvelopes.filter((env: any) => {
          const signersList = env.signers as any[];
          return Array.isArray(signersList) && signersList.some(
            (s: any) => s.email?.toLowerCase() === user.email!.toLowerCase()
          );
        });
        setEnvelopes(mine as unknown as Envelope[]);
      }
      setLoading(false);
    };

    load();
  }, [user]);

  const handleSign = async (envelopeId: string) => {
    setSigningId(envelopeId);
    try {
      const { data, error } = await supabase.functions.invoke("clicksign-signature", {
        body: { action: "get-signing-url", envelope_id: envelopeId },
      });
      if (error) throw error;
      if (data?.signing_url) {
        window.open(data.signing_url, "_blank");
      } else {
        toast({ title: "Ação necessária", description: data?.error || "Verifique seu e-mail para o link de assinatura." });
      }
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    }
    setSigningId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 text-primary animate-spin" />
      </div>
    );
  }

  const pending = envelopes.filter((e) => ["pendente", "parcialmente_assinado"].includes(e.status));
  const completed = envelopes.filter((e) => ["assinado", "concluido"].includes(e.status));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-serif text-foreground">Assinatura Digital</h1>
        <p className="text-sm text-muted-foreground">Documentos enviados para sua assinatura eletrônica.</p>
      </div>

      {envelopes.length === 0 ? (
        <div className="bg-card border border-border p-8 text-center">
          <PenTool className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Nenhum documento para assinatura.</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Quando o advogado enviar um documento, ele aparecerá aqui.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pending */}
          {pending.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
                <Clock className="h-4 w-4 text-warning" />
                Pendentes de Assinatura ({pending.length})
              </h2>
              {pending.map((env) => {
                const st = statusMap[env.status] || statusMap.pendente;
                return (
                  <div key={env.id} className="bg-card border border-border p-4 flex items-center gap-4">
                    <PenTool className="h-5 w-5 text-primary flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{env.document_title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        Enviado em {new Date(env.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <Badge className={`text-[10px] ${st.className}`}>{st.label}</Badge>
                    <Button
                      size="sm"
                      className="text-xs"
                      onClick={() => handleSign(env.id)}
                      disabled={signingId === env.id}
                    >
                      {signingId === env.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <ExternalLink className="h-3 w-3 mr-1" />}
                      Assinar
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-400" />
                Assinados ({completed.length})
              </h2>
              {completed.map((env) => (
                <div key={env.id} className="bg-card border border-border p-4 flex items-center gap-4 opacity-80">
                  <CheckCircle className="h-5 w-5 text-emerald-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{env.document_title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(env.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <Badge className="text-[10px] bg-emerald-500/15 text-emerald-400 border-emerald-500/30">Concluído</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
