import { useState } from "react";
import { ArrowRightLeft, Loader2, TrendingUp, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { fetchCambio } from "@/lib/api";

const MOEDAS = [
  { code: "BRL", label: "Real (BRL)" },
  { code: "USD", label: "Dólar (USD)" },
  { code: "EUR", label: "Euro (EUR)" },
  { code: "GBP", label: "Libra (GBP)" },
  { code: "JPY", label: "Iene (JPY)" },
  { code: "ARS", label: "Peso Arg. (ARS)" },
  { code: "CHF", label: "Franco Suíço (CHF)" },
  { code: "CAD", label: "Dólar Can. (CAD)" },
];

export function CambioWidget() {
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("BRL");
  const [amount, setAmount] = useState("1");
  const [date, setDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const consultar = async () => {
    setLoading(true);
    try {
      const data = await fetchCambio(from, to, date || undefined);
      setResult(data);
    } catch {
      setResult({ error: true });
    }
    setLoading(false);
  };

  const rate = result?.bid || result?.rates?.[to] || null;
  const converted = rate ? (Number(amount) * Number(rate)).toFixed(2) : null;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          Conversor de Câmbio
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-5 gap-2 items-end">
          <div className="col-span-2">
            <Label className="text-[10px]">De</Label>
            <Select value={from} onValueChange={setFrom}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MOEDAS.map((m) => (
                  <SelectItem key={m.code} value={m.code} className="text-xs">{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-center pb-1">
            <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="col-span-2">
            <Label className="text-[10px]">Para</Label>
            <Select value={to} onValueChange={setTo}>
              <SelectTrigger className="h-8 text-xs mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MOEDAS.map((m) => (
                  <SelectItem key={m.code} value={m.code} className="text-xs">{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label className="text-[10px]">Valor</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="h-8 text-xs mt-1" min={0} />
          </div>
          <div>
            <Label className="text-[10px]">Data (histórico)</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-8 text-xs mt-1" />
          </div>
        </div>

        <Button className="w-full btn-gold text-xs h-8" onClick={consultar} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5 mr-1" />}
          Consultar Câmbio
        </Button>

        {rate && (
          <div className="p-3 bg-primary/5 border border-primary/20 rounded-lg text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Taxa</p>
            <p className="text-lg font-serif text-primary">1 {from} = {Number(rate).toFixed(4)} {to}</p>
            {converted && (
              <p className="text-sm text-foreground mt-1">
                {amount} {from} = <span className="font-bold">{converted} {to}</span>
              </p>
            )}
            {date && <p className="text-[10px] text-muted-foreground mt-1">Cotação de {date}</p>}
          </div>
        )}

        {result?.error && (
          <p className="text-xs text-destructive text-center">Par de moedas não disponível. Tente outro.</p>
        )}
      </CardContent>
    </Card>
  );
}
