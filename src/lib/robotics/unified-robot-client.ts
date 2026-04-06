/**
 * ═══════════════════════════════════════════════════════════
 *  Unified Robot Client — Single API for all robot comms
 * ═══════════════════════════════════════════════════════════
 *
 * Primary: ROSBridge WebSocket (real robot)
 * Fallback: MQTT via iotBridge (legacy/simulation)
 * 
 * Re-exports ROS2 types for backward compatibility.
 */

import { getRosBridgeClient, destroyRosBridgeClient, type RosBridgeClient, type ConnectionState } from "./rosbridge-client";

// Re-export types from the old bridge for backward compatibility
export type { ConnectionState } from "./rosbridge-client";

export type TransportMode = "rosbridge" | "mqtt" | "demo";

export interface UnifiedRobotState {
  connected: boolean;
  transport: TransportMode;
  connectionState: ConnectionState;
  emergencyStopped: boolean;
  operationalMode: "manual" | "autonomous" | "emergency_stop" | "idle";
  battery: { voltage: number; percentage: number; current: number; temperature?: number; status: string } | null;
  odometry: { x: number; y: number; z: number; vx: number; vy: number; vz: number } | null;
  imu: { ax: number; ay: number; az: number; gx: number; gy: number; gz: number } | null;
  diagnostics: Array<{ key: string; value: string }>;
  lastHeartbeat: number;
}

type StateListener = (state: UnifiedRobotState) => void;

const defaultState: UnifiedRobotState = {
  connected: false,
  transport: "rosbridge",
  connectionState: "disconnected",
  emergencyStopped: false,
  operationalMode: "idle",
  battery: null,
  odometry: null,
  imu: null,
  diagnostics: [],
  lastHeartbeat: 0,
};

export class UnifiedRobotClient {
  private client: RosBridgeClient | null = null;
  private state: UnifiedRobotState = { ...defaultState };
  private listeners = new Set<StateListener>();
  private unsubs: Array<() => void> = [];
  private demoTimer: ReturnType<typeof setInterval> | null = null;
  private _transport: TransportMode = "rosbridge";

  get currentState(): UnifiedRobotState { return { ...this.state }; }
  get transport(): TransportMode { return this._transport; }
  get isConnected(): boolean { return this.state.connected; }

  // ─── Connection ───

  connect(rosbridgeUrl: string, transport: TransportMode = "rosbridge"): void {
    this.disconnect();
    this._transport = transport;

    if (transport === "demo") {
      this.startDemo();
      return;
    }

    if (transport === "rosbridge") {
      destroyRosBridgeClient();
      this.client = getRosBridgeClient(rosbridgeUrl);

      const unsub = this.client.onStateChange((cs) => {
        this.state.connectionState = cs;
        this.state.connected = cs === "connected";
        this.state.transport = "rosbridge";
        this.emit();
      });
      this.unsubs.push(unsub);

      // Subscribe to standard topics
      this.subscribeStandardTopics();
      this.client.connect();
    }
  }

  disconnect(): void {
    this.unsubs.forEach((fn) => fn());
    this.unsubs = [];
    if (this.demoTimer) { clearInterval(this.demoTimer); this.demoTimer = null; }
    destroyRosBridgeClient();
    this.client = null;
    this.state = { ...defaultState };
    this.emit();
  }

  // ─── Commands ───

  sendCmdVel(linearX: number, angularZ: number): void {
    if (this._transport === "demo") {
      this.state.operationalMode = (linearX !== 0 || angularZ !== 0) ? "manual" : "idle";
      this.emit();
      return;
    }
    this.client?.sendCmdVel(linearX, angularZ);
    this.state.operationalMode = (linearX !== 0 || angularZ !== 0) ? "manual" : "idle";
    this.emit();
  }

  sendNav2Goal(x: number, y: number, theta: number): string | null {
    if (this._transport === "demo") {
      this.state.operationalMode = "autonomous";
      this.emit();
      return `demo_goal_${Date.now()}`;
    }
    const id = this.client?.sendNav2Goal(x, y, theta) ?? null;
    if (id) {
      this.state.operationalMode = "autonomous";
      this.emit();
    }
    return id;
  }

  cancelNavigation(): void {
    this.client?.cancelActionGoal("/navigate_to_pose", "");
    this.state.operationalMode = "idle";
    this.emit();
  }

  emergencyStop(activate: boolean): void {
    if (this._transport === "demo") {
      this.state.emergencyStopped = activate;
      this.state.operationalMode = activate ? "emergency_stop" : "idle";
      this.emit();
      return;
    }
    if (activate) {
      this.client?.emergencyStop();
    } else {
      this.client?.sendCmdVel(0, 0);
    }
    this.state.emergencyStopped = activate;
    this.state.operationalMode = activate ? "emergency_stop" : "idle";
    this.emit();
  }

  async startTireInspection(): Promise<{ success: boolean; message: string }> {
    if (this._transport === "demo") return { success: true, message: "Inspeção simulada OK" };
    return this.client?.startTireInspection() ?? { success: false, message: "Não conectado" };
  }

  async setConveyor(running: boolean): Promise<{ success: boolean; message: string }> {
    if (this._transport === "demo") return { success: true, message: `Esteira ${running ? "ligada" : "desligada"} (demo)` };
    return this.client?.setConveyor(running) ?? { success: false, message: "Não conectado" };
  }

  async getLineStatus(): Promise<any> {
    if (this._transport === "demo") return { success: true, message: JSON.stringify({ conveyor_running: true, oee_pct: 87.3, tire_count: 142 }) };
    return this.client?.getLineStatus() ?? { success: false, message: "Não conectado" };
  }

  async callService<T = unknown>(service: string, args?: unknown): Promise<T> {
    if (this._transport === "demo") return { success: true, message: "OK (demo)" } as T;
    if (!this.client) throw new Error("Not connected");
    return this.client.callService<T>(service, args);
  }

  // ─── Subscriptions (pass-through) ───

  subscribe(topic: string, type: string, callback: (msg: unknown) => void, throttleRate?: number): () => void {
    if (!this.client) return () => {};
    const unsub = this.client.subscribe(topic, type, callback, throttleRate);
    this.unsubs.push(unsub);
    return unsub;
  }

  // ─── Listeners ───

  onStateChange(fn: StateListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    this.listeners.forEach((fn) => { try { fn({ ...this.state }); } catch {} });
  }

  // ─── Standard Topic Subscriptions ───

  private subscribeStandardTopics(): void {
    if (!this.client) return;

    this.unsubs.push(
      this.client.onBattery((data: any) => {
        this.state.battery = {
          voltage: data.voltage ?? 0,
          percentage: data.percentage ?? 0,
          current: data.current ?? 0,
          temperature: data.temperature,
          status: data.power_supply_status ?? "unknown",
        };
        this.state.lastHeartbeat = Date.now();
        this.emit();
      })
    );

    this.unsubs.push(
      this.client.onOdom((data: any) => {
        const pos = data?.pose?.pose?.position ?? {};
        const vel = data?.twist?.twist?.linear ?? {};
        this.state.odometry = {
          x: pos.x ?? 0, y: pos.y ?? 0, z: pos.z ?? 0,
          vx: vel.x ?? 0, vy: vel.y ?? 0, vz: vel.z ?? 0,
        };
        this.state.lastHeartbeat = Date.now();
        this.emit();
      })
    );

    this.unsubs.push(
      this.client.onIMU((data: any) => {
        this.state.imu = {
          ax: data?.linear_acceleration?.x ?? 0,
          ay: data?.linear_acceleration?.y ?? 0,
          az: data?.linear_acceleration?.z ?? 0,
          gx: data?.angular_velocity?.x ?? 0,
          gy: data?.angular_velocity?.y ?? 0,
          gz: data?.angular_velocity?.z ?? 0,
        };
        this.emit();
      })
    );

    this.unsubs.push(
      this.client.onDiagnostics((data: any) => {
        const statuses = data?.status ?? [];
        this.state.diagnostics = statuses.flatMap((s: any) =>
          (s.values ?? []).map((v: any) => ({ key: v.key, value: v.value }))
        );
        this.emit();
      })
    );
  }

  // ─── Demo Mode ───

  private startDemo(): void {
    this.state.connected = true;
    this.state.connectionState = "connected";
    this.state.transport = "demo";
    this.state.operationalMode = "idle";
    this.emit();

    this.demoTimer = setInterval(() => {
      const t = Date.now();
      this.state.lastHeartbeat = t;
      this.state.battery = {
        voltage: 24.2 + Math.random() * 0.5,
        percentage: 0.72 + Math.random() * 0.05,
        current: 1.2 + Math.random() * 0.3,
        temperature: 35 + Math.random() * 3,
        status: "discharging",
      };
      this.state.odometry = {
        x: Math.sin(t / 5000) * 2, y: Math.cos(t / 5000) * 2, z: 0,
        vx: 0.1, vy: 0, vz: 0,
      };
      this.state.imu = {
        ax: 0.05, ay: 0.02, az: 9.81,
        gx: 0.01, gy: -0.005, gz: 0.02 + Math.random() * 0.01,
      };
      this.state.diagnostics = [
        { key: "cpu_temp", value: `${(45 + Math.random() * 10).toFixed(1)}°C` },
        { key: "ram_usage", value: `${(55 + Math.random() * 15).toFixed(0)}%` },
        { key: "disk_free", value: "12.4 GB" },
        { key: "uptime", value: "3h 42m" },
      ];
      this.emit();
    }, 2000);
  }

  // ─── Access underlying ROSBridge client ───

  get rosBridgeClient(): RosBridgeClient | null { return this.client; }
}

// ─── Singleton ───

let _unified: UnifiedRobotClient | null = null;

export function getUnifiedRobotClient(): UnifiedRobotClient {
  if (!_unified) _unified = new UnifiedRobotClient();
  return _unified;
}
