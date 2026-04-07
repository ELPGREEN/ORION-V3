import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, Trash2, FileText, Loader2 } from "lucide-react";

interface Props {
  productId: string;
}

export function ProductFileManager({ productId }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const { data: files, isLoading } = useQuery({
    queryKey: ["product-files", productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_files")
        .select("*")
        .eq("product_id", productId)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const deleteFile = useMutation({
    mutationFn: async (file: { id: string; file_url: string }) => {
      const path = file.file_url.split("/product-files/")[1];
      if (path) await supabase.storage.from("product-files").remove([path]);
      const { error } = await supabase.from("product_files").delete().eq("id", file.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["product-files", productId] });
      toast.success("Arquivo removido!");
    },
  });

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploading(true);
    try {
      const path = `${user.id}/${productId}/${Date.now()}-${file.name}`;
      const { error: uploadErr } = await supabase.storage
        .from("product-files")
        .upload(path, file);
      if (uploadErr) throw uploadErr;

      const { data: urlData } = supabase.storage.from("product-files").getPublicUrl(path);
      
      const { error: dbErr } = await supabase.from("product_files").insert({
        product_id: productId,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_type: file.type,
        file_size_bytes: file.size,
        sort_order: (files?.length || 0),
      });
      if (dbErr) throw dbErr;

      qc.invalidateQueries({ queryKey: ["product-files", productId] });
      toast.success("Arquivo enviado!");
    } catch (err: any) {
      toast.error("Erro ao enviar: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-foreground">Arquivos do Produto</h4>
        <label className="cursor-pointer">
          <input type="file" className="hidden" onChange={handleUpload} disabled={uploading} />
          <Button size="sm" variant="outline" className="gap-1" asChild>
            <span>
              {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
              Upload
            </span>
          </Button>
        </label>
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Carregando...</p>
      ) : !files?.length ? (
        <p className="text-xs text-muted-foreground">Nenhum arquivo adicionado</p>
      ) : (
        <div className="space-y-2">
          {files.map((f: any) => (
            <div key={f.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <FileText className="h-4 w-4 text-primary flex-shrink-0" />
                <div className="min-w-0">
                  <p className="truncate text-foreground">{f.file_name}</p>
                  {f.file_size_bytes && (
                    <p className="text-xs text-muted-foreground">{formatSize(f.file_size_bytes)}</p>
                  )}
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => deleteFile.mutate({ id: f.id, file_url: f.file_url })}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
