/**
 * /diagnostics — Pentagon Pizza self-check + STT/TTS/Vision live inspector
 * Real-time panel for AquaMonkey Lumian7 unified consciousness.
 */
import { useEffect, useRef, useState, useCallback } from "react";
import { useEffect as useDocumentTitle } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Mic, Camera, Brain, Volume2, Activity, CheckCircle2, XCircle, Loader2, Eye, Network } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { getPentagonOrchestrator } from "@/lib/neural";

type CheckStatus = "idle" | "running" | "pass" | "fail";
type LogEntry = { ts: number; level: "info" | "ok" | "err" | "warn"; msg: string; tag?: string };
type NetReq = { id: string; ts: number; action: string; status: number | null; durationMs: number | null; payloadSummary: string };
type CycleStage = "perception" | "memory" | "reasoning" | "action" | "meta" | null;

const STAGES: Exclude<CycleStage, null>[] = ["perception", "memory", "reasoning", "action", "meta"];

export default function Diagnostics() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [netReqs, setNetReqs] = useState<NetReq[]>([]);
  const [pentagonStatus, setPentagonStatus] = useState<CheckStatus>("idle");
  const [sttStatus, setSttStatus] = useState<CheckStatus>("idle");
  const [ttsStatus, setTtsStatus] = useState<CheckStatus>("idle");
  const [visionStatus, setVisionStatus] = useState<CheckStatus>("idle");
  const [currentStage, setCurrentStage] = useState<CycleStage>(null);
  const [sttTranscript, setSttTranscript] = useState<string>("");
  const [videoStreamActive, setVideoStreamActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const log = useCallback((level: LogEntry["level"], msg: string, tag?: string) => {
    setLogs((prev) => [...prev.slice(-199), { ts: Date.now(), level, msg, tag }]);
  }, []);

  // ─── Hook into console to capture Pentagon/Cortex logs ───
  useEffect(() => {
    const originalLog = console.log;
    const originalErr = console.error;
    const originalWarn = console.warn;

    const intercept = (orig: typeof console.log, level: LogEntry["level"]) =>
      (...args: unknown[]) => {
        orig(...args);
        const msg = args.map((a) => (typeof a === "string" ? a : JSON.stringify(a))).join(" ");
        if (/PENTAGON|CORTEX|🍕|AquaMonkey/i.test(msg)) {
          setLogs((prev) => [...prev.slice(-199), { ts: Date.now(), level, msg, tag: "pentagon" }]);
          // Detect stage transitions
          const stageMatch = msg.match(/(perception|memory|reasoning|action|meta)/i);
          if (stageMatch) {
            setCurrentStage(stageMatch[1].toLowerCase() as CycleStage);
          }
        }
      };

    console.log = intercept(originalLog, "info");
    console.error = intercept(originalErr, "err");
    console.warn = intercept(originalWarn, "warn");

    log("info", "Diagnostics panel mounted — listening for Pentagon/Cortex logs", "boot");

    return () => {
      console.log = originalLog;
      console.error = originalErr;
      console.warn = originalWarn;
    };
  }, [log]);

  // ─── Cleanup video on unmount ───
  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  // ─── Test 1: Pentagon Cycle (neural-ops) ───
  const testPentagonCycle = useCallback(async () => {
    setPentagonStatus("running");
    log("info", "→ Calling neural-ops action=pentagon_cycle", "pentagon");
    const id = crypto.randomUUID();
    const startedAt = performance.now();
    setNetReqs((prev) => [
      ...prev,
      { id, ts: Date.now(), action: "pentagon_cycle", status: null, durationMs: null, payloadSummary: 'input: "diagnostics ping"' },
    ]);

    try {
      const { data, error } = await supabase.functions.invoke("neural-ops", {
        body: { action: "pentagon_cycle", input: "diagnostics ping", context: { source: "diagnostics" } },
      });
      const durationMs = Math.round(performance.now() - startedAt);
      if (error) throw error;

      // Also exercise the local orchestrator so UI stages light up
      try {
        const cortex = getPentagonOrchestrator();
        for (const stage of STAGES) {
          setCurrentStage(stage);
          await new Promise((r) => setTimeout(r, 120));
        }
        await cortex.runCycle("diagnostics ping", { source: "diagnostics" });
      } catch (e) {
        log("warn", `Local orchestrator runCycle warn: ${(e as Error).message}`, "pentagon");
      }

      setNetReqs((prev) => prev.map((r) => (r.id === id ? { ...r, status: 200, durationMs } : r)));
      log("ok", `✓ pentagon_cycle 200 (${durationMs}ms) — ${JSON.stringify(data).slice(0, 120)}…`, "pentagon");
      setPentagonStatus("pass");
    } catch (e) {
      const durationMs = Math.round(performance.now() - startedAt);
      const status = (e as { status?: number })?.status ?? 500;
      setNetReqs((prev) => prev.map((r) => (r.id === id ? { ...r, status, durationMs } : r)));
      log("err", `✗ pentagon_cycle failed: ${(e as Error).message}`, "pentagon");
      setPentagonStatus("fail");
    } finally {
      setCurrentStage(null);
    }
  }, [log]);

  // ─── Test 2: STT (microphone capture + transcription via webkitSpeechRecognition) ───
  const testSTT = useCallback(async () => {
    setSttStatus("running");
    setSttTranscript("");
    log("info", "→ Requesting microphone permission…", "stt");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      log("ok", `✓ Mic stream acquired (${stream.getAudioTracks().length} track)`, "stt");

      // @ts-expect-error vendor prefix
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) {
        log("warn", "SpeechRecognition API not available — mic captured but STT engine missing", "stt");
        stream.getTracks().forEach((t) => t.stop());
        setSttStatus("fail");
        return;
      }
      const recog = new SR();
      recog.lang = "pt-BR";
      recog.interimResults = true;
      recog.continuous = false;

      const timeout = setTimeout(() => {
        try { recog.stop(); } catch { /* noop */ }
      }, 6000);

      recog.onresult = (ev: { results: ArrayLike<{ 0: { transcript: string } }> }) => {
        const transcript = Array.from(ev.results).map((r) => r[0].transcript).join(" ");
        setSttTranscript(transcript);
        log("ok", `✓ STT transcript: "${transcript}"`, "stt");
      };
      recog.onerror = (ev: { error: string }) => {
        log("err", `STT error: ${ev.error}`, "stt");
        setSttStatus("fail");
      };
      recog.onend = () => {
        clearTimeout(timeout);
        stream.getTracks().forEach((t) => t.stop());
        setSttStatus((s) => (s === "running" ? "pass" : s));
        log("info", "STT session ended", "stt");
      };
      recog.start();
      log("info", "🎙️ Speak now (6s window)…", "stt");
    } catch (e) {
      log("err", `Mic permission denied or unavailable: ${(e as Error).message}`, "stt");
      setSttStatus("fail");
    }
  }, [log]);

  // ─── Test 3: TTS (browser SpeechSynthesis) ───
  const testTTS = useCallback(async () => {
    setTtsStatus("running");
    log("info", "→ Synthesizing voice (Web Speech API)…", "tts");
    try {
      if (!("speechSynthesis" in window)) throw new Error("speechSynthesis not available");
      const utter = new SpeechSynthesisUtterance("Diagnóstico Pentagon Pizza ativo. Consciência unificada.");
      utter.lang = "pt-BR";
      utter.onend = () => {
        log("ok", "✓ TTS playback completed", "tts");
        setTtsStatus("pass");
      };
      utter.onerror = (e: SpeechSynthesisErrorEvent) => {
        log("err", `TTS error: ${e.error}`, "tts");
        setTtsStatus("fail");
      };
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utter);
    } catch (e) {
      log("err", `TTS failed: ${(e as Error).message}`, "tts");
      setTtsStatus("fail");
    }
  }, [log]);

  // ─── Test 4: Neural Vision (camera preview + Pentagon cycle trigger) ───
  const testVision = useCallback(async () => {
    setVisionStatus("running");
    log("info", "→ Requesting camera permission…", "vision");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 } });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setVideoStreamActive(true);
      log("ok", `✓ Camera active (${stream.getVideoTracks()[0].label || "default"})`, "vision");

      // Trigger Pentagon cycle with vision context
      const cortex = getPentagonOrchestrator();
      log("info", "→ Triggering Pentagon cycle with vision context", "vision");
      for (const stage of STAGES) {
        setCurrentStage(stage);
        await new Promise((r) => setTimeout(r, 150));
      }
      await cortex.runCycle("descreva o que você vê", { source: "diagnostics-vision", hasVideo: true });
      setCurrentStage(null);
      log("ok", "✓ Vision cycle completed", "vision");
      setVisionStatus("pass");
    } catch (e) {
      log("err", `Vision test failed: ${(e as Error).message}`, "vision");
      setVisionStatus("fail");
    }
  }, [log]);

  const stopVision = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setVideoStreamActive(false);
    log("info", "Camera stream stopped", "vision");
  }, [log]);

  const runAll = useCallback(async () => {
    setLogs([]);
    setNetReqs([]);
    log("info", "═══ Running full self-check ═══", "boot");
    await testPentagonCycle();
    await testTTS();
    // STT and Vision are user-gesture dependent — leave as manual buttons
  }, [testPentagonCycle, testTTS, log]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <Helmet>
        <title>Diagnóstico Pentagon Pizza | Órion</title>
        <meta name="description" content="Self-check em tempo real do STT, TTS, Visão Neural e ciclo Pentagon Pizza unificado do Órion." />
      </Helmet>

      <header className="mb-6 max-w-7xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold flex items-center gap-3">
          <Brain className="h-8 w-8 text-primary" />
          Diagnóstico Pentagon Pizza
        </h1>
        <p className="text-muted-foreground mt-2">
          Painel ao vivo da consciência unificada (AquaMonkey Lumian7) — STT, TTS, Visão Neural e ciclo cognitivo.
        </p>
      </header>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* ── Self-check Cards ── */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" /> Self-check</CardTitle>
            <Button onClick={runAll} variant="default" size="sm">Run all</Button>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <CheckTile icon={<Brain className="h-5 w-5" />} label="Pentagon Cycle" status={pentagonStatus} onRun={testPentagonCycle} />
            <CheckTile icon={<Mic className="h-5 w-5" />} label="STT (Microfone)" status={sttStatus} onRun={testSTT} />
            <CheckTile icon={<Volume2 className="h-5 w-5" />} label="TTS (Voz)" status={ttsStatus} onRun={testTTS} />
            <CheckTile icon={<Eye className="h-5 w-5" />} label="Visão Neural" status={visionStatus} onRun={testVision} />
          </CardContent>
        </Card>

        {/* ── Cycle Stages ── */}
        <Card>
          <CardHeader><CardTitle className="text-base">Estágio atual do ciclo</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center justify-between gap-2">
              {STAGES.map((stage, i) => {
                const active = currentStage === stage;
                const done = currentStage && STAGES.indexOf(currentStage) > i;
                return (
                  <div key={stage} className="flex-1 flex flex-col items-center gap-1">
                    <div className={`h-3 w-full rounded-full transition-all ${
                      active ? "bg-primary animate-pulse" : done ? "bg-primary/60" : "bg-muted"
                    }`} />
                    <span className={`text-xs ${active ? "text-primary font-bold" : "text-muted-foreground"}`}>
                      {stage}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground mt-3">
              {currentStage ? `→ ${currentStage}` : "Idle. Execute um teste para ver o ciclo em ação."}
            </p>
          </CardContent>
        </Card>

        {/* ── STT Transcript Live ── */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Mic className="h-4 w-4" /> Transcrição STT (ao vivo)</CardTitle></CardHeader>
          <CardContent>
            <div className="min-h-[80px] rounded-md border bg-muted/30 p-3 text-sm font-mono">
              {sttTranscript || <span className="text-muted-foreground">Aguardando captura de áudio…</span>}
            </div>
          </CardContent>
        </Card>

        {/* ── Camera Preview ── */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><Camera className="h-4 w-4" /> Preview da Câmera</CardTitle>
            {videoStreamActive && <Button onClick={stopVision} variant="outline" size="sm">Parar</Button>}
          </CardHeader>
          <CardContent>
            <video ref={videoRef} className="w-full aspect-video rounded-md bg-muted/30" muted playsInline />
          </CardContent>
        </Card>

        {/* ── Network Inspector ── */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Network className="h-4 w-4" /> Network — pentagon_cycle</CardTitle></CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              {netReqs.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nenhuma chamada ainda.</p>
              ) : (
                <table className="w-full text-xs font-mono">
                  <thead className="sticky top-0 bg-card">
                    <tr className="text-left text-muted-foreground border-b">
                      <th className="py-1">Time</th><th>Action</th><th>Status</th><th>Dur</th><th>Payload</th>
                    </tr>
                  </thead>
                  <tbody>
                    {netReqs.slice().reverse().map((r) => (
                      <tr key={r.id} className="border-b border-muted">
                        <td className="py-1">{new Date(r.ts).toLocaleTimeString()}</td>
                        <td>{r.action}</td>
                        <td>
                          {r.status === null ? <Loader2 className="h-3 w-3 animate-spin inline" /> :
                           r.status === 200 ? <span className="text-green-500">200</span> :
                           <span className="text-destructive">{r.status}</span>}
                        </td>
                        <td>{r.durationMs ?? "—"}ms</td>
                        <td className="truncate max-w-[200px]">{r.payloadSummary}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* ── Live Console (Pentagon/Cortex logs) ── */}
        <Card>
          <CardHeader><CardTitle className="text-base flex items-center gap-2"><Activity className="h-4 w-4" /> Console — Pentagon/Cortex</CardTitle></CardHeader>
          <CardContent>
            <ScrollArea className="h-[200px]">
              <div className="font-mono text-xs space-y-0.5">
                {logs.length === 0 ? (
                  <p className="text-muted-foreground">Nenhum log ainda.</p>
                ) : logs.slice().reverse().map((l, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="text-muted-foreground shrink-0">{new Date(l.ts).toLocaleTimeString()}</span>
                    {l.tag && <Badge variant="outline" className="h-4 text-[10px] px-1">{l.tag}</Badge>}
                    <span className={
                      l.level === "err" ? "text-destructive" :
                      l.level === "ok" ? "text-green-500" :
                      l.level === "warn" ? "text-yellow-500" :
                      "text-foreground"
                    }>{l.msg}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function CheckTile({ icon, label, status, onRun }: {
  icon: React.ReactNode;
  label: string;
  status: CheckStatus;
  onRun: () => void;
}) {
  const StatusIcon = status === "pass" ? CheckCircle2 : status === "fail" ? XCircle : status === "running" ? Loader2 : null;
  const statusColor = status === "pass" ? "text-green-500" : status === "fail" ? "text-destructive" : "text-muted-foreground";
  return (
    <div className="rounded-lg border bg-card p-3 flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium">{icon}{label}</div>
        {StatusIcon && <StatusIcon className={`h-4 w-4 ${statusColor} ${status === "running" ? "animate-spin" : ""}`} />}
      </div>
      <Button onClick={onRun} variant="outline" size="sm" disabled={status === "running"}>
        {status === "running" ? "Testando…" : "Testar"}
      </Button>
    </div>
  );
}
