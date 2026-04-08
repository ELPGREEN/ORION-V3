import { MainLayout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { TechLine } from "@/components/ui/TechElements";
import { HeroThreeBackground } from "@/components/home/HeroThreeBackground";
import { GatewayBackground } from "@/components/ui/GatewayBackground";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import {
  Factory, ArrowRight, CheckCircle2, TrendingUp,
  Bot, Eye, Cpu, Radio, Cog, Wrench,
  Shield, Zap, MessageSquare, Globe, BarChart3,
  Users, DollarSign, Target, Award, Layers,
} from "lucide-react";

const features = [
  { icon: Bot, title: "Smart Robotic OTR Line", desc: "Primeira linha robótica do mundo para reciclagem de pneus OTR gigantes (57''–63'') com precisão milimétrica e IA embarcada.", highlight: "Patente própria" },
  { icon: Eye, title: "Visão Computacional", desc: "Inspeção automatizada com YOLOv8, detecção de defeitos em tempo real e controle de qualidade com 99.2% de acurácia." },
  { icon: Cpu, title: "ROS2 & Navegação Autônoma", desc: "Middleware ROS2 Humble/Jazzy para robótica autônoma, SLAM, planejamento de trajetória e controle de manipuladores." },
  { icon: Radio, title: "SCADA & IoT Industrial", desc: "OPC-UA, Modbus TCP/RTU, PROFINET e EtherCAT integrados. Telemetria em tempo real via MQTT/WSS." },
  { icon: Cog, title: "Plantas Modulares", desc: "Linhas de produção escaláveis e adaptáveis, com deploy rápido e configuração via Node-RED + Digital Twin." },
  { icon: Wrench, title: "Manutenção Preditiva", desc: "IA analisa vibrações, temperatura e padrões de desgaste para prever falhas com até 72h de antecedência." },
  { icon: Shield, title: "Orion Shield", desc: "Segurança industrial com VDA 5050, parada de emergência global, monitoramento 24/7 e conformidade ISO 23482." },
  { icon: Zap, title: "Eficiência Energética", desc: "Otimização de consumo via IA com redução média de 23% nos custos energéticos e relatórios ESG automáticos." },
  { icon: Layers, title: "Integração Completa", desc: "CAN bus, EtherCAT, Wi-Fi, 5G, Bluetooth, WebRTC. Conecta do sensor ao cloud com latência <50ms." },
];

const marketMetrics = [
  { value: "$78B", label: "Mercado Global de Robótica Industrial", sub: "2026 — CAGR 12.3%", icon: Globe },
  { value: "$42B", label: "Mercado de Automação Industrial", sub: "2026 — CAGR 9.8%", icon: BarChart3 },
  { value: "2.7M", label: "Robôs Industriais Instalados", sub: "IFR World Robotics 2025", icon: Bot },
  { value: "$156B", label: "Indústria de Reciclagem Global", sub: "Segmento OTR: crescimento 15%/ano", icon: TrendingUp },
];

const competitiveEdge = [
  { metric: "99.2%", label: "Acurácia de inspeção", desc: "vs 85-92% da concorrência" },
  { metric: "<50ms", label: "Latência de controle", desc: "Tempo real via EtherCAT + ROS2" },
  { metric: "72h", label: "Previsão de falhas", desc: "Manutenção preditiva com IA" },
  { metric: "23%", label: "Redução energética", desc: "Otimização inteligente de consumo" },
  { metric: "3x", label: "Mais rápido que manual", desc: "Ciclo de inspeção OTR" },
  { metric: "ROI 14mo", label: "Retorno do investimento", desc: "Payback médio de projetos" },
];

const techStack = [
  { category: "Cérebro", items: ["ROS2 Humble/Jazzy", "Orion Neural Engine", "TensorFlow + YOLOv8"] },
  { category: "Conexão Interna", items: ["CAN bus", "EtherCAT", "PROFINET", "Modbus TCP/RTU"] },
  { category: "Conexão Externa", items: ["Wi-Fi 6", "5G", "Bluetooth BLE", "MQTT/WSS"] },
  { category: "Protocolos", items: ["OPC-UA (IEC 62541)", "VDA 5050 v2.0", "Nav2", "TF2"] },
  { category: "Monitoramento", items: ["Grafana", "Node-RED", "Foxglove Studio", "Digital Twin AAS"] },
  { category: "Segurança", items: ["ISO 23482", "Emergency Stop Global", "GDPR/LGPD", "TLS 1.3"] },
];

const differentials = [
  "Patente própria Smart OTR",
  "Integração ROS2 nativa",
  "Visão computacional 99.2%",
  "SCADA e IoT em tempo real",
  "Manutenção preditiva 72h",
  "Plantas modulares escaláveis",
  "VDA 5050 + ISO 23482",
  "Orion Shield — segurança 24/7",
];

export default function SolucoesIndustria() {
  return (
    <MainLayout>
      <SEO
        title="ORION Enterprise — Robótica Industrial & Smart OTR | Investidores"
        description="Automação robótica industrial com ROS2, Smart OTR patenteada, visão computacional e Indústria 4.0. Mercado de $78B com CAGR 12.3%. Soluções enterprise ORION."
      />

      {/* Hero — Investor-focused */}
      <section className="min-h-[50vh] flex items-center relative overflow-hidden" style={{ background: "hsl(var(--background))" }}>
        <HeroThreeBackground />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/30 to-background/80" style={{ zIndex: 1 }} />
        <div className="container py-14 sm:py-20 px-4 sm:px-6 relative" style={{ zIndex: 5 }}>
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px w-8 bg-primary" />
              <p className="text-primary uppercase tracking-[0.35em] text-[11px] font-medium">AUTOMAÇÃO INDUSTRIAL • ENTERPRISE</p>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-foreground leading-tight mb-6">
              Orion <span className="text-primary">Enterprise</span>
            </h1>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl mb-4">
              Plataforma de robótica industrial com tecnologia <strong className="text-foreground">Smart OTR patenteada</strong>, 
              sistema de controle ROS2 e IA embarcada. Mercado global de <strong className="text-primary">$78 bilhões</strong> em crescimento acelerado.
            </p>
            <p className="text-xs text-muted-foreground/70 mb-8">
              ELP Green Technology • Alessandria, Itália • Fundada 2020 • CNPJ 42.601.190/0001-70
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="btn-gold shimmer">
                <a href="https://wa.me/393501021359" target="_blank" rel="noopener noreferrer">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Falar com Investimentos
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button asChild className="btn-outline-gold">
                <Link to="/investidores">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Pitch Deck
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <TechLine />

      {/* Market Opportunity */}
      <section className="py-12 sm:py-16 relative overflow-hidden" style={{ background: "hsl(var(--card))", borderTop: "1px solid hsl(var(--border))" }}>
        <div className="container px-4 sm:px-6 relative" style={{ zIndex: 1 }}>
          <div className="text-center mb-10">
            <ScrollReveal direction="fade">
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">OPORTUNIDADE DE MERCADO</p>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-3">
                Um mercado de <span className="text-primary">$78 bilhões</span>
              </h2>
              <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                A robótica industrial cresce 12.3% ao ano. A reciclagem de pneus OTR é um segmento ainda inexplorado 
                com margem alta e barreira técnica elevada — exatamente onde o ORION opera.
              </p>
            </ScrollReveal>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {marketMetrics.map((m, i) => {
              const Icon = m.icon;
              return (
                <ScrollReveal key={m.label} direction="up" delay={i * 0.08}>
                  <div className="p-6 border border-border/20 bg-card/30 hover:border-primary/30 transition-all text-center group">
                    <Icon className="h-5 w-5 text-primary mx-auto mb-3 group-hover:scale-110 transition-transform" />
                    <p className="text-3xl font-bold text-primary mb-1">{m.value}</p>
                    <p className="text-xs font-medium text-foreground mb-1">{m.label}</p>
                    <p className="text-[10px] text-muted-foreground">{m.sub}</p>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      <TechLine />

      {/* Competitive KPIs */}
      <section className="py-12 sm:py-16 relative overflow-hidden" style={{ background: "hsl(var(--background))", borderTop: "1px solid hsl(var(--border))" }}>
        <div className="container px-4 sm:px-6 relative" style={{ zIndex: 1 }}>
          <div className="text-center mb-10">
            <ScrollReveal direction="fade">
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">VANTAGEM COMPETITIVA</p>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-3">
                Números que <span className="text-primary">comprovam</span>
              </h2>
            </ScrollReveal>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {competitiveEdge.map((kpi, i) => (
              <ScrollReveal key={kpi.label} direction="up" delay={i * 0.06}>
                <div className="p-6 border border-border/20 bg-card/30 hover:border-primary/40 transition-all group">
                  <p className="text-4xl font-bold text-primary mb-2 group-hover:scale-105 transition-transform origin-left">{kpi.metric}</p>
                  <p className="text-sm font-semibold text-foreground mb-1">{kpi.label}</p>
                  <p className="text-[11px] text-muted-foreground">{kpi.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <TechLine />

      {/* Technology Features */}
      <section className="py-12 sm:py-16 relative overflow-hidden" style={{ background: "hsl(var(--card))", borderTop: "1px solid hsl(var(--border))" }}>
        <GatewayBackground opacity={0.15} />
        <div className="container px-4 sm:px-6 relative" style={{ zIndex: 1 }}>
          <div className="text-center mb-12">
            <ScrollReveal direction="fade">
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">TECNOLOGIA PROPRIETÁRIA</p>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-4">
                Stack <span className="text-primary">completa</span> de automação
              </h2>
            </ScrollReveal>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {features.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <ScrollReveal key={feat.title} direction="up" delay={i * 0.05}>
                  <div className="group p-6 border border-border/20 bg-card/30 hover:border-primary/30 hover:bg-primary/[0.02] transition-all duration-500 h-full relative">
                    {"highlight" in feat && feat.highlight && (
                      <span className="absolute top-3 right-3 text-[9px] uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 border border-primary/20">
                        {feat.highlight}
                      </span>
                    )}
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

      {/* Tech Stack Architecture */}
      <section className="py-12 sm:py-16 relative overflow-hidden" style={{ background: "hsl(var(--background))", borderTop: "1px solid hsl(var(--border))" }}>
        <div className="container px-4 sm:px-6 relative" style={{ zIndex: 1 }}>
          <div className="text-center mb-10">
            <ScrollReveal direction="fade">
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">ARQUITETURA DO SISTEMA</p>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-3">
                Do <span className="text-primary">sensor</span> ao <span className="text-primary">cloud</span>
              </h2>
              <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                Arquitetura completa baseada em ROS2 — o padrão da indústria usado por Tesla, Boston Dynamics, 
                e 90% dos projetos de robótica autônoma no mundo.
              </p>
            </ScrollReveal>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {techStack.map((stack, i) => (
              <ScrollReveal key={stack.category} direction="up" delay={i * 0.06}>
                <div className="p-5 border border-border/20 bg-card/30 hover:border-primary/30 transition-all">
                  <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-3">{stack.category}</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {stack.items.map((item) => (
                      <span key={item} className="text-[10px] px-2.5 py-1 bg-primary/5 border border-primary/10 text-foreground/80 font-mono">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <TechLine />

      {/* Differentials */}
      <section className="py-12 sm:py-16 relative overflow-hidden" style={{ background: "hsl(var(--card))", borderTop: "1px solid hsl(var(--border))" }}>
        <div className="container px-4 sm:px-6 relative" style={{ zIndex: 1 }}>
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <ScrollReveal direction="up">
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-px w-8 bg-primary" />
                  <p className="text-primary uppercase tracking-[0.35em] text-[11px] font-medium">DIFERENCIAIS</p>
                </div>
                <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-6">
                  Por que investir no <span className="text-primary">ORION?</span>
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4 text-sm">
                  Tecnologia patenteada no segmento mais rentável da reciclagem industrial, 
                  com barreira técnica alta e primeira solução do mercado para pneus OTR gigantes.
                </p>
                <ul className="space-y-2 mb-8 text-xs text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <Target className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                    <span><strong className="text-foreground">First-mover advantage</strong> — Única solução robótica completa para OTR 57''-63''</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Award className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                    <span><strong className="text-foreground">IP forte</strong> — Patente própria + stack proprietária de IA</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <DollarSign className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                    <span><strong className="text-foreground">Modelo SaaS + Hardware</strong> — Receita recorrente de software + venda de linhas</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Users className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                    <span><strong className="text-foreground">Escalável</strong> — Plantas modulares replicáveis em qualquer geografia</span>
                  </li>
                </ul>
                <Button asChild className="btn-gold">
                  <a href="https://wa.me/393501021359" target="_blank" rel="noopener noreferrer">
                    <MessageSquare className="mr-2 h-4 w-4" />
                    Falar com Investimentos
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
      <section className="py-12 sm:py-16 relative overflow-hidden" style={{ background: "hsl(var(--background))", borderTop: "1px solid hsl(var(--border))" }}>
        <HeroThreeBackground />
        <div className="absolute inset-0 bg-background/60 z-[1]" />
        <div className="container relative px-4 sm:px-6" style={{ zIndex: 2 }}>
          <div className="max-w-2xl mx-auto text-center">
            <Factory className="h-10 w-10 text-primary mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-4">
              Invista na <span className="text-primary">revolução industrial</span>
            </h2>
            <p className="text-muted-foreground mb-3 text-sm">
              Robótica autônoma + IA + reciclagem sustentável = mercado de bilhões com impacto ambiental positivo.
            </p>
            <p className="text-xs text-muted-foreground/60 mb-8">
              Rodada aberta • Equity + Revenue Share • Due diligence disponível
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild className="btn-gold px-10 shimmer">
                <Link to="/contato?plano=enterprise">SOLICITAR PROPOSTA</Link>
              </Button>
              <Button asChild className="btn-outline-gold px-10">
                <Link to="/investidores">PITCH DECK COMPLETO</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
