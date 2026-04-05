import { useState, useCallback } from "react";
import { Plus, User, Phone, Mail, FileText, Loader2, MapPin, Building2 } from "lucide-react";
import { fetchCEP, fetchCNPJ } from "@/lib/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface NewClientDialogProps {
  onCreated: () => void;
}

const tiposCaso = [
  "Direito Penal",
  "Direito Civil",
  "Direito de Família",
  "Direito Trabalhista",
  "Direito Internacional",
  "Direito Empresarial",
  "Direito do Consumidor",
  "Direitos Humanos",
  "Imigração",
  "Outro",
];

export default function NewClientDialog({ onCreated }: NewClientDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    email: "",
    telefone: "",
    cpf: "",
    cnpj: "",
    cep: "",
    endereco: "",
    tipoCaso: "",
    descricaoProblema: "",
  });
  const [loadingCep, setLoadingCep] = useState(false);
  const [loadingCnpj, setLoadingCnpj] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9)
      return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  };

  const handleCepBlur = useCallback(async () => {
    const cep = formData.cep.replace(/\D/g, "");
    if (cep.length !== 8) return;
    setLoadingCep(true);
    try {
      const d = await fetchCEP(cep);
      setFormData((prev) => ({
        ...prev,
        endereco: `${d.logradouro}, ${d.bairro} — ${d.localidade}/${d.uf}`,
      }));
    } catch (e) { console.warn("[NewClient] CEP lookup failed:", e); }
    setLoadingCep(false);
  }, [formData.cep]);

  const handleCnpjBlur = useCallback(async () => {
    const cnpj = formData.cnpj.replace(/\D/g, "");
    if (cnpj.length !== 14) return;
    setLoadingCnpj(true);
    try {
      const d = await fetchCNPJ(cnpj);
      setFormData((prev) => ({
        ...prev,
        nome: prev.nome || d.razao_social || "",
        email: prev.email || d.email || "",
        telefone: prev.telefone || d.telefone || "",
        endereco: `${d.logradouro}, ${d.numero} — ${d.municipio}/${d.uf}`,
        cep: d.cep || prev.cep,
      }));
    } catch (e) { console.warn("[NewClient] CNPJ lookup failed:", e); }
    setLoadingCnpj(false);
  }, [formData.cnpj]);

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
  };

  const handleSubmit = async () => {
    if (!user) return;
    if (!formData.nome || !formData.email) {
      toast({
        title: "Erro",
        description: "Nome e e-mail são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Check if client already exists with this email (e.g., registered themselves)
      const normalizedEmail = formData.email.toLowerCase().trim();
      const { data: existingProfile } = await supabase
        .from("client_profiles")
        .select("id, user_id")
        .eq("email", normalizedEmail)
        .maybeSingle();

      if (existingProfile) {
        // Client already exists - just update their info
        const { error: updateError } = await supabase
          .from("client_profiles")
          .update({
            nome: formData.nome,
            telefone: formData.telefone || null,
            cpf: formData.cpf.replace(/\D/g, "") || null,
            tipo_caso: formData.tipoCaso || null,
            descricao_problema: formData.descricaoProblema || null,
          })
          .eq("id", existingProfile.id);

        if (updateError) throw updateError;

        toast({
          title: "Cliente atualizado!",
          description: `${formData.nome} já existia e foi atualizado.`,
        });
      } else {
        // Generate a unique placeholder user_id for this client profile
        // This will be replaced with the real user_id when the client registers
        const placeholderUserId = crypto.randomUUID();
        
        // Insert new client profile — automatically linked to current advogado
        const { data: newProfile, error: insertError } = await supabase
          .from("client_profiles")
          .insert({
            user_id: placeholderUserId, // Placeholder - will be updated when client registers
            nome: formData.nome,
            email: normalizedEmail,
            telefone: formData.telefone || null,
            cpf: formData.cpf.replace(/\D/g, "") || null,
            tipo_caso: formData.tipoCaso || null,
            descricao_problema: formData.descricaoProblema || null,
            status: "novo",
            advogado_id: user.id, // Auto-link to the advogado who created the profile
          } as any)
          .select("id")
          .single();

        if (insertError) throw insertError;

        // Create a welcome document in the client's folder to initialize it
        // This ensures the folder structure exists in storage
        if (newProfile) {
          const welcomeContent = new Blob(
            [`Pasta do cliente: ${formData.nome}\nE-mail: ${normalizedEmail}\nCriado em: ${new Date().toLocaleString('pt-BR')}`],
            { type: "text/plain" }
          );
          
          await supabase.storage
            .from("documents")
            .upload(`clients/${newProfile.id}/.folder`, welcomeContent, { upsert: true });
        }

        toast({
          title: "Cliente cadastrado!",
          description: `${formData.nome} foi adicionado com pasta própria.`,
        });
      }

      setFormData({
        nome: "",
        email: "",
        telefone: "",
        cpf: "",
        cnpj: "",
        cep: "",
        endereco: "",
        tipoCaso: "",
        descricaoProblema: "",
      });
      setOpen(false);
      onCreated();
    } catch (err: any) {
      toast({
        title: "Erro",
        description: err.message || "Não foi possível cadastrar o cliente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="btn-gold text-[10px] h-9">
          <Plus className="h-3.5 w-3.5 mr-2" />
          NOVO CLIENTE
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground font-serif">
            <User className="h-5 w-5 text-primary" />
            Cadastrar Novo Cliente
          </DialogTitle>
          <DialogDescription>
            Preencha os dados do cliente para adicioná-lo ao CRM.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label className="text-xs flex items-center gap-1">
                <User className="h-3 w-3 text-primary" />
                Nome Completo *
              </Label>
              <Input
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Nome do cliente"
                className="h-9 mt-1"
              />
            </div>

            <div className="col-span-2">
              <Label className="text-xs flex items-center gap-1">
                <Mail className="h-3 w-3 text-primary" />
                E-mail *
              </Label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="cliente@email.com"
                className="h-9 mt-1"
              />
            </div>

            <div>
              <Label className="text-xs flex items-center gap-1">
                <Phone className="h-3 w-3 text-primary" />
                Telefone
              </Label>
              <Input
                value={formData.telefone}
                onChange={(e) =>
                  setFormData({ ...formData, telefone: formatPhone(e.target.value) })
                }
                placeholder="(00) 00000-0000"
                maxLength={15}
                className="h-9 mt-1"
              />
            </div>

            <div>
              <Label className="text-xs">CPF</Label>
              <Input
                value={formData.cpf}
                onChange={(e) =>
                  setFormData({ ...formData, cpf: formatCPF(e.target.value) })
                }
                placeholder="000.000.000-00"
                maxLength={14}
                className="h-9 mt-1"
              />
            </div>

            <div className="col-span-2">
              <Label className="text-xs flex items-center gap-1">
                <Building2 className="h-3 w-3 text-primary" />
                CNPJ (preenche dados automaticamente)
              </Label>
              <div className="relative">
                <Input
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value.replace(/\D/g, "").slice(0, 14) })}
                  onBlur={handleCnpjBlur}
                  placeholder="00.000.000/0000-00"
                  maxLength={18}
                  className="h-9 mt-1"
                />
                {loadingCnpj && <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-3 text-primary" />}
              </div>
            </div>

            <div>
              <Label className="text-xs flex items-center gap-1">
                <MapPin className="h-3 w-3 text-primary" />
                CEP
              </Label>
              <div className="relative">
                <Input
                  value={formData.cep}
                  onChange={(e) => setFormData({ ...formData, cep: e.target.value.replace(/\D/g, "").slice(0, 8) })}
                  onBlur={handleCepBlur}
                  placeholder="00000-000"
                  maxLength={9}
                  className="h-9 mt-1"
                />
                {loadingCep && <Loader2 className="h-4 w-4 animate-spin absolute right-3 top-3 text-primary" />}
              </div>
            </div>

            <div>
              <Label className="text-xs">Endereço</Label>
              <Input
                value={formData.endereco}
                onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
                placeholder="Preenchido automaticamente pelo CEP/CNPJ"
                className="h-9 mt-1"
              />
            </div>

            <div className="col-span-2">
              <Label className="text-xs flex items-center gap-1">
                <FileText className="h-3 w-3 text-primary" />
                Tipo de Caso
              </Label>
              <Select
                value={formData.tipoCaso}
                onValueChange={(value) => setFormData({ ...formData, tipoCaso: value })}
              >
                <SelectTrigger className="h-9 mt-1">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  {tiposCaso.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2">
              <Label className="text-xs">Descrição do Caso</Label>
              <Textarea
                value={formData.descricaoProblema}
                onChange={(e) =>
                  setFormData({ ...formData, descricaoProblema: e.target.value })
                }
                placeholder="Breve descrição do caso jurídico..."
                rows={3}
                className="mt-1"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={loading}>
              Cancelar
            </Button>
            <Button className="btn-gold" onClick={handleSubmit} disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-1" />
                  Cadastrar
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
