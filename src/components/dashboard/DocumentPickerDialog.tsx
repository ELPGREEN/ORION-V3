import { useState, useEffect } from "react";
import { FileText, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface DocumentPickerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (docId: string, docTitle: string, hasContent: boolean) => void;
}

interface DocumentItem {
  id: string;
  title: string;
  document_type: string;
  created_at: string;
  status: string;
}

export function DocumentPickerDialog({
  open,
  onOpenChange,
  onSelect,
}: DocumentPickerDialogProps) {
  const { user } = useAuth();
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (open && user) {
      fetchDocs();
    }
  }, [open, user]);

  const fetchDocs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("documents")
      .select("id, title, document_type, created_at, status, content, pdf_url")
      .order("created_at", { ascending: false })
      .limit(50);

    setDocs((data as any[]) || []);
    setLoading(false);
  };

  const filtered = docs.filter(
    (d) =>
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.document_type.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="font-serif text-foreground flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Selecionar Documento
          </DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs">
            Escolha um documento do repositório para enviar para assinatura
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar documento..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-secondary border-border h-9 text-sm"
          />
        </div>

        <div className="max-h-64 overflow-y-auto space-y-1">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">
              Nenhum documento encontrado
            </p>
          ) : (
            filtered.map((doc) => (
              <button
                key={doc.id}
                onClick={() => onSelect(doc.id, doc.title, !!(doc as any).content || !!(doc as any).pdf_url)}
                className="w-full flex items-center gap-3 p-3 border border-border text-left hover:border-primary/40 transition-all"
              >
                <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-foreground truncate">
                    {doc.title}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {doc.document_type} •{" "}
                    {new Date(doc.created_at).toLocaleDateString("pt-BR")}
                  </p>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 border border-border text-muted-foreground">
                  {doc.status}
                </span>
              </button>
            ))
          )}
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="w-full text-xs"
          onClick={() => onOpenChange(false)}
        >
          Cancelar
        </Button>
      </DialogContent>
    </Dialog>
  );
}
