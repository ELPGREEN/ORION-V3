import React, { useState, useEffect } from "react";
import { MessageCircle, Globe, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { OrionPlaylistBar } from "../OrionPlaylistBar";
import { OrionResearchBrowser } from "../OrionResearchBrowser";
import { OrionEmbeddedVideo } from "../OrionEmbeddedVideo";

interface OrionStandalonePanelProps {
  chatHistory: Array<{ role: string; text: string; time: string; confidence?: number }>;
  isProcessing: boolean;
  askInput: string;
  setAskInput: (v: string) => void;
  askAI: (q: string, source?: unknown) => void;
}

export function OrionStandaloneChat({
  chatHistory,
  isProcessing,
  askInput,
  setAskInput,
  askAI,
}: OrionStandalonePanelProps) {
  const [activeTab, setActiveTab] = useState<"chat" | "pesquisa" | "video">("chat");

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.action === "play_video" || detail?.action === "search_video") {
        window.dispatchEvent(new CustomEvent("orion-embedded-video", { detail }));
        setActiveTab("video");
      }
    };
    window.addEventListener("orion-video-command", handler);
    return () => window.removeEventListener("orion-video-command", handler);
  }, []);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.query) {
        setActiveTab("pesquisa");
      }
    };
    window.addEventListener("orion-research-navigate", handler);
    return () => window.removeEventListener("orion-research-navigate", handler);
  }, []);

  const tabs = [
    { id: "chat" as const, label: "Chat", icon: MessageCircle },
    { id: "pesquisa" as const, label: "Pesquisa", icon: Globe },
    { id: "video" as const, label: "Vídeo", icon: PlayCircle },
  ];

  return (
    <div className="relative rounded-lg overflow-hidden" style={{
      backgroundColor: "rgba(10,10,15,0.7)",
      border: "1px solid rgba(212,175,55,0.12)",
    }}>
      <div className="flex border-b border-white/[0.06]">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-[9px] font-mono uppercase tracking-wider transition-colors ${
              activeTab === tab.id
                ? "text-[hsl(var(--tron-neon))] border-b-2 border-cyan-400/50 bg-cyan-400/[0.03]"
                : "text-white/25 hover:text-white/40 hover:bg-white/[0.02]"
            }`}
          >
            <tab.icon className="h-3 w-3" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "chat" && (
        <div className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <MessageCircle className="h-3.5 w-3.5 text-[hsl(var(--tron-neon))]" />
            <span className="text-[10px] font-mono text-[hsl(var(--tron-neon))] [text-shadow:0_0_8px_hsl(var(--tron-neon)/0.4)]/80 tracking-wider uppercase">Chat com Orion</span>
            {isProcessing && <span className="ml-auto text-[8px] font-mono text-amber-400 animate-pulse">processando...</span>}
          </div>
          <div className="space-y-1.5 max-h-[200px] overflow-y-auto mb-2">
            {chatHistory.length === 0 && (
              <div className="text-center py-4 space-y-3">
                <p className="text-[10px] font-mono text-white/30">Olá! Pergunte algo ao Orion</p>
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {["Quem é você?", "O que pode fazer?", "Agenda de hoje"].map(q => (
                    <button key={q} onClick={() => askAI(q)}
                      className="text-[9px] font-mono text-[hsl(var(--tron-neon))] [text-shadow:0_0_8px_hsl(var(--tron-neon)/0.4)]/40 border border-cyan-500/15 rounded px-2 py-1 hover:bg-cyan-400/5 hover:text-[hsl(var(--tron-neon))]/70 transition-colors">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {chatHistory.map((msg, i) => (
              <div key={i} className={`flex gap-1.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-lg px-2.5 py-1.5 ${
                  msg.role === "user" ? "bg-cyan-500/10 border border-cyan-500/15"
                  : msg.role === "system" ? "bg-amber-500/5 border border-amber-500/10"
                  : "bg-white/[0.03] border border-white/[0.06]"
                }`}>
                  <div className="flex items-start gap-1.5">
                    <p className={`text-[10px] font-mono leading-relaxed flex-1 ${
                      msg.role === "user" ? "text-[hsl(var(--tron-neon))]/70" : msg.role === "system" ? "text-amber-300/50" : "text-white/60"
                    }`}>{msg.text}</p>
                    {msg.role === "ai" && msg.confidence != null && (
                      <span className={`text-[7px] font-mono shrink-0 px-1 py-0.5 rounded ${
                        msg.confidence >= 0.7 ? "text-[hsl(var(--tron-neon))]/80 bg-emerald-400/10"
                        : msg.confidence >= 0.4 ? "text-amber-400/80 bg-amber-400/10"
                        : "text-[hsl(var(--tron-danger))]/80 bg-red-400/10"
                      }`}>{(msg.confidence * 100).toFixed(0)}%</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isProcessing && (
              <div className="flex gap-1">
                <div className="bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-2">
                  <div className="flex gap-1">
                    {[0, 150, 300].map(d => (
                      <div key={d} className="h-1.5 w-1.5 rounded-full bg-cyan-400/40 animate-bounce" style={{ animationDelay: `${d}ms` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          <form className="flex gap-2" onSubmit={(e) => {
            e.preventDefault();
            if (askInput.trim() && !isProcessing) { askAI(askInput.trim()); setAskInput(""); }
          }}>
            <input type="text" value={askInput} onChange={(e) => setAskInput(e.target.value)}
              placeholder="Pergunte ao Orion..."
              disabled={isProcessing}
              className="flex-1 text-[11px] font-mono bg-transparent border border-cyan-500/20 rounded-lg px-3 py-2 text-white/70 placeholder:text-white/20 focus:outline-none focus:border-cyan-400/40 disabled:opacity-30" />
            <Button type="submit" size="sm" variant="ghost" className="h-9 px-3 text-[hsl(var(--tron-neon))]/60 hover:text-[hsl(var(--tron-neon))]" disabled={isProcessing || !askInput.trim()}>
              <MessageCircle className="h-4 w-4" />
            </Button>
          </form>
          <div className="border-t border-white/[0.06] mt-2">
            <OrionPlaylistBar />
          </div>
        </div>
      )}

      {activeTab === "pesquisa" && (
        <div className="h-[350px] flex flex-col">
          <OrionResearchBrowser onSearchQuery={(q) => askAI(`pesquisar na web ${q}`)} />
          <div className="border-t border-white/[0.06]">
            <OrionPlaylistBar />
          </div>
        </div>
      )}

      {activeTab === "video" && (
        <div className="p-2">
          <OrionEmbeddedVideo onClose={() => setActiveTab("chat")} />
        </div>
      )}
    </div>
  );
}
