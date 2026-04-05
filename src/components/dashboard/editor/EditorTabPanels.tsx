import { type ReactNode, lazy, Suspense } from "react";
import { TabsContent } from "@/components/ui/tabs";
import { Loader2 } from "lucide-react";

const DocumentContextAnalysisPanel = lazy(() =>
  import("@/components/dashboard/editor/DocumentContextAnalysisPanel").then((m) => ({
    default: m.DocumentContextAnalysisPanel,
  }))
);
const LegalReferencesPanel = lazy(() =>
  import("@/components/dashboard/editor/LegalReferencesPanel").then((m) => ({
    default: m.LegalReferencesPanel,
  }))
);

function LazyFallback() {
  return (
    <div className="flex items-center justify-center py-12 text-muted-foreground">
      <Loader2 className="h-5 w-5 animate-spin mr-2" />
      <span className="text-xs">Carregando…</span>
    </div>
  );
}

interface EditorTabPanelsProps {
  previewContent?: ReactNode;
  settingsContent?: ReactNode;
  commentsContent?: ReactNode;
  suggestionsContent?: ReactNode;
  activityContent?: ReactNode;
  content: string;
  documentLabel?: string;
  documentCategory?: string;
  editor: any;
}

export function EditorTabPanels({
  previewContent,
  settingsContent,
  commentsContent,
  suggestionsContent,
  activityContent,
  content,
  documentLabel,
  documentCategory,
  editor,
}: EditorTabPanelsProps) {
  return (
    <>
      {/* ═══ TAB: Visualizar ═══ */}
      {previewContent && (
        <TabsContent value="visualizar" className="mt-0 flex-1 p-4 overflow-auto">
          {previewContent}
        </TabsContent>
      )}

      {/* ═══ TAB: Configurações ═══ */}
      {settingsContent && (
        <TabsContent value="configuracoes" className="mt-0 flex-1 p-4 overflow-auto">
          {settingsContent}
        </TabsContent>
      )}

      {/* ═══ TAB: Comentários ═══ */}
      {commentsContent && (
        <TabsContent value="comentarios" className="mt-0 flex-1 overflow-auto">
          {commentsContent}
        </TabsContent>
      )}

      {/* ═══ TAB: Sugestões ═══ */}
      {suggestionsContent && (
        <TabsContent value="sugestoes" className="mt-0 flex-1 overflow-auto">
          {suggestionsContent}
        </TabsContent>
      )}

      {/* ═══ TAB: Atividade ═══ */}
      {activityContent && (
        <TabsContent value="atividade" className="mt-0 flex-1 overflow-auto">
          {activityContent}
        </TabsContent>
      )}

      {/* ═══ TAB: Análise ═══ */}
      <TabsContent value="analise" className="mt-0 flex-1 overflow-y-auto">
        <Suspense fallback={<LazyFallback />}>
          <DocumentContextAnalysisPanel
            editorHtml={content}
            documentType={documentLabel}
            documentCategory={documentCategory}
            editor={editor}
          />
        </Suspense>
      </TabsContent>

      {/* ═══ TAB: Referências ═══ */}
      <TabsContent value="referencias" className="mt-0 flex-1 overflow-y-auto">
        <Suspense fallback={<LazyFallback />}>
          <LegalReferencesPanel editorHtml={content} documentCategory={documentCategory} />
        </Suspense>
      </TabsContent>
    </>
  );
}
