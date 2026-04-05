/**
 * ─── Alexa Smart Home Bridge ───
 * Controls Alexa-linked devices from Orion's IoT panel.
 * Uses the amazon-auth edge function's dedicated actions.
 */

import { supabase } from "@/integrations/supabase/client";

// ─── Types ───

export interface AlexaDevice {
  id: string;
  name: string;
  type: "light" | "thermostat" | "plug" | "speaker" | "camera" | "lock" | "sensor" | "custom";
  online: boolean;
  capabilities: string[];
  state?: Record<string, any>;
  room?: string;
}

export interface AlexaCommandResult {
  success: boolean;
  device: string;
  action: string;
  message: string;
}

// ─── Edge Function Caller ───

async function callAmazonEdge(action: string, method = "GET", body?: unknown): Promise<any> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) throw new Error("Não autenticado — faça login primeiro");

  const BASE_URL = import.meta.env.VITE_SUPABASE_URL;
  const API_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";
  if (!BASE_URL) throw new Error("VITE_SUPABASE_URL não configurado");

  const fetchOpts: RequestInit = {
    method: body ? "POST" : method,
    headers: {
      Authorization: `Bearer ${token}`,
      apikey: API_KEY,
      "Content-Type": "application/json",
    },
  };
  if (body) fetchOpts.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}/functions/v1/amazon-auth?action=${action}`, fetchOpts);

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Amazon API error: ${res.status}`);
  }
  return res.json();
}

// ─── Connection Check ───

export async function isAmazonConnected(): Promise<boolean> {
  try {
    const data = await callAmazonEdge("status");
    return !!data?.connected;
  } catch {
    return false;
  }
}

// ─── Device Management ───

export async function listAlexaDevices(): Promise<AlexaDevice[]> {
  try {
    // First check if Amazon is connected
    const connected = await isAmazonConnected();
    if (!connected) {
      console.warn("[Alexa Smart Home] Amazon not connected");
      return [];
    }

    // Use the dedicated alexa_devices action from the edge function
    const data = await callAmazonEdge("alexa_devices");
    const appliances = data?.appliances || data?.endpoints || data?.devices || [];
    return appliances.map(mapAlexaDevice);
  } catch (e: any) {
    console.warn("[Alexa Smart Home] List devices error:", e.message);
    return [];
  }
}

export async function getDeviceState(deviceId: string): Promise<Record<string, any> | null> {
  try {
    // Use API proxy for specific device queries
    const data = await callAmazonEdge("api", "POST", {
      endpoint: `https://api.amazonalexa.com/v2/appliances/${deviceId}`,
      method: "GET",
    });
    return data?.state || data || null;
  } catch {
    return null;
  }
}

export async function controlDevice(
  deviceId: string,
  action: string,
  value?: any
): Promise<AlexaCommandResult> {
  const deviceName = deviceId;
  try {
    const data = await callAmazonEdge("api", "POST", {
      endpoint: `https://api.amazonalexa.com/v2/appliances/${deviceId}`,
      method: "PUT",
      payload: { action, value },
    });

    return {
      success: true,
      device: data?.deviceName || deviceName,
      action,
      message: data?.message || `${action} executado com sucesso`,
    };
  } catch (e: any) {
    return {
      success: false,
      device: deviceName,
      action,
      message: `Falha: ${e.message}`,
    };
  }
}

// ─── Convenience Functions ───

export async function turnOn(deviceId: string): Promise<AlexaCommandResult> {
  return controlDevice(deviceId, "turnOn");
}

export async function turnOff(deviceId: string): Promise<AlexaCommandResult> {
  return controlDevice(deviceId, "turnOff");
}

export async function setBrightness(deviceId: string, level: number): Promise<AlexaCommandResult> {
  return controlDevice(deviceId, "setBrightness", { brightness: Math.max(0, Math.min(100, level)) });
}

export async function setTemperature(deviceId: string, temp: number): Promise<AlexaCommandResult> {
  return controlDevice(deviceId, "setTargetTemperature", { targetTemperature: temp });
}

export async function setColor(deviceId: string, hue: number, saturation: number, brightness: number): Promise<AlexaCommandResult> {
  return controlDevice(deviceId, "setColor", { color: { hue, saturation, brightness } });
}

// ─── Voice Command Parsing ───

export function parseSmartHomeCommand(text: string): {
  action: string;
  target: string;
  value?: any;
} | null {
  const lower = text.toLowerCase();

  // Light commands
  const lightOn = lower.match(/(?:acend|lig|turn\s*on)\w*\s+(?:a\s+)?(?:luz|l[aâ]mpada|light)\s*(?:d[oae]\s+)?(.+)?/i);
  if (lightOn) return { action: "turnOn", target: lightOn[1]?.trim() || "all_lights" };

  const lightOff = lower.match(/(?:apag|deslig|turn\s*off)\w*\s+(?:a\s+)?(?:luz|l[aâ]mpada|light)\s*(?:d[oae]\s+)?(.+)?/i);
  if (lightOff) return { action: "turnOff", target: lightOff[1]?.trim() || "all_lights" };

  // Temperature
  const tempMatch = lower.match(/(?:temperatura|thermostat|ar[\s-]?condicionado)\s+(?:para?\s+)?(\d+)/);
  if (tempMatch) return { action: "setTargetTemperature", target: "thermostat", value: parseInt(tempMatch[1]) };

  // Brightness
  const brightMatch = lower.match(/(?:brilho|brightness|intensidade)\s+(?:para?\s+)?(\d+)/);
  if (brightMatch) return { action: "setBrightness", target: "light", value: parseInt(brightMatch[1]) };

  // Generic on/off
  const onMatch = lower.match(/(?:ligar?|ativar?|turn\s*on)\s+(?:o\s+|a\s+)?(.+)/);
  if (onMatch) return { action: "turnOn", target: onMatch[1].trim() };

  const offMatch = lower.match(/(?:desligar?|desativar?|turn\s*off)\s+(?:o\s+|a\s+)?(.+)/);
  if (offMatch) return { action: "turnOff", target: offMatch[1].trim() };

  return null;
}

// ─── Device Type Mapper ───

function mapAlexaDevice(raw: any): AlexaDevice {
  const displayCategories = raw.displayCategories || raw.capabilities || [];
  const typeMap: Record<string, AlexaDevice["type"]> = {
    LIGHT: "light",
    THERMOSTAT: "thermostat",
    SMARTPLUG: "plug",
    SPEAKER: "speaker",
    CAMERA: "camera",
    SMARTLOCK: "lock",
    TEMPERATURE_SENSOR: "sensor",
    CONTACT_SENSOR: "sensor",
    MOTION_SENSOR: "sensor",
  };

  const category = Array.isArray(displayCategories) ? displayCategories[0] : displayCategories;
  const type = typeMap[category] || "custom";

  return {
    id: raw.applianceId || raw.endpointId || raw.id || "",
    name: raw.friendlyName || raw.name || "Dispositivo",
    type,
    online: raw.isReachable ?? raw.online ?? true,
    capabilities: raw.capabilities?.map((c: any) => c.interface || c.interfaceName || c) || [],
    state: raw.state || {},
    room: raw.room || raw.location,
  };
}

// ─── Status Check ───

export async function isAlexaAvailable(): Promise<boolean> {
  try {
    const connected = await isAmazonConnected();
    if (!connected) return false;
    const devices = await listAlexaDevices();
    return devices.length > 0;
  } catch {
    return false;
  }
}
