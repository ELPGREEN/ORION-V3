/**
 * ─── Industrial Communication Protocols ───
 * OPC UA, Modbus TCP, PROFINET, EtherCAT
 * Protocol bridges for Industry 4.0 / 5.0 interoperability
 */

import { iotBridge } from "./iot-device-bridge";

// ═══════════════════════════════════════════════
// §1 — OPC UA (IEC 62541)
// ═══════════════════════════════════════════════

export type OPCUANodeClass = "Object" | "Variable" | "Method" | "ObjectType" | "VariableType" | "ReferenceType" | "DataType" | "View";
export type OPCUAAccessLevel = "CurrentRead" | "CurrentWrite" | "HistoryRead" | "HistoryWrite" | "StatusWrite" | "TimestampWrite";
export type OPCUADataType = "Boolean" | "SByte" | "Byte" | "Int16" | "UInt16" | "Int32" | "UInt32" | "Int64" | "UInt64" | "Float" | "Double" | "String" | "DateTime" | "ByteString" | "NodeId" | "StatusCode";

export interface OPCUANodeId {
  namespaceIndex: number;
  identifierType: "numeric" | "string" | "guid" | "opaque";
  identifier: string | number;
}

export interface OPCUANode {
  nodeId: OPCUANodeId;
  browseName: string;
  displayName: string;
  nodeClass: OPCUANodeClass;
  description?: string;
  dataType?: OPCUADataType;
  value?: unknown;
  accessLevel?: OPCUAAccessLevel[];
  children?: OPCUANodeId[];
  lastUpdated: number;
}

export interface OPCUASubscription {
  subscriptionId: string;
  nodeId: OPCUANodeId;
  samplingInterval: number;
  publishingInterval: number;
  queueSize: number;
  deadbandType: "none" | "absolute" | "percent";
  deadbandValue: number;
  active: boolean;
}

export interface OPCUAEndpoint {
  endpointUrl: string;
  securityMode: "None" | "Sign" | "SignAndEncrypt";
  securityPolicy: string;
  serverCertificate?: string;
  connected: boolean;
  sessionId?: string;
  lastActivity: number;
}

type OPCUAValueCb = (nodeId: OPCUANodeId, value: unknown) => void;

export class OPCUABridge {
  private endpoints = new Map<string, OPCUAEndpoint>();
  private nodes = new Map<string, OPCUANode>();
  private subscriptions = new Map<string, OPCUASubscription>();
  private valueCallbacks: OPCUAValueCb[] = [];
  private subCounter = 0;

  private nodeKey(nodeId: OPCUANodeId): string {
    return `ns=${nodeId.namespaceIndex};${nodeId.identifierType === "numeric" ? "i" : "s"}=${nodeId.identifier}`;
  }

  registerEndpoint(url: string, securityMode: OPCUAEndpoint["securityMode"] = "None"): OPCUAEndpoint {
    const ep: OPCUAEndpoint = {
      endpointUrl: url, securityMode, securityPolicy: "http://opcfoundation.org/UA/SecurityPolicy#None",
      connected: false, lastActivity: Date.now(),
    };
    this.endpoints.set(url, ep);
    return ep;
  }

  get allEndpoints(): OPCUAEndpoint[] { return [...this.endpoints.values()]; }
  get allNodes(): OPCUANode[] { return [...this.nodes.values()]; }
  get allSubscriptions(): OPCUASubscription[] { return [...this.subscriptions.values()]; }

  async connect(endpointUrl: string): Promise<boolean> {
    const ep = this.endpoints.get(endpointUrl);
    if (!ep) return false;
    await iotBridge.publish(`opcua/connect`, { endpoint: endpointUrl, securityMode: ep.securityMode }, 1);
    ep.connected = true;
    ep.sessionId = `session_${Date.now()}`;
    ep.lastActivity = Date.now();
    return true;
  }

  registerNode(nodeId: OPCUANodeId, browseName: string, displayName: string, nodeClass: OPCUANodeClass, dataType?: OPCUADataType): void {
    this.nodes.set(this.nodeKey(nodeId), {
      nodeId, browseName, displayName, nodeClass, dataType, lastUpdated: Date.now(),
    });
  }

  async readValue(nodeId: OPCUANodeId): Promise<unknown> {
    const node = this.nodes.get(this.nodeKey(nodeId));
    await iotBridge.publish(`opcua/read`, { nodeId }, 1);
    return node?.value;
  }

  async writeValue(nodeId: OPCUANodeId, value: unknown): Promise<boolean> {
    const node = this.nodes.get(this.nodeKey(nodeId));
    if (node) { node.value = value; node.lastUpdated = Date.now(); }
    return iotBridge.publish(`opcua/write`, { nodeId, value }, 1);
  }

  createSubscription(nodeId: OPCUANodeId, samplingInterval = 1000): string {
    const subId = `sub_${++this.subCounter}`;
    this.subscriptions.set(subId, {
      subscriptionId: subId, nodeId, samplingInterval, publishingInterval: 1000,
      queueSize: 10, deadbandType: "none", deadbandValue: 0, active: true,
    });
    return subId;
  }

  onValueChange(cb: OPCUAValueCb): () => void {
    this.valueCallbacks.push(cb);
    return () => { this.valueCallbacks = this.valueCallbacks.filter(c => c !== cb); };
  }

  processNotification(nodeId: OPCUANodeId, value: unknown): void {
    const node = this.nodes.get(this.nodeKey(nodeId));
    if (node) { node.value = value; node.lastUpdated = Date.now(); }
    this.valueCallbacks.forEach(cb => { try { cb(nodeId, value); } catch { /* */ } });
  }
}

// ═══════════════════════════════════════════════
// §2 — MODBUS TCP (IEC 61158)
// ═══════════════════════════════════════════════

export type ModbusFunctionCode =
  | 0x01 | 0x02 | 0x03 | 0x04 // Read coils, discrete inputs, holding regs, input regs
  | 0x05 | 0x06 | 0x0F | 0x10; // Write single coil, single reg, multiple coils, multiple regs

export interface ModbusDevice {
  unitId: number;
  name: string;
  host: string;
  port: number;
  connected: boolean;
  lastPoll: number;
  errorCount: number;
  registers: Map<number, number>;
  coils: Map<number, boolean>;
}

export interface ModbusRequest {
  unitId: number;
  functionCode: ModbusFunctionCode;
  startAddress: number;
  quantity: number;
  values?: number[] | boolean[];
}

export interface ModbusResponse {
  unitId: number;
  functionCode: ModbusFunctionCode;
  data: number[] | boolean[];
  timestamp: number;
  error?: string;
}

export class ModbusTCPBridge {
  private devices = new Map<number, ModbusDevice>();

  registerDevice(unitId: number, name: string, host: string, port = 502): ModbusDevice {
    const dev: ModbusDevice = {
      unitId, name, host, port, connected: false, lastPoll: 0, errorCount: 0,
      registers: new Map(), coils: new Map(),
    };
    this.devices.set(unitId, dev);
    return dev;
  }

  get allDevices(): ModbusDevice[] {
    return [...this.devices.values()].map(d => ({
      ...d, registers: new Map(d.registers), coils: new Map(d.coils),
    }));
  }

  async readHoldingRegisters(unitId: number, start: number, quantity: number): Promise<number[]> {
    const req: ModbusRequest = { unitId, functionCode: 0x03, startAddress: start, quantity };
    await iotBridge.publish(`modbus/request`, req, 1);
    const dev = this.devices.get(unitId);
    if (dev) dev.lastPoll = Date.now();
    return Array.from({ length: quantity }, (_, i) => dev?.registers.get(start + i) ?? 0);
  }

  async writeSingleRegister(unitId: number, address: number, value: number): Promise<boolean> {
    const req: ModbusRequest = { unitId, functionCode: 0x06, startAddress: address, quantity: 1, values: [value] };
    const dev = this.devices.get(unitId);
    if (dev) dev.registers.set(address, value);
    return iotBridge.publish(`modbus/request`, req, 1);
  }

  async readCoils(unitId: number, start: number, quantity: number): Promise<boolean[]> {
    const req: ModbusRequest = { unitId, functionCode: 0x01, startAddress: start, quantity };
    await iotBridge.publish(`modbus/request`, req, 1);
    const dev = this.devices.get(unitId);
    return Array.from({ length: quantity }, (_, i) => dev?.coils.get(start + i) ?? false);
  }

  async writeSingleCoil(unitId: number, address: number, value: boolean): Promise<boolean> {
    const req: ModbusRequest = { unitId, functionCode: 0x05, startAddress: address, quantity: 1, values: [value] };
    const dev = this.devices.get(unitId);
    if (dev) dev.coils.set(address, value);
    return iotBridge.publish(`modbus/request`, req, 1);
  }

  processResponse(resp: ModbusResponse): void {
    const dev = this.devices.get(resp.unitId);
    if (!dev) return;
    dev.lastPoll = resp.timestamp;
    if (resp.error) { dev.errorCount++; return; }
    dev.connected = true;
    if (Array.isArray(resp.data)) {
      if (resp.functionCode === 0x03 || resp.functionCode === 0x04) {
        (resp.data as number[]).forEach((v, i) => dev.registers.set(i, v));
      } else if (resp.functionCode === 0x01 || resp.functionCode === 0x02) {
        (resp.data as boolean[]).forEach((v, i) => dev.coils.set(i, v));
      }
    }
  }
}

// ═══════════════════════════════════════════════
// §3 — PROFINET (IEC 61158-6-10)
// ═══════════════════════════════════════════════

export type PROFINETDeviceState = "OFFLINE" | "ONLINE" | "RUNNING" | "STOP" | "FAULT";

export interface PROFINETDevice {
  stationName: string;
  ipAddress: string;
  macAddress: string;
  vendorId: number;
  deviceId: number;
  deviceRole: "controller" | "device" | "supervisor";
  state: PROFINETDeviceState;
  gsdmlFile?: string;
  modules: PROFINETModule[];
  lastCycleTime: number;
  cycleCounter: number;
}

export interface PROFINETModule {
  slotNumber: number;
  subslotNumber: number;
  moduleName: string;
  moduleType: string;
  inputData: number[];
  outputData: number[];
  diagState: "OK" | "MAINTENANCE_REQUIRED" | "MAINTENANCE_DEMANDED" | "FAULT";
}

export interface PROFINETAlarm {
  alarmType: "diagnostic" | "process" | "pull" | "plug" | "status" | "update";
  priority: "low" | "high";
  stationName: string;
  slotNumber: number;
  subslotNumber: number;
  timestamp: number;
  data: number[];
  acknowledged: boolean;
}

export class PROFINETBridge {
  private devices = new Map<string, PROFINETDevice>();
  private alarms: PROFINETAlarm[] = [];

  registerDevice(stationName: string, ip: string, mac: string, role: PROFINETDevice["deviceRole"] = "device"): void {
    this.devices.set(stationName, {
      stationName, ipAddress: ip, macAddress: mac, vendorId: 0x002A, deviceId: 0x0001,
      deviceRole: role, state: "OFFLINE", modules: [], lastCycleTime: 0, cycleCounter: 0,
    });
  }

  get allDevices(): PROFINETDevice[] { return [...this.devices.values()]; }
  get allAlarms(): PROFINETAlarm[] { return [...this.alarms]; }
  get unacknowledgedAlarms(): PROFINETAlarm[] { return this.alarms.filter(a => !a.acknowledged); }

  addModule(stationName: string, slot: number, subslot: number, name: string, type: string): void {
    const dev = this.devices.get(stationName);
    if (dev) {
      dev.modules.push({
        slotNumber: slot, subslotNumber: subslot, moduleName: name, moduleType: type,
        inputData: [], outputData: [], diagState: "OK",
      });
    }
  }

  async writeOutput(stationName: string, slot: number, data: number[]): Promise<boolean> {
    const dev = this.devices.get(stationName);
    if (!dev) return false;
    const mod = dev.modules.find(m => m.slotNumber === slot);
    if (mod) mod.outputData = data;
    return iotBridge.publish(`profinet/${stationName}/output`, { slot, data }, 1);
  }

  processInput(stationName: string, slot: number, data: number[]): void {
    const dev = this.devices.get(stationName);
    if (!dev) return;
    const mod = dev.modules.find(m => m.slotNumber === slot);
    if (mod) mod.inputData = data;
    dev.state = "RUNNING";
    dev.cycleCounter++;
    dev.lastCycleTime = Date.now();
  }

  addAlarm(alarm: PROFINETAlarm): void {
    this.alarms.push(alarm);
    if (this.alarms.length > 200) this.alarms = this.alarms.slice(-200);
  }

  acknowledgeAlarm(index: number): void {
    if (this.alarms[index]) this.alarms[index].acknowledged = true;
  }
}

// ═══════════════════════════════════════════════
// §4 — EtherCAT (IEC 61158-3-12)
// ═══════════════════════════════════════════════

export type EtherCATState = "INIT" | "PRE-OP" | "SAFE-OP" | "OP" | "BOOT" | "ERROR";

export interface EtherCATSlave {
  position: number;
  stationAddress: number;
  vendorId: number;
  productCode: number;
  revisionNumber: number;
  serialNumber: number;
  name: string;
  state: EtherCATState;
  alStatus: number;
  dcSupported: boolean;
  dcActive: boolean;
  pdoMapping: {
    rxPdo: Array<{ index: number; name: string; bitLength: number; value: number }>;
    txPdo: Array<{ index: number; name: string; bitLength: number; value: number }>;
  };
  sdoEntries: Array<{ index: number; subIndex: number; name: string; dataType: string; value: unknown }>;
  wcState: "complete" | "incomplete";
}

export interface EtherCATMaster {
  state: EtherCATState;
  slaveCount: number;
  cycleTime: number;
  dcRefClock: number | null;
  txFrames: number;
  rxFrames: number;
  lostFrames: number;
  uptime: number;
}

export class EtherCATBridge {
  private master: EtherCATMaster = {
    state: "INIT", slaveCount: 0, cycleTime: 1000, dcRefClock: null,
    txFrames: 0, rxFrames: 0, lostFrames: 0, uptime: 0,
  };
  private slaves = new Map<number, EtherCATSlave>();

  get masterState(): EtherCATMaster { return { ...this.master }; }
  get allSlaves(): EtherCATSlave[] { return [...this.slaves.values()]; }

  registerSlave(position: number, name: string, vendorId: number, productCode: number): void {
    this.slaves.set(position, {
      position, stationAddress: 0x1000 + position, vendorId, productCode,
      revisionNumber: 1, serialNumber: position * 1000, name, state: "INIT",
      alStatus: 0x01, dcSupported: true, dcActive: false,
      pdoMapping: { rxPdo: [], txPdo: [] },
      sdoEntries: [], wcState: "complete",
    });
    this.master.slaveCount = this.slaves.size;
  }

  async transitionSlave(position: number, targetState: EtherCATState): Promise<boolean> {
    const slave = this.slaves.get(position);
    if (!slave) return false;
    slave.state = targetState;
    await iotBridge.publish(`ethercat/slave/${position}/state`, { targetState }, 1);
    return true;
  }

  async transitionMaster(targetState: EtherCATState): Promise<void> {
    this.master.state = targetState;
    for (const [pos] of this.slaves) {
      await this.transitionSlave(pos, targetState);
    }
    await iotBridge.publish(`ethercat/master/state`, { targetState }, 1);
  }

  updateProcessData(position: number, txPdoValues: Record<number, number>): void {
    const slave = this.slaves.get(position);
    if (!slave) return;
    for (const pdo of slave.pdoMapping.txPdo) {
      if (txPdoValues[pdo.index] !== undefined) pdo.value = txPdoValues[pdo.index];
    }
    this.master.rxFrames++;
  }

  async writeProcessData(position: number, rxPdoValues: Record<number, number>): Promise<boolean> {
    const slave = this.slaves.get(position);
    if (!slave) return false;
    for (const pdo of slave.pdoMapping.rxPdo) {
      if (rxPdoValues[pdo.index] !== undefined) pdo.value = rxPdoValues[pdo.index];
    }
    this.master.txFrames++;
    return iotBridge.publish(`ethercat/slave/${position}/rxpdo`, rxPdoValues, 1);
  }
}

// ═══════════════════════════════════════════════
// SINGLETONS
// ═══════════════════════════════════════════════

export const opcuaBridge = new OPCUABridge();
export const modbusBridge = new ModbusTCPBridge();
export const profinetBridge = new PROFINETBridge();
export const ethercatBridge = new EtherCATBridge();

// ─── Register defaults ───

opcuaBridge.registerEndpoint("opc.tcp://orion-plc:4840");
opcuaBridge.registerNode(
  { namespaceIndex: 2, identifierType: "string", identifier: "Temperature" },
  "Temperature", "Temperatura Ambiente", "Variable", "Double"
);
opcuaBridge.registerNode(
  { namespaceIndex: 2, identifierType: "string", identifier: "Pressure" },
  "Pressure", "Pressão Hidráulica", "Variable", "Double"
);
opcuaBridge.registerNode(
  { namespaceIndex: 2, identifierType: "string", identifier: "ConveyorSpeed" },
  "ConveyorSpeed", "Velocidade Esteira", "Variable", "Double"
);

modbusBridge.registerDevice(1, "PLC Siemens S7-1200", "192.168.1.10");
modbusBridge.registerDevice(2, "Inversor ABB ACS580", "192.168.1.11");
modbusBridge.registerDevice(3, "Sensor Endress+Hauser", "192.168.1.12");

profinetBridge.registerDevice("plc-main", "192.168.1.100", "00:1A:2B:3C:4D:5E", "controller");
profinetBridge.registerDevice("drive-1", "192.168.1.101", "00:1A:2B:3C:4D:5F", "device");
profinetBridge.addModule("drive-1", 1, 1, "Speed Control", "DI/DO");
profinetBridge.addModule("drive-1", 2, 1, "Torque Monitor", "AI");

ethercatBridge.registerSlave(0, "Beckhoff EK1100 (Coupler)", 0x0002, 0x044C2C52);
ethercatBridge.registerSlave(1, "Beckhoff EL1008 (8xDI)", 0x0002, 0x03F03052);
ethercatBridge.registerSlave(2, "Beckhoff EL2008 (8xDO)", 0x0002, 0x07D83052);
ethercatBridge.registerSlave(3, "Beckhoff EL3062 (2xAI)", 0x0002, 0x0BF63052);
