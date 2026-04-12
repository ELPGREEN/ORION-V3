import { useState } from "react";
import { usePrivateKnowledge } from "@/hooks/usePrivateKnowledge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Shield, Plus, Trash2, Lock, RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export function PrivateKnowledge() {
  const { entries, loading, error, addEntry, deleteEntry, deleteAll, refresh } = usePrivateKnowledge();
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);

  const handleAdd = async () => {
    if (!title.trim() || !content.trim()) {
      toast.error("Título e conteúdo são obrigatórios");
      return;
    }

    setSaving(true);
    const tagList = tags.split(",").map((t) => t.trim()).filter(Boolean);
    const id = await addEntry(title.trim(), content.trim(), tagList);

    if (id) {
      toast.success("Conhecimento salvo com criptografia AES-256-GCM");
      setTitle("");
      setContent("");
      setTags("");
      setShowForm(false);
    } else {
      toast.error("Erro ao salvar");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await deleteEntry(id);
    toast.success("Entrada removida");
  };

  const handleDeleteAll = async () => {
    if (!confirm("Deletar TODOS os dados privados? Esta ação é irreversível (LGPD).")) return;
    await deleteAll();
    toast.success("Todos os dados privados foram deletados");
  };

  return (
    <div className="space-y-4">
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-primary" />
              Base de Conhecimento Privada
              <Lock className="h-3 w-3 text-muted-foreground" />
            </div>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={refresh} disabled={loading}>
                <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowForm(!showForm)}>
                <Plus className="h-4 w-4 mr-1" />
                Adicionar
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-4">
            🔐 Criptografia AES-256-GCM end-to-end. Apenas você pode ler seus dados. Compatível com LGPD.
          </p>

          {showForm && (
            <div className="space-y-3 p-4 border border-border rounded-lg mb-4 bg-muted/30">
              <Input
                placeholder="Título do conhecimento"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <Textarea
                placeholder="Conteúdo (será criptografado)"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
              />
              <Input
                placeholder="Tags (separadas por vírgula)"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
              />
              <div className="flex gap-2">
                <Button onClick={handleAdd} disabled={saving} size="sm">
                  {saving ? "Criptografando..." : "Salvar"}
                </Button>
                <Button variant="ghost" onClick={() => setShowForm(false)} size="sm">
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-sm text-destructive p-3 bg-destructive/10 rounded-lg mb-4">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          )}

          {entries.length === 0 && !loading ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              Nenhum conhecimento privado. Adicione dados que só você terá acesso.
            </p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="p-3 border border-border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm">{entry.title}</h4>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {entry.content}
                      </p>
                      {entry.tags.length > 0 && (
                        <div className="flex gap-1 mt-2 flex-wrap">
                          {entry.tags.map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-[10px]">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(entry.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {entries.length > 0 && (
            <div className="mt-4 pt-4 border-t border-border">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDeleteAll}
                className="w-full"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Deletar Todos os Dados (LGPD)
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
