import { motion } from "framer-motion";
import { LiveNeuralMetrics } from "@/components/demo/LiveNeuralMetrics";
import { CapabilitiesDemo } from "@/components/demo/CapabilitiesDemo";
import { ArchitectureDiagram } from "@/components/demo/ArchitectureDiagram";
import { GlassCard } from "@/components/ui/glass-card";
import { Brain, Shield, FileCheck, Bot, Globe, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
const COMPLIANCE_BADGES = [
  { label: "TRL-5", desc: "Technology validated in relevant environment", icon: Brain, color: "border-cyan-500/40 text-cyan-400" },
  { label: "GDPR", desc: "Data Protection by Design & Default", icon: Shield, color: "border-emerald-500/40 text-emerald-400" },
  { label: "AI Act", desc: "EU AI Regulation compliant architecture", icon: FileCheck, color: "border-violet-500/40 text-violet-400" },
  { label: "VDA 5050", desc: "Industrial robot fleet standard", icon: Bot, color: "border-amber-500/40 text-amber-400" },
  { label: "ISO 23482", desc: "Service robot safety standard", icon: Globe, color: "border-rose-500/40 text-rose-400" },
];

export default function OrionDemo() {
  return (
    <>
      <div className="min-h-screen bg-[#0a0a0f] text-foreground overflow-x-hidden">
        {/* Scanline overlay */}
        <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.03]" style={{ background: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,212,255,0.08) 2px, rgba(0,212,255,0.08) 4px)" }} />

        <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 space-y-12">
          {/* ─── HERO ─── */}
          <motion.section className="text-center py-12" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Plasma orb */}
            <div className="relative w-32 h-32 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500/30 to-violet-600/30 blur-xl animate-pulse" />
              <div className="absolute inset-2 rounded-full bg-gradient-to-br from-cyan-400/50 to-violet-500/50 blur-md animate-pulse" style={{ animationDelay: "0.5s" }} />
              <div className="absolute inset-4 rounded-full bg-gradient-to-br from-cyan-300/70 to-violet-400/70 blur-sm" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Brain className="w-12 h-12 text-cyan-200" />
              </div>
            </div>
            <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-cyan-400 via-violet-400 to-cyan-400 bg-clip-text text-transparent">
              ORION — IA Empresarial
            </h1>
            <p className="text-lg text-muted-foreground mt-3 max-w-2xl mx-auto">
              Plataforma de Inteligência Artificial com múltiplas camadas de cognição.
              Voz, Visão, Raciocínio Avançado e Automação — em tempo real.
            </p>
            <div className="flex justify-center gap-3 mt-6">
              <Link to="/investidor">
                <Button variant="outline" className="gap-2 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10">
                  <ExternalLink className="w-4 h-4" /> Investidor
                </Button>
              </Link>
              <Link to="/docs/neurocore">
                <Button variant="outline" className="gap-2 border-violet-500/30 text-violet-400 hover:bg-violet-500/10">
                  <FileCheck className="w-4 h-4" /> Documentação
                </Button>
              </Link>
            </div>
          </motion.section>

          {/* ─── LIVE NEURAL METRICS ─── */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h2 className="text-xs font-mono text-cyan-400/80 uppercase tracking-widest mb-4 text-center">
              ■ Live Neural Dashboard
            </h2>
            <LiveNeuralMetrics />
          </motion.section>

          {/* ─── CAPABILITIES ─── */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
            <h2 className="text-xs font-mono text-cyan-400/80 uppercase tracking-widest mb-4 text-center">
              ■ Interactive Capabilities Demo
            </h2>
            <GlassCard className="p-6 border-cyan-500/20">
              <CapabilitiesDemo />
            </GlassCard>
          </motion.section>

          {/* ─── ARCHITECTURE ─── */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <h2 className="text-xs font-mono text-cyan-400/80 uppercase tracking-widest mb-4 text-center">
              ■ 15-Layer Architecture
            </h2>
            <ArchitectureDiagram />
          </motion.section>

          {/* ─── EU COMPLIANCE ─── */}
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
            <h2 className="text-xs font-mono text-cyan-400/80 uppercase tracking-widest mb-4 text-center">
              ■ Standards & EU Compliance
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {COMPLIANCE_BADGES.map((b, i) => (
                <motion.div key={b.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.8 + i * 0.1 }}>
                  <GlassCard className={`p-4 text-center border ${b.color.split(" ")[0]}`}>
                    <b.icon className={`w-6 h-6 mx-auto mb-2 ${b.color.split(" ")[1]}`} />
                    <div className={`text-sm font-bold font-mono ${b.color.split(" ")[1]}`}>{b.label}</div>
                    <div className="text-[10px] text-muted-foreground mt-1">{b.desc}</div>
                  </GlassCard>
                </motion.div>
              ))}
            </div>
          </motion.section>

          {/* ─── FOOTER ─── */}
          <div className="text-center py-8 text-xs text-muted-foreground font-mono">
            ORION · Plataforma de IA Empresarial · ELP® Green Technology · {new Date().getFullYear()}
          </div>
        </div>
      </div>
    </>
  );
}
