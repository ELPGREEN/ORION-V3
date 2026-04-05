import { useState } from "react";
import {
  FolderOpen,
  Search,
  Loader2,
  RefreshCw,
  Trash2,
  Share2,
  Download,
  FolderPlus,
  ExternalLink,
  AlertCircle,
  File,
  FileText,
  Image,
  FileSpreadsheet,
  Presentation,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useGoogleToken } from "@/hooks/useGoogleToken";
import { Badge } from "@/components/ui/badge";

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  size?: string;
  webViewLink?: string;
  shared?: boolean;
}

const getMimeIcon = (mimeType: string) => {
  if (mimeType.includes("folder")) return <FolderOpen className="h-4 w-4 text-yellow-500" />;
  if (mimeType.includes("document") || mimeType.includes("word")) return <FileText className="h-4 w-4 text-blue-500" />;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return <FileSpreadsheet className="h-4 w-4 text-green-500" />;
  if (mimeType.includes("presentation")) return <Presentation className="h-4 w-4 text-orange-500" />;
  if (mimeType.includes("image")) return <Image className="h-4 w-4 text-purple-500" />;
  return <File className="h-4 w-4 text-muted-foreground" />;
};

export function GoogleDrivePanel() {
  const { invokeGoogleFunction, hasGoogleToken } = useGoogleToken();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [newFolderName, setNewFolderName] = useState("");

  if (!hasGoogleToken) {
    return (
      <Card className="border-border">
        <CardContent className="pt-6">
          <div className="flex items-center gap-3 text-muted-foreground">
            <AlertCircle className="h-5 w-5" />
            <p className="text-sm">Faça login com Google para usar o Google Drive.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const handleList = async () => {
    setLoading(true);
    try {
      const result = await invokeGoogleFunction("google-drive", {
        action: "list",
        pageSize: 30,
      });
      setFiles(result.files || []);
    } catch (err: any) {
      toast({ title: "Erro ao listar arquivos", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery) return handleList();
    setLoading(true);
    try {
      const result = await invokeGoogleFunction("google-drive", {
        action: "search",
        query: searchQuery,
      });
      setFiles(result.files || []);
    } catch (err: any) {
      toast({ title: "Erro na pesquisa", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!newFolderName) return;
    setLoading(true);
    try {
      await invokeGoogleFunction("google-drive", {
        action: "create_folder",
        fileName: newFolderName,
      });
      toast({ title: "Pasta criada!" });
      setNewFolderName("");
      handleList();
    } catch (err: any) {
      toast({ title: "Erro ao criar pasta", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (fileId: string, fileName: string) => {
    if (!confirm(`Excluir "${fileName}"?`)) return;
    try {
      await invokeGoogleFunction("google-drive", { action: "delete", fileId });
      toast({ title: "Arquivo excluído" });
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
    } catch (err: any) {
      toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
    }
  };

  const formatSize = (bytes?: string) => {
    if (!bytes) return "";
    const n = parseInt(bytes);
    if (n < 1024) return `${n} B`;
    if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-4">
      {/* Search & actions */}
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-2 flex-1 min-w-[200px]">
          <Input
            placeholder="Pesquisar no Drive..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={loading} size="sm">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          </Button>
          <Button onClick={handleList} disabled={loading} size="sm" variant="outline">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="Nome da nova pasta"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            className="w-44"
          />
          <Button onClick={handleCreateFolder} disabled={loading || !newFolderName} size="sm" variant="outline">
            <FolderPlus className="h-4 w-4 mr-1" /> Criar
          </Button>
        </div>
      </div>

      {/* File list */}
      {files.length === 0 ? (
        <Card className="border-border">
          <CardContent className="pt-6 text-center text-muted-foreground text-sm">
            Clique em <RefreshCw className="h-3 w-3 inline" /> para carregar seus arquivos do Drive.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 p-3 rounded-md border border-border hover:bg-muted/50 transition-colors group"
            >
              {getMimeIcon(file.mimeType)}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{new Date(file.modifiedTime).toLocaleDateString("pt-BR")}</span>
                  {file.size && <span>{formatSize(file.size)}</span>}
                  {file.shared && <Badge variant="outline" className="text-[10px] px-1">Compartilhado</Badge>}
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {file.webViewLink && (
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => window.open(file.webViewLink, "_blank")}>
                    <ExternalLink className="h-3 w-3" />
                  </Button>
                )}
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleDelete(file.id, file.name)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
