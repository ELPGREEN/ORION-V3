import { useState, useCallback } from "react";
import { useGoogleToken } from "@/hooks/useGoogleToken";
import { useGoogleScopes } from "@/hooks/useGoogleScopes";
import { useToast } from "@/hooks/use-toast";

export interface GoogleDocsSyncState {
  linkedDocId: string | null;
  syncing: boolean;
  lastSyncAt: string | null;
  needsScopes: boolean;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime: string;
  iconLink?: string;
  webViewLink?: string;
  owners?: { displayName: string; emailAddress: string }[];
  shared?: boolean;
}

function isScopeError(err: any): boolean {
  const msg = typeof err === "string" ? err : err?.message || "";
  return (
    msg.includes("PERMISSION_DENIED") ||
    msg.includes("ACCESS_TOKEN_SCOPE_INSUFFICIENT") ||
    msg.includes("insufficient authentication scopes") ||
    msg.includes("Request had insufficient")
  );
}

export function useGoogleDocsSync() {
  const { invokeGoogleFunction, hasGoogleToken } = useGoogleToken();
  const { requestScopes } = useGoogleScopes();
  const { toast } = useToast();
  const [state, setState] = useState<GoogleDocsSyncState>({
    linkedDocId: null,
    syncing: false,
    lastSyncAt: null,
    needsScopes: false,
  });

  const handleScopeError = useCallback(async () => {
    setState((s) => ({ ...s, syncing: false, needsScopes: true }));
    toast({
      title: "Permissões do Google necessárias",
      description: "Redirecionando para autorizar Google Docs e Drive nesta mesma tela.",
    });

    const { error } = await requestScopes(["docs", "drive"]);
    if (error) {
      toast({
        title: "Erro ao solicitar permissões",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [requestScopes, toast]);

  const authorizeGoogleDocs = useCallback(async () => {
    const { error } = await requestScopes(["docs", "drive"]);
    if (error) {
      toast({ title: "Erro ao solicitar permissões", description: error.message, variant: "destructive" });
      return;
    }

    setState((s) => ({ ...s, needsScopes: false }));
    toast({
      title: "Autorização iniciada",
      description: "Conclua o consentimento do Google para liberar Docs e Drive.",
    });
  }, [requestScopes, toast]);

  const setLinkedDoc = useCallback((docId: string | null) => {
    setState((s) => ({ ...s, linkedDocId: docId }));
  }, []);

  /** Create a new Google Doc and link it */
  const createAndLink = useCallback(
    async (title: string): Promise<string | null> => {
      if (!hasGoogleToken) {
        toast({ title: "Login com Google necessário", variant: "destructive" });
        return null;
      }
      setState((s) => ({ ...s, syncing: true }));
      try {
        const result = await invokeGoogleFunction("google-docs", {
          action: "create",
          title,
        });
        const docId = result.documentId;
        setState((s) => ({ ...s, linkedDocId: docId, syncing: false, needsScopes: false }));
        toast({ title: "Google Doc criado e vinculado!", description: result.title });
        return docId;
      } catch (err: any) {
        if (isScopeError(err)) {
          await handleScopeError();
          return null;
        }
        toast({ title: "Erro ao criar Google Doc", description: err.message, variant: "destructive" });
        setState((s) => ({ ...s, syncing: false }));
        return null;
      }
    },
    [hasGoogleToken, invokeGoogleFunction, toast, handleScopeError]
  );

  /** Push local HTML content to Google Docs using Drive upload (preserves formatting) */
  const pushToGoogleDocs = useCallback(
    async (htmlContent: string, title?: string) => {
      if (!state.linkedDocId || !hasGoogleToken) return;
      setState((s) => ({ ...s, syncing: true }));
      try {
        await invokeGoogleFunction("google-docs", {
          action: "upload_html",
          content: htmlContent,
          title: title || "Documento",
          documentId: state.linkedDocId,
        });

        setState((s) => ({
          ...s,
          syncing: false,
          lastSyncAt: new Date().toISOString(),
          needsScopes: false,
        }));
        toast({ title: "Documento sincronizado com Google Docs!" });
      } catch (err: any) {
        if (isScopeError(err)) {
          await handleScopeError();
          return;
        }
        toast({ title: "Erro ao sincronizar", description: err.message, variant: "destructive" });
        setState((s) => ({ ...s, syncing: false }));
      }
    },
    [state.linkedDocId, hasGoogleToken, invokeGoogleFunction, toast, handleScopeError]
  );

  /** Pull content from Google Docs as HTML (preserves formatting) */
  const pullFromGoogleDocs = useCallback(async (): Promise<string | null> => {
    if (!state.linkedDocId || !hasGoogleToken) return null;
    setState((s) => ({ ...s, syncing: true }));
    try {
      const result = await invokeGoogleFunction("google-docs", {
        action: "download_html",
        documentId: state.linkedDocId,
      });
      const html = cleanGoogleHtml(result.html);
      setState((s) => ({
        ...s,
        syncing: false,
        lastSyncAt: new Date().toISOString(),
        needsScopes: false,
      }));
      toast({ title: "Conteúdo importado do Google Docs!" });
      return html;
    } catch (err: any) {
      if (isScopeError(err)) {
        await handleScopeError();
        return null;
      }
      toast({ title: "Erro ao importar", description: err.message, variant: "destructive" });
      setState((s) => ({ ...s, syncing: false }));
      return null;
    }
  }, [state.linkedDocId, hasGoogleToken, invokeGoogleFunction, toast, handleScopeError]);

  /** Export via Google Docs for higher-fidelity PDF/DOCX */
  const exportViaGoogleDocs = useCallback(
    async (format: "pdf" | "docx", htmlContent: string, title: string) => {
      if (!hasGoogleToken) {
        toast({ title: "Login com Google necessário", variant: "destructive" });
        return;
      }
      setState((s) => ({ ...s, syncing: true }));
      try {
        const uploadResult = await invokeGoogleFunction("google-docs", {
          action: "upload_html",
          content: htmlContent,
          title,
        });
        const tempDocId = uploadResult.id;

        window.open(
          `https://docs.google.com/document/d/${tempDocId}/export?format=${format}`,
          "_blank"
        );
        toast({ title: `Exportação ${format.toUpperCase()} via Google Docs concluída!` });
      } catch (err: any) {
        if (isScopeError(err)) {
          await handleScopeError();
          return;
        }
        toast({ title: "Erro na exportação", description: err.message, variant: "destructive" });
      } finally {
        setState((s) => ({ ...s, syncing: false }));
      }
    },
    [hasGoogleToken, invokeGoogleFunction, toast, handleScopeError]
  );

  /** Create from a Google Docs template */
  const createFromTemplate = useCallback(
    async (templateDocId: string): Promise<string | null> => {
      if (!hasGoogleToken) return null;
      setState((s) => ({ ...s, syncing: true }));
      try {
        const copyResult = await invokeGoogleFunction("google-docs", {
          action: "drive_copy",
          fileId: templateDocId,
          title: "Novo documento (template)",
        });
        const htmlResult = await invokeGoogleFunction("google-docs", {
          action: "download_html",
          documentId: copyResult.id,
        });
        setState((s) => ({ ...s, syncing: false, linkedDocId: copyResult.id, needsScopes: false }));
        toast({ title: "Template carregado e vinculado!", description: copyResult.name });
        return cleanGoogleHtml(htmlResult.html);
      } catch (err: any) {
        if (isScopeError(err)) {
          await handleScopeError();
          return null;
        }
        toast({ title: "Erro ao carregar template", description: err.message, variant: "destructive" });
        setState((s) => ({ ...s, syncing: false }));
        return null;
      }
    },
    [hasGoogleToken, invokeGoogleFunction, toast, handleScopeError]
  );

  /** List Google Drive documents */
  const listDriveDocuments = useCallback(
    async (searchQuery?: string, nextPageToken?: string): Promise<{ files: DriveFile[]; nextPageToken?: string } | null> => {
      if (!hasGoogleToken) return null;
      try {
        let q = "mimeType='application/vnd.google-apps.document' and trashed=false";
        if (searchQuery?.trim()) {
          q += ` and name contains '${searchQuery.replace(/'/g, "\\'")}'`;
        }
        const result = await invokeGoogleFunction("google-docs", {
          action: "drive_list",
          query: q,
          pageToken: nextPageToken,
          pageSize: 20,
        });
        setState((s) => ({ ...s, needsScopes: false }));
        return {
          files: result.files || [],
          nextPageToken: result.nextPageToken,
        };
      } catch (err: any) {
        if (isScopeError(err)) {
          await handleScopeError();
          return null;
        }
        toast({ title: "Erro ao listar documentos", description: err.message, variant: "destructive" });
        return null;
      }
    },
    [hasGoogleToken, invokeGoogleFunction, toast, handleScopeError]
  );

  /** Share a Google Doc with someone */
  const shareDocument = useCallback(
    async (docId: string, email: string, role: "reader" | "writer" | "commenter" = "writer") => {
      if (!hasGoogleToken) return false;
      try {
        await invokeGoogleFunction("google-docs", {
          action: "drive_share",
          documentId: docId,
          email,
          role,
        });
        setState((s) => ({ ...s, needsScopes: false }));
        toast({ title: "Documento compartilhado!", description: `${email} agora tem acesso como ${role}.` });
        return true;
      } catch (err: any) {
        if (isScopeError(err)) {
          await handleScopeError();
          return false;
        }
        toast({ title: "Erro ao compartilhar", description: err.message, variant: "destructive" });
        return false;
      }
    },
    [hasGoogleToken, invokeGoogleFunction, toast, handleScopeError]
  );

  /** Import a document from Google Drive by ID */
  const importFromDrive = useCallback(
    async (fileId: string): Promise<string | null> => {
      if (!hasGoogleToken) return null;
      setState((s) => ({ ...s, syncing: true }));
      try {
        const htmlResult = await invokeGoogleFunction("google-docs", {
          action: "download_html",
          fileId,
        });
        setState((s) => ({
          ...s,
          syncing: false,
          linkedDocId: fileId,
          lastSyncAt: new Date().toISOString(),
          needsScopes: false,
        }));
        toast({ title: "Documento importado do Google Drive!" });
        return cleanGoogleHtml(htmlResult.html);
      } catch (err: any) {
        if (isScopeError(err)) {
          await handleScopeError();
          return null;
        }
        toast({ title: "Erro ao importar do Drive", description: err.message, variant: "destructive" });
        setState((s) => ({ ...s, syncing: false }));
        return null;
      }
    },
    [hasGoogleToken, invokeGoogleFunction, toast, handleScopeError]
  );

  return {
    ...state,
    hasGoogleToken,
    setLinkedDoc,
    createAndLink,
    pushToGoogleDocs,
    pullFromGoogleDocs,
    exportViaGoogleDocs,
    createFromTemplate,
    authorizeGoogleDocs,
    listDriveDocuments,
    shareDocument,
    importFromDrive,
  };
}

// ─── Helpers ───

/** Clean Google's exported HTML to be more usable in TipTap */
function cleanGoogleHtml(html: string): string {
  if (!html) return "<p></p>";

  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  let content = bodyMatch ? bodyMatch[1] : html;

  content = content.replace(/style="([^"]*)"/g, (match, styles: string) => {
    const keepProps = [
      "font-weight", "font-style", "text-decoration", "font-size",
      "color", "background-color", "text-align",
    ];
    const filtered = styles
      .split(";")
      .map((s: string) => s.trim())
      .filter((s: string) => {
        const prop = s.split(":")[0]?.trim().toLowerCase();
        return keepProps.some((kp) => prop === kp);
      })
      .join("; ");
    return filtered ? `style="${filtered}"` : "";
  });

  content = content.replace(/<span\s*>(.*?)<\/span>/g, "$1");
  content = content.replace(/<a[^>]*id="[^"]*"[^>]*><\/a>/g, "");
  content = content.replace(/\n\s*\n/g, "\n");

  return content || "<p></p>";
}
