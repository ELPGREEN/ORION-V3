import { useState } from "react";
import { useNeuralFeedback } from "@/hooks/useNeuralFeedback";
import { useAuth } from "@/contexts/AuthContext";
import { Languages, Loader2, ArrowRightLeft, Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const LANGUAGES = [
  { code: "pt", label: "Português" },
  { code: "en", label: "Inglês" },
  { code: "es", label: "Espanhol" },
  { code: "fr", label: "Francês" },
  { code: "de", label: "Alemão" },
  { code: "it", label: "Italiano" },
  { code: "ja", label: "Japonês" },
  { code: "zh", label: "Chinês" },
  { code: "ar", label: "Árabe" },
  { code: "ru", label: "Russo" },
  { code: "ko", label: "Coreano" },
  { code: "nl", label: "Holandês" },
  { code: "la", label: "Latim" },
];

export function TranslationPanel() {
  const { user } = useAuth();
  const { logNeural } = useNeuralFeedback();
  const [sourceText, setSourceText] = useState("");
  const [translatedText, setTranslatedText] = useState("");
  const [sourceLanguage, setSourceLanguage] = useState("");
  const [targetLanguage, setTargetLanguage] = useState("en");
  const [detectedLanguage, setDetectedLanguage] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleTranslate = async () => {
    if (!sourceText.trim()) {
      toast({
        title: "Texto vazio",
        description: "Insira o texto que deseja traduzir.",
        variant: "destructive",
      });
      return;
    }

    if (!targetLanguage) {
      toast({
        title: "Selecione o idioma",
        description: "Escolha o idioma de destino.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      const response = await supabase.functions.invoke("translate-text", {
        body: {
          text: sourceText,
          targetLanguage,
          sourceLanguage: sourceLanguage || undefined,
        },
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (response.error) throw response.error;

      setTranslatedText(response.data.translatedText);
      setDetectedLanguage(response.data.detectedSourceLanguage);

      toast({
        title: "Tradução concluída!",
        description: `${response.data.originalLength} → ${response.data.translatedLength} caracteres`,
      });

      // 🧠 Neural: tradução jurídica = dado valioso de cross-linguagem
      logNeural({
        interaction_type: "search",
        input_text: sourceText.substring(0, 500),
        output_text: response.data.translatedText.substring(0, 500),
        quality_score: 0.78,
        user_id: user?.id,
        metadata: {
          module: "translation_panel",
          sourceLanguage: response.data.detectedSourceLanguage || sourceLanguage,
          targetLanguage,
          charCount: response.data.translatedLength,
        },
      });
    } catch (error: any) {
      toast({
        title: "Erro na tradução",
        description: error.message || "Não foi possível traduzir o texto.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSwapLanguages = () => {
    if (translatedText) {
      setSourceText(translatedText);
      setTranslatedText("");
      const newTarget = sourceLanguage || detectedLanguage;
      setSourceLanguage(targetLanguage);
      setTargetLanguage(newTarget || "pt");
    }
  };

  const handleCopy = () => {
    if (translatedText) {
      navigator.clipboard.writeText(translatedText);
      toast({ title: "Tradução copiada!" });
    }
  };

  const handleDownload = () => {
    if (translatedText) {
      const blob = new Blob([translatedText], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `traducao-${targetLanguage}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const getLangLabel = (code: string) => LANGUAGES.find((l) => l.code === code)?.label || code;

  return (
    <div className="space-y-6">
      {/* Language Selection */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex-1 min-w-[140px]">
          <Select value={sourceLanguage} onValueChange={setSourceLanguage}>
            <SelectTrigger className="bg-card">
              <SelectValue placeholder="Detectar idioma" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="auto">Detectar automaticamente</SelectItem>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Button
          variant="ghost"
          size="icon"
          onClick={handleSwapLanguages}
          disabled={!translatedText}
          className="text-primary hover:text-primary/80"
        >
          <ArrowRightLeft className="h-5 w-5" />
        </Button>

        <div className="flex-1 min-w-[140px]">
          <Select value={targetLanguage} onValueChange={setTargetLanguage}>
            <SelectTrigger className="bg-card">
              <SelectValue placeholder="Idioma de destino" />
            </SelectTrigger>
            <SelectContent>
              {LANGUAGES.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Text Areas */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">
              Texto Original
              {detectedLanguage && (
                <Badge variant="outline" className="ml-2 text-[10px]">
                  Detectado: {getLangLabel(detectedLanguage)}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Cole aqui o texto jurídico para traduzir: petições, contratos, leis, jurisprudência..."
              className="min-h-[300px] text-sm bg-muted/20"
            />
            <p className="text-[10px] text-muted-foreground mt-2 text-right">
              {sourceText.length} caracteres
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm text-muted-foreground">
                Tradução ({getLangLabel(targetLanguage)})
              </CardTitle>
              {translatedText && (
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={handleCopy} className="h-7 text-[10px]">
                    <Copy className="h-3 w-3 mr-1" />
                    Copiar
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleDownload} className="h-7 text-[10px]">
                    <Download className="h-3 w-3 mr-1" />
                    Baixar
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <Textarea
              value={translatedText}
              readOnly
              placeholder="A tradução aparecerá aqui..."
              className="min-h-[300px] text-sm bg-muted/20"
            />
            <p className="text-[10px] text-muted-foreground mt-2 text-right">
              {translatedText.length} caracteres
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Translate Button */}
      <div className="flex justify-center">
        <Button
          className="btn-gold px-8 h-11"
          onClick={handleTranslate}
          disabled={loading || !sourceText.trim()}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Traduzindo...
            </>
          ) : (
            <>
              <Languages className="h-4 w-4 mr-2" />
              TRADUZIR DOCUMENTO
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
