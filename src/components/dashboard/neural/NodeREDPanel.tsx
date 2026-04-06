/**
 * Node-RED Integration Panel — Visual automation flows for IoT/PLC
 * Embeds Node-RED editor via iframe + provides REST API integration
 */
import { useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Workflow, Play, Pause, RefreshCw, ExternalLink, Loader2, Check, X } from "lucide-react";
import { toast } from "sonner";

interface NodeREDFlow {
  id: string;
  label: string;
  disabled: boolean;
  nodes: number;
}

export default function NodeREDPanel() {
  const [nodeRedUrl, setNodeRedUrl] = useState("http://localhost:1880");
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [flows, setFlows] = useState<NodeREDFlow[]>([]);
  const [embedded, setEmbedded] = useState(false);

  const fetchFlows = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${nodeRedUrl}/flows`, {
        headers: { "Accept": "application/json" },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const tabs = (data as any[]).filter((n) => n.type === "tab");
      const allNodes = (data as any[]).filter((n) => n.type !== "tab");

      const mapped: NodeREDFlow[] = tabs.map((tab) => ({
        id: tab.id,
        label: tab.label || "Unnamed",
        disabled: tab.disabled ?? false,
        nodes: allNodes.filter((n) => n.z === tab.id).length,
      }));

      setFlows(mapped);
      setConnected(true);
      toast.success(`Node-RED: ${mapped.length} flows encontrados`);
    } catch (err: any) {
      console.error("[Node-RED]", err);
      toast.error(`Falha ao conectar: ${err.message}`);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  }, [nodeRedUrl]);

  const toggleFlow = useCallback(async (flowId: string, disable: boolean) => {
    try {
      const res = await fetch(`${nodeRedUrl}/flow/${flowId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ disabled: disable }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setFlows((prev) => prev.map((f) => (f.id === flowId ? { ...f, disabled: disable } : f)));
      toast.success(`Flow ${disable ? "pausado" : "ativado"}`);
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    }
  }, [nodeRedUrl]);

  const deployFlows = useCallback(async () => {
    try {
      const res = await fetch(`${nodeRedUrl}/flows`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Node-RED-Deployment-Type": "reload" },
        body: JSON.stringify([]),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      toast.success("Deploy realizado com sucesso");
    } catch (err: any) {
      toast.error(`Deploy falhou: ${err.message}`);
    }
  }, [nodeRedUrl]);

  return (
    <div className="space-y-4">
      {/* Connection */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Workflow className="h-4 w-4" />
            Node-RED — Automação Visual
            {connected && <Badge variant="default" className="ml-auto text-[10px]">Conectado</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              value={nodeRedUrl}
              onChange={(e) => setNodeRedUrl(e.target.value)}
              placeholder="http://robot:1880"
              className="text-xs font-mono"
            />
            <Button size="sm" onClick={fetchFlows} disabled={loading}>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEmbedded(!embedded)}>
              <ExternalLink className="h-3.5 w-3.5" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Embedded Editor */}
      {embedded && (
        <Card>
          <CardContent className="p-0">
            <iframe
              src={nodeRedUrl}
              className="w-full h-[500px] rounded-lg border-0"
              title="Node-RED Editor"
              sandbox="allow-same-origin allow-scripts allow-forms"
            />
          </CardContent>
        </Card>
      )}

      {/* Flows List */}
      {connected && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Flows ({flows.length})</CardTitle>
              <Button size="sm" variant="outline" onClick={deployFlows} className="h-7 text-[10px]">
                <Play className="h-3 w-3 mr-1" /> Deploy
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {flows.map((flow) => (
                  <div key={flow.id} className="flex items-center justify-between p-2 rounded-lg border border-border/50">
                    <div className="flex items-center gap-2">
                      {flow.disabled ? (
                        <X className="h-3.5 w-3.5 text-muted-foreground" />
                      ) : (
                        <Check className="h-3.5 w-3.5 text-green-500" />
                      )}
                      <div>
                        <p className="text-xs font-medium">{flow.label}</p>
                        <p className="text-[10px] text-muted-foreground">{flow.nodes} nodes</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[10px]"
                      onClick={() => toggleFlow(flow.id, !flow.disabled)}
                    >
                      {flow.disabled ? <Play className="h-3 w-3" /> : <Pause className="h-3 w-3" />}
                    </Button>
                  </div>
                ))}
                {flows.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-4">Nenhum flow encontrado</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      {!connected && (
        <Card>
          <CardContent className="py-6 text-center text-xs text-muted-foreground space-y-2">
            <Workflow className="h-8 w-8 mx-auto opacity-30" />
            <p>Instale Node-RED no robô ou servidor edge:</p>
            <code className="block bg-muted p-2 rounded font-mono text-[10px]">
              npm install -g node-red && node-red -p 1880
            </code>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
