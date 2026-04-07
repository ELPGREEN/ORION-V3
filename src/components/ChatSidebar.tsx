import { MessageSquare, Plus, Phone, Mail, MapPin, Shield, Trash2, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ChatIAConversation } from "@/hooks/useChatIAPersistence";

interface ChatSidebarProps {
  conversations: ChatIAConversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation?: (id: string) => void;
  loading?: boolean;
}

export function ChatSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  loading,
}: ChatSidebarProps) {
  return (
    <div className="h-full flex flex-col bg-secondary border-r border-border">
      {/* Header */}
      <div className="p-5 border-b border-border">
        <Button onClick={onNewConversation} className="w-full btn-outline-gold text-[10px] gap-2 py-3">
          <Plus className="h-3.5 w-3.5" />
          Nova Consulta
        </Button>
      </div>

      {/* Conversations */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <p className="text-[10px] text-muted-foreground/50 uppercase tracking-[0.2em] px-3 py-2">
          Conversas Recentes
        </p>
        {loading ? (
          <p className="text-xs text-muted-foreground px-3 py-2">Carregando...</p>
        ) : conversations.length === 0 ? (
          <p className="text-xs text-muted-foreground/50 px-3 py-2">Nenhuma conversa ainda</p>
        ) : (
          conversations.map((conv) => (
            <div key={conv.id} className="group relative">
              <button
                onClick={() => onSelectConversation(conv.id)}
                className={`w-full text-left px-3 py-3 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors flex items-center gap-2 ${
                  conv.id === activeConversationId ? "bg-muted/50 text-foreground border-l-2 border-primary" : ""
                }`}
              >
                <MessageSquare className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate">{conv.title}</span>
              </button>
              {onDeleteConversation && (
                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteConversation(conv.id); }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </div>
          ))
        )}
      </div>

      {/* Company Info */}
      <div className="p-4 border-t border-border space-y-4">
        <div className="flex items-center gap-3 px-2">
          <div className="w-8 h-8 border border-primary/30 flex items-center justify-center">
            <Shield className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-[10px] text-primary tracking-[0.15em] font-medium">ELP®</p>
            <p className="text-xs text-muted-foreground">Green Technology</p>
          </div>
        </div>
        <div className="space-y-2">
          <a href="mailto:info@iasofthub.com" className="flex items-center gap-2 text-[11px] text-muted-foreground hover:text-primary transition-colors px-2">
            <Mail className="h-3 w-3" />
            info@elpgreen.com
          </a>
          <a href="https://www.iasofthub.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[11px] text-muted-foreground hover:text-primary transition-colors px-2">
            <Globe className="h-3 w-3" />
            www.elpgreen.com
          </a>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground px-2">
            <MapPin className="h-3 w-3" />
            Alessandria, Italy
          </div>
        </div>
        <div className="bg-muted/50 border border-border p-3">
          <p className="text-[9px] text-muted-foreground/60 leading-relaxed">
            Esta é uma ferramenta de IA auxiliar. Não substitui consulta jurídica presencial.
          </p>
        </div>
      </div>
    </div>
  );
}
