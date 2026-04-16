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
  Car, Pill, Package, Warehouse, Pickaxe, Hammer, Droplets,
  Flame, CircuitBoard, Truck, Wind, Heart,
} from "lucide-react";

import pitchHeroImg from "@/assets/pitch-deck-hero.jpg";
import pitchOtrImg from "@/assets/pitch-otr-recycling.jpg";
import pitchTeamImg from "@/assets/pitch-team-tech.jpg";
import pitchGlobalImg from "@/assets/pitch-global-expansion.jpg";
import pitchAutoImg from "@/assets/pitch-automotive.jpg";
import pitchPharmaImg from "@/assets/pitch-pharma.jpg";
import pitchFoodImg from "@/assets/pitch-food.jpg";
import pitchLogisticsImg from "@/assets/pitch-logistics.jpg";
import videoHeroAsset from "@/assets/video-hero.mp4.asset.json";
import videoInnovationAsset from "@/assets/video-innovation.mp4.asset.json";
import videoPlatformAsset from "@/assets/video-orion-platform.mp4.asset.json";
import videoOtrAsset from "@/assets/video-smart-otr.mp4.asset.json";

/* ═══════════════════════════════════════════════════
   DATA
   ═══════════════════════════════════════════════════ */

const slideNav = [
  "Visão Geral", "O Problema", "Setores", "A Plataforma", "Tecnologia",
  "Casos de Uso", "Modelo de Negócio", "Roadmap", "Financeiro", "Investimento",
];

const problemItems = [
  { icon: Cog, title: "Fragmentação de Sistemas", desc: "Indústrias gastam milhões integrando sistemas incompatíveis de diferentes fornecedores — PLCs, SCADA, MES, ERP — sem interoperabilidade real." },
  { icon: Shield, title: "Segurança Desatualizada", desc: "70% das fábricas usam protocolos sem criptografia. Ataques cibernéticos a sistemas industriais cresceram 300% desde 2020." },
  { icon: DollarSign, title: "Downtime Caro", desc: "Paradas não planejadas custam em média $260K/hora na manufatura. A maioria das fábricas ainda usa manutenção reativa." },
  { icon: Globe, title: "Sem IA Integrada", desc: "Menos de 15% das fábricas utilizam IA para decisões operacionais. A barreira de entrada técnica é altíssima." },
];

const industries = [
  { icon: Car, title: "Automotiva", desc: "Linhas de montagem, soldagem robótica, pintura automatizada, inspeção de qualidade e rastreabilidade de peças.", tam: "$28B", img: pitchAutoImg },
  { icon: Pill, title: "Farmacêutica & Saúde", desc: "Clean rooms automatizadas, manipulação de fármacos, controle de qualidade GMP, rastreabilidade e compliance FDA/EMA.", tam: "$12B", img: pitchPharmaImg },
  { icon: Package, title: "Alimentos & Bebidas", desc: "Processamento, embalagem, controle de qualidade, higiene automatizada e rastreabilidade HACCP/ISO 22000.", tam: "$18B", img: pitchFoodImg },
  { icon: Warehouse, title: "Logística & Armazéns", desc: "AMRs autônomos, picking robotizado, sorting, gestão de inventário em tempo real e otimização de rotas.", tam: "$15B", img: pitchLogisticsImg },
  { icon: Pickaxe, title: "Mineração & Energia", desc: "Veículos autônomos, monitoramento de equipamentos pesados, segurança de minas e manutenção preditiva.", tam: "$8B", img: pitchOtrImg },
  { icon: Leaf, title: "Reciclagem & Economia Circular", desc: "Smart OTR (patente própria), triagem robótica, processamento de resíduos e recuperação de materiais com IA.", tam: "$6B", img: pitchOtrImg, highlight: "Patente Própria" },
  { icon: Hammer, title: "Construção & Infraestrutura", desc: "Robôs de demolição, drones de inspeção, impressão 3D de concreto, monitoramento estrutural com IoT.", tam: "$5B" },
  { icon: Droplets, title: "Petróleo, Gás & Química", desc: "Inspeção de tubulações, monitoramento de corrosão, controle de processos químicos e segurança de plantas.", tam: "$10B" },
  { icon: CircuitBoard, title: "Eletrônicos & Semicondutores", desc: "Pick-and-place de alta precisão, soldagem SMD, teste automatizado e clean room management.", tam: "$9B" },
  { icon: Wind, title: "Energia Renovável", desc: "Inspeção de turbinas eólicas com drones, manutenção de painéis solares e monitoramento de parques eólicos.", tam: "$4B" },
];

const platformCapabilities = [
  { icon: Bot, title: "Controle Robótico Universal", desc: "ROS2 Humble/Jazzy para qualquer robô industrial — braços, AGVs, AMRs, drones e cobots de qualquer fabricante." },
  { icon: Eye, title: "Visão Computacional", desc: "YOLOv8/v9, segmentação semântica e OCR para inspeção de qualidade, detecção de defeitos e leitura de códigos em qualquer setor." },
  { icon: Cpu, title: "Orion Neural Engine", desc: "Cérebro central com IA que orquestra decisões, aprende padrões da planta e otimiza processos automaticamente." },
  { icon: Radio, title: "Protocolos Industriais Completos", desc: "OPC-UA, Modbus TCP/RTU, PROFINET, EtherCAT, CAN bus, BACnet — conecta com qualquer equipamento existente." },
  { icon: Wrench, title: "Manutenção Preditiva", desc: "IA analisa vibrações, temperatura, corrente e padrões de uso para prever falhas com até 72h de antecedência em qualquer máquina." },
  { icon: Shield, title: "Segurança Industrial (Orion Shield)", desc: "VDA 5050, ISO 23482, parada de emergência global, firewall industrial, monitoramento 24/7 e conformidade GDPR/LGPD." },
  { icon: Zap, title: "Eficiência Energética com IA", desc: "Redução média de 23% nos custos energéticos via otimização inteligente de consumo e relatórios ESG automáticos." },
  { icon: Layers, title: "Digital Twin & Simulação", desc: "Réplica digital da planta inteira para simulação, treinamento, otimização e tomada de decisão baseada em dados." },
  { icon: Globe, title: "MQTT, BLE & IoT Gateway", desc: "Gateway universal para sensores industriais — do chão de fábrica ao cloud com latência <50ms via 5G, Wi-Fi 6 ou Ethernet." },
];

const useCases = [
  { sector: "Automotiva", challenge: "Inspeção visual de soldas com 15% de falsos negativos", solution: "Orion Vision com YOLOv8 customizado + iluminação estruturada", result: "99.2% acurácia, redução de 90% em recalls", icon: Car },
  { sector: "Farmacêutica", challenge: "Contaminação cruzada em clean rooms", solution: "Orion Shield + sensores IoT + robótica de manipulação", result: "Zero incidentes em 12 meses, compliance FDA automático", icon: Pill },
  { sector: "Alimentos", challenge: "Paradas não planejadas em linhas de embalagem", solution: "Manutenção preditiva Orion + Digital Twin", result: "85% redução em downtime, ROI em 8 meses", icon: Package },
  { sector: "Logística", challenge: "Picking manual lento e propenso a erros", solution: "AMRs com Orion Nav + visão para pick-and-place", result: "3x throughput, 99.8% precisão de pedidos", icon: Warehouse },
  { sector: "Reciclagem OTR", challenge: "Impossível reciclar pneus gigantes mecanicamente", solution: "Smart OTR Robotic Line (patente própria)", result: "Primeira solução do mundo, margem 65%+", icon: Leaf },
  { sector: "Mineração", challenge: "Equipamentos quebrando sem aviso em ambientes hostis", solution: "Orion Predictive + sensores de vibração/temp", result: "72h de previsão, 40% redução em custos de manutenção", icon: Pickaxe },
];

const marketData = [
  { value: "$310B", label: "Automação Industrial Global", sub: "TAM total (2026)", icon: Globe },
  { value: "$78B", label: "Robótica Industrial", sub: "CAGR 12.3%", icon: Bot },
  { value: "$42B", label: "Software Industrial (MES/SCADA)", sub: "CAGR 9.8%", icon: Cpu },
  { value: "2.7M", label: "Robôs Industriais Ativos", sub: "IFR 2025 — crescendo 15%/ano", icon: BarChart3 },
];

const businessModel = [
  { icon: Cpu, title: "SaaS — Orion Platform", desc: "Licença mensal por planta. Inclui Orion Core, Dashboard, Digital Twin, manutenção preditiva e atualizações de IA.", revenue: "€8K-50K/mês por planta" },
  { icon: Factory, title: "Hardware & Integração", desc: "Linhas robóticas completas, retrofitting de plantas existentes e integração com equipamentos legados.", revenue: "€500K-5M por projeto" },
  { icon: Briefcase, title: "Consultoria & Deploy", desc: "Assessment de planta, projeto de automação, implantação, treinamento e otimização contínua.", revenue: "€100K-500K por projeto" },
  { icon: Leaf, title: "Créditos ESG & Carbono", desc: "Receita recorrente de créditos de carbono gerados por eficiência energética e economia circular.", revenue: "€50K-300K/ano por planta" },
  { icon: Shield, title: "Orion Shield (Security)", desc: "Módulo premium de cibersegurança industrial, compliance e monitoramento 24/7 com SLA.", revenue: "€3K-15K/mês" },
  { icon: Award, title: "Licenciamento de Patentes", desc: "Smart OTR e outras tecnologias patenteadas licenciadas para fabricantes e operadores terceiros.", revenue: "Royalties 3-8% sobre vendas" },
];

const roadmap = [
  { year: "2024", phase: "Fase 1 — Validação", items: ["Protótipo Smart OTR funcional", "Patente depositada", "MVP Orion Platform", "Primeiro cliente piloto (reciclagem)"], status: "done" },
  { year: "2025", phase: "Fase 2 — Multi-Setor", items: ["Planta piloto Alessandria", "Expansão para automotiva e alimentos", "5 contratos assinados", "Rodada Seed €3M"], status: "current" },
  { year: "2026", phase: "Fase 3 — Escala EU", items: ["15+ plantas com Orion Platform", "Entrada em farmacêutica e logística", "€8M ARR", "Equipe 50+ pessoas"], status: "next" },
  { year: "2027-28", phase: "Fase 4 — Global", items: ["Expansão MENA, LATAM e Ásia", "50+ plantas operacionais", "€40M ARR", "Series A €15M+"], status: "next" },
];

const financialProjections = [
  { year: "2025", revenue: "€1.2M", costs: "€1.8M", margin: "-50%", note: "Investimento multi-setor" },
  { year: "2026", revenue: "€8M", costs: "€4.5M", margin: "44%", note: "Break-even Q2" },
  { year: "2027", revenue: "€22M", costs: "€11M", margin: "50%", note: "Escala acelerada" },
  { year: "2028", revenue: "€45M", costs: "€20M", margin: "56%", note: "Economia de escala global" },
];

const investmentUse = [
  { label: "P&D — IA, Robótica & Visão", pct: 30, color: "hsl(var(--primary))" },
  { label: "Planta Piloto & Hardware", pct: 22, color: "hsl(var(--primary) / 0.75)" },
  { label: "Comercial Multi-Setor", pct: 22, color: "hsl(var(--primary) / 0.55)" },
  { label: "Equipe & Operações", pct: 16, color: "hsl(var(--primary) / 0.38)" },
  { label: "Legal, IP & Reserva", pct: 10, color: "hsl(var(--primary) / 0.2)" },
];

const teamMembers = [
  { name: "Ericson Falaworju", role: "CEO & Founder", desc: "Engenheiro de sistemas, especialista em IA e robótica industrial. Experiência em automação multi-setor e integração de sistemas complexos." },
  { name: "Equipe Técnica", role: "CTO Office", desc: "Engenheiros ROS2, visão computacional, ML/AI, IoT industrial e segurança cibernética com experiência em projetos enterprise globais." },
  { name: "Consultores", role: "Advisory Board", desc: "Especialistas em automação industrial de diversos setores, investidores deep-tech e mentores de scale-ups europeias." },
];

const competitiveAdvantages = [
  "Plataforma universal — qualquer indústria",
  "Patente Smart OTR + IP proprietária",
  "Stack ROS2 completa e flexível",
  "IA que aprende por setor industrial",
  "Protocolos industriais 100% cobertos",
  "Modelo SaaS recorrente de alta margem",
  "Segurança Orion Shield certificada",
  "Retrofit de plantas existentes (não exige greenfield)",
  "Time com experiência multi-setor",
  "Mercado endereçável de $310B+",
];

/* ═══════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════ */

export default function Investidores() {
  return (
    <MainLayout>
      <SEO
        title="Pitch Deck — ORION Platform | Automação Industrial Universal com IA"
        description="Pitch Deck para investidores. Plataforma universal de automação industrial com IA, robótica ROS2, visão computacional e IoT para qualquer setor. Mercado de $310B."
      />

      {/* ═══ SLIDE 1: HERO ═══ */}
      <section id="slide-0" className="min-h-[70vh] flex items-center relative overflow-hidden">
        <img src={pitchHeroImg} alt="Robótica industrial ORION" className="absolute inset-0 w-full h-full object-cover opacity-20" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/40 to-background" style={{ zIndex: 1 }} />
        <div className="container py-16 sm:py-24 px-4 sm:px-6 relative" style={{ zIndex: 5 }}>
          <div className="max-w-3xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-px w-8 bg-primary" />
              <p className="text-primary uppercase tracking-[0.35em] text-[11px] font-medium">PITCH DECK • INVESTIDORES</p>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-7xl font-serif text-foreground leading-tight mb-4">
              Orion <span className="text-primary">Platform</span>
            </h1>
            <p className="text-lg md:text-xl text-foreground/90 leading-relaxed max-w-xl mb-2">
              A plataforma universal de automação industrial com IA.
            </p>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-xl mb-3">
              Robótica, visão computacional, IoT e segurança integrados para <strong className="text-foreground">qualquer indústria</strong> — 
              da automotiva à farmacêutica, da logística à reciclagem. Um cérebro, infinitas aplicações.
            </p>
            <p className="text-xs text-muted-foreground/60 mb-8">
              ELP Green Technology S.R.L. • Alessandria, Itália • Mercado endereçável: <strong className="text-primary">$310B+</strong>
            </p>

            <div className="flex flex-wrap gap-2 mb-8">
              {slideNav.map((label, i) => (
                <a key={label} href={`#slide-${i}`}
                  className="text-[10px] px-3 py-1.5 border border-border/30 hover:border-primary/50 hover:bg-primary/5 text-muted-foreground hover:text-primary transition-all">
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
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">O PROBLEMA UNIVERSAL</p>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-3">
                A indústria global está <span className="text-primary">fragmentada</span>
              </h2>
              <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                Seja na automotiva, farmacêutica, alimentos ou mineração — todo setor industrial enfrenta os mesmos 
                problemas estruturais de automação. E nenhuma plataforma resolve todos de forma integrada.
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

      {/* ═══ SLIDE 3: SETORES INDUSTRIAIS ═══ */}
      <section id="slide-2" className="py-14 sm:py-20 relative overflow-hidden" style={{ background: "hsl(var(--background))", borderTop: "1px solid hsl(var(--border))" }}>
        <GatewayBackground opacity={0.08} />
        <div className="container px-4 sm:px-6 relative" style={{ zIndex: 1 }}>
          <div className="text-center mb-12">
            <ScrollReveal direction="fade">
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">SETORES INDUSTRIAIS</p>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-3">
                Uma plataforma, <span className="text-primary">10+ setores</span>
              </h2>
              <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                O Orion se adapta a qualquer indústria que use robótica, automação, IoT ou sistemas de controle. 
                O mesmo cérebro — customizado para cada setor.
              </p>
            </ScrollReveal>
          </div>

          {/* Featured sectors with images */}
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {industries.slice(0, 4).map((ind, i) => {
              const Icon = ind.icon;
              return (
                <ScrollReveal key={ind.title} direction="up" delay={i * 0.06}>
                  <div className="group border border-border/20 bg-card/30 hover:border-primary/30 transition-all overflow-hidden h-full">
                    {ind.img && (
                      <div className="relative h-40 overflow-hidden">
                        <img src={ind.img} alt={ind.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" loading="lazy" />
                        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/30 to-transparent" />
                        <div className="absolute bottom-3 left-4 flex items-center gap-2">
                          <Icon className="h-4 w-4 text-primary" />
                          <span className="text-sm font-bold text-foreground">{ind.title}</span>
                          <span className="text-[9px] px-2 py-0.5 bg-primary/20 text-primary font-mono ml-auto">TAM {ind.tam}</span>
                        </div>
                      </div>
                    )}
                    <div className="p-4">
                      <p className="text-[11px] text-muted-foreground leading-relaxed">{ind.desc}</p>
                    </div>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>

          {/* Other sectors grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {industries.slice(4).map((ind, i) => {
              const Icon = ind.icon;
              return (
                <ScrollReveal key={ind.title} direction="up" delay={i * 0.05}>
                  <div className="group p-5 border border-border/20 bg-card/30 hover:border-primary/30 transition-all h-full relative">
                    {"highlight" in ind && ind.highlight && (
                      <span className="absolute top-3 right-3 text-[8px] uppercase tracking-wider bg-primary/10 text-primary px-2 py-0.5 border border-primary/20">
                        {ind.highlight}
                      </span>
                    )}
                    <div className="flex items-center gap-3 mb-3">
                      <Icon className="h-5 w-5 text-primary" />
                      <h3 className="text-xs font-semibold text-foreground">{ind.title}</h3>
                      <span className="text-[9px] px-2 py-0.5 bg-primary/10 text-primary font-mono ml-auto">{ind.tam}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed">{ind.desc}</p>
                  </div>
                </ScrollReveal>
              );
            })}
          </div>
        </div>
      </section>

      <TechLine />

      {/* ═══ SLIDE 4: A PLATAFORMA ═══ */}
      <section id="slide-3" className="py-14 sm:py-20 relative overflow-hidden" style={{ background: "hsl(var(--card))", borderTop: "1px solid hsl(var(--border))" }}>
        <div className="container px-4 sm:px-6 relative" style={{ zIndex: 1 }}>
          <div className="text-center mb-12">
            <ScrollReveal direction="fade">
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">A PLATAFORMA</p>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-3">
                Orion — o <span className="text-primary">sistema operacional</span> da indústria
              </h2>
              <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                Um cérebro central de IA que controla robôs, analisa imagens, monitora sensores, prevê falhas e 
                otimiza operações — independente do setor ou fabricante de equipamentos.
              </p>
            </ScrollReveal>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {platformCapabilities.map((feat, i) => {
              const Icon = feat.icon;
              return (
                <ScrollReveal key={feat.title} direction="up" delay={i * 0.04}>
                  <div className="group p-5 border border-border/20 bg-card/30 hover:border-primary/30 hover:bg-primary/[0.02] transition-all h-full">
                    <div className="h-9 w-9 border border-primary/20 flex items-center justify-center mb-3 group-hover:border-primary/50 transition-colors">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
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

      {/* ═══ SLIDE 5: TECNOLOGIA ═══ */}
      <section id="slide-4" className="py-14 sm:py-20 relative overflow-hidden" style={{ background: "hsl(var(--background))", borderTop: "1px solid hsl(var(--border))" }}>
        <GatewayBackground opacity={0.12} />
        <div className="container px-4 sm:px-6 relative" style={{ zIndex: 1 }}>
          <div className="text-center mb-12">
            <ScrollReveal direction="fade">
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">STACK TECNOLÓGICA</p>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-3">
                Tecnologia <span className="text-primary">de ponta</span>, aberta e extensível
              </h2>
            </ScrollReveal>
          </div>

          <div className="grid lg:grid-cols-2 gap-8 items-center">
            <ScrollReveal direction="up">
              <div className="relative overflow-hidden border border-border/20">
                <img src={pitchTeamImg} alt="Centro de controle ORION" className="w-full h-auto" loading="lazy" />
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-background/90 to-transparent p-4">
                  <p className="text-xs text-primary font-medium">Centro de Controle ORION</p>
                  <p className="text-[10px] text-muted-foreground">Monitoramento multi-planta via Digital Twin</p>
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal direction="up" delay={0.1}>
              <div className="space-y-3">
                {[
                  { cat: "IA & Decisão", items: ["Orion Neural Engine", "Gemini AI", "TensorFlow", "YOLOv8/v9", "Whisper STT"] },
                  { cat: "Robótica", items: ["ROS2 Humble/Jazzy", "Nav2", "MoveIt2", "VDA 5050", "TF2"] },
                  { cat: "Protocolos", items: ["OPC-UA", "Modbus TCP/RTU", "PROFINET", "EtherCAT", "BACnet", "CAN bus"] },
                  { cat: "IoT & Conectividade", items: ["MQTT", "BLE 5.0", "Wi-Fi 6", "5G", "WebRTC", "WSS"] },
                  { cat: "Monitoramento", items: ["Grafana", "Node-RED", "Foxglove", "Digital Twin AAS", "Custom Dashboards"] },
                  { cat: "Segurança", items: ["ISO 23482", "IEC 62443", "GDPR/LGPD", "TLS 1.3", "E-Stop Global"] },
                ].map(stack => (
                  <div key={stack.cat} className="p-3 border border-border/20 bg-card/30 hover:border-primary/20 transition-all">
                    <h3 className="text-[10px] font-bold text-primary uppercase tracking-wider mb-2">{stack.cat}</h3>
                    <div className="flex flex-wrap gap-1">
                      {stack.items.map(item => (
                        <span key={item} className="text-[9px] px-2 py-0.5 bg-primary/5 border border-primary/10 text-foreground/80 font-mono">{item}</span>
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

      {/* ═══ VIDEO SHOWCASE ═══ */}
      <section className="py-14 sm:py-20 relative overflow-hidden" style={{ background: "hsl(var(--card))", borderTop: "1px solid hsl(var(--border))" }}>
        <div className="container px-4 sm:px-6 relative" style={{ zIndex: 1 }}>
          <div className="text-center mb-10">
            <ScrollReveal direction="fade">
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">DEMONSTRAÇÃO</p>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-3">
                Veja o <span className="text-primary">Orion</span> em ação
              </h2>
            </ScrollReveal>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <ScrollReveal direction="up">
              <div className="border border-border/20 overflow-hidden">
                <video controls poster={pitchHeroImg} className="w-full aspect-video object-cover" preload="metadata">
                  <source src={videoHeroAsset.url} type="video/mp4" />
                </video>
                <div className="p-4">
                  <p className="text-sm font-semibold text-foreground">Orion Platform — Visão Geral</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Plataforma universal para automação industrial multi-setor.</p>
                </div>
              </div>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <div className="border border-border/20 overflow-hidden">
                <video controls poster={pitchOtrImg} className="w-full aspect-video object-cover" preload="metadata">
                  <source src={videoInnovationAsset.url} type="video/mp4" />
                </video>
                <div className="p-4">
                  <p className="text-sm font-semibold text-foreground">Smart OTR — Caso de Uso Flagship</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Reciclagem robótica de pneus gigantes — tecnologia patenteada.</p>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <TechLine />

      {/* ═══ SLIDE 6: CASOS DE USO ═══ */}
      <section id="slide-5" className="py-14 sm:py-20 relative overflow-hidden" style={{ background: "hsl(var(--background))", borderTop: "1px solid hsl(var(--border))" }}>
        <div className="container px-4 sm:px-6 relative" style={{ zIndex: 1 }}>
          <div className="text-center mb-12">
            <ScrollReveal direction="fade">
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">CASOS DE USO REAIS</p>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-3">
                Resultados por <span className="text-primary">setor</span>
              </h2>
            </ScrollReveal>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {useCases.map((uc, i) => {
              const Icon = uc.icon;
              return (
                <ScrollReveal key={uc.sector} direction="up" delay={i * 0.06}>
                  <div className="p-5 border border-border/20 bg-card/30 hover:border-primary/30 transition-all h-full">
                    <div className="flex items-center gap-2 mb-3">
                      <Icon className="h-4 w-4 text-primary" />
                      <span className="text-xs font-bold text-foreground">{uc.sector}</span>
                    </div>
                    <div className="space-y-2 text-[10px]">
                      <div>
                        <span className="text-destructive font-medium">Problema:</span>
                        <p className="text-muted-foreground">{uc.challenge}</p>
                      </div>
                      <div>
                        <span className="text-primary font-medium">Solução Orion:</span>
                        <p className="text-muted-foreground">{uc.solution}</p>
                      </div>
                      <div className="pt-2 border-t border-border/20">
                        <span className="text-primary font-bold">→ {uc.result}</span>
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

      {/* ═══ SLIDE 7: MERCADO ═══ */}
      <section className="py-14 sm:py-20 relative overflow-hidden" style={{ background: "hsl(var(--card))", borderTop: "1px solid hsl(var(--border))" }}>
        <div className="container px-4 sm:px-6 relative" style={{ zIndex: 1 }}>
          <div className="text-center mb-12">
            <ScrollReveal direction="fade">
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">OPORTUNIDADE DE MERCADO</p>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-3">
                TAM de <span className="text-primary">$310 bilhões</span>
              </h2>
              <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                Automação industrial, robótica, software MES/SCADA e IoT industrial convergem em um mercado massivo. 
                O Orion endereça múltiplos segmentos simultaneamente.
              </p>
            </ScrollReveal>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
              <img src={pitchGlobalImg} alt="Expansão global Orion Platform" className="w-full h-64 md:h-80 object-cover" loading="lazy" />
              <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent" />
              <div className="absolute bottom-0 inset-x-0 p-6">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div><p className="text-lg font-bold text-primary">€50B</p><p className="text-[10px] text-muted-foreground">SAM — Europa + MENA</p></div>
                  <div><p className="text-lg font-bold text-primary">€8B</p><p className="text-[10px] text-muted-foreground">SOM — Segmentos-alvo</p></div>
                  <div><p className="text-lg font-bold text-primary">12.3%</p><p className="text-[10px] text-muted-foreground">CAGR Robótica</p></div>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <TechLine />

      {/* ═══ SLIDE 8: MODELO DE NEGÓCIO ═══ */}
      <section id="slide-6" className="py-14 sm:py-20 relative overflow-hidden" style={{ background: "hsl(var(--background))", borderTop: "1px solid hsl(var(--border))" }}>
        <div className="container px-4 sm:px-6 relative" style={{ zIndex: 1 }}>
          <div className="text-center mb-12">
            <ScrollReveal direction="fade">
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">MODELO DE NEGÓCIO</p>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-3">
                6 fontes de <span className="text-primary">receita</span>
              </h2>
              <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                Modelo diversificado com receita recorrente de alto valor — SaaS, hardware, consultoria, segurança, ESG e licenciamento.
              </p>
            </ScrollReveal>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {businessModel.map((item, i) => {
              const Icon = item.icon;
              return (
                <ScrollReveal key={item.title} direction="up" delay={i * 0.06}>
                  <div className="p-5 border border-border/20 bg-card/30 hover:border-primary/30 transition-all group h-full">
                    <div className="flex items-start gap-3">
                      <div className="h-9 w-9 border border-primary/20 flex items-center justify-center flex-shrink-0 group-hover:border-primary/50 transition-colors">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <h3 className="text-xs font-semibold text-foreground mb-1">{item.title}</h3>
                        <p className="text-[10px] text-muted-foreground leading-relaxed mb-2">{item.desc}</p>
                        <p className="text-[10px] font-bold text-primary">{item.revenue}</p>
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

      {/* ═══ SLIDE 9: ROADMAP ═══ */}
      <section id="slide-7" className="py-14 sm:py-20 relative overflow-hidden" style={{ background: "hsl(var(--card))", borderTop: "1px solid hsl(var(--border))" }}>
        <div className="container px-4 sm:px-6 relative" style={{ zIndex: 1 }}>
          <div className="text-center mb-12">
            <ScrollReveal direction="fade">
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">ROADMAP</p>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-3">
                Da reciclagem à <span className="text-primary">dominação multi-setor</span>
              </h2>
            </ScrollReveal>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {roadmap.map((phase, i) => (
              <ScrollReveal key={phase.year} direction="up" delay={i * 0.08}>
                <div className={`p-6 border h-full transition-all ${
                  phase.status === "current" ? "border-primary/50 bg-primary/5"
                    : phase.status === "done" ? "border-border/30 bg-card/50"
                      : "border-border/20 bg-card/30"
                }`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Clock className="h-4 w-4 text-primary" />
                    <span className="text-lg font-bold text-primary">{phase.year}</span>
                    {phase.status === "current" && <span className="text-[8px] uppercase tracking-wider bg-primary/20 text-primary px-2 py-0.5 ml-auto">ATUAL</span>}
                    {phase.status === "done" && <CheckCircle2 className="h-3.5 w-3.5 text-primary ml-auto" />}
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

      {/* ═══ EQUIPE ═══ */}
      <section className="py-14 sm:py-20 relative overflow-hidden" style={{ background: "hsl(var(--background))", borderTop: "1px solid hsl(var(--border))" }}>
        <div className="container px-4 sm:px-6 relative" style={{ zIndex: 1 }}>
          <div className="text-center mb-12">
            <ScrollReveal direction="fade"><p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">EQUIPE</p></ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-3">Quem está <span className="text-primary">construindo</span></h2>
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

      {/* ═══ SLIDE 10: FINANCEIRO ═══ */}
      <section id="slide-8" className="py-14 sm:py-20 relative overflow-hidden" style={{ background: "hsl(var(--card))", borderTop: "1px solid hsl(var(--border))" }}>
        <div className="container px-4 sm:px-6 relative" style={{ zIndex: 1 }}>
          <div className="text-center mb-12">
            <ScrollReveal direction="fade"><p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">PROJEÇÕES FINANCEIRAS</p></ScrollReveal>
            <ScrollReveal direction="up" delay={0.1}>
              <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-3">Caminho para <span className="text-primary">€45M ARR</span></h2>
            </ScrollReveal>
          </div>

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

          <ScrollReveal direction="up" delay={0.1}>
            <div className="border border-border/20 p-6">
              <h3 className="text-sm font-semibold text-foreground mb-6 flex items-center gap-2">
                <PieChart className="h-4 w-4 text-primary" /> Uso dos Recursos — Rodada Seed €3M
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

      {/* ═══ SLIDE 11: INVESTIMENTO CTA ═══ */}
      <section id="slide-9" className="py-14 sm:py-20 relative overflow-hidden" style={{ background: "hsl(var(--background))", borderTop: "1px solid hsl(var(--border))" }}>
        <HeroThreeBackground />
        <div className="absolute inset-0 bg-background/60 z-[1]" />
        <div className="container px-4 sm:px-6 relative" style={{ zIndex: 2 }}>
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <ScrollReveal direction="up">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">OPORTUNIDADE DE INVESTIMENTO</p>
                <h2 className="text-3xl md:text-4xl font-serif text-foreground mb-4">
                  Rodada <span className="text-primary">Seed</span> — €3M
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  Estamos levantando €3M para escalar o Orion Platform para múltiplos setores industriais, construir 
                  a planta piloto flagship e fechar os primeiros contratos multi-setor na Europa.
                </p>
                <div className="space-y-3 mb-8">
                  {[
                    { icon: Target, label: "Valuation", value: "€12M pre-money" },
                    { icon: DollarSign, label: "Rodada", value: "€3M Seed" },
                    { icon: Building2, label: "Estrutura", value: "Equity + Revenue Share" },
                    { icon: Globe, label: "Setores-alvo", value: "Auto, Pharma, Food, Logistics, Mining" },
                    { icon: MapPin, label: "Sede", value: "Alessandria, Piemonte, Itália" },
                    { icon: Rocket, label: "Meta 2026", value: "15+ plantas • €8M ARR" },
                    { icon: FileText, label: "Due Diligence", value: "Disponível sob NDA" },
                  ].map(item => {
                    const Icon = item.icon;
                    return (
                      <div key={item.label} className="flex items-center gap-3 p-3 border border-border/20 bg-card/30">
                        <Icon className="h-4 w-4 text-primary flex-shrink-0" />
                        <span className="text-xs text-muted-foreground">{item.label}</span>
                        <span className="text-xs font-bold text-foreground ml-auto text-right">{item.value}</span>
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
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold text-primary uppercase tracking-wider mb-4">Por que investir no Orion?</h3>
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

      {/* Footer */}
      <section className="py-6" style={{ background: "hsl(var(--card))", borderTop: "1px solid hsl(var(--border))" }}>
        <div className="container px-4 sm:px-6">
          <div className="flex flex-wrap gap-2 justify-center">
            {["Plataforma Universal", "Robótica ROS2", "IA Industrial", "Visão Computacional", "IoT & SCADA", "Smart OTR (Patente)", "Indústria 4.0", "Multi-Setor", "ESG", "ISO 23482"].map(tag => (
              <span key={tag} className="text-[9px] px-3 py-1 border border-border/20 text-muted-foreground font-mono">{tag}</span>
            ))}
          </div>
          <p className="text-[9px] text-muted-foreground/50 text-center mt-4">
            © 2024–2026 ELP Green Technology S.R.L. • Alessandria, Piemonte, Itália •
            Este material é confidencial e destinado exclusivamente a investidores qualificados.
          </p>
        </div>
      </section>
    </MainLayout>
  );
}
