import { MainLayout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { TechLine } from "@/components/ui/TechElements";
import { HeroThreeBackground } from "@/components/home/HeroThreeBackground";
import { GatewayBackground } from "@/components/ui/GatewayBackground";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import {
  Briefcase, ArrowRight, CheckCircle2, Sparkles,
  Link2, Percent, Store, TrendingUp, CreditCard, BarChart3,
  Users, Gift, Target,
} from "lucide-react";

const features = [
  { icon: Link2, title: "Links Rastreáveis", desc: "Gere links únicos para cada produto. Analytics completo de cliques, conversões e receita por link." },
  { icon: Percent, title: "Comissões Automáticas", desc: "Receba comissões automaticamente a cada venda confirmada. Sem burocracia, sem atrasos." },
  { icon: Store, title: "Vitrine Personalizada", desc: "Monte sua vitrine com link compartilhável. Exiba os produtos que você promove com seu branding." },
  { icon: TrendingUp, title: "Dashboard de Performance", desc: "Acompanhe cliques, conversões, receita, ranking e métricas de performance em tempo real." },
  { icon: CreditCard, title: "Cupons Exclusivos", desc: "Crie cupons de desconto personalizados para sua audiência e aumente suas conversões." },
  { icon: BarChart3, title: "Relatórios Detalhados", desc: "Relatórios de conversão, pagamentos recebidos, histórico de vendas e projeções de receita." },
  { icon: Users, title: "Marketplace Integrado", desc: "Acesse centenas de produtos para promover no marketplace ORION. Escolha os melhores para seu nicho." },
  { icon: Gift, title: "Programa de Bonificação", desc: "Ganhe bônus extras ao atingir metas de vendas. Quanto mais vende, maior sua comissão." },
  { icon: Target, title: "Tracking Avançado", desc: "Cookies de 30 dias, atribuição de último clique e tracking cross-device para não perder nenhuma venda." },
];

const differentials = [
  "0% de taxa da plataforma para afiliados",
  "Comissões automáticas por venda",
  "Vitrine personalizada com seu link",
  "Cupons exclusivos de desconto",
  "Marketplace com centenas de produtos",
  "Dashboard em tempo real",
  "Tracking cross-device avançado",
  "Sem investimento inicial",
];

export default function SolucoesAfiliados() {
  return (
    <MainLayout>
      <SEO
        title="ORION para Afiliados | Comissões, Links e Vitrine"
        description="Ganhe comissões promovendo produtos. Links rastreáveis, vitrine personalizada, cupons e 0% de taxa da plataforma. Programa de afiliados ORION."
      />

      <style>{`
        .tron-grid-bg-afil {
          background-image:
            linear-gradient(hsl(var(--primary), 0.03) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--primary), 0.03) 1px, transparent 1px);
          background-size: 60px 60px;
        }
        .tron-scanline-afil::after {
          content: '';
          position: absolute;
          inset: 0;
          background: repeating-linear-gradient(0deg, transparent, transparent 2px, hsl(var(--primary), 0.008) 2px, hsl(var(--primary), 0.008) 4px);
          pointer-events: none;
        }
      `}</style>

      {/* Hero */}
      <section className="min-h-[45vh] flex items-center relative overflow-hidden" style={{ background: "hsl(var(--background))" }}>
        <HeroThreeBackground />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/30 to-background/80" style={{ zIndex: 1 }} />
        <div className="container py-14 sm:py-20 px-4 sm:px-6 relative" style={{ zIndex: 5 }}>
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px w-8 bg-primary" />
              <p className="text-primary uppercase tracking-[0.35em] text-[11px] font-medium">RENDA POR INDICAÇÃO</p>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-foreground leading-tight mb-6">
              Para <span className="text-primary">Afiliados</span>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl">
              Ganhe comissões promovendo produtos do marketplace. Links rastreáveis, cupons exclusivos 
              e 0% de taxa da plataforma para afiliados.
            </p>
          </div>
        </div>
      </section>

      <TechLine />

      {/* Features */}
      <section className="py-12 sm:py-16 relative overflow-hidden tron-scanline-afil" style={{ background: "hsl(var(--card))", borderTop: "1px solid hsl(var(--border))" }}>
        <div className="absolute inset-0 tron-grid-bg-afil opacity-30 pointer-events-none" />
        <GatewayBackground opacity={0.15} />
        <div className="container px-4 sm:px-6 relative" style={{ zIndex: 1 }}>
          <div className="text-center mb-12">
            <ScrollReveal direction="fade">
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">FERRAMENTAS</p>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-4">
                Tudo para <span className="text-primary">ganhar por indicação</span>
              </h2>
            </ScrollReveal>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <ScrollReveal key={feat.title} direction="up" delay={i * 0.05}>
                  <div className="group p-6 border border-border/20 bg-card/30 hover:border-primary/30 hover:bg-primary/[0.02] transition-all duration-500 h-full">
                    <div className="h-10 w-10 border border-primary/20 flex items-center justify-center mb-4 group-hover:border-primary/50 transition-colors">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mb-2">{feat.title}</h3>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{feat.desc}</p>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      <TechLine />

      {/* Differentials */}
      <section className="py-12 sm:py-16 relative overflow-hidden" style={{ background: "hsl(var(--background))", borderTop: "1px solid hsl(var(--border))" }}>
        <div className="absolute inset-0 tron-grid-bg-afil opacity-20 pointer-events-none" />
        <div className="container px-4 sm:px-6 relative" style={{ zIndex: 1 }}>
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <ScrollReveal direction="up">
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-px w-8 bg-primary" />
                  <p className="text-primary uppercase tracking-[0.35em] text-[11px] font-medium">DIFERENCIAIS</p>
                </div>
                <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-6">
                  Por que afiliados escolhem o <span className="text-primary">ORION?</span>
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-8 text-sm">
                  A plataforma ORION não cobra taxa dos afiliados. Você ganha 100% da sua comissão, 
                  com ferramentas profissionais para maximizar suas conversões.
                </p>
                <Button asChild className="btn-gold">
                  <Link to="/cadastro">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Criar Conta como Afiliado
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.1}>
              <div className="grid sm:grid-cols-2 gap-3">
                {differentials.map((item) => (
                  <div key={item} className="flex items-center gap-3 p-4 bg-card/30 border border-border/20 hover:border-primary/30 transition-all">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-xs text-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-12 sm:py-16 relative overflow-hidden tron-scanline-afil" style={{ background: "hsl(var(--card))", borderTop: "1px solid hsl(var(--border))" }}>
        <HeroThreeBackground />
        <div className="absolute inset-0 bg-background/60 z-[1]" />
        <div className="container relative px-4 sm:px-6" style={{ zIndex: 2 }}>
          <div className="max-w-2xl mx-auto text-center">
            <Briefcase className="h-10 w-10 text-primary mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-6">
              Comece a ganhar por <span className="text-primary">indicação</span>
            </h2>
            <p className="text-muted-foreground mb-8 text-sm">
              Sem investimento, sem taxa. Comece agora gratuitamente.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild className="btn-gold px-10 shimmer">
                <Link to="/cadastro">COMEÇAR GRÁTIS</Link>
              </Button>
              <Button asChild className="btn-outline-gold px-10">
                <Link to="/servicos">VER TODAS AS SOLUÇÕES</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
