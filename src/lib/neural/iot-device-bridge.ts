/**
 * ─── IoT Device Bridge v5 ───
 * REST-based bridge for MQTT communication via Edge Function (mqtt-bridge).
 * v5: Persistent auto-connect — once connected, stays connected across page reloads.
 *     Only disconnects when admin explicitly clicks "Desconectar".
 *     Includes heartbeat (health check every 60s) and auto-reconnect on failure.
 */

const MQTT_PERSIST_KEY = "orion_mqtt_connected";
const MQTT_HEARTBEAT_INTERVAL = 60_000; // 60s
const MQTT_RECONNECT_DELAY = 5_000; // 5s
const MQTT_MAX_RECONNECT_ATTEMPTS = 720; // 720 × 5s = 1h of retrying

export type IoTDeviceType = "light" | "sensor" | "robot" | "camera" | "thermostat" | "speaker" | "plug" | "custom";
export type IoTDeviceStatus = "online" | "offline" | "error" | "unknown";

export interface IoTDevice {
  id: string;
  name: string;
  type: IoTDeviceType;
  status: IoTDeviceStatus;
  topic: string;
  lastValue?: any;
  lastSeen: number;
  metadata?: Record<string, any>;
}

export interface IoTMessage {
  topic: string;
  payload: any;
  timestamp: number;
  direction: "inbound" | "outbound";
  qos?: 0 | 1 | 2;
}

export interface ConnectionDiagnostics {
  connected: boolean;
  brokerUrl: string | null;
  protocol: string;
  lastConnectedAt: number | null;
  lastDisconnectedAt: number | null;
  reconnectAttempts: number;
  lastError: string | null;
  latencyMs: number | null;
  healthCheckResult: HealthCheckResult | null;
  uptime: number | null;
  messageCount: number;
}

export interface HealthCheckResult {
  healthy: boolean;
  broker: string;
  latencyMs: number;
  message: string;
  ports?: { tls: number; wss: number; rest: number };
  error?: string;
}

type IoTEventType = "connected" | "disconnected" | "message" | "device_update" | "error" | "health_check" | "reconnecting";
type IoTEventCallback = (event: { type: IoTEventType; data: any }) => void;

export class IoTDeviceBridge {
  private devices = new Map<string, IoTDevice>();
  private listeners: IoTEventCallback[] = [];
  private messageLog: IoTMessage[] = [];
  private _connected = false;
  private brokerUrl: string | null = null;
  private _lastConnectedAt: number | null = null;
  private _lastDisconnectedAt: number | null = null;
  private _reconnectAttempts = 0;
  private _lastError: string | null = null;
  private _latencyMs: number | null = null;
  private _healthCheckResult: HealthCheckResult | null = null;
  private _supabaseClient: any = null;
  private _heartbeatId: number | null = null;
  private _reconnectTimeoutId: number | null = null;
  private _autoConnectInitialized = false;

  get connected() { return this._connected; }
  get deviceList(): IoTDevice[] { return Array.from(this.devices.values()); }
  get messages(): IoTMessage[] { return [...this.messageLog]; }

  on(cb: IoTEventCallback) { this.listeners.push(cb); }
  off(cb: IoTEventCallback) { this.listeners = this.listeners.filter(l => l !== cb); }
  private emit(type: IoTEventType, data: any) {
    this.listeners.forEach(l => {
      try { l({ type, data }); } catch (e) { console.warn("[IoTBridge] Listener error:", e); }
    });
  }

  registerDevice(device: Omit<IoTDevice, "lastSeen" | "status">): void {
    this.devices.set(device.id, { ...device, status: "unknown", lastSeen: 0 });
  }

  /**
   * ─── MQTT Topic Architecture ───
   * home/{room}/{device_type}  → Smart Home devices
   * robot/{id}/{data_type}     → Robotics telemetry
   * orion/                     → Orion system topics
   * assistant/                 → Voice assistant bridge
   * sensor/{id}                → Standalone sensors
   */
  registerDefaults(): void {
    const defaults: Array<Omit<IoTDevice, "lastSeen" | "status">> = [
      { id: "luz_sala", name: "Luz da Sala", type: "light", topic: "home/sala/luz" },
      { id: "luz_escritorio", name: "Luz do Escritório", type: "light", topic: "home/escritorio/luz" },
      { id: "luz_quarto", name: "Luz do Quarto", type: "light", topic: "home/quarto/luz" },
      { id: "luz_cozinha", name: "Luz da Cozinha", type: "light", topic: "home/cozinha/luz" },
      { id: "temp_sala", name: "Temperatura Sala", type: "sensor", topic: "home/sala/temperatura" },
      { id: "temp_escritorio", name: "Temperatura Escritório", type: "sensor", topic: "home/escritorio/temperatura" },
      { id: "temp_quarto", name: "Temperatura Quarto", type: "sensor", topic: "home/quarto/temperatura" },
      { id: "sensor_gas", name: "Sensor de Gás", type: "sensor", topic: "home/cozinha/sensor_gas", metadata: { alert: true } },
      { id: "camera_entrada", name: "Câmera Entrada", type: "camera", topic: "home/entrada/camera" },
      { id: "camera_garagem", name: "Câmera Garagem", type: "camera", topic: "home/garagem/camera" },
      { id: "termostato", name: "Termostato Central", type: "thermostat", topic: "home/termostato" },
      { id: "portao", name: "Portão Garagem", type: "plug", topic: "home/portao" },
      { id: "robo_principal", name: "Robô Principal", type: "robot", topic: "robot/main/status" },
      { id: "speaker_orion", name: "Speaker Orion", type: "speaker", topic: "orion/speaker/control" },
      { id: "alexa_echo", name: "Amazon Echo (Alexa)", type: "speaker", topic: "assistant/alexa", metadata: { protocol: "MQTT", brand: "Amazon" } },
    ];
    defaults.forEach(d => this.registerDevice(d));
  }

  private async getSupabase() {
    if (!this._supabaseClient) {
      const { supabase } = await import("@/integrations/supabase/client");
      this._supabaseClient = supabase;
    }
    return this._supabaseClient;
  }

  private async callEdge(body: Record<string, unknown>): Promise<{ data: any; error: any }> {
    try {
      const supabase = await this.getSupabase();
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session) {
        return { data: null, error: { message: "Usuário não autenticado. Faça login para usar dispositivos IoT." } };
      }
      const result = await supabase.functions.invoke("mqtt-bridge", { body });
      
      // supabase.functions.invoke returns error as FunctionsHttpError for non-2xx
      if (result.error) {
        let errorMsg = "Erro na Edge Function";
        try {
          // FunctionsHttpError has context with body
          if (result.error.context) {
            const errBody = await result.error.context.json();
            errorMsg = errBody?.error || errBody?.message || result.error.message;
          } else {
            errorMsg = result.error.message || errorMsg;
          }
        } catch {
          errorMsg = result.error.message || errorMsg;
        }
        return { data: null, error: { message: errorMsg } };
      }
      
      return { data: result.data, error: null };
    } catch (err: any) {
      return { data: null, error: { message: err.message || "Falha na comunicação com Edge Function" } };
    }
  }

  /**
   * Connect via Edge Function REST API.
   * Validates credentials by doing a health_check publish to the broker.
   * Starts heartbeat and persists connection state.
   */
  async connectViaEdgeFunction(): Promise<boolean> {
    try {
      const startMs = Date.now();

      const { data, error } = await this.callEdge({ action: "health_check" });

      if (error) {
        this._lastError = `Edge Function error: ${error.message}`;
        this.emit("error", { message: this._lastError });
        this._scheduleReconnect();
        return false;
      }

      if (!data?.healthy) {
        this._lastError = data?.message || data?.error || "Broker não respondeu";
        this._healthCheckResult = data;
        this.emit("error", { message: this._lastError });
        this.emit("health_check", data);
        this._scheduleReconnect();
        return false;
      }

      const { data: config } = await this.callEdge({ action: "get_config" });
      this.brokerUrl = config?.broker || data?.broker || "hivemq.cloud";
      this._latencyMs = data?.latencyMs || (Date.now() - startMs);
      this._lastConnectedAt = Date.now();
      this._connected = true;
      this._reconnectAttempts = 0;
      this._lastError = null;
      this._healthCheckResult = data;

      // Persist connection preference
      try { localStorage.setItem(MQTT_PERSIST_KEY, "true"); } catch {}

      this.emit("connected", {
        url: this.brokerUrl,
        latencyMs: this._latencyMs,
        method: "REST via Edge Function",
      });
      this.emit("health_check", data);

      if (this.devices.size === 0) {
        this.registerDefaults();
      }

      // Start heartbeat
      this._startHeartbeat();

      console.log("[IoTBridge] ✅ Connected via Edge Function REST", {
        broker: this.brokerUrl,
        latency: `${this._latencyMs}ms`,
        persistent: true,
      });

      return true;
    } catch (err: any) {
      this._lastError = "Erro ao conectar via Edge Function: " + err.message;
      this.emit("error", { message: this._lastError });
      this._scheduleReconnect();
      return false;
    }
  }

  // Legacy alias
  async connect(_brokerUrl?: string): Promise<boolean> {
    return this.connectViaEdgeFunction();
  }

  /**
   * Auto-connect if previously connected (called once on singleton init).
   * Only connects if user was previously connected and hasn't manually disconnected.
   */
  async autoConnect(): Promise<void> {
    if (this._autoConnectInitialized || this._connected) return;
    this._autoConnectInitialized = true;

    try {
      const persisted = localStorage.getItem(MQTT_PERSIST_KEY);
      if (persisted === "true") {
        console.log("[IoTBridge] 🔄 Auto-reconnecting (persistent session)...");
        this.emit("reconnecting", { reason: "auto-connect" });
        await this.connectViaEdgeFunction();
      }
    } catch {
      // localStorage unavailable
    }
  }

  /**
   * Heartbeat: health check every 60s. If unhealthy, trigger reconnect.
   */
  private _startHeartbeat(): void {
    this._stopHeartbeat();
    this._heartbeatId = window.setInterval(async () => {
      if (!this._connected) return;
      try {
        const result = await this.healthCheck();
        if (!result.healthy) {
          console.warn("[IoTBridge] ❤️‍🩹 Heartbeat failed, reconnecting...");
          this._connected = false;
          this._lastDisconnectedAt = Date.now();
          this.emit("disconnected", { reason: "heartbeat_failed" });
          this._scheduleReconnect();
        }
      } catch {
        console.warn("[IoTBridge] ❤️‍🩹 Heartbeat error, reconnecting...");
        this._connected = false;
        this._lastDisconnectedAt = Date.now();
        this.emit("disconnected", { reason: "heartbeat_error" });
        this._scheduleReconnect();
      }
    }, MQTT_HEARTBEAT_INTERVAL);
  }

  private _stopHeartbeat(): void {
    if (this._heartbeatId !== null) {
      clearInterval(this._heartbeatId);
      this._heartbeatId = null;
    }
  }

  /**
   * Schedule reconnect with exponential backoff (capped at 60s).
   */
  private _scheduleReconnect(): void {
    // Don't reconnect if admin manually disconnected
    try {
      if (localStorage.getItem(MQTT_PERSIST_KEY) !== "true") return;
    } catch {}

    if (this._reconnectAttempts >= MQTT_MAX_RECONNECT_ATTEMPTS) {
      console.error("[IoTBridge] ❌ Max reconnect attempts reached. Manual reconnect required.");
      this._lastError = "Máximo de tentativas de reconexão atingido. Reconecte manualmente.";
      this.emit("error", { message: this._lastError });
      return;
    }

    if (this._reconnectTimeoutId !== null) return; // already scheduled

    const delay = Math.min(MQTT_RECONNECT_DELAY * Math.pow(1.5, Math.min(this._reconnectAttempts, 10)), 60_000);
    this._reconnectAttempts++;

    console.log(`[IoTBridge] 🔄 Reconnect attempt ${this._reconnectAttempts} in ${Math.round(delay / 1000)}s...`);
    this.emit("reconnecting", { attempt: this._reconnectAttempts, delayMs: delay });

    this._reconnectTimeoutId = window.setTimeout(async () => {
      this._reconnectTimeoutId = null;
      await this.connectViaEdgeFunction();
    }, delay);
  }

  async healthCheck(): Promise<HealthCheckResult> {
    const { data, error } = await this.callEdge({ action: "health_check" });

    if (error) {
      const result: HealthCheckResult = {
        healthy: false, broker: this.brokerUrl || "unknown", latencyMs: 0,
        message: "Edge Function error: " + error.message, error: error.message,
      };
      this._healthCheckResult = result;
      this.emit("health_check", result);
      return result;
    }

    this._healthCheckResult = data as HealthCheckResult;

    // Update connection status based on health
    if (data?.healthy && !this._connected) {
      this._connected = true;
      this._lastConnectedAt = Date.now();
      this.emit("connected", { url: this.brokerUrl });
    } else if (!data?.healthy && this._connected) {
      this._connected = false;
      this._lastDisconnectedAt = Date.now();
      this.emit("disconnected", { reason: data?.message });
    }

    this.emit("health_check", this._healthCheckResult);
    return this._healthCheckResult;
  }

  /**
   * Publish message via Edge Function REST API (reliable, authenticated).
   */
  async publish(topic: string, payload: any, qos: 0 | 1 | 2 = 1): Promise<boolean> {
    return this.publishViaEdgeFunction(topic, payload, qos);
  }

  async publishViaEdgeFunction(topic: string, payload: any, qos: 0 | 1 | 2 = 1): Promise<boolean> {
    const { data, error } = await this.callEdge({
      action: "publish", topic, payload, qos,
    });

    const msg: IoTMessage = { topic, payload, timestamp: Date.now(), direction: "outbound", qos };
    this.messageLog = [...this.messageLog.slice(-199), msg];
    this.emit("message", msg);

    if (error) {
      this._lastError = "Publish falhou: " + error.message;
      this.emit("error", { message: this._lastError });
      return false;
    }

    return data?.success ?? false;
  }

  /**
   * Publish batch of messages via Edge Function.
   */
  async publishBatch(messages: Array<{ topic: string; payload: any; qos?: 0 | 1 | 2 }>): Promise<boolean> {
    const { data, error } = await this.callEdge({
      action: "publish_batch",
      messages: messages.map(m => ({
        topic: m.topic,
        payload: typeof m.payload === "string" ? m.payload : JSON.stringify(m.payload),
        qos: m.qos ?? 1,
      })),
    });

    if (error) {
      this._lastError = "Batch publish falhou: " + error.message;
      this.emit("error", { message: this._lastError });
      return false;
    }

    // Log all messages
    messages.forEach(m => {
      const msg: IoTMessage = { topic: m.topic, payload: m.payload, timestamp: Date.now(), direction: "outbound", qos: m.qos };
      this.messageLog = [...this.messageLog.slice(-199), msg];
      this.emit("message", msg);
    });

    return data?.success ?? false;
  }

  async sendDeviceCommand(deviceId: string, command: string, params?: Record<string, any>): Promise<boolean> {
    const { data, error } = await this.callEdge({
      action: "device_command", deviceId, command, params,
    });

    if (error) {
      this._lastError = `Comando ${command} falhou: ${error.message}`;
      this.emit("error", { message: this._lastError });
      return false;
    }

    // Update device status optimistically
    const device = this.devices.get(deviceId);
    if (device && data?.success) {
      device.lastSeen = Date.now();
      device.status = "online";
      this.emit("device_update", { device: { ...device } });
    }

    return data?.success ?? false;
  }

  /**
   * Discover smart home devices by publishing a discovery broadcast
   * and checking which devices respond via telemetry.
   */
  async discoverDevices(): Promise<IoTDevice[]> {
    if (!this._connected) {
      this._lastError = "Conecte ao MQTT primeiro";
      this.emit("error", { message: this._lastError });
      return [];
    }

    // Publish discovery broadcast
    await this.publish("orion/discovery", {
      action: "scan",
      timestamp: Date.now(),
      requestId: crypto.randomUUID(),
    }, 0);

    // Also publish to common smart home discovery topics
    await this.publishBatch([
      { topic: "homeassistant/status", payload: "online", qos: 0 },
      { topic: "assistant/command", payload: JSON.stringify({ action: "discover", timestamp: Date.now() }), qos: 0 },
    ]);

    // Check Supabase for recently active devices (telemetry in last 5 min)
    try {
      const supabase = await this.getSupabase();
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data: telemetry } = await (supabase.from("iot_telemetry") as any)
        .select("device_id, topic, payload, received_at")
        .gte("received_at", fiveMinAgo)
        .order("received_at", { ascending: false })
        .limit(50);

      if (telemetry && telemetry.length > 0) {
        const activeDeviceIds = new Set<string>();
        telemetry.forEach((t: any) => {
          activeDeviceIds.add(t.device_id);
          // Update matching registered devices
          for (const [, device] of this.devices) {
            if (device.id === t.device_id || device.topic === t.topic) {
              device.status = "online";
              device.lastSeen = new Date(t.received_at).getTime();
              device.lastValue = t.payload;
              this.emit("device_update", { device: { ...device } });
            }
          }
        });
      }

      // Also check iot_devices table for registered devices
      const { data: registeredDevices } = await (supabase.from("iot_devices") as any)
        .select("device_id, name, type, status, last_seen_at, metadata")
        .limit(50);

      if (registeredDevices) {
        registeredDevices.forEach((rd: any) => {
          if (!this.devices.has(rd.device_id)) {
            this.registerDevice({
              id: rd.device_id,
              name: rd.name || rd.device_id,
              type: (rd.type as IoTDeviceType) || "custom",
              topic: `device/${rd.device_id}/status`,
              metadata: rd.metadata,
            });
          }
          const device = this.devices.get(rd.device_id);
          if (device) {
            device.status = rd.status === "active" ? "online" : "offline";
            if (rd.last_seen_at) device.lastSeen = new Date(rd.last_seen_at).getTime();
            this.emit("device_update", { device: { ...device } });
          }
        });
      }
    } catch (err) {
      console.warn("[IoTBridge] Discovery DB check failed:", err);
    }

    return this.deviceList;
  }

  /**
   * Connect to Alexa via MQTT command bridge.
   * Sends a pairing request that a Home Assistant / Node-RED bridge can pick up.
   */
  async connectAlexa(): Promise<{ success: boolean; message: string }> {
    if (!this._connected) {
      const connected = await this.connectViaEdgeFunction();
      if (!connected) return { success: false, message: "Falha ao conectar ao broker MQTT" };
    }

    // Publish Alexa pairing command
    const success = await this.publish("assistant/command", {
      action: "pair",
      device: "alexa",
      protocol: "mqtt",
      capabilities: ["tts", "routine", "smart-home"],
      timestamp: Date.now(),
    }, 1);

    // Also publish to Alexa-specific topics
    await this.publish("alexa/discovery", {
      action: "discover",
      source: "orion",
      timestamp: Date.now(),
    }, 0);

    // Update Alexa device status
    const alexaDevice = this.devices.get("alexa_echo");
    if (alexaDevice) {
      alexaDevice.status = success ? "online" : "error";
      alexaDevice.lastSeen = Date.now();
      this.emit("device_update", { device: { ...alexaDevice } });
    }

    return {
      success,
      message: success
        ? "Comando de pareamento enviado para Alexa via MQTT. Configure o Skill 'Orion Bridge' na app Alexa para completar a integração."
        : "Falha ao enviar comando. Verifique a conexão MQTT.",
    };
  }

  getDiagnostics(): ConnectionDiagnostics {
    return {
      connected: this._connected,
      brokerUrl: this.brokerUrl,
      protocol: "MQTT via REST (Edge Function)",
      lastConnectedAt: this._lastConnectedAt,
      lastDisconnectedAt: this._lastDisconnectedAt,
      reconnectAttempts: this._reconnectAttempts,
      lastError: this._lastError,
      latencyMs: this._latencyMs,
      healthCheckResult: this._healthCheckResult,
      uptime: this._connected && this._lastConnectedAt ? Date.now() - this._lastConnectedAt : null,
      messageCount: this.messageLog.length,
    };
  }

  /**
   * Manual disconnect — clears persistence so auto-reconnect won't trigger.
   * Only admin should call this (via the "Desconectar" button).
   */
  disconnect(): void {
    // Clear persistence — prevents auto-reconnect
    try { localStorage.removeItem(MQTT_PERSIST_KEY); } catch {}

    // Cancel any pending reconnect
    if (this._reconnectTimeoutId !== null) {
      clearTimeout(this._reconnectTimeoutId);
      this._reconnectTimeoutId = null;
    }

    // Stop heartbeat
    this._stopHeartbeat();

    // Stop all polling subscriptions
    this._pollingIntervals.forEach(id => clearInterval(id));
    this._pollingIntervals.clear();
    this.brokerUrl = null;
    this._connected = false;
    this._lastDisconnectedAt = Date.now();
    this._reconnectAttempts = 0;
    this.emit("disconnected", { reason: "manual" });
    console.log("[IoTBridge] 🔌 Disconnected manually by admin.");
  }

  // ─── Polling-based subscription (REST mode cannot do real MQTT subscribe) ───
  private _pollingIntervals = new Map<string, number>();

  /**
   * Subscribe to a topic by polling iot_telemetry table for new messages.
   * Real MQTT subscribe isn't possible via REST — this polls Supabase every intervalMs.
   */
  subscribe(topic: string, intervalMs = 5000): void {
    if (this._pollingIntervals.has(topic)) return;
    
    let lastSeen = new Date().toISOString();
    
    const pollId = window.setInterval(async () => {
      try {
        const supabase = await this.getSupabase();
        const { data } = await (supabase.from("iot_telemetry") as any)
          .select("device_id, topic, payload, received_at")
          .eq("topic", topic)
          .gt("received_at", lastSeen)
          .order("received_at", { ascending: true })
          .limit(20);
        
        if (data && data.length > 0) {
          data.forEach((row: any) => {
            const msg: IoTMessage = {
              topic: row.topic,
              payload: row.payload,
              timestamp: new Date(row.received_at).getTime(),
              direction: "inbound",
            };
            this.messageLog = [...this.messageLog.slice(-199), msg];
            this.emit("message", msg);
            
            // Update device if registered
            for (const [, device] of this.devices) {
              if (device.id === row.device_id || device.topic === row.topic) {
                device.status = "online";
                device.lastSeen = new Date(row.received_at).getTime();
                device.lastValue = row.payload;
                this.emit("device_update", { device: { ...device } });
              }
            }
          });
          lastSeen = data[data.length - 1].received_at;
        }
      } catch (err) {
        console.warn(`[IoTBridge] Poll error for ${topic}:`, err);
      }
    }, intervalMs);
    
    this._pollingIntervals.set(topic, pollId);
    console.log(`[IoTBridge] Subscribed to ${topic} (polling every ${intervalMs}ms)`);
  }

  unsubscribe(topic: string): void {
    const pollId = this._pollingIntervals.get(topic);
    if (pollId) {
      clearInterval(pollId);
      this._pollingIntervals.delete(topic);
      console.log(`[IoTBridge] Unsubscribed from ${topic}`);
    }
  }

  /**
   * Subscribe to all smart home device topics via polling.
   */
  subscribeSmartHome(): void {
    const homeTopics = new Set<string>();
    this.devices.forEach(d => {
      if (d.topic.startsWith("home/") || d.topic.startsWith("assistant/")) {
        homeTopics.add(d.topic);
      }
    });
    homeTopics.forEach(t => this.subscribe(t, 5000));
  }

  clearLog(): void {
    this.messageLog = [];
  }

  // ─── Voice/AI command helpers ───

  async toggleLight(deviceId: string, on: boolean): Promise<string> {
    const device = this.devices.get(deviceId);
    if (!device) return `Dispositivo ${deviceId} não encontrado`;
    const success = await this.sendDeviceCommand(deviceId, on ? "on" : "off");
    if (!success) {
      await this.publish(device.topic, { command: on ? "on" : "off", timestamp: Date.now() });
    }
    return `${device.name} ${on ? "ligada" : "desligada"}`;
  }

  async getTemperature(deviceId: string): Promise<string> {
    const device = this.devices.get(deviceId);
    if (!device) return "Sensor de temperatura não encontrado";
    if (device.lastValue !== undefined) {
      const temp = typeof device.lastValue === "object" ? device.lastValue.temperature ?? device.lastValue.value : device.lastValue;
      return `${device.name}: ${temp}°C`;
    }
    return `${device.name}: sem leitura recente`;
  }

  async getRobotStatus(): Promise<string> {
    const robot = Array.from(this.devices.values()).find(d => d.type === "robot");
    if (!robot) return "Nenhum robô registrado no sistema";
    if (robot.status === "online" && robot.lastValue) {
      const status = typeof robot.lastValue === "object"
        ? `bateria ${robot.lastValue.battery ?? "?"}%, modo ${robot.lastValue.mode ?? "standby"}`
        : String(robot.lastValue);
      return `${robot.name} online: ${status}`;
    }
    return `${robot.name}: status ${robot.status}`;
  }

  async sendRobotCommand(command: string): Promise<string> {
    const robot = Array.from(this.devices.values()).find(d => d.type === "robot");
    if (!robot) return "Nenhum robô registrado";
    await this.sendDeviceCommand(robot.id, command);
    return `Comando "${command}" enviado para ${robot.name}`;
  }

  getDevicesSummary(): string {
    const total = this.devices.size;
    const online = Array.from(this.devices.values()).filter(d => d.status === "online").length;
    const types = new Map<string, number>();
    this.devices.forEach(d => types.set(d.type, (types.get(d.type) || 0) + 1));
    const typeSummary = Array.from(types.entries()).map(([t, c]) => `${c} ${t}`).join(", ");
    return `${total} dispositivos (${online} online): ${typeSummary}`;
  }
}

// Singleton — auto-connects if previously connected
export const iotBridge = new IoTDeviceBridge();

// Trigger auto-connect after a short delay (wait for auth to be ready)
if (typeof window !== "undefined") {
  setTimeout(() => iotBridge.autoConnect(), 3000);
}
