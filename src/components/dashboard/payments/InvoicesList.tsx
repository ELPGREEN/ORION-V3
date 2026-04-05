import { useState, useEffect } from "react";
import {
  ExternalLink,
  Copy,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  MoreHorizontal,
  Mail,
  Trash2,
  RotateCcw,
  Ban,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface Invoice {
  id: string;
  descricao: string;
  valor: number;
  status: string;
  vencimento: string | null;
  pago_em: string | null;
  created_at: string;
  updated_at: string;
  client_profile_id: string | null;
}

interface InvoicesListProps {
  onRefresh: () => void;
}

export function InvoicesList({ onRefresh }: InvoicesListProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type: "cancel" | "refund" | "delete";
    invoice: Invoice | null;
  }>({ open: false, type: "cancel", invoice: null });

  useEffect(() => {
    fetchInvoices();
  }, [user]);

  const fetchInvoices = async () => {
    if (!user) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
    } else {
      setInvoices((data as Invoice[]) || []);
    }
    setLoading(false);
  };

  const copyLink = async (link: string) => {
    await navigator.clipboard.writeText(link);
    toast({ title: "Link copiado!" });
  };

  const handleCancelInvoice = async (invoice: Invoice) => {
    setActionLoading(invoice.id);
    try {
      const { error } = await supabase
        .from("invoices")
        .update({ status: "canceled" })
        .eq("id", invoice.id);
      if (error) throw error;
      toast({ title: "Cobrança cancelada com sucesso." });
      fetchInvoices();
      onRefresh();
    } catch (err: any) {
      toast({ title: "Erro ao cancelar", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRefundInvoice = async (invoice: Invoice) => {
    setActionLoading(invoice.id);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-api", {
        body: { action: "refund", invoice_id: invoice.id },
      });
      if (error) throw error;
      toast({ title: "Estorno solicitado com sucesso." });
      fetchInvoices();
      onRefresh();
    } catch (err: any) {
      toast({ title: "Erro ao estornar", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteInvoice = async (invoice: Invoice) => {
    setActionLoading(invoice.id);
    try {
      const { error } = await supabase
        .from("invoices")
        .delete()
        .eq("id", invoice.id);
      if (error) throw error;
      toast({ title: "Cobrança excluída com sucesso." });
      fetchInvoices();
      onRefresh();
    } catch (err: any) {
      toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmAction = () => {
    if (!confirmDialog.invoice) return;
    const { type, invoice } = confirmDialog;
    setConfirmDialog({ open: false, type: "cancel", invoice: null });
    if (type === "cancel") handleCancelInvoice(invoice);
    if (type === "refund") handleRefundInvoice(invoice);
    if (type === "delete") handleDeleteInvoice(invoice);
  };

  const confirmLabels = {
    cancel: { title: "Cancelar Cobrança", desc: "Tem certeza que deseja cancelar esta cobrança? O link de pagamento será invalidado.", action: "Cancelar Cobrança" },
    refund: { title: "Estornar Pagamento", desc: "Tem certeza que deseja estornar este pagamento? O valor será devolvido ao cliente via Stripe.", action: "Estornar" },
    delete: { title: "Excluir Cobrança", desc: "Tem certeza que deseja excluir esta cobrança? Esta ação não pode ser desfeita.", action: "Excluir" },
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle }> = {
      pending: { label: "Pendente", variant: "outline", icon: Clock },
      paid: { label: "Pago", variant: "default", icon: CheckCircle },
      canceled: { label: "Cancelado", variant: "destructive", icon: XCircle },
      expired: { label: "Expirado", variant: "secondary", icon: Clock },
    };

    const c = config[status] || { label: status, variant: "outline" as const, icon: Clock };
    const Icon = c.icon;

    return (
      <Badge variant={c.variant} className="gap-1 text-[10px]">
        <Icon className="h-3 w-3" />
        {c.label}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (invoices.length === 0) {
    return (
      <Card className="p-8 text-center">
        <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
        <p className="text-sm text-muted-foreground">Nenhuma cobrança criada</p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          Clique em "Gerar Nova Cobrança" para criar sua primeira cobrança.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">
          Cobranças Geradas ({invoices.length})
        </h3>
      </div>

      {invoices.map((invoice) => (
        <Card key={invoice.id} className="p-4 hover:bg-card/80 transition-colors group">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-foreground truncate">
                    {invoice.descricao}
                  </p>
                  {getStatusBadge(invoice.status)}
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                  <span>
                    Cliente
                  </span>
                  <span className="text-muted-foreground/50">•</span>
                  <span>{formatDate(invoice.created_at)}</span>
                  {invoice.vencimento && (
                    <>
                      <span className="text-muted-foreground/50">•</span>
                      <span>Venc: {formatDate(invoice.vencimento)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <p className="text-lg font-serif text-primary whitespace-nowrap">
                {formatCurrency(invoice.valor)}
              </p>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem>
                    <Mail className="h-4 w-4 mr-2" />
                    Reenviar Email
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {invoice.status === "pending" && (
                    <DropdownMenuItem
                      onClick={() => setConfirmDialog({ open: true, type: "cancel", invoice })}
                      className="text-yellow-500 focus:text-yellow-500"
                    >
                      <Ban className="h-4 w-4 mr-2" />
                      Cancelar Cobrança
                    </DropdownMenuItem>
                  )}
                  {invoice.status === "paid" && (
                    <DropdownMenuItem
                      onClick={() => setConfirmDialog({ open: true, type: "refund", invoice })}
                      className="text-orange-500 focus:text-orange-500"
                    >
                      <RotateCcw className="h-4 w-4 mr-2" />
                      Estornar Pagamento
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => setConfirmDialog({ open: true, type: "delete", invoice })}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </Card>
      ))}

      <AlertDialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, type: "cancel", invoice: null })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmLabels[confirmDialog.type].title}</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmLabels[confirmDialog.type].desc}
              {confirmDialog.invoice && (
                <span className="block mt-2 font-medium text-foreground">
                  {confirmDialog.invoice.descricao} — {formatCurrency(confirmDialog.invoice.valor)}
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              className={confirmDialog.type === "delete" ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : confirmLabels[confirmDialog.type].action}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
