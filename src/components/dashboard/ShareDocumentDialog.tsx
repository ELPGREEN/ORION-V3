import { useState, useEffect } from "react";
import { Users, Send, Loader2, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

interface Client {
  id: string;
  user_id: string;
  nome: string;
  email: string;
}

interface ShareDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  documentId: string;
  documentTitle: string;
  onSuccess?: () => void;
}

export function ShareDocumentDialog({
  open,
  onOpenChange,
  documentId,
  documentTitle,
  onSuccess,
}: ShareDocumentDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (open) {
      fetchClients();
      setSelectedClient(null);
      setMessage("");
      setSearch("");
    }
  }, [open]);

  const fetchClients = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("client_profiles")
      .select("id, user_id, nome, email")
      .order("nome");

    if (error) {
    } else {
      setClients(data || []);
    }
    setLoading(false);
  };

  const handleShare = async () => {
    if (!selectedClient || !user) return;

    setSending(true);
    try {
      // Check for duplicate share
      const { data: existing } = await supabase
        .from("shared_documents")
        .select("id")
        .eq("document_id", documentId)
        .eq("shared_with", selectedClient.user_id)
        .maybeSingle();

      if (existing) {
        toast({
          title: "Já compartilhado",
          description: `Este documento já foi compartilhado com ${selectedClient.nome}.`,
        });
        setSending(false);
        return;
      }

      // Create shared document record
      const { error: shareError } = await supabase.from("shared_documents").insert({
        document_id: documentId,
        shared_by: user.id,
        shared_with: selectedClient.user_id,
        message: message || null,
      } as any);

      if (shareError) throw shareError;

      // Fetch office name for notification
      let officeName = "Seu advogado";
      const { data: config } = await supabase
        .from("escritorio_config")
        .select("nome_escritorio")
        .eq("user_id", user.id)
        .maybeSingle();
      if (config?.nome_escritorio) officeName = config.nome_escritorio;

      // Create notification for the client
      const { error: notifyError } = await supabase.from("notificacoes").insert({
        user_id: selectedClient.user_id,
        tipo: "documento",
        titulo: "Novo documento recebido",
        descricao: `${officeName} compartilhou o documento "${documentTitle}" com você.${message ? ` Mensagem: ${message}` : ""}`,
        link: "/dashboard/documentos",
        referencia_id: documentId,
        referencia_tipo: "document",
      });

      if (notifyError) {
      }

      toast({
        title: "Documento compartilhado!",
        description: `Enviado para ${selectedClient.nome}`,
      });

      onOpenChange(false);
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Erro ao compartilhar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const filteredClients = clients.filter(
    (c) =>
      c.nome.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-serif">
            <Users className="h-5 w-5 text-primary" />
            Compartilhar Documento
          </DialogTitle>
          <DialogDescription>
            Selecione o cliente que receberá "{documentTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Client List */}
          <div className="max-h-48 overflow-y-auto space-y-1 border border-border rounded-md p-2">
            {loading ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : filteredClients.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-4">
                Nenhum cliente encontrado
              </p>
            ) : (
              filteredClients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => setSelectedClient(client)}
                  className={`w-full flex items-center gap-3 p-2 rounded transition-colors text-left ${
                    selectedClient?.id === client.id
                      ? "bg-primary/10 border border-primary/30"
                      : "hover:bg-muted/50"
                  }`}
                >
                  <div className="h-8 w-8 rounded-full bg-card border border-border flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-medium text-primary">
                      {client.nome.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {client.nome}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {client.email}
                    </p>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Message */}
          {selectedClient && (
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">
                Mensagem (opcional)
              </label>
              <Textarea
                placeholder="Adicione uma mensagem para o cliente..."
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={2}
                className="text-sm"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              className="flex-1 btn-gold"
              onClick={handleShare}
              disabled={!selectedClient || sending}
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Enviar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
