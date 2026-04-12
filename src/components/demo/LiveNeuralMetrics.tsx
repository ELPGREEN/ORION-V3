import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { runConsciousnessBridge, type ConsciousnessCycleSnapshot, type ReasoningContext } from "@/lib/neural/consciousness-bridge";
import { GlassCard } from "@/components/ui/glass-card";
import { Brain, Activity, Waves, Zap, Target, Eye } from "lucide-react";

const DEMO_QUERIES = [
  "Analyzing constitutional law precedents for fundamental rights cases",
  "Processing multi-modal sensor fusion from robotic arm telemetry",
  "Evaluating causal reasoning chains for contract dispute resolution",
  "Running Theory of Mind inference on adversarial negotiation patterns",
  "Synthesizing GDPR compliance assessment with AI Act requirements",
];

export function LiveNeuralMetrics() {
  const [snapshot, setSnapshot] = useState<ConsciousnessCycleSnapshot | null>(null);
  const [history, setHistory] = useState<number[]>([]);
  const queryIdx = useRef(0);

  useEffect(() => {
    const tick = () => {
      const query = DEMO_QUERIES[queryIdx.current % DEMO_QUERIES.length];
      queryIdx.current++;
      const ctx: ReasoningContext = {
        intent: "auto_construct",
        query,
        hasVision: true,
        hasAudio: true,
        memoryFacts: ["precedent_loaded", "context_active"],
        activeModules: ["causal-reasoning", "theory-of-mind", "meta-learning", "vision", "monitor"],
      };
      try {
        const result = runConsciousnessBridge(ctx);
        setSnapshot(result);
        setHistory(prev => [...prev.slice(-30), result.phi]);
      } catch { /* silent */ }
    };
    tick();
    const id = setInterval(tick, 2500);
    return () => clearInterval(id);
  }, []);

  if (!snapshot) return null;

  const metrics = [
    { label: "Φ (Phi)", value: snapshot.phi.toFixed(3), icon: Brain, color: "text-cyan-400", desc: "Integrated Information" },
    { label: "PLV", value: snapshot.globalPLV.toFixed(3), icon: Activity, color: "text-emerald-400", desc: "Phase-Lock Value" },
    { label: "γ-CTC", value: snapshot.gammaCTC.toFixed(3), icon: Waves, color: "text-violet-400", desc: "Communication Through Coherence" },
    { label: "θ-γ MI", value: snapshot.thetaGammaMI.toFixed(3), icon: Zap, color: "text-amber-400", desc: "Theta-Gamma Coupling" },
    { label: "HRL Q", value: snapshot.hrl.totalQValue.toFixed(2), icon: Target, color: "text-rose-400", desc: "Hierarchical RL Value" },
    { label: "Level", value: snapshot.consciousnessLevel, icon: Eye, color: "text-cyan-300", desc: "Consciousness Level" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {metrics.map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <GlassCard className="text-center p-4 border-cyan-500/20 hover:border-cyan-400/40 transition-colors">
              <m.icon className={`w-5 h-5 mx-auto mb-1 ${m.color}`} />
              <div className={`text-xl font-mono font-bold ${m.color}`}>{m.value}</div>
              <div className="text-[10px] text-muted-foreground mt-1">{m.label}</div>
              <div className="text-[9px] text-muted-foreground/60">{m.desc}</div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Phi waveform */}
      <GlassCard className="p-4 border-cyan-500/20">
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono text-cyan-400">CONSCIOUSNESS WAVEFORM — Φ over time</span>
          <span className="ml-auto text-[10px] text-muted-foreground font-mono">
            Cycle #{snapshot.cycleCount} · {snapshot.processingTimeMs.toFixed(0)}ms · Agents: [{snapshot.consciousAgents.join(", ")}]
          </span>
        </div>
        <div className="h-16 flex items-end gap-[2px]">
          {history.map((v, i) => (
            <motion.div
              key={i}
              className="flex-1 bg-gradient-to-t from-cyan-500/80 to-cyan-300/40 rounded-t-sm"
              initial={{ height: 0 }}
              animate={{ height: `${Math.max(5, v * 100)}%` }}
              transition={{ duration: 0.3 }}
            />
          ))}
        </div>
      </GlassCard>

      {/* Gamma sub-band + metacognition + body state */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <GlassCard className="p-4 border-violet-500/20">
          <div className="text-xs font-mono text-violet-400 mb-2">GAMMA OSCILLATIONS</div>
          <div className="space-y-1 text-xs font-mono">
            <div className="flex justify-between"><span className="text-muted-foreground">Sub-band:</span><span className="text-violet-300">{snapshot.gammaSubBand}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Health:</span><span className="text-violet-300">{(snapshot.gammaHealth * 100).toFixed(0)}%</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Confidence:</span><span className="text-violet-300">{(snapshot.selfModelConfidence * 100).toFixed(0)}%</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Valence:</span><span className={snapshot.emotionalValence >= 0 ? "text-emerald-400" : "text-rose-400"}>{snapshot.emotionalValence.toFixed(2)}</span></div>
          </div>
        </GlassCard>
        <GlassCard className="p-4 border-amber-500/20">
          <div className="text-xs font-mono text-amber-400 mb-2">METACOGNITION</div>
          <div className="space-y-1 text-xs font-mono">
            {snapshot.metacognition ? (
              <>
                <div className="flex justify-between"><span className="text-muted-foreground">Confidence:</span><span className="text-amber-300">{(snapshot.metacognition.confidence * 100).toFixed(0)}%</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Coherence:</span><span className="text-amber-300">{(snapshot.metacognition.coherence * 100).toFixed(0)}%</span></div>
                <div className="text-[10px] text-amber-200/70 mt-2">{snapshot.metacognition.recommendation}</div>
              </>
            ) : (
              <div className="text-muted-foreground">Awaiting data...</div>
            )}
            <div className="flex justify-between"><span className="text-muted-foreground">HRL Plan:</span><span className="text-amber-300">{snapshot.hrl.planSteps} steps</span></div>
            {snapshot.hrl.activeSubGoal && (
              <div className="text-[10px] text-amber-200/70">Active: {snapshot.hrl.activeSubGoal.description}</div>
            )}
          </div>
        </GlassCard>
        <GlassCard className="p-4 border-rose-500/20">
          <div className="text-xs font-mono text-rose-400 mb-2">INTEROCEPTION & TELEMETRY</div>
          <div className="space-y-1 text-xs font-mono">
            {snapshot.interoception ? (
              <>
                <div className="flex justify-between"><span className="text-muted-foreground">Body Valence:</span><span className={snapshot.interoception.valence >= 0 ? "text-emerald-400" : "text-rose-400"}>{snapshot.interoception.valence.toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Arousal:</span><span className="text-rose-300">{(snapshot.interoception.arousal * 100).toFixed(0)}%</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Energy:</span><span className={snapshot.interoception.energyLevel > 0.3 ? "text-emerald-400" : "text-rose-400"}>{(snapshot.interoception.energyLevel * 100).toFixed(0)}%</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Pain:</span><span className={snapshot.interoception.painIndex < 0.5 ? "text-emerald-400" : "text-rose-400"}>{(snapshot.interoception.painIndex * 100).toFixed(0)}%</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Signal:</span><span className="text-rose-300">{snapshot.interoception.dominantSignal}</span></div>
              </>
            ) : (
              <div className="text-muted-foreground">Awaiting body data...</div>
            )}
            <div className="flex justify-between"><span className="text-muted-foreground">Pipeline:</span><span className="text-rose-300">{snapshot.pipelineHealth}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Trend:</span><span className="text-rose-300">{snapshot.visceralTrend}</span></div>
            {snapshot.anomalySeverity && (
              <div className="text-[10px] text-rose-400 mt-1">⚠️ Anomaly: {snapshot.anomalySeverity}</div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
