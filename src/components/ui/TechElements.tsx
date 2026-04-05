import { motion } from "framer-motion";

/**
 * Animated horizontal tech line with a traveling gold light.
 * Use between sections to replace <div className="gold-line" /> or <SectionDivider />.
 */
export function TechLine() {
  return (
    <div className="relative h-px w-full overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      <motion.div
        className="absolute top-0 h-full w-32 bg-gradient-to-r from-transparent via-primary to-transparent"
        animate={{ x: ["-128px", "calc(100vw + 128px)"] }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}

/**
 * Glassmorphism card with backdrop-blur and subtle gold border.
 */
export function GlassCard({
  children,
  className = "",
  hover = true,
}: {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}) {
  return (
    <div
      className={`backdrop-blur-xl bg-card/40 border border-primary/10 ${
        hover ? "hover:border-primary/25 transition-all duration-500" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

/**
 * Subtle grid pattern overlay for section backgrounds.
 * Use inside a section with `relative overflow-hidden`.
 */
export function TechGridOverlay({ variant = "lines" }: { variant?: "lines" | "dots" }) {
  if (variant === "dots") {
    return (
      <div
        className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--primary)) 1px, transparent 0)`,
          backgroundSize: "40px 40px",
        }}
      />
    );
  }

  return (
    <div
      className="absolute inset-0 opacity-[0.02] pointer-events-none"
      style={{
        backgroundImage: `linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)`,
        backgroundSize: "80px 80px",
      }}
    />
  );
}

/**
 * Section label with decorative side lines.
 * Replaces plain `<p className="text-primary uppercase ...">` labels.
 */
export function TechSectionLabel({
  children,
  centered = true,
}: {
  children: React.ReactNode;
  centered?: boolean;
}) {
  if (centered) {
    return (
      <div className="flex items-center justify-center gap-3 mb-5">
        <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary/60" />
        <p className="text-primary uppercase tracking-[0.35em] text-[11px] font-medium">
          {children}
        </p>
        <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary/60" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 mb-5">
      <div className="h-px w-8 bg-primary" />
      <p className="text-primary uppercase tracking-[0.35em] text-[11px] font-medium">
        {children}
      </p>
    </div>
  );
}

/**
 * Geometric decorative overlay for hero sections.
 */
export function HeroGeometry() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] border border-primary/5 rotate-45 hidden lg:block" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border border-primary/8 rotate-[30deg] hidden lg:block" />
      <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-primary/[0.03] rounded-full blur-[150px]" />
      <div className="absolute -top-20 -left-20 w-[300px] h-[300px] bg-primary/[0.04] rounded-full blur-[100px]" />
    </div>
  );
}
