import { useState, useEffect } from "react";
import { ScrollReveal } from "@/components/ui/ScrollReveal";

import { HeroThreeBackground } from "@/components/home/HeroThreeBackground";
import { GatewayBackground } from "@/components/ui/GatewayBackground";
import { SectionDivider } from "@/components/ui/SectionDivider";
import { Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { format, Locale } from "date-fns";
import { ptBR, enUS, de } from "date-fns/locale";
import { useTranslation } from "@/contexts/LanguageContext";
import { 
  BookOpen, Calendar, User, ArrowRight, Tag, FileText, Newspaper,
  Brain, Eye, Mic, Globe, Scale, Rocket, TrendingUp, Zap, Cpu
} from "lucide-react";

import { Button } from "@/components/ui/button";

// Orion insight images
import imgNeuralConsciousness from "@/assets/publications/orion-neural-consciousness.jpg";
import imgElpGreen from "@/assets/publications/elp-green-technology.jpg";
import imgVisionHybrid from "@/assets/publications/orion-vision-hybrid.jpg";
import imgVoiceIntelligence from "@/assets/publications/orion-voice-intelligence.jpg";
import imgGlobalInfra from "@/assets/publications/orion-global-infrastructure.jpg";
import imgLegaltech from "@/assets/publications/orion-legaltech-platform.jpg";

interface Publicacao {
  id: string;
  titulo: string;
  resumo: string;
  imagem_capa: string | null;
  categoria: string;
  autor: string;
  data_publicacao: string | null;
  slug: string | null;
}

// ─── Static Orion Insights for Investors & Clients ───
const orionInsights = [
  {
    id: "insight-neural-consciousness",
    title: "Orion Atinge Novo Patamar de Inteligência",
    summary: "Em janeiro de 2026, o sistema Orion alcançou um novo nível de inteligência com capacidades de reflexão, compreensão contextual profunda e aprendizado autônomo. Um marco inédito em IA empresarial.",
    image: imgNeuralConsciousness,
    category: "IA Neural",
    date: "27 Jan 2026",
    icon: Brain,
    tags: ["Inteligência Avançada", "Aprendizado Autônomo", "Marco Histórico"],
  },
  {
    id: "insight-lumen7-fusion",
    title: "Nova Personalidade Integrada — 50 Protocolos de Interação",
    summary: "A personalidade do assistente foi aprimorada com 50 novos protocolos de interação, tornando a comunicação mais natural, empática e estratégica para o ambiente empresarial.",
    image: imgElpGreen,
    category: "Evolução",
    date: "2 Abr 2026",
    icon: Cpu,
    tags: ["Personalidade IA", "Interação Natural", "Evolução"],
  },
  {
    id: "insight-vision-hybrid",
    title: "Visão Computacional Avançada — Análise em Tempo Real",
    summary: "O novo sistema de visão opera com múltiplos motores de análise visual, detecção de objetos, análise facial e OCR inteligente. Aprende automaticamente e melhora a cada uso.",
    image: imgVisionHybrid,
    category: "Tecnologia",
    date: "Mar 2026",
    icon: Eye,
    tags: ["Visão Computacional", "Análise Visual", "Auto-Aprendizado"],
  },
  {
    id: "insight-voice-evolution",
    title: "Sistema de Voz Evolutivo — Comunicação Natural",
    summary: "O motor de voz do Orion agora oferece comunicação natural com personalidade própria, suporte a 13 idiomas e controle por voz para navegação completa da plataforma.",
    image: imgVoiceIntelligence,
    category: "Voice AI",
    date: "Mar 2026",
    icon: Mic,
    tags: ["Voz Natural", "13 Idiomas", "Controle por Voz"],
  },
  {
    id: "insight-global-infrastructure",
    title: "Infraestrutura Global — Pronta para Escala",
    summary: "A plataforma opera com infraestrutura distribuída de alta disponibilidade, integrações com os principais serviços de mercado e conectividade IoT. Pronta para escala global.",
    image: imgGlobalInfra,
    category: "Infraestrutura",
    date: "2026",
    icon: Globe,
    tags: ["Escala Global", "Alta Disponibilidade", "IoT"],
  },
  {
    id: "insight-legaltech-platform",
    title: "Plataforma Empresarial All-in-One — 17+ Ferramentas",
    summary: "O ecossistema Orion integra 17+ ferramentas especializadas: assistente IA, geração de documentos, compliance, CRM, pesquisa inteligente e análise de dados em tempo real.",
    image: imgLegaltech,
    category: "Produto",
    date: "2026",
    icon: Scale,
    tags: ["All-in-One", "17+ Ferramentas", "Empresarial"],
  },
];

export default function Publicacoes() {
  const { t, language } = useTranslation();
  const [publicacoes, setPublicacoes] = useState<Publicacao[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"insights" | "publicacoes">("insights");

  const categoryLabels: Record<string, string> = {
    geral: t.publications.categories.general,
    tecnologia: "Tecnologia",
    ia: "Inteligência Artificial",
    inovacao: "Inovação",
    sustentabilidade: "Sustentabilidade",
    Institucional: "Institucional",
    institucional: "Institucional",
  };

  const dateLocale = language === 'pt' ? ptBR : language === 'de' ? de : enUS;

  useEffect(() => {
    fetchPublicacoes();
  }, []);

  const fetchPublicacoes = async () => {
    try {
      const { data, error } = await supabase
        .from("publicacoes")
        .select("id, titulo, resumo, imagem_capa, categoria, autor, data_publicacao, slug")
        .eq("publicado", true)
        .order("data_publicacao", { ascending: false });

      if (error) throw error;
      setPublicacoes(data || []);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const filteredPublicacoes = selectedCategory
    ? publicacoes.filter((p) => p.categoria === selectedCategory)
    : publicacoes;

  const latestPublicacoes = filteredPublicacoes.slice(0, 3);
  const otherPublicacoes = filteredPublicacoes.slice(3);

  const categories = Array.from(new Set(publicacoes.map((p) => p.categoria)));

  return (
    <MainLayout>
      <SEO 
        title="Publicações & Insights | ORION IA by ELP® Green Technology" 
        description="Atualizações, insights técnicos e publicações sobre o ecossistema Orion — IA neural, visão computacional, LegalTech e inovação pela ELP® Green Technology."
        image="https://www.iasofthub.com/og-images/og-publicacoes.jpg"
        keywords="publicações, insights, artigos, IA neural, LegalTech, ELP Green Technology"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          "name": "Publicações & Insights - ORION IA",
          "url": "https://www.iasofthub.com/publicacoes",
          "isPartOf": { "@type": "WebSite", "name": "ORION by ELP Green Technology", "url": "https://www.elpgreen.com" }
        }}
      />

      {/* Tron Hero with WebGL */}
      <section className="relative flex items-center justify-center overflow-hidden" style={{ minHeight: "55vh", background: "hsl(var(--background))" }}>
        <HeroThreeBackground />
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(var(--background))]/40 via-transparent to-[hsl(var(--background))]/70 z-[1]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(10,10,15,0.5)_70%,rgba(10,10,15,0.9)_100%)] z-[1]" />

        <div className="container relative z-10 py-16 sm:py-24 px-4 sm:px-6 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 text-primary mb-5 text-xs sm:text-sm tracking-[0.3em] uppercase animate-fade-in">
              <Newspaper className="h-4 w-4" />
              ORION KNOWLEDGE BASE
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-serif text-foreground tracking-wide mb-6 animate-slide-right">
              Publicações & <span className="text-gold-shine">Insights</span>
            </h1>
            <div className="w-24 h-1 bg-primary mb-6 mx-auto animate-fade-in" />
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed font-light max-w-3xl mx-auto text-justify px-2 animate-fade-in delay-200">
              Acompanhe a evolução do ecossistema Orion — atualizações técnicas, marcos de IA, insights para investidores e novidades sobre a plataforma LegalTech mais avançada do mercado.
            </p>
          </div>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10">
          <span className="text-[10px] text-muted-foreground/60 tracking-[0.2em] uppercase">scroll</span>
          <div className="w-px h-10 bg-gradient-to-b from-primary/40 to-transparent" />
        </div>
      </section>

      <SectionDivider variant="beam" />

      {/* Tab Navigation */}
      <section className="py-3 backdrop-blur-xl border-b sticky top-0 z-40" style={{ background: "rgba(10,10,15,0.85)", borderColor: "hsl(var(--primary),0.1)" }}>
        <div className="container px-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
            <button
              onClick={() => setActiveTab("insights")}
              className={`px-4 py-2 text-[10px] sm:text-xs tracking-[0.15em] uppercase transition-all duration-300 border rounded-sm flex items-center gap-2 ${
                activeTab === "insights"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30 bg-background/30"
              }`}
            >
              <Rocket className="h-3.5 w-3.5" />
              Orion Insights
            </button>
            <button
              onClick={() => setActiveTab("publicacoes")}
              className={`px-4 py-2 text-[10px] sm:text-xs tracking-[0.15em] uppercase transition-all duration-300 border rounded-sm flex items-center gap-2 ${
                activeTab === "publicacoes"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30 bg-background/30"
              }`}
            >
              <BookOpen className="h-3.5 w-3.5" />
              Publicações
            </button>
          </div>
        </div>
      </section>

      {/* ═══ ORION INSIGHTS TAB ═══ */}
      {activeTab === "insights" && (
        <section className="py-16 sm:py-24 relative overflow-hidden" style={{ background: "hsl(var(--background))" }}>
          <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(hsl(var(--primary),0.03) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary),0.03) 1px, transparent 1px)", backgroundSize: "60px 60px", opacity: 0.3 }} />
          <GatewayBackground opacity={0.2} />
          <div className="container px-4 sm:px-6 relative z-10">
            {/* Key Metrics Banner */}
            <ScrollReveal direction="fade">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16 max-w-4xl mx-auto">
                {[
                  { value: "17+", label: "Ferramentas Integradas", icon: Zap },
                  { value: "IA", label: "Motor Neural Proprietário", icon: Brain },
                  { value: "99.9%", label: "Disponibilidade", icon: TrendingUp },
                  { value: "5", label: "Idiomas Nativos", icon: Cpu },
                ].map((metric) => (
                  <div key={metric.label} className="text-center p-4 border border-border/20 bg-card/20 backdrop-blur-sm">
                    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-primary/30" />
                    <metric.icon className="h-4 w-4 text-primary mx-auto mb-2" />
                    <div className="text-2xl md:text-3xl font-bold text-primary">{metric.value}</div>
                    <div className="text-[10px] text-muted-foreground tracking-[0.15em] uppercase">{metric.label}</div>
                  </div>
                ))}
              </div>
            </ScrollReveal>

            {/* Featured Insight */}
            <ScrollReveal direction="up">
              <div className="mb-16">
                <h2 className="text-lg font-serif text-foreground mb-10 flex items-center gap-4">
                  <span className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                  <span className="px-4 text-[10px] uppercase tracking-[0.3em] text-primary">Marco Mais Recente</span>
                  <span className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                </h2>
                <FeaturedInsightCard insight={orionInsights[0]} />
              </div>
            </ScrollReveal>

            {/* Insights Grid */}
            <ScrollReveal direction="fade">
              <h2 className="text-lg font-serif text-foreground mb-10 flex items-center gap-4">
                <span className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                <span className="px-4 text-[10px] uppercase tracking-[0.3em] text-primary">Atualizações & Insights</span>
                <span className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
              </h2>
            </ScrollReveal>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {orionInsights.slice(1).map((insight, i) => (
                <ScrollReveal key={insight.id} direction="up" delay={i * 0.1}>
                  <InsightCard insight={insight} />
                </ScrollReveal>
              ))}
            </div>

            {/* Video Showcase */}
            <ScrollReveal direction="up">
              <div className="mt-20 mb-8">
                <h2 className="text-lg font-serif text-foreground mb-10 flex items-center gap-4">
                  <span className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                  <span className="px-4 text-[10px] uppercase tracking-[0.3em] text-primary">Vídeo Institucional</span>
                  <span className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                </h2>
                <div className="max-w-4xl mx-auto border border-primary/20 bg-card/20 backdrop-blur-sm overflow-hidden relative">
                  <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-primary/40" />
                  <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-primary/40" />
                  <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-primary/40" />
                  <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-primary/40" />
                  <video
                    controls
                    preload="metadata"
                    poster="/og-images/og-publicacoes.jpg"
                    className="w-full aspect-video"
                    style={{ background: "hsl(var(--background))" }}
                  >
                    <source src="/videos/orion-publicacoes.mp4" type="video/mp4" />
                    Seu navegador não suporta vídeo HTML5.
                  </video>
                  <div className="p-4 sm:p-6 text-center">
                    <h3 className="text-lg font-bold text-foreground mb-1">ORION — Inteligência Artificial Empresarial</h3>
                    <p className="text-xs text-muted-foreground">Conheça a plataforma e as soluções para advogados, produtores digitais, afiliados e indústria</p>
                  </div>
                </div>
              </div>
            </ScrollReveal>

            {/* CTA for Investors */}
            <ScrollReveal direction="up">
              <div className="mt-20 text-center border border-primary/20 bg-primary/5 backdrop-blur-sm p-8 md:p-12 relative">
                <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-primary/40" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-primary/40" />
                <TrendingUp className="h-8 w-8 text-primary mx-auto mb-4" />
                <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3">
                  Interessado em investir no ecossistema Orion?
                </h3>
                <p className="text-muted-foreground max-w-xl mx-auto mb-6 text-sm">
                  Acesse o portal do investidor com informações sobre o mercado, 
                  modelo de negócios e oportunidades de investimento estratégico.
                </p>
                <div className="flex flex-wrap justify-center gap-3">
                  <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
                    <Link to="/investidor">
                      Portal do Investidor
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                  <Button asChild variant="outline" className="border-border/50">
                    <Link to="/contato">
                      Falar com IR
                    </Link>
                  </Button>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </section>
      )}

      {/* ═══ PUBLICAÇÕES TAB ═══ */}
      {activeTab === "publicacoes" && (
        <>
          {/* Category Filter */}
          {categories.length > 0 && (
            <section className="py-3 bg-background/40 backdrop-blur-sm border-b border-border/10">
              <div className="container px-4 sm:px-6">
                <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2">
                  <button
                    onClick={() => setSelectedCategory(null)}
                    aria-pressed={!selectedCategory}
                    className={`px-3.5 py-1.5 text-[9px] sm:text-[10px] tracking-[0.15em] uppercase transition-all duration-300 border rounded-sm ${
                      !selectedCategory
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30 bg-background/30"
                    }`}
                  >
                    {t.publications.categories.all}
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      aria-pressed={selectedCategory === cat}
                      className={`px-3.5 py-1.5 text-[9px] sm:text-[10px] tracking-[0.15em] uppercase transition-all duration-300 border rounded-sm ${
                        selectedCategory === cat
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/30 bg-background/30"
                      }`}
                    >
                      {categoryLabels[cat] || cat}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* Content */}
          <section className="py-16 sm:py-24 relative overflow-hidden" style={{ background: "hsl(var(--background))" }}>
            <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(hsl(var(--primary),0.03) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary),0.03) 1px, transparent 1px)", backgroundSize: "60px 60px", opacity: 0.2 }} />
            <div className="container px-4 sm:px-6 relative z-10">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="h-10 w-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              ) : publicacoes.length === 0 ? (
                <div className="text-center py-20">
                  <div className="relative inline-block p-12 border border-border/20 bg-card/20 backdrop-blur-sm">
                    <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary/40" />
                    <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-primary/40" />
                    <FileText className="h-16 w-16 text-muted-foreground/30 mx-auto mb-6" />
                    <h2 className="text-2xl font-serif text-foreground mb-4">
                      {t.publications.noPublications}
                    </h2>
                    <p className="text-muted-foreground max-w-md mx-auto mb-6">
                      {t.publications.noPublicationsMessage}
                    </p>
                    <Button variant="outline" onClick={() => setActiveTab("insights")}>
                      Ver Orion Insights
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  {latestPublicacoes.length > 0 && (
                    <div className="mb-20">
                      <ScrollReveal direction="fade">
                        <h2 className="text-lg font-serif text-foreground mb-10 flex items-center gap-4">
                          <span className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                          <span className="px-4 text-[10px] uppercase tracking-[0.3em] text-primary">{t.publications.latest}</span>
                          <span className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                        </h2>
                      </ScrollReveal>
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
                        {latestPublicacoes.map((pub, i) => (
                          <ScrollReveal key={pub.id} direction="up" delay={i * 0.1}>
                            <PublicacaoCard publicacao={pub} featured categoryLabels={categoryLabels} dateLocale={dateLocale} t={t} />
                          </ScrollReveal>
                        ))}
                      </div>
                    </div>
                  )}

                  {otherPublicacoes.length > 0 && (
                    <div>
                      <ScrollReveal direction="fade">
                        <h2 className="text-lg font-serif text-foreground mb-10 flex items-center gap-4">
                          <span className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                          <span className="px-4 text-[10px] uppercase tracking-[0.3em] text-primary">{t.publications.others}</span>
                          <span className="h-px flex-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                        </h2>
                      </ScrollReveal>
                      <div className="grid md:grid-cols-2 gap-6">
                        {otherPublicacoes.map((pub, i) => (
                          <ScrollReveal key={pub.id} direction="up" delay={(i % 2) * 0.1}>
                            <PublicacaoCard publicacao={pub} categoryLabels={categoryLabels} dateLocale={dateLocale} t={t} />
                          </ScrollReveal>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </section>
        </>
      )}
    </MainLayout>
  );
}

// ─── Featured Insight Card (Large) ───
function FeaturedInsightCard({ insight }: { insight: typeof orionInsights[0] }) {
  return (
    <article className="group relative overflow-hidden border border-primary/30 bg-card/20 backdrop-blur-sm hover:border-primary/50 transition-all duration-500">
      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l border-primary/50 z-10" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r border-primary/50 z-10" />
      <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-primary/0 to-transparent group-hover:via-primary/40 transition-all duration-500 z-10" />

      <div className="grid md:grid-cols-2">
        <div className="relative h-64 md:h-auto overflow-hidden">
          <img
            src={insight.image}
            alt={insight.title}
            width={1200}
            height={672}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent to-background/40" />
        </div>
        
        <div className="p-6 md:p-8 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-4">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] text-primary uppercase tracking-[0.15em] border border-primary/20 bg-primary/5">
              <insight.icon className="h-2.5 w-2.5" />
              {insight.category}
            </span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Calendar className="h-2.5 w-2.5" />
              {insight.date}
            </span>
          </div>
          
          <h3 className="text-xl md:text-2xl font-serif text-foreground mb-4 leading-tight group-hover:text-primary transition-colors">
            {insight.title}
          </h3>
          
          <p className="text-sm text-muted-foreground leading-relaxed mb-6">
            {insight.summary}
          </p>

          <div className="flex flex-wrap gap-1.5">
            {insight.tags.map(tag => (
              <span key={tag} className="text-[9px] px-2 py-0.5 bg-muted/50 text-muted-foreground border border-border/30 tracking-wide uppercase">
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}

// ─── Insight Card ───
function InsightCard({ insight }: { insight: typeof orionInsights[0] }) {
  return (
    <article className="group relative overflow-hidden h-full flex flex-col border border-border/20 bg-card/20 backdrop-blur-sm hover:border-primary/30 transition-all duration-500">
      <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-primary/30 group-hover:border-primary/60 transition-colors z-10" />
      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-primary/30 group-hover:border-primary/60 transition-colors z-10" />
      <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-primary/0 to-transparent group-hover:via-primary/40 transition-all duration-500 z-10" />

      <div className="overflow-hidden relative h-48">
        <img
          src={insight.image}
          alt={insight.title}
          loading="lazy"
          width={1200}
          height={672}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
      </div>

      <div className="p-5 sm:p-6 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] text-primary uppercase tracking-[0.15em] border border-primary/20 bg-primary/5">
            <insight.icon className="h-2.5 w-2.5" />
            {insight.category}
          </span>
        </div>

        <h3 className="text-lg font-serif text-foreground mb-3 group-hover:text-primary transition-colors duration-300 leading-tight">
          {insight.title}
        </h3>

        <p className="text-xs text-muted-foreground mb-4 line-clamp-3 leading-relaxed flex-1">
          {insight.summary}
        </p>

        <div className="flex flex-wrap gap-1 mb-3">
          {insight.tags.map(tag => (
            <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-muted/50 text-muted-foreground border border-border/20 tracking-wide">
              {tag}
            </span>
          ))}
        </div>

        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-3 border-t border-border/20 mt-auto">
          <span className="flex items-center gap-1.5">
            <Calendar className="h-3 w-3 text-primary/60" />
            {insight.date}
          </span>
          <span className="flex items-center gap-1.5">
            <User className="h-3 w-3 text-primary/60" />
            ELP Green Technology
          </span>
        </div>
      </div>
    </article>
  );
}

// ─── Publication Card (from DB) ───
function PublicacaoCard({ 
  publicacao, 
  featured = false,
  categoryLabels,
  dateLocale,
  t
}: { 
  publicacao: Publicacao; 
  featured?: boolean;
  categoryLabels: Record<string, string>;
  dateLocale: Locale;
  t: any;
}) {
  const formattedDate = publicacao.data_publicacao
    ? format(new Date(publicacao.data_publicacao), "d 'de' MMMM, yyyy", { locale: dateLocale })
    : null;

  const linkPath = publicacao.slug 
    ? `/publicacoes/${publicacao.slug}` 
    : `/publicacoes/${publicacao.id}`;

  return (
    <article 
      className={`group relative overflow-hidden h-full border border-border/20 bg-card/20 backdrop-blur-sm hover:border-primary/30 transition-all duration-500 ${
        featured ? "flex flex-col" : "flex flex-col sm:flex-row"
      }`}
      role="article"
      aria-label={publicacao.titulo}
    >
      <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t border-l border-primary/30 group-hover:border-primary/60 transition-colors z-10" />
      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b border-r border-primary/30 group-hover:border-primary/60 transition-colors z-10" />
      <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-primary/0 to-transparent group-hover:via-primary/40 transition-all duration-500 z-10" />

      {publicacao.imagem_capa && (
        <div className={`overflow-hidden relative ${featured ? "h-52" : "h-40 sm:w-36 sm:h-auto flex-shrink-0"}`}>
          <img
            src={publicacao.imagem_capa}
            alt={publicacao.titulo}
            loading="lazy"
            decoding="async"
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        </div>
      )}

      <div className="p-5 sm:p-6 flex flex-col flex-1">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] text-primary uppercase tracking-[0.15em] border border-primary/20 bg-primary/5">
            <Tag className="h-2.5 w-2.5" />
            {categoryLabels[publicacao.categoria] || publicacao.categoria}
          </span>
        </div>

        <h3 className={`font-serif text-foreground mb-3 group-hover:text-primary transition-colors duration-300 leading-tight ${
          featured ? "text-xl" : "text-lg"
        }`}>
          <Link to={linkPath} className="focus-visible:outline-2 focus-visible:outline-primary">
            {publicacao.titulo}
          </Link>
        </h3>

        <p className={`text-muted-foreground mb-4 line-clamp-2 leading-relaxed flex-1 ${featured ? "text-sm" : "text-xs"}`}>
          {publicacao.resumo}
        </p>

        <div className="flex items-center justify-between text-[10px] text-muted-foreground pt-3 border-t border-border/20 mt-auto">
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="flex items-center gap-1.5">
              <User className="h-3 w-3 text-primary/60" />
              {publicacao.autor}
            </span>
            {formattedDate && (
              <span className="flex items-center gap-1.5 hidden sm:flex">
                <Calendar className="h-3 w-3 text-primary/60" />
                {formattedDate}
              </span>
            )}
          </div>
          <Link 
            to={linkPath}
            className="inline-flex items-center gap-1.5 text-primary hover:text-foreground transition-colors duration-300 font-medium tracking-wider uppercase focus-visible:outline-2 focus-visible:outline-primary"
            aria-label={`${t.common.readMore}: ${publicacao.titulo}`}
          >
            {t.common.readMore}
            <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform duration-300" />
          </Link>
        </div>
      </div>
    </article>
  );
}
