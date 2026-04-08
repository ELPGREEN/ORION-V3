/**
 * Gemini Live API — Direct WebSocket connection for real-time voice.
 * Uses gemini-live-2.5-flash-native-audio (GA, free).
 * 
 * Architecture:
 * 1. Edge function provides ephemeral token (or direct key)
 * 2. Client opens WebSocket directly to Gemini (zero proxy latency)
 * 3. Bidirectional audio streaming: mic → Gemini → speaker
 */

import { supabase } from "@/integrations/supabase/client";

export interface GeminiLiveSession {
  send(audio: ArrayBuffer): void;
  sendText(text: string): void;
  close(): void;
  readonly connected: boolean;
}

export interface GeminiLiveOptions {
  voice?: string;
  systemInstruction?: string;
  onAudio?: (audio: ArrayBuffer) => void;
  onText?: (text: string) => void;
  onConnected?: () => void;
  onDisconnected?: (reason?: string) => void;
  onError?: (error: string) => void;
}

interface TokenResponse {
  mode: "ephemeral" | "direct";
  token?: string;
  model: string;
  wsUrl: string;
  voice: string;
  expiresAt: string;
}

/**
 * Get ephemeral token from edge function
 */
async function getToken(voice?: string, systemInstruction?: string): Promise<TokenResponse> {
  const { data, error } = await supabase.functions.invoke("gemini-live-token", {
    body: { voice, systemInstruction },
  });

  if (error) throw new Error(`Token error: ${error.message}`);
  if (!data?.wsUrl) throw new Error("Invalid token response");
  return data as TokenResponse;
}

/**
 * Connect to Gemini Live API via WebSocket for real-time voice.
 */
export async function connectGeminiLive(options: GeminiLiveOptions = {}): Promise<GeminiLiveSession> {
  const tokenData = await getToken(options.voice, options.systemInstruction);

  console.log(`[Gemini Live] Connecting in ${tokenData.mode} mode, voice: ${tokenData.voice}`);

  // Build the WebSocket URL for BidiGenerateContent
  let wsUrl: string;
  if (tokenData.mode === "direct" && tokenData.apiKey) {
    wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?key=${tokenData.apiKey}`;
  } else {
    wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent?access_token=${tokenData.token}`;
  }

  const ws = new WebSocket(wsUrl);
  let _connected = false;

  ws.onopen = () => {
    console.log("[Gemini Live] WebSocket connected, sending setup...");

    // Send setup message
    const setup = {
      setup: {
        model: `models/${tokenData.model}`,
        generation_config: {
          response_modalities: ["AUDIO"],
          speech_config: {
            voice_config: {
              prebuilt_voice_config: {
                voice_name: options.voice || tokenData.voice || "Algieba",
              },
            },
          },
        },
        system_instruction: {
          parts: [
            {
              text: options.systemInstruction ||
                "Você é Orion, um assistente de IA brasileiro avançado. Fale sempre em português brasileiro de forma natural, concisa e amigável. Responda em 2-4 frases.",
            },
          ],
        },
      },
    };

    ws.send(JSON.stringify(setup));
  };

  ws.onmessage = (event) => {
    try {
      const data = typeof event.data === "string" ? JSON.parse(event.data) : null;

      if (!data) return;

      // Setup complete
      if (data.setupComplete) {
        _connected = true;
        console.log("[Gemini Live] Setup complete, ready for audio");
        options.onConnected?.();
        return;
      }

      // Server content (audio or text)
      const serverContent = data.serverContent;
      if (serverContent) {
        const parts = serverContent.modelTurn?.parts || [];
        for (const part of parts) {
          // Audio response
          if (part.inlineData?.mimeType?.startsWith("audio/")) {
            const base64 = part.inlineData.data;
            const binary = atob(base64);
            const buffer = new ArrayBuffer(binary.length);
            const view = new Uint8Array(buffer);
            for (let i = 0; i < binary.length; i++) {
              view[i] = binary.charCodeAt(i);
            }
            options.onAudio?.(buffer);
          }
          // Text response
          if (part.text) {
            options.onText?.(part.text);
          }
        }

        // Turn complete
        if (serverContent.turnComplete) {
          console.log("[Gemini Live] Turn complete");
        }
      }
    } catch (err) {
      console.warn("[Gemini Live] Message parse error:", err);
    }
  };

  ws.onerror = (event) => {
    console.error("[Gemini Live] WebSocket error:", event);
    options.onError?.("WebSocket connection error");
  };

  ws.onclose = (event) => {
    _connected = false;
    console.log(`[Gemini Live] Disconnected: ${event.code} ${event.reason}`);
    options.onDisconnected?.(event.reason || `Code: ${event.code}`);
  };

  return {
    send(audio: ArrayBuffer) {
      if (!_connected || ws.readyState !== WebSocket.OPEN) return;

      // Convert to base64
      const bytes = new Uint8Array(audio);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      const msg = {
        realtimeInput: {
          mediaChunks: [
            {
              mimeType: "audio/pcm;rate=16000",
              data: base64,
            },
          ],
        },
      };
      ws.send(JSON.stringify(msg));
    },

    sendText(text: string) {
      if (!_connected || ws.readyState !== WebSocket.OPEN) return;

      const msg = {
        clientContent: {
          turns: [
            {
              role: "user",
              parts: [{ text }],
            },
          ],
          turnComplete: true,
        },
      };
      ws.send(JSON.stringify(msg));
    },

    close() {
      _connected = false;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close(1000, "User closed");
      }
    },

    get connected() {
      return _connected;
    },
  };
}

/**
 * Audio playback helper — plays raw PCM 24kHz mono from Gemini
 */
export class GeminiAudioPlayer {
  private ctx: AudioContext | null = null;
  private queue: AudioBuffer[] = [];
  private playing = false;
  private nextStartTime = 0;

  constructor(private sampleRate = 24000) {}

  async play(pcmData: ArrayBuffer) {
    if (!this.ctx) {
      this.ctx = new AudioContext({ sampleRate: this.sampleRate });
    }

    // PCM 16-bit LE mono → Float32
    const int16 = new Int16Array(pcmData);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768;
    }

    const audioBuffer = this.ctx.createBuffer(1, float32.length, this.sampleRate);
    audioBuffer.getChannelData(0).set(float32);

    // Schedule playback
    const source = this.ctx.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.ctx.destination);

    const now = this.ctx.currentTime;
    const startTime = Math.max(now, this.nextStartTime);
    source.start(startTime);
    this.nextStartTime = startTime + audioBuffer.duration;
  }

  stop() {
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
    this.nextStartTime = 0;
  }
}
