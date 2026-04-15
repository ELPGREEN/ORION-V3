import { Link } from "react-router-dom";
import { useState, useEffect, useCallback } from "react";
import { MainLayout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { StarfieldBackground } from "@/components/ui/StarfieldBackground";
import { TechLine, GlassCard } from "@/components/ui/TechElements";
import { AlienCoreBackground } from "@/components/ui/AlienCoreBackground";
import { HeroThreeBackground } from "@/components/home/HeroThreeBackground";
import { GatewayBackground } from "@/components/ui/GatewayBackground";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "@/contexts/LanguageContext";
import {
  MessageCircle, Shield, Lock,
  ArrowRight, UserPlus, Eye, FolderOpen, Download,
  Smartphone, Clock, Zap, Fingerprint, FileCheck,
  Activity, Layers, Network, ChevronLeft, ChevronRight as ChevronRightIcon,
  Mic, Brain, Camera, Globe, BarChart3, FileText,
  Bot, Cpu, Search, Languages, Sparkles, ShieldCheck,
  Workflow, Database, Bell, Users, Palette, Code2,
  BrainCircuit, Wand2
} from "lucide-react";
import heroBg from "@/assets/bg-carbon-hero.jpg";

const featureIcons = [Activity, Network, Layers, Fingerprint];
const featureKeys = ["tracking", "communication", "documents", "security"] as const;
const benefitIcons = [Clock, Smartphone, Zap, Lock, FolderOpen, Languages];
const showcaseKeys = ["platform", "ai", "docs", "register", "dashboard"] as const;
const showcaseImages = [
  "/og-images/og-plataforma.jpg",
  "/og-images/og-consulta.jpg",
  "/og-images/og-ferramentas-ia.jpg",
  "/og-images/og-cadastro.jpg",
  "/og-images/og-dashboard.jpg",
];

// ═══ ORION IA Utilities — comprehensive list ═══
const orionUtilities = [
  {
    icon: Mic,
    title: "⚡ Relâmpago Vivo",
    desc: "Audição + Raciocínio Relâmpago integrados. O áudio entra, é entendido em milissegundos e a resposta sai instantaneamente — Lightning Live Engine.",
    color: "text-orange-400",
  },
  {
    icon: BrainCircuit,
    title: "⚡ DeepSeek R1 (Reasoning)",
    desc: "Motor de raciocínio profundo com 97.3% no AIME. Análise lógica, comparações, estratégias e decisões complexas.",
    color: "text-cyan-400",
  },
  {
    icon: Wand2,
    title: "🎨 Orion Artifacts",
    desc: "Crie apps React interativos, gráficos, listas de tarefas e dashboards automaticamente. Code generation em segundos.",
    color: "text-pink-400",
  },
  {
    icon: Cpu2,
    title: "🖥️ Computer Use",
    desc: "Automação de navegador: web scraping, extração de dados, navegação automática. Execute ações sem intervenção manual.",
    color: "text-purple-400",
  },
  {
    icon: SparklesIcon,
    title: "💾 Orion Memory",
    desc: "Memória persistente entre sessões. Lembra preferências, contexto e histórico para respostas personalizadas.",
    color: "text-violet-400",
  },
  {
    icon: Camera,
    title: "Visão Computacional",
    desc: "Análise visual em tempo real com detecção de objetos, OCR, reconhecimento facial e leitura de documentos via câmera.",
    color: "text-cyan-400",
  },
  {
    icon: Brain,
    title: "⚡ Raciocínio Relâmpago",
    desc: "Motor de IA proprietário multicamada para análises complexas, raciocínio lógico e tomada de decisão autônoma.",
    color: "text-purple-400",
  },
  {
    icon: FileText,
    title: "Geração de Documentos",
    desc: "Crie contratos, LOIs, NDAs, propostas e relatórios com IA. 15+ tipos de documentos com templates bilíngues.",
    color: "text-emerald-400",
  },
  {
    icon: Search,
    title: "Pesquisa Inteligente",
    desc: "Busca semântica avançada em bases de dados, legislação e jurisprudência com recuperação inteligente de informações.",
    color: "text-amber-400",
  },
  {
    icon: BarChart3,
    title: "Análise de Dados",
    desc: "Dashboard com KPIs em tempo real, relatórios automatizados e insights preditivos para sua operação.",
    color: "text-blue-400",
  },
  {
    icon: Globe,
    title: "Multi-idioma (5 línguas)",
    desc: "Suporte nativo em Português, English, Italiano, Español e 中文 com tradução inteligente contextual.",
    color: "text-rose-400",
  },
  {
    icon: ShieldCheck,
    title: "Compliance Automatizado",
    desc: "Verificação GDPR/LGPD, screening AML, validação de CPF/CNPJ e auditoria completa de conformidade.",
    color: "text-green-400",
  },
  {
    icon: Bot,
    title: "Assistente 24/7",
    desc: "Orion está sempre disponível para responder dúvidas, gerar documentos, analisar dados e automatizar tarefas.",
    color: "text-yellow-400",
  },
  {
    icon: Workflow,
    title: "Automação de Processos",
    desc: "Pipelines inteligentes que automatizam fluxos de trabalho, notificações, aprovações e acompanhamento.",
    color: "text-indigo-400",
  },
  {
    icon: Database,
    title: "Armazenamento Seguro",
    desc: "Dados criptografados em nuvem com controle de acesso granular, backups automáticos e versionamento.",
    color: "text-teal-400",
  },
  {
    icon: Users,
    title: "Gestão de Equipes",
    desc: "Controle de acessos por perfil, chat interno, delegação de tarefas e monitoramento de produtividade.",
    color: "text-pink-400",
  },
];

export default function Plataforma() {
  const { t } = useTranslation();
  const p = t.plataforma;

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev + 1) % showcaseKeys.length);
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev - 1 + showcaseKeys.length) % showcaseKeys.length);
  }, []);

  useEffect(() => {
    if (isPaused) return;
    const timer = setInterval(nextSlide, 5000);
    return () => clearInterval(timer);
  }, [isPaused, nextSlide]);

  const features = featureKeys.map((key, idx) => ({
    icon: featureIcons[idx],
    title: p.features[key].title,
    description: p.features[key].desc,
    highlights: p.features[key].items,
    gradient: "from-primary/15 via-primary/5 to-transparent",
  }));

  const metrics = [
    { value: "TLS", label: p.metrics.tls, icon: Lock },
    { value: "24/7", label: p.metrics.access, icon: Clock },
    { value: "LGPD", label: p.metrics.lgpd, icon: Shield },
    { value: "RLS", label: p.metrics.rls, icon: Zap },
  ];

  const benefits = benefitIcons.map((icon, idx) => ({
    icon,
    text: p.benefits[idx],
  }));

  const showcaseSlides = showcaseKeys.map((key, idx) => ({
    title: p.showcase[key].title,
    description: p.showcase[key].desc,
    image: showcaseImages[idx],
  }));

  const steps = [
    { step: "01", icon: UserPlus, ...p.steps.create },
    { step: "02", icon: Eye, ...p.steps.access },
    { step: "03", icon: FileCheck, ...p.steps.control },
  ];

  return (
    <MainLayout hideFooterCta>
      <AlienCoreBackground />
      <SEO
        title={`${p.heroLabel} | ORION IA by ELP® Green Technology`}
        description={p.heroDescription}
        image="https://www.iasofthub.com/og-images/og-plataforma.jpg"
        keywords="plataforma, IA empresarial, automação, gestão inteligente, ELP Green Technology"
      />

      {/* Tron global styles */}
      <style>{`
        .tron-grid-overlay {
          background-image:
            linear-gradient(hsl(var(--primary), 0.03) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--primary), 0.03) 1px, transparent 1px);
          background-size: 60px 60px;
        }
        .tron-scanlines::after {
          content: '';
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(var(--primary), 0.008) 2px, hsl(var(--primary), 0.008) 4px);
          pointer-events: none;
        }
      `}</style>

      {/* ═══ HERO ═══ */}
      <section
        className="min-h-[80vh] flex items-center relative overflow-hidden"
        style={{ background: "hsl(var(--background))" }}
      >
        <HeroThreeBackground />
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(var(--background))]/50 via-transparent to-[hsl(var(--background))]/70 z-[1]" />

        <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 2 }}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[900px] h-[900px] border rotate-45 hidden lg:block" style={{ borderColor: "hsl(var(--primary),0.06)" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] border rotate-[30deg] hidden lg:block" style={{ borderColor: "rgba(201,168,76,0.06)" }} />
          <div className="absolute -bottom-32 -right-32 w-[500px] h-[500px] bg-primary/[0.03] rounded-full blur-[150px]" />
          <div className="absolute -top-20 -left-20 w-[300px] h-[300px] bg-primary/[0.04] rounded-full blur-[100px]" />
        </div>

        <div className="container py-16 sm:py-24 px-4 sm:px-6 relative" style={{ zIndex: 3 }}>
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <ScrollReveal direction="fade">
                <div className="flex items-center gap-3 mb-6">
                  <div className="h-px w-8 bg-primary" />
                  <p className="text-primary uppercase tracking-[0.35em] text-[11px] font-medium">
                    {p.heroLabel}
                  </p>
                </div>
              </ScrollReveal>
              <ScrollReveal direction="up" delay={0.1}>
                <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-serif text-foreground leading-[1.15] mb-7 tracking-tight">
                  {p.heroTitle1}
                  <br />
                  <span className="text-primary">{p.heroTitle2}</span>
                </h1>
              </ScrollReveal>
              <ScrollReveal direction="up" delay={0.2}>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-10 max-w-lg">
                  {p.heroDescription}
                </p>
              </ScrollReveal>
              <ScrollReveal direction="up" delay={0.3}>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button className="btn-gold shimmer px-8 py-5 text-sm tracking-wide" asChild>
                    <Link to="/cadastro">
                      <UserPlus className="mr-3 h-4 w-4" />
                      {p.accessPlatform}
                    </Link>
                  </Button>
                  <Button variant="outline" className="btn-outline-gold px-8 py-5 text-sm tracking-wide" asChild>
                    <a href="https://www.iasofthub.com/" target="_blank" rel="noopener noreferrer">
                      {p.talkToLawyer}
                      <ArrowRight className="ml-3 h-4 w-4" />
                    </a>
                  </Button>
                </div>
                {!isInstalled && (
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      className="btn-outline-gold px-8 py-5 text-sm tracking-wide w-full sm:w-auto"
                      onClick={async () => {
                        if (deferredPrompt) {
                          deferredPrompt.prompt();
                          const result = await deferredPrompt.userChoice;
                          if (result.outcome === "accepted") setIsInstalled(true);
                          setDeferredPrompt(null);
                        } else {
                          window.open("/install", "_self");
                        }
                      }}
                    >
                      <Download className="mr-3 h-4 w-4" />
                      Instalar App
                    </Button>
                  </div>
                )}
              </ScrollReveal>
            </div>

            <ScrollReveal direction="up" delay={0.35}>
              <div className="grid grid-cols-2 gap-4">
                {metrics.map((metric, idx) => (
                  <motion.div
                    key={metric.label}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 + idx * 0.1, duration: 0.5 }}
                  >
                    <GlassCard className="p-6 group hover:border-primary/30 transition-all duration-500">
                      <metric.icon className="h-5 w-5 text-primary/60 mb-3 group-hover:text-primary transition-colors" />
                      <p className="text-2xl font-serif text-foreground mb-1 tracking-tight">
                        {metric.value}
                      </p>
                      <p className="text-[11px] text-muted-foreground uppercase tracking-[0.15em]">
                        {metric.label}
                      </p>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <TechLine />

      {/* ═══ O QUE O ORION FAZ — NEW SECTION ═══ */}
      <section className="py-16 sm:py-24 relative overflow-hidden tron-scanlines" style={{ background: "hsl(var(--background))" }}>
        <div className="absolute inset-0 tron-grid-overlay opacity-40 pointer-events-none" />
        <GatewayBackground opacity={0.2} />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/[0.03] rounded-full blur-[180px]" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-primary/[0.02] rounded-full blur-[150px]" />
        </div>

        <div className="container px-4 sm:px-6 relative">
          <div className="text-center mb-16">
            <ScrollReveal direction="fade">
              <div className="flex items-center justify-center gap-3 mb-5">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary/60" />
                <p className="text-primary uppercase tracking-[0.35em] text-[11px] font-medium">
                  Capacidades da IA
                </p>
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary/60" />
              </div>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif text-foreground mb-5 tracking-tight">
                O que o <span className="text-primary">ORION</span> faz por você
              </h2>
            </ScrollReveal>
            <ScrollReveal direction="fade" delay={0.2}>
              <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
                Uma plataforma completa de inteligência artificial com comando de voz, visão computacional,
                geração de documentos, análise de dados e automação — tudo em um só lugar.
              </p>
            </ScrollReveal>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {orionUtilities.map((util, idx) => (
              <ScrollReveal key={util.title} direction="up" delay={idx * 0.05}>
                <GlassCard className="p-5 group hover:border-primary/25 transition-all duration-500 h-full">
                  <div className="flex items-start gap-3">
                    <div className="h-10 w-10 border border-primary/15 flex items-center justify-center flex-shrink-0 group-hover:border-primary/40 transition-colors rounded-sm">
                      <util.icon className={`h-5 w-5 ${util.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-foreground mb-1 tracking-tight">
                        {util.title}
                      </h3>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {util.desc}
                      </p>
                    </div>
                  </div>
                </GlassCard>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <TechLine />

      {/* ═══ FEATURES ═══ */}
      <section className="py-16 sm:py-24 relative overflow-hidden tron-scanlines" style={{ background: "hsl(var(--background))" }}>
        <div className="absolute inset-0 tron-grid-overlay opacity-30 pointer-events-none" />

        <div className="container px-4 sm:px-6 relative">
          <div className="text-center mb-20">
            <ScrollReveal direction="fade">
              <div className="flex items-center justify-center gap-3 mb-5">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary/60" />
                <p className="text-primary uppercase tracking-[0.35em] text-[11px] font-medium">
                  {p.featuresLabel}
                </p>
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary/60" />
              </div>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif text-foreground mb-5 tracking-tight">
                {p.featuresTitle1}
                <br className="hidden sm:block" />
                <span className="text-primary">{p.featuresTitle2}</span>
              </h2>
            </ScrollReveal>
            <ScrollReveal direction="fade" delay={0.2}>
              <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">
                {p.featuresDescription}
              </p>
            </ScrollReveal>
          </div>

          <div className="space-y-8">
            {features.map((feature, idx) => (
              <ScrollReveal key={feature.title} direction="up" delay={idx * 0.08}>
                <GlassCard className="group hover:border-primary/25 transition-all duration-500">
                  <div className="grid lg:grid-cols-5 gap-0">
                    <div className={`lg:col-span-1 p-8 lg:p-10 flex items-center justify-center bg-gradient-to-br ${feature.gradient} border-b lg:border-b-0 lg:border-r border-primary/5`}>
                      <div className="relative">
                        <feature.icon className="h-16 w-16 text-primary/20 group-hover:text-primary/40 transition-colors duration-500" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <feature.icon className="h-8 w-8 text-primary" />
                        </div>
                      </div>
                    </div>
                    <div className="lg:col-span-4 p-8 lg:p-10">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="h-px w-6 bg-primary/40" />
                        <h3 className="text-xl lg:text-2xl font-serif text-foreground tracking-tight">
                          {feature.title}
                        </h3>
                      </div>
                      <p className="text-muted-foreground leading-relaxed mb-6 max-w-2xl text-sm">
                        {feature.description}
                      </p>
                      <div className="grid sm:grid-cols-2 gap-3">
                        {feature.highlights.map((item: string) => (
                          <div key={item} className="flex items-center gap-3 group/item">
                            <div className="h-1.5 w-1.5 bg-primary/60 group-hover/item:bg-primary transition-colors" />
                            <span className="text-foreground/70 text-[13px]">{item}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </GlassCard>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <TechLine />

      {/* ═══ BENEFITS — DARK THEMED ═══ */}
      <section className="py-16 sm:py-24 relative overflow-hidden" style={{ background: "hsl(var(--background))", borderTop: "1px solid hsl(var(--primary),0.1)", borderBottom: "1px solid hsl(var(--primary),0.1)" }}>
        <StarfieldBackground starCount={50} speed={0.02} depth={500} className="opacity-25" />
        <div className="absolute inset-0 tron-grid-overlay opacity-20 pointer-events-none" />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-primary/[0.04] rounded-full blur-[150px]" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-primary/[0.03] rounded-full blur-[120px]" />
        </div>

        <div className="container px-4 sm:px-6 relative">
          <div className="text-center mb-14">
            <ScrollReveal direction="fade">
              <p className="text-primary uppercase tracking-[0.35em] text-[11px] font-medium mb-4">
                {p.benefitsLabel}
              </p>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif text-foreground mb-4 tracking-tight">
                {p.benefitsTitle}
              </h2>
            </ScrollReveal>
            <ScrollReveal direction="fade" delay={0.15}>
              <div className="gold-line w-16 mx-auto" />
            </ScrollReveal>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {benefits.map((benefit, idx) => (
              <ScrollReveal key={benefit.text} direction="up" delay={idx * 0.06}>
                <GlassCard className="flex items-center gap-4 p-6 group hover:border-primary/25 transition-all duration-500 h-full">
                  <div className="h-10 w-10 border border-primary/20 flex items-center justify-center flex-shrink-0 group-hover:border-primary/40 transition-colors">
                    <benefit.icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-foreground/80 text-sm leading-snug">
                    {benefit.text}
                  </span>
                </GlassCard>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <TechLine />

      {/* ═══ HOW IT WORKS ═══ */}
      <section className="py-16 sm:py-24 relative overflow-hidden tron-scanlines" style={{ background: "hsl(var(--background))" }}>
        <div className="absolute inset-0 tron-grid-overlay opacity-25 pointer-events-none" />

        <div className="container px-4 sm:px-6 relative">
          <div className="text-center mb-16">
            <ScrollReveal direction="fade">
              <div className="flex items-center justify-center gap-3 mb-5">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary/60" />
                <p className="text-primary uppercase tracking-[0.35em] text-[11px] font-medium">
                  {p.howItWorksLabel}
                </p>
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary/60" />
              </div>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-4 tracking-tight">
                {p.howItWorksTitle1} <span className="text-primary">{p.howItWorksTitle2}</span>
              </h2>
            </ScrollReveal>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto relative">
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent -translate-y-1/2" />

            {steps.map((item, idx) => (
              <ScrollReveal key={item.step} direction="up" delay={idx * 0.12}>
                <GlassCard className="p-8 text-center group hover:border-primary/25 transition-all duration-500 relative">
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-background border border-primary/30 px-4 py-1">
                    <span className="text-primary text-xs font-medium tracking-[0.2em]">
                      {item.step}
                    </span>
                  </div>

                  <div className="h-14 w-14 border border-primary/20 flex items-center justify-center mx-auto mt-4 mb-5 group-hover:border-primary/40 transition-colors">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-serif text-foreground mb-3 tracking-tight">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {item.desc}
                  </p>
                </GlassCard>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <TechLine />

      {/* ═══ PLATFORM SHOWCASE — AUTO-PLAY ═══ */}
      <section
        className="py-16 sm:py-24 relative overflow-hidden"
        style={{ background: "hsl(var(--background))", borderTop: "1px solid rgba(201,168,76,0.1)" }}
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <GatewayBackground opacity={0.15} />
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-0 w-[360px] h-[360px] bg-primary/[0.03] rounded-full blur-[130px]" />
          <div className="absolute bottom-0 right-0 w-[420px] h-[420px] bg-primary/[0.02] rounded-full blur-[150px]" />
        </div>

        <div className="container px-4 sm:px-6 relative">
          <div className="text-center mb-12">
            <ScrollReveal direction="fade">
              <div className="flex items-center justify-center gap-3 mb-5">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary/60" />
                <p className="text-primary uppercase tracking-[0.35em] text-[11px] font-medium">
                  {p.showcaseLabel}
                </p>
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary/60" />
              </div>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h2 className="text-3xl sm:text-4xl font-serif text-foreground mb-4 tracking-tight">
                {p.showcaseTitle1} <span className="text-primary">{p.showcaseTitle2}</span>
              </h2>
            </ScrollReveal>
            <ScrollReveal direction="fade" delay={0.15}>
              <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">
                {p.showcaseDescription}
              </p>
            </ScrollReveal>
          </div>

          <div className="relative max-w-4xl mx-auto">
            <div className="relative overflow-hidden border border-primary/20 bg-card/70 backdrop-blur-sm">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentSlide}
                  initial={{ opacity: 0, x: 60 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -60 }}
                  transition={{ duration: 0.5, ease: "easeInOut" }}
                >
                  <img
                    src={showcaseSlides[currentSlide].image}
                    alt={showcaseSlides[currentSlide].title}
                    className="w-full aspect-[1200/630] object-cover"
                  />
                  <div className="p-6 sm:p-8 border-t border-primary/15 bg-background/80">
                    <h3 className="text-xl sm:text-2xl font-serif text-foreground tracking-tight mb-2">
                      {showcaseSlides[currentSlide].title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">
                      {showcaseSlides[currentSlide].description}
                    </p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>

            <button
              onClick={prevSlide}
              className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 bg-background/80 border border-primary/20 flex items-center justify-center text-primary hover:bg-primary/10 hover:border-primary/40 transition-all z-10"
              aria-label="Previous slide"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              onClick={nextSlide}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 bg-background/80 border border-primary/20 flex items-center justify-center text-primary hover:bg-primary/10 hover:border-primary/40 transition-all z-10"
              aria-label="Next slide"
            >
              <ChevronRightIcon className="h-5 w-5" />
            </button>

            <div className="flex items-center justify-center gap-2 mt-6">
              {showcaseSlides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-2 transition-all duration-300 ${
                    idx === currentSlide
                      ? "w-8 bg-primary"
                      : "w-2 bg-primary/25 hover:bg-primary/40"
                  }`}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </section>

      <TechLine />

      {/* ═══ FINAL CTA — DARK THEMED ═══ */}
      <section className="py-16 sm:py-24 relative overflow-hidden tron-scanlines" style={{ background: "hsl(var(--background))", borderTop: "1px solid hsl(var(--primary),0.1)" }}>
        <HeroThreeBackground />
        <div className="absolute inset-0 bg-[hsl(var(--background))]/60 z-[1]" />
        <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ zIndex: 2 }}>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] border rotate-45 hidden sm:block" style={{ borderColor: "hsl(var(--primary),0.05)" }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] border rotate-[22deg] hidden sm:block" style={{ borderColor: "rgba(201,168,76,0.05)" }} />
        </div>
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-primary/[0.04] rounded-full blur-[150px] pointer-events-none" />

        <div className="container relative px-4 sm:px-6" style={{ zIndex: 3 }}>
          <div className="max-w-3xl mx-auto text-center">
            <ScrollReveal direction="fade">
              <div className="flex items-center justify-center gap-3 mb-5">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary/60" />
                <p className="text-primary uppercase tracking-[0.35em] text-[11px] font-medium">
                  {p.ctaLabel}
                </p>
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary/60" />
              </div>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-foreground mb-6 tracking-tight">
                {p.ctaTitle1}
                <br />
                <span className="text-primary">{p.ctaTitle2}</span> {p.ctaTitle3}
              </h2>
            </ScrollReveal>
            <ScrollReveal direction="fade" delay={0.2}>
              <div className="gold-line w-24 mx-auto mb-8" />
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.3}>
              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-12 max-w-xl mx-auto">
                {p.ctaDescription}
              </p>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.4}>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="btn-gold px-10 py-6 shimmer text-sm tracking-wide" asChild>
                  <Link to="/cadastro">
                    <UserPlus className="mr-3 h-4 w-4" />
                    {p.accessPlatform}
                  </Link>
                </Button>
                <Button size="lg" variant="outline" className="btn-outline-gold px-10 py-6 text-sm tracking-wide" asChild>
                  <a href="https://www.iasofthub.com/" target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="mr-3 h-4 w-4" />
                    {p.talkToLawyer}
                  </a>
                </Button>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
