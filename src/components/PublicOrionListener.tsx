/**
 * PublicOrionListener — Visual-only Orion orb for public pages.
 * Opens the floating Orion widget instead of navigating.
 */
import { useCallback } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { PlasmaCore } from "@/components/home/PlasmaCore";
import { useAuth } from "@/contexts/AuthContext";
import { useUserPlan } from "@/hooks/useUserPlan";
import { useOrionWidget } from "@/contexts/OrionWidgetContext";
import { toast } from "sonner";

export function PublicOrionListener() {
  const location = useLocation();
  const { user } = useAuth();
  const { hasOrionAccess, loading: planLoading } = useUserPlan();
  const { isOpen, openOrion } = useOrionWidget();

  // Don't show on auth pages, dashboard, or dedicated Orion screens
  const isDashboard = location.pathname.startsWith("/dashboard");
  const isAuthPage = ["/auth", "/cadastro", "/esqueci-senha"].includes(location.pathname);
  const isDedicatedOrionPage = location.pathname === "/consulta";
  const shouldHide = isDashboard || isAuthPage || isDedicatedOrionPage || isOpen;

  const handleOrbClick = useCallback(() => {
    if (!user) {
      toast("🔒 Faça login para usar o Orion por voz");
      return;
    }
    if (!planLoading && !hasOrionAccess) {
      toast("⚡ Faça upgrade para acessar o Orion.");
      return;
    }
    openOrion();
  }, [user, hasOrionAccess, planLoading, openOrion]);

  if (shouldHide) return null;

  return (
    <>
      <div
        className="fixed bottom-20 right-4 z-50 lg:bottom-6 lg:right-6 group cursor-pointer"
        onClick={handleOrbClick}
        title="Abrir Orion"
      >
        <div className="relative w-14 h-14 lg:w-16 lg:h-16">
          <div
            className="absolute inset-0 rounded-full transition-all duration-700"
            style={{
              background: "radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 70%)",
              filter: "blur(10px)",
              transform: "scale(1.5)",
              animation: "orbBreathPublic 3s ease-in-out infinite",
            }}
          />
          <PlasmaCore className="w-full h-full" />
        </div>
        <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
          <span className="text-[9px] font-mono tracking-wider px-2 py-0.5 rounded-full border backdrop-blur-sm text-muted-foreground/60 border-border/30 bg-card/50">
            Orion
          </span>
        </div>
      </div>

      <style>{`
        @keyframes orbBreathPublic {
          0%, 100% { opacity: 0.5; transform: scale(1.4); }
          50% { opacity: 0.85; transform: scale(1.7); }
        }
      `}</style>
    </>
  );
}
