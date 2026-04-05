import { useState, useEffect } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Send, Copy, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ClientProfile {
  id: string;
  nome: string;
  email: string;
}

interface HonorarioConfig {
  id: string;
  tipo_servico: string;
  descricao: string | null;
  valor: number;
  ativo: boolean;
}

interface CreateInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function CreateInvoiceDialog({
  open,
  onOpenChange,
  onSuccess,
}: CreateInvoiceDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [honorarios, setHonorarios] = useState<HonorarioConfig[]>([]);
  const [paymentLink, setPaymentLink] = useState<string | null>(null);

  // Form state
  const [selectedClient, setSelectedClient] = useState<string>("");
  const [customEmail, setCustomEmail] = useState("");
  const [customName, setCustomName] = useState("");
  const [tipoServico, setTipoServico] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    if (open) {
      fetchClients();
      fetchHonorarios();
      resetForm();
    }
  }, [open]);

  const resetForm = () => {
    setSelectedClient("");
    setCustomEmail("");
    setCustomName("");
    setTipoServico("");
    setDescription("");
    setAmount("");
    setDueDate("");
    setPaymentLink(null);
  };

  const fetchClients = async () => {
    const { data } = await supabase
      .from("client_profiles")
      .select("id, nome, email")
      .order("nome");
    setClients(data || []);
  };

  const fetchHonorarios = async () => {
    const { data } = await supabase
      .from("honorarios_config")
      .select("*")
      .eq("ativo", true)
      .order("tipo_servico");
    setHonorarios(data || []);
  };

  const handleHonorarioSelect = (tipo: string) => {
    setTipoServico(tipo);
    const honorario = honorarios.find((h) => h.tipo_servico === tipo);
    if (honorario) {
      setAmount(honorario.valor.toString());
      setDescription(honorario.descricao || tipo);
    }
  };

  const handleSubmit = async () => {
    if (!description || !amount || parseFloat(amount) <= 0) {
      toast({
        title: "Dados incompletos",
        description: "Preencha descrição e valor.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedClient && !customEmail) {
      toast({
        title: "Cliente não selecionado",
        description: "Selecione um cliente ou insira o email.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-api", {
        body: {
          action: "create_invoice",
          client_profile_id: selectedClient || undefined,
          client_email: selectedClient ? undefined : customEmail,
          client_name: selectedClient ? undefined : customName,
          tipo_servico: tipoServico,
          description,
          amount: parseFloat(amount),
          due_date: dueDate || undefined,
        },
      });

      if (error) throw error;

      setPaymentLink(data.payment_url);
      toast({
        title: "Cobrança criada!",
        description: "Link de pagamento gerado com sucesso.",
      });
    } catch (err: any) {
      toast({
        title: "Erro ao criar cobrança",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyLink = async () => {
    if (paymentLink) {
      await navigator.clipboard.writeText(paymentLink);
      toast({ title: "Link copiado!" });
    }
  };

  const handleClose = () => {
    if (paymentLink) {
      onSuccess();
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-serif">Gerar Nova Cobrança</DialogTitle>
          <DialogDescription>
            Crie um link de pagamento para enviar ao cliente.
          </DialogDescription>
        </DialogHeader>

        {paymentLink ? (
          <div className="space-y-4 py-4">
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-sm text-primary font-medium mb-2">
                ✅ Link de pagamento gerado!
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                O cliente receberá um email com o link. Você também pode copiar e enviar manualmente.
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={copyLink}
                >
                  <Copy className="h-3 w-3 mr-2" />
                  Copiar Link
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 text-xs"
                  onClick={() => window.open(paymentLink, "_blank")}
                >
                  <ExternalLink className="h-3 w-3 mr-2" />
                  Abrir Link
                </Button>
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleClose} className="btn-gold">
                Concluir
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            {/* Client Selection */}
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um cliente cadastrado..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">+ Inserir manualmente</SelectItem>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.nome} ({client.email})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedClient === "custom" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    placeholder="Nome do cliente"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Email *</Label>
                  <Input
                    type="email"
                    placeholder="email@cliente.com"
                    value={customEmail}
                    onChange={(e) => setCustomEmail(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Service Type */}
            <div className="space-y-2">
              <Label>Tipo de Serviço</Label>
              <Select value={tipoServico} onValueChange={handleHonorarioSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="custom">+ Valor personalizado</SelectItem>
                  {honorarios.map((h) => (
                    <SelectItem key={h.id} value={h.tipo_servico}>
                      {h.tipo_servico} — R$ {h.valor.toFixed(2)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Textarea
                placeholder="Ex: Consulta jurídica inicial - Direito Trabalhista"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            {/* Amount */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Valor (R$) *</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0,00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Vencimento</Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="btn-gold"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Gerar Cobrança
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
