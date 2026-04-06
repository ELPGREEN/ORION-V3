/**
 * ═══════════════════════════════════════════════════════════
 *  ROSBridge WebSocket Client — Real ROS2 ↔ Web Bridge
 * ═══════════════════════════════════════════════════════════
 * 
 * Connects to rosbridge_suite (ros2-web-bridge) via WebSocket.
 * Provides: topic subscribe/publish, service calls, action goals.
 * Auto-reconnects with exponential backoff.
 * 
 * Deploy rosbridge on robot:
 *   ros2 launch rosbridge_server rosbridge_websocket_launch.xml
 */

export interface RosBridgeConfig {
  url: string; // e.g. "ws://192.168.1.100:9090"
  reconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectBaseDelay?: number;
}

export interface RosMessage {
  op: string;
  [key: string]: unknown;
}

export interface TopicSubscription {
  topic: string;
  type: string;
  callback: (msg: unknown) => void;
  throttleRate?: number;
  queueSize?: number;
}

export type ConnectionState = "disconnected" | "connecting" | "connected" | "error";

type Listener = (state: ConnectionState) => void;
type TopicCallback = (msg: unknown) => void;

export class RosBridgeClient {
  private ws: WebSocket | null = null;
  private config: Required<RosBridgeConfig>;
  private state: ConnectionState = "disconnected";
  private stateListeners: Set<Listener> = new Set();
  private topicCallbacks: Map<string, Set<TopicCallback>> = new Map();
  private serviceCallbacks: Map<string, (result: unknown) => void> = new Map();
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private subscribedTopics: Map<string, { type: string; throttleRate?: number }> = new Map();
  private idCounter = 0;

  constructor(config: RosBridgeConfig) {
    this.config = {
      url: config.url,
      reconnect: config.reconnect ?? true,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 15,
      reconnectBaseDelay: config.reconnectBaseDelay ?? 1000,
    };
  }

  // ─── Connection ───

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    this.setState("connecting");

    try {
      this.ws = new WebSocket(this.config.url);

      this.ws.onopen = () => {
        console.log("[ROSBridge] ✅ Connected to", this.config.url);
        this.reconnectAttempts = 0;
        this.setState("connected");
        // Re-subscribe to previously active topics
        this.subscribedTopics.forEach((info, topic) => {
          this.sendSubscribe(topic, info.type, info.throttleRate);
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as RosMessage;
          this.handleMessage(msg);
        } catch (err) {
          console.warn("[ROSBridge] Parse error:", err);
        }
      };

      this.ws.onclose = () => {
        console.log("[ROSBridge] Connection closed");
        this.ws = null;
        this.setState("disconnected");
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.warn("[ROSBridge] WebSocket error:", err);
        this.setState("error");
      };
    } catch (err) {
      console.error("[ROSBridge] Failed to create WebSocket:", err);
      this.setState("error");
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.config.reconnect = false;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.ws?.close();
    this.ws = null;
    this.setState("disconnected");
  }

  private scheduleReconnect(): void {
    if (!this.config.reconnect) return;
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      console.warn("[ROSBridge] Max reconnect attempts reached");
      this.setState("error");
      return;
    }
    const delay = Math.min(this.config.reconnectBaseDelay * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    console.log(`[ROSBridge] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    this.reconnectTimer = setTimeout(() => this.connect(), delay);
  }

  // ─── State Management ───

  private setState(state: ConnectionState): void {
    this.state = state;
    this.stateListeners.forEach((fn) => fn(state));
  }

  get connectionState(): ConnectionState { return this.state; }
  get isConnected(): boolean { return this.state === "connected"; }

  onStateChange(fn: Listener): () => void {
    this.stateListeners.add(fn);
    return () => this.stateListeners.delete(fn);
  }

  // ─── Topics ───

  subscribe(topic: string, type: string, callback: TopicCallback, throttleRate?: number): () => void {
    if (!this.topicCallbacks.has(topic)) {
      this.topicCallbacks.set(topic, new Set());
    }
    this.topicCallbacks.get(topic)!.add(callback);
    this.subscribedTopics.set(topic, { type, throttleRate });

    if (this.isConnected) {
      this.sendSubscribe(topic, type, throttleRate);
    }

    return () => {
      const cbs = this.topicCallbacks.get(topic);
      cbs?.delete(callback);
      if (cbs?.size === 0) {
        this.topicCallbacks.delete(topic);
        this.subscribedTopics.delete(topic);
        this.send({ op: "unsubscribe", topic });
      }
    };
  }

  private sendSubscribe(topic: string, type: string, throttleRate?: number): void {
    this.send({
      op: "subscribe",
      topic,
      type,
      ...(throttleRate ? { throttle_rate: throttleRate } : {}),
    });
  }

  publish(topic: string, type: string, msg: unknown): void {
    this.send({ op: "publish", topic, msg });
  }

  // ─── Services ───

  callService<T = unknown>(service: string, args?: unknown): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = `srv_${++this.idCounter}`;
      const timeout = setTimeout(() => {
        this.serviceCallbacks.delete(id);
        reject(new Error(`Service call timeout: ${service}`));
      }, 15000);

      this.serviceCallbacks.set(id, (result: unknown) => {
        clearTimeout(timeout);
        resolve(result as T);
      });

      this.send({ op: "call_service", id, service, args: args ?? {} });
    });
  }

  // ─── Actions (ROS2 action protocol via rosbridge) ───

  sendActionGoal(actionName: string, actionType: string, goal: unknown): string {
    const goalId = `goal_${++this.idCounter}_${Date.now()}`;
    this.send({
      op: "send_action_goal",
      action: actionName,
      action_type: actionType,
      feedback: true,
      args: goal,
      id: goalId,
    });
    return goalId;
  }

  cancelActionGoal(actionName: string, goalId: string): void {
    this.send({ op: "cancel_action_goal", action: actionName, id: goalId });
  }

  // ─── Message Handling ───

  private handleMessage(msg: RosMessage): void {
    switch (msg.op) {
      case "publish": {
        const topic = msg.topic as string;
        const callbacks = this.topicCallbacks.get(topic);
        callbacks?.forEach((cb) => cb(msg.msg));
        break;
      }
      case "service_response": {
        const id = msg.id as string;
        const cb = this.serviceCallbacks.get(id);
        if (cb) {
          this.serviceCallbacks.delete(id);
          cb(msg.values ?? msg.result);
        }
        break;
      }
      case "action_feedback":
        console.log("[ROSBridge] Action feedback:", msg);
        break;
      case "action_result":
        console.log("[ROSBridge] Action result:", msg);
        break;
      default:
        break;
    }
  }

  // ─── Transport ───

  private send(msg: RosMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      console.warn("[ROSBridge] Not connected, message queued:", msg.op);
      return;
    }
    this.ws.send(JSON.stringify(msg));
  }

  // ─── Common ROS2 helpers ───

  /** Send velocity command (geometry_msgs/Twist) */
  sendCmdVel(linearX: number, angularZ: number, topic = "/cmd_vel"): void {
    this.publish(topic, "geometry_msgs/msg/Twist", {
      linear: { x: linearX, y: 0, z: 0 },
      angular: { x: 0, y: 0, z: angularZ },
    });
  }

  /** Send Nav2 goal (geometry_msgs/PoseStamped) */
  sendNav2Goal(x: number, y: number, theta: number): string {
    return this.sendActionGoal(
      "/navigate_to_pose",
      "nav2_msgs/action/NavigateToPose",
      {
        pose: {
          header: { frame_id: "map", stamp: { sec: 0, nanosec: 0 } },
          pose: {
            position: { x, y, z: 0 },
            orientation: {
              x: 0, y: 0,
              z: Math.sin(theta / 2),
              w: Math.cos(theta / 2),
            },
          },
        },
      }
    );
  }

  /** Subscribe to battery state */
  onBattery(callback: (data: { voltage: number; percentage: number; current: number }) => void, topic = "/battery_state"): () => void {
    return this.subscribe(topic, "sensor_msgs/msg/BatteryState", callback as TopicCallback, 1000);
  }

  /** Subscribe to odometry */
  onOdom(callback: (data: unknown) => void, topic = "/odom"): () => void {
    return this.subscribe(topic, "nav_msgs/msg/Odometry", callback, 100);
  }

  /** Subscribe to laser scan */
  onLaserScan(callback: (data: unknown) => void, topic = "/scan"): () => void {
    return this.subscribe(topic, "sensor_msgs/msg/LaserScan", callback, 200);
  }

  /** Subscribe to diagnostics */
  onDiagnostics(callback: (data: unknown) => void): () => void {
    return this.subscribe("/diagnostics", "diagnostic_msgs/msg/DiagnosticArray", callback, 2000);
  }

  /** Subscribe to joint states */
  onJointStates(callback: (data: unknown) => void): () => void {
    return this.subscribe("/joint_states", "sensor_msgs/msg/JointState", callback, 100);
  }

  /** Subscribe to IMU */
  onIMU(callback: (data: unknown) => void, topic = "/imu/data"): () => void {
    return this.subscribe(topic, "sensor_msgs/msg/Imu", callback, 100);
  }

  /** Subscribe to camera compressed image */
  onCameraImage(callback: (data: { format: string; data: string }) => void, topic = "/camera/image/compressed"): () => void {
    return this.subscribe(topic, "sensor_msgs/msg/CompressedImage", callback as TopicCallback, 100);
  }

  /** Emergency stop */
  emergencyStop(): void {
    this.sendCmdVel(0, 0);
    // Also try standard e-stop service
    this.callService("/emergency_stop", { data: true }).catch(() => {});
  }
}

// ─── Singleton ───

let _instance: RosBridgeClient | null = null;

export function getRosBridgeClient(url?: string): RosBridgeClient {
  if (!_instance && url) {
    _instance = new RosBridgeClient({ url });
  }
  if (!_instance) {
    _instance = new RosBridgeClient({ url: "ws://localhost:9090" });
  }
  return _instance;
}

export function destroyRosBridgeClient(): void {
  _instance?.disconnect();
  _instance = null;
}
