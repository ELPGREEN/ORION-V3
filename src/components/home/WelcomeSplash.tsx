import { useState, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { HeroThreeBackground } from "./HeroThreeBackground";
import orionVideo from "@/assets/orion-tron-video.mp4";
import orionLogo from "@/assets/orion-logo-2.jpg";
import { LogIn, UserPlus, Eye } from "lucide-react";

type Phase = "video" | "welcome";

interface WelcomeSplashProps {
  onDismiss: () => void;
}

export function WelcomeSplash({ onDismiss }: WelcomeSplashProps) {
  const [phase, setPhase] = useState<Phase>("video");
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  const handleVideoReady = useCallback(() => {
    // Transition after 5s regardless
    timerRef.current = setTimeout(() => {
      setPhase("welcome");
    }, 5000);
  }, []);

  const skipVideo = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setPhase("welcome");
  }, []);

  const handleLogin = () => {
    sessionStorage.setItem("orion_splash_seen", "1");
    navigate("/auth?tab=login");
  };

  const handleSignup = () => {
    sessionStorage.setItem("orion_splash_seen", "1");
    navigate("/auth?tab=cadastro");
  };

  const handleVisitor = () => {
    sessionStorage.setItem("orion_splash_seen", "1");
    onDismiss();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background">
      <AnimatePresence mode="wait">
        {/* === PHASE 1: VIDEO === */}
        {phase === "video" && (
          <motion.div
            key="video"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="absolute inset-0 flex items-center justify-center bg-black"
          >
            <video
              ref={videoRef}
              src={orionVideo}
              autoPlay
              muted
              playsInline
              onLoadedData={handleVideoReady}
              onEnded={() => setPhase("welcome")}
              className="w-full h-full object-cover"
            />

            {/* Skip button */}
            <button
              onClick={skipVideo}
              className="absolute bottom-8 right-8 text-xs uppercase tracking-widest text-white/40 hover:text-white/80 transition-colors font-mono"
            >
              Pular ›
            </button>
          </motion.div>
        )}

        {/* === PHASE 2: THREE.JS WELCOME === */}
        {phase === "welcome" && (
          <motion.div
            key="welcome"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1 }}
            className="absolute inset-0 flex flex-col items-center justify-center"
          >
            {/* Animated shader background */}
            <HeroThreeBackground />

            {/* Content overlay */}
            <div className="relative z-10 flex flex-col items-center gap-8 px-6 text-center">
              {/* Logo */}
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.8, type: "spring" }}
                className="relative"
              >
                <img
                  src={orionLogo}
                  alt="ORION Logo"
                  className="w-28 h-28 sm:w-36 sm:h-36 rounded-full object-cover border-2 border-primary/40 shadow-[0_0_40px_hsl(var(--primary)/0.3)]"
                />
                {/* Glow ring */}
                <div className="absolute inset-0 rounded-full border border-primary/20 animate-pulse" />
              </motion.div>

              {/* Title */}
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.7 }}
              >
                <h1
                  className="text-3xl sm:text-5xl font-bold tracking-[0.15em] uppercase"
                  style={{
                    fontFamily: "'Orbitron', sans-serif",
                    color: "hsl(var(--primary))",
                    textShadow: "0 0 30px hsl(var(--primary) / 0.5), 0 0 60px hsl(var(--primary) / 0.2)",
                  }}
                >
                  BEM-VINDO AO ORION
                </h1>
                <p className="mt-3 text-sm sm:text-base text-muted-foreground tracking-wider font-mono">
                  Inteligência Artificial Empresarial — ELP® Green Technology
                </p>
              </motion.div>

              {/* Buttons */}
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1, duration: 0.7 }}
                className="flex flex-col sm:flex-row gap-4 mt-4"
              >
                <button
                  onClick={handleLogin}
                  className="group relative flex items-center gap-3 px-8 py-3.5 rounded-sm border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary font-semibold uppercase tracking-wider text-sm transition-all duration-300 hover:shadow-[0_0_25px_hsl(var(--primary)/0.3)]"
                >
                  <LogIn className="w-4 h-4" />
                  Fazer Login
                </button>

                <button
                  onClick={handleSignup}
                  className="group relative flex items-center gap-3 px-8 py-3.5 rounded-sm bg-primary text-primary-foreground font-semibold uppercase tracking-wider text-sm transition-all duration-300 hover:shadow-[0_0_25px_hsl(var(--primary)/0.4)] hover:brightness-110"
                >
                  <UserPlus className="w-4 h-4" />
                  Criar Conta
                </button>
              </motion.div>

              {/* Visitor link */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.4 }}
                onClick={handleVisitor}
                className="flex items-center gap-2 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors font-mono uppercase tracking-widest mt-2"
              >
                <Eye className="w-3.5 h-3.5" />
                Entrar como Visitante
              </motion.button>

              {/* Bottom tag */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.8 }}
                className="text-[10px] text-muted-foreground/30 font-mono tracking-[0.3em] uppercase mt-6"
              >
                ORION · SHIELD PROTECTION · v4.0
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
