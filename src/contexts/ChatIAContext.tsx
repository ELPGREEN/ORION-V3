import { useState, createContext, useContext, type ReactNode } from "react";
import { useChatIAPersistence, type ChatIAConversation, type ChatIAMessage } from "@/hooks/useChatIAPersistence";

interface ChatIAContextValue {
  conversations: ChatIAConversation[];
  activeConversationId: string | null;
  messages: ChatIAMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatIAMessage[]>>;
  loadingConversations: boolean;
  loadingMessages: boolean;
  createConversation: (title?: string) => Promise<string | null>;
  saveMessage: (conversationId: string, msg: Omit<ChatIAMessage, "id" | "timestamp">) => Promise<string | null>;
  deleteConversation: (id: string) => Promise<void>;
  switchConversation: (id: string) => void;
  loadConversations: () => Promise<void>;
}

const ChatIAContext = createContext<ChatIAContextValue | null>(null);

export function ChatIAProvider({ children }: { children: ReactNode }) {
  const persistence = useChatIAPersistence();
  return (
    <ChatIAContext.Provider value={persistence}>
      {children}
    </ChatIAContext.Provider>
  );
}

export function useChatIA() {
  const ctx = useContext(ChatIAContext);
  if (!ctx) {
    throw new Error("useChatIA must be used within a ChatIAProvider");
  }
  return ctx;
}
