/**
 * ─── Network & IoT Protocols ───
 * CoAP, AMQP, WebRTC DataChannel, gRPC-Web, Matter/Thread
 * Communication protocol bridges for diverse IoT ecosystems
 */

import { iotBridge } from "./iot-device-bridge";

// ═══════════════════════════════════════════════
// §1 — CoAP (RFC 7252)
// ═══════════════════════════════════════════════

export type CoAPMethod = "GET" | "POST" | "PUT" | "DELETE" | "FETCH" | "PATCH" | "iPATCH";
export type CoAPType = "CON" | "NON" | "ACK" | "RST";

export interface CoAPOption {
  number: number;
  name: string;
  value: string | number | Uint8Array;
}

export interface CoAPMessage {
  version: 1;
  type: CoAPType;
  code: string; // e.g. "2.05", "4.04"
  messageId: number;
  token: string;
  options: CoAPOption[];
  payload?: unknown;
}

export interface CoAPResource {
  path: string;
  resourceType?: string;
  interfaceDescription?: string;
  contentFormat: "text/plain" | "application/json" | "application/cbor" | "application/link-format";
  observable: boolean;
  maxAge?: number;
  lastValue?: unknown;
  lastUpdated: number;
}

export interface CoAPEndpoint {
  host: string;
  port: number;
  scheme: "coap" | "coaps";
  resources: CoAPResource[];
  connected: boolean;
}

export class CoAPBridge {
  private endpoints = new Map<string, CoAPEndpoint>();
  private msgCounter = 0;
  private observers = new Map<string, Array<(value: unknown) => void>>();

  registerEndpoint(host: string, port = 5683, scheme: "coap" | "coaps" = "coap"): void {
    this.endpoints.set(`${scheme}://${host}:${port}`, {
      host, port, scheme, resources: [], connected: false,
    });
  }

  get allEndpoints(): CoAPEndpoint[] { return [...this.endpoints.values()]; }

  addResource(endpointKey: string, resource: CoAPResource): void {
    const ep = this.endpoints.get(endpointKey);
    if (ep) ep.resources.push(resource);
  }

  async get(endpointKey: string, path: string): Promise<CoAPMessage> {
    const msg: CoAPMessage = {
      version: 1, type: "CON", code: "0.01", messageId: ++this.msgCounter,
      token: `tok_${this.msgCounter}`, options: [{ number: 11, name: "Uri-Path", value: path }],
    };
    await iotBridge.publish(`coap/request`, { endpoint: endpointKey, ...msg }, 1);
    return { ...msg, code: "2.05", type: "ACK" };
  }

  async put(endpointKey: string, path: string, payload: unknown): Promise<CoAPMessage> {
    const msg: CoAPMessage = {
      version: 1, type: "CON", code: "0.03", messageId: ++this.msgCounter,
      token: `tok_${this.msgCounter}`, options: [{ number: 11, name: "Uri-Path", value: path }], payload,
    };
    await iotBridge.publish(`coap/request`, { endpoint: endpointKey, ...msg }, 1);
    return { ...msg, code: "2.04", type: "ACK" };
  }

  observe(endpointKey: string, path: string, cb: (value: unknown) => void): () => void {
    const key = `${endpointKey}/${path}`;
    const cbs = this.observers.get(key) ?? [];
    cbs.push(cb);
    this.observers.set(key, cbs);
    return () => {
      const arr = this.observers.get(key) ?? [];
      this.observers.set(key, arr.filter(c => c !== cb));
    };
  }

  processNotification(endpointKey: string, path: string, value: unknown): void {
    const key = `${endpointKey}/${path}`;
    const ep = this.endpoints.get(endpointKey);
    if (ep) {
      const res = ep.resources.find(r => r.path === path);
      if (res) { res.lastValue = value; res.lastUpdated = Date.now(); }
    }
    const cbs = this.observers.get(key) ?? [];
    cbs.forEach(cb => { try { cb(value); } catch { /* */ } });
  }
}

// ═══════════════════════════════════════════════
// §2 — AMQP 0-9-1 (RabbitMQ compatible)
// ═══════════════════════════════════════════════

export type AMQPExchangeType = "direct" | "fanout" | "topic" | "headers";

export interface AMQPExchange {
  name: string;
  type: AMQPExchangeType;
  durable: boolean;
  autoDelete: boolean;
  messageCount: number;
}

export interface AMQPQueue {
  name: string;
  durable: boolean;
  exclusive: boolean;
  autoDelete: boolean;
  messageCount: number;
  consumerCount: number;
  bindings: Array<{ exchange: string; routingKey: string }>;
}

export interface AMQPMessage {
  exchange: string;
  routingKey: string;
  body: unknown;
  properties: {
    contentType?: string;
    contentEncoding?: string;
    deliveryMode?: 1 | 2;
    priority?: number;
    correlationId?: string;
    replyTo?: string;
    expiration?: string;
    messageId?: string;
    timestamp?: number;
    type?: string;
    appId?: string;
    headers?: Record<string, string | number | boolean>;
  };
}

export interface AMQPConnection {
  host: string;
  port: number;
  vhost: string;
  connected: boolean;
  channelCount: number;
  publishedCount: number;
  consumedCount: number;
}

type AMQPConsumerCb = (msg: AMQPMessage) => void;

export class AMQPBridge {
  private connection: AMQPConnection = {
    host: "localhost", port: 5672, vhost: "/", connected: false,
    channelCount: 0, publishedCount: 0, consumedCount: 0,
  };
  private exchanges = new Map<string, AMQPExchange>();
  private queues = new Map<string, AMQPQueue>();
  private consumers = new Map<string, AMQPConsumerCb[]>();

  configure(host: string, port = 5672, vhost = "/"): void {
    this.connection = { host, port, vhost, connected: false, channelCount: 0, publishedCount: 0, consumedCount: 0 };
  }

  get connectionState(): AMQPConnection { return { ...this.connection }; }
  get allExchanges(): AMQPExchange[] { return [...this.exchanges.values()]; }
  get allQueues(): AMQPQueue[] { return [...this.queues.values()]; }

  declareExchange(name: string, type: AMQPExchangeType, durable = true): void {
    this.exchanges.set(name, { name, type, durable, autoDelete: false, messageCount: 0 });
  }

  declareQueue(name: string, durable = true): void {
    this.queues.set(name, { name, durable, exclusive: false, autoDelete: false, messageCount: 0, consumerCount: 0, bindings: [] });
  }

  bindQueue(queueName: string, exchangeName: string, routingKey: string): void {
    const q = this.queues.get(queueName);
    if (q) q.bindings.push({ exchange: exchangeName, routingKey });
  }

  async publish(exchange: string, routingKey: string, body: unknown, deliveryMode: 1 | 2 = 2): Promise<boolean> {
    const msg: AMQPMessage = {
      exchange, routingKey, body,
      properties: { deliveryMode, timestamp: Date.now(), messageId: `amqp_${Date.now()}` },
    };
    this.connection.publishedCount++;
    const ex = this.exchanges.get(exchange);
    if (ex) ex.messageCount++;
    return iotBridge.publish(`amqp/publish`, msg, 1);
  }

  consume(queueName: string, cb: AMQPConsumerCb): () => void {
    const cbs = this.consumers.get(queueName) ?? [];
    cbs.push(cb);
    this.consumers.set(queueName, cbs);
    const q = this.queues.get(queueName);
    if (q) q.consumerCount++;
    return () => {
      const arr = this.consumers.get(queueName) ?? [];
      this.consumers.set(queueName, arr.filter(c => c !== cb));
      if (q) q.consumerCount = Math.max(0, q.consumerCount - 1);
    };
  }

  processDelivery(queueName: string, msg: AMQPMessage): void {
    this.connection.consumedCount++;
    const q = this.queues.get(queueName);
    if (q) q.messageCount = Math.max(0, q.messageCount - 1);
    const cbs = this.consumers.get(queueName) ?? [];
    cbs.forEach(cb => { try { cb(msg); } catch { /* */ } });
  }
}

// ═══════════════════════════════════════════════
// §3 — WebRTC DataChannel
// ═══════════════════════════════════════════════

export type WebRTCChannelState = "connecting" | "open" | "closing" | "closed";

export interface WebRTCDataChannel {
  label: string;
  id: number;
  ordered: boolean;
  maxRetransmits?: number;
  maxPacketLifeTime?: number;
  protocol: string;
  state: WebRTCChannelState;
  bufferedAmount: number;
  messagesSent: number;
  messagesReceived: number;
  bytesSent: number;
  bytesReceived: number;
}

export interface WebRTCPeerConnection {
  peerId: string;
  peerName: string;
  connectionState: "new" | "connecting" | "connected" | "disconnected" | "failed" | "closed";
  iceConnectionState: string;
  signalingState: string;
  channels: WebRTCDataChannel[];
  localCandidates: number;
  remoteCandidates: number;
  createdAt: number;
}

type WebRTCMessageCb = (peerId: string, channelLabel: string, data: unknown) => void;

export class WebRTCDataBridge {
  private peers = new Map<string, WebRTCPeerConnection>();
  private messageCallbacks: WebRTCMessageCb[] = [];

  createPeer(peerId: string, peerName: string): WebRTCPeerConnection {
    const peer: WebRTCPeerConnection = {
      peerId, peerName, connectionState: "new", iceConnectionState: "new",
      signalingState: "stable", channels: [], localCandidates: 0, remoteCandidates: 0,
      createdAt: Date.now(),
    };
    this.peers.set(peerId, peer);
    return peer;
  }

  get allPeers(): WebRTCPeerConnection[] { return [...this.peers.values()]; }

  createChannel(peerId: string, label: string, ordered = true): WebRTCDataChannel | null {
    const peer = this.peers.get(peerId);
    if (!peer) return null;
    const channel: WebRTCDataChannel = {
      label, id: peer.channels.length, ordered, protocol: "orion-data",
      state: "connecting", bufferedAmount: 0, messagesSent: 0, messagesReceived: 0,
      bytesSent: 0, bytesReceived: 0,
    };
    peer.channels.push(channel);
    return channel;
  }

  async send(peerId: string, channelLabel: string, data: unknown): Promise<boolean> {
    const peer = this.peers.get(peerId);
    const ch = peer?.channels.find(c => c.label === channelLabel);
    if (!ch || ch.state !== "open") return false;
    const size = JSON.stringify(data).length;
    ch.messagesSent++;
    ch.bytesSent += size;
    return iotBridge.publish(`webrtc/${peerId}/${channelLabel}`, data, 0);
  }

  onMessage(cb: WebRTCMessageCb): () => void {
    this.messageCallbacks.push(cb);
    return () => { this.messageCallbacks = this.messageCallbacks.filter(c => c !== cb); };
  }

  processMessage(peerId: string, channelLabel: string, data: unknown): void {
    const peer = this.peers.get(peerId);
    const ch = peer?.channels.find(c => c.label === channelLabel);
    if (ch) {
      ch.messagesReceived++;
      ch.bytesReceived += JSON.stringify(data).length;
    }
    this.messageCallbacks.forEach(cb => { try { cb(peerId, channelLabel, data); } catch { /* */ } });
  }
}

// ═══════════════════════════════════════════════
// §4 — gRPC-Web
// ═══════════════════════════════════════════════

export type GRPCMethodType = "unary" | "server_streaming" | "client_streaming" | "bidi_streaming";

export interface GRPCService {
  serviceName: string;
  packageName: string;
  methods: GRPCMethod[];
  endpointUrl: string;
  connected: boolean;
}

export interface GRPCMethod {
  name: string;
  type: GRPCMethodType;
  requestType: string;
  responseType: string;
  callCount: number;
  avgLatencyMs: number;
  errorCount: number;
}

export interface GRPCCallResult {
  method: string;
  status: { code: number; message: string };
  metadata: Record<string, string>;
  response: unknown;
  durationMs: number;
}

export class GRPCWebBridge {
  private services = new Map<string, GRPCService>();

  registerService(packageName: string, serviceName: string, endpointUrl: string): void {
    this.services.set(`${packageName}.${serviceName}`, {
      serviceName, packageName, methods: [], endpointUrl, connected: false,
    });
  }

  get allServices(): GRPCService[] { return [...this.services.values()]; }

  addMethod(serviceKey: string, name: string, type: GRPCMethodType, requestType: string, responseType: string): void {
    const svc = this.services.get(serviceKey);
    if (svc) {
      svc.methods.push({ name, type, requestType, responseType, callCount: 0, avgLatencyMs: 0, errorCount: 0 });
    }
  }

  async callUnary(serviceKey: string, methodName: string, request: unknown): Promise<GRPCCallResult> {
    const svc = this.services.get(serviceKey);
    const method = svc?.methods.find(m => m.name === methodName);
    const start = performance.now();

    await iotBridge.publish(`grpc/${serviceKey}/${methodName}`, request, 1);

    const duration = performance.now() - start;
    if (method) {
      method.callCount++;
      method.avgLatencyMs = (method.avgLatencyMs * (method.callCount - 1) + duration) / method.callCount;
    }

    return {
      method: methodName,
      status: { code: 0, message: "OK" },
      metadata: { "content-type": "application/grpc-web+proto" },
      response: {},
      durationMs: duration,
    };
  }
}

// ═══════════════════════════════════════════════
// §5 — Matter/Thread (CSA)
// ═══════════════════════════════════════════════

export type MatterDeviceType =
  | "on_off_light" | "dimmable_light" | "color_temperature_light" | "extended_color_light"
  | "on_off_plug" | "dimmable_plug"
  | "contact_sensor" | "occupancy_sensor" | "temperature_sensor" | "humidity_sensor" | "light_sensor"
  | "door_lock" | "window_covering"
  | "thermostat" | "fan"
  | "generic_switch" | "aggregator";

export interface MatterCluster {
  clusterId: number;
  clusterName: string;
  attributes: Array<{ id: number; name: string; value: unknown; writable: boolean }>;
  commands: Array<{ id: number; name: string; direction: "client_to_server" | "server_to_client" }>;
}

export interface MatterDevice {
  nodeId: number;
  endpointId: number;
  deviceType: MatterDeviceType;
  vendorName: string;
  productName: string;
  fabricId: string;
  clusters: MatterCluster[];
  online: boolean;
  lastSeen: number;
  threadNetworkName?: string;
  ipv6Address?: string;
}

export interface ThreadNetworkInfo {
  networkName: string;
  extendedPanId: string;
  channel: number;
  panId: number;
  meshLocalPrefix: string;
  borderRouterCount: number;
  routerCount: number;
  endDeviceCount: number;
  partitionId: number;
}

export class MatterThreadBridge {
  private devices = new Map<number, MatterDevice>();
  private network: ThreadNetworkInfo | null = null;

  configureThread(info: ThreadNetworkInfo): void { this.network = info; }
  get threadNetwork(): ThreadNetworkInfo | null { return this.network; }
  get allDevices(): MatterDevice[] { return [...this.devices.values()]; }

  registerDevice(device: Omit<MatterDevice, "lastSeen">): void {
    this.devices.set(device.nodeId, { ...device, lastSeen: Date.now() });
  }

  async sendCommand(nodeId: number, endpointId: number, clusterId: number, commandId: number, payload?: unknown): Promise<boolean> {
    const dev = this.devices.get(nodeId);
    if (!dev) return false;
    await iotBridge.publish(`matter/command`, { nodeId, endpointId, clusterId, commandId, payload }, 1);
    dev.lastSeen = Date.now();
    return true;
  }

  async writeAttribute(nodeId: number, endpointId: number, clusterId: number, attributeId: number, value: unknown): Promise<boolean> {
    const dev = this.devices.get(nodeId);
    if (!dev) return false;
    const cluster = dev.clusters.find(c => c.clusterId === clusterId);
    const attr = cluster?.attributes.find(a => a.id === attributeId);
    if (attr && attr.writable) attr.value = value;
    return iotBridge.publish(`matter/write`, { nodeId, endpointId, clusterId, attributeId, value }, 1);
  }

  readAttribute(nodeId: number, clusterId: number, attributeId: number): unknown {
    const dev = this.devices.get(nodeId);
    const cluster = dev?.clusters.find(c => c.clusterId === clusterId);
    return cluster?.attributes.find(a => a.id === attributeId)?.value;
  }

  processReport(nodeId: number, clusterId: number, attributeId: number, value: unknown): void {
    const dev = this.devices.get(nodeId);
    if (!dev) return;
    const cluster = dev.clusters.find(c => c.clusterId === clusterId);
    const attr = cluster?.attributes.find(a => a.id === attributeId);
    if (attr) attr.value = value;
    dev.lastSeen = Date.now();
    dev.online = true;
  }
}

// ═══════════════════════════════════════════════
// SINGLETONS
// ═══════════════════════════════════════════════

export const coapBridge = new CoAPBridge();
export const amqpBridge = new AMQPBridge();
export const webrtcBridge = new WebRTCDataBridge();
export const grpcBridge = new GRPCWebBridge();
export const matterBridge = new MatterThreadBridge();

// ─── Defaults ───

coapBridge.registerEndpoint("coap-sensor-hub.local");
coapBridge.addResource("coap://coap-sensor-hub.local:5683", {
  path: "/temperature", resourceType: "core.s.temp", contentFormat: "application/json",
  observable: true, maxAge: 60, lastUpdated: Date.now(),
});
coapBridge.addResource("coap://coap-sensor-hub.local:5683", {
  path: "/humidity", resourceType: "core.s.hum", contentFormat: "application/json",
  observable: true, maxAge: 60, lastUpdated: Date.now(),
});
coapBridge.addResource("coap://coap-sensor-hub.local:5683", {
  path: "/light", resourceType: "core.a.light", contentFormat: "application/json",
  observable: false, lastUpdated: Date.now(),
});

amqpBridge.configure("rabbitmq.orion.local");
amqpBridge.declareExchange("orion.events", "topic");
amqpBridge.declareExchange("orion.commands", "direct");
amqpBridge.declareQueue("telemetry");
amqpBridge.declareQueue("alerts");
amqpBridge.bindQueue("telemetry", "orion.events", "sensor.#");
amqpBridge.bindQueue("alerts", "orion.events", "alert.*");

grpcBridge.registerService("orion.robotics", "NavigationService", "https://grpc.orion.local:8443");
grpcBridge.addMethod("orion.robotics.NavigationService", "Navigate", "unary", "NavigateRequest", "NavigateResponse");
grpcBridge.addMethod("orion.robotics.NavigationService", "StreamPosition", "server_streaming", "PositionRequest", "Position");
grpcBridge.registerService("orion.ai", "InferenceService", "https://grpc.orion.local:8443");
grpcBridge.addMethod("orion.ai.InferenceService", "Predict", "unary", "PredictRequest", "PredictResponse");
grpcBridge.addMethod("orion.ai.InferenceService", "StreamInference", "bidi_streaming", "InferenceChunk", "InferenceResult");

matterBridge.configureThread({
  networkName: "OrionThread", extendedPanId: "DEAD00BEEF00CAFE",
  channel: 15, panId: 0x1234, meshLocalPrefix: "fd00:db8::/64",
  borderRouterCount: 1, routerCount: 3, endDeviceCount: 8, partitionId: 1,
});
matterBridge.registerDevice({
  nodeId: 1, endpointId: 1, deviceType: "dimmable_light", vendorName: "Orion",
  productName: "Smart Bulb", fabricId: "fabric_orion_01", online: true,
  threadNetworkName: "OrionThread", clusters: [
    { clusterId: 6, clusterName: "OnOff", attributes: [{ id: 0, name: "OnOff", value: true, writable: true }], commands: [{ id: 0, name: "Off", direction: "client_to_server" }, { id: 1, name: "On", direction: "client_to_server" }, { id: 2, name: "Toggle", direction: "client_to_server" }] },
    { clusterId: 8, clusterName: "LevelControl", attributes: [{ id: 0, name: "CurrentLevel", value: 200, writable: true }], commands: [{ id: 0, name: "MoveToLevel", direction: "client_to_server" }] },
  ],
});
matterBridge.registerDevice({
  nodeId: 2, endpointId: 1, deviceType: "temperature_sensor", vendorName: "Orion",
  productName: "Temp Sensor", fabricId: "fabric_orion_01", online: true,
  threadNetworkName: "OrionThread", clusters: [
    { clusterId: 1026, clusterName: "TemperatureMeasurement", attributes: [{ id: 0, name: "MeasuredValue", value: 2250, writable: false }], commands: [] },
  ],
});
