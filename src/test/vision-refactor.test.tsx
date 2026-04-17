import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useVisionCamera } from "../hooks/vision/useVisionCamera";

// Mock navigator.mediaDevices
global.navigator.mediaDevices = {
  getUserMedia: vi.fn().mockResolvedValue({
    getTracks: () => [{ stop: vi.fn() }],
  }),
} as any;

describe("Vision Refactor Hooks", () => {
  it("useVisionCamera should initialize as inactive", () => {
    const { result } = renderHook(() => useVisionCamera());
    expect(result.current.active).toBe(false);
  });

  it("useVisionCamera should become active after startCamera", async () => {
    const { result } = renderHook(() => useVisionCamera());

    // Mock video element since it won't be rendered in renderHook
    const mockVideo = {
      play: vi.fn().mockResolvedValue(undefined),
      readyState: 4,
    };
    result.current.videoRef.current = mockVideo as any;

    await act(async () => {
      await result.current.startCamera();
    });

    expect(result.current.active).toBe(true);
  });
});
