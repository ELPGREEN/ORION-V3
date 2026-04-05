import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Reply, Check, Trash2, Send } from "lucide-react";
import type { Comment } from "./types";

interface CommentsPanelProps {
  comments: Comment[];
  onResolve: (commentId: string) => void;
  onDelete: (commentId: string) => void;
  onReply: (commentId: string, content: string) => void;
  onClickComment?: (commentId: string) => void;
}

export function CommentsPanel({
  comments,
  onResolve,
  onDelete,
  onReply,
  onClickComment,
}: CommentsPanelProps) {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  const pending = comments.filter((c) => !c.resolved);
  const resolved = comments.filter((c) => c.resolved);

  const handleReply = (commentId: string) => {
    if (!replyText.trim()) return;
    onReply(commentId, replyText.trim());
    setReplyText("");
    setReplyingTo(null);
  };

  const renderComment = (comment: Comment) => (
    <div
      key={comment.id}
      className={`p-3 rounded-lg border transition-colors cursor-pointer ${
        comment.resolved
          ? "border-border/50 bg-muted/30 opacity-60"
          : "border-border bg-card hover:bg-accent/30"
      }`}
      onClick={() => onClickComment?.(comment.id)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-foreground truncate">
              {comment.authorName}
            </span>
            <span className="text-[10px] text-muted-foreground">
              {new Date(comment.createdAt).toLocaleDateString("pt-BR")}
            </span>
          </div>
          {comment.quotedText && (
            <div className="text-[10px] text-muted-foreground italic border-l-2 border-primary/40 pl-2 mb-1.5 line-clamp-2">
              "{comment.quotedText}"
            </div>
          )}
          <p className="text-xs text-foreground">{comment.content}</p>
        </div>
        <div className="flex items-center gap-0.5 shrink-0">
          {!comment.resolved && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-muted-foreground hover:text-green-500"
              onClick={(e) => { e.stopPropagation(); onResolve(comment.id); }}
              title="Resolver"
            >
              <Check className="h-3 w-3" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-destructive"
            onClick={(e) => { e.stopPropagation(); onDelete(comment.id); }}
            title="Excluir"
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Replies */}
      {comment.replies.length > 0 && (
        <div className="mt-2 space-y-1.5 pl-3 border-l border-border/50">
          {comment.replies.map((r) => (
            <div key={r.id} className="text-[11px]">
              <span className="font-medium text-foreground">{r.authorName}</span>
              <span className="text-muted-foreground ml-1">{r.content}</span>
            </div>
          ))}
        </div>
      )}

      {/* Reply input */}
      {!comment.resolved && (
        <div className="mt-2">
          {replyingTo === comment.id ? (
            <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
              <Textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Responder..."
                className="min-h-[32px] h-8 text-xs resize-none"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleReply(comment.id);
                  }
                }}
              />
              <Button
                size="icon"
                className="h-8 w-8 shrink-0"
                onClick={() => handleReply(comment.id)}
                disabled={!replyText.trim()}
              >
                <Send className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] text-muted-foreground"
              onClick={(e) => { e.stopPropagation(); setReplyingTo(comment.id); }}
            >
              <Reply className="h-3 w-3 mr-1" />Responder
            </Button>
          )}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <MessageSquare className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Comentários</span>
        {pending.length > 0 && (
          <Badge variant="secondary" className="text-[10px] h-5">{pending.length}</Badge>
        )}
      </div>
      <ScrollArea className="flex-1">
        <div className="p-3 space-y-2">
          {pending.length === 0 && resolved.length === 0 && (
            <div className="text-xs text-muted-foreground text-center py-8">
              Nenhum comentário ainda.
              <br />
              Selecione um texto e clique em "Comentar".
            </div>
          )}
          {pending.map(renderComment)}
          {resolved.length > 0 && (
            <>
              <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider pt-2">
                Resolvidos ({resolved.length})
              </div>
              {resolved.map(renderComment)}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
