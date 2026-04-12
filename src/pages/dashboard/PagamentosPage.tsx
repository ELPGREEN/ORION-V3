import { useState, useEffect, useCallback } from "react";
import { useRefreshOnFocus } from "@/hooks/useRefreshOnFocus";
import {
  CreditCard,
  DollarSign,
  Download,
  RefreshCw,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  Receipt,
  ArrowUpRight,
  Undo2,
  Plus,
  FileText,
  Filter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
// [REMOVED] import { useNeuralFeedback } from "@/hooks/useNeuralFeedback";
import { CreateInvoiceDialog } from "@/components/dashboard/payments/CreateInvoiceDialog";
import { PaymentsDashboard } from "@/components/dashboard/payments/PaymentsDashboard";
import { InvoicesList } from "@/components/dashboard/payments/InvoicesList";
import { CambioWidget } from "@/components/dashboard/payments/CambioWidget";

interface Payment {
  id: string;
  amount: number;
  currency: string;
  status: string;
  description: string;
  created: string;
  metadata?: Record<string, string>;
  customer_email?: string;
  customer_name?: string;
}

interface Balance {
  available: number;
  pending: number;
}

interface ClientInvoice {
  id: string;
  descricao: string;
  valor: number;
  status: string;
  vencimento: string | null;
  pago_em: string | null;
  created_at: string;
}

export default function PagamentosPage() {
  const { user } = useAuth();
  const { isAdvogado } = useUserRole();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [balance, setBalance] = useState<Balance | null>(null);
  const [refundDialog, setRefundDialog] = useState<Payment | null>(null);
  const [refundAmount, setRefundAmount] = useState("");
  const [refunding, setRefunding] = useState(false);
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("payments");
  const [clientInvoices, setClientInvoices] = useState<ClientInvoice[]>([]);

  // Set default tab based on role once loaded
  useEffect(() => {
    if (isAdvogado) {
      setActiveTab("dashboard");
    }
  }, [isAdvogado]);

  useEffect(() => {
    loadPayments();
  }, [isAdvogado]);

  useRefreshOnFocus(useCallback(() => { loadPayments(); }, [isAdvogado]));

  const loadPayments = async () => {
    setLoading(true);
    try {
      // For clients, always fetch invoices from DB first (independent of Stripe)
      if (!isAdvogado && user) {
        // Buscar perfil do cliente para filtrar faturas
        const { data: profile } = await supabase
          .from("client_profiles")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        
        if (profile) {
          const { data: invoicesData } = await supabase
            .from("invoices")
            .select("id, descricao, valor, status, vencimento, pago_em, created_at")
            .eq("client_profile_id", profile.id)
            .order("created_at", { ascending: false });
          setClientInvoices((invoicesData as ClientInvoice[]) || []);
        }
      }

      const action = isAdvogado ? "admin_list_payments" : "list_payments";
      const { data, error } = await supabase.functions.invoke("stripe-api", {
        body: { action },
      });

      if (error) throw error;

      setPayments(data?.payments || []);
      setBalance(data?.balance || null);
    } catch (err: any) {
      // Only show error toast if we have no local data either
      if (isAdvogado || clientInvoices.length === 0) {
        toast({
          title: "Erro ao carregar pagamentos",
          description: err.message,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRefund = async () => {
    if (!refundDialog) return;
    
    setRefunding(true);
    try {
      const { data, error } = await supabase.functions.invoke("stripe-api", {
        body: {
          action: "refund",
          payment_intent_id: refundDialog.id,
          amount: refundAmount ? parseFloat(refundAmount) : undefined,
          reason: "requested_by_customer",
        },
      });

      if (error) throw error;

      toast({
        title: "Reembolso processado",
        description: `R$ ${data.refund.amount.toFixed(2)} reembolsados com sucesso.`,
      });

      // ─── Neural: reembolso = sinal de problema → score baixo ───

      setRefundDialog(null);
      setRefundAmount("");
      loadPayments();
    } catch (err: any) {
      toast({
        title: "Erro no reembolso",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setRefunding(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: typeof CheckCircle }> = {
      succeeded: { label: "Pago", variant: "default", icon: CheckCircle },
      paid: { label: "Pago", variant: "default", icon: CheckCircle },
      processing: { label: "Processando", variant: "secondary", icon: Clock },
      requires_payment_method: { label: "Pendente", variant: "outline", icon: AlertCircle },
      canceled: { label: "Cancelado", variant: "destructive", icon: XCircle },
      requires_action: { label: "Ação necessária", variant: "secondary", icon: AlertCircle },
    };

    const config = statusConfig[status] || { label: status, variant: "outline" as const, icon: AlertCircle };
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
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
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const pendingPayments = payments.filter(
    (p) => p.status === "processing" || p.status === "requires_action"
  );

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 text-primary animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-serif text-foreground flex items-center gap-3">
            <CreditCard className="h-6 w-6 text-primary" />
            Pagamentos
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {isAdvogado
              ? "Gerencie pagamentos, cobranças e honorários do escritório."
              : "Acompanhe seus pagamentos e faturas."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdvogado && (
            <Button
              onClick={() => setCreateInvoiceOpen(true)}
              className="btn-gold text-xs"
            >
              <Plus className="h-3.5 w-3.5 mr-2" />
              Gerar Cobrança
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={loadPayments}
            className="text-xs"
          >
            <RefreshCw className="h-3.5 w-3.5 mr-2" />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className={`grid w-full max-w-xl ${isAdvogado ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <TabsTrigger value="dashboard" className="text-xs gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Dashboard</span>
          </TabsTrigger>
          <TabsTrigger value="payments" className="text-xs gap-1.5">
            <CreditCard className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Pagamentos</span> ({payments.length})
          </TabsTrigger>
          {isAdvogado && (
            <TabsTrigger value="invoices" className="text-xs gap-1.5">
              <FileText className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Cobranças</span>
            </TabsTrigger>
          )}
          <TabsTrigger value="cambio" className="text-xs gap-1.5">
            <DollarSign className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Câmbio</span>
          </TabsTrigger>
        </TabsList>

        {/* Dashboard Tab */}
        <TabsContent value="dashboard" className="mt-6">
          <PaymentsDashboard payments={payments} formatCurrency={formatCurrency} />
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="mt-6 space-y-6">
          {/* Client Pending Invoices - from DB (shown first for clients) */}
          {!isAdvogado && clientInvoices.filter(inv => inv.status === "pending").length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-serif text-foreground flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-primary" />
                Faturas Pendentes
              </h2>
              {clientInvoices
                .filter(inv => inv.status === "pending")
                .map((invoice) => (
                  <Card key={invoice.id} className="p-4 border-primary/30 bg-primary/5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{invoice.descricao}</p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(invoice.created_at)}
                            {invoice.vencimento && ` • Venc: ${formatDate(invoice.vencimento)}`}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-lg font-serif text-primary">{formatCurrency(invoice.valor)}</p>
                      </div>
                    </div>
                  </Card>
                ))}
            </div>
          )}

          {/* Client Paid Invoices - from DB */}
          {!isAdvogado && clientInvoices.filter(inv => inv.status === "paid").length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-serif text-foreground flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-accent" />
                Faturas Pagas
              </h2>
              {clientInvoices
                .filter(inv => inv.status === "paid")
                .map((invoice) => (
                  <Card key={invoice.id} className="p-4 border-border">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="h-5 w-5 text-accent" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{invoice.descricao}</p>
                          <p className="text-xs text-muted-foreground">{formatDate(invoice.created_at)}</p>
                        </div>
                      </div>
                      <p className="text-lg font-serif text-muted-foreground">{formatCurrency(invoice.valor)}</p>
                    </div>
                  </Card>
                ))}
            </div>
          )}

          {/* Stripe Payments History */}
          {payments.length > 0 && (
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="grid w-full grid-cols-3 max-w-md">
                <TabsTrigger value="all" className="text-xs">
                  Todos ({payments.length})
                </TabsTrigger>
                <TabsTrigger value="paid" className="text-xs">
                  Pagos ({payments.filter((p) => p.status === "succeeded" || p.status === "paid").length})
                </TabsTrigger>
                <TabsTrigger value="pending" className="text-xs">
                  Pendentes ({pendingPayments.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="all" className="mt-4">
                <PaymentsList
                  payments={payments}
                  isAdvogado={isAdvogado}
                  formatCurrency={formatCurrency}
                  formatDate={formatDate}
                  getStatusBadge={getStatusBadge}
                  onRefund={setRefundDialog}
                />
              </TabsContent>

              <TabsContent value="paid" className="mt-4">
                <PaymentsList
                  payments={payments.filter((p) => p.status === "succeeded" || p.status === "paid")}
                  isAdvogado={isAdvogado}
                  formatCurrency={formatCurrency}
                  formatDate={formatDate}
                  getStatusBadge={getStatusBadge}
                  onRefund={setRefundDialog}
                />
              </TabsContent>

              <TabsContent value="pending" className="mt-4">
                <PaymentsList
                  payments={pendingPayments}
                  isAdvogado={isAdvogado}
                  formatCurrency={formatCurrency}
                  formatDate={formatDate}
                  getStatusBadge={getStatusBadge}
                  onRefund={setRefundDialog}
                />
              </TabsContent>
            </Tabs>
          )}

          {/* Empty State for clients with no data */}
          {payments.length === 0 && clientInvoices.length === 0 && (
            <Card className="p-12 flex flex-col items-center justify-center text-center">
              <Receipt className="h-12 w-12 text-muted-foreground/30 mb-4" />
              <p className="text-sm text-muted-foreground mb-1">
                Nenhum pagamento encontrado
              </p>
              <p className="text-xs text-muted-foreground/60">
                Os pagamentos aparecerão aqui após a primeira transação.
              </p>
            </Card>
          )}
        </TabsContent>

        {/* Invoices Tab (Advogado only) */}
        {isAdvogado && (
          <TabsContent value="invoices" className="mt-6">
            <InvoicesList onRefresh={loadPayments} />
          </TabsContent>
        )}

        {/* Câmbio Tab */}
        <TabsContent value="cambio" className="mt-6">
          <div className="max-w-md">
            <CambioWidget />
          </div>
        </TabsContent>
      </Tabs>


      {/* Create Invoice Dialog */}
      <CreateInvoiceDialog
        open={createInvoiceOpen}
        onOpenChange={setCreateInvoiceOpen}
        onSuccess={() => {
          setCreateInvoiceOpen(false);
          loadPayments();
        }}
      />

      {/* Refund Dialog */}
      <Dialog open={!!refundDialog} onOpenChange={() => setRefundDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Processar Reembolso</DialogTitle>
            <DialogDescription>
              Reembolsar pagamento de {refundDialog?.customer_email || "cliente"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-muted rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Valor original:</span>
                <span className="font-medium">
                  {formatCurrency(refundDialog?.amount || 0)}
                </span>
              </div>
              <div className="flex justify-between text-sm mt-2">
                <span className="text-muted-foreground">Descrição:</span>
                <span>{refundDialog?.description}</span>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="refund-amount">
                Valor do reembolso (deixe vazio para reembolso total)
              </Label>
              <Input
                id="refund-amount"
                type="number"
                step="0.01"
                placeholder={`Máx: ${refundDialog?.amount || 0}`}
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRefundDialog(null)}
              disabled={refunding}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleRefund}
              disabled={refunding}
              className="btn-gold"
            >
              {refunding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Undo2 className="h-4 w-4 mr-2" />
                  Processar Reembolso
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Disclaimer */}
      <p className="text-[9px] text-muted-foreground/60 text-center">
        Pagamentos processados via Stripe. Dados protegidos por criptografia PCI-DSS. OAB Provimento 205/2021 e LGPD aplicáveis.
      </p>
    </div>
  );
}

// Extracted component for payments list
function PaymentsList({
  payments,
  isAdvogado,
  formatCurrency,
  formatDate,
  getStatusBadge,
  onRefund,
}: {
  payments: Payment[];
  isAdvogado: boolean;
  formatCurrency: (amount: number) => string;
  formatDate: (date: string) => string;
  getStatusBadge: (status: string) => React.ReactNode;
  onRefund: (payment: Payment) => void;
}) {
  if (payments.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-muted-foreground">
        Nenhum pagamento nesta categoria.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {payments.map((payment) => (
        <Card
          key={payment.id}
          className="p-4 hover:bg-card/80 transition-colors"
        >
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0 flex-1">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-foreground truncate">
                    {payment.description}
                  </p>
                  {getStatusBadge(payment.status)}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-xs text-muted-foreground">
                    {formatDate(payment.created)}
                  </p>
                  {isAdvogado && payment.customer_email && (
                    <>
                      <span className="text-muted-foreground/50">•</span>
                      <p className="text-xs text-muted-foreground truncate">
                        {payment.customer_name || payment.customer_email}
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <p className="text-lg font-serif text-primary whitespace-nowrap">
                {formatCurrency(payment.amount)}
              </p>
              {isAdvogado && (payment.status === "succeeded" || payment.status === "paid") && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => onRefund(payment)}
                  title="Reembolsar"
                >
                  <Undo2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
