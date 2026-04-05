import { useState, useEffect, useCallback } from "react";
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
import { Loader2, FolderPlus, Save, Folder } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface DocumentFolder {
  id: string;
  name: string;
  parent_id: string | null;
}

interface SaveToFolderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (folderId: string | null) => Promise<void>;
  documentTitle?: string;
  defaultFolderName?: string; // Suggested folder name based on document type
}

export function SaveToFolderDialog({
  open,
  onOpenChange,
  onSave,
  documentTitle = "Documento",
  defaultFolderName = "Processos",
}: SaveToFolderDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>("root");
  const [loading, setLoading] = useState(false);
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  // Load folders on open
  const loadFolders = useCallback(async () => {
    if (!user) return;
    setLoadingFolders(true);
    
    try {
      const { data, error } = await supabase
        .from("document_folders")
        .select("id, name, parent_id")
        .eq("user_id", user.id)
        .order("name");

      if (error) throw error;
      setFolders(data || []);

      // Check if "Processos" folder exists, if not suggest creating it
      const processosFolder = data?.find(
        (f) => f.name.toLowerCase() === defaultFolderName.toLowerCase()
      );
      if (processosFolder) {
        setSelectedFolder(processosFolder.id);
      }
    } catch (err) {
    } finally {
      setLoadingFolders(false);
    }
  }, [user, defaultFolderName]);

  useEffect(() => {
    if (open) {
      loadFolders();
      setShowNewFolder(false);
      setNewFolderName("");
    }
  }, [open, loadFolders]);

  // Build folder path for display
  const getFolderPath = (folderId: string): string => {
    const folder = folders.find((f) => f.id === folderId);
    if (!folder) return "";
    if (!folder.parent_id) return folder.name;
    return `${getFolderPath(folder.parent_id)} / ${folder.name}`;
  };

  // Create new folder
  const handleCreateFolder = async () => {
    if (!newFolderName.trim() || !user) {
      toast({
        title: "Nome inválido",
        description: "Digite um nome para a pasta.",
        variant: "destructive",
      });
      return;
    }

    setCreatingFolder(true);
    try {
      const parentId = selectedFolder === "root" ? null : selectedFolder;
      
      const { data, error } = await supabase
        .from("document_folders")
        .insert({
          user_id: user.id,
          name: newFolderName.trim(),
          parent_id: parentId,
        })
        .select("id")
        .single();

      if (error) {
        if (error.code === "23505") {
          throw new Error("Já existe uma pasta com este nome.");
        }
        throw error;
      }

      toast({ title: "Pasta criada!" });
      
      // Reload folders and select the new one
      await loadFolders();
      if (data) {
        setSelectedFolder(data.id);
      }
      
      setShowNewFolder(false);
      setNewFolderName("");
    } catch (err: any) {
      toast({
        title: "Erro ao criar pasta",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setCreatingFolder(false);
    }
  };

  // Save document to selected folder
  const handleSave = async () => {
    setLoading(true);
    try {
      const folderId = selectedFolder === "root" ? null : selectedFolder;
      await onSave(folderId);
      onOpenChange(false);
    } catch (err: any) {
      toast({
        title: "Erro ao salvar",
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
            <Save className="h-5 w-5 text-primary" />
            Salvar Documento
          </DialogTitle>
          <DialogDescription>
            Escolha onde salvar "{documentTitle}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Folder Selection */}
          <div className="space-y-2">
            <Label>Pasta de Destino</Label>
            {loadingFolders ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Carregando pastas...
              </div>
            ) : (
              <Select value={selectedFolder} onValueChange={setSelectedFolder}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma pasta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="root">
                    <span className="flex items-center gap-2">
                      <Folder className="h-4 w-4" />
                      Raiz (Meus Documentos)
                    </span>
                  </SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      <span className="flex items-center gap-2">
                        <Folder className="h-4 w-4 text-primary" />
                        {getFolderPath(folder.id)}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* New Folder Toggle */}
          {!showNewFolder ? (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-primary hover:text-primary/80"
              onClick={() => setShowNewFolder(true)}
            >
              <FolderPlus className="h-3 w-3 mr-1" />
              Criar nova pasta
            </Button>
          ) : (
            <div className="space-y-3 p-3 bg-muted/50 rounded-lg border border-border">
              <div className="space-y-2">
                <Label className="text-xs">Nome da Nova Pasta</Label>
                <Input
                  placeholder="Ex: Processos 2024"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => {
                    setShowNewFolder(false);
                    setNewFolderName("");
                  }}
                  disabled={creatingFolder}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="text-xs btn-gold"
                  onClick={handleCreateFolder}
                  disabled={creatingFolder || !newFolderName.trim()}
                >
                  {creatingFolder ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <>
                      <FolderPlus className="h-3 w-3 mr-1" />
                      Criar
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Info text */}
          <p className="text-[10px] text-muted-foreground">
            Documentos salvos ficam disponíveis em "Meus Documentos" e podem ser organizados em pastas.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading || loadingFolders} className="btn-gold">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
