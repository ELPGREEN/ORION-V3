import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Play, Pause, Square, RotateCcw, GitBranch, Settings, Cpu,
  Activity, Zap, ChevronRight, Circle, Timer, Target,
} from "lucide-react";
import {
  ros2Actions, ros2Services, ros2Params, tf2Tree, ros2Lifecycle,
  type ActionServerEntry, type ServiceEntry, type ParameterEntry,
  type TF2Frame, type LifecycleNode, type LifecycleTransition,
} from "@/lib/neural/ros2-advanced-protocols";
import { toast } from "sonner";

// ─── Action Servers ───

function ActionServersTab() {
  const servers = ros2Actions.registeredServers;

  const handleSendGoal = async (serverName: string) => {
    const goalId = await ros2Actions.sendGoal(serverName, { target: "default" });
    toast.success(`Goal enviado: ${goalId}`);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <Target className="h-4 w-4" /> Action Servers ({servers.length})
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {servers.map(s => (
          <Card key={s.name}>
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium font-mono">{s.name}</span>
                <Badge variant={s.status === "idle" ? "secondary" : s.status === "processing" ? "default" : "destructive"} className="text-[9px]">
                  {s.status}
                </Badge>
              </div>
              <div className="text-[10px] text-muted-foreground">
                Tipo: {s.actionType} • Goals: {s.totalGoals} • Taxa: {(s.successRate * 100).toFixed(0)}%
              </div>
              {s.currentGoalId && (
                <div className="text-[10px] font-mono text-primary">⟳ {s.currentGoalId}</div>
              )}
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="h-7 text-[10px] flex-1" onClick={() => handleSendGoal(s.name)}>
                  <Play className="h-3 w-3 mr-1" /> Send Goal
                </Button>
                {s.currentGoalId && (
                  <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => {
                    ros2Actions.cancelGoal(s.name, s.currentGoalId!);
                    toast.info("Goal cancelado");
                  }}>
                    <Square className="h-3 w-3" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Services ───

function ServicesTab() {
  const services = ros2Services.registeredServices;

  const handleCall = async (name: string) => {
    const resp = await ros2Services.call(name, {});
    toast.success(`Service ${name}: ${resp.success ? "OK" : "Fail"}`);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <Zap className="h-4 w-4" /> Services ({services.length})
      </h3>
      {services.map(s => (
        <Card key={s.name}>
          <CardContent className="pt-3 flex items-center justify-between">
            <div>
              <span className="text-sm font-mono">{s.name}</span>
              <div className="text-[10px] text-muted-foreground">
                {s.serviceType} • Calls: {s.callCount} • Avg: {s.avgResponseMs.toFixed(0)}ms
              </div>
            </div>
            <Button size="sm" variant="outline" className="h-7 text-[10px]" onClick={() => handleCall(s.name)}>
              <Play className="h-3 w-3 mr-1" /> Call
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Parameters ───

function ParametersTab() {
  const params = ros2Params.allParameters;
  const grouped = useMemo(() => {
    const map = new Map<string, ParameterEntry[]>();
    params.forEach(p => {
      const arr = map.get(p.nodeId) ?? [];
      arr.push(p);
      map.set(p.nodeId, arr);
    });
    return map;
  }, [params]);

  const getDisplayValue = (p: ParameterEntry): string => {
    const v = p.value;
    if (v.bool_value !== undefined) return String(v.bool_value);
    if (v.double_value !== undefined) return String(v.double_value);
    if (v.integer_value !== undefined) return String(v.integer_value);
    if (v.string_value !== undefined) return v.string_value;
    return JSON.stringify(v);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <Settings className="h-4 w-4" /> Parameter Server
      </h3>
      {[...grouped.entries()].map(([nodeId, nodeParams]) => (
        <Card key={nodeId}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono">{nodeId}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {nodeParams.map(p => (
              <div key={p.descriptor.name} className="flex items-center justify-between text-xs border-b border-border/30 pb-1">
                <div>
                  <span className="font-mono">{p.descriptor.name}</span>
                  <span className="text-[10px] text-muted-foreground ml-2">({p.descriptor.type})</span>
                  {p.descriptor.read_only && <Badge variant="outline" className="text-[8px] ml-1">RO</Badge>}
                </div>
                <span className="font-mono text-primary">{getDisplayValue(p)}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── TF2 Tree ───

function TF2TreeTab() {
  const frames = tf2Tree.allFrames;
  const tree = tf2Tree.getTreeStructure();

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <GitBranch className="h-4 w-4" /> TF2 Transform Tree ({frames.length} frames)
      </h3>
      <Card>
        <CardContent className="pt-4">
          <div className="space-y-1 font-mono text-xs">
            {tree.map((node, i) => {
              const frame = tf2Tree.getFrame(node.frameId);
              const depth = (() => {
                let d = 0; let f = frame;
                while (f?.parentFrameId) { d++; f = tf2Tree.getFrame(f.parentFrameId); }
                return d;
              })();
              return (
                <div key={node.frameId} style={{ paddingLeft: `${depth * 20}px` }} className="flex items-center gap-1.5">
                  {node.children.length > 0 ? (
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <Circle className="h-2 w-2 text-primary" />
                  )}
                  <span className="text-primary font-medium">{node.frameId}</span>
                  {frame && (
                    <span className="text-[9px] text-muted-foreground">
                      [{frame.translation.x.toFixed(2)}, {frame.translation.y.toFixed(2)}, {frame.translation.z.toFixed(2)}]
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Lifecycle Nodes ───

function LifecycleTab() {
  const [nodes, setNodes] = useState(ros2Lifecycle.registeredNodes);

  const stateColors: Record<string, string> = {
    UNCONFIGURED: "secondary", INACTIVE: "outline", ACTIVE: "default", FINALIZED: "destructive",
  };

  const handleTransition = async (nodeId: string, transition: LifecycleTransition) => {
    const ok = await ros2Lifecycle.triggerTransition(nodeId, transition);
    if (ok) {
      setNodes(ros2Lifecycle.registeredNodes);
      toast.success(`${nodeId}: ${transition}`);
    } else {
      toast.error(`Transição inválida: ${transition}`);
    }
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <Activity className="h-4 w-4" /> Lifecycle Nodes ({nodes.length})
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {nodes.map(n => (
          <Card key={n.nodeId}>
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-mono">{n.nodeName}</span>
                  <span className="text-[10px] text-muted-foreground ml-1">{n.namespace}</span>
                </div>
                <Badge variant={(stateColors[n.state] ?? "secondary") as any} className="text-[9px]">{n.state}</Badge>
              </div>
              <div className="flex gap-1 flex-wrap">
                {n.availableTransitions.map(t => (
                  <Button key={t} size="sm" variant="outline" className="h-6 text-[9px]" onClick={() => handleTransition(n.nodeId, t)}>
                    {t}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Main Panel ───

export default function ROS2AdvancedPanel() {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="actions">
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
          <TabsTrigger value="actions" className="text-[11px] gap-1"><Target className="h-3 w-3" /> Actions</TabsTrigger>
          <TabsTrigger value="services" className="text-[11px] gap-1"><Zap className="h-3 w-3" /> Services</TabsTrigger>
          <TabsTrigger value="params" className="text-[11px] gap-1"><Settings className="h-3 w-3" /> Parameters</TabsTrigger>
          <TabsTrigger value="tf2" className="text-[11px] gap-1"><GitBranch className="h-3 w-3" /> TF2 Tree</TabsTrigger>
          <TabsTrigger value="lifecycle" className="text-[11px] gap-1"><Activity className="h-3 w-3" /> Lifecycle</TabsTrigger>
        </TabsList>
        <TabsContent value="actions"><ActionServersTab /></TabsContent>
        <TabsContent value="services"><ServicesTab /></TabsContent>
        <TabsContent value="params"><ParametersTab /></TabsContent>
        <TabsContent value="tf2"><TF2TreeTab /></TabsContent>
        <TabsContent value="lifecycle"><LifecycleTab /></TabsContent>
      </Tabs>
    </div>
  );
}
