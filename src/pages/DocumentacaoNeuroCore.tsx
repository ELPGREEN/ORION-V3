import { Brain, Download, ArrowLeft, Cpu, Eye, Bot, Zap, Hand, Languages, Home, Smartphone, Watch, Activity, Camera, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { NeuroCoreArchitectureDiagram } from "@/components/dashboard/neural/NeuroCoreArchitectureDiagram";
import { MQTTFlowDiagram } from "@/components/dashboard/neural/MQTTFlowDiagram";
import { SEO } from "@/components/SEO";

const components = [
  { layer: 1, module: "Comunicação em Tempo Real", responsibility: "Conexão de baixa latência entre dispositivos", tech: "Protocolo proprietário de comunicação IoT" },
  { layer: 1, module: "Edge Runtime", responsibility: "Execução local em dispositivos de borda", tech: "Motor de inferência otimizado para edge" },
  { layer: 2, module: "Motor de Visão", responsibility: "Visão computacional completa", tech: "Detecção de objetos + Segmentação + OCR" },
  { layer: 2, module: "Análise Gestual & Facial", responsibility: "Expressões, gestos e linguagem de sinais", tech: "Reconhecimento de emoções + LIBRAS" },
  { layer: 3, module: "Motor de Raciocínio", responsibility: "Raciocínio lógico e planejamento", tech: "Cadeia de pensamento + Grafo de conhecimento" },
  { layer: 3, module: "Sistema de Memória", responsibility: "Memória episódica e histórico contextual", tech: "Memória vetorial + Contexto de longo prazo" },
  { layer: 3, module: "Manutenção Preditiva", responsibility: "Diagnóstico preditivo de hardware", tech: "Análise temporal + Digital Twin" },
  { layer: 4, module: "Orquestrador Cognitivo", responsibility: "Integração e decisões autônomas", tech: "Motor de orquestração proprietário" },
  { layer: 5, module: "Interface Humano-Máquina", responsibility: "Voz, gestos e comandos naturais", tech: "STT + TTS + Interpretação gestual" },
  { layer: 5, module: "Ponte com Assistentes Virtuais", responsibility: "Integração com ecossistemas de voz", tech: "Protocolo de comunicação unificado" },
];

const capabilities = [
  { endpoint: "Processamento Visual", method: "Tempo Real", desc: "Análise completa de frames com detecção de objetos, gestos e emoções" },
  { endpoint: "Planejamento Cognitivo", method: "Sob Demanda", desc: "Recebe contexto e retorna plano de ação otimizado" },
  { endpoint: "Tradução LIBRAS", method: "Tempo Real", desc: "Traduz linguagem de sinais para texto e voz em tempo real" },
  { endpoint: "Visão em Streaming", method: "Contínuo", desc: "Resultados de visão computacional em tempo real" },
  { endpoint: "Comandos Robóticos", method: "Bidirecional", desc: "Envio e recebimento de comandos para robôs" },
  { endpoint: "Controle por Voz", method: "Bidirecional", desc: "Comandos de voz para controle de dispositivos e ambientes" },
  { endpoint: "Status de Dispositivos", method: "Persistente", desc: "Monitoramento contínuo de estado dos dispositivos" },
  { endpoint: "Análise de Documentos", method: "Sob Demanda", desc: "Análise de layout e extração de conteúdo de PDFs" },
];

const metrics = [
  { label: "Detecção de objetos", value: "mAP@0.5 = 0.92", icon: Eye },
  { label: "Reconhecimento LIBRAS", value: "96.8%", icon: Hand },
  { label: "Análise de emoções (7 classes)", value: "94%", icon: Activity },
  { label: "Rastreamento de gestos", value: "60 FPS", icon: Camera },
  { label: "Latência total (câmera → ação)", value: "< 120ms edge", icon: Zap },
];

export default function DocumentacaoNeuroCore() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SEO
        title="NeuroCore Engine — Documentação | ELP® Green Technology"
        description="Documentação técnica do NeuroCore Engine — motor neural com visão computacional, LIBRAS, IoT e integração robótica. By ELP® Green Technology."
        image="https://www.iasofthub.com/og-images/og-neurocore.jpg"
        keywords="NeuroCore, documentação, visão computacional, LIBRAS, IoT, robótica, ELP Green Technology"
      />
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-8 print:py-2 print:space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between print:hidden">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Download className="h-4 w-4 mr-1" /> Exportar PDF
          </Button>
        </div>

        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-3">
            <Brain className="h-10 w-10 text-primary" />
            <h1 className="text-3xl font-bold tracking-tight">NEUROCORE AI</h1>
          </div>
          <p className="text-lg text-muted-foreground">Documentação Técnica v2.0</p>
          <p className="text-sm text-muted-foreground">Motor Cognitivo Autônomo — ELP® Green Technology</p>
        </div>

        <Separator />

        {/* 1. Introdução */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold">1. Introdução</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            NEUROCORE AI é um núcleo cognitivo autônomo híbrido (edge + cloud) que integra visão computacional avançada,
            raciocínio lógico em tempo real e memória contínua para robótica, dispositivos móveis e casas inteligentes.
            Projetado com arquitetura modular em 5 camadas, suporta consciência situacional simulada, aprendizado contínuo
            e integração nativa com robôs, celulares, smartwatches e casas inteligentes.
          </p>
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline">Consciência Situacional</Badge>
            <Badge variant="outline">Aprendizado Contínuo</Badge>
            <Badge variant="outline">Raciocínio Real-time</Badge>
            <Badge variant="outline">Multiplataforma</Badge>
            <Badge variant="outline">Acessibilidade (LIBRAS)</Badge>
          </div>
        </section>

        <Separator />

        {/* 2. Diagrama */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold">2. Arquitetura — Diagrama de 5 Camadas</h2>
          <Card>
            <CardContent className="p-4">
              <NeuroCoreArchitectureDiagram />
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* 3. Componentes */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold">3. Componentes do Sistema</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2 font-semibold">Camada</th>
                  <th className="text-left p-2 font-semibold">Módulo</th>
                  <th className="text-left p-2 font-semibold">Responsabilidade</th>
                  <th className="text-left p-2 font-semibold">Capacidade</th>
                </tr>
              </thead>
              <tbody>
                {components.map((c, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-2 font-mono">{c.layer}</td>
                    <td className="p-2 font-semibold">{c.module}</td>
                    <td className="p-2 text-muted-foreground">{c.responsibility}</td>
                    <td className="p-2"><code className="text-[10px] bg-muted px-1 rounded">{c.tech}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <Separator />

        {/* 4. Fluxo */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold">4. Fluxo de Dados em Tempo Real</h2>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 text-xs">
            {[
              { icon: Camera, label: "Sensor", sub: "Input" },
              { icon: Eye, label: "Visão", sub: "<30ms" },
              { icon: Brain, label: "Cognição", sub: "Raciocínio" },
              { icon: Zap, label: "Decisão", sub: "Orquestrador" },
              { icon: Bot, label: "Ação", sub: "Output" },
            ].map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className="flex flex-col items-center gap-1 p-3 rounded-lg bg-muted/30 border border-border/30 min-w-[80px]">
                  <step.icon className="h-5 w-5 text-primary" />
                  <span className="font-semibold">{step.label}</span>
                  <span className="text-[9px] text-muted-foreground">{step.sub}</span>
                </div>
                {i < 4 && <span className="text-muted-foreground hidden sm:block">→</span>}
              </div>
            ))}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Feedback loop contínuo → Atualiza memória e refina modelos automaticamente
          </p>
        </section>

        <Separator />

        {/* 5. Métricas */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold">5. Métricas de Precisão</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {metrics.map((m) => (
              <Card key={m.label}>
                <CardContent className="flex items-center gap-3 p-4">
                  <m.icon className="h-8 w-8 text-primary shrink-0" />
                  <div>
                    <p className="text-lg font-bold">{m.value}</p>
                    <p className="text-xs text-muted-foreground">{m.label}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Separator />

        {/* 6. Capacidades */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold">6. Capacidades do Sistema</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2 font-semibold">Capacidade</th>
                  <th className="text-left p-2 font-semibold">Modo</th>
                  <th className="text-left p-2 font-semibold">Descrição</th>
                </tr>
              </thead>
              <tbody>
                {capabilities.map((a, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-2 font-semibold">{a.endpoint}</td>
                    <td className="p-2"><Badge variant="secondary" className="text-[9px]">{a.method}</Badge></td>
                    <td className="p-2 text-muted-foreground">{a.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <Separator />

        {/* 7. Requisitos */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold">7. Requisitos de Plataforma</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Cpu className="h-4 w-4" /> Hardware (Edge)</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-1">
                <p>• Processador com aceleração de IA (GPU/TPU)</p>
                <p>• Câmera RGB 1080p 60fps</p>
                <p>• 8GB RAM mínimo</p>
                <p>• Conectividade de rede (Wi-Fi/5G/LoRa)</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Brain className="h-4 w-4" /> Software</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-1">
                <p>• Runtime de robótica compatível</p>
                <p>• Motor de inferência otimizado</p>
                <p>• Stack de visão computacional</p>
                <p>• SDK do NEUROCORE AI</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 8. Integrações */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold">8. Integrações</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Bot, label: "Robótica", desc: "Controle avançado de robôs" },
              { icon: Smartphone, label: "Mobile", desc: "iOS & Android nativo" },
              { icon: Watch, label: "Smartwatch", desc: "Wearables compatíveis" },
              { icon: Home, label: "Casa Inteligente", desc: "Automação residencial" },
              { icon: Mic, label: "Assistentes de Voz", desc: "Ecossistemas de voz populares" },
            ].map((int) => (
              <Card key={int.label}>
                <CardContent className="flex flex-col items-center text-center gap-2 p-4">
                  <int.icon className="h-6 w-6 text-primary" />
                  <p className="text-xs font-semibold">{int.label}</p>
                  <p className="text-[10px] text-muted-foreground">{int.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Separator />

        {/* 9. Protocolo de Comunicação */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold">9. Protocolo de Comunicação IoT</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            O NEUROCORE AI utiliza um protocolo de comunicação pub/sub otimizado para IoT, permitindo latência
            inferior a 50ms em rede local, suporte a milhares de dispositivos simultâneos e baixo consumo
            de bateria — ideal para edge devices e robótica móvel.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs font-bold">Nível 0</p>
                <p className="text-[10px] text-muted-foreground">Alta velocidade — streaming de visão</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs font-bold">Nível 1</p>
                <p className="text-[10px] text-muted-foreground">Garantia de entrega — comandos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs font-bold">Nível 2</p>
                <p className="text-[10px] text-muted-foreground">Entrega exata — operações críticas</p>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardContent className="p-4">
              <MQTTFlowDiagram />
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* 10. Tópicos de Comunicação */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold">10. Canais de Comunicação</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2 font-semibold">Canal</th>
                  <th className="text-left p-2 font-semibold">Prioridade</th>
                  <th className="text-left p-2 font-semibold">Persistente</th>
                  <th className="text-left p-2 font-semibold">Descrição</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { topic: "Resultados de Visão", qos: "Alta", retained: "Não", desc: "Objetos detectados, gestos, LIBRAS" },
                  { topic: "Análise Emocional", qos: "Alta", retained: "Não", desc: "Expressões faciais e intensidade" },
                  { topic: "Comandos de Voz", qos: "Média", retained: "Não", desc: "Comandos de assistentes virtuais" },
                  { topic: "Resposta por Voz", qos: "Média", retained: "Não", desc: "Texto para síntese de fala" },
                  { topic: "Tradução LIBRAS", qos: "Média", retained: "Não", desc: "Sinal traduzido para texto/voz" },
                  { topic: "Comandos Robóticos", qos: "Média", retained: "Não", desc: "Movimentos e trajetórias" },
                  { topic: "Status de Dispositivos", qos: "Média", retained: "Sim", desc: "Bateria, temperatura, falhas" },
                  { topic: "Diagnóstico Preditivo", qos: "Alta", retained: "Não", desc: "Alertas de manutenção preditiva" },
                  { topic: "Iluminação", qos: "Baixa", retained: "Sim", desc: "Controle de lâmpadas e cenas" },
                  { topic: "Clima & Sensores", qos: "Baixa", retained: "Sim", desc: "Temperatura, umidade, qualidade do ar" },
                  { topic: "Segurança Residencial", qos: "Alta", retained: "Não", desc: "Alarmes e detecção de presença" },
                ].map((t, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-2 font-semibold">{t.topic}</td>
                    <td className="p-2"><Badge variant="secondary" className="text-[9px]">{t.qos}</Badge></td>
                    <td className="p-2 text-muted-foreground">{t.retained}</td>
                    <td className="p-2 text-muted-foreground">{t.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <Separator />

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-border text-center space-y-1">
          <p className="text-sm text-muted-foreground">NEUROCORE AI by ELP® Green Technology</p>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} ELP® Green Technology S.R.L. — Todos os direitos reservados</p>
          <p className="text-[10px] text-muted-foreground/60">Informações proprietárias — Reprodução proibida sem autorização</p>
        </div>
      </div>
    </div>
  );
}
