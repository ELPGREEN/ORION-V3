/**
 * ─── ROS2 Advanced Protocols ───
 * Action Server/Client, Service Call/Response, Parameter Server,
 * TF2 Transform Tree, Lifecycle Node Management
 *
 * Extends the base ros2-protocol-bridge with higher-level ROS2 patterns.
 */

import { iotBridge } from "./iot-device-bridge";
import type { Header, Pose, PoseStamped, Vector3, Quaternion } from "./ros2-protocol-bridge";

// ═══════════════════════════════════════════════
// §1 — ACTION SERVER / CLIENT (actionlib pattern)
// ═══════════════════════════════════════════════

export type ActionGoalStatus =
  | "PENDING" | "ACTIVE" | "PREEMPTED" | "SUCCEEDED"
  | "ABORTED" | "REJECTED" | "PREEMPTING" | "RECALLING" | "RECALLED" | "LOST";

export interface ActionGoal<T = unknown> {
  goal_id: { stamp: number; id: string };
  goal: T;
}

export interface ActionResult<T = unknown> {
  status: ActionGoalStatus;
  result: T;
}

export interface ActionFeedback<T = unknown> {
  status: ActionGoalStatus;
  feedback: T;
}

// ─── Built-in Action Types ───

export interface NavigateToPoseGoal {
  pose: PoseStamped;
  behavior_tree?: string;
}

export interface NavigateToPoseResult {
  error_code: number;
  error_msg?: string;
}

export interface NavigateToPoseFeedback {
  current_pose: PoseStamped;
  distance_remaining: number;
  navigation_time: number;
  number_of_recoveries: number;
  estimated_time_remaining: number;
}

export interface FollowPathGoal {
  path: PoseStamped[];
  controller_id?: string;
  goal_checker_id?: string;
}

export interface ComputePathGoal {
  start: PoseStamped;
  goal: PoseStamped;
  planner_id?: string;
  use_start?: boolean;
}

export interface DockRobotGoal {
  dock_id: string;
  dock_type?: string;
  navigate_to_staging_pose?: boolean;
}

export interface SpinGoal {
  target_yaw: number;
  time_allowance?: number;
}

export interface WaitGoal {
  time: number;
}

// ─── Action Server Registry ───

export interface ActionServerEntry {
  name: string;
  actionType: string;
  status: "idle" | "processing" | "preempting";
  currentGoalId: string | null;
  totalGoals: number;
  successRate: number;
  avgExecutionMs: number;
  lastResult?: ActionResult;
}

type ActionFeedbackCb = (feedback: ActionFeedback) => void;

export class ROS2ActionBridge {
  private servers = new Map<string, ActionServerEntry>();
  private feedbackCallbacks = new Map<string, ActionFeedbackCb[]>();
  private goalCounter = 0;

  registerServer(name: string, actionType: string): void {
    this.servers.set(name, {
      name, actionType, status: "idle",
      currentGoalId: null, totalGoals: 0, successRate: 1.0, avgExecutionMs: 0,
    });
  }

  get registeredServers(): ActionServerEntry[] { return [...this.servers.values()]; }

  async sendGoal<G>(serverName: string, goal: G): Promise<string> {
    const goalId = `goal_${++this.goalCounter}_${Date.now()}`;
    const server = this.servers.get(serverName);
    if (server) {
      server.status = "processing";
      server.currentGoalId = goalId;
      server.totalGoals++;
    }
    const actionGoal: ActionGoal<G> = {
      goal_id: { stamp: Date.now(), id: goalId },
      goal,
    };
    await iotBridge.publish(`action/${serverName}/goal`, actionGoal, 1);
    return goalId;
  }

  async cancelGoal(serverName: string, goalId: string): Promise<void> {
    await iotBridge.publish(`action/${serverName}/cancel`, { stamp: Date.now(), id: goalId }, 1);
    const server = this.servers.get(serverName);
    if (server) server.status = "preempting";
  }

  onFeedback(serverName: string, cb: ActionFeedbackCb): () => void {
    const cbs = this.feedbackCallbacks.get(serverName) ?? [];
    cbs.push(cb);
    this.feedbackCallbacks.set(serverName, cbs);
    return () => {
      const arr = this.feedbackCallbacks.get(serverName) ?? [];
      this.feedbackCallbacks.set(serverName, arr.filter(c => c !== cb));
    };
  }

  processResult(serverName: string, result: ActionResult): void {
    const server = this.servers.get(serverName);
    if (server) {
      server.status = "idle";
      server.lastResult = result;
      server.currentGoalId = null;
      const total = server.totalGoals;
      const successes = Math.round(server.successRate * (total - 1));
      server.successRate = (successes + (result.status === "SUCCEEDED" ? 1 : 0)) / total;
    }
  }

  processFeedback(serverName: string, feedback: ActionFeedback): void {
    const cbs = this.feedbackCallbacks.get(serverName) ?? [];
    cbs.forEach(cb => { try { cb(feedback); } catch { /* */ } });
  }
}

// ═══════════════════════════════════════════════
// §2 — SERVICE CALL / RESPONSE (req/res pattern)
// ═══════════════════════════════════════════════

export interface ServiceRequest<T = unknown> {
  request_id: string;
  stamp: number;
  data: T;
}

export interface ServiceResponse<T = unknown> {
  request_id: string;
  stamp: number;
  success: boolean;
  message?: string;
  data: T;
}

// ─── Built-in Service Types ───

export interface SetBoolRequest { data: boolean }
export interface SetBoolResponse { success: boolean; message: string }

export interface GetMapRequest { /* empty */ }
export interface GetMapResponse {
  resolution: number;
  width: number;
  height: number;
  origin: Pose;
  data: number[];
}

export interface SetParametersRequest {
  parameters: Array<{ name: string; value: ParameterValue }>;
}
export interface SetParametersResponse {
  results: Array<{ successful: boolean; reason: string }>;
}

export interface GetPlanRequest {
  start: PoseStamped;
  goal: PoseStamped;
  tolerance?: number;
}
export interface GetPlanResponse {
  plan: PoseStamped[];
}

export interface ServiceEntry {
  name: string;
  serviceType: string;
  callCount: number;
  avgResponseMs: number;
  lastCallAt: number | null;
  isAvailable: boolean;
}

type ServiceHandler = (req: ServiceRequest) => Promise<ServiceResponse>;

export class ROS2ServiceBridge {
  private services = new Map<string, ServiceEntry>();
  private handlers = new Map<string, ServiceHandler>();
  private reqCounter = 0;

  registerService(name: string, serviceType: string, handler?: ServiceHandler): void {
    this.services.set(name, {
      name, serviceType, callCount: 0, avgResponseMs: 0, lastCallAt: null, isAvailable: true,
    });
    if (handler) this.handlers.set(name, handler);
  }

  get registeredServices(): ServiceEntry[] { return [...this.services.values()]; }

  async call<Req, Res>(serviceName: string, data: Req): Promise<ServiceResponse<Res>> {
    const requestId = `srv_${++this.reqCounter}_${Date.now()}`;
    const service = this.services.get(serviceName);
    const start = performance.now();

    const handler = this.handlers.get(serviceName);
    if (handler) {
      const resp = await handler({ request_id: requestId, stamp: Date.now(), data });
      if (service) {
        service.callCount++;
        service.lastCallAt = Date.now();
        const elapsed = performance.now() - start;
        service.avgResponseMs = (service.avgResponseMs * (service.callCount - 1) + elapsed) / service.callCount;
      }
      return resp as ServiceResponse<Res>;
    }

    // Remote call via MQTT
    await iotBridge.publish(`service/${serviceName}/request`, { request_id: requestId, stamp: Date.now(), data }, 1);
    if (service) { service.callCount++; service.lastCallAt = Date.now(); }

    return {
      request_id: requestId, stamp: Date.now(), success: true,
      message: "Request published, awaiting async response",
      data: {} as Res,
    };
  }
}

// ═══════════════════════════════════════════════
// §3 — PARAMETER SERVER
// ═══════════════════════════════════════════════

export type ParameterType = "bool" | "integer" | "double" | "string" | "byte_array" | "bool_array" | "integer_array" | "double_array" | "string_array";

export interface ParameterValue {
  type: ParameterType;
  bool_value?: boolean;
  integer_value?: number;
  double_value?: number;
  string_value?: string;
  byte_array_value?: number[];
  bool_array_value?: boolean[];
  integer_array_value?: number[];
  double_array_value?: number[];
  string_array_value?: string[];
}

export interface ParameterDescriptor {
  name: string;
  type: ParameterType;
  description: string;
  additional_constraints?: string;
  read_only: boolean;
  floating_point_range?: { from: number; to: number; step: number };
  integer_range?: { from: number; to: number; step: number };
}

export interface ParameterEntry {
  descriptor: ParameterDescriptor;
  value: ParameterValue;
  lastModified: number;
  nodeId: string;
}

type ParamChangeCb = (nodeId: string, name: string, value: ParameterValue) => void;

export class ROS2ParameterServer {
  private params = new Map<string, ParameterEntry>();
  private listeners: ParamChangeCb[] = [];

  private key(nodeId: string, name: string): string { return `${nodeId}/${name}`; }

  declareParameter(nodeId: string, descriptor: ParameterDescriptor, initialValue: ParameterValue): void {
    this.params.set(this.key(nodeId, descriptor.name), {
      descriptor, value: initialValue, lastModified: Date.now(), nodeId,
    });
  }

  getParameter(nodeId: string, name: string): ParameterEntry | undefined {
    return this.params.get(this.key(nodeId, name));
  }

  setParameter(nodeId: string, name: string, value: ParameterValue): boolean {
    const entry = this.params.get(this.key(nodeId, name));
    if (!entry) return false;
    if (entry.descriptor.read_only) return false;
    entry.value = value;
    entry.lastModified = Date.now();
    this.listeners.forEach(cb => { try { cb(nodeId, name, value); } catch { /* */ } });
    return true;
  }

  getParametersForNode(nodeId: string): ParameterEntry[] {
    return [...this.params.values()].filter(p => p.nodeId === nodeId);
  }

  get allParameters(): ParameterEntry[] { return [...this.params.values()]; }

  onParameterChange(cb: ParamChangeCb): () => void {
    this.listeners.push(cb);
    return () => { this.listeners = this.listeners.filter(l => l !== cb); };
  }
}

// ═══════════════════════════════════════════════
// §4 — TF2 TRANSFORM TREE
// ═══════════════════════════════════════════════

export interface TF2Frame {
  frameId: string;
  parentFrameId: string | null;
  translation: Vector3;
  rotation: Quaternion;
  lastUpdated: number;
  authority: string;
}

export class TF2TransformTree {
  private frames = new Map<string, TF2Frame>();

  setTransform(
    parentFrameId: string,
    childFrameId: string,
    translation: Vector3,
    rotation: Quaternion,
    authority = "default"
  ): void {
    this.frames.set(childFrameId, {
      frameId: childFrameId, parentFrameId,
      translation, rotation, lastUpdated: Date.now(), authority,
    });
  }

  getFrame(frameId: string): TF2Frame | undefined {
    return this.frames.get(frameId);
  }

  getChildren(parentFrameId: string): TF2Frame[] {
    return [...this.frames.values()].filter(f => f.parentFrameId === parentFrameId);
  }

  getChain(from: string, to: string): TF2Frame[] {
    // Build path from → root
    const pathFrom: TF2Frame[] = [];
    let current = this.frames.get(from);
    while (current) {
      pathFrom.push(current);
      current = current.parentFrameId ? this.frames.get(current.parentFrameId) : undefined;
    }
    // Build path to → root
    const pathTo: TF2Frame[] = [];
    current = this.frames.get(to);
    while (current) {
      pathTo.push(current);
      current = current.parentFrameId ? this.frames.get(current.parentFrameId) : undefined;
    }
    // Find common ancestor
    const fromSet = new Set(pathFrom.map(f => f.frameId));
    const ancestor = pathTo.find(f => fromSet.has(f.frameId));
    if (!ancestor) return [];

    const upTo = pathFrom.slice(0, pathFrom.findIndex(f => f.frameId === ancestor.frameId) + 1);
    const downFrom = pathTo.slice(0, pathTo.findIndex(f => f.frameId === ancestor.frameId)).reverse();
    return [...upTo, ...downFrom];
  }

  get allFrames(): TF2Frame[] { return [...this.frames.values()]; }

  getTreeStructure(): { frameId: string; children: string[] }[] {
    const result: { frameId: string; children: string[] }[] = [];
    const roots = [...this.frames.values()].filter(f => !f.parentFrameId || !this.frames.has(f.parentFrameId));
    
    const buildTree = (frameId: string) => {
      const children = this.getChildren(frameId).map(c => c.frameId);
      result.push({ frameId, children });
      children.forEach(buildTree);
    };

    roots.forEach(r => buildTree(r.frameId));
    return result;
  }
}

// ═══════════════════════════════════════════════
// §5 — LIFECYCLE NODE MANAGEMENT
// ═══════════════════════════════════════════════

export type LifecycleState =
  | "UNKNOWN" | "UNCONFIGURED" | "INACTIVE" | "ACTIVE"
  | "FINALIZED" | "CONFIGURING" | "CLEANINGUP"
  | "SHUTTINGDOWN" | "ACTIVATING" | "DEACTIVATING" | "ERRORPROCESSING";

export type LifecycleTransition =
  | "configure" | "cleanup" | "activate" | "deactivate"
  | "shutdown" | "destroy";

const VALID_TRANSITIONS: Record<string, LifecycleTransition[]> = {
  UNCONFIGURED: ["configure", "shutdown"],
  INACTIVE: ["activate", "cleanup", "shutdown"],
  ACTIVE: ["deactivate", "shutdown"],
  FINALIZED: ["destroy"],
};

const TRANSITION_TARGETS: Record<string, LifecycleState> = {
  "UNCONFIGURED→configure": "INACTIVE",
  "INACTIVE→activate": "ACTIVE",
  "ACTIVE→deactivate": "INACTIVE",
  "INACTIVE→cleanup": "UNCONFIGURED",
  "UNCONFIGURED→shutdown": "FINALIZED",
  "INACTIVE→shutdown": "FINALIZED",
  "ACTIVE→shutdown": "FINALIZED",
  "FINALIZED→destroy": "UNKNOWN",
};

export interface LifecycleNode {
  nodeId: string;
  nodeName: string;
  namespace: string;
  state: LifecycleState;
  availableTransitions: LifecycleTransition[];
  uptime: number;
  lastTransition: string | null;
  lastTransitionAt: number | null;
  errorCount: number;
}

type LifecycleCb = (node: LifecycleNode) => void;

export class ROS2LifecycleManager {
  private nodes = new Map<string, LifecycleNode>();
  private listeners: LifecycleCb[] = [];
  private startTimes = new Map<string, number>();

  registerNode(nodeId: string, nodeName: string, namespace = "/"): void {
    const node: LifecycleNode = {
      nodeId, nodeName, namespace, state: "UNCONFIGURED",
      availableTransitions: VALID_TRANSITIONS["UNCONFIGURED"] ?? [],
      uptime: 0, lastTransition: null, lastTransitionAt: null, errorCount: 0,
    };
    this.nodes.set(nodeId, node);
    this.startTimes.set(nodeId, Date.now());
  }

  get registeredNodes(): LifecycleNode[] {
    return [...this.nodes.values()].map(n => ({
      ...n,
      uptime: Date.now() - (this.startTimes.get(n.nodeId) ?? Date.now()),
    }));
  }

  async triggerTransition(nodeId: string, transition: LifecycleTransition): Promise<boolean> {
    const node = this.nodes.get(nodeId);
    if (!node) return false;

    const valid = VALID_TRANSITIONS[node.state] ?? [];
    if (!valid.includes(transition)) return false;

    const targetKey = `${node.state}→${transition}`;
    const target = TRANSITION_TARGETS[targetKey];
    if (!target) return false;

    node.state = target;
    node.lastTransition = transition;
    node.lastTransitionAt = Date.now();
    node.availableTransitions = VALID_TRANSITIONS[target] ?? [];

    await iotBridge.publish(`lifecycle/${nodeId}/transition`, { transition, target_state: target }, 1);
    this.listeners.forEach(cb => { try { cb(node); } catch { /* */ } });
    return true;
  }

  getNode(nodeId: string): LifecycleNode | undefined { return this.nodes.get(nodeId); }

  onTransition(cb: LifecycleCb): () => void {
    this.listeners.push(cb);
    return () => { this.listeners = this.listeners.filter(l => l !== cb); };
  }
}

// ═══════════════════════════════════════════════
// SINGLETONS
// ═══════════════════════════════════════════════

export const ros2Actions = new ROS2ActionBridge();
export const ros2Services = new ROS2ServiceBridge();
export const ros2Params = new ROS2ParameterServer();
export const tf2Tree = new TF2TransformTree();
export const ros2Lifecycle = new ROS2LifecycleManager();

// ─── Register defaults ───

ros2Actions.registerServer("navigate_to_pose", "NavigateToPose");
ros2Actions.registerServer("follow_path", "FollowPath");
ros2Actions.registerServer("compute_path", "ComputePathToPose");
ros2Actions.registerServer("dock_robot", "DockRobot");
ros2Actions.registerServer("spin", "Spin");
ros2Actions.registerServer("wait", "Wait");

ros2Services.registerService("get_map", "nav_msgs/GetMap");
ros2Services.registerService("set_parameters", "rcl_interfaces/SetParameters");
ros2Services.registerService("get_plan", "nav_msgs/GetPlan");
ros2Services.registerService("clear_costmap", "nav2_msgs/ClearEntireCostmap");
ros2Services.registerService("set_initial_pose", "geometry_msgs/PoseWithCovarianceStamped");

ros2Params.declareParameter("main_robot", {
  name: "max_speed", type: "double", description: "Maximum linear speed (m/s)",
  read_only: false, floating_point_range: { from: 0, to: 2.0, step: 0.1 },
}, { type: "double", double_value: 0.5 });

ros2Params.declareParameter("main_robot", {
  name: "use_sim_time", type: "bool", description: "Use simulated time",
  read_only: false,
}, { type: "bool", bool_value: false });

ros2Params.declareParameter("main_robot", {
  name: "robot_model", type: "string", description: "Robot URDF model path",
  read_only: true,
}, { type: "string", string_value: "orion_agv_v1" });

ros2Params.declareParameter("planner", {
  name: "planner_plugin", type: "string", description: "Nav2 planner plugin",
  read_only: false,
}, { type: "string", string_value: "NavfnPlanner" });

ros2Params.declareParameter("controller", {
  name: "controller_frequency", type: "double", description: "Controller frequency (Hz)",
  read_only: false, floating_point_range: { from: 1, to: 100, step: 1 },
}, { type: "double", double_value: 20 });

// TF2 default frames
tf2Tree.setTransform("world", "map", { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0, w: 1 });
tf2Tree.setTransform("map", "odom", { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0, w: 1 });
tf2Tree.setTransform("odom", "base_link", { x: 1.5, y: 0.3, z: 0 }, { x: 0, y: 0, z: 0.1, w: 0.995 });
tf2Tree.setTransform("base_link", "base_laser", { x: 0.2, y: 0, z: 0.3 }, { x: 0, y: 0, z: 0, w: 1 });
tf2Tree.setTransform("base_link", "base_camera", { x: 0.15, y: 0, z: 0.5 }, { x: 0, y: 0, z: 0, w: 1 });
tf2Tree.setTransform("base_link", "base_imu", { x: 0, y: 0, z: 0.1 }, { x: 0, y: 0, z: 0, w: 1 });
tf2Tree.setTransform("base_link", "gripper_link", { x: 0.3, y: 0, z: 0.15 }, { x: 0, y: 0, z: 0, w: 1 });

// Lifecycle nodes
ros2Lifecycle.registerNode("nav2_controller", "controller_server", "/nav2");
ros2Lifecycle.registerNode("nav2_planner", "planner_server", "/nav2");
ros2Lifecycle.registerNode("nav2_bt_navigator", "bt_navigator", "/nav2");
ros2Lifecycle.registerNode("nav2_costmap", "costmap_2d", "/nav2");
ros2Lifecycle.registerNode("slam_toolbox", "slam_toolbox_node", "/slam");
ros2Lifecycle.registerNode("robot_localization", "ekf_filter_node", "/localization");
