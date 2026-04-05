import { Link, useNavigate } from "react-router-dom";
import { Menu, Search, Bell } from "lucide-react";
import logoElp from "@/assets/logo-elp.webp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface DashboardHeaderProps {
  onMobileMenuOpen: () => void;
  unreadCount: number;
  clearUnread: () => void;
}

export function DashboardHeader({ onMobileMenuOpen, unreadCount, clearUnread }: DashboardHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 bg-background/50 backdrop-blur-xl border-b border-cyan/10 shadow-[inset_0_0_40px_rgba(0,188,212,0.02)]">
      <div className="flex items-center justify-between px-4 lg:px-6 h-14">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden text-muted-foreground h-9 w-9 hover:bg-card/60"
            onClick={onMobileMenuOpen}
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Link to="/" className="flex items-center gap-2.5 lg:hidden">
            <img src={logoElp} alt="ELP" className="h-8 w-8 object-contain" />
            <div className="hidden sm:block">
              <h1 className="text-[10px] font-serif text-foreground tracking-[0.2em] font-bold">ORION</h1>
              <p className="text-[8px] text-primary tracking-[0.15em]">IA EMPRESARIAL</p>
            </div>
          </Link>
        </div>

        {/* Search */}
        <div className="hidden md:flex flex-1 max-w-md mx-8">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
            <Input
              placeholder="Buscar documentos, processos, clientes..."
              className="pl-9 bg-card/50 border-border/30 h-9 text-xs focus:bg-card focus:border-primary/40 transition-all placeholder:text-muted-foreground/40"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.target as HTMLInputElement).value.trim()) {
                  navigate(`/dashboard/pesquisa-unificada?q=${encodeURIComponent((e.target as HTMLInputElement).value.trim())}`);
                  (e.target as HTMLInputElement).value = "";
                }
              }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-[8px] px-3 py-1 border border-secondary/30 text-secondary bg-secondary/5 tracking-[0.15em] uppercase font-semibold shadow-[0_0_10px_hsl(195_90%_50%/0.15)]">
            ORION
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="relative text-muted-foreground hover:text-foreground h-9 w-9 hover:bg-card/60"
            onClick={() => { clearUnread(); navigate("/dashboard/notificacoes"); }}
            aria-label="Notificações"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-4 w-4 bg-primary text-primary-foreground text-[8px] flex items-center justify-center font-bold rounded-full animate-pulse">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>
        </div>
      </div>
    </header>
  );
}
