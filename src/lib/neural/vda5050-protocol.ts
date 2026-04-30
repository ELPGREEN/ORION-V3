/**
 * ─── VDA 5050 Protocol ───
 * Interface standard for AGV (Automated Guided Vehicle) communication
 * Version 2.0.0 — Verband Deutscher Automobilindustrie
 *
 * Ref: https://github.com/VDA5050/VDA5050
 */

import { iotBridge } from "./iot-device-bridge";

// ═══════════════════════════════════════════════
// §1 — CORE TYPES (VDA 5050 v2.0)
// ═══════════════════════════════════════════════

export type VDA5050ActionStatus = "WAITING" | "INITIALIZING" | "RUNNING" | "PAUSED" | "FINISHED" | "FAILED";
export type VDA5050OperatingMode = "AUTOMATIC" | "SEMIAUTOMATIC" | "MANUAL" | "SERVICE" | "TEACHIN";
export type VDA5050EStop = "AUTOACK" | "MANUAL" | "REMOTE" | "NONE";
export type VDA5050DrivingDirection = "FORWARD" | "BACKWARD" | "LEFT" | "RIGHT";

export interface VDA5050HeaderId {
  headerId: number;
  timestamp: string;
  version: string;
  manufacturer: string;
  serialNumber: string;
}

export interface VDA5050NodePosition {
  x: number;
  y: number;
  theta?: number;
  allowedDeviationXY?: number;
  allowedDeviationTheta?: number;
  mapId: string;
  mapDescription?: string;
}

export interface VDA5050Node {
  nodeId: string;
  sequenceId: number;
  released: boolean;
  nodePosition?: VDA5050NodePosition;
  actions: VDA5050Action[];
}

export interface VDA5050Edge {
  edgeId: string;
  sequenceId: number;
  released: boolean;
  startNodeId: string;
  endNodeId: string;
  maxSpeed?: number;
  maxHeight?: number;
  minHeight?: number;
  orientation?: number;
  direction?: VDA5050DrivingDirection;
  rotationAllowed?: boolean;
  maxRotationSpeed?: number;
  length?: number;
  trajectory?: VDA5050Trajectory;
  actions: VDA5050Action[];
}

export interface VDA5050Trajectory {
  degree: number;
  knotVector: number[];
  controlPoints: Array<{ x: number; y: number; weight?: number }>;
}

export interface VDA5050Action {
  actionId: string;
  actionType: string;
  actionDescription?: string;
  blockingType: "NONE" | "SOFT" | "HARD";
  actionParameters?: Array<{ key: string; value: string | number | boolean }>;
  actionStatus?: VDA5050ActionStatus;
  resultDescription?: string;
}

// ═══════════════════════════════════════════════
// §2 — ORDER MESSAGE (master → AGV)
// ═══════════════════════════════════════════════

export interface VDA5050Order extends VDA5050HeaderId {
  orderId: string;
  orderUpdateId: number;
  zoneSetId?: string;
  nodes: VDA5050Node[];
  edges: VDA5050Edge[];
}

// ═══════════════════════════════════════════════
// §3 — INSTANT ACTIONS (master → AGV)
// ═══════════════════════════════════════════════

export interface VDA5050InstantActions extends VDA5050HeaderId {
  instantActions: VDA5050Action[];
}

// ═══════════════════════════════════════════════
// §4 — STATE MESSAGE (AGV → master)
// ═══════════════════════════════════════════════

export interface VDA5050AGVPosition {
  x: number;
  y: number;
  theta: number;
  mapId: string;
  positionInitialized: boolean;
  localizationScore?: number;
  deviationRange?: number;
}

export interface VDA5050Velocity {
  vx?: number;
  vy?: number;
  omega?: number;
}

export interface VDA5050BatteryState {
  batteryCharge: number;
  batteryVoltage?: number;
  batteryHealth?: number;
  charging: boolean;
  reach?: number;
}

export interface VDA5050Load {
  loadId?: string;
  loadType?: string;
  loadPosition?: string;
  boundingBoxReference?: { x: number; y: number; z: number };
  loadDimensions?: { length: number; width: number; height?: number };
  weight?: number;
}

export interface VDA5050Error {
  errorType: string;
  errorLevel: "WARNING" | "FATAL";
  errorDescription?: string;
  errorReferences?: Array<{ referenceKey: string; referenceValue: string }>;
}

export interface VDA5050Info {
  infoType: string;
  infoLevel: "DEBUG" | "INFO";
  infoDescription?: string;
  infoReferences?: Array<{ referenceKey: string; referenceValue: string }>;
}

export interface VDA5050SafetyState {
  eStop: VDA5050EStop;
  fieldViolation: boolean;
}

export interface VDA5050State extends VDA5050HeaderId {
  orderId: string;
  orderUpdateId: number;
  zoneSetId?: string;
  lastNodeId: string;
  lastNodeSequenceId: number;
  nodeStates: Array<{
    nodeId: string;
    sequenceId: number;
    nodeDescription?: string;
    released: boolean;
    nodePosition?: VDA5050NodePosition;
  }>;
  edgeStates: Array<{
    edgeId: string;
    sequenceId: number;
    edgeDescription?: string;
    released: boolean;
    trajectory?: VDA5050Trajectory;
  }>;
  agvPosition?: VDA5050AGVPosition;
  velocity?: VDA5050Velocity;
  loads?: VDA5050Load[];
  driving: boolean;
  paused?: boolean;
  newBaseRequest?: boolean;
  distanceSinceLastNode?: number;
  actionStates: Array<{
    actionId: string;
    actionStatus: VDA5050ActionStatus;
    actionDescription?: string;
    resultDescription?: string;
  }>;
  batteryState: VDA5050BatteryState;
  operatingMode: VDA5050OperatingMode;
  errors: VDA5050Error[];
  informations?: VDA5050Info[];
  safetyState: VDA5050SafetyState;
}

// ═══════════════════════════════════════════════
// §5 — VISUALIZATION MESSAGE (AGV → master)
// ═══════════════════════════════════════════════

export interface VDA5050Visualization extends VDA5050HeaderId {
  agvPosition?: VDA5050AGVPosition;
  velocity?: VDA5050Velocity;
}

// ═══════════════════════════════════════════════
// §6 — CONNECTION MESSAGE
// ═══════════════════════════════════════════════

export interface VDA5050Connection extends VDA5050HeaderId {
  connectionState: "ONLINE" | "OFFLINE" | "CONNECTIONBROKEN";
}

// ═══════════════════════════════════════════════
// §7 — VDA 5050 FLEET BRIDGE
// ═══════════════════════════════════════════════

export interface VDA5050AGVInfo {
  manufacturer: string;
  serialNumber: string;
  name: string;
  state?: VDA5050State;
  connection: VDA5050Connection["connectionState"];
  lastOrder?: VDA5050Order;
  lastVisualization?: VDA5050Visualization;
  registeredAt: number;
}

type VDA5050StateCb = (agvKey: string, state: VDA5050State) => void;

export class VDA5050FleetBridge {
  private agvs = new Map<string, VDA5050AGVInfo>();
  private stateCallbacks: VDA5050StateCb[] = [];
  private headerCounter = 0;
  private orders = new Map<string, VDA5050Order>();

  private agvKey(manufacturer: string, serial: string): string {
    return `${manufacturer}/${serial}`;
  }

  private makeHeader(manufacturer: string, serial: string): VDA5050HeaderId {
    return {
      headerId: ++this.headerCounter,
      timestamp: new Date().toISOString(),
      version: "2.0.0",
      manufacturer,
      serialNumber: serial,
    };
  }

  registerAGV(manufacturer: string, serialNumber: string, name: string): void {
    const key = this.agvKey(manufacturer, serialNumber);
    this.agvs.set(key, {
      manufacturer, serialNumber, name, connection: "OFFLINE", registeredAt: Date.now(),
    });
  }

  get allAGVs(): VDA5050AGVInfo[] { return [...this.agvs.values()]; }
  get allOrders(): VDA5050Order[] { return [...this.orders.values()]; }

  async sendOrder(manufacturer: string, serial: string, order: Omit<VDA5050Order, keyof VDA5050HeaderId>): Promise<string> {
    const fullOrder: VDA5050Order = {
      ...this.makeHeader(manufacturer, serial),
      ...order,
    };
    const topic = `vda5050/${manufacturer}/${serial}/order`;
    await iotBridge.publish(topic, fullOrder, 1);
    this.orders.set(fullOrder.orderId, fullOrder);
    const agv = this.agvs.get(this.agvKey(manufacturer, serial));
    if (agv) agv.lastOrder = fullOrder;
    return fullOrder.orderId;
  }

  async sendInstantActions(manufacturer: string, serial: string, actions: VDA5050Action[]): Promise<void> {
    const msg: VDA5050InstantActions = {
      ...this.makeHeader(manufacturer, serial),
      instantActions: actions,
    };
    const topic = `vda5050/${manufacturer}/${serial}/instantActions`;
    await iotBridge.publish(topic, msg, 1);
  }

  async cancelOrder(manufacturer: string, serial: string): Promise<void> {
    await this.sendInstantActions(manufacturer, serial, [
      { actionId: `cancel_${Date.now()}`, actionType: "cancelOrder", blockingType: "HARD" },
    ]);
  }

  async stopCharging(manufacturer: string, serial: string): Promise<void> {
    await this.sendInstantActions(manufacturer, serial, [
      { actionId: `stopCharge_${Date.now()}`, actionType: "stopCharging", blockingType: "HARD" },
    ]);
  }

  processState(manufacturer: string, serial: string, state: VDA5050State): void {
    const key = this.agvKey(manufacturer, serial);
    const agv = this.agvs.get(key);
    if (agv) {
      agv.state = state;
      agv.connection = "ONLINE";
    }
    this.stateCallbacks.forEach(cb => { try { cb(key, state); } catch { /* */ } });
  }

  processConnection(manufacturer: string, serial: string, conn: VDA5050Connection): void {
    const agv = this.agvs.get(this.agvKey(manufacturer, serial));
    if (agv) agv.connection = conn.connectionState;
  }

  processVisualization(manufacturer: string, serial: string, viz: VDA5050Visualization): void {
    const agv = this.agvs.get(this.agvKey(manufacturer, serial));
    if (agv) agv.lastVisualization = viz;
  }

  onStateChange(cb: VDA5050StateCb): () => void {
    this.stateCallbacks.push(cb);
    return () => { this.stateCallbacks = this.stateCallbacks.filter(c => c !== cb); };
  }

  getAGV(manufacturer: string, serial: string): VDA5050AGVInfo | undefined {
    return this.agvs.get(this.agvKey(manufacturer, serial));
  }
  private initialized = false;

  initDefaults(): void {
    if (this.initialized) return;
    this.initialized = true;
    this.registerAGV("Orion", "AGV-001", "Orion AGV Alpha");
    this.registerAGV("Orion", "AGV-002", "Orion AGV Beta");
    this.registerAGV("KUKA", "KMP-1500-001", "KUKA KMP 1500");
    this.registerAGV("MiR", "MiR250-001", "MiR 250");
  }

  getAGVs(): VDA5050AGVInfo[] {
    return Array.from(this.agvs.values());
  }
}

// ═══════════════════════════════════════════════
// SINGLETON + DEFAULTS
// ═══════════════════════════════════════════════

export const vda5050Bridge = new VDA5050FleetBridge();
