/**
 * YOLOv8 Tire Inspection Panel — Visual defect detection for Smart Robotic Line
 * Uses HuggingFace Inference API for object detection on tire images.
 */
import { useState, useRef, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  ScanSearch, Upload, Camera, CheckCircle, AlertTriangle,
  XCircle, Loader2, Image as ImageIcon, Trash2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Detection {
  label: string;
  confidence: number;
  bbox: { x: number; y: number; w: number; h: number };
}

interface InspectionResult {
  id: string;
  timestamp: number;
  imageUrl: string;
  detections: Detection[];
  verdict: "pass" | "warning" | "fail";
  processingMs: number;
}

const DEFECT_LABELS = ["crack", "cut", "bulge", "puncture", "wear", "deformation", "foreign_object"];

function getVerdict(detections: Detection[]): "pass" | "warning" | "fail" {
  const defects = detections.filter((d) => DEFECT_LABELS.some((l) => d.label.toLowerCase().includes(l)));
  if (defects.length === 0) return "pass";
  if (defects.some((d) => d.confidence > 0.8)) return "fail";
  return "warning";
}

export default function YOLOv8InspectionPanel() {
  const [results, setResults] = useState<InspectionResult[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const analyzeImage = useCallback(async (file: File) => {
    setAnalyzing(true);
    const start = Date.now();
    const imageUrl = URL.createObjectURL(file);
    setPreviewUrl(imageUrl);

    try {
      // Convert to base64
      const buffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

      // Call edge function for YOLOv8 inference
      const { data, error } = await supabase.functions.invoke("yolov8-inspect", {
        body: { image: base64, model: "yolov8n" },
      });

      if (error) throw error;

      const detections: Detection[] = (data?.detections ?? []).map((d: any) => ({
        label: d.label || d.class || "unknown",
        confidence: d.confidence || d.score || 0,
        bbox: {
          x: d.box?.xmin ?? d.bbox?.[0] ?? 0,
          y: d.box?.ymin ?? d.bbox?.[1] ?? 0,
          w: (d.box?.xmax ?? d.bbox?.[2] ?? 0) - (d.box?.xmin ?? d.bbox?.[0] ?? 0),
          h: (d.box?.ymax ?? d.bbox?.[3] ?? 0) - (d.box?.ymin ?? d.bbox?.[1] ?? 0),
        },
      }));

      const result: InspectionResult = {
        id: `insp_${Date.now()}`,
        timestamp: Date.now(),
        imageUrl,
        detections,
        verdict: getVerdict(detections),
        processingMs: Date.now() - start,
      };

      setResults((prev) => [result, ...prev.slice(0, 49)]);
      drawDetections(imageUrl, detections);

      toast[result.verdict === "pass" ? "success" : result.verdict === "warning" ? "warning" : "error"](
        `Inspeção: ${result.verdict === "pass" ? "✅ Aprovado" : result.verdict === "warning" ? "⚠️ Atenção" : "❌ Reprovado"} (${detections.length} detecções, ${result.processingMs}ms)`
      );
    } catch (err: any) {
      console.error("[YOLOv8] Error:", err);
      toast.error(`Erro na inspeção: ${err.message || "Falha na análise"}`);
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const drawDetections = useCallback((imageUrl: string, detections: Detection[]) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      detections.forEach((det) => {
        const isDefect = DEFECT_LABELS.some((l) => det.label.toLowerCase().includes(l));
        ctx.strokeStyle = isDefect ? (det.confidence > 0.8 ? "#ef4444" : "#f59e0b") : "#22c55e";
        ctx.lineWidth = 3;
        ctx.strokeRect(det.bbox.x, det.bbox.y, det.bbox.w, det.bbox.h);

        ctx.fillStyle = ctx.strokeStyle;
        ctx.font = "bold 14px monospace";
        const label = `${det.label} ${(det.confidence * 100).toFixed(0)}%`;
        const textW = ctx.measureText(label).width;
        ctx.fillRect(det.bbox.x, det.bbox.y - 20, textW + 8, 20);
        ctx.fillStyle = "#fff";
        ctx.fillText(label, det.bbox.x + 4, det.bbox.y - 5);
      });
    };
    img.src = imageUrl;
  }, []);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) analyzeImage(file);
  }, [analyzeImage]);

  const verdictIcon = { pass: CheckCircle, warning: AlertTriangle, fail: XCircle };
  const verdictColor = { pass: "text-green-500", warning: "text-yellow-500", fail: "text-red-500" };
  const verdictLabel = { pass: "Aprovado", warning: "Atenção", fail: "Reprovado" };

  return (
    <div className="space-y-4">
      {/* Upload / Capture */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ScanSearch className="h-4 w-4" />
            Inspeção Visual YOLOv8
            <Badge variant="secondary" className="ml-auto text-[10px]">Smart Robotic Line</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={handleFileChange}
            className="hidden"
          />
          <div className="flex gap-2">
            <Button size="sm" className="flex-1" onClick={() => fileInputRef.current?.click()} disabled={analyzing}>
              {analyzing ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
              {analyzing ? "Analisando..." : "Upload Imagem"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => {
              const input = fileInputRef.current;
              if (input) { input.setAttribute("capture", "environment"); input.click(); }
            }} disabled={analyzing}>
              <Camera className="h-3.5 w-3.5 mr-1.5" />
              Câmera
            </Button>
          </div>

          {/* Preview with detections */}
          {previewUrl && (
            <div className="relative bg-black rounded-lg overflow-hidden">
              <canvas ref={canvasRef} className="w-full object-contain max-h-64" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results History */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <ImageIcon className="h-4 w-4" />
            Histórico de Inspeções
            <Badge variant="outline" className="ml-auto text-[10px]">{results.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            {results.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Nenhuma inspeção realizada</p>
            ) : (
              <div className="space-y-2">
                {results.map((r) => {
                  const Icon = verdictIcon[r.verdict];
                  return (
                    <div key={r.id} className="flex items-center gap-3 p-2 rounded-lg border border-border/50 text-xs">
                      <Icon className={`h-4 w-4 shrink-0 ${verdictColor[r.verdict]}`} />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium">{verdictLabel[r.verdict]}</p>
                        <p className="text-muted-foreground">
                          {r.detections.length} detecções • {r.processingMs}ms •{" "}
                          {new Date(r.timestamp).toLocaleTimeString("pt-BR")}
                        </p>
                      </div>
                      <div className="flex gap-1 flex-wrap">
                        {r.detections.slice(0, 3).map((d, i) => (
                          <Badge key={i} variant="outline" className="text-[9px]">
                            {d.label} {(d.confidence * 100).toFixed(0)}%
                          </Badge>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
