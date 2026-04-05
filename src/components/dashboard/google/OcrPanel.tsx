import { useState, useRef } from "react";
import { useNeuralFeedback } from "@/hooks/useNeuralFeedback";
import { useAuth } from "@/contexts/AuthContext";
import { Upload, FileText, Loader2, Copy, Download, Eye, Layers, ToggleLeft, ToggleRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { PDFSegmentationViewer, type LayoutSegment } from "@/components/dashboard/editor/PDFSegmentationViewer";

export function OcrPanel() {
  const { user } = useAuth();
  const { logNeural } = useNeuralFeedback();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    fullText: string;
    wordCount: number;
    lineCount: number;
    language: string;
    confidence: number | null;
  } | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  // Layout Inteligente state
  const [useLayout, setUseLayout] = useState(false);
  const [layoutAvailable, setLayoutAvailable] = useState<boolean | null>(null);
  const [layoutSegments, setLayoutSegments] = useState<LayoutSegment[]>([]);
  const [layoutMarkdown, setLayoutMarkdown] = useState<string | null>(null);

  // Check if HURIDOCS service is available on first toggle
  const checkLayoutAvailability = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      // A quick probe — if the function returns 503 (not configured), it's unavailable
      const response = await supabase.functions.invoke("pdf-vision-local", {
        body: { pdfBase64: "dGVzdA==", mode: "analyze" },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (response.error) {
        const msg = typeof response.error === "object" ? JSON.stringify(response.error) : String(response.error);
        if (msg.includes("503") || msg.includes("not configured")) {
          setLayoutAvailable(false);
          return false;
        }
      }
      setLayoutAvailable(true);
      return true;
    } catch {
      setLayoutAvailable(false);
      return false;
    }
  };

  const handleToggleLayout = async () => {
    if (!useLayout) {
      if (layoutAvailable === null) {
        const available = await checkLayoutAvailability();
        if (!available) {
          toast({
            title: "Serviço não configurado",
            description: "Configure o secret PDF_LAYOUT_SERVICE_URL no Supabase para usar o Layout Inteligente.",
            variant: "destructive",
          });
          return;
        }
      } else if (layoutAvailable === false) {
        toast({
          title: "Serviço não configurado",
          description: "Configure o secret PDF_LAYOUT_SERVICE_URL no Supabase.",
          variant: "destructive",
        });
        return;
      }
    }
    setUseLayout(!useLayout);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"];
    if (!validTypes.includes(file.type)) {
      toast({ title: "Formato não suportado", description: "Use imagens PNG, JPG, WebP ou PDF.", variant: "destructive" });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "Arquivo muito grande", description: "O arquivo deve ter no máximo 10MB.", variant: "destructive" });
      return;
    }

    setFileName(file.name);
    setResult(null);
    setLayoutSegments([]);
    setLayoutMarkdown(null);

    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setPreview(null);
    }

    setLoading(true);
    try {
      const base64 = await fileToBase64(file);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (useLayout && file.type === "application/pdf") {
        // Try Gradio client first (unified HF Space client), fallback to Edge Function
        let analyzeData: any = null;
        let markdownContent: string | null = null;

        try {
          const { analyzePDFViaSpace } = await import("@/lib/huggingface/gradio-client");
          const [analyzeResult, mdResult] = await Promise.all([
            analyzePDFViaSpace(file, "analyze"),
            analyzePDFViaSpace(file, "markdown"),
          ]);
          analyzeData = analyzeResult;
          markdownContent = typeof mdResult === "string" ? mdResult : null;
        } catch (gradioErr) {
          console.warn("[OcrPanel] Gradio fallback to Edge Function:", gradioErr);
          // Fallback: Edge Function
          const [analyzeRes, markdownRes] = await Promise.all([
            supabase.functions.invoke("pdf-vision-local", {
              body: { pdfBase64: base64, mode: "analyze" },
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            }),
            supabase.functions.invoke("pdf-vision-local", {
              body: { pdfBase64: base64, mode: "markdown" },
              headers: token ? { Authorization: `Bearer ${token}` } : undefined,
            }),
          ]);
          if (analyzeRes.error) throw analyzeRes.error;
          analyzeData = analyzeRes.data;
          markdownContent = markdownRes.data?.content || null;
        }

        const segments: LayoutSegment[] = analyzeData?.segments || [];
        setLayoutSegments(segments);
        setLayoutMarkdown(markdownContent);

        const totalText = segments.map((s: LayoutSegment) => s.content).join("\n");
        const wordCount = totalText.split(/\s+/).filter(Boolean).length;
        setResult({
          fullText: totalText,
          wordCount,
          lineCount: totalText.split("\n").length,
          language: "pt",
          confidence: null,
        });

        toast({ title: "Layout analisado!", description: `${segments.length} segmentos • ${wordCount} palavras.` });

        logNeural({
          interaction_type: "document_viewed",
          input_text: `Layout Analysis: ${file.name}`,
          output_text: totalText.substring(0, 1000),
          quality_score: 0.85,
          user_id: user?.id,
          metadata: { module: "ocr_panel_layout", segmentCount: segments.length, wordCount, fileName: file.name },
        });
      } else {
        // Standard OCR (Vision API)
        const response = await supabase.functions.invoke("ocr-document", {
          body: { imageBase64: base64, mimeType: file.type },
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });

        if (response.error) throw response.error;

        setResult(response.data);
        toast({ title: "OCR concluído!", description: `${response.data.wordCount} palavras extraídas.` });

        logNeural({
          interaction_type: "document_viewed",
          input_text: `OCR de documento: ${file.name}`,
          output_text: (response.data.fullText || "").substring(0, 1000),
          quality_score: response.data.confidence ? Math.min(response.data.confidence + 0.1, 1) : 0.75,
          user_id: user?.id,
          metadata: { module: "ocr_panel", wordCount: response.data.wordCount, language: response.data.language, fileName: file.name },
        });
      }
    } catch (error: any) {
      toast({ title: "Erro no processamento", description: error.message || "Não foi possível processar o documento.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleCopy = () => {
    if (result?.fullText) {
      navigator.clipboard.writeText(result.fullText);
      toast({ title: "Texto copiado!" });
    }
  };

  const handleCopyMarkdown = () => {
    if (layoutMarkdown) {
      navigator.clipboard.writeText(layoutMarkdown);
      toast({ title: "Markdown copiado!" });
    }
  };

  const handleDownload = () => {
    if (result?.fullText) {
      const blob = new Blob([result.fullText], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `ocr-${fileName.replace(/\.[^.]+$/, "")}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-6">
      {/* Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">OCR Simples</span>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs"
            onClick={handleToggleLayout}
          >
            {useLayout ? (
              <ToggleRight className="h-4 w-4 text-primary" />
            ) : (
              <ToggleLeft className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
          <span className={`text-xs ${useLayout ? "text-primary font-medium" : "text-muted-foreground"}`}>
            Layout Inteligente
          </span>
        </div>
        {useLayout && (
          <Badge variant="outline" className="text-[10px] gap-1">
            <Layers className="h-3 w-3" />
            HURIDOCS
          </Badge>
        )}
      </div>

      {/* Upload Area */}
      <Card className="border-dashed border-2 border-primary/30 bg-card/50">
        <CardContent className="p-8">
          <div
            className="flex flex-col items-center justify-center cursor-pointer"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={useLayout ? "application/pdf" : "image/*,application/pdf"}
              onChange={handleFileSelect}
              className="hidden"
            />
            {loading ? (
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-12 w-12 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">
                  {useLayout ? "Analisando layout com HURIDOCS..." : "Processando documento com Vision API..."}
                </p>
              </div>
            ) : (
              <>
                <Upload className="h-12 w-12 text-primary/60 mb-4" />
                <p className="text-foreground font-medium mb-1">Clique para enviar documento</p>
                <p className="text-xs text-muted-foreground">
                  {useLayout ? "PDF — máximo 10MB" : "PNG, JPG, WebP, PDF — máximo 10MB"}
                </p>
                {fileName && (
                  <Badge variant="secondary" className="mt-3">
                    <FileText className="h-3 w-3 mr-1" />
                    {fileName}
                  </Badge>
                )}
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Preview & Result */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Image Preview */}
        {preview && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Eye className="h-4 w-4 text-primary" />
                Pré-visualização
              </CardTitle>
            </CardHeader>
            <CardContent>
              <img src={preview} alt="Preview" className="w-full rounded-lg border border-border max-h-[400px] object-contain" />
            </CardContent>
          </Card>
        )}

        {/* Layout Segmentation View */}
        {useLayout && layoutSegments.length > 0 && (
          <div className={preview ? "" : "md:col-span-2"}>
            <PDFSegmentationViewer
              segments={layoutSegments}
              onCopyMarkdown={layoutMarkdown ? handleCopyMarkdown : undefined}
            />
          </div>
        )}

        {/* OCR Result (standard mode) */}
        {result && !useLayout && (
          <Card className={preview ? "" : "md:col-span-2"}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Texto Extraído
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={handleCopy}>
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    Copiar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleDownload}>
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Baixar
                  </Button>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className="text-[10px]">{result.wordCount} palavras</Badge>
                <Badge variant="outline" className="text-[10px]">{result.lineCount} linhas</Badge>
                <Badge variant="outline" className="text-[10px]">Idioma: {result.language}</Badge>
                {result.confidence && (
                  <Badge variant="outline" className="text-[10px]">Confiança: {(result.confidence * 100).toFixed(1)}%</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Textarea value={result.fullText} readOnly className="min-h-[300px] text-sm font-mono bg-muted/30" />
            </CardContent>
          </Card>
        )}

        {/* Layout mode: also show raw text */}
        {result && useLayout && (
          <Card className={preview || layoutSegments.length > 0 ? "" : "md:col-span-2"}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Texto Completo
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={handleCopy}>
                    <Copy className="h-3.5 w-3.5 mr-1" />
                    Copiar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleDownload}>
                    <Download className="h-3.5 w-3.5 mr-1" />
                    Baixar
                  </Button>
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className="text-[10px]">{result.wordCount} palavras</Badge>
                <Badge variant="outline" className="text-[10px]">{result.lineCount} linhas</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <Textarea value={result.fullText} readOnly className="min-h-[300px] text-sm font-mono bg-muted/30" />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
