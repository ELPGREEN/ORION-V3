/**
 * JARVIS HUD Sidebar — shared styles and decorations.
 * Used by DashboardSidebar, ProdutorSidebar, AfiliadoSidebar, NomadeSidebar, MobileSidebarOverlay.
 */

export function JarvisHUDOverlay() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* Vertical scanner line */}
      <div className="absolute right-0 top-0 bottom-0 w-px bg-gradient-to-b from-transparent via-cyan-500/10 to-transparent" />
      {/* Horizontal top accent */}
      <div className="absolute top-[68px] left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-500/8 to-transparent" />
      {/* Diagonal circuit lines */}
      <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.04 }}>
        <line x1="0" y1="70" x2="100%" y2="70" stroke="hsl(42 70% 50%)" strokeWidth="1" />
        <line x1="12%" y1="100%" x2="12%" y2="80%" stroke="hsl(195 90% 50%)" strokeWidth="1" strokeDasharray="2 6" />
        <line x1="88%" y1="100%" x2="88%" y2="85%" stroke="hsl(195 90% 50%)" strokeWidth="0.5" strokeDasharray="1 8" />
      </svg>
      {/* Corner brackets */}
      <div className="absolute bottom-3 left-3 w-4 h-4 border-b border-l border-cyan-500/10" />
      <div className="absolute bottom-3 right-3 w-4 h-4 border-b border-r border-cyan-500/10" />
      <div className="absolute top-[72px] left-3 w-3 h-3 border-t border-l border-amber-500/8" />
      {/* Scanning dot animation */}
      <div className="absolute right-2 top-1/2 w-1 h-1 rounded-full bg-cyan-400/20 animate-pulse" />
    </div>
  );
}

/* ─── Tailwind class sets ─── */

export const jarvisSidebar = {
  aside: "bg-[hsl(230_30%_6%)] backdrop-blur-xl flex flex-col z-50 transition-all duration-300 h-full border-r border-cyan-500/8 shadow-[inset_0_0_80px_rgba(0,188,212,0.02)] relative overflow-hidden",
  
  logoSection: "px-4 py-5 border-b border-cyan-500/8 flex items-center justify-between relative",
  logoTitle: "text-sm font-serif text-cyan-100 tracking-[0.25em] font-bold drop-shadow-[0_0_8px_rgba(0,188,212,0.3)]",
  logoSubtitle: "text-[8px] tracking-[0.2em] mt-0.5 font-semibold uppercase",
  
  sectionHeader: "w-full flex items-center justify-between px-4 py-2.5 text-[9px] uppercase tracking-[0.2em] text-cyan-400/40 hover:text-cyan-400/70 transition-colors font-medium",
  
  menuItem: (active: boolean) =>
    `flex items-center gap-3 mx-2 px-3 py-2 text-[11px] tracking-wide transition-all duration-200 relative group rounded-sm ${
      active
        ? "bg-cyan-500/8 text-cyan-300 font-medium border-l-2 border-cyan-400 shadow-[0_0_20px_rgba(0,188,212,0.08),inset_0_0_15px_rgba(0,188,212,0.04)]"
        : "text-slate-400 hover:text-cyan-200 hover:bg-cyan-500/5 border-l-2 border-transparent"
    }`,

  menuIcon: (active: boolean) =>
    `h-[18px] w-[18px] flex-shrink-0 transition-all duration-300 ${
      active
        ? "text-cyan-400 drop-shadow-[0_0_6px_rgba(0,188,212,0.5)]"
        : "text-slate-500 group-hover:text-cyan-400/70"
    }`,

  quickAction: "w-full h-9 text-[10px] tracking-[0.15em] gap-2 bg-gradient-to-r from-cyan-600/20 to-amber-600/10 border border-cyan-500/15 text-cyan-300 hover:from-cyan-600/30 hover:to-amber-600/15 hover:border-cyan-500/25 hover:text-cyan-200 transition-all duration-300 shadow-[0_0_12px_rgba(0,188,212,0.06)]",

  userSection: "p-3 border-t border-cyan-500/8",
  userAvatar: "h-9 w-9 bg-cyan-500/5 border border-cyan-500/15 flex items-center justify-center flex-shrink-0 rounded-sm",
  userName: "text-[11px] text-cyan-100 truncate font-medium",
  userEmail: "text-[9px] text-slate-500 truncate",
  
  logoutBtn: "flex-1 text-[9px] text-slate-500 hover:text-red-400 h-7 hover:bg-red-500/5 transition-all",
  settingsBtn: "flex-1 text-[9px] text-slate-500 hover:text-cyan-300 h-7 hover:bg-cyan-500/5 transition-all",

  disclaimer: "px-4 py-2 border-t border-cyan-500/6",
  disclaimerText: "text-[7px] text-slate-600 leading-relaxed tracking-wider uppercase",
  
  badge: "absolute right-2 h-4 min-w-4 px-1 bg-red-500/80 text-white text-[8px] font-bold flex items-center justify-center rounded-sm shadow-[0_0_8px_rgba(239,68,68,0.3)]",
};
