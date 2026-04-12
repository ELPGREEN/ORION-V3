/**
 * Robot Connection Manager — Configure and test robot connections
 */
import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Wifi, WifiOff, Plus, Trash2, CheckCircle, XCircle, Loader2,
  Server, Radio, Camera, Workflow, BarChart3, Monitor, Pencil, Save,
} from "lucide-react";
import { useRobotConnectionContext, type RobotProfile } from "@/contexts/RobotConnectionContext";
import { toast } from "sonner";

const SERVICE_ICONS: Record<string, typeof Wifi> = {
  rosbridge: Server,
  webrtc: Camera,
  mqtt: Radio,
  nodered: Workflow,
  grafana: BarChart3,
  foxglove: Monitor,
};

const SERVICE_LABELS: Record<string, string> = {
  rosbridge: "ROSBridge",
  webrtc: "WebRTC",
  mqtt: "MQTT",
  nodered: "Node-RED",
  grafana: "Grafana",
  foxglove: "Foxglove",
};

export default function RobotConnectionManager() {
  const {
    profiles, activeProfile, activeProfileId, serviceStatus, latencyMs,
    addProfile, updateProfile, removeProfile, setActiveProfile, testConnection,
  } = useRobotConnectionContext();

  const [testing, setTesting] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<RobotProfile>>({
    name: "", ip: "192.168.1.100",
    rosbridgePort: 9090, webrtcPort: 8443, mqttPort: 8083,
    noderedPort: 1880, grafanaPort: 3001, foxglovePort: 8765,
  });

  const handleTest = useCallback(async () => {
    setTesting(true);
    try {
      const status = await testConnection();
      const onlineCount = Object.values(status).filter((s) => s === "online").length;
      if (onlineCount > 0) {
        toast.success(`${onlineCount}/6 serviços online`);
      } else {
        toast.error("Nenhum serviço respondeu. Verifique IP e Docker.");
      }
    } catch {
      toast.error("Erro ao testar conexão");
    }
    setTesting(false);
  }, [testConnection]);

  const handleAdd = useCallback(() => {
    if (!form.name || !form.ip) {
      toast.error("Nome e IP são obrigatórios");
      return;
    }
    const profile = addProfile({
      name: form.name!,
      ip: form.ip!,
      rosbridgePort: form.rosbridgePort ?? 9090,
      webrtcPort: form.webrtcPort ?? 8443,
      mqttPort: form.mqttPort ?? 8083,
      noderedPort: form.noderedPort ?? 1880,
      grafanaPort: form.grafanaPort ?? 3001,
      foxglovePort: form.foxglovePort ?? 8765,
    });
    setActiveProfile(profile.id);
    setAdding(false);
    toast.success(`Perfil "${form.name}" criado`);
  }, [form, addProfile, setActiveProfile]);

  const handleSaveEdit = useCallback(() => {
    if (editing) {
      updateProfile(editing, form);
      setEditing(null);
      toast.success("Perfil atualizado");
    }
  }, [editing, form, updateProfile]);

  const startEdit = useCallback((profile: RobotProfile) => {
    setForm({ ...profile });
    setEditing(profile.id);
  }, []);

  const statusIcon = (s: string) => {
    if (s === "online") return <CheckCircle className="h-3.5 w-3.5 text-green-500" />;
    if (s === "checking") return <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />;
    return <XCircle className="h-3.5 w-3.5 text-muted-foreground" />;
  };

  return (
    <div className="space-y-4">
      {/* Active Profile + Test */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Wifi className="h-4 w-4" />
            Conexão do Robô
            {activeProfile && (
              <Badge variant="outline" className="ml-auto text-[10px]">
                {activeProfile.ip}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Service Status Grid */}
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(SERVICE_LABELS) as Array<keyof typeof SERVICE_LABELS>).map((key) => {
              const Icon = SERVICE_ICONS[key];
              const status = serviceStatus[key as keyof typeof serviceStatus];
              return (
                <div key={key} className="flex items-center gap-1.5 p-2 rounded-lg border border-border/50 text-xs">
                  {statusIcon(status)}
                  <Icon className="h-3 w-3 text-muted-foreground" />
                  <span>{SERVICE_LABELS[key]}</span>
                </div>
              );
            })}
          </div>

          {latencyMs !== null && (
            <div className="text-[10px] text-muted-foreground text-center">
              Latência do teste: {latencyMs}ms
            </div>
          )}

          <Button size="sm" className="w-full" onClick={handleTest} disabled={testing || !activeProfile}>
            {testing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Wifi className="h-3.5 w-3.5 mr-1.5" />}
            {testing ? "Testando..." : "Testar Conexão"}
          </Button>
        </CardContent>
      </Card>

      {/* Profiles List */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">Perfis de Robô</CardTitle>
            <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => { setAdding(true); setEditing(null); }}>
              <Plus className="h-3 w-3 mr-1" /> Novo
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="max-h-48">
            <div className="space-y-2">
              {profiles.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors ${
                    p.id === activeProfileId ? "border-primary bg-primary/5" : "border-border/50 hover:border-border"
                  }`}
                  onClick={() => setActiveProfile(p.id)}
                >
                  <div className="flex items-center gap-2">
                    <Server className="h-3.5 w-3.5 text-muted-foreground" />
                    <div>
                      <p className="text-xs font-medium">{p.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{p.ip}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {p.id === activeProfileId && <Badge className="text-[9px]">Ativo</Badge>}
                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); startEdit(p); }}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    {profiles.length > 1 && (
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); removeProfile(p.id); }}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Add/Edit Form */}
      {(adding || editing) && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">{editing ? "Editar Perfil" : "Novo Perfil"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div className="col-span-2">
                <label className="text-[10px] text-muted-foreground">Nome</label>
                <Input value={form.name ?? ""} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="AGV-01 Fábrica" className="text-xs h-8" />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] text-muted-foreground">IP do Robô</label>
                <Input value={form.ip ?? ""} onChange={(e) => setForm((f) => ({ ...f, ip: e.target.value }))} placeholder="192.168.1.100" className="text-xs h-8 font-mono" />
              </div>
              {(["rosbridgePort", "webrtcPort", "mqttPort", "noderedPort", "grafanaPort", "foxglovePort"] as const).map((field) => (
                <div key={field}>
                  <label className="text-[10px] text-muted-foreground">{field.replace("Port", "")}</label>
                  <Input type="number" value={form[field] ?? ""} onChange={(e) => setForm((f) => ({ ...f, [field]: parseInt(e.target.value) || 0 }))} className="text-xs h-8 font-mono" />
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button size="sm" className="flex-1" onClick={editing ? handleSaveEdit : handleAdd}>
                <Save className="h-3.5 w-3.5 mr-1" /> {editing ? "Salvar" : "Criar"}
              </Button>
              <Button size="sm" variant="outline" onClick={() => { setAdding(false); setEditing(null); }}>
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
