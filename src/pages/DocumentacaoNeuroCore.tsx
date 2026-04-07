import { Brain, Download, ArrowLeft, Cpu, Eye, Wifi, Bot, Database, Zap, Hand, Languages, Home, Smartphone, Watch, Activity, Server, Camera, Radio, Mic, Cloud, Container, ExternalLink, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { NeuroCoreArchitectureDiagram } from "@/components/dashboard/neural/NeuroCoreArchitectureDiagram";
import { MQTTFlowDiagram } from "@/components/dashboard/neural/MQTTFlowDiagram";
import { SEO } from "@/components/SEO";

const components = [
  { layer: 1, module: "Wireless Core", responsibility: "Comunicação tempo real (baixa latência)", tech: "MQTT + WebSocket + 5G/BLE 5.3 + LoRa" },
  { layer: 1, module: "Edge Runtime", responsibility: "Execução local em dispositivos", tech: "TensorRT + ONNX Runtime + Jetson / Pi 5" },
  { layer: 2, module: "Vision Engine", responsibility: "Visão computacional completa", tech: "YOLOv11 + ViT + MediaPipe + DeepLabV3+" },
  { layer: 2, module: "Facial & Gesture Analyzer", responsibility: "Expressões, gestos, LIBRAS", tech: "EmoNet + SignLanguage Transformer + OpenPose" },
  { layer: 3, module: "Cognitive Reasoning Engine", responsibility: "Raciocínio lógico + planejamento", tech: "Llama-3.2-11B-Vision + CoT + GNN" },
  { layer: 3, module: "Memory & Context System", responsibility: "Memória episódica + histórico", tech: "Chroma + FAISS + Transformer-XL" },
  { layer: 3, module: "Predictive Maintenance", responsibility: "Diagnóstico preditivo de hardware", tech: "LSTM + Autoencoders + Digital Twin" },
  { layer: 4, module: "Orquestrador Cognitivo", responsibility: "Integração + decisões autônomas", tech: "LangGraph + AutoGen" },
  { layer: 5, module: "Human-Robot Interface", responsibility: "NLP + voz + gestos + comandos", tech: "Whisper + Gemini TTS + Piper WASM + Gesture-to-Text" },
  { layer: 5, module: "Virtual Assistant Bridge", responsibility: "Integração com assistentes virtuais", tech: "WebSocket + MQTT + Google/Alexa/Siri" },
];

const apis = [
  { endpoint: "/vision/process", method: "POST", desc: "Processa frame + retorna análise", example: '{objects: [...], gestures: "LIBRAS_OLÁ"}' },
  { endpoint: "/cognitive/plan", method: "POST", desc: "Recebe contexto e retorna plano", example: '{action: "mover_para_coordenada"}' },
  { endpoint: "/libra/translate", method: "POST", desc: "Traduz sinal LIBRAS para texto/voz", example: '{text: "Bom dia, como vai?"}' },
  { endpoint: "/vision/results", method: "ROS2 Topic", desc: "Resultados de visão em tempo real", example: "String msg" },
  { endpoint: "/robot/commands", method: "ROS2 Topic", desc: "Comandos para robô", example: "String msg" },
  { endpoint: "assistant/command", method: "MQTT", desc: "Comando de voz do assistente virtual", example: '{"comando":"ligar_luz","origem":"Alexa"}' },
  { endpoint: "assistant/tts", method: "MQTT", desc: "Resposta TTS para assistente", example: '{"text":"Luz ligada","voice":"pt-BR"}' },
  { endpoint: "vision/results", method: "MQTT QoS 2", desc: "Resultados de visão via broker", example: '{"gesto":"LIBRAS_OLÁ","precisao":0.968}' },
  { endpoint: "robot/status", method: "MQTT Retained", desc: "Status do robô (persistente)", example: '{"bateria":87,"status":"ok"}' },
  { endpoint: "https://ericsonv12-adv.hf.space/", method: "POST", desc: "Análise de layout PDF (HF Space)", example: 'multipart/form-data → {segments: [...]}' },
  { endpoint: "https://ericsonv12-adv.hf.space/markdown", method: "POST", desc: "PDF → Markdown estruturado", example: 'multipart/form-data → markdown text' },
  { endpoint: "https://ericsonv12-adv.hf.space/html", method: "POST", desc: "PDF → HTML", example: 'multipart/form-data → html text' },
];

const metrics = [
  { label: "Detecção de objetos (YOLOv11)", value: "mAP@0.5 = 0.92", icon: Eye },
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
          <p className="text-lg text-muted-foreground">Documentação Técnica v1.0</p>
          <p className="text-sm text-muted-foreground">Data Scientist & Engenheiro de Sistemas Robóticos — 31 de março de 2026</p>
        </div>

        <Separator />

        {/* 1. Introdução */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold">1. Introdução</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            NEUROCORE AI é um núcleo cognitivo autônomo híbrido (edge + cloud) que integra visão computacional avançada,
            raciocínio lógico em tempo real e memória contínua para robótica, dispositivos móveis e casas inteligentes.
            Projetado com arquitetura modular em 5 camadas, suporta consciência situacional simulada, aprendizado contínuo
            (pré-treinamento + fine-tuning + online learning), e integração nativa com robôs, celulares, smartwatches e casas inteligentes.
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

        {/* 3. Tabela de Componentes */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold">3. Componentes do Sistema</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2 font-semibold">Camada</th>
                  <th className="text-left p-2 font-semibold">Módulo</th>
                  <th className="text-left p-2 font-semibold">Responsabilidade</th>
                  <th className="text-left p-2 font-semibold">Tecnologia</th>
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
              { icon: Camera, label: "Câmera", sub: "Input" },
              { icon: Eye, label: "Vision Engine", sub: "<30ms" },
              { icon: Brain, label: "Cognitive Engine", sub: "CoT + GNN" },
              { icon: Zap, label: "Orquestrador", sub: "Decisão" },
              { icon: Bot, label: "Ação", sub: "Robô/Casa/App" },
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
            Feedback loop → Atualiza memória e faz fine-tuning online (sem catastrophic forgetting)
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

        {/* 6. API Reference */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold">6. API Reference</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2 font-semibold">Endpoint / Topic</th>
                  <th className="text-left p-2 font-semibold">Método</th>
                  <th className="text-left p-2 font-semibold">Descrição</th>
                  <th className="text-left p-2 font-semibold">Exemplo</th>
                </tr>
              </thead>
              <tbody>
                {apis.map((a, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-2 font-mono">{a.endpoint}</td>
                    <td className="p-2"><Badge variant="secondary" className="text-[9px]">{a.method}</Badge></td>
                    <td className="p-2 text-muted-foreground">{a.desc}</td>
                    <td className="p-2"><code className="text-[10px] bg-muted px-1 rounded">{a.example}</code></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <Separator />

        {/* 7. Requisitos */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold">7. Requisitos Técnicos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Cpu className="h-4 w-4" /> Hardware Mínimo (Edge)</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-1">
                <p>• NVIDIA Jetson Orin Nano ou Raspberry Pi 5 + Coral TPU</p>
                <p>• Câmera RGB 1080p 60fps</p>
                <p>• 8GB RAM mínimo</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Server className="h-4 w-4" /> Software</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-1">
                <p>• ROS2 Rolling/Iron • Python 3.12</p>
                <p>• CUDA 12.4 • TensorRT 10+</p>
                <p>• YOLOv11l • Llama-3.2-11B-Vision (fine-tuned)</p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Integrações */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold">8. Integrações</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { icon: Bot, label: "Robótica", desc: "ROS2 + MoveIt2 + Isaac Sim" },
              { icon: Smartphone, label: "Mobile", desc: "Flutter + TFLite" },
              { icon: Watch, label: "Smartwatch", desc: "Wear OS / watchOS" },
              { icon: Home, label: "Casa Inteligente", desc: "Home Assistant + Matter" },
              { icon: Mic, label: "Assistentes Virtuais", desc: "Alexa + Google + Siri + Rhasspy" },
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

        {/* 9. Protocolo MQTT */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold">9. Protocolo MQTT</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            O NEUROCORE AI utiliza MQTT (Message Queuing Telemetry Transport) como protocolo principal de comunicação
            entre módulos. Baseado no padrão Pub/Sub, permite latência {"<"} 50ms em rede local, suporte a milhares de
            dispositivos simultâneos e baixo consumo de bateria — ideal para edge devices e robótica móvel.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs font-bold">QoS 0</p>
                <p className="text-[10px] text-muted-foreground">Fire & Forget — visão rápida</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs font-bold">QoS 1</p>
                <p className="text-[10px] text-muted-foreground">At Least Once — comandos</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 text-center">
                <p className="text-xs font-bold">QoS 2</p>
                <p className="text-[10px] text-muted-foreground">Exactly Once — segurança</p>
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

        {/* 10. Tópicos MQTT */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold">10. Tópicos MQTT</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-2 font-semibold">Tópico</th>
                  <th className="text-left p-2 font-semibold">QoS</th>
                  <th className="text-left p-2 font-semibold">Retained</th>
                  <th className="text-left p-2 font-semibold">Descrição</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { topic: "vision/results", qos: 2, retained: false, desc: "Objetos detectados, gestos, LIBRAS" },
                  { topic: "vision/emotions", qos: 2, retained: false, desc: "Expressões faciais + intensidade" },
                  { topic: "assistant/command", qos: 1, retained: false, desc: "Comando de voz do Alexa/Google/Siri" },
                  { topic: "assistant/tts", qos: 1, retained: false, desc: "Texto para ser falado (resposta)" },
                  { topic: "assistant/libra", qos: 1, retained: false, desc: "Sinal LIBRAS traduzido para voz" },
                  { topic: "robot/commands", qos: 1, retained: false, desc: "Movimentos e trajetórias" },
                  { topic: "robot/status", qos: 1, retained: true, desc: "Bateria, temperatura, falhas" },
                  { topic: "robot/predictive", qos: 2, retained: false, desc: "Diagnóstico preditivo" },
                  { topic: "home/light/#", qos: 0, retained: true, desc: "Controle de lâmpadas" },
                  { topic: "home/environment", qos: 0, retained: true, desc: "Temperatura, umidade" },
                  { topic: "neurocore/heartbeat", qos: 0, retained: false, desc: "Keep-alive do orquestrador" },
                  { topic: "neurocore/memory/update", qos: 1, retained: true, desc: "Atualização da memória episódica" },
                ].map((t, i) => (
                  <tr key={i} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="p-2 font-mono">{t.topic}</td>
                    <td className="p-2"><Badge variant="secondary" className="text-[9px]">{t.qos}</Badge></td>
                    <td className="p-2">{t.retained ? "✓" : "—"}</td>
                    <td className="p-2 text-muted-foreground">{t.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <Separator />

        {/* 11. Virtual Assistant Bridge */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold">11. Virtual Assistant Bridge</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Módulo de integração bidirecional com assistentes virtuais. Recebe comandos de voz de qualquer plataforma,
            processa no Cognitive Engine, e responde via TTS em português brasileiro. Suporte nativo a tradução LIBRAS → voz.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Google Assistant", desc: "Actions SDK + Dialogflow" },
              { label: "Amazon Alexa", desc: "Alexa Skills Kit" },
              { label: "Apple Siri", desc: "SiriKit + Shortcuts" },
              { label: "Home Assistant Voice", desc: "Rhasspy + Mycroft" },
            ].map((a) => (
              <Card key={a.label}>
                <CardContent className="p-3 text-center">
                  <Mic className="h-5 w-5 text-primary mx-auto mb-1" />
                  <p className="text-[10px] font-semibold">{a.label}</p>
                  <p className="text-[9px] text-muted-foreground">{a.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card>
            <CardContent className="p-3 text-xs text-muted-foreground space-y-1">
              <p><strong className="text-foreground">Fluxo:</strong> Assistente → MQTT (assistant/command) → Cognitive Engine → Decisão → MQTT (assistant/tts) → TTS pt-BR</p>
              <p><strong className="text-foreground">LIBRAS:</strong> Câmera detecta gesto → Vision Engine → MQTT (assistant/libra) → Assistente fala o texto traduzido</p>
              <p><strong className="text-foreground">Latência:</strong> Comando → Resposta {"<"} 200ms (edge) / {"<"} 500ms (cloud)</p>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* 12. Deploy */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold">12. Deploy (Docker + Kubernetes)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Container className="h-4 w-4" /> Docker Compose</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-1">
                <p>• <code className="bg-muted px-1 rounded">neurocore-core</code> — Runtime principal (CUDA + ROS2)</p>
                <p>• <code className="bg-muted px-1 rounded">mqtt-broker</code> — Mosquitto com TLS 1.3</p>
                <p>• <code className="bg-muted px-1 rounded">home-assistant</code> — Integração casa inteligente</p>
                <p>• Volumes: <code className="bg-muted px-1 rounded">./models</code> para modelos IA</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Cloud className="h-4 w-4" /> Kubernetes</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground space-y-1">
                <p>• 3 réplicas com GPU (nvidia.com/gpu: 1)</p>
                <p>• LoadBalancer na porta 1883 (MQTT)</p>
                <p>• ROS_DOMAIN_ID=42 para isolamento</p>
                <p>• Imagem: <code className="bg-muted px-1 rounded">neurocore-ai:latest</code></p>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardContent className="p-3 text-xs text-muted-foreground space-y-1">
              <p><strong className="text-foreground">Base image:</strong> nvidia/cuda:12.4.1-cudnn-runtime-ubuntu22.04</p>
              <p><strong className="text-foreground">Segurança MQTT:</strong> TLS 1.3 + username/password + ACL por tópico</p>
              <p><strong className="text-foreground">Portas:</strong> 1883 (MQTT), 8883 (MQTT TLS), 8765 (WebSocket assistentes)</p>
            </CardContent>
          </Card>
        </section>

        <Separator />

        {/* 13. Repositórios Open Source */}
        <section className="space-y-3">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <GitBranch className="h-5 w-5" /> 13. Repositórios Open Source
          </h2>
          <p className="text-sm text-muted-foreground">
            Lista completa e verificada de todos os projetos open source que compõem o stack NEUROCORE AI, organizados por camada.
          </p>

          {[
            {
              layer: "L1 — Infraestrutura",
              color: "text-cyan-400",
              bg: "border-cyan-500/30",
              repos: [
                { name: "Eclipse Mosquitto", url: "https://github.com/eclipse-mosquitto/mosquitto", license: "EPL-2.0", desc: "MQTT Broker principal" },
                { name: "EMQX", url: "https://github.com/emqx/emqx", license: "Apache-2.0", desc: "Broker MQTT escalável (15k+ stars)" },
                { name: "NanoMQ", url: "https://github.com/emqx/NanoMQ", license: "MIT", desc: "Broker ultra-leve para edge devices" },
                { name: "VerneMQ", url: "https://github.com/vernemq/vernemq", license: "Apache-2.0", desc: "Broker Erlang alta disponibilidade" },
              ],
            },
            {
              layer: "L2 — Visão Computacional",
              color: "text-blue-400",
              bg: "border-blue-500/30",
              repos: [
                { name: "Ultralytics YOLOv11", url: "https://github.com/ultralytics/ultralytics", license: "AGPL-3.0", desc: "Detecção de objetos tempo real" },
                { name: "Google MediaPipe", url: "https://github.com/google-ai-edge/mediapipe", license: "Apache-2.0", desc: "Gestos, mãos, rosto em tempo real" },
                { name: "CMU OpenPose", url: "https://github.com/CMU-Perceptual-Computing-Lab/openpose", license: "Custom", desc: "Pose multi-pessoa avançada" },
                { name: "vision_opencv (ROS2)", url: "https://github.com/ros-perception/vision_opencv", license: "Apache-2.0", desc: "Integração OpenCV + ROS2" },
                { name: "darknet_ros", url: "https://github.com/leggedrobotics/darknet_ros", license: "BSD-3", desc: "YOLO no ROS2" },
                { name: "ros2_pytorch", url: "https://github.com/klintan/ros2_pytorch", license: "Apache-2.0", desc: "PyTorch no ROS2" },
                { name: "PDF Vision API (HF Space)", url: "https://huggingface.co/spaces/Ericsonv12/adv", license: "MIT", desc: "Análise de PDF + visão computacional" },
              ],
            },
            {
              layer: "L3 — LIBRAS + Cognição",
              color: "text-purple-400",
              bg: "border-purple-500/30",
              repos: [
                { name: "sign-language-recognition", url: "https://github.com/Dudu197/sign-language-recognition", license: "MIT", desc: "LIBRAS com skeleton images" },
                { name: "talking-hands", url: "https://github.com/AdrianoCLeao/talking-hands", license: "MIT", desc: "Reconhecimento LIBRAS real-time + voz" },
                { name: "libras_decoder", url: "https://github.com/gugarosa/libras_decoder", license: "MIT", desc: "Alfabeto gestual + tracking" },
                { name: "YOLO11 Sign Language", url: "https://github.com/alihassanml/Yolo11-sign-lanugage-detection", license: "MIT", desc: "40 classes de sinais" },
                { name: "ISLR_LIBRAS", url: "https://github.com/Malta-Lab/ISLR_LIBRAS", license: "MIT", desc: "Toolkit completo LIBRAS" },
                { name: "Omdena Brazilian SL", url: "https://github.com/OmdenaAI/SaoPauloBrazilChapter_BrazilianSignLanguage", license: "MIT", desc: "Projeto Omdena LIBRAS" },
                { name: "LIBRAS Alphabet Dataset", url: "https://github.com/biankatpas/Brazilian-Sign-Language-Alphabet-Dataset", license: "MIT", desc: "Dataset alfabeto LIBRAS" },
                { name: "ViT Fine-tuning (HF)", url: "https://huggingface.co/learn/cookbook/fine_tuning_vit_custom_dataset", license: "Apache-2.0", desc: "Tutorial ViT para LIBRAS" },
              ],
            },
            {
              layer: "L4 — Orquestrador + ROS2",
              color: "text-amber-400",
              bg: "border-amber-500/30",
              repos: [
                { name: "ROS2 Core", url: "https://github.com/ros2/ros2", license: "Apache-2.0", desc: "Framework robótica completo" },
                { name: "Awesome ROS2", url: "https://github.com/fkromer/awesome-ros2", license: "CC0", desc: "Lista curada de pacotes ROS2" },
                { name: "ROS2 Vision Robot", url: "https://github.com/noshluk2/ROS2-Raspberry-PI-Intelligent-Vision-Robot", license: "MIT", desc: "Robô + visão + Raspberry Pi" },
                { name: "Obstacle Avoidance (ROS2)", url: "https://github.com/AI-Geniuses/Autonomous-Robot-Obstacle-Avoidance-with-ROS2", license: "MIT", desc: "Robô autônomo com desvio de obstáculos" },
                { name: "ROS2 Robot Simulation", url: "https://github.com/IFRA-Cranfield/ros2_RobotSimulation", license: "Apache-2.0", desc: "Gazebo + MoveIt2" },
              ],
            },
            {
              layer: "L5 — Interface + Deploy",
              color: "text-emerald-400",
              bg: "border-emerald-500/30",
              repos: [
                { name: "Home Assistant", url: "https://github.com/home-assistant/home-assistant", license: "Apache-2.0", desc: "Casa inteligente + MQTT" },
                { name: "Docker", url: "https://github.com/docker", license: "Apache-2.0", desc: "Containerização" },
                { name: "Kubernetes", url: "https://github.com/kubernetes/kubernetes", license: "Apache-2.0", desc: "Orquestração de containers" },
              ],
            },
          ].map((group) => (
            <Card key={group.layer} className={`${group.bg}`}>
              <CardHeader className="pb-2">
                <CardTitle className={`text-sm ${group.color}`}>{group.layer}</CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                <div className="space-y-1">
                  {group.repos.map((repo) => (
                    <div key={repo.name} className="flex items-center justify-between text-xs py-1 border-b border-border/30 last:border-0">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <a href={repo.url} target="_blank" rel="noopener noreferrer" className="font-medium text-foreground hover:text-primary flex items-center gap-1 shrink-0">
                          {repo.name} <ExternalLink className="h-3 w-3" />
                        </a>
                        <span className="text-muted-foreground truncate hidden sm:inline">— {repo.desc}</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] shrink-0 ml-2">{repo.license}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </section>

        <Separator />

        <div className="text-center text-xs text-muted-foreground py-4">
          <p>NEUROCORE AI v1.0 — Projetado por <strong className="text-foreground">Ericson Piccoli</strong></p>
          <p>Documento gerado em 30 de março de 2026</p>
        </div>
      </div>
    </div>
  );
}
