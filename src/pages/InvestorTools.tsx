import { MainLayout } from "@/components/layout/MainLayout";
import { motion, useInView } from "framer-motion";
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
import { useCallback, useEffect, useState, useRef } from "react";

import type { Easing } from "framer-motion";

// ─── Animated Counter Hook ───
function useCountUp(end: number, duration = 2000) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref as React.RefObject<Element>, { once: true });

  useEffect(() => {
    if (!isInView) return;
    let start = 0;
    const startTime = performance.now();
    const step = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [isInView, end, duration]);

  return { count, ref };
}

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.06, duration: 0.5, ease: "easeOut" as Easing }
  })
};

const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } }
};

const fadeChild = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } }
};

// ─── Data ───
const heroMetrics = [
  { value: 35.6, suffix: "B", prefix: "$", label: "Mercado LegalTech 2027" },
  { value: 28, suffix: "%", prefix: "", label: "CAGR Projetado" },
  { value: 80, suffix: "%+", prefix: "", label: "Margem SaaS" },
  { value: 17, suffix: "+", prefix: "", label: "Módulos Integrados" },
];

const tamSamSom = [
  { label: "TAM", value: "$35.6B", desc: "Mercado global de LegalTech & AI Enterprise", color: "#c9a84c", size: 280 },
  { label: "SAM", value: "$4.2B", desc: "PMEs jurídicas + empresariais em LATAM & EU", color: "#3B82F6", size: 200 },
  { label: "SOM", value: "$120M", desc: "Mercado endereçável nos primeiros 3 anos", color: "#00d4ff", size: 130 },
];

const revenueStreams = [
  { name: "SaaS Recorrente", percent: 60, desc: "Assinaturas mensais/anuais de plataforma", icon: IconSaaS },
  { name: "Enterprise Contracts", percent: 20, desc: "Contratos customizados para grandes empresas", icon: IconShield },
  { name: "Marketplace & Add-ons", percent: 10, desc: "Módulos premium e integrações avançadas", icon: IconCloud },
  { name: "Afiliados & Parcerias", percent: 10, desc: "Rede de revendedores e parcerias estratégicas", icon: IconNetwork },
];

const competitiveAdvantages = [
  { title: "IA Proprietária com Auto-Evolução", desc: "Motor neural que aprende e melhora autonomamente — não depende de APIs de terceiros para raciocínio core.", icon: IconNeuralAI, stat: "Único" },
  { title: "Ecossistema All-in-One", desc: "17+ ferramentas integradas eliminam 5-8 fornecedores diferentes. Um contrato, uma plataforma.", icon: IconSparkles, stat: "17+" },
  { title: "Compliance Multi-Jurisdição", desc: "LGPD, GDPR e AI Act nativos — pronto para operar globalmente desde o dia 1.", icon: IconCompliance, stat: "3 Regs" },
  { title: "Visão Computacional Avançada", desc: "200+ padrões de detecção visual, OCR, análise facial e documento scanning integrados.", icon: IconEye, stat: "200+" },
  { title: "Custo Operacional Mínimo", desc: "Arquitetura otimizada com free-tier APIs inteligentes, reduzindo custos 70% vs. concorrentes.", icon: IconActivity, stat: "-70%" },
  { title: "Velocidade de Execução", desc: "De conceito a plataforma completa em 16 meses. Uma equipe lean com output de startup de 50 pessoas.", icon: IconRocket, stat: "16 mo" },
];

const orionSystems = [
  { icon: IconNeuralAI, title: "Motor Neural Proprietário", desc: "IA avançada com múltiplas camadas de raciocínio, aprendizado contínuo e auto-evolução.", tags: ["IA Avançada", "Proprietário", "Auto-Evolução"], highlight: true },
  { icon: IconCpu, title: "Personalidade Inteligente", desc: "Protocolos avançados de interação, empatia estratégica e adaptação contextual.", tags: ["Protocolos", "Empatia", "Adaptação"], highlight: true },
  { icon: IconActivity, title: "Monitoramento Inteligente", desc: "Telemetria com análise preditiva, otimização de performance em tempo real.", tags: ["Preditivo", "Tempo Real", "Otimização"], highlight: true },
  { icon: IconEye, title: "Visão Computacional", desc: "Análise visual avançada com múltiplos motores de detecção e auto-aprendizado.", tags: ["Multi-Motor", "Análise Facial", "Auto-Learn"] },
  { icon: IconBot, title: "Inteligência de Voz", desc: "Voz natural, multilíngue e controle por voz para navegação completa.", tags: ["Voz Natural", "Multilíngue", "Wake-word"] },
  { icon: IconNetwork, title: "Orquestração Inteligente", desc: "Múltiplos motores com fallback automático e alta disponibilidade.", tags: ["Alta Disponibilidade", "Fallback", "Otimizado"] },
  { icon: IconWorkflow, title: "Infraestrutura Cognitiva", desc: "Memória contextual, aprendizado por reforço e rastreamento de operações.", tags: ["Memória", "Aprendizado", "Rastreamento"] },
  { icon: IconDocuments, title: "Geração de Documentos", desc: "100+ tipos de documentos automáticos com formatação profissional.", tags: ["100+ Tipos", "Assinatura Digital", "IA"] },
  { icon: IconSearch, title: "Pesquisa Inteligente", desc: "Busca semântica em múltiplas bases com recuperação inteligente.", tags: ["Semântica", "Multi-base", "Inteligente"] },
  { icon: IconShield, title: "Compliance & Segurança", desc: "Screening de conformidade, anti-fraude e regulamentações internacionais.", tags: ["LGPD/GDPR", "AI Act", "Anti-Fraude"] },
  { icon: IconFingerprint, title: "Autenticação Biométrica", desc: "Verificação de identidade com criptografia e auditoria completa.", tags: ["Biometria", "Criptografia", "Auditoria"] },
  { icon: IconLanguages, title: "Plataforma Multilíngue", desc: "5 idiomas nativos com detecção automática e tradução inteligente.", tags: ["5 Idiomas", "Detecção Auto", "Tradução"] },
  { icon: IconGlobe, title: "Integrações & IoT", desc: "Conectividade com serviços de mercado e controle de dispositivos.", tags: ["Integrações", "Automação", "IoT"] },
  { icon: IconDatabase, title: "Inteligência de Dados", desc: "Data mining, cache multinível e base de conhecimento neural.", tags: ["Data Mining", "Cache", "Knowledge Base"] },
  { icon: IconSmartphone, title: "Multiplataforma", desc: "Web, iOS, Android com sensores nativos e modo offline.", tags: ["Mobile", "PWA", "Offline"] },
  { icon: IconScale, title: "Análise de Processos", desc: "Monitoramento inteligente com predição IA para gestão empresarial.", tags: ["Predição IA", "Prazos", "CRM"] },
];

const evolutionTimeline = [
  { date: "Dez 2024", event: "Concepção — ideia e arquitetura inicial", icon: IconLightbulb },
  { date: "Jan 2025", event: "Início do desenvolvimento da plataforma", icon: IconGitBranch },
  { date: "Fev 2025", event: "Primeiro protótipo funcional", icon: IconRocket },
  { date: "Jan 2026", event: "IA avançada com raciocínio autônomo", icon: IconNeuralAI },
  { date: "Abr 2026", event: "Plataforma completa — 17+ módulos integrados", icon: IconStar },
  { date: "2026-27", event: "Expansão internacional & Series A", icon: IconTrending },
];

const architectureLayers = [
  { label: "Camada de Inteligência", sub: "Motor neural proprietário · Raciocínio avançado · Auto-evolução", icon: IconNeuralAI },
  { label: "Monitoramento Inteligente", sub: "Análise preditiva · Otimização de performance · Alertas automáticos", icon: IconActivity },
  { label: "Personalidade & Interação", sub: "50 protocolos cognitivos · Empatia · Adaptação contextual", icon: IconHeart },
  { label: "Infraestrutura Cognitiva", sub: "Memória contextual · Aprendizado por reforço · Orquestração", icon: IconWorkflow },
  { label: "Camada de Aplicação", sub: "Multiplataforma · Multi-idioma · Colaboração em tempo real", icon: IconGlobe },
  { label: "Camada de Negócios", sub: "CRM · Documentos · Faturamento · Compliance · IoT", icon: IconCRM },
  { label: "Camada de Dados", sub: "Cloud · Alta disponibilidade · Cache inteligente · Tempo real", icon: IconDatabase },
  { label: "Camada de Segurança", sub: "Criptografia · Biometria · LGPD/GDPR/AI Act · Auditoria", icon: IconShield },
];

const investorFAQ = [
  { q: "Qual o modelo de receita?", a: "SaaS com assinaturas mensais/anuais, contratos enterprise, marketplace de módulos premium e rede de afiliados. Margem bruta de 80%+." },
  { q: "Qual o diferencial vs. ChatGPT/Claude?", a: "ORION é uma plataforma completa (não apenas chat). 17+ ferramentas integradas, compliance nativo, visão computacional, IoT, documentos — tudo proprietário." },
  { q: "Como está a tração?", a: "Plataforma 100% funcional com 17+ módulos, IA proprietária operacional, compliance multi-jurisdição e infraestrutura para escala global." },
  { q: "Qual o roadmap de expansão?", a: "Brasil e Itália como mercados iniciais, expansão para LATAM e EU em 2026-27, com 5 idiomas nativos e compliance multi-jurisdição." },
];

// ─── Tron HUD CSS ───
const tronStyles = `
  .tron-card {
    position: relative;
    background: rgba(10, 10, 15, 0.85);
    border: 1px solid hsl(var(--primary), 0.15);
    transition: all 0.4s ease;
  }
  .tron-card:hover {
    border-color: hsl(var(--primary), 0.4);
    box-shadow: 0 0 20px hsl(var(--primary), 0.08), inset 0 0 20px hsl(var(--primary), 0.03);
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
    text-shadow: 0 0 20px hsl(var(--primary), 0.4), 0 0 40px hsl(var(--primary), 0.15);
  }
  .tron-grid-bg {
    background-image:
      linear-gradient(hsl(var(--primary), 0.03) 1px, transparent 1px),
      linear-gradient(90deg, hsl(var(--primary), 0.03) 1px, transparent 1px);
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
      hsl(var(--primary), 0.01) 2px,
      hsl(var(--primary), 0.01) 4px
    );
    pointer-events: none;
  }
  .revenue-bar {
    height: 8px;
    border-radius: 4px;
    background: rgba(255,255,255,0.05);
    overflow: hidden;
    position: relative;
  }
  .revenue-bar-fill {
    height: 100%;
    border-radius: 4px;
    transition: width 1.5s cubic-bezier(0.4, 0, 0.2, 1);
  }
  .tam-circle {
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    position: absolute;
    transition: all 0.4s ease;
  }
  .tam-circle:hover {
    transform: scale(1.05);
  }
  @keyframes pulseGold {
    0%, 100% { box-shadow: 0 0 0 0 rgba(201, 168, 76, 0.3); }
    50% { box-shadow: 0 0 0 15px rgba(201, 168, 76, 0); }
  }
  .pulse-gold {
    animation: pulseGold 2s ease-in-out infinite;
  }
  @keyframes floatUp {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-8px); }
  }
  .float-up {
    animation: floatUp 4s ease-in-out infinite;
  }
`;

// ─── Revenue Bar Component ───
function RevenueBar({ percent, color, delay }: { percent: number; color: string; delay: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref as React.RefObject<Element>, { once: true });
  return (
    <div className="revenue-bar" ref={ref}>
      <div className="revenue-bar-fill" style={{ width: isInView ? `${percent}%` : '0%', background: color, transitionDelay: `${delay}ms` }} />
    </div>
  );
}

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

  useEffect(() => {
    if (!emblaApi) return;
    const interval = setInterval(() => emblaApi.scrollNext(), 8000);
    return () => clearInterval(interval);
  }, [emblaApi]);

  const slides = [
    {
      title: "O Problema",
      subtitle: "Mercado Fragmentado & Ineficiente",
      body: "Empresas jurídicas e corporativas gastam em média 8-12 ferramentas diferentes, sem integração, sem IA real, sem compliance automatizado. Custo alto, produtividade baixa.",
      accent: "cyan",
      icon: IconSearch,
      bullets: ["8-12 ferramentas por empresa", "Zero integração entre sistemas", "Compliance manual e custoso", "Sem IA real — apenas chatbots"],
    },
    {
      title: "A Solução",
      subtitle: "ORION — Uma Plataforma, Toda a Inteligência",
      body: "Ecossistema all-in-one com IA proprietária que substitui 8+ ferramentas. Redução de 70% nos custos, aumento de 300% na produtividade, compliance automático.",
      accent: "gold",
      icon: IconSparkles,
      bullets: ["1 plataforma = 17+ ferramentas", "IA que evolui sozinha", "Compliance nativo (LGPD/GDPR/AI Act)", "ROI positivo em 30 dias"],
    },
    {
      title: "Tração & Produto",
      subtitle: "Plataforma 100% Funcional",
      body: "16 meses de desenvolvimento intensivo. Plataforma completa com 17+ módulos operacionais, IA proprietária funcional, visão computacional ativa e infraestrutura de escala global.",
      accent: "cyan",
      icon: IconRocket,
      bullets: ["17+ módulos operacionais", "Visão computacional com 200+ padrões", "5 idiomas nativos", "Infraestrutura cloud escalável"],
    },
    {
      title: "O Pedido",
      subtitle: "Rodada Seed — Parceria Estratégica",
      body: "Buscamos investidores estratégicos para acelerar go-to-market, expandir equipe comercial e escalar internacionalmente. Produto pronto, mercado validado.",
      accent: "gold",
      icon: IconTrending,
      showCTA: true,
      bullets: ["Produto completo e funcional", "Mercado de $35.6B em crescimento", "Margem bruta 80%+", "Equipe lean com execução comprovada"],
    },
  ];

  return (
    <div className="relative">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex">
          {slides.map((slide, i) => (
            <div key={i} className="flex-[0_0_100%] min-w-0 px-4">
              <div className="tron-card p-6 md:p-10 lg:p-12 min-h-[380px] flex items-center relative overflow-hidden tron-scanline">
                <div className="absolute inset-0 tron-grid-bg opacity-40" />
                <div className="relative z-10 w-full">
                  <div className="grid lg:grid-cols-2 gap-8 items-center">
                    <div>
                      <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 text-[10px] font-semibold tracking-[0.25em] uppercase"
                        style={{
                          borderColor: slide.accent === "gold" ? "rgba(201,168,76,0.4)" : "hsl(var(--primary),0.4)",
                          color: slide.accent === "gold" ? "#c9a84c" : "#3B82F6",
                          background: slide.accent === "gold" ? "rgba(201,168,76,0.08)" : "hsl(var(--primary),0.08)",
                          border: "1px solid",
                        }}
                      >
                        <slide.icon className="h-3 w-3" />
                        {i + 1} / {slides.length}
                      </div>
                      <h3 className={`text-2xl md:text-3xl lg:text-4xl font-bold mb-2 ${slide.accent === "gold" ? "tron-glow-gold" : "tron-glow-cyan"}`}
                        style={{ color: slide.accent === "gold" ? "#c9a84c" : "#3B82F6" }}
                      >{slide.title}</h3>
                      <p className="text-sm md:text-base font-medium mb-4" style={{ color: "rgba(255,255,255,0.6)" }}>{slide.subtitle}</p>
                      <p className="text-sm leading-relaxed mb-6" style={{ color: "rgba(255,255,255,0.45)" }}>{slide.body}</p>
                      {slide.showCTA && (
                        <div className="flex flex-col sm:flex-row gap-3">
                          <Button size="lg" className="px-8 h-12 text-sm font-semibold tracking-wide"
                            style={{ background: "#c9a84c", color: "hsl(var(--background))" }}
                            onClick={() => navigate("/contato")}
                          >
                            Agendar Reunião <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="hidden lg:block">
                      <div className="space-y-3">
                        {slide.bullets?.map((b, j) => (
                          <div key={j} className="flex items-center gap-3 tron-card p-3">
                            <IconCheckMark className="h-4 w-4 shrink-0" style={{ color: slide.accent === "gold" ? "#c9a84c" : "#3B82F6" }} />
                            <span className="text-sm" style={{ color: "rgba(255,255,255,0.7)" }}>{b}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <button onClick={scrollPrev} className="absolute left-1 md:left-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 flex items-center justify-center transition-all hover:scale-110"
        style={{ background: "rgba(10,10,15,0.8)", border: "1px solid hsl(var(--primary),0.3)", color: "#3B82F6" }}
      ><ChevronLeft className="h-5 w-5" /></button>
      <button onClick={scrollNext} className="absolute right-1 md:right-2 top-1/2 -translate-y-1/2 z-10 h-10 w-10 flex items-center justify-center transition-all hover:scale-110"
        style={{ background: "rgba(10,10,15,0.8)", border: "1px solid hsl(var(--primary),0.3)", color: "#3B82F6" }}
      ><ChevronRight className="h-5 w-5" /></button>
      <div className="flex items-center justify-center gap-2 mt-6">
        {slides.map((_, i) => (
          <button key={i} className={`w-2 h-2 rounded-full transition-all ${selectedIndex === i ? "w-8 bg-[#c9a84c]" : "bg-white/20"}`} onClick={() => scrollTo(i)} />
        ))}
      </div>
    </div>
  );
}

// ─── Main Page ───
export default function InvestorTools() {
  const navigate = useNavigate();
  const m1 = useCountUp(356, 2000);
  const m2 = useCountUp(28, 1500);
  const m3 = useCountUp(80, 1500);
  const m4 = useCountUp(17, 1200);

  return (
    <MainLayout showFooter hideFooterCta>
      <SEO
        title="Investidores | ORION IA — ELP® Green Technology"
        description="Invista na plataforma ORION — IA empresarial proprietária com 17+ ferramentas integradas, margem 80%+ e mercado de $35.6B. Rodada aberta."
        image="https://www.iasofthub.com/og-images/og-investidor.jpg"
        keywords="investidores, investimento, IA empresarial, plataforma SaaS, ELP Green Technology, seed round"
      />
      <style>{tronStyles}</style>

      {/* ═══ HERO — Maximum Impact ═══ */}
      <section className="relative overflow-hidden py-24 lg:py-36" style={{ background: "hsl(var(--background))" }}>
        <HeroThreeBackground />
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(var(--background))]/70 via-transparent to-[hsl(var(--background))]/90 z-[1]" />

        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
              <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 text-xs font-semibold tracking-[0.2em] uppercase pulse-gold"
                style={{ border: "1px solid rgba(201,168,76,0.5)", color: "#c9a84c", background: "rgba(201,168,76,0.08)" }}
              >
                <IconTrending className="h-3.5 w-3.5" />
                Rodada Seed Aberta
              </div>
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4">
                <span style={{ color: "rgba(255,255,255,0.9)" }}>A IA que </span>
                <span className="tron-glow-gold" style={{ color: "#c9a84c" }}>Evolui Sozinha</span>
              </h1>
              <p className="text-lg md:text-xl mb-3 font-medium" style={{ color: "rgba(255,255,255,0.7)" }}>
                Plataforma de IA empresarial proprietária com{" "}
                <span style={{ color: "#c9a84c" }}>17+ módulos integrados</span>,{" "}
                <span style={{ color: "#3B82F6" }}>auto-evolução</span> e{" "}
                <span style={{ color: "#c9a84c" }}>margem SaaS de 80%+</span>.
              </p>
              <p className="text-sm mb-8" style={{ color: "rgba(255,255,255,0.35)" }}>
                ELP Green Technology S.R.L. — Alessandria, Piemonte, Itália 🇮🇹🇧🇷
              </p>
              <div className="flex flex-col sm:flex-row items-start gap-4">
                <Button size="lg" className="px-10 h-14 text-sm font-bold tracking-wide"
                  style={{ background: "linear-gradient(135deg, #c9a84c, #e0c068)", color: "hsl(var(--background))" }}
                  onClick={() => navigate("/contato")}
                >
                  Solicitar Pitch Deck <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button variant="outline" size="lg" className="px-8 h-14 text-sm tracking-wide"
                  style={{ borderColor: "hsl(var(--primary),0.4)", color: "#3B82F6", background: "transparent" }}
                  onClick={() => navigate("/plataforma")}
                >
                  Ver Plataforma Completa <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.3 }}
              className="hidden lg:flex items-center justify-center"
            >
              <div className="w-80 h-80 float-up">
                <PlasmaCore className="w-full h-full" />
              </div>
            </motion.div>
          </div>

          {/* Hero Metrics */}
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16"
          >
            {[
              { ref: m1.ref, count: m1.count, div: 10, suffix: "B", prefix: "$", label: "Mercado LegalTech 2027" },
              { ref: m2.ref, count: m2.count, div: 1, suffix: "%", prefix: "", label: "CAGR Projetado" },
              { ref: m3.ref, count: m3.count, div: 1, suffix: "%+", prefix: "", label: "Margem SaaS" },
              { ref: m4.ref, count: m4.count, div: 1, suffix: "+", prefix: "", label: "Módulos Integrados" },
            ].map((m, i) => (
              <div key={i} ref={m.ref} className="tron-card p-5 text-center">
                <div className="text-3xl md:text-4xl font-bold tron-glow-gold mb-1" style={{ color: "#c9a84c" }}>
                  {m.prefix}{m.div > 1 ? (m.count / m.div).toFixed(1) : m.count}{m.suffix}
                </div>
                <div className="text-[10px] tracking-[0.2em] uppercase" style={{ color: "rgba(255,255,255,0.4)" }}>{m.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ Pitch Deck Carousel ═══ */}
      <section className="relative py-16 lg:py-24 tron-grid-bg" style={{ background: "hsl(var(--background))", borderTop: "1px solid rgba(201,168,76,0.15)" }}>
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
            <div className="text-xs font-semibold tracking-[0.25em] uppercase mb-3" style={{ color: "#3B82F6" }}>
              Apresentação Executiva
            </div>
            <h2 className="text-2xl md:text-3xl font-bold tron-glow-gold" style={{ color: "#c9a84c" }}>
              Pitch Deck Interativo
            </h2>
          </motion.div>
          <InvestorCarousel />
        </div>
      </section>

      {/* ═══ TAM SAM SOM ═══ */}
      <section className="relative py-20 lg:py-28 tron-scanline" style={{ background: "hsl(var(--background))", borderTop: "1px solid hsl(var(--primary),0.12)" }}>
        <div className="absolute inset-0 tron-grid-bg opacity-20" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <div className="text-xs font-semibold tracking-[0.2em] uppercase mb-4" style={{ color: "#3B82F6" }}>
              Oportunidade de Mercado
            </div>
            <h2 className="text-3xl md:text-4xl font-bold tron-glow-gold mb-4" style={{ color: "#c9a84c" }}>
              TAM · SAM · SOM
            </h2>
            <p className="max-w-2xl mx-auto" style={{ color: "rgba(255,255,255,0.45)" }}>
              Mercado massivo com crescimento acelerado — LegalTech & AI Enterprise combinados.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {tamSamSom.map((item, i) => (
              <motion.div key={item.label} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="tron-card p-8 text-center group hover:scale-105 transition-transform"
              >
                <div className="mx-auto mb-4 rounded-full flex items-center justify-center"
                  style={{ width: 80, height: 80, border: `2px solid ${item.color}40`, background: `${item.color}10` }}
                >
                  <span className="text-2xl font-bold" style={{ color: item.color }}>{item.label}</span>
                </div>
                <div className="text-4xl font-bold mb-2 tron-glow-gold" style={{ color: item.color }}>{item.value}</div>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Competitive Advantages ═══ */}
      <section className="relative py-20 lg:py-28" style={{ background: "hsl(var(--background))" }}>
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <div className="text-xs font-semibold tracking-[0.2em] uppercase mb-4" style={{ color: "#3B82F6" }}>
              Vantagem Competitiva
            </div>
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: "rgba(255,255,255,0.9)" }}>
              Por Que o ORION é <span className="tron-glow-gold" style={{ color: "#c9a84c" }}>Imbatível</span>
            </h2>
          </motion.div>

          <motion.div variants={staggerContainer} initial="hidden" whileInView="visible" viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto"
          >
            {competitiveAdvantages.map((adv, i) => (
              <motion.div key={adv.title} variants={fadeChild}
                className="tron-card p-6 group hover:scale-[1.02] transition-transform"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="h-11 w-11 flex items-center justify-center"
                    style={{ background: "rgba(201,168,76,0.12)", color: "#c9a84c" }}
                  >
                    <adv.icon className="h-5 w-5" />
                  </div>
                  <span className="text-xl font-bold tron-glow-gold" style={{ color: "#c9a84c" }}>{adv.stat}</span>
                </div>
                <h3 className="text-sm font-bold mb-2" style={{ color: "rgba(255,255,255,0.9)" }}>{adv.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>{adv.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ═══ Revenue Model ═══ */}
      <section className="relative py-20 lg:py-28 tron-scanline" style={{ background: "hsl(var(--background))", borderTop: "1px solid rgba(201,168,76,0.12)" }}>
        <div className="absolute inset-0 tron-grid-bg opacity-20" />
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <div className="text-xs font-semibold tracking-[0.2em] uppercase mb-4" style={{ color: "#3B82F6" }}>
                Modelo de Negócios
              </div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: "rgba(255,255,255,0.9)" }}>
                Receita <span className="tron-glow-gold" style={{ color: "#c9a84c" }}>Recorrente</span> & Escalável
              </h2>
              <p className="leading-relaxed mb-8" style={{ color: "rgba(255,255,255,0.5)" }}>
                Modelo SaaS com múltiplas fontes de receita, margem bruta de 80%+ e unit economics comprovada.
              </p>
              <div className="space-y-6">
                {revenueStreams.map((stream, i) => (
                  <div key={stream.name}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <stream.icon className="h-4 w-4" style={{ color: "#c9a84c" }} />
                        <span className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.8)" }}>{stream.name}</span>
                      </div>
                      <span className="text-sm font-bold" style={{ color: "#c9a84c" }}>{stream.percent}%</span>
                    </div>
                    <RevenueBar percent={stream.percent} color={i === 0 ? "#c9a84c" : i === 1 ? "#3B82F6" : "#00d4ff"} delay={i * 200} />
                    <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.35)" }}>{stream.desc}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <div className="tron-card p-6 md:p-8">
                <h3 className="text-lg font-bold mb-6 tron-glow-gold" style={{ color: "#c9a84c" }}>Unit Economics</h3>
                <div className="space-y-4">
                  {[
                    { label: "Margem Bruta", value: "80%+", highlight: true },
                    { label: "LTV/CAC Projetado", value: ">5x", highlight: true },
                    { label: "Payback Period", value: "<12 meses", highlight: false },
                    { label: "Churn Projetado", value: "<5%/mês", highlight: false },
                    { label: "Net Revenue Retention", value: ">110%", highlight: true },
                    { label: "Receita por Cliente (avg)", value: "$200-500/mo", highlight: false },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between items-center py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                      <span className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>{item.label}</span>
                      <span className={`text-sm font-bold ${item.highlight ? "tron-glow-gold" : ""}`} style={{ color: item.highlight ? "#c9a84c" : "rgba(255,255,255,0.8)" }}>
                        {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══ Timeline ═══ */}
      <section className="relative py-20 lg:py-28" style={{ background: "hsl(var(--background))" }}>
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-start">
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <div className="text-xs font-semibold tracking-[0.2em] uppercase mb-4" style={{ color: "#3B82F6" }}>Evolução Acelerada</div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6" style={{ color: "rgba(255,255,255,0.9)" }}>
                De <span className="tron-glow-gold" style={{ color: "#c9a84c" }}>Conceito</span> a Plataforma Global
              </h2>
              <div className="relative">
                <div className="absolute left-5 top-0 bottom-0 w-px" style={{ background: "linear-gradient(180deg, #c9a84c, #3B82F6)" }} />
                {evolutionTimeline.map((item, i) => (
                  <motion.div key={i} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                    className="relative flex items-start gap-4 mb-8 last:mb-0"
                  >
                    <div className="relative z-10 h-10 w-10 flex items-center justify-center shrink-0"
                      style={{ background: i < evolutionTimeline.length - 1 ? "rgba(201,168,76,0.12)" : "rgba(201,168,76,0.25)", border: "1px solid rgba(201,168,76,0.4)", color: "#c9a84c" }}
                    >
                      <item.icon className="h-4 w-4" />
                    </div>
                    <div className="pt-1">
                      <div className="text-xs font-bold tracking-wide" style={{ color: "#c9a84c" }}>{item.date}</div>
                      <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.7)" }}>{item.event}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Founder */}
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <div className="text-xs font-semibold tracking-[0.2em] uppercase mb-4" style={{ color: "#3B82F6" }}>Fundador & Empresa</div>
              <h2 className="text-3xl font-bold mb-2" style={{ color: "rgba(255,255,255,0.9)" }}>
                Ericson Piccoli <span className="text-base font-normal" style={{ color: "rgba(255,255,255,0.4)" }}>(愛立信)</span>
              </h2>
              <p className="text-sm font-medium mb-4" style={{ color: "#c9a84c" }}>General Director & Founder — ORION AI Platform</p>
              <p className="leading-relaxed mb-6" style={{ color: "rgba(255,255,255,0.5)" }}>
                Empreendedor brasileiro-italiano, especialista em Negócios Internacionais com foco em Sustentabilidade. Criou sozinho uma plataforma que rivaliza com times de 50+ pessoas.
              </p>
              <div className="flex flex-wrap gap-2 mb-8">
                {["IA & Machine Learning", "Negócios Internacionais", "Economia Circular", "Full-Stack Engineering", "Inovação"].map(skill => (
                  <span key={skill} className="text-[10px] px-2.5 py-1 tracking-wide" style={{ background: "rgba(201,168,76,0.1)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.25)" }}>
                    {skill}
                  </span>
                ))}
              </div>
              <div className="tron-card p-6">
                <div className="flex items-center gap-3 mb-4">
                  <IconAward className="h-5 w-5" style={{ color: "#c9a84c" }} />
                  <h3 className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.9)" }}>ELP Green Technology S.R.L.</h3>
                </div>
                <div className="space-y-2 text-sm">
                  {[
                    { label: "Sede", value: "Itália (UE)" },
                    { label: "Setor", value: "IA Empresarial & Sustentabilidade" },
                    { label: "Website", value: "www.iasofthub.com" },
                    { label: "Marcas", value: "ELP® · ORION" },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between py-2" style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                      <span style={{ color: "rgba(255,255,255,0.4)" }}>{item.label}</span>
                      <span style={{ color: "rgba(255,255,255,0.7)" }}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══ Systems Grid ═══ */}
      <section className="relative py-20 lg:py-28 tron-scanline" style={{ background: "hsl(var(--background))", borderTop: "1px solid hsl(var(--primary),0.12)" }}>
        <GatewayBackground opacity={0.25} />
        <div className="absolute inset-0 tron-grid-bg opacity-20" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <div className="text-xs font-semibold tracking-[0.2em] uppercase mb-4" style={{ color: "#3B82F6" }}>17+ Módulos Integrados</div>
            <h2 className="text-3xl md:text-4xl font-bold tron-glow-gold mb-4" style={{ color: "#c9a84c" }}>Ecossistema Completo</h2>
            <p className="max-w-2xl mx-auto" style={{ color: "rgba(255,255,255,0.45)" }}>
              Cada módulo substituiu ferramentas separadas — um ecossistema que elimina complexidade.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {orionSystems.map((tool, i) => (
              <motion.div key={tool.title} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-40px" }} variants={fadeUp}
                className={`tron-card p-5 ${tool.highlight ? "tron-card-highlight" : ""}`}
              >
                {tool.highlight && (
                  <div className="absolute top-2 right-2 text-[9px] px-1.5 py-0.5 tracking-wider uppercase"
                    style={{ background: "rgba(201,168,76,0.15)", color: "#c9a84c", border: "1px solid rgba(201,168,76,0.3)" }}
                  >Core</div>
                )}
                <div className="flex items-start gap-3 mb-3">
                  <div className="h-9 w-9 flex items-center justify-center shrink-0"
                    style={{ background: tool.highlight ? "rgba(201,168,76,0.15)" : "hsl(var(--primary),0.08)", color: tool.highlight ? "#c9a84c" : "#3B82F6" }}
                  >
                    <tool.icon className="h-4 w-4" />
                  </div>
                  <h3 className="text-sm font-semibold pt-1.5" style={{ color: "rgba(255,255,255,0.85)" }}>{tool.title}</h3>
                </div>
                <p className="text-xs leading-relaxed mb-3" style={{ color: "rgba(255,255,255,0.4)" }}>{tool.desc}</p>
                <div className="flex flex-wrap gap-1.5">
                  {tool.tags.map(tag => (
                    <span key={tag} className="text-[10px] px-2 py-0.5 tracking-wide"
                      style={{ background: "hsl(var(--primary),0.06)", color: "hsl(var(--primary),0.6)", border: "1px solid hsl(var(--primary),0.12)" }}
                    >{tag}</span>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ Architecture ═══ */}
      <section className="relative py-20 lg:py-28" style={{ background: "hsl(var(--background))" }}>
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tron-glow-cyan mb-4" style={{ color: "#3B82F6" }}>Arquitetura — 8 Camadas</h2>
            <p className="max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.4)" }}>
              Infraestrutura proprietária com inteligência, monitoramento, cognição e segurança.
            </p>
          </motion.div>

          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} className="max-w-4xl mx-auto">
            <div className="tron-card p-8 md:p-12">
              {architectureLayers.map((layer, i) => (
                <div key={layer.label} className="relative p-4 md:p-5 mb-3 last:mb-0 transition-all group cursor-default"
                  style={{
                    background: "rgba(255,255,255,0.01)",
                    border: `1px solid ${i % 2 === 0 ? "rgba(201,168,76,0.15)" : "hsl(var(--primary),0.12)"}`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = i % 2 === 0 ? "rgba(201,168,76,0.06)" : "hsl(var(--primary),0.06)";
                    e.currentTarget.style.borderColor = i % 2 === 0 ? "rgba(201,168,76,0.4)" : "hsl(var(--primary),0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "rgba(255,255,255,0.01)";
                    e.currentTarget.style.borderColor = i % 2 === 0 ? "rgba(201,168,76,0.15)" : "hsl(var(--primary),0.12)";
                  }}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <layer.icon className="h-4 w-4" style={{ color: i % 2 === 0 ? "#c9a84c" : "#3B82F6" }} />
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

      {/* ═══ Investor FAQ ═══ */}
      <section className="relative py-20 lg:py-28 tron-scanline" style={{ background: "hsl(var(--background))", borderTop: "1px solid rgba(201,168,76,0.12)" }}>
        <div className="absolute inset-0 tron-grid-bg opacity-20" />
        <div className="container mx-auto px-4 relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold tron-glow-gold mb-4" style={{ color: "#c9a84c" }}>Perguntas Frequentes</h2>
            <p className="max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.4)" }}>Respostas diretas para investidores.</p>
          </motion.div>

          <div className="max-w-3xl mx-auto space-y-4">
            {investorFAQ.map((faq, i) => (
              <motion.div key={i} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={fadeUp}
                className="tron-card p-6"
              >
                <h3 className="text-sm font-bold mb-2" style={{ color: "#c9a84c" }}>{faq.q}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>{faq.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ CTA Final — Maximum Urgency ═══ */}
      <section className="relative py-24 lg:py-32 tron-scanline" style={{ background: "hsl(var(--background))", borderTop: "1px solid rgba(201,168,76,0.25)" }}>
        <GatewayBackground opacity={0.25} />
        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-3xl mx-auto">
            <div className="inline-flex items-center gap-2 px-5 py-2 mb-8 text-xs font-bold tracking-[0.25em] uppercase pulse-gold"
              style={{ border: "2px solid rgba(201,168,76,0.5)", color: "#c9a84c", background: "rgba(201,168,76,0.08)" }}
            >
              <IconTrending className="h-4 w-4" />
              Rodada Seed Aberta
            </div>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-6" style={{ color: "rgba(255,255,255,0.95)" }}>
              Invista no <span className="tron-glow-gold" style={{ color: "#c9a84c" }}>Futuro da IA</span>
            </h2>
            <p className="text-lg mb-4" style={{ color: "rgba(255,255,255,0.6)" }}>
              Plataforma pronta. Mercado de $35.6B. Margem de 80%+.
            </p>
            <p className="text-sm mb-10" style={{ color: "rgba(255,255,255,0.35)" }}>
              Junte-se à ELP Green Technology na construção da plataforma de IA empresarial mais completa do mercado.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="px-12 h-14 text-sm font-bold tracking-wide"
                style={{ background: "linear-gradient(135deg, #c9a84c, #e0c068)", color: "hsl(var(--background))" }}
                onClick={() => navigate("/contato")}
              >
                Agendar Reunião com Founder <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button variant="outline" size="lg" className="px-8 h-14 text-sm"
                style={{ borderColor: "hsl(var(--primary),0.4)", color: "#3B82F6", background: "transparent" }}
                onClick={() => navigate("/docs/rede-neural")}
              >
                Documentação Técnica
              </Button>
            </div>
            <div className="mt-12 flex items-center justify-center gap-8 flex-wrap" style={{ color: "rgba(255,255,255,0.2)" }}>
              <span className="text-[10px] tracking-[0.3em] uppercase">ELP® Green Technology</span>
              <span>·</span>
              <span className="text-[10px] tracking-[0.3em] uppercase">ORION · IA Empresarial</span>
              <span>·</span>
              <span className="text-[10px] tracking-[0.3em] uppercase">www.iasofthub.com</span>
            </div>
          </motion.div>
        </div>
      </section>
    </MainLayout>
  );
}
