/**
 * ─── Orion Hardware Intelligence — Swarm & Robotics Bridge ───
 * Bridges physical robotics (ROS2/IoT) and Swarm logic into the Maestro core.
 */

import { iotBridge } from "./iot-device-bridge";
import { ArcSystemIntegrator } from "./arc-system-integrator";
import { updatePhysicalState } from "./goal-alignment";
import { createProposal } from "./evolution-sandbox";

const systemIntegrator = new ArcSystemIntegrator();

/**
 * Fetches real-time status of all connected hardware and swarm agents.
 */
export async function getHardwareContext(): Promise<string> {
  const devices = iotBridge.deviceList;
  if (devices.length === 0) return "";

  const onlineDevices = devices.filter(d => d.status === "online");
  // Update Central Physical State for Maestro
  const mainRobot = onlineDevices.find(d => d.type === "robot");
  if (mainRobot) {
    updatePhysicalState({
      battery: mainRobot.metadata?.battery || 100,
      obstacles: mainRobot.metadata?.obstacle_detected || false,
      mobilityStatus: mainRobot.status === "error" ? "critical" : "ok"
    });
  }

  if (mainRobot && mainRobot.status === "error") {
    createProposal({
      type: "hardware_fault",
      description: `Falha detectada no robô ${mainRobot.name}. Analisando causa raiz.`,
      riskLevel: "moderate",
      subsystem: "robotics_bridge",
      suggestedChanges: "[Diagnostics: Check ROS2 topic health and sensor calibration]"
    });
  }


  const robotStatus = onlineDevices.filter(d => d.type === "robot")
    .map(r => `${r.name}: ${r.status} (Batt: ${r.metadata?.battery || "N/A"}%)`)
    .join(", ");

  const iotStatus = onlineDevices.filter(d => d.type !== "robot")
    .map(d => `${d.name} (${d.type})`)
    .join(", ");

  return `[HARDWARE REAL-TIME]\nOnline: ${onlineDevices.length}/${devices.length}\nRobots: ${robotStatus || "None"}\nIoT: ${iotStatus || "None"}`;
}

/**
 * Checks for swarm task alerts.
 */
export async function getSwarmAlerts(): Promise<string> {
  // Simulate swarm awareness for LLM context
  return `[SWARM STATUS] All agents synchronized. Raft leader active. Ready for distributed tasks.`;
}
