import { MainLayout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { TechLine } from "@/components/ui/TechElements";
import { HeroThreeBackground } from "@/components/home/HeroThreeBackground";
import { GatewayBackground } from "@/components/ui/GatewayBackground";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import {
  ShoppingBag, ArrowRight, CheckCircle2, Sparkles,
  Store, CreditCard, Package, BarChart3, Users, FileText,
  Palette, Mail, TrendingUp,
} from "lucide-react";

const features = [
  { icon: Store, title: "Loja Própria", desc: "Sua loja com IA de vendas. Orion recomenda produtos, otimiza preços e sugere upsells automaticamente." },
  { icon: CreditCard, title: "Checkout Stripe", desc: "Pagamentos diretos na sua conta Stripe. Sem intermediários, sem atrasos. Pix, cartão, boleto e internacionais." },
  { icon: Package, title: "Gestão de Produtos", desc: "Cadastre com IA auxiliar. Orion gera descrições, títulos SEO e categorias automaticamente." },
  { icon: Palette, title: "Editor de Páginas de Venda", desc: "Editor visual com IA. Crie páginas de alta conversão com sugestões de copy e design inteligente." },
  { icon: BarChart3, title: "Dashboard de Vendas", desc: "Acompanhe receita, conversão, ticket médio e crescimento. Previsões de vendas com Meta-Learning." },
  { icon: Users, title: "Programa de Afiliados", desc: "Crie programa com IA de rastreamento. Atribuição inteligente entre múltiplos touchpoints." },
  { icon: Mail, title: "Campanhas de E-mail", desc: "E-mails gerados por IA. Assuntos otimizados, Segmentação automática baseada em поведінки." },
  { icon: TrendingUp, title: "Analytics Avançado", desc: "Métricas de funil, origem de tráfego, taxa de conversão por produto e LTV predito por IA." },
  { icon: FileText, title: "Nota Fiscal Automática", desc: "Emissão automatizada de notas fiscais para cada venda, integrada com sistemas contábeis." },
];

const differentials = [
  "IA de vendas integrada (recomendações, otimização de preços)",
  "Checkout Stripe direto na sua conta",
  "Plataforma retém apenas 10% das vendas",
  "Editor visual com IA copilot",
  "Programa de afiliados com tracking inteligente",
  "Dashboard com previsões de vendas",
  "E-mail marketing gerado por IA",
  "Multi-idioma (50+ idiomas)",
];

export default function SolucoesProdutores() {
  return (
    <MainLayout>
      <SEO
        title="ORION para Produtores Digitais | Loja, Checkout e IA"
        description="Crie sua loja digital, venda com checkout Stripe, gerencie produtos e afiliados. Plataforma completa para produtores digitais."
      />


      {/* Hero */}
      <section className="min-h-[45vh] flex items-center relative overflow-hidden" style={{ background: "hsl(var(--background))" }}>
        <HeroThreeBackground />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/30 to-background/80" style={{ zIndex: 1 }} />
        <div className="container py-14 sm:py-20 px-4 sm:px-6 relative" style={{ zIndex: 5 }}>
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px w-8 bg-primary" />
              <p className="text-primary uppercase tracking-[0.35em] text-[11px] font-medium">E-COMMERCE COM IA</p>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-foreground leading-tight mb-6">
              Para <span className="text-primary">Produtores Digitais</span>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl">
              Crie sua loja, venda produtos digitais com checkout Stripe, gerencie afiliados e 
              acompanhe métricas — tudo na plataforma ORION.
            </p>
          </div>
        </div>
      </section>

      <TechLine />

      {/* Features */}
      <section className="py-12 sm:py-16 relative overflow-hidden" style={{ background: "hsl(var(--card))", borderTop: "1px solid hsl(var(--border))" }}>
        <GatewayBackground opacity={0.15} />
        <div className="container px-4 sm:px-6 relative" style={{ zIndex: 1 }}>
          <div className="text-center mb-12">
            <ScrollReveal direction="fade">
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">FERRAMENTAS</p>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-4">
                Tudo para <span className="text-primary">vender online</span>
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
        <div className="container px-4 sm:px-6 relative" style={{ zIndex: 1 }}>
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <ScrollReveal direction="up">
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-px w-8 bg-primary" />
                  <p className="text-primary uppercase tracking-[0.35em] text-[11px] font-medium">DIFERENCIAIS</p>
                </div>
                <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-6">
                  Por que produtores escolhem o <span className="text-primary">ORION?</span>
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-8 text-sm">
                  Tudo que você precisa para criar, vender e escalar seu negócio digital. 
                  Sem complicação, sem código, com IA integrada.
                </p>
                <Button asChild className="btn-gold">
                  <Link to="/cadastro">
                    <Sparkles className="mr-2 h-4 w-4" />
                    Criar Conta como Produtor
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
      <section className="py-12 sm:py-16 relative overflow-hidden" style={{ background: "hsl(var(--card))", borderTop: "1px solid hsl(var(--border))" }}>
        <HeroThreeBackground />
        <div className="absolute inset-0 bg-background/60 z-[1]" />
        <div className="container relative px-4 sm:px-6" style={{ zIndex: 2 }}>
          <div className="max-w-2xl mx-auto text-center">
            <ShoppingBag className="h-10 w-10 text-primary mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-6">
              Pronto para criar sua <span className="text-primary">loja digital?</span>
            </h2>
            <p className="text-muted-foreground mb-8 text-sm">
              Comece gratuitamente. Sua loja online em minutos.
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
