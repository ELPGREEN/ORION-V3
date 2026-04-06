import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { HeroThreeBackground } from "./HeroThreeBackground";
import orionVideo from "@/assets/orion-tron-video.mp4";
import orionLogo from "@/assets/orion-splash-logo.png";
import { LogIn, UserPlus, Eye, Shield, Zap, Brain } from "lucide-react";

type Phase = "video" | "welcome";

interface WelcomeSplashProps {
  onDismiss: () => void;
}

/** Cinematic text overlays during the 5s video intro */
const VIDEO_CAPTIONS = [
  { text: "Enterprise AI Platform", delay: 400, duration: 1800 },
  { text: "Neural Intelligence · Real-Time Protection", delay: 2400, duration: 1800 },
  { text: "ORION", delay: 4200, duration: 800, large: true },
];

export function WelcomeSplash({ onDismiss }: WelcomeSplashProps) {
  const [phase, setPhase] = useState<Phase>("video");
  const [captionIdx, setCaptionIdx] = useState(-1);
  const videoRef = useRef<HTMLVideoElement>(null);
  const navigate = useNavigate();
  const timerRef = useRef<ReturnType<typeof setTimeout>>();
  const captionTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const handleVideoReady = useCallback(() => {
    // Schedule caption reveals
    VIDEO_CAPTIONS.forEach((cap, i) => {
      const t = setTimeout(() => setCaptionIdx(i), cap.delay);
      captionTimers.current.push(t);
    });
    // Transition after 5s
    timerRef.current = setTimeout(() => setPhase("welcome"), 5000);
  }, []);

  const skipVideo = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    captionTimers.current.forEach(clearTimeout);
    setPhase("welcome");
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      captionTimers.current.forEach(clearTimeout);
    };
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
        {/* === PHASE 1: CINEMATIC VIDEO INTRO === */}
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

            {/* Dark gradient overlay for text legibility */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/50 pointer-events-none" />

            {/* Cinematic captions */}
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-24 sm:pb-32 pointer-events-none px-6">
              <AnimatePresence mode="wait">
                {captionIdx >= 0 && captionIdx < VIDEO_CAPTIONS.length && (
                  <motion.p
                    key={captionIdx}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.6 }}
                    className={`text-center font-mono tracking-[0.2em] uppercase ${
                      VIDEO_CAPTIONS[captionIdx].large
                        ? "text-3xl sm:text-5xl font-bold tracking-[0.3em]"
                        : "text-xs sm:text-sm text-white/70"
                    }`}
                    style={{
                      color: VIDEO_CAPTIONS[captionIdx].large
                        ? "hsl(var(--primary))"
                        : undefined,
                      textShadow: VIDEO_CAPTIONS[captionIdx].large
                        ? "0 0 40px hsl(var(--primary) / 0.6), 0 0 80px hsl(var(--primary) / 0.2)"
                        : "0 2px 20px rgba(0,0,0,0.8)",
                    }}
                  >
                    {VIDEO_CAPTIONS[captionIdx].text}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Top-left branding watermark */}
            <div className="absolute top-6 left-6 flex items-center gap-2 pointer-events-none">
              <img src={orionLogo} alt="" className="w-8 h-8 rounded-full opacity-60" />
              <span className="text-[10px] text-white/30 font-mono tracking-[0.3em] uppercase">
                ELP® Green Technology
              </span>
            </div>

            {/* Skip button */}
            <button
              onClick={skipVideo}
              className="absolute bottom-8 right-8 text-xs uppercase tracking-widest text-white/40 hover:text-white/80 transition-colors font-mono z-10"
            >
              Skip ›
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
            <HeroThreeBackground />

            <div className="relative z-10 flex flex-col items-center gap-6 px-6 text-center max-w-lg">
              {/* Logo */}
              <motion.div
                initial={{ scale: 0.6, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.8, type: "spring" }}
                className="relative"
              >
                <img
                  src={orionLogo}
                  alt="ORION Enterprise AI Platform"
                  className="w-48 h-48 sm:w-60 sm:h-60 md:w-72 md:h-72 object-contain drop-shadow-[0_0_40px_rgba(212,175,55,0.4)]"
                />
              </motion.div>

              {/* Title — English */}
              <motion.div
                initial={{ y: 30, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.7 }}
              >
                <h1
                  className="text-3xl sm:text-5xl font-bold tracking-[0.15em] uppercase"
                  style={{
                    fontFamily: "'Orbitron', sans-serif",
                    color: "hsl(var(--primary))",
                    textShadow:
                      "0 0 30px hsl(var(--primary) / 0.5), 0 0 60px hsl(var(--primary) / 0.2)",
                  }}
                >
                  WELCOME TO ORION
                </h1>
                <p className="mt-2 text-sm sm:text-base text-muted-foreground tracking-wider font-mono">
                  Enterprise AI Platform — ELP® Green Technology
                </p>
              </motion.div>

              {/* Feature pills */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8, duration: 0.6 }}
                className="flex flex-wrap justify-center gap-2"
              >
                {[
                  { icon: Brain, label: "Neural AI" },
                  { icon: Shield, label: "Cyber Shield" },
                  { icon: Zap, label: "Real-Time" },
                ].map(({ icon: Icon, label }) => (
                  <span
                    key={label}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/20 bg-primary/5 text-[11px] font-mono tracking-wider text-primary/80 uppercase"
                  >
                    <Icon className="w-3 h-3" />
                    {label}
                  </span>
                ))}
              </motion.div>

              {/* Auth buttons */}
              <motion.div
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 1, duration: 0.7 }}
                className="flex flex-col sm:flex-row gap-3 mt-2 w-full sm:w-auto"
              >
                <button
                  onClick={handleLogin}
                  className="flex items-center justify-center gap-3 px-8 py-3.5 rounded-sm border border-primary/40 bg-primary/10 hover:bg-primary/20 text-primary font-semibold uppercase tracking-wider text-sm transition-all duration-300 hover:shadow-[0_0_25px_hsl(var(--primary)/0.3)]"
                >
                  <LogIn className="w-4 h-4" />
                  Sign In
                </button>

                <button
                  onClick={handleSignup}
                  className="flex items-center justify-center gap-3 px-8 py-3.5 rounded-sm bg-primary text-primary-foreground font-semibold uppercase tracking-wider text-sm transition-all duration-300 hover:shadow-[0_0_25px_hsl(var(--primary)/0.4)] hover:brightness-110"
                >
                  <UserPlus className="w-4 h-4" />
                  Create Account
                </button>
              </motion.div>

              {/* Visitor link */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.3 }}
                onClick={handleVisitor}
                className="flex items-center gap-2 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors font-mono uppercase tracking-widest mt-1"
              >
                <Eye className="w-3.5 h-3.5" />
                Continue as Guest
              </motion.button>

              {/* Footer */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.6 }}
                className="text-[10px] text-muted-foreground/30 font-mono tracking-[0.3em] uppercase mt-4"
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
