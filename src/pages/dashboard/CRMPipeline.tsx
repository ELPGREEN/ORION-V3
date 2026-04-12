import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
// [REMOVED] import { useNeuralFeedback } from "@/hooks/useNeuralFeedback";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Search, Users, Phone, Mail, Calendar, FileText, Filter, UserCheck, Clock, AlertCircle, FolderOpen } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import ClientFolderDialog, { ClientActionsMenu } from "@/components/dashboard/clients/ClientFolderDialog";

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

const statusOptions = [
  { value: "novo", label: "Novo", color: "bg-blue-500" },
  { value: "em_analise", label: "Em Análise", color: "bg-warning" },
  { value: "aguardando_documentos", label: "Aguardando Documentos", color: "bg-orange-500" },
  { value: "em_atendimento", label: "Em Atendimento", color: "bg-primary" },
  { value: "concluido", label: "Concluído", color: "bg-green-500" },
  { value: "arquivado", label: "Arquivado", color: "bg-muted-foreground" },
];

export default function CRMPipeline() {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { logNeural } = useNeuralFeedback();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedClient, setSelectedClient] = useState<ClientProfile | null>(null);
  const [folderOpen, setFolderOpen] = useState(false);

  const { data: clients, isLoading } = useQuery({
    queryKey: ["client-profiles", user?.id],
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

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, clientData }: { id: string; status: string; clientData?: ClientProfile }) => {
      const { error } = await supabase
        .from("client_profiles")
        .update({ status })
        .eq("id", id);

      if (error) throw error;

      logNeural({
        interaction_type: "crm_client_event",
        input_text: `Status atualizado: cliente ${clientData?.nome || id} → ${status}`,
        output_text: `tipo_caso: ${clientData?.tipo_caso || "não informado"} | email: ${clientData?.email || ""}`,
        metadata: {
          client_id: id,
          status_novo: status,
          tipo_caso: clientData?.tipo_caso,
          source: "crm_status_update",
        },
        user_id: user?.id,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-profiles"] });
      toast({ title: "Status atualizado", description: "O status do cliente foi atualizado com sucesso." });
    },
    onError: (error: any) => {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    },
  });

  const filteredClients = clients?.filter((client) => {
    const matchesSearch =
      client.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      client.cpf?.includes(searchTerm) ||
      client.tipo_caso?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === "all" || client.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusInfo = statusOptions.find((s) => s.value === status);
    return (
      <Badge variant="secondary" className={`${statusInfo?.color} text-primary-foreground`}>
        {statusInfo?.label || status}
      </Badge>
    );
  };

  const formatCPF = (cpf: string | null) => {
    if (!cpf) return "-";
    const numbers = cpf.replace(/\D/g, "");
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  };

  const openFolder = (client: ClientProfile) => {
    setSelectedClient(client);
    setFolderOpen(true);
  };

  const stats = {
    total: clients?.length || 0,
    novos: clients?.filter((c) => c.status === "novo").length || 0,
    emAtendimento: clients?.filter((c) => c.status === "em_atendimento").length || 0,
    aguardando: clients?.filter((c) => c.status === "aguardando_documentos" || c.status === "em_analise").length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-serif text-foreground">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total de Clientes</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <AlertCircle className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-2xl font-serif text-foreground">{stats.novos}</p>
              <p className="text-xs text-muted-foreground">Novos Cadastros</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <UserCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-2xl font-serif text-foreground">{stats.emAtendimento}</p>
              <p className="text-xs text-muted-foreground">Em Atendimento</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-orange-500" />
            </div>
            <div>
              <p className="text-2xl font-serif text-foreground">{stats.aguardando}</p>
              <p className="text-xs text-muted-foreground">Aguardando</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="border-border">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email, CPF ou tipo de caso..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filtrar por status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  {statusOptions.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg font-serif">Lista de Clientes</CardTitle>
          <CardDescription>
            {filteredClients?.length || 0} cliente(s) encontrado(s) • Clique nos 3 pontinhos para acessar a pasta
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 border-2 border-primary border-t-transparent animate-spin rounded-full" />
            </div>
          ) : filteredClients?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum cliente encontrado</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Tipo de Caso</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Cadastro</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredClients?.map((client) => (
                    <TableRow key={client.id} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className="h-9 w-9 bg-primary/10 border border-primary/20 flex items-center justify-center cursor-pointer hover:bg-primary/20 transition-colors"
                            onClick={() => openFolder(client)}
                            title="Abrir pasta do cliente"
                          >
                            <FolderOpen className="h-4 w-4 text-primary" />
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{client.nome}</p>
                            <p className="text-xs text-muted-foreground">CPF: {formatCPF(client.cpf)}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Mail className="h-3 w-3 text-muted-foreground" />
                            {client.email}
                          </div>
                          {client.telefone && (
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3 text-muted-foreground" />
                              {client.telefone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <FileText className="h-3 w-3 text-primary" />
                          <span className="text-sm">{client.tipo_caso || "-"}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={client.status}
                          onValueChange={(value) =>
                            updateStatusMutation.mutate({ id: client.id, status: value, clientData: client })
                          }
                        >
                          <SelectTrigger className="w-[160px] h-8">
                            <SelectValue>{getStatusBadge(client.status)}</SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {statusOptions.map((status) => (
                              <SelectItem key={status.value} value={status.value}>
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(client.created_at), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <ClientActionsMenu
                          client={client}
                          onViewFolder={() => openFolder(client)}
                          onEdit={() => openFolder(client)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ClientFolderDialog
        client={selectedClient}
        open={folderOpen}
        onOpenChange={setFolderOpen}
        onUpdate={() => queryClient.invalidateQueries({ queryKey: ["client-profiles"] })}
      />
    </div>
  );
}
