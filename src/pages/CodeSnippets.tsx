import { useState } from "react";
import { useCodeSnippets, useCreateSnippet, useDeleteSnippet } from "@/hooks/useCodeSnippets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2, Copy, Code2, Search, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const LANGUAGES = ["typescript", "javascript", "python", "rust", "go", "sql", "bash", "json", "yaml", "html", "css"];
const CATEGORIES = ["general", "api", "database", "frontend", "backend", "devops", "ai", "utils"];

const CodeSnippets = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [langFilter, setLangFilter] = useState<string>("");
  const [isOpen, setIsOpen] = useState(false);
  const [newSnippet, setNewSnippet] = useState({ title: "", code: "", language: "typescript", category: "general", description: "", is_public: false });

  const { data: snippets, isLoading } = useCodeSnippets({ search: search || undefined, language: langFilter || undefined });
  const createMutation = useCreateSnippet();
  const deleteMutation = useDeleteSnippet();

  const handleCreate = () => {
    if (!newSnippet.title || !newSnippet.code) { toast.error("Título e código são obrigatórios"); return; }
    createMutation.mutate(newSnippet, {
      onSuccess: () => { setIsOpen(false); setNewSnippet({ title: "", code: "", language: "typescript", category: "general", description: "", is_public: false }); },
    });
  };

  const copyCode = (code: string) => { navigator.clipboard.writeText(code); toast.success("Código copiado!"); };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="h-5 w-5" /></Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-2"><Code2 className="h-8 w-8 text-primary" /> Code Snippets</h1>
              <p className="text-muted-foreground">{snippets?.length || 0} snippets</p>
            </div>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Novo Snippet</Button></DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Novo Code Snippet</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Input placeholder="Título" value={newSnippet.title} onChange={(e) => setNewSnippet(p => ({ ...p, title: e.target.value }))} />
                <Input placeholder="Descrição" value={newSnippet.description} onChange={(e) => setNewSnippet(p => ({ ...p, description: e.target.value }))} />
                <div className="flex gap-2">
                  <Select value={newSnippet.language} onValueChange={(v) => setNewSnippet(p => ({ ...p, language: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{LANGUAGES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                  <Select value={newSnippet.category} onValueChange={(v) => setNewSnippet(p => ({ ...p, category: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <Textarea placeholder="Cole seu código aqui..." className="font-mono min-h-[200px] text-sm" value={newSnippet.code} onChange={(e) => setNewSnippet(p => ({ ...p, code: e.target.value }))} />
                <Button onClick={handleCreate} disabled={createMutation.isPending} className="w-full">{createMutation.isPending ? "Criando..." : "Criar Snippet"}</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar snippets..." className="pl-10" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={langFilter} onValueChange={setLangFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Linguagem" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              {LANGUAGES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">Carregando...</div>
        ) : !snippets?.length ? (
          <Card className="py-12 text-center"><CardContent><p className="text-muted-foreground">Nenhum snippet encontrado. Crie o primeiro!</p></CardContent></Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {snippets.map((s) => (
              <Card key={s.id} className="group hover:border-primary/50 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-base truncate">{s.title}</CardTitle>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyCode(s.code)}><Copy className="h-3.5 w-3.5" /></Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    <Badge variant="secondary" className="text-xs">{s.language}</Badge>
                    {s.category && <Badge variant="outline" className="text-xs">{s.category}</Badge>}
                    {s.is_public && <Badge className="text-xs bg-green-500/20 text-green-400 border-green-500/30">public</Badge>}
                  </div>
                </CardHeader>
                <CardContent>
                  {s.description && <p className="text-xs text-muted-foreground mb-2 line-clamp-2">{s.description}</p>}
                  <pre className="bg-muted/50 rounded p-3 text-xs font-mono overflow-auto max-h-[150px] whitespace-pre-wrap">{s.code}</pre>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CodeSnippets;
