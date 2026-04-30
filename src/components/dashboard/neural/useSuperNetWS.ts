import { useState, useRef, useEffect, useCallback } from "react";
import { VS, vsLog } from "@/lib/neural/vision-state";
import { getQualityPreset, downscaleCanvas } from "@/lib/neural/quality-presets";

const SUPERNET_WS_URL = localStorage.getItem("supernet_ws_url") || "";
const WS_MAX_RETRIES = 5;
const WS_BASE_DELAY = 5000;
const WS_MAX_DELAY = 60000;

export function useSuperNetWS(active: boolean, canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  const wsRef = useRef<WebSocket | null>(null);
  const lastSentRef = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retriesRef = useRef(0);
  const frameSkipCounter = useRef(0);
  const [connected, setConnected] = useState(false);
  const [latency, setLatency] = useState(0);
  const [analysis, setAnalysis] = useState("");
  const [wsUrl, setWsUrl] = useState(SUPERNET_WS_URL);
  const isConfigured = wsUrl.trim().length > 0;

  const connect = useCallback(() => {
    if (!isConfigured || wsRef.current?.readyState === WebSocket.OPEN) return;
    if (retriesRef.current >= WS_MAX_RETRIES) return;
    try {
      const ws = new WebSocket(wsUrl);
      ws.binaryType = "arraybuffer";
      wsRef.current = ws;
      ws.onopen = () => { setConnected(true); VS.supernetConnected = true; retriesRef.current = 0; vsLog("🔗 SuperNet conectado"); };
      ws.onmessage = (event) => {
        try {
          const msg = typeof event.data === "string" ? JSON.parse(event.data) : null;
          if (msg?.type === "supernet_response") {
            setAnalysis(msg.analysis || "");
            setLatency(msg.latency_ms || 0);
            VS.supernetAnalysis = msg.analysis || "";
            VS.supernetLatency = msg.latency_ms || 0;
          }
        } catch {}
      };
      ws.onclose = () => {
        setConnected(false); VS.supernetConnected = false;
        if (active && isConfigured && retriesRef.current < WS_MAX_RETRIES) {
          retriesRef.current++;
          const delay = Math.min(WS_MAX_DELAY, WS_BASE_DELAY * Math.pow(2, retriesRef.current - 1));
          reconnectTimer.current = setTimeout(() => connect(), delay);
        }
      };
      ws.onerror = () => { ws.close(); };
    } catch { setConnected(false); }
  }, [wsUrl, active, isConfigured]);

  const sendFrame = useCallback(() => {
    const preset = getQualityPreset();
    const now = Date.now();

    // Adaptive frame interval from quality preset
    if (now - lastSentRef.current < preset.frameIntervalMs) return;

    // Frame skip: skip N frames, send 1
    if (preset.frameSkip > 0) {
      frameSkipCounter.current++;
      if (frameSkipCounter.current % (preset.frameSkip + 1) !== 0) return;
    }

    lastSentRef.current = now;
    const canvas = canvasRef.current;
    const ws = wsRef.current;
    if (!canvas || !ws || ws.readyState !== WebSocket.OPEN) return;

    // Downscale before sending (like Vita Recorder's rescaleBuffer)
    const scaled = downscaleCanvas(canvas, preset.resolution.width, preset.resolution.height);

    scaled.toBlob(
      (blob) => { if (blob && ws.readyState === WebSocket.OPEN) ws.send(blob); },
      "image/jpeg",
      preset.jpegQuality
    );
  }, [canvasRef]);

  const sendQuery = useCallback((query: string) => {
    const ws = wsRef.current;
    const canvas = canvasRef.current;
    if (!canvas || !ws || ws.readyState !== WebSocket.OPEN) return;

    const preset = getQualityPreset();
    const scaled = downscaleCanvas(canvas, preset.resolution.width, preset.resolution.height);

    ws.send(JSON.stringify({
      type: "vision_frame",
      image: scaled.toDataURL("image/jpeg", preset.jpegQuality).split(",")[1],
      query,
      timestamp: Date.now(),
    }));
  }, [canvasRef]);

  useEffect(() => {
    if (active && isConfigured) { retriesRef.current = 0; connect(); }
    return () => { if (reconnectTimer.current) clearTimeout(reconnectTimer.current); wsRef.current?.close(); setConnected(false); VS.supernetConnected = false; };
  }, [active, isConfigured, connect]);

  const updateUrl = useCallback((url: string) => {
    setWsUrl(url); localStorage.setItem("supernet_ws_url", url); retriesRef.current = 0; wsRef.current?.close();
    if (url.trim()) setTimeout(() => connect(), 500);
  }, [connect]);

  return { connected, latency, analysis, sendFrame, sendQuery, wsUrl, updateUrl };
}
