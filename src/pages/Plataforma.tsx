import { Link } from "react-router-dom";
import { useState, useEffect, useCallback, useRef } from "react";
import { MainLayout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { StarfieldBackground } from "@/components/ui/StarfieldBackground";
import { TechLine, GlassCard } from "@/components/ui/TechElements";
import { AlienCoreBackground } from "@/components/ui/AlienCoreBackground";
import { HeroThreeBackground } from "@/components/home/HeroThreeBackground";
import { GatewayBackground } from "@/components/ui/GatewayBackground";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { useTranslation } from "@/contexts/LanguageContext";
import {
  MessageCircle, Shield, Lock,
  ArrowRight, UserPlus, Eye, FolderOpen, Download,
  Smartphone, Clock, Zap, Fingerprint, FileCheck,
  Activity, Layers, Network, ChevronLeft, ChevronRight as ChevronRightIcon,
  Check, X, Minus
} from "lucide-react";
import {
  GlyphVoice, GlyphBrain, GlyphVision, GlyphArtifact, GlyphComputer,
  GlyphMemory, GlyphReasoning, GlyphDocument, GlyphSearch, GlyphAnalytics,
  GlyphGlobe, GlyphShield, GlyphAssistant, GlyphWorkflow, GlyphStorage,
  GlyphTeam, GlyphAudio, GlyphProcessing, GlyphLaunch
} from "@/components/ui/OrionGlyphs";
import heroBg from "@/assets/bg-carbon-hero.jpg";

// ═══ Animated Counter Hook ═══
function useCountUp(end: number, duration = 2000, startOnView = true) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref as any, { once: true, margin: "-50px" });
  const hasStarted = useRef(false);

  useEffect(() => {
    if (!startOnView || !isInView || hasStarted.current) return;
    hasStarted.current = true;
    const startTime = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [isInView, end, duration, startOnView]);

  return { count, ref };
}

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

// ═══ ORION IA Utilities — Featured (top row) + standard ═══
const featuredUtilities = [
  {
    icon: Mic,
    title: "Relâmpago Vivo",
    desc: "Audição + Raciocínio Relâmpago integrados. O áudio entra, é entendido em milissegundos e a resposta sai instantaneamente.",
    color: "text-orange-400",
    glow: "from-orange-500/20 to-amber-500/5",
    tag: "VOICE ENGINE",
  },
  {
    icon: BrainCircuit,
    title: "DeepSeek R1",
    desc: "Motor de raciocínio profundo com 97.3% no AIME. Análise lógica, comparações e decisões complexas.",
    color: "text-cyan-400",
    glow: "from-cyan-500/20 to-blue-500/5",
    tag: "REASONING",
  },
  {
    icon: Camera,
    title: "Visão Computacional",
    desc: "Análise visual em tempo real: detecção de objetos, OCR, reconhecimento facial e leitura de documentos.",
    color: "text-emerald-400",
    glow: "from-emerald-500/20 to-green-500/5",
    tag: "VISION",
  },
];

const standardUtilities = [
  { icon: Wand2, title: "Orion Artifacts", desc: "Apps React interativos, gráficos e dashboards gerados automaticamente.", color: "text-pink-400" },
  { icon: Cpu, title: "Computer Use", desc: "Web scraping, extração de dados e navegação automática.", color: "text-purple-400" },
  { icon: Sparkles, title: "Orion Memory", desc: "Memória persistente: lembra preferências e histórico entre sessões.", color: "text-violet-400" },
  { icon: Brain, title: "Raciocínio Multi-camada", desc: "Motor proprietário para análises complexas e tomada de decisão autônoma.", color: "text-purple-400" },
  { icon: FileText, title: "Geração de Documentos", desc: "Contratos, LOIs, NDAs, propostas — 15+ templates bilíngues.", color: "text-emerald-400" },
  { icon: Search, title: "Pesquisa Semântica", desc: "Busca avançada em legislação, jurisprudência e bases de dados.", color: "text-amber-400" },
  { icon: BarChart3, title: "Análise de Dados", desc: "KPIs em tempo real, relatórios automatizados e insights preditivos.", color: "text-blue-400" },
  { icon: Globe, title: "Multi-idioma (5 línguas)", desc: "PT, EN, IT, ES, ZH com tradução contextual inteligente.", color: "text-rose-400" },
  { icon: ShieldCheck, title: "Compliance", desc: "GDPR/LGPD, screening AML, validação CPF/CNPJ automática.", color: "text-green-400" },
  { icon: Bot, title: "Assistente 24/7", desc: "Sempre disponível para dúvidas, documentos e automações.", color: "text-yellow-400" },
  { icon: Workflow, title: "Automação", desc: "Pipelines inteligentes com notificações e aprovações.", color: "text-indigo-400" },
  { icon: Database, title: "Armazenamento Seguro", desc: "Criptografia, controle granular e backups automáticos.", color: "text-teal-400" },
  { icon: Users, title: "Gestão de Equipes", desc: "Controle de acessos, chat interno e monitoramento.", color: "text-pink-400" },
];

// ═══ Tech Comparison Data ═══
const comparisonFeatures = [
  { label: "Voz Bidirecional Nativa", orion: true, chatgpt: "partial", claude: false },
  { label: "Visão Computacional", orion: true, chatgpt: true, claude: true },
  { label: "DeepSeek R1 (Reasoning)", orion: true, chatgpt: false, claude: false },
  { label: "Memória Persistente", orion: true, chatgpt: true, claude: true },
  { label: "Geração de Documentos", orion: true, chatgpt: false, claude: false },
  { label: "Computer Use / Browser", orion: true, chatgpt: false, claude: true },
  { label: "Multi-idioma (5 langs)", orion: true, chatgpt: true, claude: true },
  { label: "Pesquisa Legal / RAG", orion: true, chatgpt: false, claude: false },
  { label: "IoT / Robótica", orion: true, chatgpt: false, claude: false },
  { label: "Auto-Evolução (Jules)", orion: true, chatgpt: false, claude: false },
  { label: "100% Gratuito", orion: true, chatgpt: false, claude: false },
  { label: "Open Source", orion: true, chatgpt: false, claude: false },
];

function ComparisonIcon({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="h-4 w-4 text-emerald-400" />;
  if (value === "partial") return <Minus className="h-4 w-4 text-amber-400" />;
  return <X className="h-4 w-4 text-red-400/60" />;
}

export default function Plataforma() {
  const { t } = useTranslation();
  const p = t.plataforma;

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  // Animated counters
  const stat1 = useCountUp(16, 1800);
  const stat2 = useCountUp(200, 2200);
  const stat3 = useCountUp(5, 1200);
  const stat4 = useCountUp(99, 2000);

  useEffect(() => {
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    if (window.matchMedia("(display-mode: standalone)").matches) setIsInstalled(true);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const nextSlide = useCallback(() => setCurrentSlide((prev) => (prev + 1) % showcaseKeys.length), []);
  const prevSlide = useCallback(() => setCurrentSlide((prev) => (prev - 1 + showcaseKeys.length) % showcaseKeys.length), []);

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

  const benefits = benefitIcons.map((icon, idx) => ({ icon, text: p.benefits[idx] }));

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
        .glow-card:hover .glow-bg {
          opacity: 1;
        }
        .comparison-row:nth-child(odd) {
          background: hsl(var(--primary) / 0.02);
        }
      `}</style>

      {/* ═══ HERO ═══ */}
      <section className="min-h-[85vh] flex items-center relative overflow-hidden" style={{ background: "hsl(var(--background))" }}>
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
                  <p className="text-primary uppercase tracking-[0.35em] text-[11px] font-medium">{p.heroLabel}</p>
                </div>
              </ScrollReveal>
              <ScrollReveal direction="up" delay={0.1}>
                <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-serif text-foreground leading-[1.15] mb-7 tracking-tight">
                  {p.heroTitle1}<br />
                  <span className="text-primary">{p.heroTitle2}</span>
                </h1>
              </ScrollReveal>
              <ScrollReveal direction="up" delay={0.2}>
                <p className="text-base md:text-lg text-muted-foreground leading-relaxed mb-10 max-w-lg">{p.heroDescription}</p>
              </ScrollReveal>
              <ScrollReveal direction="up" delay={0.3}>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button className="btn-gold shimmer px-8 py-5 text-sm tracking-wide" asChild>
                    <Link to="/cadastro"><UserPlus className="mr-3 h-4 w-4" />{p.accessPlatform}</Link>
                  </Button>
                  <Button variant="outline" className="btn-outline-gold px-8 py-5 text-sm tracking-wide" asChild>
                    <a href="https://www.iasofthub.com/" target="_blank" rel="noopener noreferrer">
                      {p.talkToLawyer}<ArrowRight className="ml-3 h-4 w-4" />
                    </a>
                  </Button>
                </div>
                {!isInstalled && (
                  <div className="mt-4">
                    <Button variant="outline" className="btn-outline-gold px-8 py-5 text-sm tracking-wide w-full sm:w-auto"
                      onClick={async () => {
                        if (deferredPrompt) { deferredPrompt.prompt(); const r = await deferredPrompt.userChoice; if (r.outcome === "accepted") setIsInstalled(true); setDeferredPrompt(null); }
                        else window.open("/install", "_self");
                      }}>
                      <Download className="mr-3 h-4 w-4" />Instalar App
                    </Button>
                  </div>
                )}
              </ScrollReveal>
            </div>

            {/* Animated Stats Grid */}
            <ScrollReveal direction="up" delay={0.35}>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { ref: stat1.ref, count: stat1.count, suffix: "+", label: "Utilidades IA", sub: "ferramentas integradas" },
                  { ref: stat2.ref, count: stat2.count, suffix: "+", label: "Padrões de Visão", sub: "regex patterns" },
                  { ref: stat3.ref, count: stat3.count, suffix: "", label: "Idiomas Nativos", sub: "tradução contextual" },
                  { ref: stat4.ref, count: stat4.count, suffix: ".9%", label: "Uptime", sub: "disponibilidade" },
                ].map((stat, idx) => (
                  <motion.div key={idx} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 + idx * 0.1, duration: 0.5 }}>
                    <GlassCard className="p-6 group hover:border-primary/30 transition-all duration-500 relative overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <span ref={stat.ref} className="text-3xl font-serif text-primary mb-1 block relative">
                        {stat.count}{stat.suffix}
                      </span>
                      <p className="text-sm text-foreground font-medium relative">{stat.label}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1 relative">{stat.sub}</p>
                    </GlassCard>
                  </motion.div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <TechLine />

      {/* ═══ FEATURED UTILITIES — Big 3 ═══ */}
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
                <p className="text-primary uppercase tracking-[0.35em] text-[11px] font-medium">Capacidades da IA</p>
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
                Inteligência artificial completa: voz, visão, raciocínio, geração de documentos e automação — tudo em um ecossistema unificado e gratuito.
              </p>
            </ScrollReveal>
          </div>

          {/* Featured 3 — Large cards with glow */}
          <div className="grid md:grid-cols-3 gap-5 mb-8">
            {featuredUtilities.map((util, idx) => (
              <ScrollReveal key={util.title} direction="up" delay={idx * 0.1}>
                <motion.div
                  whileHover={{ y: -4, scale: 1.01 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="glow-card relative"
                >
                  <GlassCard className="p-6 sm:p-8 h-full border-primary/10 hover:border-primary/30 transition-all duration-500 relative overflow-hidden">
                    <div className={`glow-bg absolute inset-0 bg-gradient-to-br ${util.glow} opacity-0 transition-opacity duration-700 pointer-events-none`} />
                    <div className="relative">
                      <div className="flex items-center justify-between mb-4">
                        <div className="h-12 w-12 border border-primary/20 flex items-center justify-center rounded-sm group-hover:border-primary/40 transition-colors">
                          <util.icon className={`h-6 w-6 ${util.color}`} />
                        </div>
                        <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-primary/50 border border-primary/15 px-2 py-1 rounded-sm">
                          {util.tag}
                        </span>
                      </div>
                      <h3 className="text-lg font-serif text-foreground mb-2 tracking-tight">{util.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed">{util.desc}</p>
                    </div>
                  </GlassCard>
                </motion.div>
              </ScrollReveal>
            ))}
          </div>

          {/* Standard utilities — compact grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {standardUtilities.map((util, idx) => (
              <ScrollReveal key={util.title} direction="up" delay={idx * 0.03}>
                <GlassCard className="p-4 group hover:border-primary/25 transition-all duration-500 h-full">
                  <div className="flex items-start gap-3">
                    <div className="h-9 w-9 border border-primary/15 flex items-center justify-center flex-shrink-0 group-hover:border-primary/40 transition-colors rounded-sm">
                      <util.icon className={`h-4 w-4 ${util.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-[13px] font-medium text-foreground mb-0.5 tracking-tight">{util.title}</h3>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{util.desc}</p>
                    </div>
                  </div>
                </GlassCard>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <TechLine />

      {/* ═══ TECH COMPARISON TABLE ═══ */}
      <section className="py-16 sm:py-24 relative overflow-hidden" style={{ background: "hsl(var(--background))", borderTop: "1px solid hsl(var(--primary),0.1)" }}>
        <StarfieldBackground starCount={40} speed={0.015} depth={600} className="opacity-20" />
        <div className="absolute inset-0 tron-grid-overlay opacity-15 pointer-events-none" />

        <div className="container px-4 sm:px-6 relative">
          <div className="text-center mb-14">
            <ScrollReveal direction="fade">
              <div className="flex items-center justify-center gap-3 mb-5">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary/60" />
                <p className="text-primary uppercase tracking-[0.35em] text-[11px] font-medium">Comparativo</p>
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary/60" />
              </div>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-4 tracking-tight">
                Orion vs. <span className="text-primary">Mercado</span>
              </h2>
            </ScrollReveal>
            <ScrollReveal direction="fade" delay={0.15}>
              <p className="text-muted-foreground text-sm max-w-xl mx-auto">
                Veja como o Orion se compara com as principais IAs do mercado.
              </p>
            </ScrollReveal>
          </div>

          <ScrollReveal direction="up" delay={0.2}>
            <div className="max-w-3xl mx-auto">
              <GlassCard className="overflow-hidden">
                {/* Header */}
                <div className="grid grid-cols-4 border-b border-primary/15 bg-primary/[0.04]">
                  <div className="p-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">Recurso</div>
                  <div className="p-4 text-center">
                    <span className="text-xs font-bold text-primary tracking-wider uppercase">Orion</span>
                  </div>
                  <div className="p-4 text-center">
                    <span className="text-xs text-muted-foreground tracking-wider uppercase">ChatGPT</span>
                  </div>
                  <div className="p-4 text-center">
                    <span className="text-xs text-muted-foreground tracking-wider uppercase">Claude</span>
                  </div>
                </div>
                {/* Rows */}
                {comparisonFeatures.map((feat, idx) => (
                  <motion.div
                    key={feat.label}
                    initial={{ opacity: 0, x: -10 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.03 }}
                    className="comparison-row grid grid-cols-4 border-b border-primary/5 last:border-0"
                  >
                    <div className="p-3 sm:p-4 text-xs sm:text-sm text-foreground/80">{feat.label}</div>
                    <div className="p-3 sm:p-4 flex justify-center items-center"><ComparisonIcon value={feat.orion} /></div>
                    <div className="p-3 sm:p-4 flex justify-center items-center"><ComparisonIcon value={feat.chatgpt} /></div>
                    <div className="p-3 sm:p-4 flex justify-center items-center"><ComparisonIcon value={feat.claude} /></div>
                  </motion.div>
                ))}
                {/* Totals */}
                <div className="grid grid-cols-4 bg-primary/[0.06] border-t border-primary/20">
                  <div className="p-4 text-xs font-bold text-foreground uppercase tracking-wider">Total</div>
                  <div className="p-4 text-center text-lg font-serif text-primary">12/12</div>
                  <div className="p-4 text-center text-lg font-serif text-muted-foreground">3/12</div>
                  <div className="p-4 text-center text-lg font-serif text-muted-foreground">3/12</div>
                </div>
              </GlassCard>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <TechLine />

      {/* ═══ ARCHITECTURE PIPELINE ═══ */}
      <section className="py-16 sm:py-24 relative overflow-hidden tron-scanlines" style={{ background: "hsl(var(--background))" }}>
        <div className="absolute inset-0 tron-grid-overlay opacity-25 pointer-events-none" />
        <GatewayBackground opacity={0.1} />

        <div className="container px-4 sm:px-6 relative">
          <div className="text-center mb-14">
            <ScrollReveal direction="fade">
              <div className="flex items-center justify-center gap-3 mb-5">
                <div className="h-px w-12 bg-gradient-to-r from-transparent to-primary/60" />
                <p className="text-primary uppercase tracking-[0.35em] text-[11px] font-medium">Arquitetura</p>
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary/60" />
              </div>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-4 tracking-tight">
                Pipeline de <span className="text-primary">Inteligência</span>
              </h2>
            </ScrollReveal>
          </div>

          <ScrollReveal direction="up" delay={0.2}>
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col md:flex-row items-stretch gap-0">
                {[
                  { icon: AudioLines, label: "Entrada", items: ["Voz (GCP STT)", "Texto / Chat", "Câmera / Imagem"], color: "text-orange-400", borderColor: "border-orange-500/30" },
                  { icon: Cog, label: "Processamento", items: ["Intent Classifier", "Neural Ops Engine", "RAG + Embeddings"], color: "text-cyan-400", borderColor: "border-cyan-500/30" },
                  { icon: BrainCircuit, label: "Raciocínio", items: ["Gemini 2.5 Flash", "DeepSeek R1", "Multi-Agent"], color: "text-purple-400", borderColor: "border-purple-500/30" },
                  { icon: Rocket, label: "Saída", items: ["Voz (Enceladus TTS)", "Texto + Artifacts", "Ações / Browser"], color: "text-emerald-400", borderColor: "border-emerald-500/30" },
                ].map((stage, idx) => (
                  <motion.div
                    key={stage.label}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: idx * 0.12 }}
                    className="flex-1 relative"
                  >
                    <GlassCard className={`p-6 h-full ${stage.borderColor} border-l-2 md:border-l md:border-t-2`}>
                      <div className="flex items-center gap-3 mb-4">
                        <stage.icon className={`h-5 w-5 ${stage.color}`} />
                        <span className="text-xs font-mono uppercase tracking-[0.2em] text-foreground/60">{stage.label}</span>
                      </div>
                      <ul className="space-y-2">
                        {stage.items.map((item) => (
                          <li key={item} className="flex items-center gap-2">
                            <div className={`h-1 w-1 rounded-full ${stage.color.replace("text-", "bg-")}`} />
                            <span className="text-xs text-muted-foreground">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </GlassCard>
                    {idx < 3 && (
                      <div className="hidden md:flex absolute top-1/2 -right-2 z-10 -translate-y-1/2">
                        <ArrowRight className="h-4 w-4 text-primary/30" />
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </ScrollReveal>
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
                <p className="text-primary uppercase tracking-[0.35em] text-[11px] font-medium">{p.featuresLabel}</p>
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary/60" />
              </div>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-serif text-foreground mb-5 tracking-tight">
                {p.featuresTitle1}<br className="hidden sm:block" />
                <span className="text-primary">{p.featuresTitle2}</span>
              </h2>
            </ScrollReveal>
            <ScrollReveal direction="fade" delay={0.2}>
              <p className="text-muted-foreground max-w-2xl mx-auto text-sm sm:text-base leading-relaxed">{p.featuresDescription}</p>
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
                        <h3 className="text-xl lg:text-2xl font-serif text-foreground tracking-tight">{feature.title}</h3>
                      </div>
                      <p className="text-muted-foreground leading-relaxed mb-6 max-w-2xl text-sm">{feature.description}</p>
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

      {/* ═══ BENEFITS ═══ */}
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
              <p className="text-primary uppercase tracking-[0.35em] text-[11px] font-medium mb-4">{p.benefitsLabel}</p>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-serif text-foreground mb-4 tracking-tight">{p.benefitsTitle}</h2>
            </ScrollReveal>
            <ScrollReveal direction="fade" delay={0.15}><div className="gold-line w-16 mx-auto" /></ScrollReveal>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {benefits.map((benefit, idx) => (
              <ScrollReveal key={benefit.text} direction="up" delay={idx * 0.06}>
                <GlassCard className="flex items-center gap-4 p-6 group hover:border-primary/25 transition-all duration-500 h-full">
                  <div className="h-10 w-10 border border-primary/20 flex items-center justify-center flex-shrink-0 group-hover:border-primary/40 transition-colors">
                    <benefit.icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-foreground/80 text-sm leading-snug">{benefit.text}</span>
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
                <p className="text-primary uppercase tracking-[0.35em] text-[11px] font-medium">{p.howItWorksLabel}</p>
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
                    <span className="text-primary text-xs font-medium tracking-[0.2em]">{item.step}</span>
                  </div>
                  <div className="h-14 w-14 border border-primary/20 flex items-center justify-center mx-auto mt-4 mb-5 group-hover:border-primary/40 transition-colors">
                    <item.icon className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-serif text-foreground mb-3 tracking-tight">{item.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{item.desc}</p>
                </GlassCard>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <TechLine />

      {/* ═══ PLATFORM SHOWCASE ═══ */}
      <section className="py-16 sm:py-24 relative overflow-hidden"
        style={{ background: "hsl(var(--background))", borderTop: "1px solid rgba(201,168,76,0.1)" }}
        onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)}>
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
                <p className="text-primary uppercase tracking-[0.35em] text-[11px] font-medium">{p.showcaseLabel}</p>
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary/60" />
              </div>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h2 className="text-3xl sm:text-4xl font-serif text-foreground mb-4 tracking-tight">
                {p.showcaseTitle1} <span className="text-primary">{p.showcaseTitle2}</span>
              </h2>
            </ScrollReveal>
            <ScrollReveal direction="fade" delay={0.15}>
              <p className="text-muted-foreground text-sm sm:text-base max-w-2xl mx-auto leading-relaxed">{p.showcaseDescription}</p>
            </ScrollReveal>
          </div>
          <div className="relative max-w-4xl mx-auto">
            <div className="relative overflow-hidden border border-primary/20 bg-card/70 backdrop-blur-sm">
              <AnimatePresence mode="wait">
                <motion.div key={currentSlide} initial={{ opacity: 0, x: 60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -60 }} transition={{ duration: 0.5, ease: "easeInOut" }}>
                  <img src={showcaseSlides[currentSlide].image} alt={showcaseSlides[currentSlide].title} className="w-full aspect-[1200/630] object-cover" />
                  <div className="p-6 sm:p-8 border-t border-primary/15 bg-background/80">
                    <h3 className="text-xl sm:text-2xl font-serif text-foreground tracking-tight mb-2">{showcaseSlides[currentSlide].title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">{showcaseSlides[currentSlide].description}</p>
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
            <button onClick={prevSlide} className="absolute left-3 top-1/2 -translate-y-1/2 h-10 w-10 bg-background/80 border border-primary/20 flex items-center justify-center text-primary hover:bg-primary/10 hover:border-primary/40 transition-all z-10" aria-label="Previous slide">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button onClick={nextSlide} className="absolute right-3 top-1/2 -translate-y-1/2 h-10 w-10 bg-background/80 border border-primary/20 flex items-center justify-center text-primary hover:bg-primary/10 hover:border-primary/40 transition-all z-10" aria-label="Next slide">
              <ChevronRightIcon className="h-5 w-5" />
            </button>
            <div className="flex items-center justify-center gap-2 mt-6">
              {showcaseSlides.map((_, idx) => (
                <button key={idx} onClick={() => setCurrentSlide(idx)}
                  className={`h-2 transition-all duration-300 ${idx === currentSlide ? "w-8 bg-primary" : "w-2 bg-primary/25 hover:bg-primary/40"}`}
                  aria-label={`Slide ${idx + 1}`} />
              ))}
            </div>
          </div>
        </div>
      </section>

      <TechLine />

      {/* ═══ FINAL CTA ═══ */}
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
                <p className="text-primary uppercase tracking-[0.35em] text-[11px] font-medium">{p.ctaLabel}</p>
                <div className="h-px w-12 bg-gradient-to-l from-transparent to-primary/60" />
              </div>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-foreground mb-6 tracking-tight">
                {p.ctaTitle1}<br />
                <span className="text-primary">{p.ctaTitle2}</span> {p.ctaTitle3}
              </h2>
            </ScrollReveal>
            <ScrollReveal direction="fade" delay={0.2}><div className="gold-line w-24 mx-auto mb-8" /></ScrollReveal>
            <ScrollReveal direction="up" delay={0.3}>
              <p className="text-muted-foreground text-sm sm:text-base leading-relaxed mb-12 max-w-xl mx-auto">{p.ctaDescription}</p>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.4}>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button size="lg" className="btn-gold px-10 py-6 shimmer text-sm tracking-wide" asChild>
                  <Link to="/cadastro"><UserPlus className="mr-3 h-4 w-4" />{p.accessPlatform}</Link>
                </Button>
                <Button size="lg" variant="outline" className="btn-outline-gold px-10 py-6 text-sm tracking-wide" asChild>
                  <a href="https://www.iasofthub.com/" target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="mr-3 h-4 w-4" />{p.talkToLawyer}
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
