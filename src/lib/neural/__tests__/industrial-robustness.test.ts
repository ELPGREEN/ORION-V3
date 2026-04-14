import { describe, it, expect, vi, beforeEach } from "vitest";
import { ros2Bridge } from "../ros2-protocol-bridge";
import { iotBridge } from "../iot-device-bridge";

describe("Industrial Robustness & Edge Cases", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ros2Bridge.reset();
  });

  it("ROS2 Bridge: prevents memory exhaustion by limiting robot count", () => {
    const bridge = ros2Bridge;
    // We know max is 50. Let's try to register 60.
    // Use fresh bridge instance if possible, but it's a singleton.
    // Let's just test that it throws when limit is exceeded.

    // Fill up
    for (let i = 0; i < 50; i++) {
      try { bridge.registerRobot(`bot_${i}`, `Bot ${i}`); } catch {}
    }

    expect(() => {
      bridge.registerRobot("one_too_many", "The Flood");
    }).toThrow(/Maximum robot capacity reached/);
  });

  it("ROS2 Bridge: sanitizes malformed telemetry (battery > 100%)", () => {
    const robotId = "test_sanitization";
    ros2Bridge.registerRobot(robotId, "Test Bot");

    // Simulate MQTT message with 150% battery
    ros2Bridge.processInboundMessage(`robot/${robotId}/battery`, {
      percentage: 150,
      voltage: 12.0,
      power_supply_status: "discharging"
    });

    const robot = ros2Bridge.getRobot(robotId);
    expect(robot?.battery?.percentage).toBe(100);
  });

  it("ROS2 Bridge: sanitizes malformed telemetry (negative laser ranges)", () => {
    const robotId = "test_lidar";
    ros2Bridge.registerRobot(robotId, "Lidar Bot");

    ros2Bridge.processInboundMessage(`robot/${robotId}/scan`, {
      ranges: [1.0, -0.5, 2.0, -10.0],
      angle_min: 0,
      angle_max: 3.14
    });

    const robot = ros2Bridge.getRobot(robotId);
    expect(robot?.laserScan?.ranges).toEqual([1.0, 0, 2.0, 0]);
  });

  it("ROS2 Bridge: handles invalid JSON or malformed payloads gracefully", () => {
    const robotId = "test_crash";
    ros2Bridge.registerRobot(robotId, "Crash Test");

    // Should not throw even if payload is weird
    expect(() => {
      ros2Bridge.processInboundMessage(`robot/${robotId}/odom`, null);
      ros2Bridge.processInboundMessage(`robot/${robotId}/odom`, "not an object");
    }).not.toThrow();
  });
});
