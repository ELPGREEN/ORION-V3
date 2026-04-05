import { useState, useEffect, useCallback } from "react";
import {
  Cloud, CloudUpload, CloudDownload, FileDown, FileText,
  Loader2, Link2, Unlink, ExternalLink, ShieldCheck,
  FolderOpen, Share2, Search, ChevronRight,
} from "lucide-react";
import { DocRevisionHistory } from "./DocRevisionHistory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip, TooltipContent, TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { GoogleDocsSyncState, DriveFile } from "@/hooks/useGoogleDocsSync";

interface GoogleDocsSyncBarProps {
  linkedDocId: string | null;
  syncing: boolean;
  lastSyncAt: string | null;
  hasGoogleToken: boolean;
  needsScopes?: boolean;
  onCreateAndLink: (title: string) => Promise<string | null>;
  onPush: () => void;
  onPull: () => void;
  onExport: (format: "pdf" | "docx") => void;
  onLoadTemplate: (templateId: string) => void;
  onLinkDoc: (docId: string) => void;
  onUnlink: () => void;
  onAuthorize?: () => void;
  onListDrive?: (query?: string, pageToken?: string) => Promise<{ files: DriveFile[]; nextPageToken?: string } | null>;
  onImportFromDrive?: (fileId: string) => Promise<string | null>;
  onShareDocument?: (docId: string, email: string, role: "reader" | "writer" | "commenter") => Promise<boolean>;
  onRestoreRevision?: (html: string) => void;
  documentTitle?: string;
}

export function GoogleDocsSyncBar({
  linkedDocId, syncing, lastSyncAt, hasGoogleToken, needsScopes,
  onCreateAndLink, onPush, onPull, onExport,
  onLoadTemplate, onLinkDoc, onUnlink, onAuthorize,
  onListDrive, onImportFromDrive, onShareDocument,
  onRestoreRevision,
  documentTitle,
}: GoogleDocsSyncBarProps) {
  const [templateId, setTemplateId] = useState("");
  const [manualDocId, setManualDocId] = useState("");

  if (!hasGoogleToken) return null;

  if (needsScopes && onAuthorize) {
    return (
      <div className="flex items-center gap-2 px-2 py-1.5 bg-card border border-border rounded-md text-xs">
        <ShieldCheck className="h-3.5 w-3.5 text-destructive shrink-0" />
        <span className="text-muted-foreground">Faltam os escopos do Google Docs e Drive nesta sessão.</span>
        <Button variant="default" size="sm" className="h-6 px-2 text-xs gap-1" onClick={onAuthorize}>
          <ShieldCheck className="h-3 w-3" /> Reautorizar Google
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1.5 flex-wrap px-2 py-1.5 bg-card border border-border rounded-md text-xs">
      <Cloud className="h-3.5 w-3.5 text-primary shrink-0" />
      <span className="text-muted-foreground font-medium shrink-0">Google Docs</span>

      {/* Link / Unlink */}
      {linkedDocId ? (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost" size="sm" className="h-6 px-1.5 gap-1 text-xs"
                onClick={() => window.open(`https://docs.google.com/document/d/${linkedDocId}/edit`, "_blank")}
              >
                <ExternalLink className="h-3 w-3" /> Abrir
              </Button>
            </TooltipTrigger>
            <TooltipContent>Abrir no Google Docs</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost" size="sm" className="h-6 px-1.5 gap-1 text-xs"
                onClick={onPush} disabled={syncing}
              >
                {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CloudUpload className="h-3 w-3" />}
                Enviar
              </Button>
            </TooltipTrigger>
            <TooltipContent>Enviar conteúdo local → Google Docs</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost" size="sm" className="h-6 px-1.5 gap-1 text-xs"
                onClick={onPull} disabled={syncing}
              >
                {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CloudDownload className="h-3 w-3" />}
                Importar
              </Button>
            </TooltipTrigger>
            <TooltipContent>Importar conteúdo Google Docs → local</TooltipContent>
          </Tooltip>

          {/* Revisions */}
          <DocRevisionHistory
            documentId={linkedDocId}
            onRestoreRevision={onRestoreRevision}
          />

          {/* Share */}
          {onShareDocument && (
            <ShareDocButton docId={linkedDocId} onShare={onShareDocument} />
          )}

          <Button
            variant="ghost" size="sm" className="h-6 px-1.5 gap-1 text-xs text-destructive"
            onClick={onUnlink}
          >
            <Unlink className="h-3 w-3" /> Desvincular
          </Button>
        </>
      ) : (
        <>
          <Button
            variant="ghost" size="sm" className="h-6 px-1.5 gap-1 text-xs"
            onClick={() => onCreateAndLink(documentTitle || "Documento")}
            disabled={syncing}
          >
            {syncing ? <Loader2 className="h-3 w-3 animate-spin" /> : <FileText className="h-3 w-3" />}
            Criar & Vincular
          </Button>

          {/* Browse Drive */}
          {onListDrive && onImportFromDrive && (
            <DriveBrowser onListDrive={onListDrive} onImport={onImportFromDrive} onLink={onLinkDoc} />
          )}

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="sm" className="h-6 px-1.5 gap-1 text-xs">
                <Link2 className="h-3 w-3" /> Vincular ID
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3 space-y-2">
              <p className="text-xs text-muted-foreground">Cole o ID do Google Doc:</p>
              <div className="flex gap-1.5">
                <Input
                  value={manualDocId} onChange={(e) => setManualDocId(e.target.value)}
                  placeholder="ID do documento" className="h-7 text-xs"
                />
                <Button size="sm" className="h-7 text-xs px-2"
                  onClick={() => { onLinkDoc(manualDocId); setManualDocId(""); }}
                  disabled={!manualDocId.trim()}
                >
                  OK
                </Button>
              </div>
            </PopoverContent>
          </Popover>
        </>
      )}

      {/* Separator */}
      <div className="h-4 w-px bg-border mx-0.5" />

      {/* Export via Google Docs */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost" size="sm" className="h-6 px-1.5 gap-1 text-xs"
            onClick={() => onExport("pdf")} disabled={syncing}
          >
            <FileDown className="h-3 w-3" /> PDF
          </Button>
        </TooltipTrigger>
        <TooltipContent>Exportar PDF via Google Docs (alta fidelidade)</TooltipContent>
      </Tooltip>


      {/* Separator */}
      <div className="h-4 w-px bg-border mx-0.5" />

      {/* Template */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-6 px-1.5 gap-1 text-xs">
            <FileText className="h-3 w-3" /> Template
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-3 space-y-2">
          <p className="text-xs text-muted-foreground">
            Cole o ID de um Google Doc como template:
          </p>
          <div className="flex gap-1.5">
            <Input
              value={templateId} onChange={(e) => setTemplateId(e.target.value)}
              placeholder="ID do template" className="h-7 text-xs"
            />
            <Button size="sm" className="h-7 text-xs px-2"
              onClick={() => { onLoadTemplate(templateId); setTemplateId(""); }}
              disabled={!templateId.trim() || syncing}
            >
              Carregar
            </Button>
          </div>
        </PopoverContent>
      </Popover>

      {/* Sync status */}
      {lastSyncAt && (
        <span className="text-[10px] text-muted-foreground ml-auto">
          Sync: {new Date(lastSyncAt).toLocaleTimeString("pt-BR")}
        </span>
      )}
    </div>
  );
}

// ─── Sub-components ───

function DriveBrowser({
  onListDrive,
  onImport,
  onLink,
}: {
  onListDrive: (query?: string, pageToken?: string) => Promise<{ files: DriveFile[]; nextPageToken?: string } | null>;
  onImport: (fileId: string) => Promise<string | null>;
  onLink: (docId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [nextPage, setNextPage] = useState<string | undefined>();

  const loadFiles = useCallback(async (query?: string, pageToken?: string) => {
    setLoading(true);
    const result = await onListDrive(query, pageToken);
    if (result) {
      setFiles(pageToken ? (prev) => [...prev, ...result.files] : result.files);
      setNextPage(result.nextPageToken);
    }
    setLoading(false);
  }, [onListDrive]);

  useEffect(() => {
    if (open) loadFiles();
  }, [open]);

  const handleSearch = () => {
    setFiles([]);
    loadFiles(search);
  };

  const handleSelect = async (file: DriveFile) => {
    onLink(file.id);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 px-1.5 gap-1 text-xs">
          <FolderOpen className="h-3 w-3" /> Google Drive
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            <FolderOpen className="h-4 w-4 text-primary" />
            Selecionar do Google Drive
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Buscar documentos..."
              className="h-8 text-xs"
            />
            <Button size="sm" className="h-8 px-2" onClick={handleSearch} disabled={loading}>
              <Search className="h-3.5 w-3.5" />
            </Button>
          </div>
          <ScrollArea className="h-64">
            {loading && files.length === 0 ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : files.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Nenhum documento encontrado</p>
            ) : (
              <div className="space-y-1">
                {files.map((file) => (
                  <button
                    key={file.id}
                    onClick={() => handleSelect(file)}
                    className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-accent/50 transition-colors text-left group"
                  >
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate text-foreground">{file.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(file.modifiedTime).toLocaleDateString("pt-BR")}
                        {file.owners?.[0]?.displayName && ` • ${file.owners[0].displayName}`}
                      </p>
                    </div>
                    <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
                {nextPage && (
                  <Button
                    variant="ghost" size="sm"
                    className="w-full h-7 text-xs text-muted-foreground"
                    onClick={() => loadFiles(search, nextPage)}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                    Carregar mais
                  </Button>
                )}
              </div>
            )}
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ShareDocButton({
  docId,
  onShare,
}: {
  docId: string;
  onShare: (docId: string, email: string, role: "reader" | "writer" | "commenter") => Promise<boolean>;
}) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"reader" | "writer" | "commenter">("writer");
  const [sharing, setSharing] = useState(false);

  const handleShare = async () => {
    if (!email.trim()) return;
    setSharing(true);
    const ok = await onShare(docId, email, role);
    setSharing(false);
    if (ok) setEmail("");
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 px-1.5 gap-1 text-xs">
          <Share2 className="h-3 w-3" /> Compartilhar
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3 space-y-2">
        <p className="text-xs font-medium text-foreground">Compartilhar via Google Drive</p>
        <Input
          value={email} onChange={(e) => setEmail(e.target.value)}
          placeholder="email@exemplo.com" className="h-7 text-xs"
          type="email"
        />
        <div className="flex gap-1">
          {(["writer", "commenter", "reader"] as const).map((r) => (
            <Button
              key={r}
              variant={role === r ? "default" : "outline"}
              size="sm" className="h-6 text-[10px] px-2 flex-1"
              onClick={() => setRole(r)}
            >
              {r === "writer" ? "Editor" : r === "commenter" ? "Comentar" : "Leitor"}
            </Button>
          ))}
        </div>
        <Button
          size="sm" className="w-full h-7 text-xs"
          onClick={handleShare}
          disabled={!email.trim() || sharing}
        >
          {sharing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Share2 className="h-3 w-3 mr-1" />}
          Compartilhar
        </Button>
      </PopoverContent>
    </Popover>
  );
}
