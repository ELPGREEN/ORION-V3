import { useState, useEffect } from "react";
import { User, Save, Shield, Phone, Mail, MapPin, FileText, Loader2, CheckCircle } from "lucide-react";
import { ProfilePhotoUpload } from "@/components/dashboard/ProfilePhotoUpload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNeuralFeedback } from "@/hooks/useNeuralFeedback";

interface ClientProfile {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  cpf: string | null;
  descricao_problema: string | null;
  tipo_caso: string | null;
  status: string;
}

export default function PerfilCliente() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { logNeural } = useNeuralFeedback();
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ClientProfile | null>(null);

  const [form, setForm] = useState({
    nome: "",
    telefone: "",
    cpf: "",
    endereco: "",
    cidade: "",
    estado: "",
    cep: "",
    descricao_problema: "",
  });

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    setLoading(true);

    // Try to find existing client profile
    const { data: existingProfile } = await supabase
      .from("client_profiles")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingProfile) {
      setProfile(existingProfile as ClientProfile);
      setForm({
        nome: existingProfile.nome || "",
        telefone: existingProfile.telefone || "",
        cpf: existingProfile.cpf || "",
        endereco: "",
        cidade: "",
        estado: "",
        cep: "",
        descricao_problema: existingProfile.descricao_problema || "",
      });
    } else {
      // Initialize with user metadata
      setForm((prev) => ({
        ...prev,
        nome: user.user_metadata?.nome || user.email?.split("@")[0] || "",
      }));
    }

    setLoading(false);
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      if (profile) {
        // Update existing profile
        const { error } = await supabase
          .from("client_profiles")
          .update({
            nome: form.nome,
            telefone: form.telefone || null,
            cpf: form.cpf || null,
            descricao_problema: form.descricao_problema || null,
          })
          .eq("id", profile.id);

        if (error) throw error;
      } else {
        // Create new profile
        const { data, error } = await supabase
          .from("client_profiles")
          .insert({
            user_id: user.id,
            email: user.email || "",
            nome: form.nome,
            telefone: form.telefone || null,
            cpf: form.cpf || null,
            descricao_problema: form.descricao_problema || null,
            status: "ativo",
          })
          .select()
          .single();

        if (error) throw error;
        setProfile(data as ClientProfile);
      }

      // Update user metadata
      await supabase.auth.updateUser({
        data: { nome: form.nome },
      });

      // ─── Neural: atualização de perfil = sinal de engajamento ───
      logNeural({
        interaction_type: "crm_client_event",
        input_text: `Perfil atualizado: ${form.nome}`,
        output_text: `Telefone: ${form.telefone || "N/A"} | CPF: ${form.cpf ? "informado" : "não informado"} | Descrição: ${form.descricao_problema?.substring(0, 200) || "N/A"}`,
        quality_score: 0.75,
        user_id: user.id,
        metadata: {
          temTelefone: !!form.telefone,
          temCPF: !!form.cpf,
          temDescricao: !!form.descricao_problema,
          source: "perfil_cliente_save",
          status_novo: "perfil_atualizado",
        },
      });

      toast({ title: "Perfil salvo!", description: "Suas informações foram atualizadas." });
    } catch (err: any) {
      toast({
        title: "Erro ao salvar",
        description: err.message || "Tente novamente.",
        variant: "destructive",
      });
    }

    setSaving(false);
  };

  const formatCPF = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-serif text-foreground flex items-center gap-3">
          <User className="h-6 w-6 text-primary" />
          Meu Perfil
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Mantenha seus dados atualizados para uma melhor comunicação com o advogado.
        </p>
      </div>

      {/* Status Badge */}
      {profile && (
        <div className="bg-primary/5 border border-primary/20 p-3 flex items-center gap-3">
          <CheckCircle className="h-5 w-5 text-primary" />
          <div>
            <p className="text-xs font-medium text-foreground">Perfil cadastrado</p>
            <p className="text-[10px] text-muted-foreground">
              Seus dados estão disponíveis para o escritório ORION IA by ELP.
            </p>
          </div>
        </div>
      )}

      {/* Photo + Personal Data */}
      <div className="bg-card border border-border p-6 space-y-4">
        <h2 className="text-sm font-serif text-foreground flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          Dados Pessoais
        </h2>
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <ProfilePhotoUpload size="md" />
          <p className="text-[10px] text-muted-foreground flex-1">
            Estas informações são usadas para identificação em documentos e processos.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] text-muted-foreground tracking-wider uppercase">
              Nome Completo *
            </label>
            <Input
              value={form.nome}
              onChange={(e) => setForm({ ...form, nome: e.target.value })}
              placeholder="Seu nome completo"
              className="bg-background border-border h-10"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-muted-foreground tracking-wider uppercase">
              CPF
            </label>
            <Input
              value={form.cpf}
              onChange={(e) => setForm({ ...form, cpf: formatCPF(e.target.value) })}
              placeholder="000.000.000-00"
              className="bg-background border-border h-10"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-muted-foreground tracking-wider uppercase flex items-center gap-1">
              <Mail className="h-3 w-3" />
              E-mail
            </label>
            <Input
              value={user?.email || ""}
              disabled
              className="bg-muted border-border h-10 text-muted-foreground"
            />
            <p className="text-[9px] text-muted-foreground/60">
              O e-mail não pode ser alterado por segurança.
            </p>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-muted-foreground tracking-wider uppercase flex items-center gap-1">
              <Phone className="h-3 w-3" />
              Telefone / WhatsApp
            </label>
            <Input
              value={form.telefone}
              onChange={(e) => setForm({ ...form, telefone: formatPhone(e.target.value) })}
              placeholder="(00) 00000-0000"
              className="bg-background border-border h-10"
            />
          </div>
        </div>
      </div>

      {/* Address */}
      <div className="bg-card border border-border p-6 space-y-4">
        <h2 className="text-sm font-serif text-foreground flex items-center gap-2">
          <MapPin className="h-4 w-4 text-primary" />
          Endereço
        </h2>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <label className="text-[10px] text-muted-foreground tracking-wider uppercase">
              Endereço Completo
            </label>
            <Input
              value={form.endereco}
              onChange={(e) => setForm({ ...form, endereco: e.target.value })}
              placeholder="Rua, número, complemento"
              className="bg-background border-border h-10"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-muted-foreground tracking-wider uppercase">
              Cidade
            </label>
            <Input
              value={form.cidade}
              onChange={(e) => setForm({ ...form, cidade: e.target.value })}
              placeholder="Sua cidade"
              className="bg-background border-border h-10"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1.5">
              <label className="text-[10px] text-muted-foreground tracking-wider uppercase">
                Estado
              </label>
              <Input
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value.toUpperCase().slice(0, 2) })}
                placeholder="UF"
                className="bg-background border-border h-10"
                maxLength={2}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] text-muted-foreground tracking-wider uppercase">
                CEP
              </label>
              <Input
                value={form.cep}
                onChange={(e) => setForm({ ...form, cep: e.target.value.replace(/\D/g, "").slice(0, 8) })}
                placeholder="00000-000"
                className="bg-background border-border h-10"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Case Description */}
      <div className="bg-card border border-border p-6 space-y-4">
        <h2 className="text-sm font-serif text-foreground flex items-center gap-2">
          <FileText className="h-4 w-4 text-primary" />
          Descrição do Caso (Opcional)
        </h2>
        <p className="text-[10px] text-muted-foreground">
          Descreva brevemente sua situação jurídica para agilizar o atendimento.
        </p>

        <Textarea
          value={form.descricao_problema}
          onChange={(e) => setForm({ ...form, descricao_problema: e.target.value })}
          placeholder="Descreva seu caso ou problema jurídico..."
          className="bg-background border-border min-h-[120px] resize-none"
        />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        <p className="text-[9px] text-muted-foreground/60 max-w-[200px]">
          Seus dados são protegidos conforme LGPD (Lei 13.709/2018).
        </p>
        <Button
          onClick={handleSave}
          disabled={saving || !form.nome.trim()}
          className="btn-gold"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              SALVAR PERFIL
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
