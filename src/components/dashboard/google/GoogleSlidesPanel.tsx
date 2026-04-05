import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Loader2, Presentation, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { googleSlidesCreate, googleSlidesGet } from "@/lib/google-server";

export function GoogleSlidesPanel() {
  const [title, setTitle] = useState("");
  const [presentationId, setPresentationId] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  async function handleCreate() {
    if (!title.trim()) return;
    setLoading(true);
    try {
      const data = await googleSlidesCreate(title.trim());
      setResult(data);
      toast({ title: "Apresentação criada!", description: data.presentationId });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  }

  async function handleGet() {
    if (!presentationId.trim()) return;
    setLoading(true);
    try {
      const data = await googleSlidesGet(presentationId.trim());
      setResult(data);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Presentation className="h-5 w-5 text-primary" />
          Google Slides
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Criar Apresentação</label>
          <div className="flex gap-2">
            <Input placeholder="Título da apresentação" value={title} onChange={e => setTitle(e.target.value)} />
            <Button onClick={handleCreate} disabled={loading || !title.trim()} size="sm">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Criar"}
            </Button>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Consultar Apresentação</label>
          <div className="flex gap-2">
            <Input placeholder="ID da apresentação" value={presentationId} onChange={e => setPresentationId(e.target.value)} />
            <Button onClick={handleGet} disabled={loading || !presentationId.trim()} size="sm" variant="outline">
              Buscar
            </Button>
          </div>
        </div>

        {result && (
          <div className="p-3 rounded-lg bg-muted/50 space-y-2">
            <p className="text-sm font-medium text-foreground">{result.title || result.presentationId}</p>
            {result.presentationId && (
              <a
                href={`https://docs.google.com/presentation/d/${result.presentationId}`}
                target="_blank" rel="noopener noreferrer"
                className="text-xs text-primary flex items-center gap-1 hover:underline"
              >
                <ExternalLink className="h-3 w-3" /> Abrir no Google Slides
              </a>
            )}
            {result.slides && (
              <p className="text-xs text-muted-foreground">{result.slides.length} slides</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
