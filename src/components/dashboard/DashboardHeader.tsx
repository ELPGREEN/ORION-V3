import { Link, useNavigate } from "react-router-dom";
import { Menu, Bell } from "lucide-react";
import logoElp from "@/assets/logo-elp.webp";
import { Button } from "@/components/ui/button";
import { OrionPlaylistBar } from "@/components/orion/OrionPlaylistBar";

interface DashboardHeaderProps {
  onMobileMenuOpen: () => void;
  unreadCount: number;
  clearUnread: () => void;
}

export function DashboardHeader({ onMobileMenuOpen, unreadCount, clearUnread }: DashboardHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-30 glass-panel border-b border-border/10 relative overflow-hidden rounded-none">
      {/* Premium bottom accent line */}
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
      {/* Ambient glow spots */}
      <div className="absolute top-0 left-[20%] w-32 h-full bg-gradient-to-b from-primary/[0.02] to-transparent pointer-events-none" />
      <div className="absolute top-0 right-[30%] w-24 h-full bg-gradient-to-b from-secondary/[0.015] to-transparent pointer-events-none" />

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

        {/* Playlist Bar (substitui a busca) */}
        <div className="hidden md:flex flex-1 max-w-2xl mx-6 items-center">
          <OrionPlaylistBar embedded />
        </div>

        <div className="flex items-center gap-3">
          {/* ORION badge with glow ring */}
          <span className="relative text-[8px] px-3 py-1 glass-panel-light border-secondary/20 text-secondary tracking-[0.15em] uppercase font-semibold rounded-md">
            ORION
            <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400/80 animate-pulse shadow-[0_0_8px_hsl(142_60%_45%/0.5)]" />
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
