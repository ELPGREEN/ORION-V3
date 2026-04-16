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
  Users, Layers, Truck, ScanLine, Paintbrush,
  PackageCheck, Workflow, BrainCircuit, Gauge,
  CircuitBoard, Radar, Activity, Settings,
} from "lucide-react";

/* ─── Módulos Industriais (cobertura completa) ─── */
const industrialModules = [
  {
    icon: Bot,
    title: "Robótica Autônoma",
    desc: "AGVs, AMRs e manipuladores com ROS2 Humble/Jazzy, SLAM, Nav2 e planejamento de trajetória em tempo real.",
    tags: ["ROS2", "Nav2", "SLAM"],
  },
  {
    icon: Eye,
    title: "Visão Computacional",
    desc: "Inspeção automatizada com YOLOv8, detecção de defeitos, leitura de códigos e classificação com 99.2% de acurácia.",
    tags: ["YOLOv8", "OCR", "Classificação"],
  },
  {
    icon: ScanLine,
    title: "Inspeção de Qualidade",
    desc: "Controle dimensional, detecção de trincas e análise de superfície com câmeras industriais e sensores 3D.",
    tags: ["3D Vision", "Metrologia", "SPC"],
  },
  {
    icon: Wrench,
    title: "Soldagem Robótica",
    desc: "Soldagem MIG/MAG/TIG automatizada com controle adaptativo de parâmetros e rastreamento de junta em tempo real.",
    tags: ["MIG/MAG", "Seam Tracking", "Adaptativo"],
  },
  {
    icon: Paintbrush,
    title: "Pintura Industrial",
    desc: "Cabines robóticas com otimização de trajetória, controle de espessura e redução de 30% no desperdício de tinta.",
    tags: ["Trajetória 3D", "CFD", "Controle"],
  },
  {
    icon: PackageCheck,
    title: "Paletização & Embalagem",
    desc: "Empilhamento inteligente, pick-and-place com grippers adaptativos e integração com linhas de embalagem.",
    tags: ["Pick & Place", "Gripper", "Pattern"],
  },
  {
    icon: Cog,
    title: "Montagem Automatizada",
    desc: "Linhas de montagem flexíveis com robôs colaborativos (cobots), controle de torque e verificação de encaixe.",
    tags: ["Cobots", "Torque", "Poka-yoke"],
  },
  {
    icon: Radio,
    title: "SCADA & IoT Industrial",
    desc: "OPC-UA, Modbus TCP/RTU, PROFINET e EtherCAT integrados. Telemetria em tempo real via MQTT/WSS.",
    tags: ["OPC-UA", "MQTT", "EtherCAT"],
  },
  {
    icon: BrainCircuit,
    title: "Manutenção Preditiva",
    desc: "IA analisa vibrações, temperatura e padrões de desgaste para prever falhas com até 72h de antecedência.",
    tags: ["Vibração", "ML", "Previsão"],
  },
  {
    icon: Workflow,
    title: "Digital Twin & MES",
    desc: "Gêmeo digital em tempo real com Node-RED, Foxglove e AAS. Integração MES/ERP para rastreabilidade total.",
    tags: ["Digital Twin", "MES", "AAS"],
  },
  {
    icon: Shield,
    title: "Segurança Industrial",
    desc: "VDA 5050, parada de emergência global, zonas de segurança dinâmicas e conformidade ISO 23482/10218.",
    tags: ["VDA 5050", "E-Stop", "ISO"],
  },
  {
    icon: Zap,
    title: "Eficiência Energética",
    desc: "Otimização de consumo via IA com redução média de 23% nos custos energéticos e relatórios ESG automáticos.",
    tags: ["ESG", "Otimização", "Relatórios"],
  },
];

/* ─── Setores atendidos ─── */
const sectors = [
  { icon: Truck, name: "Mineração & OTR", desc: "Reciclagem robótica de pneus OTR gigantes (57''–63'') com tecnologia patenteada Smart OTR." },
  { icon: Factory, name: "Automotivo", desc: "Soldagem, pintura, montagem e inspeção em linhas de produção automotiva." },
  { icon: CircuitBoard, name: "Eletrônicos", desc: "Pick-and-place SMD, inspeção AOI e montagem de PCBs com precisão micrométrica." },
  { icon: Activity, name: "Farmacêutico", desc: "Ambientes cleanroom, rastreabilidade lot-level, compliance GMP e serialização." },
  { icon: PackageCheck, name: "Logística", desc: "AGVs de armazém, sorting automatizado, paletização e integração WMS." },
  { icon: Settings, name: "Metalurgia", desc: "Fundição assistida, tratamento térmico monitorado e controle de qualidade metalográfico." },
];

/* ─── KPIs ─── */
const kpis = [
  { metric: "99.2%", label: "Acurácia de inspeção", desc: "Visão computacional de alta precisão" },
  { metric: "<50ms", label: "Latência de controle", desc: "Tempo real via EtherCAT + ROS2" },
  { metric: "72h", label: "Previsão de falhas", desc: "Manutenção preditiva com IA" },
  { metric: "23%", label: "Redução energética", desc: "Otimização inteligente de consumo" },
  { metric: "6+", label: "Protocolos industriais", desc: "OPC-UA, Modbus, PROFINET, CAN, MQTT, EtherCAT" },
  { metric: "ROI 14mo", label: "Retorno do investimento", desc: "Payback médio de projetos" },
];

/* ─── Tech Stack ─── */
const techStack = [
  { category: "Inteligência", items: ["ROS2 Humble/Jazzy", "Orion Neural Engine", "TensorFlow", "YOLOv8", "MediaPipe"] },
  { category: "Fieldbus", items: ["CAN bus", "EtherCAT", "PROFINET", "Modbus TCP/RTU", "IO-Link"] },
  { category: "Conectividade", items: ["Wi-Fi 6", "5G", "Bluetooth BLE", "MQTT/WSS", "WebRTC"] },
  { category: "Protocolos", items: ["OPC-UA (IEC 62541)", "VDA 5050 v2.0", "Nav2", "TF2", "DDS"] },
  { category: "Monitoramento", items: ["Grafana", "Node-RED", "Foxglove Studio", "Digital Twin AAS"] },
  { category: "Segurança", items: ["ISO 23482", "ISO 10218", "E-Stop Global", "GDPR/LGPD", "TLS 1.3"] },
];

export default function SolucoesIndustria() {
  return (
    <MainLayout>
      <SEO
        title="Soluções para Indústria — Robótica, Automação & Indústria 4.0 | ORION"
        description="Automação robótica completa: visão computacional, soldagem, pintura, inspeção, paletização, manutenção preditiva, SCADA/IoT e Smart OTR. Tecnologia ROS2 + IA."
      />

      {/* ── Hero ── */}
      <section className="min-h-[50vh] flex items-center relative overflow-hidden" style={{ background: "hsl(var(--background))" }}>
        <HeroThreeBackground />
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/30 to-background/80 z-[1]" />
        <div className="container py-14 sm:py-20 px-4 sm:px-6 relative z-[5]">
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px w-8 bg-primary" />
              <p className="text-primary uppercase tracking-[0.35em] text-[11px] font-medium">AUTOMAÇÃO INDUSTRIAL • INDÚSTRIA 4.0</p>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-serif text-foreground leading-tight mb-6">
              Soluções <span className="text-primary">Industriais</span> Completas
            </h1>
            <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-xl mb-4">
              Da <strong className="text-foreground">robótica autônoma</strong> à <strong className="text-foreground">manutenção preditiva</strong>,
              o ORION cobre toda a cadeia de automação industrial com IA embarcada, ROS2 e protocolos industriais nativos.
            </p>
            <p className="text-xs text-muted-foreground/70 mb-8">
              Soldagem • Montagem • Pintura • Inspeção • Paletização • SCADA • IoT • OTR
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild className="btn-gold shimmer">
                <Link to="/contato?plano=enterprise">
                  <MessageSquare className="mr-2 h-4 w-4" />
                  Solicitar Proposta
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild className="btn-outline-gold">
                <Link to="/investidores">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Para Investidores
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <TechLine />

      {/* ── Módulos Industriais ── */}
      <section className="py-12 sm:py-16 relative overflow-hidden" style={{ background: "hsl(var(--card))", borderTop: "1px solid hsl(var(--border))" }}>
        <GatewayBackground opacity={0.15} />
        <div className="container px-4 sm:px-6 relative z-[1]">
          <div className="text-center mb-12">
            <ScrollReveal direction="fade">
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">MÓDULOS DE AUTOMAÇÃO</p>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-4">
                Cobertura <span className="text-primary">industrial</span> completa
              </h2>
              <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                12 módulos especializados que cobrem desde a robótica de chão de fábrica até o monitoramento em nuvem.
              </p>
            </ScrollReveal>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {industrialModules.map((mod, i) => {
              const Icon = mod.icon;
              return (
                <ScrollReveal key={mod.title} direction="up" delay={i * 0.04}>
                  <div className="group p-6 border border-border/20 bg-card/30 hover:border-primary/30 hover:bg-primary/[0.02] transition-all duration-500 h-full">
                    <div className="h-10 w-10 border border-primary/20 flex items-center justify-center mb-4 group-hover:border-primary/50 transition-colors">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <h3 className="text-sm font-semibold text-foreground mb-2">{mod.title}</h3>
                    <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">{mod.desc}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {mod.tags.map((tag) => (
                        <span key={tag} className="text-[9px] px-2 py-0.5 bg-primary/5 border border-primary/10 text-foreground/70 font-mono">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      <TechLine />

      {/* ── Setores Atendidos ── */}
      <section className="py-12 sm:py-16 relative overflow-hidden" style={{ background: "hsl(var(--background))", borderTop: "1px solid hsl(var(--border))" }}>
        <div className="container px-4 sm:px-6 relative z-[1]">
          <div className="text-center mb-10">
            <ScrollReveal direction="fade">
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">SETORES</p>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-3">
                Onde o ORION <span className="text-primary">atua</span>
              </h2>
              <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                Soluções modulares adaptáveis a múltiplos setores industriais, do mineração ao farmacêutico.
              </p>
            </ScrollReveal>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {sectors.map((sector, i) => {
              const Icon = sector.icon;
              return (
                <ScrollReveal key={sector.name} direction="up" delay={i * 0.06}>
                  <div className="p-6 border border-border/20 bg-card/30 hover:border-primary/30 transition-all group">
                    <Icon className="h-6 w-6 text-primary mb-3 group-hover:scale-110 transition-transform" />
                    <h3 className="text-sm font-semibold text-foreground mb-2">{sector.name}</h3>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{sector.desc}</p>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      <TechLine />

      {/* ── KPIs ── */}
      <section className="py-12 sm:py-16 relative overflow-hidden" style={{ background: "hsl(var(--card))", borderTop: "1px solid hsl(var(--border))" }}>
        <div className="container px-4 sm:px-6 relative z-[1]">
          <div className="text-center mb-10">
            <ScrollReveal direction="fade">
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">PERFORMANCE</p>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-3">
                Resultados <span className="text-primary">comprovados</span>
              </h2>
            </ScrollReveal>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {kpis.map((kpi, i) => (
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

      {/* ── Tech Stack ── */}
      <section className="py-12 sm:py-16 relative overflow-hidden" style={{ background: "hsl(var(--background))", borderTop: "1px solid hsl(var(--border))" }}>
        <div className="container px-4 sm:px-6 relative z-[1]">
          <div className="text-center mb-10">
            <ScrollReveal direction="fade">
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">ARQUITETURA DO SISTEMA</p>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-3">
                Do <span className="text-primary">sensor</span> ao <span className="text-primary">cloud</span>
              </h2>
              <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                Stack completa baseada em ROS2, o padrão da indústria usado pela Tesla, Boston Dynamics e líderes globais de robótica.
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

      {/* ── Smart OTR Highlight ── */}
      <section className="py-12 sm:py-16 relative overflow-hidden" style={{ background: "hsl(var(--card))", borderTop: "1px solid hsl(var(--border))" }}>
        <div className="container px-4 sm:px-6 relative z-[1]">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <ScrollReveal direction="up">
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="h-px w-8 bg-primary" />
                  <p className="text-primary uppercase tracking-[0.35em] text-[11px] font-medium">TECNOLOGIA PATENTEADA</p>
                </div>
                <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-6">
                  Smart Robotic <span className="text-primary">OTR Line</span>
                </h2>
                <p className="text-muted-foreground leading-relaxed mb-4 text-sm">
                  A primeira linha robótica do mundo projetada exclusivamente para reciclagem de pneus OTR gigantes da mineração (57''–63''),
                  com tecnologia proprietária e patenteada.
                </p>
                <ul className="space-y-2 mb-8 text-xs text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                    <span><strong className="text-foreground">First-mover advantage</strong> — Única solução robótica completa para OTR 57''-63''</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                    <span><strong className="text-foreground">Capacidade:</strong> 4 pneus/hora com 99.8% de recuperação de material</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                    <span><strong className="text-foreground">Outputs:</strong> Granulado de borracha (65%), aço (25%), fibra têxtil (10%)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary mt-0.5 flex-shrink-0" />
                    <span><strong className="text-foreground">Plantas modulares</strong> — Replicáveis em qualquer geografia</span>
                  </li>
                </ul>
                <Button asChild className="btn-outline-gold">
                  <Link to="/investidores">
                    Saiba Mais sobre a Smart OTR
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.1}>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { val: "4/hr", lab: "Pneus processados" },
                  { val: "63''", lab: "Diâmetro máximo" },
                  { val: "99.8%", lab: "Taxa de recuperação" },
                  { val: "100%", lab: "Automação" },
                  { val: "3 outputs", lab: "Borracha, aço, fibra" },
                  { val: "ROI 14mo", lab: "Retorno do investimento" },
                ].map((item) => (
                  <div key={item.lab} className="p-4 bg-card/30 border border-border/20 hover:border-primary/30 transition-all text-center">
                    <p className="text-2xl font-bold text-primary mb-1">{item.val}</p>
                    <p className="text-[10px] text-muted-foreground">{item.lab}</p>
                  </div>
                ))}
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <TechLine />

      {/* ── CTA ── */}
      <section className="py-12 sm:py-16 relative overflow-hidden" style={{ background: "hsl(var(--background))", borderTop: "1px solid hsl(var(--border))" }}>
        <HeroThreeBackground />
        <div className="absolute inset-0 bg-background/60 z-[1]" />
        <div className="container relative px-4 sm:px-6 z-[2]">
          <div className="max-w-2xl mx-auto text-center">
            <Factory className="h-10 w-10 text-primary mx-auto mb-6" />
            <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-4">
              Transforme sua <span className="text-primary">operação industrial</span>
            </h2>
            <p className="text-muted-foreground mb-3 text-sm">
              Robótica autônoma, visão computacional, manutenção preditiva e IoT industrial — tudo integrado numa plataforma única.
            </p>
            <p className="text-xs text-muted-foreground/60 mb-8">
              Consultoria gratuita • Projetos customizados • Suporte 24/7
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild className="btn-gold px-10 shimmer">
                <Link to="/contato?plano=enterprise">SOLICITAR PROPOSTA</Link>
              </Button>
              <Button asChild className="btn-outline-gold px-10">
                <Link to="/investidores">PARA INVESTIDORES</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </MainLayout>
  );
}
