import { useState, useRef, useCallback, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Volume2, VolumeX, BookOpen, Brain, Pause, Play,
  Mic, MicOff, Upload, Headphones, Sparkles, Radio,
  Eye, EyeOff, Disc3, FileAudio, X, Waves, Zap, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { addNeuralKnowledge } from "@/lib/neural-training";
import { useAuth } from "@/contexts/AuthContext";

interface TranscriptSegment {
  id: string;
  text: string;
  timestamp: number;
  processed: boolean;
}

interface LearningInsight {
  id: string;
  type: "vocabulary" | "pattern" | "style" | "emotion";
  content: string;
  timestamp: number;
}

export function OrionAudiobookListener() {
  const { user } = useAuth();
  // Core states
  const [isActive, setIsActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTranscript, setShowTranscript] = useState(true);
  const [sttMode, setSttMode] = useState<"browser" | "groq">("groq");
  const [groqProcessing, setGroqProcessing] = useState(false);
  const [groqProgress, setGroqProgress] = useState(0);
  const [absorbing, setAbsorbing] = useState(false);

  // Audio states
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(60);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  // Learning states
  const [transcripts, setTranscripts] = useState<TranscriptSegment[]>([]);
  const [insights, setInsights] = useState<LearningInsight[]>([]);
  const [wordsLearned, setWordsLearned] = useState(0);
  const [patternsDetected, setPatternsDetected] = useState(0);
  const [listeningMode, setListeningMode] = useState<"mic" | "file">("file");

  // Refs
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | MediaStreamAudioSourceNode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Cleanup
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animFrameRef.current);
      try { recognitionRef.current?.stop(); } catch {}
      audioContextRef.current?.close();
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  // ═══ Audio Visualizer ═══
  const startVisualizer = useCallback((source: MediaElementAudioSourceNode | MediaStreamAudioSourceNode) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const analyser = audioContextRef.current!.createAnalyser();
    analyser.fftSize = 256;
    source.connect(analyser);
    analyser.connect(audioContextRef.current!.destination);
    analyserRef.current = analyser;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!canvasRef.current) return;
      animFrameRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      const W = canvasRef.current.width;
      const H = canvasRef.current.height;
      ctx.clearRect(0, 0, W, H);

      const grd = ctx.createLinearGradient(0, 0, W, 0);
      grd.addColorStop(0, "rgba(59,130,246, 0.05)");
      grd.addColorStop(0.5, "rgba(139, 92, 246, 0.05)");
      grd.addColorStop(1, "rgba(16, 185, 129, 0.05)");
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, W, H);

      const barWidth = (W / bufferLength) * 2.5;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 255;
        const barHeight = v * H * 0.8;
        const hue = (i / bufferLength) * 180 + 180;
        ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${0.3 + v * 0.7})`;
        const y = H - barHeight;
        ctx.fillRect(x, y, barWidth - 1, barHeight);
        ctx.fillStyle = `hsla(${hue}, 80%, 60%, ${0.05 + v * 0.15})`;
        ctx.fillRect(x, 0, barWidth - 1, barHeight * 0.3);
        x += barWidth;
      }

      if (isActive) {
        const avg = dataArray.reduce((a, b) => a + b, 0) / bufferLength;
        const glowSize = 20 + (avg / 255) * 40;
        const glow = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, glowSize);
        glow.addColorStop(0, `rgba(59,130,246, ${0.1 + (avg / 255) * 0.3})`);
        glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, W, H);
      }
    };
    draw();
  }, [isActive]);

  // ═══ Groq Whisper STT ═══
  const transcribeWithGroq = useCallback(async (file: File) => {
    setGroqProcessing(true);
    setGroqProgress(10);
    try {
      // Convert to base64
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);

      setGroqProgress(40);

      const { data, error } = await supabase.functions.invoke("groq-whisper-stt", {
        body: { audio: base64, language: "pt", model: "whisper-large-v3-turbo" },
      });

      setGroqProgress(80);

      if (error) throw new Error(error.message);
      if (!data?.success) throw new Error(data?.error || "STT failed");

      const text = data.text || "";
      if (text.trim().length > 3) {
        const segments = text.split(/[.!?]+/).filter((s: string) => s.trim().length > 3);
        segments.forEach((segText: string, idx: number) => {
          const segment: TranscriptSegment = {
            id: `groq-${Date.now()}-${idx}`,
            text: segText.trim(),
            timestamp: Date.now(),
            processed: false,
          };
          setTranscripts(prev => [...prev.slice(-50), segment]);
          processSegmentForLearning(segText.trim());
        });
        toast.success(`🎯 Groq Whisper: ${segments.length} segmentos transcritos (${data.metadata?.audio_duration?.toFixed(1) || "?"}s)`);
      } else {
        toast.info("Nenhum texto detectado no áudio");
      }
      setGroqProgress(100);
    } catch (err: any) {
      toast.error(`Groq STT: ${err.message}`);
    } finally {
      setTimeout(() => {
        setGroqProcessing(false);
        setGroqProgress(0);
      }, 500);
    }
  }, []);

  // ═══ Start Speech Recognition (Browser) ═══
  const startSpeechRecognition = useCallback(() => {
    const SR = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) {
      toast.error("Speech Recognition não suportado neste navegador");
      return;
    }

    const rec = new SR();
    rec.lang = "pt-BR";
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onresult = (e: any) => {
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const transcript = e.results[i][0]?.transcript || "";
        if (e.results[i].isFinal && transcript.trim().length > 3) {
          const segment: TranscriptSegment = {
            id: `seg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            text: transcript.trim(),
            timestamp: Date.now(),
            processed: false,
          };
          setTranscripts(prev => [...prev.slice(-50), segment]);
          processSegmentForLearning(transcript.trim());
        }
      }
    };

    rec.onend = () => {
      if (isActive && isListening) {
        try { rec.start(); } catch {}
      }
    };

    rec.onerror = (e: any) => {
      if (e.error !== "aborted" && e.error !== "no-speech") {
        console.warn("STT error:", e.error);
      }
      if (isActive && isListening) {
        setTimeout(() => { try { rec.start(); } catch {} }, 1000);
      }
    };

    recognitionRef.current = rec;
    try {
      rec.start();
      setIsListening(true);
    } catch {}
  }, [isActive, isListening]);

  // ═══ Process transcript for "learning" ═══
  const processSegmentForLearning = useCallback((text: string) => {
    setIsProcessing(true);

    const words = text.split(/\s+/).filter(w => w.length > 3);
    setWordsLearned(prev => prev + words.length);

    const patterns = [
      { regex: /portanto|então|assim|consequentemente/i, type: "pattern" as const, label: "Conector lógico" },
      { regex: /no entanto|porém|contudo|todavia/i, type: "pattern" as const, label: "Contraposição" },
      { regex: /de acordo com|segundo|conforme/i, type: "pattern" as const, label: "Citação/Referência" },
      { regex: /importante|fundamental|essencial|crucial/i, type: "emotion" as const, label: "Ênfase" },
      { regex: /metáfora|como se|parece com|semelhante/i, type: "style" as const, label: "Figura de linguagem" },
      { regex: /\b[A-Z][a-záéíóú]+\b.*\b[A-Z][a-záéíóú]+\b/i, type: "vocabulary" as const, label: "Termos compostos" },
    ];

    patterns.forEach(p => {
      if (p.regex.test(text)) {
        setPatternsDetected(prev => prev + 1);
        const insight: LearningInsight = {
          id: `ins-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          type: p.type,
          content: `${p.label}: "${text.slice(0, 60)}..."`,
          timestamp: Date.now(),
        };
        setInsights(prev => [...prev.slice(-30), insight]);
      }
    });

    setTimeout(() => setIsProcessing(false), 300);
  }, []);

  // ═══ Handle File Upload (click or drag-drop) ═══
  const handleFileUpload = useCallback((file: File) => {
    if (!file.type.startsWith("audio/")) {
      toast.error("Selecione um arquivo de áudio");
      return;
    }

    if (audioUrl) URL.revokeObjectURL(audioUrl);
    const url = URL.createObjectURL(file);
    setAudioFile(file);
    setAudioUrl(url);
    setTranscripts([]);
    setInsights([]);
    toast.success(`📚 Audiobook carregado: ${file.name}`);

    // If Groq mode, auto-transcribe
    if (sttMode === "groq") {
      transcribeWithGroq(file);
    }
  }, [audioUrl, sttMode, transcribeWithGroq]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileUpload(file);
  }, [handleFileUpload]);

  // ═══ Absorb to Neural Network ═══
  const absorbToNeural = useCallback(async () => {
    if (!user?.id || transcripts.length === 0) {
      toast.error("Nenhuma transcrição para absorver");
      return;
    }
    setAbsorbing(true);
    try {
      const fullText = transcripts.map(t => t.text).join(". ");
      const title = audioFile?.name || `Transcrição ${new Date().toLocaleDateString("pt-BR")}`;
      const result = await addNeuralKnowledge(user.id, {
        title: `Audiobook: ${title}`,
        content: fullText,
        source_type: "audiobook_transcript",
        source_reference: audioFile?.name,
        tags: ["audiobook", "stt", sttMode, ...insights.map(i => i.type).filter((v, i, a) => a.indexOf(v) === i)],
      });

      if (result.success) {
        toast.success("🧠 Conteúdo absorvido pela Rede Neural!", {
          description: `${transcripts.length} segmentos, ${wordsLearned} palavras, ${patternsDetected} padrões`,
        });
        setTranscripts(prev => prev.map(t => ({ ...t, processed: true })));
      } else {
        throw new Error(result.error || "Falha na absorção");
      }
    } catch (err: any) {
      toast.error(`Erro: ${err.message}`);
    } finally {
      setAbsorbing(false);
    }
  }, [user, transcripts, audioFile, sttMode, insights, wordsLearned, patternsDetected]);

  // ═══ Toggle Main Activation ═══
  const toggleActive = useCallback(() => {
    if (isActive) {
      setIsActive(false);
      setIsListening(false);
      setIsPlaying(false);
      try { recognitionRef.current?.stop(); } catch {}
      recognitionRef.current = null;
      audioRef.current?.pause();
      cancelAnimationFrame(animFrameRef.current);
      toast.info("🔇 Orion parou de ouvir");
    } else {
      setIsActive(true);
      toast.success("👂 Orion começou a ouvir!");

      if (listeningMode === "mic") {
        navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
          if (!audioContextRef.current || audioContextRef.current.state === "closed") {
            audioContextRef.current = new AudioContext();
          }
          const source = audioContextRef.current.createMediaStreamSource(stream);
          sourceRef.current = source;
          startVisualizer(source);
          if (sttMode === "browser") {
            startSpeechRecognition();
          }
        }).catch(() => toast.error("Permissão de microfone negada"));
      } else if (audioUrl) {
        playAudioFile();
      } else {
        toast.info("Carregue um audiobook primeiro");
        setIsActive(false);
      }
    }
  }, [isActive, listeningMode, audioUrl, startVisualizer, startSpeechRecognition, sttMode]);

  // ═══ Play Audio File ═══
  const playAudioFile = useCallback(() => {
    if (!audioUrl) return;

    if (!audioRef.current) {
      audioRef.current = new Audio(audioUrl);
    }
    audioRef.current.volume = volume / 100;

    if (!audioContextRef.current || audioContextRef.current.state === "closed") {
      audioContextRef.current = new AudioContext();
    }

    if (!sourceRef.current) {
      const source = audioContextRef.current.createMediaElementSource(audioRef.current);
      sourceRef.current = source;
      startVisualizer(source);
    }

    audioRef.current.play();
    setIsPlaying(true);
    if (sttMode === "browser") {
      startSpeechRecognition();
    }

    audioRef.current.ontimeupdate = () => {
      setCurrentTime(audioRef.current?.currentTime || 0);
    };
    audioRef.current.onloadedmetadata = () => {
      setDuration(audioRef.current?.duration || 0);
    };
    audioRef.current.onended = () => {
      setIsPlaying(false);
      toast.info("📖 Audiobook finalizado");
    };
  }, [audioUrl, volume, startVisualizer, startSpeechRecognition, sttMode]);

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleVolumeChange = useCallback((v: number[]) => {
    const newVol = v[0];
    setVolume(newVol);
    if (audioRef.current) audioRef.current.volume = newVol / 100;
  }, []);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const insightIcon = (type: LearningInsight["type"]) => {
    switch (type) {
      case "vocabulary": return "📖";
      case "pattern": return "🔗";
      case "style": return "🎨";
      case "emotion": return "💡";
    }
  };

  return (
    <Card className={cn(
      "border-white/[0.06] overflow-hidden transition-all duration-500",
      isActive
        ? "bg-gradient-to-br from-[#0a1628] via-[#0d0f1a] to-[#0a0f18] ring-1 ring-cyan-500/20"
        : "bg-gradient-to-br from-[#0a0f1a] to-[#060a10]"
    )}>
      <CardContent className="p-3 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              "h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-500",
              isActive
                ? "bg-cyan-500/20 shadow-lg shadow-cyan-500/10"
                : "bg-white/[0.04]"
            )}>
              {isActive ? (
                <Volume2 className="h-4 w-4 text-cyan-400 animate-pulse" />
              ) : (
                <VolumeX className="h-4 w-4 text-white/20" />
              )}
            </div>
            <div>
              <span className="text-[10px] font-mono font-bold text-white/60 tracking-wider">
                ORION AUDIOBOOK LEARNER
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <Badge variant="outline" className={cn(
                  "text-[7px] font-mono h-4",
                  isActive
                    ? "border-cyan-500/40 text-cyan-400 animate-pulse"
                    : "border-white/10 text-white/20"
                )}>
                  {isActive ? "🎧 OUVINDO" : "INATIVO"}
                </Badge>
                <Badge variant="outline" className={cn(
                  "text-[7px] font-mono h-4",
                  sttMode === "groq"
                    ? "border-emerald-500/40 text-emerald-400"
                    : "border-amber-500/30 text-amber-400"
                )}>
                  {sttMode === "groq" ? "⚡ GROQ WHISPER" : "🌐 BROWSER STT"}
                </Badge>
                {isProcessing && (
                  <Badge variant="outline" className="text-[7px] font-mono h-4 border-purple-500/40 text-purple-400 animate-pulse">
                    <Brain className="h-2 w-2 mr-0.5" /> PROCESSANDO
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Absorb Button */}
            {transcripts.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-[9px] font-mono gap-1 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/10"
                onClick={absorbToNeural}
                disabled={absorbing}
              >
                {absorbing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                Absorver
              </Button>
            )}

            {/* Main Toggle */}
            <Button
              size="sm"
              variant={isActive ? "destructive" : "default"}
              className={cn(
                "h-8 text-[9px] font-mono gap-1.5 transition-all",
                isActive
                  ? "bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30"
                  : "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30"
              )}
              onClick={toggleActive}
            >
              {isActive ? (
                <><VolumeX className="h-3 w-3" /> Desativar</>
              ) : (
                <><Headphones className="h-3 w-3" /> Ativar</>
              )}
            </Button>
          </div>
        </div>

        {/* Groq Processing Progress */}
        {groqProcessing && (
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[9px] font-mono text-emerald-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              Transcrevendo via Groq Whisper...
            </div>
            <Progress value={groqProgress} className="h-1.5" />
          </div>
        )}

        {/* Audio Visualizer Canvas */}
        <div className={cn(
          "relative rounded-lg overflow-hidden border transition-all",
          isActive ? "border-cyan-500/20 h-20" : "border-white/[0.04] h-12"
        )}>
          <canvas
            ref={canvasRef}
            width={600}
            height={80}
            className="w-full h-full"
          />
          {!isActive && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <Waves className="h-4 w-4 text-white/10" />
              <span className="text-[8px] font-mono text-white/15 ml-2">Ative para visualizar</span>
            </div>
          )}
          {isActive && (
            <div className="absolute top-1 right-1">
              <Badge className="text-[6px] font-mono bg-black/60 text-cyan-400 border-0">
                <Radio className="h-2 w-2 mr-0.5 animate-pulse" /> LIVE
              </Badge>
            </div>
          )}
        </div>

        {/* Mode Selector + STT Engine + File Upload */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1">
            <Button
              size="sm" variant={listeningMode === "file" ? "default" : "ghost"}
              className="h-6 text-[8px] font-mono gap-1"
              onClick={() => setListeningMode("file")}
              disabled={isActive}
            >
              <FileAudio className="h-2.5 w-2.5" /> Arquivo
            </Button>
            <Button
              size="sm" variant={listeningMode === "mic" ? "default" : "ghost"}
              className="h-6 text-[8px] font-mono gap-1"
              onClick={() => setListeningMode("mic")}
              disabled={isActive}
            >
              <Mic className="h-2.5 w-2.5" /> Microfone
            </Button>
          </div>

          {/* STT Engine Toggle */}
          <div className="flex gap-1 ml-auto">
            <Button
              size="sm" variant={sttMode === "groq" ? "default" : "ghost"}
              className="h-6 text-[8px] font-mono gap-1"
              onClick={() => setSttMode("groq")}
              disabled={isActive}
            >
              ⚡ Groq
            </Button>
            <Button
              size="sm" variant={sttMode === "browser" ? "default" : "ghost"}
              className="h-6 text-[8px] font-mono gap-1"
              onClick={() => setSttMode("browser")}
              disabled={isActive}
            >
              🌐 Browser
            </Button>
          </div>
        </div>

        {/* Drag-and-Drop + Upload Area */}
        {listeningMode === "file" && !audioFile && (
          <div
            ref={dropZoneRef}
            className={cn(
              "border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all",
              dragOver
                ? "border-cyan-400 bg-cyan-500/5"
                : "border-white/[0.08] hover:border-cyan-500/30"
            )}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file) handleFileUpload(file);
            }}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={handleInputChange}
            />
            <Upload className="h-6 w-6 text-white/15 mx-auto mb-1.5" />
            <p className="text-[9px] font-mono text-white/25">
              Arraste um arquivo de áudio ou clique para selecionar
            </p>
            <p className="text-[7px] font-mono text-white/10 mt-1">
              MP3, WAV, OGG, WEBM — {sttMode === "groq" ? "transcrição automática via Groq Whisper" : "transcrição via browser"}
            </p>
          </div>
        )}

        {/* File Info */}
        {listeningMode === "file" && audioFile && (
          <div className="flex items-center gap-2">
            <FileAudio className="h-3 w-3 text-cyan-400 shrink-0" />
            <span className="text-[8px] font-mono text-white/40 truncate flex-1">{audioFile.name}</span>
            <Button
              size="sm" variant="ghost"
              className="h-5 w-5 p-0"
              onClick={() => {
                if (audioUrl) URL.revokeObjectURL(audioUrl);
                setAudioFile(null);
                setAudioUrl(null);
                audioRef.current = null;
                sourceRef.current = null;
              }}
            >
              <X className="h-2.5 w-2.5 text-white/20" />
            </Button>
            {sttMode === "groq" && !groqProcessing && (
              <Button
                size="sm" variant="ghost"
                className="h-6 text-[8px] font-mono gap-1 text-emerald-400 hover:bg-emerald-500/10"
                onClick={() => transcribeWithGroq(audioFile)}
              >
                ⚡ Re-transcrever
              </Button>
            )}
          </div>
        )}

        {/* Audio Player Controls (file mode) */}
        {listeningMode === "file" && audioUrl && (
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <Button
                size="sm" variant="ghost"
                className="h-7 w-7 p-0"
                onClick={togglePlayPause}
                disabled={!isActive}
              >
                {isPlaying ? (
                  <Pause className="h-3.5 w-3.5 text-cyan-400" />
                ) : (
                  <Play className="h-3.5 w-3.5 text-cyan-400" />
                )}
              </Button>
              <div className="flex-1">
                <Slider
                  value={[currentTime]}
                  min={0}
                  max={duration || 100}
                  step={1}
                  onValueChange={v => {
                    if (audioRef.current) audioRef.current.currentTime = v[0];
                    setCurrentTime(v[0]);
                  }}
                  className="flex-1"
                />
              </div>
              <span className="text-[7px] font-mono text-white/25 w-16 text-right">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {volume === 0 ? <VolumeX className="h-2.5 w-2.5 text-white/15" /> : <Volume2 className="h-2.5 w-2.5 text-white/25" />}
              <Slider value={[volume]} min={0} max={100} step={1} onValueChange={handleVolumeChange} className="flex-1" />
              <span className="text-[7px] font-mono text-white/15 w-6 text-right">{volume}%</span>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-1.5">
          <div className="bg-black/20 rounded-md p-2 border border-white/[0.04] text-center">
            <BookOpen className="h-3 w-3 text-cyan-400 mx-auto mb-1" />
            <span className="text-[11px] font-mono font-bold text-cyan-400">{wordsLearned}</span>
            <span className="text-[7px] font-mono text-white/20 block">Palavras</span>
          </div>
          <div className="bg-black/20 rounded-md p-2 border border-white/[0.04] text-center">
            <Sparkles className="h-3 w-3 text-purple-400 mx-auto mb-1" />
            <span className="text-[11px] font-mono font-bold text-purple-400">{patternsDetected}</span>
            <span className="text-[7px] font-mono text-white/20 block">Padrões</span>
          </div>
          <div className="bg-black/20 rounded-md p-2 border border-white/[0.04] text-center">
            <Brain className="h-3 w-3 text-emerald-400 mx-auto mb-1" />
            <span className="text-[11px] font-mono font-bold text-emerald-400">{insights.length}</span>
            <span className="text-[7px] font-mono text-white/20 block">Insights</span>
          </div>
        </div>

        {/* Transcript Toggle */}
        <Button
          size="sm" variant="ghost"
          className="w-full h-6 text-[8px] font-mono text-white/20 gap-1"
          onClick={() => setShowTranscript(!showTranscript)}
        >
          {showTranscript ? <EyeOff className="h-2.5 w-2.5" /> : <Eye className="h-2.5 w-2.5" />}
          {showTranscript ? "Ocultar" : "Mostrar"} Transcrição ({transcripts.length})
        </Button>

        {/* Live Transcript */}
        {showTranscript && transcripts.length > 0 && (
          <ScrollArea className="h-[140px]">
            <div className="space-y-1">
              {transcripts.map(seg => (
                <div
                  key={seg.id}
                  className={cn(
                    "px-2 py-1 rounded border text-[9px] font-mono transition-all",
                    seg.processed
                      ? "bg-emerald-500/[0.04] border-emerald-500/10 text-white/40"
                      : "bg-cyan-500/[0.04] border-cyan-500/10 text-white/50"
                  )}
                >
                  <span className="text-[7px] text-white/15 mr-2">
                    {seg.processed ? "✓ " : ""}
                    {new Date(seg.timestamp).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                  </span>
                  {seg.text}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {/* Insights */}
        {insights.length > 0 && (
          <div className="space-y-1">
            <span className="text-[8px] font-mono text-white/20 flex items-center gap-1">
              <Sparkles className="h-2.5 w-2.5 text-purple-400" /> Insights de Aprendizado
            </span>
            <ScrollArea className="h-[100px]">
              <div className="space-y-0.5">
                {insights.slice(-10).reverse().map(ins => (
                  <div key={ins.id} className="flex items-start gap-1.5 px-2 py-1 rounded bg-purple-500/[0.04] border border-purple-500/10">
                    <span className="text-[9px] shrink-0">{insightIcon(ins.type)}</span>
                    <span className="text-[8px] font-mono text-white/40">{ins.content}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}

        {/* Empty State */}
        {!isActive && transcripts.length === 0 && !audioFile && (
          <div className="flex flex-col items-center justify-center py-6 text-white/10">
            <Headphones className="h-8 w-8 mb-2" />
            <p className="text-[9px] font-mono text-center">
              Carregue um audiobook ou ative o microfone<br />
              para o Orion aprender padrões de comunicação
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
