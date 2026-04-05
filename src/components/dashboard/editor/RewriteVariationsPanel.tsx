import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Check, X, Sparkles, Scale, Pen, GraduationCap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cleanAIResponse } from "@/lib/document";

export interface RewriteVariation {
  id: string;
  tone: string;
  label: string;
  icon: React.ReactNode;
  text: string;
}

interface RewriteVariationsPanelProps {
  originalText: string;
  documentType?: string;
  documentCategory?: string;
  onApply: (text: string) => void;
  onClose: () => void;
}

const TONES = [
  { id: "formal", label: "Formal", icon: <GraduationCap className="h-3 w-3" />, prompt: "Reescreva em tom jurídico formal e técnico, utilizando terminologia processual adequada." },
  { id: "persuasivo", label: "Persuasivo", icon: <Sparkles className="h-3 w-3" />, prompt: "Reescreva com tom persuasivo e argumentativo, fortalecendo as teses e a retórica jurídica." },
  { id: "simplificado", label: "Simplificado", icon: <Pen className="h-3 w-3" />, prompt: "Reescreva em linguagem clara e acessível, sem perder a precisão técnica. Elimine redundâncias." },
];

export function RewriteVariationsPanel({
  originalText,
  documentType,
  documentCategory,
  onApply,
  onClose,
}: RewriteVariationsPanelProps) {
  const [variations, setVariations] = useState<RewriteVariation[]>([]);
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const generateVariations = async () => {
    setLoading(true);
    setVariations([]);
    try {
      const results = await Promise.allSettled(
        TONES.map(async (tone) => {
          const { data, error } = await supabase.functions.invoke("aprimorar-documento", {
            body: {
              currentText: originalText,
              documentType: documentType || "documento",
              mode: "light",
              userQuery: `${tone.prompt}\n\nREGRA ABSOLUTA: Retorne SOMENTE o texto reescrito, sem explicações. Mantenha tamanho similar ao original (±20%). NÃO adicione conteúdo novo.\n\n"${originalText}"`,
              userInstruction: tone.prompt,
            },
          });
          if (error) throw error;
          const raw = data?.enrichedText || data?.content || "";
          let improved = cleanAIResponse(raw);
          const outerP = improved.match(/^\s*<p[^>]*>([\s\S]*)<\/p>\s*$/i);
          if (outerP) improved = outerP[1];
          return { id: tone.id, tone: tone.id, label: tone.label, icon: tone.icon, text: improved };
        })
      );

      const successful: RewriteVariation[] = [];
      for (const r of results) {
        if (r.status === "fulfilled" && r.value.text.trim()) {
          successful.push(r.value as RewriteVariation);
        }
      }

      setVariations(successful);
      setGenerated(true);
    } catch {
      // At least show what we got
      setGenerated(true);
    } finally {
      setLoading(false);
    }
  };

  // Compute simple word diff highlights
  const getDiffClass = (variation: string) => {
    const origWords = originalText.replace(/<[^>]*>/g, "").split(/\s+/).length;
    const newWords = variation.replace(/<[^>]*>/g, "").split(/\s+/).length;
    const ratio = newWords / Math.max(origWords, 1);
    if (ratio > 1.15) return "border-l-green-500";
    if (ratio < 0.85) return "border-l-amber-500";
    return "border-l-primary";
  };

  return (
    <div className="border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2">
          <Scale className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium">Variações de Reescrita</span>
        </div>
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={onClose}>
          <X className="h-3 w-3" />
        </Button>
      </div>

      {!generated ? (
        <div className="p-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Gere 3 variações do trecho selecionado em tons diferentes para escolher a melhor.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {TONES.map(t => (
              <Badge key={t.id} variant="secondary" className="text-[10px] gap-1">
                {t.icon}{t.label}
              </Badge>
            ))}
          </div>
          <Button
            size="sm"
            className="w-full h-8 text-xs gap-1.5"
            onClick={generateVariations}
            disabled={loading}
          >
            {loading ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin" />Gerando 3 variações...</>
            ) : (
              <><Sparkles className="h-3.5 w-3.5" />Gerar Variações</>
            )}
          </Button>
        </div>
      ) : (
        <ScrollArea className="max-h-[350px]">
          <div className="p-3 space-y-3">
            {/* Original for reference */}
            <div className="space-y-1">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Original</p>
              <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2.5 py-2 border-l-2 border-l-muted-foreground/30">
                {originalText.replace(/<[^>]*>/g, "").substring(0, 300)}
                {originalText.length > 300 && "..."}
              </div>
            </div>

            {variations.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">Nenhuma variação gerada. Tente novamente.</p>
            )}

            {variations.map((v) => (
              <div key={v.id} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] gap-1 h-5">
                    {v.icon}{v.label}
                  </Badge>
                </div>
                <div className={`text-xs text-foreground bg-primary/5 rounded px-2.5 py-2 border-l-2 ${getDiffClass(v.text)}`}>
                  {v.text.replace(/<[^>]*>/g, "").substring(0, 400)}
                  {v.text.length > 400 && "..."}
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 text-[10px] gap-1"
                  onClick={() => onApply(v.text)}
                >
                  <Check className="h-3 w-3" />Aplicar esta versão
                </Button>
              </div>
            ))}

            <Button
              variant="ghost"
              size="sm"
              className="w-full h-7 text-[10px] text-muted-foreground"
              onClick={generateVariations}
              disabled={loading}
            >
              {loading ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Sparkles className="h-3 w-3 mr-1" />}
              Regenerar variações
            </Button>
          </div>
        </ScrollArea>
      )}
    </div>
  );
}
