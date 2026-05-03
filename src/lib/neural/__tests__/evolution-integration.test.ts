import { describe, it, expect, vi, beforeEach } from "vitest";
import { runFullScan, getHealthScore } from "../jules-evolution-engine";
import { recordSubsystemFailure, getSubsystemFailureStatus } from "../jules-auto-triggers";
import { getImmuneMemory, shouldQuarantine, checkAndRegisterResolutions } from "../jules-immune-system";
import { isSubsystemHealthy } from "../subsystem-health-utils";
import { supabase } from "@/integrations/supabase/client";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn().mockImplementation(() => ({
      select: vi.fn().mockImplementation(() => ({
        eq: vi.fn().mockImplementation(() => ({
          gte: vi.fn().mockResolvedValue({ count: 0, error: null }),
          is: vi.fn().mockImplementation(() => ({
            order: vi.fn().mockImplementation(() => ({
              limit: vi.fn().mockResolvedValue({ data: [], error: null }),
            })),
          })),
          order: vi.fn().mockImplementation(() => ({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })),
        gte: vi.fn().mockResolvedValue({ count: 0, error: null }),
        in: vi.fn().mockImplementation(() => ({
          order: vi.fn().mockResolvedValue({ data: [] }),
        })),
      })),
      insert: vi.fn().mockImplementation(() => ({
        select: vi.fn().mockImplementation(() => ({
          single: vi.fn().mockResolvedValue({ data: { id: "test-session" }, error: null }),
        })),
      })),
      update: vi.fn().mockImplementation(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
      invoke: vi.fn().mockResolvedValue({ data: { success: true, data: { id: "test-session" } }, error: null }),
    })),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: { success: true, data: { id: "test-session" } }, error: null }),
    },
  },
}));

describe("Evolution & Immune Integration", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("triggers self-improvement after threshold failures", async () => {
    const subsystem = "core_api";

    // Fail 3 times
    await recordSubsystemFailure(subsystem, "Error 1");
    await recordSubsystemFailure(subsystem, "Error 2");
    const result = await recordSubsystemFailure(subsystem, "Error 3");

    expect(result.julesTriggered).toBe(true);
    expect(result.sessionId).toBeDefined();

    const status = getSubsystemFailureStatus();
    expect(status[subsystem].count).toBe(0);
    expect(status[subsystem].julesTriggered).toBe(true);
  });

  it("quarantines a subsystem after 5 failures", async () => {
    const subsystem = "iot_ros2";

    // Simulate industrial scanner behavior
    const { recordModuleFailure } = await import("../jules-immune-system");

    for(let i = 0; i < 4; i++) recordModuleFailure(subsystem);
    expect(shouldQuarantine(subsystem)).toBe(false);

    recordModuleFailure(subsystem);
    expect(shouldQuarantine(subsystem)).toBe(true);

    // recordSubsystemFailure should now skip
    const result = await recordSubsystemFailure(subsystem as any, "Critical error");
    expect(result.julesTriggered).toBe(false);

    expect(isSubsystemHealthy(subsystem as any)).toBe(false);
  });

  it("registers antibodies from resolved sessions", async () => {
    const subsystem = "core_routing";
    const errorMsg = "Route not found: /admin";
    const hash = `${subsystem}:${errorMsg.slice(0, 50)}`;

    // Mock supabase response for resolutions
    (supabase.from as any).mockImplementationOnce(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [{
          session_id: "session-123",
          subsystem,
          error_snapshot: errorMsg,
          status: "completed",
          resolved: true
        }],
        error: null
      })
    }));

    const registered = await checkAndRegisterResolutions();
    expect(registered).toBe(1);

    const immune = getImmuneMemory();
    expect(immune.antibodies[hash]).toBeDefined();
  });

  it("computes correct health score from scan results", async () => {
    const score = getHealthScore();
    expect(score.overall).toBe(100);
  });
});
