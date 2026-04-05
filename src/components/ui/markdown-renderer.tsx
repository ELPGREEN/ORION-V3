import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={cn("prose prose-sm max-w-none dark:prose-invert", className)}>
      <ReactMarkdown>{content}</ReactMarkdown>
    </div>
  );
}
