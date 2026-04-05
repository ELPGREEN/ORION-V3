import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, MessageCircle, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { googleChatSpaces, googleChatSend, googleChatMessages } from "@/lib/google-server";

interface Space { name: string; displayName: string; type?: string; }

export function GoogleChatPanel() {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [selectedSpace, setSelectedSpace] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => { loadSpaces(); }, []);

  async function loadSpaces() {
    setLoading(true);
    try {
      const data = await googleChatSpaces();
      setSpaces(data?.spaces || []);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  }

  async function loadMessages(spaceName: string) {
    setLoading(true);
    try {
      const data = await googleChatMessages(spaceName);
      setMessages(data?.messages || []);
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  }

  async function handleSend() {
    if (!newMessage.trim() || !selectedSpace) return;
    setLoading(true);
    try {
      await googleChatSend(selectedSpace, newMessage.trim());
      setNewMessage("");
      await loadMessages(selectedSpace);
      toast({ title: "Mensagem enviada!" });
    } catch (e: any) {
      toast({ title: "Erro", description: e.message, variant: "destructive" });
    } finally { setLoading(false); }
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <MessageCircle className="h-5 w-5 text-primary" />
          Google Chat
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          {spaces.map(s => (
            <Badge
              key={s.name}
              variant={selectedSpace === s.name ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => { setSelectedSpace(s.name); loadMessages(s.name); }}
            >
              {s.displayName || s.name}
            </Badge>
          ))}
          {spaces.length === 0 && !loading && (
            <p className="text-sm text-muted-foreground">Nenhum espaço encontrado</p>
          )}
        </div>

        {selectedSpace && (
          <>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {messages.map((m, i) => (
                <div key={i} className="p-2 rounded bg-muted/50 text-sm">
                  <p className="text-foreground">{m.text || m.formattedText || "—"}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {m.createTime ? new Date(m.createTime).toLocaleString("pt-BR") : ""}
                  </p>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Input
                placeholder="Mensagem..."
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleSend()}
              />
              <Button onClick={handleSend} disabled={loading || !newMessage.trim()} size="sm">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
