import { CreditCard } from "lucide-react";

export default function PagamentosPlaceholder() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-xl md:text-2xl font-serif text-foreground">Pagamentos</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Gerencie honorários, faturas e pagamentos.
        </p>
      </div>
      <div className="bg-card border border-border p-12 flex flex-col items-center justify-center text-center">
        <CreditCard className="h-12 w-12 text-muted-foreground/30 mb-4" />
        <p className="text-sm text-muted-foreground mb-1">Integração Stripe em breve</p>
        <p className="text-xs text-muted-foreground/60">
          Pagamentos via PIX, cartão e boleto serão habilitados na próxima fase.
        </p>
      </div>
    </div>
  );
}
