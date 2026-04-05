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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, FolderPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { ClientSearchSelect } from "@/components/dashboard/ClientSearchSelect";

interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
}

interface CreateFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  folders: Folder[];
  parentId?: string | null;
}

export function CreateFolderDialog({
  open,
  onOpenChange,
  onSuccess,
  folders,
  parentId = null,
}: CreateFolderDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [selectedParent, setSelectedParent] = useState<string>(parentId || "root");
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setName("");
      setSelectedParent(parentId || "root");
      setSelectedClientId(null);
    }
  }, [open, parentId]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      toast({
        title: "Nome inválido",
        description: "Digite um nome para a pasta.",
        variant: "destructive",
      });
      return;
    }

    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("document_folders").insert({
        user_id: user.id,
        name: name.trim(),
        parent_id: selectedParent === "root" ? null : selectedParent,
        client_profile_id: selectedClientId,
      });

      if (error) {
        if (error.code === "23505") {
          throw new Error("Já existe uma pasta com este nome nesta localização.");
        }
        throw error;
      }

      toast({
        title: "Pasta criada!",
        description: selectedClientId
          ? "Pasta criada e vinculada ao cliente."
          : undefined,
      });
      onSuccess();
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Erro ao criar pasta",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getFolderPath = (folderId: string, allFolders: Folder[]): string => {
    const folder = allFolders.find((f) => f.id === folderId);
    if (!folder) return "";
    if (!folder.parent_id) return folder.name;
    return `${getFolderPath(folder.parent_id, allFolders)} / ${folder.name}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-2">
            <FolderPlus className="h-5 w-5 text-primary" />
            Nova Pasta
          </DialogTitle>
          <DialogDescription>
            Crie uma pasta para organizar seus documentos e vincule a um cliente.
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

          <div className="space-y-2">
            <Label>Localização</Label>
            <Select value={selectedParent} onValueChange={setSelectedParent}>
              <SelectTrigger>
                <SelectValue placeholder="Raiz (sem pasta pai)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="root">📁 Raiz (sem pasta pai)</SelectItem>
                {folders.map((folder) => (
                  <SelectItem key={folder.id} value={folder.id}>
                    📂 {getFolderPath(folder.id, folders)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <ClientSearchSelect
            value={selectedClientId}
            onSelect={(id) => setSelectedClientId(id)}
            label="Vincular a Cliente (opcional)"
            allowClear={true}
          />
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
                <FolderPlus className="h-4 w-4 mr-2" />
                Criar Pasta
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
