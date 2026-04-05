import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Radio, Globe, Video, Server, Home, Wifi, Send,
  Eye, MessageSquare, Layers, Activity,
} from "lucide-react";
import {
  coapBridge, amqpBridge, webrtcBridge, grpcBridge, matterBridge,
} from "@/lib/neural/network-iot-protocols";
import { toast } from "sonner";

// ─── CoAP ───

function CoAPTab() {
  const endpoints = coapBridge.allEndpoints;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <Radio className="h-4 w-4" /> CoAP (RFC 7252)
      </h3>
      {endpoints.map(ep => (
        <Card key={`${ep.scheme}://${ep.host}:${ep.port}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono">{ep.scheme}://{ep.host}:{ep.port}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {ep.resources.map(r => (
              <div key={r.path} className="flex items-center justify-between text-xs border-b border-border/30 pb-1">
                <div>
                  <span className="font-mono text-primary">{r.path}</span>
                  {r.observable && <Badge variant="outline" className="text-[8px] ml-1">Observable</Badge>}
                  <span className="text-[9px] text-muted-foreground ml-1">{r.contentFormat}</span>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" className="h-6 text-[9px]" onClick={async () => {
                    await coapBridge.get(`${ep.scheme}://${ep.host}:${ep.port}`, r.path);
                    toast.success(`CoAP GET ${r.path}`);
                  }}>GET</Button>
                  {r.observable && (
                    <Button size="sm" variant="outline" className="h-6 text-[9px]" onClick={() => {
                      coapBridge.observe(`${ep.scheme}://${ep.host}:${ep.port}`, r.path, (v) => toast.info(`${r.path}: ${JSON.stringify(v)}`));
                      toast.success(`Observing ${r.path}`);
                    }}><Eye className="h-3 w-3" /></Button>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── AMQP ───

function AMQPTab() {
  const conn = amqpBridge.connectionState;
  const exchanges = amqpBridge.allExchanges;
  const queues = amqpBridge.allQueues;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <MessageSquare className="h-4 w-4" /> AMQP 0-9-1
      </h3>
      <Card>
        <CardContent className="pt-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-[10px]">
            <div><p className="font-bold font-mono">{conn.host}:{conn.port}</p><span className="text-muted-foreground">Broker</span></div>
            <div><p className="font-bold">{conn.publishedCount}</p><span className="text-muted-foreground">Published</span></div>
            <div><p className="font-bold">{conn.consumedCount}</p><span className="text-muted-foreground">Consumed</span></div>
            <div><p className="font-bold">{conn.vhost}</p><span className="text-muted-foreground">VHost</span></div>
          </div>
        </CardContent>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs">Exchanges ({exchanges.length})</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {exchanges.map(e => (
              <div key={e.name} className="flex items-center justify-between text-[10px]">
                <span className="font-mono">{e.name}</span>
                <div className="flex gap-1">
                  <Badge variant="outline" className="text-[8px]">{e.type}</Badge>
                  <span className="text-muted-foreground">{e.messageCount} msgs</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs">Queues ({queues.length})</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            {queues.map(q => (
              <div key={q.name} className="text-[10px] border-b border-border/30 pb-1">
                <div className="flex items-center justify-between">
                  <span className="font-mono">{q.name}</span>
                  <span className="text-muted-foreground">{q.messageCount} msgs • {q.consumerCount} consumers</span>
                </div>
                {q.bindings.map((b, i) => (
                  <div key={i} className="text-[9px] text-muted-foreground ml-2">
                    ← {b.exchange} [{b.routingKey}]
                  </div>
                ))}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// ─── WebRTC ───

function WebRTCTab() {
  const peers = webrtcBridge.allPeers;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <Video className="h-4 w-4" /> WebRTC DataChannel
      </h3>
      <Button size="sm" variant="outline" className="text-[10px]" onClick={() => {
        const id = `peer_${Date.now()}`;
        const peer = webrtcBridge.createPeer(id, "New Peer");
        webrtcBridge.createChannel(id, "control", true);
        webrtcBridge.createChannel(id, "telemetry", false);
        toast.success(`Peer criado: ${id}`);
      }}>
        Criar Peer
      </Button>
      {peers.map(p => (
        <Card key={p.peerId}>
          <CardContent className="pt-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono">{p.peerName}</span>
              <Badge variant={p.connectionState === "connected" ? "default" : "secondary"} className="text-[9px]">
                {p.connectionState}
              </Badge>
            </div>
            {p.channels.map(ch => (
              <div key={ch.label} className="flex items-center justify-between text-[10px]">
                <span className="font-mono">{ch.label}</span>
                <span className="text-muted-foreground">
                  ↑{ch.messagesSent} ↓{ch.messagesReceived} • {(ch.bytesSent / 1024).toFixed(1)}KB
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── gRPC-Web ───

function GRPCTab() {
  const services = grpcBridge.allServices;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <Server className="h-4 w-4" /> gRPC-Web
      </h3>
      {services.map(svc => (
        <Card key={`${svc.packageName}.${svc.serviceName}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-mono">{svc.packageName}.{svc.serviceName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-[10px] text-muted-foreground mb-2">{svc.endpointUrl}</div>
            {svc.methods.map(m => (
              <div key={m.name} className="flex items-center justify-between text-[10px] border-b border-border/30 pb-1">
                <div>
                  <span className="font-mono">{m.name}</span>
                  <Badge variant="outline" className="text-[8px] ml-1">{m.type}</Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">{m.callCount} calls • {m.avgLatencyMs.toFixed(0)}ms</span>
                  <Button size="sm" variant="outline" className="h-5 text-[9px]" onClick={async () => {
                    await grpcBridge.callUnary(`${svc.packageName}.${svc.serviceName}`, m.name, {});
                    toast.success(`gRPC ${m.name}: OK`);
                  }}>
                    <Send className="h-2.5 w-2.5" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Matter/Thread ───

function MatterTab() {
  const devices = matterBridge.allDevices;
  const network = matterBridge.threadNetwork;

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium flex items-center gap-2">
        <Home className="h-4 w-4" /> Matter / Thread (CSA)
      </h3>
      {network && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs">Thread Network</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px]">
              <div><span className="text-muted-foreground">Nome:</span> <span className="font-mono">{network.networkName}</span></div>
              <div><span className="text-muted-foreground">Canal:</span> {network.channel}</div>
              <div><span className="text-muted-foreground">Routers:</span> {network.routerCount}</div>
              <div><span className="text-muted-foreground">End Devices:</span> {network.endDeviceCount}</div>
            </div>
          </CardContent>
        </Card>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {devices.map(d => (
          <Card key={d.nodeId}>
            <CardContent className="pt-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium">{d.productName}</span>
                  <span className="text-[10px] text-muted-foreground ml-1">({d.vendorName})</span>
                </div>
                <Badge variant={d.online ? "default" : "secondary"} className="text-[9px]">
                  {d.online ? "Online" : "Offline"}
                </Badge>
              </div>
              <Badge variant="outline" className="text-[9px]">{d.deviceType}</Badge>
              {d.clusters.map(c => (
                <div key={c.clusterId} className="text-[10px]">
                  <span className="font-mono text-primary">{c.clusterName}</span>
                  {c.attributes.map(a => (
                    <div key={a.id} className="flex items-center justify-between ml-2 text-[9px]">
                      <span>{a.name}</span>
                      <span className="font-mono">{String(a.value)}</span>
                    </div>
                  ))}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Main ───

export default function NetworkIoTPanel() {
  return (
    <div className="space-y-4">
      <Tabs defaultValue="coap">
        <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
          <TabsTrigger value="coap" className="text-[11px] gap-1"><Radio className="h-3 w-3" /> CoAP</TabsTrigger>
          <TabsTrigger value="amqp" className="text-[11px] gap-1"><MessageSquare className="h-3 w-3" /> AMQP</TabsTrigger>
          <TabsTrigger value="webrtc" className="text-[11px] gap-1"><Video className="h-3 w-3" /> WebRTC</TabsTrigger>
          <TabsTrigger value="grpc" className="text-[11px] gap-1"><Server className="h-3 w-3" /> gRPC</TabsTrigger>
          <TabsTrigger value="matter" className="text-[11px] gap-1"><Home className="h-3 w-3" /> Matter</TabsTrigger>
        </TabsList>
        <TabsContent value="coap"><CoAPTab /></TabsContent>
        <TabsContent value="amqp"><AMQPTab /></TabsContent>
        <TabsContent value="webrtc"><WebRTCTab /></TabsContent>
        <TabsContent value="grpc"><GRPCTab /></TabsContent>
        <TabsContent value="matter"><MatterTab /></TabsContent>
      </Tabs>
      <Card>
        <CardContent className="pt-3">
          <div className="flex flex-wrap gap-2">
            {["RFC 7252 (CoAP)", "AMQP 0-9-1", "WebRTC DataChannel", "gRPC-Web", "Matter 1.0", "Thread 1.3"].map(b => (
              <Badge key={b} variant="secondary" className="text-[10px]">{b}</Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
