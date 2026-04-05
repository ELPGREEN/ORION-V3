// ─── Collaborative Editor Types ───

export interface CommentReply {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
}

export interface Comment {
  id: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  replies: CommentReply[];
  /** Text range in editor the comment is attached to */
  from: number;
  to: number;
  quotedText?: string;
}

export interface Suggestion {
  id: string;
  authorId: string;
  authorName: string;
  type: "insert" | "delete" | "replace" | "simplify";
  originalText: string;
  suggestedText: string;
  createdAt: string;
  status: "pending" | "accepted" | "rejected";
  from: number;
  to: number;
}

export interface ActivityEvent {
  id: string;
  type: "edit" | "comment" | "suggestion" | "resolve" | "accept" | "reject";
  authorName: string;
  description: string;
  timestamp: string;
  metadata?: Record<string, unknown>;
}

export interface CollaborationSettings {
  showComments: boolean;
  showSuggestions: boolean;
  anonymousMode: boolean;
  autoResolveOnAccept: boolean;
}
