import { CreditCard, Loader2, QrCode, FileText, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HonorarioOption } from "@/pages/dashboard/AgendarConsulta";
import { useState } from "react";

export type PaymentMethod = "card" | "boleto" | "pix" | "bank_transfer";
export type Currency = "brl" | "usd" | "eur";

const currencies: { id: Currency; label: string; symbol: string; flag: string }[] = [
  { id: "brl", label: "Real Brasileiro", symbol: "R$", flag: "🇧🇷" },
  { id: "usd", label: "Dólar Americano", symbol: "US$", flag: "🇺🇸" },
  { id: "eur", label: "Euro", symbol: "€", flag: "🇪🇺" },
];

// PIX e boleto só disponíveis em BRL
const getPaymentMethods = (currency: Currency): { id: PaymentMethod; label: string; desc: string; icon: React.ElementType }[] => {
  const methods: { id: PaymentMethod; label: string; desc: string; icon: React.ElementType }[] = [
    { id: "card", label: "Cartão de Crédito/Débito", desc: "Visa, Mastercard, Elo, Amex", icon: CreditCard },
  ];
  if (currency === "brl") {
    methods.push(
      { id: "pix", label: "PIX", desc: "Pagamento instantâneo via QR Code", icon: QrCode },
      { id: "boleto", label: "Boleto Bancário", desc: "Vencimento em até 3 dias úteis", icon: FileText },
      { id: "bank_transfer", label: "Transferência Bancária", desc: "TED/DOC para conta do escritório", icon: Building2 },
    );
  }
  return methods;
};

// Conversão aproximada (taxas fixas de referência)
const getConvertedValue = (valorBrl: number, currency: Currency): number => {
  const rates: Record<Currency, number> = { brl: 1, usd: 1 / 5.8, eur: 1 / 6.3 };
  return +(valorBrl * rates[currency]).toFixed(2);
};

interface StepPagamentoProps {
  tipo: HonorarioOption;
  data: string;
  hora: string | null;
  paying: boolean;
  onPagar: (method: PaymentMethod, currency: Currency) => void;
  onBack: () => void;
}

export default function StepPagamento({
  tipo,
  data,
  hora,
  paying,
  onPagar,
  onBack,
}: StepPagamentoProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>("brl");

  const paymentMethods = getPaymentMethods(selectedCurrency);
  const convertedValue = getConvertedValue(tipo.valor, selectedCurrency);
  const currencyInfo = currencies.find(c => c.id === selectedCurrency)!;

  const formatValue = (value: number, currency: Currency) => {
    return new Intl.NumberFormat(
      currency === "brl" ? "pt-BR" : currency === "usd" ? "en-US" : "de-DE",
      { style: "currency", currency: currency.toUpperCase() }
    ).format(value);
  };

  // Reset method when currency changes and method is no longer available
  const handleCurrencyChange = (currency: Currency) => {
    setSelectedCurrency(currency);
    if (currency !== "brl" && selectedMethod !== "card") {
      setSelectedMethod(null);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-sm font-serif text-foreground">Resumo & Pagamento</h2>

      {/* Currency Selector */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-foreground uppercase tracking-wider">Moeda de Pagamento</h3>
        <div className="grid grid-cols-3 gap-2">
          {currencies.map((cur) => (
            <button
              key={cur.id}
              onClick={() => handleCurrencyChange(cur.id)}
              className={`flex flex-col items-center gap-1 p-3 border text-center transition-all ${
                selectedCurrency === cur.id
                  ? "border-primary bg-primary/5"
                  : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <span className="text-xl">{cur.flag}</span>
              <span className={`text-[10px] font-medium ${selectedCurrency === cur.id ? "text-primary" : "text-foreground"}`}>
                {cur.symbol}
              </span>
              <span className="text-[9px] text-muted-foreground">{cur.label}</span>
            </button>
          ))}
        </div>
        {selectedCurrency !== "brl" && (
          <p className="text-[9px] text-muted-foreground/70 italic">
            * Taxa de referência aproximada. O valor final será confirmado pelo Stripe no momento do pagamento.
          </p>
        )}
      </div>

      {/* Order Summary */}
      <div className="bg-card border border-border p-5 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Tipo:</span>
          <span className="text-foreground">{tipo.descricao}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Data:</span>
          <span className="text-foreground">
            {new Date(data + "T12:00:00").toLocaleDateString("pt-BR")}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Horário:</span>
          <span className="text-foreground">{hora}</span>
        </div>
        <div className="border-t border-border pt-3 space-y-1">
          <div className="flex justify-between">
            <span className="text-sm font-medium text-foreground">Total:</span>
            <span className="text-lg font-serif text-primary">
              {formatValue(convertedValue, selectedCurrency)}
            </span>
          </div>
          {selectedCurrency !== "brl" && (
            <div className="flex justify-between">
              <span className="text-[10px] text-muted-foreground">Equivalente em BRL:</span>
              <span className="text-[10px] text-muted-foreground">
                R$ {tipo.valor.toFixed(2).replace(".", ",")}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Payment Method Selection */}
      <div className="space-y-2">
        <h3 className="text-xs font-medium text-foreground uppercase tracking-wider">
          Forma de Pagamento
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {paymentMethods.map((method) => {
            const Icon = method.icon;
            const isSelected = selectedMethod === method.id;
            return (
              <button
                key={method.id}
                onClick={() => setSelectedMethod(method.id)}
                className={`flex items-start gap-3 p-4 border text-left transition-all hover-gold-glow ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card"
                }`}
              >
                <Icon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                <div>
                  <p className={`text-sm font-medium ${isSelected ? "text-primary" : "text-foreground"}`}>
                    {method.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {method.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
        {selectedCurrency !== "brl" && (
          <p className="text-[9px] text-muted-foreground/60">
            PIX e Boleto disponíveis apenas para pagamentos em Real (BRL).
          </p>
        )}
      </div>

      {/* Payment CTA */}
      <div className="bg-card border border-primary/20 p-5 text-center">
        <CreditCard className="h-8 w-8 text-primary mx-auto mb-3" />
        <p className="text-sm text-foreground mb-1">Pagamento Seguro via Stripe</p>
        <p className="text-[10px] text-muted-foreground mb-4">
          Ambiente criptografado PCI-DSS · {currencyInfo.flag} {currencyInfo.label}
        </p>
        <Button
          className="btn-gold w-full h-11 text-xs"
          onClick={() => selectedMethod && onPagar(selectedMethod, selectedCurrency)}
          disabled={paying || !selectedMethod}
        >
          {paying ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <CreditCard className="h-4 w-4 mr-2" />
              {selectedMethod
                ? `PAGAR ${formatValue(convertedValue, selectedCurrency)} COM ${paymentMethods.find(m => m.id === selectedMethod)?.label.toUpperCase()}`
                : "SELECIONE A FORMA DE PAGAMENTO"}
            </>
          )}
        </Button>
        <p className="text-[9px] text-muted-foreground/60 mt-3">
          Você será redirecionado ao checkout seguro Stripe. Recibo PDF automático com dados OAB.
        </p>
      </div>

      <Button
        variant="ghost"
        size="sm"
        className="text-xs text-muted-foreground"
        onClick={onBack}
      >
        ← Voltar
      </Button>
    </div>
  );
}
