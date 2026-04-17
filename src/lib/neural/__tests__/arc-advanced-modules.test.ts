import { describe, it, expect, vi } from "vitest";
import { ArcDecisionCore } from "../arc-decision-core";
import { ArcRoboticsPerception } from "../arc-robotics-perception";
import { ArcSwarmCoordination } from "../arc-swarm-coordination";
import { ArcFinancialTrading } from "../arc-financial-trading";

describe("ARC-AGI-2 Advanced Modules", () => {
  it("ArcDecisionCore should initialize and perform basic planning", async () => {
    const core = new ArcDecisionCore();
    expect(core).toBeDefined();

    const task = await core.decomposeGoal("Test Goal");
    expect(task.goal).toBe("Test Goal");
    expect(task.subTasks.length).toBeGreaterThan(0);

    const action = core.selectAction({});
    expect(action).toBe("execute_standard_protocol");
  });

  it("ArcRoboticsPerception should initialize and handle object detection", async () => {
    const perception = new ArcRoboticsPerception();
    expect(perception).toBeDefined();

    const objects = await perception.detectObjects("fake_frame");
    expect(objects.length).toBeGreaterThan(0);
    expect(objects[0].label).toBe("human");
  });

  it("ArcSwarmCoordination should initialize and register agents", () => {
    const swarm = new ArcSwarmCoordination();
    expect(swarm).toBeDefined();

    swarm.registerAgent({
      id: "agent_1",
      role: "scout",
      status: "online",
      battery: 100,
      position: { x: 0, y: 0, z: 0 }
    });

    const health = swarm.checkSwarmHealth();
    expect(health.total).toBe(1);
    expect(health.active).toBe(1);
  });

  it("ArcFinancialTrading should initialize and execute orders", async () => {
    const trading = new ArcFinancialTrading();
    expect(trading).toBeDefined();

    const order = await trading.executeOrder("BTC/USD", "buy", 0.1);
    expect(order.status).toBe("filled");
    expect(order.symbol).toBe("BTC/USD");
  });
});
