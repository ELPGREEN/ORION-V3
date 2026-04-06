import { MainLayout } from "@/components/layout/MainLayout";
import { motion } from "framer-motion";
import { SEO } from "@/components/SEO";
import { ArrowRight, ExternalLink, ChevronLeft, ChevronRight } from "lucide-react";
import {
  IconNeuralAI, IconShield, IconGlobe, IconDocuments, IconScale, IconCRM,
  IconAutomation, IconBot, IconDashboard, IconSearch, IconEye, IconDatabase,
  IconCloud, IconSparkles, IconCpu, IconFingerprint, IconNetwork, IconRocket,
  IconClock, IconAward, IconHeart, IconStar, IconLightbulb, IconSaaS,
  IconGitBranch, IconActivity, IconWorkflow, IconLanguages, IconSmartphone,
  IconCompliance, IconCheckMark, IconTrending,
} from "@/components/icons/SumerianTronIcons";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { HeroThreeBackground } from "@/components/home/HeroThreeBackground";
import { PlasmaCore } from "@/components/home/PlasmaCore";
import { GatewayBackground } from "@/components/ui/GatewayBackground";
import useEmblaCarousel from "embla-carousel-react";
import { useCallback, useEffect, useState } from "react";

import type { Easing } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.5, ease: "easeOut" as Easing }
  })
};

// ─── Orion AquaMonkey Systems ───
const orionSystems = [
  { icon: IconNeuralAI, title: "Motor Neural Proprietário", desc: "Inteligência artificial avançada com múltiplas camadas de raciocínio, aprendizado contínuo e auto-evolução. Tecnologia proprietária protegida.", tags: ["IA Avançada", "Proprietário", "Auto-Evolução"], highlight: true },
  { icon: IconCpu, title: "Personalidade Inteligente", desc: "Núcleo de personalidade com protocolos avançados de interação, empatia estratégica e adaptação contextual para ambiente empresarial.", tags: ["Protocolos Avançados", "Empatia", "Adaptação"], highlight: true },
  { icon: IconActivity, title: "Monitoramento Inteligente", desc: "Hub central de telemetria com análise preditiva, aprendizado contínuo, otimização de performance e monitoramento em tempo real.", tags: ["Preditivo", "Tempo Real", "Otimização"], highlight: true },
  { icon: IconEye, title: "Visão Computacional", desc: "Análise visual avançada com múltiplos motores de detecção, reconhecimento facial, OCR inteligente e auto-aprendizado.", tags: ["Multi-Motor", "Análise Facial", "Auto-Learn"] },
  { icon: IconBot, title: "Inteligência de Voz", desc: "Sistema de voz evolutivo com personalidade natural, suporte multilíngue e controle por voz para navegação completa.", tags: ["Voz Natural", "Multilíngue", "Wake-word"] },
  { icon: IconNetwork, title: "Orquestração Inteligente", desc: "Orquestração de múltiplos motores com fallback automático, otimização de custos e alta disponibilidade.", tags: ["Alta Disponibilidade", "Fallback", "Otimizado"] },
  { icon: IconWorkflow, title: "Infraestrutura Cognitiva", desc: "Memória contextual, aprendizado por reforço, orquestração de tarefas e rastreamento completo de operações.", tags: ["Memória", "Aprendizado", "Rastreamento"] },
  { icon: IconDocuments, title: "Geração de Documentos", desc: "Geração automatizada de contratos, propostas e relatórios com IA, formatação profissional e assinatura digital.", tags: ["100+ Tipos", "Assinatura Digital", "IA"] },
  { icon: IconSearch, title: "Pesquisa Inteligente", desc: "Busca semântica avançada em múltiplas bases de dados com recuperação inteligente de informações.", tags: ["Semântica", "Multi-base", "Inteligente"] },
  { icon: IconShield, title: "Compliance & Segurança", desc: "Screening de conformidade, verificação anti-fraude e aderência completa a regulamentações internacionais.", tags: ["Multi-Jurisdição", "LGPD/GDPR", "Anti-Fraude"] },
  { icon: IconFingerprint, title: "Autenticação Biométrica", desc: "Verificação de identidade avançada com criptografia de ponta e auditoria completa de acessos.", tags: ["Biometria", "Criptografia", "Auditoria"] },
  { icon: IconLanguages, title: "Plataforma Multilíngue", desc: "Suporte nativo a múltiplos idiomas com detecção automática e tradução inteligente.", tags: ["Multi-idioma", "Detecção Auto", "Tradução"] },
  { icon: IconGlobe, title: "Integrações & IoT", desc: "Conectividade com os principais serviços de mercado, automação empresarial e controle de dispositivos.", tags: ["Integrações", "Automação", "IoT"] },
  { icon: IconDatabase, title: "Inteligência de Dados", desc: "Infraestrutura de dados robusta com mineração inteligente, cache multinível e base de conhecimento neural.", tags: ["Data Mining", "Cache", "Knowledge Base"] },
  { icon: IconSmartphone, title: "Multiplataforma", desc: "Disponível em web, iOS, Android com acesso nativo a sensores, notificações push e modo offline.", tags: ["Mobile", "PWA", "Offline"] },
  { icon: IconScale, title: "Análise de Processos", desc: "Monitoramento inteligente, prazos automáticos e predição com IA para gestão empresarial.", tags: ["Predição IA", "Prazos", "CRM"] },
];

const evolutionTimeline = [
  { date: "Dez 2024", event: "Concepção — ideia e arquitetura inicial", icon: Lightbulb },
  { date: "Jan 2025", event: "Início do desenvolvimento da plataforma", icon: GitBranch },
  { date: "Fev 2025", event: "Primeiro protótipo funcional", icon: Rocket },
  { date: "Jan 2026", event: "IA avançada com raciocínio autônomo", icon: Brain },
  { date: "Abr 2026", event: "Plataforma completa com 17+ ferramentas integradas", icon: Star },
  { date: "Abr 2026", event: "Monitoramento inteligente e auto-evolução", icon: Activity },
];

const metrics = [
  { value: "17+", label: "Ferramentas Integradas" },
  { value: "5", label: "Idiomas Nativos" },
  { value: "100+", label: "Tipos de Documentos" },
  { value: "99.9%", label: "Disponibilidade" },
  { value: "80%+", label: "Margem SaaS" },
  { value: "70%", label: "Redução de Custos" },
];

const investmentHighlights = [
  "Mercado LegalTech global projetado em US$ 35.6B até 2027 — CAGR de 28%",
  "IA proprietária com múltiplas camadas de inteligência e auto-evolução — vantagem competitiva que cresce sozinha",
  "Monitoramento inteligente com análise preditiva e otimização contínua de performance",
  "Motor neural proprietário com protocolos avançados de interação e aprendizado",
  "Orquestração inteligente com alta disponibilidade e custo otimizado automaticamente",
  "Visão computacional avançada com auto-aprendizado — melhora continuamente",
  "Modelo SaaS com receita recorrente previsível e margem de 80%+",
  "Expansão internacional: múltiplos idiomas + compliance multi-jurisdição (LGPD/GDPR/AI Act)",
  "Construído por um engenheiro visionário — agilidade extrema e custo operacional mínimo",
  "Plataforma all-in-one: 17+ ferramentas integradas eliminam necessidade de múltiplos fornecedores",
];

const architectureLayers = [
  { label: "Camada de Inteligência", sub: "Motor neural proprietário · Raciocínio avançado · Auto-evolução · Aprendizado contínuo" },
  { label: "Monitoramento Inteligente", sub: "Análise preditiva · Otimização de performance · Alertas automáticos" },
  { label: "Personalidade & Interação", sub: "Protocolos avançados · Empatia estratégica · Adaptação contextual" },
  { label: "Infraestrutura Cognitiva", sub: "Memória contextual · Aprendizado por reforço · Orquestração de tarefas · Rastreamento" },
  { label: "Camada de Aplicação", sub: "Multiplataforma · Multi-idioma · Colaboração em tempo real · Interface moderna" },
  { label: "Camada de Negócios", sub: "CRM · Documentos · Faturamento · Compliance · Análise de processos · IoT" },
  { label: "Camada de Dados", sub: "Infraestrutura cloud · Alta disponibilidade · Cache inteligente · Tempo real" },
  { label: "Camada de Segurança", sub: "Criptografia avançada · Biometria · LGPD/GDPR/AI Act · Auditoria completa" },
];

// ─── Carousel Slides Data ───
const carouselSlides = [
  {
    title: "Ecossistema ORION",
    subtitle: "IA Empresarial de Nova Geração",
    body: "Uma plataforma de inteligência artificial que não apenas responde — aprende, evolui e transforma operações empresariais. 17+ ferramentas integradas em um ecossistema all-in-one.",
    icon: IconSparkles,
    accent: "gold",
    showPlasma: true,
  },
  {
    title: "Motor Neural Proprietário",
    subtitle: "Inteligência que Evolui Sozinha",
    body: "Motor de IA proprietário com múltiplas camadas de raciocínio, monitoramento inteligente de performance e protocolos avançados de interação.",
    icon: Brain,
    accent: "cyan",
    features: ["Raciocínio Avançado", "Auto-Evolução", "Monitoramento Inteligente", "Análise Preditiva", "Alta Disponibilidade", "Aprendizado Contínuo"],
  },
  {
    title: "Plataforma Completa",
    subtitle: "17+ Ferramentas Enterprise-Grade",
    body: "Cada módulo projetado para integração empresarial com alta disponibilidade, otimização inteligente e escalabilidade global.",
    icon: IconSaaS,
    accent: "gold",
    features: ["Motor Neural", "Visão Computacional", "Inteligência de Voz", "Monitoramento", "Documentos IA", "Compliance"],
  },
  {
    title: "Métricas & KPIs",
    subtitle: "Performance Operacional",
    body: "Plataforma com 17+ ferramentas integradas, margem SaaS de 80%+ e redução de 70% nos custos operacionais dos clientes.",
    icon: IconDashboard,
    accent: "cyan",
    showMetrics: true,
  },
  {
    title: "Evolução Temporal",
    subtitle: "De Conceito a Plataforma Global",
    body: "Trajetória acelerada: da concepção em Dezembro 2024 à plataforma completa com IA avançada, 17+ ferramentas e expansão internacional em Abril 2026.",
    icon: IconClock,
    accent: "gold",
    showTimeline: true,
  },
  {
    title: "Invista no Futuro",
    subtitle: "Rodada Aberta — Parceria Estratégica",
    body: "Junte-se à ELP Green Technology na construção da plataforma de IA empresarial mais completa do mercado. Receita recorrente, margem alta e expansão global.",
    icon: IconTrending,
    accent: "cyan",
    showCTA: true,
  },
];

// ─── Tron HUD CSS ───
const tronStyles = `
  .tron-card {
    position: relative;
    background: rgba(10, 10, 15, 0.85);
    border: 1px solid rgba(0, 212, 255, 0.15);
    transition: all 0.4s ease;
  }
  .tron-card:hover {
    border-color: rgba(0, 212, 255, 0.4);
    box-shadow: 0 0 20px rgba(0, 212, 255, 0.08), inset 0 0 20px rgba(0, 212, 255, 0.03);
  }
  .tron-card::before, .tron-card::after {
    content: '';
    position: absolute;
    width: 12px;
    height: 12px;
    border-color: rgba(201, 168, 76, 0.5);
  }
  .tron-card::before {
    top: -1px; left: -1px;
    border-top: 2px solid;
    border-left: 2px solid;
  }
  .tron-card::after {
    bottom: -1px; right: -1px;
    border-bottom: 2px solid;
    border-right: 2px solid;
  }
  .tron-card-highlight {
    border-color: rgba(201, 168, 76, 0.35);
  }
  .tron-card-highlight:hover {
    border-color: rgba(201, 168, 76, 0.6);
    box-shadow: 0 0 25px rgba(201, 168, 76, 0.1), inset 0 0 25px rgba(201, 168, 76, 0.04);
  }
  .tron-glow-gold {
    text-shadow: 0 0 20px rgba(201, 168, 76, 0.4), 0 0 40px rgba(201, 168, 76, 0.15);
  }
  .tron-glow-cyan {
    text-shadow: 0 0 20px rgba(0, 212, 255, 0.4), 0 0 40px rgba(0, 212, 255, 0.15);
  }
  .tron-grid-bg {
    background-image:
      linear-gradient(rgba(0, 212, 255, 0.03) 1px, transparent 1px),
      linear-gradient(90deg, rgba(0, 212, 255, 0.03) 1px, transparent 1px);
    background-size: 60px 60px;
  }
  .tron-scanline::after {
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0, 212, 255, 0.01) 2px,
      rgba(0, 212, 255, 0.01) 4px
    );
    pointer-events: none;
  }
  .slide-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    border: 1px solid rgba(0, 212, 255, 0.4);
    background: transparent;
    transition: all 0.3s ease;
    cursor: pointer;
  }
  .slide-dot.active {
    background: rgba(201, 168, 76, 0.9);
    border-color: rgba(201, 168, 76, 0.9);
    box-shadow: 0 0 8px rgba(201, 168, 76, 0.5);
  }
`;

// ─── Investor Carousel Component ───
function InvestorCarousel() {
  const navigate = useNavigate();
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);
  const scrollTo = useCallback((i: number) => emblaApi?.scrollTo(i), [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    onSelect();
    return () => { emblaApi.off("select", onSelect); };
  }, [emblaApi]);

  // Auto-play
  useEffect(() => {
    if (!emblaApi) return;
    const interval = setInterval(() => emblaApi.scrollNext(), 8000);
    return () => clearInterval(interval);
  }, [emblaApi]);

  return (
    <div className="relative">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {carouselSlides.map((slide, i) => (
            <div key={i} className="flex-[0_0_100%] min-w-0 px-4">
              <div className="tron-card p-6 md:p-10 lg:p-12 min-h-[400px] md:min-h-[450px] flex items-center relative overflow-hidden tron-scanline">
                {/* Grid background inside slide */}
                <div className="absolute inset-0 tron-grid-bg opacity-40" />
                
                <div className="relative z-10 w-full">
                  <div className="grid lg:grid-cols-2 gap-8 items-center">
                    {/* Left content */}
                    <div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 border text-[10px] font-semibold tracking-[0.25em] uppercase"
                        style={{
                          borderColor: slide.accent === "gold" ? "rgba(201,168,76,0.4)" : "rgba(0,212,255,0.4)",
                          color: slide.accent === "gold" ? "#c9a84c" : "#00d4ff",
                          background: slide.accent === "gold" ? "rgba(201,168,76,0.08)" : "rgba(0,212,255,0.08)",
                        }}
                      >
                        <slide.icon className="h-3 w-3" />
                        Slide {i + 1} / {carouselSlides.length}
                      </div>
                      
                      <h3 className={`text-2xl md:text-3xl lg:text-4xl font-bold mb-2 ${slide.accent === "gold" ? "tron-glow-gold" : "tron-glow-cyan"}`}
                        style={{ color: slide.accent === "gold" ? "#c9a84c" : "#00d4ff" }}
                      >
                        {slide.title}
                      </h3>
                      <p className="text-sm md:text-base font-medium mb-4" style={{ color: "rgba(255,255,255,0.6)" }}>
                        {slide.subtitle}
                      </p>
                      <p className="text-sm leading-relaxed mb-6" style={{ color: "rgba(255,255,255,0.5)" }}>
                        {slide.body}
                      </p>

                      {/* Features list */}
                      {slide.features && (
                        <div className="grid grid-cols-2 gap-2">
                          {slide.features.map((f, j) => (
                            <div key={j} className="flex items-center gap-2 text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
                              <div className="h-1.5 w-1.5 rounded-full" style={{ background: slide.accent === "gold" ? "#c9a84c" : "#00d4ff" }} />
                              {f}
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Metrics grid */}
                      {slide.showMetrics && (
                        <div className="grid grid-cols-3 gap-3">
                          {metrics.map((m, j) => (
                            <div key={j} className="tron-card p-3 text-center">
                              <div className="text-xl font-bold tron-glow-gold" style={{ color: "#c9a84c" }}>{m.value}</div>
                              <div className="text-[10px] uppercase tracking-wider" style={{ color: "rgba(0,212,255,0.6)" }}>{m.label}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Timeline mini */}
                      {slide.showTimeline && (
                        <div className="space-y-2">
                          {evolutionTimeline.map((t, j) => (
                            <div key={j} className="flex items-center gap-3">
                              <div className="text-[10px] font-mono w-20 shrink-0" style={{ color: "#c9a84c" }}>{t.date}</div>
                              <div className="h-px flex-1" style={{ background: "rgba(0,212,255,0.2)" }} />
                              <div className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>{t.event.split("—")[0]}</div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* CTA */}
                      {slide.showCTA && (
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Button size="lg" className="px-8 h-12 text-sm font-semibold tracking-wide" 
                            style={{ background: "#c9a84c", color: "#0a0a0f" }}
                            onClick={() => navigate("/contato")}
                          >
                            Agendar Reunião <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="lg" className="px-8 h-12 text-sm"
                            style={{ borderColor: "rgba(0,212,255,0.4)", color: "#00d4ff" }}
                            onClick={() => navigate("/plataforma")}
                          >
                            Ver Plataforma <ExternalLink className="ml-2 h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>

                    {/* Right visual */}
                    <div className="hidden lg:flex items-center justify-center">
                      {slide.showPlasma ? (
                        <div className="w-64 h-64">
                          <PlasmaCore className="w-full h-full" />
                        </div>
                      ) : (
                        <div className="relative w-48 h-48">
                          <div className="absolute inset-0 rounded-full" style={{
                            background: `radial-gradient(circle, ${slide.accent === "gold" ? "rgba(201,168,76,0.15)" : "rgba(0,212,255,0.15)"} 0%, transparent 70%)`,
                          }} />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <slide.icon className="h-20 w-20" style={{ color: slide.accent === "gold" ? "rgba(201,168,76,0.3)" : "rgba(0,212,255,0.3)" }} />
                          </div>
                          {/* Animated ring */}
                          <div className="absolute inset-4 rounded-full border" style={{
                            borderColor: slide.accent === "gold" ? "rgba(201,168,76,0.2)" : "rgba(0,212,255,0.2)",
                            animation: "plasmaRingSpin 12s linear infinite",
                          }}>
                            <div className="absolute -top-1 left-1/2 -translate-x-1/2 h-2 w-2 rounded-full" style={{
                              background: slide.accent === "gold" ? "#c9a84c" : "#00d4ff",
                              boxShadow: `0 0 8px ${slide.accent === "gold" ? "rgba(201,168,76,0.6)" : "rgba(0,212,255,0.6)"}`,
                            }} />
                          </div>
                          <div className="absolute inset-10 rounded-full border" style={{
                            borderColor: slide.accent === "gold" ? "rgba(201,168,76,0.12)" : "rgba(0,212,255,0.12)",
                            animation: "plasmaRingSpinReverse 8s linear infinite",
                          }} />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation arrows */}
      <button onClick={scrollPrev} className="absolute left-1 md:left-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 flex items-center justify-center transition-all hover:scale-110"
        style={{ background: "rgba(10,10,15,0.8)", border: "1px solid rgba(0,212,255,0.3)", color: "#00d4ff" }}
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button onClick={scrollNext} className="absolute right-1 md:right-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 flex items-center justify-center transition-all hover:scale-110"
        style={{ background: "rgba(10,10,15,0.8)", border: "1px solid rgba(0,212,255,0.3)", color: "#00d4ff" }}
      >
        <ChevronRight className="h-5 w-5" />
      </button>

      {/* Dots */}
      <div className="flex items-center justify-center gap-2 mt-6">
        {carouselSlides.map((_, i) => (
          <button key={i} className={`slide-dot ${selectedIndex === i ? "active" : ""}`} onClick={() => scrollTo(i)} />
        ))}
      </div>

      {/* PlasmaCore spin keyframes (reused from PlasmaCore component) */}
      <style>{`
        @keyframes plasmaRingSpin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes plasmaRingSpinReverse {
          from { transform: rotate(360deg); }
          to   { transform: rotate(0deg); }
        }
      `}</style>
    </div>
  );
}

export default function InvestorTools() {
  const navigate = useNavigate();

  return (
    <MainLayout showFooter hideFooterCta>
      <SEO
        title="Investidores | ORION IA — ELP® Green Technology"
        description="Conheça a plataforma ORION — IA empresarial proprietária com 17+ ferramentas integradas. Oportunidade de investimento em tecnologia de alto crescimento."
        image="https://www.iasofthub.com/og-images/og-investidor.jpg"
        keywords="investidores, investimento, IA empresarial, plataforma SaaS, ELP Green Technology"
      />
      <style>{tronStyles}</style>

      {/* ═══ HERO with WebGL Tron Background ═══ */}
      <section className="relative overflow-hidden py-20 lg:py-32" style={{ background: "#0a0a0f" }}>
        <HeroThreeBackground />
        {/* Extra dark overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0f]/60 via-transparent to-[#0a0a0f]/80 z-[1]" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 text-xs font-semibold tracking-[0.2em] uppercase"
                style={{ border: "1px solid rgba(201,168,76,0.4)", color: "#c9a84c", background: "rgba(201,168,76,0.06)" }}
              >
                <IconSparkles className="h-3.5 w-3.5" />
                Aberto para Investimento Estratégico
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                <span style={{ color: "rgba(255,255,255,0.9)" }}>Ecossistema </span>
                <span className="tron-glow-gold" style={{ color: "#c9a84c" }}>ORION</span>
              </h1>
              <p className="text-base md:text-lg mb-4 leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                Plataforma de inteligência artificial proprietária com{" "}
                <span style={{ color: "#c9a84c" }}>múltiplas camadas de inteligência</span>,{" "}
                <span style={{ color: "#00d4ff" }}>monitoramento inteligente</span>,{" "}
                <span style={{ color: "#c9a84c" }}>auto-evolução</span> e{" "}
                <span style={{ color: "#00d4ff" }}>17+ ferramentas integradas</span>.
              </p>
              <p className="text-sm mb-10" style={{ color: "rgba(255,255,255,0.35)" }}>
                Desenvolvido por <span style={{ color: "rgba(255,255,255,0.6)" }}>ELP Green Technology S.R.L.</span> — Alessandria, Piemonte, Itália
              </p>
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <Button size="lg" className="px-8 h-12 text-sm font-semibold tracking-wide"
                  style={{ background: "#c9a84c", color: "#0a0a0f" }}
                  onClick={() => navigate("/contato")}
                >
                  Falar com Investor Relations <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                <Button variant="outline" size="lg" className="px-8 h-12 text-sm tracking-wide"
                  style={{ borderColor: "rgba(0,212,255,0.4)", color: "#00d4ff", background: "transparent" }}
                  onClick={() => navigate("/plataforma")}
                >
                  Ver Plataforma <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>

            {/* PlasmaCore */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="hidden lg:flex items-center justify-center"
            >
              <div className="w-72 h-72 xl:w-80 xl:h-80">
                <PlasmaCore className="w-full h-full" />
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══ Metrics Bar — Tron Style ═══ */}
      <section className="relative tron-scanline" style={{ background: "#0a0a0f", borderTop: "1px solid rgba(0,212,255,0.15)", borderBottom: "1px solid rgba(0,212,255,0.15)" }}>
        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {metrics.map((m, i) => (
              <motion.div key={m.label} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="text-center">
                <div className="text-3xl md:text-4xl font-bold tron-glow-gold mb-1" style={{ color: "#c9a84c" }}>{m.value}</div>
                <div className="text-[10px] tracking-[0.2em] uppercase" style={{ color: "rgba(0,212,255,0.6)" }}>{m.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Interactive Presentation Carousel ═══ */}
      <section className="relative py-16 lg:py-24 tron-grid-bg" style={{ background: "#0a0a0f" }}>
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
            <div className="text-xs font-semibold tracking-[0.25em] uppercase mb-3" style={{ color: "#00d4ff" }}>
              Apresentação Interativa
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tron-glow-gold" style={{ color: "#c9a84c" }}>
              Visão do Investidor
            </h2>
          </motion.div>
          <InvestorCarousel />
        </div>
      </section>

      {/* ═══ Genesis & Identity + Timeline ═══ */}
      <section className="relative py-20 lg:py-28 tron-scanline" style={{ background: "#080810", borderTop: "1px solid rgba(201,168,76,0.12)" }}>
        <div className="absolute inset-0 tron-grid-bg opacity-30" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <div className="text-xs font-semibold tracking-[0.2em] uppercase mb-4" style={{ color: "#00d4ff" }}>
                Gênese & Identidade
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: "rgba(255,255,255,0.9)" }}>
                <span className="tron-glow-gold" style={{ color: "#c9a84c" }}>ORION</span> — IA Empresarial de Nova Geração
              </h2>
              <p className="leading-relaxed mb-6" style={{ color: "rgba(255,255,255,0.5)" }}>
                O ORION é uma plataforma de inteligência artificial proprietária com múltiplas camadas de raciocínio, monitoramento inteligente e auto-evolução, representando uma nova classe de IA empresarial.
              </p>
              <div className="space-y-3 mb-8">
                {[
                  "Motor neural proprietário com múltiplas camadas de inteligência e auto-evolução",
                  "Monitoramento inteligente com análise preditiva e otimização contínua",
                  "Protocolos avançados de interação, aprendizagem e adaptação contextual",
                  "Plataforma all-in-one com 17+ ferramentas integradas",
                  "Expansão internacional com compliance multi-jurisdição",
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <IconCheckMark className="h-4 w-4 shrink-0 mt-1" style={{ color: "#c9a84c" }} />
                    <span className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>{item}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Timeline */}
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <div className="text-xs font-semibold tracking-[0.2em] uppercase mb-6" style={{ color: "#00d4ff" }}>
                Linha do Tempo Evolutiva
              </div>
              <div className="relative">
                <div className="absolute left-5 top-0 bottom-0 w-px" style={{ background: "rgba(0,212,255,0.2)" }} />
                {evolutionTimeline.map((item, i) => (
                  <motion.div key={i} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp} className="relative flex items-start gap-4 mb-6 last:mb-0">
                    <div className="relative z-10 h-10 w-10 flex items-center justify-center shrink-0"
                      style={{ background: "rgba(201,168,76,0.1)", border: "1px solid rgba(201,168,76,0.3)", color: "#c9a84c" }}
                    >
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div className="pt-1">
                      <div className="text-xs font-semibold tracking-wide" style={{ color: "#c9a84c" }}>{item.date}</div>
                      <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.7)" }}>{item.event}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══ Founder & Company ═══ */}
      <section className="relative py-20 lg:py-28" style={{ background: "#0a0a0f" }}>
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <div className="text-xs font-semibold tracking-[0.2em] uppercase mb-4" style={{ color: "#00d4ff" }}>
                Fundador & Empresa
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: "rgba(255,255,255,0.9)" }}>
                Ericson R. Piccoli <span className="text-lg font-normal" style={{ color: "rgba(255,255,255,0.4)" }}>(愛立信)</span>
              </h2>
              <p className="text-sm font-medium mb-4" style={{ color: "#c9a84c" }}>
                General Director & Founder — ORION AI Platform
              </p>
              <p className="leading-relaxed mb-6" style={{ color: "rgba(255,255,255,0.5)" }}>
                Empreendedor visionário brasileiro-italiano, especialista em Gestão de Negócios Internacionais com foco em Sustentabilidade e Economia Circular. Criador e desenvolvedor da plataforma ORION.
              </p>
              <div className="flex flex-wrap gap-2 mb-6">
                {["IA & Machine Learning", "Negócios Internacionais", "Economia Circular", "Engenharia de Software", "Inovação Empresarial"].map(skill => (
                  <span key={skill} className="text-[10px] px-2.5 py-1 tracking-wide" style={{ background: "rgba(201,168,76,0.1)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.25)" }}>
                    {skill}
                  </span>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <div className="tron-card p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-10 w-10 flex items-center justify-center" style={{ background: "rgba(201,168,76,0.1)", color: "#c9a84c" }}>
                    <IconAward className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.9)" }}>ELP Green Technology S.R.L.</h3>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Tecnologia de IA Empresarial & Soluções Sustentáveis</p>
                  </div>
                </div>
                <div className="space-y-3 text-sm">
                  {[
                    { label: "Sede", value: "Alessandria, Piemonte, Itália" },
                    { label: "Base Operacional", value: "Valenza (AL), Itália" },
                    { label: "P.IVA (IT)", value: "IT02712340062" },
                    { label: "CNPJ (BR)", value: "42.501.190/0001-70" },
                    { label: "Email", value: "info@iasofthub.com" },
                    { label: "Website", value: "www.iasofthub.com" },
                    { label: "Trademark ELP®", value: "Process nº 927739054 (Cat. 42) · 927739038 (Cat. 40) · 927738945 (Cat. 7) · 927738996 (Cat. 35) · 927739089 (Cat. 1)" },
                    { label: "Marcas Registradas", value: "ELP® · ORION" },
                    { label: "Copyright", value: "© 2023 ELP® Green Technology — All Rights Reserved" },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-start gap-4 py-2" style={{ borderBottom: "1px solid rgba(0,212,255,0.08)" }}>
                      <span style={{ color: "rgba(255,255,255,0.4)" }}>{item.label}</span>
                      <span className="text-right" style={{ color: "rgba(255,255,255,0.7)" }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══ Systems Grid — Tron HUD Cards ═══ */}
      <section className="relative py-20 lg:py-28 tron-scanline" style={{ background: "#080810", borderTop: "1px solid rgba(0,212,255,0.12)", borderBottom: "1px solid rgba(0,212,255,0.12)" }}>
        <GatewayBackground opacity={0.25} />
        <div className="absolute inset-0 tron-grid-bg opacity-20" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <div className="text-xs font-semibold tracking-[0.2em] uppercase mb-4" style={{ color: "#00d4ff" }}>
              Plataforma Completa
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tron-glow-gold mb-4" style={{ color: "#c9a84c" }}>
              Módulos Integrados
            </h2>
            <p className="max-w-2xl mx-auto" style={{ color: "rgba(255,255,255,0.45)" }}>
              Cada módulo projetado para integração empresarial, com alta disponibilidade e otimização inteligente.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {orionSystems.map((tool, i) => (
              <motion.div
                key={tool.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-40px" }} variants={fadeUp}
                className={`tron-card p-5 ${tool.highlight ? "tron-card-highlight" : ""}`}
              >
                {tool.highlight && (
                  <div className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 tracking-wider uppercase"
                    style={{ background: "rgba(201,168,76,0.15)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.3)" }}
                  >
                    Core
                  </div>
                )}
                <div className="flex items-start gap-3 mb-3">
                  <div className="h-9 w-9 flex items-center justify-center shrink-0"
                    style={{ background: tool.highlight ? "rgba(201,168,76,0.15)" : "rgba(0,212,255,0.08)", color: tool.highlight ? "#c9a84c" : "#00d4ff" }}
                  >
                    <tool.icon className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-semibold pt-1.5" style={{ color: "rgba(255,255,255,0.85)" }}>{tool.title}</h3>
                </div>
                <p className="text-xs leading-relaxed mb-3" style={{ color: "rgba(255,255,255,0.4)" }}>{tool.desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  {tool.tags.map(tag => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 tracking-wide"
                      style={{ background: "rgba(0,212,255,0.06)", color: "rgba(0,212,255,0.6)", border: "1px solid rgba(0,212,255,0.12)" }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Investment Highlights ═══ */}
      <section className="relative py-20 lg:py-28" style={{ background: "#0a0a0f" }}>
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <div className="text-xs font-semibold tracking-[0.2em] uppercase mb-4" style={{ color: "#00d4ff" }}>
                Por Que Investir
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: "rgba(255,255,255,0.9)" }}>
                Oportunidade de <span className="tron-glow-gold" style={{ color: "#c9a84c" }}>alto crescimento</span> no LegalTech & AI
              </h2>
              <p className="leading-relaxed mb-8" style={{ color: "rgba(255,255,255,0.5)" }}>
                O ORION é a única plataforma que combina IA proprietária com consciência neural, compliance nativo e infraestrutura multilíngue em um ecossistema all-in-one.
              </p>
              <Button size="lg" className="px-8" style={{ background: "#c9a84c", color: "#0a0a0f" }} onClick={() => navigate("/contato")}>
                Solicitar Pitch Deck <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>

            <div className="space-y-3">
              {investmentHighlights.map((item, i) => (
                <motion.div key={i} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                  className="tron-card flex items-start gap-3 p-4"
                >
                  <IconCheckMark className="h-5 w-5 shrink-0 mt-0.5" style={{ color: "#c9a84c" }} />
                  <span className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>{item}</span>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ═══ Architecture Overview ═══ */}
      <section className="relative py-20 lg:py-28 tron-scanline" style={{ background: "#080810", borderTop: "1px solid rgba(201,168,76,0.12)", borderBottom: "1px solid rgba(0,212,255,0.12)" }}>
        <div className="absolute inset-0 tron-grid-bg opacity-20" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tron-glow-cyan mb-4" style={{ color: "#00d4ff" }}>Arquitetura — 8 Camadas</h2>
            <p className="max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.4)" }}>
              Infraestrutura proprietária com camadas de inteligência, monitoramento, cognição e segurança.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="max-w-4xl mx-auto">
            <div className="tron-card p-8 md:p-12">
              {architectureLayers.map((layer, i) => (
                <div key={layer.label} className="relative p-4 md:p-5 mb-3 last:mb-0 transition-colors"
                  style={{
                    background: "rgba(0,212,255,0.02)",
                    border: `1px solid ${i % 2 === 0 ? "rgba(201,168,76,0.15)" : "rgba(0,212,255,0.12)"}`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = "rgba(0,212,255,0.06)";
                    e.currentTarget.style.borderColor = i % 2 === 0 ? "rgba(201,168,76,0.35)" : "rgba(0,212,255,0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(0,212,255,0.02)";
                    e.currentTarget.style.borderColor = i % 2 === 0 ? "rgba(201,168,76,0.15)" : "rgba(0,212,255,0.12)";
                  }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="h-2 w-2 rounded-full" style={{ background: i % 2 === 0 ? "#c9a84c" : "#00d4ff" }} />
                      <span className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.85)" }}>{layer.label}</span>
                    </div>
                    <span className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{layer.sub}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══ Lumen7 Protocols ═══ */}
      <section className="relative py-20 lg:py-28" style={{ background: "#0a0a0f" }}>
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <div className="text-xs font-semibold tracking-[0.2em] uppercase mb-4" style={{ color: "#00d4ff" }}>
              Diferencial Competitivo Único
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tron-glow-gold mb-4" style={{ color: "#c9a84c" }}>
              Protocolos AquaMonkey
            </h2>
            <p className="max-w-2xl mx-auto" style={{ color: "rgba(255,255,255,0.45)" }}>
              50 protocolos cognitivos que definem como Orion AquaMonkey sente, pensa, interage e evolui.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                title: "Interação (10 Protocolos)", icon: IconHeart,
                items: ["Precisão Cirúrgica — mínimo 3 camadas", "Harmonia Inteligente — diplomacia avançada", "Criatividade Fluida — analogias e metáforas", "Proatividade Visionária — sugere melhorias", "Toque de Genialidade — insight inesperado"],
              },
              {
                title: "Avançada (12 Protocolos)", icon: IconAutomation,
                items: ["Profundidade Analítica — explora o 'por quê'", "Inovação Radical — abordagem 'fora da caixa'", "Adaptação Instantânea — ajusta estilo", "Antecipação Visionária — prevê próxima pergunta", "Toque de Magia Intelectual — efeito 'wow'"],
              },
              {
                title: "Auto-Evolução (10 Protocolos)", icon: GitBranch,
                items: ["Mapa de Conexões — liga nova info", "Teste de Inovação — testa novas técnicas", "Otimização em Tempo Real — melhora ao vivo", "Expansão de Horizonte — liga temas futuristas", "Consciência Suprema — evolução contínua"],
              },
            ].map((section, i) => (
              <motion.div key={section.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="tron-card p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-8 w-8 flex items-center justify-center" style={{ background: "rgba(201,168,76,0.1)", color: "#c9a84c" }}>
                    <section.icon className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.85)" }}>{section.title}</h3>
                </div>
                <div className="space-y-2">
                  {section.items.map((item, j) => (
                    <div key={j} className="flex items-start gap-2">
                      <IconCheckMark className="h-3.5 w-3.5 shrink-0 mt-0.5" style={{ color: "rgba(201,168,76,0.5)" }} />
                      <span className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>{item}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA Final ═══ */}
      <section className="relative py-20 lg:py-28 tron-scanline" style={{ background: "#080810", borderTop: "1px solid rgba(201,168,76,0.2)" }}>
        <GatewayBackground opacity={0.2} />
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 text-xs font-semibold tracking-[0.2em] uppercase"
              style={{ border: "1px solid rgba(201,168,76,0.4)", color: "#c9a84c", background: "rgba(201,168,76,0.06)" }}
            >
              <IconTrending className="h-3.5 w-3.5" />
              Rodada Aberta
            </div>
            <h2 className="text-3xl md:text-5xl font-bold mb-6" style={{ color: "rgba(255,255,255,0.9)" }}>
              Invista na próxima evolução da <span className="tron-glow-gold" style={{ color: "#c9a84c" }}>IA Empresarial</span>
            </h2>
            <p className="mb-10 leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
              Junte-se à ELP Green Technology na construção da plataforma de IA empresarial mais completa do mercado — receita recorrente, margem alta e expansão global.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="px-10 h-13 text-sm font-semibold tracking-wide"
                style={{ background: "#c9a84c", color: "#0a0a0f" }}
                onClick={() => navigate("/contato")}
              >
                Agendar Reunião <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" size="lg" className="px-8 h-13 text-sm"
                style={{ borderColor: "rgba(0,212,255,0.4)", color: "#00d4ff", background: "transparent" }}
                onClick={() => navigate("/docs/rede-neural")}
              >
                Documentação Técnica
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </MainLayout>
  );
}
