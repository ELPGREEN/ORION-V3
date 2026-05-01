/**
 * Orion Standalone Panel — extracted from NeuralVision.tsx (lines 1514-1607)
 * Contains: Chat/Pesquisa/Vídeo tabs for when camera is OFF
 */

import { useState } from "react";
import { MessageCircle, Globe, PlayCircle } from "lucide-react";
import { ChatIARouter } from "@/pages/dashboard/ChatIARouter";
import { OrionResearchBrowser } from "@/components/orion/OrionResearchBrowser";
import { OrionEmbeddedVideo } from "@/components/orion/OrionEmbeddedVideo";

export interface OrionStandalonePanelProps {
  chatHistory: Array<{ role: string; text: string; time: string; confidence?: number }>;
  isProcessing: boolean;
  askInput: string;
  setAskInput: (v: string) => void;
  askAI: (q: string, source?: any) => void;
}

export function OrionStandalonePanel({
  chatHistory,
  isProcessing,
  askInput,
  setAskInput,
  askAI,
}: OrionStandalonePanelProps) {
  const [activeTab, setActiveTab] = useState<"chat" | "pesquisa" | "video">("chat");

  // Listen for video commands to auto-switch to video tab
  useState(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.action === "play_video" || detail?.action === "search_video") {
        // Re-dispatch as embedded event
        window.dispatchEvent(new CustomEvent("orion-embedded-video", { detail }));
        setActiveTab("video");
      }
    };
    window.addEventListener("orion-video-command", handler);
    return () => window.removeEventListener("orion-video-command", handler);
  });

  // Listen for search commands to auto-switch to pesquisa tab
  useState(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.query) {
        setActiveTab("pesquisa");
      }
    };
    window.addEventListener("orion-research-navigate", handler);
    return () => window.removeEventListener("orion-research-navigate", handler);
  });

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
      {/* Tab bar */}
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

      {/* Chat tab — clone do Orion IA Consultoria (mesmo cérebro, mesma RAG, histórico compartilhado) */}
      {activeTab === "chat" && (
        <div className="h-[480px] overflow-hidden rounded-lg border border-cyan-500/15 bg-black/20">
          <ChatIARouter />
        </div>
      )}

      {activeTab === "pesquisa" && (
        <div className="h-[350px] flex flex-col">
          <OrionResearchBrowser onSearchQuery={(q) => askAI(`pesquisar na web ${q}`)} />
        </div>
      )}

      {/* Vídeo tab */}
      {activeTab === "video" && (
        <div className="h-[350px] flex flex-col">
          <OrionEmbeddedVideo />
        </div>
      )}
    </div>
  );
}
