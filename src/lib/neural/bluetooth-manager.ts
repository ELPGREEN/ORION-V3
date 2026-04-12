/**
 * ─── Web Bluetooth Manager v2.1 ───
 * Wrapper for navigator.bluetooth API — scan, pair, read/write BLE GATT characteristics.
 * v2: Fixed scan filter conflict (acceptAllDevices vs filters can't coexist),
 * added Capacitor native fallback, better error messages for mobile.
 */

export interface BLEDeviceInfo {
  id: string;
  name: string;
  connected: boolean;
  services: string[];
  batteryLevel?: number;
  rssi?: number;
  lastSeen: number;
}

export interface BLESensorReading {
  deviceId: string;
  service: string;
  characteristic: string;
  value: number | string | Uint8Array;
  timestamp: number;
}

type BLEEventType = "device_connected" | "device_disconnected" | "sensor_reading" | "error" | "scan_start" | "scan_end";
type BLEEventCallback = (event: { type: BLEEventType; data: any }) => void;

const KNOWN_SERVICES: Record<string, string> = {
  "0x180f": "Battery Service",
  "0x180d": "Heart Rate",
  "0x180a": "Device Information",
  "0x1800": "Generic Access",
  "0x1801": "Generic Attribute",
  "0x1809": "Health Thermometer",
  "0x181c": "User Data",
  battery_service: "Battery Service",
  heart_rate: "Heart Rate",
  device_information: "Device Information",
};

export class BluetoothDeviceManager {
  private devices = new Map<string, { device: any; server?: any; info: BLEDeviceInfo }>();
  private listeners: BLEEventCallback[] = [];
  private sensorPolls = new Map<string, number>();

  get isSupported(): boolean {
    if (typeof navigator === "undefined") return false;
    // Check Web Bluetooth API
    if ("bluetooth" in navigator) return true;
    // Check if running in Capacitor (native BLE plugin available)
    if (typeof (window as any).Capacitor !== "undefined") return true;
    return false;
  }

  get isNative(): boolean {
    return typeof (window as any).Capacitor !== "undefined";
  }

  on(cb: BLEEventCallback) { this.listeners.push(cb); }
  off(cb: BLEEventCallback) { this.listeners = this.listeners.filter(l => l !== cb); }
  private emit(type: BLEEventType, data: any) { this.listeners.forEach(l => l({ type, data })); }

  getDevices(): BLEDeviceInfo[] {
    return Array.from(this.devices.values()).map(d => ({ ...d.info }));
  }

  /**
   * Scan for BLE devices.
   * IMPORTANT: Web Bluetooth requires EITHER `filters` OR `acceptAllDevices`, never both.
   */
  async scan(filters?: any[], optionalServices?: any[]): Promise<BLEDeviceInfo | null> {
    if (!this.isSupported) {
      const msg = this.isNative
        ? "BLE plugin não instalado. Execute: npx cap sync"
        : "Web Bluetooth não suportado neste navegador. Use Chrome/Edge em HTTPS.";
      this.emit("error", { message: msg });
      return null;
    }

    this.emit("scan_start", {});

    try {
      const defaultOptionalServices = [
        "battery_service", "heart_rate", "device_information",
      ];

      // Build request options - NEVER combine filters with acceptAllDevices
      const requestOptions: any = filters && filters.length > 0
        ? {
            filters,
            optionalServices: optionalServices || defaultOptionalServices,
          }
        : {
            acceptAllDevices: true,
            optionalServices: optionalServices || defaultOptionalServices,
          };

      const nav = navigator as any;
      const device = await nav.bluetooth.requestDevice(requestOptions);

      const info: BLEDeviceInfo = {
        id: device.id,
        name: device.name || "Dispositivo desconhecido",
        connected: false,
        services: [],
        lastSeen: Date.now(),
      };
      this.devices.set(device.id, { device, info });

      device.addEventListener("gattserverdisconnected", () => {
        const entry = this.devices.get(device.id);
        if (entry) { entry.info.connected = false; }
        this.emit("device_disconnected", { deviceId: device.id, name: info.name });
        // Auto-reconnect
        this.scheduleReconnect(device.id);
      });

      this.emit("scan_end", { device: info });
      return info;
    } catch (err: any) {
      this.emit("scan_end", { error: err.message });
      // NotFoundError = user cancelled the picker, not a real error
      if (err.name !== "NotFoundError") {
        const friendlyMsg = err.name === "SecurityError"
          ? "Bluetooth requer HTTPS e contexto seguro. Verifique se o app está instalado ou acesse via HTTPS."
          : err.name === "NotSupportedError"
            ? "Bluetooth não disponível neste dispositivo ou navegador."
            : `Erro no Bluetooth: ${err.message}`;
        this.emit("error", { message: friendlyMsg });
      }
      return null;
    }
  }

  async connect(deviceId: string): Promise<boolean> {
    const entry = this.devices.get(deviceId);
    if (!entry) { this.emit("error", { message: `Dispositivo ${deviceId} não encontrado` }); return false; }
    try {
      const server = await entry.device.gatt!.connect();
      entry.server = server;
      entry.info.connected = true;
      entry.info.lastSeen = Date.now();

      // Discover services
      try {
        const services = await server.getPrimaryServices();
        entry.info.services = services.map((s: any) => s.uuid);
      } catch { /* some devices don't enumerate */ }

      // Try reading battery
      try {
        const battService = await server.getPrimaryService("battery_service");
        const battChar = await battService.getCharacteristic("battery_level");
        const val = await battChar.readValue();
        entry.info.batteryLevel = val.getUint8(0);
      } catch { /* no battery service */ }

      this.emit("device_connected", { deviceId, name: entry.info.name, services: entry.info.services });
      return true;
    } catch (err: any) {
      this.emit("error", { message: `Falha ao conectar ${entry.info.name}: ${err.message}` });
      return false;
    }
  }

  private _reconnectTimers = new Map<string, number>();
  private _reconnectAttempts = new Map<string, number>();
  private static MAX_RECONNECT_ATTEMPTS = 5;

  async disconnect(deviceId: string): Promise<void> {
    const entry = this.devices.get(deviceId);
    if (!entry) return;
    // Clear reconnect timer
    const timer = this._reconnectTimers.get(deviceId);
    if (timer) { clearTimeout(timer); this._reconnectTimers.delete(deviceId); }
    this._reconnectAttempts.delete(deviceId);
    // Clear sensor polls
    const pollId = this.sensorPolls.get(deviceId);
    if (pollId) { clearInterval(pollId); this.sensorPolls.delete(deviceId); }
    try { entry.server?.disconnect(); } catch {}
    entry.info.connected = false;
    this.emit("device_disconnected", { deviceId, name: entry.info.name });
  }

  /**
   * Auto-reconnect with exponential backoff when a device disconnects unexpectedly.
   */
  private scheduleReconnect(deviceId: string): void {
    const attempts = this._reconnectAttempts.get(deviceId) || 0;
    if (attempts >= BluetoothDeviceManager.MAX_RECONNECT_ATTEMPTS) {
      console.warn(`[BLE] Max reconnect attempts for ${deviceId}`);
      this._reconnectAttempts.delete(deviceId);
      return;
    }
    const delay = Math.min(1000 * Math.pow(2, attempts), 30000); // 1s, 2s, 4s, 8s, 16s, max 30s
    this._reconnectAttempts.set(deviceId, attempts + 1);
    
    const timer = window.setTimeout(async () => {
      this._reconnectTimers.delete(deviceId);
      const entry = this.devices.get(deviceId);
      if (!entry || entry.info.connected) return;
      
      console.log(`[BLE] Reconnect attempt ${attempts + 1} for ${entry.info.name}`);
      const ok = await this.connect(deviceId);
      if (!ok) {
        this.scheduleReconnect(deviceId);
      } else {
        this._reconnectAttempts.delete(deviceId);
      }
    }, delay);
    this._reconnectTimers.set(deviceId, timer);
  }

  async readCharacteristic(deviceId: string, serviceUuid: string, characteristicUuid: string): Promise<DataView | null> {
    const entry = this.devices.get(deviceId);
    if (!entry?.server?.connected) return null;
    try {
      const service = await entry.server.getPrimaryService(serviceUuid);
      const char = await service.getCharacteristic(characteristicUuid);
      return await char.readValue();
    } catch (err: any) {
      this.emit("error", { message: `Leitura falhou: ${err.message}` });
      return null;
    }
  }

  async writeCharacteristic(deviceId: string, serviceUuid: string, characteristicUuid: string, value: BufferSource): Promise<boolean> {
    const entry = this.devices.get(deviceId);
    if (!entry?.server?.connected) return false;
    try {
      const service = await entry.server.getPrimaryService(serviceUuid);
      const char = await service.getCharacteristic(characteristicUuid);
      await char.writeValue(value);
      return true;
    } catch (err: any) {
      this.emit("error", { message: `Escrita falhou: ${err.message}` });
      return false;
    }
  }

  async startSensorPolling(deviceId: string, serviceUuid: string, characteristicUuid: string, intervalMs = 2000): Promise<void> {
    const key = `${deviceId}:${serviceUuid}:${characteristicUuid}`;
    if (this.sensorPolls.has(key)) return;
    const poll = window.setInterval(async () => {
      const val = await this.readCharacteristic(deviceId, serviceUuid, characteristicUuid);
      if (val) {
        this.emit("sensor_reading", {
          deviceId, service: serviceUuid, characteristic: characteristicUuid,
          value: val.getUint8(0), timestamp: Date.now(),
        } satisfies BLESensorReading);
      }
    }, intervalMs);
    this.sensorPolls.set(key, poll);
  }

  stopSensorPolling(deviceId: string, serviceUuid: string, characteristicUuid: string): void {
    const key = `${deviceId}:${serviceUuid}:${characteristicUuid}`;
    const id = this.sensorPolls.get(key);
    if (id) { clearInterval(id); this.sensorPolls.delete(key); }
  }

  disconnectAll(): void {
    this.sensorPolls.forEach(id => clearInterval(id));
    this.sensorPolls.clear();
    this.devices.forEach((entry) => {
      try { entry.server?.disconnect(); } catch {}
      entry.info.connected = false;
    });
  }

  getServiceName(uuid: string): string {
    return KNOWN_SERVICES[uuid.toLowerCase()] || uuid;
  }
}

// Singleton
export const bluetoothManager = new BluetoothDeviceManager();
