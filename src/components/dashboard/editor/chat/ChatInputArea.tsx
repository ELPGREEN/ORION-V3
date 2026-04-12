import { useState, useRef, useEffect, useCallback } from "react";
import { Send, FileUp } from "lucide-react";
import { Button } from "@/components/ui/button";
// [REMOVED] import { VoiceInputButton } from "@/components/dashboard/VoiceInputButton";
import { ChatFileUpload } from "@/components/dashboard/ChatFileUpload";

interface ChatInputAreaProps {
  onSendMessage: (msg: string) => void;
  onFileExtracted: (text: string, fileName: string, html?: string) => void;
  onInsertInDocument?: (text: string) => void;
  onSave?: () => void;
  loading: boolean;
  selectedText?: string;
  lastAssistantText: string;
}

export function ChatInputArea({
  onSendMessage,
  onFileExtracted,
  onInsertInDocument,
  onSave,
  loading,
  selectedText,
  lastAssistantText,
}: ChatInputAreaProps) {
  const [input, setInput] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const dragCountRef = useRef(0);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  const mergeInputTranscript = useCallback((current: string, next: string) => {
    const a = current.replace(/\s+/g, " ").trim();
    const b = next.replace(/\s+/g, " ").trim();

    if (!a) return b;
    if (!b) return a;
    if (a === b || a.endsWith(b)) return a;
    if (b.startsWith(a)) return b;

    const aWords = a.split(" ");
    const bWords = b.split(" ");
    const maxOverlap = Math.min(aWords.length, bWords.length);

    for (let overlap = maxOverlap; overlap > 0; overlap--) {
      const aTail = aWords.slice(-overlap).join(" ");
      const bHead = bWords.slice(0, overlap).join(" ");
      if (aTail === bHead) {
        return `${a} ${bWords.slice(overlap).join(" ")}`.trim();
      }
    }

    return `${a} ${b}`.trim();
  }, []);

  const handleSend = useCallback(() => {
    if (!input.trim() || loading) return;
    onSendMessage(input);
    setInput("");
  }, [input, loading, onSendMessage]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCountRef.current++;
    if (e.dataTransfer.types.includes("Files")) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCountRef.current--;
    if (dragCountRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    dragCountRef.current = 0;
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    const hiddenInput = document.querySelector<HTMLInputElement>('input[data-chat-file-upload]');
    if (hiddenInput) {
      hiddenInput.files = dataTransfer.files;
      hiddenInput.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }, []);

  return (
    <div
      className="p-2 sm:p-3 border-t border-border bg-muted/30 relative"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {isDragging && (
        <div className="absolute inset-0 z-20 bg-primary/10 border-2 border-dashed border-primary/50 rounded-lg flex items-center justify-center pointer-events-none">
          <div className="flex items-center gap-2 text-primary text-xs font-medium">
            <FileUp className="h-5 w-5" />
            Solte o arquivo aqui
          </div>
        </div>
      )}

      <div className="flex gap-2 items-end">
        
        <ChatFileUpload
          compact
          onTextExtracted={onFileExtracted}
          onInsertInDocument={onInsertInDocument}
          onSave={onSave}
          disabled={loading}
        />
        <textarea
          ref={inputRef}
          className="flex-1 resize-none min-h-[40px] max-h-[120px] px-3 py-2.5 text-xs rounded border border-border bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50"
          placeholder={selectedText ? "O que deseja fazer com a seleção?" : "Peça uma edição, pesquisa ou análise..."}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          rows={1}
        />
        <Button
          size="icon"
          className="h-9 w-9 shrink-0 btn-gold"
          onClick={handleSend}
          disabled={!input.trim() || loading}
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
      <span className="text-[9px] text-muted-foreground/40 mt-1 block">
        ✏️ Todas as mensagens editam o documento · Shift+Enter para quebra de linha
      </span>
    </div>
  );
}
