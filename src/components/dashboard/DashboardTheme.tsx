import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type RoleTheme = "owner" | "advogado" | "cliente" | "produtor" | "afiliado" | "nomade";

const themeConfig: Record<RoleTheme, {
  headerGradient: string;
  accentBorder: string;
  accentBg: string;
  accentText: string;
  glowColor: string;
  badgeStyle: string;
}> = {
  owner: {
    headerGradient: "from-[hsl(220,25%,6%)] via-[hsl(220,20%,8%)] to-[hsl(30,85%,52%,0.12)]",
    accentBorder: "border-[hsl(30,85%,52%,0.3)]",
    accentBg: "bg-[hsl(30,85%,52%,0.1)]",
    accentText: "text-[hsl(30,85%,52%)]",
    glowColor: "hsl(30,85%,52%,0.15)",
    badgeStyle: "bg-[hsl(30,85%,52%,0.15)] text-[hsl(35,75%,65%)] border-[hsl(30,85%,52%,0.3)]",
  },
  advogado: {
    headerGradient: "from-[hsl(160,30%,6%)] via-card to-[hsl(160,60%,40%,0.08)]",
    accentBorder: "border-[hsl(160,60%,40%,0.3)]",
    accentBg: "bg-[hsl(160,60%,40%,0.1)]",
    accentText: "text-[hsl(160,60%,45%)]",
    glowColor: "hsl(160,60%,40%,0.12)",
    badgeStyle: "bg-[hsl(160,60%,40%,0.15)] text-[hsl(160,50%,55%)] border-[hsl(160,60%,40%,0.3)]",
  },
  cliente: {
    headerGradient: "from-card via-card to-[hsl(210,70%,50%,0.08)]",
    accentBorder: "border-[hsl(210,70%,50%,0.25)]",
    accentBg: "bg-[hsl(210,70%,50%,0.1)]",
    accentText: "text-[hsl(210,70%,55%)]",
    glowColor: "hsl(210,70%,50%,0.1)",
    badgeStyle: "bg-[hsl(210,70%,50%,0.15)] text-[hsl(210,60%,60%)] border-[hsl(210,70%,50%,0.3)]",
  },
  produtor: {
    headerGradient: "from-[hsl(270,30%,8%)] via-card to-[hsl(270,60%,50%,0.1)]",
    accentBorder: "border-[hsl(270,60%,50%,0.3)]",
    accentBg: "bg-[hsl(270,60%,50%,0.1)]",
    accentText: "text-[hsl(270,60%,60%)]",
    glowColor: "hsl(270,60%,50%,0.12)",
    badgeStyle: "bg-[hsl(270,60%,50%,0.15)] text-[hsl(270,50%,65%)] border-[hsl(270,60%,50%,0.3)]",
  },
  afiliado: {
    headerGradient: "from-[hsl(190,30%,6%)] via-card to-[hsl(190,70%,45%,0.08)]",
    accentBorder: "border-[hsl(190,70%,45%,0.3)]",
    accentBg: "bg-[hsl(190,70%,45%,0.1)]",
    accentText: "text-[hsl(190,70%,55%)]",
    glowColor: "hsl(190,70%,45%,0.12)",
    badgeStyle: "bg-[hsl(190,70%,45%,0.15)] text-[hsl(190,60%,60%)] border-[hsl(190,70%,45%,0.3)]",
  },
  nomade: {
    headerGradient: "from-[hsl(25,30%,7%)] via-card to-[hsl(25,80%,50%,0.08)]",
    accentBorder: "border-[hsl(25,80%,50%,0.3)]",
    accentBg: "bg-[hsl(25,80%,50%,0.1)]",
    accentText: "text-[hsl(25,80%,55%)]",
    glowColor: "hsl(25,80%,50%,0.12)",
    badgeStyle: "bg-[hsl(25,80%,50%,0.15)] text-[hsl(25,70%,60%)] border-[hsl(25,80%,50%,0.3)]",
  },
};

export function getTheme(role: RoleTheme) {
  return themeConfig[role];
}

interface ThemedHeaderProps {
  role: RoleTheme;
  greeting: string;
  userName: string;
  subtitle: string;
  icon?: LucideIcon;
  badgeLabel?: string;
  children?: React.ReactNode;
}

export function ThemedHeader({ role, greeting, userName, subtitle, icon: Icon, badgeLabel, children }: ThemedHeaderProps) {
  const t = themeConfig[role];
  return (
    <div className={cn("relative overflow-hidden border p-6 sm:p-8 rounded-lg", t.accentBorder, `bg-gradient-to-br ${t.headerGradient}`)}>
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute -top-20 -right-20 w-72 h-72 blur-[120px] animate-pulse"
          style={{ background: t.glowColor, animationDuration: "4s" }}
        />
      </div>
      {role === "owner" && (
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: "linear-gradient(hsl(30,85%,52%,0.03) 1px, transparent 1px), linear-gradient(90deg, hsl(30,85%,52%,0.03) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }} />
      )}
      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className={cn("text-[10px] tracking-[0.3em] uppercase mb-1.5 font-sans opacity-60", t.accentText)}>{greeting}</p>
          <h1 className="text-2xl sm:text-3xl font-serif text-foreground">
            <span className="text-gold-shine">{userName}</span>
          </h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-lg leading-relaxed flex items-center gap-1.5">
            {Icon && <Icon className={cn("h-3.5 w-3.5", t.accentText)} />}
            {subtitle}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {badgeLabel && (
            <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5", t.badgeStyle)}>
              {badgeLabel}
            </Badge>
          )}
          {children}
        </div>
      </div>
    </div>
  );
}

interface ThemedStatCardProps {
  role: RoleTheme;
  label: string;
  value: string | number;
  icon: LucideIcon;
  onClick?: () => void;
  highlight?: boolean;
}

export function ThemedStatCard({ role, label, value, icon: Icon, onClick, highlight }: ThemedStatCardProps) {
  const t = themeConfig[role];
  return (
    <div
      onClick={onClick}
      className={cn(
        "p-4 rounded-lg border transition-all",
        onClick && "cursor-pointer hover:scale-[1.02]",
        highlight ? cn(t.accentBorder, t.accentBg) : "border-border/50 bg-card/80",
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center", t.accentBg)}>
          <Icon className={cn("h-4 w-4", t.accentText)} />
        </div>
        <div>
          <p className="text-xl font-bold text-foreground">{value}</p>
          <p className="text-[10px] text-muted-foreground">{label}</p>
        </div>
      </div>
    </div>
  );
}

interface ThemedSectionProps {
  role: RoleTheme;
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}

export function ThemedSection({ role, title, icon: Icon, children, className }: ThemedSectionProps) {
  const t = themeConfig[role];
  return (
    <div className={cn("space-y-3", className)}>
      <h2 className="text-sm font-semibold tracking-wide uppercase text-muted-foreground flex items-center gap-2">
        {Icon && <Icon className={cn("h-4 w-4", t.accentText)} />}
        {title}
      </h2>
      {children}
    </div>
  );
}

interface StatusLEDProps {
  status: "online" | "offline" | "loading";
  label?: string;
  size?: "sm" | "md";
}

export function StatusLED({ status, label, size = "sm" }: StatusLEDProps) {
  const sizeClass = size === "sm" ? "h-2 w-2" : "h-3 w-3";
  return (
    <div className="flex items-center gap-1.5">
      <div className={cn(
        sizeClass, "rounded-full",
        status === "online" && "bg-[hsl(142,60%,45%)] shadow-[0_0_6px_hsl(142,60%,45%,0.5)]",
        status === "offline" && "bg-muted-foreground/40",
        status === "loading" && "bg-[hsl(38,92%,50%)] animate-pulse",
      )} />
      {label && (
        <span className={cn(
          "text-[9px] font-mono uppercase tracking-wider",
          status === "online" ? "text-[hsl(142,50%,55%)]" : "text-muted-foreground",
        )}>
          {label}
        </span>
      )}
    </div>
  );
}
