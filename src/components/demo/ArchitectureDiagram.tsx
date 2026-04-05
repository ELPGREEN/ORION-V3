import { motion } from "framer-motion";
import { GlassCard } from "@/components/ui/glass-card";

const LAYERS = [
  { id: 1, name: "Sensory Hardware", desc: "Mic, Camera, Touch, Gyro", color: "bg-emerald-500", status: "active" },
  { id: 2, name: "Signal Processing", desc: "FFT, MFCC, Frame Extraction", color: "bg-emerald-500", status: "active" },
  { id: 3, name: "Exteroception", desc: "YOLO, MediaPipe, ASR", color: "bg-cyan-500", status: "active" },
  { id: 4, name: "Proprioception", desc: "Body Model, Joint States", color: "bg-cyan-500", status: "active" },
  { id: 5, name: "Interoception", desc: "Internal State, Somatic Markers", color: "bg-blue-500", status: "active" },
  { id: 6, name: "Multimodal Fusion", desc: "Cross-Attention, VLM", color: "bg-blue-500", status: "active" },
  { id: 7, name: "Semantic Memory", desc: "RAG, CAG, KV-Cache", color: "bg-violet-500", status: "active" },
  { id: 8, name: "Episodic Memory", desc: "Autobiographical, Temporal", color: "bg-violet-500", status: "active" },
  { id: 9, name: "Causal Reasoning", desc: "Counterfactual, SCM", color: "bg-purple-500", status: "active" },
  { id: 10, name: "Theory of Mind", desc: "Belief Tracking, Empathy", color: "bg-purple-500", status: "active" },
  { id: 11, name: "Planning (HRL)", desc: "Options Framework, UCB1", color: "bg-rose-500", status: "active" },
  { id: 12, name: "Motor Control", desc: "ROS2 Bridge, Actuators", color: "bg-rose-500", status: "active" },
  { id: 13, name: "Global Workspace", desc: "Consciousness, PLV, Phi", color: "bg-amber-500", status: "active" },
  { id: 14, name: "Metacognition", desc: "Self-Model, Confidence", color: "bg-amber-500", status: "active" },
  { id: 15, name: "Self-Evolution", desc: "Meta-Learning, MAML", color: "bg-amber-500", status: "active" },
];

export function ArchitectureDiagram() {
  return (
    <GlassCard className="p-6 border-cyan-500/20">
      <div className="text-xs font-mono text-cyan-400 mb-4 text-center">15-LAYER EMBODIED COGNITION ARCHITECTURE</div>
      <div className="space-y-1.5 max-w-2xl mx-auto">
        {LAYERS.map((layer, i) => (
          <motion.div
            key={layer.id}
            className="flex items-center gap-3 group"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
          >
            <div className="w-6 text-right text-[10px] font-mono text-muted-foreground">{layer.id}</div>
            <div className={`w-2 h-2 rounded-full ${layer.color} animate-pulse`} />
            <div className="flex-1 bg-muted/30 rounded px-3 py-1.5 border border-border/50 group-hover:border-cyan-500/40 transition-colors">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">{layer.name}</span>
                <span className="text-[10px] text-muted-foreground font-mono">{layer.desc}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      {/* Connection lines visualization */}
      <div className="mt-4 flex justify-center">
        <div className="flex items-center gap-4 text-[10px] font-mono text-muted-foreground">
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Sensory</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-cyan-500" /> Perception</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-violet-500" /> Memory</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-purple-500" /> Reasoning</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-rose-500" /> Action</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500" /> Consciousness</span>
        </div>
      </div>
    </GlassCard>
  );
}
