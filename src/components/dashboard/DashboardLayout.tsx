import { useEffect, useState, Suspense, useRef } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { useSignatureRealtime } from "@/hooks/useSignatureRealtime";
import { syncVoiceEvolutionFromSupabase } from "@/lib/neural/orion-voice-evolution";
import { supabase } from "@/integrations/supabase/client";
import { ClienteNavbar } from "./ClienteNavbar";
import { DashboardSidebar } from "./DashboardSidebar";
import { DashboardHeader } from "./DashboardHeader";
import { GenerationBanner } from "./GenerationBanner";
import { MobileSidebarOverlay } from "./MobileSidebarOverlay";
import { DashboardBackground } from "./DashboardBackground";
import { MouseTrailEffect } from "./MouseTrailEffect";
import { GlobalOrionListener } from "./GlobalOrionListener";

import { ProdutorSidebar } from "./ProdutorSidebar";
import { AfiliadoSidebar } from "./AfiliadoSidebar";
import { NomadeSidebar } from "./NomadeSidebar";

const ACTIVE_JOB_KEY = "generation_queue_active_job";

export default function DashboardLayout() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { role, loading: roleLoading, isCliente, isAdvogado, isProdutor, isAfiliado, isNomade } = useUserRole();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { unreadCount, clearUnread } = useSignatureRealtime();
  const loading = authLoading || roleLoading;
  const [hasActiveJob, setHasActiveJob] = useState(false);
  const [dismissedJob, setDismissedJob] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate("/auth");
    if (!authLoading && user) {
      syncVoiceEvolutionFromSupabase().catch(() => {});
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    const check = () => setHasActiveJob(!!localStorage.getItem(ACTIVE_JOB_KEY));
    check();
    const handleStorage = (e: StorageEvent) => {
      if (e.key === ACTIVE_JOB_KEY) check();
    };
    const handleCustom = () => check();
    window.addEventListener("storage", handleStorage);
    window.addEventListener("generation-job-change", handleCustom);
    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("generation-job-change", handleCustom);
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 border-2 border-primary border-t-transparent animate-spin" />
          <p className="text-muted-foreground text-xs tracking-[0.15em] uppercase">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const PageFallback = (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="h-7 w-7 animate-spin text-primary" />
    </div>
  );

  // Cliente layout
  if (isCliente) {
    return (
      <div className="min-h-screen bg-background flex flex-col relative">
        <DashboardBackground />
        <MouseTrailEffect />
        <div className="relative z-10 flex flex-col flex-1">
          <ClienteNavbar onMobileMenuToggle={() => setMobileOpen(!mobileOpen)} />
          <GenerationBanner hasActiveJob={hasActiveJob} dismissed={dismissedJob} onDismiss={() => setDismissedJob(true)} />
          <MobileSidebarOverlay open={mobileOpen} onClose={() => setMobileOpen(false)} role="cliente" label="ÁREA DO CLIENTE" />
          <main className="flex-1 p-4 lg:p-8 bg-background/30 backdrop-blur-sm">
            <Suspense fallback={PageFallback}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
    );
  }

  // Produtor / Afiliado / Nomade layout — simplified sidebar layout
  if (isProdutor || isAfiliado || isNomade) {
    const sidebarLabel = isNomade ? "NÔMADE DIGITAL" : isProdutor ? "PAINEL PRODUTOR" : "PAINEL AFILIADO";
    const SidebarComponent = isNomade ? NomadeSidebar : isProdutor ? ProdutorSidebar : AfiliadoSidebar;

    return (
      <div className="min-h-screen bg-background flex overflow-x-hidden relative">
        <DashboardBackground />
        <MouseTrailEffect />
        {/* Desktop Sidebar */}
        <div data-dashboard-chrome className={`hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-40 transition-all duration-300 ${sidebarCollapsed ? "w-[72px]" : "w-72"}`}>
          <SidebarComponent collapsed={sidebarCollapsed} />
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute -right-3 top-20 h-6 w-6 bg-card border border-border/40 flex items-center justify-center z-50 hover:bg-muted hover:border-primary/30 transition-all duration-200 shadow-md"
            title={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
            aria-label={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
          >
            {sidebarCollapsed ? <ChevronRight className="h-3 w-3 text-muted-foreground" /> : <ChevronLeft className="h-3 w-3 text-muted-foreground" />}
          </button>
        </div>

        {/* Main area */}
        <div data-dashboard-main className={`relative z-10 flex-1 flex flex-col min-h-screen min-w-0 transition-all duration-300 ${sidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-72"}`}>
          <div data-dashboard-chrome><DashboardHeader onMobileMenuOpen={() => setMobileOpen(true)} unreadCount={unreadCount} clearUnread={clearUnread} /></div>
          <GenerationBanner hasActiveJob={hasActiveJob} dismissed={dismissedJob} onDismiss={() => setDismissedJob(true)} />
          <MobileSidebarOverlay open={mobileOpen} onClose={() => setMobileOpen(false)} role={isNomade ? "nomade" : isProdutor ? "produtor" : "afiliado"} label={sidebarLabel} />

          <main className="flex-1 p-4 lg:p-8 pb-24 lg:pb-8 bg-background/30 backdrop-blur-sm">
            <Suspense fallback={PageFallback}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
    );
  }

  // Advogado layout
  return (
    <div className="min-h-screen bg-background flex overflow-x-hidden relative">
      <DashboardBackground />
      <MouseTrailEffect />
      
      {/* Desktop Sidebar */}
      <div data-dashboard-chrome className={`hidden lg:flex flex-col fixed left-0 top-0 bottom-0 z-40 transition-all duration-300 ${sidebarCollapsed ? "w-[72px]" : "w-72"}`}>
        <DashboardSidebar collapsed={sidebarCollapsed} onToggle={() => setSidebarCollapsed(!sidebarCollapsed)} />
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="absolute -right-3 top-20 h-6 w-6 bg-card border border-border/40 flex items-center justify-center z-50 hover:bg-muted hover:border-primary/30 transition-all duration-200 shadow-md"
          title={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
          aria-label={sidebarCollapsed ? "Expandir menu" : "Recolher menu"}
        >
          {sidebarCollapsed ? <ChevronRight className="h-3 w-3 text-muted-foreground" /> : <ChevronLeft className="h-3 w-3 text-muted-foreground" />}
        </button>
      </div>

      {/* Main area */}
      <div data-dashboard-main className={`relative z-10 flex-1 flex flex-col min-h-screen min-w-0 transition-all duration-300 ${sidebarCollapsed ? "lg:ml-[72px]" : "lg:ml-72"}`}>
        <div data-dashboard-chrome><DashboardHeader onMobileMenuOpen={() => setMobileOpen(true)} unreadCount={unreadCount} clearUnread={clearUnread} /></div>
        <GenerationBanner hasActiveJob={hasActiveJob} dismissed={dismissedJob} onDismiss={() => setDismissedJob(true)} />
        <MobileSidebarOverlay open={mobileOpen} onClose={() => setMobileOpen(false)} role="advogado" label="PAINEL ORION" />

        <main className="flex-1 p-4 lg:p-8 pb-8 bg-background/30 backdrop-blur-sm">
          <Suspense fallback={PageFallback}>
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
