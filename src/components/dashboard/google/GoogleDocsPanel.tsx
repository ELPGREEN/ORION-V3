import { useState } from "react";
import {
  FileText,
  Plus,
  Download,
  Loader2,
  RefreshCw,
  ExternalLink,
  FileDown,
  Edit3,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useGoogleToken } from "@/hooks/useGoogleToken";
import { useGoogleScopes } from "@/hooks/useGoogleScopes";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

function isScopeError(err: any): boolean {
  const msg = typeof err === "string" ? err : err?.message || "";
  return msg.includes("PERMISSION_DENIED") || msg.includes("ACCESS_TOKEN_SCOPE_INSUFFICIENT") || msg.includes("insufficient authentication scopes");
}

export function GoogleDocsPanel() {
  const { invokeGoogleFunction, hasGoogleToken } = useGoogleToken();
  const { requestScopes } = useGoogleScopes();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [docId, setDocId] = useState("");
  const [newDocTitle, setNewDocTitle] = useState("");
  const [docContent, setDocContent] = useState<any>(null);
  const [insertText, setInsertText] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [needsScopes, setNeedsScopes] = useState(false);

  if (!hasGoogleToken) {
    return (
      <Card className="border-border">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-muted-foreground">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm">Faça login com Google para usar o Google Docs.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (needsScopes) {
    return (
      <Card className="border-border">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-destructive" />
            <p className="text-sm text-muted-foreground">Permissões adicionais necessárias para Google Docs.</p>
            <Button size="sm" onClick={() => requestScopes(["docs", "drive"])} className="gap-1">
              <ShieldCheck className="h-4 w-4" /> Autorizar
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleCreate = async () => {
    setLoading(true);
    try {
      const result = await invokeGoogleFunction("google-docs", {
        action: "create",
        title: newDocTitle || "Novo Documento",
      });
      toast({ title: "Documento criado!", description: result.title });
      setDocId(result.documentId);
      setNewDocTitle("");
      setCreateOpen(false);
    } catch (err: any) {
      if (isScopeError(err)) { setNeedsScopes(true); setLoading(false); return; }
      toast({ title: "Erro ao criar documento", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGet = async () => {
    if (!docId) return;
    setLoading(true);
    try {
      const result = await invokeGoogleFunction("google-docs", {
        action: "get",
        documentId: docId,
      });
      setDocContent(result);
      toast({ title: "Documento carregado", description: result.title });
    } catch (err: any) {
      if (isScopeError(err)) { setNeedsScopes(true); setLoading(false); return; }
      toast({ title: "Erro ao carregar documento", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleInsertText = async () => {
    if (!docId || !insertText) return;
    setLoading(true);
    try {
      await invokeGoogleFunction("google-docs", {
        action: "insert_text",
        documentId: docId,
        content: insertText,
      });
      toast({ title: "Texto inserido com sucesso!" });
      setInsertText("");
      handleGet();
    } catch (err: any) {
      if (isScopeError(err)) { setNeedsScopes(true); setLoading(false); return; }
      toast({ title: "Erro ao inserir texto", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: "pdf" | "docx") => {
    if (!docId) return;
    setLoading(true);
    try {
      const result = await invokeGoogleFunction("google-docs", {
        action: format === "pdf" ? "export_pdf" : "export_docx",
        documentId: docId,
      });
      // For binary responses, the edge function returns directly
      toast({ title: `Exportação ${format.toUpperCase()} iniciada` });
    } catch (err: any) {
      if (isScopeError(err)) { setNeedsScopes(true); setLoading(false); return; }
      toast({ title: "Erro na exportação", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const extractPlainText = (doc: any): string => {
    if (!doc?.body?.content) return "";
    return doc.body.content
      .map((el: any) =>
        el.paragraph?.elements
          ?.map((e: any) => e.textRun?.content || "")
          .join("") || ""
      )
      .join("");
  };

  return (
    <div className="space-y-4">
      {/* Actions bar */}
      <div className="flex flex-wrap gap-2">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> Criar Documento
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Novo Google Doc</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Título do documento"
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
              />
              <Button onClick={handleCreate} disabled={loading} className="w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Criar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Document ID input */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Abrir Documento
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="ID do documento Google Docs"
              value={docId}
              onChange={(e) => setDocId(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleGet} disabled={loading || !docId} size="sm">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>

          {docContent && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-foreground">{docContent.title}</h3>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={() => handleExport("pdf")} disabled={loading}>
                    <FileDown className="h-3 w-3 mr-1" /> PDF
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`https://docs.google.com/document/d/${docId}/edit`, "_blank")}
                  >
                    <ExternalLink className="h-3 w-3 mr-1" /> Abrir
                  </Button>
                </div>
              </div>

              <div className="bg-muted/50 rounded-md p-3 max-h-60 overflow-auto">
                <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono">
                  {extractPlainText(docContent) || "(documento vazio)"}
                </pre>
              </div>

              {/* Insert text */}
              <div className="space-y-2">
                <Textarea
                  placeholder="Texto para inserir no documento..."
                  value={insertText}
                  onChange={(e) => setInsertText(e.target.value)}
                  rows={3}
                />
                <Button onClick={handleInsertText} disabled={loading || !insertText} size="sm" className="gap-2">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit3 className="h-4 w-4" />}
                  Inserir Texto
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
