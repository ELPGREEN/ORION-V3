import { useState, useCallback } from "react";
import { BookOpen, Loader2, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { fetchDicionario } from "@/lib/api";

interface DicionarioPopoverProps {
  selectedText?: string;
}

interface DictEntry {
  word: string;
  phonetic?: string;
  meanings: {
    partOfSpeech: string;
    definitions: { definition: string; example?: string; synonyms?: string[] }[];
    synonyms?: string[];
  }[];
}

export function DicionarioPopover({ selectedText }: DicionarioPopoverProps) {
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState(selectedText || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DictEntry | null>(null);
  const [error, setError] = useState("");

  const buscar = useCallback(async (w?: string) => {
    const termo = (w || word).trim();
    if (!termo) return;
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await fetchDicionario(termo);
      if (Array.isArray(data) && data.length > 0) {
        setResult(data[0] as DictEntry);
      } else {
        setError("Palavra não encontrada.");
      }
    } catch {
      setError("Palavra não encontrada no dicionário.");
    }
    setLoading(false);
  }, [word]);

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && selectedText) {
      setWord(selectedText);
      buscar(selectedText);
    }
  };

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-[11px] text-muted-foreground hover:text-primary hover:bg-muted/50"
          title="Dicionário"
        >
          <BookOpen className="h-3 w-3 mr-1" />
          Dicionário
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 max-h-96 overflow-y-auto" align="start">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Input
              value={word}
              onChange={(e) => setWord(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && buscar()}
              placeholder="Digite uma palavra..."
              className="h-8 text-xs flex-1"
            />
            <Button size="sm" className="h-8 text-xs" onClick={() => buscar()} disabled={loading}>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Buscar"}
            </Button>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          {result && (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-serif font-bold text-foreground">{result.word}</p>
                {result.phonetic && <p className="text-xs text-muted-foreground">{result.phonetic}</p>}
              </div>

              {result.meanings.map((m, i) => (
                <div key={i} className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-primary font-medium">{m.partOfSpeech}</p>
                  {m.definitions.slice(0, 3).map((d, j) => (
                    <div key={j} className="pl-2 border-l-2 border-primary/20">
                      <p className="text-xs text-foreground">{d.definition}</p>
                      {d.example && <p className="text-[10px] text-muted-foreground italic mt-0.5">"{d.example}"</p>}
                    </div>
                  ))}
                  {m.synonyms && m.synonyms.length > 0 && (
                    <p className="text-[10px] text-muted-foreground">
                      <span className="font-medium">Sinônimos:</span> {m.synonyms.slice(0, 5).join(", ")}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}

          {!result && !error && !loading && (
            <p className="text-xs text-muted-foreground text-center py-4">
              Selecione uma palavra no texto ou digite acima para buscar definições e sinônimos.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
