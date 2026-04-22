import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ── Mocks ────────────────────────────────────────────────────────
vi.mock("@/lib/spotify/spotify-service", () => ({
  isSpotifyConnected: vi.fn(),
}));
vi.mock("@/lib/youtube-music/youtube-music-service", () => ({
  isYTMusicConnected: vi.fn().mockResolvedValue(false),
}));
vi.mock("@/lib/utils/deep-link", () => ({
  openSpotify: vi.fn(),
  openYouTube: vi.fn(),
  openAmazonMusic: vi.fn(),
  isMobileDevice: () => false,
}));
vi.mock("sonner", () => ({ toast: { info: vi.fn() } }));

import {
  resolveMusicPlatform,
  playMusicWithFallback,
  invalidateMusicCache,
} from "../music-fallback-resolver";
import { isSpotifyConnected } from "@/lib/spotify/spotify-service";

const setLocal = (k: string, v: string | null) => {
  if (v === null) localStorage.removeItem(k);
  else localStorage.setItem(k, v);
};

beforeEach(() => {
  invalidateMusicCache();
  vi.clearAllMocks();
  setLocal("amazon_access_token", null);
  (isSpotifyConnected as any).mockResolvedValue(false);
});

afterEach(() => {
  invalidateMusicCache();
});

describe("music-fallback-resolver — platform priority", () => {
  it("default (no preference) → ALWAYS YouTube, even if Spotify is connected", async () => {
    (isSpotifyConnected as any).mockResolvedValue(true);
    const r = await resolveMusicPlatform();
    expect(r.platform).toBe("youtube");
  });

  it("default → YouTube even if Amazon is connected", async () => {
    setLocal("amazon_access_token", "tk");
    const r = await resolveMusicPlatform();
    expect(r.platform).toBe("youtube");
  });

  it("explicit spotify + connected → Spotify", async () => {
    (isSpotifyConnected as any).mockResolvedValue(true);
    const r = await resolveMusicPlatform("spotify");
    expect(r.platform).toBe("spotify");
  });

  it("explicit spotify + NOT connected → falls back to YouTube", async () => {
    (isSpotifyConnected as any).mockResolvedValue(false);
    const r = await resolveMusicPlatform("spotify");
    expect(r.platform).toBe("youtube");
  });

  it("explicit amazon_music + connected → Amazon Music", async () => {
    setLocal("amazon_access_token", "tk");
    const r = await resolveMusicPlatform("amazon_music");
    expect(r.platform).toBe("amazon_music");
  });

  it("explicit amazon_music + NOT connected → falls back to YouTube", async () => {
    const r = await resolveMusicPlatform("amazon_music");
    expect(r.platform).toBe("youtube");
  });
});

describe("music-fallback-resolver — playMusicWithFallback", () => {
  it("'toca uma música aí' (no platform) → YouTube, no fallback flag", async () => {
    const r = await playMusicWithFallback("imagine dragons");
    expect(r.platform).toBe("youtube");
    expect(r.fallback).toBe(false);
    expect(r.description).toContain("YouTube");
  });

  it("Spotify requested but not connected → fallback=true, platform=youtube", async () => {
    const r = await playMusicWithFallback("imagine dragons", "spotify");
    expect(r.platform).toBe("youtube");
    expect(r.fallback).toBe(true);
    expect(r.description).toContain("Spotify não conectado");
  });

  it("Amazon requested but not connected → fallback=true, platform=youtube", async () => {
    const r = await playMusicWithFallback("imagine dragons", "amazon_music");
    expect(r.platform).toBe("youtube");
    expect(r.fallback).toBe(true);
    expect(r.description).toContain("Amazon Music não conectado");
  });

  it("Spotify requested AND connected → spotify, no fallback", async () => {
    (isSpotifyConnected as any).mockResolvedValue(true);
    const r = await playMusicWithFallback("imagine dragons", "spotify");
    expect(r.platform).toBe("spotify");
    expect(r.fallback).toBe(false);
  });
});
