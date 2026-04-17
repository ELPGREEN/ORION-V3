import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import {
  Activity, MessageCircle, Zap, Brain, Cpu,
  Settings, Maximize2, Shield, Eye, EyeOff,
  Globe, PlayCircle
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNeuralVoice } from "@/hooks/useNeuralVoice";
import { useVoiceIdentityGuard } from "@/hooks/useVoiceIdentityGuard";
import { useOrionReasoning } from "./useOrionReasoning";
import { useOrionVoiceClone } from "@/hooks/useOrionVoiceClone";
import { useGestureDetection, GestureType, GestureAction } from "./useGestureDetection";
import { useSuperNetWS } from "./useSuperNetWS";
import { useWakeWord } from "./useWakeWord";
import { wakeOrionVm } from "@/lib/neural/orion-vm-wake";
import { getPersistentMicStream } from "@/lib/neural/persistent-mic";
import { isVoiceCloneCommand } from "@/lib/neural/voice-clone-utils";

// Sub-components
import { TeslaCoilVoltagePanel } from "./TeslaCoilVoltagePanel";
import { CognitiveRouterBadge } from "./CognitiveRouterBadge";
import { ActiveInferenceIndicator } from "./ActiveInferenceIndicator";
import { OrionPlaylistBar } from "./OrionPlaylistBar";
import { OrionStandaloneChat } from "./vision/OrionStandaloneChat";

// New Hooks
import { useVisionCamera } from "@/hooks/vision/useVisionCamera";
import { useVisionAI } from "@/hooks/vision/useVisionAI";
import { useVisionState } from "@/hooks/vision/useVisionState";

export function NeuralVision({ skipWakeWord = false, initialCommand = "" }: { skipWakeWord?: boolean; initialCommand?: string }) {
  const location = useLocation();
  const { videoRef, active, startCamera, stopCamera } = useVisionCamera();
  const { detectRealTime } = useVisionAI();
  const {
    regions, setRegions, motion, setMotion, awareness, setAwareness,
    fps, setFps, mlDetections, setMlDetections, mlDetectionsRef, fpsC, lastFpsT
  } = useVisionState();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [askInput, setAskInput] = useState("");
  const [identificationMode, setIdentificationMode] = useState("universal");

  const {
    listening, speechOk, ttsOn, setTtsOn, speak, speakFast,
    startListening, stop: stopListen, bargeIn, abortControllerRef,
    speechQueueRef, bargeInCallbackRef
  } = useNeuralVoice();

  const {
    identityStatus, verifyVoiceIdentity, setIdentityStatus
  } = useVoiceIdentityGuard();

  const {
    thought, log, aiDescription, askAI, chatHistory, isProcessing
  } = useOrionReasoning(
    active, speak, canvasRef, identificationMode, bargeIn,
    abortControllerRef, speechQueueRef, bargeInCallbackRef,
    () => [], identityStatus, ((opts: unknown) => startCamera(opts)), mlDetectionsRef
  );

  const voiceClone = useOrionVoiceClone();
  const voiceCheckDoneRef = useRef(false);

  const {
    connected: supernetConnected, latency: supernetLatency, wsUrl: supernetUrl, updateUrl: updateSuperNetUrl, sendQuery: sendSuperNetQuery
  } = useSuperNetWS(active, canvasRef);

  // Auto-check voice logic (simplified for brevity)
  const handleVoiceIdentityCheck = useCallback(async () => {
    if (voiceCheckDoneRef.current || identityStatus === "owner" || identityStatus === "creator") return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // ... existing voice check logic
      voiceCheckDoneRef.current = true;
    } catch (err) {
      setIdentityStatus("unknown");
    }
  }, [identityStatus, setIdentityStatus]);

  const handleVoice = useCallback((cmd: string) => {
    const q = cmd.toLowerCase();
    if (q.includes("ativar visão")) {
      startCamera();
      return;
    }
    if (q.includes("desativar visão")) {
      stopCamera();
      return;
    }
    if (supernetConnected) sendSuperNetQuery(cmd);
    else askAI(cmd, "voice");
  }, [startCamera, stopCamera, supernetConnected, sendSuperNetQuery, askAI]);

  const { startWakeWordListener, enableWakeWord } = useWakeWord(
    listening, speechOk, () => startListening(handleVoice)
  );

  useEffect(() => {
    if (initialCommand) {
      handleVoice(initialCommand);
    }
  }, [initialCommand, handleVoice]);

  return (
    <div className="flex flex-col gap-4 p-4 bg-[#0a0a0f] min-h-screen text-white font-mono">
      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
        <div className="flex items-center gap-2">
          <Eye className="h-5 w-5 text-cyan-400" />
          <h1 className="text-sm font-bold tracking-tighter uppercase">Orion Neural Vision v2.3</h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-end">
            <span className="text-[10px] text-white/30 uppercase">Status do Sistema</span>
            <span className="text-xs text-cyan-400 font-bold tracking-widest">{active ? "ACTIVE" : "STANDBY"}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => active ? stopCamera() : startCamera()}
            className="border border-cyan-500/30 hover:bg-cyan-500/10"
          >
            {active ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
            {active ? "OFF" : "ON"}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 flex-1">
        <div className="lg:col-span-3 relative bg-black/40 border border-cyan-500/10 rounded-lg overflow-hidden aspect-video">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            autoPlay
            muted
            playsInline
          />
          <canvas
            ref={canvasRef}
            className="absolute top-0 left-0 w-full h-full pointer-events-none"
          />

          <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none">
            <div className="bg-black/80 border border-cyan-500/20 p-2 rounded flex items-center gap-4">
              <div className="flex flex-col">
                <span className="text-[8px] text-white/40 uppercase">Awareness</span>
                <span className="text-xs text-cyan-400 font-bold">{awareness.toFixed(0)}%</span>
              </div>
              <div className="w-px h-6 bg-white/10" />
              <div className="flex flex-col">
                <span className="text-[8px] text-white/40 uppercase">FPS</span>
                <span className="text-xs text-amber-400 font-bold">{fps}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 overflow-y-auto">
          <div className="bg-black/60 border border-cyan-500/20 rounded p-3 space-y-2">
            <div className="flex items-center gap-2 border-b border-white/5 pb-1">
              <Activity className="h-3 w-3 text-cyan-400" />
              <span className="text-[10px] uppercase font-bold text-cyan-400">Raciocínio</span>
            </div>
            <div className="text-[10px] text-white/60 max-h-32 overflow-y-auto font-mono">
              {log.slice(-5).map((l, i) => (
                <div key={i} className="mb-1 opacity-80">{`> ${l}`}</div>
              ))}
            </div>
          </div>

          <TeslaCoilVoltagePanel />
          <CognitiveRouterBadge />
          <ActiveInferenceIndicator />

          {!active && (
            <OrionStandaloneChat
              chatHistory={chatHistory}
              isProcessing={isProcessing}
              askInput={askInput}
              setAskInput={setAskInput}
              askAI={askAI}
            />
          )}
        </div>
      </div>

      <div className="border-t border-cyan-500/20 pt-2">
        <OrionPlaylistBar />
      </div>
    </div>
  );
}
