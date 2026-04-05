import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Truck, Battery, MapPin, Play, Square, AlertTriangle,
  Navigation, Zap, Circle, RotateCcw, ChevronRight,
} from "lucide-react";
import { vda5050Bridge, type VDA5050AGVInfo } from "@/lib/neural/vda5050-protocol";
import { toast } from "sonner";

function AGVCard({ agv }: { agv: VDA5050AGVInfo }) {
  const connColor = agv.connection === "ONLINE" ? "default" : agv.connection === "OFFLINE" ? "secondary" : "destructive";
  const battery = agv.state?.batteryState;
  const pos = agv.state?.agvPosition;
  const mode = agv.state?.operatingMode ?? "N/A";
  const errors = agv.state?.errors ?? [];

  return (
    <Card>
      <CardContent className="pt-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-sm font-medium">{agv.name}</span>
            <div className="text-[10px] text-muted-foreground font-mono">
              {agv.manufacturer}/{agv.serialNumber}
            </div>
          </div>
          <div className="flex gap-1">
            <Badge variant={connColor as any} className="text-[9px]">{agv.connection}</Badge>
            <Badge variant="outline" className="text-[9px]">{mode}</Badge>
          </div>
        </div>

        {battery && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[10px]">
              <span className="flex items-center gap-1"><Battery className="h-3 w-3" /> Bateria</span>
              <span className="font-mono">{battery.batteryCharge.toFixed(0)}%{battery.charging ? " ⚡" : ""}</span>
            </div>
            <Progress value={battery.batteryCharge} className="h-1.5" />
          </div>
        )}

        {pos && (
          <div className="text-[10px] flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            <span className="font-mono">
              [{pos.x.toFixed(2)}, {pos.y.toFixed(2)}] θ={pos.theta.toFixed(1)}° • {pos.mapId}
            </span>
            {pos.positionInitialized ? (
              <Badge variant="outline" className="text-[8px]">Init</Badge>
            ) : (
              <Badge variant="destructive" className="text-[8px]">No Init</Badge>
            )}
          </div>
        )}

        {agv.state?.driving !== undefined && (
          <div className="flex items-center gap-2 text-[10px]">
            {agv.state.driving ? (
              <span className="flex items-center gap-1 text-primary"><Navigation className="h-3 w-3 animate-pulse" /> Movendo</span>
            ) : (
              <span className="flex items-center gap-1 text-muted-foreground"><Circle className="h-3 w-3" /> Parado</span>
            )}
            {agv.state.paused && <Badge variant="secondary" className="text-[8px]">PAUSADO</Badge>}
          </div>
        )}

        {errors.length > 0 && (
          <div className="space-y-1">
            {errors.slice(0, 3).map((e, i) => (
              <div key={i} className="flex items-center gap-1 text-[9px] text-destructive">
                <AlertTriangle className="h-3 w-3" />
                <Badge variant={e.errorLevel === "FATAL" ? "destructive" : "secondary"} className="text-[8px]">{e.errorLevel}</Badge>
                <span>{e.errorType}{e.errorDescription ? `: ${e.errorDescription}` : ""}</span>
              </div>
            ))}
          </div>
        )}

        {agv.state?.actionStates && agv.state.actionStates.length > 0 && (
          <div className="space-y-1">
            <span className="text-[10px] text-muted-foreground">Ações:</span>
            {agv.state.actionStates.slice(0, 4).map((a) => (
              <div key={a.actionId} className="flex items-center justify-between text-[9px]">
                <span className="font-mono">{a.actionId}</span>
                <Badge variant={a.actionStatus === "FINISHED" ? "default" : a.actionStatus === "FAILED" ? "destructive" : "secondary"} className="text-[8px]">
                  {a.actionStatus}
                </Badge>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-1">
          <Button size="sm" variant="outline" className="h-6 text-[9px] flex-1" onClick={async () => {
            await vda5050Bridge.sendOrder(agv.manufacturer, agv.serialNumber, {
              orderId: `order_${Date.now()}`, orderUpdateId: 0,
              nodes: [
                { nodeId: "node_start", sequenceId: 0, released: true, actions: [] },
                { nodeId: "node_end", sequenceId: 2, released: true, actions: [] },
              ],
              edges: [
                { edgeId: "edge_1", sequenceId: 1, released: true, startNodeId: "node_start", endNodeId: "node_end", actions: [] },
              ],
            });
            toast.success(`Ordem enviada para ${agv.name}`);
          }}>
            <Play className="h-3 w-3 mr-1" /> Order
          </Button>
          <Button size="sm" variant="outline" className="h-6 text-[9px]" onClick={async () => {
            await vda5050Bridge.cancelOrder(agv.manufacturer, agv.serialNumber);
            toast.info("Ordem cancelada");
          }}>
            <Square className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="outline" className="h-6 text-[9px]" onClick={async () => {
            await vda5050Bridge.sendInstantActions(agv.manufacturer, agv.serialNumber, [
              { actionId: `pick_${Date.now()}`, actionType: "pick", blockingType: "HARD",
                actionParameters: [{ key: "stationType", value: "floor" }] },
            ]);
            toast.success("Pick action enviada");
          }}>
            <Zap className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function VDA5050FleetPanel() {
  const agvs = vda5050Bridge.allAGVs;
  const orders = vda5050Bridge.allOrders;

  const online = agvs.filter(a => a.connection === "ONLINE").length;
  const driving = agvs.filter(a => a.state?.driving).length;
  const errors = agvs.reduce((sum, a) => sum + (a.state?.errors?.length ?? 0), 0);

  return (
    <div className="space-y-4">
      {/* Fleet Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total AGVs", value: agvs.length, icon: Truck },
          { label: "Online", value: online, icon: Circle },
          { label: "Em Movimento", value: driving, icon: Navigation },
          { label: "Erros", value: errors, icon: AlertTriangle },
        ].map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardContent className="pt-3 text-center">
              <Icon className="h-4 w-4 mx-auto mb-1 text-muted-foreground" />
              <p className="text-lg font-bold">{value}</p>
              <span className="text-[10px] text-muted-foreground">{label}</span>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AGV Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {agvs.map(agv => (
          <AGVCard key={`${agv.manufacturer}/${agv.serialNumber}`} agv={agv} />
        ))}
      </div>

      {/* Orders */}
      {orders.length > 0 && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs">Ordens Recentes</CardTitle></CardHeader>
          <CardContent>
            <ScrollArea className="h-24">
              {orders.map(o => (
                <div key={o.orderId} className="flex items-center justify-between text-[10px] border-b border-border/30 pb-1 mb-1">
                  <span className="font-mono">{o.orderId}</span>
                  <span className="text-muted-foreground">{o.nodes.length} nós • {o.edges.length} arestas</span>
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-3">
          <div className="flex flex-wrap gap-2">
            {["VDA 5050 v2.0", "MQTT 3.1.1/5.0", "AGV Fleet Management", "Industry 4.0"].map(b => (
              <Badge key={b} variant="secondary" className="text-[10px]">{b}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
