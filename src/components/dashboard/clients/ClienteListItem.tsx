import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Phone, MoreHorizontal, FolderOpen, Trash2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
// [REMOVED] import { useNeuralFeedback } from "@/hooks/useNeuralFeedback";

interface ClientProfile {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  telefone: string | null;
  cpf: string | null;
  tipo_caso: string | null;
  descricao_problema: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ClienteListItemProps {
  cliente: ClientProfile;
  onOpenFolder: (client: ClientProfile) => void;
  onDelete: (client: ClientProfile) => void;
}

const statusLabels: Record<string, string> = {
  novo: "Novo",
  em_analise: "Em Análise",
  aguardando_documentos: "Aguardando Docs",
  em_atendimento: "Em Atendimento",
  concluido: "Concluído",
  arquivado: "Arquivado",
};

const getStatusColor = (status: string) => {
  if (status === "concluido" || status === "em_atendimento") return "border-green-500/30 text-green-400";
  if (status === "arquivado") return "border-border text-muted-foreground";
  return "border-primary/30 text-primary";
};

export function ClienteListItem({ cliente, onOpenFolder, onDelete }: ClienteListItemProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [startingChat, setStartingChat] = useState(false);

  const startChat = async () => {
    setStartingChat(true);
    try {
      const { data: existing } = await supabase
        .from("chat_conversations")
        .select("id")
        .eq("cliente_id", cliente.user_id)
        .limit(1)
        .maybeSingle();

      if (existing) {
        navigate(`/dashboard/chat-ao-vivo?conversa=${existing.id}`);
      } else {
        const { data: newConv, error } = await supabase
          .from("chat_conversations")
          .insert({ cliente_id: cliente.user_id })
          .select()
          .single();
        if (error) throw error;
        navigate(`/dashboard/chat-ao-vivo?conversa=${newConv.id}`);
      }
    } catch {
      toast({ title: "Erro", description: "Não foi possível abrir o chat.", variant: "destructive" });
    } finally {
      setStartingChat(false);
    }
  };

  return (
    <div className="bg-card border border-border/30 p-4 flex items-center justify-between hover:border-primary/20 transition-all duration-200 group">
      <div className="flex items-center gap-4 min-w-0">
        <div
          className="h-10 w-10 bg-primary/8 border border-primary/15 flex items-center justify-center flex-shrink-0 cursor-pointer hover:bg-primary/15 transition-colors"
          onClick={() => onOpenFolder(cliente)}
          title="Abrir pasta do cliente"
        >
          <FolderOpen className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{cliente.nome}</p>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Mail className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{cliente.email}</span>
            </span>
            {cliente.telefone && (
              <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                <Phone className="h-3 w-3 flex-shrink-0" />
                {cliente.telefone}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-[10px] text-muted-foreground/60 hidden sm:inline">
          {cliente.tipo_caso || "Sem tipo"}
        </span>
        <span className={`text-[9px] px-2.5 py-0.5 border tracking-wider uppercase font-medium ${getStatusColor(cliente.status)}`}>
          {statusLabels[cliente.status] || cliente.status}
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => onOpenFolder(cliente)}>
              <FolderOpen className="h-4 w-4 mr-2" />
              Ver Pasta do Cliente
            </DropdownMenuItem>
            <DropdownMenuItem onClick={startChat} disabled={startingChat}>
              <MessageSquare className="h-4 w-4 mr-2" />
              {startingChat ? "Abrindo..." : "Chat com o Cliente"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href={`mailto:${cliente.email}`}>
                <Mail className="h-4 w-4 mr-2" />
                Enviar E-mail
              </a>
            </DropdownMenuItem>
            {cliente.telefone && (
              <DropdownMenuItem asChild>
                <a href={`https://wa.me/55${cliente.telefone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                  <Phone className="h-4 w-4 mr-2" />
                  WhatsApp
                </a>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(cliente)}>
              <Trash2 className="h-4 w-4 mr-2" />
              Excluir Cliente
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
