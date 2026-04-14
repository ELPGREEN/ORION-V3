/**
 * ─── ROS2-Inspired Protocol Bridge ───
 * Standardized protocol for bidirectional communication with physical robots
 * via MQTT (HiveMQ). Maps ROS2 message types to TypeScript interfaces.
 *
 * Supports: geometry_msgs, nav_msgs, sensor_msgs, diagnostic_msgs, tf2_msgs
 * Transport: MQTT via IoT Device Bridge → Edge Function (mqtt-bridge)
 * Standards: REP-155 (HRI), VDA 5050, MassRobotics AMR Interop
 */

import { iotBridge } from "./iot-device-bridge";
import { DigitalTwinRegistry, createNeuralTwinRegistry } from "./digital-twin-aas";

// ─── ROS2 geometry_msgs ───

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Quaternion {
  x: number;
  y: number;
  z: number;
  w: number;
}

export interface Twist {
  linear: Vector3;
  angular: Vector3;
}

export interface Pose {
  position: Vector3;
  orientation: Quaternion;
}

export interface PoseStamped {
  header: Header;
  pose: Pose;
}

// ─── ROS2 std_msgs ───

export interface Header {
  stamp: number; // epoch ms
  frame_id: string;
}

// ─── ROS2 nav_msgs ───

export interface Odometry {
  header: Header;
  child_frame_id: string;
  pose: { pose: Pose; covariance?: number[] };
  twist: { twist: Twist; covariance?: number[] };
}

// ─── ROS2 sensor_msgs ───

export interface LaserScan {
  header: Header;
  angle_min: number;
  angle_max: number;
  angle_increment: number;
  time_increment: number;
  scan_time: number;
  range_min: number;
  range_max: number;
  ranges: number[];
  intensities?: number[];
}

export interface Imu {
  header: Header;
  orientation: Quaternion;
  angular_velocity: Vector3;
  linear_acceleration: Vector3;
}

export interface BatteryState {
  header: Header;
  voltage: number;
  current: number;
  charge: number;
  capacity: number;
  percentage: number;
  power_supply_status: "charging" | "discharging" | "not_charging" | "full" | "unknown";
  present: boolean;
  cell_voltage?: number[];
  temperature?: number;
}

export interface JointState {
  header: Header;
  name: string[];
  position: number[];
  velocity: number[];
  effort: number[];
}

export interface CompressedImage {
  header: Header;
  format: string;
  data: string; // base64
}

// ─── ROS2 diagnostic_msgs ───

export interface DiagnosticStatus {
  level: "ok" | "warn" | "error" | "stale";
  name: string;
  message: string;
  hardware_id: string;
  values: Array<{ key: string; value: string }>;
}

// ─── tf2_msgs ───

export interface TransformStamped {
  header: Header;
  child_frame_id: string;
  transform: {
    translation: Vector3;
    rotation: Quaternion;
  };
}

// ─── Robot State Aggregate ───

export interface RobotState {
  id: string;
  name: string;
  connected: boolean;
  lastHeartbeat: number;
  latencyMs: number;
  operationalMode: "manual" | "autonomous" | "emergency_stop" | "idle";
  odometry?: Odometry;
  battery?: BatteryState;
  imu?: Imu;
  laserScan?: LaserScan;
  jointStates?: JointState;
  diagnostics?: DiagnosticStatus;
  emergencyStopped: boolean;
}

// ─── Topic Map ───

export type ROS2TopicDirection = "outbound" | "inbound" | "bidirectional";

export interface ROS2TopicDef {
  pattern: string;
  direction: ROS2TopicDirection;
  ros2Type: string;
  qos: 0 | 1 | 2;
  description: string;
}

export const ROS2_TOPICS: Record<string, ROS2TopicDef> = {
  cmd_vel:            { pattern: "robot/{id}/cmd_vel",           direction: "outbound",     ros2Type: "geometry_msgs/Twist",          qos: 1, description: "Velocidade linear/angular" },
  nav_goal:           { pattern: "robot/{id}/nav/goal",          direction: "outbound",     ros2Type: "geometry_msgs/PoseStamped",    qos: 1, description: "Destino de navegação" },
  nav_cancel:         { pattern: "robot/{id}/nav/cancel",        direction: "outbound",     ros2Type: "actionlib/GoalID",             qos: 1, description: "Cancelar navegação" },
  actuator:           { pattern: "robot/{id}/actuator/{name}",   direction: "outbound",     ros2Type: "std_msgs/Float64",             qos: 1, description: "Controle de atuador" },
  odom:               { pattern: "robot/{id}/odom",              direction: "inbound",      ros2Type: "nav_msgs/Odometry",            qos: 0, description: "Posição/velocidade atual" },
  scan:               { pattern: "robot/{id}/scan",              direction: "inbound",      ros2Type: "sensor_msgs/LaserScan",        qos: 0, description: "LIDAR/distância" },
  imu:                { pattern: "robot/{id}/imu",               direction: "inbound",      ros2Type: "sensor_msgs/Imu",              qos: 0, description: "Acelerômetro/giroscópio" },
  battery:            { pattern: "robot/{id}/battery",           direction: "inbound",      ros2Type: "sensor_msgs/BatteryState",     qos: 0, description: "Estado da bateria" },
  camera_compressed:  { pattern: "robot/{id}/camera/compressed", direction: "inbound",      ros2Type: "sensor_msgs/CompressedImage",  qos: 0, description: "Frame da câmera" },
  joint_states:       { pattern: "robot/{id}/joint_states",      direction: "inbound",      ros2Type: "sensor_msgs/JointState",       qos: 0, description: "Estado das juntas" },
  status:             { pattern: "robot/{id}/status",            direction: "inbound",      ros2Type: "diagnostic_msgs/DiagnosticStatus", qos: 0, description: "Saúde geral" },
  tf:                 { pattern: "robot/{id}/tf",                direction: "inbound",      ros2Type: "tf2_msgs/TFMessage",           qos: 0, description: "Transformações" },
  emergency_stop:     { pattern: "robot/{id}/emergency_stop",    direction: "bidirectional", ros2Type: "std_msgs/Bool",               qos: 2, description: "Parada de emergência" },
};

function topicFor(robotId: string, key: string, extra?: string): string {
  let t = ROS2_TOPICS[key]?.pattern.replace("{id}", robotId) ?? `robot/${robotId}/${key}`;
  if (extra) t = t.replace("{name}", extra);
  return t;
}

// ─── Command Log Entry ───

export interface ROS2CommandLog {
  timestamp: number;
  topic: string;
  direction: "sent" | "received";
  type: string;
  payload: unknown;
}

// ─── ROS2 Protocol Bridge ───

type RobotStateCallback = (state: RobotState) => void;

export class ROS2ProtocolBridge {
  private robots = new Map<string, RobotState>();
  private commandLog: ROS2CommandLog[] = [];
  private stateListeners: RobotStateCallback[] = [];
  private pollingActive = false;
  private pollingIntervalId: number | null = null;
  private maxLogSize = 500;
  private maxRobots = 50;
  private twinRegistry: DigitalTwinRegistry = createNeuralTwinRegistry();

  get connectedRobots(): RobotState[] { return [...this.robots.values()]; }
  get log(): ROS2CommandLog[] { return [...this.commandLog]; }

  onStateChange(cb: RobotStateCallback): () => void {
    this.stateListeners.push(cb);
    return () => { this.stateListeners = this.stateListeners.filter(l => l !== cb); };
  }

  private emitState(state: RobotState) {
    this.stateListeners.forEach(cb => { try { cb(state); } catch { /* */ } });
  }

  private addLog(topic: string, direction: "sent" | "received", type: string, payload: unknown) {
    const entry: ROS2CommandLog = { timestamp: Date.now(), topic, direction, type, payload };
    this.commandLog.push(entry);
    if (this.commandLog.length > this.maxLogSize) {
      this.commandLog = this.commandLog.slice(-this.maxLogSize);
    }
  }

  // ─── Robot Registration ───

  registerRobot(id: string, name: string): RobotState {
    if (this.robots.has(id)) return this.robots.get(id)!;

    // Prevent memory exhaustion/unauthorized robot flood
    if (this.robots.size >= this.maxRobots) {
      console.warn(`[ROS2] Max robots (${this.maxRobots}) reached. Rejecting registration for ${id}`);
      throw new Error(`Maximum robot capacity reached (${this.maxRobots})`);
    }

    const state: RobotState = {
      id, name, connected: false, lastHeartbeat: 0, latencyMs: 0,
      operationalMode: "idle", emergencyStopped: false,
    };
    this.robots.set(id, state);

    // Register as IoT device
    iotBridge.registerDevice({ id: `robot_${id}`, name, type: "robot", topic: `robot/${id}/status` });

    // Register Digital Twin AAS
    this.twinRegistry.registerTwin(`robot-${id}`, "robot", name, { motor_left: 0, motor_right: 0, gripper: 0 });

    return state;
  }

  getRobot(id: string): RobotState | undefined { return this.robots.get(id); }

  getTwinRegistry(): DigitalTwinRegistry { return this.twinRegistry; }

  getTwinForRobot(robotId: string) { return this.twinRegistry.getTwin(`robot-${robotId}`); }

  // ─── Outbound Commands ───

  async sendCmdVel(robotId: string, linear: Vector3, angular: Vector3): Promise<boolean> {
    const twist: Twist = { linear, angular };
    const topic = topicFor(robotId, "cmd_vel");
    const ok = await iotBridge.publish(topic, twist, 1);
    this.addLog(topic, "sent", "Twist", twist);
    this.updateMode(robotId, "manual");
    return ok;
  }

  async sendNavGoal(robotId: string, x: number, y: number, theta: number): Promise<boolean> {
    const goal: PoseStamped = {
      header: { stamp: Date.now(), frame_id: "map" },
      pose: {
        position: { x, y, z: 0 },
        orientation: { x: 0, y: 0, z: Math.sin(theta / 2), w: Math.cos(theta / 2) },
      },
    };
    const topic = topicFor(robotId, "nav_goal");
    const ok = await iotBridge.publish(topic, goal, 1);
    this.addLog(topic, "sent", "PoseStamped", goal);
    this.updateMode(robotId, "autonomous");
    return ok;
  }

  async cancelNavigation(robotId: string): Promise<boolean> {
    const topic = topicFor(robotId, "nav_cancel");
    const payload = { stamp: Date.now(), id: "" };
    const ok = await iotBridge.publish(topic, payload, 1);
    this.addLog(topic, "sent", "GoalID", payload);
    this.updateMode(robotId, "idle");
    return ok;
  }

  async sendActuatorCommand(robotId: string, actuatorName: string, value: number): Promise<boolean> {
    const clampedValue = Math.max(-1, Math.min(1, value));
    const topic = topicFor(robotId, "actuator", actuatorName);
    const payload = { data: clampedValue, stamp: Date.now() };
    const ok = await iotBridge.publish(topic, payload, 1);
    this.addLog(topic, "sent", "Float64", payload);
    return ok;
  }

  async emergencyStop(robotId: string, activate: boolean): Promise<boolean> {
    const topic = topicFor(robotId, "emergency_stop");
    const payload = { data: activate, stamp: Date.now(), source: "orion" };
    const ok = await iotBridge.publish(topic, payload, 2);
    this.addLog(topic, "sent", "EmergencyStop", payload);

    const robot = this.robots.get(robotId);
    if (robot) {
      robot.emergencyStopped = activate;
      robot.operationalMode = activate ? "emergency_stop" : "idle";
      this.emitState(robot);
    }
    return ok;
  }

  // ─── Inbound Telemetry Processing ───

  processInboundMessage(topic: string, payload: unknown): void {
    const parts = topic.split("/");
    if (parts[0] !== "robot" || parts.length < 3) return;
    const robotId = parts[1];
    const dataType = parts.slice(2).join("/");

    let robot = this.robots.get(robotId);
    if (!robot) {
      robot = this.registerRobot(robotId, `Robot ${robotId}`);
    }

    robot.connected = true;
    robot.lastHeartbeat = Date.now();

    const data = payload as Record<string, unknown>;

    try {
      switch (dataType) {
        case "odom":
          robot.odometry = data as unknown as Odometry;
          break;
        case "battery":
          const batt = data as unknown as BatteryState;
          // Boundary validation
          if (typeof batt.percentage === "number") {
            batt.percentage = Math.max(0, Math.min(100, batt.percentage));
          }
          robot.battery = batt;
          break;
        case "imu":
          robot.imu = data as unknown as Imu;
          break;
        case "scan":
          const scan = data as unknown as LaserScan;
          // Sanitize ranges (no negative distances)
          if (Array.isArray(scan.ranges)) {
            scan.ranges = scan.ranges.map(r => Math.max(0, r));
          }
          robot.laserScan = scan;
          break;
        case "joint_states":
          robot.jointStates = data as unknown as JointState;
          break;
        case "status":
          robot.diagnostics = data as unknown as DiagnosticStatus;
          break;
        case "emergency_stop":
          if ((data as any)?.data === true) {
            robot.emergencyStopped = true;
            robot.operationalMode = "emergency_stop";
          }
          break;
      }
    } catch (err) {
      console.error(`[ROS2] Error processing inbound ${dataType} for ${robotId}:`, err);
    }

    this.addLog(topic, "received", dataType, payload);

    // Update Digital Twin metrics from telemetry
    const latency = Math.max(0, robot.latencyMs || 0);
    this.twinRegistry.updateMetrics(`robot-${robotId}`, {
      accuracy: robot.connected ? 0.95 : 0.3,
      latencyMs: latency,
      throughput: robot.connected ? 60 : 0,
    });

    // Final safety: Emit state only if robot hasn't been removed (atomicity check)
    if (this.robots.has(robotId)) {
      this.emitState({ ...robot }); // Clone to prevent mutation issues in listeners
    }
  }

  // ─── Telemetry Polling ───

  startTelemetryPolling(robotId: string, intervalMs = 3000): void {
    if (this.pollingActive) return;
    this.pollingActive = true;

    const topics = ["odom", "battery", "imu", "scan", "joint_states", "status", "emergency_stop"];
    topics.forEach(t => iotBridge.subscribe(topicFor(robotId, t), intervalMs));

    // Listen for inbound messages from IoT bridge
    const handler = (event: { type: string; data: any }) => {
      if (event.type === "message" && event.data?.direction === "inbound") {
        const msg = event.data;
        if (typeof msg.topic === "string" && msg.topic.startsWith("robot/")) {
          this.processInboundMessage(msg.topic, msg.payload);
        }
      }
    };
    iotBridge.on(handler);

    // Heartbeat check
    this.pollingIntervalId = window.setInterval(() => {
      for (const [, robot] of this.robots) {
        if (robot.connected && Date.now() - robot.lastHeartbeat > 15000) {
          robot.connected = false;
          this.emitState(robot);
        }
      }
    }, 5000);
  }

  stopTelemetryPolling(robotId: string): void {
    this.pollingActive = false;
    if (this.pollingIntervalId) {
      clearInterval(this.pollingIntervalId);
      this.pollingIntervalId = null;
    }
    const topics = ["odom", "battery", "imu", "scan", "joint_states", "status", "emergency_stop"];
    topics.forEach(t => iotBridge.unsubscribe(topicFor(robotId, t)));
  }

  private updateMode(robotId: string, mode: RobotState["operationalMode"]) {
    const robot = this.robots.get(robotId);
    if (robot && !robot.emergencyStopped) {
      robot.operationalMode = mode;
      this.emitState(robot);
    }
  }

  clearLog(): void { this.commandLog = []; }

  /** @internal For testing only */
  reset(): void {
    this.robots.clear();
    this.commandLog = [];
    this.stateListeners = [];
  }
}

// ─── Singleton ───

export const ros2Bridge = new ROS2ProtocolBridge();

// Register default test robot
ros2Bridge.registerRobot("main", "Robô Principal Orion");
