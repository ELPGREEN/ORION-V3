/**
 * WebRTC Camera Viewer — Stream video from robot's onboard camera
 * Uses robot IP from RobotConnectionContext for dynamic URL
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Camera, CameraOff, Maximize2, Minimize2, RotateCcw, Video } from "lucide-react";
import { useRosBridge } from "@/hooks/useRosBridge";
import { useRobotConnectionContext } from "@/contexts/RobotConnectionContext";

type StreamMode = "webrtc" | "rosbridge" | "mjpeg";

interface Props {
  rosbridgeUrl?: string;
}

export default function WebRTCCameraViewer({ rosbridgeUrl }: Props) {
  const { webrtcUrl, activeProfile } = useRobotConnectionContext();
  const [mode, setMode] = useState<StreamMode>("rosbridge");
  const [streamUrl, setStreamUrl] = useState(webrtcUrl || "http://localhost:8080/stream");
  const [streaming, setStreaming] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [fps, setFps] = useState(0);
  const [latency, setLatency] = useState<number | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const peerRef = useRef<RTCPeerConnection | null>(null);
  const frameCountRef = useRef(0);
  const fpsTimerRef = useRef<ReturnType<typeof setInterval>>();

  const { isConnected, subscribe } = useRosBridge({ url: rosbridgeUrl });

  // Update stream URL when active profile changes
  useEffect(() => {
    if (activeProfile && !streaming) {
      if (mode === "webrtc") {
        setStreamUrl(`http://${activeProfile.ip}:${activeProfile.webrtcPort}`);
      } else if (mode === "mjpeg") {
        setStreamUrl(`http://${activeProfile.ip}:8080/stream`);
      }
    }
  }, [activeProfile, mode, streaming]);

  // FPS counter
  useEffect(() => {
    fpsTimerRef.current = setInterval(() => {
      setFps(frameCountRef.current);
      frameCountRef.current = 0;
    }, 1000);
    return () => clearInterval(fpsTimerRef.current);
  }, []);

  // ROSBridge Compressed Image
  useEffect(() => {
    if (mode !== "rosbridge" || !streaming || !isConnected) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const unsub = subscribe(
      "/camera/image/compressed",
      "sensor_msgs/msg/CompressedImage",
      (msg: any) => {
        const img = new Image();
        img.onload = () => {
          canvas.width = img.width;
          canvas.height = img.height;
          ctx.drawImage(img, 0, 0);
          frameCountRef.current++;
        };
        img.src = `data:image/${msg.format || "jpeg"};base64,${msg.data}`;
      },
      66
    );
    return unsub;
  }, [mode, streaming, isConnected, subscribe]);

  // WebRTC with latency tracking
  const startWebRTC = useCallback(async () => {
    try {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
        ],
      });
      peerRef.current = pc;

      const startTime = performance.now();
      pc.ontrack = (event) => {
        if (videoRef.current && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
          setLatency(Math.round(performance.now() - startTime));
        }
      };

      const offer = await pc.createOffer({ offerToReceiveVideo: true, offerToReceiveAudio: false });
      await pc.setLocalDescription(offer);

      const response = await fetch(`${streamUrl}/offer`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sdp: offer.sdp, type: offer.type }),
      });
      const answer = await response.json();
      await pc.setRemoteDescription(answer);
      setStreaming(true);
    } catch (err) {
      console.error("[WebRTC] Failed:", err);
    }
  }, [streamUrl]);

  const stopStream = useCallback(() => {
    peerRef.current?.close();
    peerRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setStreaming(false);
    frameCountRef.current = 0;
    setFps(0);
    setLatency(null);
  }, []);

  const toggleStream = useCallback(() => {
    if (streaming) stopStream();
    else if (mode === "webrtc") startWebRTC();
    else setStreaming(true);
  }, [streaming, mode, startWebRTC, stopStream]);

  return (
    <Card className={fullscreen ? "fixed inset-4 z-50" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Camera className="h-4 w-4" />
            Câmera Onboard
            {streaming && (
              <Badge variant="default" className="text-[10px] animate-pulse">
                🔴 LIVE {fps > 0 ? `${fps}fps` : ""} {latency !== null ? `${latency}ms` : ""}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={mode} onValueChange={(v) => { stopStream(); setMode(v as StreamMode); }}>
              <SelectTrigger className="w-28 h-7 text-[10px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="rosbridge">ROSBridge</SelectItem>
                <SelectItem value="webrtc">WebRTC</SelectItem>
                <SelectItem value="mjpeg">MJPEG</SelectItem>
              </SelectContent>
            </Select>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setFullscreen(!fullscreen)}>
              {fullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {mode !== "rosbridge" && (
          <Input value={streamUrl} onChange={(e) => setStreamUrl(e.target.value)} placeholder={mode === "webrtc" ? "http://robot:8443" : "http://robot:8080/stream"} className="text-xs font-mono" disabled={streaming} />
        )}
        <div className="relative bg-black rounded-lg overflow-hidden aspect-video flex items-center justify-center">
          {mode === "webrtc" && <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" />}
          {mode === "rosbridge" && <canvas ref={canvasRef} className="w-full h-full object-contain" />}
          {mode === "mjpeg" && streaming && <img src={streamUrl} alt="Robot Camera MJPEG" className="w-full h-full object-contain" />}
          {!streaming && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
              <Video className="h-10 w-10 mb-2 opacity-30" />
              <p className="text-xs">{mode === "rosbridge" ? (isConnected ? "Pronto para stream" : "Conecte ao ROSBridge primeiro") : "Configure URL e conecte"}</p>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant={streaming ? "destructive" : "default"} className="flex-1" onClick={toggleStream} disabled={mode === "rosbridge" && !isConnected}>
            {streaming ? <CameraOff className="h-3.5 w-3.5 mr-1.5" /> : <Camera className="h-3.5 w-3.5 mr-1.5" />}
            {streaming ? "Parar Stream" : "Iniciar Stream"}
          </Button>
          <Button size="icon" variant="outline" className="h-8 w-8" onClick={stopStream} disabled={!streaming}>
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
