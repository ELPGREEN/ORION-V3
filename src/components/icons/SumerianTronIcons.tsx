import React from "react";

interface IconProps {
  className?: string;
}

// Estilo: linhas angulares cuneiformes + circuitos Tron + geometria sagrada suméria

export const IconNeuralAI: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Olho de Enki / IA Neural */}
    <path d="M24 8L6 24L24 40L42 24L24 8Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
    <path d="M24 14L12 24L24 34L36 24L24 14Z" stroke="currentColor" strokeWidth="1" opacity="0.6" />
    <circle cx="24" cy="24" r="5" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="24" cy="24" r="2" fill="currentColor" opacity="0.8" />
    {/* Raios neurais */}
    <line x1="24" y1="8" x2="24" y2="3" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    <line x1="42" y1="24" x2="46" y2="24" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    <line x1="24" y1="40" x2="24" y2="45" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    <line x1="6" y1="24" x2="2" y2="24" stroke="currentColor" strokeWidth="1" opacity="0.5" />
  </svg>
);

export const IconDocuments: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Tablete cuneiforme */}
    <rect x="10" y="6" width="28" height="36" rx="1" stroke="currentColor" strokeWidth="1.5" />
    <rect x="14" y="10" width="20" height="28" stroke="currentColor" strokeWidth="0.8" opacity="0.3" />
    {/* Marcas cuneiformes */}
    <path d="M16 16L20 14L18 18" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M24 16L28 14L26 18" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M16 24L20 22L18 26" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M24 24L28 22L26 26" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M16 32L20 30L18 34" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    <path d="M24 32L28 30L26 34" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    {/* Glow line tron */}
    <line x1="10" y1="42" x2="38" y2="42" stroke="currentColor" strokeWidth="1.5" opacity="0.6" />
  </svg>
);

export const IconCRM: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Ziggurat de conexões - pessoas */}
    <path d="M24 6L18 14H30L24 6Z" fill="currentColor" opacity="0.3" />
    <circle cx="24" cy="10" r="3" stroke="currentColor" strokeWidth="1.5" />
    {/* Nó esquerdo */}
    <circle cx="10" cy="30" r="3" stroke="currentColor" strokeWidth="1.2" />
    <path d="M10 27V20L24 13" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
    {/* Nó direito */}
    <circle cx="38" cy="30" r="3" stroke="currentColor" strokeWidth="1.2" />
    <path d="M38 27V20L24 13" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
    {/* Nó centro baixo */}
    <circle cx="24" cy="38" r="3" stroke="currentColor" strokeWidth="1.2" />
    <path d="M24 35V20" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
    {/* Linhas horizontais de circuito */}
    <line x1="13" y1="30" x2="35" y2="30" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
    <line x1="10" y1="33" x2="24" y2="38" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
    <line x1="38" y1="33" x2="24" y2="38" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
  </svg>
);

export const IconChat: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Boca de Shamash - comunicação */}
    <path d="M8 10H40V32H26L18 40V32H8V10Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
    {/* Ondas sonoras cuneiformes */}
    <path d="M16 18L20 16L18 20" stroke="currentColor" strokeWidth="1.2" />
    <path d="M24 18H32" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    <path d="M16 24L20 22L18 26" stroke="currentColor" strokeWidth="1.2" />
    <path d="M24 24H30" stroke="currentColor" strokeWidth="1" opacity="0.5" />
    {/* Circuito base */}
    <line x1="8" y1="10" x2="8" y2="6" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
    <line x1="40" y1="10" x2="40" y2="6" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
  </svg>
);

export const IconCalendar: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Calendário zodíaco sumério */}
    <rect x="8" y="10" width="32" height="32" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
    <line x1="8" y1="18" x2="40" y2="18" stroke="currentColor" strokeWidth="1.5" />
    {/* Pinos superiores */}
    <line x1="16" y1="6" x2="16" y2="14" stroke="currentColor" strokeWidth="1.5" />
    <line x1="32" y1="6" x2="32" y2="14" stroke="currentColor" strokeWidth="1.5" />
    {/* Estrela de 8 pontas - Ishtar */}
    <path d="M24 22L26 28L32 28L27 32L29 38L24 34L19 38L21 32L16 28L22 28Z" stroke="currentColor" strokeWidth="1" fill="currentColor" opacity="0.3" />
    {/* Grid sutil */}
    <line x1="19" y1="18" x2="19" y2="42" stroke="currentColor" strokeWidth="0.4" opacity="0.2" />
    <line x1="30" y1="18" x2="30" y2="42" stroke="currentColor" strokeWidth="0.4" opacity="0.2" />
    <line x1="8" y1="28" x2="40" y2="28" stroke="currentColor" strokeWidth="0.4" opacity="0.2" />
  </svg>
);

export const IconPayment: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Selo cilíndrico - moeda */}
    <circle cx="24" cy="24" r="16" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="24" cy="24" r="12" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
    {/* Símbolo shekel sumério estilizado */}
    <path d="M20 16V32M28 16V32" stroke="currentColor" strokeWidth="1.5" />
    <path d="M17 20H31M17 28H31" stroke="currentColor" strokeWidth="1.2" />
    {/* Raios de circuito */}
    <line x1="24" y1="8" x2="24" y2="4" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
    <line x1="40" y1="24" x2="44" y2="24" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
    <line x1="24" y1="40" x2="24" y2="44" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
    <line x1="8" y1="24" x2="4" y2="24" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
  </svg>
);

export const IconSearch: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Olho que tudo vê - pesquisa */}
    <path d="M4 24C4 24 12 10 24 10C36 10 44 24 44 24C44 24 36 38 24 38C12 38 4 24 4 24Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
    <circle cx="24" cy="24" r="7" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="24" cy="24" r="3" fill="currentColor" opacity="0.6" />
    {/* Linhas de scan */}
    <line x1="4" y1="24" x2="17" y2="24" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
    <line x1="31" y1="24" x2="44" y2="24" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
    {/* Cuneiforme decorativo */}
    <path d="M22 14L24 10L26 14" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
    <path d="M22 34L24 38L26 34" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
  </svg>
);

export const IconSignature: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Selo cilíndrico + estilo cuneiforme */}
    <rect x="6" y="28" width="36" height="14" rx="1" stroke="currentColor" strokeWidth="1.5" />
    {/* Caneta-stylus suméria */}
    <path d="M14 28L24 6L34 28" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
    <path d="M18 20H30" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
    {/* Marca cuneiforme no selo */}
    <path d="M16 34L20 32L18 36" stroke="currentColor" strokeWidth="1" />
    <path d="M26 34L30 32L28 36" stroke="currentColor" strokeWidth="1" />
    {/* Linha de circuito */}
    <line x1="6" y1="42" x2="42" y2="42" stroke="currentColor" strokeWidth="0.6" opacity="0.4" />
  </svg>
);

export const IconDashboard: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Ziggurat - dashboard em camadas */}
    <path d="M4 42H44" stroke="currentColor" strokeWidth="1.5" />
    <path d="M8 42V30H40V42" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
    <path d="M14 30V20H34V30" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
    <path d="M20 20V12H28V20" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
    {/* Antena/ponto topo */}
    <line x1="24" y1="12" x2="24" y2="6" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="24" cy="5" r="1.5" fill="currentColor" opacity="0.6" />
    {/* Barras métricas */}
    <rect x="11" y="34" width="3" height="6" fill="currentColor" opacity="0.3" />
    <rect x="17" y="32" width="3" height="8" fill="currentColor" opacity="0.4" />
    <rect x="23" y="33" width="3" height="7" fill="currentColor" opacity="0.3" />
    <rect x="29" y="31" width="3" height="9" fill="currentColor" opacity="0.5" />
    <rect x="35" y="34" width="3" height="6" fill="currentColor" opacity="0.3" />
  </svg>
);

export const IconShield: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Escudo de Gilgamesh */}
    <path d="M24 4L6 14V26C6 36 14 44 24 46C34 44 42 36 42 26V14L24 4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
    <path d="M24 10L12 18V26C12 33 17 39 24 40C31 39 36 33 36 26V18L24 10Z" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
    {/* Símbolo Ankh/poder central */}
    <circle cx="24" cy="22" r="4" stroke="currentColor" strokeWidth="1.2" />
    <line x1="24" y1="26" x2="24" y2="36" stroke="currentColor" strokeWidth="1.2" />
    <line x1="20" y1="30" x2="28" y2="30" stroke="currentColor" strokeWidth="1.2" />
  </svg>
);

export const IconGlobe: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Esfera astrolábio sumério */}
    <circle cx="24" cy="24" r="18" stroke="currentColor" strokeWidth="1.5" />
    {/* Meridianos angulares */}
    <ellipse cx="24" cy="24" rx="10" ry="18" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
    <ellipse cx="24" cy="24" rx="18" ry="10" stroke="currentColor" strokeWidth="0.8" opacity="0.4" transform="rotate(0 24 24)" />
    {/* Linhas de latitude cuneiformes */}
    <line x1="6" y1="16" x2="42" y2="16" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
    <line x1="6" y1="32" x2="42" y2="32" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
    {/* Ponto central - Nippur */}
    <circle cx="24" cy="24" r="2" fill="currentColor" opacity="0.5" />
    {/* Raios cardinais */}
    <line x1="24" y1="6" x2="24" y2="3" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
    <line x1="42" y1="24" x2="45" y2="24" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
    <line x1="24" y1="42" x2="24" y2="45" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
    <line x1="6" y1="24" x2="3" y2="24" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
  </svg>
);

export const IconAutomation: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Raio de Adad - automação/energia */}
    <path d="M28 4L12 24H22L18 44L38 22H26L28 4Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" fill="currentColor" fillOpacity="0.1" />
    {/* Circuito de fluxo */}
    <circle cx="10" cy="12" r="2" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
    <line x1="12" y1="12" x2="26" y2="6" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
    <circle cx="40" cy="36" r="2" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
    <line x1="22" y1="42" x2="38" y2="36" stroke="currentColor" strokeWidth="0.6" opacity="0.3" />
  </svg>
);

export const IconCompliance: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Balança de Shamash - justiça/compliance */}
    <line x1="24" y1="4" x2="24" y2="40" stroke="currentColor" strokeWidth="1.5" />
    <path d="M8 16H40" stroke="currentColor" strokeWidth="1.5" />
    {/* Pratos da balança */}
    <path d="M4 28C4 28 6 20 8 16" stroke="currentColor" strokeWidth="1.2" />
    <path d="M16 28C16 28 14 20 12 16" stroke="currentColor" strokeWidth="1.2" />
    <path d="M4 28H16" stroke="currentColor" strokeWidth="1" />
    <path d="M32 24C32 24 34 20 36 16" stroke="currentColor" strokeWidth="1.2" />
    <path d="M44 24C44 24 42 20 40 16" stroke="currentColor" strokeWidth="1.2" />
    <path d="M32 24H44" stroke="currentColor" strokeWidth="1" />
    {/* Base piramidal */}
    <path d="M18 40L24 40L30 40" stroke="currentColor" strokeWidth="1.5" />
    <path d="M20 44H28" stroke="currentColor" strokeWidth="1.5" />
    {/* Ponto topo */}
    <circle cx="24" cy="4" r="2" fill="currentColor" opacity="0.5" />
  </svg>
);

export const IconSaaS: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Torre de Babel / camadas SaaS */}
    <rect x="16" y="34" width="16" height="8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
    <rect x="13" y="26" width="22" height="8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
    <rect x="10" y="18" width="28" height="8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
    <rect x="7" y="10" width="34" height="8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
    {/* Antena topo */}
    <line x1="24" y1="10" x2="24" y2="4" stroke="currentColor" strokeWidth="1" />
    <circle cx="24" cy="3" r="1.5" stroke="currentColor" strokeWidth="0.8" />
    {/* Glow horizontal */}
    <line x1="7" y1="42" x2="41" y2="42" stroke="currentColor" strokeWidth="0.6" opacity="0.4" />
    {/* Pontos de conexão */}
    <circle cx="7" cy="14" r="1" fill="currentColor" opacity="0.4" />
    <circle cx="41" cy="14" r="1" fill="currentColor" opacity="0.4" />
    <circle cx="10" cy="22" r="1" fill="currentColor" opacity="0.4" />
    <circle cx="38" cy="22" r="1" fill="currentColor" opacity="0.4" />
  </svg>
);

export const IconNotification: React.FC<IconProps> = ({ className }) => (
  <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Sino do templo sumério */}
    <path d="M24 6C24 6 10 14 10 28V34H38V28C38 14 24 6 24 6Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="bevel" />
    <line x1="8" y1="34" x2="40" y2="34" stroke="currentColor" strokeWidth="1.5" />
    {/* Badalo */}
    <line x1="24" y1="34" x2="24" y2="40" stroke="currentColor" strokeWidth="1.2" />
    <circle cx="24" cy="42" r="2" fill="currentColor" opacity="0.5" />
    {/* Topo */}
    <line x1="24" y1="6" x2="24" y2="2" stroke="currentColor" strokeWidth="1.2" />
    {/* Ondas sonoras */}
    <path d="M6 28C6 28 4 26 4 24" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
    <path d="M42 28C42 28 44 26 44 24" stroke="currentColor" strokeWidth="0.8" opacity="0.4" />
    {/* Marcas cuneiformes decorativas */}
    <path d="M18 20L20 18L19 22" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
    <path d="M28 20L30 18L29 22" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
  </svg>
);
