import { X, FileText, Image, File } from "lucide-react";

export interface PendingFile {
  id: string;
  fileName: string;
  text: string;
  html?: string;
}

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  if (["png", "jpg", "jpeg", "gif", "webp", "bmp"].includes(ext)) return <Image className="h-3 w-3" />;
  if (["pdf", "docx", "doc", "txt", "rtf"].includes(ext)) return <FileText className="h-3 w-3" />;
  return <File className="h-3 w-3" />;
}

interface PendingAttachmentsProps {
  files: PendingFile[];
  onRemove: (id: string) => void;
}

export function PendingAttachments({ files, onRemove }: PendingAttachmentsProps) {
  if (files.length === 0) return null;

  return (
    <div className="px-3 py-1.5 border-b border-border/50 flex flex-wrap gap-1.5">
      {files.map((f) => (
        <div
          key={f.id}
          className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground border border-border/50 max-w-[160px]"
        >
          {getFileIcon(f.fileName)}
          <span className="truncate">{f.fileName}</span>
          <button
            onClick={() => onRemove(f.id)}
            className="ml-0.5 hover:text-destructive transition-colors shrink-0"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
