import { useState, useEffect } from "react";
import { SEO } from "@/components/SEO";
import { useOrionCore, type OrionCoreResponse } from "@/hooks/useOrionCore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Brain, Wifi, WifiOff, Bluetooth, Bot, Activity, RefreshCw,
  Send, Zap, Clock, Database, ChevronRight, Volume2,
  Terminal, Radio, Cpu, MemoryStick, Globe, MessageSquare,
} from "lucide-react";

function StatusDot({ online }: { online: boolean }) {
  return (
    <span className={`inline-block h-2.5 w-2.5 rounded-full ${online ? "bg-emerald-400 shadow-sm shadow-emerald-400/50 animate-pulse" : "bg-destructive/60"}`}
      style={{ animationDuration: "2s" }} />
  );
}

export default function OrionCoreDiagnostics() {
  const {
    status, integrations, memory, loading, lastResponse,
    sendCommand, fetchMemory, refreshAll,
  } = useOrionCore();

  const [commandInput, setCommandInput] = useState("");
  const [commandHistory, setCommandHistory] = useState<Array<{ cmd: string; res: OrionCoreResponse }>>([]);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { fetchMemory(); }, [fetchMemory]);

  const handleSendCommand = async () => {
    if (!commandInput.trim()) return;
    const res = await sendCommand(commandInput.trim());
    if (res) {
      setCommandHistory(prev => [{ cmd: commandInput.trim(), res }, ...prev].slice(0, 20));
    }
    setCommandInput("");
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  };

  const isOnline = status?.online ?? false;

  return (
    <div className="space-y-6">
      <SEO title="Orion Core V3 — Diagnóstico" description="Status e diagnóstico do cérebro central Orion" />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-serif text-foreground flex items-center gap-3">
            <Brain className="h-7 w-7 text-primary" />
            Orion Core V3
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Diagnóstico do cérebro central • brain.py
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing} className="gap-1.5">
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Atualizar
        </Button>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: "Core Status", value: isOnline ? "Online" : "Offline", icon: Cpu, active: isOnline },
          { label: "Versão", value: status?.version ?? "—", icon: Terminal, active: true },
          { label: "Uptime", value: status?.uptime_seconds ? `${Math.floor(status.uptime_seconds / 60)}m` : "—", icon: Clock, active: isOnline },
          { label: "Memória", value: `${status?.memory_entries ?? 0} entradas`, icon: Database, active: true },
        ].map(({ label, value, icon: Icon, active }) => (
          <Card key={label} className="border-border/40 bg-card/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`h-4 w-4 ${active ? "text-primary" : "text-muted-foreground"}`} />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
              </div>
              <div className="text-sm font-semibold text-foreground">{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Integration Status — MQTT / BLE / ROS2 / Google */}
      <Card className="border-border/40 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            Pontes de Integração
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* MQTT */}
            <div className="p-3 rounded-lg bg-muted/30 border border-border/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wifi className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold">MQTT (IoT)</span>
                </div>
                <StatusDot online={integrations?.mqtt?.connected ?? false} />
              </div>
              <div className="text-[10px] text-muted-foreground space-y-0.5">
                <div>Dispositivos: {integrations?.mqtt?.devices_count ?? 0}</div>
                {integrations?.mqtt?.broker && <div className="truncate">Broker: {integrations.mqtt.broker}</div>}
              </div>
            </div>

            {/* BLE */}
            <div className="p-3 rounded-lg bg-muted/30 border border-border/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bluetooth className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold">BLE</span>
                </div>
                <StatusDot online={integrations?.ble?.supported ?? false} />
              </div>
              <div className="text-[10px] text-muted-foreground space-y-0.5">
                <div>Pareados: {integrations?.ble?.paired_devices ?? 0}</div>
                <div>{integrations?.ble?.scanning ? "Escaneando..." : "Idle"}</div>
              </div>
            </div>

            {/* ROS2 */}
            <div className="p-3 rounded-lg bg-muted/30 border border-border/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bot className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold">ROS2</span>
                </div>
                <StatusDot online={integrations?.ros2?.connected ?? false} />
              </div>
              <div className="text-[10px] text-muted-foreground space-y-0.5">
                <div>Nós: {integrations?.ros2?.nodes?.length ?? 0}</div>
                <div>Status: {integrations?.ros2?.robot_status ?? "—"}</div>
              </div>
            </div>

            {/* Google Assistant */}
            <div className="p-3 rounded-lg bg-muted/30 border border-border/30 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold">Google Fallback</span>
                </div>
                <StatusDot online={integrations?.google_assistant?.available ?? false} />
              </div>
              <div className="text-[10px] text-muted-foreground space-y-0.5">
                <div>Fallbacks usados: {integrations?.google_assistant?.fallback_count ?? 0}</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Command Console */}
      <Card className="border-border/40 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Terminal className="h-4 w-4 text-primary" />
            Console de Comandos — Orion Core
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Digite um comando para o brain.py..."
              value={commandInput}
              onChange={e => setCommandInput(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSendCommand()}
              className="text-sm"
            />
            <Button onClick={handleSendCommand} disabled={loading || !commandInput.trim()} size="sm" className="gap-1.5 shrink-0">
              {loading ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              Enviar
            </Button>
          </div>

          {/* Command History with Google Structure */}
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {commandHistory.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-xs">
                <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-20" />
                Envie comandos para testar o Orion Core
              </div>
            ) : (
              commandHistory.map((entry, i) => (
                <div key={i} className="p-3 rounded-lg bg-muted/20 border border-border/30 space-y-2">
                  <div className="flex items-start gap-2">
                    <ChevronRight className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                    <span className="text-xs font-mono text-foreground">"{entry.cmd}"</span>
                  </div>
                  <div className="pl-5 text-xs text-muted-foreground">
                    {entry.res.response}
                  </div>
                  {entry.res.intent && (
                    <div className="pl-5">
                      <Badge variant="outline" className="text-[10px]">Intent: {entry.res.intent}</Badge>
                    </div>
                  )}
                  {entry.res.action && (
                    <div className="pl-5 flex items-center gap-2">
                      <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">
                        {entry.res.action}: {entry.res.platform ?? ""}
                      </Badge>
                      {entry.res.url && (
                        <a href={entry.res.url} target="_blank" rel="noopener noreferrer" className="text-[10px] text-primary underline truncate max-w-[200px]">
                          {entry.res.url}
                        </a>
                      )}
                    </div>
                  )}

                  {/* Google Structure Display */}
                  {entry.res.google_structure && (
                    <div className="pl-5 mt-2 p-2.5 rounded bg-accent/5 border border-accent/20 space-y-1.5">
                      <div className="text-[10px] font-semibold text-accent-foreground flex items-center gap-1">
                        <Globe className="h-3 w-3" /> Estrutura Google Assistant
                      </div>
                      {entry.res.google_structure.text_response && (
                        <div className="text-[10px] text-muted-foreground">
                          <span className="font-medium">Texto:</span> {entry.res.google_structure.text_response}
                        </div>
                      )}
                      {entry.res.google_structure.suggestions?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {entry.res.google_structure.suggestions.map((s, j) => (
                            <Badge key={j} variant="secondary" className="text-[9px]">{s}</Badge>
                          ))}
                        </div>
                      ) : null}
                      {entry.res.google_structure.action_data && (
                        <pre className="text-[9px] text-muted-foreground bg-muted/30 p-1.5 rounded overflow-x-auto max-h-24">
                          {JSON.stringify(entry.res.google_structure.action_data, null, 2)}
                        </pre>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Intent Patterns */}
      {status?.intent_patterns && Object.keys(status.intent_patterns).length > 0 && (
        <Card className="border-border/40 bg-card/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="h-4 w-4 text-primary" />
              Padrões de Intenção Registrados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(status.intent_patterns).map(([intent, pattern]) => (
                <div key={intent} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/20 text-xs">
                  <Badge variant="outline" className="text-[10px] font-mono">{intent}</Badge>
                  <span className="text-muted-foreground font-mono text-[10px] truncate ml-2 max-w-[200px]">{pattern}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Memory Sync */}
      <Card className="border-border/40 bg-card/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Database className="h-4 w-4 text-primary" />
            Memória do Orion Core
            <Badge variant="secondary" className="ml-auto text-[10px]">{memory.length} registros</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {memory.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-xs">
              <Database className="h-8 w-8 mx-auto mb-2 opacity-20" />
              Nenhuma interação na memória
            </div>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {memory.slice(0, 20).map((entry, i) => (
                <div key={i} className="p-2.5 rounded-lg bg-muted/20 border border-border/20 text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <Badge variant="outline" className="text-[9px]">{entry.intent}</Badge>
                    <span className="text-[10px] text-muted-foreground">{entry.timestamp}</span>
                  </div>
                  <div className="text-foreground font-medium">Q: {entry.query}</div>
                  <div className="text-muted-foreground truncate">A: {entry.response}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
