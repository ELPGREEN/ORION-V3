/**
 * ═══════════════════════════════════════════════════════════
 *  ROSBridge WebSocket Client — Production Grade
 * ═══════════════════════════════════════════════════════════
 * 
 * Connects to rosbridge_suite via WebSocket (ws/wss).
 * Features: auto-reconnect, message queue, heartbeat,
 * topic subscribe/publish, service calls, action goals.
 */

export interface RosBridgeConfig {
  url: string;
  reconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectBaseDelay?: number;
  heartbeatInterval?: number;
  messageQueueSize?: number;
  ssl?: boolean;
}

export interface RosMessage {
  op: string;
  [key: string]: unknown;
}

export type ConnectionState = "disconnected" | "connecting" | "connected" | "error";
type Listener = (state: ConnectionState) => void;
type TopicCallback = (msg: unknown) => void;

export class RosBridgeClient {
  private ws: WebSocket | null = null;
  private config: Required<RosBridgeConfig>;
  private state: ConnectionState = "disconnected";
  private stateListeners = new Set<Listener>();
  private topicCallbacks = new Map<string, Set<TopicCallback>>();
  private serviceCallbacks = new Map<string, { resolve: (v: unknown) => void; reject: (e: Error) => void; timer: ReturnType<typeof setTimeout> }>();
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private subscribedTopics = new Map<string, { type: string; throttleRate?: number }>();
  private messageQueue: RosMessage[] = [];
  private idCounter = 0;
  private lastPong = 0;

  constructor(config: RosBridgeConfig) {
    this.config = {
      url: config.url,
      reconnect: config.reconnect ?? true,
      maxReconnectAttempts: config.maxReconnectAttempts ?? 15,
      reconnectBaseDelay: config.reconnectBaseDelay ?? 1000,
      heartbeatInterval: config.heartbeatInterval ?? 10000,
      messageQueueSize: config.messageQueueSize ?? 100,
      ssl: config.ssl ?? config.url.startsWith("wss"),
    };
  }

  // ─── Connection ───

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN || this.ws?.readyState === WebSocket.CONNECTING) return;
    this.setState("connecting");

    try {
      this.ws = new WebSocket(this.config.url);

      this.ws.onopen = () => {
        console.log("[ROSBridge] ✅ Connected to", this.config.url);
        this.reconnectAttempts = 0;
        this.lastPong = Date.now();
        this.setState("connected");

        // Re-subscribe to previously active topics
        this.subscribedTopics.forEach((info, topic) => {
          this.sendRaw({ op: "subscribe", topic, type: info.type, ...(info.throttleRate ? { throttle_rate: info.throttleRate } : {}) });
        });

        // Flush message queue
        this.flushQueue();

        // Start heartbeat
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data as string) as RosMessage;
          this.handleMessage(msg);
        } catch (err) {
          console.warn("[ROSBridge] Parse error:", err);
        }
      };

      this.ws.onclose = (event) => {
        console.log(`[ROSBridge] Connection closed (code: ${event.code})`);
        this.cleanup();
        this.setState("disconnected");
        this.scheduleReconnect();
      };

      this.ws.onerror = () => {
        console.warn("[ROSBridge] WebSocket error");
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
    this.cleanup();
    this.ws?.close();
    this.ws = null;
    this.setState("disconnected");
  }

  private cleanup(): void {
    if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
    if (this.heartbeatTimer) { clearInterval(this.heartbeatTimer); this.heartbeatTimer = null; }
    this.ws = null;
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

  // ─── Heartbeat ───

  private startHeartbeat(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      if (!this.isConnected) return;
      // Check if we received any message recently
      if (Date.now() - this.lastPong > this.config.heartbeatInterval * 3) {
        console.warn("[ROSBridge] Heartbeat timeout, reconnecting...");
        this.ws?.close();
        return;
      }
      // Send a lightweight op to keep connection alive
      this.sendRaw({ op: "ping" });
    }, this.config.heartbeatInterval);
  }

  // ─── Message Queue ───

  private flushQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected) {
      const msg = this.messageQueue.shift()!;
      this.sendRaw(msg);
    }
  }

  private enqueue(msg: RosMessage): void {
    if (this.messageQueue.length >= this.config.messageQueueSize) {
      this.messageQueue.shift(); // Drop oldest
    }
    this.messageQueue.push(msg);
  }

  // ─── State ───

  private setState(state: ConnectionState): void {
    if (this.state === state) return;
    this.state = state;
    this.stateListeners.forEach((fn) => fn(state));
  }

  get connectionState(): ConnectionState { return this.state; }
  get isConnected(): boolean { return this.state === "connected" && this.ws?.readyState === WebSocket.OPEN; }

  onStateChange(fn: Listener): () => void {
    this.stateListeners.add(fn);
    return () => this.stateListeners.delete(fn);
  }

  // ─── Topics ───

  subscribe(topic: string, type: string, callback: TopicCallback, throttleRate?: number): () => void {
    if (!this.topicCallbacks.has(topic)) this.topicCallbacks.set(topic, new Set());
    this.topicCallbacks.get(topic)!.add(callback);
    this.subscribedTopics.set(topic, { type, throttleRate });

    if (this.isConnected) {
      this.sendRaw({ op: "subscribe", topic, type, ...(throttleRate ? { throttle_rate: throttleRate } : {}) });
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

  publish(topic: string, type: string, msg: unknown): void {
    this.send({ op: "publish", topic, msg });
  }

  // ─── Services ───

  callService<T = unknown>(service: string, args?: unknown, timeout = 15000): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = `srv_${++this.idCounter}`;
      const timer = setTimeout(() => {
        this.serviceCallbacks.delete(id);
        reject(new Error(`Service call timeout: ${service}`));
      }, timeout);

      this.serviceCallbacks.set(id, {
        resolve: (result) => resolve(result as T),
        reject,
        timer,
      });

      this.send({ op: "call_service", id, service, args: args ?? {} });
    });
  }

  // ─── Actions ───

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
    this.lastPong = Date.now();

    switch (msg.op) {
      case "publish": {
        const topic = msg.topic as string;
        const callbacks = this.topicCallbacks.get(topic);
        callbacks?.forEach((cb) => {
          try { cb(msg.msg); } catch (e) { console.error(`[ROSBridge] Callback error on ${topic}:`, e); }
        });
        break;
      }
      case "service_response": {
        const id = msg.id as string;
        const entry = this.serviceCallbacks.get(id);
        if (entry) {
          this.serviceCallbacks.delete(id);
          clearTimeout(entry.timer);
          if (msg.result === false) {
            entry.reject(new Error(`Service failed: ${msg.values ?? "unknown"}`));
          } else {
            entry.resolve(msg.values ?? msg.result);
          }
        }
        break;
      }
      case "action_feedback":
        this.stateListeners.forEach(() => {}); // Notify via event system if needed
        break;
      case "action_result":
        break;
      case "pong":
        break;
      default:
        break;
    }
  }

  // ─── Transport ───

  private send(msg: RosMessage): void {
    if (!this.isConnected) {
      this.enqueue(msg);
      return;
    }
    this.sendRaw(msg);
  }

  private sendRaw(msg: RosMessage): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify(msg));
  }

  // ─── Tire Production Line Helpers ───

  /** Send velocity command (geometry_msgs/Twist) */
  sendCmdVel(linearX: number, angularZ: number, topic = "/cmd_vel"): void {
    this.publish(topic, "geometry_msgs/msg/Twist", {
      linear: { x: linearX, y: 0, z: 0 },
      angular: { x: 0, y: 0, z: angularZ },
    });
  }

  /** Send Nav2 goal */
  sendNav2Goal(x: number, y: number, theta: number): string {
    return this.sendActionGoal("/navigate_to_pose", "nav2_msgs/action/NavigateToPose", {
      pose: {
        header: { frame_id: "map", stamp: { sec: 0, nanosec: 0 } },
        pose: {
          position: { x, y, z: 0 },
          orientation: { x: 0, y: 0, z: Math.sin(theta / 2), w: Math.cos(theta / 2) },
        },
      },
    });
  }

  /** Emergency stop */
  emergencyStop(): void {
    this.sendCmdVel(0, 0);
    this.callService("/emergency_stop", { data: true }).catch(() => {});
    this.callService("/tire_line/emergency_stop").catch(() => {});
  }

  /** Start tire inspection */
  startTireInspection(): Promise<{ success: boolean; message: string }> {
    return this.callService("/tire_line/start_inspection");
  }

  /** Set conveyor belt */
  setConveyor(running: boolean): Promise<{ success: boolean; message: string }> {
    return this.callService("/tire_line/set_conveyor", { data: running });
  }

  /** Get line status */
  getLineStatus(): Promise<{ success: boolean; message: string }> {
    return this.callService("/tire_line/get_line_status");
  }

  /** Subscribe to production stats */
  onProductionStats(callback: (data: unknown) => void): () => void {
    return this.subscribe("/tire_line/production_stats", "std_msgs/msg/String", (msg: any) => {
      try { callback(JSON.parse(msg.data)); } catch { callback(msg); }
    }, 5000);
  }

  /** Subscribe to defect alerts */
  onDefectAlert(callback: (data: unknown) => void): () => void {
    return this.subscribe("/tire_line/defect_alert", "std_msgs/msg/String", (msg: any) => {
      try { callback(JSON.parse(msg.data)); } catch { callback(msg); }
    });
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

  /** Subscribe to camera compressed image */
  onCameraImage(callback: (data: { format: string; data: string }) => void, topic = "/camera/image/compressed"): () => void {
    return this.subscribe(topic, "sensor_msgs/msg/CompressedImage", callback as TopicCallback, 100);
  }

  /** Subscribe to joint states */
  onJointStates(callback: (data: unknown) => void): () => void {
    return this.subscribe("/joint_states", "sensor_msgs/msg/JointState", callback, 100);
  }

  /** Subscribe to IMU */
  onIMU(callback: (data: unknown) => void, topic = "/imu/data"): () => void {
    return this.subscribe(topic, "sensor_msgs/msg/Imu", callback, 100);
  }

  /** Subscribe to diagnostics */
  onDiagnostics(callback: (data: unknown) => void): () => void {
    return this.subscribe("/diagnostics", "diagnostic_msgs/msg/DiagnosticArray", callback, 2000);
  }
}

// ─── Singleton ───

let _instance: RosBridgeClient | null = null;

export function getRosBridgeClient(url?: string): RosBridgeClient {
  if (!_instance) {
    _instance = new RosBridgeClient({ url: url ?? "ws://localhost:9090" });
  }
  return _instance;
}

export function destroyRosBridgeClient(): void {
  _instance?.disconnect();
  _instance = null;
}
