/**
 * Orion Sumerian Icon System — JARVIS HUD Style
 * Custom SVG icons inspired by ancient Sumerian cuneiform + futuristic HUD.
 * Each icon is a unique glyph — no Lucide, no Material icons.
 */

import { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

const defaults = (props: IconProps) => ({
  width: props.size || 18,
  height: props.size || 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.5,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  ...props,
  size: undefined,
});

/* ─── Principal ─── */
export function IconDashboard(props: IconProps) {
  const p = defaults(props);
  return (
    <svg {...p}>
      {/* Sumerian eye of knowledge — all-seeing dashboard */}
      <path d="M12 4L3 12l9 8 9-8-9-8z" />
      <circle cx="12" cy="12" r="2.5" />
      <path d="M12 7v-1M12 18v-1" strokeDasharray="1 2" />
      <path d="M8 12H7M17 12h-1" strokeDasharray="1 2" />
    </svg>
  );
}

export function IconSparkle(props: IconProps) {
  const p = defaults(props);
  return (
    <svg {...p}>
      {/* Sumerian star of Inanna — creation/generation */}
      <path d="M12 2v20M2 12h20" />
      <path d="M5.6 5.6l12.8 12.8M18.4 5.6L5.6 18.4" />
      <circle cx="12" cy="12" r="3" strokeDasharray="2 2" />
    </svg>
  );
}

export function IconDocuments(props: IconProps) {
  const p = defaults(props);
  return (
    <svg {...p}>
      {/* Cuneiform tablet — documents */}
      <rect x="4" y="3" width="16" height="18" rx="1" />
      <path d="M8 8h3M8 12h8M8 16h5" />
      <path d="M17 3v4h-3" strokeDasharray="2 1" />
    </svg>
  );
}

export function IconBrain(props: IconProps) {
  const p = defaults(props);
  return (
    <svg {...p}>
      {/* Neural glyph — Orion IA */}
      <circle cx="12" cy="12" r="8" strokeDasharray="3 2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 4v5M12 15v5" />
      <path d="M4.9 8.1l4.3 2.5M14.8 13.4l4.3 2.5" />
      <path d="M4.9 15.9l4.3-2.5M14.8 10.6l4.3-2.5" />
    </svg>
  );
}

/* ─── Gestão Jurídica ─── */
export function IconCRM(props: IconProps) {
  const p = defaults(props);
  return (
    <svg {...p}>
      {/* Connected people glyph */}
      <circle cx="8" cy="7" r="2.5" />
      <circle cx="16" cy="7" r="2.5" />
      <path d="M4 17c0-2.2 1.8-4 4-4h0M16 13h0c2.2 0 4 1.8 4 4" />
      <path d="M8 13h8" strokeDasharray="2 2" />
      <circle cx="12" cy="19" r="1.5" />
    </svg>
  );
}

export function IconProcessos(props: IconProps) {
  const p = defaults(props);
  return (
    <svg {...p}>
      {/* Scale of justice — Sumerian Shamash */}
      <path d="M12 3v18" />
      <path d="M5 7h14" />
      <path d="M5 7l-1 6h6L9 7" />
      <path d="M15 7l-1 6h6l-1-6" />
      <path d="M8 21h8" />
    </svg>
  );
}

export function IconTarefas(props: IconProps) {
  const p = defaults(props);
  return (
    <svg {...p}>
      {/* Checklist cuneiform */}
      <path d="M4 6h2l1.5 1.5L11 4" />
      <path d="M14 6h6" />
      <path d="M4 12h2l1.5 1.5L11 10" />
      <path d="M14 12h6" />
      <path d="M4 18h2l1.5 1.5L11 16" />
      <path d="M14 18h6" />
    </svg>
  );
}

export function IconAssinatura(props: IconProps) {
  const p = defaults(props);
  return (
    <svg {...p}>
      {/* Cylinder seal — signature */}
      <ellipse cx="12" cy="6" rx="6" ry="3" />
      <path d="M6 6v12c0 1.7 2.7 3 6 3s6-1.3 6-3V6" />
      <path d="M8 12c1 .5 2.5 1 4 1s3-.5 4-1" strokeDasharray="2 1" />
    </svg>
  );
}

export function IconGlobe(props: IconProps) {
  const p = defaults(props);
  return (
    <svg {...p}>
      {/* Sumerian world map */}
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c-3 3-3 6 0 9s3 6 0 9" />
      <path d="M12 3c3 3 3 6 0 9s-3 6 0 9" />
    </svg>
  );
}

/* ─── Comunicação ─── */
export function IconChat(props: IconProps) {
  const p = defaults(props);
  return (
    <svg {...p}>
      {/* Speech glyph — two overlapping tablets */}
      <path d="M4 4h12v9H8l-4 3V4z" />
      <path d="M8 13h12v9l-4-3H8v-6" strokeDasharray="3 1" />
    </svg>
  );
}

export function IconCalendar(props: IconProps) {
  const p = defaults(props);
  return (
    <svg {...p}>
      {/* Sumerian lunar calendar */}
      <rect x="3" y="5" width="18" height="16" rx="1" />
      <path d="M3 9h18" />
      <path d="M8 3v4M16 3v4" />
      <circle cx="12" cy="15" r="2" strokeDasharray="1.5 1.5" />
    </svg>
  );
}

export function IconBell(props: IconProps) {
  const p = defaults(props);
  return (
    <svg {...p}>
      {/* Temple bell glyph */}
      <path d="M12 3c-3.5 0-6 2.5-6 6v4l-2 3h16l-2-3v-4c0-3.5-2.5-6-6-6z" />
      <path d="M10 20c.6 1.2 1.5 1 2 1s1.4.2 2-1" />
      <circle cx="12" cy="3" r="1" fill="currentColor" />
    </svg>
  );
}

export function IconPayment(props: IconProps) {
  const p = defaults(props);
  return (
    <svg {...p}>
      {/* Shekel/coin — ancient currency */}
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6v12" />
      <path d="M9 8c0-1 1.3-2 3-2s3 1 3 2-1.3 2-3 2" />
      <path d="M9 16c0 1 1.3 2 3 2s3-1 3-2-1.3-2-3-2" />
    </svg>
  );
}

/* ─── Ferramentas IA ─── */
export function IconSearch(props: IconProps) {
  const p = defaults(props);
  return (
    <svg {...p}>
      {/* Oracle eye — advanced search */}
      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 5v-2M12 21v-2" strokeDasharray="1 2" />
    </svg>
  );
}

export function IconReformulacao(props: IconProps) {
  const p = defaults(props);
  return (
    <svg {...p}>
      {/* Scroll transformation */}
      <path d="M4 5c0-1 1-2 2-2h5l7 7v10c0 1-1 2-2 2H6c-1 0-2-1-2-2V5z" />
      <path d="M11 3v5h5" />
      <path d="M8 14l2 2 4-4" />
    </svg>
  );
}

export function IconLab(props: IconProps) {
  const p = defaults(props);
  return (
    <svg {...p}>
      {/* Alchemist flask — laboratory */}
      <path d="M9 3h6M10 3v6l-5 9c-.5 1 .2 2 1.3 2h11.4c1.1 0 1.8-1 1.3-2l-5-9V3" />
      <path d="M8.5 14h7" strokeDasharray="2 1" />
      <circle cx="10" cy="17" r="0.5" fill="currentColor" />
      <circle cx="14" cy="16" r="0.5" fill="currentColor" />
    </svg>
  );
}

export function IconMarketplace(props: IconProps) {
  const p = defaults(props);
  return (
    <svg {...p}>
      {/* Bazaar/marketplace — Sumerian trading post */}
      <path d="M3 10l4-6h10l4 6" />
      <path d="M3 10h18v2H3v-2z" />
      <path d="M5 12v8h14v-8" />
      <path d="M10 15h4v5h-4z" />
    </svg>
  );
}

export function IconHelp(props: IconProps) {
  const p = defaults(props);
  return (
    <svg {...p}>
      {/* Oracle question mark */}
      <circle cx="12" cy="12" r="9" strokeDasharray="4 2" />
      <path d="M9 9c0-1.7 1.3-3 3-3s3 1.3 3 3c0 1.3-.8 2-2 2.5-.5.2-1 .7-1 1.2V15" />
      <circle cx="12" cy="18" r="0.8" fill="currentColor" />
    </svg>
  );
}

/* ─── Administração ─── */
export function IconSettings(props: IconProps) {
  const p = defaults(props);
  return (
    <svg {...p}>
      {/* Gear mechanism — ancient device */}
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2l1.5 2.4 2.9-.3 1 2.7 2.7 1-.3 2.9L22 12l-2.4 1.5.3 2.9-2.7 1-1 2.7-2.9-.3L12 22l-1.5-2.4-2.9.3-1-2.7-2.7-1 .3-2.9L2 12l2.4-1.5-.3-2.9 2.7-1 1-2.7 2.9.3z" />
    </svg>
  );
}

export function IconLogout(props: IconProps) {
  const p = defaults(props);
  return (
    <svg {...p}>
      {/* Exit portal */}
      <path d="M14 3h4c1 0 2 1 2 2v14c0 1-1 2-2 2h-4" />
      <path d="M10 17l-5-5 5-5" />
      <path d="M5 12h12" />
    </svg>
  );
}

export function IconUser(props: IconProps) {
  const p = defaults(props);
  return (
    <svg {...p}>
      {/* Sumerian figure */}
      <circle cx="12" cy="7" r="3.5" />
      <path d="M5 21c0-3.9 3.1-7 7-7s7 3.1 7 7" />
      <path d="M12 3.5v0" strokeDasharray="1 1" />
    </svg>
  );
}

export function IconCrown(props: IconProps) {
  const p = defaults(props);
  return (
    <svg {...p}>
      {/* Royal crown of Ur */}
      <path d="M3 18h18l-2-10-4 4-3-6-3 6-4-4-2 10z" />
      <path d="M3 18v2h18v-2" />
      <circle cx="12" cy="6" r="0.8" fill="currentColor" />
    </svg>
  );
}

/* ─── Proprietário ─── */
export function IconNeural(props: IconProps) {
  const p = defaults(props);
  return (
    <svg {...p}>
      {/* Neural network constellation */}
      <circle cx="12" cy="4" r="1.5" />
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
      <circle cx="8" cy="20" r="1.5" />
      <circle cx="16" cy="20" r="1.5" />
      <circle cx="12" cy="12" r="2" strokeDasharray="2 1" />
      <path d="M12 5.5v5M6.3 12.8l4 .1M13.7 12.9l4-.1M9 18.8l2.2-5M15 18.8l-2.2-5" strokeDasharray="2 2" />
    </svg>
  );
}

export function IconRobot(props: IconProps) {
  const p = defaults(props);
  return (
    <svg {...p}>
      {/* Golem/automaton */}
      <rect x="5" y="8" width="14" height="12" rx="2" />
      <path d="M9 3h6v5H9V3z" />
      <circle cx="9" cy="14" r="1.5" />
      <circle cx="15" cy="14" r="1.5" />
      <path d="M10 18h4" />
      <path d="M3 13h2M19 13h2" />
    </svg>
  );
}

export function IconUserAdmin(props: IconProps) {
  const p = defaults(props);
  return (
    <svg {...p}>
      {/* Scribe with stylus */}
      <circle cx="10" cy="7" r="3" />
      <path d="M4 20c0-3 2.5-6 6-6" />
      <path d="M16 11l4 4-6 6h-2v-2l6-6" />
      <path d="M18 13l2 2" />
    </svg>
  );
}

export function IconBook(props: IconProps) {
  const p = defaults(props);
  return (
    <svg {...p}>
      {/* Open clay tablet book */}
      <path d="M2 4c2-1 5-1 7 0 2-1 5-1 7 0v14c-2-1-5-1-7 0-2-1-5-1-7 0V4z" />
      <path d="M9 4v14" />
      <path d="M5 8h3M12 8h3" strokeDasharray="2 1" />
      <path d="M5 12h3M12 12h3" strokeDasharray="2 1" />
    </svg>
  );
}

export function IconExtension(props: IconProps) {
  const p = defaults(props);
  return (
    <svg {...p}>
      {/* Puzzle piece — extension */}
      <path d="M4 8h3c0-1.5 1.3-3 3-3s3 1.5 3 3h3v3c1.5 0 3 1.3 3 3s-1.5 3-3 3v3H4V8z" />
      <circle cx="10" cy="13" r="1" strokeDasharray="1 1" />
    </svg>
  );
}

/* ─── Roles: Produtor / Afiliado / Nomade ─── */
export function IconStore(props: IconProps) {
  const p = defaults(props);
  return (
    <svg {...p}>
      {/* Temple storefront */}
      <path d="M3 10L5 4h14l2 6" />
      <path d="M3 10c0 1.5 1.3 3 3 3s3-1.5 3-3" />
      <path d="M9 10c0 1.5 1.3 3 3 3s3-1.5 3-3" />
      <path d="M15 10c0 1.5 1.3 3 3 3s3-1.5 3-3" />
      <path d="M5 13v7h14v-7" />
    </svg>
  );
}

export function IconPackage(props: IconProps) {
  const p = defaults(props);
  return (
    <svg {...p}>
      {/* Trade goods — package */}
      <path d="M12 3l9 5v8l-9 5-9-5V8l9-5z" />
      <path d="M12 13l9-5M12 13v8M12 13L3 8" />
    </svg>
  );
}

export function IconLink(props: IconProps) {
  const p = defaults(props);
  return (
    <svg {...p}>
      {/* Chain links */}
      <path d="M10 13a4 4 0 005.66 0l3-3a4 4 0 00-5.66-5.66l-1 1" />
      <path d="M14 11a4 4 0 00-5.66 0l-3 3a4 4 0 005.66 5.66l1-1" />
    </svg>
  );
}

export function IconDollar(props: IconProps) {
  const p = defaults(props);
  return (
    <svg {...p}>
      {/* Gold ingot + symbol */}
      <path d="M6 4h12l2 6H4l2-6z" />
      <rect x="4" y="10" width="16" height="10" rx="1" />
      <path d="M12 12v6M10 14h4M10 16h4" />
    </svg>
  );
}

export function IconShare(props: IconProps) {
  const p = defaults(props);
  return (
    <svg {...p}>
      {/* Distribution network */}
      <circle cx="6" cy="12" r="2" />
      <circle cx="18" cy="6" r="2" />
      <circle cx="18" cy="18" r="2" />
      <path d="M7.8 11l8.4-4M7.8 13l8.4 4" />
    </svg>
  );
}

export function IconBarChart(props: IconProps) {
  const p = defaults(props);
  return (
    <svg {...p}>
      {/* Ancient measurement columns */}
      <path d="M4 20h16" />
      <rect x="5" y="12" width="3" height="8" rx="0.5" />
      <rect x="10.5" y="6" width="3" height="14" rx="0.5" />
      <rect x="16" y="9" width="3" height="11" rx="0.5" />
    </svg>
  );
}

export function IconPlus(props: IconProps) {
  const p = defaults(props);
  return (
    <svg {...p}>
      <path d="M12 5v14M5 12h14" />
      <circle cx="12" cy="12" r="9" strokeDasharray="3 3" />
    </svg>
  );
}

export function IconChevronDown(props: IconProps) {
  const p = defaults(props);
  return (
    <svg {...p}>
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

export function IconChevronLeft(props: IconProps) {
  const p = defaults(props);
  return (
    <svg {...p}>
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

export function IconChevronRight(props: IconProps) {
  const p = defaults(props);
  return (
    <svg {...p}>
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

export function IconClose(props: IconProps) {
  const p = defaults(props);
  return (
    <svg {...p}>
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export function IconMessage(props: IconProps) {
  const p = defaults(props);
  return (
    <svg {...p}>
      {/* Message tablet */}
      <path d="M4 4h16v13H8l-4 3V4z" />
      <path d="M8 9h8M8 13h4" strokeDasharray="3 1" />
    </svg>
  );
}

export function IconGoogle(props: IconProps) {
  const p = defaults(props);
  return (
    <svg {...p}>
      {/* Compass rose — Google tools */}
      <circle cx="12" cy="12" r="9" strokeDasharray="4 2" />
      <path d="M12 3v4M12 17v4M3 12h4M17 12h4" />
      <path d="M12 8l4 4-4 4-4-4 4-4z" fill="currentColor" fillOpacity="0.15" />
    </svg>
  );
}

/* ═══ Icon Map — lookup by string ID ═══ */
export const OrionIconMap: Record<string, React.ComponentType<IconProps>> = {
  "home": IconDashboard,
  "gerar": IconSparkle,
  "documentos": IconDocuments,
  "orion-ia": IconBrain,
  "crm": IconCRM,
  "processos": IconProcessos,
  "tarefas": IconTarefas,
  "assinatura": IconAssinatura,
  "docs-internacionais": IconGlobe,
  "chat-ao-vivo": IconChat,
  "consultas": IconCalendar,
  "notificacoes": IconBell,
  "pagamentos": IconPayment,
  "pesquisa": IconSearch,
  "reformulacao": IconReformulacao,
  "laboratorio-ia": IconLab,
  "marketplace": IconMarketplace,
  "instrucoes": IconHelp,
  "config": IconSettings,
  "configuracoes": IconSettings,
  "rede-neural": IconNeural,
  "ferramentas-google": IconGoogle,
  "controle-robotico": IconRobot,
  "usuarios": IconUserAdmin,
  "publicacoes-admin": IconBook,
  "recursos-eu": IconGlobe,
  "extension": IconExtension,
  "plano": IconCrown,
  "meus-produtos": IconPackage,
  "meu-site": IconStore,
  "afiliados": IconShare,
  "analytics": IconBarChart,
  "metricas": IconBarChart,
  "chat": IconMessage,
  "meus-processos": IconProcessos,
  "assinatura-digital": IconAssinatura,
  "assinatura-cliente": IconAssinatura,
  "consulta-ia": IconBrain,
  "manual": IconBook,
};

export function getOrionIcon(id: string): React.ComponentType<IconProps> {
  return OrionIconMap[id] || IconDashboard;
}
