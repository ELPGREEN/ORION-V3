import { Loader2, X, ChevronRight, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ChatHistoryPanelProps {
  conversations: Conversation[];
  activeConversationId: string | null;
  loading: boolean;
  onSwitch: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function ChatHistoryPanel({
  conversations,
  activeConversationId,
  loading,
  onSwitch,
  onDelete,
  onClose,
}: ChatHistoryPanelProps) {
  return (
    <div className="absolute top-[72px] left-0 right-0 bottom-0 z-10 bg-card/95 backdrop-blur-sm flex flex-col">
      <div className="p-3 border-b border-border flex items-center justify-between">
        <span className="text-xs font-medium text-foreground">Conversas salvas</span>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-3 w-3" />
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : conversations.length === 0 ? (
          <p className="text-[10px] text-muted-foreground text-center py-8">Nenhuma conversa salva.</p>
        ) : (
          conversations.map((conv) => (
            <div
              key={conv.id}
              className={`flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-xs transition-colors ${
                activeConversationId === conv.id
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              <button
                className="flex-1 text-left truncate"
                onClick={() => onSwitch(conv.id)}
              >
                <ChevronRight className="h-3 w-3 inline mr-1" />
                {conv.title}
              </button>
              <button
                className="h-5 w-5 flex items-center justify-center text-muted-foreground hover:text-destructive shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(conv.id);
                }}
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
