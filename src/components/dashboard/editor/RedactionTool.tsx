import { useState } from "react";
import { ShieldAlert, Eye, EyeOff, Scan, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { agenteLeitura } from "@/lib/api";

const SENSITIVE_PATTERNS = [
  { id: "cpf", label: "CPF", regex: /\d{3}\.?\d{3}\.?\d{3}-?\d{2}/g },
  { id: "cnpj", label: "CNPJ", regex: /\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/g },
  { id: "email", label: "E-mail", regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
  { id: "phone", label: "Telefone", regex: /(?:\+?\d{1,3}[\s-]?)?\(?\d{2,3}\)?[\s.-]?\d{4,5}[\s.-]?\d{4}/g },
  { id: "rg", label: "RG", regex: /\d{1,2}\.?\d{3}\.?\d{3}-?[0-9Xx]/g },
];

interface Match {
  text: string;
  patternId: string;
  redacted: boolean;
}

interface RedactionToolProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  contentHtml: string;
  onApplyRedaction: (redactedHtml: string) => void;
}

export function RedactionTool({ open, onOpenChange, contentHtml, onApplyRedaction }: RedactionToolProps) {
  const [selectedPatterns, setSelectedPatterns] = useState<string[]>(SENSITIVE_PATTERNS.map((p) => p.id));
  const [customTerm, setCustomTerm] = useState("");
  const [matches, setMatches] = useState<Match[]>([]);
  const [scanned, setScanned] = useState(false);
  const [revealAll, setRevealAll] = useState(false);
  const [aiScanning, setAiScanning] = useState(false);

  const htmlToText = (html: string) => html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();

  const handleScan = () => {
    const text = htmlToText(contentHtml);
    const found: Match[] = [];
    const seen = new Set<string>();

    for (const pattern of SENSITIVE_PATTERNS) {
      if (!selectedPatterns.includes(pattern.id)) continue;
      const re = new RegExp(pattern.regex.source, pattern.regex.flags);
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        if (!seen.has(m[0])) {
          seen.add(m[0]);
          found.push({ text: m[0], patternId: pattern.id, redacted: true });
        }
      }
    }

    if (customTerm.trim()) {
      const escaped = customTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const re = new RegExp(escaped, "gi");
      let m: RegExpExecArray | null;
      while ((m = re.exec(text)) !== null) {
        if (!seen.has(m[0])) {
          seen.add(m[0]);
          found.push({ text: m[0], patternId: "custom", redacted: true });
        }
      }
    }

    setMatches(found);
    setScanned(true);
  };

  // AI-powered contextual detection via agente-leitura
  const handleAIScan = async () => {
    setAiScanning(true);
    try {
      const text = htmlToText(contentHtml).substring(0, 5000);
      const result = await agenteLeitura.readFile(
        text,
        "documento-lgpd.txt",
        "Identifique TODOS os dados pessoais sensíveis neste documento jurídico: nomes completos de pessoas físicas, endereços completos, números de processo, datas de nascimento, nomes de menores, números de conta bancária, e quaisquer outros dados que devam ser anonimizados conforme a LGPD. Retorne APENAS uma lista, um item por linha, no formato: TIPO: valor_encontrado"
      );
      
      if (result.success && result.analysis) {
        const lines = result.analysis.split("\n").filter((l: string) => l.includes(":"));
        const seen = new Set(matches.map(m => m.text));
        const newMatches: Match[] = [];
        
        for (const line of lines) {
          const colonIdx = line.indexOf(":");
          if (colonIdx < 0) continue;
          const tipo = line.substring(0, colonIdx).trim().toLowerCase();
          const valor = line.substring(colonIdx + 1).trim().replace(/^["']|["']$/g, "");
          if (valor.length < 2 || valor.length > 100) continue;
          if (seen.has(valor)) continue;
          
          // Verify the value actually exists in the text
          if (text.includes(valor)) {
            seen.add(valor);
            const patternId = tipo.includes("nome") ? "nome_ia" :
              tipo.includes("endereço") || tipo.includes("endereco") ? "endereco_ia" :
              tipo.includes("processo") ? "processo_ia" :
              tipo.includes("nasc") ? "nascimento_ia" : "contextual_ia";
            newMatches.push({ text: valor, patternId, redacted: true });
          }
        }
        
        if (newMatches.length > 0) {
          setMatches(prev => [...prev, ...newMatches]);
        }
      }
    } catch (err) {
    } finally {
      setAiScanning(false);
      setScanned(true);
    }
  };

  const toggleMatch = (idx: number) => {
    setMatches((prev) => prev.map((m, i) => (i === idx ? { ...m, redacted: !m.redacted } : m)));
  };

  const handleApply = () => {
    const toRedact = matches.filter((m) => m.redacted).sort((a, b) => b.text.length - a.text.length);
    let result = contentHtml;

    for (const match of toRedact) {
      const escaped = match.text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const block = "█".repeat(match.text.length);
      const replacement = `<span style="background:#000;color:#000;border-radius:2px;padding:0 2px" data-redacted="true" title="Redacted">${block}</span>`;
      // Replace only text content outside of HTML tags to avoid corrupting attributes
      result = result.replace(new RegExp(`(>|^)([^<]*?)${escaped}`, "g"), (_m, prefix: string, before: string) => {
        return `${prefix}${before}${replacement}`;
      });
    }

    onApplyRedaction(result);
    onOpenChange(false);
    setMatches([]);
    setScanned(false);
  };

  const redactedCount = matches.filter((m) => m.redacted).length;
  const aiMatchCount = matches.filter((m) => m.patternId.endsWith("_ia")).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg bg-card">
        <DialogHeader>
          <DialogTitle className="text-sm flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-destructive" />
            Redação de Dados Sensíveis (LGPD)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs text-muted-foreground">Selecione os tipos de dados a buscar:</p>
            <div className="flex flex-wrap gap-3">
              {SENSITIVE_PATTERNS.map((p) => (
                <label key={p.id} className="flex items-center gap-1.5 text-xs">
                  <Checkbox
                    checked={selectedPatterns.includes(p.id)}
                    onCheckedChange={(v) =>
                      setSelectedPatterns((prev) => (v ? [...prev, p.id] : prev.filter((x) => x !== p.id)))
                    }
                  />
                  {p.label}
                </label>
              ))}
            </div>
          </div>

          <div className="flex gap-2">
            <Input
              className="h-8 text-xs flex-1"
              placeholder="Termo personalizado (nome, endereço...)"
              value={customTerm}
              onChange={(e) => setCustomTerm(e.target.value)}
            />
            <Button size="sm" variant="outline" className="text-xs gap-1" onClick={handleScan}>
              <Scan className="h-3 w-3" />
              Regex
            </Button>
            <Button size="sm" variant="outline" className="text-xs gap-1" onClick={handleAIScan} disabled={aiScanning}>
              {aiScanning ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 text-primary" />}
              IA
            </Button>
          </div>

          {scanned && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">
                  {matches.length} ocorrências encontradas
                  {aiMatchCount > 0 && (
                    <span className="text-primary ml-1">({aiMatchCount} via IA)</span>
                  )}
                </span>
                <Button variant="ghost" size="sm" className="text-[10px] gap-1 h-6" onClick={() => setRevealAll(!revealAll)}>
                  {revealAll ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  {revealAll ? "Ocultar" : "Revelar"}
                </Button>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-1 border border-border rounded p-2">
                {matches.length === 0 && <p className="text-[10px] text-muted-foreground">Nenhum dado sensível encontrado.</p>}
                {matches.map((m, i) => (
                  <label key={i} className="flex items-center gap-2 text-xs py-0.5">
                    <Checkbox checked={m.redacted} onCheckedChange={() => toggleMatch(i)} />
                    <span className={`text-[10px] uppercase ${m.patternId.endsWith("_ia") ? "text-primary font-medium" : "text-muted-foreground"}`}>
                      {m.patternId.replace("_ia", " 🤖")}
                    </span>
                    <code className="text-xs bg-secondary px-1 rounded">
                      {revealAll ? m.text : "█".repeat(Math.min(m.text.length, 12))}
                    </code>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button size="sm" className="text-xs gap-1" onClick={handleApply} disabled={redactedCount === 0}>
            <ShieldAlert className="h-3 w-3" />
            Aplicar Redação ({redactedCount})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
