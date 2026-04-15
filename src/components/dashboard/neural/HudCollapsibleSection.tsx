/**
 * ═══ HUD Collapsible Section ═══
 * Expandable/collapsible bar for JARVIS HUD sidebar panels
 * Each section has an icon, title, and smooth expand/collapse animation
 */
import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface HudCollapsibleSectionProps {
  icon: LucideIcon;
  title: string;
  iconColor?: string;
  accentColor?: string;
  defaultOpen?: boolean;
  badge?: string | number;
  badgeColor?: string;
  children: ReactNode;
  className?: string;
}

export function HudCollapsibleSection({
  icon: Icon,
  title,
  iconColor = "#D4AF37",
  accentColor = "rgba(212,175,55,0.4)",
  defaultOpen = false,
  badge,
  badgeColor,
  children,
  className,
}: HudCollapsibleSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className={cn("relative bg-black/60 backdrop-blur-sm border border-cyan-500/20 rounded-sm overflow-hidden", className)}>
      {/* Top accent line */}
      <div
        className="absolute top-0 left-0 w-full h-px"
        style={{ background: `linear-gradient(90deg, ${accentColor}, transparent 60%)` }}
      />

      {/* Clickable header bar */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full px-3 py-1.5 flex items-center gap-1.5 hover:bg-white/[0.02] transition-colors"
      >
        <Icon
          className="h-3 w-3 shrink-0"
          style={{ color: iconColor, filter: `drop-shadow(0 0 4px ${iconColor}40)` }}
        />
        <span
          className="text-[10px] font-mono tracking-wider uppercase flex-1 text-left"
          style={{ color: `${iconColor}B3` }}
        >
          {title}
        </span>

        {badge !== undefined && (
          <span
            className="text-[7px] font-mono font-bold px-1 rounded"
            style={{ color: badgeColor || iconColor, backgroundColor: `${badgeColor || iconColor}15` }}
          >
            {badge}
          </span>
        )}

        <ChevronDown
          className={cn(
            "h-3 w-3 shrink-0 transition-transform duration-200 text-white/20",
            open && "rotate-180"
          )}
        />
      </button>

      {/* Collapsible content */}
      <div
        className={cn(
          "transition-all duration-200 ease-in-out overflow-hidden",
          open ? "max-h-[600px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <div className="border-t border-cyan-500/10">
          {children}
        </div>
      </div>
    </div>
  );
}
