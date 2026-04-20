import { MainLayout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { TechLine } from "@/components/ui/TechElements";
import { useTranslation } from "@/contexts/LanguageContext";
import { HeroThreeBackground } from "@/components/home/HeroThreeBackground";
import { GatewayBackground } from "@/components/ui/GatewayBackground";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { 
  Scale, Building2, ShoppingBag, Briefcase, Factory,
  ArrowRight, CheckCircle2, Sparkles,
  FileText, Search, Users, BarChart3, Clock, Shield,
  Store, CreditCard, Package, Link2, TrendingUp, Percent,
  Bot, Cpu, Cog, Eye, Radio, Wrench,
} from "lucide-react";

const profiles = [
  {
    anchor: "advogados",
    icon: Scale,
    title: "Para Advogados",
    subtitle: "IA Jurídica Completa",
    desc: "Plataforma de IA jurídica que revoluciona a advocacia. Gere petições com DeepSeek R1 + RAG Consciousness, pesquise jurisprudência com Quantum Router — e tenha seu próprio site profissional com chatbot jurídico 24/7.",
    items: [
      { icon: FileText, text: "Geração de petições com IA (DeepSeek R1 + RAG)" },
      { icon: Search, text: "Pesquisa jurisprudencial com Quantum Router" },
      { icon: Clock, text: "Gestão de processos, prazos e andamentos" },
      { icon: Users, text: "Portal do cliente com IA de atendimento 24/7" },
      { icon: BarChart3, text: "Dashboard de métricas com previsões de IA" },
      { icon: Shield, text: "Assinatura digital com validade jurídica" },
    ],
    cta: "Criar Conta como Advogado",
    ctaLink: "/cadastro",
    color: "from-primary/10 to-transparent",
  },
  {
    anchor: "produtores",
    icon: ShoppingBag,
    title: "Para Produtores Digitais",
    subtitle: "E-commerce com IA",
    desc: "Crie e venda com IA integrada. Orion recomenda produtos, otimiza preços, gera descrições SEO e cria páginas de alta conversão. Checkout Stripe direto na sua conta.",
    items: [
      { icon: Store, text: "Loja com IA de vendas e recomendações" },
      { icon: CreditCard, text: "Checkout Stripe direto na sua conta" },
      { icon: Package, text: "Gestão de produtos com descrições geradas por IA" },
      { icon: BarChart3, text: "Dashboard com previsões de vendas (Meta-Learning)" },
      { icon: Users, text: "Programa de afiliados com tracking inteligente" },
      { icon: FileText, text: "Editor de páginas com Copilot de IA" },
    ],
    cta: "Criar Conta como Produtor",
    ctaLink: "/cadastro",
    color: "from-primary/10 to-transparent",
  },
  {
    anchor: "afiliados",
    icon: Briefcase,
    title: "Para Afiliados",
    subtitle: "Renda por Indicação",
    desc: "Ganhe comissões com IA. Sistema sugere melhores produtos para seu público, otimiza cupons e prevê receita. 0% de taxa — você só ganha.",
    items: [
      { icon: Link2, text: "Links rastreáveis com analytics de cliques e conversão" },
      { icon: Percent, text: "Comissões automáticas creditadas por cada venda" },
      { icon: Store, text: "Vitrine personalizada com link compartilhável" },
      { icon: TrendingUp, text: "Dashboard de performance, ranking e receita" },
      { icon: CreditCard, text: "Cupons personalizados de desconto para sua audiência" },
      { icon: BarChart3, text: "Relatórios detalhados de conversão e pagamentos" },
    ],
    cta: "Criar Conta como Afiliado",
    ctaLink: "/cadastro",
    color: "from-primary/10 to-transparent",
  },
  {
    anchor: "industria",
    icon: Factory,
    title: "Orion Enterprise — Indústria & Robótica",
    subtitle: "Automação Industrial com IA",
    desc: "Soluções de automação industrial com Quantum Router + Multi-Agent + Digital Twin. ROS2 Bridge para robótica, visão YOLOv8, manutenção preditiva via Meta-Learning. Para operações que exigem precisão, eficiência e Indústria 4.0.",
    items: [
      { icon: Bot, text: "ROS2 Bridge para robôs industriais" },
      { icon: Eye, text: "Visão computacional YOLOv8/v9" },
      { icon: Cpu, text: "Quantum LLM Router + 11 Multi-Agents" },
      { icon: Radio, text: "SCADA/IoT com MQTT + Digital Twin" },
      { icon: Cog, text: "Manutenção preditiva (72h de antecedência)" },
      { icon: Wrench, text: "Meta-Learning para otimização contínua" },
    ],
    cta: "Falar com Vendas Enterprise",
    ctaLink: "/contato?plano=enterprise",
    color: "from-primary/15 to-transparent",
    fullWidth: true,
  },
];

export default function Servicos() {
  const { t } = useTranslation();
  const s = t.services;

  return (
    <MainLayout>
      <SEO 
        title="Soluções Inteligentes | ORION IA — Para Cada Perfil"
        description="Ferramentas de IA sob medida para advogados, produtores digitais, afiliados e indústria. Loja própria, checkout Stripe, IA jurídica, robótica industrial."
        image="https://www.iasofthub.com/og-images/og-servicos.jpg"
      />


      {/* Hero Section */}
      <section 
        className="min-h-[45vh] flex items-center relative overflow-hidden"
        style={{ background: "hsl(var(--background))" }}
      >
        <HeroThreeBackground />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/30 to-background/80" style={{ zIndex: 1 }} />
        <div className="container py-14 sm:py-18 px-4 sm:px-6 relative" style={{ zIndex: 5 }}>
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px w-8 bg-primary" />
              <p className="text-primary uppercase tracking-[0.35em] text-[11px] font-medium">
                SOLUÇÕES POR PERFIL
              </p>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-foreground leading-tight mb-6">
              Soluções <span className="text-primary">Inteligentes</span>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl">
              A plataforma ORION oferece ferramentas de IA sob medida para cada perfil profissional. 
              Advogados, produtores, afiliados e indústria — tudo integrado em um único ecossistema.
            </p>
          </div>
        </div>
      </section>

      <TechLine />

      {/* Profiles Section */}
      <section className="py-16 sm:py-20 relative overflow-hidden" style={{ background: "hsl(var(--card))", borderTop: "1px solid hsl(var(--border))" }}>
        <GatewayBackground opacity={0.15} />
        <div className="container px-4 sm:px-6 relative" style={{ zIndex: 1 }}>
          <div className="text-center mb-14">
            <ScrollReveal direction="fade">
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">FERRAMENTAS EXCLUSIVAS</p>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-4">
                Cada perfil tem seu <span className="text-primary">arsenal</span>
              </h2>
            </ScrollReveal>
            <ScrollReveal direction="fade" delay={0.2}>
              <p className="text-muted-foreground max-w-2xl mx-auto text-sm">
                Ferramentas pensadas para maximizar produtividade e resultados. 
                Escolha seu perfil e descubra o que o ORION faz por você.
              </p>
            </ScrollReveal>
          </div>

          <div className="space-y-6">
            {profiles.map((profile, index) => {
              const ProfileIcon = profile.icon;
              return (
                <div key={profile.anchor}>
                  <div
                    id={profile.anchor}
                    className={`group scroll-mt-24 border border-border/30 bg-card/30 backdrop-blur-sm hover:border-primary/30 transition-all duration-500 overflow-hidden ${
                      profile.fullWidth ? "border-primary/20" : ""
                    }`}
                  >
                    {/* Header */}
                    <div className={`p-6 sm:p-8 bg-gradient-to-r ${profile.color} border-b border-border/20`}>
                      <div className="flex items-center gap-4 mb-3">
                        <div className={`h-12 w-12 border flex items-center justify-center flex-shrink-0 transition-all ${
                          profile.fullWidth ? "border-primary/60 bg-primary/10" : "border-primary/30 group-hover:border-primary/60"
                        }`}>
                          <ProfileIcon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.2em] text-primary mb-0.5">{profile.subtitle}</p>
                          <h3 className="text-xl sm:text-2xl font-serif text-foreground tracking-wide">
                            {profile.title}
                          </h3>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed max-w-3xl">
                        {profile.desc}
                      </p>
                    </div>

                    {/* Items grid */}
                    <div className={`p-6 sm:p-8 grid gap-3 ${
                      profile.fullWidth ? "sm:grid-cols-2 lg:grid-cols-3" : "sm:grid-cols-2"
                    }`}>
                      {profile.items.map((item) => {
                        const ItemIcon = item.icon;
                        return (
                          <div
                            key={item.text}
                            className="flex items-start gap-3 p-3 border border-border/10 hover:border-primary/20 hover:bg-primary/[0.02] transition-all group/item"
                          >
                            <div className="h-8 w-8 border border-primary/20 flex items-center justify-center flex-shrink-0 group-hover/item:border-primary/40 transition-colors">
                              <ItemIcon className="h-4 w-4 text-primary/70" />
                            </div>
                            <p className="text-xs text-muted-foreground leading-relaxed pt-1.5">
                              {item.text}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {/* CTA */}
                    <div className="px-6 sm:px-8 pb-6 sm:pb-8">
                      <Button asChild className={profile.fullWidth ? "btn-gold shimmer" : "btn-outline-gold"}>
                        <Link to={profile.ctaLink}>
                          {profile.cta}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <TechLine />

      {/* Differentials */}
      <section className="py-16 sm:py-20 relative overflow-hidden" style={{ background: "hsl(var(--background))", borderTop: "1px solid hsl(var(--border))" }}>
        <div className="container px-4 sm:px-6 relative" style={{ zIndex: 1 }}>
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <ScrollReveal direction="up" delay={0.1}>
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-px w-8 bg-primary" />
                  <p className="text-primary uppercase tracking-[0.35em] text-[11px] font-medium">DIFERENCIAIS</p>
                </div>
                <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-6">
                  Por que escolher a <span className="text-primary">ORION?</span>
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-8 text-sm">
                  Combinamos inteligência artificial de ponta com uma plataforma completa de gestão, 
                  vendas e automação — tudo com segurança, LGPD e suporte dedicado.
                </p>
                <Button asChild className="btn-gold">
                  <Link to="/contato">
                    VER PLANOS E PREÇOS
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </ScrollReveal>
            
            <ScrollReveal direction="up" delay={0.2}>
              <div className="grid sm:grid-cols-2 gap-3">
                {[
                  "IA Gemini integrada nativamente",
                  "100% compatível com LGPD",
                  "Plano gratuito para começar",
                  "Suporte técnico dedicado",
                  "Dashboard em tempo real",
                  "Multi-idioma (PT, EN, ES, IT, ZH)",
                  "Plataforma retém apenas 10%",
                  "Afiliados isentos de taxa",
                ].map((item, index) => (
                  <div 
                    key={item} 
                    className="flex items-center gap-3 p-4 bg-card/30 border border-border/20 hover:border-primary/30 transition-all"
                  >
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-xs text-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 sm:py-20 relative overflow-hidden" style={{ background: "hsl(var(--card))", borderTop: "1px solid hsl(var(--border))" }}>
        <HeroThreeBackground />
        <div className="absolute inset-0 bg-background/60 z-[1]" />
        
        <div className="container relative px-4 sm:px-6" style={{ zIndex: 2 }}>
          <div className="max-w-2xl mx-auto text-center">
            <ScrollReveal direction="fade">
              <div className="flex items-center justify-center gap-3 mb-5">
                <div className="h-px w-8 bg-primary" />
                <p className="text-primary uppercase tracking-[0.35em] text-[11px] font-medium">COMECE AGORA</p>
                <div className="h-px w-8 bg-primary" />
              </div>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-6">
                Comece agora <span className="text-primary">gratuitamente</span>
              </h2>
            </ScrollReveal>
            <ScrollReveal direction="fade" delay={0.2}>
              <p className="text-muted-foreground mb-8 text-sm">
                Crie sua conta grátis e explore todas as ferramentas da plataforma ORION. 
                Sem compromisso, sem cartão de crédito.
              </p>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.3}>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button asChild className="btn-gold px-10 shimmer">
                  <Link to="/cadastro">
                    <Sparkles className="mr-2 h-4 w-4" />
                    COMEÇAR GRÁTIS
                  </Link>
                </Button>
                <Button asChild className="btn-outline-gold px-10">
                  <Link to="/plataforma">
                    VER PLATAFORMA
                  </Link>
                </Button>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
