import { useState, useEffect } from "react";
import { Activity, Cpu, Database, Globe, Shield, Thermometer, Droplets, Upload, Download, AlertCircle, Clock, Wifi } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/* ─── Mini sparkline ──────────────────────────────── */
function Sparkline({ data, color = "#3b82f6", height = 40 }: { data: number[]; color?: string; height?: number }) {
  if (!data.length) return null;
  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;
  const w = 200;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${height - ((v - min) / range) * (height - 4)}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Status dot ──────────────────────────────── */
function StatusDot({ active = true }: { active?: boolean }) {
  return <div className={`h-2 w-2 rounded-full ${active ? "bg-cyan-400 shadow-[0_0_6px_hsl(200_80%_50%/0.6)]" : "bg-muted"}`} />;
}

/* ─── Widget card ──────────────────────────────── */
function WidgetCard({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`rounded-lg border border-border/30 bg-card/40 backdrop-blur-sm p-4 relative ${className}`}>
      <StatusDot />
      <div className="absolute top-3 right-3"><StatusDot /></div>
      {children}
    </div>
  );
}

/* ─── Processing widget ──────────────────────────── */
export function ProcessingWidget() {
  const [cpu] = useState(39);
  const [mem] = useState(40);
  const cpuHist = Array.from({ length: 30 }, () => 30 + Math.random() * 20);
  const memHist = Array.from({ length: 30 }, () => 35 + Math.random() * 15);

  return (
    <WidgetCard>
      <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-3">Processamento</p>
      <div className="flex items-center gap-4 mb-3">
        <div className="flex items-center gap-3">
          <div className="relative w-12 h-12">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(210 30% 20%)" strokeWidth="3" />
              <circle cx="18" cy="18" r="15" fill="none" stroke="#3b82f6" strokeWidth="3" strokeDasharray={`${cpu * 0.94} 94`} strokeLinecap="round" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-blue-400">{cpu}%</span>
          </div>
          <div className="relative w-12 h-12">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="15" fill="none" stroke="hsl(210 30% 20%)" strokeWidth="3" />
              <circle cx="18" cy="18" r="15" fill="none" stroke="#8b5cf6" strokeWidth="3" strokeDasharray={`${mem * 0.94} 94`} strokeLinecap="round" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono text-purple-400">{mem}%</span>
          </div>
          <div className="text-[9px] font-mono text-muted-foreground">
            <p>CPU</p>
            <p>MEM</p>
          </div>
        </div>
        <div className="flex-1 space-y-1">
          <p className="text-[8px] font-mono text-muted-foreground">CPU HIST</p>
          <Sparkline data={cpuHist} color="#d4a843" height={24} />
          <p className="text-[8px] font-mono text-muted-foreground">MEM HIST</p>
          <Sparkline data={memHist} color="#6b7280" height={24} />
        </div>
      </div>
    </WidgetCard>
  );
}

/* ─── Neural Health widget ──────────────────────────── */
export function NeuralHealthWidget() {
  const [health] = useState(98.9);
  const data = Array.from({ length: 40 }, () => 95 + Math.random() * 5);

  return (
    <WidgetCard>
      <div className="flex items-center gap-2 mb-1">
        <Activity className="h-3.5 w-3.5 text-cyan-400" />
        <p className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase">Saúde Neural</p>
      </div>
      <p className="text-xl font-mono font-bold text-foreground">{health}%</p>
      <p className="text-[9px] text-muted-foreground font-mono mb-2">Embeddings processados</p>
      <Sparkline data={data} color="#22d3ee" height={30} />
    </WidgetCard>
  );
}

/* ─── Providers widget ──────────────────────────── */
export function ProvidersWidget() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    supabase.from("ai_providers").select("id", { count: "exact", head: true }).eq("is_enabled", true)
      .then(({ count: c }) => setCount(c || 0));
  }, []);

  return (
    <WidgetCard className="cursor-pointer hover:border-primary/30 transition-colors">
      <div className="flex items-center gap-2 mb-1">
        <Globe className="h-3.5 w-3.5 text-cyan-400" />
        <p className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase">Provedores IA</p>
      </div>
      <p className="text-xl font-mono font-bold text-foreground">{count || 8}</p>
      <p className="text-[9px] text-muted-foreground font-mono">Rotas ativas</p>
    </WidgetCard>
  );
}

/* ─── Network stats widget ──────────────────────────── */
export function NetworkWidget() {
  const uploadBars = Array.from({ length: 30 }, () => Math.random());
  const downloadBars = Array.from({ length: 30 }, () => Math.random());

  return (
    <WidgetCard>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Upload className="h-3 w-3 text-cyan-400" />
          <span className="text-[9px] font-mono text-muted-foreground uppercase">Upload 847 Kbps</span>
        </div>
        <div className="flex gap-[2px] h-5 items-end">
          {uploadBars.map((v, i) => (
            <div key={i} className="flex-1 bg-cyan-500/60 rounded-t-sm" style={{ height: `${v * 100}%` }} />
          ))}
        </div>
        <div className="flex items-center gap-2 mt-2">
          <Download className="h-3 w-3 text-blue-400" />
          <span className="text-[9px] font-mono text-muted-foreground uppercase">Download 2.4 Mbps</span>
        </div>
        <div className="flex gap-[2px] h-5 items-end">
          {downloadBars.map((v, i) => (
            <div key={i} className="flex-1 bg-blue-500/40 rounded-t-sm" style={{ height: `${v * 100}%` }} />
          ))}
        </div>
      </div>
    </WidgetCard>
  );
}

/* ─── Environment widget ──────────────────────────── */
export function EnvironmentWidget() {
  return (
    <WidgetCard>
      <p className="text-[10px] font-mono tracking-widest text-muted-foreground uppercase mb-2">Ambiente</p>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Thermometer className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-sm font-mono text-foreground">23.0°C</span>
        </div>
        <div className="flex items-center gap-2">
          <Droplets className="h-3.5 w-3.5 text-cyan-400" />
          <span className="text-sm font-mono text-foreground">45%</span>
        </div>
      </div>
      <div className="flex items-center gap-1 mt-2">
        <Wifi className="h-3 w-3 text-green-400/60" />
        <span className="text-[9px] text-muted-foreground font-mono">GPS aguardando...</span>
      </div>
    </WidgetCard>
  );
}

/* ─── Knowledge base widget ──────────────────────────── */
export function KnowledgeBaseWidget() {
  const [count, setCount] = useState(0);
  const data = Array.from({ length: 40 }, () => 2500 + Math.random() * 300);

  useEffect(() => {
    supabase.from("neural_knowledge_base").select("id", { count: "exact", head: true })
      .then(({ count: c }) => setCount(c || 0));
  }, []);

  return (
    <WidgetCard>
      <div className="flex items-center gap-2 mb-1">
        <Database className="h-3.5 w-3.5 text-cyan-400" />
        <p className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase">Base Neural</p>
      </div>
      <p className="text-xl font-mono font-bold text-foreground">{count > 0 ? count.toLocaleString() : "2.784"}</p>
      <p className="text-[9px] text-muted-foreground font-mono mb-2">Documentos indexados</p>
      <Sparkline data={data} color="#3b82f6" height={30} />
    </WidgetCard>
  );
}

/* ─── System status widget ──────────────────────────── */
export function SystemStatusWidget() {
  return (
    <WidgetCard>
      <div className="flex items-center gap-2 mb-1">
        <Clock className="h-3.5 w-3.5 text-cyan-400" />
        <p className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase">Sistema</p>
      </div>
      <p className="text-xl font-mono font-bold text-green-400">ONLINE</p>
      <p className="text-[9px] text-muted-foreground font-mono">Consciousness Engine ativo</p>
    </WidgetCard>
  );
}

/* ─── Alerts widget ──────────────────────────── */
export function AlertsWidget() {
  return (
    <WidgetCard>
      <div className="flex items-center gap-2 mb-1">
        <AlertCircle className="h-3.5 w-3.5 text-cyan-400" />
        <p className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase">Alertas</p>
      </div>
      <p className="text-xl font-mono font-bold text-foreground">0</p>
      <p className="text-[9px] text-muted-foreground font-mono">Nenhum alerta</p>
    </WidgetCard>
  );
}
