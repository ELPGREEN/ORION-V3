import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  MessageSquare,
  FolderOpen,
  TrendingUp,
  Settings,
  LogOut,
  CreditCard,
  Calendar,
  Menu,
  Bell,
   Brain,
   Scale,
   Bot,
   Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import logoElp from "@/assets/logo-elp.webp";

import { useState, useEffect } from "react";

const clienteMenuItems = [
  { id: "home", label: "Meu Painel", icon: TrendingUp, path: "/dashboard" },
  { id: "orion-ia", label: "Orion IA", icon: Brain, path: "/consulta" },
  { id: "meus-processos", label: "Processos", icon: Scale, path: "/dashboard/meus-processos" },
  { id: "documentos", label: "Documentos", icon: FolderOpen, path: "/dashboard/documentos" },
  { id: "chat-ao-vivo", label: "Chat", icon: MessageSquare, path: "/dashboard/chat-ao-vivo" },
  { id: "marketplace", label: "Loja", icon: Bot, path: "/dashboard/marketplace" },
  { id: "consultas", label: "Agendar", icon: Calendar, path: "/dashboard/consultas" },
  { id: "pagamentos", label: "Pagamentos", icon: CreditCard, path: "/dashboard/pagamentos" },
  { id: "notificacoes", label: "Notificações", icon: Bell, path: "/dashboard/notificacoes" },
  { id: "configuracoes", label: "Conta", icon: Settings, path: "/dashboard/configuracoes" },
];

interface ClienteNavbarProps {
  onMobileMenuToggle: () => void;
}

export function ClienteNavbar({ onMobileMenuToggle }: ClienteNavbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();

  const userName = user?.user_metadata?.nome || user?.email?.split("@")[0] || "Cliente";
  const [unreadNotifs, setUnreadNotifs] = useState(0);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      const { count } = await supabase
        .from("notificacoes")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("lida", false);
      setUnreadNotifs(count || 0);
    };
    fetchUnread();
    const channel = supabase
      .channel("notifs-navbar")
      .on("postgres_changes", { event: "*", schema: "public", table: "notificacoes", filter: `user_id=eq.${user.id}` }, () => fetchUnread())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

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
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border/30">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 lg:px-8 h-14">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-muted-foreground h-9 w-9 hover:bg-card/60"
            onClick={onMobileMenuToggle}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Link to="/" className="flex items-center gap-3 group">
            <img src={logoElp} alt="ELP" className="h-9 w-9 object-contain flex-shrink-0 transition-transform duration-300 group-hover:scale-110" />
            <div className="hidden sm:block">
              <h1 className="text-xs font-serif text-foreground tracking-[0.2em] font-bold">
                ORION
              </h1>
              <p className="text-[9px] text-primary tracking-[0.15em] font-medium">ÁREA DO CLIENTE</p>
            </div>
          </Link>
        </div>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-0.5">
          {clienteMenuItems.map((item) => {
            const active = isActive(item.path);
            return (
              <Link
                key={item.id}
                to={item.path}
                className={`flex items-center gap-1.5 px-3 py-2 text-[10px] tracking-wider uppercase transition-all relative ${
                  active
                    ? "text-primary font-semibold"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <item.icon className={`h-3.5 w-3.5 ${active ? "text-primary" : ""}`} />
                <span className="hidden xl:inline">{item.label}</span>
                {active && (
                  <span className="absolute bottom-0 left-3 right-3 h-0.5 bg-primary" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <span className="text-[9px] px-2.5 py-1 border border-secondary/25 text-secondary bg-secondary/5 tracking-wider uppercase font-medium hidden sm:inline shadow-[0_0_8px_hsl(195_90%_50%/0.1)]">
            ORION
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="relative text-muted-foreground hover:text-foreground h-9 w-9 hover:bg-card/60"
            onClick={() => navigate("/dashboard/notificacoes")}
            aria-label="Notificações"
          >
            <Bell className="h-4 w-4" />
            {unreadNotifs > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-primary text-primary-foreground text-[8px] flex items-center justify-center font-bold rounded-full animate-pulse">
                {unreadNotifs > 9 ? "9+" : unreadNotifs}
              </span>
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground h-9 w-9 hover:bg-card/60"
            onClick={() => navigate("/dashboard/configuracoes")}
            aria-label="Meu Perfil"
          >
            <Settings className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-primary h-9 w-9 hover:bg-card/60"
            onClick={handleSignOut}
            title="Sair"
            aria-label="Sair"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Disclaimer */}
      <div className="px-4 lg:px-8 py-1.5 border-t border-border/15 bg-card/20">
        <p className="text-[9px] text-muted-foreground/40 text-center tracking-wider">
          ORION IA by ELP Global · Revise sempre · LGPD
        </p>
      </div>
    </header>
  );
}
