/**
 * useGeminiLive — React hook for real-time voice with Gemini Live API.
 * Uses gemini-live-2.5-flash-native-audio (GA, free).
 * 
 * Provides: connect, disconnect, sendText, isConnected, isListening
 */

import { useState, useRef, useCallback, useEffect } from "react";
import {
  connectGeminiLive,
  GeminiLiveSession,
  GeminiAudioPlayer,
} from "@/lib/voice/geminiLive";

interface UseGeminiLiveOptions {
  voice?: string;
  systemInstruction?: string;
  autoMic?: boolean; // Auto-start mic on connect
  onText?: (text: string) => void;
  onConnected?: () => void;
  onDisconnected?: (reason?: string) => void;
  onError?: (error: string) => void;
}

export function useGeminiLive(options: UseGeminiLiveOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const sessionRef = useRef<GeminiLiveSession | null>(null);
  const playerRef = useRef<GeminiAudioPlayer | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startMic = useCallback(async () => {
    if (!sessionRef.current?.connected) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { sampleRate: 16000, channelCount: 1, echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;

      const ctx = new AudioContext({ sampleRate: 16000 });
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);

      // Use ScriptProcessorNode to get raw PCM (will migrate to AudioWorklet later)
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      processor.onaudioprocess = (e) => {
        if (!sessionRef.current?.connected) return;

        const input = e.inputBuffer.getChannelData(0);
        // Convert Float32 → Int16 PCM
        const pcm = new Int16Array(input.length);
        for (let i = 0; i < input.length; i++) {
          const s = Math.max(-1, Math.min(1, input[i]));
          pcm[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
        }
        sessionRef.current.send(pcm.buffer);
      };

      source.connect(processor);
      processor.connect(ctx.destination);
      setIsListening(true);
      console.log("[Gemini Live] Mic started");
    } catch (err: any) {
      console.error("[Gemini Live] Mic error:", err);
      options.onError?.(`Mic error: ${err.message}`);
    }
  }, [options]);

  const stopMic = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setIsListening(false);
  }, []);

  const connect = useCallback(async () => {
    if (sessionRef.current?.connected) return;

    try {
      playerRef.current = new GeminiAudioPlayer();

      const session = await connectGeminiLive({
        voice: options.voice,
        systemInstruction: options.systemInstruction,
        onAudio: (audio) => {
          setIsSpeaking(true);
          playerRef.current?.play(audio);
          // Rough estimate: stop speaking after audio duration
          const durationMs = (audio.byteLength / 2 / 24000) * 1000;
          setTimeout(() => setIsSpeaking(false), durationMs);
        },
        onText: (text) => {
          options.onText?.(text);
        },
        onConnected: () => {
          setIsConnected(true);
          options.onConnected?.();
          if (options.autoMic !== false) {
            startMic();
          }
        },
        onDisconnected: (reason) => {
          setIsConnected(false);
          setIsListening(false);
          setIsSpeaking(false);
          options.onDisconnected?.(reason);
        },
        onError: (err) => {
          options.onError?.(err);
        },
      });

      sessionRef.current = session;
    } catch (err: any) {
      console.error("[Gemini Live] Connect error:", err);
      options.onError?.(err.message);
    }
  }, [options, startMic]);

  const disconnect = useCallback(() => {
    stopMic();
    playerRef.current?.stop();
    playerRef.current = null;
    sessionRef.current?.close();
    sessionRef.current = null;
    setIsConnected(false);
    setIsSpeaking(false);
  }, [stopMic]);

  const sendText = useCallback((text: string) => {
    sessionRef.current?.sendText(text);
  }, []);

  return {
    connect,
    disconnect,
    sendText,
    startMic,
    stopMic,
    isConnected,
    isListening,
    isSpeaking,
  };
}
