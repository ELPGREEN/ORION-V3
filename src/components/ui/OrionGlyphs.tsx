/**
 * OrionGlyphs — Sumerian-Tron style custom SVG icons for Orion IA
 * Geometric cuneiform + circuit aesthetics
 */
import { type SVGProps } from "react";

interface GlyphProps extends SVGProps<SVGSVGElement> {
  size?: number;
  glow?: string; // glow color for tron effect
}

const base = (size: number, props: GlyphProps) => ({
  width: size,
  height: size,
  viewBox: "0 0 32 32",
  fill: "none",
  xmlns: "http://www.w3.org/2000/svg",
  ...props,
});

// ⚡ Voice / Lightning Live — cuneiform zigzag bolt
export function GlyphVoice({ size = 24, glow, ...props }: GlyphProps) {
  return (
    <svg {...base(size, props)}>
      <defs>
        {glow && <filter id="gv"><feGaussianBlur stdDeviation="1.5" /><feComposite in="SourceGraphic" /></filter>}
      </defs>
      {glow && <path d="M16 3L10 14h5l-3 15 10-17h-6l4-9z" fill={glow} opacity="0.3" filter="url(#gv)" />}
      <path d="M16 3L10 14h5l-3 15 10-17h-6l4-9z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
      <line x1="4" y1="16" x2="8" y2="16" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <line x1="24" y1="16" x2="28" y2="16" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <circle cx="6" cy="16" r="1" fill="currentColor" opacity="0.3" />
      <circle cx="26" cy="16" r="1" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

// 🧠 DeepSeek / Reasoning — nested hexagonal brain
export function GlyphBrain({ size = 24, glow, ...props }: GlyphProps) {
  return (
    <svg {...base(size, props)}>
      <defs>
        {glow && <filter id="gb"><feGaussianBlur stdDeviation="1.5" /><feComposite in="SourceGraphic" /></filter>}
      </defs>
      {glow && <polygon points="16,3 27,9.5 27,22.5 16,29 5,22.5 5,9.5" fill={glow} opacity="0.2" filter="url(#gb)" />}
      <polygon points="16,3 27,9.5 27,22.5 16,29 5,22.5 5,9.5" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
      <polygon points="16,8 22,11.5 22,20.5 16,24 10,20.5 10,11.5" stroke="currentColor" strokeWidth="1" opacity="0.6" />
      <polygon points="16,13 19,14.5 19,19.5 16,21 13,19.5 13,14.5" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
      <circle cx="16" cy="16" r="1.5" fill="currentColor" opacity="0.8" />
      {/* Neural connection lines */}
      <line x1="16" y1="3" x2="16" y2="8" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
      <line x1="27" y1="9.5" x2="22" y2="11.5" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
      <line x1="5" y1="9.5" x2="10" y2="11.5" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
    </svg>
  );
}

// 👁 Vision — Eye of Horus / Sumerian all-seeing eye
export function GlyphVision({ size = 24, glow, ...props }: GlyphProps) {
  return (
    <svg {...base(size, props)}>
      <defs>
        {glow && <filter id="ge"><feGaussianBlur stdDeviation="1.5" /><feComposite in="SourceGraphic" /></filter>}
      </defs>
      {glow && <ellipse cx="16" cy="16" rx="12" ry="7" fill={glow} opacity="0.2" filter="url(#ge)" />}
      <path d="M3 16s5-9 13-9 13 9 13 9-5 9-13 9S3 16 3 16z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
      <circle cx="16" cy="16" r="4.5" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="16" cy="16" r="1.8" fill="currentColor" />
      {/* Horus teardrop */}
      <path d="M16 20.5v6l-2 2" stroke="currentColor" strokeWidth="1" opacity="0.5" strokeLinecap="round" />
      {/* Scan lines */}
      <line x1="7" y1="10" x2="5" y2="7" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
      <line x1="25" y1="10" x2="27" y2="7" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
    </svg>
  );
}

// 🪄 Artifacts — Sumerian creation tablet
export function GlyphArtifact({ size = 24, glow, ...props }: GlyphProps) {
  return (
    <svg {...base(size, props)}>
      {glow && <rect x="6" y="4" width="20" height="24" rx="1" fill={glow} opacity="0.15" />}
      <rect x="6" y="4" width="20" height="24" rx="1" stroke="currentColor" strokeWidth="1.5" />
      {/* Cuneiform lines */}
      <line x1="10" y1="9" x2="22" y2="9" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <line x1="10" y1="13" x2="18" y2="13" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      <line x1="10" y1="17" x2="20" y2="17" stroke="currentColor" strokeWidth="1" opacity="0.3" />
      {/* Sparkle */}
      <path d="M21 20l1.5-3 1.5 3-1.5 3z" fill="currentColor" opacity="0.6" />
      <line x1="21" y1="20" x2="25" y2="20" stroke="currentColor" strokeWidth="0.6" opacity="0.4" />
      {/* Corner marks */}
      <path d="M6 8h-2v-4h2" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
    </svg>
  );
}

// 🖥 Computer Use — circuit screen
export function GlyphComputer({ size = 24, glow, ...props }: GlyphProps) {
  return (
    <svg {...base(size, props)}>
      {glow && <rect x="4" y="5" width="24" height="17" rx="1" fill={glow} opacity="0.15" />}
      <rect x="4" y="5" width="24" height="17" rx="1" stroke="currentColor" strokeWidth="1.5" />
      <line x1="12" y1="22" x2="12" y2="27" stroke="currentColor" strokeWidth="1.2" />
      <line x1="20" y1="22" x2="20" y2="27" stroke="currentColor" strokeWidth="1.2" />
      <line x1="9" y1="27" x2="23" y2="27" stroke="currentColor" strokeWidth="1.5" />
      {/* Circuit traces inside */}
      <path d="M8 10h4l2 3h6" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
      <path d="M8 16h3l1-2h5l2 2h3" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
      <circle cx="24" cy="10" r="1" fill="currentColor" opacity="0.5" />
      <circle cx="8" cy="10" r="0.8" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

// 💾 Memory — Sumerian data crystal
export function GlyphMemory({ size = 24, glow, ...props }: GlyphProps) {
  return (
    <svg {...base(size, props)}>
      <defs>
        {glow && <filter id="gm"><feGaussianBlur stdDeviation="1.5" /><feComposite in="SourceGraphic" /></filter>}
      </defs>
      {glow && <polygon points="16,2 26,9 26,23 16,30 6,23 6,9" fill={glow} opacity="0.15" filter="url(#gm)" />}
      <polygon points="16,2 26,9 26,23 16,30 6,23 6,9" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
      {/* Internal data layers */}
      <line x1="6" y1="12" x2="26" y2="12" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
      <line x1="6" y1="20" x2="26" y2="20" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
      {/* Core data point */}
      <rect x="13" y="14" width="6" height="4" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
      <circle cx="16" cy="16" r="1" fill="currentColor" opacity="0.6" />
      {/* Data streams */}
      <line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" strokeWidth="0.6" opacity="0.4" strokeDasharray="1 1" />
      <line x1="16" y1="26" x2="16" y2="30" stroke="currentColor" strokeWidth="0.6" opacity="0.4" strokeDasharray="1 1" />
    </svg>
  );
}

// 🧠 Multi-layer Reasoning — nested triangles
export function GlyphReasoning({ size = 24, glow, ...props }: GlyphProps) {
  return (
    <svg {...base(size, props)}>
      {glow && <polygon points="16,2 30,28 2,28" fill={glow} opacity="0.12" />}
      <polygon points="16,2 30,28 2,28" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
      <polygon points="16,9 24,25 8,25" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <polygon points="16,15 20,23 12,23" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
      <circle cx="16" cy="19" r="1" fill="currentColor" opacity="0.6" />
      {/* Vertex nodes */}
      <circle cx="16" cy="2" r="1.2" fill="currentColor" opacity="0.4" />
      <circle cx="30" cy="28" r="1.2" fill="currentColor" opacity="0.4" />
      <circle cx="2" cy="28" r="1.2" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

// 📄 Document — cuneiform clay tablet
export function GlyphDocument({ size = 24, glow, ...props }: GlyphProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M7 3h13l5 5v21H7z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
      <path d="M20 3v5h5" stroke="currentColor" strokeWidth="1.2" />
      {/* Cuneiform wedge marks */}
      <path d="M11 11l2-1v2z" fill="currentColor" opacity="0.5" />
      <path d="M16 11l2-1v2z" fill="currentColor" opacity="0.4" />
      <path d="M21 11l-2-1v2z" fill="currentColor" opacity="0.3" />
      <path d="M11 16l2-1v2z" fill="currentColor" opacity="0.4" />
      <path d="M16 16l2-1v2z" fill="currentColor" opacity="0.3" />
      <line x1="11" y1="21" x2="21" y2="21" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
      <line x1="11" y1="24" x2="18" y2="24" stroke="currentColor" strokeWidth="0.8" opacity="0.2" />
    </svg>
  );
}

// 🔍 Search — all-seeing search sigil
export function GlyphSearch({ size = 24, glow, ...props }: GlyphProps) {
  return (
    <svg {...base(size, props)}>
      <circle cx="14" cy="14" r="9" stroke="currentColor" strokeWidth="1.5" />
      <line x1="21" y1="21" x2="28" y2="28" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      {/* Inner crosshair */}
      <line x1="14" y1="8" x2="14" y2="20" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
      <line x1="8" y1="14" x2="20" y2="14" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
      <circle cx="14" cy="14" r="3" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
      <circle cx="14" cy="14" r="1" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

// 📊 Analytics — ascending data ziggurat
export function GlyphAnalytics({ size = 24, glow, ...props }: GlyphProps) {
  return (
    <svg {...base(size, props)}>
      <line x1="4" y1="28" x2="28" y2="28" stroke="currentColor" strokeWidth="1.5" />
      {/* Ziggurat bars */}
      <rect x="6" y="20" width="4" height="8" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <rect x="12" y="14" width="4" height="14" stroke="currentColor" strokeWidth="1" opacity="0.6" />
      <rect x="18" y="8" width="4" height="20" stroke="currentColor" strokeWidth="1" opacity="0.7" />
      <rect x="24" y="4" width="4" height="24" stroke="currentColor" strokeWidth="1.2" />
      {/* Rising trend line */}
      <path d="M8 18l6-8 6-4 4-3" stroke="currentColor" strokeWidth="1" opacity="0.4" strokeDasharray="2 1" />
      <circle cx="26" cy="3" r="1.2" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

// 🌐 Globe / Multi-language — orbital rings
export function GlyphGlobe({ size = 24, glow, ...props }: GlyphProps) {
  return (
    <svg {...base(size, props)}>
      <circle cx="16" cy="16" r="12" stroke="currentColor" strokeWidth="1.5" />
      <ellipse cx="16" cy="16" rx="6" ry="12" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
      <line x1="4" y1="16" x2="28" y2="16" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
      <ellipse cx="16" cy="10" rx="10" ry="3" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
      <ellipse cx="16" cy="22" rx="10" ry="3" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
      {/* Orbital accent */}
      <circle cx="24" cy="8" r="1.5" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

// 🛡 Shield / Compliance — Sumerian shield with eye
export function GlyphShield({ size = 24, glow, ...props }: GlyphProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M16 2L4 8v10c0 7 12 12 12 12s12-5 12-12V8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
      <path d="M16 7L8 11v6c0 4.5 8 8 8 8s8-3.5 8-8v-6z" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
      <circle cx="16" cy="15" r="2.5" stroke="currentColor" strokeWidth="1" opacity="0.6" />
      <circle cx="16" cy="15" r="1" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

// 🤖 Bot / Assistant — Orion face sigil
export function GlyphAssistant({ size = 24, glow, ...props }: GlyphProps) {
  return (
    <svg {...base(size, props)}>
      <rect x="6" y="6" width="20" height="20" rx="3" stroke="currentColor" strokeWidth="1.5" />
      {/* Eyes */}
      <circle cx="12" cy="14" r="2" stroke="currentColor" strokeWidth="1" />
      <circle cx="20" cy="14" r="2" stroke="currentColor" strokeWidth="1" />
      <circle cx="12" cy="14" r="0.8" fill="currentColor" opacity="0.6" />
      <circle cx="20" cy="14" r="0.8" fill="currentColor" opacity="0.6" />
      {/* Mouth circuit */}
      <path d="M11 20h10" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      {/* Antenna */}
      <line x1="16" y1="6" x2="16" y2="2" stroke="currentColor" strokeWidth="1.2" />
      <circle cx="16" cy="2" r="1.2" fill="currentColor" opacity="0.4" />
      {/* Side nodes */}
      <line x1="6" y1="16" x2="3" y2="16" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
      <line x1="26" y1="16" x2="29" y2="16" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
    </svg>
  );
}

// ⚙ Workflow / Automation — interlocking gears
export function GlyphWorkflow({ size = 24, glow, ...props }: GlyphProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M16 4l2 3h3l1 3-2 2 2 2-1 3h-3l-2 3-2-3h-3l-1-3 2-2-2-2 1-3h3z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
      <circle cx="16" cy="14" r="3" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <circle cx="16" cy="14" r="1" fill="currentColor" opacity="0.5" />
      {/* Connection nodes */}
      <line x1="16" y1="20" x2="16" y2="28" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
      <circle cx="16" cy="28" r="1.5" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
    </svg>
  );
}

// 💽 Database / Storage — stacked data slabs
export function GlyphStorage({ size = 24, glow, ...props }: GlyphProps) {
  return (
    <svg {...base(size, props)}>
      <ellipse cx="16" cy="8" rx="11" ry="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 8v8c0 2.2 4.9 4 11 4s11-1.8 11-4V8" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 16v8c0 2.2 4.9 4 11 4s11-1.8 11-4v-8" stroke="currentColor" strokeWidth="1.5" />
      <ellipse cx="16" cy="16" rx="11" ry="4" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
      {/* Data glow */}
      <circle cx="16" cy="16" r="1" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

// 👥 Users / Teams — connected figures
export function GlyphTeam({ size = 24, glow, ...props }: GlyphProps) {
  return (
    <svg {...base(size, props)}>
      {/* Center figure */}
      <circle cx="16" cy="10" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M9 24c0-4 3-7 7-7s7 3 7 7" stroke="currentColor" strokeWidth="1.5" />
      {/* Left figure */}
      <circle cx="6" cy="12" r="2.5" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <path d="M1 22c0-3 2.2-5.5 5-5.5" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      {/* Right figure */}
      <circle cx="26" cy="12" r="2.5" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <path d="M31 22c0-3-2.2-5.5-5-5.5" stroke="currentColor" strokeWidth="1" opacity="0.4" />
      {/* Connection lines */}
      <line x1="8" y1="11" x2="13" y2="10" stroke="currentColor" strokeWidth="0.6" opacity="0.3" strokeDasharray="1 1" />
      <line x1="24" y1="11" x2="19" y2="10" stroke="currentColor" strokeWidth="0.6" opacity="0.3" strokeDasharray="1 1" />
    </svg>
  );
}

// 🔊 Audio Input — sound wave sigil
export function GlyphAudio({ size = 24, glow, ...props }: GlyphProps) {
  return (
    <svg {...base(size, props)}>
      <rect x="13" y="4" width="6" height="16" rx="3" stroke="currentColor" strokeWidth="1.5" />
      <path d="M8 14v2c0 4.4 3.6 8 8 8s8-3.6 8-8v-2" stroke="currentColor" strokeWidth="1.5" />
      <line x1="16" y1="24" x2="16" y2="29" stroke="currentColor" strokeWidth="1.2" />
      <line x1="12" y1="29" x2="20" y2="29" stroke="currentColor" strokeWidth="1.5" />
      {/* Sound waves */}
      <path d="M6 12c-1 2-1 6 0 8" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
      <path d="M26 12c1 2 1 6 0 8" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
    </svg>
  );
}

// ⚙ Processing Cog — angular gear
export function GlyphProcessing({ size = 24, glow, ...props }: GlyphProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M14 3h4v3l3 1 2-2 3 3-2 2 1 3h3v4h-3l-1 3 2 2-3 3-2-2-3 1v3h-4v-3l-3-1-2 2-3-3 2-2-1-3H3v-4h3l1-3-2-2 3-3 2 2 3-1z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
      <circle cx="16" cy="16" r="4" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <circle cx="16" cy="16" r="1.5" fill="currentColor" opacity="0.5" />
    </svg>
  );
}

// 🚀 Rocket / Output — launch sigil
export function GlyphLaunch({ size = 24, glow, ...props }: GlyphProps) {
  return (
    <svg {...base(size, props)}>
      <path d="M16 2c-3 4-5 10-5 16l5 5 5-5c0-6-2-12-5-16z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
      <circle cx="16" cy="14" r="2.5" stroke="currentColor" strokeWidth="1" opacity="0.6" />
      <circle cx="16" cy="14" r="1" fill="currentColor" opacity="0.5" />
      {/* Fins */}
      <path d="M11 18l-4 4v4l4-4" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      <path d="M21 18l4 4v4l-4-4" stroke="currentColor" strokeWidth="1" opacity="0.5" />
      {/* Exhaust */}
      <line x1="14" y1="25" x2="13" y2="29" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
      <line x1="16" y1="23" x2="16" y2="30" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
      <line x1="18" y1="25" x2="19" y2="29" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
    </svg>
  );
}
