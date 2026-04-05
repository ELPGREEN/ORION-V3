import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FileText,
  MessageSquare,
  FolderOpen,
  TrendingUp,
  Settings,
  LogOut,
  Sparkles,
  Search,
  Gavel,
  ScrollText,
  PenTool,
  BookUser,
  ListTodo,
  CreditCard,
  Calendar,
  Users,
   BookOpen,
   Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const footerMenuItems = [
  { id: "home", label: "Visão Geral", icon: TrendingUp, path: "/dashboard" },
  { id: "gerar", label: "Gerar Doc", icon: Sparkles, path: "/dashboard/gerar-documento", highlight: true },
  { id: "documentos", label: "Documentos", icon: FolderOpen, path: "/dashboard/documentos" },
  { id: "chat", label: "Orion IA", icon: MessageSquare, path: "/consulta" },
  { id: "pesquisa", label: "Pesquisa", icon: Search, path: "/dashboard/pesquisa-unificada" },
  { id: "clientes", label: "Clientes", icon: FileText, path: "/dashboard/clientes" },
  { id: "processos", label: "Processos", icon: Gavel, path: "/dashboard/processos" },
  { id: "assinatura", label: "Assinatura", icon: PenTool, path: "/dashboard/assinatura-digital" },
  { id: "pagamentos", label: "Pagamentos", icon: CreditCard, path: "/dashboard/pagamentos" },
  { id: "consultas", label: "Consultas", icon: Calendar, path: "/dashboard/consultas" },
  { id: "contatos", label: "Contatos", icon: BookUser, path: "/dashboard/contatos" },
  { id: "tarefas", label: "Tarefas", icon: ListTodo, path: "/dashboard/tarefas" },
  { id: "escritorio", label: "Meu Escritório", icon: ScrollText, path: "/dashboard/escritorio" },
  { id: "plano", label: "Meu Plano", icon: Crown, path: "/dashboard/plano" },
  { id: "config", label: "Configurações", icon: Settings, path: "/dashboard/configuracoes" },
];

export function AdvogadoFooterBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const handleSignOut = async () => {
    await signOut();
    toast({ title: "Logout realizado", description: "Até a próxima!" });
    navigate("/");
  };

  const isActive = (path: string) => {
    if (path === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(path);
  };

  return (
    <footer className="fixed bottom-0 left-0 right-0 z-40 bg-secondary/98 backdrop-blur-md border-t border-border/30">
      {/* Disclaimer */}
      <div className="px-4 py-1 border-b border-border/15 bg-card/10">
        <p className="text-[8px] text-muted-foreground/40 text-center tracking-wider">
          ORION IA by ELP Global · Revise sempre · LGPD
        </p>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between px-1">
        <nav className="flex items-center gap-0 overflow-x-auto flex-1 scrollbar-hide py-1.5">
          {footerMenuItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`flex flex-col items-center gap-0.5 px-2.5 py-1.5 min-w-[54px] text-center transition-all relative ${
                  active
                    ? "text-primary"
                    : item.highlight
                    ? "text-primary/70 hover:text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                title={item.label}
              >
                <item.icon
                  className={`h-4 w-4 ${active ? "icon-gold-glow" : ""} ${item.highlight && !active ? "icon-gold-glow" : ""}`}
                />
                <span className={`text-[8px] tracking-wide leading-tight ${
                  active ? "font-semibold text-primary" : "font-medium"
                }`}>
                  {item.label}
                </span>
                {active && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-primary" />
                )}
              </Link>
            );
          })}
        </nav>

        <Button
          variant="ghost"
          size="icon"
          className="text-muted-foreground hover:text-primary flex-shrink-0 ml-1 h-9 w-9"
          onClick={handleSignOut}
          title="Sair"
          aria-label="Sair"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </footer>
  );
}
