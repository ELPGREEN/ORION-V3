import { useState, useEffect, useMemo } from "react";
import { extractVariables, fillVariables, COMMON_VARIABLES, createVariablePlaceholder, type TemplateVariable } from "@/lib/templateEngine";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ChevronDown,
  ChevronRight,
  Variable,
  Sparkles,
  Plus,
  Check,
  Copy,
  RotateCcw,
} from "lucide-react";

interface TemplateVariablesPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contentHtml: string;
  onApplyVariables: (filledHtml: string) => void;
  onInsertVariable?: (placeholder: string) => void;
}

export function TemplateVariablesPanel({
  open,
  onOpenChange,
  contentHtml,
  onApplyVariables,
  onInsertVariable,
}: TemplateVariablesPanelProps) {
  const variables = useMemo(() => extractVariables(contentHtml), [contentHtml]);
  const [values, setValues] = useState<Record<string, string>>({});
  const [presetsOpen, setPresetsOpen] = useState(false);
  const [customVarName, setCustomVarName] = useState("");

  // Reset values when variables change
  useEffect(() => {
    setValues((prev) => {
      const next: Record<string, string> = {};
      for (const v of variables) {
        next[v.name] = prev[v.name] || "";
      }
      return next;
    });
  }, [variables]);

  const filledCount = Object.values(values).filter((v) => v.trim()).length;
  const totalCount = variables.length;

  const handleApply = () => {
    const filled = fillVariables(contentHtml, values);
    onApplyVariables(filled);
    onOpenChange(false);
  };

  const handleInsertPreset = (varName: string) => {
    const placeholder = createVariablePlaceholder(varName);
    onInsertVariable?.(placeholder);
  };

  const handleInsertCustom = () => {
    if (!customVarName.trim()) return;
    const placeholder = createVariablePlaceholder(customVarName.trim());
    onInsertVariable?.(placeholder);
    setCustomVarName("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-sm">
            <Variable className="h-4 w-4 text-primary" />
            Variáveis do Template
          </DialogTitle>
          <DialogDescription className="text-xs">
            Preencha os valores para substituir automaticamente os placeholders{" "}
            <code className="bg-muted px-1 py-0.5 rounded text-[10px]">{"{{variável}}"}</code> no documento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Detected Variables */}
          {variables.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-foreground">
                  Variáveis detectadas
                </span>
                <Badge variant="secondary" className="text-[10px]">
                  {filledCount}/{totalCount} preenchidas
                </Badge>
              </div>

              {variables.map((v) => (
                <div key={v.name} className="space-y-1">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-medium">
                      <code className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[11px]">
                        {`{{${v.name}}}`}
                      </code>
                    </Label>
                    <span className="text-[10px] text-muted-foreground">
                      {v.occurrences}× no documento
                    </span>
                  </div>
                  <Input
                    value={values[v.name] || ""}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [v.name]: e.target.value }))
                    }
                    placeholder={`Valor para ${v.name}`}
                    className="h-8 text-xs"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 space-y-2">
              <Variable className="h-8 w-8 text-muted-foreground/40 mx-auto" />
              <p className="text-xs text-muted-foreground">
                Nenhuma variável <code className="bg-muted px-1 rounded">{"{{...}}"}</code> detectada no documento.
              </p>
              <p className="text-[10px] text-muted-foreground/70">
                Insira variáveis usando os presets abaixo ou digitando manualmente.
              </p>
            </div>
          )}

          {/* Insert Variable Section */}
          {onInsertVariable && (
            <div className="border-t border-border pt-3 space-y-3">
              {/* Custom variable input */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Inserir nova variável</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={customVarName}
                    onChange={(e) => setCustomVarName(e.target.value)}
                    placeholder="nome_variavel"
                    className="h-8 text-xs flex-1"
                    onKeyDown={(e) => e.key === "Enter" && handleInsertCustom()}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                    onClick={handleInsertCustom}
                    disabled={!customVarName.trim()}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Inserir
                  </Button>
                </div>
              </div>

              {/* Presets */}
              <Collapsible open={presetsOpen} onOpenChange={setPresetsOpen}>
                <CollapsibleTrigger className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors w-full">
                  {presetsOpen ? (
                    <ChevronDown className="h-3 w-3" />
                  ) : (
                    <ChevronRight className="h-3 w-3" />
                  )}
                  <Sparkles className="h-3 w-3" />
                  Variáveis comuns (presets jurídicos)
                </CollapsibleTrigger>
                <CollapsibleContent className="pt-2 space-y-2">
                  {Object.entries(COMMON_VARIABLES).map(([category, vars]) => (
                    <div key={category} className="space-y-1">
                      <span className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">
                        {category}
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {vars.map((varName) => (
                          <button
                            key={varName}
                            onClick={() => handleInsertPreset(varName)}
                            className="inline-flex items-center gap-1 px-2 py-1 text-[10px] bg-secondary hover:bg-primary/10 hover:text-primary border border-border rounded transition-colors"
                          >
                            <Copy className="h-2.5 w-2.5" />
                            {`{{${varName}}}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs"
            onClick={() => setValues({})}
            disabled={filledCount === 0}
          >
            <RotateCcw className="h-3 w-3 mr-1" />
            Limpar
          </Button>
          <Button
            size="sm"
            className="text-xs btn-gold"
            onClick={handleApply}
            disabled={filledCount === 0}
          >
            <Check className="h-3 w-3 mr-1" />
            Aplicar ({filledCount} variáveis)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
