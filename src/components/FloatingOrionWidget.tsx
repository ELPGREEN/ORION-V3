import { lazy, Suspense, useCallback } from "react";
import { useOrionWidget } from "@/contexts/OrionWidgetContext";
import { PlasmaCore } from "@/components/home/PlasmaCore";
import { X, Minimize2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const NeuralVision = lazy(() =>
  import("@/components/dashboard/neural/NeuralVision").then(m => ({ default: m.NeuralVision }))
);

export function FloatingOrionWidget() {
  const { state, isMinimized, isExpanded, expandOrion, minimizeOrion, closeOrion } = useOrionWidget();

  const handleOrbClick = useCallback(() => {
    expandOrion();
  }, [expandOrion]);

  if (state === "closed") return null;

  return (
    <>
      {/* Minimized orb */}
      <AnimatePresence>
        {isMinimized && (
          <motion.div
            key="orb-minimized"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed bottom-20 right-4 z-[60] lg:bottom-6 lg:right-6 cursor-pointer group"
            onClick={handleOrbClick}
            title="Expandir Orion"
          >
            <div className="relative w-14 h-14 lg:w-16 lg:h-16">
              <div
                className="absolute inset-0 rounded-full transition-all duration-700"
                style={{
                  background: "radial-gradient(circle, hsl(var(--primary) / 0.4) 0%, transparent 70%)",
                  filter: "blur(10px)",
                  transform: "scale(1.5)",
                  animation: "orbBreathWidget 3s ease-in-out infinite",
                }}
              />
              <PlasmaCore className="w-full h-full" />
            </div>
            <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <span className="text-[9px] font-mono tracking-wider px-2 py-0.5 rounded-full border backdrop-blur-sm text-primary/80 border-primary/30 bg-card/60">
                Orion ativo
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded floating panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            key="orion-expanded"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className={cn(
              "fixed z-[60] bg-background/95 backdrop-blur-2xl border border-border/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col",
              // Mobile: full screen minus some margins
              "inset-2 bottom-16",
              // Desktop: bottom-right floating card
              "lg:inset-auto lg:bottom-6 lg:right-6 lg:w-[420px] lg:h-[600px] xl:w-[480px] xl:h-[680px]"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/30 bg-card/40 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6">
                  <PlasmaCore className="w-full h-full" />
                </div>
                <span className="text-xs font-serif tracking-[0.1em] text-foreground">ORION</span>
                <span className="text-[8px] text-primary tracking-widest">ATIVO</span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                  onClick={minimizeOrion}
                  title="Minimizar"
                >
                  <Minimize2 className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={closeOrion}
                  title="Fechar"
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Content — NeuralVision */}
            <div className="flex-1 overflow-y-auto min-h-0">
              <Suspense fallback={
                <div className="flex-1 flex items-center justify-center p-8">
                  <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              }>
                <NeuralVision skipWakeWord />
              </Suspense>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        @keyframes orbBreathWidget {
          0%, 100% { opacity: 0.5; transform: scale(1.4); }
          50% { opacity: 0.9; transform: scale(1.7); }
        }
      `}</style>
    </>
  );
}
