import { useState, useEffect } from "react";
import { Settings, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface DocumentSettingsProps {
  watermark: string;
  onWatermarkChange: (v: string) => void;
  isJudicial?: boolean;
  letterhead?: boolean;
  onLetterheadChange?: (v: boolean) => void;
  marginTop?: number;
  marginBottom?: number;
  onMarginTopChange?: (v: number) => void;
  onMarginBottomChange?: (v: number) => void;
}

interface FooterConfig {
  telefone: string;
  email_contato: string;
  website: string;
  endereco: string;
}

export function DocumentSettings({ watermark, onWatermarkChange, isJudicial = false, letterhead = false, onLetterheadChange, marginTop = 25, marginBottom = 20, onMarginTopChange, onMarginBottomChange }: DocumentSettingsProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [footer, setFooter] = useState<FooterConfig>({
    telefone: "",
    email_contato: "",
    website: "",
    endereco: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("escritorio_config")
      .select("telefone, email_contato, website, endereco")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setFooter({
            telefone: data.telefone || "",
            email_contato: data.email_contato || "",
            website: data.website || "",
            endereco: data.endereco || "",
          });
        }
      });
  }, [user]);

  const handleSaveFooter = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const { data: existing } = await supabase
        .from("escritorio_config")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("escritorio_config")
          .update({
            telefone: footer.telefone,
            email_contato: footer.email_contato,
            website: footer.website,
            endereco: footer.endereco,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", user.id);
      } else {
        await supabase.from("escritorio_config").insert({
          user_id: user.id,
          telefone: footer.telefone,
          email_contato: footer.email_contato,
          website: footer.website,
          endereco: footer.endereco,
        });
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border border-border bg-card">
      <button
        className="w-full flex items-center justify-between px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        onClick={() => setOpen(!open)}
      >
        <span className="flex items-center gap-1.5">
          <Settings className="h-3 w-3" />
          Configurações do Documento
        </span>
        {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-3 border-t border-border pt-3">
          {/* Letterhead toggle */}
          <div className="flex items-center justify-between gap-2">
            <div>
              <Label className="text-xs">Usar papel timbrado</Label>
              <p className="text-[10px] text-muted-foreground">
                {isJudicial
                  ? "Peças judiciais normalmente não usam timbre"
                  : "Inclui logo e rodapé do escritório"}
              </p>
            </div>
            <Switch
              checked={letterhead}
              onCheckedChange={(v) => onLetterheadChange?.(v)}
            />
          </div>

          {/* Watermark */}
          <div className="space-y-1">
            <Label className="text-xs">Marca d'água</Label>
            {isJudicial && !letterhead ? (
              <p className="text-[10px] text-primary border border-primary/30 bg-primary/5 px-2 py-1.5">
                Sem marca d'água — Peças judiciais para peticionamento.
              </p>
            ) : (
              <Select value={watermark} onValueChange={onWatermarkChange}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  <SelectItem value="rascunho">Rascunho</SelectItem>
                  <SelectItem value="confidencial">Confidencial</SelectItem>
                  <SelectItem value="oficial">Oficial</SelectItem>
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Margin controls */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Margens do Documento</Label>
            <div className="space-y-3">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] text-muted-foreground">Afastamento do cabeçalho</Label>
                  <span className="text-[10px] text-muted-foreground font-mono">{marginTop}mm</span>
                </div>
                <Slider
                  value={[marginTop]}
                  onValueChange={([v]) => onMarginTopChange?.(v)}
                  min={20}
                  max={50}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-[9px] text-muted-foreground/50">
                  <span>20mm</span>
                  <span>30mm (ABNT)</span>
                  <span>50mm</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-[10px] text-muted-foreground">Afastamento do rodapé</Label>
                  <span className="text-[10px] text-muted-foreground font-mono">{marginBottom}mm</span>
                </div>
                <Slider
                  value={[marginBottom]}
                  onValueChange={([v]) => onMarginBottomChange?.(v)}
                  min={15}
                  max={40}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-[9px] text-muted-foreground/50">
                  <span>15mm</span>
                  <span>20mm (ABNT)</span>
                  <span>40mm</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer info */}
          <div className="space-y-2">
            <Label className="text-xs font-medium">Rodapé do PDF</Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-[10px] text-muted-foreground">Telefone</Label>
                <Input
                  className="h-7 text-xs"
                  value={footer.telefone}
                  onChange={(e) => setFooter((p) => ({ ...p, telefone: e.target.value }))}
                  placeholder="(51) 99999-0000"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">E-mail</Label>
                <Input
                  className="h-7 text-xs"
                  value={footer.email_contato}
                  onChange={(e) => setFooter((p) => ({ ...p, email_contato: e.target.value }))}
                  placeholder="contato@escritorio.com"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Website</Label>
                <Input
                  className="h-7 text-xs"
                  value={footer.website}
                  onChange={(e) => setFooter((p) => ({ ...p, website: e.target.value }))}
                  placeholder="www.escritorio.com"
                />
              </div>
              <div>
                <Label className="text-[10px] text-muted-foreground">Endereço</Label>
                <Input
                  className="h-7 text-xs"
                  value={footer.endereco}
                  onChange={(e) => setFooter((p) => ({ ...p, endereco: e.target.value }))}
                  placeholder="Porto Alegre, RS"
                />
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="text-xs w-full h-7"
              onClick={handleSaveFooter}
              disabled={saving}
            >
              {saving ? "Salvando..." : "Salvar dados do rodapé"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
