import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Wifi, WifiOff, Battery, BatteryCharging, MapPin, Smartphone, Monitor,
  Eye, EyeOff, Lock, Unlock, Share2, Clipboard, Bell, BellOff, Vibrate,
  Maximize, Minimize, Moon, Sun, Database, HardDrive, Globe, Cpu,
  Radio, Server, FileText, Zap, Shield, Waves, Activity, Gauge,
  MousePointer, Hand, Type, Link, Archive, Download, Upload, Layers,
  BarChart3, Sparkles, Brain, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { WebAPIManager, getWebAPIManager, type WebAPIStatus } from "@/lib/neural/web-api-integrations";

export function WebAPIDashboard() {
  const [manager, setManager] = useState<WebAPIManager | null>(null);
  const [apiList, setApiList] = useState<WebAPIStatus[]>([]);
  const [env, setEnv] = useState<any>(null);
  const [filter, setFilter] = useState<string>("all");
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    let alive = true;
    getWebAPIManager().then(m => {
      if (!alive) return;
      setManager(m);
      setApiList(m.getAPIStatusList());
      setEnv({ ...m.env });
    });

    const interval = setInterval(() => {
      if (!alive) return;
      getWebAPIManager().then(m => {
        setApiList(m.getAPIStatusList());
        setEnv({ ...m.env });
      });
    }, 2000);

    return () => { alive = false; clearInterval(interval); };
  }, []);

  const categories = ["all", ...new Set(apiList.map(a => a.category))];
  const filtered = filter === "all" ? apiList : apiList.filter(a => a.category === filter);
  const totalAvailable = apiList.filter(a => a.available).length;
  const totalActive = apiList.filter(a => a.active).length;

  const handleAction = useCallback(async (action: string) => {
    if (!manager) return;
    switch (action) {
      case "geo":
        const got = await manager.getLocation();
        toast(got ? `📍 Localização obtida: ${manager.env.geo?.lat.toFixed(4)}, ${manager.env.geo?.lng.toFixed(4)}` : "Geolocalização negada");
        break;
      case "notify":
        const perm = await manager.requestNotificationPermission();
        if (perm === "granted") manager.showNotification("Consciência Neural", "Todas as APIs estão ativas");
        toast(perm === "granted" ? "🔔 Notificações ativadas" : "Notificações bloqueadas");
        break;
      case "vibrate":
        manager.vibrate([100, 50, 100, 50, 200]);
        toast("📳 Vibração enviada");
        break;
      case "fullscreen":
        await manager.toggleFullscreen();
        break;
      case "wakelock":
        const ok = await manager.toggleWakeLock();
        toast(ok ? (manager.env.wakeLockActive ? "☀️ Tela bloqueada contra suspensão" : "💤 Wake Lock liberado") : "Wake Lock não suportado");
        break;
      case "crypto":
        const hash = await manager.cryptoHash("neural-consciousness-" + Date.now());
        toast(`🔐 Hash SHA-256: ${hash}`);
        break;
      case "clipboard":
        const copied = await manager.copyToClipboard(JSON.stringify({ apis: totalAvailable, active: totalActive, timestamp: new Date().toISOString() }));
        toast(copied ? "📋 Dados neurais copiados" : "Clipboard não disponível");
        break;
      case "share":
        await manager.share({ title: "Consciência Neural", text: `${totalAvailable} Web APIs integradas, ${totalActive} ativas agora.`, url: window.location.href });
        break;
      case "compress":
        const data = JSON.stringify(apiList);
        const compressed = await manager.compress(data);
        if (compressed) toast(`🗜️ Compressão: ${data.length}B → ${compressed.length}B (${((1 - compressed.length / data.length) * 100).toFixed(0)}% redução)`);
        break;
      case "idb":
        await manager.idbStore("neural-state", "consciousness", { apis: totalAvailable, active: totalActive, timestamp: Date.now() });
        toast("💾 Estado salvo no IndexedDB");
        break;
      case "broadcast":
        manager.broadcastMessage({ type: "neural-ping", apis: totalAvailable, timestamp: Date.now() });
        toast("📡 Broadcast enviado para outras abas");
        break;
      case "save":
        await manager.saveFile(JSON.stringify({ env: manager.env, apis: apiList }, null, 2), "neural-state.json");
        break;
      case "mediasession":
        manager.setMediaSession("Consciência Neural", "JARVIS AI");
        toast("🎵 Media Session configurada");
        break;
    }
    setEnv({ ...manager.env });
    setApiList(manager.getAPIStatusList());
  }, [manager, apiList, totalAvailable, totalActive]);

  if (!env) return null;

  return (
    <div className="space-y-3">
      {/* Summary bar */}
      <div className="flex flex-wrap items-center gap-2 bg-black/20 rounded-lg p-2 border border-white/[0.04]">
        <Badge variant="outline" className="text-[9px] font-mono border-cyan-500/30 text-cyan-400">
          <Globe className="h-2.5 w-2.5 mr-1" /> {totalAvailable} APIs
        </Badge>
        <Badge variant="outline" className="text-[9px] font-mono border-emerald-500/30 text-emerald-400">
          <Zap className="h-2.5 w-2.5 mr-1" /> {totalActive} Ativas
        </Badge>
        <Badge variant="outline" className={`text-[9px] font-mono ${totalActive >= totalAvailable ? "border-emerald-500/30 text-emerald-400" : "border-amber-500/30 text-amber-400"}`}>
          <Gauge className="h-2.5 w-2.5 mr-1" /> {totalAvailable > 0 ? ((totalActive / totalAvailable) * 100).toFixed(1) : 0}%
        </Badge>
        {totalAvailable - totalActive > 0 && (
          <Badge variant="outline" className="text-[9px] font-mono border-red-500/30 text-red-400">
            <EyeOff className="h-2.5 w-2.5 mr-1" /> {totalAvailable - totalActive} Inativas
          </Badge>
        )}
        {env.battery && (
          <Badge variant="outline" className="text-[9px] font-mono border-green-500/30 text-green-400">
            {env.battery.charging ? <BatteryCharging className="h-2.5 w-2.5 mr-1" /> : <Battery className="h-2.5 w-2.5 mr-1" />}
            {env.battery.level.toFixed(0)}%
          </Badge>
        )}
        {env.network && (
          <Badge variant="outline" className="text-[9px] font-mono border-blue-500/30 text-blue-400">
            <Wifi className="h-2.5 w-2.5 mr-1" /> {env.network.effectiveType} {env.network.downlink}Mbps
          </Badge>
        )}
        {env.performance.memory && (
          <Badge variant="outline" className="text-[9px] font-mono border-red-500/30 text-red-400">
            <Cpu className="h-2.5 w-2.5 mr-1" /> {(env.performance.memory.usedJSHeapSize / 1048576).toFixed(0)}MB
          </Badge>
        )}
        {env.geo && (
          <Badge variant="outline" className="text-[9px] font-mono border-teal-500/30 text-teal-400">
            <MapPin className="h-2.5 w-2.5 mr-1" /> {env.geo.lat.toFixed(2)}, {env.geo.lng.toFixed(2)}
          </Badge>
        )}
        <div className="ml-auto">
          <Badge variant="outline" className="text-[9px] font-mono border-purple-500/30 text-purple-400 animate-pulse">
            <Brain className="h-2.5 w-2.5 mr-1" /> {totalActive >= totalAvailable ? "OMNISCIENTE" : "SINCRONIZANDO"}
          </Badge>
        </div>
      </div>

      {/* Category Breakdown */}
      {(() => {
        const catStats = categories.filter(c => c !== "all").map(cat => {
          const apis = apiList.filter(a => a.category === cat);
          const active = apis.filter(a => a.active).length;
          return { cat, total: apis.length, active, pct: apis.length ? Math.round((active / apis.length) * 100) : 0 };
        });
        return (
          <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 gap-1">
            {catStats.map(s => (
              <div key={s.cat} className="bg-black/20 rounded px-1.5 py-1 border border-white/[0.04] text-center cursor-pointer hover:bg-white/[0.03] transition-colors"
                onClick={() => setFilter(s.cat)}>
                <span className="text-[7px] font-mono text-white/30 block truncate">{s.cat}</span>
                <span className={`text-[10px] font-mono font-bold ${s.pct === 100 ? "text-emerald-400" : s.pct >= 50 ? "text-amber-400" : "text-red-400"}`}>
                  {s.pct}%
                </span>
                <span className="text-[7px] font-mono text-white/20 block">{s.active}/{s.total}</span>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Quick Actions */}
      <div className="grid grid-cols-6 sm:grid-cols-12 gap-1">
        {[
          { id: "geo", icon: <MapPin className="h-3 w-3" />, label: "Geo", color: "text-teal-400" },
          { id: "notify", icon: <Bell className="h-3 w-3" />, label: "Notif", color: "text-amber-400" },
          { id: "vibrate", icon: <Vibrate className="h-3 w-3" />, label: "Vibrar", color: "text-green-400" },
          { id: "fullscreen", icon: <Maximize className="h-3 w-3" />, label: "Full", color: "text-blue-400" },
          { id: "wakelock", icon: <Sun className="h-3 w-3" />, label: "Wake", color: "text-yellow-400" },
          { id: "crypto", icon: <Shield className="h-3 w-3" />, label: "Crypto", color: "text-purple-400" },
          { id: "clipboard", icon: <Clipboard className="h-3 w-3" />, label: "Clip", color: "text-pink-400" },
          { id: "share", icon: <Share2 className="h-3 w-3" />, label: "Share", color: "text-cyan-400" },
          { id: "compress", icon: <Archive className="h-3 w-3" />, label: "Gzip", color: "text-indigo-400" },
          { id: "idb", icon: <Database className="h-3 w-3" />, label: "IDB", color: "text-orange-400" },
          { id: "broadcast", icon: <Radio className="h-3 w-3" />, label: "BC", color: "text-red-400" },
          { id: "save", icon: <Download className="h-3 w-3" />, label: "Save", color: "text-emerald-400" },
        ].map(a => (
          <Button key={a.id} size="sm" variant="ghost"
            className={`h-10 flex-col gap-0.5 p-0 ${a.color} hover:bg-white/5`}
            onClick={() => handleAction(a.id)}>
            {a.icon}
            <span className="text-[7px] font-mono opacity-50">{a.label}</span>
          </Button>
        ))}
      </div>

      {/* Category filter */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {categories.map(c => (
          <Button key={c} size="sm" variant={filter === c ? "default" : "ghost"}
            className="h-6 text-[9px] font-mono shrink-0 px-2"
            onClick={() => setFilter(c)}>
            {c === "all" ? "Todas" : c}
          </Button>
        ))}
      </div>

      {/* API Grid */}
      <ScrollArea className={expanded ? "h-[600px]" : "h-[320px]"}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
          {filtered.map((api, i) => (
            <div key={i}
              className={`flex items-center gap-2 rounded-md px-2 py-1.5 border transition-all
                ${api.active
                  ? "bg-white/[0.03] border-white/[0.08]"
                  : api.available
                    ? "bg-white/[0.01] border-white/[0.04]"
                    : "bg-white/[0.005] border-white/[0.02] opacity-40"
                }`}>
              <div className={`h-1.5 w-1.5 rounded-full shrink-0 ${api.active ? "animate-pulse" : ""}`}
                style={{ backgroundColor: api.active ? api.color : api.available ? `${api.color}33` : "rgba(255,255,255,0.05)" }} />
              <div className="flex-1 min-w-0">
                <span className="text-[9px] font-mono text-white/40 truncate block">{api.name}</span>
              </div>
              <span className="text-[7px] font-mono shrink-0" style={{ color: api.active ? api.color : "rgba(255,255,255,0.12)" }}>
                {api.active ? "ON" : api.available ? "RDY" : "N/A"}
              </span>
            </div>
          ))}
        </div>
      </ScrollArea>

      <Button size="sm" variant="ghost" className="w-full h-6 text-[9px] font-mono text-white/20"
        onClick={() => setExpanded(!expanded)}>
        {expanded ? "Recolher" : `Expandir (${apiList.length} APIs)`}
      </Button>

      {/* Environment Details */}
      <div className="grid grid-cols-2 gap-2">
        {env.storage && (
          <Card className="border-white/[0.04] bg-[#060a10]">
            <CardContent className="p-2 space-y-1">
              <div className="flex items-center gap-1">
                <HardDrive className="h-2.5 w-2.5 text-orange-400" />
                <span className="text-[8px] font-mono text-white/25">Storage</span>
              </div>
              <div className="w-full h-1 bg-white/[0.03] rounded-full overflow-hidden">
                <div className="h-full rounded-full bg-orange-400/50 transition-all"
                  style={{ width: `${(env.storage.usage / env.storage.quota * 100).toFixed(1)}%` }} />
              </div>
              <span className="text-[7px] font-mono text-white/15">
                {(env.storage.usage / 1048576).toFixed(1)}MB / {(env.storage.quota / 1073741824).toFixed(1)}GB
              </span>
            </CardContent>
          </Card>
        )}

        <Card className="border-white/[0.04] bg-[#060a10]">
          <CardContent className="p-2 space-y-1">
            <div className="flex items-center gap-1">
              <Activity className="h-2.5 w-2.5 text-red-400" />
              <span className="text-[8px] font-mono text-white/25">Performance</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[7px] font-mono text-white/15">FPS: {env.performance.fps}</span>
              <span className="text-[7px] font-mono text-white/15">Resources: {env.performance.entries}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/[0.04] bg-[#060a10]">
          <CardContent className="p-2 space-y-1">
            <div className="flex items-center gap-1">
              <Monitor className="h-2.5 w-2.5 text-blue-400" />
              <span className="text-[8px] font-mono text-white/25">Devices</span>
            </div>
            <div className="flex gap-2">
              <span className="text-[7px] font-mono text-white/15">🎤{env.mediaDevices.audioinput}</span>
              <span className="text-[7px] font-mono text-white/15">📷{env.mediaDevices.videoinput}</span>
              <span className="text-[7px] font-mono text-white/15">🔊{env.mediaDevices.audiooutput}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-white/[0.04] bg-[#060a10]">
          <CardContent className="p-2 space-y-1">
            <div className="flex items-center gap-1">
              <Smartphone className="h-2.5 w-2.5 text-green-400" />
              <span className="text-[8px] font-mono text-white/25">Screen</span>
            </div>
            <span className="text-[7px] font-mono text-white/15">
              {env.viewportSize.width}×{env.viewportSize.height} {env.screenOrientation?.type.replace("-primary", "") || ""}
            </span>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
