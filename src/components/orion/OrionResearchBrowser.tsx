/**
 * OrionResearchBrowser — Mini navegador integrado dentro do painel Orion
 * Simula um browser com iframe do Google Search, barra de URL, e controles de navegação
 */
import { useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Search, ArrowLeft, ArrowRight, RotateCcw, ExternalLink, Globe } from "lucide-react";

interface OrionResearchBrowserProps {
  onSearchQuery?: (query: string) => void;
  initialQuery?: string;
}

export function OrionResearchBrowser({ onSearchQuery, initialQuery = "" }: OrionResearchBrowserProps) {
  const [url, setUrl] = useState(initialQuery ? buildSearchUrl(initialQuery) : "");
  const [inputValue, setInputValue] = useState(initialQuery);
  const [history, setHistory] = useState<string[]>(initialQuery ? [buildSearchUrl(initialQuery)] : []);
  const [historyIndex, setHistoryIndex] = useState(initialQuery ? 0 : -1);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const navigate = useCallback((newUrl: string) => {
    setUrl(newUrl);
    setHistory(prev => {
      const trimmed = prev.slice(0, historyIndex + 1);
      return [...trimmed, newUrl];
    });
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const handleSearch = useCallback((e?: React.FormEvent) => {
    e?.preventDefault();
    const q = inputValue.trim();
    if (!q) return;
    const searchUrl = buildSearchUrl(q);
    navigate(searchUrl);
    onSearchQuery?.(q);
  }, [inputValue, navigate, onSearchQuery]);

  const goBack = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setUrl(history[historyIndex - 1]);
    }
  }, [historyIndex, history]);

  const goForward = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setUrl(history[historyIndex + 1]);
    }
  }, [historyIndex, history]);

  const refresh = useCallback(() => {
    if (iframeRef.current && url) {
      iframeRef.current.src = url;
    }
  }, [url]);

  // Quick research buttons
  const quickSearches = [
    { label: "📚 Google Scholar", prefix: "https://scholar.google.com/scholar?q=" },
    { label: "🔬 PubMed", prefix: "https://pubmed.ncbi.nlm.nih.gov/?term=" },
    { label: "📰 Notícias", prefix: "https://www.google.com/search?tbm=nws&q=" },
  ];

  return (
    <div className="flex flex-col h-full rounded-lg overflow-hidden" style={{
      backgroundColor: "rgba(10,10,15,0.85)",
      border: "1px solid rgba(212,175,55,0.15)",
    }}>
      {/* Navigation bar */}
      <div className="flex items-center gap-1.5 px-2 py-1.5 border-b border-white/[0.06]"
        style={{ background: "linear-gradient(135deg, rgba(212,175,55,0.05), rgba(59,130,246,0.03))" }}>
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={goBack} disabled={historyIndex <= 0}>
          <ArrowLeft className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={goForward} disabled={historyIndex >= history.length - 1}>
          <ArrowRight className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={refresh} disabled={!url}>
          <RotateCcw className="h-3 w-3" />
        </Button>

        <form className="flex-1 flex gap-1" onSubmit={handleSearch}>
          <div className="relative flex-1">
            <Globe className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-white/20" />
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Pesquisar na web..."
              className="w-full text-[10px] font-mono bg-black/40 border border-white/10 rounded pl-7 pr-2 py-1.5 text-white/70 placeholder:text-white/20 focus:outline-none focus:border-cyan-400/40"
            />
          </div>
          <Button type="submit" size="icon" variant="ghost" className="h-7 w-7 shrink-0 text-cyan-400/60 hover:text-cyan-400">
            <Search className="h-3 w-3" />
          </Button>
        </form>

        {url && (
          <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => window.open(url, "_blank")} title="Abrir em nova aba">
            <ExternalLink className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Quick search buttons */}
      {!url && (
        <div className="px-3 py-3 space-y-3">
          <div className="text-center">
            <div className="h-12 w-12 mx-auto rounded-full bg-gradient-to-br from-cyan-500/10 to-amber-500/10 border border-cyan-500/20 flex items-center justify-center mb-2">
              <Search className="h-5 w-5 text-cyan-400/50" />
            </div>
            <p className="text-[10px] font-mono text-white/30 mb-3">Navegador de Pesquisa Orion</p>
          </div>

          <div className="flex flex-wrap gap-1.5 justify-center">
            {quickSearches.map(qs => (
              <button key={qs.label} onClick={() => {
                if (inputValue.trim()) {
                  const searchUrl = qs.prefix + encodeURIComponent(inputValue.trim());
                  navigate(searchUrl);
                }
              }}
                className="text-[8px] font-mono text-cyan-400/50 border border-cyan-500/15 rounded px-2 py-1 hover:bg-cyan-400/5 hover:text-cyan-400/80 transition-colors">
                {qs.label}
              </button>
            ))}
          </div>

          <div className="border-t border-white/5 pt-2">
            <p className="text-[8px] font-mono text-white/15 mb-1.5 text-center uppercase tracking-wider">Pesquisas Rápidas</p>
            <div className="flex flex-wrap gap-1.5 justify-center">
              {["Jurisprudência recente", "Notícias tecnologia", "Papers IA", "Legislação brasileira"].map(q => (
                <button key={q} onClick={() => { setInputValue(q); }}
                  className="text-[8px] font-mono text-amber-400/40 border border-amber-500/15 rounded px-2 py-1 hover:bg-amber-400/5 hover:text-amber-400/70 transition-colors">
                  {q}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Iframe browser */}
      {url && (
        <div className="flex-1 relative">
          <iframe
            ref={iframeRef}
            src={url}
            className="absolute inset-0 w-full h-full bg-white"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
            title="Orion Research Browser"
          />
          {/* Holographic edge overlay */}
          <div className="absolute inset-0 pointer-events-none rounded-b-lg"
            style={{ boxShadow: "inset 0 0 20px rgba(212,175,55,0.03), inset 0 0 40px rgba(59,130,246,0.02)" }} />
        </div>
      )}
    </div>
  );
}

function buildSearchUrl(query: string): string {
  return `https://www.google.com/search?igu=1&q=${encodeURIComponent(query)}`;
}
