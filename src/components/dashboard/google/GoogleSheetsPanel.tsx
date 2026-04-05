import { useState } from "react";
import {
  Table,
  Plus,
  Loader2,
  RefreshCw,
  Download,
  ExternalLink,
  AlertCircle,
  Pencil,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useGoogleToken } from "@/hooks/useGoogleToken";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function GoogleSheetsPanel() {
  const { invokeGoogleFunction, hasGoogleToken } = useGoogleToken();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [sheetId, setSheetId] = useState("");
  const [sheetData, setSheetData] = useState<any>(null);
  const [range, setRange] = useState("Sheet1!A1:Z50");
  const [cellValues, setCellValues] = useState<string[][]>([]);
  const [newTitle, setNewTitle] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [writeRange, setWriteRange] = useState("Sheet1!A1");
  const [writeValue, setWriteValue] = useState("");

  if (!hasGoogleToken) {
    return (
      <Card className="border-border">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-muted-foreground">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm">Faça login com Google para usar o Google Sheets.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleCreate = async () => {
    setLoading(true);
    try {
      const result = await invokeGoogleFunction("google-sheets", {
        action: "create",
        title: newTitle || "Nova Planilha",
      });
      toast({ title: "Planilha criada!", description: result.properties?.title });
      setSheetId(result.spreadsheetId);
      setCreateOpen(false);
      setNewTitle("");
    } catch (err: any) {
      toast({ title: "Erro ao criar planilha", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRead = async () => {
    if (!sheetId) return;
    setLoading(true);
    try {
      const result = await invokeGoogleFunction("google-sheets", {
        action: "read",
        spreadsheetId: sheetId,
        range,
      });
      setCellValues(result.values || []);
      toast({ title: "Dados carregados", description: `${result.values?.length || 0} linhas` });
    } catch (err: any) {
      toast({ title: "Erro ao ler planilha", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGetInfo = async () => {
    if (!sheetId) return;
    setLoading(true);
    try {
      const result = await invokeGoogleFunction("google-sheets", {
        action: "get",
        spreadsheetId: sheetId,
      });
      setSheetData(result);
      toast({ title: "Info carregada", description: result.properties?.title });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleWrite = async () => {
    if (!sheetId || !writeRange || !writeValue) return;
    setLoading(true);
    try {
      const rows = writeValue.split("\n").map((row) => row.split("\t"));
      await invokeGoogleFunction("google-sheets", {
        action: "write",
        spreadsheetId: sheetId,
        range: writeRange,
        values: rows,
      });
      toast({ title: "Dados gravados!" });
      handleRead();
    } catch (err: any) {
      toast({ title: "Erro ao gravar", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-2">
              <Plus className="h-4 w-4" /> Nova Planilha
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nova Planilha Google</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Título da planilha"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
              />
              <Button onClick={handleCreate} disabled={loading} className="w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                Criar
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Sheet ID input */}
      <Card className="border-border">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Table className="h-4 w-4 text-primary" />
            Acessar Planilha
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="ID da planilha Google Sheets"
              value={sheetId}
              onChange={(e) => setSheetId(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleGetInfo} disabled={loading || !sheetId} size="sm" variant="outline">
              Info
            </Button>
          </div>

          {sheetData && (
            <div className="text-sm space-y-1">
              <p className="font-medium text-foreground">{sheetData.properties?.title}</p>
              <div className="flex gap-2 flex-wrap">
                {sheetData.sheets?.map((s: any) => (
                  <span key={s.properties?.sheetId} className="text-xs bg-muted px-2 py-1 rounded">
                    {s.properties?.title}
                  </span>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(`https://docs.google.com/spreadsheets/d/${sheetId}/edit`, "_blank")}
              >
                <ExternalLink className="h-3 w-3 mr-1" /> Abrir no Google
              </Button>
            </div>
          )}

          {/* Read */}
          <div className="flex gap-2">
            <Input
              placeholder="Range (ex: Sheet1!A1:D10)"
              value={range}
              onChange={(e) => setRange(e.target.value)}
              className="flex-1"
            />
            <Button onClick={handleRead} disabled={loading || !sheetId} size="sm">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>

          {/* Data table */}
          {cellValues.length > 0 && (
            <div className="border border-border rounded-md overflow-auto max-h-64">
              <table className="w-full text-xs">
                <tbody>
                  {cellValues.map((row, i) => (
                    <tr key={i} className={i === 0 ? "bg-muted font-medium" : "border-t border-border"}>
                      {row.map((cell, j) => (
                        <td key={j} className="px-2 py-1.5 text-foreground whitespace-nowrap">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Write */}
          <div className="space-y-2 pt-2 border-t border-border">
            <p className="text-xs text-muted-foreground">Escrever dados (use Tab para separar colunas, Enter para linhas)</p>
            <div className="flex gap-2">
              <Input
                placeholder="Range (ex: Sheet1!A1)"
                value={writeRange}
                onChange={(e) => setWriteRange(e.target.value)}
                className="w-40"
              />
            </div>
            <textarea
              className="w-full h-20 text-xs p-2 rounded-md border border-border bg-background text-foreground font-mono resize-none"
              placeholder={"Dado1\tDado2\tDado3\nDado4\tDado5\tDado6"}
              value={writeValue}
              onChange={(e) => setWriteValue(e.target.value)}
            />
            <Button onClick={handleWrite} disabled={loading || !sheetId || !writeValue} size="sm" className="gap-2">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
              Gravar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
