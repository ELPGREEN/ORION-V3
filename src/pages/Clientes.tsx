import { useState } from "react";
import { HeroThreeBackground } from "@/components/home/HeroThreeBackground";
import { GatewayBackground } from "@/components/ui/GatewayBackground";
import { MainLayout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Scale, Building2, ShoppingBag, Users, CheckCircle2, ArrowRight, Shield, Bot, Globe, Cpu, Brain, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DynamicMeta } from "@/components/DynamicMeta";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import { SectionDivider } from "@/components/ui/SectionDivider";

const categorias = [
  {
    id: "advogados",
    label: "Advogados & Jurídico",
    icon: Scale,
    tipo: "advogado" as const,
    descricao: "Automatize pesquisas, gere peças processuais e gerencie prazos com IA jurídica avançada.",
    beneficios: [
      "Pesquisa jurisprudencial com IA neural",
      "Geração automática de petições e peças",
      "Gestão de processos, prazos e andamentos",
      "Assinatura digital integrada",
      "Chat IA jurídico especializado (Orion)",
    ],
  },
  {
    id: "escritorios",
    label: "Escritórios & Empresas",
    icon: Building2,
    tipo: "advogado" as const,
    descricao: "Gestão completa: clientes, equipe, financeiro e documentos em um só lugar com IA integrada.",
    beneficios: [
      "CRM de clientes integrado",
      "Controle financeiro e faturamento",
      "Gestão de equipe e tarefas",
      "Dashboard de métricas em tempo real",
      "Multi-usuários com permissões granulares",
    ],
  },
  {
    id: "produtores",
    label: "Produtores Digitais",
    icon: ShoppingBag,
    tipo: "produtor" as const,
    descricao: "Crie, publique e venda produtos digitais com loja própria e checkout integrado.",
    beneficios: [
      "Loja pública personalizada",
      "Carrinho e checkout completo",
      "Gestão de produtos e estoque",
      "Dashboard de vendas e métricas",
      "Programa de afiliados integrado",
    ],
  },
  {
    id: "afiliados",
    label: "Afiliados",
    icon: Users,
    tipo: "afiliado" as const,
    descricao: "Promova produtos digitais e ganhe comissões automaticamente com links rastreáveis.",
    beneficios: [
      "Links de afiliado únicos",
      "Rastreamento de cliques e conversões",
      "Comissões automáticas",
      "Dashboard de performance",
      "Marketplace de produtos",
    ],
  },
];

const diferenciais = [
  {
    icon: Brain,
    title: "IA Neural Proprietária",
    desc: "Motor NeuroCore com 8+ camadas neurais, aprendizado contínuo e orquestrador multi-modelo.",
  },
  {
    icon: Shield,
    title: "Segurança & LGPD",
    desc: "Criptografia end-to-end, TLS/HTTPS, auditoria completa e conformidade LGPD nativa.",
  },
  {
    icon: Bot,
    title: "Assistente Orion 24/7",
    desc: "IA conversacional com voz, visão computacional, 13 idiomas e wake-word dedicado.",
  },
  {
    icon: Globe,
    title: "Plataforma Global",
    desc: "Interface em 13 idiomas, suporte multi-jurisdição e infraestrutura cloud escalável.",
  },
  {
    icon: Cpu,
    title: "16 Sistemas Integrados",
    desc: "Lumen7 Engine com 50 protocolos — documentos, CRM, analytics, compliance e mais.",
  },
  {
    icon: Zap,
    title: "Performance Real-Time",
    desc: "Processamento instantâneo, cache inteligente e otimização por IA para cada operação.",
  },
];

export default function Clientes() {
  const [categoriaAtiva, setCategoriaAtiva] = useState<string | null>(null);
  const navigate = useNavigate();

  return (
    <MainLayout>
      <DynamicMeta
        title="Soluções para Clientes | ORION IA by ELP® Green Technology"
        description="Advogados, escritórios, produtores digitais e afiliados — descubra como a plataforma ORION IA da ELP® Green Technology transforma negócios com IA neural."
        image="https://www.iasofthub.com/og-images/og-clientes.jpg"
        keywords="clientes, advogados, escritórios, produtores digitais, afiliados, ORION IA"
      />

      {/* Tron Hero */}
      <section className="relative flex items-center justify-center overflow-hidden" style={{ minHeight: "55vh", background: "hsl(var(--background))" }}>
        <HeroThreeBackground />
        <div className="absolute inset-0 bg-gradient-to-b from-[hsl(var(--background))]/40 via-transparent to-[hsl(var(--background))]/70 z-[1]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(10,10,15,0.5)_70%,rgba(10,10,15,0.9)_100%)] z-[1]" />

        <div className="container relative z-10 py-16 sm:py-24 px-4 sm:px-6 text-center">
          <div className="max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 text-primary mb-5 text-xs sm:text-sm tracking-[0.3em] uppercase animate-fade-in">
              <Users className="h-4 w-4" />
              SOLUÇÕES PARA CADA PERFIL
            </div>
            <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-serif text-foreground tracking-wide mb-6 animate-slide-right">
              Nossos <span className="text-gold-shine">Clientes</span>
            </h1>
            <div className="w-24 h-1 bg-primary mb-6 mx-auto animate-fade-in" />
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground leading-relaxed font-light max-w-3xl mx-auto text-justify px-2 animate-fade-in delay-200">
              A plataforma ORION IA da ELP Green Technology S.R.L. oferece soluções especializadas para advogados, 
              escritórios, produtores digitais e afiliados — com inteligência artificial neural proprietária.
            </p>
          </div>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 z-10">
          <span className="text-[10px] text-muted-foreground/60 tracking-[0.2em] uppercase">scroll</span>
          <div className="w-px h-10 bg-gradient-to-b from-primary/40 to-transparent" />
        </div>
      </section>

      <SectionDivider variant="beam" />

      {/* Category Filter — sticky */}
      <section className="py-3 backdrop-blur-xl sticky top-0 z-40" style={{ background: "rgba(10,10,15,0.85)", borderBottom: "1px solid hsl(var(--primary),0.1)" }}>
        <div className="container px-4">
          <div className="flex overflow-x-auto no-scrollbar gap-2 justify-start sm:justify-center pb-1">
            <button
              onClick={() => setCategoriaAtiva(null)}
              className={`flex-shrink-0 px-4 py-2 text-[10px] uppercase tracking-[0.15em] border transition-all duration-300 ${
                categoriaAtiva === null
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border/30 text-muted-foreground hover:text-foreground hover:border-primary/30 bg-background/30"
              }`}
            >
              Todos
            </button>
            {categorias.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.id}
                  onClick={() => setCategoriaAtiva(cat.id)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 text-[10px] uppercase tracking-[0.15em] border transition-all duration-300 ${
                    categoriaAtiva === cat.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border/30 text-muted-foreground hover:text-foreground hover:border-primary/30 bg-background/30"
                  }`}
                >
                  <Icon className="h-3 w-3" />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="py-16 sm:py-24 relative overflow-hidden" style={{ background: "hsl(var(--background))" }}>
        <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(hsl(var(--primary),0.03) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary),0.03) 1px, transparent 1px)", backgroundSize: "60px 60px", opacity: 0.3 }} />
        <GatewayBackground opacity={0.15} />
        <div className="container px-4 relative z-10">
          <ScrollReveal direction="fade">
            <div className="text-center mb-12">
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">SOLUÇÕES ESPECIALIZADAS</p>
              <h2 className="font-serif text-2xl sm:text-3xl text-foreground tracking-wide">
                Escolha seu <span className="text-primary">perfil</span>
              </h2>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 gap-6">
            {categorias
              .filter((c) => !categoriaAtiva || c.id === categoriaAtiva)
              .map((cat, i) => {
                const Icon = cat.icon;
                return (
                  <ScrollReveal key={cat.id} direction="up" delay={i * 0.1}>
                    <div className="group relative p-6 border bg-card/10 backdrop-blur-sm hover:bg-card/20 transition-all duration-500"
                      style={{ borderColor: "hsl(var(--primary),0.12)" }}
                    >
                      {/* Neon corners */}
                      <div className="absolute top-0 left-0 w-3 h-3 border-t border-l transition-colors" style={{ borderColor: "hsl(var(--primary),0.2)" }} />
                      <div className="absolute bottom-0 right-0 w-3 h-3 border-b border-r transition-colors" style={{ borderColor: "hsl(var(--primary),0.2)" }} />
                      <div className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-transparent to-transparent group-hover:via-primary/40 transition-all duration-500" />

                      <div className="flex items-center gap-3 mb-4">
                        <div className="h-10 w-10 border flex items-center justify-center group-hover:border-primary/40 transition-colors"
                          style={{ borderColor: "hsl(var(--primary),0.15)", background: "hsl(var(--primary),0.03)" }}
                        >
                          <Icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-serif text-lg font-semibold text-foreground">{cat.label}</h3>
                          <p className="text-[11px] text-muted-foreground">{cat.descricao}</p>
                        </div>
                      </div>
                      <ul className="space-y-2 mb-6">
                        {cat.beneficios.map((b) => (
                          <li key={b} className="flex items-center gap-2 text-xs text-muted-foreground">
                            <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                            {b}
                          </li>
                        ))}
                      </ul>
                      <button
                        onClick={() => navigate(`/auth?tab=cadastro&tipo=${cat.tipo}`)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 text-[10px] uppercase tracking-[0.2em] border text-primary hover:bg-primary/5 transition-all duration-300"
                        style={{ borderColor: "rgba(201,168,76,0.2)" }}
                      >
                        Começar agora <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                  </ScrollReveal>
                );
              })}
          </div>
        </div>
      </section>

      {/* Diferenciais */}
      <section className="py-16 sm:py-24 relative overflow-hidden" style={{ background: "hsl(var(--background))", borderTop: "1px solid rgba(201,168,76,0.1)" }}>
        <div className="absolute inset-0" style={{ backgroundImage: "linear-gradient(hsl(var(--primary),0.03) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary),0.03) 1px, transparent 1px)", backgroundSize: "60px 60px", opacity: 0.2 }} />
        <div className="container px-4 relative z-10">
          <ScrollReveal direction="fade">
            <div className="text-center mb-12">
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">POR QUE ESCOLHER A ORION</p>
              <h2 className="font-serif text-2xl sm:text-3xl text-foreground tracking-wide">
                Diferenciais da <span className="text-primary">Plataforma</span>
              </h2>
            </div>
          </ScrollReveal>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {diferenciais.map((d, i) => {
              const Icon = d.icon;
              return (
                <ScrollReveal key={d.title} direction="up" delay={i * 0.08}>
                  <div className="group relative p-5 border bg-card/10 backdrop-blur-sm hover:bg-card/20 transition-all duration-500"
                    style={{ borderColor: "hsl(var(--primary),0.1)" }}
                  >
                    <div className="absolute top-0 left-0 w-2 h-2 border-t border-l" style={{ borderColor: "hsl(var(--primary),0.15)" }} />
                    <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r" style={{ borderColor: "hsl(var(--primary),0.15)" }} />
                    <Icon className="h-6 w-6 text-primary mb-3" />
                    <h3 className="font-serif text-sm font-semibold text-foreground mb-2">{d.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{d.desc}</p>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 relative overflow-hidden" style={{ background: "hsl(var(--background))", borderTop: "1px solid hsl(var(--primary),0.1)" }}>
        <HeroThreeBackground />
        <div className="absolute inset-0 bg-[hsl(var(--background))]/60 z-[1]" />
        <div className="container text-center px-4 relative z-10">
          <ScrollReveal direction="up">
            <div className="border p-8 md:p-12 backdrop-blur-sm max-w-2xl mx-auto relative"
              style={{ borderColor: "rgba(201,168,76,0.15)", background: "rgba(10,10,15,0.6)" }}
            >
              <div className="absolute top-0 left-0 w-4 h-4 border-t border-l" style={{ borderColor: "rgba(201,168,76,0.3)" }} />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r" style={{ borderColor: "rgba(201,168,76,0.3)" }} />
              <h2 className="font-serif text-xl sm:text-2xl md:text-3xl text-foreground mb-4 tracking-wide">
                Transforme seu negócio com IA
              </h2>
              <p className="text-sm text-muted-foreground mb-8 max-w-xl mx-auto">
                Crie sua conta na plataforma ORION e comece a usar inteligência artificial neural proprietária — 
                desenvolvida pela ELP Green Technology S.R.L.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button size="lg" className="btn-gold px-10 text-xs shimmer" onClick={() => navigate("/auth?tab=cadastro")}>
                  Criar Conta <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
                <Button size="lg" className="btn-outline-gold px-10 text-xs" onClick={() => navigate("/plataforma")}>
                  Ver Plataforma
                </Button>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>
    </MainLayout>
  );
}
