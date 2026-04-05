import { useState, useCallback } from "react";
import { sanitizeHTML } from "@/lib/sanitize";
import {
  History, Loader2, Eye, ChevronDown, ChevronUp, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Collapsible, CollapsibleContent, CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useGoogleToken } from "@/hooks/useGoogleToken";
import { useToast } from "@/hooks/use-toast";

interface Revision {
  id: string;
  modifiedTime: string;
  lastModifyingUser?: {
    displayName?: string;
    emailAddress?: string;
    photoLink?: string;
  };
  size?: string;
}

interface DocRevisionHistoryProps {
  documentId: string;
  onRestoreRevision?: (html: string) => void;
}

export function DocRevisionHistory({ documentId, onRestoreRevision }: DocRevisionHistoryProps) {
  const { invokeGoogleFunction, hasGoogleToken } = useGoogleToken();
  const { toast } = useToast();
  const [revisions, setRevisions] = useState<Revision[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewingId, setPreviewingId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const loadRevisions = useCallback(async () => {
    if (!hasGoogleToken || !documentId) return;
    setLoading(true);
    try {
      const result = await invokeGoogleFunction("google-docs", {
        action: "list_revisions",
        documentId,
      });
      setRevisions((result.revisions || []).reverse());
    } catch (err: any) {
      toast({ title: "Erro ao carregar revisões", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [hasGoogleToken, documentId, invokeGoogleFunction, toast]);

  const previewRevision = useCallback(async (revisionId: string) => {
    if (previewingId === revisionId) {
      setPreviewHtml(null);
      setPreviewingId(null);
      return;
    }
    setPreviewingId(revisionId);
    try {
      const result = await invokeGoogleFunction("google-docs", {
        action: "export_revision_html",
        documentId,
        revisionId,
      });
      setPreviewHtml(result.html);
    } catch (err: any) {
      toast({ title: "Erro ao visualizar revisão", description: err.message, variant: "destructive" });
      setPreviewingId(null);
    }
  }, [documentId, invokeGoogleFunction, toast, previewingId]);

  if (!hasGoogleToken) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (v) loadRevisions(); }}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 px-1.5 gap-1 text-xs">
          <History className="h-3 w-3" /> Revisões
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            <History className="h-4 w-4 text-primary" />
            Histórico de Revisões
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : revisions.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">Nenhuma revisão encontrada</p>
        ) : (
          <ScrollArea className="h-[60vh]">
            <div className="space-y-1 pr-3">
              {revisions.map((rev, i) => (
                <Collapsible key={rev.id} open={previewingId === rev.id}>
                  <div className="flex items-center gap-2 p-2 rounded-md hover:bg-accent/50 transition-colors">
                    <div className="flex items-center justify-center h-6 w-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0">
                      {revisions.length - i}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">
                        {new Date(rev.modifiedTime).toLocaleString("pt-BR", {
                          day: "2-digit", month: "2-digit", year: "numeric",
                          hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                      {rev.lastModifyingUser && (
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <User className="h-2.5 w-2.5" />
                          {rev.lastModifyingUser.displayName || rev.lastModifyingUser.emailAddress || "Desconhecido"}
                        </p>
                      )}
                    </div>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost" size="sm"
                        className="h-6 px-1.5 text-xs gap-1"
                        onClick={() => previewRevision(rev.id)}
                      >
                        <Eye className="h-3 w-3" />
                        {previewingId === rev.id ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </Button>
                    </CollapsibleTrigger>
                    {onRestoreRevision && previewHtml && previewingId === rev.id && (
                      <Button
                        variant="outline" size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={() => {
                          onRestoreRevision(previewHtml);
                          setOpen(false);
                          toast({ title: "Revisão restaurada!" });
                        }}
                      >
                        Restaurar
                      </Button>
                    )}
                  </div>
                  <CollapsibleContent>
                    {previewingId === rev.id && previewHtml && (
                      <div className="ml-8 mr-2 mb-2 border border-border rounded-md p-3 bg-muted/30 max-h-48 overflow-auto">
                        <div
                          className="prose prose-sm max-w-none text-xs"
                          dangerouslySetInnerHTML={{ __html: sanitizeHTML(previewHtml) }}
                        />
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </ScrollArea>
        )}
      </DialogContent>
    </Dialog>
  );
}
