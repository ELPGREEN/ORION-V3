import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { GlassCard } from "@/components/ui/glass-card";
import { Button } from "@/components/ui/button";
import { Mic, Camera, Hand, Brain, Wifi, Play, Square, AlertCircle } from "lucide-react";

// ─── Voice Tab ───
function VoiceDemo() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [metrics, setMetrics] = useState({ energy: 0, wpm: 0 });
  const recognitionRef = useRef<any>(null);

  const toggle = useCallback(() => {
    if (listening) {
      recognitionRef.current?.stop();
      setListening(false);
      return;
    }
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { setTranscript("⚠ SpeechRecognition not supported"); return; }
    const r = new SR();
    r.continuous = true; r.interimResults = true; r.lang = "pt-BR";
    r.onresult = (e: any) => {
      const t = Array.from(e.results).map((r: any) => r[0].transcript).join(" ");
      setTranscript(t);
      const words = t.split(/\s+/).length;
      setMetrics({ energy: Math.min(1, words / 20), wpm: Math.round(words * 6) });
    };
    r.onerror = () => setListening(false);
    r.onend = () => setListening(false);
    r.start();
    recognitionRef.current = r;
    setListening(true);
  }, [listening]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button onClick={toggle} variant={listening ? "destructive" : "default"} className="gap-2">
          {listening ? <><Square className="w-4 h-4" /> Parar</> : <><Mic className="w-4 h-4" /> Falar com Orion</>}
        </Button>
        {listening && <span className="text-xs text-cyan-400 animate-pulse font-mono">● LISTENING</span>}
      </div>
      <GlassCard className="p-4 border-cyan-500/20 min-h-[80px]">
        <div className="text-xs text-muted-foreground mb-1 font-mono">TRANSCRIPT</div>
        <div className="text-sm">{transcript || "Pressione o botão e fale..."}</div>
      </GlassCard>
      <div className="grid grid-cols-2 gap-3">
        <GlassCard className="p-3 border-emerald-500/20 text-center">
          <div className="text-[10px] text-muted-foreground font-mono">VOCAL ENERGY</div>
          <div className="text-lg font-mono text-emerald-400">{(metrics.energy * 100).toFixed(0)}%</div>
          <div className="h-2 bg-muted rounded-full mt-1">
            <motion.div className="h-full bg-emerald-500 rounded-full" animate={{ width: `${metrics.energy * 100}%` }} />
          </div>
        </GlassCard>
        <GlassCard className="p-3 border-amber-500/20 text-center">
          <div className="text-[10px] text-muted-foreground font-mono">EST. WPM</div>
          <div className="text-lg font-mono text-amber-400">{metrics.wpm}</div>
        </GlassCard>
      </div>
    </div>
  );
}

// ─── Vision Tab ───
function VisionDemo() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [active, setActive] = useState(false);
  const [detections, setDetections] = useState<string[]>([]);

  const toggle = useCallback(async () => {
    if (active) {
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(t => t.stop());
      if (videoRef.current) videoRef.current.srcObject = null;
      setActive(false);
      setDetections([]);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 640, height: 480 } });
      if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); }
      setActive(true);
      // Simulated detections for demo
      const interval = setInterval(() => {
        setDetections(["person (0.94)", "laptop (0.87)", "face (0.91)", "hand (0.83)"].slice(0, Math.floor(Math.random() * 4) + 1));
      }, 2000);
      return () => clearInterval(interval);
    } catch { setDetections(["⚠ Camera access denied"]); }
  }, [active]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button onClick={toggle} variant={active ? "destructive" : "default"} className="gap-2">
          {active ? <><Square className="w-4 h-4" /> Desativar Câmera</> : <><Camera className="w-4 h-4" /> Ativar Câmera</>}
        </Button>
        {active && <span className="text-xs text-emerald-400 font-mono">● YOLO + MediaPipe Active</span>}
      </div>
      <div className="relative rounded-lg overflow-hidden bg-black/50 aspect-video max-w-md">
        <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
        {!active && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
            <Camera className="w-8 h-8 opacity-30" />
          </div>
        )}
        {active && detections.length > 0 && (
          <div className="absolute top-2 left-2 space-y-1">
            {detections.map((d, i) => (
              <div key={i} className="text-[10px] font-mono bg-black/60 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/30">{d}</div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Gestures Tab ───
function GesturesDemo() {
  const [simulating, setSimulating] = useState(false);
  const [gesture, setGesture] = useState({ type: "idle", confidence: 0 });

  const simulate = () => {
    setSimulating(true);
    const gestures = [
      { type: "open_palm", confidence: 0.92 },
      { type: "thumbs_up", confidence: 0.88 },
      { type: "pointing", confidence: 0.85 },
      { type: "closed_fist", confidence: 0.91 },
      { type: "peace_sign", confidence: 0.87 },
    ];
    let i = 0;
    const id = setInterval(() => {
      setGesture(gestures[i % gestures.length]);
      i++;
    }, 1500);
    setTimeout(() => { clearInterval(id); setSimulating(false); setGesture({ type: "idle", confidence: 0 }); }, 10000);
  };

  return (
    <div className="space-y-4">
      <Button onClick={simulate} disabled={simulating} className="gap-2">
        <Hand className="w-4 h-4" /> {simulating ? "Analisando Gestos..." : "Simular Detecção de Gestos"}
      </Button>
      <div className="grid grid-cols-2 gap-3">
        <GlassCard className="p-4 border-rose-500/20">
          <div className="text-[10px] text-muted-foreground font-mono mb-2">DETECTED GESTURE</div>
          <div className="text-xl font-mono text-rose-400">{gesture.type}</div>
        </GlassCard>
        <GlassCard className="p-4 border-rose-500/20">
          <div className="text-[10px] text-muted-foreground font-mono mb-2">CONFIDENCE</div>
          <div className="text-xl font-mono text-rose-400">{gesture.confidence > 0 ? `${(gesture.confidence * 100).toFixed(0)}%` : "—"}</div>
        </GlassCard>
      </div>
      <GlassCard className="p-3 border-muted">
        <div className="text-[10px] font-mono text-muted-foreground">
          BODY LANGUAGE: {simulating ? "Lean: forward · Nod: detected · Gaze: direct · Engagement: high" : "Awaiting input..."}
        </div>
      </GlassCard>
    </div>
  );
}

// ─── Cognition Tab ───
function CognitionDemo() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);

  const runCycle = () => {
    setRunning(true);
    setTimeout(() => {
      try {
        const { runConsciousnessBridge } = require("@/lib/neural/consciousness-bridge");
        const snap = runConsciousnessBridge({
          intent: "auto_construct",
          query: "Analyze precedent chain for constitutional rights violation in employment discrimination case",
          hasVision: false, hasAudio: false,
          memoryFacts: ["case_loaded", "precedents_found", "constitutional_framework"],
          activeModules: ["causal-reasoning", "theory-of-mind", "meta-learning"],
        });
        setResult(snap);
      } catch {
        setResult({ error: true });
      }
      setRunning(false);
    }, 500);
  };

  return (
    <div className="space-y-4">
      <Button onClick={runCycle} disabled={running} className="gap-2">
        <Brain className="w-4 h-4" /> {running ? "Processando..." : "Executar Ciclo Cognitivo"}
      </Button>
      {result && !result.error && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { k: "Consciousness", v: result.consciousnessLevel },
            { k: "Phi", v: result.phi?.toFixed(3) },
            { k: "PLV", v: result.globalPLV?.toFixed(3) },
            { k: "γ-CTC", v: result.gammaCTC?.toFixed(3) },
            { k: "HRL Steps", v: result.hrl?.planSteps },
            { k: "Processing", v: `${result.processingTimeMs?.toFixed(0)}ms` },
          ].map(m => (
            <GlassCard key={m.k} className="p-3 border-cyan-500/20 text-center">
              <div className="text-[10px] text-muted-foreground font-mono">{m.k}</div>
              <div className="text-lg font-mono text-cyan-400">{m.v}</div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── IoT Tab ───
function IoTDemo() {
  const [simulating, setSimulating] = useState(false);
  const [telemetry, setTelemetry] = useState({
    battery: 87, velocity: 0, position: { x: 0, y: 0 }, status: "idle",
  });

  const simulate = () => {
    setSimulating(true);
    let step = 0;
    const id = setInterval(() => {
      step++;
      setTelemetry({
        battery: Math.max(10, 87 - step * 0.5),
        velocity: 0.3 + Math.random() * 0.4,
        position: { x: +(step * 0.15).toFixed(2), y: +(Math.sin(step * 0.3) * 2).toFixed(2) },
        status: step < 5 ? "navigating" : step < 10 ? "scanning" : "returning",
      });
    }, 1000);
    setTimeout(() => { clearInterval(id); setSimulating(false); setTelemetry(t => ({ ...t, status: "idle", velocity: 0 })); }, 15000);
  };

  const topics = [
    "robot/orion-01/cmd_vel", "robot/orion-01/odom", "robot/orion-01/scan",
    "robot/orion-01/battery", "robot/orion-01/imu", "robot/orion-01/status",
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button onClick={simulate} disabled={simulating} className="gap-2">
          <Wifi className="w-4 h-4" /> {simulating ? "Simulando..." : "Simular Robô ROS2"}
        </Button>
        {simulating && <span className="text-xs text-emerald-400 font-mono animate-pulse">● MQTT Connected</span>}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { k: "Battery", v: `${telemetry.battery.toFixed(0)}%`, c: telemetry.battery > 30 ? "text-emerald-400" : "text-rose-400" },
          { k: "Velocity", v: `${telemetry.velocity.toFixed(2)} m/s`, c: "text-cyan-400" },
          { k: "Position", v: `(${telemetry.position.x}, ${telemetry.position.y})`, c: "text-violet-400" },
          { k: "Status", v: telemetry.status, c: "text-amber-400" },
        ].map(m => (
          <GlassCard key={m.k} className="p-3 border-emerald-500/20 text-center">
            <div className="text-[10px] text-muted-foreground font-mono">{m.k}</div>
            <div className={`text-sm font-mono ${m.c}`}>{m.v}</div>
          </GlassCard>
        ))}
      </div>
      <GlassCard className="p-3 border-muted">
        <div className="text-[10px] font-mono text-muted-foreground mb-2">ROS2 TOPICS (MQTT)</div>
        <div className="flex flex-wrap gap-1">
          {topics.map(t => (
            <span key={t} className="text-[9px] font-mono bg-muted/50 text-cyan-300 px-2 py-0.5 rounded border border-cyan-500/20">{t}</span>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}

// ─── Main ───
export function CapabilitiesDemo() {
  return (
    <Tabs defaultValue="voice" className="w-full">
      <TabsList className="bg-background/50 border border-border w-full flex-wrap h-auto gap-1 p-1">
        <TabsTrigger value="voice" className="gap-1.5 text-xs"><Mic className="w-3.5 h-3.5" /> Voz</TabsTrigger>
        <TabsTrigger value="vision" className="gap-1.5 text-xs"><Camera className="w-3.5 h-3.5" /> Visão</TabsTrigger>
        <TabsTrigger value="gestures" className="gap-1.5 text-xs"><Hand className="w-3.5 h-3.5" /> Gestos</TabsTrigger>
        <TabsTrigger value="cognition" className="gap-1.5 text-xs"><Brain className="w-3.5 h-3.5" /> Cognição</TabsTrigger>
        <TabsTrigger value="iot" className="gap-1.5 text-xs"><Wifi className="w-3.5 h-3.5" /> IoT/Robô</TabsTrigger>
      </TabsList>
      <AnimatePresence mode="wait">
        {["voice", "vision", "gestures", "cognition", "iot"].map(tab => (
          <TabsContent key={tab} value={tab} className="mt-4">
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              {tab === "voice" && <VoiceDemo />}
              {tab === "vision" && <VisionDemo />}
              {tab === "gestures" && <GesturesDemo />}
              {tab === "cognition" && <CognitionDemo />}
              {tab === "iot" && <IoTDemo />}
            </motion.div>
          </TabsContent>
        ))}
      </AnimatePresence>
    </Tabs>
  );
}
