import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Brain, Activity, Shield, Zap, Cpu, Eye, Database, TrendingUp,
  Search, FileText, ChevronRight, Wifi, Globe, BarChart3,
  Thermometer, Droplets, User, Clock, ArrowUp, ArrowDown,
  Radio, Server, HardDrive, MemoryStick,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

// ═══════════════════════════════════════════════════════════
// ORION HUD v2 — Full Holographic Neural Interface
// Inspired by JARVIS OS • Cyan Neon + Gold Accent
// ═══════════════════════════════════════════════════════════

interface JarvisHUDProps {
  metrics?: {
    neuralHealth: number;
    activeConnections: number;
    processingLoad: number;
    knowledgeBase: number;
    alertsCount: number;
  };
  className?: string;
}

/* ─── Animated Waveform ─── */
function Waveform({ bars = 20, color = "cyan", height = 32, label }: { bars?: number; color?: "cyan" | "gold"; height?: number; label?: string }) {
  const colorClass = color === "gold" ? "bg-[#c9a84c]" : "bg-[#3B82F6]";
  return (
    <div>
      {label && <div className="text-[7px] font-mono uppercase tracking-[0.2em] mb-0.5" style={{ color: color === "gold" ? "#c9a84c66" : "#3B82F666" }}>{label}</div>}
      <div className="flex items-end gap-[1px]" style={{ height }}>
        {Array.from({ length: bars }).map((_, i) => (
          <div key={i} className={cn("w-[2px] rounded-t-sm opacity-60", colorClass)}
            style={{
              height: `${20 + Math.sin(i * 0.7) * 40 + Math.random() * 30}%`,
              animation: `orion-wave ${0.8 + Math.random() * 0.6}s ease-in-out ${i * 0.05}s infinite alternate`,
            }} />
        ))}
      </div>
    </div>
  );
}

/* ─── Mini Graph (sparkline) ─── */
function MiniGraph({ data, color = "cyan", height = 32 }: { data: number[]; color?: "cyan" | "gold"; height?: number }) {
  const max = Math.max(...data, 1);
  const stroke = color === "gold" ? "#c9a84c" : "#3B82F6";
  const points = data.map((v, i) => `${(i / (data.length - 1)) * 100},${100 - (v / max) * 80}`).join(" ");
  return (
    <svg viewBox="0 0 100 100" className="w-full" style={{ height }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={`grad-${color}-${height}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.3" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" points={points} opacity="0.8" />
      <polygon fill={`url(#grad-${color}-${height})`} points={`0,100 ${points} 100,100`} />
    </svg>
  );
}

/* ─── Circular Gauge ─── */
function CircularGauge({ value, label, size = 56, color = "#3B82F6" }: { value: number; label: string; size?: number; color?: string }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-0.5">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="2" opacity="0.1" />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="2.5"
          strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round" opacity="0.8"
          style={{ transition: "stroke-dashoffset 1s ease" }} />
      </svg>
      <div className="absolute flex flex-col items-center justify-center" style={{ width: size, height: size }}>
        <span className="text-xs font-bold font-mono" style={{ color }}>{value}%</span>
      </div>
      <span className="text-[7px] font-mono uppercase tracking-wider" style={{ color: `${color}99` }}>{label}</span>
    </div>
  );
}

/* ─── Triangular Faceted Core ─── */
function OrionCore({ health, status }: { health: number; status: string }) {
  const coreColor = status === "online" ? "#3B82F6" : status === "warning" ? "#c9a84c" : "#ff4444";
  const goldAccent = "#c9a84c";
  return (
    <div className="relative flex items-center justify-center" style={{ width: 200, height: 200 }}>
      {/* Ambient outer glow */}
      <div className="absolute rounded-full" style={{
        width: 210, height: 210,
        background: `radial-gradient(circle, ${coreColor}15 0%, ${coreColor}08 40%, transparent 65%)`,
        filter: "blur(8px)",
      }} />

      {/* Outer ring with tick marks */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 200" style={{ animation: "orion-spin 25s linear infinite" }}>
        <circle cx="100" cy="100" r="95" fill="none" stroke={coreColor} strokeWidth="0.5" opacity="0.2" />
        <circle cx="100" cy="100" r="95" fill="none" stroke={coreColor} strokeWidth="1.5" strokeDasharray="8 4 2 4" opacity="0.5" />
        {Array.from({ length: 60 }).map((_, i) => {
          const angle = (i * 6 * Math.PI) / 180;
          const isLong = i % 5 === 0;
          const r1 = isLong ? 82 : 86;
          return (
            <line key={i}
              x1={100 + r1 * Math.cos(angle)} y1={100 + r1 * Math.sin(angle)}
              x2={100 + 92 * Math.cos(angle)} y2={100 + 92 * Math.sin(angle)}
              stroke={coreColor} strokeWidth={isLong ? "1.2" : "0.4"} opacity={isLong ? "0.6" : "0.2"} />
          );
        })}
      </svg>

      {/* HUD arc segments — broken arcs rotating */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 200" style={{ animation: "orion-spin-reverse 35s linear infinite" }}>
        {[
          { r: 88, start: 20, end: 80 },
          { r: 88, start: 140, end: 190 },
          { r: 88, start: 240, end: 310 },
        ].map((seg, i) => {
          const startRad = (seg.start * Math.PI) / 180;
          const endRad = (seg.end * Math.PI) / 180;
          const x1 = 100 + seg.r * Math.cos(startRad);
          const y1 = 100 + seg.r * Math.sin(startRad);
          const x2 = 100 + seg.r * Math.cos(endRad);
          const y2 = 100 + seg.r * Math.sin(endRad);
          const large = seg.end - seg.start > 180 ? 1 : 0;
          return (
            <path key={i}
              d={`M ${x1} ${y1} A ${seg.r} ${seg.r} 0 ${large} 1 ${x2} ${y2}`}
              fill="none" stroke={i % 2 === 0 ? coreColor : goldAccent}
              strokeWidth="2" opacity="0.4"
              style={{ filter: `drop-shadow(0 0 3px ${i % 2 === 0 ? coreColor : goldAccent})` }}
            />
          );
        })}
      </svg>

      {/* Second ring */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 200" style={{ animation: "orion-spin-reverse 18s linear infinite" }}>
        <circle cx="100" cy="100" r="72" fill="none" stroke={coreColor} strokeWidth="0.5" opacity="0.15" />
        <circle cx="100" cy="100" r="72" fill="none" stroke={coreColor} strokeWidth="1" strokeDasharray="20 8" opacity="0.4" />
      </svg>

      {/* Inner ring with gold accent */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 200" style={{ animation: "orion-spin 10s linear infinite" }}>
        <circle cx="100" cy="100" r="50" fill="none" stroke={coreColor} strokeWidth="0.5" opacity="0.2" />
        <circle cx="100" cy="100" r="50" fill="none" stroke={goldAccent} strokeWidth="1" strokeDasharray="6 10" opacity="0.35" />
      </svg>

      {/* Health arc — thicker with glow */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 200">
        <circle cx="100" cy="100" r="62" fill="none" stroke={coreColor} strokeWidth="3.5"
          strokeDasharray={`${(health / 100) * 390} 390`}
          strokeLinecap="round" opacity="0.8"
          transform="rotate(-90 100 100)"
          style={{
            transition: "stroke-dasharray 1s ease",
            filter: `drop-shadow(0 0 6px ${coreColor})`,
          }} />
      </svg>

      {/* Circuit trace lines radiating outward */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 200" style={{ animation: "orion-spin 40s linear infinite" }}>
        {[0, 60, 120, 180, 240, 300].map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          const innerR = 52;
          const outerR = 92;
          return (
            <line key={i}
              x1={100 + Math.cos(rad) * innerR} y1={100 + Math.sin(rad) * innerR}
              x2={100 + Math.cos(rad) * outerR} y2={100 + Math.sin(rad) * outerR}
              stroke={i % 2 === 0 ? coreColor : goldAccent}
              strokeWidth="0.4" opacity="0.2" strokeDasharray="3 5"
            />
          );
        })}
      </svg>

      {/* Data node dots orbiting */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 200 200" style={{ animation: "orion-spin-reverse 15s linear infinite" }}>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => {
          const rad = (angle * Math.PI) / 180;
          const r = 78;
          return (
            <circle key={i}
              cx={100 + Math.cos(rad) * r} cy={100 + Math.sin(rad) * r}
              r="2" fill={i % 2 === 0 ? coreColor : goldAccent}
              opacity="0.5"
            />
          );
        })}
      </svg>

      {/* Triangular faceted center */}
      <svg className="absolute" viewBox="0 0 80 80" width="80" height="80" style={{ animation: "orion-spin-reverse 30s linear infinite" }}>
        <polygon points="40,8 72,62 8,62" fill="none" stroke={coreColor} strokeWidth="1" opacity="0.6" />
        <polygon points="40,58 24,28 56,28" fill="none" stroke={coreColor} strokeWidth="0.7" opacity="0.4" />
        <line x1="40" y1="8" x2="40" y2="58" stroke={coreColor} strokeWidth="0.3" opacity="0.25" />
        <line x1="72" y1="62" x2="24" y2="28" stroke={coreColor} strokeWidth="0.3" opacity="0.25" />
        <line x1="8" y1="62" x2="56" y2="28" stroke={coreColor} strokeWidth="0.3" opacity="0.25" />
      </svg>

      {/* Core glow — enhanced multi-layer */}
      <div className="absolute rounded-full" style={{
        width: 55, height: 55,
        background: `radial-gradient(circle, ${coreColor}55 0%, ${coreColor}22 40%, transparent 70%)`,
        animation: "orion-pulse 2.5s ease-in-out infinite",
        boxShadow: `0 0 30px ${coreColor}33, 0 0 60px ${coreColor}11`,
      }} />

      {/* Center text */}
      <div className="relative z-10 flex flex-col items-center">
        <div className="text-[9px] font-mono tracking-[0.4em] uppercase" style={{ color: coreColor }}>ORION</div>
        <div className="text-xl font-bold font-mono" style={{ color: coreColor, textShadow: `0 0 12px ${coreColor}66` }}>{health.toFixed(1)}%</div>
        <div className="text-[7px] font-mono uppercase tracking-wider" style={{ color: goldAccent }}>
          {status === "online" ? "OPERACIONAL" : status === "warning" ? "ATENÇÃO" : "OFFLINE"}
        </div>
      </div>
    </div>
  );
}

/* ─── Stat Panel ─── */
function StatPanel({ icon, label, value, sub, status, onClick, sparkline }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string;
  status?: "online" | "warning" | "offline"; onClick?: () => void; sparkline?: number[];
}) {
  const borderColor = status === "online" ? "border-[#3B82F6]/15" : status === "warning" ? "border-[#c9a84c]/15" : "border-red-500/15";
  const dotColor = status === "online" ? "bg-[#3B82F6]" : status === "warning" ? "bg-[#c9a84c]" : "bg-red-500";
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex items-start gap-2 p-2 rounded border bg-[#0a0a0f]/80 backdrop-blur-sm",
        "hover:bg-[#3B82F6]/5 transition-all duration-300 text-left w-full group",
        borderColor, onClick && "cursor-pointer"
      )}
    >
      {status && <span className={cn("absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full", dotColor, status === "online" && "animate-pulse")} />}
      <div className="text-[#3B82F6]/50 group-hover:text-[#3B82F6] transition-colors mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="text-[8px] font-mono uppercase tracking-[0.15em] text-[#3B82F6]/35">{label}</div>
        <div className="text-sm font-bold font-mono text-[#e0e0e0]">{value}</div>
        {sub && <div className="text-[8px] font-mono text-[#c9a84c]/50 truncate">{sub}</div>}
        {sparkline && <MiniGraph data={sparkline} color="cyan" height={18} />}
      </div>
      {onClick && <ChevronRight className="h-3 w-3 text-[#3B82F6]/15 group-hover:text-[#3B82F6]/50 mt-1 transition-colors" />}
    </button>
  );
}

/* ─── LCD Clock ─── */
function LCDClock({ time }: { time: Date }) {
  const h = time.getHours().toString().padStart(2, "0");
  const m = time.getMinutes().toString().padStart(2, "0");
  const s = time.getSeconds().toString().padStart(2, "0");
  return (
    <div className="flex items-baseline gap-0.5">
      <span className="text-2xl font-mono font-black tracking-wider text-[#3B82F6]" style={{
        textShadow: "0 0 10px #3B82F655, 0 0 20px #3B82F622"
      }}>{h}:{m}</span>
      <span className="text-xs font-mono font-bold text-[#3B82F6]/50">{s}</span>
    </div>
  );
}

/* ─── Micro Metric (top bar) ─── */
function MicroMetric({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5">
      <span className="text-[7px] font-mono uppercase tracking-wider text-[#3B82F6]/30">{label}</span>
      <span className="text-[10px] font-mono font-bold text-[#3B82F6]/70">{value}</span>
      {unit && <span className="text-[7px] font-mono text-[#c9a84c]/40">{unit}</span>}
    </div>
  );
}

/* ─── User Profile Card ─── */
function UserProfileCard() {
  const [user, setUser] = useState<{ email?: string; name?: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setUser({
          email: data.user.email,
          name: data.user.user_metadata?.nome || data.user.user_metadata?.full_name || data.user.email?.split("@")[0],
        });
      }
    });
  }, []);

  return (
    <div className="flex items-center gap-2 p-2 rounded border border-[#3B82F6]/10 bg-[#0a0a0f]/80">
      <div className="h-8 w-8 rounded-full border border-[#3B82F6]/30 bg-[#3B82F6]/10 flex items-center justify-center">
        <User className="h-4 w-4 text-[#3B82F6]/60" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[9px] font-mono font-bold text-[#e0e0e0] truncate">{user?.name || "Operador"}</div>
        <div className="text-[7px] font-mono text-[#c9a84c]/50 truncate">{user?.email || "—"}</div>
        <div className="text-[7px] font-mono text-[#3B82F6]/30">ORION v22.3 • CLEARANCE L5</div>
      </div>
    </div>
  );
}

/* ─── Environmental Block ─── */
function EnvironmentalBlock() {
  const [env, setEnv] = useState({ temp: 23, humidity: 45, lat: 0, lng: 0 });

  useEffect(() => {
    // Try geolocation
    navigator.geolocation?.getCurrentPosition(
      (pos) => setEnv(prev => ({ ...prev, lat: pos.coords.latitude, lng: pos.coords.longitude })),
      () => {}
    );
    // Simulate temp/humidity (real values would come from IoT sensors)
    const i = setInterval(() => {
      setEnv(prev => ({
        ...prev,
        temp: 22 + Math.random() * 4,
        humidity: 40 + Math.random() * 20,
      }));
    }, 10000);
    return () => clearInterval(i);
  }, []);

  return (
    <div className="p-2 rounded border border-[#3B82F6]/10 bg-[#0a0a0f]/60">
      <div className="text-[7px] font-mono uppercase tracking-[0.2em] text-[#3B82F6]/30 mb-1.5">AMBIENTE</div>
      <div className="grid grid-cols-2 gap-1.5">
        <div className="flex items-center gap-1">
          <Thermometer className="h-3 w-3 text-[#c9a84c]/50" />
          <span className="text-[10px] font-mono text-[#e0e0e0]">{env.temp.toFixed(1)}°C</span>
        </div>
        <div className="flex items-center gap-1">
          <Droplets className="h-3 w-3 text-[#3B82F6]/50" />
          <span className="text-[10px] font-mono text-[#e0e0e0]">{env.humidity.toFixed(0)}%</span>
        </div>
        <div className="col-span-2 flex items-center gap-1">
          <Globe className="h-3 w-3 text-[#3B82F6]/30" />
          <span className="text-[8px] font-mono text-[#3B82F6]/30">
            {env.lat !== 0 ? `${env.lat.toFixed(4)}, ${env.lng.toFixed(4)}` : "GPS aguardando…"}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── Live Data Hook ─── */
function useNeuralMetrics() {
  const [data, setData] = useState({
    embeddingsTotal: 0, embeddingsWithVector: 0, providers: 0,
    recentMetrics: 0, knowledgeBase: 0, pendingEvolutions: 0,
  });
  const [loading, setLoading] = useState(true);
  const [realtimeEvent, setRealtimeEvent] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [embedRes, provRes, metricsRes, evolRes] = await Promise.all([
        supabase.from("legal_embeddings").select("id", { count: "exact", head: true }),
        supabase.from("ai_providers").select("id, is_enabled"),
        supabase.from("ai_metrics").select("id", { count: "exact", head: true }),
        supabase.from("neural_evolution_proposals" as any).select("id, status").eq("status", "pending"),
      ]);
      const totalEmb = embedRes.count ?? 0;
      const withVecRes = await supabase.from("legal_embeddings").select("id", { count: "exact", head: true }).not("embedding", "is", null);
      const withVec = withVecRes.count ?? 0;
      setData({
        embeddingsTotal: totalEmb, embeddingsWithVector: withVec,
        providers: (provRes.data ?? []).filter((p: any) => p.is_enabled).length,
        recentMetrics: metricsRes.count ?? 0, knowledgeBase: totalEmb,
        pendingEvolutions: (evolRes.data ?? []).length,
      });
    } catch {} finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); const i = setInterval(fetchData, 30000); return () => clearInterval(i); }, [fetchData]);

  useEffect(() => {
    const ch = supabase.channel("orion-hud-live")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "legal_embeddings" }, () => {
        setRealtimeEvent("embedding"); fetchData(); setTimeout(() => setRealtimeEvent(null), 3000);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "ai_metrics" }, () => {
        setRealtimeEvent("metrics"); fetchData(); setTimeout(() => setRealtimeEvent(null), 3000);
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "documents" }, () => {
        setRealtimeEvent("document"); fetchData(); setTimeout(() => setRealtimeEvent(null), 3000);
      })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchData]);

  return { data, loading, realtimeEvent };
}

// ═══ MAIN COMPONENT ═══
export function JarvisHUD({ metrics, className = "" }: JarvisHUDProps) {
  const navigate = useNavigate();
  const [time, setTime] = useState(new Date());
  const [uptime, setUptime] = useState(0);
  const { data: liveData, loading, realtimeEvent } = useNeuralMetrics();

  useEffect(() => {
    const i = setInterval(() => { setTime(new Date()); setUptime(p => p + 1); }, 1000);
    return () => clearInterval(i);
  }, []);

  const m = metrics ?? {
    neuralHealth: liveData.embeddingsTotal > 0
      ? Math.min(99.9, (liveData.embeddingsWithVector / Math.max(liveData.embeddingsTotal, 1)) * 100) : 0,
    activeConnections: liveData.providers,
    processingLoad: Math.min(100, liveData.recentMetrics % 100),
    knowledgeBase: liveData.knowledgeBase,
    alertsCount: liveData.pendingEvolutions,
  };

  const healthStatus: "online" | "warning" | "offline" =
    m.neuralHealth >= 80 ? "online" : m.neuralHealth >= 40 ? "warning" : "offline";

  const formatUptime = useCallback(() => {
    const h = Math.floor(uptime / 3600);
    const min = Math.floor((uptime % 3600) / 60);
    const s = uptime % 60;
    return `${h.toString().padStart(2, "0")}:${min.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }, [uptime]);

  const cpuLoad = useMemo(() => Math.min(100, 30 + Math.floor(Math.random() * 40)), []);
  const memLoad = useMemo(() => Math.min(100, 40 + Math.floor(Math.random() * 35)), []);
  const sparkCpu = useMemo(() => Array.from({ length: 20 }, () => 20 + Math.random() * 60), []);
  const sparkMem = useMemo(() => Array.from({ length: 20 }, () => 30 + Math.random() * 50), []);
  const sparkNeural = useMemo(() => Array.from({ length: 20 }, () => Math.random() * 100), []);
  const sparkEmbed = useMemo(() => Array.from({ length: 20 }, () => Math.random() * 80 + 20), []);

  const dateStr = time.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }).toUpperCase();

  return (
    <>
      <style>{`
        @keyframes orion-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes orion-spin-reverse { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
        @keyframes orion-pulse { 0%, 100% { opacity: 0.6; transform: scale(1); } 50% { opacity: 1; transform: scale(1.1); } }
        @keyframes orion-wave { 0% { height: 20%; } 100% { height: 80%; } }
        @keyframes orion-scan { 0% { top: 0; opacity: 0.6; } 100% { top: 100%; opacity: 0; } }
        @keyframes orion-blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
      `}</style>

      <div className={cn("relative overflow-hidden rounded-xl border border-[#3B82F6]/10 bg-[#0a0a0f]", className)}>
        {/* Scan line */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-[#3B82F6]/20 to-transparent"
            style={{ animation: "orion-scan 4s linear infinite" }} />
        </div>

        {/* Grid background */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{ backgroundImage: "linear-gradient(#3B82F6 1px, transparent 1px), linear-gradient(90deg, #3B82F6 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

        {/* ═══ TOP MICRO-METRICS BAR ═══ */}
        <div className="relative flex items-center justify-between px-3 py-1 border-b border-[#3B82F6]/5 bg-[#0a0a0f]/90 overflow-x-auto">
          <div className="flex items-center gap-0.5">
            <div className="relative mr-2">
              <div className={cn("h-2 w-2 rounded-full", healthStatus === "online" ? "bg-[#3B82F6]" : healthStatus === "warning" ? "bg-[#c9a84c]" : "bg-red-500")} />
              {healthStatus === "online" && <div className="absolute inset-0 h-2 w-2 rounded-full bg-[#3B82F6]/40 animate-ping" />}
            </div>
            <span className="text-[9px] font-mono uppercase tracking-[0.25em] text-[#3B82F6]/60 mr-1">ORION OS</span>
            <span className="text-[8px] font-mono text-[#c9a84c]/40">v22.3</span>
            {realtimeEvent && <span className="text-[8px] font-mono text-[#c9a84c] animate-pulse ml-2">⚡ {realtimeEvent}</span>}
          </div>
          <div className="flex items-center gap-0 divide-x divide-[#3B82F6]/5 hidden md:flex">
            <MicroMetric label="BITRATE" value="1.2" unit="Gbps" />
            <MicroMetric label="HOPS" value="7" />
            <MicroMetric label="LATÊNCIA" value="12" unit="ms" />
            <MicroMetric label="THREADS" value="48" />
            <MicroMetric label="UPTIME" value={formatUptime()} />
          </div>
        </div>

        {/* ═══ SECOND BAR: Clock + Date ═══ */}
        <div className="relative flex items-center justify-between px-4 py-2 border-b border-[#3B82F6]/5">
          <LCDClock time={time} />
          <div className="text-[9px] font-mono text-[#3B82F6]/30 tracking-wider">{dateStr}</div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded border border-[#3B82F6]/10">
              <Radio className="h-3 w-3 text-[#3B82F6]/40" />
              <span className="text-[8px] font-mono text-[#3B82F6]/40">MQTT</span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#3B82F6]/40" />
            </div>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded border border-[#c9a84c]/10">
              <Server className="h-3 w-3 text-[#c9a84c]/40" />
              <span className="text-[8px] font-mono text-[#c9a84c]/40">RAG</span>
              <span className="h-1.5 w-1.5 rounded-full bg-[#c9a84c]/40" />
            </div>
          </div>
        </div>

        {/* ═══ MAIN LAYOUT ═══ */}
        <div className="relative grid grid-cols-1 lg:grid-cols-[280px_1fr_280px] gap-3 p-3">

          {/* ──── LEFT COLUMN ──── */}
          <div className="flex flex-col gap-2 order-2 lg:order-1">
            {/* User Profile */}
            <UserProfileCard />

            {/* CPU + Memory Gauges */}
            <div className="p-2.5 rounded border border-[#3B82F6]/10 bg-[#0a0a0f]/60">
              <div className="text-[7px] font-mono uppercase tracking-[0.2em] text-[#3B82F6]/30 mb-2">PROCESSAMENTO</div>
              <div className="flex items-start gap-3">
                <div className="relative flex flex-col items-center">
                  <CircularGauge value={cpuLoad} label="CPU" size={52} color="#3B82F6" />
                </div>
                <div className="relative flex flex-col items-center">
                  <CircularGauge value={memLoad} label="MEM" size={52} color="#c9a84c" />
                </div>
                <div className="flex-1 flex flex-col gap-1 min-w-0">
                  <div className="text-[7px] font-mono text-[#3B82F6]/30">CPU HIST</div>
                  <MiniGraph data={sparkCpu} color="cyan" height={20} />
                  <div className="text-[7px] font-mono text-[#c9a84c]/30">MEM HIST</div>
                  <MiniGraph data={sparkMem} color="gold" height={20} />
                </div>
              </div>
            </div>

            {/* Neural Stats */}
            <StatPanel icon={<Activity className="h-3.5 w-3.5" />} label="Saúde Neural" value={`${m.neuralHealth.toFixed(1)}%`}
              sub="Embeddings processados" status={healthStatus} onClick={() => navigate("/dashboard/rede-neural")}
              sparkline={sparkNeural} />
            <StatPanel icon={<Cpu className="h-3.5 w-3.5" />} label="Provedores IA" value={m.activeConnections}
              sub="Rotas ativas" status={m.activeConnections > 0 ? "online" : "offline"}
              onClick={() => navigate("/dashboard/rede-neural")} />

            {/* Network waveforms UP/DOWN */}
            <div className="p-2 rounded border border-[#3B82F6]/10 bg-[#0a0a0f]/60">
              <div className="flex items-center gap-2 mb-1">
                <ArrowUp className="h-3 w-3 text-[#3B82F6]/50" />
                <span className="text-[7px] font-mono uppercase tracking-wider text-[#3B82F6]/30">UPLOAD 847 Kbps</span>
              </div>
              <Waveform bars={30} color="cyan" height={22} />
              <div className="flex items-center gap-2 mt-2 mb-1">
                <ArrowDown className="h-3 w-3 text-[#c9a84c]/50" />
                <span className="text-[7px] font-mono uppercase tracking-wider text-[#c9a84c]/30">DOWNLOAD 2.4 Mbps</span>
              </div>
              <Waveform bars={30} color="gold" height={22} />
            </div>
          </div>

          {/* ──── CENTER: CORE ──── */}
          <div className="flex flex-col items-center justify-center order-1 lg:order-2 py-4 lg:py-0 gap-3">
            <OrionCore health={m.neuralHealth} status={healthStatus} />

            {/* Below core: mini status bar */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <HardDrive className="h-3 w-3 text-[#3B82F6]/30" />
                <span className="text-[8px] font-mono text-[#3B82F6]/40">{m.knowledgeBase.toLocaleString("pt-BR")} docs</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap className="h-3 w-3 text-[#c9a84c]/30" />
                <span className="text-[8px] font-mono text-[#c9a84c]/40">{m.activeConnections} providers</span>
              </div>
              <div className="flex items-center gap-1">
                <Shield className="h-3 w-3 text-[#3B82F6]/30" />
                <span className="text-[8px] font-mono text-[#3B82F6]/40">9 modelos</span>
              </div>
            </div>
          </div>

          {/* ──── RIGHT COLUMN ──── */}
          <div className="flex flex-col gap-2 order-3">
            {/* Environment */}
            <EnvironmentalBlock />

            {/* Knowledge Base */}
            <StatPanel icon={<Database className="h-3.5 w-3.5" />} label="Base Neural" value={m.knowledgeBase.toLocaleString("pt-BR")}
              sub="Documentos indexados" status="online" onClick={() => navigate("/dashboard/pesquisa")}
              sparkline={sparkEmbed} />

            {/* System Status */}
            <StatPanel icon={<Shield className="h-3.5 w-3.5" />} label="Sistema"
              value={healthStatus === "online" ? "ONLINE" : healthStatus === "warning" ? "ATENÇÃO" : "OFFLINE"}
              sub="Consciousness Engine ativo" status={healthStatus} />

            {/* Alerts */}
            <StatPanel icon={<Eye className="h-3.5 w-3.5" />} label="Alertas" value={m.alertsCount}
              sub={m.alertsCount === 0 ? "Nenhum alerta" : `${m.alertsCount} pendente(s)`}
              status={m.alertsCount > 0 ? "warning" : "online"} />

            {/* AI Processing waveform */}
            <div className="p-2 rounded border border-[#c9a84c]/10 bg-[#0a0a0f]/60">
              <div className="text-[7px] font-mono uppercase tracking-[0.2em] text-[#c9a84c]/30 mb-1">AI PROCESSING PIPELINE</div>
              <Waveform bars={30} color="gold" height={24} />
            </div>

            {/* Neural activity sparkline */}
            <div className="p-2 rounded border border-[#3B82F6]/10 bg-[#0a0a0f]/60">
              <div className="text-[7px] font-mono uppercase tracking-[0.2em] text-[#3B82F6]/30 mb-1">EMBEDDINGS FLUX</div>
              <MiniGraph data={sparkEmbed} color="cyan" height={28} />
            </div>
          </div>
        </div>

        {/* ═══ BOTTOM BAR ═══ */}
        <div className="relative flex items-center gap-2 px-3 py-2 border-t border-[#3B82F6]/8 flex-wrap">
          <span className="text-[7px] font-mono uppercase tracking-[0.2em] text-[#c9a84c]/35 mr-1">ACESSO RÁPIDO</span>
          {[
            { label: "PESQUISAR", icon: Search, path: "/dashboard/pesquisa" },
            { label: "GERAR DOC", icon: FileText, path: "/dashboard/gerar-documento" },
            { label: "CHAT IA", icon: Brain, path: "/dashboard/chat" },
            { label: "MÉTRICAS", icon: TrendingUp, path: "/dashboard/metricas-ia" },
            { label: "REDE NEURAL", icon: Globe, path: "/dashboard/rede-neural" },
          ].map((item) => (
            <button key={item.label} onClick={() => navigate(item.path)}
              className="flex items-center gap-1.5 px-2 py-1 text-[8px] font-mono tracking-wider rounded
                border border-[#3B82F6]/8 bg-[#3B82F6]/[0.02] text-[#3B82F6]/40
                hover:text-[#3B82F6] hover:border-[#3B82F6]/25 hover:bg-[#3B82F6]/5
                hover:shadow-[0_0_8px_rgba(59,130,246,0.12)] transition-all duration-300">
              <item.icon className="h-3 w-3" />
              {item.label}
            </button>
          ))}
          <div className="ml-auto text-[7px] font-mono text-[#3B82F6]/15 tracking-widest hidden sm:block">
            ORION NEURAL SYSTEMS • IIT Φ ACTIVE
          </div>
        </div>
      </div>
    </>
  );
}
