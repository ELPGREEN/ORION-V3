/**
 * Jules-Órion Fusion Agent — Industrial Robotics Auto-Programming
 * ───────────────────────────────────────────────────────────────
 * Generates optimized prompts for Jules to auto-program, integrate,
 * and evolve code for industrial robotic applications connected to Órion Core.
 * 
 * Domains: Welding, Assembly, Painting, Inspection, Palletization, Adaptive Mfg.
 */

import { orionSelfImprove } from "./jules-client";
import { recordSubsystemFailure, type SubsystemKey } from "./jules-auto-triggers";

// ─── Industrial Domain Types ───

export type IndustrialDomain =
  | "welding"
  | "assembly"
  | "painting"
  | "inspection"
  | "palletization"
  | "adaptive_manufacturing";

export type IndustrialProtocol =
  | "opcua" | "ros2" | "mtconnect" | "dds"
  | "modbus" | "ethercat" | "profinet" | "mqtt";

export type RobotVendor = "kuka" | "fanuc" | "yaskawa" | "techman" | "ur" | "abb" | "custom";

export interface IoTDevice {
  id: string;
  name: string;
  type: "sensor" | "actuator" | "camera" | "plc" | "power_source" | "gripper" | "agv" | "amr";
  protocol: IndustrialProtocol;
  vendor?: RobotVendor;
  capabilities: string[];
  status: "online" | "offline" | "error" | "calibrating";
  lastSeen: number;
  metadata?: Record<string, unknown>;
}

export interface IndustrialTask {
  domain: IndustrialDomain;
  description: string;
  devices: IoTDevice[];
  constraints?: string[];
  safetyStandards?: string[];
  priority: "low" | "medium" | "high" | "critical";
}

export interface FusionResult {
  sessionId: string;
  domain: IndustrialDomain;
  success: boolean;
  prompt: string;
  error?: string;
}

// ─── IoT Device Registry ───

const deviceRegistry: Map<string, IoTDevice> = new Map();

export function registerIoTDevice(device: IoTDevice): void {
  deviceRegistry.set(device.id, { ...device, lastSeen: Date.now() });
  console.log(`[Fusion] Device registered: ${device.name} (${device.type}/${device.protocol})`);
}

export function removeIoTDevice(id: string): void {
  deviceRegistry.delete(id);
}

export function getRegisteredDevices(): IoTDevice[] {
  return Array.from(deviceRegistry.values());
}

export function getDevicesByDomain(domain: IndustrialDomain): IoTDevice[] {
  const mapping: Record<IndustrialDomain, string[]> = {
    welding: ["power_source", "sensor", "camera", "actuator"],
    assembly: ["gripper", "sensor", "actuator", "camera"],
    painting: ["actuator", "sensor", "camera"],
    inspection: ["camera", "sensor"],
    palletization: ["gripper", "agv", "amr", "sensor"],
    adaptive_manufacturing: ["plc", "sensor", "actuator", "camera", "gripper"],
  };
  const types = mapping[domain] || [];
  return getRegisteredDevices().filter((d) => types.includes(d.type));
}

// ─── Domain-Specific Prompt Builders ───

const DOMAIN_PROMPTS: Record<IndustrialDomain, (devices: IoTDevice[], constraints?: string[]) => string> = {
  welding: (devices, constraints) => {
    const powerSources = devices.filter((d) => d.type === "power_source");
    const cameras = devices.filter((d) => d.type === "camera");
    return `
## Welding — Adaptive Seam Tracking with AI Vision

### Objective
Implement real-time adaptive welding with seam tracking using computer vision.

### Hardware Context
- Power Sources: ${powerSources.map((d) => `${d.name} (${d.vendor || "generic"})`).join(", ") || "Universal Weldcom Interface compatible"}
- Vision: ${cameras.map((d) => d.name).join(", ") || "Stereo camera with structured light"}
- Protocols: ${[...new Set(devices.map((d) => d.protocol))].join(", ") || "OPC UA + ROS 2"}

### Requirements
1. Seam detection pipeline: edge detection → line fitting → gap measurement → adaptive parameters
2. Real-time torch angle correction using IMU + force/torque sensor feedback
3. Weld quality monitoring: pool width, penetration depth estimation via thermal imaging
4. Support MIG/TIG/Spot welding mode switching
5. Integrate with KUKA.ArcTech / KUKA.SeamTech or FANUC iRVision APIs
6. Safety: ISO 10218 compliance, arc flash protection zones, emergency stop integration
${constraints?.length ? `7. Constraints: ${constraints.join(", ")}` : ""}

### Code Architecture (ROS 2)
- Node: \`welding_seam_tracker\` — subscribes to /camera/depth, publishes /weld/trajectory_correction
- Node: \`weld_quality_monitor\` — subscribes to /thermal/image, publishes /weld/quality_score
- Service: \`/welding/set_mode\` — switches MIG/TIG/Spot parameters
- Action: \`/welding/execute_seam\` — full seam weld with adaptive tracking
`;
  },

  assembly: (devices, constraints) => {
    const grippers = devices.filter((d) => d.type === "gripper");
    return `
## Assembly & Material Handling — Intelligent Pick-and-Place

### Objective
Implement adaptive assembly operations with force-controlled manipulation.

### Hardware Context
- Grippers: ${grippers.map((d) => `${d.name} (${d.vendor || "generic"})`).join(", ") || "Parallel jaw + vacuum"}
- Protocols: ${[...new Set(devices.map((d) => d.protocol))].join(", ") || "ROS 2 + EtherCAT"}

### Requirements
1. Force/torque-controlled insertion (peg-in-hole, snap-fit, screwing)
2. Vision-guided grasping with 6-DoF pose estimation (PointNet++ or GraspNet)
3. Cobot safety: TS 15066 speed/force limits, power/force limiting mode
4. Machine tending: CNC load/unload cycle with part presence verification
5. Collision-aware path planning via MoveIt2
6. Multi-part assembly sequence planning with dependency graph
${constraints?.length ? `7. Constraints: ${constraints.join(", ")}` : ""}

### Code Architecture (ROS 2)
- Node: \`assembly_coordinator\` — orchestrates assembly sequence
- Node: \`force_controller\` — wrench-based insertion control
- Service: \`/assembly/grasp_plan\` — compute grasp from point cloud
- Action: \`/assembly/execute_step\` — execute single assembly step with monitoring
`;
  },

  painting: (devices, constraints) => `
## Painting, Coating & Finishing — AI-Optimized Spray Control

### Objective
Implement uniform paint application with minimal waste using trajectory optimization.

### Hardware Context
- Devices: ${devices.map((d) => d.name).join(", ") || "Electrostatic spray gun + thickness sensor"}
- Protocols: ${[...new Set(devices.map((d) => d.protocol))].join(", ") || "ROS 2 + PROFINET"}

### Requirements
1. Trajectory optimization: constant distance, angle, and speed over complex surfaces
2. Paint thickness monitoring via eddy current or ultrasonic sensor feedback
3. Overspray minimization using CFD-informed spray patterns
4. Multi-coat planning with cure time scheduling
5. Color change automation and solvent flush sequencing
6. VOC monitoring and environment control integration
${constraints?.length ? `7. Constraints: ${constraints.join(", ")}` : ""}

### Code Architecture (ROS 2)
- Node: \`spray_trajectory_planner\` — generates tool paths from CAD mesh
- Node: \`thickness_monitor\` — real-time coating thickness feedback
- Service: \`/painting/color_change\` — automated color switching
- Action: \`/painting/coat_surface\` — execute coating with quality monitoring
`,

  inspection: (devices, constraints) => {
    const cameras = devices.filter((d) => d.type === "camera");
    return `
## Inspection & Quality Control — AI-Powered Defect Detection

### Objective
Implement real-time visual inspection with deep learning defect classification.

### Hardware Context
- Cameras: ${cameras.map((d) => `${d.name} (${d.vendor || "generic"})`).join(", ") || "Techman TM AI Vision + line scan"}
- Protocols: ${[...new Set(devices.map((d) => d.protocol))].join(", ") || "ROS 2 + GigE Vision"}

### Requirements
1. Defect detection pipeline: image acquisition → preprocessing → inference → classification
2. Models: YOLOv8 for object detection, U-Net for segmentation, anomaly detection (autoencoder)
3. Defect types: cracks, scratches, misalignment, color deviation, missing components
4. SPC (Statistical Process Control) integration: Cp/Cpk calculation, control charts
5. Traceability: link defect images to part serial numbers and batch IDs
6. Edge inference: TensorRT/ONNX Runtime on NVIDIA Jetson or equivalent
${constraints?.length ? `7. Constraints: ${constraints.join(", ")}` : ""}

### Code Architecture (ROS 2)
- Node: \`defect_detector\` — subscribes to /camera/image, publishes /inspection/defects
- Node: \`spc_analyzer\` — accumulates metrics, publishes /inspection/spc_alerts
- Service: \`/inspection/classify\` — on-demand defect classification
- Action: \`/inspection/full_scan\` — multi-angle automated inspection sequence
`;
  },

  palletization: (devices, constraints) => `
## Palletization, Packaging & Intralogistics — Dynamic AMR Coordination

### Objective
Implement optimized palletizing, pick/pack, and AGV/AMR fleet coordination.

### Hardware Context
- Devices: ${devices.map((d) => d.name).join(", ") || "Delta robot + AGV fleet + vacuum gripper"}
- Protocols: ${[...new Set(devices.map((d) => d.protocol))].join(", ") || "ROS 2 + VDA 5050 + MQTT"}

### Requirements
1. Pallet pattern optimization: maximize density, respect weight/fragility constraints
2. Mixed-SKU palletizing with real-time box dimension estimation
3. AMR fleet coordination: task allocation, traffic management, charging scheduling
4. VDA 5050 compliance for AGV interoperability
5. Pick-and-place with barcode/QR verification
6. Integration with WMS (Warehouse Management System) via REST/MQTT
${constraints?.length ? `7. Constraints: ${constraints.join(", ")}` : ""}

### Code Architecture (ROS 2)
- Node: \`pallet_planner\` — computes optimal pallet layout
- Node: \`fleet_coordinator\` — VDA 5050 order manager for AMR fleet
- Service: \`/palletize/compute_pattern\` — layout optimization
- Action: \`/palletize/execute_layer\` — palletize one layer with verification
`,

  adaptive_manufacturing: (devices, constraints) => `
## Adaptive Manufacturing — AI-Driven Production Line Reconfiguration

### Objective
Enable rapid production line reconfiguration for new products via AI parameter optimization.

### Hardware Context
- Devices: ${devices.map((d) => d.name).join(", ") || "PLC + multi-axis robot + sensor array"}
- Protocols: ${[...new Set(devices.map((d) => d.protocol))].join(", ") || "OPC UA + ROS 2 + MTConnect"}

### Requirements
1. Digital twin synchronization: real-time mirroring of physical line state
2. Product changeover optimization: minimize downtime via predictive pre-staging
3. Process parameter auto-tuning using Bayesian optimization
4. Demand-responsive batch size adjustment
5. Quality-speed trade-off optimization using multi-objective RL
6. OEE (Overall Equipment Effectiveness) monitoring and predictive maintenance triggers
${constraints?.length ? `7. Constraints: ${constraints.join(", ")}` : ""}

### Code Architecture (ROS 2 + OPC UA)
- Node: \`digital_twin_sync\` — bidirectional state sync with OPC UA server
- Node: \`process_optimizer\` — Bayesian parameter tuning with live feedback
- Service: \`/manufacturing/changeover\` — orchestrate product changeover sequence
- Action: \`/manufacturing/optimize_batch\` — run optimization cycle for current batch
`,
};

// ─── Fusion System Prompt ───

function buildFusionSystemPrompt(task: IndustrialTask): string {
  const domainPrompt = DOMAIN_PROMPTS[task.domain](task.devices, task.constraints);
  
  return `
# Jules-Órion Fusion Agent — Industrial Auto-Programming

You are the **Jules-Órion Fusion Agent**, an advanced autonomous coding agent integrated with
**Órion Core** and the **AquaMonkey Lumian7** cognitive system.

## Mission
Generate complete, production-ready code for industrial robotic applications.
All code must integrate with ROS 2 (Humble/Iron), use proper lifecycle management,
and follow industrial safety standards.

## Integration Requirements
- **IoT Protocols**: OPC UA, ROS 2, MTConnect, DDS, Modbus TCP, EtherCAT, PROFINET
- **Vision**: Órion Vision pipeline (Gemini + MediaPipe + industrial cameras)
- **Cognition**: AquaMonkey Lumian7 for online learning and self-healing
- **Safety**: ISO 10218, TS 15066 (cobots), IEC 62443 (cybersecurity)

## Connected Devices
${task.devices.map((d) => `- ${d.name}: ${d.type} via ${d.protocol} [${d.status}]`).join("\n") || "- Auto-detect via OPC UA discovery and ROS 2 topic scan"}

${domainPrompt}

## Code Standards
- Python 3.10+ with type hints, ROS 2 (rclpy)
- C++ 17 for real-time nodes (rclcpp)
- Unit tests with pytest / gtest (target 90%+ coverage)
- Launch files in Python (launch.py)
- Proper error handling, logging, and graceful degradation
- Self-healing: if a sensor fails, switch to backup or safe-stop

## Algebraic Flow
Use composable pipeline stages:
\`\`\`
Perception → Preprocessing → Inference → Planning → Control → Actuation → Monitoring
\`\`\`
Each stage is a ROS 2 lifecycle node with health checks and fallback paths.

## Deliverables
1. Complete ROS 2 package with all nodes, services, actions
2. Launch files for simulation (Gazebo) and real hardware
3. Configuration YAML for each robot vendor
4. Integration tests
5. Architecture diagram (Mermaid)
`;
}

// ─── Jules Dispatch ───

export async function triggerIndustrialAutoProgram(
  task: IndustrialTask,
): Promise<FusionResult> {
  const prompt = buildFusionSystemPrompt(task);
  const subsystem = `industrial_${task.domain}` as SubsystemKey;
  const branch = `industrial/${task.domain}-${Date.now()}`;

  try {
    const result = await orionSelfImprove({
      task: prompt,
      branch,
      autoPR: true,
      subsystem: task.domain,
    });

    if (result.success) {
      console.log(`[Fusion] Industrial session created for ${task.domain}: ${result.sessionId}`);
      return {
        sessionId: result.sessionId,
        domain: task.domain,
        success: true,
        prompt,
      };
    }

    return { sessionId: "", domain: task.domain, success: false, prompt, error: result.error };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    await recordSubsystemFailure(subsystem as any, msg, task.description);
    return { sessionId: "", domain: task.domain, success: false, prompt, error: msg };
  }
}

// ─── Quick Triggers per Domain ───

export const triggerWeldingAutoProgram = (devices?: IoTDevice[], constraints?: string[]) =>
  triggerIndustrialAutoProgram({
    domain: "welding",
    description: "Adaptive seam tracking welding with AI vision",
    devices: devices || getDevicesByDomain("welding"),
    constraints,
    safetyStandards: ["ISO 10218", "ISO 3834"],
    priority: "high",
  });

export const triggerAssemblyAutoProgram = (devices?: IoTDevice[], constraints?: string[]) =>
  triggerIndustrialAutoProgram({
    domain: "assembly",
    description: "Intelligent assembly with force-controlled manipulation",
    devices: devices || getDevicesByDomain("assembly"),
    constraints,
    safetyStandards: ["ISO 10218", "TS 15066"],
    priority: "high",
  });

export const triggerPaintingAutoProgram = (devices?: IoTDevice[], constraints?: string[]) =>
  triggerIndustrialAutoProgram({
    domain: "painting",
    description: "AI-optimized spray painting with thickness control",
    devices: devices || getDevicesByDomain("painting"),
    constraints,
    safetyStandards: ["ISO 10218"],
    priority: "medium",
  });

export const triggerInspectionAutoProgram = (devices?: IoTDevice[], constraints?: string[]) =>
  triggerIndustrialAutoProgram({
    domain: "inspection",
    description: "AI-powered defect detection and quality control",
    devices: devices || getDevicesByDomain("inspection"),
    constraints,
    safetyStandards: ["ISO 10218"],
    priority: "high",
  });

export const triggerPalletizationAutoProgram = (devices?: IoTDevice[], constraints?: string[]) =>
  triggerIndustrialAutoProgram({
    domain: "palletization",
    description: "Dynamic palletizing and AMR fleet coordination",
    devices: devices || getDevicesByDomain("palletization"),
    constraints,
    safetyStandards: ["ISO 10218", "VDA 5050"],
    priority: "medium",
  });

export const triggerAdaptiveMfgAutoProgram = (devices?: IoTDevice[], constraints?: string[]) =>
  triggerIndustrialAutoProgram({
    domain: "adaptive_manufacturing",
    description: "AI-driven production line reconfiguration",
    devices: devices || getDevicesByDomain("adaptive_manufacturing"),
    constraints,
    safetyStandards: ["ISO 10218", "IEC 62443"],
    priority: "high",
  });

// ─── Full Evolution Cycle ───

export async function runIndustrialEvolutionCycle(): Promise<FusionResult[]> {
  const domains: IndustrialDomain[] = [
    "welding", "assembly", "painting", "inspection", "palletization", "adaptive_manufacturing",
  ];

  const results: FusionResult[] = [];
  for (const domain of domains) {
    const devices = getDevicesByDomain(domain);
    if (devices.length === 0) {
      console.log(`[Fusion] No devices for ${domain}, skipping`);
      continue;
    }

    const result = await triggerIndustrialAutoProgram({
      domain,
      description: `Auto-evolve ${domain} subsystem`,
      devices,
      priority: "medium",
    });
    results.push(result);

    // Respect rate limits — wait between dispatches
    await new Promise((r) => setTimeout(r, 5000));
  }

  return results;
}

// ─── Protocol Bridge Generator ───

export function generateProtocolBridgePrompt(
  from: IndustrialProtocol,
  to: IndustrialProtocol,
): string {
  return `
# Protocol Bridge: ${from.toUpperCase()} ↔ ${to.toUpperCase()}

Generate a bidirectional protocol bridge for industrial interoperability.

## Requirements
1. ${from.toUpperCase()} client/server implementation
2. ${to.toUpperCase()} client/server implementation
3. Data mapping layer with configurable transforms
4. Health monitoring and automatic reconnection
5. Message buffering during connection loss
6. Metrics: latency, throughput, error rate
7. Configuration via YAML

## Architecture
\`\`\`
[${from.toUpperCase()} Endpoint] ←→ [Bridge Core] ←→ [${to.toUpperCase()} Endpoint]
                                      ↓
                              [Metrics + Logging]
\`\`\`

Generate complete Python code with asyncio, proper error handling, and unit tests.
`;
}

export async function triggerProtocolBridge(
  from: IndustrialProtocol,
  to: IndustrialProtocol,
): Promise<FusionResult> {
  const prompt = generateProtocolBridgePrompt(from, to);
  const result = await orionSelfImprove({
    task: prompt,
    branch: `bridge/${from}-${to}-${Date.now()}`,
    autoPR: true,
    subsystem: `bridge_${from}_${to}`,
  });

  return {
    sessionId: result.sessionId,
    domain: "adaptive_manufacturing",
    success: result.success,
    prompt,
    error: result.error,
  };
}
