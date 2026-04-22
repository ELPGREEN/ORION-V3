/**
 * ─── IoT Intelligence Agent Bridge ───
 * Integrates IoT devices with OpenRouter LLM agents
 * Enables natural language control of industrial IoT devices
 */

import { supabase } from "@/integrations/supabase/client";
import { iotBridge, type IoTDevice, type IoTMessage } from "./iot-device-bridge";

// ═══ OpenRouter LLM Integration for IoT ═══

interface LLM IoTCommand {
  deviceId: string;
  command: string;
  confidence: number;
  reasoning: string;
}

interface AgentContext {
  devices: IoTDevice[];
  recentMessages: IoTMessage[];
  alerts: string[];
  diagnostic: string;
}

class IoTIntelligenceAgent {
  private apiKey: string | null = null;
  private model = "openrouter/free";

  constructor() {
    this.initFromEnv();
  }

  private initFromEnv() {
    this.apiKey = import.meta.env.VITE_OPENROUTER_API_KEY || null;
  }

  async analyzeAndExecute(
    userCommand: string,
    context: AgentContext
  ): Promise<{ action: string; devices: string[]; confirmation: string }> {
    if (!this.apiKey) {
      return this.fallbackAnalyze(userCommand, context);
    }

    const prompt = this.buildIoTPrompt(userCommand, context);

    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`,
          "HTTP-Referer": "https://orion-ai.com",
          "X-Title": "Orion IoT Agent",
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: "system",
              content: `You are Orion IoT Control Agent. Analyze user commands and control IoT devices.
              
Available devices:
${context.devices.map(d => `- ${d.name} (${d.type}): ${d.status}`).join("\n")}

Recent activity:
${context.recentMessages.slice(-5).map(m => `${m.direction}: ${m.topic} → ${JSON.stringify(m.payload)}`).join("\n")}

Alerts: ${context.alerts.join(", ") || "none"}

Response format (JSON):
{
  "action": "on|off|set|get|status|alert",
  "devices": ["device_id_1", "device_id_2"],
  "value": "any value for set action",
  "confirmation": "human readable confirmation"
}`,
            },
            { role: "user", content: userCommand },
          ],
          max_tokens: 200,
        }),
      });

      const data = await response.json();
      const content = data.choices?.[0]?.message?.content || "";

      return this.parseLLMResponse(content);
    } catch (error) {
      console.error("[IoT Agent] LLM failed, using fallback:", error);
      return this.fallbackAnalyze(userCommand, context);
    }
  }

  private buildIoTPrompt(command: string, context: AgentContext): string {
    return `
Command: ${command}

Devices:
${context.devices.map((d, i) => `${i + 1}. ${d.name} (${d.type}) - ${d.status}`).join("\n")}

Provide JSON response with action, target devices, and confirmation.
`;
  }

  private parseLLMResponse(content: string): { action: string; devices: string[]; confirmation: string } {
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          action: parsed.action || "status",
          devices: parsed.devices || [],
          confirmation: parsed.confirmation || "Command processed",
        };
      }
    } catch {}

    return this.fallbackAnalyzeCommand(content);
  }

  private fallbackAnalyze(
    command: string,
    context: AgentContext
  ): { action: string; devices: string[]; confirmation: string } {
    const lower = command.toLowerCase();

    if (lower.includes("liga") || lower.includes("on") || lower.includes("ativ")) {
      const target = context.devices.find(
        (d) => lower.includes(d.name.toLowerCase()) || d.type === "light"
      );
      return {
        action: "on",
        devices: target ? [target.id] : context.devices.filter((d) => d.type === "light").map((d) => d.id),
        confirmation: target ? `Ligando ${target.name}` : "Ligando luzes",
      };
    }

    if (lower.includes("desliga") || lower.includes("off") || lower.includes("desativ")) {
      const target = context.devices.find((d) => lower.includes(d.name.toLowerCase()));
      return {
        action: "off",
        devices: target ? [target.id] : context.devices.map((d) => d.id),
        confirmation: target ? `Desligando ${target.name}` : "Desligando dispositivos",
      };
    }

    if (lower.includes("status") || lower.includes("estado") || lower.includes("como")) {
      return {
        action: "status",
        devices: [],
        confirmation: `${context.devices.filter((d) => d.status === "online").length} dispositivos online`,
      };
    }

    return {
      action: "status",
      devices: [],
      confirmation: "Comando não reconhecido. Listando dispositivos...",
    };
  }

  private fallbackAnalyzeCommand(
    content: string
  ): { action: string; devices: string[]; confirmation: string } {
    const lower = content.toLowerCase();

    if (lower.includes("on") || lower.includes("liga") || lower.includes("ativ")) {
      return { action: "on", devices: [], confirmation: "Ligando dispositivo" };
    }
    if (lower.includes("off") || lower.includes("desliga")) {
      return { action: "off", devices: [], confirmation: "Desligando dispositivo" };
    }

    return { action: "status", devices: [], confirmation: content.slice(0, 100) };
  }

  setModel(model: string) {
    this.model = model;
  }
}

// ═══ IoT Agent Factory ═══

export const iotIntelligenceAgent = new IoTIntelligenceAgent();

export type IoTAgentCapability =
  | "voice_control"
  | "scheduling"
  | "automation"
  | "energy_monitoring"
  | "security"
  | "maintenance_prediction"
  | "scene_control";

export interface IoTAgent {
  id: string;
  name: string;
  capability: IoTAgentCapability;
  devices: string[];
  enabled: boolean;
  lastTriggered?: number;
}

const registeredAgents: Map<string, IoTAgent> = new Map();

export function createIoTAgent(
  name: string,
  capability: IoTAgentCapability,
  deviceIds: string[]
): IoTAgent {
  const agent: IoTAgent = {
    id: `agent_${capability}_${Date.now()}`,
    name,
    capability,
    devices: deviceIds,
    enabled: true,
  };

  registeredAgents.set(agent.id, agent);
  return agent;
}

export function getIoTAgents(): IoTAgent[] {
  return Array.from(registeredAgents.values());
}

export function toggleAgent(agentId: string, enabled: boolean): void {
  const agent = registeredAgents.get(agentId);
  if (agent) {
    agent.enabled = enabled;
  }
}

export async function triggerAgent(agentId: string): Promise<string> {
  const agent = registeredAgents.get(agentId);
  if (!agent || !agent.enabled) {
    return "Agent not found or disabled";
  }

  agent.lastTriggered = Date.now();

  const devices = agent.devices.map((id) => iotBridge.getDevice(id)).filter(Boolean) as IoTDevice[];

  const context: AgentContext = {
    devices,
    recentMessages: [],
    alerts: [],
    diagnostic: `Triggering ${agent.capability} for ${agent.name}`,
  };

  const result = await iotIntelligenceAgent.analyzeAndExecute(
    `Execute ${agent.capability} automation`,
    context
  );

  return result.confirmation;
}

// ═══ Scene Management ═══

export interface IoTScene {
  id: string;
  name: string;
  actions: Array<{ deviceId: string; action: string; value?: unknown }>;
  triggers?: Array<{ type: "time" | "device"; condition: string }>;
}

export const savedScenes: Map<string, IoTScene> = new Map();

export function createScene(name: string, actions: IoTScene["actions"]): IoTScene {
  const scene: IoTScene = {
    id: `scene_${Date.now()}`,
    name,
    actions,
  };
  savedScenes.set(scene.id, scene);
  return scene;
}

export function activateScene(sceneId: string): Promise<string> {
  const scene = savedScenes.get(sceneId);
  if (!scene) {
    return Promise.resolve("Scene not found");
  }

  const results: string[] = [];

  for (const action of scene.actions) {
    try {
      iotBridge.publish(`device/${action.deviceId}/command`, {
        action: action.action,
        value: action.value,
      });
      results.push(`✓ ${action.deviceId}: ${action.action}`);
    } catch {
      results.push(`✗ ${action.deviceId}: failed`);
    }
  }

  return Promise.resolve(results.join("\n"));
}

export function getScenes(): IoTScene[] {
  return Array.from(savedScenes.values());
}

// ═══ IoT Analytics with LLM ═══

export interface IoTAnalytics {
  totalDevices: number;
  onlineDevices: number;
  messagesToday: number;
  averageLatency: number;
  alerts: string[];
  recommendations: string[];
}

export async function getIoTAnalytics(): Promise<IoTAnalytics> {
  const devices = iotBridge.deviceList;
  const onlineDevices = devices.filter((d) => d.status === "online").length;

  const diagnostics = await iotBridge.getDiagnostics();
  const latency = diagnostics.latencyMs || 0;

  const alerts: string[] = [];
  if (onlineDevices < devices.length * 0.5) {
    alerts.push("Menos de 50% dos dispositivos online");
  }
  if (latency > 500) {
    alerts.push(`Latência alta: ${latency}ms`);
  }

  const recommendations: string[] = [];
  if (onlineDevices < devices.length) {
    recommendations.push("Verificar conexão dos dispositivos offline");
  }
  if (devices.length === 0) {
    recommendations.push("Adicionar dispositivos IoT");
  }

  return {
    totalDevices: devices.length,
    onlineDevices,
    messagesToday: diagnostics.messageCount,
    averageLatency: latency,
    alerts,
    recommendations,
  };
}

export async function generateIoTReport(): Promise<string> {
  const analytics = await getIoTAnalytics();

  if (import.meta.env.VITE_OPENROUTER_API_KEY) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
          "HTTP-Referer": "https://orion-ai.com",
        },
        body: JSON.stringify({
          model: "openrouter/free",
          messages: [
            {
              role: "system",
              content: "You are Orion IoT Analytics. Generate a brief report in Portuguese.",
            },
            {
              role: "user",
              content: `Generate IoT report:
- ${analytics.onlineDevices}/${analytics.totalDevices} devices online
- ${analytics.messagesToday} messages today
- ${analytics.averageLatency}ms latency
- Alerts: ${analytics.alerts.join(", ") || "none"}`,
            },
          ],
          max_tokens: 300,
        }),
      });

      const data = await response.json();
      return data.choices?.[0]?.message?.content || "Report generation failed";
    } catch {}
  }

  return `Relatório IoT:
- Dispositivos online: ${analytics.onlineDevices}/${analytics.totalDevices}
- Mensagens hoje: ${analytics.messagesToday}
- Latência média: ${analytics.averageLatency}ms
${analytics.alerts.length > 0 ? `- Alertas: ${analytics.alerts.join(", ")}` : ""}
${analytics.recommendations.length > 0 ? `- Recomendações: ${analytics.recommendations.join(", ")}` : ""}`;
}

// ═══ MQTT Industrial Integration ═══

export interface IndustrialMQTTMessage {
  equipmentId: string;
  sensorType: string;
  value: number;
  unit: string;
  timestamp: number;
  quality: "good" | "uncertain" | "bad";
}

export async function publishIndustrialSensor(data: IndustrialMQTTMessage): Promise<void> {
  await iotBridge.publish(`industrial/sensors/${data.equipmentId}`, {
    ...data,
    timestamp: Date.now(),
  });
}

export async function subscribeToEquipment(
  equipmentId: string,
  callback: (data: IndustrialMQTTMessage) => void
): Promise<void> {
  iotBridge.subscribe(`industrial/sensors/${equipmentId}`, (message) => {
    callback(message.payload as IndustrialMQTTMessage);
  });
}

// ═══ BLE Device Integration ═══

export interface BLEDeviceInfo {
  id: string;
  name: string;
  rssi: number;
  services: string[];
  lastSeen: number;
}

const bleDevices: Map<string, BLEDeviceInfo> = new Map();

export function registerBLEDevice(device: BLEDeviceInfo): void {
  bleDevices.set(device.id, device);
}

export function getbledevices(): BLEDeviceInfo[] {
  return Array.from(bleDevices.values());
}

export async function connectBLEDevice(deviceId: string): Promise<boolean> {
  const device = bleDevices.get(deviceId);
  if (!device) return false;

  console.log(`[IoT] Connecting to BLE device: ${device.name}`);
  return true;
}

// ═══ Export all IoT functions ═══

export {
  iotBridge,
  type IoTDevice,
  type IoTMessage,
  type ConnectionDiagnostics,
  type HealthCheckResult,
} from "./iot-device-bridge";

export {
  CoAPBridge,
  AMQPBridge,
  WebRTCBridge,
  MatterBridge,
} from "./network-iot-protocols";
