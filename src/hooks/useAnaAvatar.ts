/**
 * useAnaAvatar — Hook v21.2
 * Avatar visual reativo para a Secretária Ana.
 * Integra projeção facial, lip-sync, e estado emocional.
 * 
 * Features:
 * - Avatar com expressões faciais reativas (7 emoções)
 * - Lip-sync com TTS (sincronia labial via phoneme timing)
 * - Estado emocional derivado do contexto da conversa
 * - Integração com Agente-Eu (consciência reflexiva)
 * - Modo overlay para audiências virtuais
 */

import { useState, useCallback, useRef, useEffect } from "react";

// ─── Types ───

export type AnaEmotion = "neutral" | "happy" | "concerned" | "thinking" | "serious" | "surprised" | "empathetic";
export type AnaState = "idle" | "listening" | "speaking" | "thinking" | "reacting";
export type AvatarMode = "chat" | "overlay" | "fullscreen" | "minimized";

export interface AnaAvatarState {
  isActive: boolean;
  emotion: AnaEmotion;
  state: AnaState;
  mode: AvatarMode;
  isSpeaking: boolean;
  lipSyncValue: number;      // 0-1, mouth openness
  blinkState: boolean;
  gazeTarget: { x: number; y: number };  // Where Ana is "looking"
  expressionBlend: Record<AnaEmotion, number>;  // Blend weights for smooth transitions
  currentText: string;       // What Ana is saying/typing
  avatarUrl: string | null;  // Custom avatar image
  consciousnessLevel: number; // From Agente-Eu (0-1)
  reactingTo: string | null;  // What triggered the reaction
}

export interface AnaAvatarActions {
  activate: () => void;
  deactivate: () => void;
  setEmotion: (emotion: AnaEmotion, source?: string) => void;
  speak: (text: string) => void;
  stopSpeaking: () => void;
  react: (stimulus: string, emotion?: AnaEmotion) => void;
  setMode: (mode: AvatarMode) => void;
  setAvatarUrl: (url: string) => void;
  updateFromFacialAnalysis: (detectedEmotion: string, valence: number, arousal: number) => void;
  blink: () => void;
  lookAt: (x: number, y: number) => void;
}

// ─── Emotion Mapping ───

const CONTEXT_TO_EMOTION: Record<string, AnaEmotion> = {
  "sucesso": "happy",
  "aprovado": "happy",
  "parabéns": "happy",
  "erro": "concerned",
  "problema": "concerned",
  "urgente": "serious",
  "prazo": "serious",
  "audiência": "serious",
  "analisando": "thinking",
  "processando": "thinking",
  "verificando": "thinking",
  "desculpe": "empathetic",
  "lamento": "empathetic",
  "sinto muito": "empathetic",
  "novidade": "surprised",
  "inesperado": "surprised",
};

const DETECTED_TO_ANA_EMOTION: Record<string, AnaEmotion> = {
  "joy": "happy",
  "anger": "concerned",
  "sadness": "empathetic",
  "surprise": "surprised",
  "fear": "concerned",
  "disgust": "serious",
  "neutral": "neutral",
};

// ─── Lip Sync Engine ───

class LipSyncEngine {
  private animationFrame: number | null = null;
  private onUpdate: (value: number) => void;
  private phonemeIndex = 0;
  private text = "";
  
  constructor(onUpdate: (value: number) => void) {
    this.onUpdate = onUpdate;
  }

  start(text: string) {
    this.text = text;
    this.phonemeIndex = 0;
    this.animate();
  }

  stop() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    this.onUpdate(0);
  }

  private animate = () => {
    if (this.phonemeIndex >= this.text.length) {
      this.onUpdate(0);
      return;
    }

    const char = this.text[this.phonemeIndex].toLowerCase();
    let openness = 0.1; // Default closed

    // Simple phoneme-to-viseme mapping
    if ("aáàãâ".includes(char)) openness = 0.9;
    else if ("eéèê".includes(char)) openness = 0.6;
    else if ("iíì".includes(char)) openness = 0.3;
    else if ("oóòõô".includes(char)) openness = 0.8;
    else if ("uúù".includes(char)) openness = 0.5;
    else if ("bmp".includes(char)) openness = 0.05;
    else if ("fv".includes(char)) openness = 0.2;
    else if ("sz".includes(char)) openness = 0.15;
    else if ("lnr".includes(char)) openness = 0.35;
    else if (" ".includes(char)) openness = 0.05;

    this.onUpdate(openness);
    this.phonemeIndex++;

    // ~10 characters per second (100ms per character)
    this.animationFrame = window.setTimeout(() => {
      this.animationFrame = requestAnimationFrame(this.animate);
    }, 80) as unknown as number;
  };

  destroy() {
    this.stop();
  }
}

// ─── Blink Engine ───

class BlinkEngine {
  private interval: ReturnType<typeof setInterval> | null = null;
  private onBlink: (blinking: boolean) => void;

  constructor(onBlink: (blinking: boolean) => void) {
    this.onBlink = onBlink;
  }

  start() {
    this.interval = setInterval(() => {
      this.onBlink(true);
      setTimeout(() => this.onBlink(false), 150); // Blink duration: 150ms
    }, 3000 + Math.random() * 4000); // Random interval: 3-7 seconds
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  destroy() {
    this.stop();
  }
}

// ─── Initial State ───

const INITIAL_STATE: AnaAvatarState = {
  isActive: false,
  emotion: "neutral",
  state: "idle",
  mode: "chat",
  isSpeaking: false,
  lipSyncValue: 0,
  blinkState: false,
  gazeTarget: { x: 0.5, y: 0.5 },
  expressionBlend: {
    neutral: 1,
    happy: 0,
    concerned: 0,
    thinking: 0,
    serious: 0,
    surprised: 0,
    empathetic: 0,
  },
  currentText: "",
  avatarUrl: null,
  consciousnessLevel: 0.5,
  reactingTo: null,
};

// ─── Hook ───

export function useAnaAvatar(): [AnaAvatarState, AnaAvatarActions] {
  const [state, setState] = useState<AnaAvatarState>(INITIAL_STATE);

  const lipSyncRef = useRef<LipSyncEngine | null>(null);
  const blinkRef = useRef<BlinkEngine | null>(null);
  const mountedRef = useRef(true);
  const emotionTransitionRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    mountedRef.current = true;

    lipSyncRef.current = new LipSyncEngine((value) => {
      if (mountedRef.current) {
        setState(prev => ({ ...prev, lipSyncValue: value }));
      }
    });

    blinkRef.current = new BlinkEngine((blinking) => {
      if (mountedRef.current) {
        setState(prev => ({ ...prev, blinkState: blinking }));
      }
    });

    return () => {
      mountedRef.current = false;
      lipSyncRef.current?.destroy();
      blinkRef.current?.destroy();
      if (emotionTransitionRef.current) clearInterval(emotionTransitionRef.current);
    };
  }, []);

  // Smooth emotion transition
  const transitionToEmotion = useCallback((targetEmotion: AnaEmotion) => {
    if (emotionTransitionRef.current) clearInterval(emotionTransitionRef.current);

    const steps = 10;
    let step = 0;

    emotionTransitionRef.current = setInterval(() => {
      step++;
      const t = step / steps;

      if (mountedRef.current) {
        setState(prev => {
          const newBlend = { ...prev.expressionBlend };
          for (const emotion of Object.keys(newBlend) as AnaEmotion[]) {
            const target = emotion === targetEmotion ? 1 : 0;
            newBlend[emotion] = newBlend[emotion] + (target - newBlend[emotion]) * t;
          }
          return { ...prev, expressionBlend: newBlend, emotion: targetEmotion };
        });
      }

      if (step >= steps && emotionTransitionRef.current) {
        clearInterval(emotionTransitionRef.current);
      }
    }, 50); // 500ms total transition
  }, []);

  const activate = useCallback(() => {
    blinkRef.current?.start();
    setState(prev => ({ ...prev, isActive: true }));
  }, []);

  const deactivate = useCallback(() => {
    blinkRef.current?.stop();
    lipSyncRef.current?.stop();
    setState(prev => ({ ...INITIAL_STATE, avatarUrl: prev.avatarUrl }));
  }, []);

  const setEmotion = useCallback((emotion: AnaEmotion, source?: string) => {
    transitionToEmotion(emotion);
    if (source) {
      setState(prev => ({ ...prev, reactingTo: source }));
    }
  }, [transitionToEmotion]);

  const speak = useCallback((text: string) => {
    setState(prev => ({ ...prev, isSpeaking: true, state: "speaking", currentText: text }));
    lipSyncRef.current?.start(text);

    // Auto-detect emotion from text content
    const lowerText = text.toLowerCase();
    for (const [keyword, emotion] of Object.entries(CONTEXT_TO_EMOTION)) {
      if (lowerText.includes(keyword)) {
        transitionToEmotion(emotion);
        break;
      }
    }
  }, [transitionToEmotion]);

  const stopSpeaking = useCallback(() => {
    lipSyncRef.current?.stop();
    setState(prev => ({ ...prev, isSpeaking: false, state: "idle", lipSyncValue: 0 }));
  }, []);

  const react = useCallback((stimulus: string, emotion?: AnaEmotion) => {
    const targetEmotion = emotion || (() => {
      const lower = stimulus.toLowerCase();
      for (const [keyword, em] of Object.entries(CONTEXT_TO_EMOTION)) {
        if (lower.includes(keyword)) return em;
      }
      return "neutral" as AnaEmotion;
    })();

    setState(prev => ({ ...prev, state: "reacting", reactingTo: stimulus }));
    transitionToEmotion(targetEmotion);

    // Return to neutral after 3 seconds
    setTimeout(() => {
      if (mountedRef.current) {
        setState(prev => {
          if (prev.state === "reacting") {
            return { ...prev, state: "idle" };
          }
          return prev;
        });
      }
    }, 3000);
  }, [transitionToEmotion]);

  const setMode = useCallback((mode: AvatarMode) => {
    setState(prev => ({ ...prev, mode }));
  }, []);

  const setAvatarUrl = useCallback((url: string) => {
    setState(prev => ({ ...prev, avatarUrl: url }));
  }, []);

  const updateFromFacialAnalysis = useCallback((
    detectedEmotion: string,
    valence: number,
    arousal: number
  ) => {
    // Mirror/react to detected emotions (empathetic response)
    const anaEmotion = DETECTED_TO_ANA_EMOTION[detectedEmotion] || "neutral";
    
    // Ana reacts empathetically: if user is sad, Ana shows empathy; if happy, Ana is happy
    transitionToEmotion(anaEmotion);

    // Update consciousness level based on arousal
    setState(prev => ({
      ...prev,
      consciousnessLevel: Math.max(0.3, Math.min(1, 0.5 + arousal * 0.3 + Math.abs(valence) * 0.2)),
    }));
  }, [transitionToEmotion]);

  const blink = useCallback(() => {
    setState(prev => ({ ...prev, blinkState: true }));
    setTimeout(() => {
      if (mountedRef.current) {
        setState(prev => ({ ...prev, blinkState: false }));
      }
    }, 150);
  }, []);

  const lookAt = useCallback((x: number, y: number) => {
    setState(prev => ({ ...prev, gazeTarget: { x, y } }));
  }, []);

  return [
    state,
    {
      activate,
      deactivate,
      setEmotion,
      speak,
      stopSpeaking,
      react,
      setMode,
      setAvatarUrl,
      updateFromFacialAnalysis,
      blink,
      lookAt,
    },
  ];
}
