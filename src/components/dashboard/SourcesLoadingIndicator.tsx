import { useState, useEffect } from "react";
import { Loader2, CheckCircle2, Database } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SourceStatus {
  id: string;
  label: string;
  status: "pending" | "searching" | "done" | "error";
}

interface SourcesLoadingIndicatorProps {
  /** Array of source labels actively being searched */
  activeSources: string[];
  /** Compact mode for sidebar chat */
  compact?: boolean;
}

const SOURCE_LABELS: Record<string, string> = {
  neural_knowledge: "Knowledge Base",
  neural_embeddings: "Embeddings",
  txt_biblioteca: "Biblioteca",
  stf: "STF",
  datajud_stj: "DataJud STJ",
  datajud_tst: "DataJud TST",
  datajud_tse: "DataJud TSE",
  datajud_trf4: "TRF4",
  datajud_tjrs: "TJRS",
  datajud_tjsp: "TJSP",
  datajud_tjrj: "TJRJ",
  datajud_tjmg: "TJMG",
  cnj: "CNJ",
  lexml: "LexML",
  senado_legislacao: "Senado",
  catalogo_leis: "Catálogo Leis",
  camara: "Câmara",
  freelaw: "FreeLaw",
  courtlistener_dockets: "CourtListener",
  google_books: "Google Books",
  knowledge_graph: "Knowledge Graph",
  brasilapi: "BrasilAPI",
  neural_search: "Rede Neural",
  chat_juridico: "Chat Jurídico",
  aprimorar: "Aprimorar Doc",
  pesquisa_unificada: "Pesquisa Unificada",
};

export function SourcesLoadingIndicator({ activeSources, compact = false }: SourcesLoadingIndicatorProps) {
  const [completedSources, setCompletedSources] = useState<Set<string>>(new Set());

  // Simulate progressive completion for visual feedback
  useEffect(() => {
    if (activeSources.length === 0) {
      setCompletedSources(new Set());
      return;
    }
    setCompletedSources(new Set());
    
    const timers: NodeJS.Timeout[] = [];
    activeSources.forEach((src, i) => {
      const delay = 800 + Math.random() * 2000 + i * 400;
      const t = setTimeout(() => {
        setCompletedSources(prev => new Set([...prev, src]));
      }, delay);
      timers.push(t);
    });

    return () => timers.forEach(clearTimeout);
  }, [activeSources.join(",")]);

  if (activeSources.length === 0) return null;

  const getLabel = (id: string) => SOURCE_LABELS[id] || id;
  const doneCount = completedSources.size;
  const total = activeSources.length;

  if (compact) {
    return (
      <div className="flex gap-2 items-start">
        <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
          <Database className="h-3 w-3 text-primary" />
        </div>
        <div className="bg-secondary rounded-lg px-3 py-2 text-xs space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin text-primary shrink-0" />
            <span>Consultando {total} fonte{total > 1 ? "s" : ""}...</span>
          </div>
          <div className="flex flex-wrap gap-1">
            <AnimatePresence mode="popLayout">
              {activeSources.map((src) => {
                const isDone = completedSources.has(src);
                return (
                  <motion.span
                    key={src}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`inline-flex items-center gap-0.5 text-[8px] px-1.5 py-0.5 rounded border transition-all duration-300 ${
                      isDone
                        ? "border-primary/30 bg-primary/10 text-primary"
                        : "border-border bg-muted/50 text-muted-foreground animate-pulse"
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="h-2 w-2 shrink-0" />
                    ) : (
                      <Loader2 className="h-2 w-2 animate-spin shrink-0" />
                    )}
                    {getLabel(src)}
                  </motion.span>
                );
              })}
            </AnimatePresence>
          </div>
          {/* Progress bar */}
          <div className="h-0.5 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full bg-primary rounded-full"
              initial={{ width: "5%" }}
              animate={{ width: `${Math.max(5, (doneCount / total) * 100)}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>
    );
  }

  // Full-size version for ChatIAAdvogado
  return (
    <div className="flex gap-3">
      <div className="h-8 w-8 bg-primary/10 border border-primary/30 flex items-center justify-center flex-shrink-0">
        <Database className="h-4 w-4 text-primary" />
      </div>
      <div className="bg-background border border-border px-5 py-4 flex-1 space-y-2">
        <div className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">
            Consultando {total} fonte{total > 1 ? "s" : ""} jurídica{total > 1 ? "s" : ""}...
          </span>
          <span className="text-[10px] text-primary ml-auto">{doneCount}/{total}</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <AnimatePresence mode="popLayout">
            {activeSources.map((src) => {
              const isDone = completedSources.has(src);
              return (
                <motion.span
                  key={src}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 border transition-all duration-300 ${
                    isDone
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border bg-muted/30 text-muted-foreground animate-pulse"
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />
                  ) : (
                    <Loader2 className="h-2.5 w-2.5 animate-spin shrink-0" />
                  )}
                  {getLabel(src)}
                </motion.span>
              );
            })}
          </AnimatePresence>
        </div>
        {/* Progress bar */}
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full bg-primary rounded-full"
            initial={{ width: "5%" }}
            animate={{ width: `${Math.max(5, (doneCount / total) * 100)}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
    </div>
  );
}
