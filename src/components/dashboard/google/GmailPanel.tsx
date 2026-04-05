import { useState, useEffect } from "react";
import {
  Mail,
  Inbox,
  Send,
  Loader2,
  RefreshCw,
  Trash2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  googleGmailProfile,
  googleGmailList,
  googleGmailGet,
  googleGmailSend,
  googleGmailTrash,
} from "@/lib/google-server";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface GmailMessage {
  id: string;
  snippet: string;
  payload?: {
    headers?: Array<{ name: string; value: string }>;
    body?: { data?: string };
    parts?: Array<{ mimeType: string; body?: { data?: string } }>;
  };
  labelIds?: string[];
  internalDate?: string;
}

interface MessageSummary {
  id: string;
  subject: string;
  from: string;
  date: string;
  snippet: string;
  body?: string;
  isUnread: boolean;
}

export function GmailPanel() {
  const [messages, setMessages] = useState<MessageSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [compose, setCompose] = useState({ to: "", subject: "", body: "" });
  const [profile, setProfile] = useState<{ emailAddress: string } | null>(null);
  const { toast } = useToast();

  const decodeBase64Url = (str: string) => {
    try {
      const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
      return decodeURIComponent(
        atob(base64)
          .split("")
          .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
          .join("")
      );
    } catch {
      return "";
    }
  };

  const getHeader = (msg: GmailMessage, name: string) =>
    msg.payload?.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value || "";

  const getBody = (msg: GmailMessage) => {
    if (msg.payload?.body?.data) return decodeBase64Url(msg.payload.body.data);
    const textPart = msg.payload?.parts?.find((p) => p.mimeType === "text/plain");
    if (textPart?.body?.data) return decodeBase64Url(textPart.body.data);
    return "";
  };

  const loadMessages = async () => {
    setLoading(true);
    try {
      const [profileData, listData] = await Promise.all([
        googleGmailProfile(),
        googleGmailList(15),
      ]);

      setProfile(profileData);

      if (!listData.messages?.length) {
        setMessages([]);
        return;
      }

      const details: MessageSummary[] = [];
      for (const msg of listData.messages.slice(0, 15)) {
        try {
          const full = await googleGmailGet(msg.id);
          details.push({
            id: full.id,
            subject: getHeader(full, "Subject") || "(Sem assunto)",
            from: getHeader(full, "From"),
            date: getHeader(full, "Date"),
            snippet: full.snippet || "",
            body: getBody(full),
            isUnread: full.labelIds?.includes("UNREAD") || false,
          });
        } catch {
          // Skip failed messages
        }
      }

      setMessages(details);
    } catch (err: any) {
      toast({
        title: "Erro ao carregar e-mails",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMessages();
  }, []);

  const handleSend = async () => {
    if (!compose.to || !compose.subject) {
      toast({ title: "Preencha destinatário e assunto", variant: "destructive" });
      return;
    }
    setSending(true);
    try {
      await googleGmailSend(compose.to, compose.subject, compose.body);
      toast({ title: "E-mail enviado com sucesso!" });
      setCompose({ to: "", subject: "", body: "" });
      setComposeOpen(false);
      loadMessages();
    } catch (err: any) {
      toast({ title: "Erro ao enviar e-mail", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const handleTrash = async (messageId: string) => {
    try {
      await googleGmailTrash(messageId);
      toast({ title: "E-mail movido para lixeira" });
      setMessages((prev) => prev.filter((m) => m.id !== messageId));
    } catch (err: any) {
      toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Actions Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Inbox className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-medium text-foreground">Caixa de Entrada</h3>
          {profile && (
            <Badge variant="outline" className="text-[10px]">
              {profile.emailAddress}
            </Badge>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={loadMessages} disabled={loading}>
            <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? "animate-spin" : ""}`} />
            Atualizar
          </Button>

          <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="btn-gold">
                <Send className="h-3.5 w-3.5 mr-1" />
                Novo E-mail
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Enviar E-mail</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Input
                  placeholder="Destinatário (e-mail)"
                  value={compose.to}
                  onChange={(e) => setCompose({ ...compose, to: e.target.value })}
                />
                <Input
                  placeholder="Assunto"
                  value={compose.subject}
                  onChange={(e) => setCompose({ ...compose, subject: e.target.value })}
                />
                <Textarea
                  placeholder="Conteúdo do e-mail..."
                  value={compose.body}
                  onChange={(e) => setCompose({ ...compose, body: e.target.value })}
                  rows={6}
                />
                <Button
                  className="w-full btn-gold"
                  onClick={handleSend}
                  disabled={sending}
                >
                  {sending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Enviar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
        </div>
      )}

      {/* Messages */}
      {!loading && messages.length === 0 && (
        <Card className="border-dashed border-2 border-primary/20">
          <CardContent className="p-8 text-center">
            <Mail className="h-10 w-10 text-primary/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Nenhum e-mail encontrado.</p>
          </CardContent>
        </Card>
      )}

      {!loading && messages.length > 0 && (
        <div className="space-y-2">
          {messages.map((msg) => (
            <Card
              key={msg.id}
              className={`transition-colors cursor-pointer ${
                msg.isUnread ? "border-primary/40 bg-primary/5" : ""
              }`}
            >
              <CardContent className="p-4">
                <div
                  className="flex items-start justify-between gap-3"
                  onClick={() => setExpandedId(expandedId === msg.id ? null : msg.id)}
                >
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      {msg.isUnread && (
                        <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                      <h4 className="text-sm font-medium text-foreground truncate">
                        {msg.subject}
                      </h4>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="truncate max-w-[200px]">{msg.from}</span>
                      <span>{formatDate(msg.date)}</span>
                    </div>
                    {expandedId !== msg.id && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {msg.snippet}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleTrash(msg.id);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    {expandedId === msg.id ? (
                      <ChevronUp className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                </div>

                {/* Expanded Body */}
                {expandedId === msg.id && msg.body && (
                  <div className="mt-4 p-3 bg-muted/30 rounded-md border border-border">
                    <pre className="text-xs text-foreground whitespace-pre-wrap font-sans leading-relaxed">
                      {msg.body}
                    </pre>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
