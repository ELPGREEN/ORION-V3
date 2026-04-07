import { MainLayout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { TechLine } from "@/components/ui/TechElements";
import { HeroThreeBackground } from "@/components/home/HeroThreeBackground";
import { GatewayBackground } from "@/components/ui/GatewayBackground";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import {
  Factory, ArrowRight, CheckCircle2,
  Bot, Eye, Cpu, Radio, Cog, Wrench,
  Shield, Zap, MessageSquare,
} from "lucide-react";

const features = [
  { icon: Bot, title: "Smart Robotic OTR Line", desc: "Primeira linha robótica do mundo projetada para reciclagem de pneus OTR gigantes (57''–63'') com precisão milimétrica e IA embarcada." },
  { icon: Eye, title: "Visão Computacional", desc: "Sistemas de inspeção automatizada com câmeras industriais, detecção de defeitos e controle de qualidade em tempo real." },
  { icon: Cpu, title: "ROS2 & Navegação Autônoma", desc: "Integração com ROS2 Humble/Jazzy para robótica autônoma, SLAM, planejamento de trajetória e controle de manipuladores." },
  { icon: Radio, title: "SCADA & IoT", desc: "Dashboards SCADA integrados com sensores IoT, telemetria em tempo real, alertas e controle remoto de plantas industriais." },
  { icon: Cog, title: "Plantas Modulares", desc: "Linhas de produção modulares e escaláveis, adaptáveis a diferentes volumes, tipos de material e configurações de planta." },
  { icon: Wrench, title: "Manutenção Preditiva", desc: "IA analisa dados de sensores para prever falhas antes que ocorram, reduzindo downtime e custos de manutenção." },
  { icon: Shield, title: "Orion Shield", desc: "Sistema de segurança industrial com monitoramento 24/7, controle de acesso biométrico e conformidade regulatória." },
  { icon: Zap, title: "Eficiência Energética", desc: "Otimização de consumo energético via IA, com relatórios de sustentabilidade e redução de pegada de carbono." },
  { icon: Factory, title: "Consultoria 4.0", desc: "Consultoria especializada em robotização, transformação digital, Indústria 4.0 e integração de sistemas legados." },
];

const differentials = [
  "Tecnologia patenteada Smart OTR",
  "Integração ROS2 nativa",
  "Visão computacional industrial",
  "SCADA e IoT em tempo real",
  "Manutenção preditiva com IA",
  "Plantas modulares escaláveis",
  "Consultoria Indústria 4.0",
  "Orion Shield — segurança 24/7",
];

export default function SolucoesIndustria() {
  return (
    <MainLayout>
      <SEO
        title="ORION Enterprise — Indústria & Robótica | Smart OTR"
        description="Automação robótica industrial, Smart OTR, ROS2, visão computacional, SCADA/IoT e Indústria 4.0. Soluções enterprise da plataforma ORION."
      />


      {/* Hero */}
      <section className="min-h-[45vh] flex items-center relative overflow-hidden" style={{ background: "hsl(var(--background))" }}>
        <HeroThreeBackground />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/30 to-background/80" style={{ zIndex: 1 }} />
        <div className="container py-14 sm:py-20 px-4 sm:px-6 relative" style={{ zIndex: 5 }}>
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px w-8 bg-primary" />
              <p className="text-primary uppercase tracking-[0.35em] text-[11px] font-medium">AUTOMAÇÃO INDUSTRIAL</p>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-foreground leading-tight mb-6">
              Orion <span className="text-primary">Enterprise</span>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl">
              Robótica autônoma, Smart OTR, visão computacional e Indústria 4.0. 
              Soluções de automação industrial de grande escala com IA integrada.
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
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">TECNOLOGIA</p>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-4">
                Automação <span className="text-primary">inteligente</span> de ponta
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
                  Por que indústrias escolhem o <span className="text-primary">ORION?</span>
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-8 text-sm">
                  Tecnologia patenteada, equipe especializada em robótica industrial e IA, 
                  com projetos implementados em operações de grande escala.
                </p>
                <Button asChild className="btn-gold">
                  <a href="https://wa.me/393501021359" target="_blank" rel="noopener noreferrer">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Falar com Vendas Enterprise
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </a>
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
            <Factory className="h-10 w-10 text-primary mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-6">
              Transforme sua <span className="text-primary">operação industrial</span>
            </h2>
            <p className="text-muted-foreground mb-8 text-sm">
              Entre em contato para uma consultoria personalizada de automação e Indústria 4.0.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild className="btn-gold px-10 shimmer">
                <Link to="/contato?plano=enterprise">SOLICITAR PROPOSTA</Link>
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
