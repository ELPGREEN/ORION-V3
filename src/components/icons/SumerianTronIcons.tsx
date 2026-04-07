import React from "react";

interface IconProps {
  className?: string;
  style?: React.CSSProperties;
}

// ═══ Estilo: Cuneiforme digital + circuitos Tron + geometria sagrada suméria ═══

export const IconNeuralAI: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    <path d="M24 8L6 24L24 40L42 24L24 8Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
    <path d="M24 14L12 24L24 34L36 24L24 14Z" stroke="currentColor" strokeWidth="1" opacity="0.6" />
    <circle cx="24" cy="24" r="5" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="24" cy="24" r="2" fill="currentColor" opacity="0.8" />
    <line x1="24" y1="8" x2="24" y2="3" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    <line x1="42" y1="24" x2="46" y2="24" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    <line x1="24" y1="40" x2="24" y2="45" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    <line x1="6" y1="24" x2="2" y2="24" stroke="currentColor" strokeWidth="1" opacity="0.5" />
  </svg>
);

export const IconDocuments: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    <rect x="10" y="6" width="28" height="36" rx="1" stroke="currentColor" strokeWidth="1.5" />
    <rect x="14" y="10" width="20" height="28" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
    <path d="M16 16L20 14L18 18" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M24 16L28 14L26 18" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M16 24L20 22L18 26" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M24 24L28 22L26 26" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M16 32L20 30L18 34" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M24 32L28 30L26 34" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <line x1="10" y1="42" x2="38" y2="42" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
  </svg>
);

export const IconCRM: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    <path d="M24 6L18 14H30L24 6Z" fill="currentColor" opacity="0.3" />
    <circle cx="24" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="10" cy="30" r="3" stroke="currentColor" strokeWidth="1.2" />
    <path d="M10 27V20L24 13" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
    <circle cx="38" cy="30" r="3" stroke="currentColor" strokeWidth="1.2" />
    <path d="M38 27V20L24 13" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
    <circle cx="24" cy="38" r="3" stroke="currentColor" strokeWidth="1.2" />
    <path d="M24 35V20" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
    <line x1="13" y1="30" x2="35" y2="30" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
    <line x1="10" y1="33" x2="24" y2="38" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
    <line x1="38" y1="33" x2="24" y2="38" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
  </svg>
);

export const IconChat: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    <path d="M8 10H40V32H26L18 40V32H8V10Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
    <path d="M16 18L20 16L18 20" stroke="currentColor" strokeWidth="1.2" />
    <path d="M24 18H32" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    <path d="M16 24L20 22L18 26" stroke="currentColor" strokeWidth="1.2" />
    <path d="M24 24H30" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    <line x1="8" y1="10" x2="8" y2="6" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
    <line x1="40" y1="10" x2="40" y2="6" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
  </svg>
);

export const IconCalendar: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    <rect x="8" y="10" width="32" height="32" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
    <line x1="8" y1="18" x2="40" y2="18" stroke="currentColor" strokeWidth="1.5" />
    <line x1="16" y1="6" x2="16" y2="14" stroke="currentColor" strokeWidth="1.5" />
    <line x1="32" y1="6" x2="32" y2="14" stroke="currentColor" strokeWidth="1.5" />
    <path d="M24 22L26 28L32 28L27 32L29 38L24 34L19 38L21 32L16 28L22 28Z" stroke="currentColor" strokeWidth="1" fill="currentColor" opacity="0.3" />
    <line x1="19" y1="18" x2="19" y2="42" stroke="currentColor" strokeWidth="0.4" opacity="0.2" />
    <line x1="30" y1="18" x2="30" y2="42" stroke="currentColor" strokeWidth="0.4" opacity="0.2" />
    <line x1="8" y1="28" x2="40" y2="28" stroke="currentColor" strokeWidth="0.4" opacity="0.2" />
  </svg>
);

export const IconPayment: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    <circle cx="24" cy="24" r="16" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="24" cy="24" r="12" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
    <path d="M20 16V32M28 16V32" stroke="currentColor" strokeWidth="1.5" />
    <path d="M17 20H31M17 28H31" stroke="currentColor" strokeWidth="1.2" />
    <line x1="24" y1="8" x2="24" y2="4" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
    <line x1="40" y1="24" x2="44" y2="24" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
    <line x1="24" y1="40" x2="24" y2="44" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
    <line x1="8" y1="24" x2="4" y2="24" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
  </svg>
);

export const IconSearch: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    <path d="M4 24C4 24 12 10 24 10C36 10 44 24 44 24C44 24 36 38 24 38C12 38 4 24 4 24Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
    <circle cx="24" cy="24" r="7" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="24" cy="24" r="3" fill="currentColor" opacity="0.6" />
    <line x1="4" y1="24" x2="17" y2="24" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
    <line x1="31" y1="24" x2="44" y2="24" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
    <path d="M22 14L24 10L26 14" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
    <path d="M22 34L24 38L26 34" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
  </svg>
);

export const IconSignature: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    <rect x="6" y="28" width="36" height="14" rx="1" stroke="currentColor" strokeWidth="1.5" />
    <path d="M14 28L24 6L34 28" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
    <path d="M18 20H30" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
    <path d="M16 34L20 32L18 36" stroke="currentColor" strokeWidth="1" />
    <path d="M26 34L30 32L28 36" stroke="currentColor" strokeWidth="1" />
    <line x1="6" y1="42" x2="42" y2="42" stroke="currentColor" strokeWidth="0.6" opacity="0.4" />
  </svg>
);

export const IconDashboard: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    <path d="M4 42H44" stroke="currentColor" strokeWidth="1.5" />
    <path d="M8 42V30H40V42" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
    <path d="M14 30V20H34V30" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
    <path d="M20 20V12H28V20" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
    <line x1="24" y1="12" x2="24" y2="6" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="24" cy="5" r="1.5" fill="currentColor" opacity="0.6" />
    <rect x="11" y="34" width="3" height="6" fill="currentColor" opacity="0.3" />
    <rect x="17" y="32" width="3" height="8" fill="currentColor" opacity="0.4" />
    <rect x="23" y="33" width="3" height="7" fill="currentColor" opacity="0.3" />
    <rect x="29" y="31" width="3" height="9" fill="currentColor" opacity="0.5" />
    <rect x="35" y="34" width="3" height="6" fill="currentColor" opacity="0.3" />
  </svg>
);

export const IconShield: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    <path d="M24 4L6 14V26C6 36 14 44 24 46C34 44 42 36 42 26V14L24 4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
    <path d="M24 10L12 18V26C12 33 17 39 24 40C31 39 36 33 36 26V18L24 10Z" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
    <circle cx="24" cy="22" r="4" stroke="currentColor" strokeWidth="1.2" />
    <line x1="24" y1="26" x2="24" y2="36" stroke="currentColor" strokeWidth="1.2" />
    <line x1="20" y1="30" x2="28" y2="30" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);

export const IconGlobe: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="1.5" />
    <ellipse cx="24" cy="24" rx="10" ry="18" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
    <ellipse cx="24" cy="24" rx="18" ry="10" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
    <line x1="6" y1="16" x2="42" y2="16" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
    <line x1="6" y1="32" x2="42" y2="32" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
    <circle cx="24" cy="24" r="2" fill="currentColor" opacity="0.5" />
    <line x1="24" y1="6" x2="24" y2="3" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
    <line x1="42" y1="24" x2="45" y2="24" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
    <line x1="24" y1="42" x2="24" y2="45" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
    <line x1="6" y1="24" x2="3" y2="24" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
  </svg>
);

export const IconAutomation: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    <path d="M28 4L12 24H22L18 44L38 22H26L28 4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" fill="currentColor" fillOpacity="0.1" />
    <circle cx="10" cy="12" r="2" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
    <line x1="12" y1="12" x2="26" y2="6" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
    <circle cx="40" cy="36" r="2" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
    <line x1="22" y1="42" x2="38" y2="36" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
  </svg>
);

export const IconCompliance: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    <line x1="24" y1="4" x2="24" y2="40" stroke="currentColor" strokeWidth="1.5" />
    <path d="M8 16H40" stroke="currentColor" strokeWidth="1.5" />
    <path d="M4 28C4 28 6 20 8 16" stroke="currentColor" strokeWidth="1.2" />
    <path d="M16 28C16 28 14 20 12 16" stroke="currentColor" strokeWidth="1.2" />
    <path d="M4 28H16" stroke="currentColor" strokeWidth="1" />
    <path d="M32 24C32 24 34 20 36 16" stroke="currentColor" strokeWidth="1.2" />
    <path d="M44 24C44 24 42 20 40 16" stroke="currentColor" strokeWidth="1.2" />
    <path d="M32 24H44" stroke="currentColor" strokeWidth="1" />
    <path d="M18 40L24 40L30 40" stroke="currentColor" strokeWidth="1.5" />
    <path d="M20 44H28" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="24" cy="4" r="2" fill="currentColor" opacity="0.5" />
  </svg>
);

export const IconSaaS: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    <rect x="16" y="34" width="16" height="8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
    <rect x="13" y="26" width="22" height="8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
    <rect x="10" y="18" width="28" height="8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
    <rect x="7" y="10" width="34" height="8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
    <line x1="24" y1="10" x2="24" y2="4" stroke="currentColor" strokeWidth="1" />
    <circle cx="24" cy="3" r="1.5" stroke="currentColor" strokeWidth="0.8" />
    <line x1="7" y1="42" x2="41" y2="42" stroke="currentColor" strokeWidth="0.6" opacity="0.4" />
    <circle cx="7" cy="14" r="1" fill="currentColor" opacity="0.4" />
    <circle cx="41" cy="14" r="1" fill="currentColor" opacity="0.4" />
    <circle cx="10" cy="22" r="1" fill="currentColor" opacity="0.4" />
    <circle cx="38" cy="22" r="1" fill="currentColor" opacity="0.4" />
  </svg>
);

export const IconNotification: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    <path d="M24 6C24 6 10 14 10 28V34H38V28C38 14 24 6 24 6Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
    <line x1="8" y1="34" x2="40" y2="34" stroke="currentColor" strokeWidth="1.5" />
    <line x1="24" y1="34" x2="24" y2="40" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="24" cy="42" r="2" fill="currentColor" opacity="0.5" />
    <line x1="24" y1="6" x2="24" y2="2" stroke="currentColor" strokeWidth="1.2" />
    <path d="M6 28C6 28 4 26 4 24" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
    <path d="M42 28C42 28 44 26 44 24" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
    <path d="M18 20L20 18L19 22" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
    <path d="M28 20L30 18L29 22" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
  </svg>
);

// ═══ Ícones adicionais para Investidor ═══

export const IconSparkles: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    {/* Estrela de 8 pontas de Ishtar — divindade/brilho */}
    <path d="M24 4L27 18L42 16L30 24L42 32L27 30L24 44L21 30L6 32L18 24L6 16L21 18L24 4Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="bevel" fill="currentColor" fillOpacity="0.08" />
    <circle cx="24" cy="24" r="4" stroke="currentColor" strokeWidth="1" opacity="0.6" />
    <circle cx="24" cy="24" r="1.5" fill="currentColor" opacity="0.5" />
  </svg>
);

export const IconCpu: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    {/* Processador cuneiforme */}
    <rect x="12" y="12" width="24" height="24" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
    <rect x="17" y="17" width="14" height="14" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    {/* Pinos */}
    <line x1="18" y1="12" x2="18" y2="6" stroke="currentColor" strokeWidth="1" />
    <line x1="24" y1="12" x2="24" y2="6" stroke="currentColor" strokeWidth="1" />
    <line x1="30" y1="12" x2="30" y2="6" stroke="currentColor" strokeWidth="1" />
    <line x1="18" y1="36" x2="18" y2="42" stroke="currentColor" strokeWidth="1" />
    <line x1="24" y1="36" x2="24" y2="42" stroke="currentColor" strokeWidth="1" />
    <line x1="30" y1="36" x2="30" y2="42" stroke="currentColor" strokeWidth="1" />
    <line x1="12" y1="18" x2="6" y2="18" stroke="currentColor" strokeWidth="1" />
    <line x1="12" y1="24" x2="6" y2="24" stroke="currentColor" strokeWidth="1" />
    <line x1="12" y1="30" x2="6" y2="30" stroke="currentColor" strokeWidth="1" />
    <line x1="36" y1="18" x2="42" y2="18" stroke="currentColor" strokeWidth="1" />
    <line x1="36" y1="24" x2="42" y2="24" stroke="currentColor" strokeWidth="1" />
    <line x1="36" y1="30" x2="42" y2="30" stroke="currentColor" strokeWidth="1" />
    {/* Cuneiforme central */}
    <path d="M22 22L24 20L26 22" stroke="currentColor" strokeWidth="1" opacity="0.6" />
    <path d="M22 26L24 28L26 26" stroke="currentColor" strokeWidth="1" opacity="0.6" />
  </svg>
);

export const IconActivity: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    {/* Pulso vital de Enlil — monitoramento */}
    <path d="M4 24H12L16 10L22 38L28 14L32 30L36 24H44" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
    <circle cx="4" cy="24" r="1.5" fill="currentColor" opacity="0.4" />
    <circle cx="44" cy="24" r="1.5" fill="currentColor" opacity="0.4" />
    {/* Linhas de referência */}
    <line x1="4" y1="14" x2="44" y2="14" stroke="currentColor" strokeWidth="0.4" opacity="0.15" />
    <line x1="4" y1="34" x2="44" y2="34" stroke="currentColor" strokeWidth="0.4" opacity="0.15" />
  </svg>
);

export const IconEye: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    {/* Olho de Horus / visão computacional */}
    <path d="M4 24C4 24 12 10 24 10C36 10 44 24 44 24C44 24 36 38 24 38C12 38 4 24 4 24Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
    <circle cx="24" cy="24" r="8" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="24" cy="24" r="4" fill="currentColor" opacity="0.3" />
    <circle cx="24" cy="24" r="2" fill="currentColor" opacity="0.7" />
    {/* Decoração Horus */}
    <path d="M24 32L20 42L18 38" stroke="currentColor" strokeWidth="1" opacity="0.4" />
    <line x1="14" y1="24" x2="4" y2="24" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
    <line x1="34" y1="24" x2="44" y2="24" stroke="currentColor" strokeWidth="0.5" opacity="0.2" />
  </svg>
);

export const IconBot: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    {/* Cabeça de golem / voz IA */}
    <rect x="10" y="14" width="28" height="24" rx="2" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
    <line x1="24" y1="14" x2="24" y2="6" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="24" cy="5" r="2" stroke="currentColor" strokeWidth="1" />
    {/* Olhos */}
    <circle cx="18" cy="24" r="3" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="18" cy="24" r="1" fill="currentColor" opacity="0.6" />
    <circle cx="30" cy="24" r="3" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="30" cy="24" r="1" fill="currentColor" opacity="0.6" />
    {/* Boca cuneiforme */}
    <path d="M19 32H29" stroke="currentColor" strokeWidth="1" />
    <path d="M21 32V34" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
    <path d="M24 32V35" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
    <path d="M27 32V34" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
    {/* Antenas laterais */}
    <line x1="10" y1="20" x2="4" y2="16" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
    <line x1="38" y1="20" x2="44" y2="16" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
  </svg>
);

export const IconNetwork: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    {/* Rede de templos — orquestração */}
    <circle cx="24" cy="24" r="5" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="24" cy="24" r="2" fill="currentColor" opacity="0.4" />
    <circle cx="10" cy="10" r="3" stroke="currentColor" strokeWidth="1" />
    <circle cx="38" cy="10" r="3" stroke="currentColor" strokeWidth="1" />
    <circle cx="10" cy="38" r="3" stroke="currentColor" strokeWidth="1" />
    <circle cx="38" cy="38" r="3" stroke="currentColor" strokeWidth="1" />
    <circle cx="6" cy="24" r="2" stroke="currentColor" strokeWidth="0.8" />
    <circle cx="42" cy="24" r="2" stroke="currentColor" strokeWidth="0.8" />
    {/* Linhas de conexão */}
    <line x1="19" y1="21" x2="13" y2="13" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
    <line x1="29" y1="21" x2="35" y2="13" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
    <line x1="19" y1="27" x2="13" y2="35" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
    <line x1="29" y1="27" x2="35" y2="35" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
    <line x1="19" y1="24" x2="8" y2="24" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
    <line x1="29" y1="24" x2="40" y2="24" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
  </svg>
);

export const IconWorkflow: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    {/* Fluxo de irrigação suméria — workflow */}
    <rect x="4" y="8" width="12" height="10" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="bevel" />
    <rect x="18" y="19" width="12" height="10" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="bevel" />
    <rect x="32" y="30" width="12" height="10" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="bevel" />
    {/* Conexões angulares */}
    <path d="M16 13H18V24" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    <path d="M30 24H32V35" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    {/* Pontos de fluxo */}
    <circle cx="10" cy="13" r="1.5" fill="currentColor" opacity="0.4" />
    <circle cx="24" cy="24" r="1.5" fill="currentColor" opacity="0.4" />
    <circle cx="38" cy="35" r="1.5" fill="currentColor" opacity="0.4" />
  </svg>
);

export const IconFingerprint: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    {/* Selo cilíndrico — identidade única */}
    <path d="M24 6C16 6 10 12 10 20V28C10 36 16 42 24 42" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M24 12C19 12 16 16 16 22V26C16 32 19 36 24 36" stroke="currentColor" strokeWidth="1.2" opacity="0.6" strokeLinecap="round" />
    <path d="M24 18C22 18 20 20 20 24C20 28 22 30 24 30" stroke="currentColor" strokeWidth="1" opacity="0.4" strokeLinecap="round" />
    <path d="M24 6C32 6 38 12 38 20V24" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    <path d="M24 12C29 12 32 16 32 22V24" stroke="currentColor" strokeWidth="1.2" opacity="0.6" strokeLinecap="round" />
    <circle cx="24" cy="24" r="2" fill="currentColor" opacity="0.5" />
  </svg>
);

export const IconLanguages: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    {/* Tabletes multi-idioma */}
    <rect x="6" y="6" width="16" height="20" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="bevel" />
    <rect x="26" y="22" width="16" height="20" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="bevel" />
    {/* Cuneiforme no primeiro */}
    <path d="M10 12L13 10L12 14" stroke="currentColor" strokeWidth="1" />
    <path d="M16 12L19 10L18 14" stroke="currentColor" strokeWidth="1" />
    <path d="M10 20L13 18L12 22" stroke="currentColor" strokeWidth="1" opacity="0.6" />
    {/* Caracteres no segundo */}
    <path d="M30 28H38" stroke="currentColor" strokeWidth="1" />
    <path d="M30 32H36" stroke="currentColor" strokeWidth="1" opacity="0.6" />
    <path d="M30 36H34" stroke="currentColor" strokeWidth="1" opacity="0.4" />
    {/* Linha de conexão */}
    <path d="M22 20L26 28" stroke="currentColor" strokeWidth="0.8" opacity="0.3" strokeDasharray="2 2" />
  </svg>
);

export const IconDatabase: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    {/* Armazém de grãos — dados */}
    <ellipse cx="24" cy="12" rx="16" ry="6" stroke="currentColor" strokeWidth="1.5" />
    <path d="M8 12V36C8 39.3 15.2 42 24 42C32.8 42 40 39.3 40 36V12" stroke="currentColor" strokeWidth="1.5" />
    <ellipse cx="24" cy="22" rx="16" ry="6" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
    <ellipse cx="24" cy="32" rx="16" ry="6" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
    {/* Cuneiforme central */}
    <path d="M22 17L24 15L26 17" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
    <path d="M22 27L24 25L26 27" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
  </svg>
);

export const IconSmartphone: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    {/* Tablete portátil */}
    <rect x="14" y="4" width="20" height="40" rx="2" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
    <line x1="14" y1="10" x2="34" y2="10" stroke="currentColor" strokeWidth="1" opacity="0.4" />
    <line x1="14" y1="38" x2="34" y2="38" stroke="currentColor" strokeWidth="1" opacity="0.4" />
    {/* Conteúdo cuneiforme */}
    <path d="M18 16L21 14L20 18" stroke="currentColor" strokeWidth="1" />
    <path d="M26 16L29 14L28 18" stroke="currentColor" strokeWidth="1" />
    <path d="M18 24L21 22L20 26" stroke="currentColor" strokeWidth="1" opacity="0.6" />
    <path d="M26 24L29 22L28 26" stroke="currentColor" strokeWidth="1" opacity="0.6" />
    {/* Botão central */}
    <circle cx="24" cy="41" r="1.5" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
  </svg>
);

export const IconScale: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    {/* Régua de Ur — análise de processos */}
    <path d="M8 38H40" stroke="currentColor" strokeWidth="1.5" />
    <path d="M24 38V8" stroke="currentColor" strokeWidth="1.5" />
    {/* Pratos angulares */}
    <path d="M8 20L16 20L12 28H4L8 20Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="bevel" />
    <path d="M32 16L40 16L36 24H28L32 16Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="bevel" />
    {/* Braço */}
    <path d="M12 20L24 14L36 16" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    <circle cx="24" cy="8" r="2" fill="currentColor" opacity="0.4" />
  </svg>
);

export const IconLightbulb: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    {/* Tocha de Marduk — ideia/concepção */}
    <path d="M24 4C16 4 12 10 12 18C12 24 16 28 18 30V36H30V30C32 28 36 24 36 18C36 10 32 4 24 4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
    <line x1="18" y1="36" x2="30" y2="36" stroke="currentColor" strokeWidth="1.2" />
    <line x1="19" y1="40" x2="29" y2="40" stroke="currentColor" strokeWidth="1.2" />
    <line x1="21" y1="44" x2="27" y2="44" stroke="currentColor" strokeWidth="1" />
    {/* Raios internos */}
    <path d="M24 12V20" stroke="currentColor" strokeWidth="1" opacity="0.4" />
    <path d="M19 15L23 19" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
    <path d="M29 15L25 19" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
    <circle cx="24" cy="20" r="2" fill="currentColor" opacity="0.3" />
  </svg>
);

export const IconGitBranch: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    {/* Árvore da vida suméria — ramificação */}
    <line x1="24" y1="6" x2="24" y2="42" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="24" cy="6" r="3" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="24" cy="42" r="3" stroke="currentColor" strokeWidth="1.2" />
    {/* Ramos */}
    <path d="M24 16L36 12" stroke="currentColor" strokeWidth="1" />
    <circle cx="36" cy="12" r="2.5" stroke="currentColor" strokeWidth="1" />
    <path d="M24 26L12 22" stroke="currentColor" strokeWidth="1" />
    <circle cx="12" cy="22" r="2.5" stroke="currentColor" strokeWidth="1" />
    <path d="M24 34L38 32" stroke="currentColor" strokeWidth="1" opacity="0.6" />
    <circle cx="38" cy="32" r="2" stroke="currentColor" strokeWidth="0.8" opacity="0.6" />
  </svg>
);

export const IconRocket: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    {/* Foguete zigurat */}
    <path d="M24 4L18 20L14 22L14 34L18 36L24 44L30 36L34 34L34 22L30 20L24 4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
    <circle cx="24" cy="22" r="4" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="24" cy="22" r="1.5" fill="currentColor" opacity="0.5" />
    {/* Chamas */}
    <path d="M20 36L18 44L22 40" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
    <path d="M28 36L30 44L26 40" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
    {/* Linhas de velocidade */}
    <line x1="8" y1="16" x2="14" y2="22" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
    <line x1="40" y1="16" x2="34" y2="22" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
  </svg>
);

export const IconStar: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    {/* Estrela de Dingir — divino */}
    <path d="M24 4L28 18L42 18L31 26L35 40L24 32L13 40L17 26L6 18L20 18L24 4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" fill="currentColor" fillOpacity="0.06" />
    <circle cx="24" cy="22" r="3" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
  </svg>
);

export const IconClock: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    {/* Relógio solar sumério */}
    <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="24" cy="24" r="14" stroke="currentColor" strokeWidth="0.6" opacity="0.25" />
    {/* Marcas horarias cuneiformes */}
    <line x1="24" y1="6" x2="24" y2="10" stroke="currentColor" strokeWidth="1.2" />
    <line x1="24" y1="38" x2="24" y2="42" stroke="currentColor" strokeWidth="1.2" />
    <line x1="6" y1="24" x2="10" y2="24" stroke="currentColor" strokeWidth="1.2" />
    <line x1="38" y1="24" x2="42" y2="24" stroke="currentColor" strokeWidth="1.2" />
    {/* Ponteiros */}
    <line x1="24" y1="24" x2="24" y2="14" stroke="currentColor" strokeWidth="1.5" />
    <line x1="24" y1="24" x2="32" y2="20" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="24" cy="24" r="2" fill="currentColor" opacity="0.5" />
  </svg>
);

export const IconTrending: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    {/* Escadaria do zigurat — crescimento */}
    <path d="M6 40H14V30H22V22H30V14H38V6" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
    <path d="M6 40H42" stroke="currentColor" strokeWidth="1.5" />
    {/* Seta de ascensão */}
    <path d="M34 6H38V10" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
    {/* Preenchimento sutil */}
    <path d="M6 40H14V30H22V22H30V14H38V40Z" fill="currentColor" fillOpacity="0.06" />
    {/* Pontos nos degraus */}
    <circle cx="14" cy="30" r="1.5" fill="currentColor" opacity="0.4" />
    <circle cx="22" cy="22" r="1.5" fill="currentColor" opacity="0.4" />
    <circle cx="30" cy="14" r="1.5" fill="currentColor" opacity="0.4" />
  </svg>
);

export const IconAward: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    {/* Coroa real suméria */}
    <circle cx="24" cy="20" r="14" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="24" cy="20" r="9" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
    {/* Estrela central */}
    <path d="M24 13L26 18L31 18L27 21L28.5 26L24 23L19.5 26L21 21L17 18L22 18L24 13Z" stroke="currentColor" strokeWidth="0.8" fill="currentColor" fillOpacity="0.15" />
    {/* Fitas */}
    <path d="M16 32L14 44L20 38" stroke="currentColor" strokeWidth="1.2" />
    <path d="M32 32L34 44L28 38" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);

export const IconHeart: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    {/* Coração sagrado — interação */}
    <path d="M24 42L8 26C4 22 4 14 10 10C14 7 20 8 24 14C28 8 34 7 38 10C44 14 44 22 40 26L24 42Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
    {/* Linhas internas de circuito */}
    <path d="M24 30L16 22" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
    <path d="M24 30L32 22" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
    <circle cx="24" cy="22" r="3" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
  </svg>
);

export const IconCheckMark: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    {/* Selo de aprovação cuneiforme */}
    <circle cx="24" cy="24" r="16" stroke="currentColor" strokeWidth="1.5" />
    <path d="M14 24L22 32L36 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="bevel" />
  </svg>
);

export const IconCloud: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    {/* Nuvem celestial — cloud */}
    <path d="M12 34C7 34 4 30 4 26C4 22 7 18 12 18C12 12 17 8 24 8C30 8 34 11 36 16C41 16 44 20 44 24C44 29 41 34 36 34H12Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
    {/* Circuitos internos */}
    <line x1="16" y1="24" x2="32" y2="24" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
    <line x1="14" y1="28" x2="34" y2="28" stroke="currentColor" strokeWidth="0.6" opacity="0.2" />
    <circle cx="24" cy="20" r="2" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
  </svg>
);

export const IconLeaf: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    {/* Folha sagrada suméria — natureza/sustentabilidade */}
    <path d="M12 40C12 40 10 28 16 20C22 12 36 8 36 8C36 8 38 20 32 28C26 36 12 40 12 40Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
    <path d="M36 8C28 16 20 28 12 40" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
    <path d="M26 16L22 24L28 28" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
    <circle cx="24" cy="22" r="2" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
  </svg>
);

export const IconFileCheck: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    {/* Selo de certificação cuneiforme */}
    <rect x="10" y="6" width="28" height="36" rx="1" stroke="currentColor" strokeWidth="1.5" />
    <path d="M10 14H38" stroke="currentColor" strokeWidth="1" opacity="0.3" />
    <path d="M20 24L24 28L32 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="bevel" />
    <line x1="16" y1="34" x2="32" y2="34" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
    <line x1="16" y1="37" x2="28" y2="37" stroke="currentColor" strokeWidth="0.6" opacity="0.2" />
  </svg>
);

export const IconHandshake: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    {/* Aperto de mãos cerimonial sumério */}
    <path d="M4 28L14 18L22 22L30 16L38 20L44 14" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
    <path d="M14 18L20 28L28 24L34 30" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="bevel" opacity="0.5" />
    <circle cx="22" cy="22" r="2.5" stroke="currentColor" strokeWidth="1" opacity="0.6" />
    <circle cx="30" cy="16" r="2.5" stroke="currentColor" strokeWidth="1" opacity="0.6" />
    <path d="M10 36H38" stroke="currentColor" strokeWidth="0.6" opacity="0.2" />
  </svg>
);

export const IconDollarSign: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    {/* Moeda cuneiforme — valor/investimento */}
    <circle cx="24" cy="24" r="16" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="24" cy="24" r="11" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
    <line x1="24" y1="12" x2="24" y2="36" stroke="currentColor" strokeWidth="1.2" opacity="0.8" />
    <path d="M18 18C18 18 20 16 24 16C28 16 30 18 30 20C30 22 28 24 24 24C20 24 18 26 18 28C18 30 20 32 24 32C28 32 30 30 30 30" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);

export const IconMapPin: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    {/* Marcador de localização — ziggurat */}
    <path d="M24 44L10 26C6 20 6 14 12 10C16 7 20 6 24 6C28 6 32 7 36 10C42 14 42 20 38 26L24 44Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
    <circle cx="24" cy="20" r="6" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="24" cy="20" r="2.5" fill="currentColor" opacity="0.4" />
  </svg>
);

export const IconSettings: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    {/* Engrenagem suméria — configuração */}
    <circle cx="24" cy="24" r="8" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="24" cy="24" r="3" fill="currentColor" opacity="0.3" />
    <path d="M24 4V12M24 36V44M4 24H12M36 24H44M10 10L16 16M32 32L38 38M38 10L32 16M16 32L10 38" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <circle cx="24" cy="4" r="1.5" fill="currentColor" opacity="0.4" />
    <circle cx="24" cy="44" r="1.5" fill="currentColor" opacity="0.4" />
    <circle cx="4" cy="24" r="1.5" fill="currentColor" opacity="0.4" />
    <circle cx="44" cy="24" r="1.5" fill="currentColor" opacity="0.4" />
  </svg>
);

export const IconZap: React.FC<IconProps> = ({ className, style }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} style={style}>
    {/* Raio de energia — poder divino sumério */}
    <path d="M28 4L12 26H24L20 44L36 22H24L28 4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
    <path d="M28 4L12 26H24L20 44L36 22H24L28 4Z" fill="currentColor" fillOpacity="0.08" />
    <line x1="18" y1="14" x2="22" y2="20" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
  </svg>
);
