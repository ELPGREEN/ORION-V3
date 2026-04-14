/**
 * Jules Industrial Scanner — Monitors Industrial Subsystems
 * ──────────────────────────────────────────────────────────
 * Extends the Evolution Engine with industrial-specific health scanning
 * for welding, assembly, painting, inspection, palletization, and manufacturing.
 */

import { recordSubsystemFailure, type SubsystemKey } from "./jules-auto-triggers";
import type { ScanResult, ScanIssue } from "./jules-evolution-engine";
import { getRegisteredDevices, removeIoTDevice, type IoTDevice, type IndustrialDomain } from "./jules-orion-fusion";
import { recordModuleFailure, shouldQuarantine } from "./jules-immune-system";

// ─── Industrial Subsystem Keys ───

export type IndustrialSubsystemKey =
  | "industrial_welding"
  | "industrial_assembly"
  | "industrial_painting"
  | "industrial_inspection"
  | "industrial_palletization"
  | "industrial_adaptive_mfg"
  | "industrial_protocol_bridge"
  | "industrial_safety";

// ─── Health Metrics ───

export interface IndustrialHealthMetrics {
  domain: IndustrialDomain;
  devicesOnline: number;
  devicesTotal: number;
  protocolsActive: string[];
  lastCycleTime?: number; // ms
  defectRate?: number; // 0-1
  oee?: number; // 0-100 (Overall Equipment Effectiveness)
  safetyScore: number; // 0-100
}

// ─── Device Health Scanner ───

export function scanIndustrialHealth(): ScanResult {
  const devices = getRegisteredDevices();
  const issues: ScanIssue[] = [];
  let score = 100;

  if (devices.length === 0) {
    return { domain: "performance" as any, issues: [], score: 100, scannedAt: Date.now() };
  }

  // Check device connectivity
  const offlineDevices = devices.filter((d) => d.status === "offline");
  const errorDevices = devices.filter((d) => d.status === "error");

  if (errorDevices.length > 0) {
    issues.push({
      subsystem: "iot_ros2",
      severity: "critical",
      message: `${errorDevices.length} industrial device(s) in error state`,
      context: errorDevices.map((d) => `${d.name} (${d.type}/${d.protocol})`).join(", "),
    });
    score -= errorDevices.length * 15;

    // ─── Automated Sensor Isolation (Immune System Hook) ───
    errorDevices.forEach(device => {
      const subsystemKey = `sensor:${device.id}`;
      const quarantine = recordModuleFailure(subsystemKey);

      if (shouldQuarantine(subsystemKey)) {
        console.warn(`[Industrial-Scanner] Isolating faulty sensor: ${device.name} (id: ${device.id})`);
        // Force removal from active registry to stop control-loop interference
        removeIoTDevice(device.id);

        issues.push({
          subsystem: "industrial_safety",
          severity: "critical",
          message: `Faulty sensor ${device.name} isolated and removed from registry`,
          context: `Device ID: ${device.id}, Total Failures: ${quarantine.consecutiveFailures}`,
        });
      }
    });
  }

  if (offlineDevices.length > 0) {
    issues.push({
      subsystem: "iot_mqtt",
      severity: offlineDevices.length > 2 ? "high" : "medium",
      message: `${offlineDevices.length} device(s) offline`,
      context: offlineDevices.map((d) => d.name).join(", "),
    });
    score -= offlineDevices.length * 10;
  }

  // Check stale devices (not seen in 5 min)
  const staleThreshold = Date.now() - 300_000;
  const staleDevices = devices.filter((d) => d.lastSeen < staleThreshold && d.status === "online");
  if (staleDevices.length > 0) {
    issues.push({
      subsystem: "iot_mqtt",
      severity: "medium",
      message: `${staleDevices.length} device(s) with stale heartbeat (>5min)`,
    });
    score -= staleDevices.length * 5;
  }

  // Check protocol diversity (too many = complexity risk)
  const protocols = [...new Set(devices.map((d) => d.protocol))];
  if (protocols.length > 4) {
    issues.push({
      subsystem: "iot_ros2",
      severity: "low",
      message: `${protocols.length} different protocols active — consider consolidation`,
    });
    score -= 5;
  }

  // Check camera availability for vision-dependent domains
  const cameras = devices.filter((d) => d.type === "camera");
  const onlineCameras = cameras.filter((d) => d.status === "online");
  if (cameras.length > 0 && onlineCameras.length === 0) {
    issues.push({
      subsystem: "vision_mediapipe",
      severity: "critical",
      message: "All industrial cameras offline — vision-dependent operations halted",
    });
    score -= 25;
  }

  return {
    domain: "performance" as any,
    issues,
    score: Math.max(0, score),
    scannedAt: Date.now(),
  };
}

// ─── Compute Industrial Metrics ───

export function computeIndustrialMetrics(): IndustrialHealthMetrics[] {
  const devices = getRegisteredDevices();
  const domains: IndustrialDomain[] = [
    "welding", "assembly", "painting", "inspection", "palletization", "adaptive_manufacturing",
  ];

  const domainDeviceTypes: Record<IndustrialDomain, string[]> = {
    welding: ["power_source", "sensor", "camera", "actuator"],
    assembly: ["gripper", "sensor", "actuator", "camera"],
    painting: ["actuator", "sensor", "camera"],
    inspection: ["camera", "sensor"],
    palletization: ["gripper", "agv", "amr", "sensor"],
    adaptive_manufacturing: ["plc", "sensor", "actuator", "camera", "gripper"],
  };

  return domains.map((domain) => {
    const types = domainDeviceTypes[domain];
    const domainDevices = devices.filter((d) => types.includes(d.type));
    const online = domainDevices.filter((d) => d.status === "online");
    const protocols = [...new Set(domainDevices.map((d) => d.protocol))];

    return {
      domain,
      devicesOnline: online.length,
      devicesTotal: domainDevices.length,
      protocolsActive: protocols,
      safetyScore: domainDevices.length === 0 ? 100 : Math.round((online.length / domainDevices.length) * 100),
    };
  }).filter((m) => m.devicesTotal > 0);
}

// ─── Dispatch Industrial Issues to Jules ───

export async function dispatchIndustrialIssues(): Promise<number> {
  const scan = scanIndustrialHealth();
  let dispatched = 0;

  for (const issue of scan.issues.filter((i) => i.severity === "critical" || i.severity === "high")) {
    await recordSubsystemFailure(issue.subsystem as SubsystemKey, issue.message, issue.context);
    dispatched++;
  }

  return dispatched;
}
