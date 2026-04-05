import { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, UserPlus, User, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface ClientProfile {
  id: string;
  nome: string;
  email: string;
  cpf: string | null;
  telefone: string | null;
  user_id: string;
}

interface ClientSearchSelectProps {
  value: string | null;
  onSelect: (clientId: string | null, client: ClientProfile | null) => void;
  label?: string;
  placeholder?: string;
  allowCreate?: boolean;
  allowClear?: boolean;
  className?: string;
}

export function ClientSearchSelect({
  value,
  onSelect,
  label = "Cliente",
  placeholder = "Buscar cliente por nome, e-mail ou CPF...",
  allowCreate = true,
  allowClear = true,
  className,
}: ClientSearchSelectProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [clients, setClients] = useState<ClientProfile[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("client_profiles")
      .select("id, nome, email, cpf, telefone, user_id")
      .order("nome");
    if (data) setClients(data);
    setLoading(false);
  };

  const selectedClient = useMemo(
    () => clients.find((c) => c.id === value) || null,
    [clients, value]
  );

  const filtered = useMemo(() => {
    if (!search.trim()) return clients;
    const q = search.toLowerCase();
    return clients.filter(
      (c) =>
        c.nome.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.cpf && c.cpf.includes(q)) ||
        (c.telefone && c.telefone.includes(q))
    );
  }, [clients, search]);

  const handleCreate = async () => {
    if (!newName.trim() || !newEmail.trim() || !user) return;
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("client_profiles")
        .insert({
          nome: newName.trim(),
          email: newEmail.toLowerCase().trim(),
          user_id: crypto.randomUUID(),
          advogado_id: user.id,
          status: "novo",
        })
        .select("id, nome, email, cpf, telefone, user_id")
        .single();

      if (error) throw error;

      setClients((prev) => [...prev, data]);
      onSelect(data.id, data);
      setShowCreate(false);
      setNewName("");
      setNewEmail("");
      setIsOpen(false);
      toast({ title: "Cliente criado e vinculado!" });
    } catch (err: any) {
      toast({
        title: "Erro ao criar cliente",
        description: err.message,
        variant: "destructive",
      });
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className={cn("space-y-2", className)}>
      {label && (
        <Label className="text-xs flex items-center gap-1.5">
          <User className="h-3.5 w-3.5 text-muted-foreground" />
          {label}
        </Label>
      )}

      {/* Selected state */}
      {selectedClient && !isOpen ? (
        <div className="flex items-center gap-2 p-2.5 border border-border rounded-md bg-accent/5">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{selectedClient.nome}</p>
            <p className="text-xs text-muted-foreground truncate">{selectedClient.email}</p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={() => setIsOpen(true)}
            >
              <Search className="h-3.5 w-3.5" />
            </Button>
            {allowClear && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-destructive hover:text-destructive"
                onClick={() => {
                  onSelect(null, null);
                  setSearch("");
                }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={placeholder}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              className="pl-9 h-9"
            />
            {selectedClient && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1/2 -translate-y-1/2 h-7 px-2"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>

          {/* Dropdown results */}
          {isOpen && (
            <div className="border border-border rounded-md bg-popover shadow-md">
              {loading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                  Carregando clientes...
                </div>
              ) : showCreate ? (
                <div className="p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Novo Cliente</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowCreate(false)}
                    >
                      Voltar
                    </Button>
                  </div>
                  <Input
                    placeholder="Nome completo"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    autoFocus
                  />
                  <Input
                    type="email"
                    placeholder="E-mail"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                  <Button
                    type="button"
                    className="w-full btn-gold"
                    onClick={handleCreate}
                    disabled={creating || !newName.trim() || !newEmail.trim()}
                    size="sm"
                  >
                    {creating ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Criar e Vincular
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <>
                  <ScrollArea className="max-h-48">
                    {filtered.length === 0 ? (
                      <div className="p-3 text-center text-sm text-muted-foreground">
                        Nenhum cliente encontrado.
                      </div>
                    ) : (
                      filtered.map((client) => (
                        <button
                          key={client.id}
                          type="button"
                          className={cn(
                            "w-full text-left px-3 py-2.5 hover:bg-accent/10 transition-colors flex items-center gap-3 border-b border-border/50 last:border-b-0",
                            value === client.id && "bg-accent/15"
                          )}
                          onClick={() => {
                            onSelect(client.id, client);
                            setSearch("");
                            setIsOpen(false);
                          }}
                        >
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {client.nome}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span className="truncate">{client.email}</span>
                              {client.cpf && (
                                <Badge variant="outline" className="text-[10px] px-1 py-0">
                                  {client.cpf}
                                </Badge>
                              )}
                            </div>
                          </div>
                          {value === client.id && (
                            <Check className="h-4 w-4 text-primary shrink-0" />
                          )}
                        </button>
                      ))
                    )}
                  </ScrollArea>

                  {allowClear && value && (
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm text-destructive hover:bg-destructive/10 transition-colors border-t border-border"
                      onClick={() => {
                        onSelect(null, null);
                        setSearch("");
                        setIsOpen(false);
                      }}
                    >
                      <X className="h-3.5 w-3.5 inline mr-2" />
                      Remover vínculo
                    </button>
                  )}

                  {allowCreate && (
                    <button
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-primary/10 transition-colors border-t border-border"
                      onClick={() => setShowCreate(true)}
                    >
                      <UserPlus className="h-3.5 w-3.5 inline mr-2" />
                      Cadastrar novo cliente
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
