/**
 * Capacitor Spotify Playback Plugin — TypeScript Bridge
 * Auto-detects native vs web: uses Spotify App Remote SDK on Android,
 * falls back to Web Playback SDK on browsers.
 */
import { Capacitor, registerPlugin } from "@capacitor/core";

export interface SpotifyPlayerState {
  isPlaying: boolean;
  trackUri: string | null;
  trackName: string | null;
  artistName: string | null;
  albumName: string | null;
  albumArtUrl: string | null;
  positionMs: number;
  durationMs: number;
  volume: number;
}

export interface SpotifyNativePlugin {
  connect(options: { clientId: string; redirectUri: string }): Promise<{ connected: boolean }>;
  disconnect(): Promise<void>;
  play(options: { uri: string }): Promise<void>;
  pause(): Promise<void>;
  resume(): Promise<void>;
  seek(options: { positionMs: number }): Promise<void>;
  nextTrack(): Promise<void>;
  previousTrack(): Promise<void>;
  setVolume(options: { volume: number }): Promise<void>;
  getPlayerState(): Promise<SpotifyPlayerState>;
}

// Register the native plugin — resolves to Java/Swift impl on device
const SpotifyPlaybackNative = registerPlugin<SpotifyNativePlugin>("SpotifyPlayback");

/**
 * Check if we're running inside a native Capacitor shell (Android/iOS)
 */
export function isNativeSpotifyAvailable(): boolean {
  return Capacitor.isNativePlatform();
}

/**
 * Unified bridge — delegates to native plugin on Android, no-ops on web
 * (Web uses useSpotifyPlayback hook directly via Web Playback SDK)
 */
export class SpotifyCapacitorBridge {
  private connected = false;

  async connect(clientId: string, redirectUri: string): Promise<boolean> {
    if (!isNativeSpotifyAvailable()) {
      console.log("[SpotifyBridge] Web platform — use Web Playback SDK instead");
      return false;
    }

    try {
      const result = await SpotifyPlaybackNative.connect({ clientId, redirectUri });
      this.connected = result.connected;
      return this.connected;
    } catch (e) {
      console.error("[SpotifyBridge] Native connect failed:", e);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    if (!isNativeSpotifyAvailable()) return;
    await SpotifyPlaybackNative.disconnect();
    this.connected = false;
  }

  async play(uri: string): Promise<void> {
    if (!isNativeSpotifyAvailable()) return;
    await SpotifyPlaybackNative.play({ uri });
  }

  async pause(): Promise<void> {
    if (!isNativeSpotifyAvailable()) return;
    await SpotifyPlaybackNative.pause();
  }

  async resume(): Promise<void> {
    if (!isNativeSpotifyAvailable()) return;
    await SpotifyPlaybackNative.resume();
  }

  async seek(positionMs: number): Promise<void> {
    if (!isNativeSpotifyAvailable()) return;
    await SpotifyPlaybackNative.seek({ positionMs });
  }

  async nextTrack(): Promise<void> {
    if (!isNativeSpotifyAvailable()) return;
    await SpotifyPlaybackNative.nextTrack();
  }

  async previousTrack(): Promise<void> {
    if (!isNativeSpotifyAvailable()) return;
    await SpotifyPlaybackNative.previousTrack();
  }

  async setVolume(volume: number): Promise<void> {
    if (!isNativeSpotifyAvailable()) return;
    await SpotifyPlaybackNative.setVolume({ volume: Math.max(0, Math.min(1, volume)) });
  }

  async getPlayerState(): Promise<SpotifyPlayerState | null> {
    if (!isNativeSpotifyAvailable()) return null;
    try {
      return await SpotifyPlaybackNative.getPlayerState();
    } catch {
      return null;
    }
  }

  isConnected(): boolean {
    return this.connected;
  }
}

export const spotifyBridge = new SpotifyCapacitorBridge();
