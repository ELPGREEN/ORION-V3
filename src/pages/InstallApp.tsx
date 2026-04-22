import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Download, Smartphone, Monitor, Apple, CheckCircle, Shield, Wifi, Lightbulb, Speaker, Tv, Plug, Bluetooth, Loader2, XCircle, RefreshCw, Mic } from "lucide-react";
import { GlassCard } from "@/components/ui/TechElements";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { getAllPermissionStates, requestPermission, requestAllPermissions, type PermissionState } from "@/lib/device-permissions";
import { useToast } from "@/hooks/use-toast";
import { bluetoothManager, type BLEDeviceInfo } from "@/lib/neural/bluetooth-manager";
// Spotify, YouTube Music and Amazon integrations removed — only YouTube IFrame is supported.

export default function InstallApp() {
  const { canInstall, isInstalled, isIOS, triggerInstall } = useInstallPrompt();
  const [permissions, setPermissions] = useState<PermissionState[]>([]);
  const [loadingPerms, setLoadingPerms] = useState(false);
  const { toast } = useToast();

  // Bluetooth state
  const [bleDevices, setBleDevices] = useState<BLEDeviceInfo[]>([]);
  const [bleScanning, setBleScanning] = useState(false);
  const [bleSupported] = useState(bluetoothManager.isSupported);

  useEffect(() => {
    getAllPermissionStates().then(setPermissions);
  }, []);

  // Listen for BLE events
  useEffect(() => {
    const handler = (event: { type: string; data: any }) => {
      if (event.type === "device_connected" || event.type === "device_disconnected") {
        setBleDevices(bluetoothManager.getDevices());
      }
    };
    bluetoothManager.on(handler);
    setBleDevices(bluetoothManager.getDevices());
    return () => bluetoothManager.off(handler);
  }, []);

  const handleInstall = async () => {
    const accepted = await triggerInstall();
    if (accepted) {
      toast({ title: "App instalado!", description: "Procure ORION IA na tela inicial." });
    }
  };

  const handleRequestAll = async () => {
    setLoadingPerms(true);
    const results = await requestAllPermissions();
    setPermissions(results);
    setLoadingPerms(false);
    const granted = results.filter(p => p.status === "granted").length;
    toast({ title: `${granted}/${results.length} permissões ativadas` });
  };

  const handleRequestSingle = async (name: PermissionState["name"]) => {
    const status = await requestPermission(name);
    setPermissions(prev => prev.map(p => p.name === name ? { ...p, status } : p));
  };

  const handleBleScan = async () => {
    setBleScanning(true);
    const device = await bluetoothManager.scan();
    if (device) {
      const connected = await bluetoothManager.connect(device.id);
      setBleDevices(bluetoothManager.getDevices());
      if (connected) {
        toast({ title: "Dispositivo conectado!", description: device.name });
      }
    }
    setBleScanning(false);
  };

  const handleBleDisconnect = async (deviceId: string) => {
    await bluetoothManager.disconnect(deviceId);
    setBleDevices(bluetoothManager.getDevices());
    toast({ title: "Dispositivo desconectado" });
  };

  const statusColor = (s: string) => {
    if (s === "granted") return "text-green-400";
    if (s === "denied") return "text-red-400";
    if (s === "unsupported") return "text-muted-foreground/30";
    return "text-yellow-400";
  };

  const statusLabel = (s: string) => {
    if (s === "granted") return "Ativado";
    if (s === "denied") return "Negado";
    if (s === "unsupported") return "Indisponível";
    return "Pendente";
  };

  const smartHomeDevices = [
    { icon: Lightbulb, name: "Lâmpadas", desc: "Philips Hue, LIFX, Tuya" },
    { icon: Speaker, name: "Caixas de Som", desc: "Assistentes de voz, Sonos" },
    { icon: Plug, name: "Tomadas", desc: "TP-Link, Sonoff, Shelly" },
    { icon: Tv, name: "TVs & Displays", desc: "Samsung, LG, Chromecast" },
    { icon: Wifi, name: "Roteadores", desc: "Mesh, repetidores WiFi" },
    { icon: Monitor, name: "Computadores", desc: "Wake-on-LAN, SSH remoto" },
  ];

  return (
    <MainLayout>
      <SEO
        title="Instalar App — ORION IA by ELP® Green Technology"
        description="Instale o ORION IA no seu dispositivo para acesso rápido e offline. Disponível para Android, iOS e Desktop."
        image="https://www.iasofthub.com/og-images/og-install.jpg"
        keywords="instalar, app, download, ORION IA, PWA, Android, iOS"
      />
      <section className="min-h-[70vh] flex items-center justify-center py-16 px-4">
        <div className="max-w-2xl w-full space-y-8">
          <div className="text-center space-y-3">
            <div className="h-16 w-16 border border-primary/30 flex items-center justify-center mx-auto mb-4">
              <Smartphone className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-3xl font-serif text-foreground tracking-tight">
              {isInstalled ? "Orion Instalado" : "Download Orion"}
            </h1>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              {isInstalled
                ? "Configure permissões e conecte seus serviços e dispositivos."
                : "Instale o app direto no seu dispositivo — sem app store."}
            </p>
          </div>

          {/* ── INSTALL SECTION ── */}
          {!isInstalled && (
            canInstall ? (
              <GlassCard className="p-8 text-center space-y-6">
                <Monitor className="h-10 w-10 text-primary mx-auto" />
                <p className="text-foreground text-sm">
                  Clique abaixo para instalar o app no seu dispositivo.
                </p>
                <Button
                  className="btn-gold shimmer px-8 py-5 text-sm tracking-wide w-full"
                  onClick={handleInstall}
                >
                  <Download className="mr-3 h-4 w-4" />
                  Download App
                </Button>
              </GlassCard>
            ) : (
              <div className="space-y-4">
                {isIOS ? (
                  <GlassCard className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <Apple className="h-5 w-5 text-primary" />
                      <h3 className="font-serif text-foreground">iPhone / iPad</h3>
                    </div>
                    <ol className="text-sm text-muted-foreground space-y-3 list-decimal list-inside">
                      <li>Toque no ícone de <strong className="text-foreground">Compartilhar</strong> (quadrado com seta para cima)</li>
                      <li>Role para baixo e toque em <strong className="text-foreground">"Adicionar à Tela de Início"</strong></li>
                      <li>Toque em <strong className="text-foreground">"Adicionar"</strong> no canto superior direito</li>
                    </ol>
                  </GlassCard>
                ) : (
                  <GlassCard className="p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-5 w-5 text-primary" />
                      <h3 className="font-serif text-foreground">Android / Desktop</h3>
                    </div>
                    <ol className="text-sm text-muted-foreground space-y-3 list-decimal list-inside">
                      <li>Abra este site no navegador <strong className="text-foreground">Chrome</strong></li>
                      <li>Toque no menu <strong className="text-foreground">⋮</strong> (três pontos)</li>
                      <li>Selecione <strong className="text-foreground">"Instalar aplicativo"</strong></li>
                    </ol>
                  </GlassCard>
                )}
              </div>
            )
          )}

          {/* ── PERMISSIONS ── */}
          <GlassCard className="p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-5 w-5 text-primary" />
              <h3 className="font-serif text-foreground">Permissões do Dispositivo</h3>
            </div>
            <div className="space-y-3">
              {permissions.map(p => (
                <div key={p.name} className="flex items-center justify-between p-3 rounded bg-muted/30 border border-border/20">
                  <div className="flex items-center gap-3">
                    <span className="text-lg">{p.icon}</span>
                    <div>
                      <div className="text-sm font-medium text-foreground">{p.label}</div>
                      <div className="text-[10px] text-muted-foreground">{p.description}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-mono uppercase tracking-wider ${statusColor(p.status)}`}>
                      {statusLabel(p.status)}
                    </span>
                    {p.status === "prompt" && (
                      <Button size="sm" variant="outline" className="h-6 text-[10px] px-2"
                        onClick={() => handleRequestSingle(p.name)}>
                        Ativar
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <Button
              className="w-full btn-gold shimmer text-sm"
              onClick={handleRequestAll}
              disabled={loadingPerms}
            >
              <Shield className="mr-2 h-4 w-4" />
              {loadingPerms ? "Ativando..." : "Ativar Todas as Permissões"}
            </Button>
          </GlassCard>

          {/* ── BLUETOOTH DEVICES ── */}
          <GlassCard className="p-6 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Bluetooth className="h-5 w-5 text-primary" />
                <h3 className="font-serif text-foreground">Dispositivos Bluetooth</h3>
              </div>
              {bleSupported && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-[10px] gap-1"
                  onClick={handleBleScan}
                  disabled={bleScanning}
                >
                  {bleScanning ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <RefreshCw className="h-3 w-3" />
                  )}
                  {bleScanning ? "Buscando..." : "Buscar Dispositivos"}
                </Button>
              )}
            </div>

            {!bleSupported ? (
              <div className="flex items-center gap-2 p-3 rounded bg-red-500/5 border border-red-500/10">
                <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Bluetooth não disponível. Use <strong className="text-foreground">Chrome/Edge</strong> em HTTPS ou instale o app nativo via Capacitor.
                </p>
              </div>
            ) : bleDevices.length === 0 ? (
              <div className="text-center py-6 space-y-2">
                <Bluetooth className="h-8 w-8 text-muted-foreground/30 mx-auto" />
                <p className="text-xs text-muted-foreground">
                  Nenhum dispositivo conectado. Clique em "Buscar Dispositivos" para escanear.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {bleDevices.map(d => (
                  <div key={d.id} className="flex items-center justify-between p-3 rounded bg-muted/30 border border-border/20">
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${d.connected ? "bg-green-400" : "bg-muted-foreground/30"}`} />
                      <div>
                        <div className="text-sm font-medium text-foreground">{d.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {d.connected ? "Conectado" : "Desconectado"}
                          {d.batteryLevel != null && ` • 🔋 ${d.batteryLevel}%`}
                          {d.services.length > 0 && ` • ${d.services.length} serviço(s)`}
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant={d.connected ? "destructive" : "outline"}
                      className="h-6 text-[10px] px-2"
                      onClick={() => d.connected
                        ? handleBleDisconnect(d.id)
                        : bluetoothManager.connect(d.id).then(() => setBleDevices(bluetoothManager.getDevices()))
                      }
                    >
                      {d.connected ? "Desconectar" : "Conectar"}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>

          {/* Spotify, YouTube Music, Amazon integration cards removed —
              only YouTube IFrame is supported now. */}

          {/* ── COMPATIBLE DEVICES ── */}
          <GlassCard className="p-6 space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Wifi className="h-5 w-5 text-primary" />
              <h3 className="font-serif text-foreground">Dispositivos Compatíveis</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Orion se conecta a dispositivos IoT via Bluetooth e MQTT. Configure no painel de Dispositivos.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {smartHomeDevices.map(d => (
                <div key={d.name} className="flex items-center gap-2 p-3 rounded bg-muted/20 border border-border/10">
                  <d.icon className="h-4 w-4 text-primary/60 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-foreground truncate">{d.name}</div>
                    <div className="text-[9px] text-muted-foreground truncate">{d.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </section>
    </MainLayout>
  );
}