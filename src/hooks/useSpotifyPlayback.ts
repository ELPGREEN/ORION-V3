/**
 * Spotify Web Playback SDK Hook — Full compliance
 * MediaSession, activateElement, autoplay_failed, playback_error,
 * disallows, repeat/shuffle, pause/resume, typed interfaces
 */
import { useState, useEffect, useCallback, useRef } from "react";

const SPOTIFY_SDK_URL = "https://sdk.scdn.co/spotify-player.js";
const PLAYER_NAME = "Orion Player";

declare global {
  interface Window {
    Spotify: any;
    onSpotifyWebPlaybackSDKReady: () => void;
  }
}

// ── Typed interfaces matching SDK docs ──

export interface WebPlaybackTrack {
  id: string;
  name: string;
  artists: { name: string; uri: string }[];
  album: { name: string; uri: string; images: { url: string }[] };
  duration_ms: number;
  uri: string;
  type: string;
  is_playable: boolean;
}

export interface WebPlaybackDisallows {
  pausing?: boolean;
  peeking_next?: boolean;
  peeking_prev?: boolean;
  resuming?: boolean;
  seeking?: boolean;
  skipping_next?: boolean;
  skipping_prev?: boolean;
}

export interface PlaybackContext {
  uri: string | null;
  metadata: Record<string, string> | null;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTrack: {
    id: string;
    name: string;
    artists: string[];
    albumName: string;
    albumArt: string;
    durationMs: number;
    uri: string;
  } | null;
  positionMs: number;
  volume: number;
  deviceId: string | null;
  isPremium: boolean;
  isReady: boolean;
  error: string | null;
  needsActivation: boolean;
  disallows: WebPlaybackDisallows;
  repeatMode: number; // 0=off, 1=context, 2=track
  shuffle: boolean;
  context: PlaybackContext | null;
  nextTracks: WebPlaybackTrack[];
  previousTracks: WebPlaybackTrack[];
}

const initialState: PlaybackState = {
  isPlaying: false,
  currentTrack: null,
  positionMs: 0,
  volume: 0.7,
  deviceId: null,
  isPremium: true,
  isReady: false,
  error: null,
  needsActivation: false,
  disallows: {},
  repeatMode: 0,
  shuffle: false,
  context: null,
  nextTracks: [],
  previousTracks: [],
};

let sdkLoadPromise: Promise<void> | null = null;

function loadSpotifySDK(): Promise<void> {
  if (sdkLoadPromise) return sdkLoadPromise;
  if (window.Spotify) return Promise.resolve();

  sdkLoadPromise = new Promise((resolve) => {
    const existingCallback = window.onSpotifyWebPlaybackSDKReady;
    window.onSpotifyWebPlaybackSDKReady = () => {
      existingCallback?.();
      resolve();
    };

    if (!document.querySelector(`script[src="${SPOTIFY_SDK_URL}"]`)) {
      const script = document.createElement("script");
      script.src = SPOTIFY_SDK_URL;
      script.async = true;
      document.head.appendChild(script);
    }
  });

  return sdkLoadPromise;
}

function mapTrack(track: any) {
  return {
    id: track.id,
    name: track.name,
    artists: track.artists.map((a: any) => a.name),
    albumName: track.album.name,
    albumArt: track.album.images?.[0]?.url || "",
    durationMs: track.duration_ms,
    uri: track.uri,
  };
}

export function useSpotifyPlayback(accessToken: string | null) {
  const [state, setState] = useState<PlaybackState>(initialState);
  const playerRef = useRef<any>(null);
  const positionInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initialize player
  useEffect(() => {
    if (!accessToken || accessToken === "sdk-managed") {
      setState(prev => ({ ...prev, isReady: false, deviceId: null }));
      return;
    }

    let cancelled = false;

    async function init() {
      try {
        await loadSpotifySDK();
        if (cancelled) return;

        const player = new window.Spotify.Player({
          name: PLAYER_NAME,
          getOAuthToken: (cb: (token: string) => void) => cb(accessToken!),
          volume: initialState.volume,
          enableMediaSession: true, // lockscreen/notification controls
        });

        const teardownPlayer = () => {
          try { player.disconnect(); } catch {}
          if (playerRef.current === player) playerRef.current = null;
          if (positionInterval.current) clearInterval(positionInterval.current);
        };

        player.addListener("ready", ({ device_id }: { device_id: string }) => {
          if (cancelled) return;
          console.log("[Orion SDK] Player ready, device:", device_id);
          setState(prev => ({ ...prev, deviceId: device_id, isReady: true, error: null }));
        });

        player.addListener("not_ready", () => {
          if (cancelled) return;
          setState(prev => ({ ...prev, isReady: false, deviceId: null }));
        });

        player.addListener("player_state_changed", (sdkState: any) => {
          if (cancelled || !sdkState) return;
          const track = sdkState.track_window?.current_track;
          const nextTracks: WebPlaybackTrack[] = sdkState.track_window?.next_tracks || [];
          const previousTracks: WebPlaybackTrack[] = sdkState.track_window?.previous_tracks || [];

          setState(prev => ({
            ...prev,
            isPlaying: !sdkState.paused,
            positionMs: sdkState.position,
            currentTrack: track ? mapTrack(track) : null,
            disallows: sdkState.disallows || {},
            repeatMode: sdkState.repeat_mode ?? 0,
            shuffle: sdkState.shuffle ?? false,
            context: sdkState.context ? { uri: sdkState.context.uri, metadata: sdkState.context.metadata } : null,
            nextTracks,
            previousTracks,
            needsActivation: false,
          }));
        });

        player.addListener("autoplay_failed", () => {
          if (cancelled) return;
          console.warn("[Orion SDK] Autoplay failed — user interaction required");
          setState(prev => ({ ...prev, needsActivation: true }));
        });

        player.addListener("playback_error", ({ message }: { message: string }) => {
          if (cancelled) return;
          console.error("[Orion SDK] Playback error:", message);
          setState(prev => ({ ...prev, error: `Playback: ${message}` }));
        });

        player.addListener("initialization_error", ({ message }: { message: string }) => {
          console.error("[Orion SDK] Init error:", message);
          teardownPlayer();
          setState(prev => ({ ...prev, error: message, isReady: false }));
        });

        player.addListener("authentication_error", ({ message }: { message: string }) => {
          console.error("[Orion SDK] Auth error:", message);
          teardownPlayer();
          if (message.includes("403") || message.toLowerCase().includes("premium")) {
            setState(prev => ({ ...prev, isPremium: false, error: "Spotify Premium necessário para playback", isReady: false }));
          } else {
            setState(prev => ({ ...prev, error: message, isReady: false }));
          }
        });

        player.addListener("account_error", ({ message }: { message: string }) => {
          console.error("[Orion SDK] Account error:", message);
          teardownPlayer();
          setState(prev => ({ ...prev, isPremium: false, error: "Conta Premium necessária", isReady: false }));
        });

        const success = await player.connect();
        if (!success && !cancelled) {
          teardownPlayer();
          setState(prev => ({ ...prev, error: "Falha ao conectar com Spotify SDK" }));
        }

        playerRef.current = player;
      } catch (e: any) {
        if (!cancelled) {
          setState(prev => ({ ...prev, error: e.message || "Erro ao inicializar SDK" }));
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      playerRef.current?.disconnect();
      playerRef.current = null;
      if (positionInterval.current) clearInterval(positionInterval.current);
    };
  }, [accessToken]);

  // Position tracking
  useEffect(() => {
    if (positionInterval.current) clearInterval(positionInterval.current);

    if (state.isPlaying) {
      positionInterval.current = setInterval(() => {
        setState(prev => ({
          ...prev,
          positionMs: Math.min(prev.positionMs + 1000, prev.currentTrack?.durationMs || 0),
        }));
      }, 1000);
    }

    return () => {
      if (positionInterval.current) clearInterval(positionInterval.current);
    };
  }, [state.isPlaying]);

  // ── Controls ──

  const activateElement = useCallback(async () => {
    await playerRef.current?.activateElement();
    setState(prev => ({ ...prev, needsActivation: false }));
  }, []);

  const playTrack = useCallback(async (uri: string, contextUri?: string) => {
    if (!state.deviceId || !accessToken) return false;
    try {
      const body: any = contextUri
        ? { context_uri: contextUri, offset: { uri } }
        : { uris: [uri] };

      const res = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${state.deviceId}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 403) {
        setState(prev => ({ ...prev, isPremium: false, error: "Spotify Premium necessário" }));
        return false;
      }
      return res.ok || res.status === 204;
    } catch {
      return false;
    }
  }, [state.deviceId, accessToken]);

  const pause = useCallback(async () => {
    await playerRef.current?.pause();
  }, []);

  const resume = useCallback(async () => {
    await playerRef.current?.resume();
  }, []);

  const togglePlay = useCallback(async () => {
    await playerRef.current?.togglePlay();
  }, []);

  const skipNext = useCallback(async () => {
    await playerRef.current?.nextTrack();
  }, []);

  const skipPrev = useCallback(async () => {
    await playerRef.current?.previousTrack();
  }, []);

  const seekTo = useCallback(async (positionMs: number) => {
    await playerRef.current?.seek(positionMs);
    setState(prev => ({ ...prev, positionMs }));
  }, []);

  const changeVolume = useCallback(async (volume: number) => {
    const v = Math.max(0, Math.min(1, volume));
    await playerRef.current?.setVolume(v);
    setState(prev => ({ ...prev, volume: v }));
  }, []);

  const getCurrentState = useCallback(async () => {
    return playerRef.current?.getCurrentState() ?? null;
  }, []);

  return {
    ...state,
    activateElement,
    playTrack,
    pause,
    resume,
    togglePlay,
    skipNext,
    skipPrev,
    seekTo,
    changeVolume,
    getCurrentState,
  };
}
