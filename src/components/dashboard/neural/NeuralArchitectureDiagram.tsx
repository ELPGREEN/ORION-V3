import { useState } from "react";
import {
  Brain, Database, Zap, GitBranch, Layers, Server, Bot, ArrowRight, ArrowDown,
  CheckCircle, FileText, Search, RefreshCw, Shield, User, MessageSquare, Award,
  Atom, Sparkles, FlaskConical, History, GraduationCap, Cpu, Globe, Mail,
  CreditCard, Eye, Mic, Languages, Calendar, Upload, BarChart3, Network,
  Activity, Target, Workflow, Puzzle, Binary, Magnet, Radar, Lightbulb
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

function GlowCard({ children, className = "", glow = "primary" }: { children: React.ReactNode; className?: string; glow?: string }) {
  const glowColors: Record<string, string> = {
    primary: "shadow-[0_0_15px_-3px_hsl(var(--primary)/0.3)] hover:shadow-[0_0_25px_-3px_hsl(var(--primary)/0.5)]",
    blue: "shadow-[0_0_15px_-3px_rgba(59,130,246,0.2)] hover:shadow-[0_0_25px_-3px_rgba(59,130,246,0.4)]",
    emerald: "shadow-[0_0_15px_-3px_rgba(16,185,129,0.2)] hover:shadow-[0_0_25px_-3px_rgba(16,185,129,0.4)]",
    purple: "shadow-[0_0_15px_-3px_rgba(147,51,234,0.2)] hover:shadow-[0_0_25px_-3px_rgba(147,51,234,0.4)]",
    amber: "shadow-[0_0_15px_-3px_rgba(245,158,11,0.2)] hover:shadow-[0_0_25px_-3px_rgba(245,158,11,0.4)]",
    rose: "shadow-[0_0_15px_-3px_rgba(244,63,94,0.2)] hover:shadow-[0_0_25px_-3px_rgba(244,63,94,0.4)]",
    cyan: "shadow-[0_0_15px_-3px_rgba(6,182,212,0.2)] hover:shadow-[0_0_25px_-3px_rgba(6,182,212,0.4)]",
    indigo: "shadow-[0_0_15px_-3px_rgba(99,102,241,0.2)] hover:shadow-[0_0_25px_-3px_rgba(99,102,241,0.4)]",
  };
  return (
    <div className={`transition-all duration-500 ${glowColors[glow] || glowColors.primary} ${className}`}>
      {children}
    </div>
  );
}

function PulseNode({ icon: Icon, label, sublabel, color = "text-primary", active = true }: {
  icon: typeof Brain; label: string; sublabel?: string; color?: string; active?: boolean;
}) {
  return (
    <div className="flex flex-col items-center gap-1 group">
      <div className={`relative p-2.5 rounded-xl bg-background border border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]/50 transition-all duration-300 group-hover:scale-110 group-hover:border-primary/50`}>
        {active && (
          <div className="absolute inset-0 rounded-xl bg-primary/10 animate-[pulse_3s_ease-in-out_infinite] opacity-50" />
        )}
        <Icon className={`h-5 w-5 ${color} relative z-10`} />
      </div>
      <span className="text-[10px] font-semibold text-center leading-tight">{label}</span>
      {sublabel && <span className="text-[8px] text-muted-foreground text-center leading-tight">{sublabel}</span>}
    </div>
  );
}

function FlowArrow({ vertical = false, label }: { vertical?: boolean; label?: string }) {
  return (
    <div className={`flex ${vertical ? "flex-col" : ""} items-center gap-0.5`}>
      {label && <span className="text-[7px] text-muted-foreground font-mono">{label}</span>}
      {vertical ? (
        <ArrowDown className="h-4 w-4 text-primary/40" />
      ) : (
        <ArrowRight className="h-4 w-4 text-primary/40" />
      )}
    </div>
  );
}

export function NeuralArchitectureDiagram() {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* === HERO: Visão Geral v21.2 === */}
      <GlowCard glow="primary">
        <Card className="bg-[hsl(var(--tron-bg-deep))] text-[hsl(var(--tron-neon))] bg-gradient-to-br from-card via-card to-primary/5 border-primary/20 overflow-hidden relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-cyan-500/5 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />
          <CardHeader className="relative z-10">
            <CardTitle className="text-lg flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
                <Brain className="h-6 w-6 text-primary" />
              </div>
              <div>
                <span className="bg-gradient-to-r from-primary to-amber-400 bg-clip-text text-transparent font-bold">
                  Rede Neural Conexão v21.2
                </span>
                <p className="text-[10px] text-muted-foreground font-normal mt-0.5">
                  Quantum Hierarchical RL · Mamba SSM · Cross-Modal CLIP · STDP Gamma · 10 Agentes · DPO/RLVR · 68+ Edge Functions · 60+ Tribunais
                </p>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-8 gap-2">
              {[
                { icon: Database, title: "60+ Tribunais", desc: "STF, STJ, TST, TJs, TRFs", color: "text-[hsl(var(--tron-info))]" },
                { icon: Atom, title: "QHRL + VQC", desc: "Quantum Planner DAG", color: "text-violet-400" },
                { icon: Brain, title: "Mamba SSM", desc: "O(n) Seq. Longas", color: "text-[hsl(var(--tron-neon))]" },
                { icon: Magnet, title: "Cross-Modal", desc: "CLIP + STDP Gamma", color: "text-pink-400" },
                { icon: Target, title: "10 Agentes IA", desc: "A2A + Swarms + DAG", color: "text-orange-400" },
                { icon: Sparkles, title: "Auto-Evolução", desc: "DPO + RLVR + A/B", color: "text-amber-400" },
                { icon: Bot, title: "5 Motores Neurais", desc: "Alpha·Beta·Gamma·Delta·Epsilon", color: "text-[hsl(var(--tron-neon))]" },
                { icon: Shield, title: "RLS + LGPD", desc: "Segurança em camadas", color: "text-rose-400" },
              ].map((item, i) => (
                <div key={i} className="p-2.5 bg-background/50 backdrop-blur-sm rounded-xl border border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]/30 hover:border-primary/30 transition-all duration-300 hover:scale-[1.02]">
                  <item.icon className={`h-5 w-5 ${item.color} mb-1.5`} />
                  <h4 className="text-[11px] font-bold">{item.title}</h4>
                  <p className="text-[9px] text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </GlowCard>

      {/* === PIPELINE v19 COMPLETO === */}
      <GlowCard glow="emerald">
        <Card className="bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-[hsl(var(--tron-neon))]" />
              Pipeline Neural v19 — 16 Estágios (Rauber UFES + Deep Learning)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center justify-center gap-1.5">
              {[
                { step: "1", title: "Query", color: "from-blue-500 to-blue-600" },
                { step: "2", title: "Expansion", color: "from-purple-500 to-purple-600" },
                { step: "3", title: "Embedding", color: "from-indigo-500 to-indigo-600" },
                { step: "4", title: "Multi-Search", color: "from-cyan-500 to-cyan-600" },
                { step: "5", title: "API Enrich", color: "from-teal-500 to-teal-600" },
                { step: "6", title: "Amplitude Enc", color: "from-lime-500 to-lime-600" },
                { step: "7", title: "MHA 7-head", color: "from-amber-500 to-amber-600" },
                { step: "8", title: "QNN 3-Layer", color: "from-violet-500 to-violet-600" },
                { step: "9", title: "GNN Propagation", color: "from-emerald-500 to-emerald-600" },
                { step: "10", title: "Cross-Attention", color: "from-sky-500 to-sky-600" },
                { step: "11", title: "Competitive WTA", color: "from-orange-500 to-orange-600" },
                { step: "12", title: "Hopfield Memory", color: "from-pink-500 to-pink-600" },
                { step: "13", title: "Von Neumann", color: "from-fuchsia-500 to-fuchsia-600" },
                { step: "14", title: "SHAP Explain", color: "from-yellow-500 to-yellow-600" },
                { step: "15", title: "Adam Optimize", color: "from-red-500 to-red-600" },
                { step: "16", title: "LLM Generate", color: "from-rose-500 to-rose-600" },
              ].map((item, i, arr) => (
                <div key={i} className="flex items-center gap-1">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${item.color} text-primary-foreground flex items-center justify-center font-bold text-[10px] shadow-lg`}>
                      {item.step}
                    </div>
                    <span className="text-[8px] font-semibold mt-0.5">{item.title}</span>
                  </div>
                  {i < arr.length - 1 && <ArrowRight className="h-2.5 w-2.5 text-muted-foreground/50" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </GlowCard>

      {/* === MAPA CENTRAL: Fluxo Completo === */}
      <GlowCard glow="cyan">
        <Card className="bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]/50 overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Network className="h-4 w-4 text-[hsl(var(--tron-neon))]" />
              <span>Mapa de Integrações Completo</span>
              <Badge variant="outline" className="text-[8px] border-cyan-500/30 text-[hsl(var(--tron-neon))] ml-auto">v19 LIVE</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Linha 1: Fontes de Entrada */}
            <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20">
              <p className="text-[9px] font-bold text-[hsl(var(--tron-info))] uppercase tracking-wider mb-2">⬡ Fontes de Entrada</p>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <PulseNode icon={User} label="Usuário" sublabel="Chat / Docs / Pesquisa" color="text-[hsl(var(--tron-info))]" />
                <PulseNode icon={Globe} label="APIs Externas" sublabel="DataJud · LexML · STF" color="text-[hsl(var(--tron-info))]" />
                <PulseNode icon={Upload} label="Smart Ingest" sublabel="PDF · TXT · DOCX" color="text-[hsl(var(--tron-info))]" />
                <PulseNode icon={Calendar} label="Auto-Ingestão" sublabel="Cron 6h · 7 tribunais" color="text-[hsl(var(--tron-info))]" />
                <PulseNode icon={Mail} label="Gmail" sublabel="Google API" color="text-[hsl(var(--tron-info))]" />
                <PulseNode icon={Mic} label="OCR" sublabel="Vision API" color="text-[hsl(var(--tron-info))]" />
              </div>
            </div>

            <FlowArrow vertical label="embeddings + chunks" />

            {/* Linha 2: Neural Core v19 */}
            <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
              <p className="text-[9px] font-bold text-[hsl(var(--tron-neon))] uppercase tracking-wider mb-2">⬡ Neural Core — Quantum Deep Learning v19</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { icon: Atom, name: "QNN 3-Layer", desc: "RX+RY+RZ rotation + CNOT entanglement + Parameter-Shift" },
                  { icon: Brain, name: "Adam Optimizer", desc: "β₁=0.9, β₂=0.999 + Linear Warmup + Cosine Annealing" },
                  { icon: Eye, name: "MHA v7 (7 Heads)", desc: "Semântico·Keyword·Autoridade·Recência·Jurisdição·Prof.·Doutrina" },
                  { icon: Zap, name: "Von Neumann Entropy", desc: "S(ρ) = -Tr(ρ·log₂ρ) — bônus emaranhamento" },
                  { icon: Target, name: "Competitive WTA", desc: "Aprendizagem competitiva: winner-takes-all (Rauber §V)" },
                  { icon: Magnet, name: "Hopfield Network", desc: "Memória associativa: E = -½Σwij·xi·xj (Rauber §IV)" },
                  { icon: Workflow, name: "GNN Message Passing", desc: "Propagação de relevância entre docs citados (v17)" },
                  { icon: Puzzle, name: "Cross-Attention", desc: "Q/K/V projeções aprendidas + Scaled Dot-Product (v17)" },
                  { icon: Lightbulb, name: "SHAP Interpretability", desc: "Contribuição marginal de cada attention head (v17)" },
                  { icon: BarChart3, name: "Confusion Matrix", desc: "TP/FP/TN/FN + F1 por área jurídica" },
                  { icon: GitBranch, name: "Batch Normalization", desc: "Normalização entre camadas + Residual Connections" },
                  { icon: Layers, name: "Regularização", desc: "L2 λ=0.01 + Dropout 20% + Gradient Clipping + Early Stop" },
                ].map((item, i) => (
                  <div key={i} className="p-2 bg-background/60 backdrop-blur-sm rounded-lg border border-emerald-500/10 hover:border-emerald-500/30 transition-all">
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <item.icon className="h-3 w-3 text-[hsl(var(--tron-neon))]" />
                      <span className="text-[10px] font-bold">{item.name}</span>
                    </div>
                    <p className="text-[8px] text-muted-foreground font-mono">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <FlowArrow vertical label="scored results" />

            {/* Linha 3: Treinamento Acadêmico */}
            <div className="p-3 rounded-xl bg-indigo-500/5 border border-indigo-500/20">
              <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider mb-2">⬡ Fundamentos Acadêmicos (Rauber UFES · Haykin · ICMC-USP)</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { name: "McCulloch-Pitts", desc: "Neurônio artificial: Σ(wj·xj) → f(net) — combinação linear + ativação", ref: "§II.1" },
                  { name: "Perceptron (Rosenblatt)", desc: "Classificação linear + convergência finita + sgn()", ref: "§III.1" },
                  { name: "ADALINE (Widrow-Hoff)", desc: "Regressão linear: w^T·x + erro quadrático mínimo (LMS)", ref: "§III.2" },
                  { name: "MLP + Backpropagation", desc: "Multi-camada (4→6→4→1) + δk = ek·f'(vk) + retropropagação", ref: "§III.3" },
                  { name: "Regra de Hebb", desc: "Δwij = η·yi·yj — reforço por co-ativação simultânea", ref: "§II.4.1" },
                  { name: "Regra de Delta", desc: "Δwij = η·ei·xj — minimização do erro supervisionado", ref: "§II.4.2" },
                  { name: "Aprendizagem Competitiva", desc: "Δwij = η·yi·(xj - wij) — winner-takes-all + clustering", ref: "§II.4.3" },
                  { name: "Rede de Hopfield", desc: "Pesos simétricos + energia E = -½Σwij·xi·xj + relaxação", ref: "§IV" },
                ].map((item, i) => (
                  <div key={i} className="p-2 bg-background/50 backdrop-blur-sm rounded-lg border border-indigo-500/10 hover:border-indigo-500/30 transition-all">
                    <div className="flex items-center justify-between mb-0.5">
                      <span className="text-[10px] font-bold">{item.name}</span>
                      <Badge variant="outline" className="text-[7px] border-indigo-500/20 text-indigo-400">{item.ref}</Badge>
                    </div>
                    <p className="text-[8px] text-muted-foreground font-mono">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <FlowArrow vertical label="trained weights" />

            {/* Linha 4: Orquestração + Provedores */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20">
                <p className="text-[9px] font-bold text-[hsl(var(--tron-neon-soft))] uppercase tracking-wider mb-2">⬡ Orquestração</p>
                <div className="space-y-1.5">
                  {[
                    { name: "AI Orchestrator", desc: "Roteamento inteligente multi-provider + context neural" },
                    { name: "Queue Worker", desc: "Jobs assíncronos + retry + exponential backoff" },
                    { name: "Pipeline Orchestrator", desc: "Ciclo completo: feedback → métricas → Adam → evolução" },
                    { name: "Provider Selector", desc: "Fallback chain: Alpha→Beta→Gamma→Delta" },
                    { name: "Prompt Versioning", desc: "Versões ativas por scope + A/B split 50/50" },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 p-1.5 bg-background/40 rounded-lg border border-purple-500/10">
                      <Cpu className="h-3 w-3 text-[hsl(var(--tron-neon-soft))] shrink-0" />
                      <div>
                        <span className="text-[10px] font-semibold">{item.name}</span>
                        <span className="text-[8px] text-muted-foreground ml-1.5">{item.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20">
                <p className="text-[9px] font-bold text-[hsl(var(--tron-neon))] uppercase tracking-wider mb-2">⬡ Provedores de IA</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { name: "ALPHA", model: "Velocidade", p: "P1", badge: "Primary", color: "text-[hsl(var(--tron-info))]" },
                    { name: "BETA", model: "Multimodal", p: "P2", badge: "Vision", color: "text-orange-400" },
                    { name: "GAMMA", model: "Europeu", p: "P3", badge: "Fallback", color: "text-violet-400" },
                    { name: "DELTA", model: "Raciocínio", p: "P4", badge: "Deep", color: "text-[hsl(var(--tron-neon))]" },
                  ].map((p, i) => (
                    <div key={i} className="p-2 bg-background/40 rounded-lg border border-cyan-500/10 text-center hover:border-cyan-500/30 transition-all">
                      <Badge variant="outline" className="text-[7px] mb-0.5 border-cyan-500/20">{p.p} {p.badge}</Badge>
                      <div className={`font-bold text-[11px] ${p.color}`}>{p.name}</div>
                      <div className="text-[8px] text-muted-foreground">{p.model}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <FlowArrow vertical label="generated content + feedback" />

            {/* Linha 5: Auto-Evolução + DPO/RLVR */}
            <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-2xl" />
              <p className="text-[9px] font-bold text-amber-400 uppercase tracking-wider mb-2 relative z-10">
                ⬡ Auto-Evolução Neural — DPO + RLVR + RLHF + A/B Testing
              </p>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-2 relative z-10">
                {[
                  { icon: BarChart3, name: "Análise de Métricas", desc: "Feedbacks + erros + F1/NDCG", color: "text-amber-400" },
                  { icon: Sparkles, name: "DPO", desc: "Direct Preference Optimization — ajuste de preferências", color: "text-amber-400" },
                  { icon: CheckCircle, name: "RLVR", desc: "Verificação factual automática de citações jurídicas", color: "text-amber-400" },
                  { icon: GraduationCap, name: "Especializações", desc: "Novas áreas + treinamento MLP", color: "text-amber-400" },
                  { icon: FlaskConical, name: "A/B Testing", desc: "Split 50/50 · auto-winner 20 amostras", color: "text-amber-400" },
                  { icon: History, name: "Prompt Versioning", desc: "Histórico + ativação seletiva", color: "text-amber-400" },
                ].map((item, i) => (
                  <div key={i} className="p-2 bg-background/50 backdrop-blur-sm rounded-lg border border-amber-500/10 hover:border-amber-500/30 transition-all">
                    <item.icon className={`h-3.5 w-3.5 ${item.color} mb-1`} />
                    <div className="text-[10px] font-bold">{item.name}</div>
                    <div className="text-[8px] text-muted-foreground">{item.desc}</div>
                  </div>
                ))}
              </div>
              <div className="mt-2 flex items-center justify-center gap-2 text-[8px] text-amber-400/70 font-mono relative z-10">
                <RefreshCw className="h-3 w-3 animate-[spin_8s_linear_infinite]" />
                <span>feedback → DPO/RLVR → propostas → aprovação → aplicação → re-treino → feedback</span>
              </div>
            </div>

            <FlowArrow vertical label="data persistence" />

            {/* Linha 6: Dados + Storage */}
            <div className="p-3 rounded-xl bg-rose-500/5 border border-rose-500/20">
              <p className="text-[9px] font-bold text-rose-400 uppercase tracking-wider mb-2">⬡ Camada de Dados (Supabase + pgvector) — 11 Tabelas Neurais</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {[
                  { icon: Database, name: "Rede Neural", items: ["neural_knowledge_base (768d)", "neural_specializations", "neural_learning_data"] },
                  { icon: Search, name: "Busca Vetorial", items: ["legal_embeddings (63k+)", "hybrid_search_v3", "api_cache"] },
                  { icon: Sparkles, name: "Auto-Evolução", items: ["neural_evolution_proposals", "neural_prompt_versions", "neural_ab_experiments"] },
                  { icon: FileText, name: "Documentos & CRM", items: ["documents + folders", "client_profiles + processos", "invoices + consultas + chat_messages"] },
                ].map((item, i) => (
                  <div key={i} className="p-2 bg-background/40 rounded-lg border border-rose-500/10">
                    <div className="flex items-center gap-1.5 mb-1">
                      <item.icon className="h-3 w-3 text-rose-400" />
                      <span className="text-[10px] font-bold">{item.name}</span>
                    </div>
                    <ul className="space-y-0.5">
                      {item.items.map((it, j) => (
                        <li key={j} className="text-[8px] text-muted-foreground font-mono">• {it}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </GlowCard>

      {/* === SCORING FORMULA v19 === */}
      <GlowCard glow="purple">
        <Card className="bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Zap className="h-4 w-4 text-violet-400" />
              Fórmula de Scoring v19 (Pipeline Completo)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="bg-gradient-to-r from-violet-500/10 via-primary/10 to-cyan-500/10 rounded-xl p-4 text-center border border-primary/20">
              <code className="text-sm font-mono text-primary font-bold tracking-wide">
                Final = 0.50×MHA + 0.20×QNN + 0.10×GNN + 0.10×CrossAttn + 0.05×WTA + 0.05×Entropy
              </code>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[
                { label: "MHA (50%)", desc: "7 heads de atenção: Semântico, Keyword, Autoridade, Recência, Jurisdição, Profundidade, Doutrina", color: "border-blue-500/20" },
                { label: "QNN (20%)", desc: "3 camadas quânticas: RX+RY+RZ rotation + CNOT gates + Parameter-Shift gradients", color: "border-violet-500/20" },
                { label: "GNN (10%)", desc: "Graph Neural Network: propagação de relevância entre documentos citados mutuamente", color: "border-emerald-500/20" },
                { label: "Cross-Attn (10%)", desc: "Scaled Dot-Product entre resultados com Q/K/V projeções aprendidas", color: "border-sky-500/20" },
                { label: "WTA (5%)", desc: "Competitive Learning: classificação neural por competição — Δw = η·(x-w)", color: "border-orange-500/20" },
                { label: "Entropy (5%)", desc: "Von Neumann S(ρ) bônus por emaranhamento quântico + diversidade", color: "border-pink-500/20" },
              ].map((item, i) => (
                <div key={i} className={`p-2 bg-background/50 rounded-lg border ${item.color} text-center`}>
                  <div className="text-[11px] font-bold text-primary">{item.label}</div>
                  <div className="text-[8px] text-muted-foreground mt-0.5">{item.desc}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </GlowCard>

      {/* === HOPFIELD + COMPETITIVE === */}
      <GlowCard glow="indigo">
        <Card className="bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Magnet className="h-4 w-4 text-indigo-400" />
              Redes Clássicas — Hopfield & Competitiva (v19 · Rauber UFES)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 bg-pink-500/5 rounded-xl border border-pink-500/20 space-y-2">
                <div className="flex items-center gap-2">
                  <Magnet className="h-4 w-4 text-pink-400" />
                  <span className="text-xs font-bold">Rede de Hopfield (Seção IV)</span>
                </div>
                <p className="text-[9px] text-muted-foreground">
                  Memória associativa com pesos simétricos via Regra de Hebb Generalizada.
                  Recupera documentos/precedentes completos a partir de padrões parciais.
                </p>
                <div className="space-y-1.5">
                  {[
                    { label: "Pesos", formula: "wij = (1/H) · Σ xpi · xpj" },
                    { label: "Energia", formula: "E = -½ · Σ wij · xi · xj" },
                    { label: "Recall", formula: "xi(t+1) = sgn(Σ wij · xj(t))" },
                    { label: "Estabilidade", formula: "ΔE ≤ 0 a cada iteração" },
                  ].map((eq, i) => (
                    <div key={i} className="flex items-center gap-2 p-1.5 bg-background/50 rounded border border-pink-500/10">
                      <Badge variant="outline" className="text-[7px] border-pink-500/20 text-pink-400 shrink-0">{eq.label}</Badge>
                      <code className="text-[8px] font-mono text-muted-foreground">{eq.formula}</code>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-orange-500/5 rounded-xl border border-orange-500/20 space-y-2">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-orange-400" />
                  <span className="text-xs font-bold">Aprendizagem Competitiva (Seção V)</span>
                </div>
                <p className="text-[9px] text-muted-foreground">
                  Classificação neural Winner-Takes-All. Substitui classificação por keywords fixas
                  por competição entre neurônios que aprendem com o uso.
                </p>
                <div className="space-y-1.5">
                  {[
                    { label: "Vencedor", formula: "i* = argmax(wi^T · x)" },
                    { label: "Atualização", formula: "Δwij = η · yi · (xj - wij)" },
                    { label: "Saída", formula: "yi* = 1, yi = 0 para i ≠ i*" },
                    { label: "8 Categorias", formula: "civil, penal, trabalhista, tributário, família, consumidor, previdenciário, administrativo" },
                  ].map((eq, i) => (
                    <div key={i} className="flex items-center gap-2 p-1.5 bg-background/50 rounded border border-orange-500/10">
                      <Badge variant="outline" className="text-[7px] border-orange-500/20 text-orange-400 shrink-0">{eq.label}</Badge>
                      <code className="text-[8px] font-mono text-muted-foreground">{eq.formula}</code>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </GlowCard>

      {/* === PIPELINE RLHF + DPO + RLVR === */}
      <GlowCard glow="blue">
        <Card className="bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Award className="h-4 w-4 text-[hsl(var(--tron-info))]" />
              Pipeline de Aprendizado — RLHF + DPO + RLVR (28 tipos de interação)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {[
                {
                  step: "1", title: "SFT — Ajuste Fino",
                  items: ["Prompt do conjunto jurídico", "Advogado demonstra saída ideal", "quality_score ≥ 0.7 → learned"],
                  code: "neural_learning_data (28 tipos)",
                  color: "border-blue-500/20 bg-blue-500/5",
                },
                {
                  step: "2", title: "DPO — Preferências",
                  items: ["Direct Preference Optimization", "Pares preferidos vs rejeitados", "Ajuste fino de modelo"],
                  code: "preferred > rejected → update",
                  color: "border-purple-500/20 bg-purple-500/5",
                },
                {
                  step: "3", title: "RLVR — Verificação",
                  items: ["Reinforcement Learning Verifiable Rewards", "Validação factual de citações", "Artigos, súmulas, leis"],
                  code: "cite_found → reward += 0.2",
                  color: "border-emerald-500/20 bg-emerald-500/5",
                },
                {
                  step: "4", title: "PPO — Otimização",
                  items: ["Política gera saída otimizada", "RM calcula recompensa", "Adam atualiza pesos + prompts"],
                  code: "accuracy → priority → prompts",
                  color: "border-amber-500/20 bg-amber-500/5",
                },
              ].map((item, i) => (
                <div key={i} className={`p-3 rounded-xl border ${item.color} space-y-2`}>
                  <Badge variant="outline" className="text-[9px] border-primary/30">Etapa {item.step}</Badge>
                  <h4 className="text-xs font-bold">{item.title}</h4>
                  <ul className="space-y-1">
                    {item.items.map((it, j) => (
                      <li key={j} className="text-[9px] text-muted-foreground flex items-start gap-1.5">
                        <ArrowRight className="h-2.5 w-2.5 text-primary mt-0.5 shrink-0" />
                        {it}
                      </li>
                    ))}
                  </ul>
                  <div className="p-1.5 bg-background/50 rounded text-[8px] font-mono text-muted-foreground">
                    {item.code}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </GlowCard>

      {/* === EDGE FUNCTIONS === */}
      <GlowCard glow="amber">
        <Card className="bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Server className="h-4 w-4 text-amber-400" />
              Edge Functions — 30+ Funções Ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {[
                { name: "neural-search", desc: "QDL v19: MHA 7-head + QNN + GNN + Hopfield + WTA", tags: ["MHA", "QNN", "GNN", "Hopfield", "WTA", "SHAP"] },
                { name: "neural-training", desc: "MLP backprop + Adam + competitivo + Hebb", tags: ["Backprop", "Adam", "Competitive", "Hebb", "Delta"] },
                { name: "gerar-documento", desc: "Geração RAG + análise profunda 4 camadas", tags: ["RAG", "Deep Analysis", "Anti-Alucinação", "Feedback"] },
                { name: "neural-evolution", desc: "Auto-evolução + A/B + DPO + RLVR", tags: ["Propostas", "A/B Test", "DPO", "RLVR"] },
                { name: "neural-pipeline-orchestrator", desc: "Ciclo completo: feedback→métricas→Adam→evolução", tags: ["Confusion Matrix", "F1", "Senado Sync", "Watchdog"] },
                { name: "ai-orchestrator", desc: "Roteamento multi-provider + context neural", tags: ["Fallback Chain", "Context Neural"] },
                { name: "neural-auto-learn", desc: "Backprop + Adam + métricas QDL + promote", tags: ["Backprop", "Adam", "NDCG", "F1"] },
                { name: "analyze-reference-doc", desc: "Análise profunda 4 camadas de documentos", tags: ["Feature Extract", "Argumentative", "Correlation", "Strategy"] },
                { name: "auto-ingestion-cron", desc: "Ingestão automática 6h + 7 tribunais", tags: ["DataJud", "LexML", "47 leis"] },
                { name: "smart-ingest", desc: "Ingestão PDF/TXT/DOCX com chunking", tags: ["Chunking", "Classificação", "Embeddings"] },
                { name: "generate-embeddings", desc: "Orion Embedding Engine 768d", tags: ["Neural", "768-dim", "Batch"] },
                { name: "pesquisa-unificada", desc: "GNN + Cross-Attention + SHAP + PII filter", tags: ["GNN", "Cross-Attn", "SHAP", "PII"] },
              ].map((fn, i) => (
                <div key={i} className="p-2 bg-background/40 rounded-lg border border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]/30 hover:border-amber-500/20 transition-all">
                  <code className="text-[10px] font-mono text-primary">{fn.name}</code>
                  <p className="text-[8px] text-muted-foreground mt-0.5">{fn.desc}</p>
                  <div className="flex flex-wrap gap-0.5 mt-1">
                    {fn.tags.map((t, j) => (
                      <span key={j} className="text-[7px] px-1 py-0.5 rounded bg-amber-500/10 text-amber-400/80 border border-amber-500/10">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </GlowCard>

      {/* === NEUROCIÊNCIA COGNITIVA === */}
      <GlowCard glow="purple">
        <Card className="bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Brain className="h-4 w-4 text-[hsl(var(--tron-neon-soft))]" />
              Neurociência Cognitiva — Modelagem Bio-Inspirada (v14–v19)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[
                { name: "📐 Weber-Fechner (ANS)", desc: "Log normalization — discriminação perceptual bio-realista", badges: ["log(v/ref)", "mediana ref"] },
                { name: "🧬 Edelman Groups (Nobel 1972)", desc: "Seleção de grupos neuronais — co-ativação sináptica", badges: ["synapses", "+10% boost"] },
                { name: "🔬 Paralelo→Serial (Crick/Tall)", desc: "Focalização serial quando entropy > 0.7", badges: ["top-3 boost", "80/20 split"] },
                { name: "🧠 Memória Curto→Longo (Tall)", desc: "Consolidação após 20 feedbacks estáveis", badges: ["0.7L + 0.3S", "mielinização"] },
                { name: "✂️ Pruning Sináptico (Morais)", desc: "Poda de sinapses <0.02 a cada 50 iter + decay 0.5%", badges: ["threshold 0.02", "decay"] },
                { name: "💓 Modulação Emocional (Aguilar)", desc: "Learning rate modulado pela intensidade: 1.0x–1.5x", badges: ["|q-0.5|×2", "1.0x–1.5x LR"] },
              ].map((item, i) => (
                <div key={i} className="p-2 bg-background/40 rounded-lg border border-purple-500/10">
                  <div className="text-[10px] font-bold mb-0.5">{item.name}</div>
                  <p className="text-[8px] text-muted-foreground">{item.desc}</p>
                  <div className="flex flex-wrap gap-0.5 mt-1">
                    {item.badges.map((b, j) => (
                      <Badge key={j} variant="outline" className="text-[7px] border-purple-500/20">{b}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </GlowCard>

      {/* === MODELAGEM TEMPORAL === */}
      <GlowCard glow="cyan">
        <Card className="bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-[hsl(var(--tron-neon))]" />
              Modelagem Temporal — DBN + TD Learning + Q-Learning (v12–v19)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              {[
                { name: "🔬 Kalman Filter", desc: "Evolução suave dos pesos das attention heads", badges: ["x̂ = x̂⁻ + K(z - x̂⁻)", "Q=0.001"] },
                { name: "📊 EM Algorithm", desc: "Inferência de área jurídica latente (E-step/M-step)", badges: ["P(z|x)", "5 iterações"] },
                { name: "🔗 HMM Session Tracker", desc: "Viterbi decode de sequências de queries", badges: ["12 estados", "Log-prob"] },
                { name: "📈 TD Learning (Sutton)", desc: "Temporal Difference Error para ajuste online", badges: ["V(s) += α·δ", "γ=0.9"] },
                { name: "🎯 Q-Learning (Mitchell)", desc: "ε-greedy exploration + Q-table por provider", badges: ["Q(s,a) += α·TD", "ε=0.1"] },
                { name: "🧮 Sinusoidal PE", desc: "Positional Encoding temporal baseado em data dos documentos", badges: ["sin(pos/10000^i)", "cos"] },
              ].map((item, i) => (
                <div key={i} className="p-2 bg-background/40 rounded-lg border border-cyan-500/10">
                  <div className="text-[10px] font-bold mb-0.5">{item.name}</div>
                  <p className="text-[8px] text-muted-foreground">{item.desc}</p>
                  <div className="flex flex-wrap gap-0.5 mt-1">
                    {item.badges.map((b, j) => (
                      <Badge key={j} variant="outline" className="text-[7px] border-cyan-500/20">{b}</Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </GlowCard>

      {/* === SEGURANÇA === */}
      <GlowCard glow="rose">
        <Card className="bg-[hsl(var(--tron-bg-deep))] border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Shield className="h-4 w-4 text-rose-400" />
              Segurança & RLS & LGPD
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {[
                { table: "legal_embeddings", policy: "SELECT público · INSERT/UPDATE service_role" },
                { table: "neural_knowledge_base", policy: "advogado CRUD · SELECT service_role" },
                { table: "neural_evolution_proposals", policy: "advogado ALL" },
                { table: "neural_prompt_versions", policy: "advogado ALL" },
                { table: "neural_ab_experiments", policy: "advogado ALL" },
                { table: "documents", policy: "user_id = auth.uid() · shared via shared_documents" },
                { table: "client_profiles", policy: "advogado ALL · cliente own profile" },
                { table: "ai_metrics", policy: "advogado SELECT · service_role INSERT" },
                { table: "pesquisa-unificada", policy: "PII filter + sanitização de dados privados" },
              ].map((item, i) => (
                <div key={i} className="p-2 bg-background/40 rounded-lg border border-rose-500/10">
                  <code className="text-[9px] text-rose-400 font-mono">{item.table}</code>
                  <p className="text-[8px] text-muted-foreground mt-0.5">{item.policy}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </GlowCard>

      {/* === REFERÊNCIAS ACADÊMICAS === */}
      <Card className="bg-[hsl(var(--tron-bg-deep))] text-[hsl(var(--tron-neon))] bg-gradient-to-r from-card to-primary/5 border-primary/20">
        <CardContent className="py-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <GraduationCap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs font-bold text-foreground">Referências Acadêmicas</p>
              <p className="text-[9px] text-muted-foreground mt-0.5">
                Fundamentos teóricos implementados no sistema
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {[
              "Rauber, T.W. (UFES) — Redes Neurais Artificiais: Perceptron, MLP, Hopfield, Kohonen",
              "McCulloch & Pitts (1943) — Modelo de neurônio artificial com combinação linear + ativação",
              "Rosenblatt (1958) — Perceptron: classificação linear + prova de convergência finita",
              "Rumelhart et al. (1986) — Backpropagation: retropropagação de erro em redes multi-camada",
              "Hopfield (1982) — Rede auto-associativa: memória por minimização de energia",
              "Widrow & Hoff (1960) — ADALINE + regra LMS (Least Mean Square)",
              "Hebb (1949) — Regra de aprendizagem por co-ativação sináptica",
              "Haykin (1994) — Neural Networks: teoria abrangente de redes neurais",
              "Ghahramani (CMU) — Dynamic Bayesian Networks + Kalman Filter",
              "Sutton & Barto (1990) — TD Learning + Reinforcement Learning",
              "Dehaene, Edelman, Tall — Neurociência cognitiva: foco, memória, grupos neuronais",
              "Morais (2020) / Aguilar (2021) — Pruning sináptico + modulação emocional",
            ].map((ref, i) => (
              <div key={i} className="text-[9px] text-muted-foreground p-1.5 bg-background/30 rounded border border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]/20">
                • {ref}
              </div>
            ))}
          </div>
          <div className="pt-2 border-t border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]/20">
            <p className="text-[10px] text-muted-foreground">
              Criado por <strong className="text-foreground">Ericson Piccoli</strong> —{" "}
              <a href="https://linkedin.com/in/elpgreen" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                linkedin.com/in/elpgreen
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
