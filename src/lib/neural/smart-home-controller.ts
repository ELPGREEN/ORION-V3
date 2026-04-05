/**
 * ─── Smart Home Controller v1.0 ───
 * Dual-protocol smart home control:
 * 1. BLE GATT — direct control of nearby Bluetooth devices (Magic Blue, Tuya BLE, generic RGB bulbs)
 * 2. MQTT Home Assistant Discovery — control Wi-Fi devices via HA protocol (Tasmota, ESPHome, Shelly, Sonoff)
 *
 * Supported device types: lights (RGB, dimmer, on/off), plugs/switches, thermostats
 */

import { bluetoothManager } from "./bluetooth-manager";
import { iotBridge } from "./iot-device-bridge";

// ─── BLE GATT Profiles for Smart Home Devices ───

export interface SmartDeviceProfile {
  namePatterns: RegExp[];
  serviceUUID: string;
  controlCharUUID: string;
  type: "rgb_light" | "dimmer_light" | "switch" | "plug";
  buildOnCommand: (params?: SmartDeviceParams) => Uint8Array;
  buildOffCommand: () => Uint8Array;
  buildColorCommand?: (r: number, g: number, b: number) => Uint8Array;
  buildBrightnessCommand?: (level: number) => Uint8Array;
  buildColorTempCommand?: (kelvin: number) => Uint8Array;
}

export interface SmartDeviceParams {
  r?: number;
  g?: number;
  b?: number;
  brightness?: number;
  colorTemp?: number;
}

export interface SmartDeviceState {
  deviceId: string;
  name: string;
  type: "rgb_light" | "dimmer_light" | "switch" | "plug";
  protocol: "ble" | "mqtt";
  on: boolean;
  brightness?: number;
  color?: { r: number; g: number; b: number };
  colorTemp?: number;
  lastUpdated: number;
  reachable: boolean;
}

// ─── Known BLE Device Profiles ───

const BLE_PROFILES: SmartDeviceProfile[] = [
  // Magic Blue / MagicLight / LEDBlue RGB Bulbs (very common on Amazon/AliExpress)
  {
    namePatterns: [/magic/i, /ledbl/i, /rgb/i, /smart\s*light/i, /bulb/i, /ble\s*light/i],
    serviceUUID: "0000ffe5-0000-1000-8000-00805f9b34fb",
    controlCharUUID: "0000ffe9-0000-1000-8000-00805f9b34fb",
    type: "rgb_light",
    buildOnCommand: (params) => {
      if (params?.r !== undefined && params?.g !== undefined && params?.b !== undefined) {
        return new Uint8Array([0x56, params.r, params.g, params.b, 0x00, 0xf0, 0xaa]);
      }
      return new Uint8Array([0xcc, 0x23, 0x33]); // Power ON
    },
    buildOffCommand: () => new Uint8Array([0xcc, 0x24, 0x33]), // Power OFF
    buildColorCommand: (r, g, b) => new Uint8Array([0x56, r, g, b, 0x00, 0xf0, 0xaa]),
    buildBrightnessCommand: (level) => {
      const val = Math.round((level / 100) * 255);
      return new Uint8Array([0x56, val, val, val, 0x00, 0xf0, 0xaa]); // White brightness
    },
  },

  // Tuya BLE Devices (lights, plugs, switches)
  {
    namePatterns: [/tuya/i, /smart\s*life/i, /gosund/i, /teckin/i, /meross/i, /kasa/i],
    serviceUUID: "0000fff0-0000-1000-8000-00805f9b34fb",
    controlCharUUID: "0000fff3-0000-1000-8000-00805f9b34fb",
    type: "switch",
    buildOnCommand: () => {
      // Tuya BLE protocol v3: dp_id=1 (switch), type=bool, value=true
      const payload = [0x55, 0xaa, 0x00, 0x06, 0x00, 0x05, 0x01, 0x01, 0x00, 0x01, 0x01];
      payload.push(payload.reduce((a, b) => a + b, 0) & 0xff); // checksum
      return new Uint8Array(payload);
    },
    buildOffCommand: () => {
      const payload = [0x55, 0xaa, 0x00, 0x06, 0x00, 0x05, 0x01, 0x01, 0x00, 0x01, 0x00];
      payload.push(payload.reduce((a, b) => a + b, 0) & 0xff);
      return new Uint8Array(payload);
    },
  },

  // Govee / iLC / Generic BLE bulbs (FFD5/FFD9 pattern)
  {
    namePatterns: [/govee/i, /ilc/i, /flux/i, /playbulb/i, /mipow/i, /triones/i],
    serviceUUID: "0000ffd5-0000-1000-8000-00805f9b34fb",
    controlCharUUID: "0000ffd9-0000-1000-8000-00805f9b34fb",
    type: "rgb_light",
    buildOnCommand: (params) => {
      if (params?.r !== undefined && params?.g !== undefined && params?.b !== undefined) {
        return new Uint8Array([0x56, params.r, params.g, params.b, 0x00, 0xf0, 0xaa]);
      }
      return new Uint8Array([0xcc, 0x23, 0x33]);
    },
    buildOffCommand: () => new Uint8Array([0xcc, 0x24, 0x33]),
    buildColorCommand: (r, g, b) => new Uint8Array([0x56, r, g, b, 0x00, 0xf0, 0xaa]),
    buildBrightnessCommand: (level) => {
      const val = Math.round((level / 100) * 255);
      return new Uint8Array([0x56, val, val, val, 0x00, 0xf0, 0xaa]);
    },
  },

  // Switchbot / generic BLE switch
  {
    namePatterns: [/switchbot/i, /wohand/i, /bot/i],
    serviceUUID: "cba20d00-224d-11e6-9fb8-0002a5d5c51b",
    controlCharUUID: "cba20002-224d-11e6-9fb8-0002a5d5c51b",
    type: "switch",
    buildOnCommand: () => new Uint8Array([0x57, 0x01, 0x01]),   // Press ON
    buildOffCommand: () => new Uint8Array([0x57, 0x01, 0x02]),   // Press OFF
  },
];

// ─── MQTT Home Assistant Discovery Topics ───

interface HAMQTTDevice {
  id: string;
  name: string;
  type: "light" | "switch" | "climate";
  commandTopic: string;
  stateTopic: string;
  availabilityTopic?: string;
  brightnessCommandTopic?: string;
  rgbCommandTopic?: string;
  colorTempCommandTopic?: string;
}

// ─── Smart Home Controller ───

export class SmartHomeController {
  private _deviceStates = new Map<string, SmartDeviceState>();
  private _bleProfileMap = new Map<string, SmartDeviceProfile>(); // deviceId → profile
  private _mqttDevices = new Map<string, HAMQTTDevice>();
  private _listeners: Array<(states: SmartDeviceState[]) => void> = [];

  onChange(cb: (states: SmartDeviceState[]) => void) { this._listeners.push(cb); }
  offChange(cb: (states: SmartDeviceState[]) => void) { this._listeners = this._listeners.filter(l => l !== cb); }
  private _notify() { const states = this.getAllDevices(); this._listeners.forEach(cb => cb(states)); }

  getAllDevices(): SmartDeviceState[] { return Array.from(this._deviceStates.values()); }
  getDevice(id: string): SmartDeviceState | undefined { return this._deviceStates.get(id); }

  // ─── BLE: Identify device profile by name ───

  identifyBLEProfile(deviceName: string): SmartDeviceProfile | null {
    for (const profile of BLE_PROFILES) {
      if (profile.namePatterns.some(p => p.test(deviceName))) return profile;
    }
    return null;
  }

  // ─── BLE: Scan specifically for smart home devices ───

  async scanSmartDevices(): Promise<SmartDeviceState[]> {
    if (!bluetoothManager.isSupported) return [];

    // Scan with filters for known smart home services
    const serviceUUIDs = [...new Set(BLE_PROFILES.map(p => p.serviceUUID))];

    try {
      // Try filtered scan first (faster)
      const device = await bluetoothManager.scan(
        [{ services: serviceUUIDs }],
        serviceUUIDs
      );

      if (device) {
        return [await this._registerBLEDevice(device.id, device.name)];
      }
    } catch {
      // Fallback: scan all and identify by name
      try {
        const device = await bluetoothManager.scan();
        if (device) {
          const profile = this.identifyBLEProfile(device.name);
          if (profile) {
            return [await this._registerBLEDevice(device.id, device.name)];
          }
          // Even without a known profile, register as generic
          return [await this._registerBLEDevice(device.id, device.name)];
        }
      } catch (e) {
        console.warn("[SmartHome] Scan failed:", e);
      }
    }

    return [];
  }

  private async _registerBLEDevice(deviceId: string, name: string): Promise<SmartDeviceState> {
    const profile = this.identifyBLEProfile(name);

    if (profile) {
      this._bleProfileMap.set(deviceId, profile);
    }

    // Connect via GATT
    const connected = await bluetoothManager.connect(deviceId);

    const state: SmartDeviceState = {
      deviceId,
      name,
      type: profile?.type || "switch",
      protocol: "ble",
      on: false,
      reachable: connected,
      lastUpdated: Date.now(),
    };

    this._deviceStates.set(deviceId, state);
    this._notify();
    return state;
  }

  // ─── BLE: Control device ───

  async turnOn(deviceId: string, params?: SmartDeviceParams): Promise<boolean> {
    const state = this._deviceStates.get(deviceId);
    if (!state) return false;

    if (state.protocol === "ble") {
      return this._bleTurnOn(deviceId, params);
    } else {
      return this._mqttTurnOn(deviceId, params);
    }
  }

  async turnOff(deviceId: string): Promise<boolean> {
    const state = this._deviceStates.get(deviceId);
    if (!state) return false;

    if (state.protocol === "ble") {
      return this._bleTurnOff(deviceId);
    } else {
      return this._mqttTurnOff(deviceId);
    }
  }

  async setColor(deviceId: string, r: number, g: number, b: number): Promise<boolean> {
    const state = this._deviceStates.get(deviceId);
    if (!state) return false;

    if (state.protocol === "ble") {
      const profile = this._bleProfileMap.get(deviceId);
      if (!profile?.buildColorCommand) return false;
      const cmd = profile.buildColorCommand(r, g, b);
      const ok = await bluetoothManager.writeCharacteristic(deviceId, profile.serviceUUID, profile.controlCharUUID, cmd.buffer as ArrayBuffer);
      if (ok) {
        state.color = { r, g, b };
        state.on = true;
        state.lastUpdated = Date.now();
        this._notify();
      }
      return ok;
    } else {
      const mqttDev = this._mqttDevices.get(deviceId);
      if (!mqttDev?.rgbCommandTopic) return false;
      return iotBridge.publish(mqttDev.rgbCommandTopic, `${r},${g},${b}`);
    }
  }

  async setBrightness(deviceId: string, level: number): Promise<boolean> {
    const state = this._deviceStates.get(deviceId);
    if (!state) return false;

    const clamped = Math.max(0, Math.min(100, level));

    if (state.protocol === "ble") {
      const profile = this._bleProfileMap.get(deviceId);
      if (!profile?.buildBrightnessCommand) return false;
      const cmd = profile.buildBrightnessCommand(clamped);
      const ok = await bluetoothManager.writeCharacteristic(deviceId, profile.serviceUUID, profile.controlCharUUID, cmd.buffer as ArrayBuffer);
      if (ok) {
        state.brightness = clamped;
        state.on = clamped > 0;
        state.lastUpdated = Date.now();
        this._notify();
      }
      return ok;
    } else {
      const mqttDev = this._mqttDevices.get(deviceId);
      if (!mqttDev?.brightnessCommandTopic) return false;
      const mqttVal = Math.round((clamped / 100) * 255);
      return iotBridge.publish(mqttDev.brightnessCommandTopic, String(mqttVal));
    }
  }

  // ─── Private BLE control ───

  private async _bleTurnOn(deviceId: string, params?: SmartDeviceParams): Promise<boolean> {
    const profile = this._bleProfileMap.get(deviceId);
    if (!profile) {
      // Generic: try the first known profile's service
      console.warn(`[SmartHome] No profile for ${deviceId}, attempting generic ON`);
      return false;
    }

    const cmd = profile.buildOnCommand(params);
    const ok = await bluetoothManager.writeCharacteristic(deviceId, profile.serviceUUID, profile.controlCharUUID, cmd.buffer as ArrayBuffer);
    if (ok) {
      const state = this._deviceStates.get(deviceId);
      if (state) {
        state.on = true;
        state.lastUpdated = Date.now();
        if (params?.r !== undefined) state.color = { r: params.r, g: params.g || 0, b: params.b || 0 };
        if (params?.brightness !== undefined) state.brightness = params.brightness;
        this._notify();
      }
    }
    return ok;
  }

  private async _bleTurnOff(deviceId: string): Promise<boolean> {
    const profile = this._bleProfileMap.get(deviceId);
    if (!profile) return false;

    const cmd = profile.buildOffCommand();
    const ok = await bluetoothManager.writeCharacteristic(deviceId, profile.serviceUUID, profile.controlCharUUID, cmd.buffer as ArrayBuffer);
    if (ok) {
      const state = this._deviceStates.get(deviceId);
      if (state) {
        state.on = false;
        state.lastUpdated = Date.now();
        this._notify();
      }
    }
    return ok;
  }

  // ─── MQTT: Home Assistant Discovery ───

  /**
   * Register a Home Assistant compatible MQTT device.
   * Publishes HA MQTT Discovery config so HA auto-detects the device.
   */
  async registerMQTTDevice(config: {
    id: string;
    name: string;
    type: "light" | "switch" | "climate";
    room?: string;
  }): Promise<void> {
    const prefix = "homeassistant";
    const nodeId = "orion";
    const objectId = config.id;
    const component = config.type === "climate" ? "climate" : config.type;

    const commandTopic = `${prefix}/${component}/${nodeId}/${objectId}/set`;
    const stateTopic = `${prefix}/${component}/${nodeId}/${objectId}/state`;
    const availabilityTopic = `${prefix}/${component}/${nodeId}/${objectId}/available`;
    const configTopic = `${prefix}/${component}/${nodeId}/${objectId}/config`;

    const haDevice: HAMQTTDevice = {
      id: config.id,
      name: config.name,
      type: config.type,
      commandTopic,
      stateTopic,
      availabilityTopic,
    };

    if (config.type === "light") {
      haDevice.brightnessCommandTopic = `${commandTopic}/brightness`;
      haDevice.rgbCommandTopic = `${commandTopic}/rgb`;
      haDevice.colorTempCommandTopic = `${commandTopic}/color_temp`;
    }

    this._mqttDevices.set(config.id, haDevice);

    // Publish HA Discovery config
    const discoveryPayload: Record<string, any> = {
      name: config.name,
      unique_id: `orion_${config.id}`,
      command_topic: commandTopic,
      state_topic: stateTopic,
      availability_topic: availabilityTopic,
      payload_available: "online",
      payload_not_available: "offline",
      device: {
        identifiers: [`orion_${config.id}`],
        name: config.name,
        model: "Orion Smart Device",
        manufacturer: "Orion Platform",
        sw_version: "1.0",
      },
    };

    if (config.type === "light") {
      discoveryPayload.brightness_command_topic = haDevice.brightnessCommandTopic;
      discoveryPayload.rgb_command_topic = haDevice.rgbCommandTopic;
      discoveryPayload.color_temp_command_topic = haDevice.colorTempCommandTopic;
      discoveryPayload.brightness_scale = 255;
      discoveryPayload.schema = "default";
    }

    await iotBridge.publish(configTopic, JSON.stringify(discoveryPayload), 1);
    await iotBridge.publish(availabilityTopic!, "online", 1);

    // Register state
    const state: SmartDeviceState = {
      deviceId: config.id,
      name: config.name,
      type: config.type === "light" ? "rgb_light" : config.type === "climate" ? "dimmer_light" : "switch",
      protocol: "mqtt",
      on: false,
      reachable: iotBridge.connected,
      lastUpdated: Date.now(),
    };
    this._deviceStates.set(config.id, state);

    // Subscribe to state updates
    iotBridge.subscribe(stateTopic, 3000);

    this._notify();
  }

  /**
   * Discover MQTT devices that follow Home Assistant Discovery protocol.
   * Looks for devices already publishing to homeassistant/ topics.
   */
  async discoverMQTTDevices(): Promise<SmartDeviceState[]> {
    if (!iotBridge.connected) return [];

    // Publish discovery request
    await iotBridge.publish("homeassistant/status", "online", 0);

    // Check Supabase for recent HA-compatible telemetry
    try {
      const supabase = (await import("@/integrations/supabase/client")).supabase;
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data } = await (supabase.from("iot_telemetry") as any)
        .select("device_id, topic, payload, received_at")
        .like("topic", "homeassistant/%")
        .gte("received_at", fiveMinAgo)
        .limit(50);

      if (data) {
        for (const row of data) {
          try {
            const payload = typeof row.payload === "string" ? JSON.parse(row.payload) : row.payload;
            if (payload?.name && payload?.command_topic) {
              const type = row.topic.includes("/light/") ? "light" as const
                : row.topic.includes("/switch/") ? "switch" as const
                : "switch" as const;

              await this.registerMQTTDevice({
                id: row.device_id || payload.unique_id || `mqtt_${Date.now()}`,
                name: payload.name,
                type,
              });
            }
          } catch { /* skip malformed */ }
        }
      }
    } catch (e) {
      console.warn("[SmartHome] MQTT discovery DB check failed:", e);
    }

    return this.getAllDevices().filter(d => d.protocol === "mqtt");
  }

  // ─── Private MQTT control ───

  private async _mqttTurnOn(deviceId: string, params?: SmartDeviceParams): Promise<boolean> {
    const mqttDev = this._mqttDevices.get(deviceId);
    if (!mqttDev) return false;

    const ok = await iotBridge.publish(mqttDev.commandTopic, "ON", 1);
    if (ok) {
      const state = this._deviceStates.get(deviceId);
      if (state) {
        state.on = true;
        state.lastUpdated = Date.now();
        this._notify();
      }

      // Set brightness/color if provided
      if (params?.brightness !== undefined && mqttDev.brightnessCommandTopic) {
        await iotBridge.publish(mqttDev.brightnessCommandTopic, String(Math.round((params.brightness / 100) * 255)), 1);
      }
      if (params?.r !== undefined && params?.g !== undefined && params?.b !== undefined && mqttDev.rgbCommandTopic) {
        await iotBridge.publish(mqttDev.rgbCommandTopic, `${params.r},${params.g},${params.b}`, 1);
      }
    }
    return ok;
  }

  private async _mqttTurnOff(deviceId: string): Promise<boolean> {
    const mqttDev = this._mqttDevices.get(deviceId);
    if (!mqttDev) return false;

    const ok = await iotBridge.publish(mqttDev.commandTopic, "OFF", 1);
    if (ok) {
      const state = this._deviceStates.get(deviceId);
      if (state) {
        state.on = false;
        state.lastUpdated = Date.now();
        this._notify();
      }
    }
    return ok;
  }

  // ─── Voice/AI Command Helpers ───

  async handleVoiceCommand(command: string): Promise<string> {
    const cmd = command.toLowerCase().trim();

    // Parse room/device from command
    const rooms: Record<string, string[]> = {
      sala: ["luz_sala", "sala"],
      escritório: ["luz_escritorio", "escritorio"],
      escritorio: ["luz_escritorio", "escritorio"],
      quarto: ["luz_quarto", "quarto"],
      cozinha: ["luz_cozinha", "cozinha"],
      banheiro: ["luz_banheiro", "banheiro"],
      garagem: ["portao", "garagem"],
    };

    // Turn on/off
    const onMatch = cmd.match(/\b(lig[aue]|acend[aer]|turn\s*on|ligar)\b/i);
    const offMatch = cmd.match(/\b(deslig[aue]|apag[aue]|turn\s*off|desligar)\b/i);
    const turnOn = !!onMatch;
    const turnOff = !!offMatch;

    if (!turnOn && !turnOff) {
      // Color command?
      const colorMatch = cmd.match(/\b(?:cor|color)\s+(\w+)/i);
      if (colorMatch) {
        const colorName = colorMatch[1];
        const colors: Record<string, [number, number, number]> = {
          vermelho: [255, 0, 0], red: [255, 0, 0],
          verde: [0, 255, 0], green: [0, 255, 0],
          azul: [0, 0, 255], blue: [0, 0, 255],
          amarelo: [255, 255, 0], yellow: [255, 255, 0],
          roxo: [128, 0, 255], purple: [128, 0, 255],
          rosa: [255, 105, 180], pink: [255, 105, 180],
          branco: [255, 255, 255], white: [255, 255, 255],
          laranja: [255, 165, 0], orange: [255, 165, 0],
        };
        const rgb = colors[colorName.toLowerCase()];
        if (rgb) {
          let changed = 0;
          for (const state of this._deviceStates.values()) {
            if (state.type === "rgb_light") {
              await this.setColor(state.deviceId, rgb[0], rgb[1], rgb[2]);
              changed++;
            }
          }
          return changed > 0
            ? `🎨 Cor alterada para ${colorName} em ${changed} lâmpada(s).`
            : `Nenhuma lâmpada RGB encontrada. Escaneie dispositivos primeiro.`;
        }
      }

      // Brightness command
      const brightnessMatch = cmd.match(/\b(?:brilho|brightness)\s+(\d+)/i);
      if (brightnessMatch) {
        const level = parseInt(brightnessMatch[1]);
        let changed = 0;
        for (const state of this._deviceStates.values()) {
          if (state.type === "rgb_light" || state.type === "dimmer_light") {
            await this.setBrightness(state.deviceId, level);
            changed++;
          }
        }
        return changed > 0
          ? `💡 Brilho ajustado para ${level}% em ${changed} dispositivo(s).`
          : `Nenhuma lâmpada com controle de brilho encontrada.`;
      }

      return "Comando não reconhecido. Tente: 'ligar luz da sala', 'desligar todas as luzes', 'cor azul', 'brilho 50'.";
    }

    // Find target devices
    const allLights = cmd.includes("todas") || cmd.includes("tudo") || cmd.includes("casa");
    let targetDevices: SmartDeviceState[] = [];

    if (allLights) {
      targetDevices = this.getAllDevices();
    } else {
      for (const [room, ids] of Object.entries(rooms)) {
        if (cmd.includes(room)) {
          targetDevices = this.getAllDevices().filter(d =>
            ids.some(id => d.deviceId.includes(id) || d.name.toLowerCase().includes(room))
          );
          break;
        }
      }
      // If no room matched, try all lights
      if (targetDevices.length === 0) {
        targetDevices = this.getAllDevices().filter(d =>
          d.type === "rgb_light" || d.type === "dimmer_light" || d.type === "switch"
        );
      }
    }

    if (targetDevices.length === 0) {
      // Fallback: try IoT bridge MQTT
      if (iotBridge.connected) {
        for (const [room, ids] of Object.entries(rooms)) {
          if (cmd.includes(room)) {
            const iotDevice = iotBridge.deviceList.find(d => ids.some(id => d.id === id));
            if (iotDevice) {
              await iotBridge.publish(iotDevice.topic, {
                command: turnOn ? "on" : "off",
                timestamp: Date.now(),
              });
              return `${iotDevice.name} ${turnOn ? "ligada" : "desligada"} via MQTT.`;
            }
          }
        }
      }
      return `Nenhum dispositivo encontrado. Escaneie dispositivos Bluetooth ou conecte ao MQTT primeiro.`;
    }

    let success = 0;
    for (const device of targetDevices) {
      const ok = turnOn ? await this.turnOn(device.deviceId) : await this.turnOff(device.deviceId);
      if (ok) success++;
    }

    const action = turnOn ? "ligado(s)" : "desligado(s)";
    return success > 0
      ? `✅ ${success}/${targetDevices.length} dispositivo(s) ${action}.`
      : `⚠️ Falha ao controlar dispositivos. Verifique a conexão.`;
  }

  // ─── Status summary ───

  getStatusSummary(): string {
    const devices = this.getAllDevices();
    if (devices.length === 0) {
      return "🏠 Nenhum dispositivo smart home registrado. Use 'escanear dispositivos' para encontrar lâmpadas e tomadas próximas.";
    }

    const online = devices.filter(d => d.reachable).length;
    const lightsOn = devices.filter(d => d.on && (d.type === "rgb_light" || d.type === "dimmer_light")).length;
    const ble = devices.filter(d => d.protocol === "ble").length;
    const mqtt = devices.filter(d => d.protocol === "mqtt").length;

    return `🏠 **Smart Home:** ${devices.length} dispositivos (${online} alcançáveis)\n` +
      `💡 ${lightsOn} luz(es) ligada(s)\n` +
      `📡 ${ble} BLE direto, ${mqtt} via MQTT/Wi-Fi\n` +
      `Comandos: "ligar/desligar luz da sala", "cor azul", "brilho 50%"`;
  }
}

// Singleton
export const smartHome = new SmartHomeController();
