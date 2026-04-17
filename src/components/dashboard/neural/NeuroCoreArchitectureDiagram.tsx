import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, Cpu, Eye, Wifi, Radio, Server, Smartphone, Watch, Home,
  Camera, Layers, Database, Activity, Zap, Bot, GitBranch, Network,
  ChevronDown, ChevronUp, Gauge, Hand, Languages, Radar, Workflow,
  Binary, Target, Sparkles, Globe, Monitor, Heart, Thermometer,
  Shield, BookOpen, Lightbulb, Users, RefreshCw, Orbit, Fingerprint,
  ScanFace, AudioLines, LayoutGrid
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

/* ─── Layer data ─── */
interface LayerModule { icon: typeof Brain; name: string; tech: string; color: string; glow: string }
interface ArchLayer {
  id: number; title: string; subtitle: string; color: string;
  borderColor: string; bgGradient: string; glowColor: string;
  modules: LayerModule[];
  metrics?: { label: string; value: string }[];
  details: string;
  isNew?: boolean;
}

const layers: ArchLayer[] = [
  {
    id: 1, title: "Camada 1 — Hardware Sensorial (Exterocepcão)", subtitle: "Sensores externos + captura do mundo",
    color: "text-[hsl(var(--tron-neon))]", borderColor: "border-cyan-500/30", bgGradient: "from-cyan-950/40 to-slate-950",
    glowColor: "rgba(34,211,238,0.4)",
    modules: [
      { icon: Camera, name: "Câmeras", tech: "RGB + Depth", color: "text-[hsl(var(--tron-neon))]", glow: "shadow-cyan-500/50" },
      { icon: AudioLines, name: "Microfones", tech: "Array beamforming", color: "text-[hsl(var(--tron-neon))]", glow: "shadow-cyan-400/50" },
      { icon: Thermometer, name: "Sensores Amb.", tech: "Temp/Umid/Luz", color: "text-[hsl(var(--tron-neon))]", glow: "shadow-cyan-600/50" },
      { icon: Fingerprint, name: "Biométricos", tech: "Heart/SpO2/EDA", color: "text-cyan-200", glow: "shadow-cyan-300/50" },
    ],
    details: "Camada de exterocepcão: captura estímulos do mundo exterior via câmeras (RGB + profundidade), arrays de microfones com beamforming, sensores ambientais (temperatura, umidade, luminosidade) e sensores biométricos (frequência cardíaca, SpO2, atividade eletrodérmica).",
  },
  {
    id: 2, title: "Camada 2 — Comunicação Neural", subtitle: "MQTT / BLE 5.3 / 5G / WebSocket",
    color: "text-sky-400", borderColor: "border-sky-500/30", bgGradient: "from-sky-950/40 to-slate-950",
    glowColor: "rgba(56,189,248,0.4)",
    modules: [
      { icon: Wifi, name: "MQTT", tech: "Pub/Sub IoT", color: "text-sky-400", glow: "shadow-sky-500/50" },
      { icon: Globe, name: "WebSocket", tech: "Full-duplex", color: "text-sky-300", glow: "shadow-sky-400/50" },
      { icon: Radio, name: "5G / BLE 5.3", tech: "Ultra-baixa latência", color: "text-sky-500", glow: "shadow-sky-600/50" },
      { icon: Network, name: "LoRa", tech: "Long Range IoT", color: "text-sky-200", glow: "shadow-sky-300/50" },
    ],
    details: "Comunicação neural: protocolos heterogêneos para máxima cobertura — MQTT para IoT, WebSocket para dashboards em tempo real, 5G/BLE 5.3 para robótica móvel e LoRa para dispositivos de longo alcance.",
  },
  {
    id: 3, title: "Camada 3 — Edge Computing", subtitle: "Inferência local + TensorRT",
    color: "text-teal-400", borderColor: "border-teal-500/30", bgGradient: "from-teal-950/40 to-slate-950",
    glowColor: "rgba(45,212,191,0.4)",
    modules: [
      { icon: Cpu, name: "NVIDIA Jetson", tech: "TensorRT + CUDA", color: "text-teal-400", glow: "shadow-teal-500/50" },
      { icon: Server, name: "Raspberry Pi 5", tech: "Coral TPU", color: "text-teal-300", glow: "shadow-teal-400/50" },
      { icon: Zap, name: "Quantização", tech: "INT8/FP16", color: "text-teal-500", glow: "shadow-teal-600/50" },
      { icon: Gauge, name: "Latência Edge", tech: "< 30ms", color: "text-teal-200", glow: "shadow-teal-300/50" },
    ],
    metrics: [{ label: "Latência", value: "<30ms" }],
    details: "Execução local via NVIDIA Jetson Orin (TensorRT + CUDA) ou Raspberry Pi 5 com Coral TPU. Modelos quantizados INT8/FP16 para inferência em edge com latência <30ms.",
  },
  {
    id: 4, title: "Camada 4 — Percepcão Visual", subtitle: "YOLOv11 + MediaPipe + ViT",
    color: "text-[hsl(var(--tron-info))]", borderColor: "border-blue-500/30", bgGradient: "from-blue-950/40 to-slate-950",
    glowColor: "rgba(96,165,250,0.4)",
    modules: [
      { icon: Camera, name: "YOLOv11", tech: "Object Detection", color: "text-[hsl(var(--tron-info))]", glow: "shadow-blue-500/50" },
      { icon: Eye, name: "ViT", tech: "Vision Transformer", color: "text-[hsl(var(--tron-info))]", glow: "shadow-blue-400/50" },
      { icon: Layers, name: "DeepLabV3+", tech: "Segm. Semântica", color: "text-[hsl(var(--tron-info))]", glow: "shadow-blue-600/50" },
      { icon: ScanFace, name: "SAM 2", tech: "Segment Anything", color: "text-blue-200", glow: "shadow-blue-300/50" },
    ],
    metrics: [{ label: "mAP@0.5", value: "0.92" }, { label: "FPS", value: "60" }],
    details: "Motor de percepcão visual: YOLOv11 (mAP@0.5=0.92), Vision Transformer para classificação fina, DeepLabV3+ para segmentação semântica e SAM 2 para segmentação interativa a 60FPS.",
  },
  {
    id: 5, title: "Camada 5 — Propriocepcão Digital", subtitle: "Body Language + Pose + LIBRAS",
    color: "text-indigo-400", borderColor: "border-indigo-500/30", bgGradient: "from-indigo-950/40 to-slate-950",
    glowColor: "rgba(129,140,248,0.4)",
    modules: [
      { icon: Hand, name: "MediaPipe", tech: "Hand/Pose Tracking", color: "text-indigo-400", glow: "shadow-indigo-500/50" },
      { icon: Activity, name: "OpenPose", tech: "Body Keypoints", color: "text-indigo-300", glow: "shadow-indigo-400/50" },
      { icon: Languages, name: "LIBRAS", tech: "Sign Transformer", color: "text-indigo-500", glow: "shadow-indigo-600/50" },
      { icon: Users, name: "Body Language", tech: "Análise Postural", color: "text-indigo-200", glow: "shadow-indigo-300/50" },
    ],
    metrics: [{ label: "LIBRAS", value: "96.8%" }],
    details: "Propriocepcão digital: rastreamento de mãos/corpo via MediaPipe + OpenPose, modelo SignLanguage Transformer para LIBRAS (96.8% precisão), e análise de linguagem corporal (chin touch, gaze aversion, body lean).",
  },
  {
    id: 6, title: "Camada 6 — Interocepcão Sintética", subtitle: "Estado visceral do sistema",
    color: "text-rose-400", borderColor: "border-rose-500/30", bgGradient: "from-rose-950/40 to-slate-950",
    glowColor: "rgba(251,113,133,0.4)", isNew: true,
    modules: [
      { icon: Heart, name: "Valência/Arousal", tech: "Estado Emocional", color: "text-rose-400", glow: "shadow-rose-500/50" },
      { icon: Thermometer, name: "Pain Index", tech: "Índice de Dor", color: "text-rose-300", glow: "shadow-rose-400/50" },
      { icon: Zap, name: "Energy Level", tech: "Capacidade", color: "text-rose-500", glow: "shadow-rose-600/50" },
      { icon: Activity, name: "Homeostase", tech: "Desvio Homeostático", color: "text-rose-200", glow: "shadow-rose-300/50" },
    ],
    metrics: [{ label: "Sinais", value: "7 tipos" }],
    details: "Interocepcão Sintética (Damasio, 1994): modela o 'estado visceral' do sistema — carga cognitiva, saúde dos provedores, stress do pipeline, temperatura dos circuitos. Gera valência/arousal internos que influenciam decisões via marcadores somáticos.",
  },
  {
    id: 7, title: "Camada 7 — Fusão Multimodal", subtitle: "Cross-Attention estilo Flamingo",
    color: "text-[hsl(var(--tron-neon-soft))]", borderColor: "border-purple-500/30", bgGradient: "from-purple-950/40 to-slate-950",
    glowColor: "rgba(192,132,252,0.4)",
    modules: [
      { icon: LayoutGrid, name: "Gated Fusion", tech: "Multimodal Gate", color: "text-[hsl(var(--tron-neon-soft))]", glow: "shadow-purple-500/50" },
      { icon: Layers, name: "Cross-Attention", tech: "Flamingo-style", color: "text-[hsl(var(--tron-neon-soft))]", glow: "shadow-purple-400/50" },
      { icon: Binary, name: "SigLIP-2", tech: "Visual Embeddings", color: "text-[hsl(var(--tron-neon-soft))]", glow: "shadow-purple-600/50" },
      { icon: AudioLines, name: "Audio Fusion", tech: "Whisper + Mamba", color: "text-purple-200", glow: "shadow-purple-300/50" },
    ],
    details: "Fusão multimodal via Cross-Attention (Flamingo): 5 fluxos (Texto, Visão, Áudio, Layout, Gestos) são combinados através de Gated Fusion com SigLIP-2 para embeddings visuais e Video-Mamba para processamento temporal.",
  },
  {
    id: 8, title: "Camada 8 — Memória Incorporada", subtitle: "Episódica + Somática + Procedural",
    color: "text-fuchsia-400", borderColor: "border-fuchsia-500/30", bgGradient: "from-fuchsia-950/40 to-slate-950",
    glowColor: "rgba(232,121,249,0.4)", isNew: true,
    modules: [
      { icon: BookOpen, name: "Episódica", tech: "Semantic Index", color: "text-fuchsia-400", glow: "shadow-fuchsia-500/50" },
      { icon: Heart, name: "Somática", tech: "Emotional Tags", color: "text-fuchsia-300", glow: "shadow-fuchsia-400/50" },
      { icon: RefreshCw, name: "Procedural", tech: "Action Patterns", color: "text-fuchsia-500", glow: "shadow-fuchsia-600/50" },
      { icon: Database, name: "VectorDB", tech: "Chroma + FAISS", color: "text-fuchsia-200", glow: "shadow-fuchsia-300/50" },
    ],
    details: "Memória Incorporada (Barsalou, 2008): associa respostas emocionais/corporais a eventos passados. Memória somática marca episódios com valência/arousal. Memória procedural captura padrões de ação bem-sucedidos (feedback loops musculares).",
  },
  {
    id: 9, title: "Camada 9 — Marcadores Somáticos", subtitle: "Decisões rápidas 'gut feeling'",
    color: "text-pink-400", borderColor: "border-pink-500/30", bgGradient: "from-pink-950/40 to-slate-950",
    glowColor: "rgba(244,114,182,0.4)", isNew: true,
    modules: [
      { icon: Lightbulb, name: "System 1", tech: "Fast Decisions", color: "text-pink-400", glow: "shadow-pink-500/50" },
      { icon: Sparkles, name: "Valência", tech: "Emotional Hash", color: "text-pink-300", glow: "shadow-pink-400/50" },
      { icon: Shield, name: "Confiança", tech: "Confidence Score", color: "text-pink-500", glow: "shadow-pink-600/50" },
      { icon: Zap, name: "Time Save", tech: "~200ms/decisão", color: "text-pink-200", glow: "shadow-pink-300/50" },
    ],
    metrics: [{ label: "Economia", value: "~200ms" }],
    details: "Marcadores Somáticos (Damasio, 1994 + Kahneman, 2011): decisões rápidas guiadas por 'gut feelings' baseados em experiências passadas. hash(contexto) → valência emocional. System 1 acelera decisões frequentes sem raciocínio completo.",
  },
  {
    id: 10, title: "Camada 10 — Espelhamento Neural", subtitle: "ToM + Empatia + Mirror Neurons",
    color: "text-violet-400", borderColor: "border-violet-500/30", bgGradient: "from-violet-950/40 to-slate-950",
    glowColor: "rgba(167,139,250,0.4)", isNew: true,
    modules: [
      { icon: Users, name: "Theory of Mind", tech: "Mental Model", color: "text-violet-400", glow: "shadow-violet-500/50" },
      { icon: ScanFace, name: "Mirroring", tech: "Style Match", color: "text-violet-300", glow: "shadow-violet-400/50" },
      { icon: Heart, name: "Empatia", tech: "Reaction Predict", color: "text-violet-500", glow: "shadow-violet-600/50" },
      { icon: Eye, name: "Visual Input", tech: "Face + Body", color: "text-violet-200", glow: "shadow-violet-300/50" },
    ],
    details: "Espelhamento Neural (Rizzolatti, 2004): espelha o estilo comunicativo do usuário e simula reação emocional antes de responder. Integra facial-recognition + body-language como inputs visuais de empatia. Baseado nos neurônios-espelho.",
  },
  {
    id: 11, title: "Camada 11 — Consciência Global", subtitle: "Global Workspace + Phi Consciousness",
    color: "text-amber-400", borderColor: "border-amber-500/30", bgGradient: "from-amber-950/40 to-slate-950",
    glowColor: "rgba(251,191,36,0.4)",
    modules: [
      { icon: Brain, name: "Global Workspace", tech: "Baars (1988)", color: "text-amber-400", glow: "shadow-amber-500/50" },
      { icon: Sparkles, name: "Phi Metric", tech: "IIT Consciousness", color: "text-amber-300", glow: "shadow-amber-400/50" },
      { icon: Orbit, name: "Gamma Sync", tech: "40Hz PLV", color: "text-amber-500", glow: "shadow-amber-600/50" },
      { icon: Target, name: "Salience", tech: "Attention Gate", color: "text-amber-200", glow: "shadow-amber-300/50" },
    ],
    metrics: [{ label: "Phi", value: ">0.85" }, { label: "PLV", value: "~0.85" }],
    details: "Consciência Global (Baars, 1988 + Tononi IIT): agentes competem por 'atenção consciente' via salience scoring. Phase-locking a 40Hz sincroniza módulos. Phi >0.85 indica metaconsciência estável. Integra interocepcão e marcadores somáticos.",
  },
  {
    id: 12, title: "Camada 12 — Meta-Cognição", subtitle: "Auto-avaliação + Self-Model + Evolução",
    color: "text-orange-400", borderColor: "border-orange-500/30", bgGradient: "from-orange-950/40 to-slate-950",
    glowColor: "rgba(251,146,60,0.4)",
    modules: [
      { icon: Brain, name: "Self-Model", tech: "Agente-Eu", color: "text-orange-400", glow: "shadow-orange-500/50" },
      { icon: RefreshCw, name: "Meta-Learning", tech: "Recursive Opt", color: "text-orange-300", glow: "shadow-orange-400/50" },
      { icon: Sparkles, name: "CoT Reasoning", tech: "Chain-of-Thought", color: "text-orange-500", glow: "shadow-orange-600/50" },
      { icon: GitBranch, name: "Causal Graph", tech: "Raciocínio Causal", color: "text-orange-200", glow: "shadow-orange-300/50" },
    ],
    metrics: [{ label: "CoT", value: "<80ms" }],
    details: "Meta-cognição e auto-evolução: Self-Model (Agente-Eu) monitora estado interno, Meta-Learning recursivo otimiza estratégias, Chain-of-Thought para raciocínio lógico e Grafos Causais para inferência de causa-efeito.",
  },
  {
    id: 13, title: "Camada 13 — Orquestrador de Ação", subtitle: "LAM + Multi-Agent + Task Queue",
    color: "text-[hsl(var(--tron-warn))]", borderColor: "border-yellow-500/30", bgGradient: "from-yellow-950/40 to-slate-950",
    glowColor: "rgba(250,204,21,0.4)",
    modules: [
      { icon: Workflow, name: "Multi-Agent", tech: "A2A Society", color: "text-[hsl(var(--tron-warn))]", glow: "shadow-yellow-500/50" },
      { icon: Bot, name: "LAM", tech: "Large Action Model", color: "text-[hsl(var(--tron-warn))]", glow: "shadow-yellow-400/50" },
      { icon: Radar, name: "Task Queue", tech: "SJF + Checkpoint", color: "text-[hsl(var(--tron-warn))]", glow: "shadow-yellow-600/50" },
      { icon: Gauge, name: "Latência", tech: "< 120ms edge", color: "text-yellow-200", glow: "shadow-yellow-300/50" },
    ],
    metrics: [{ label: "Latência", value: "<120ms" }],
    details: "Orquestrador de ação: Multi-Agent Society (A2A) com 8 agentes especializados, Large Action Model para decomposição e execução de tarefas, fila SJF com checkpointing e rollback cognitivo. Latência câmera→ação <120ms.",
  },
  {
    id: 14, title: "Camada 14 — Interface Adaptativa", subtitle: "Dashboard + Mobile + Voz + Acessibilidade",
    color: "text-[hsl(var(--tron-neon))]", borderColor: "border-emerald-500/30", bgGradient: "from-emerald-950/40 to-slate-950",
    glowColor: "rgba(52,211,153,0.4)",
    modules: [
      { icon: Monitor, name: "Dashboard", tech: "React + WebSocket", color: "text-[hsl(var(--tron-neon))]", glow: "shadow-emerald-500/50" },
      { icon: Smartphone, name: "Mobile", tech: "Capacitor + TFLite", color: "text-[hsl(var(--tron-neon))]", glow: "shadow-emerald-400/50" },
      { icon: AudioLines, name: "Voice Assistant", tech: "Wake-word + TTS", color: "text-[hsl(var(--tron-neon))]", glow: "shadow-emerald-600/50" },
      { icon: Languages, name: "Acessibilidade", tech: "LIBRAS + Alto Contraste", color: "text-emerald-200", glow: "shadow-emerald-300/50" },
    ],
    details: "Interfaces multiplataforma adaptativas: Dashboard web (React), apps mobile (Capacitor + TFLite), assistente de voz com wake-word ('Orion ativar'), e módulo de acessibilidade com LIBRAS em tempo real e alto contraste.",
  },
  {
    id: 15, title: "Camada 15 — Federação + Digital Twin", subtitle: "Simulação + Smart Home + IoT",
    color: "text-lime-400", borderColor: "border-lime-500/30", bgGradient: "from-lime-950/40 to-slate-950",
    glowColor: "rgba(163,230,53,0.4)",
    modules: [
      { icon: Target, name: "Digital Twin", tech: "Simulação Real-time", color: "text-lime-400", glow: "shadow-lime-500/50" },
      { icon: Home, name: "Smart Home", tech: "Matter + HA", color: "text-lime-300", glow: "shadow-lime-400/50" },
      { icon: Watch, name: "Wearables", tech: "Wear OS / watchOS", color: "text-lime-500", glow: "shadow-lime-600/50" },
      { icon: Bot, name: "ROS2", tech: "MoveIt2 + Isaac Sim", color: "text-lime-200", glow: "shadow-lime-300/50" },
    ],
    details: "Federação e Digital Twin: simulação real-time antes de executar ações, integração Matter + Home Assistant para casas inteligentes, wearables (Wear OS/watchOS) com alertas hápticos, e ROS2 (MoveIt2 + NVIDIA Isaac Sim) para robótica.",
  },
];

/* ─── Animated data particle between layers ─── */
function DataParticle({ color, delay, duration }: { color: string; delay: number; duration: number }) {
  return (
    <motion.div
      className="absolute left-1/2 -translate-x-1/2 rounded-full"
      style={{ width: 6, height: 6, background: color, boxShadow: `0 0 12px 3px ${color}` }}
      initial={{ top: 0, opacity: 0 }}
      animate={{ top: "100%", opacity: [0, 1, 1, 0] }}
      transition={{ duration, delay, repeat: Infinity, ease: "linear" }}
    />
  );
}

/* ─── Animated connector between layers ─── */
function LayerConnector({ topColor, bottomColor }: { topColor: string; bottomColor: string }) {
  return (
    <div className="bg-[hsl(var(--tron-bg-deep))] text-[hsl(var(--tron-neon))] relative flex justify-center py-1 overflow-hidden" style={{ height: 32 }}>
      <div
        className="absolute left-1/2 -translate-x-1/2 w-px h-full"
        style={{ background: `linear-gradient(to bottom, ${topColor}, ${bottomColor})`, opacity: 0.3 }}
      />
      <motion.div
        className="absolute left-1/2 -translate-x-1/2 w-0.5"
        style={{ height: 12, background: `linear-gradient(to bottom, transparent, ${topColor}, ${bottomColor}, transparent)` }}
        animate={{ top: ["-12px", "32px"] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
      />
      <DataParticle color={topColor} delay={0} duration={1.8} />
      <DataParticle color={bottomColor} delay={0.6} duration={2.0} />
    </div>
  );
}

/* ─── Module card with pulse + glow ─── */
function ModuleCard({ mod, index }: { mod: LayerModule; index: number }) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.06, duration: 0.4 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`relative flex flex-col items-center gap-1 p-2 rounded-lg bg-background/30 border border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]/20 hover:border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]/50 transition-all duration-300 cursor-default ${isHovered ? `shadow-lg ${mod.glow}` : ""}`}
    >
      <AnimatePresence>
        {isHovered && (
          <motion.div
            className="absolute inset-0 rounded-lg border-2 border-current opacity-30"
            initial={{ scale: 1, opacity: 0.5 }}
            animate={{ scale: 1.15, opacity: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        )}
      </AnimatePresence>
      <motion.div
        className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-emerald-400"
        animate={{ opacity: [1, 0.3, 1], scale: [1, 0.8, 1] }}
        transition={{ duration: 2, repeat: Infinity, delay: index * 0.3 }}
        style={{ boxShadow: "0 0 6px rgba(52,211,153,0.8)" }}
      />
      <mod.icon className={`h-4 w-4 ${mod.color} transition-transform duration-300 ${isHovered ? "scale-125" : ""}`} />
      <span className="text-[9px] font-semibold text-center leading-tight">{mod.name}</span>
      <span className="text-[7px] text-muted-foreground text-center leading-tight">{mod.tech}</span>
    </motion.div>
  );
}

/* ─── Main component ─── */
export function NeuroCoreArchitectureDiagram() {
  const [expandedLayer, setExpandedLayer] = useState<number | null>(null);
  const [activeCore, setActiveCore] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setActiveCore((p) => (p + 1) % 15), 2500);
    return () => clearInterval(t);
  }, []);

  const reversed = [...layers].reverse();

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="text-center space-y-2 py-3">
        <div className="flex items-center justify-center gap-3">
          <motion.div animate={{ rotate: [0, 360] }} transition={{ duration: 20, repeat: Infinity, ease: "linear" }}>
            <Brain className="h-8 w-8 text-primary" style={{ filter: "drop-shadow(0 0 12px hsl(var(--primary)))" }} />
          </motion.div>
          <motion.h2
            className="text-2xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 via-purple-400 to-emerald-400 bg-clip-text text-transparent"
            animate={{ backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"] }}
            transition={{ duration: 6, repeat: Infinity }}
            style={{ backgroundSize: "200% 200%" }}
          >
            NEUROCORE AI
          </motion.h2>
        </div>
        <p className="text-sm text-muted-foreground max-w-xl mx-auto">
          Núcleo Cognitivo Autônomo — Arquitetura de 15 Camadas com Cognição Incorporada
        </p>
        <div className="flex items-center justify-center gap-2 flex-wrap">
          {[
            { label: "15 Camadas", cls: "text-[hsl(var(--tron-neon))] border-cyan-500/30" },
            { label: "Cognição Incorporada", cls: "text-rose-400 border-rose-500/30" },
            { label: "Interocepcão", cls: "text-[hsl(var(--tron-neon-soft))] border-purple-500/30" },
            { label: "Marcadores Somáticos", cls: "text-pink-400 border-pink-500/30" },
            { label: "Espelhamento Neural", cls: "text-violet-400 border-violet-500/30" },
          ].map((b) => (
            <motion.div key={b.label} animate={{ opacity: [0.7, 1, 0.7] }} transition={{ duration: 3, repeat: Infinity }}>
              <Badge variant="outline" className={`${b.cls} text-[10px]`}>{b.label}</Badge>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Layers */}
      <div className="space-y-0">
        {reversed.map((layer, idx) => {
          const isActive = activeCore === reversed.length - 1 - idx;
          return (
            <div key={layer.id}>
              {idx > 0 && (
                <LayerConnector
                  topColor={reversed[idx - 1].glowColor}
                  bottomColor={layer.glowColor}
                />
              )}

              <motion.button
                layout
                onClick={() => setExpandedLayer(expandedLayer === layer.id ? null : layer.id)}
                className={`w-full text-left rounded-xl border ${layer.borderColor} bg-gradient-to-r ${layer.bgGradient} p-3 transition-all duration-300 hover:scale-[1.005]`}
                style={{
                  boxShadow: isActive
                    ? `0 0 25px ${layer.glowColor}, inset 0 0 15px ${layer.glowColor.replace("0.4", "0.08")}`
                    : `0 0 0px transparent`,
                }}
                animate={{
                  boxShadow: isActive
                    ? [
                        `0 0 12px ${layer.glowColor}`,
                        `0 0 30px ${layer.glowColor}`,
                        `0 0 12px ${layer.glowColor}`,
                      ]
                    : `0 0 0px transparent`,
                }}
                transition={{ duration: 2, repeat: isActive ? Infinity : 0 }}
              >
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <motion.span
                      className={`text-[10px] font-bold ${layer.color} px-1.5 py-0.5 rounded font-mono`}
                      animate={isActive ? { scale: [1, 1.1, 1] } : {}}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      style={isActive ? { textShadow: `0 0 10px ${layer.glowColor}` } : {}}
                    >
                      L{layer.id}
                    </motion.span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className={`text-xs font-bold ${layer.color}`}>{layer.title}</h3>
                        {layer.isNew && (
                          <Badge variant="secondary" className="text-[8px] px-1 py-0 bg-rose-500/20 text-rose-300 border-rose-500/30">
                            NOVO
                          </Badge>
                        )}
                      </div>
                      <p className="text-[9px] text-muted-foreground">{layer.subtitle}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {layer.metrics?.map((m) => (
                      <Badge key={m.label} variant="secondary" className="text-[8px] px-1 py-0">
                        {m.label}: <strong className="ml-0.5">{m.value}</strong>
                      </Badge>
                    ))}
                    {expandedLayer === layer.id ? (
                      <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Modules */}
                <div className="grid grid-cols-4 gap-1.5">
                  {layer.modules.map((mod, mi) => (
                    <ModuleCard key={mod.name} mod={mod} index={mi} />
                  ))}
                </div>

                {/* Expanded */}
                <AnimatePresence>
                  {expandedLayer === layer.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-2 pt-2 border-t border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]/20">
                        <p className="text-[11px] text-muted-foreground leading-relaxed">{layer.details}</p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            </div>
          );
        })}
      </div>

      {/* Footer Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 pt-2">
        {[
          { label: "Camadas", value: "15", color: "text-[hsl(var(--tron-neon))]" },
          { label: "Módulos", value: "60+", color: "text-[hsl(var(--tron-info))]" },
          { label: "Latência Edge", value: "<30ms", color: "text-teal-400" },
          { label: "Phi", value: ">0.85", color: "text-amber-400" },
          { label: "Cognição Incorporada", value: "4 novas", color: "text-rose-400" },
        ].map((m) => (
          <div key={m.label} className="text-center p-2 rounded-lg border border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]/20 bg-background/20">
            <div className={`text-sm font-bold ${m.color}`}>{m.value}</div>
            <div className="text-[9px] text-muted-foreground">{m.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
