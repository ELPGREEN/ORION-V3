import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Users, Search, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import ClientFolderDialog from "@/components/dashboard/clients/ClientFolderDialog";
import NewClientDialog from "@/components/dashboard/clients/NewClientDialog";
import { ClienteListItem } from "@/components/dashboard/clients/ClienteListItem";
import { ClienteDeleteDialog } from "@/components/dashboard/clients/ClienteDeleteDialog";

interface ClientProfile {
  id: string;
  user_id: string;
  nome: string;
  email: string;
  telefone: string | null;
  cpf: string | null;
  tipo_caso: string | null;
  descricao_problema: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function ClientesPage() {
  const [searchParams] = useSearchParams();
  const [busca, setBusca] = useState("");
  const { user } = useAuth();
  const [selectedClient, setSelectedClient] = useState<ClientProfile | null>(null);
  const [folderOpen, setFolderOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<ClientProfile | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    const searchFromUrl = searchParams.get("search");
    if (searchFromUrl) setBusca(searchFromUrl);
  }, [searchParams]);

  const { data: clientes, isLoading } = useQuery({
    queryKey: ["client-profiles-page", user?.id],
    queryFn: async () => {
      if (!user) throw new Error("No user");
      const { data, error } = await supabase
        .from("client_profiles")
        .select("*")
        .or(`advogado_id.eq.${user.id},user_id.eq.${user.id}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ClientProfile[];
    },
    enabled: !!user,
  });

  const filtrados = clientes?.filter(
    (c) =>
      c.nome.toLowerCase().includes(busca.toLowerCase()) ||
      c.email.toLowerCase().includes(busca.toLowerCase())
  ) || [];

  const deleteClient = async (client: ClientProfile) => {
    const { data: docs } = await supabase
      .from("client_documents")
      .select("id, storage_path")
      .eq("client_profile_id", client.id);

    if (docs && docs.length > 0) {
      const paths = docs.map((d) => d.storage_path).filter(Boolean);
      if (paths.length) await supabase.storage.from("documents").remove(paths);
      await supabase.from("client_documents").delete().eq("client_profile_id", client.id);
    }

    const { error } = await supabase.from("client_profiles").delete().eq("id", client.id);
    if (error) {
      toast({ title: "Erro", description: "Erro ao excluir cliente.", variant: "destructive" });
    } else {
      toast({ title: "Cliente excluído" });
      queryClient.invalidateQueries({ queryKey: ["client-profiles-page"] });
    }
    setDeleteTarget(null);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-serif text-foreground flex items-center gap-3">
            <div className="h-9 w-9 bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            Clientes
          </h1>
          <p className="text-xs text-muted-foreground mt-1 ml-12">
            Gerencie seus clientes, documentos e processos.
          </p>
        </div>
        <NewClientDialog onCreated={() => queryClient.invalidateQueries({ queryKey: ["client-profiles-page"] })} />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
        <Input
          placeholder="Buscar por nome ou e-mail..."
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="pl-10 bg-card/50 border-border/30 h-10 text-sm focus:bg-card focus:border-primary/40 transition-all placeholder:text-muted-foreground/40"
        />
      </div>

      {/* Count */}
      {!isLoading && filtrados.length > 0 && (
        <p className="text-[10px] text-muted-foreground/60 tracking-wider uppercase">
          {filtrados.length} cliente{filtrados.length !== 1 ? "s" : ""} encontrado{filtrados.length !== 1 ? "s" : ""}
        </p>
      )}

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Carregando clientes...</p>
          </div>
        </div>
      ) : filtrados.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <div className="h-16 w-16 mx-auto mb-4 bg-card border border-border/30 flex items-center justify-center">
            <Users className="h-8 w-8 text-muted-foreground/30" />
          </div>
          <p className="text-sm font-medium">Nenhum cliente encontrado</p>
          <p className="text-xs mt-1 text-muted-foreground/60">Clientes aparecerão aqui após se cadastrarem pelo formulário público</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtrados.map((cliente) => (
            <ClienteListItem
              key={cliente.id}
              cliente={cliente}
              onOpenFolder={(c) => { setSelectedClient(c); setFolderOpen(true); }}
              onDelete={setDeleteTarget}
            />
          ))}
        </div>
      )}

      <ClientFolderDialog
        client={selectedClient}
        open={folderOpen}
        onOpenChange={setFolderOpen}
        onUpdate={() => queryClient.invalidateQueries({ queryKey: ["client-profiles-page"] })}
      />

      <ClienteDeleteDialog
        target={deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget && deleteClient(deleteTarget)}
      />
    </div>
  );
}
