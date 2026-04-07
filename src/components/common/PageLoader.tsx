import { motion } from "framer-motion";

export function PageLoader() {
  return (
    <div className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-background">
      {/* Tech grid background */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          
          backgroundSize: "60px 60px",
        }}
      />

      {/* Radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,hsl(var(--primary)/0.08)_0%,transparent_50%)]" />

      {/* Animated concentric rings — matching PlasmaCore */}
      <motion.div
        className="relative mb-8 w-28 h-28 flex items-center justify-center"
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.6 }}
      >
        {/* Outer ring */}
        <motion.div
          className="absolute inset-0 rounded-full border border-primary/20"
          animate={{ rotate: 360 }}
          transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          style={{ boxShadow: "0 0 15px hsl(var(--primary) / 0.1)" }}
        />
        {/* Mid ring */}
        <motion.div
          className="absolute inset-3 rounded-full border-2 border-primary/40"
          animate={{ rotate: -360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          style={{ boxShadow: "0 0 20px hsl(var(--primary) / 0.15), inset 0 0 20px hsl(var(--primary) / 0.05)" }}
        />
        {/* Inner ring */}
        <motion.div
          className="absolute inset-7 rounded-full border border-primary/30"
          animate={{ rotate: 360 }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear" }}
          style={{ boxShadow: "0 0 12px hsl(var(--primary) / 0.2)" }}
        />
        {/* Core pulse */}
        <motion.div
          className="w-8 h-8 rounded-full bg-primary/10 border border-primary/30"
          animate={{ scale: [1, 1.15, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          style={{ boxShadow: "0 0 25px hsl(var(--primary) / 0.3)" }}
        />
      </motion.div>

      {/* Title */}
      <motion.div
        className="text-center mb-8"
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
      >
        <h1 className="font-serif text-2xl tracking-[0.3em] text-foreground font-bold mb-1">
          ORION
        </h1>
        <p className="text-[8px] text-primary/60 tracking-[0.3em] uppercase font-mono">
          IA EMPRESARIAL • ELP GREEN TECHNOLOGY
        </p>
      </motion.div>

      {/* Scan line loader */}
      <motion.div
        className="w-40 h-px relative overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
      >
        <div className="absolute inset-0 bg-primary/10" />
        <motion.div
          className="absolute top-0 h-full w-12 bg-gradient-to-r from-transparent via-primary/60 to-transparent"
          animate={{ x: ["-48px", "160px"] }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
        />
      </motion.div>

      {/* Status text */}
      <motion.p
        className="mt-4 text-[8px] text-muted-foreground/40 uppercase tracking-[0.3em] font-mono"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 1, 0.5, 1] }}
        transition={{ delay: 0.7, duration: 2, repeat: Infinity }}
      >
        INICIALIZANDO SISTEMA
      </motion.p>

      {/* Corner accents */}
      <div className="absolute top-6 left-6 w-6 h-6 border-t border-l border-primary/15" />
      <div className="absolute top-6 right-6 w-6 h-6 border-t border-r border-primary/15" />
      <div className="absolute bottom-6 left-6 w-6 h-6 border-b border-l border-primary/15" />
      <div className="absolute bottom-6 right-6 w-6 h-6 border-b border-r border-primary/15" />
    </div>
  );
}
