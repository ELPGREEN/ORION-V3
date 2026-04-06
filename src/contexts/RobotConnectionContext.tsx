/**
 * RobotConnectionContext — Global robot connection config & state
 * Persists robot profiles in localStorage, provides unified access
 */
import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";

export interface RobotProfile {
  id: string;
  name: string;
  ip: string;
  rosbridgePort: number;
  webrtcPort: number;
  mqttPort: number;
  noderedPort: number;
  grafanaPort: number;
  foxglovePort: number;
}

export interface ServiceStatus {
  rosbridge: "online" | "offline" | "checking";
  webrtc: "online" | "offline" | "checking";
  mqtt: "online" | "offline" | "checking";
  nodered: "online" | "offline" | "checking";
  grafana: "online" | "offline" | "checking";
  foxglove: "online" | "offline" | "checking";
}

interface RobotConnectionState {
  profiles: RobotProfile[];
  activeProfileId: string | null;
  activeProfile: RobotProfile | null;
  serviceStatus: ServiceStatus;
  latencyMs: number | null;

  addProfile: (profile: Omit<RobotProfile, "id">) => RobotProfile;
  updateProfile: (id: string, updates: Partial<RobotProfile>) => void;
  removeProfile: (id: string) => void;
  setActiveProfile: (id: string) => void;
  testConnection: () => Promise<ServiceStatus>;

  // Computed URLs
  rosbridgeUrl: string;
  webrtcUrl: string;
  mqttUrl: string;
  noderedUrl: string;
  grafanaUrl: string;
  foxgloveUrl: string;
}

const STORAGE_KEY = "orion_robot_profiles";
const ACTIVE_KEY = "orion_active_robot";

const defaultProfile: RobotProfile = {
  id: "default",
  name: "Robô Local (Dev)",
  ip: "localhost",
  rosbridgePort: 9090,
  webrtcPort: 8443,
  mqttPort: 8083,
  noderedPort: 1880,
  grafanaPort: 3001,
  foxglovePort: 8765,
};

const defaultStatus: ServiceStatus = {
  rosbridge: "offline",
  webrtc: "offline",
  mqtt: "offline",
  nodered: "offline",
  grafana: "offline",
  foxglove: "offline",
};

const RobotConnectionCtx = createContext<RobotConnectionState | null>(null);

function loadProfiles(): RobotProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [defaultProfile];
}

function saveProfiles(profiles: RobotProfile[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
}

async function checkService(url: string, timeout = 3000): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeout);
    // Try WebSocket for WS URLs
    if (url.startsWith("ws")) {
      return new Promise((resolve) => {
        const ws = new WebSocket(url);
        const t = setTimeout(() => { ws.close(); resolve(false); }, timeout);
        ws.onopen = () => { clearTimeout(t); ws.close(); resolve(true); };
        ws.onerror = () => { clearTimeout(t); resolve(false); };
      });
    }
    const res = await fetch(url, { signal: ctrl.signal, mode: "no-cors" });
    clearTimeout(timer);
    return true;
  } catch {
    return false;
  }
}

export function RobotConnectionProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<RobotProfile[]>(loadProfiles);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(
    () => localStorage.getItem(ACTIVE_KEY) || profiles[0]?.id || null
  );
  const [serviceStatus, setServiceStatus] = useState<ServiceStatus>(defaultStatus);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  const activeProfile = profiles.find((p) => p.id === activeProfileId) || null;

  useEffect(() => { saveProfiles(profiles); }, [profiles]);
  useEffect(() => {
    if (activeProfileId) localStorage.setItem(ACTIVE_KEY, activeProfileId);
  }, [activeProfileId]);

  const buildUrl = useCallback((protocol: string, port: number) => {
    if (!activeProfile) return "";
    return `${protocol}://${activeProfile.ip}:${port}`;
  }, [activeProfile]);

  const rosbridgeUrl = activeProfile ? `ws://${activeProfile.ip}:${activeProfile.rosbridgePort}` : "ws://localhost:9090";
  const webrtcUrl = activeProfile ? `http://${activeProfile.ip}:${activeProfile.webrtcPort}` : "http://localhost:8443";
  const mqttUrl = activeProfile ? `ws://${activeProfile.ip}:${activeProfile.mqttPort}/mqtt` : "ws://localhost:8083/mqtt";
  const noderedUrl = activeProfile ? `http://${activeProfile.ip}:${activeProfile.noderedPort}` : "http://localhost:1880";
  const grafanaUrl = activeProfile ? `http://${activeProfile.ip}:${activeProfile.grafanaPort}` : "http://localhost:3001";
  const foxgloveUrl = activeProfile ? `ws://${activeProfile.ip}:${activeProfile.foxglovePort}` : "ws://localhost:8765";

  const addProfile = useCallback((data: Omit<RobotProfile, "id">): RobotProfile => {
    const profile: RobotProfile = { ...data, id: `robot_${Date.now()}` };
    setProfiles((prev) => [...prev, profile]);
    return profile;
  }, []);

  const updateProfile = useCallback((id: string, updates: Partial<RobotProfile>) => {
    setProfiles((prev) => prev.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  }, []);

  const removeProfile = useCallback((id: string) => {
    setProfiles((prev) => prev.filter((p) => p.id !== id));
    if (activeProfileId === id) setActiveProfileId(profiles[0]?.id || null);
  }, [activeProfileId, profiles]);

  const setActiveProfileFn = useCallback((id: string) => {
    setActiveProfileId(id);
    setServiceStatus(defaultStatus);
  }, []);

  const testConnection = useCallback(async (): Promise<ServiceStatus> => {
    if (!activeProfile) return defaultStatus;

    const newStatus: ServiceStatus = { ...defaultStatus };
    setServiceStatus({
      rosbridge: "checking", webrtc: "checking", mqtt: "checking",
      nodered: "checking", grafana: "checking", foxglove: "checking",
    });

    const start = performance.now();

    const [rb, wrtc, mqtt, nr, graf, fox] = await Promise.all([
      checkService(rosbridgeUrl),
      checkService(webrtcUrl),
      checkService(mqttUrl),
      checkService(noderedUrl),
      checkService(grafanaUrl),
      checkService(foxgloveUrl),
    ]);

    setLatencyMs(Math.round(performance.now() - start));

    newStatus.rosbridge = rb ? "online" : "offline";
    newStatus.webrtc = wrtc ? "online" : "offline";
    newStatus.mqtt = mqtt ? "online" : "offline";
    newStatus.nodered = nr ? "online" : "offline";
    newStatus.grafana = graf ? "online" : "offline";
    newStatus.foxglove = fox ? "online" : "offline";

    setServiceStatus(newStatus);
    return newStatus;
  }, [activeProfile, rosbridgeUrl, webrtcUrl, mqttUrl, noderedUrl, grafanaUrl, foxgloveUrl]);

  return (
    <RobotConnectionCtx.Provider
      value={{
        profiles, activeProfileId, activeProfile, serviceStatus, latencyMs,
        addProfile, updateProfile, removeProfile, setActiveProfile: setActiveProfileFn,
        testConnection, rosbridgeUrl, webrtcUrl, mqttUrl, noderedUrl, grafanaUrl, foxgloveUrl,
      }}
    >
      {children}
    </RobotConnectionCtx.Provider>
  );
}

export function useRobotConnectionContext() {
  const ctx = useContext(RobotConnectionCtx);
  if (!ctx) throw new Error("useRobotConnectionContext must be used within RobotConnectionProvider");
  return ctx;
}
