/**
 * STT Streamer - Utterance-based STT via Google Cloud
 */
import { supabase } from "@/integrations/supabase/client";

export interface STTStreamerOptions {
  onTranscript: (text: string, isFinal: boolean) => void;
  onError: (error: any) => void;
  languageCode?: string;
}

export class STTStreamer {
  private audioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private workletNode: AudioWorkletNode | null = null;
  private options: STTStreamerOptions;
  private active = false;

  constructor(options: STTStreamerOptions) {
    this.options = options;
  }

  async start() {
    if (this.active) return;

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
          sampleRate: 16000
        }
      });

      this.audioContext = new AudioContext({ sampleRate: 16000 });
      await this.audioContext.audioWorklet.addModule('/stt-processor.js');

      const source = this.audioContext.createMediaStreamSource(this.stream);
      this.workletNode = new AudioWorkletNode(this.audioContext, 'stt-processor');

      this.workletNode.port.onmessage = (event) => {
        if (event.data.type === 'audio') {
          this.sendAudio(event.data.buffer);
        }
      };

      source.connect(this.workletNode);
      this.active = true;
      console.log("[STT Streamer] Started (VAD mode)");
    } catch (err) {
      console.error("[STT Streamer] Failed to start:", err);
      this.options.onError(err);
    }
  }

  private async sendAudio(buffer: Float32Array) {
    if (!this.active || buffer.length < 4000) return; // Ignore very short clips

    // Convert to LINEAR16 base64
    const int16 = new Int16Array(buffer.length);
    for (let i = 0; i < buffer.length; i++) {
      const s = Math.max(-1, Math.min(1, buffer[i]));
      int16[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }

    // Optimized base64 conversion for large buffers
    const uint8 = new Uint8Array(int16.buffer);
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < uint8.length; i += chunkSize) {
      binary += String.fromCharCode.apply(null, Array.from(uint8.subarray(i, i + chunkSize)));
    }
    const base64 = btoa(binary);

    try {
      const { data, error } = await supabase.functions.invoke("google-stt", {
        body: {
          audio: base64,
          sampleRate: 16000,
          languageCode: this.options.languageCode || "pt-BR"
        }
      });

      if (error) throw error;
      if (data?.text) {
        this.options.onTranscript(data.text, true);
      }
    } catch (err) {
      console.warn("[STT Streamer] Send error:", err);
    }
  }

  stop() {
    this.active = false;
    if (this.workletNode) {
      this.workletNode.disconnect();
      this.workletNode = null;
    }
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    console.log("[STT Streamer] Stopped");
  }
}
