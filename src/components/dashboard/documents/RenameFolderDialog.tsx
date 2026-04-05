import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Edit2, Link2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { ClientSearchSelect } from "@/components/dashboard/ClientSearchSelect";

interface RenameFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  folderId: string;
  currentName: string;
  linkedClientId?: string | null;
  onSuccess: () => void;
}

export function RenameFolderDialog({
  open,
  onOpenChange,
  folderId,
  currentName,
  linkedClientId,
  onSuccess,
}: RenameFolderDialogProps) {
  const { toast } = useToast();
  const [name, setName] = useState(currentName);
  const [loading, setLoading] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(linkedClientId || null);

  useEffect(() => {
    if (open) {
      setName(currentName);
      setSelectedClientId(linkedClientId || null);
    }
  }, [open, currentName, linkedClientId]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({
        title: "Nome inválido",
        description: "Digite um nome para a pasta.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("document_folders")
        .update({
          name: name.trim(),
          client_profile_id: selectedClientId,
        })
        .eq("id", folderId);

      if (error) throw error;

      // If client was selected, share all documents in this folder
      if (selectedClientId) {
        const { data: clientProfile } = await supabase
          .from("client_profiles")
          .select("user_id")
          .eq("id", selectedClientId)
          .single();

        if (clientProfile) {
          const { data: docs } = await supabase
            .from("documents")
            .select("id")
            .eq("folder_id", folderId);

          if (docs && docs.length > 0) {
            const { data: userData } = await supabase.auth.getUser();
            if (userData.user) {
              for (const doc of docs) {
                const { data: existing } = await supabase
                  .from("shared_documents")
                  .select("id")
                  .eq("document_id", doc.id)
                  .eq("shared_with", clientProfile.user_id)
                  .maybeSingle();

                if (!existing) {
                  await supabase.from("shared_documents").insert({
                    document_id: doc.id,
                    shared_by: userData.user.id,
                    shared_with: clientProfile.user_id,
                  });
                }
              }
            }
          }
        }

        toast({
          title: "Pasta vinculada ao cliente!",
          description: `Documentos serão compartilhados automaticamente.`,
        });
      } else {
        toast({ title: "Pasta atualizada!" });
      }

      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Erro ao atualizar pasta",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-2">
            <Edit2 className="h-5 w-5 text-primary" />
            Editar Pasta
          </DialogTitle>
          <DialogDescription>
            Renomeie a pasta e vincule a um cliente para compartilhar automaticamente os documentos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nome da Pasta *</Label>
            <Input
              placeholder="Ex: Processos 2024"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>

          <ClientSearchSelect
            value={selectedClientId}
            onSelect={(id) => setSelectedClientId(id)}
            label="Vincular a Cliente"
            allowClear={true}
          />

          {selectedClientId && (
            <p className="text-xs text-muted-foreground bg-muted/50 p-2 rounded">
              ℹ️ Ao vincular, todos os documentos desta pasta serão automaticamente compartilhados com o cliente.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading} className="btn-gold">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Edit2 className="h-4 w-4 mr-2" />
                Salvar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
