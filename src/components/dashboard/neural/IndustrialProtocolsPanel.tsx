import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Server, Cpu, Network, Zap, Activity, AlertTriangle,
  Play, Square, Settings, Database, Radio,
} from "lucide-react";
import {
  opcuaBridge, modbusBridge, profinetBridge, ethercatBridge,
} from "@/lib/neural/industrial-protocols";
import { toast } from "sonner";

// ─── OPC UA ───

function OPCUATab() {
  const endpoints = opcuaBridge.allEndpoints;
  const nodes = opcuaBridge.allNodes;
  const subs = opcuaBridge.allSubscriptions;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <Server className="h-4 w-4" /> OPC UA (IEC 62541)
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs">Endpoints</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {endpoints.map(ep => (
              <div key={ep.endpointUrl} className="flex items-center justify-between text-xs">
                <div>
                  <span className="font-mono">{ep.endpointUrl}</span>
                  <Badge variant="outline" className="text-[8px] ml-1">{ep.securityMode}</Badge>
                </div>
                <Button size="sm" variant="outline" className="h-6 text-[9px]" onClick={async () => {
                  await opcuaBridge.connect(ep.endpointUrl);
                  toast.success("Conectado ao OPC UA");
                }}>
                  <Play className="h-3 w-3" />
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs">Nós ({nodes.length})</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {nodes.map(n => (
              <div key={n.browseName} className="flex items-center justify-between text-[10px] border-b border-[hsl(var(--tron-neon)/0.2)] text-[hsl(var(--tron-neon))]/30 pb-1">
                <span className="font-mono">{n.displayName}</span>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-[8px]">{n.dataType}</Badge>
                  <span className="text-primary font-mono">{n.value != null ? String(n.value) : "–"}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── Modbus ───

function ModbusTab() {
  const devices = modbusBridge.allDevices;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <Database className="h-4 w-4" /> Modbus TCP (IEC 61158)
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {devices.map(d => (
          <Card key={d.unitId}>
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{d.name}</span>
                <Badge variant={d.connected ? "default" : "secondary"} className="text-[9px]">
                  {d.connected ? "ONLINE" : "OFFLINE"}
                </Badge>
              </div>
              <div className="text-[10px] text-muted-foreground font-mono">
                Unit: {d.unitId} • {d.host}:{d.port}
              </div>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" className="h-6 text-[9px] flex-1" onClick={async () => {
                  await modbusBridge.readHoldingRegisters(d.unitId, 0, 10);
                  toast.success(`Registros lidos: Unit ${d.unitId}`);
                }}>
                  Read Regs
                </Button>
                <Button size="sm" variant="outline" className="h-6 text-[9px] flex-1" onClick={async () => {
                  await modbusBridge.readCoils(d.unitId, 0, 8);
                  toast.success(`Coils lidos: Unit ${d.unitId}`);
                }}>
                  Read Coils
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── PROFINET ───

function PROFINETTab() {
  const devices = profinetBridge.allDevices;
  const alarms = profinetBridge.unacknowledgedAlarms;

  const stateColor: Record<string, string> = {
    RUNNING: "default", ONLINE: "secondary", OFFLINE: "outline", STOP: "destructive", FAULT: "destructive",
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <Network className="h-4 w-4" /> PROFINET (IEC 61158-6-10)
        {alarms.length > 0 && <Badge variant="destructive" className="text-[9px]">{alarms.length} alarmes</Badge>}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {devices.map(d => (
          <Card key={d.stationName}>
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">{d.stationName}</span>
                  <Badge variant="outline" className="text-[8px] ml-1">{d.deviceRole}</Badge>
                </div>
                <Badge variant={(stateColor[d.state] ?? "secondary") as any} className="text-[9px]">{d.state}</Badge>
              </div>
              <div className="text-[10px] text-muted-foreground font-mono">
                IP: {d.ipAddress} • MAC: {d.macAddress}
              </div>
              {d.modules.length > 0 && (
                <div className="space-y-1">
                  {d.modules.map((m, i) => (
                    <div key={i} className="flex items-center justify-between text-[10px]">
                      <span>Slot {m.slotNumber}: {m.moduleName}</span>
                      <Badge variant={m.diagState === "OK" ? "outline" : "destructive"} className="text-[8px]">{m.diagState}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── EtherCAT ───

function EtherCATTab() {
  const master = ethercatBridge.masterState;
  const slaves = ethercatBridge.allSlaves;

  const stateColor: Record<string, string> = {
    INIT: "secondary", "PRE-OP": "outline", "SAFE-OP": "default", OP: "default", ERROR: "destructive",
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <Zap className="h-4 w-4" /> EtherCAT (IEC 61158-3-12)
      </h3>
      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-xs">Master</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 text-center text-[10px]">
            <div><p className="font-bold">{master.state}</p><span className="text-muted-foreground">Estado</span></div>
            <div><p className="font-bold">{master.slaveCount}</p><span className="text-muted-foreground">Slaves</span></div>
            <div><p className="font-bold">{master.cycleTime}µs</p><span className="text-muted-foreground">Ciclo</span></div>
            <div><p className="font-bold">{master.txFrames}</p><span className="text-muted-foreground">TX</span></div>
            <div><p className="font-bold">{master.rxFrames}</p><span className="text-muted-foreground">RX</span></div>
            <div><p className="font-bold">{master.lostFrames}</p><span className="text-muted-foreground">Lost</span></div>
          </div>
          <div className="flex gap-1 mt-3">
            {(["INIT", "PRE-OP", "SAFE-OP", "OP"] as const).map(state => (
              <Button key={state} size="sm" variant="outline" className="h-6 text-[9px] flex-1" onClick={async () => {
                await ethercatBridge.transitionMaster(state);
                toast.success(`Master → ${state}`);
              }}>
                {state}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {slaves.map(s => (
          <Card key={s.position}>
            <CardContent className="pt-3 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">#{s.position} {s.name}</span>
                <Badge variant={(stateColor[s.state] ?? "secondary") as any} className="text-[9px]">{s.state}</Badge>
              </div>
              <div className="text-[9px] text-muted-foreground font-mono">
                Addr: 0x{s.stationAddress.toString(16)} • Vendor: 0x{s.vendorId.toString(16)} • DC: {s.dcSupported ? "✓" : "✗"}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Main ───

export default function IndustrialProtocolsPanel() {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="opcua">
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
          <TabsTrigger value="opcua" className="text-[11px] gap-1"><Server className="h-3 w-3" /> OPC UA</TabsTrigger>
          <TabsTrigger value="modbus" className="text-[11px] gap-1"><Database className="h-3 w-3" /> Modbus</TabsTrigger>
          <TabsTrigger value="profinet" className="text-[11px] gap-1"><Network className="h-3 w-3" /> PROFINET</TabsTrigger>
          <TabsTrigger value="ethercat" className="text-[11px] gap-1"><Zap className="h-3 w-3" /> EtherCAT</TabsTrigger>
        </TabsList>
        <TabsContent value="opcua"><OPCUATab /></TabsContent>
        <TabsContent value="modbus"><ModbusTab /></TabsContent>
        <TabsContent value="profinet"><PROFINETTab /></TabsContent>
        <TabsContent value="ethercat"><EtherCATTab /></TabsContent>
      </Tabs>
      <Card>
        <CardContent className="pt-3">
          <div className="flex flex-wrap gap-2">
            {["IEC 62541 (OPC UA)", "IEC 61158 (Modbus)", "IEC 61158-6-10 (PROFINET)", "IEC 61158-3-12 (EtherCAT)", "Industry 4.0", "Industry 5.0"].map(b => (
              <Badge key={b} variant="secondary" className="text-[10px]">{b}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
