/**
 * Native Camera Stream Plugin — Capacitor bridge
 * Provides continuous frame streaming from Android Camera2 API
 * Falls back to Web getUserMedia when not on native
 */

import { Capacitor, registerPlugin } from "@capacitor/core";

export interface CameraStreamFrame {
  base64: string;
  width: number;
  height: number;
  timestamp: number;
  format: "jpeg" | "yuv";
}

export interface CameraStreamConfig {
  quality?: number; // 0-100, default 70
  width?: number; // default 640
  height?: number; // default 480
  fps?: number; // default 15
  facing?: "front" | "back"; // default "back"
}

export interface CameraStreamPlugin {
  startStream(config: CameraStreamConfig): Promise<void>;
  stopStream(): Promise<void>;
  captureFrame(): Promise<CameraStreamFrame>;
  switchCamera(): Promise<{ facing: string }>;
  isStreaming(): Promise<{ streaming: boolean }>;
  addListener(
    eventName: "frame",
    callback: (frame: CameraStreamFrame) => void,
  ): Promise<{ remove: () => void }>;
}

const NativeCameraStream = Capacitor.isNativePlatform()
  ? registerPlugin<CameraStreamPlugin>("CameraStreamPlugin")
  : null;

/**
 * Web fallback using getUserMedia
 */
class WebCameraStream implements CameraStreamPlugin {
  private stream: MediaStream | null = null;
  private video: HTMLVideoElement | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private intervalId: number | null = null;
  private listeners: Array<(frame: CameraStreamFrame) => void> = [];
  private currentFacing: "front" | "back" = "back";

  async startStream(config: CameraStreamConfig = {}): Promise<void> {
    const w = config.width || 640;
    const h = config.height || 480;
    const fps = config.fps || 15;
    this.currentFacing = config.facing || "back";

    this.stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: w },
        height: { ideal: h },
        facingMode: this.currentFacing === "front" ? "user" : "environment",
        frameRate: { ideal: fps },
      },
    });

    this.video = document.createElement("video");
    this.video.srcObject = this.stream;
    this.video.setAttribute("playsinline", "true");
    await this.video.play();

    this.canvas = document.createElement("canvas");
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx = this.canvas.getContext("2d");

    // Emit frames at configured FPS
    const interval = Math.round(1000 / fps);
    this.intervalId = window.setInterval(() => {
      if (this.listeners.length > 0) {
        const frame = this._grabFrame(config.quality || 70);
        if (frame) this.listeners.forEach((cb) => cb(frame));
      }
    }, interval);
  }

  async stopStream(): Promise<void> {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    if (this.video) {
      this.video.srcObject = null;
      this.video = null;
    }
    this.canvas = null;
    this.ctx = null;
  }

  async captureFrame(): Promise<CameraStreamFrame> {
    const frame = this._grabFrame(85);
    if (!frame) throw new Error("No active camera stream");
    return frame;
  }

  async switchCamera(): Promise<{ facing: string }> {
    const wasStreaming = !!this.stream;
    const config: CameraStreamConfig = {
      facing: this.currentFacing === "front" ? "back" : "front",
    };
    if (wasStreaming) {
      await this.stopStream();
      await this.startStream(config);
    }
    this.currentFacing = config.facing!;
    return { facing: this.currentFacing };
  }

  async isStreaming(): Promise<{ streaming: boolean }> {
    return { streaming: !!this.stream };
  }

  async addListener(
    _eventName: "frame",
    callback: (frame: CameraStreamFrame) => void,
  ): Promise<{ remove: () => void }> {
    this.listeners.push(callback);
    return {
      remove: () => {
        this.listeners = this.listeners.filter((l) => l !== callback);
      },
    };
  }

  private _grabFrame(quality: number): CameraStreamFrame | null {
    if (!this.video || !this.ctx || !this.canvas) return null;
    this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
    const dataUrl = this.canvas.toDataURL("image/jpeg", quality / 100);
    const base64 = dataUrl.split(",")[1];
    return {
      base64,
      width: this.canvas.width,
      height: this.canvas.height,
      timestamp: Date.now(),
      format: "jpeg",
    };
  }
}

// Export the appropriate implementation
export const CameraStream: CameraStreamPlugin = NativeCameraStream || new WebCameraStream();

/** Check if native camera is available */
export function isNativeCameraAvailable(): boolean {
  return Capacitor.isNativePlatform() && !!NativeCameraStream;
}
