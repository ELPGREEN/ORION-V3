/**
 * Native Speech Plugin — Capacitor bridge
 * Android TextToSpeech + SpeechRecognizer nativo
 * Falls back to Web Speech API when not on native
 */

import { Capacitor, registerPlugin } from "@capacitor/core";

export interface NativeTTSOptions {
  text: string;
  lang?: string; // default "pt-BR"
  rate?: number; // 0.5-2.0, default 1.0
  pitch?: number; // 0.5-2.0, default 1.0
}

export interface NativeSTTResult {
  text: string;
  confidence: number;
  isFinal: boolean;
  alternatives?: string[];
}

export interface NativeSpeechPlugin {
  speak(options: NativeTTSOptions): Promise<{ success: boolean }>;
  stopSpeaking(): Promise<void>;
  isSpeaking(): Promise<{ speaking: boolean }>;
  startListening(options?: { lang?: string; continuous?: boolean }): Promise<void>;
  stopListening(): Promise<void>;
  isListening(): Promise<{ listening: boolean }>;
  getAvailableVoices(): Promise<{ voices: Array<{ name: string; locale: string }> }>;
  addListener(
    eventName: "speechResult",
    callback: (result: NativeSTTResult) => void,
  ): Promise<{ remove: () => void }>;
  addListener(
    eventName: "speechError",
    callback: (error: { code: number; message: string }) => void,
  ): Promise<{ remove: () => void }>;
}

const NativeSpeech = Capacitor.isNativePlatform()
  ? registerPlugin<NativeSpeechPlugin>("NativeSpeechPlugin")
  : null;

/**
 * Web fallback using Web Speech API
 */
class WebSpeechFallback implements NativeSpeechPlugin {
  private synth = typeof window !== "undefined" ? window.speechSynthesis : null;
  private recognition: any = null;
  private listeners: Record<string, Array<(data: any) => void>> = {};

  async speak(options: NativeTTSOptions): Promise<{ success: boolean }> {
    if (!this.synth) return { success: false };

    return new Promise((resolve) => {
      const utterance = new SpeechSynthesisUtterance(options.text);
      utterance.lang = options.lang || "pt-BR";
      utterance.rate = options.rate || 1.0;
      utterance.pitch = options.pitch || 1.0;

      // Try to find a pt-BR voice
      const voices = this.synth!.getVoices();
      const ptVoice = voices.find(
        (v) => v.lang.startsWith("pt-BR") || v.lang.startsWith("pt"),
      );
      if (ptVoice) utterance.voice = ptVoice;

      utterance.onend = () => resolve({ success: true });
      utterance.onerror = () => resolve({ success: false });
      this.synth!.speak(utterance);
    });
  }

  async stopSpeaking(): Promise<void> {
    this.synth?.cancel();
  }

  async isSpeaking(): Promise<{ speaking: boolean }> {
    return { speaking: this.synth?.speaking || false };
  }

  async startListening(options?: { lang?: string; continuous?: boolean }): Promise<void> {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) throw new Error("SpeechRecognition not supported");

    this.recognition = new SpeechRecognition();
    this.recognition.lang = options?.lang || "pt-BR";
    this.recognition.continuous = options?.continuous ?? false;
    this.recognition.interimResults = true;

    this.recognition.onresult = (event: any) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result: NativeSTTResult = {
          text: event.results[i][0].transcript,
          confidence: event.results[i][0].confidence || 0,
          isFinal: event.results[i].isFinal,
          alternatives: Array.from(event.results[i]).slice(1).map((a: any) => a.transcript),
        };
        this.listeners["speechResult"]?.forEach((cb) => cb(result));
      }
    };

    this.recognition.onerror = (event: any) => {
      this.listeners["speechError"]?.forEach((cb) =>
        cb({ code: -1, message: event.error }),
      );
    };

    this.recognition.start();
  }

  async stopListening(): Promise<void> {
    this.recognition?.stop();
    this.recognition = null;
  }

  async isListening(): Promise<{ listening: boolean }> {
    return { listening: !!this.recognition };
  }

  async getAvailableVoices(): Promise<{ voices: Array<{ name: string; locale: string }> }> {
    const voices = this.synth?.getVoices() || [];
    return {
      voices: voices.map((v) => ({ name: v.name, locale: v.lang })),
    };
  }

  async addListener(
    eventName: string,
    callback: (data: any) => void,
  ): Promise<{ remove: () => void }> {
    if (!this.listeners[eventName]) this.listeners[eventName] = [];
    this.listeners[eventName].push(callback);
    return {
      remove: () => {
        this.listeners[eventName] = (this.listeners[eventName] || []).filter(
          (l) => l !== callback,
        );
      },
    };
  }
}

export const Speech: NativeSpeechPlugin = NativeSpeech || new WebSpeechFallback();

export function isNativeSpeechAvailable(): boolean {
  return Capacitor.isNativePlatform() && !!NativeSpeech;
}
