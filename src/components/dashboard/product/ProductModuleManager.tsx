import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Trash2, GripVertical, Eye, EyeOff } from "lucide-react";

interface Props {
  productId: string;
}

export function ProductModuleManager({ productId }: Props) {
  const qc = useQueryClient();
  const [newTitle, setNewTitle] = useState("");

  const { data: modules, isLoading } = useQuery({
    queryKey: ["product-modules", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_modules")
        .select("*")
        .eq("product_id", productId)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const addModule = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("product_modules").insert({
        product_id: productId,
        title: newTitle,
        sort_order: modules?.length || 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-modules", productId] });
      setNewTitle("");
      toast.success("Módulo adicionado!");
    },
  });

  const togglePublish = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await supabase
        .from("product_modules")
        .update({ is_published: !published })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["product-modules", productId] }),
  });

  const deleteModule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("product_modules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-modules", productId] });
      toast.success("Módulo removido!");
    },
  });

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium text-foreground">Módulos do Curso</h4>
      
      <div className="flex gap-2">
        <Input
          placeholder="Título do módulo"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="text-sm"
        />
        <Button size="sm" onClick={() => addModule.mutate()} disabled={!newTitle || addModule.isPending}>
          <Plus className="h-3 w-3" />
        </Button>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Carregando...</p>
      ) : !modules?.length ? (
        <p className="text-xs text-muted-foreground">Nenhum módulo criado</p>
      ) : (
        <div className="space-y-2">
          {modules.map((m: any, i: number) => (
            <div key={m.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-sm">
              <GripVertical className="h-4 w-4 text-muted-foreground flex-shrink-0" />
              <span className="text-xs text-muted-foreground">{i + 1}.</span>
              <span className="flex-1 text-foreground truncate">{m.title}</span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => togglePublish.mutate({ id: m.id, published: m.is_published })}
                title={m.is_published ? "Despublicar" : "Publicar"}
              >
                {m.is_published ? <Eye className="h-3 w-3 text-green-500" /> : <EyeOff className="h-3 w-3 text-muted-foreground" />}
              </Button>
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => deleteModule.mutate(m.id)}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
