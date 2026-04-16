import { MainLayout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { TechLine } from "@/components/ui/TechElements";
import { HeroThreeBackground } from "@/components/home/HeroThreeBackground";
import { GatewayBackground } from "@/components/ui/GatewayBackground";
import { ScrollReveal } from "@/components/ui/ScrollReveal";
import {
  Factory, ArrowRight, CheckCircle2, TrendingUp, Globe, BarChart3,
  Bot, Eye, Cpu, Radio, Shield, Zap, MessageSquare, DollarSign,
  Target, Award, Users, Layers, Briefcase, Leaf, Cog, Wrench,
  FileText, Clock, MapPin, Building2, Rocket, PieChart,
} from "lucide-react";

import pitchHeroImg from "@/assets/pitch-deck-hero.jpg";
import pitchOtrImg from "@/assets/pitch-otr-recycling.jpg";
import pitchTeamImg from "@/assets/pitch-team-tech.jpg";
import pitchGlobalImg from "@/assets/pitch-global-expansion.jpg";
import videoHeroAsset from "@/assets/video-hero.mp4.asset.json";
import videoInnovationAsset from "@/assets/video-innovation.mp4.asset.json";

/* ═══════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════ */

const slideNav = [
  "Visão Geral", "O Problema", "A Solução", "Mercado", "Tecnologia",
  "Modelo de Negócio", "Roadmap", "Equipe", "Financeiro", "Investimento",
];

const problemItems = [
  { icon: Cog, title: "Processo Manual", desc: "Pneus OTR gigantes (57''–63'') são reciclados manualmente em processos lentos, perigosos e ineficientes." },
  { icon: Shield, title: "Risco Ambiental", desc: "Milhões de toneladas de pneus OTR acumulam em aterros, liberando químicos tóxicos e ocupando espaço." },
  { icon: DollarSign, title: "Custo Elevado", desc: "Empresas de mineração gastam $3-8K por pneu em descarte, sem recuperação de material valioso." },
  { icon: Globe, title: "Sem Solução Escalável", desc: "Nenhuma empresa no mundo oferece reciclagem robótica automatizada para pneus OTR gigantes." },
];

const solutionFeatures = [
  { icon: Bot, title: "Robótica Autônoma", desc: "Braços robóticos com ROS2 e IA embarcada processam pneus OTR automaticamente." },
  { icon: Eye, title: "Visão Computacional", desc: "YOLOv8 com 99.2% de acurácia para inspeção e classificação em tempo real." },
  { icon: Radio, title: "IoT Industrial", desc: "SCADA, OPC-UA, MQTT e EtherCAT para telemetria completa da planta." },
  { icon: Wrench, title: "Manutenção Preditiva", desc: "IA prevê falhas com até 72h de antecedência, reduzindo downtime em 85%." },
  { icon: Zap, title: "Eficiência Energética", desc: "Redução de 23% nos custos energéticos via otimização inteligente." },
  { icon: Layers, title: "Plantas Modulares", desc: "Deploy rápido e escalável — da primeira planta piloto à rede global." },
];

const marketData = [
  { value: "$78B", label: "Robótica Industrial", sub: "CAGR 12.3% (2024-2030)", icon: Bot },
  { value: "$156B", label: "Reciclagem Global", sub: "Segmento OTR: +15%/ano", icon: Leaf },
  { value: "$42B", label: "Automação Industrial", sub: "CAGR 9.8%", icon: Cog },
  { value: "2.7M", label: "Robôs Instalados", sub: "IFR World Robotics 2025", icon: Globe },
];

const businessModel = [
  { icon: Factory, title: "Venda de Linhas", desc: "Comercialização de linhas robóticas completas para empresas de reciclagem e mineradoras.", revenue: "€1.2M-3.5M por linha" },
  { icon: Cpu, title: "SaaS Industrial", desc: "Licença mensal do Orion Platform para monitoramento, manutenção preditiva e Digital Twin.", revenue: "€8K-25K/mês" },
  { icon: Briefcase, title: "Consultoria & Deploy", desc: "Serviços de implantação, treinamento e otimização contínua das operações.", revenue: "€150K-400K por projeto" },
  { icon: Leaf, title: "Créditos de Carbono", desc: "Geração de créditos de carbono pela reciclagem sustentável — receita recorrente ESG.", revenue: "€50K-200K/ano por planta" },
];

const roadmap = [
  { year: "2024", phase: "Fase 1 — Validação", items: ["Protótipo funcional Smart OTR", "Patente depositada", "Primeiro cliente piloto", "MVP do Orion Platform"], status: "done" },
  { year: "2025", phase: "Fase 2 — Escala", items: ["Planta piloto em Alessandria, IT", "3 contratos assinados", "Certificações ISO 23482", "Rodada Seed €2M"], status: "current" },
  { year: "2026", phase: "Fase 3 — Expansão EU", items: ["5 plantas operacionais na Europa", "Receita €5M ARR", "Equipe de 40+ pessoas", "Parcerias com mineradoras"], status: "next" },
  { year: "2027-28", phase: "Fase 4 — Global", items: ["Expansão para Oriente Médio e LATAM", "20+ plantas operacionais", "Receita €25M ARR", "Rodada Series A €10M+"], status: "next" },
];

const financialProjections = [
  { year: "2025", revenue: "€800K", costs: "€1.2M", margin: "-50%", note: "Investimento inicial" },
  { year: "2026", revenue: "€5M", costs: "€3.2M", margin: "36%", note: "Break-even Q3" },
  { year: "2027", revenue: "€15M", costs: "€8M", margin: "47%", note: "Expansão agressiva" },
  { year: "2028", revenue: "€35M", costs: "€17M", margin: "51%", note: "Economia de escala" },
];

const investmentUse = [
  { label: "P&D e Engenharia", pct: 35, color: "hsl(var(--primary))" },
  { label: "Planta Piloto", pct: 25, color: "hsl(var(--primary) / 0.7)" },
  { label: "Comercial & Marketing", pct: 20, color: "hsl(var(--primary) / 0.5)" },
  { label: "Operações & Legal", pct: 12, color: "hsl(var(--primary) / 0.35)" },
  { label: "Reserva Estratégica", pct: 8, color: "hsl(var(--primary) / 0.2)" },
];

const teamMembers = [
  { name: "Ericson Falaworju", role: "CEO & Founder", desc: "Engenheiro de sistemas, especialista em IA e robótica industrial. +10 anos em automação." },
  { name: "Equipe Técnica", role: "CTO Office", desc: "Engenheiros ROS2, visão computacional, ML/AI e IoT industrial com experiência em projetos enterprise." },
  { name: "Consultores", role: "Advisory Board", desc: "Especialistas em reciclagem industrial, investidores do setor e mentores de scale-ups europeias." },
];

const competitiveAdvantages = [
  "Patente própria Smart OTR — única no mundo",
  "Stack ROS2 completa proprietária",
  "Visão computacional 99.2% acurácia",
  "First-mover em OTR robótico",
  "Modelo SaaS + Hardware recorrente",
  "Créditos de carbono como receita extra",
  "Plantas modulares replicáveis",
  "Conformidade ISO 23482 + VDA 5050",
];

/* ═══════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════ */

export default function Investidores() {
  return (
    <MainLayout>
      <SEO
        title="Pitch Deck — ORION Enterprise | Robótica Industrial & Smart OTR"
        description="Pitch Deck completo para investidores. Robótica industrial autônoma com tecnologia Smart OTR patenteada. Mercado de $78B, CAGR 12.3%. ELP Green Technology."
      />

      {/* ═══ SLIDE 1: HERO ═══ */}
      <section className="min-h-[70vh] flex items-center relative overflow-hidden">
        <img src={pitchHeroImg} alt="Robótica industrial ORION" className="absolute inset-0 w-full h-full object-cover opacity-25" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/40 to-background" style={{ zIndex: 1 }} />
        <div className="container py-16 sm:py-24 px-4 sm:px-6 relative" style={{ zIndex: 5 }}>
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px w-8 bg-primary" />
              <p className="text-primary uppercase tracking-[0.35em] text-[11px] font-medium">PITCH DECK • INVESTIDORES</p>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-serif text-foreground leading-tight mb-6">
              Orion <span className="text-primary">Enterprise</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl mb-3">
              A primeira plataforma robótica do mundo para reciclagem de pneus OTR gigantes.
            </p>
            <p className="text-sm text-muted-foreground/70 mb-2">
              ELP Green Technology S.R.L. • Alessandria, Itália • Fundada 2020
            </p>
            <p className="text-xs text-muted-foreground/50 mb-8">
              Robótica Industrial • Economia Circular • IA Embarcada • Indústria 4.0
            </p>

            {/* Navigation pills */}
            <div className="flex flex-wrap gap-2 mb-8">
              {slideNav.map((label, i) => (
                <a
                  key={label}
                  href={`#slide-${i}`}
                  className="text-[10px] px-3 py-1.5 border border-border/30 hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all"
                >
                  {i + 1}. {label}
                </a>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild className="btn-gold shimmer">
                <a href="https://wa.me/393501021359" target="_blank" rel="noopener noreferrer">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Contato para Investimento
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button asChild className="btn-outline-gold">
                <Link to="/solucoes/industria">
                  <Factory className="mr-2 h-4 w-4" />
                  Ver Soluções Enterprise
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <TechLine />

      {/* ═══ SLIDE 2: O PROBLEMA ═══ */}
      <section id="slide-1" className="py-14 sm:py-20 relative overflow-hidden" style={{ background: "hsl(var(--card))", borderTop: "1px solid hsl(var(--border))" }}>
        <div className="container px-4 sm:px-6 relative" style={{ zIndex: 1 }}>
          <div className="text-center mb-12">
            <ScrollReveal direction="fade">
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">O PROBLEMA</p>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-3">
                Um problema de <span className="text-primary">$156 bilhões</span>
              </h2>
              <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                Milhões de pneus OTR gigantes (usados em mineração, construção e agricultura) são descartados anualmente
                sem solução de reciclagem eficiente. É um problema ambiental e uma oportunidade de negócio massiva.
              </p>
            </ScrollReveal>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {problemItems.map((item, i) => {
              const Icon = item.icon;
              return (
                <ScrollReveal key={item.title} direction="up" delay={i * 0.08}>
                  <div className="p-6 border border-border/20 bg-card/30 hover:border-destructive/30 transition-all group">
                    <div className="h-10 w-10 border border-destructive/20 flex items-center justify-center mb-4 group-hover:border-destructive/50 transition-colors">
                      <Icon className="h-5 w-5 text-destructive" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mb-2">{item.title}</h3>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{item.desc}</p>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      <TechLine />

      {/* ═══ SLIDE 3: A SOLUÇÃO ═══ */}
      <section id="slide-2" className="py-14 sm:py-20 relative overflow-hidden" style={{ background: "hsl(var(--background))", borderTop: "1px solid hsl(var(--border))" }}>
        <GatewayBackground opacity={0.1} />
        <div className="container px-4 sm:px-6 relative" style={{ zIndex: 1 }}>
          <div className="grid lg:grid-cols-2 gap-12 items-center mb-12">
            <ScrollReveal direction="up">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">A SOLUÇÃO</p>
                <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-4">
                  Smart OTR <span className="text-primary">Robotic Line</span>
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  A primeira linha robótica autônoma do mundo projetada especificamente para reciclar pneus OTR gigantes
                  (57''–63''). Tecnologia patenteada que combina robótica industrial, visão computacional e IA embarcada
                  para transformar resíduos em recursos valiosos.
                </p>
                <div className="space-y-2 mb-6">
                  {["Processamento 3x mais rápido que métodos manuais", "99.2% de acurácia na inspeção automatizada", "ROI médio de 14 meses", "Redução de 85% no downtime operacional"].map(item => (
                    <div key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <div className="relative overflow-hidden border border-border/20">
                <img src={pitchOtrImg} alt="Reciclagem robótica OTR" className="w-full h-auto" loading="lazy" />
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-background/90 to-transparent p-4">
                  <p className="text-xs text-primary font-medium">Smart OTR Robotic Line</p>
                  <p className="text-[10px] text-muted-foreground">Tecnologia patenteada • ELP Green Technology</p>
                </div>
              </div>
            </ScrollReveal>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {solutionFeatures.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <ScrollReveal key={feat.title} direction="up" delay={i * 0.05}>
                  <div className="group p-5 border border-border/20 bg-card/30 hover:border-primary/30 transition-all h-full">
                    <Icon className="h-5 w-5 text-primary mb-3" />
                    <h3 className="text-xs font-semibold text-foreground mb-1.5">{feat.title}</h3>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">{feat.desc}</p>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      <TechLine />

      {/* ═══ VIDEO SHOWCASE ═══ */}
      <section className="py-14 sm:py-20 relative overflow-hidden" style={{ background: "hsl(var(--card))", borderTop: "1px solid hsl(var(--border))" }}>
        <div className="container px-4 sm:px-6 relative" style={{ zIndex: 1 }}>
          <div className="text-center mb-10">
            <ScrollReveal direction="fade">
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">DEMONSTRAÇÃO</p>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-3">
                Veja a <span className="text-primary">tecnologia</span> em ação
              </h2>
            </ScrollReveal>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <ScrollReveal direction="up">
              <div className="border border-border/20 overflow-hidden">
                <video
                  controls
                  poster={pitchHeroImg}
                  className="w-full aspect-video object-cover"
                  preload="metadata"
                >
                  <source src={videoHeroAsset.url} type="video/mp4" />
                </video>
                <div className="p-4">
                  <p className="text-sm font-semibold text-foreground">Visão Geral — ORION Enterprise</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Plataforma completa de robótica industrial e automação inteligente.</p>
                </div>
              </div>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <div className="border border-border/20 overflow-hidden">
                <video
                  controls
                  poster={pitchOtrImg}
                  className="w-full aspect-video object-cover"
                  preload="metadata"
                >
                  <source src={videoInnovationAsset.url} type="video/mp4" />
                </video>
                <div className="p-4">
                  <p className="text-sm font-semibold text-foreground">Inovação — Smart OTR Technology</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Reciclagem autônoma de pneus OTR gigantes com IA e visão computacional.</p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <TechLine />

      {/* ═══ SLIDE 4: MERCADO ═══ */}
      <section id="slide-3" className="py-14 sm:py-20 relative overflow-hidden" style={{ background: "hsl(var(--background))", borderTop: "1px solid hsl(var(--border))" }}>
        <div className="container px-4 sm:px-6 relative" style={{ zIndex: 1 }}>
          <div className="text-center mb-12">
            <ScrollReveal direction="fade">
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">OPORTUNIDADE DE MERCADO</p>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-3">
                TAM de <span className="text-primary">$78 bilhões</span>
              </h2>
              <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                Três mega-tendências convergem: robótica industrial em crescimento exponencial, regulações ambientais
                cada vez mais rigorosas, e a demanda por economia circular na indústria pesada.
              </p>
            </ScrollReveal>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {marketData.map((m, i) => {
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

          <ScrollReveal direction="up" delay={0.2}>
            <div className="relative overflow-hidden border border-border/20">
              <img src={pitchGlobalImg} alt="Expansão global Smart Factories" className="w-full h-64 md:h-80 object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent" />
              <div className="absolute bottom-0 inset-x-0 p-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-lg font-bold text-primary">€8B</p>
                    <p className="text-[10px] text-muted-foreground">SAM — Europa & MENA</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-primary">€1.2B</p>
                    <p className="text-[10px] text-muted-foreground">SOM — Reciclagem OTR</p>
                  </div>
                  <div>
                    <p className="text-lg font-bold text-primary">15%</p>
                    <p className="text-[10px] text-muted-foreground">Crescimento Anual OTR</p>
                  </div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <TechLine />

      {/* ═══ SLIDE 5: TECNOLOGIA ═══ */}
      <section id="slide-4" className="py-14 sm:py-20 relative overflow-hidden" style={{ background: "hsl(var(--card))", borderTop: "1px solid hsl(var(--border))" }}>
        <GatewayBackground opacity={0.12} />
        <div className="container px-4 sm:px-6 relative" style={{ zIndex: 1 }}>
          <div className="text-center mb-12">
            <ScrollReveal direction="fade">
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">STACK TECNOLÓGICA</p>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-3">
                Tecnologia <span className="text-primary">proprietária</span>
              </h2>
            </ScrollReveal>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <ScrollReveal direction="up">
              <div className="relative overflow-hidden border border-border/20">
                <img src={pitchTeamImg} alt="Sala de controle ORION" className="w-full h-auto" loading="lazy" />
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-background/90 to-transparent p-4">
                  <p className="text-xs text-primary font-medium">Centro de Controle ORION</p>
                  <p className="text-[10px] text-muted-foreground">Monitoramento em tempo real via Digital Twin</p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.1}>
              <div className="space-y-3">
                {[
                  { cat: "Cérebro", items: ["ROS2 Humble/Jazzy", "Orion Neural Engine", "TensorFlow + YOLOv8", "Gemini AI"] },
                  { cat: "Protocolos Industriais", items: ["OPC-UA (IEC 62541)", "Modbus TCP/RTU", "PROFINET", "EtherCAT"] },
                  { cat: "Conectividade", items: ["Wi-Fi 6", "5G", "BLE", "MQTT/WSS", "CAN bus"] },
                  { cat: "Segurança", items: ["ISO 23482", "VDA 5050 v2.0", "Emergency Stop Global", "TLS 1.3"] },
                  { cat: "Monitoramento", items: ["Grafana", "Node-RED", "Foxglove Studio", "Digital Twin AAS"] },
                ].map(stack => (
                  <div key={stack.cat} className="p-4 border border-border/20 bg-card/30 hover:border-primary/20 transition-all">
                    <h3 className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2">{stack.cat}</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {stack.items.map(item => (
                        <span key={item} className="text-[9px] px-2 py-0.5 bg-primary/5 border border-primary/10 text-foreground/80 font-mono">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <TechLine />

      {/* ═══ SLIDE 6: MODELO DE NEGÓCIO ═══ */}
      <section id="slide-5" className="py-14 sm:py-20 relative overflow-hidden" style={{ background: "hsl(var(--background))", borderTop: "1px solid hsl(var(--border))" }}>
        <div className="container px-4 sm:px-6 relative" style={{ zIndex: 1 }}>
          <div className="text-center mb-12">
            <ScrollReveal direction="fade">
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">MODELO DE NEGÓCIO</p>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-3">
                Receita <span className="text-primary">recorrente</span> + hardware
              </h2>
              <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                Modelo híbrido SaaS + Hardware com 4 fontes de receita complementares, garantindo previsibilidade
                e crescimento acelerado.
              </p>
            </ScrollReveal>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {businessModel.map((item, i) => {
              const Icon = item.icon;
              return (
                <ScrollReveal key={item.title} direction="up" delay={i * 0.08}>
                  <div className="p-6 border border-border/20 bg-card/30 hover:border-primary/30 transition-all group h-full">
                    <div className="flex items-start gap-4">
                      <div className="h-10 w-10 border border-primary/20 flex items-center justify-center flex-shrink-0 group-hover:border-primary/50 transition-colors">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground mb-1">{item.title}</h3>
                        <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">{item.desc}</p>
                        <p className="text-xs font-bold text-primary">{item.revenue}</p>
                      </div>
                    </div>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      <TechLine />

      {/* ═══ SLIDE 7: ROADMAP ═══ */}
      <section id="slide-6" className="py-14 sm:py-20 relative overflow-hidden" style={{ background: "hsl(var(--card))", borderTop: "1px solid hsl(var(--border))" }}>
        <div className="container px-4 sm:px-6 relative" style={{ zIndex: 1 }}>
          <div className="text-center mb-12">
            <ScrollReveal direction="fade">
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">ROADMAP</p>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-3">
                Da validação à <span className="text-primary">escala global</span>
              </h2>
            </ScrollReveal>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {roadmap.map((phase, i) => (
              <ScrollReveal key={phase.year} direction="up" delay={i * 0.08}>
                <div className={`p-6 border h-full transition-all ${
                  phase.status === "current"
                    ? "border-primary/50 bg-primary/5"
                    : phase.status === "done"
                      ? "border-border/30 bg-card/50"
                      : "border-border/20 bg-card/30"
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="text-lg font-bold text-primary">{phase.year}</span>
                    {phase.status === "current" && (
                      <span className="text-[8px] uppercase tracking-wider bg-primary/20 text-primary px-2 py-0.5 ml-auto">ATUAL</span>
                    )}
                    {phase.status === "done" && (
                      <CheckCircle2 className="h-3.5 w-3.5 text-primary ml-auto" />
                    )}
                  </div>
                  <h3 className="text-xs font-semibold text-foreground mb-3">{phase.phase}</h3>
                  <ul className="space-y-1.5">
                    {phase.items.map(item => (
                      <li key={item} className="flex items-start gap-2 text-[10px] text-muted-foreground">
                        <div className="w-1 h-1 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <TechLine />

      {/* ═══ SLIDE 8: EQUIPE ═══ */}
      <section id="slide-7" className="py-14 sm:py-20 relative overflow-hidden" style={{ background: "hsl(var(--background))", borderTop: "1px solid hsl(var(--border))" }}>
        <div className="container px-4 sm:px-6 relative" style={{ zIndex: 1 }}>
          <div className="text-center mb-12">
            <ScrollReveal direction="fade">
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">EQUIPE</p>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-3">
                Quem está <span className="text-primary">construindo</span>
              </h2>
            </ScrollReveal>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            {teamMembers.map((member, i) => (
              <ScrollReveal key={member.name} direction="up" delay={i * 0.08}>
                <div className="p-6 border border-border/20 bg-card/30 hover:border-primary/30 transition-all text-center h-full">
                  <div className="h-16 w-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                    <Users className="h-7 w-7 text-primary" />
                  </div>
                  <h3 className="text-sm font-semibold text-foreground mb-1">{member.name}</h3>
                  <p className="text-[10px] uppercase tracking-wider text-primary mb-3">{member.role}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{member.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      <TechLine />

      {/* ═══ SLIDE 9: FINANCEIRO ═══ */}
      <section id="slide-8" className="py-14 sm:py-20 relative overflow-hidden" style={{ background: "hsl(var(--card))", borderTop: "1px solid hsl(var(--border))" }}>
        <div className="container px-4 sm:px-6 relative" style={{ zIndex: 1 }}>
          <div className="text-center mb-12">
            <ScrollReveal direction="fade">
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">PROJEÇÕES FINANCEIRAS</p>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-3">
                Caminho para <span className="text-primary">€35M ARR</span>
              </h2>
            </ScrollReveal>
          </div>

          {/* Projections table */}
          <ScrollReveal direction="up">
            <div className="border border-border/20 overflow-hidden mb-10">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-primary/5 border-b border-border/20">
                      <th className="text-left p-4 font-semibold text-foreground">Ano</th>
                      <th className="text-right p-4 font-semibold text-foreground">Receita</th>
                      <th className="text-right p-4 font-semibold text-foreground">Custos</th>
                      <th className="text-right p-4 font-semibold text-foreground">Margem</th>
                      <th className="text-left p-4 font-semibold text-foreground">Nota</th>
                    </tr>
                  </thead>
                  <tbody>
                    {financialProjections.map(row => (
                      <tr key={row.year} className="border-b border-border/10 hover:bg-primary/[0.02]">
                        <td className="p-4 font-bold text-primary">{row.year}</td>
                        <td className="p-4 text-right text-foreground font-mono">{row.revenue}</td>
                        <td className="p-4 text-right text-muted-foreground font-mono">{row.costs}</td>
                        <td className={`p-4 text-right font-mono font-bold ${row.margin.startsWith("-") ? "text-destructive" : "text-primary"}`}>{row.margin}</td>
                        <td className="p-4 text-muted-foreground">{row.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </ScrollReveal>

          {/* Use of funds */}
          <ScrollReveal direction="up" delay={0.1}>
            <div className="border border-border/20 p-6">
              <h3 className="text-sm font-semibold text-foreground mb-6 flex items-center gap-2">
                <PieChart className="h-4 w-4 text-primary" /> Uso dos Recursos — Rodada Seed €2M
              </h3>
              <div className="space-y-3">
                {investmentUse.map(item => (
                  <div key={item.label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-foreground">{item.label}</span>
                      <span className="text-primary font-bold">{item.pct}%</span>
                    </div>
                    <div className="h-2 bg-muted/30 overflow-hidden">
                      <div className="h-full transition-all" style={{ width: `${item.pct}%`, background: item.color }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <TechLine />

      {/* ═══ SLIDE 10: INVESTIMENTO / CTA ═══ */}
      <section id="slide-9" className="py-14 sm:py-20 relative overflow-hidden" style={{ background: "hsl(var(--background))", borderTop: "1px solid hsl(var(--border))" }}>
        <HeroThreeBackground />
        <div className="absolute inset-0 bg-background/60 z-[1]" />
        <div className="container px-4 sm:px-6 relative" style={{ zIndex: 2 }}>
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <ScrollReveal direction="up">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">OPORTUNIDADE DE INVESTIMENTO</p>
                <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-4">
                  Rodada <span className="text-primary">Seed</span> — €2M
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  Estamos levantando €2M em rodada Seed para construir a planta piloto em Alessandria,
                  completar as certificações e fechar os primeiros 3 contratos comerciais.
                </p>

                <div className="space-y-3 mb-8">
                  {[
                    { icon: Target, label: "Valuation", value: "€8M pre-money" },
                    { icon: DollarSign, label: "Rodada", value: "€2M Seed" },
                    { icon: Building2, label: "Estrutura", value: "Equity + Revenue Share" },
                    { icon: MapPin, label: "Sede", value: "Alessandria, Piemonte, Itália" },
                    { icon: Rocket, label: "Meta 2026", value: "5 plantas • €5M ARR" },
                    { icon: FileText, label: "Due Diligence", value: "Disponível sob NDA" },
                  ].map(item => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="flex items-center gap-3 p-3 border border-border/20 bg-card/30">
                        <Icon className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="text-xs text-muted-foreground">{item.label}</span>
                        <span className="text-xs font-bold text-foreground ml-auto">{item.value}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button asChild className="btn-gold shimmer">
                    <a href="https://wa.me/393501021359" target="_blank" rel="noopener noreferrer">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Solicitar Reunião
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </a>
                  </Button>
                  <Button asChild className="btn-outline-gold">
                    <Link to="/contato?plano=enterprise">
                      <FileText className="mr-2 h-4 w-4" />
                      Solicitar NDA & Docs
                    </Link>
                  </Button>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.1}>
              <div className="space-y-3">
                <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-4">Vantagens Competitivas</h3>
                {competitiveAdvantages.map(item => (
                  <div key={item} className="flex items-center gap-3 p-3 bg-card/30 border border-border/20 hover:border-primary/30 transition-all">
                    <CheckCircle2 className="h-4 w-4 text-primary flex-shrink-0" />
                    <span className="text-xs text-foreground">{item}</span>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Footer badges */}
      <section className="py-6" style={{ background: "hsl(var(--card))", borderTop: "1px solid hsl(var(--border))" }}>
        <div className="container px-4 sm:px-6">
          <div className="flex flex-wrap gap-2 justify-center">
            {["Robótica Industrial", "Smart OTR (Patente)", "ROS2", "Visão Computacional", "Indústria 4.0", "Economia Circular", "ESG", "ISO 23482"].map(tag => (
              <span key={tag} className="text-[9px] px-3 py-1 border border-border/20 text-muted-foreground font-mono">
                {tag}
              </span>
            ))}
          </div>
          <p className="text-[9px] text-muted-foreground/50 text-center mt-4">
            © 2024–2026 ELP Green Technology S.R.L. • Alessandria, Piemonte, Itália • CNPJ 42.601.190/0001-70 •
            Este material é confidencial e destinado exclusivamente a investidores qualificados.
          </p>
        </div>
      </section>
    </MainLayout>
  );
}
