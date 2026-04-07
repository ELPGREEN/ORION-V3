import { useNavigate } from "react-router-dom";
import { DynamicMeta } from "@/components/DynamicMeta";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Bot, Cpu, Eye, Shield, Brain, Wifi, Zap,
  ArrowRight, MessageSquare, FileText, Cog, Factory,
  Camera, Lock, BarChart3, Server,
} from "lucide-react";

const services = [
  {
    category: "Robótica Industrial",
    icon: Bot,
    color: "hsl(210,70%,50%)",
    items: [
      { title: "Integração ROS2", desc: "Controle de braços robóticos e AGVs via WebSocket", demo: "/dashboard/controle-robotico" },
      { title: "Automação de Linha", desc: "Programação de PLCs e coordenação robótica", demo: null },
      { title: "Manutenção Preditiva", desc: "Sensores + IA para prever falhas mecânicas", demo: null },
    ],
  },
  {
    category: "Automação de Processos",
    icon: Cog,
    color: "hsl(270,60%,55%)",
    items: [
      { title: "SCADA & PLC", desc: "Supervisão e controle de processos industriais", demo: null },
      { title: "Workflow Digital", desc: "Automação de processos documentais e jurídicos", demo: "/dashboard/gerar-documento" },
      { title: "Integração ERP", desc: "Conectar sistemas legados com IA moderna", demo: null },
    ],
  },
  {
    category: "Visão Computacional",
    icon: Eye,
    color: "hsl(160,60%,45%)",
    items: [
      { title: "Inspeção de Qualidade", desc: "Detecção de defeitos em tempo real com câmeras IA", demo: null },
      { title: "OCR Industrial", desc: "Leitura de etiquetas, códigos de barras e documentos", demo: null },
      { title: "Reconhecimento Facial", desc: "Controle de acesso e identificação biométrica", demo: "/register/biometric" },
    ],
  },
  {
    category: "Segurança & Vigilância",
    icon: Shield,
    color: "hsl(0,70%,55%)",
    items: [
      { title: "Câmeras com IA", desc: "Detecção de intrusão e análise de comportamento", demo: null },
      { title: "Analytics de Vídeo", desc: "Contagem de pessoas, fluxo e mapas de calor", demo: null },
      { title: "Monitoramento 24/7", desc: "Central de vigilância com alertas inteligentes", demo: null },
    ],
  },
  {
    category: "Ferramentas IA",
    icon: Brain,
    color: "hsl(30,85%,52%)",
    items: [
      { title: "Orion IA", desc: "Assistente multimodal com voz, visão e RAG", demo: "/consulta" },
      { title: "Análise Preditiva", desc: "Machine learning para previsão de demandas", demo: "/dashboard/rede-neural" },
      { title: "RAG Jurídico", desc: "Pesquisa inteligente em bases legais", demo: "/dashboard/pesquisa-unificada" },
    ],
  },
  {
    category: "IoT Industrial",
    icon: Wifi,
    color: "hsl(190,70%,50%)",
    items: [
      { title: "Sensores MQTT", desc: "Monitoramento de temperatura, pressão e vibração", demo: "/dashboard/dispositivos-iot" },
      { title: "Digital Twin", desc: "Réplica digital de equipamentos e processos", demo: null },
      { title: "Telemetria", desc: "Dashboards em tempo real de ativos industriais", demo: null },
    ],
  },
];

const techStack = [
  "ROS2 Humble", "Docker", "MQTT/HiveMQ", "Gemini AI", "WebRTC",
  "TensorFlow", "MediaPipe", "PostgreSQL", "Edge Functions", "Piper TTS",
];

export default function LojaOrion() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(180deg, hsl(220,25%,3%), hsl(220,20%,5%), hsl(220,25%,3%))" }}>
      <DynamicMeta
        title="Orion Industrial — Robótica, Automação & IA"
        description="Soluções industriais de robótica, automação, visão computacional e IoT powered by Orion IA."
      />

      {/* Hero */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0" style={{
          backgroundImage: "linear-gradient(hsl(210,70%,50%,0.03) 1px, transparent 1px), linear-gradient(90deg, hsl(210,70%,50%,0.03) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse at 30% 20%, hsl(210,70%,50%,0.08) 0%, transparent 50%), radial-gradient(ellipse at 70% 80%, hsl(30,85%,52%,0.06) 0%, transparent 50%)"
        }} />
        <div className="absolute top-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, hsl(210,70%,50%,0.4), transparent)" }} />

        <div className="relative max-w-6xl mx-auto px-4 pt-20 pb-16 text-center">
          <Badge className="mb-5 gap-1.5 text-[10px] font-mono tracking-[0.2em] uppercase border"
            style={{ background: "hsl(210,70%,50%,0.1)", color: "hsl(210,70%,60%)", borderColor: "hsl(210,70%,50%,0.25)" }}>
            <Factory className="h-3 w-3" />
            SOLUÇÕES INDUSTRIAIS
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-4" style={{ color: "hsl(210,70%,60%)", textShadow: "0 0 40px hsl(210,70%,50%,0.2)" }}>
            Orion{" "}
            <span style={{ color: "hsl(30,85%,52%)", textShadow: "0 0 30px hsl(30,85%,52%,0.25)" }}>Industrial</span>
          </h1>
          <p className="max-w-2xl mx-auto text-sm md:text-base leading-relaxed" style={{ color: "hsl(0,0%,100%,0.4)" }}>
            Robótica, automação de processos, visão computacional e IoT — tudo integrado com a inteligência artificial Orion.
          </p>
          <div className="flex flex-wrap justify-center gap-3 mt-8">
            <Button size="lg" className="gap-2 font-semibold"
              style={{ background: "linear-gradient(135deg, hsl(210,70%,45%), hsl(210,70%,55%))", color: "#fff" }}
              onClick={() => navigate("/consulta")}>
              <MessageSquare className="h-4 w-4" /> Falar com Orion
            </Button>
            <Button size="lg" variant="outline" className="gap-2"
              style={{ borderColor: "hsl(30,85%,52%,0.3)", color: "hsl(30,85%,52%)" }}
              onClick={() => navigate("/contato")}>
              <FileText className="h-4 w-4" /> Solicitar Orçamento
            </Button>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, hsl(30,85%,52%,0.2), transparent)" }} />
      </div>

      {/* Services */}
      <div className="max-w-6xl mx-auto px-4 py-16 space-y-12">
        {services.map((section) => (
          <div key={section.category}>
            <div className="flex items-center gap-3 mb-5">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center" style={{ background: `${section.color}15`, border: `1px solid ${section.color}30` }}>
                <section.icon className="h-5 w-5" style={{ color: section.color }} />
              </div>
              <h2 className="text-xl font-bold" style={{ color: "hsl(0,0%,100%,0.85)" }}>{section.category}</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {section.items.map((item) => (
                <Card key={item.title} className="group transition-all duration-300 hover:-translate-y-0.5"
                  style={{ background: "hsl(220,20%,6%)", border: `1px solid ${section.color}15` }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = `${section.color}40`; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = `${section.color}15`; }}>
                  <CardContent className="p-5">
                    <h3 className="text-sm font-semibold mb-1" style={{ color: "hsl(0,0%,100%,0.9)" }}>{item.title}</h3>
                    <p className="text-xs leading-relaxed mb-3" style={{ color: "hsl(0,0%,100%,0.35)" }}>{item.desc}</p>
                    {item.demo && (
                      <Button variant="ghost" size="sm" className="gap-1 text-xs p-0 h-auto"
                        style={{ color: section.color }}
                        onClick={() => navigate(item.demo!)}>
                        Demo Interativa <ArrowRight className="h-3 w-3" />
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Tech Stack */}
      <div className="border-t border-b" style={{ borderColor: "hsl(210,70%,50%,0.1)" }}>
        <div className="max-w-6xl mx-auto px-4 py-12 text-center">
          <h2 className="text-sm font-mono tracking-[0.2em] uppercase mb-6" style={{ color: "hsl(0,0%,100%,0.3)" }}>
            Stack Tecnológico
          </h2>
          <div className="flex flex-wrap justify-center gap-2">
            {techStack.map((tech) => (
              <Badge key={tech} variant="outline" className="text-[10px] font-mono px-3 py-1"
                style={{ borderColor: "hsl(210,70%,50%,0.2)", color: "hsl(210,70%,60%,0.7)" }}>
                {tech}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-6xl mx-auto px-4 py-16 text-center">
        <h2 className="text-2xl font-bold mb-3" style={{ color: "hsl(30,85%,52%)" }}>
          Pronto para transformar sua operação?
        </h2>
        <p className="text-sm mb-6" style={{ color: "hsl(0,0%,100%,0.35)" }}>
          Entre em contato e receba uma proposta personalizada para o seu negócio.
        </p>
        <Button size="lg" className="gap-2"
          style={{ background: "linear-gradient(135deg, hsl(30,85%,45%), hsl(30,85%,55%))", color: "hsl(220,25%,4%)" }}
          onClick={() => navigate("/contato")}>
          <Zap className="h-4 w-4" /> Solicitar Proposta
        </Button>
      </div>

      {/* Footer */}
      <div className="border-t py-6 text-center" style={{ borderColor: "hsl(220,15%,12%)" }}>
        <p className="text-[10px]" style={{ color: "hsl(0,0%,100%,0.2)" }}>
          Orion Industrial • Powered by <span style={{ color: "hsl(30,85%,52%)" }}>ELP Platform</span>
        </p>
      </div>
    </div>
  );
}
