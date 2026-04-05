import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, Upload, Star } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cloudVisionAnnotate } from "@/lib/google-server";

const FEATURES = [
  { value: "TEXT_DETECTION", label: "OCR / Texto" },
  { value: "LABEL_DETECTION", label: "Labels" },
  { value: "FACE_DETECTION", label: "Faces" },
  { value: "OBJECT_LOCALIZATION", label: "Objetos" },
  { value: "LOGO_DETECTION", label: "Logos" },
  { value: "LANDMARK_DETECTION", label: "Pontos de referência" },
  { value: "SAFE_SEARCH_DETECTION", label: "Safe Search" },
];

export function CloudVisionPanel() {
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>(["TEXT_DETECTION", "LABEL_DETECTION"]);
  const [celebrityRecognition, setCelebrityRecognition] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  function toggleFeature(f: string) {
    setSelectedFeatures(prev =>
      prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f]
    );
  }

  // Ensure FACE_DETECTION is included when celebrity recognition is on
  const effectiveFeatures = celebrityRecognition && !selectedFeatures.includes("FACE_DETECTION")
    ? [...selectedFeatures, "FACE_DETECTION"]
    : selectedFeatures;

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
      const data = await cloudVisionAnnotate(base64, effectiveFeatures, celebrityRecognition);
      setResult(data?.responses?.[0] || data);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Eye className="h-5 w-5 text-primary" />
          Cloud Vision API
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          {FEATURES.map(f => (
            <Badge
              key={f.value}
              variant={selectedFeatures.includes(f.value) ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => toggleFeature(f.value)}
            >
              {f.label}
            </Badge>
          ))}
        </div>

        {/* Celebrity Recognition Toggle */}
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
          <Star className="h-4 w-4 text-yellow-500" />
          <Label htmlFor="celebrity-toggle" className="text-sm font-medium cursor-pointer flex-1">
            Celebrity Recognition
            <span className="text-xs text-muted-foreground block">
              Detecta celebridades em imagens (requer acesso aprovado no GCP)
            </span>
          </Label>
          <Switch
            id="celebrity-toggle"
            checked={celebrityRecognition}
            onCheckedChange={setCelebrityRecognition}
          />
        </div>

        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
        <Button onClick={() => fileRef.current?.click()} disabled={loading} variant="outline" className="w-full">
          {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
          Enviar imagem para análise
        </Button>

        {preview && (
          <img src={preview} alt="Preview" className="max-h-48 rounded-lg mx-auto" />
        )}

        {result && (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {/* Celebrity Recognition Results */}
            {result.faceAnnotations?.some((f: any) => f.celebrityResults?.celebrities?.length > 0) && (
              <div className="p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                <p className="text-xs font-medium text-yellow-600 dark:text-yellow-400 mb-2 flex items-center gap-1">
                  <Star className="h-3 w-3" /> Celebridades detectadas
                </p>
                <div className="space-y-2">
                  {result.faceAnnotations
                    .filter((f: any) => f.celebrityResults?.celebrities?.length > 0)
                    .flatMap((f: any) =>
                      f.celebrityResults.celebrities.map((celeb: any, i: number) => (
                        <div key={`${celeb.mid}-${i}`} className="flex items-center gap-2">
                          <Badge variant="default" className="bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30">
                            {celeb.displayName}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {(celeb.confidence * 100).toFixed(0)}% • MID: {celeb.mid}
                          </span>
                        </div>
                      ))
                    )}
                </div>
              </div>
            )}

            {result.textAnnotations && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs font-medium text-primary mb-1">Texto detectado</p>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {result.textAnnotations[0]?.description || "Nenhum texto"}
                </p>
              </div>
            )}
            {result.labelAnnotations && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs font-medium text-primary mb-1">Labels</p>
                <div className="flex gap-1 flex-wrap">
                  {result.labelAnnotations.map((l: any, i: number) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {l.description} ({(l.score * 100).toFixed(0)}%)
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {result.faceAnnotations && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs font-medium text-primary mb-1">
                  {result.faceAnnotations.length} face(s) detectada(s)
                </p>
              </div>
            )}
            {result.localizedObjectAnnotations && (
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs font-medium text-primary mb-1">Objetos</p>
                <div className="flex gap-1 flex-wrap">
                  {result.localizedObjectAnnotations.map((o: any, i: number) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {o.name} ({(o.score * 100).toFixed(0)}%)
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
