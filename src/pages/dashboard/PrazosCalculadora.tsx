import { useState } from "react";
import { Calendar, Calculator, Clock, ChevronRight, Loader2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface PrazoResult {
  data_inicio: string;
  dias_uteis: number;
  data_final: string;
  dias_corridos: number;
  dias_pulados: number;
  detalhes: string[];
}

export default function PrazosCalculadora() {
  const [dataInicio, setDataInicio] = useState(new Date().toISOString().slice(0, 10));
  const [diasUteis, setDiasUteis] = useState("15");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PrazoResult | null>(null);
  const [feriados, setFeriados] = useState<{ date: string; name: string }[]>([]);
  const [loadingFeriados, setLoadingFeriados] = useState(false);
  const { toast } = useToast();

  const calcular = async () => {
    if (!dataInicio || !diasUteis) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("utils-api", {
        body: { action: "calcular_prazo", params: { data_inicio: dataInicio, dias_uteis: Number(diasUteis) } },
      });
      if (error) throw error;
      setResult(data);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const carregarFeriados = async () => {
    setLoadingFeriados(true);
    try {
      const year = new Date(dataInicio).getFullYear();
      const { data, error } = await supabase.functions.invoke("utils-api", {
        body: { action: "feriados", params: { year } },
      });
      if (error) throw error;
      setFeriados(data || []);
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoadingFeriados(false);
    }
  };

  const formatDate = (iso: string) => {
    try {
      return format(new Date(iso + "T12:00:00"), "dd 'de' MMMM 'de' yyyy (EEEE)", { locale: ptBR });
    } catch {
      return iso;
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-serif text-foreground flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          Calculadora de Prazos Processuais
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Calcula prazos úteis excluindo automaticamente feriados nacionais e fins de semana.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Formulário */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Dados do Prazo
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs">Data de Início (Intimação/Citação)</Label>
              <Input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} className="h-9 mt-1" />
            </div>
            <div>
              <Label className="text-xs">Prazo em Dias Úteis</Label>
              <Input
                type="number"
                min={1}
                max={365}
                value={diasUteis}
                onChange={(e) => setDiasUteis(e.target.value)}
                placeholder="15"
                className="h-9 mt-1"
              />
            </div>
            <div className="flex gap-2">
              <Button className="btn-gold flex-1" onClick={calcular} disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4 mr-1" />}
                Calcular Prazo
              </Button>
              <Button variant="outline" onClick={carregarFeriados} disabled={loadingFeriados} className="text-xs">
                {loadingFeriados ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ver Feriados"}
              </Button>
            </div>

            {/* Prazos comuns */}
            <div className="pt-2 border-t border-border">
              <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider">Prazos Comuns</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "Contestação", dias: 15 },
                  { label: "Recurso", dias: 15 },
                  { label: "Agravo", dias: 10 },
                  { label: "Embargo", dias: 5 },
                  { label: "Apelação", dias: 15 },
                  { label: "REsp/RE", dias: 15 },
                  { label: "Habeas Corpus", dias: 5 },
                  { label: "Mandado Seg.", dias: 120 },
                ].map((p) => (
                  <Badge
                    key={p.label}
                    variant="outline"
                    className="cursor-pointer hover:bg-primary/10 text-[10px]"
                    onClick={() => setDiasUteis(String(p.dias))}
                  >
                    {p.label} ({p.dias}d)
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resultado */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Resultado
            </CardTitle>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className="space-y-4">
                <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Data Final do Prazo</p>
                  <p className="text-lg font-serif text-primary mt-1">{formatDate(result.data_final)}</p>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-muted/50 rounded">
                    <p className="text-lg font-bold text-foreground">{result.dias_uteis}</p>
                    <p className="text-[10px] text-muted-foreground">Dias úteis</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded">
                    <p className="text-lg font-bold text-foreground">{result.dias_corridos}</p>
                    <p className="text-[10px] text-muted-foreground">Dias corridos</p>
                  </div>
                  <div className="text-center p-3 bg-muted/50 rounded">
                    <p className="text-lg font-bold text-foreground">{result.dias_pulados}</p>
                    <p className="text-[10px] text-muted-foreground">Dias pulados</p>
                  </div>
                </div>

                {result.detalhes.length > 0 && (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Dias Excluídos</p>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {result.detalhes.map((d, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                          <ChevronRight className="h-3 w-3 text-primary flex-shrink-0" />
                          {d}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded text-xs text-warning-foreground dark:text-warning">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <p>
                    Considere feriados estaduais/municipais e suspensões do tribunal. Confira sempre o calendário do respectivo tribunal.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Calculator className="h-10 w-10 mb-3 opacity-30" />
                <p className="text-sm">Defina o prazo e clique em calcular</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Feriados */}
      {feriados.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              Feriados Nacionais — {new Date(dataInicio).getFullYear()}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
              {feriados.map((f, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-muted/30 rounded text-xs">
                  <Calendar className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                  <span className="font-mono text-muted-foreground">{f.date}</span>
                  <span className="text-foreground truncate">{f.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
