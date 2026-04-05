import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, ClipboardList, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { googleFormsCreate, googleFormsGet, googleFormsResponses } from "@/lib/google-server";

export function GoogleFormsPanel() {
  const [title, setTitle] = useState("");
  const [formId, setFormId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [responses, setResponses] = useState<any>(null);
  const { toast } = useToast();

  async function handleCreate() {
    if (!title.trim()) return;
    setLoading(true);
    try {
      const data = await googleFormsCreate(title.trim());
      setResult(data);
      toast({ title: "Formulário criado!" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  }

  async function handleGetResponses() {
    if (!formId.trim()) return;
    setLoading(true);
    try {
      const data = await googleFormsResponses(formId.trim());
      setResponses(data);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="h-5 w-5 text-primary" />
          Google Forms
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Criar Formulário</label>
          <div className="flex gap-2">
            <Input placeholder="Título do formulário" value={title} onChange={e => setTitle(e.target.value)} />
            <Button onClick={handleCreate} disabled={loading || !title.trim()} size="sm">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar"}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Ver Respostas</label>
          <div className="flex gap-2">
            <Input placeholder="ID do formulário" value={formId} onChange={e => setFormId(e.target.value)} />
            <Button onClick={handleGetResponses} disabled={loading || !formId.trim()} size="sm" variant="outline">
              Respostas
            </Button>
          </div>
        </div>

        {result && (
          <div className="p-3 rounded-lg bg-muted/50 space-y-1">
            <p className="text-sm font-medium text-foreground">{result.info?.title || "Formulário criado"}</p>
            {result.formId && (
              <a href={`https://docs.google.com/forms/d/${result.formId}`} target="_blank" rel="noopener noreferrer"
                className="text-xs text-primary flex items-center gap-1 hover:underline">
                <ExternalLink className="h-3 w-3" /> Abrir no Google Forms
              </a>
            )}
          </div>
        )}

        {responses && (
          <div className="p-3 rounded-lg bg-muted/50">
            <p className="text-sm font-medium text-foreground mb-2">
              {responses.responses?.length || 0} respostas
            </p>
            {responses.responses?.slice(0, 5).map((r: any, i: number) => (
              <div key={i} className="text-xs text-muted-foreground border-t border-border pt-1 mt-1">
                Resposta {i + 1}: {r.createTime ? new Date(r.createTime).toLocaleString("pt-BR") : "—"}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
